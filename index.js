var axios       = require('axios');
var toCamelCase = require('lodash.camelcase');

var SDKRequestError = require('./lib/errors/SDKRequestError.js');

module.exports.BIServiceSDK = BIServiceSDK;
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
    return plugin(this.axios);
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
    if (typeof options === 'object' && options !== null) {
        var method = typeof options.method === 'string'
            ? options.method.toLowerCase() : options.method;

        if (   !~['post', 'put', 'delete'].indexOf(method)
            && typeof options.data === 'object'
            && options.data !== null
        ) {
            options.params = Object.assign(options.params || {}, options.data);
            delete options.data;
        }
    }

    return this.axios.request(options).catch(function(err) {
        if (typeof err.response === 'object' && err.response !== null) {

            var status = err.response.status;
            var baseStatus = parseInt((status + '')[0] + '00');
            var e = null; //transformed err

            if (typeof self.options.errors[status] === 'function') {
                e = new self.options.errors[status](err.response);
            } else if (typeof self.options.errors[baseStatus] === 'function') {
                e = new self.options.errors[baseStatus](err.response);
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
