const BIServiceSDK    = require('./lib/http.js');
const SDKRequestError = require('./lib/errors/SDKRequestError.js');
const SDKInterface    = require('./lib/interface.js');
let Service, ServiceDoc, bin;

module.exports                       = BIServiceSDK;
module.exports.BIServiceSDK          = BIServiceSDK;
module.exports.BIServiceSDKInterface = SDKInterface;
module.exports.SDKRequestError       = SDKRequestError;

try {
    Service    = require('bi-service');
    ServiceDoc = require('bi-service-doc');
    bin        = require('./bin/bi-service-sdk.js');


    Service.once('set-up', function(appManager) {
        appManager.service.on('shell-cmd', registerShellCommands);
    });
} catch(e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
        throw e;
    }
}

function registerShellCommands(yargs) {
    yargs.command('build:sdk', 'Generate client SDKs', {
        tests: {
            alias: 'test',
            describe: 'Runs automated tests on builded SDKs',
            default: true,
            required: true,
            type: 'boolean'
        },
        dry: {
            alias: 'test',
            describe: 'Runs build without actually exporting any files',
            default: true,
            required: true,
            type: 'boolean'
        },
        cleanup: {
            describe: 'Whether to cleanup tmp files created during the build',
            default: true,
            required: true,
            type: 'boolean'
        },
        verbose: {
            alias: 'v',
            describe: 'Dumps more info to stdout (eg. about tests | npm install)',
            default: 1,
            count: true,
            type: 'boolean'
        },
    }, runCmd);
}
