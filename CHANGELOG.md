# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) 
and this project adheres to [Semantic Versioning](http://semver.org/).

## FUTURE

* [FIXED] - template variables in section of method jsdoc comments referenced incorrect path to schema type (the path has changed with OpenAPI v3)
* [ADDED] - support for building for web (webpack@4 & browserify)

## 1.3.0

* [ADDED] - support for `bi-service-doc@2.x` which uses `OpenAPI v3`

## 1.2.4

* [FIXED] - `npm install` should be executed with `--no-save` option when installing dependencies for tests

## 1.2.3

* [FIXED] - reserved javascript keywords should not be used as variable names
* [FIXED] - do not demand url path parameter values to be of string type

## 1.2.2

* [FIXED] - a SDK constructor name should incorporate an application name the sdk is built for (fixes #3)

## 1.2.1

* [FIXED] - AMQP SDKs were being assigned incorrect endpoint method types
* [FIXED] - make `jshint` a regular dependency instead of `devDependency`
* [FIXED] - print warning when an error occurs during sdk plugin registration

## 1.2.0

* [ADDED] - `--specs` option to `bi-service-sdk` executable
* [ADDED] - make use of bi-service shell API - `build:sdk` command is available via `bi-service` executable

## 1.1.3

* [FIXED] - broken prototype inheritance

## 1.1.2

* [FIXED] - broken inheritance of http `BIServiceSDK` interface - invalid prototype value

## 1.1.1

* [FIXED] - broken inheritance of http `BIServiceSDK` interface - invalid prototype value

## 1.1.0

* [FIXED] - we shouldn't try to build a sdk for unsupported API specification (determined via API protocol)
* [FIXED] - AMQP client sdk was failing to build due to multiple semantic errors

## 1.1.0-alpha

* [ADDED] - AMQP client SDK package generation

## 1.0.3

* [ADDED] - cli acceptance tests
* [ADDED] - print info about tmp build directory location

## 1.0.2

* [FIXED] - spawn node process with `--preserve-symlinks` flag
* [FIXED] - when no default service host is set, an Error should be throwed when a SDK constructor is called without the `baseURL` option

## 1.0.1

* [FIXED] - custom Error constructors were being provided with incorrect response data

## 1.0.0

* [ADDED] - `version` shell option
* [CHANGED] - npm package versioning schema of generated SDKs

## 0.6.3

* [FIXED] - request BODY payload was being excluded from `post`/`put`/`delete` requests
* [FIXED] - added missing "test" npm command to builded SDK npm packages

## 0.6.2

* [ADDED] - `BIServiceSDK.prototype._setReqData` - adapter function mapping user API query|data|headers options to internal axios options: params|data|headers
* [ADDED] - plugin function is called with context of `BIServiceSDK`

## 0.6.1

* [FIXED] - failing tests for built SDKs

## 0.6.0

* [ADDED] - axios req response errors are converted to `SDKRequestError`.
* [ADDED] - `BIServiceSDK.prototype.use` method
* [ADDED] - `query` BIServiceSDK constructor option which is alias for the `params` constructor option
* [CHANGED] - methods of generaged SDKs accept `query` option instead of the `params` option.
* [CHANGED] - All methods accept `data` option which previously was supported only for POST|PUT|DELETE requests
* [CHANGED] - error response object properties are converted to camelCase

## 0.5.7

* [FIXED] - when `axios.request(config)` method is called, the config object must contain object values for `headers` & `data` & `params` properties, they can NOT have other values like `undefined` & `null` otherwise global config values will be incorrectly merged with request specific config

## 0.5.6

* [FIXED] bugfix in `0.5.5` was fixed incorrectly
* [ADDED] `BIServiceSDK` tests

## 0.5.5

* [FIXED] `BIServiceSDK.prototype.$request` merge default options with request options object

## 0.5.4

## 0.5.3

* [FIXED] fetch `path` url parameters from url string if they are not provided by swagger schema
* [FIXED] make it work on Windows - spawn `mocha.cmd` & `npm.cmd` instead of `mocha` & `npm` shel  commands
* [FIXED] prepend default `http(s)` protocol to the `baseURL` only if the url doesn't define protocol on its own

## 0.5.2

* [FIXED] Infinite loop when an Error occured while loading a bi-service based app
* [FIXED] sdk constructor name string should be sanitized and non-alphanumberic characters should be replaced by `_`
* [FIXED] add missing alias option `--help` => `-h`

## 0.5.1

* [ADDED] SDK has `version` property which equals to API version string.
* [FIXED] npm package.json template for SDK modules - updated required package version restriction

## 0.5.0

* [ADDED] initial implementation (run "bi-service-sdk --help" in your shell for more info)
