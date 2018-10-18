'use strict'

const path = require('path')
const dotenv = require('dotenv')
const getPolling = require('./polling/get')
const SqsPoll = require('./polling/SqsPoll')

class Polling {
  constructor () {
    this.functions = []
    this.log = console.log
  }

  // Starts the polling
  start () {
    if (this.functions.length === 0) {
      this.isRunning = false
      this.log('No Lambda(s) with compatible events found')
      return
    }

    this.isRunning = true

    const sqsPolls = this.functions.filter(f => f.polls.find(p => p instanceof SqsPoll))
    if (sqsPolls.length) {
      const awsCreds = this.serverless.providers.aws.getCredentials()
      this.sqs = new this.serverless.providers.aws.sdk.SQS(awsCreds)

      this.log('----')
      sqsPolls.forEach(func => {
        this.log(`${func.name}:`)
        func.polls.filter(p => p instanceof SqsPoll).forEach(poll => {
          this.log(`  POLL ${poll.arn}`)
        })
      })
      this.log('----')
    }

    this.functions.forEach(func => func.polls.forEach(poll => this._attachPoll(func, poll)))
  }

  stop () {
    this.isRunning = false
  }

  // Sets functions, including endpoints, using the serverless config and service path
  setConfiguration (serverlessConfig, servicePath, serverless) {
    this.serverless = serverless

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
      Object.assign({}, func, {polls: getPolling(func)})
    ).filter(func =>
      func.polls.length > 0
    )
  }

  async _attachPoll (func, poll) {
    if (poll instanceof SqsPoll) {
      // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs-example.html
      const {QueueUrl} = await this.sqs.getQueueUrl({QueueName: poll.queueName}).promise()
      do {
        const {Messages} = await this.sqs.receiveMessage({
          AttributeNames: ['All'],
          MaxNumberOfMessages: 10, // Lambda defaults to 10
          MessageAttributeNames: ['All'],
          QueueUrl,
          WaitTimeSeconds: 10
        }).promise()

        if (!(Messages && Array.isArray(Messages) && Messages.length)) continue
        this.log(`${poll}`)

        let event = poll.getEvent({
          Records: Messages.map(m => ({
            messageId: m.MessageId,
            receiptHandle: m.ReceiptHandle,
            body: m.Body,
            attributes: m.Attributes,
            messageAttributes: m.MessageAttributes,
            md5OfBody: m.Md5OfBody,
            eventSource: m.EventSource,
            eventSourceARN: m.EventSourceARN,
            awsRegion: m.AwsRegion
          }))
        })
        this._executeLambdaHandler(func, event).then(result => {
          this.log(' ➡ Success')
          if (process.env.SLS_DEBUG) console.info(result)
          poll.handleSuccess(result)
          // NOTE : AWS sqs event trigger removes message from the queue, so we shall too!
          const entries = event.Records.map(record => ({Id: record.messageId, ReceiptHandle: record.receiptHandle}))
          return this.sqs.deleteMessageBatch({Entries: entries, QueueUrl}).promise()
        }).catch(error => {
          this.log(` ➡ Failure: ${error.message}`)
          if (process.env.SLS_DEBUG) console.error(error.stack)
          poll.handleFailure(error)
        })
      } while (this.isRunning)
    }
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
