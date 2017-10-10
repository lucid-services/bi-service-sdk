const packageJSON  = require('../../../package.json');
const Promise      = require('bluebird');
const fs           = Promise.promisifyAll(require('fs'));
const path         = require('path');
const sinon        = require('sinon');
const chai         = require('chai');
const sinonChai    = require("sinon-chai");
const childProcess = require('child_process');
const tmp          = require('tmp');

var expect = chai.expect;

chai.use(sinonChai);
chai.should();

var BI_SERVICE_DOC_EXEC = require.resolve('bi-service-doc/bin/bi-service-doc');

describe('bin/bi-service-sdk', function() {
    before(function(done) {
        var self = this;

        tmp.setGracefulCleanup();
        this.tmpDir = tmp.dirSync({
            unsafeCleanup: true,
            keep: false
        });

        this.spawn = spawn;


        this.sdk1FilePath = `${this.tmpDir.name}/bi-test-app1-1.0.0.zip`;
        this.sdk2FilePath = `${this.tmpDir.name}/bi-test-app2-1.0.0.zip`;

        prepareProjectTestCase(this.tmpDir.name + '/bi-service-app', done);

        function spawn(args) {
            var cmd = path.normalize(__dirname + '/../../../bin/bi-service-sdk.js');
            args.unshift(cmd);

            var result = childProcess.spawnSync('node', args, {
                cwd: self.tmpDir.name,
                env: { NODE_ENV: 'development' }
            });

            if (result.error) {
                throw result.error;
            }

            return result;
        }

        function prepareProjectTestCase(dest, cb) {
            let appPath = path.resolve(__dirname + '/../../bi-service-app');

            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest);
            }

            return Promise.all([
                fs.readFileAsync(`${appPath}/config.json5`),
                fs.readFileAsync(`${appPath}/index.js`),
                fs.readFileAsync(`${appPath}/package.json`)
            ]).then(function(files) {
                return Promise.all([
                    fs.writeFileAsync(`${dest}/config.json5`, files[0]),
                    fs.writeFileAsync(`${dest}/index.js`, files[1]),
                    fs.writeFileAsync(`${dest}/package.json`, files[2])
                ]);
            }).then(function() {
                const result = childProcess.spawnSync('npm', ['install'], {
                    cwd: dest,
                    env: { NODE_ENV: 'development' }
                });

                if (result.error) {
                    throw result.error;
                } else if (result.status !== 0) {
                    throw new Error('npm install err: ' + result.stderr.toString());
                }
            }).asCallback(cb);
        }
    });

    it('should dump bi-service-sdk version to stdout and exit with code: 0', function() {
        var result = this.spawn(['--version']);

        result.status.should.be.equal(0);
        result.stdout.toString().should.match(new RegExp(packageJSON.version));
    });

    describe('', function() {
        before(function() {
            this.result = this.spawn([
                '--service',
                path.resolve(this.tmpDir.name + '/bi-service-app'),
                '--doc-exec',
                require.resolve('bi-service-doc/bin/bi-service-doc'),
                '--tests',
                true,
                '--',
                '--config',
                path.resolve(this.tmpDir.name + '/bi-service-app/config.json5')
            ]);
        });

        it('should create two zipped SDK packages in provided cwd directory', function() {
            this.result.status.should.be.equal(0);

            var sdk1 = fs.statSync(this.sdk1FilePath);
            var sdk2 = fs.statSync(this.sdk2FilePath);

            expect(sdk1.isFile(), `${this.sdk1FilePath} is not a file`).to.be.equal(true);
            expect(sdk2.isFile(), `${this.sdk2FilePath} is not a file`).to.be.equal(true);

            fs.unlinkSync(this.sdk1FilePath);
            fs.unlinkSync(this.sdk2FilePath);
        });

        it('should print progress messages to stdout', function() {
            var stdout = this.result.stdout.toString();

            stdout.should.match(/preparing testing environment/);
            stdout.should.match(/npm install mocha/);
            stdout.should.match(/running tests/);
            stdout.should.match(/mocha --ui bdd/);
            stdout.should.match(new RegExp(`Exporting ${this.sdk1FilePath}`));
            stdout.should.match(new RegExp(`Exporting ${this.sdk2FilePath}`));
        });

        it('should cleanup temporary build files by default', function() {
            var stdout = this.result.stdout.toString();

            var tmpDir = stdout.match(/Build tmp directory: (.+)/);
            expect(tmpDir).to.be.an.instanceof(Array);
            tmpDir = tmpDir[1];//first group match

            expect(fs.existsSync(tmpDir), `${tmpDir} should have been removed after successful build`).to.be.equal(false);
        });
    });

    describe('--dry option', function() {
        it('should not create any SDK packages if dry run is enabled', function() {
            var result = this.spawn([
                '--service',
                path.resolve(this.tmpDir.name + '/bi-service-app'),
                '--doc-exec',
                require.resolve('bi-service-doc/bin/bi-service-doc'),
                '--tests',
                false,
                '--dry',
                true,
                '--',
                '--config',
                path.resolve(this.tmpDir.name + '/bi-service-app/config.json5')
            ]);

            result.status.should.be.equal(0);

            expect(fs.existsSync(this.sdk1FilePath), `${this.sdk1FilePath} should not have been created`).to.be.equal(false);
            expect(fs.existsSync(this.sdk2FilePath), `${this.sdk2FilePath} should not have been created`).to.be.equal(false);
        });
    });

    describe('--cleanup option', function() {
        it('should NOT remove tmp build directory when the `cleanup` option is set to false', function() {
            var result = this.spawn([
                '--service',
                path.resolve(this.tmpDir.name + '/bi-service-app'),
                '--doc-exec',
                require.resolve('bi-service-doc/bin/bi-service-doc'),
                '--tests',
                false,
                '--dry',
                true,
                '--cleanup',
                false,
                '--',
                '--config',
                path.resolve(this.tmpDir.name + '/bi-service-app/config.json5')
            ]);

            result.status.should.be.equal(0);

            var stdout = result.stdout.toString();
            var tmpDir = stdout.match(/Build tmp directory: (.+)/);
            expect(tmpDir).to.be.an.instanceof(Array);
            tmpDir = tmpDir[1];//first group match

            expect(fs.existsSync(tmpDir), `${tmpDir} should NOT have been removed after successful build`).to.be.equal(true);
        });
    });
});
