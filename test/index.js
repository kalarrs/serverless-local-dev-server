'use strict'

/* global describe it beforeEach afterEach */
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const fetch = require('node-fetch')
const sinon = require('sinon')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const LocalDevServer = require('../src')
const path = require('path')
const fs = require('fs')
const moment = require('moment')
const helloMp3 = fs.readFileSync(path.join(__dirname, 'HelloEnglish-Joanna.0aa7a6dc7f1de9ac48769f366c6f447f9051db57.mp3'))

chai.use(chaiAsPromised)
const expect = chai.expect

describe('index.js', () => {
  let sandbox, serverless, localDevServer

  const sendAlexaRequest = (port, name) => {
    return fetch(`http://localhost:${port}/alexa-skill/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: '{"session":{},"request":{},"version":"1.0"}'
    })
  }

  const sendHttpGetRequest = (port, path) => {
    return fetch(`http://localhost:${port}/http/${path}`)
  }

  const sendScheduleGetRequest = (port, path) => {
    return fetch(`http://localhost:${port}/schedule/${path}`)
  }

  const sendSchedulePostRequest = (port, path) => {
    return fetch(`http://localhost:${port}/schedule/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: '{"account":"123456789012","region":"us-east-1","detail":{},"detail-type":"Scheduled Event","source":"aws.events","time":"2018-10-11T22:12:48.774Z","id":"cdc73f9d-aea9-11e3-9d5a-835b769c0d9c","resources":["arn:aws:events:us-east-1:123456789012:rule/my-schedule"]}'
    })
  }

  const sendCloudWatchLogsGetRequest = (port, path) => {
    return fetch(`http://localhost:${port}/cloudwatch-logs/${path}`)
  }

  const sendCloudWatchLogsPostRequest = (port, path) => {
    return fetch(`http://localhost:${port}/cloudwatch-logs/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: '{"awslogs":{"data":"H4sIAAAAAAAAAHWPwQqCQBCGX0Xm7EFtK+smZBEUgXoLCdMhFtKV3akI8d0bLYmibvPPN3wz00CJxmQnTO41whwWQRIctmEcB6sQbFC3CjW3XW8kxpOpP+OC22d1Wml1qZkQGtoMsScxaczKN3plG8zlaHIta5KqWsozoTYw3/djzwhpLwivWFGHGpAFe7DL68JlBUk+l7KSN7tCOEJ4M3/qOI49vMHj+zCKdlFqLaU2ZHV2a4Ct/an0/ivdX8oYc1UVX860fQDQiMdxRQEAAA=="}}'
    })
  }

  const sendS3GetRequest = (port, path) => {
    return fetch(`http://localhost:${port}/s3/${path}`)
  }

  const sendS3PostRequest = (port, path) => {
    return fetch(`http://localhost:${port}/s3/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: '{"Records":[{"eventVersion":"2.0","eventSource":"aws:s3","awsRegion":"us-west-2","eventTime":"1970-01-01T00:00:00.000Z","eventName":"ObjectRemoved:Delete","userIdentity":{"principalId":"EXAMPLE"},"requestParameters":{"sourceIPAddress":"127.0.0.1"},"responseElements":{"x-amz-request-id":"EXAMPLE123456789","x-amz-id-2":"EXAMPLE123/5678abcdefghijklambdaisawesome/mnopqrstuvwxyzABCDEFGH"},"s3":{"s3SchemaVersion":"1.0","configurationId":"testConfigRule","bucket":{"name":"example-bucket","ownerIdentity":{"principalId":"EXAMPLE"},"arn":"arn:aws:s3:::example-bucket"},"object":{"key":"test/key","sequencer":"0A1B2C3D4E5F678901"}}}]}'
    })
  }

  const sendHttpPostRequest = (port, path) => {
    return fetch(`http://localhost:${port}/http/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: '{"foo":"bar"}'
    })
  }

  const sendHttpOptionsRequest = (port, path) => {
    return fetch(`http://localhost:${port}/http/${path}`, {
      method: 'OPTIONS',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
  }

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    serverless = new Serverless()
    return serverless.init().then(() => {
      serverless.setProvider('aws', new AwsProvider(serverless))
      serverless.config.servicePath = __dirname
    })
  })

  afterEach((done) => {
    if (localDevServer && localDevServer.server && localDevServer.server.server) localDevServer.server.server.close()
    sandbox.restore()
    done()
  })

  it('should have hooks', () => {
    localDevServer = new LocalDevServer(serverless)
    expect(Object.keys(localDevServer.hooks).length).to.not.equal(0)
  })

  it('should start a server and accept various requests', () => {
    serverless.service.functions = {
      'MyAlexaSkill': {
        handler: 'lambda-handler.alexaSkill',
        events: ['alexaSkill']
      },
      'MyHttpResource': {
        handler: 'lambda-handler.httpGet',
        events: [{http: {method: 'GET', path: '/'}}]
      },
      'MyHttpResourceAsync': {
        handler: 'lambda-handler.httpGetAsync',
        events: [{http: {method: 'GET', path: '/'}}]
      },
      'MyHttpResourceID': {
        handler: 'lambda-handler.httpGet',
        events: [{http: {method: 'GET', path: '/:id'}}]
      },
      'MyShorthandHttpResource': {
        handler: 'lambda-handler.httpPost',
        events: [{http: 'POST shorthand'}]
      },
      'MySchedule': {
        handler: 'lambda-handler.schedule',
        events: [
          {schedule: 'rate(1 day)'}, {schedule: 'cron(0 10 * * ? *)'}, {schedule: 'cron(15 12 * * ? *)'},
          {schedule: 'cron(0 18 ? * MON-FRI *)'}, {schedule: 'cron(0 8 1 * ? *)'}, {schedule: 'cron(0/10 * ? * MON-FRI *)'},
          {schedule: 'cron(0/5 8-17 ? * MON-FRI *)'}, {schedule: 'cron(0 9 ? * 2#1 *)'}
        ]
      },
      'MyScheduleCustomInput': {
        handler: 'lambda-handler.scheduleCustomInput',
        events: [{schedule: {rate: 'rate(10 minute)', enabled: true, input: {key: 'value', arr: [1, 2]}}}]
      },
      'MyCloudWatchLogs': {
        handler: 'lambda-handler.cloudWatchLog',
        events: [
          {cloudwatchLog: 'group1'}, {cloudwatchLog: '/group2'}, {cloudwatchLog: '/group3/subpath'}
        ]
      },
      'MyCloudWatchLogsObject': {
        handler: 'lambda-handler.cloudWatchLog',
        events: [
          {cloudwatchLog: {logGroup: 'group1', filter: '$.userIdentity.type = Root'}},
          {cloudwatchLog: {logGroup: '/group2', filter: '$.userIdentity.type = Root'}},
          {cloudwatchLog: {logGroup: '/group3/subpath', filter: '$.userIdentity.type = Root'}}
        ]
      },
      'MyS3': {
        handler: 'lambda-handler.s3',
        events: [
          {s3: 'photos'}
        ]
      },
      'MyS3Object': {
        handler: 'lambda-handler.s3',
        events: [
          {s3: {bucket: 'photos1', event: 's3:ObjectCreated:*'}},
          {s3: {bucket: 'photos2', event: 's3:ObjectRemoved:*'}},
          {s3: {bucket: 'photos3', rules: {prefix: 'uploads/', suffix: '.jpg'}}},
          {s3: {bucket: 'photos4', rules: {prefix: 'uploads/clients', suffix: '.jpg'}}},
          {s3: {bucket: 'photos5', rules: {prefix: 'shared/'}}},
          {s3: {bucket: 'photos6', rules: {suffix: '.mpg'}}}
        ]
      },
      'MyExistingS3': {
        handler: 'lambda-handler.s3',
        events: [
          {s3: 'puppies'}
        ]
      },
      'MyExistingS3Object': {
        handler: 'lambda-handler.s3',
        events: [
          {s3: {bucket: 'puppies1', event: 's3:ObjectCreated:*'}},
          {s3: {bucket: 'puppies2', event: 's3:ObjectRemoved:*'}},
          {s3: {bucket: 'puppies3', rules: {prefix: 'uploads/', suffix: '.jpg'}}},
          {s3: {bucket: 'puppies4', rules: {prefix: 'uploads/clients', suffix: '.jpg'}}},
          {s3: {bucket: 'puppies5', rules: {prefix: 'shared/'}}},
          {s3: {bucket: 'puppies6', rules: {suffix: '.mpg'}}}
        ]
      }
    }
    localDevServer = new LocalDevServer(serverless)
    localDevServer.hooks['local-dev-server:loadEnvVars']()
    localDevServer.hooks['local-dev-server:start']()
    return Promise.all([
      sendHttpOptionsRequest(5005, 'shorthand', {}).then(result => {
        expect(result.status).equal(200)
        expect(result.headers._headers['allow'][0]).to.equal('GET,HEAD,POST')
        return expect(result.headers._headers['access-control-allow-origin']).to.be.undefined
      }),
      sendAlexaRequest(5005, 'MyAlexaSkill').then(result =>
        expect(result.ok).equal(true)
      ),
      sendHttpGetRequest(5005, '?a=b&c=d').then(result => {
        expect(result.status).equal(200)
        return result.json().then(json => {
          expect(json.queryStringParameters.a).equal('b')
          expect(json.queryStringParameters.c).equal('d')
          expect(json.pathParameters).eql({})
        })
      }),
      sendHttpGetRequest(5005, '?a=b&c=d').then(result => {
        expect(result.status).equal(200)
        return result.json().then(json => {
          expect(json.queryStringParameters.a).equal('b')
          expect(json.queryStringParameters.c).equal('d')
          expect(json.pathParameters).eql({})
        })
      }),
      sendHttpGetRequest(5005, '12345').then(result => {
        expect(result.status).equal(200)
        return result.json().then(json => {
          expect(json.pathParameters.id).eql('12345')
        })
      }),
      sendHttpPostRequest(5005, 'shorthand', {}).then(result => {
        expect(result.status).equal(204)
      }),
      sendSchedulePostRequest(5005, 'MySchedule/rate-1-day', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendScheduleGetRequest(5005, 'MySchedule/rate-1-day', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendScheduleGetRequest(5005, 'MySchedule/cron-At-10:00-AM-UTC', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendScheduleGetRequest(5005, 'MySchedule/cron-At-12:15-PM-UTC', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendScheduleGetRequest(5005, 'MySchedule/cron-At-06:00-PM-Monday-through-Friday-UTC', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendScheduleGetRequest(5005, 'MySchedule/cron-At-08:00-AM-on-day-1-of-the-month-UTC', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendScheduleGetRequest(5005, 'MySchedule/cron-Every-10-minutes-Monday-through-Friday-UTC', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendScheduleGetRequest(5005, 'MySchedule/cron-Every-5-minutes-between-08:00-AM-and-05:59-PM,-Monday-through-Friday-UTC', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendScheduleGetRequest(5005, 'MySchedule/cron-At-09:00-AM-on-the-first-Tuesday-of-the-month-UTC', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendScheduleGetRequest(5005, 'MyScheduleCustomInput/rate-10-minute', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendCloudWatchLogsPostRequest(5005, 'MyCloudWatchLogs/group1', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendCloudWatchLogsGetRequest(5005, 'MyCloudWatchLogs/group1', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendCloudWatchLogsGetRequest(5005, 'MyCloudWatchLogs/group2', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendCloudWatchLogsGetRequest(5005, 'MyCloudWatchLogs/group3/subpath', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendCloudWatchLogsGetRequest(5005, 'MyCloudWatchLogsObject/group1', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendCloudWatchLogsGetRequest(5005, 'MyCloudWatchLogsObject/group2', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendCloudWatchLogsGetRequest(5005, 'MyCloudWatchLogsObject/group3/subpath', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendS3PostRequest(5005, 'MyS3/all/photos', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendS3GetRequest(5005, 'MyS3/all/photos', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendS3GetRequest(5005, 'MyS3Object/created/photos1', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendS3GetRequest(5005, 'MyS3Object/deleted/photos2', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendS3GetRequest(5005, 'MyS3Object/all/uploads/photos3/.jpg', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendS3GetRequest(5005, 'MyS3Object/all/uploads/clients/photos4/.jpg', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendS3GetRequest(5005, 'MyS3Object/all/shared/photos5', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendS3GetRequest(5005, 'MyS3Object/all/photos6/.mpg', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendS3PostRequest(5005, 'MyExistingS3/all/puppies', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendS3GetRequest(5005, 'MyExistingS3/all/puppies', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendS3GetRequest(5005, 'MyExistingS3Object/created/puppies1', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendS3GetRequest(5005, 'MyExistingS3Object/deleted/puppies2', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendS3GetRequest(5005, 'MyExistingS3Object/all/uploads/puppies3/.jpg', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendS3GetRequest(5005, 'MyExistingS3Object/all/uploads/clients/puppies4/.jpg', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendS3GetRequest(5005, 'MyExistingS3Object/all/shared/puppies5', {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendS3GetRequest(5005, 'MyExistingS3Object/all/puppies6/.mpg', {}).then(result => {
        expect(result.status).equal(200)
      })
    ])
  })

  it('should start a server and accept http requests that return binary', () => {
    serverless.service.functions = {
      'MyHttpResourceBinary': {
        handler: 'lambda-handler.httpGetBinary',
        events: [{http: {method: 'GET', path: '/binary'}}]
      },
      'MyHttpResourceBinaryBase64': {
        handler: 'lambda-handler.httpGetBinaryBase64',
        events: [{http: {method: 'GET', path: '/binary-base64'}}]
      },
      'MyHttpResourceBinaryBase64WithoutEncoding': {
        handler: 'lambda-handler.httpGetBinaryBase64WithoutEncoding',
        events: [{http: {method: 'GET', path: '/binary-base64-without-encoding'}}]
      }
    }
    localDevServer = new LocalDevServer(serverless)
    localDevServer.hooks['local-dev-server:loadEnvVars']()
    localDevServer.hooks['local-dev-server:start']()
    return Promise.all([
      sendHttpGetRequest(5005, 'binary').then(result => {
        expect(result.status).equal(200)
        return result.buffer().then(buffer => {
          expect(buffer.toString('base64')).equal(helloMp3.toString('base64'))
        })
      }),
      sendHttpGetRequest(5005, 'binary-base64').then(result => {
        expect(result.status).equal(200)
        return result.buffer().then(buffer => {
          expect(buffer.toString('base64')).equal(helloMp3.toString('base64'))
        })
      }),
      sendHttpGetRequest(5005, 'binary-base64-without-encoding').then(result => {
        expect(result.status).equal(500)
      })
    ])
  })

  it('should start a server with a custom port and accept requests', () => {
    serverless.service.functions = {
      'MyHttpResource': {
        handler: 'lambda-handler.httpGet',
        events: [{http: 'GET /'}]
      }
    }
    localDevServer = new LocalDevServer(serverless, {port: 5006})
    localDevServer.hooks['local-dev-server:loadEnvVars']()
    localDevServer.hooks['local-dev-server:start']()
    return sendHttpGetRequest(5006, '').then(result =>
      expect(result.ok).equal(true)
    )
  })

  it('should start a server with a custom port and accept requests', () => {
    serverless.service.functions = {
      'MyHttpResource': {
        handler: 'lambda-handler.httpGet',
        events: [{http: 'GET /'}]
      }
    }
    serverless.service.custom = {
      localDevPort: '5007'
    }

    localDevServer = new LocalDevServer(serverless)
    localDevServer.hooks['local-dev-server:loadEnvVars']()
    localDevServer.hooks['local-dev-server:start']()
    return sendHttpGetRequest(5007, '').then(result =>
      expect(result.ok).equal(true)
    )
  })

  it('should set environment variables correctly', () => {
    serverless.service.provider.profile = 'default'
    serverless.service.provider.region = 'us-west-2'
    serverless.service.provider.environment = {
      foo: 'bar',
      bla: 'blub',
      la: 'la'
    }
    serverless.service.functions = {
      'MyAlexaSkill': {
        handler: 'lambda-handler.mirrorEnv',
        events: ['alexaSkill'],
        environment: {
          foo: 'baz'
        }
      }
    }
    let options = {
      environment: {la: 'lala'},
      port: 5007
    }
    localDevServer = new LocalDevServer(serverless, options)
    localDevServer.hooks['local-dev-server:loadEnvVars']()
    localDevServer.hooks['local-dev-server:start']()
    return sendAlexaRequest(5007, 'MyAlexaSkill').then(result => {
      expect(result.ok).equal(true)
      return result.json()
    }).then(json => {
      expect(json.IS_LOCAL).equal(true)
      expect(json.foo).equal('baz')
      expect(json.bla).equal('blub')
      expect(json.AWS_PROFILE).equal('default')
      expect(json.AWS_REGION).equal('us-west-2')
    })
  })

  it('should not start a server if no supported events are specified', () => {
    serverless.service.functions = {
      'SomeFunction': {
        handler: 'lambda-handler.none',
        events: ['blub']
      }
    }
    localDevServer = new LocalDevServer(serverless, {port: 5008})
    localDevServer.hooks['local-dev-server:loadEnvVars']()
    localDevServer.hooks['local-dev-server:start']()
    // Expect rejection of request as no server is running on port 5008
    return expect(sendAlexaRequest(5008)).to.be.rejected
  })

  it('should handle failures', () => {
    serverless.service.functions = {
      'MyAlexaSkill': {
        handler: 'lambda-handler.fail',
        events: ['alexaSkill']
      },
      'MyHttpResource': {
        handler: 'lambda-handler.fail',
        events: [{http: 'GET /'}]
      }
    }
    localDevServer = new LocalDevServer(serverless, {port: 5009})
    localDevServer.hooks['local-dev-server:loadEnvVars']()
    localDevServer.hooks['local-dev-server:start']()
    return Promise.all([
      sendAlexaRequest(5009).then(result =>
        expect(result.ok).equal(false)
      ),
      sendHttpGetRequest(5009, '').then(result =>
        expect(result.ok).equal(false)
      )
    ])
  })

  it('should look in the .webpack/service folder when webpack plugin is present', () => {
    let expectedPath = path.join(__dirname, '.webpack/service', 'lambda-handler')
    serverless.service.functions = {
      'MyHttpResource': {
        handler: 'lambda-handler.httpGet',
        events: [{http: {method: 'GET', path: '/'}}]
      }
    }
    serverless.service.plugins = ['serverless-webpack']

    localDevServer = new LocalDevServer(serverless, {port: 5009})
    localDevServer.hooks['local-dev-server:loadEnvVars']()
    localDevServer.hooks['local-dev-server:start']()
    expect(localDevServer.server.functions[0].handlerModulePath).equal(expectedPath)
  })

  it('should host static files if the config is present', () => {
    let expectedPath = path.join(__dirname, '/static')
    serverless.service.functions = {
      'MyHttpResource': {
        handler: 'lambda-handler.httpGet',
        events: [{http: {method: 'GET', path: '/'}}]
      }
    }
    serverless.service.plugins = ['serverless-webpack']
    serverless.service.custom = {
      localDevStaticFolder: '/static'
    }

    localDevServer = new LocalDevServer(serverless, {port: 5009})
    localDevServer.hooks['local-dev-server:loadEnvVars']()
    localDevServer.hooks['local-dev-server:start']()
    expect(localDevServer.server.staticFolder).equal(expectedPath)
  })

  it('should not host static files if the config is not present', () => {
    serverless.service.functions = {
      'MyHttpResource': {
        handler: 'lambda-handler.httpGet',
        events: [{http: {method: 'GET', path: '/'}}]
      }
    }
    serverless.service.plugins = ['serverless-webpack']
    if (serverless.service) delete serverless.service.custom

    localDevServer = new LocalDevServer(serverless, {port: 5009})
    localDevServer.hooks['local-dev-server:loadEnvVars']()
    localDevServer.hooks['local-dev-server:start']()
    expect(localDevServer.server.staticFolder).equal(false)
  })

  it('should prefix the paths if the basePath is present', () => {
    serverless.service.functions = {
      'MyHttpResource': {
        handler: 'lambda-handler.httpGet',
        events: [{http: {method: 'GET', path: '/'}}]
      }
    }
    serverless.service.plugins = ['serverless-domain-manager']
    serverless.service.custom = {
      customDomain: {basePath: 'members'}
    }
    let expectedPath = '/http/' + serverless.service.custom.customDomain.basePath

    localDevServer = new LocalDevServer(serverless, {port: 5009})
    localDevServer.hooks['local-dev-server:loadEnvVars']()
    localDevServer.hooks['local-dev-server:start']()
    expect(localDevServer.server.functions[0].endpoints[0].path).equal(expectedPath)
  })

  it('should throw an exception if cron is less than 6 parts', () => {
    serverless.service.functions = {
      'MySchedule': {
        handler: 'lambda-handler.schedule',
        events: [{schedule: 'cron(0 18 ? * MON-FRI)'}]
      }
    }
    serverless.service.plugins = ['serverless-domain-manager']
    serverless.service.custom = {
      customDomain: {basePath: 'members'}
    }

    localDevServer = new LocalDevServer(serverless, {port: 5009})
    localDevServer.hooks['local-dev-server:loadEnvVars']()
    expect(localDevServer.hooks['local-dev-server:start']).to.throw()
  })

  it('should show hour for cron as local time if localDevScheduleShowLocalTime is set to true', () => {
    serverless.service.functions = {
      'MySchedule': {
        handler: 'lambda-handler.schedule',
        events: [
          {schedule: 'cron(0 1 * * ? *)'}, {schedule: 'cron(0 8 * * ? *)'},
          {schedule: 'cron(0 15 * * ? *)'}, {schedule: 'cron(0 22 * * ? *)'}
        ]
      }
    }
    serverless.service.plugins = ['serverless-domain-manager']
    serverless.service.custom = {
      localDevScheduleShowLocalTime: true
    }

    let [hour1, meridiem1] = moment().utc().hours(1).minutes(0).local().format('hh A').split(' ')
    let [hour2, meridiem2] = moment().utc().hours(8).minutes(0).local().format('hh A').split(' ')
    let [hour3, meridiem3] = moment().utc().hours(15).minutes(0).local().format('hh A').split(' ')
    let [hour4, meridiem4] = moment().utc().hours(22).minutes(0).local().format('hh A').split(' ')

    localDevServer = new LocalDevServer(serverless)
    localDevServer.hooks['local-dev-server:loadEnvVars']()
    localDevServer.hooks['local-dev-server:start']()
    return Promise.all([
      sendScheduleGetRequest(5005, `MySchedule/cron-At-${hour1}:00-${meridiem1}-LOCAL`, {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendScheduleGetRequest(5005, `MySchedule/cron-At-${hour2}:00-${meridiem2}-LOCAL`, {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendScheduleGetRequest(5005, `MySchedule/cron-At-${hour3}:00-${meridiem3}-LOCAL`, {}).then(result => {
        expect(result.status).equal(200)
      }),
      sendScheduleGetRequest(5005, `MySchedule/cron-At-${hour4}:00-${meridiem4}-LOCAL`, {}).then(result => {
        expect(result.status).equal(200)
      })
    ])
  })

  it('should return cors on all requests if custom localDevCors is set to true', () => {
    serverless.service.functions = {
      'MyShorthandHttpResource': {
        handler: 'lambda-handler.httpPost',
        events: [{http: 'POST shorthand'}]
      }
    }
    serverless.service.custom = {
      localDevCors: true
    }

    localDevServer = new LocalDevServer(serverless)
    localDevServer.hooks['local-dev-server:loadEnvVars']()
    localDevServer.hooks['local-dev-server:start']()
    return Promise.all([
      sendHttpOptionsRequest(5005, 'shorthand', {}).then(result => {
        expect(result.headers._headers['access-control-allow-origin'][0]).equal('*')
        expect(result.headers._headers['access-control-allow-methods'][0]).equal('GET,HEAD,PUT,PATCH,POST,DELETE')
        expect(result.status).equal(204)
      })
    ])
  })

  it('should return cors on specific requests if cors is set to true on the http event', () => {
    serverless.service.functions = {
      'MyHttpResource': {
        handler: 'lambda-handler.httpPost',
        events: [{http: {method: 'POST', path: 'post-no-cors/'}}]
      },
      'MyCorsHttpResource': {
        handler: 'lambda-handler.httpPost',
        events: [{http: {method: 'POST', path: 'post-cors/', cors: true}}]
      }
    }
    serverless.service.custom = {
      localDevCors: false
    }

    localDevServer = new LocalDevServer(serverless)
    localDevServer.hooks['local-dev-server:loadEnvVars']()
    localDevServer.hooks['local-dev-server:start']()
    return Promise.all([
      sendHttpOptionsRequest(5005, 'post-no-cors', {}).then(result => {
        expect(result.status).equal(200)
        expect(result.headers._headers['allow'][0]).to.equal('POST')
        return expect(result.headers._headers['access-control-allow-origin']).to.be.undefined
      }),
      sendHttpOptionsRequest(5005, 'post-cors', {}).then(result => {
        expect(result.headers._headers['access-control-allow-origin'][0]).equal('*')
        expect(result.headers._headers['access-control-allow-methods'][0]).equal('GET,HEAD,PUT,PATCH,POST,DELETE')
        expect(result.status).equal(204)
      })
    ])
  })
})
