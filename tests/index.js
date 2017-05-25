Promise            = require('bluebird');
var sinon          = require('sinon');
var chai           = require('chai');
var chaiAsPromised = require('chai-as-promised');
var sinonChai      = require("sinon-chai");
var axios          = require('axios');

var SDKRequestError = require('../lib/errors/SDKRequestError.js');
var sdk             = require('../index.js');
var BIServiceSDK    = sdk.BIServiceSDK;

//this makes sinon-as-promised available in sinon:
require('sinon-as-promised');

var expect = chai.expect;

chai.use(sinonChai);
chai.use(chaiAsPromised);
chai.should();

describe('BIServiceSDK', function() {
    describe('constructor', function() {
        it('should throw an Error when `baseURL` option is not set', function() {
            expect(function() {
                var sdk = new BIServiceSDK({baseURL: undefined});
            }).to.throw(Error);
        });

        it('should throw an Error when `baseURL` option is not of string type', function() {
            expect(function() {
                var sdk = new BIServiceSDK({baseURL: {invalid: 'value'}});
            }).to.throw(Error);
        });

        it('should throw an Error when `errors` option is not an object', function() {
            expect(function() {
                var sdk = new BIServiceSDK({
                    baseURL: 'http://localhost', errors: 'string'
                });
            }).to.throw(Error);
        });

        it('should accept `query` option and handle it as alias for the `params` option', function() {
            var sdk = new BIServiceSDK({
                baseURL: 'localhost',
                query: {foo: 'bar'},
                params: {bar: 'foo'}
            });

            sdk.options.should.have.property('params').that.is.eql({
                foo: 'bar',
                bar: 'foo'
            });
        });
    });

    describe('"use" method', function() {
        it('should call received function with the axios instance object', function() {
            var spy = sinon.spy();

            var sdk = new BIServiceSDK({
                baseURL: 'http://localhost'
            });

            sdk.use(spy);

            spy.should.have.been.calledOnce;
            spy.should.have.been.calledWith(sdk.axios);
        });
    });

    describe('$request', function() {
        before(function() {
            this.sdk = new BIServiceSDK({
                baseURL: 'http://eu.httpbin.org',
                headers: {Origin: 'localhost'}
            });

            this.axiosRequestSpy = sinon.spy(this.sdk.axios, 'request');
        });

        afterEach(function() {
            this.axiosRequestSpy.reset();
        });

        it('should return a Promise', function() {
            return this.sdk.$request().should.be.an.instanceof(Promise);
        });

        ['GET', 'PATCH'].forEach(function(method) {
            describe(`${method} methods`, function() {
                it(`should append options.data parameters to the query parameters ("params" option)`, function() {
                    var self = this;
                    var m = method.toLowerCase();

                    return this.sdk.$request({
                        url: m,
                        method: m,
                        data: {
                            foo: 'bar'
                        },
                        params: {
                            bar: 'foo'
                        }
                    }).should.be.fulfilled.then(function(response) {
                        self.axiosRequestSpy.should.have.been.calledWith({
                            url: m,
                            method: m,
                            params: {
                                foo: 'bar',
                                bar: 'foo'
                            }
                        });
                    });
                });
            });
        });

        ['POST', 'PUT', 'DELETE'].forEach(function(method) {
            describe(`${method} methods`, function() {
                it(`should make a http request with provided BODY payload data ("data" option)`, function() {
                    var self = this;
                    var m = method.toLowerCase();

                    return this.sdk.$request({
                        url: m,
                        method: m,
                        data: {
                            foo: 'bar'
                        }
                    }).should.be.fulfilled.then(function(response) {
                        self.axiosRequestSpy.should.have.been.calledWith({
                            url: m,
                            method: m,
                            data: {
                                foo: 'bar'
                            }
                        });
                    });
                });
            });
        });

        it('should return fulfilled promise with response object', function() {
            return this.sdk.$request({url: 'get'}).should.be.fulfilled.then(function(response) {
                response.should.have.property('status').that.is.a('number');
                response.should.have.property('data').that.is.a('object');
                response.should.have.property('headers').that.is.a('object');
                response.should.not.have.property('config');
                response.should.not.have.property('request');
            });
        });

        it('should make a request with included default options', function() {
            return this.sdk.$request({url: 'get'}).should.be.fulfilled.then(function(response) {
                response.data.headers.Origin.should.be.equal('localhost');
            });
        });

        it('should call axios.request method with provided options object', function() {
            var self = this;

            return this.sdk.$request({url: 'get'}).then(function() {
                self.axiosRequestSpy.should.have.been.calledOnce;
                self.axiosRequestSpy.should.have.been.calledWith({url: 'get'});
            });
        });

        [404, 400, 500].forEach(function(status) {
            it(`should return rejected promise with a SDKRequestError when we get: ${status} status`, function() {
                return this.sdk.$request({url: `status/${status}`}).should.be.rejected.then(function(err) {
                    err.should.be.instanceof(SDKRequestError);
                    err.should.have.property('code', status);
                });
            });

            it('should convert error response properties to camelCase', function() {
                var requestStub = sinon.stub(this.sdk.axios.defaults, 'adapter').returns(Promise.reject({
                    message: 'rejection test error',
                    response: {
                        status: status,
                        headers: {},
                        data: {
                            message: 'rejection test',
                            api_code: 'rejectionTest',
                            another_property: 'value'
                        }
                    }
                }));

                return this.sdk.$request({url: `status/${status}`}).should.be.rejected.then(function(err) {
                    err.should.have.property('apiCode', 'rejectionTest');
                    err.should.have.property('message', 'rejection test');
                    err.should.have.property('anotherProperty', 'value');
                    err.should.have.property('code', status);

                    requestStub.restore();
                });
            });
        });

        describe('custom Error constructors', function() {

            before(function() {
                this.badRequest = makeError();
                this.notFound = makeError();
                this.internalError = makeError();
                this.serviceUnavailable = makeError();

                this.sdk = new BIServiceSDK({
                    baseURL: 'http://eu.httpbin.org',
                    errors: {
                        400: this.badRequest,
                        404: this.notFound,
                        500: this.internalError,
                        503: this.serviceUnavailable
                    }
                });

                function makeError() {
                    function CustomError(data) {
                        Error.call(this);
                        Error.captureStackTrace(this, this.constructor);
                        this.data = data;
                    }

                    CustomError.prototype = Object.create(Error.prototype);
                    CustomError.prototype.constructor = CustomError;

                    return CustomError;
                }
            });

            it('should return rejected promise with an Error which is instanceof `badRequest`', function() {
                return this.sdk.$request({url: 'status/400'}).should.be.rejectedWith(this.badRequest);
            });

            it('should provide the custom error constructor with error response data', function() {
                var requestStub = sinon.stub(this.sdk.axios, 'request').returns(Promise.reject({
                    response: {
                        status: 400,
                        data: {
                            foo:'bar'
                        }
                    }
                }));
                return this.sdk.$request({url: 'status/400'}).should.be.rejected.then(function(err) {
                    err.data.should.be.eql({foo: 'bar'});
                    requestStub.restore();
                });
            });

            it('should provide the custom error constructor with error response data (2)', function() {
                var requestStub = sinon.stub(this.sdk.axios, 'request').returns(Promise.reject({
                    response: {
                        status: 401,
                        data: {
                            foo:'bar'
                        }
                    }
                }));
                return this.sdk.$request({url: 'status/401'}).should.be.rejected.then(function(err) {
                    err.data.should.be.eql({foo: 'bar'});
                    requestStub.restore();
                });
            });

            it('should return rejected promise with an Error which is instanceof `badRequest` (2)', function() {
                return this.sdk.$request({url: 'status/401'}).should.be.rejectedWith(this.badRequest);
            });

            it('should return rejected promise with an Error which is instanceof `notFound`', function() {
                return this.sdk.$request({url: 'status/404'}).should.be.rejectedWith(this.notFound);
            });

            it('should return rejected promise with an Error which is instanceof `internalError`', function() {
                return this.sdk.$request({url: 'status/500'}).should.be.rejectedWith(this.internalError);
            });

            it('should return rejected promise with an Error which is instanceof `internalError` (2)', function() {
                return this.sdk.$request({url: 'status/502'}).should.be.rejectedWith(this.internalError);
            });

            it('should return rejected promise with an Error which is instanceof `serviceUnavailable`', function() {
                return this.sdk.$request({url: 'status/503'}).should.be.rejectedWith(this.serviceUnavailable);
            });
        });
    });

    describe('_setReqData', function() {
        before(function() {
            this.sdk = new BIServiceSDK({
                baseURL: 'localhost'
            });
        });

        ['get', 'patch', 'options', 'post', 'put', 'delete'].forEach(function(method) {
            describe(method.toUpperCase(), function() {
                it(`should set data under "config.headers" key when we provide "headers" as the target`, function() {
                    var config = {
                        method: method
                    };

                    var reqData = {
                        some: 'value'
                    };

                    this.sdk._setReqData(null, reqData, config, 'headers');
                    config.should.have.property('headers', reqData);
                });

                it(`should assign data properties of received object to "config.headers" object when we provide "headers" as the target`, function() {
                    var config = {
                        method: method,
                        headers: {
                            bar: 'baz'
                        }
                    };

                    var reqData = {
                        some: 'value'
                    };

                    this.sdk._setReqData(null, reqData, config, 'headers');
                    config.should.have.property('headers').that.is.eql({
                        bar: 'baz',
                        some: 'value'
                    });
                });

                it(`should set data under "config.headers.foo" key when we provide "foo" as the key and "headers" as the target`, function() {
                    var config = {
                        method: method
                    };

                    var reqData = {
                        some: 'value'
                    };

                    this.sdk._setReqData('foo', reqData, config, 'headers');
                    config.should.have.deep.property('headers.foo', reqData);
                });

                it(`should set data under "config.headers.foo" key when we provide "foo" as the key and "headers" as the target (2)`, function() {
                    var config = {
                        method: method,
                        headers: {
                            bar: 'baz'
                        }
                    };

                    var reqData = {
                        some: 'value'
                    };

                    this.sdk._setReqData('foo', reqData, config, 'headers');
                    config.should.have.deep.property('headers').that.is.eql({
                        foo: reqData,
                        bar: 'baz'
                    });
                });
            });
        });

        ['get', 'patch', 'options'].forEach(function(method) {
            describe(method.toUpperCase(), function() {
                ['data', 'query'].forEach(function(target) {
                    it(`should set data under "config.params" key when we provide "${target}" as the target`, function() {
                        var config = {
                            method: method
                        };

                        var reqData = {
                            some: 'value'
                        };

                        this.sdk._setReqData(null, reqData, config, target);
                        config.should.have.property('params', reqData);
                    });

                    it(`should assign data properties of received object to "config.params" object when we provide "${target}" as the target`, function() {
                        var config = {
                            method: method,
                            params: {
                                bar: 'baz'
                            }
                        };

                        var reqData = {
                            some: 'value'
                        };

                        this.sdk._setReqData(null, reqData, config, target);
                        config.should.have.property('params').that.is.eql({
                            bar: 'baz',
                            some: 'value'
                        });
                    });

                    it(`should set data under "config.params.foo" key when we provide "foo" as the key and "${target}" as the target`, function() {
                        var config = {
                            method: method
                        };

                        var reqData = {
                            some: 'value'
                        };

                        this.sdk._setReqData('foo', reqData, config, target);
                        config.should.have.deep.property('params.foo', reqData);
                    });

                    it(`should set data under "config.params.foo" key when we provide "foo" as the key and "${target}" as the target (2)`, function() {
                        var config = {
                            method: method,
                            params: {
                                bar: 'baz'
                            }
                        };

                        var reqData = {
                            some: 'value'
                        };

                        this.sdk._setReqData('foo', reqData, config, target);
                        config.should.have.deep.property('params').that.is.eql({
                            foo: reqData,
                            bar: 'baz'
                        });
                    });
                });
            });
        });

        ['post', 'put', 'delete'].forEach(function(method) {
            describe(method.toUpperCase(), function() {
                it(`should set data under "config.params" key when we provide "query" as the target`, function() {
                    var config = {
                        method: method
                    };

                    var reqData = {
                        some: 'value'
                    };

                    this.sdk._setReqData(null, reqData, config, 'query');
                    config.should.have.property('params', reqData);
                });

                it(`should assign data properties of received object to "config.params" object when we provide "query" as the target`, function() {
                    var config = {
                        method: method,
                        params: {
                            bar: 'baz'
                        }
                    };

                    var reqData = {
                        some: 'value'
                    };

                    this.sdk._setReqData(null, reqData, config, 'query');
                    config.should.have.property('params').that.is.eql({
                        bar: 'baz',
                        some: 'value'
                    });
                });

                it(`should set data under "config.params.foo" key when we provide "foo" as the key and "query" as the target`, function() {
                    var config = {
                        method: method
                    };

                    var reqData = {
                        some: 'value'
                    };

                    this.sdk._setReqData('foo', reqData, config, 'query');
                    config.should.have.deep.property('params.foo', reqData);
                });

                it(`should set data under "config.params.foo" key when we provide "foo" as the key and "query" as the target (2)`, function() {
                    var config = {
                        method: method,
                        params: {
                            bar: 'baz'
                        }
                    };

                    var reqData = {
                        some: 'value'
                    };

                    this.sdk._setReqData('foo', reqData, config, 'query');
                    config.should.have.deep.property('params').that.is.eql({
                        foo: reqData,
                        bar: 'baz'
                    });
                });
            });
        })
    });

});
