var util = require('util');

module.exports = SDKRequestError;

/**
 * Error SDKRequestError
 *
 * @param {mixed} data
 * */
function SDKRequestError(data) {

    Error.call(this); //super constructor
    Error.captureStackTrace(this, this.constructor);

    if (typeof data === 'object' && data !== null) {
        Object.keys(data).forEach(function(prop) {
            this[prop] = data[prop];
        }, this);
    } else {
        this.message = data;
    }
}

util.inherits(SDKRequestError, Error);
