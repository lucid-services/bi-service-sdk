var axios       = require('axios');
var toCamelCase = require('lodash.camelcase');

var SDKRequestError = require('./lib/errors/SDKRequestError.js');

module.exports                 = BIServiceSDK;
module.exports.BIServiceSDK    = BIServiceSDK;
module.exports.SDKRequestError = SDKRequestError;

/**
 * @constructor
 *
 * @param {Object} [options] - supports all axios options
 * @param {Object} [options.query] - alias for axios `params` option
 * @param {Object} [options.errors] - a hash object mapping http status code to custom Error constructor
 */
function BIServiceSDK(options) {
    options = Object.assign({}, options || {});
    options.errors = options.errors || {};

    this.options = options;

    if (!options.baseURL || typeof options.baseURL !== 'string') {
        throw new Error('`baseURL` string option is required');
    }

    if (typeof options.errors !== 'object' || options.errors === null) {
        throw new Error('`errors` option must be a hash object');
    }

    if (typeof options.query === 'object' && options.query !== null) {
        options.params = Object.assign(options.params || {}, options.query);
        delete options.query;
    }

    this.axios = axios.create(this.options);

    var _adapter = this.axios.defaults.adapter;
    this.axios.defaults.adapter = responseFilterMiddleware;

    function responseFilterMiddleware(config) {
        return _adapter(config).then(function(response) {
            delete response.statusText;
            delete response.config;
            delete response.request;
            return response;
        });
    }

    //transform error response properties to camelCase
    this.axios.interceptors.response.use(null, function(err) {
        if (   err.response
            && typeof err.response.data === 'object'
            && err.response.data !== null
        ) {
            var out = {};
            Object.keys(err.response.data).forEach(function(prop) {
                out[toCamelCase(prop)] = err.response.data[prop];
            });
            err.response.data = out;
        }

        return Promise.reject(err);
    });
};


/**
 *
 * @param {Function} plugin - takes Axios instance object as the single argument
 *
 * @return {mixed}
 */
BIServiceSDK.prototype.use = function(plugin) {
    return plugin.call(this, this.axios);
};


/**
 * adapter which maps (user API) target: data|headers|query to internal axios data|headers|params data options
 *
 * @param {String} [key]
 * @param {mixed}  value - data to be set
 * @param {Object} config - axios config object
 * @param {String} [target='data'] - possible values data|headers|query
 *
 * @return {undefined}
 */
BIServiceSDK.prototype._setReqData = function(key, value, config, target) {
    target = target || 'data';

    if (!this._hasBodyPayload(config.method)) { //without BODY payload
        if (~['data', 'query'].indexOf(target)) {
            setValue(key, value, 'params');
        } else if (target === 'headers') {
            setValue(key, value, 'headers');
        }
    } else { // with BODY payload
        if (target === 'data') {
            setValue(key, value, 'data');
        } else if (target === 'headers') {
            setValue(key, value, 'headers');
        } else if (target === 'query') {
            setValue(key, value, 'params');
        }
    }

    function setValue(k, v, destination) {
        if (k) {
            if (   typeof config[destination] !== 'object'
                || config[destination] === null
            ) {
                config[destination] = {};
            }
            config[destination][k] = v;
        } else if (typeof v === 'object'
            && typeof config[destination] === 'object'
            && v !== null
            && config[destination] !== null
        ) {
            Object.assign(config[destination], v);
        } else {
            config[destination] = v;
        }
    }
};


/**
 *
 * @param {String} httpMethod
 *
 * @return {Boolean}
 */
BIServiceSDK.prototype._hasBodyPayload = function(httpMethod) {
    httpMethod = typeof httpMethod === 'string'
        ? httpMethod.toLowerCase() : httpMethod;

    if (~['post', 'put', 'delete'].indexOf(httpMethod)) {
        return true;
    }

    return false;
};


/**
 * @method
 * @private
 *
 * @param {Object} options
 * @param {String} options.method
 * @param {String} options.url
 * @param {Object} options.params - query parameters
 * @param {Object} options.data - query / body parameters depending on request method
 * @param {Object} options.headers
 *
 * @return {Promise}
 */
BIServiceSDK.prototype.$request = function(options) {
    var self = this;

    //for POST|PUT|DELETE req methods - options.data is expected to contain
    //body paramters whereas for any other req methods, options.data is expected
    //to contain query parameters
    if (typeof options === 'object'
        && options !== null
        && typeof options.data === 'object'
        && options.data !== null
    ) {
        this._setReqData(null, options.data, options, 'data')
        if (!this._hasBodyPayload(options.method)) {
            delete options.data;
        }
    }

    return this.axios.request(options).catch(function(err) {
        if (typeof err.response === 'object' && err.response !== null) {

            var status = err.response.status;
            var baseStatus = parseInt((status + '')[0] + '00');
            var e = null; //transformed err

            if (typeof self.options.errors[status] === 'function') {
                e = new self.options.errors[status](err.response.data);
            } else if (typeof self.options.errors[baseStatus] === 'function') {
                e = new self.options.errors[baseStatus](err.response.data);
            //there wasn't any custom Error constructor to transtate the err to
            } else {
                e = new SDKRequestError(err.response.data);
            }

            e.code = err.response.status;
            delete err.response;
            return Promise.reject(e);
        }

        //response never received or failed while setting up the request
        return Promise.reject(err);
    });
};
