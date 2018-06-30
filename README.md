Serverless Local Dev Server Plugin With Multi Project Support
=============================================================

[![Build Status](https://travis-ci.org/kalarrs/serverless-local-dev-server.svg)](https://travis-ci.org/kalarrs/serverless-local-dev-server)

### This is a fork of the Local Dev Server Plugin from  [DieProduktMacher/serverless-local-dev-server](https://github.com/DieProduktMacher/serverless-local-dev-server)

This plugin exposes Alexa-Skill, Schedule, and HTTP events as local HTTP endpoints, removing the need to deploy every code change to AWS Lambda. You can connect these endpoints to Alexa, Facebook Messenger or other services via forwardhq, ngrok or any other forwarding service.

Supported features:

* Expose `alexa-skill`, `schedule`, and `http` events as local HTTP endpoints
* Environment variables
* Basic HTTP integration


# How To

### 1. Install the plugin

```sh
yarn add @kalarrs/serverless-local-dev-server --dev
```

### 2. Add the plugin to your serverless project configuration file

*serverless.yml* configuration example:

```yaml
provider:
  name: aws
  runtime: nodejs8.10

functions:
  hello:
    handler: handler.hello
    events:
      - alexaSkill
      - http: GET /hello
      - schedule: rate(1 day)

# Add serverless-local-dev-server to your plugins:
plugins:
  - "@kalarrs/serverless-local-dev-server"

custom:
  # optional: add folder for serving static files (relative to service path)
  localDevStaticFolder: path/to/static/files
  # optional: set the port the server starts on
  localDevPort: 5000
  # optional: set the path name for schedule to be in local vs utc
  localDevScheduleShowLocalTime: true
```



### 3. Start the server

```sh
serverless local-dev-server
```

On default the server listens on port 5005. You can specify another one with the *--port* argument:

```sh
serverless local-dev-server --port 5000
```

You can also set the port in the serverless.yml
```yaml
  localDevPort: 5000
```

To see responses returned from Lambda and stack traces, prepend SLS_DEBUG=*

```sh
SLS_DEBUG=* serverless local-http-server
```

### 4. For Alexa Skills

#### 4.1 Share localhost with the internet

For example with forwardhq:

```sh
forward 5005
```

#### 4.2 Configure AWS to use your HTTPS endpoint

In the Configuration pane, select HTTPS as service endpoint type and specify the forwarded endpoint URL.

As method for SSL Certificate validation select *My development endpoint is a sub-domain of a domain that has a wildcard certificate from a certificate authority*.


# License & Credits

Licensed under the MIT license.

