'use strict'
const path = require('path')
const {stat, readFile} = require('fs')
const {exec} = require('child_process')
const {promisify} = require('util')
const md5File = require('md5-file/promise')
const gulp = require('gulp')
const Server = require('./Server')

const child = {
  exec: promisify(exec)
}

const fs = {
  stat: promisify(stat),
  readFile: promisify(readFile)
}

class StandaloneLocalDevServer {
  constructor (options) {
    // TODO : check if project-utils-plugin in in package.json :)
    this.options = {
      port: 5005,
      configOverride: {},
      ...options
    }
    this.paths = {
      project: this.options.projectPath || __dirname
    }

    this.paths.slsYaml = path.join(this.paths.project, 'serverless.yml')
    this.paths.slsDir = path.join(this.paths.project, '.serverless')
    this.paths.slsJson = path.join(this.paths.slsDir, 'serverless.json')
    this.paths.srcDir = path.join(this.paths.project, 'src')
  }

  async init () {
    await this.loadServerlessYaml()

    this.server = new Server()

    if (this.slsYaml.provider) {
      if (this.slsYaml.provider.profile) this.server.customEnvironment.AWS_PROFILE = this.slsYaml.provider.profile
      if (this.slsYaml.provider.region) this.server.customEnvironment.AWS_REGION = this.slsYaml.provider.region
    }
    this.server.customEnvironment = {
      ...this.options.environment
    }
    this.server.setConfiguration(this.slsYaml, this.paths.project)

    this.watchStreams = {
      slsYaml: gulp.watch(this.paths.slsYaml, () => this.loadServerlessYaml()),
      src: gulp.watch(`${this.paths.srcDir}/**`, () => {
        // TODO : console.debug stopping because code has changed!
        // NOTE : could just exit using process.exit(0);
        this.stop()
      }),
      slsJson: gulp.watch(this.paths.slsJson, () => this.processYaml())
    }
  }

  async loadServerlessYaml () {
    const hasJson = await fs.stat(this.paths.slsJson).catch(() => false)
    if (!hasJson) {
      await child.exec('sls export', {cwd: this.paths.project})
      return this.loadServerlessYaml()
    }
    const md5 = await md5File(this.paths.slsYaml)
    const json = await fs.readFile(this.paths.slsJson)
    const slsYaml = JSON.parse(json)
    if (slsYaml.md5 !== md5) {
      await child.exec('sls export', {cwd: this.paths.project})
      return this.loadServerlessYaml()
    }
    this.slsYaml = {
      ...slsYaml,
      ...this.options.configOverride
    }
    // TODO : console.debug if flag
  }

  processYaml () {
    console.log('processing yaml config :)')
  }

  async start () {
    await this.init()

    let customPort = this.slsYaml.custom && this.slsYaml.custom.localDevPort
    this.server.start(customPort || this.options.port)
  }

  stop () {
    Object.keys(this.watchStreams).forEach(k => {
      this.watchStreams[k].close && this.watchStreams[k].close()
    })
    this.Server && this.Server.server && this.Server.server.stop()
  }
}

module.exports = {
  StandaloneLocalDevServer
}
