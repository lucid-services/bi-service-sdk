/**
 * this file represents bi-service based app
 * and its purpose is to help test the bin/bi-service-doc
 * shell executable
 */

const Service = require('bi-service');
const config  = require('bi-config');
const path    = require('path');

config.initialize({fileConfigPath: path.resolve(__dirname + '/config.json5')});

const service = module.exports = new Service(config);

process.on('uncaughtException', function(err) {
    console.error(err);
});

service.on('set-up', function() {
    //app1
    this.buildApp('app1', {}).buildRouter({
        url: '/',
        version: 1
    }).buildRoute({
        url: '/',
        type: 'get'
    }).validate({
        properties: {
            id: {type: 'integer'}
        }
    }, 'query');

});

//app2
service.buildApp('app2', {}).buildRouter({
    url: '/',
    version: 2
}).buildRoute({
    url: '/:id',
    type: 'put'
}).validate({
    properties: {
        id: {type: 'integer'}
    }
}, 'params');
