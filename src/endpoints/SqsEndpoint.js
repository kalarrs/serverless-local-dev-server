'use strict'

const Endpoint = require('./Endpoint')

class SqsEndpoint extends Endpoint {
  constructor (sqsConfig, func) {
    super(sqsConfig, func)
    if (typeof sqsConfig === 'string') {
      sqsConfig = {arn: sqsConfig}
    }
    this.method = sqsConfig.method || 'GET'
    this.path = '/sqs/' + func.name + '/' + sqsConfig.arn.replace(/.*?:([^:]+)$/, '$1')
  }

  getLambdaEvent (request) {
    if (request.method === 'POST') {
      // Pass-through
      return request.body
    }

    return {
      Records: [
        {
          messageId: '19dd0b57-b21e-4ac1-bd88-01bbb068cb78',
          receiptHandle: 'MessageReceiptHandle',
          body: 'Hello from SQS!',
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: '1523232000000',
            SenderId: '123456789012',
            ApproximateFirstReceiveTimestamp: '1523232000001'
          },
          messageAttributes: {},
          md5OfBody: '7b270e59b47ff90a553787216d55d91d',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:us-west-2:123456789012:MyQueue',
          awsRegion: 'us-west-2'
        }
      ]
    }
  }

  handleLambdaSuccess (response, result) {
    response.send(result)
  }

  toString () {
    return `HTTP: ${this.method} ${this.resourcePath}`
  }
}

module.exports = SqsEndpoint
