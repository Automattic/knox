
# knox

 Node Amazon S3 Client.

## Features

  - Not outdated :), developed for node 0.2.x
  - RESTful api (`client.get()`, `client.put()`, etc)
  - Uses node's crypto library (fast!, the others used native js)
  - Very node-like low-level request api via `http.Client`
  - Highly documented

## Authors

  - TJ Holowaychuk ([visionmedia](http://github.com/visionmedia))

## Examples

The following examples demonstrate some capabilities of knox and the s3 REST API.

### PUT

Below we do several things, first we read _Readme.md_ into memory,
and initialize a client request via `client.put()`, passing the destination
filename as the first parameter (_/test/Readme.md_), and some headers. Then
we listen for the _response_ event, just as we would for any `http.Client` request, if we have a 200 response, great! output the destination url to stdout.

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

### GET

Below is an example __GET__ request on the file we just shoved at s3, and simply outputs the response status code, headers, and body.

    client.get('/test/Readme.md').on('response', function(res){
      console.log(res.statusCode);
      console.log(res.headers);
      res.setEncoding('utf8');
      res.on('data', function(chunk){
        console.log(chunk);
      });
    }).end();

## DELETE

Delete our file:

    client.del('/test/Readme.md').on('response', function(res){
      console.log(res.statusCode);
      console.log(res.headers);
    }).end();

## Running Tests

To run the test suite you must first have an S3 account, and create
a file named _./auth_, which contains your credentials as json, for example:

    {"key":"<api-key-here>",
     "secret":"<secret-here>",
     "bucket":"<your-bucket-name>"}

Then simply execute:

    $ make test

## License 

(The MIT License)

Copyright (c) 2010 LearnBoost &lt;dev@learnboost.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
