'use strict'

const Endpoint = require('./Endpoint')

const s3PutEvent = {
  Records: [{
    eventVersion: '2.0',
    eventSource: 'aws:s3',
    awsRegion: 'us-west-2',
    eventTime: '1970-01-01T00:00:00.000Z',
    eventName: 'ObjectCreated:Put',
    userIdentity: {principalId: 'EXAMPLE'},
    requestParameters: {sourceIPAddress: '127.0.0.1'},
    responseElements: {
      'x-amz-request-id': 'EXAMPLE123456789',
      'x-amz-id-2':
        'EXAMPLE123/5678abcdefghijklambdaisawesome/mnopqrstuvwxyzABCDEFGH'
    },
    s3: {
      s3SchemaVersion: '1.0',
      configurationId: 'testConfigRule',
      bucket: {
        name: 'example-bucket',
        ownerIdentity: {principalId: 'EXAMPLE'},
        arn: 'arn:aws:s3:::example-bucket'
      },
      object: {
        key: 'test/key',
        size: 1024,
        eTag: '0123456789abcdef0123456789abcdef',
        sequencer: '0A1B2C3D4E5F678901'
      }
    }
  }]
}

const s3DeleteEvent = {
  Records: [{
    eventVersion: '2.0',
    eventSource: 'aws:s3',
    awsRegion: 'us-west-2',
    eventTime: '1970-01-01T00:00:00.000Z',
    eventName: 'ObjectRemoved:Delete',
    userIdentity: {principalId: 'EXAMPLE'},
    requestParameters: {sourceIPAddress: '127.0.0.1'},
    responseElements: {
      'x-amz-request-id': 'EXAMPLE123456789',
      'x-amz-id-2':
        'EXAMPLE123/5678abcdefghijklambdaisawesome/mnopqrstuvwxyzABCDEFGH'
    },
    s3: {
      s3SchemaVersion: '1.0',
      configurationId: 'testConfigRule',
      bucket: {
        name: 'example-bucket',
        ownerIdentity: {principalId: 'EXAMPLE'},
        arn: 'arn:aws:s3:::example-bucket'
      },
      object: {key: 'test/key', sequencer: '0A1B2C3D4E5F678901'}
    }
  }]
}

class SqsEndpoint extends Endpoint {
  constructor (s3Config, func) {
    super(s3Config, func)
    if (typeof s3Config === 'string') {
      s3Config = {bucket: s3Config}
    }

    this.type = 'all'
    if (typeof s3Config.event === 'string') {
      if (/ObjectRemoved/gi.test(s3Config.event)) this.type = 'deleted'
      else if (/ObjectCreated/gi.test(s3Config.event)) this.type = 'created'
    }
    let prefix = ''
    if (s3Config.rules && s3Config.rules.prefix) prefix = s3Config.rules.prefix.replace(/^\/?(.*?)\/?$/gi, '$1/')

    const suffix = (s3Config.rules && s3Config.rules.suffix) || ''

    this.method = s3Config.method || 'GET'
    this.path = `/s3/${func.name}/${this.type}/${prefix}${s3Config.bucket.replace(/.*?:([^:]+)$/, '$1')}/${suffix}`.replace(/\/$/, '')
  }

  getLambdaEvent (request) {
    if (request.method === 'POST') {
      // Pass-through
      return request.body
    }

    return this.type === 'delete' ? s3DeleteEvent : s3PutEvent
  }

  handleLambdaSuccess (response, result) {
    response.send(result)
  }

  toString () {
    return `HTTP: ${this.method} ${this.resourcePath}`
  }
}

module.exports = SqsEndpoint
