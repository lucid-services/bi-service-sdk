[![Build Status](https://travis-ci.org/lucid-services/serviser-sdk.svg?branch=master)](https://travis-ci.org/lucid-services/serviser-sdk)  

### Peer Dependencies

* `serviser` >= `1.0.0`
* `serviser-doc` >= `2.0.0`

### Generating a SDK client npm package for a `serviser` based application

Requires `serviser-doc` package to be plugged in along the `serviser-sdk` plugin.  
Load them at bottom of your `index.js`:  

```javascript
//index.js
//...
const Service = require('serviser');
const service = new Service(/*...*/);
module.exports = service;
//...

//Load the plugins
require('serviser-doc');
require('serviser-sdk');
```

Make sure that your project's `index.js` exports the `Service` instance object.  
and then just call the `build:sdk` command:  

```bash
> cd ./path/to/my/serviser-project
#builds SDKs for all supported apps (zip files are written to cwd)
project/root> ./node_modules/.bin/serviser build:sdk

#view available cmd options
project/root> ./node_modules/.bin/serviser build:sdk --help
```

An alternative way is to use standalone `serviser-sdk` executable and provide it with API specification source from which SDKs are generated:  

```bash
# generates SDKs into zip packages in cwd
> serviser-sdk --specs "http://docs.service.com/specs" #url must return json in format {"v1.0": {/*Open API 2.0/3.0 specs*/}}

> # eventually
> ./node_modules/.bin/serviser build:sdk --help
> ./node_modules/.bin/serviser-sdk --help
> ./node_modules/.bin/serviser-doc --help
```


### npm package version schema of generated SDKs

example:  
serviser-sdk: `1.0.0`  
your-project-name: `0.5.0`

your-project-name-private-sdk: `1.0.0-x.0.5.0`
your-project-name-public-sdk: `1.0.0-x.0.5.0`

### Defining a generated SDK module as a npm dependency

```json
{
    "dependencies": {
        "your-project-name-private-sdk": "^1.0.0-x.0.5.0 <1.0.0-x.1.0.0"
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

