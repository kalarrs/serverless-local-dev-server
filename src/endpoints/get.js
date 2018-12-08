'use strict'

const mappings = {
  alexaSkill: require('./AlexaSkillEndpoint'),
  http: require('./HttpEndpoint'),
  schedule: require('./ScheduleEndpoint'),
  cloudwatchLog: require('./CloudWatchLogEndpoint'),
  sqs: require('./SqsEndpoint'),
  s3: require('./S3Endpoint'),
  existingS3: require('./S3Endpoint')
}

module.exports = (func) => {
  return func.config.events.map(event => {
    switch (typeof event) {
      case 'string':
        return {type: event, config: {}}
      case 'object':
        let type = Object.keys(event)[0]
        return {type: type, config: event[type]}
      /* istanbul ignore next */
      default:
        return null
    }
  }).filter(_ =>
      !!mappings[_.type]
    // NOTE : Could filter out the the schedules that are not enabled here. Seems ghetto.
  ).reduce((arr, _) => {
    if (_.type === 'schedule' || _.type === 'sqs' || _.type === 'cloudwatchLog') {
      let config
      switch (_.type) {
        case 'schedule':
          config = typeof _.config === 'string'
            ? {rate: _.config}
            : {..._.config}
          break
        case 'sqs':
          config = typeof _.config === 'string'
            ? {arn: _.config}
            : {..._.config}
          break
        case 'cloudwatchLog':
          config = typeof _.config === 'string'
            ? {logGroup: _.config}
            : {..._.config}
          break
      }
      arr.push({
        ..._,
        config: {
          ...config,
          method: 'POST',
          input: null
        }
      })
    }
    arr.push(_)
    return arr
  }, []).map(_ => {
    let endpoint = new mappings[_.type](_.config, func)
    endpoint.type = _.type
    return endpoint
  })
}
