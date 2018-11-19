'use strict'

const Endpoint = require('./Endpoint')

class HttpEndpoint extends Endpoint {
  constructor (httpConfig, func) {
    super(httpConfig, func)
    if (typeof httpConfig === 'string') {
      let s = httpConfig.split(' ')
      httpConfig = {method: s[0], path: s[1]}
    }
    this.method = httpConfig.method
    this.resourcePath = httpConfig.path.replace(/\{([a-zA-Z_]+)\}/g, ':$1').replace(/(^\/|\/$)/g, '')
    this.path = this.resourcePath.length ? '/http/' + this.resourcePath : '/http'
    if (typeof httpConfig.cors === 'string') this.cors = httpConfig.cors === 'true'
    if (typeof httpConfig.cors === 'boolean') this.cors = httpConfig.cors
  }

  getLambdaEvent (request) {
    return {
      httpMethod: request.method,
      body: JSON.stringify(request.body, null, '  '),
      queryStringParameters: request.query,
      pathParameters: request.params || {},
      headers: request.headers || {}
    }
  }

  handleLambdaSuccess (response, result) {
    if (result.headers) {
      response.set(result.headers)
    }
    response.status(result.statusCode)
    const body = result.body === 'object' ? JSON.stringify(result.body) : result.body
    if (result.isBase64Encoded && typeof body !== 'string') throw new Error('the body is not a base64 encoded string')
    response.send(result.isBase64Encoded ? Buffer.from(body, 'base64') : body)
  }

  toString () {
    return `HTTP: ${this.method} ${this.resourcePath}`
  }
}

module.exports = HttpEndpoint
