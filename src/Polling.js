'use strict'

const path = require('path')
const dotenv = require('dotenv')
const getPolling = require('./polling/get')

class Polling {
  constructor () {
    this.functions = []
    this.log = console.log
  }

  // Starts the server
  start () {
    if (this.functions.length === 0) {
      this.log('No Lambda(s) with compatible events found')
      return
    }
    this.functions.forEach(func => func.endpoints.forEach(endpoint => this._attachPoll(func, endpoint)))
  }

  // Sets functions, including endpoints, using the serverless config and service path
  setConfiguration (serverlessConfig, servicePath) {
    this.functions = Object.keys(serverlessConfig.functions).map(name => {
      const functionConfig = serverlessConfig.functions[name]
      const [handlerSrcFile, handlerFunctionName] = functionConfig.handler.split('.')
      let handlerPath = Array.isArray(serverlessConfig.plugins) && serverlessConfig.plugins.includes('serverless-webpack')
        ? path.join(servicePath, '/.webpack/service', handlerSrcFile)
        : path.join(servicePath, handlerSrcFile)
      let config = serverlessConfig.functions[name]

      return {
        name: name,
        config: config,
        handlerModulePath: handlerPath,
        handlerFunctionName,
        environment: Object.assign({}, serverlessConfig.provider.environment, functionConfig.environment, this.customEnvironment)
      }
    }).map(func =>
      Object.assign({}, func, {endpoints: getPolling(func)})
    ).filter(func =>
      func.endpoints.length > 0
    )
  }

  // Attaches HTTP endpoint to Express
  _attachPoll (func, endpoint) {
    // Validate method and path
    /* istanbul ignore next */
    if (!endpoint.method || !endpoint.path) {
      return this.log(`Endpoint ${endpoint.type} for function ${func.name} has no method or path`)
    }
    // Add HTTP endpoint to Express
    this.app[endpoint.method.toLowerCase()](endpoint.path, (request, response) => {
      this.log(`${endpoint}`)
      // Execute Lambda with corresponding event, forward response to Express
      let lambdaEvent = endpoint.getLambdaEvent(request)
      this._executeLambdaHandler(func, lambdaEvent).then(result => {
        this.log(' ➡ Success')
        if (process.env.SLS_DEBUG) console.info(result)
        endpoint.handleLambdaSuccess(response, result)
      }).catch(error => {
        this.log(` ➡ Failure: ${error.message}`)
        if (process.env.SLS_DEBUG) console.error(error.stack)
        endpoint.handleLambdaFailure(response, error)
      })
    })
  }

  // Loads and executes the Lambda handler
  _executeLambdaHandler (func, event) {
    return new Promise((resolve, reject) => {
      let isPromise = false
      // Load local development environment variables
      const localEnvironment = Object.assign({},
        dotenv.config({path: '.env.local'}).parsed,
        dotenv.config({path: '.local.env'}).parsed,
        dotenv.config({path: 'local.env'}).parsed)
      // set process.env explicitly
      process.env = Object.assign({}, this.processEnvironment, func.environment, localEnvironment)
      const handle = require(func.handlerModulePath)[func.handlerFunctionName]
      const context = {succeed: resolve, fail: reject}
      const callback = (error, result) => {
        if (isPromise) return
        return !error ? resolve(result) : reject(error)
      }

      // Execute it!
      let result = handle(event, context, callback)
      isPromise = result instanceof Promise || typeof result.then === 'function'
      if (isPromise) resolve(result)
    })
  }
}

module.exports = Polling
