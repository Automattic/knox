# knox

Node Amazon S3 Client.

## Features

  - Familiar API (`client.get()`, `client.put()`, etc)
  - Very Node-like low-level request capabilities via `http.Client`
  - Higher-level API with `client.putStream()`, `client.getFile()`, etc.
  - Copying and multi-file delete support
  - Streaming file upload and direct stream-piping support

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

More options are documented below for features like other endpoints or regions.

### PUT

If you want to directly upload some strings to S3, you can use the `Client#put`
method with a string or buffer, just like you would for any `http.Client`
request. You pass in the filename as the first parameter, some headers for the
second, and then listen for a `'response'` event on the request. Then send the
request using `req.end()`. If we get a 200 response, great!

```js
var object = { foo: "bar" };
var string = JSON.stringify(object);
var req = client.put('/test/obj.json', {
    'Content-Length': string.length
  , 'Content-Type': 'application/json'
});
req.on('response', function(res){
  if (200 == res.statusCode) {
    console.log('saved to %s', req.url);
  }
});
req.end(string);
```

By default the _x-amz-acl_ header is _private_. To alter this simply pass this header to the client request method.

```js
client.put('/test/obj.json', { 'x-amz-acl': 'public-read' });
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
  client.putStream(res, '/doodle.png', headers, function(err, res){
    // Logic
  });
});
```

And if you want a nice interface for putting a buffer or a string of data,
use `Client#putBuffer()`:

```js
var buffer = new Buffer('a string of data');
var headers = {
  'Content-Type': 'text/plain'
};
client.putBuffer(buffer, '/string.txt', headers, function(err, res){
  // Logic
});
```

Note that both `putFile` and `putStream` will stream to S3 instead of reading
into memory, which is great. And they return objects that emit `'progress'`
events too, so you can monitor how the streaming goes! The progress events have
fields `written`, `total`, and `percent`.

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
client.getFile('/test/Readme.md', function(err, res){
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

client.copyFile('/test/Readme.md', '/test/Readme.markdown', function(err, res){
  // Logic
});
```

and deleting multiple files at once:

```js
client.deleteMultiple(['/test/Readme.md', '/test/Readme.markdown'], function(err, res){
  // Logic
});
```

and [listing all the files in your bucket][list]:

```js
client.list({ prefix: 'my-prefix' }, function(err, data){
  /* `data` will look roughly like:

  {
    Prefix: 'my-prefix',
    IsTruncated: true,
    MaxKeys: 1000,
    Contents: [
      {
        Key: 'whatever'
        LastModified: new Date(2012, 11, 25, 0, 0, 0),
        ETag: 'whatever',
        Size: 123,
        Owner: 'you',
        StorageClass: 'whatever'
      },
      ⋮
    ]
  }

  */
});
```

And you can always issue ad-hoc requests, e.g. the following to
[get an object's ACL][acl]:

```js
client.request('GET', '/test/Readme.md?acl').on('response', function(res){
  // Read and parse the XML response.
  // Everyone loves XML parsing.
}).end();
```

[list]: http://docs.amazonwebservices.com/AmazonS3/latest/API/RESTBucketGET.html
[acl]: http://docs.amazonwebservices.com/AmazonS3/latest/API/RESTObjectGETacl.html

## Client Creation Options

Besides the required `key`, `secret`, and `bucket` options, you can supply any
of the following:

### `endpoint`

By default knox will send all requests to the global endpoint
(bucket.s3.amazonaws.com). This works regardless of the region where the bucket
is. But if you want to manually set the endpoint (for performance reasons) you
can do it with the `endpoint` option.

### `region`

For your convenience when using buckets not in the US Standard region, you can
specify the `region` option. When you do so, the `endpoint` hostname is
automatically assembled.

As of this writing, valid values for the `region` option are:

* US Standard (default): `us-standard`
* US West (Oregon): `us-west-2`
* US West (Northern California): `us-west-1`
* EU (Ireland): `eu-west-1`
* Asia Pacific (Singapore): `ap-southeast-1`
* Asia Pacific (Tokyo): `ap-northeast-1`
* South America (Sao Paulo): `sa-east-1`

If new regions are added later, their subdomain names will also work when passed
as the `region` option. See the [AWS endpoint documentation][endpoint-docs] for
the latest list.

**Convenience APIs such as `putFile` and `putStream` currently do not work as
expected with buckets in regions other than US Standard without explicitly
specify the region option.** This will eventually be addressed by resolving
[issue #66][]; however, for performance reasons, it is always best to specify
the region option anyway.

[endpoint-docs]: http://docs.amazonwebservices.com/general/latest/gr/rande.html#s3_region
[issue #66]: https://github.com/LearnBoost/knox/issues/66

### `secure` and `port`

By default, knox uses HTTPS to connect to S3 on port 443. You can override
either of these with the `secure` and `port` options. Note that if you specify a
custom `port` option, the default for `secure` switches to `false`, although
you can override it manually if you want to run HTTPS against a specific port.

### `token`

If you are using the [AWS Security Token Service][sts] APIs, you can construct
the client with a `token` parameter containing the temporary security
credentials token. This simply sets the _x-amz-security-token_ header on every
request made by the client.

[sts]: http://docs.amazonwebservices.com/STS/latest/UsingSTS/Welcome.html

### `agent`

If you want to use a custom [HTTP agent][], you can specify this with the
`agent` option.

[HTTP agent]: http://nodejs.org/docs/latest/api/http.html#http_class_http_agent


## Beyond Knox

### Multipart Upload

S3's [multipart upload][] is their [rather-complicated][] way of uploading large
files. In particular, it is the only way of streaming files without knowing
their Content-Length ahead of time.

Adding the complexity of multipart upload directly to knox is not a great idea.
For example, it requires buffering at least 5 MiB of data at a time in memory,
which you want to avoid if possible. Fortunately, [@nathanoehlman][] has created
the excellent [knox-mpu][] package to let you use multipart upload with knox if
you need it!

[multipart upload]: aws.typepad.com/aws/2010/11/amazon-s3-multipart-upload.html
[rather-complicated]: http://stackoverflow.com/q/8653146/3191
[@nathanoehlman]: https://github.com/nathanoehlman
[knox-mpu]: https://npmjs.org/package/knox-mpu

### Easy Download/Upload

[@superjoe30][] has created a nice library, called simply [s3][], that makes it
very easy to upload local files directly to S3, and download them back to your
filesystem. For simple cases this is often exactly what you want!

[@superjoe30]: https://github.com/superjoe30
[s3]: https://npmjs.org/package/s3


## Running Tests

To run the test suite you must first have an S3 account. Then create a file named
_./test/auth.json_, which contains your credentials as JSON, for example:

```json
{
  "key": "<api-key-here>",
  "secret": "<secret-here>",
  "bucket": "<your-bucket-name>",
  "bucketUsWest2": "<bucket-in-us-west-2-region-here>"
}
```

Then install the dev dependencies and execute the test suite:

```
$ npm install
$ npm test
```
