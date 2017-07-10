
### config.json5
```javascript
app: {
    services: {
        depot: {
            private: {
                host: '127.0.0.1:3000',
                ssl: false,
                npm: 'bi-depot-private-sdk'
            }
        }
    }
}
```

### Initialization
```javascript
    var DepotPublicSDK = require('bi-depot-public-sdk');

    var service = new Service;
    var remoteServiceMgr = service.remoteServiceManager;

    //1. Looks for `services.depot.private.npm` option value in app's config
    //2. Loads `bi-depot-private-sdk` npm module
    //3. Initializes the SDK, saves it into internal register and returns the SDK object
    remoteServiceMgr.buildRemoteService('depot:s2s:v1.0', {/*sdk constructor options*/});

    //Manual initialization
    var sdk = new DepotPublicSDK({
            errors: { // map custom Error constructors to request response codes
            400: RequestError,
            500: ServiceError
            //accepts also all `axios` options
        }
    });
    remoteServiceMgr.add('depot:s2s', sdk);
```

### Acessing the SDKs

```javascript

    router.buildRoute({/*options*/}).main(function(req, res) {
        return this.app.service.getRemoteServiceManager().get('depot:private:v1.0').getServiceClients('bi-auth').then(function(response){
        });

        //or

        router.App.service.getRemoteServiceManager()//....
        router.App.service.getRemoteServiceManager()//....
    });
```

### Generating SDK

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

### defining a generated SDK module as a npm dependency

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

