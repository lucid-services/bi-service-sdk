# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) 
and this project adheres to [Semantic Versioning](http://semver.org/).

## FUTURE

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
