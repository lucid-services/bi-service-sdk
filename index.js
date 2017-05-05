var axios = require('axios');

module.exports.BIServiceSDK = BIServiceSDK;

/**
 * @constructor
 *
 * @param {Object} [options] - defaults of axios
 * @param {Object} [options.errors] - a hash object mapping http status code to custom Error constructor
 */
function BIServiceSDK(options) {
    options = options || {};
    options.errors = options.errors || {};

    this.options = options;

    if (!options.baseURL || typeof options.baseURL !== 'string') {
        throw new Error('`baseURL` string option is required');
    }

    if (typeof options.errors !== 'object' || options.errors === null) {
        throw new Error('`errors` option must be a hash object');
    }

    this.axios = axios.create(options);
};


/**
 * @method
 * @private
 *
 * @param {Object} options
 * @param {String} options.method
 * @param {String} options.url
 * @param {Object} options.params
 * @param {Object} options.data
 * @param {Object} options.headers
 *
 * @return {Promise}
 */
BIServiceSDK.prototype.$request = function(options) {
    var self = this;

    options = options || {};
    Object.assign(options, this.options);

    return this.axios.request(options).then(function(response) {
        delete response.statusText;
        delete response.config;
        delete response.request;
        return response;
    }).catch(function(err) {
        if (err.response) {

            var status = err.response.status;
            var baseStatus = parseInt((status + '')[0] + '00');

            if (typeof self.options.errors[status] === 'function') {
                throw new self.options.errors[status](err.response);
            } else if (typeof self.options.errors[baseStatus] === 'function') {
                throw new self.options.errors[baseStatus](err.response);
            }
        }

        //response never received or failed while setting up the request
        //or there wasn't any custom Error constructor to transtate the err to
        throw err;
    });
};

