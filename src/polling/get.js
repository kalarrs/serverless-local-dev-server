'use strict'

const mappings = {
  'sqs': require('./SqsPoll')
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
  ).map(_ => {
    let poll = new mappings[_.type](_.config, func)
    poll.type = _.type
    return poll
  })
}
