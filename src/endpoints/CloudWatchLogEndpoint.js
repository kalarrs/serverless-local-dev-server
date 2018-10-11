'use strict'

const Endpoint = require('./Endpoint')

class CloudWatchLogEndpoint extends Endpoint {
  constructor (cloudWatchLogConfig, func) {
    super(cloudWatchLogConfig, func)
    if (typeof cloudWatchLogConfig === 'string') {
      cloudWatchLogConfig = {logGroup: cloudWatchLogConfig}
    }
    this.method = cloudWatchLogConfig.method || 'GET'
    this.path = '/cloudwatch-logs/' + func.name + '/' + cloudWatchLogConfig.logGroup.replace(/^\//, '')
  }

  getLambdaEvent (request) {
    if (request.method === 'POST') {
      // Pass-through
      return request.body
    }

    return {
      awslogs: {
        data: 'H4sIAAAAAAAAAHWPwQqCQBCGX0Xm7EFtK+smZBEUgXoLCdMhFtKV3akI8d0bLYmibvPPN3wz00CJxmQnTO41whwWQRIctmEcB6sQbFC3CjW3XW8kxpOpP+OC22d1Wml1qZkQGtoMsScxaczKN3plG8zlaHIta5KqWsozoTYw3/djzwhpLwivWFGHGpAFe7DL68JlBUk+l7KSN7tCOEJ4M3/qOI49vMHj+zCKdlFqLaU2ZHV2a4Ct/an0/ivdX8oYc1UVX860fQDQiMdxRQEAAA=='
      }
    }
  }

  handleLambdaSuccess (response, result) {
    response.send(result)
  }

  toString () {
    return `HTTP: ${this.method} ${this.resourcePath}`
  }
}

module.exports = CloudWatchLogEndpoint
