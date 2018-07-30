const BIServiceSDK    = require('./lib/http.js');
const SDKRequestError = require('./lib/errors/SDKRequestError.js');
const SDKInterface    = require('./lib/interface.js');

module.exports                       = BIServiceSDK;
module.exports.BIServiceSDK          = BIServiceSDK;
module.exports.BIServiceSDKInterface = SDKInterface;
module.exports.SDKRequestError       = SDKRequestError;
