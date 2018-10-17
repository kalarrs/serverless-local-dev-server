'use strict'

const Endpoint = require('./Endpoint')

class SqsEndpoint extends Endpoint {
  constructor (sqsConfig, func) {
    super(sqsConfig, func)
    if (typeof sqsConfig === 'string') {
      sqsConfig = {arn: sqsConfig}
    }
    this.functionName = func.name;
    this.arn = sqsConfig.arn
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
    return `POLLING: ${this.functionName} ${this.arn}`
  }
}

module.exports = SqsEndpoint



var params = {
  AttributeNames: [
    "SentTimestamp"
  ],
  MaxNumberOfMessages: 1,
  MessageAttributeNames: [
    "All"
  ],
  QueueUrl: queueURL,
  WaitTimeSeconds: 20
};

sqs.receiveMessage(