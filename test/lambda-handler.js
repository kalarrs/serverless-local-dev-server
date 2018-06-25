'use strict'

const path = require('path')
const fs = require('fs')
const helloMp3 = fs.readFileSync(path.join(__dirname, 'HelloEnglish-Joanna.0aa7a6dc7f1de9ac48769f366c6f447f9051db57.mp3'))

// Invokes the succeed callback
module.exports.succeed = (_, context) => {
  context.succeed()
}

// Invokes the fail callback
module.exports.fail = (_, context) => {
  context.fail(new Error('Some reason'))
}

// Returns process.env
module.exports.mirrorEnv = (request, context) => {
  context.succeed(process.env)
}

// Succeed if request object has correct form
module.exports.alexaSkill = (request, context) => {
  if (!request.session) {
    context.fail(new Error('session-object not in request JSON'))
  } else if (!request.request) {
    context.fail(new Error('request-object not in request JSON'))
  } else if (request.version !== '1.0') {
    context.fail(new Error('version not 1.0'))
  } else {
    context.succeed()
  }
}

// Succeed if request object has correct form, returning the request object
module.exports.httpGet = (request, context) => {
  if (request.httpMethod !== 'GET') {
    context.fail(new Error('httpMethod should be GET'))
  } else if (request.body.toString() !== '{}') {
    context.fail(new Error('body should be empty'))
  } else {
    context.succeed({
      headers: {'Content-Type': 'application/json'},
      statusCode: 200,
      body: request
    })
  }
}

// Succeed if request object has correct form, returning the request object
module.exports.httpGetAsync = async (request) => {
  if (request.httpMethod !== 'GET') {
    throw new Error('httpMethod should be GET')
  } else if (request.body.toString() !== '{}') {
    throw new Error('body should be empty')
  } else {
    return {
      headers: {'Content-Type': 'application/json'},
      statusCode: 200,
      body: request
    }
  }
}

module.exports.httpGetBinary = (request, context) => {
  if (request.httpMethod !== 'GET') {
    context.fail(new Error('httpMethod should be GET'))
  } else if (request.body.toString() !== '{}') {
    context.fail(new Error('body should be empty'))
  } else {
    context.succeed({
      headers: {'Content-Type': 'audio/mpeg'},
      statusCode: 200,
      body: helloMp3
    })
  }
}

module.exports.httpGetBinaryBase64 = (request, context) => {
  if (request.httpMethod !== 'GET') {
    context.fail(new Error('httpMethod should be GET'))
  } else if (request.body.toString() !== '{}') {
    context.fail(new Error('body should be empty'))
  } else {
    context.succeed({
      headers: {'Content-Type': 'audio/mpeg'},
      statusCode: 200,
      body: helloMp3.toString('base64'),
      isBase64Encoded: true
    })
  }
}

module.exports.httpGetBinaryBase64WithoutEncoding = (request, context) => {
  if (request.httpMethod !== 'GET') {
    context.fail(new Error('httpMethod should be GET'))
  } else if (request.body.toString() !== '{}') {
    context.fail(new Error('body should be empty'))
  } else {
    context.succeed({
      headers: {'Content-Type': 'audio/mpeg'},
      statusCode: 200,
      body: helloMp3,
      isBase64Encoded: true
    })
  }
}

// Succeed if request object has correct form
module.exports.httpPost = (request, context) => {
  if (request.httpMethod !== 'POST') {
    context.fail(new Error('httpMethod not POST'))
  } else if (request.body.toString() === '{"foo":"bar"}') {
    context.fail(new Error('body should not be empty'))
  } else {
    context.succeed({
      statusCode: 204
    })
  }
}

module.exports.schedule = (request, context) => {
  if (request.account !== '123456789012') {
    context.fail(new Error('event should be a mock AWS schedule event'))
  } else {
    context.succeed()
  }
}

module.exports.scheduleCustomInput = (request, context) => {
  if (request.key !== 'value') {
    context.fail(new Error('event should be custom event'))
  } else {
    context.succeed()
  }
}
