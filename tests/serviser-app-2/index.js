/**
 * this file represents serviser based app
 * and its purpose is to help test the bin/serviser-doc
 * shell executable
 */

const Service = require('serviser');
const config  = require('serviser-config');
const path    = require('path');

config.initialize({fileConfigPath: path.resolve(__dirname + '/config.js')});

const service = module.exports = new Service(config);

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

//serviser-sdk plugin
require('../../index.js');
