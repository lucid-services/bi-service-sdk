const Promise      = require('bluebird');
const fs           = Promise.promisifyAll(require('fs'));
const path         = require('path');
const chai         = require('chai');
const childProcess = require('child_process');

const expect = chai.expect;

chai.should();

describe('bi-service-sdk as a plugin', function() {
    before(function() {
        const self = this;

        this.spawn = spawn;

        this.rootPath = path.resolve(__dirname + '/../bi-service-app-2');
        this.sdk1FilePath = path.resolve(this.rootPath + `/bi-test-app1-1.0.0.zip`);
        this.sdk2FilePath = path.resolve(this.rootPath + `/bi-test-app2-1.0.0.zip`);

        function spawn(args) {
            const cmd = path.normalize(__dirname + '/../../node_modules/.bin/bi-service');
            args.unshift(cmd);

            const result = childProcess.spawnSync('node', args, {
                cwd: self.rootPath,
                env: { NODE_ENV: 'development' }
            });

            if (result.error) {
                throw result.error;
            }

            return result;
        }
    });

    describe('', function() {
        before(function() {
            this.result = this.spawn([
                'build:sdk',
                '--config',
                path.resolve(this.rootPath + '/config.json5')
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
                'build:sdk',
                '--tests',
                false,
                '--dry',
                true,
                '--config',
                path.resolve(this.rootPath + '/config.json5')
            ]);

            result.status.should.be.equal(0);

            expect(fs.existsSync(this.sdk1FilePath), `${this.sdk1FilePath} should not have been created`).to.be.equal(false);
            expect(fs.existsSync(this.sdk2FilePath), `${this.sdk2FilePath} should not have been created`).to.be.equal(false);
        });
    });

    describe('--cleanup option', function() {
        it('should NOT remove tmp build directory when the `cleanup` option is set to false', function() {
            var result = this.spawn([
                'build:sdk',
                '--tests',
                false,
                '--dry',
                true,
                '--cleanup',
                false,
                '--config',
                path.resolve(this.rootPath + '/config.json5')
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
