
### config.json5
```javascript
app: {
    services: {
        privateDepot: {
            host: '127.0.0.1:3000',
            ssl: false,
            npm: 'bi-depot-private-sdk'
        }
    }
}
```

### Initialization
```javascript
    var DepotPublicSDK = require('bi-depot-public-sdk');

    app.once('post-init', function (app) {
        //1. Looks for `services.privateDepot.npm` option value in app's config
        //2. Loads `bi-depot-private-sdk` npm module
        //3. Initializes the SDK and connects it to the app
        app.useSDK('privateDepot', {
            errors: {}, // map of request response codes and custom Error constructors
            //accepts also all `axios` options
        });

        //1. Connects provided SDK object to the app under specified key
        app.useSDK('publicDepot', new DepotPublicSDK({
            errors: { // map custom Error constructors to request response codes
                400: RequestError,
                500: ServiceError
            },
            baseURL: 'http://...' // accepts all `axios` options
        }));
    });
```

### Acessing the SDKs

```javascript

    router.buildRoute({/*options*/}).main(function(req, res) {
        return this.app.sdk.privateDepot['v1.0'].getServiceClients('bi-auth').then(function(response){
        });

        //or

        router.App.sdk.privateDepot //....
        router.App.sdk.publicDepot //....
    });
```
