# Evoke Context

Utilities that provide Evoke widgets context about the runtime environment.

## Installation

> **Note**: This package is included as part of the [Evoke SDK][sdk]. It is recommended to install the SDK instead.

```sh
npm install @evoke-platform/context
```

If your project was scaffolded using the [plugin generator][plugin], then `@evoke-platform/context` is already
available and no further installation is necessary.

## Documentation

-   [Working With Objects](#working-with-objects)
-   [REST API Calls](#rest-api-calls)
-   [Notifications](#notifications)

### Working With Objects

Use `ObjectStore` to work with objects and instances of objects. Obtain an object store with the `useObject` hook:

```javascript
const applications = useObject('application');
```

-   [useObject](#useobjectobjectid)
-   [Class: ObjectStore](#class-objectstore)
    -   [get](#getoptions-callback)
    -   [findInstances](#findinstancesfilter)
    -   [getInstance](#getinstanceinstanceid)
    -   [getInstanceHistory](#getinstancehistoryinstanceid)
    -   [newInstance](#newinstanceinput)
    -   [instanceAction](#instanceactioninput)

#### `useObject(objectId)`

Hook for use in a functional component. Returns an instance of `ObjectStore` for the specified object.

-   `objectId` _[string]_
    -   The id of the object you want to work with.
-   Returns `ObjectStore` instance for the given object. Note there are no guarantees about whether the given object
    actually exists. If the specified object does not exist, failures will not occur until you try to use the object
    store.

#### Class: `ObjectStore`

This class enables you to perform operations on an object and its instances. Both promises and callbacks are supported.
If a typical JavaScript callback function is provided as the last argument, the callback will be used to return the
results. Otherwise, a promise is returned. For example:

```javascript
function callback(err, result) {
    if (err) {
        // error occurred
    } else {
        // process result
    }
}

applications.findInstances(callback);
           -- or --
const results = await applications.findInstances();
```

##### `get(options)`

Get the object definition for this store's object. The returned object includes inherited properties and actions if
this object is derived from another object.

-   `options` _[object]_ - _optional_
    -   `sanitized` _[boolean]_
        -   If `true`, returns a sanitized version of the object reflecting only the properties and actions available
            to the current user.

##### `findInstances(filter)`

Retrieves instances of the object that match the filter.

-   `filter` _[object]_ - _optional_
    -   `fields` _[array(string)]_ - _optional_
        -   Object fields to be returned in the results. If not provided, all fields will be returned.
    -   `where` _[object]_ - _optional_
    -   `order` _[array(string)]_ - _optional_
    -   `skip` _[number]_ - _optional_
        -   If provided, skip the specified number of instances before returning results. Typically used together with
            `order` and `limit`.
    -   `limit` _[number]_ - _optional_
        -   If provided, limits the number of results to the specified count.
-   Returns an array of matching instances.

##### `getInstance(instanceId)`

Retrieves a specific instance of the object.

-   `instanceId` _[string]_
    -   ID of the instance to be retrieved.

##### `getInstanceHistory(instanceId)`

Retrieves the history of an instance of the object.

-   `instanceId` _[string]_
    -   ID of the instance.
-   Returns an array of history records.

##### `newInstance(input)`

Creates a new instance of the object.

-   `input` _[object]_
    -   Create action to be executed. The action must have `type = 'create'`.
-   Returns newly created instance.

##### `instanceAction(input)`

Performs an action on an existing instance.

-   `input` _[object]_
    -   Action to be executed. The action must not be a create action.
-   Returns updated instance.

### Page Context

-   [usePageParam](#usepageparamparam)
-   [usePageParams](#usepageparams)
-   [useNavigate](#usenavigate)
-   [useApp](#useapp)

#### `usePageParam(param)`

Return the specified parameter value from the page route.

-   `param` _[string]_
    -   Parameter in the page route. For example, if the current page is `/applications/12345` matching the page
        route `/applications/:instanceId`, then passing `'instanceId'` will return `'12345'`.
-   Returns the matched parameter's value from the current page's route, or `undefined` if the page does not have
    a matching parameter.

#### `usePageParams()`

Returns an object with all of the current page's matched parameters, where the keys are the parameter names and
the values are the corresponding parameter values.

#### `useNavigate()`

Returns a function that can be used to navigate to another page. The returned function has the following signature:

`function (page, params)`

-   `page` _[string]_
    -   Page to navigate to. This can either be the exact route or a route template that includes parameter
        placeholders (e.g. a page id). With the latter, use the `params` argument to specify the path parameters.
-   `params` _[object]_ - _optional_
    -   Key/value object mapping parameter names with their corresponding value. If `page` contains parameter
        placeholders, they will be replaced with corresponding values provided in `params`.

#### `useApp()`

Returns the currently loaded Evoke App as well as the following function.

-   `findDefaultPageSlugFor`: An asynchronous function that takes an `objectId` as a parameter and returns the default page slug for that object, if no default page slug is found and the object is a subtype, the page slug of the first ancestor with a default page will be used. It returns `undefined` if no default page slug is found for any ancestor type.

Example usage:

```javascript
const { id: appId, findDefaultPageSlugFor } = useApp();
const defaultPageSlug = await findDefaultPageSlugFor(objectId);
```

### REST API calls

-   [useApiServices](#useapiservices)
-   [Class: ApiServices](#class-apiservices)
    -   [get](#geturl-options)
    -   [post](#posturl-data-options)
    -   [patch](#patchurl-data-options)
    -   [put](#puturl-data-options)
    -   [delete](#deleteurl-options)

#### `useApiServices()`

Hook used to obtain an instance of `ApiServices`.

#### Class: `ApiServices`

This class enables you to call the Evoke REST API. If the user is logged in to the Evoke platform, this class takes
care of adding the appropriate authentication token to the API call.

> **Note**: For accessing objects and instances, you can use [ObjectStore](#working-with-objects) instead.

This class is meant for use with the Evoke REST API, so any relative URLs provided are relative to the Evoke
environment's APIs, e.g. `https://[environment-host]/api`. You can, however, call external APIs by providing an
absolute URL.

##### `get(url, options)`

##### `post(url, data, options)`

##### `patch(url, data, options)`

##### `put(url, data, options)`

##### `delete(url, options)`

### Notifications

-   [useNofitication](#usenotification)
    -   [documentChanges](#documentchangessubscribeobjectidinstanceid-data-documentchange)
    -   [instanceChanges](#instancechangessubscribeobjectid-instanceids-instancechange)
-   [useSignalRConnection](#usesignalrconnection) (_Deprecated_)
    -   [documentChanges](#documentchangessubscribeobjectidinstanceid-data-documentchange) (_Deprecated_)
    -   [instanceChanges](#instancechangessubscribeobjectid-instanceids-instancechange) (_Deprecated_)

#### `useNofitication()`

Hook used to obtain an instanceChanges instance and a documentChanges instance.

##### `documentChanges.subscribe(objectId, instanceId, (data: DocumentChange[]]) => {})`

Subscribe to the specified object instance changes.

```javascript
const { documentChanges } = useNotification();

documentChanges.subscribe('myObjectId', 'myInstanceId', (data) => {
    console.log(data);
});
```

The data provided to the callback will be an array of `DocumentChange` which contains the
following data:

-   `objectId`
    -   Object describing the instance associated with the updated document.
-   `instanceId`
    -   Instance that the updated document is associated with.
-   `documentId`
    -   Document that was updated.
-   `type`
    -   The type of update. Possible values are `BlobCreated`, `BlobDeleted`, and `BlobMetadataUpdated`.

##### `documentChanges.unsubscribe(objectId, instanceId, (changes: DocumentChange[]) => {})`

Unsubscribe to the specified object instance changes.

Callback function is optional.
If callback function is not defined, all subscriptions will be removed.
If callback function is defined, you must pass the exact same Function instance as was previously passed to `documentChanges.subscribe`.
Passing a different instance (even if the function body is the same) will not remove the subscription.

```javascript
const { documentChanges } = useNotification();

const callback = (changes: DocumentChange[]) => {
    console.log(changes);
};

documentChanges.subscribe('myObjectId', 'myInstanceId', callback);

documentChanges.unsubscribe('myObjectId', 'myInstanceId', callback);
```

##### `instanceChanges.subscribe(objectId, (changes: InstanceChange[]) => {})`

Subscribe to the specified object changes.

```javascript
const { instanceChanges } = useNotification();

instanceChanges.subscribe('myObjectId', (changes) => {
    console.log(changes);
});
```

The data provided to the callback will be an array of `InstanceChange` which contains the
following data:

-   `objectId`
    -   Object describing the instance associated with the updated document.
-   `instanceId`
    -   Instance that the updated document is associated with.

##### `instanceChanges.unsubscribe(objectId, (changes: InstanceChange[]) => {})`

Unsubscribe to the specified object changes.

Callback function is optional.
If callback function is not defined, all subscriptions will be removed.
If callback function is defined, you must pass the exact same Function instance as was previously passed to `instanceChanges.subscribe`.
Passing a different instance (even if the function body is the same) will not remove the subscription.

```javascript
const { instanceChanges } = useNotification();

const callback = (changes: InstanceChange[]) => {
    console.log(changes);
};

instanceChanges.subscribe('myObjectId', callback);

instanceChanges.unsubscribe('myObjectId', callback);
```

#### `useSignalRConnection()`

> **Deprecated**
> This has been deprecated in favor of [useNotification](#usenofitication).

Hook used to obtain an instanceChanges instance of `SignalRConnection` and a documentChanges instance of `SignalRConnection`.

##### `documentChanges.subscribe('{objectId}/{instanceId}', (data: DocumentChange[]]) => {})`

> **Deprecated**
> This has been deprecated in favor of [useNotification](#usenofitication).

Subscribe to the specified object instance document changes.

```javascript
const { documentChanges } = useSignalRConnection();

documentChanges.subscribe('myObjectId/myInstanceId', (data) => {
    console.log(data);
});
```

The data provided to the callback will be an array of `DocumentChange` which contains the
following data:

-   `objectId`
    -   Object describing the instance associated with the updated document.
-   `instanceId`
    -   Instance that the updated document is associated with.
-   `documentId`
    -   Document that was updated.
-   `type`
    -   The type of update. Possible values are `BlobCreated`, `BlobDeleted`, and `BlobMetadataUpdated`.

##### `documentChanges.unsubscribe('{objectId}/{instanceId}', (data: DocumentChange[]) => {})`

> **Deprecated**
> This has been deprecated in favor of [useNotification](#usenofitication).

Unsubscribe to the specified object instance document changes.

Callback function is optional.
If callback function is defined, you must pass the exact same Function instance as was previously passed to `documentChanges.subscribe`.
Passing a different instance (even if the function body is the same) will not remove the subscription.

```javascript
const { documentChanges } = useSignalRConnection();

const callback = (data: DocumentChange[]) => {
    console.log(data);
};

documentChanges.subscribe('myObjectId/myInstanceId', callback);

documentChanges.unsubscribe('myObjectId/myInstanceId', callback);
```

##### `instanceChanges.subscribe('{objectId}', (instanceIds: InstanceChange[]) => {})`

> **Deprecated**
> This has been deprecated in favor of [useNotification](#usenofitication).

Subscribe to the specified object instance changes.

```javascript
const { instanceChanges } = useSignalRConnection();

instanceChanges.subscribe('myObjectId', (instanceIds) => {
    console.log(instanceIds);
});
```

The data provided to the callback will be an array of instance IDs that were updated.

##### `instanceChanges.unsubscribe('{objectId}', (instanceIds: InstanceChange[]) => {})`

> **Deprecated**
> This has been deprecated in favor of [useNotification](#usenofitication).

Unsubscribe to the specified object instance changes.

Callback function is optional.
If callback function is defined, you must pass the exact same Function instance as was previously passed to `instanceChanges.subscribe`.
Passing a different instance (even if the function body is the same) will not remove the subscription.

```javascript
const { instanceChanges } = useSignalRConnection();

const callback = (instanceIds: InstanceChange[]) => {
    console.log(instanceIds);
};

instanceChanges.subscribe('myObjectId', callback);

instanceChanges.unsubscribe('myObjectId', callback);
```

## License

[MIT](https://github.com/Evoke-Platform/evoke-sdk/blob/main/LICENSE)

[sdk]: https://github.com/Evoke-Platform/evoke-sdk/blob/main/packages/sdk/README.md
[plugin]: https://github.com/Evoke-Platform/evoke-sdk/blob/main/packages/plugin/README.md
