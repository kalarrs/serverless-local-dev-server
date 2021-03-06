'use strict'

const Server = require('./Server.js')
const Polling = require('./Polling.js')

class ServerlessLocalDevServerPlugin {
  constructor (serverless, options) {
    this.serverless = serverless
    this.options = options || {}

    this.commands = {
      'local-dev-server': {
        usage: 'Runs a local dev server for Alexa-Skill and HTTP functions',
        lifecycleEvents: ['loadEnvVars', 'start'],
        options: {
          port: {usage: 'Port to listen on', shortcut: 'p'}
        }
      }
    }

    this.hooks = {
      'local-dev-server:loadEnvVars': this.loadEnvVars.bind(this),
      'local-dev-server:start': this.start.bind(this)
    }
  }

  loadEnvVars () {
    Object.assign(process.env, {IS_LOCAL: true})
  }

  start () {
    this.server = new Server({
      cors: this.serverless.service && this.serverless.service.custom && this.serverless.service.custom.localDevCors
    })
    this.server.log = this.serverless.cli.log.bind(this.serverless.cli)
    if (this.serverless.service.provider.profile) this.server.customEnvironment.AWS_PROFILE = this.serverless.service.provider.profile
    if (this.serverless.service.provider.region) this.server.customEnvironment.AWS_REGION = this.serverless.service.provider.region
    Object.assign(this.server.customEnvironment, this.options.environment)
    this.server.setConfiguration(this.serverless.service, this.serverless.config.servicePath)
    let customPort = this.serverless.service && this.serverless.service.custom && this.serverless.service.custom.localDevPort
    this.server.start(customPort || this.options.port || 5005)

    // this.polling = new Polling()
    // this.polling.log = this.serverless.cli.log.bind(this.serverless.cli)
    // this.polling.setConfiguration(this.serverless.service, this.serverless.config.servicePath, this.serverless)
    // this.polling.start()
  }
}

module.exports = ServerlessLocalDevServerPlugin
