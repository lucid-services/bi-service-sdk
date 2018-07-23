[![Build Status](https://travis-ci.org/BohemiaInteractive/bi-service-sdk.svg?branch=master)](https://travis-ci.org/BohemiaInteractive/bi-service-sdk)  

### Peer Dependencies

* `bi-service` >= `1.0.0`
* `bi-service-doc` >= `2.0.0`

### Generating a SDK client npm package for a `bi-service` based application

Requires `bi-service-doc` package to be plugged in along the `bi-service-sdk` plugin.  
Load them at bottom of your `index.js`:  

```javascript
//index.js
//...
const Service = require('bi-service');
const service = new Service(/*...*/);
module.exports = service;
//...

//Load the plugins
require('bi-service-doc');
require('bi-service-sdk');
```

Make sure that your project's `index.js` exports the `Service` instance object.  
and then just call the `build:sdk` command:  

```bash
> cd ./path/to/my/bi-service-project
#builds SDKs for all supported apps (zip files are written to cwd)
project/root> ./node_modules/.bin/bi-service build:sdk

#view available cmd options
project/root> ./node_modules/.bin/bi-service build:sdk --help
```

An alternative way is to use standalone `bi-service-sdk` executable and provide it with API specification source from which SDKs are generated:  

```bash
# generates SDKs into zip packages in cwd
> bi-service-sdk --specs "http://docs.service.com/specs" #url must return json in format {"v1.0": {/*Open API 2.0 specs*/}}

> # eventually
> ./node_modules/.bin/bi-service build:sdk --help
> ./node_modules/.bin/bi-service-sdk --help
> ./node_modules/.bin/bi-service-doc --help
```


### npm package version schema of generated SDKs

example:  
bi-service-sdk: `1.0.0`  
bi-depot: `0.5.0`

bi-depot-private-sdk: `1.0.0-x.0.5.0`
bi-depot-public-sdk: `1.0.0-x.0.5.0`

### Defining a generated SDK module as a npm dependency

```json
{
    "dependencies": {
        "bi-depot-private-sdk": "^1.0.0-x.0.5.0 <1.0.0-x.1.0.0"
    }
}
```

The above version restriction will match for example:  

* `1.0.0-x.0.5.0`
* `1.0.0-x.0.6.0`
* `1.0.0-x.0.6.1`

but will **NOT** match:  

* `1.0.0-x.1.0.0`
* `1.0.1-x.0.5.0`
* `1.1.0-x.0.5.0`
* `2.1.0-x.0.5.0`

