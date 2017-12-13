[![Build Status](https://travis-ci.org/BohemiaInteractive/bi-service-sdk.svg?branch=master)](https://travis-ci.org/BohemiaInteractive/bi-service-sdk)  

### Generating a SDK npm package for a `bi-service` based application

* Your project's `index.js` must export the `Service` instance object.  
* Also you HAVE TO manually install `development` dependencies for the package.

```bash
> cd ./path/to/my/bi-service-project
> npm i bi-service-sdk
> npm i bi-service-doc
# generates SDKs into zip packages in cwd
> ./node_modules/.bin/bi-service-sdk -e "./node_modules/.bin/bi-service-doc" -- -f index.js

> # eventually
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

