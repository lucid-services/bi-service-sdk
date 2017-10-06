
### Generating a SDK npm package for a `bi-service` based application

* Your project's `index.js` must export the `Service` instance object.  
* Also if `bi-service-sdk` package is installed globally, you have to manually install `development` dependencies for the package.

```bash
> npm i -g bi-service-sdk
> npm i -g bi-service-doc

> cd ./path/to/my/bi-service-project
# generates SDKs into zip packages in cwd
> bi-service-sdk -e "$(which bi-service-doc)" -- -f index.js

> # eventually
> bi-service-sdk --help
> bi-service-doc --help
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

