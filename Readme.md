
# knox

 Node Amazon S3 Client.

## Features

  - Not outdated :), developed for node 0.2.x
  - RESTful api (`client.get()`, `client.put()`, etc)
  - Uses node's crypto library (fast!, the others used native js)
  - Very node-like low-level request api via `http.Client`
  - Highly documented
  - Multipart upload

## Authors

  - TJ Holowaychuk ([visionmedia](http://github.com/visionmedia))

## Examples

The following examples demonstrate some capabilities of knox and the s3 REST API. First things first, create an s3 client:

    var client = knox.createClient({
        key: '<api-key-here>'
      , secret: '<secret-here>'
      , bucket: 'learnboost'
    });

By default knox will send all requests to the global endpoint (bucket.s3.amazonaws.com).
This works regardless of the region where the bucket is. But if you want to manually set
the endpoint (for performance reasons) you can do it with the `endpoint` option.

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

By default the _x-amz-acl_ header is _public-read_, meaning anyone can __GET__ the file. To alter this simply pass this header to the client request method. Note that the field name __MUST__ be lowercase, do not use 'X-Amz-Acl' etc, as this will currently result in duplicate headers (although different case).

    client.put('/test/Readme.md', { 'x-amz-acl': 'private' });

Each HTTP verb has an alternate method with the "File" suffix, for example `put()` also has a higher level method named `putFile()`, accepting a src filename and performs the dirty work shown above for you. Here is an example usage:

    client.putFile('my.json', '/user.json', function(err, res){
      // Logic
    }); 

Another alternative is to stream via `Client#putStream()`, for example:

    var stream = fs.createReadStream('data.json');
    client.putStream(stream, '/some-data.json', function(err, res){
      // Logic
    });

An example of moving a file:

    client.put('0/0/0.png', {
        'Content-Type': 'image/jpg',
        'Content-Length': '0',
        'x-amz-copy-source': '/test-tiles/0/0/0.png',
        'x-amz-metadata-directive': 'REPLACE'
    }).on('response', function(res) {
      // Logic
    }).end();

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

### DELETE

Delete our file:

    client.del('/test/Readme.md').on('response', function(res){
      console.log(res.statusCode);
      console.log(res.headers);
    }).end();

Likewise we also have `client.deleteFile()` as a more concise (yet less flexible) solution:

    client.deleteFile('/test/Readme.md', function(err, res){
      // Logic
    });
    
### Initiate Multipart Upload

The Multipart upload API enables you to upload large objects in parts transactionally. For more info, 
see [here](http://docs.amazonwebservices.com/AmazonS3/latest/dev/index.html?mpuoverview.html).

Initiate multipart upload:

    client.beginUpload('/test/blob.bin', function(e, upinfo){ });
    
The first argument of the callback contains an error info. If it is _null_ then multipart upload is initiated
successfully. The second argument contains information about multipart upload transaction:

* `upinfo.bucket` - name of the bucket to which the multipart upload was initiated;
* `upinfo.key` - object key for which the multipart upload was initiated;
* `upinfo.uploadId` - ID for the initiated multipart upload.

`uploadId` is an important field which is used by other multipart upload operations.

### Upload Part

Uploading part using response stream:

    client.beginUpload('/test/blob.bin', function(e, upinfo){
    	//Upload the first part
    	var req = client.putPart('/test/blob.bin', 1, upinfo.uploadId);
    	var part = new Buffer('Hello, world!\n', 'utf8');	//file part as Buffer
    	req.end(part);	//send buffer
    	//Upload the second part
    	req = client.putPart('/test/blob.bin', 2, upinfo.uploadId);
    	req.end('Ciao, mondo!', 'utf8');	//Italian
    });
    
Uploading part using callback:

	client.beginUpload('/test/blob.bin', function(e, upinfo){
		var part = new Buffer('Hello, world!', 'utf8');
		client.putPart('/test/blob.bin', 1, upinfo.uploadId, part, function(e, pinfo){
			console.log('ETag = ' + pinfo.etag);
		});
	});
	
### Complete Multipart Upload

This operation completes a multipart upload by assembling previously uploaded parts. You should
specify an array of parts to be commited and upload ID(obtained from `beginUpload` function).

    client.beginUpload('/test/blob.bin', function(e, upinfo){
    	var part = new Buffer('Hello, world!', 'utf8');
    	//Upload part of the object
		client.putPart('/test/blob.bin', 1, upinfo.uploadId, part, function(e, pinfo){
			//complete multipart upload and create a new object on Amazon S3
			client.completeUpload('/test/blob.bin', upinfo.uploadId, [pinfo], function(e, cinfo){
				console.log('Success: ' + e !== null);
			});
		});
    });

### Abort Multipart Upload

This operations aborts multipart upload and removes all uploaded parts. Upload ID associated with the multipart upload
will be invalidated.

    client.beginUpload('/test/blob.bin', function(e, upinfo){
    	var part = new Buffer('Hello, world!', 'utf8');
    	//Upload part of the object
		client.putPart('/test/blob.bin', 1, upinfo.uploadId, part, function(e, pinfo){
			//Abort upload
			client.abortUpload('/test/blob.bin', upinfo.uploadId, function(success){
				console.log('Abort:' + success);
			});
		});
	});
	
### List Parts

Obtains status of the multipart upload.

    client.getParts('/test/blob.bin', '<Upload-Id>', function(err, info){
    	//Print uploaded parts
    	for(var p in info.parts) {
    		console.log('Part #' + info.parts[p].partNumber);
    		console.log('ETag: ' + info.parts[p].etag);
    		console.log('Size, in bytes: ' + info.parts[p].size);
    	}
    });

The second parameter of the `getParts` function can accept object with the following predefined named values:

* `uploadId` - upload ID;
* `max-parts` - the maximum number of parts to return in the response body;
* `part-number-marker` - the part number after which listing should begin.

For example:

    client.getParts('/test/blob.bin', {'uploadId': '<Upload-Id>', 'max-parts': 3}, function(err, info) { });
    
These paramaters are described [here](http://docs.amazonwebservices.com/AmazonS3/latest/API/index.html?mpUploadInitiate.html).

### How to resume the multipart upload

If you have partially uploaded file then it is not good solution to use `getParts` function to calculate remainded size and
resume uploading. Use `getUploadInfo` function for this purpose:

    client.getUploadInfo('/test/blob.bin', '<Upload-id>', function(err, summary){
    	console.log(summary.totalSize);	//total number of already uploaded bytes, this field can be used to compute offset in the blob
    	console.log(summary.count);		//count of already uploaded parts
    	console.log(summary.lastPart);	//the number of the last uploaded part.
    });

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
