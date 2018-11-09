'use strict'

const Poll = require('./Poll')

class SqsPoll extends Poll {
  constructor (sqsConfig, func) {
    super(sqsConfig, func)
    if (typeof sqsConfig === 'string') {
      sqsConfig = {arn: sqsConfig}
    }
    this.functionName = func.name
    this.arn = sqsConfig.arn
    this.queueName = sqsConfig.arn.replace(/.*?:([^:]+)$/, '$1')
  }

  toString () {
    return `SQS: ${this.functionName} ${this.queueName}`
  }
}

module.exports = SqsPoll
