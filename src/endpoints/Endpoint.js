'use strict'

class Endpoint {
  constructor (eventConfig, func) {
    this.method = 'GET'
    this.path = ''
    this.cors = false
  }

  /* istanbul ignore next */
  getLambdaEvent (request) {
    return {}
  }

  /* istanbul ignore next */
  handleLambdaSuccess (response, result) {
    response.sendStatus(204)
  }

  /* istanbul ignore next */
  handleLambdaFailure (response, error) {
    response.sendStatus(500)
  }
}

module.exports = Endpoint
