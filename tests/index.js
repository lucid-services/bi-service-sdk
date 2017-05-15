Promise            = require('bluebird');
var sinon          = require('sinon');
var chai           = require('chai');
var chaiAsPromised = require('chai-as-promised');
var sinonChai      = require("sinon-chai");
var axios          = require('axios');

var sdk   = require('../index.js');
var BIServiceSDK = sdk.BIServiceSDK;

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

        it('should return fulfilled promise with response object', function() {
            return this.sdk.$request({url: 'get'}).should.be.fulfilled.then(function(response) {
                response.should.have.property('status').that.is.a('number');
                response.should.have.property('data').that.is.a('object');
                response.should.have.property('headers').that.is.a('object');
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
            it(`should return rejected promise with an Error when we get: ${status} status`, function() {
                return this.sdk.$request({url: `status/${status}`}).should.be.rejectedWith(Error);
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
});
