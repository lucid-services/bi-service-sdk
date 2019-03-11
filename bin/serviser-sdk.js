#!/usr/bin/env node

const childProcess = require('child_process');
const axios        = require('axios');
const fs           = require('fs');
const path         = require('path');
const url          = require('url');
const _            = require('lodash');
const tmp          = require('tmp');
const yargs        = require('yargs');
const mustache     = require('mustache');
const archiver     = require('archiver');
const jshint       = require('jshint').JSHINT;
const Promise      = require('bluebird');

const SDK_VERSION = require('../package.json').version;

const builder = {
    /**
     * @param {Object} argv - cli options
     * @return Promise
     */
    main: function main(argv) {
        if (argv.cleanup) {
            tmp.setGracefulCleanup();
        }
        const self     = this;
        const npmPackage  = require(argv.s + '/package.json');
        let specs;

        if ((argv.specs instanceof url.Url)) {
            specs = this.fetchSwaggerSpecs(url.format(argv.specs));
        } else {
            specs = this.getSwaggerSpecs(argv.s, argv.e, argv._);
        }

        return specs.bind(this).then(function(specs) {
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
                let pkg = this.build(appName, specs[appName], npmPackage, tmpDir);
                pkg && packages.push(pkg);
            }, this);

            return this.bundle(packages, tmpDir, argv);
        });
    },

    /**
     * @param {Array<Object>} packages
     * @param {Object} tmpDir
     * @param {Object} argv
     * @return {Promise}
     */
    bundle: function bundle(packages, tmpDir, argv) {
        const self = this;
        // verify integrity of SDKs (tests) and bundle each created npm package
        // in separate zip file -> export to cwd
        return Promise.each(packages, function(pkg) {
            if (!argv.tests) {
                return;
            }

            return self.runNpmInstall(pkg.dir, argv.v).then(function() {
                return self.runPackageTests(pkg.dir, argv.v);
            });
        }).map(function(pkg) {

            if (argv.dry) {
                return;
            }

            var zipFilePath = process.cwd() + '/' + pkg.filename;
            var output = fs.createWriteStream(zipFilePath, {
                flags: 'wx' //dont overwrite
            });

            if (argv.v >= 1) {
                console.info(`Exporting ${zipFilePath}`);
            }
            return self.zipFiles(pkg.files, output);
        }).then(function() {
            if (argv.cleanup) {
                tmpDir.removeCallback();
            }
            if (argv.v >= 1) {
                console.info('Done.');
            }
        });
    },

    /**
     * @param {Object} specs
     * @return {String}
     */
    getTemplateType: function getTemplateType(specs) {
        let _spec = _.values(specs).shift();

        if (!_spec) {
            return;
        }

        if (typeof _spec.openapi === 'string'
            && _spec.openapi.indexOf('3') == 0
        ) {
            let server = {
                variables: {
                    protocol: {default: ''}
                }
            };


            if (_spec.servers instanceof Array && _spec.servers.length > 0) {
                Object.assign(
                    server.variables.protocol,
                    _.get(_spec.servers[0], ['variables', 'protocol'], {})
                );
            }

            let protocol = server.variables.protocol.default;

            if (['amqp://', 'amqps://'].includes(protocol)) {
                return 'amqp';
            } else if (['http://', 'https://'].includes(protocol)) {
                return 'http';
            }
        } else if(typeof _spec.swagger === 'string'
            && _spec.swagger.indexOf('2') == 0
        ) {
            if (_spec.schemes instanceof Array) {
                if (   ~_spec.schemes.indexOf('amqp')
                    || ~_spec.schemes.indexOf('amqps')
                ) {
                    return 'amqp';
                } else if (   ~_spec.schemes.indexOf('http')
                    || ~_spec.schemes.indexOf('https')
                ) {
                    return 'http';
                }
            }
        }
    },

    /**
     * @param {String} appName
     * @param {Object} specs
     * @param {Object} pkg
     * @param {Object} tmpDir
     * @return {Object} pkg bundle
     */
    build: function build(appName, specs, pkg, tmpDir) {
        const self = this;
        var files = [];
        var tmplType = self.getTemplateType(specs);
        var subdir = `${tmpDir.name}/${pkg.name}-${appName}-${pkg.version}`;
        var buildedPackage = {
            dir: subdir,
            filename: `${pkg.name}-${appName}-${pkg.version}.zip`,
            files: files,
        };

        //unsupported API specification
        if (!tmplType) {
            console.info(`app ${appName} - unknown or unsupported protocol, skiping..`);
            return;
        }

        fs.mkdirSync(subdir);
        fs.mkdirSync(subdir + '/tests');

        var sdkIndex = self.renderTemplate('index', {
            versions: Object.keys(specs)
        });
        var sdkPackage = self.renderTemplate(`${tmplType}/package`,
            _.merge(
                {appName: appName},
                pkg,
                {version: self.getSDKPackageVersion(SDK_VERSION, pkg.version)}
            ));

        self.lintSource(sdkIndex);
        self.lintSource(sdkPackage);

        fs.writeFileSync(subdir + '/index.js', sdkIndex);
        fs.writeFileSync(subdir + '/package.json', sdkPackage);

        files.push({
            dir: subdir,
            name: 'index.js'
        });
        files.push({
            dir: subdir,
            name: 'package.json'
        });

        Object.keys(specs).forEach(function(version) {

            var spec = specs[version];
            var context = self.getTemplateContext(spec, pkg);
            context.context = JSON.stringify(context);

            var sdkModule = self.renderTemplate(`${tmplType}/module`, context);
            var sdkTests = self.renderTemplate(`${tmplType}/test`, context);

            self.lintSource(sdkModule);
            fs.writeFileSync(subdir + `/${version}.js`, sdkModule);
            fs.writeFileSync(subdir + `/tests/${version}.js`, sdkTests);
            files.push({
                dir: subdir,
                name: `${version}.js`
            });
        });

        return buildedPackage;
    },

    /**
     * @param {Array<Object>} files
     * @param {String}        files[].dir
     * @param {String}        files[].name
     * @param {Stream}        writeStream
     *
     * @return Promise
     */
    zipFiles: function zipFiles(files, writeStream) {
        files = files || [];

        var archive  = archiver('zip', { zlib: { level: 9 } });
        files.forEach(function(file) {
            archive.append(fs.createReadStream(`${file.dir}/${file.name}`), {
                name: file.name
            });
        });

        return  new Promise(function(resolve, reject){
            writeStream.once("close", resolve);
            writeStream.once("error", reject);
            archive.pipe(writeStream);
            archive.finalize();
        });
    },

    /**
     * @param {Integer} version
     */
    _isAtNodeVersionOrHigher: function(version) {
        let match = process.version.match(/v(\d+)\..*$/);
        if (match && parseInt(match[1]) >= version) {
            return true;
        }
        return false;
    },

    /**
     * @param {String} projectRoot
     * @param {Integer} vLevel - verbosity level
     *
     * @return Promise
     */
    runNpmInstall: function runNpmInstall(projectRoot, vLevel) {

        var npmArgs = [
            'install',
            'mocha',
            'bluebird',
            'serviser-sdk',
            'sinon@^1.17.3',
            'chai',
            'chai-as-promised',
            'sinon-as-promised',
            'sinon-chai'
        ];

        var npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

        if (this._isAtNodeVersionOrHigher(8)) {
            npmArgs.push('--no-save');
        }

        if (vLevel >= 1) {
            console.info(`${projectRoot} - preparing testing environment`);
            console.info('npm ' + npmArgs.join(' '));
        }
        var proc = childProcess.spawn(npmCmd, npmArgs, {cwd: projectRoot});

        return new Promise(function(resolve, reject) {
            var stderr = '';
            proc.stdout.on('data', function(data) {
                if (vLevel > 2) {
                    console.info(data.toString());
                }
            });
            proc.stderr.on('data', function(data) {
                stderr += data.toString();
                if (vLevel > 2) {
                    console.info(data.toString());
                }
            });
            proc.on('close', function(code) {
                if (code !== 0) {
                    return reject(new Error(stderr));
                }

                return resolve();
            });
        });
    },

    /**
     * @param {String} projectRoot
     * @param {Integer} vLevel - verbosity level
     *
     * @return Promise
     */
    runPackageTests: function runPackageTests(projectRoot, vLevel) {
        var mochaArgs = ['--ui', 'bdd', '--colors', '--check-leaks', '-t', '5000',
                '--reporter', 'spec', "tests/**/*.js"];

        var mochaCmd = process.platform === 'win32' ? 'mocha.cmd' : 'mocha';
        mochaCmd = path.resolve(projectRoot + '/node_modules/.bin/' + mochaCmd);

        var proc = childProcess.spawn(mochaCmd, mochaArgs, {cwd: projectRoot});

        if (vLevel >= 1) {
            console.info(`${projectRoot} - running tests`);
            console.info('mocha ' + mochaArgs.join(' '));
        }

        return new Promise(function(resolve, reject) {
            var stderr = '';
            var stdout = '';

            proc.stdout.on('data', function(data) {
                stdout += data.toString();
                if (vLevel > 1) {
                    console.info(data.toString());
                }
            });

            proc.stderr.on('data', function(data) {
                stderr += data.toString();
            });
            proc.on('close', function(code) {
                if (code !== 0) {
                    return reject(new Error(stdout ? stdout : stderr));
                }

                return resolve(stdout);
            });
        });
    },

    /**
     *
     * @param {String} source
     * @throws {Error}
     * @return {undefined}
     */
    lintSource: function lintSource(source) {

        var JSHINT_OPTIONS = {
            node      : 'node',
            sub       : true,
            undef     : true,
            strict    : true,
            trailing  : true,
            smarttabs : true,
            maxerr    : 999
        };

        if(!jshint(source, JSHINT_OPTIONS, {Promise: true})){
            jshint.errors.forEach(function(error) {
                throw new Error(error.reason + ' in ' + error.evidence + ' (' + error.code + ')');
            });
        };
    },

    /**
     * @public
     *
     * @param {Object} spec - swagger 2.0|3.0 definition
     * @param {Object} pkg - service's package.json
     *
     * @return {Object}
     */
    getTemplateContext: function getTemplateContext(spec, pkg) {
        var self = this;
        var server = this.getDestinationServer(spec);

        var out = {
            moduleName : this.getConstructorName(pkg.name, spec.info),
            openbrace  : '{',
            closebrace : '}',
            version    : spec.info.version,
            host       : server.host,
            basePath   : server.basePath,
            paths      : []
        };

        var _sdkMethodNames = [];

        Object.keys(spec.paths).forEach(function(path) {
            Object.keys(spec.paths[path]).forEach(function(method) {
                var route = spec.paths[path][method];

                var queryParams = self.filterParams(route.parameters, 'query');
                var hasBody = ['post', 'put', 'delete'].includes(method.toLowerCase());

                var def = {
                    sdkMethodName : route['x-sdkMethodName'],
                    hasBody       : hasBody,
                    operationId   : route.operationId,
                    tags          : route.tags,
                    routeDesc     : (route.description || '').replace(/\ {2,}/g, ' '),
                    summary       : route.summary,
                    method        : method,
                    url           : path,
                    pathParams    : self.filterParams(route.parameters, 'path'),
                    headerParams  : self.filterParams(route.parameters, 'header'),
                    queryParams   : hasBody ? queryParams : [],
                    methodPathArgs: function() {
                        return this.pathParams.map(function(param) {
                            return param.name;
                        }).join(', ') + (this.pathParams.length ? ', ': '');
                    }
                };

                self.sanitizePathParams(def.pathParams);

                if (~_sdkMethodNames.indexOf(def.sdkMethodName)) {
                    throw new Error(`Duplicate route sdk method name: ${route.sdkMethodName}`);
                }

                if (route.hasOwnProperty('x-amqp')) {//for AMQP Route definitions
                    def.amqp = route['x-amqp'];
                }

                _sdkMethodNames.push(def.sdkMethodName);
                out.paths.push(def);
            });
        });

        return out;
    },

    /**
     * returns {host, '', basePath: ''}
     * @param {Object} spec - OpenAPI v2 | v3
     * @return {Object}
     */
    getDestinationServer: function(spec) {
        let server = {
            host: '',
            basePath: ''
        };

        if (typeof spec.openapi === 'string'
            && spec.openapi.indexOf('3') == 0
        ) {
            let protocolPath = ['variables', 'protocol', 'default'];
            let hostPath = ['variables', 'host', 'default'];
            let basePathPath = ['variables', 'basePath', 'default'];

            let protocol = _.get(spec.servers[0], protocolPath, '');
            let host = _.get(spec.servers[0], hostPath, '');
            let basePath = _.get(spec.servers[0], basePathPath, '');

            server.host = protocol + host;
            server.basePath = basePath;

        } else if(typeof spec.swagger === 'string'
            && spec.swagger.indexOf('2') == 0
        ) {
            server.host = spec.host;
            server.basePath = spec.basePath;

            if (spec.schemes instanceof Array
                && (~spec.schemes.indexOf('http')
                    || ~spec.schemes.indexOf('https')
                ) && !server.host.match(/^\w+:\/\//)
            ) {
                if (server.host) {
                    server.host = (
                        spec.schemes.indexOf('https') !== -1 ?
                        'https://' :
                        'http://'
                    ) + server.host;
                }
            }
        }

        return server;
    },

    /**
     * @param {Array} params
     *
     * @return {Array}
     */
    sanitizePathParams: function(params) {
        params = params || [];

        params.forEach(function(param) {
            //path param names are used as variables in generated code,
            //so make sure the name is valid
            param.name = param.name.replace(/\W+/g, '_');
        });

        return params;
    },

    /**
     * @param {String} sdkInterfaceVersion - npm package version of serviser-sdk
     * @param {String} serviceVersion - npm package version of serviser based app
     * @return {String}
     */
    getSDKPackageVersion: function getSDKPackageVersion(sdkInterfaceVersion, serviceVersion) {
        return `${sdkInterfaceVersion}-x.${serviceVersion}`;
    },

    /**
     *
     * @param {String} serviceName
     * @param {Object} specsInfo
     * @param {String} specsInfo.version
     * @param {String} specsInfo.title
     * @param {String} specsInfo.x-app
     *
     * @return {String}
     */
    getConstructorName: function getConstructorName(serviceName, specsInfo) {
        specsInfo = specsInfo || {};
        let version = specsInfo.version;
        let app = specsInfo['x-app'] || specsInfo.title;
        app = app.replace(/[^a-zA-Z0-9_]/gi, '');
        serviceName = serviceName.toLowerCase();
        serviceName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
        version = version.replace(/\./, '_');

        return `${serviceName}_${app}_SDK_${version}`
            .replace(/\W+/g, '_')
            .replace(/[^a-zA-Z0-9_]/gi, '');
    },

    /**
     * @param {String} template
     * @param {Object} context
     *
     * @return {String}
     */
    renderTemplate: function renderTemplate(template, context) {

        var tmpl = fs.readFileSync(
            path.resolve(__dirname + `/../lib/templates/${template}.mustache`)
        );

        return mustache.render(tmpl.toString(), context);
    },

    /**
     * @param {Array} params
     * @param {String} filter - type of parameters to return
     * @return {Array}
     */
    filterParams: function filterParams(params, filter) {
        return params.filter(function(param) {
            return param.in.match(filter);
        });
    },

    /**
     * @param {String} url
     * @return {Promise<Object>}
     */
    fetchSwaggerSpecs: function fetchSwaggerSpecs(url) {
        global.Promise = Promise;
        return axios.get(url).then(function(res) {
            let data = res.data[Object.keys(res.data).shift()];
            let out = {};
            if (_.has(data, ['info', 'title'])) {
                out[data.info.title] = res.data;
            } else {
                throw new Error('Could not get API specification `info.title` option');
            }
            return out;
        });
    },

    /**
     * @param {String} projectRoot - dirrectory of serviser based project
     * @param {String} executable - filepath to serviser-doc executable
     * @param {String} execArgs - shell arguments provided to the serviser-doc
     *
     * @throws Error
     * @return {Object}
     */
    getSwaggerSpecs: function getSwaggerSpecs(projectRoot, executable, execArgs) {
        return new Promise(function(resolve, reject) {
            let stderr = '', stdout = '';
            args = _.clone(execArgs);
            args.unshift('get:swagger');
            args.unshift(executable);
            args.unshift('--preserve-symlinks');

            if (!~args.indexOf('-f') && !~args.indexOf('--file')) {
                args.push('--file');
                args.push(projectRoot + '/index.js');
            }

            if (!~args.indexOf('--config')) {
                args.push('--config');
                args.push(projectRoot + '/config/config.js');
            }

            var result = childProcess.spawn('node', args);

            result.once('error', reject);

            result.stdout.setEncoding('utf8');
            result.stderr.setEncoding('utf8');
            result.stdout.on('data', function(chunk) {
                stdout += chunk;
            });
            result.stderr.on('data', function(chunk) {
                stdout += chunk;
            });

            result.on('exit', function(code) {
                let specs;

                if (code !== 0) {
                    console.error(stderr);
                    console.error(stdout);
                    throw new Error(stderr || stdout);
                }

                try {
                    specs = JSON.parse(stdout);
                } catch(e) {
                    throw new Error('Failed to parse swagger JSON specs: ' + e.message);
                }

                resolve(specs);
            });

        });
    }

};

