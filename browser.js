const ServiceSDK      = require('./lib/http.js');
const SDKRequestError = require('./lib/errors/SDKRequestError.js');
const SDKInterface    = require('./lib/interface.js');

module.exports                       = ServiceSDK;
module.exports.ServiceSDK            = ServiceSDK;
module.exports.ServiceSDKInterface   = SDKInterface;
module.exports.SDKRequestError       = SDKRequestError;
