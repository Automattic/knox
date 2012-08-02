# knox

Node Amazon S3 Client.

## Features

  - Familiar API (`client.get()`, `client.put()`, etc)
  - Very Node-like low-level request capabilities via `http.Client`
  - Higher-level API with `client.putStream()`, `client.getFile()`, etc.
  - Copying and multi-file delete support
  - Highly documented

## Authors

  - TJ Holowaychuk ([visionmedia](https://github.com/visionmedia))
  - Domenic Denicola ([domenic](https://github.com/domenic))

## Examples

The following examples demonstrate some capabilities of knox and the S3 REST
API. First things first, create an S3 client:

```js
var client = knox.createClient({
    key: '<api-key-here>'
  , secret: '<secret-here>'
  , bucket: 'learnboost'
});
```

By default knox will send all requests to the global endpoint
(bucket.s3.amazonaws.com). This works regardless of the region where the bucket
is. But if you want to manually set the endpoint (for performance reasons) you
can do it with the `endpoint` option.

### PUT

Below we do several things, first we read _Readme.md_ into memory,
and initialize a client request via `client.put()`, passing the destination
filename as the first parameter (_/test/Readme.md_), and some headers. Then
we listen for the _response_ event, just as we would for any `http.Client`
request, if we have a 200 response, great! output the destination url to
stdout.

```js
fs.readFile('Readme.md', function(err, buf){
  var req = client.put('/test/Readme.md', {
      'Content-Length': buf.length
    , 'Content-Type': 'text/plain'
  });
  req.on('response', function(res){
    if (200 == res.statusCode) {
      console.log('saved to %s', req.url);
    }
  });
  req.end(buf);
});
```

By default the _x-amz-acl_ header is _public-read_, meaning anyone can __GET__
the file. To alter this simply pass this header to the client request method.

```js
client.put('/test/Readme.md', { 'x-amz-acl': 'private' });
```

Each HTTP verb has an alternate method with the "File" suffix, for example
`put()` also has a higher level method named `putFile()`, accepting a source
filename and performing the dirty work shown above for you. Here is an example
usage:

```js
client.putFile('my.json', '/user.json', function(err, res){
  // Logic
});
```

Another alternative is to stream via `Client#putStream()`, for example:

```js
http.get('http://google.com/doodle.png', function(res){
  var headers = {
      'Content-Length': res.headers['content-length']
    , 'Content-Type': res.headers['content-type']
  };
  client.putStream(res, '/doodle.png', headers, function (err, res) {
    // Logic
  });
});
```

Both `putFile` and `putStream` will stream the file to S3 instead of reading it
in to memory, so they are a much better choice than our original code in most
cases.

### GET

Below is an example __GET__ request on the file we just shoved at S3. It simply
outputs the response status code, headers, and body.

```js
client.get('/test/Readme.md').on('response', function(res){
  console.log(res.statusCode);
  console.log(res.headers);
  res.setEncoding('utf8');
  res.on('data', function(chunk){
    console.log(chunk);
  });
}).end();
```

There is also `Client#getFile()` which uses a callback pattern instead of giving
you the raw request:

```js
client.getFile('/test/Readme.md', function (err, res) {
  // Logic
});
```

### DELETE

Delete our file:

```js
client.del('/test/Readme.md').on('response', function(res){
  console.log(res.statusCode);
  console.log(res.headers);
}).end();
```

Likewise we also have `Client#deleteFile()` as a more concise (yet less
flexible) solution:

```js
client.deleteFile('/test/Readme.md', function(err, res){
  // Logic
});
```

### HEAD

As you might expect we have `Client#head` and `Client#headFile`, following the
same pattern as above.

### Advanced Operations

Knox supports a few advanced operations. Like copying files:

```js
client.copy('/test/Readme.md', '/test/Readme.markdown').on('response', function(res){
  console.log(res.statusCode);
  console.log(res.headers);
}).end();

// or

client.copyFile('/test/Readme.md', '/test/Readme.markdown', function (err, res) {
  // Logic
});
```

and deleting multiple files at once:

```js
client.deleteMultiple(['/test/Readme.md', '/test/Readme.markdown'], function (err, res) {
  // Logic
});
```

And you can always issue ad-hoc requests, e.g. the following to
[get an object's ACL][acl]:

```js
client.request('GET', '/test/Readme.md?acl').on('response', function (res) {
  // Read and parse the XML response.
  // Everyone loves XML parsing.
}).end();
```

[acl]: http://docs.amazonwebservices.com/AmazonS3/latest/API/RESTObjectGETacl.html

## Running Tests

To run the test suite you must first have an S3 account, and create
a file named _./auth_, which contains your credentials as json, for example:

```json
{
  "key":"<api-key-here>",
  "secret":"<secret-here>",
  "bucket":"<your-bucket-name>"
}
```

Then install the dev dependencies and execute the test suite:

    $ npm install
    $ npm test