module.exports = Object.create(builder);

//run only if this module isn't required by other node module
if (module.parent === null) {

    var argv = yargs
    .usage('$0 --service [path] --doc-exec [path] -- [serviser-doc-args]')
    .option('service', {
        alias: 's',
        describe: 'Filesystem path to root project directory',
        required: true,
        default: process.cwd(),
        coerce: path.resolve,
        type: 'string'
    })
    .option('doc-exec', {
        alias: 'e',
        describe: 'serviser-doc executable.',
        default: 'serviser-doc',
        required: true,
        coerce: path.resolve,
        type: 'string'
    })
    .option('specs', {
        describe: 'API specification source (Open API 2.0)',
        required: false,
        coerce: url.parse,
        type: 'string'
    })
    .option('tests', {
        alias: 'test',
        describe: 'Runs automated tests on builded SDKs',
        default: true,
        required: true,
        type: 'boolean'
    })
    .option('dry', {
        describe: 'Runs build without actually exporting any files',
        default: false,
        required: true,
        type: 'boolean'
    })
    .option('cleanup', {
        describe: 'Whether to cleanup tmp files created during the build',
        default: true,
        required: true,
        type: 'boolean'
    })
    .option('verbose', {
        alias: 'v',
        describe: 'Dumps more info to stdout (eg. about tests | npm install)',
        default: 1,
        count: true,
        type: 'boolean'
    })
    .option('version', {
        describe: 'Prints serviser-sdk version',
        default: false,
        type: 'boolean'
    })
    .example('> $0 -s /path/to/serviser/project -- --app public',
        'Generates client SDK npm package for given app(s)')
    .example('> $0 --doc-exec ./node_modules/.bin/serviser-doc',
        'Generates client SDKs for each exported app of serviser based project under current working dirrectory')
    .help('h', false).alias('h', 'help').wrap(yargs.terminalWidth()).argv;

    if (argv.version) {
        console.log(SDK_VERSION);
        process.exit(0);
    }

    return module.exports.main(argv);
}
