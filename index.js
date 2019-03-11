const ServiceSDK      = require('./lib/http.js');
const SDKRequestError = require('./lib/errors/SDKRequestError.js');
const SDKInterface    = require('./lib/interface.js');
const _               = require('lodash');
const tmp             = require('tmp');

let Service, ServiceDoc, bin;

module.exports                       = ServiceSDK;
module.exports.ServiceSDK            = ServiceSDK;
module.exports.ServiceSDKInterface   = SDKInterface;
module.exports.SDKRequestError       = SDKRequestError;

try {
    Service    = require('serviser');
    ServiceDoc = require('serviser-doc');
    bin        = require('./bin/serviser-sdk.js');


    Service.once('set-up', function(appManager) {
        appManager.service.on('shell-cmd', registerShellCommands);
    });
} catch(e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
        throw e;
    }
    console.log(`WARNING: ${e.message}`);
}

function registerShellCommands(yargs) {
    const appManager = this.appManager;
    const config     = this.config;

    yargs.command('build:sdk', 'Generate client SDKs', {
        app: {
            alias: 'a',
            describe: 'list of app names for which generate SDKs',
            type: 'string',
            default: [],
            array: true,
        },
        tests: {
            alias: 'test',
            describe: 'Runs automated tests on builded SDKs',
            default: true,
            required: true,
            type: 'boolean'
        },
        dry: {
            describe: 'Runs build without actually exporting any files',
            default: false,
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
    }, buildCmd);

    function buildCmd(argv) {
        if (argv.cleanup) {
            tmp.setGracefulCleanup();
        }
        let packagePath = config.get('root') + '/package.json';
        const npmPackage  = {
            name    : config.getOrFail('npmName'),
            version : config.get('version') || require(packagePath).version,
        };
        const specs    = getSpecs(appManager, argv.app);
        //tmp dir used to build the sdks
        const tmpDir   = tmp.dirSync({
            unsafeCleanup: true,
            keep: argv.cleanup ? false : true
        });
        //builded sdk npm pckgs
        const packages = [];

        console.info(`Build tmp directory: ${tmpDir.name}`);

        //for each app - build sdk npm package with API versions bundled in
        //separate files
        Object.keys(specs).forEach(function(appName) {
            let pkg = bin.build(appName, specs[appName], npmPackage, tmpDir);
            pkg && packages.push(pkg);
        });

        return bin.bundle(packages, tmpDir, argv);
    }
}

/**
 * @return {AppManager} appManager
 * @return {Array<String>} apps
 * @return {Object}
 */
function getSpecs(appManager, apps) {
    apps = apps || [];

    if (!apps.length) {
        //no specific apps were listed by an user so generate specs
        //for all available apps
        apps = _.map(appManager.apps, 'options.name');
    }

    const specs = {};

    appFilter(appManager.apps, apps).reduce(function(specs, app) {
        specs[app.options.name] = ServiceDoc.swagger.generate(app);
        return specs;
    }, specs);

    return specs;
}

/**
 * @param {Array<AppInterface>} apps
 * @param {Array<String>} whitelist
 * @return {Array<AppInterface>}
 */
function appFilter(apps, whitelist) {
    return apps.filter(function(app) {
        return app && whitelist.indexOf(app.options.name) !== -1;
    });
}
