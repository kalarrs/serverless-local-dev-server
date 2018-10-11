'use strict'

const Endpoint = require('./Endpoint')
const cronstrue = require('cronstrue')
const moment = require('moment')

class ScheduleEndpoint extends Endpoint {
  constructor (scheduleConfig, func) {
    super(scheduleConfig, func)
    if (typeof scheduleConfig === 'string') {
      scheduleConfig = {rate: scheduleConfig}
    }
    this.method = scheduleConfig.method || 'GET'
    this.input = scheduleConfig.input || null

    let rateInEnglish = ''
    let suffix = ''
    if (scheduleConfig.rate.startsWith('cron')) {
      suffix = func.config.showLocalTime ? '-LOCAL' : '-UTC'
      let cronExpression = scheduleConfig.rate.replace(/^cron\((.*?)\)/g, '$1')
      let cronParts = cronExpression.split(' ')
      if (cronParts.length !== 6) throw new Error('Cron expression should contain 6 parts. See https://docs.aws.amazon.com/lambda/latest/dg/tutorial-scheduled-events-schedule-expressions.html')
      if (func.config.showLocalTime) {
        cronExpression = [
          ...cronParts.slice(0, 1),
          moment().utc().hours(cronParts[1]).minutes(0).local().hours(),
          ...cronParts.slice(2)
        ].join(' ')
      }
      rateInEnglish = 'cron-' + cronstrue.toString(`0 ${cronExpression}`).replace(',', '')
    }
    if (scheduleConfig.rate.startsWith('rate')) rateInEnglish = 'rate-' + scheduleConfig.rate.replace(/^rate\((.*?)\)/g, '$1')
    this.resourcePath = rateInEnglish.replace(/\(|\)|\s+/g, '-').replace(/(^\/|(\/|-)$)/g, '') + suffix
    this.path = '/schedule/' + func.name + '/' + this.resourcePath
  }

  getLambdaEvent (request) {
    if (request.method === 'POST') {
      // Pass-through
      return request.body
    }

    return this.input || {
      account: '123456789012',
      region: 'us-east-1',
      detail: {},
      'detail-type': 'Scheduled Event',
      source: 'aws.events',
      time: new Date().toISOString(),
      id: 'cdc73f9d-aea9-11e3-9d5a-835b769c0d9c',
      resources: [
        'arn:aws:events:us-east-1:123456789012:rule/my-schedule'
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

module.exports = ScheduleEndpoint
