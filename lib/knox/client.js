
/*!
 * knox - Client
 * Copyright(c) 2010 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var utils = require('./utils')
  , auth = require('./auth')
  , http = require('http')
  , url = require('url')
  , join = require('path').join
  , mime = require('./mime')
  , fs = require('fs')
  , crypto = require('crypto');

/**
 * Initialize a `Client` with the given `options`.
 *
 * Required:
 *
 *  - `key`     amazon api key
 *  - `secret`  amazon secret
 *  - `bucket`  bucket name string, ex: "learnboost"
 *
 * @param {Object} options
 * @api public
 */

var Client = module.exports = exports = function Client(options) {
  this.endpoint = 's3.amazonaws.com';
  this.port = 80;
  if (!options.key) throw new Error('aws "key" required');
  if (!options.secret) throw new Error('aws "secret" required');
  if (!options.bucket) throw new Error('aws "bucket" required');
  utils.merge(this, options);
};

/**
 * Request with `filename` the given `method`, and optional `headers`.
 *
 * @param {String} method
 * @param {String} filename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api private
 */

Client.prototype.request = function(method, filename, headers){
  var options = { host: this.endpoint, port: this.port }
    , date = new Date
    , headers = headers || {};

  // Default headers
  utils.merge(headers, {
      Date: date.toUTCString()
    , Host: this.endpoint
  });

  // Authorization header
  headers.Authorization = auth.authorization({
      key: this.key
    , secret: this.secret
    , verb: method
    , date: date
    , resource: auth.canonicalizeResource(join('/', this.bucket, filename))
    , contentType: headers['Content-Type']
    , md5: headers['Content-MD5'] || ''
    , amazonHeaders: auth.canonicalizeHeaders(headers)
  });

  // Issue request
  options.method = method;
  options.path = join('/', this.bucket, filename);
  options.headers = headers;
  var req = http.request(options);
  req.url = this.url(filename);

  return req;
};

/**
 * PUT data to `filename` with optional `headers`.
 *
 * Example:
 *
 *     // Fetch the size
 *     fs.stat('Readme.md', function(err, stat){
 *      // Create our request
 *      var req = client.put('/test/Readme.md', {
 *          'Content-Length': stat.size
 *        , 'Content-Type': 'text/plain'
 *      });
 *      fs.readFile('Readme.md', function(err, buf){
 *        // Output response
 *        req.on('response', function(res){
 *          console.log(res.statusCode);
 *          console.log(res.headers);
 *          res.on('data', function(chunk){
 *            console.log(chunk.toString());
 *          });
 *        });
 *        // Send the request with the file's Buffer obj
 *        req.end(buf);
 *      });
 *     });
 *
 * @param {String} filename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.put = function(filename, headers){
  headers = utils.merge({
      Expect: '100-continue'
    , 'x-amz-acl': 'public-read'
  }, headers || {});
  return this.request('PUT', filename, headers);
};

/**
 * Represens chunk builder that concatenates string chunks in the readable stream.
 * @constructor
 */
function ChunkBuilder(){
	this.data = '';
	this.completed = false;
	this.error = null;
}

/**
 * Creates a new chunk builder for the Readable stream.
 * @param {Object} stream Readable stream.
 * @param {Function} callback A callback function used to receive concatenated data.
 * @returns {Object} An instance of the chunk builder.
 * @function
 */
ChunkBuilder.from_stream = function(stream, callback){
	var obj = new this();
	stream.on('data', function(chunk) { this.data += chunk }.bind(obj));
	stream.on('error', function(e) { this.error = e; this.completed = true }.bind(obj));
	stream.on('end', function() { 
		this.completed = true; 
		callback(this.error, this.data);
	}.bind(obj));
	return obj;
};

/**
 * Returns value of the XML element.
 * @param {String} content XML document.
 * @param {String} elementName The name of the XML element.
 * @returns {String} Value of the specified XML element.
*/
function get_element_content(content, elementName, multiple){
	var result = [];
	do{
		var xmltag = '<' + elementName + '>';
		var startpos = content.indexOf(xmltag);
		if(startpos < 0) break; else  startpos += xmltag.length;
		xmltag = '</' + elementName + '>';
		var endpos = content.indexOf(xmltag);
		if(endpos < 0) break;
		var value = content.substring(startpos, endpos);
		if(value == '' || value === null) break;
		result.push(value);
		endpos += xmltag.length;
		content = content.substring(endpos, content.length);
	}while(multiple && content != '' && content !== null);
	return multiple ? result : result[0];
}

/**
 * Represents uploading initialization data.
 * @param {String} rawxml XML markup accepted from Amazon S3 service. See http://docs.amazonwebservices.com/AmazonS3/latest/API/index.html?mpUploadInitiate.html
 * @constructor
 */
function UploadInitResult(rawxml){
	this.bucket = null;
	this.key = null;
	this.uploadId = null;
	if(typeof rawxml == 'string'){
		//The first, let's find Bucket name in the entire XML
		this.bucket = get_element_content(rawxml, 'Bucket');
		this.key = get_element_content(rawxml, 'Key');
		this.uploadId = get_element_content(rawxml, 'UploadId');
	}
}

/**
 * Represents information about multipart upload.
 * @param {String} rawxml XML markup accepted from Amazon S3 service. See http://docs.amazonwebservices.com/AmazonS3/latest/API/index.html?mpUploadInitiate.html
 * @constructor
 */
function ListPartsResult(rawxml){
	function PartInfo(rawxml){
		this.partNumber = null;
		this.lastModified = null;
		this.etag = null;
		this.size = null;
		if(typeof rawxml == 'string'){
			this.partNumber = get_element_content(rawxml, 'PartNumber');
			this.lastModified = get_element_content(rawxml, 'LastModified');
			this.etag = get_element_content(rawxml, 'ETag');
			this.size = parseInt(get_element_content(rawxml, 'Size'), 10);
		}
	}
	this.storageClass = null;
	this.partNumber = null;
	this.nextPartNumber = null;
	this.maxParts = null;
	this.truncated = null;
	this.parts = [];
	if(typeof rawxml == 'string'){
		this.storageClass = get_element_content(rawxml, 'StorageClass');
		this.partNumber = get_element_content(rawxml, 'PartNumberMarker');
		this.nextPartNumber = get_element_content(rawxml, 'NextPartNumberMarker');
		this.maxParts = get_element_content(rawxml, 'MaxParts');
		this.truncated = get_element_content(rawxml, 'IsTruncated');
		var rawParts = get_element_content(rawxml, 'Part', true);
		for(var i in rawParts)
			this.parts.push(new PartInfo(rawParts[i]));
	}
}

/**
 * Initiates multipart upload.
 * @param {String} filename The name of the object on Amazon S3 service.
 * @param {Object} headers Additional headers used in HTTP request to S3 service.
 * @param {Function} fn A callback that accepts two parameters: err that holds exception info, and ir - multipart upload initiation result.
 * @api public
 */
Client.prototype.beginUpload = function(filename, headers, fn){
	if(typeof headers == 'function') { fn = headers; headers = {}; }
	filename += '?uploads';	//initiate uploading transaction, see http://docs.amazonwebservices.com/AmazonS3/latest/API/mpUploadInitiate.html
	var req = this.request('POST', filename, headers);
	//Upload initiating returns XML document in UTF-8 encoding that contains uploading ID.
	req.on('response', function(response){
		response.setEncoding('utf8');	//TODO: Encoding may be detected in more flexible way (or detected automatically).
		if(response.statusCode != 200) fn({'statusCode': response.statusCode}, null);
		else ChunkBuilder.from_stream(response, function(err, data) { fn(err, new UploadInitResult(data)) });
	});
	req.end();
};

/**
 * Lists the parts that have been uploaded for a specific multipart upload. 
 * @param {String} filename Name of the remote object.
 * @param parameters May be {String} or {Object}. Specifies Upload ID returned by begin_upload function; or set
 * 					additional query parameters.
 * @param {Object} headers Additional request headers.
 * @param {Function} fn Callback function that accepts two parameters: err - information about error in request/response; linfo - upload status.
 * @api public
 */
Client.prototype.getParts = function(filename, parameters, headers, fn){
	//Validate function arguments
	if(typeof headers == 'function') { fn = headers; headers = {}; }
	if(typeof parameters == 'string') parameters = {'uploadId': parameters};
	filename += '?uploadId=' + parameters['uploadId'];
	if(parameters['max-parts']) filename += '&max-parts=' + parameters['max-parts'];
	if(parameters['part-number-marker']) filename += '&part-number-marker=' + parameters['part-number-marker'];
	//Obtains information about multipart upload
	var req = this.request('GET', filename, headers);
	req.on('response', function(response){
		response.setEncoding('utf8');	//TODO: Encoding may be detected in more flexible way (or detected automatically).
		if(response.statusCode != 200) fn({'statusCode': response.statusCode}, null);
		else ChunkBuilder.from_stream(response, function(err, data) { fn(err, new ListPartsResult(data)) });
	});
	req.end();
};

/**
 * Obtains an array of all uploaded parts.
 * @param {String} filename Object name.
 * @param {String} uploadInfo Identifier of the multipart uploading session.
 * @param {Object} headers Set of advanced headers. 
 * @param {Function} fn A callback function that 
 */
Client.prototype.getAllParts = function(filename, uploadInfo, headers, fn){
	if(typeof headers == 'function') {fn = headers; headers = {}; }
	this.getParts(filename, uploadInfo, headers, function(err, pinfo){
		this.parts = this.parts.concat(pinfo ? pinfo.parts: null);
		if(err) fn(err, null);	//if error then returns immediately
		else if(pinfo.truncated) fn(null, this.parts);	//the last list of parts is obtained
		else this.client.getParts(filename, uploadId, headers, arguments.callee);
	}.bind({'parts': [], 'client': this}));
};

/**
 * Obtains summary informatiob about multipart upload.
 * @param {String} filename Object name.
 * @param {String} uploadId Identifier of the multipart upload.
 * @param {Object} headers Additional request headers.
 * @param {Function} fn A callback function that accepts two parameters: err - exception info, summary - an object with the
 * 					following structure: totalSize - size of the all uploaded parts (in bytes), count - count of uploaded parts, lastPart - the number of the last uploaded part.
 */
Client.prototype.getUploadInfo = function(filename, uploadId, headers, fn){
	getAllParts(filename, uploadId, headers, function(err, parts){
		if(err) fn(err, null);
		else{
			var totalSize = 0;
			for(var i in parts) totalSize += parts[i];
			fn(null, {'totalSize': totalSize, 'count': parts.length, 'lastPart': parts.length > 0 ? parts[parts.length - 1].partNumber : null});
		}
	});
};

/**
 * Aborts a multipart upload.
 * @param {String} filename Name of the remote object.
 * @param {String} uploadId Multipart upload identifier.
 * @param {Object} headers Additional request headers.
 * @param {Function} fn Callback function that accepts true, if upload is aborted successfully; otherwise, false.
 * @api public
 */
Client.prototype.abortUpload = function(filename, uploadId, headers, fn){
	//Validate function arguments
	if(typeof headers == 'function') { fn = headers; headers = {}; }
	filename += '&uploadId=' + uploadId;
	//Send multipart upload abortion.
	var req = this.request('DELETE', filename, headers);
	req.on('response', function(response){ fn(response.statusCode == 200 || response.statusCode == 204) });
	req.end();
};

/**
 * Completes a multipart upload by assembling previously uploaded parts. 
 * @param {String} filename Name of the remote object.
 * @param {String} uploadId Multipart upload identifier.
 * @param {Array} parts An array of parts to complete. Each element in the array has the following structure:
 * 					partNumber - an integer that identifier number of the file part, etag - entity tag that identifies the object's data.
 * @param {Object} headers Additional request headers.
 * @param {Function} fn Callback function that accepts two parameters: err - exception information, rinfo - response data.
 * @api public
 */
Client.prototype.completeUpload = function(filename, uploadId, parts, headers, fn){
	//Validate function arguments
	if(typeof headers == 'function') { fn = headers; headers = {}; }
	filename += '?uploadId=' + uploadId;
	//Create XML document that describes all uploaded parts.
	var doc = '<CompleteMultipartUpload>'
	for(var i in parts){
		doc += '<Part>';
		doc += '<PartNumber>' + parts[i].partNumber + '</PartNumber>';
		doc += '<ETag>"' + parts[i].etag + '"</ETag>';
		doc += '</Part>\n\r';
	}
	doc += '</CompleteMultipartUpload>';
	//Send multipart upload glue.
	doc = new Buffer(doc, 'utf8');
	headers['Content-Length'] = doc.length;
	headers['Content-Type'] = 'text/xml';
	var req = this.request('POST', filename, headers);
	req.on('response', function(response){
		response.setEncoding('utf8');
		ChunkBuilder.from_stream(response, function(err, data){
			if(err) fn(err, null);
			else if(response.statusCode == 200) fn(null, data);
			else fn({'status': response.statusCode}, data);
		});
	});
	req.end(doc);
};


/**
 * Uploads part of the file to the Amazon S3 service.
 * @param {String} filename Name of the remote object.
 * @param {Integer} partNumber The number of the part to upload.
 * @param {String} uploadId Upload identifier.
 * @param {Object} buf A block of the data to send.
 * @param {Function} A callback that receives two parameters: err - exception information, pinfo - information about uploaded part.
 * @api public
 */
Client.prototype.putPart = function(filename, partNumber, uploadId, buf, fn){
	filename += '?partNumber=' + partNumber;
	filename += '&uploadId=' + uploadId;
	if(fn){
		var req = this.request('PUT', filename, {'Content-Length': buf.length, 
		'Content-MD5': crypto.createHash('md5').update(buf).digest('base64'),
		'Expect': '100-continue'});
		req.on('response', function(response){
			if(response.statusCode == 200) fn(null, {'etag': JSON.parse(response.headers['etag']), 'partNumber': partNumber});
			else fn({'status': response.statusCode}, null);
		});
		req.end(buf);
	}
	else return this.request('PUT', filename, buf);	//buffer can be used instead of headers only if fn === null or undefined
};

/**
 * PUT the file at `src` to `filename`, with callback `fn`
 * receiving a possible exception, and the response object.
 *
 * NOTE: this method reads the _entire_ file into memory using
 * fs.readFile(), and is not recommended or large files.
 *
 * Example:
 *
 *    client
 *     .putFile('package.json', '/test/package.json', function(err, res){
 *       if (err) throw err;
 *       console.log(res.statusCode);
 *       console.log(res.headers);
 *     });
 *
 * @param {String} src
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.putFile = function(src, filename, headers, fn){
  var self = this;
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  };
  fs.readFile(src, function(err, buf){
    if (err) return fn(err);
    headers = utils.merge({
        'Content-Length': buf.length
      , 'Content-Type': mime.lookup(src)
      , 'Content-MD5': crypto.createHash('md5').update(buf).digest('base64')
    }, headers);
    self.put(filename, headers).on('response', function(res){
      fn(null, res);
    }).end(buf);
  });
};

/**
 * PUT the given `stream` as `filename` with optional `headers`.
 *
 * @param {Stream} stream
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.putStream = function(stream, filename, headers, fn){
  var self = this;
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  };
  fs.stat(stream.path, function(err, stat){
    if (err) return fn(err);
    // TODO: sys.pump() wtf?
    var req = self.put(filename, utils.merge({
        'Content-Length': stat.size
      , 'Content-Type': mime.lookup(stream.path)
    }, headers));
    req.on('response', function(res){
      fn(null, res);
    });
    stream
      .on('error', function(err){fn(err); })
      .on('data', function(chunk){ req.write(chunk); })
      .on('end', function(){ req.end(); });
  });
};

/**
 * GET `filename` with optional `headers`.
 *
 * @param {String} filename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.get = function(filename, headers){
  return this.request('GET', filename, headers);
};

/**
 * GET `filename` with optional `headers` and callback `fn`
 * with a possible exception and the response.
 *
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.getFile = function(filename, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  return this.get(filename, headers).on('response', function(res){
    fn(null, res);
  }).end();
};

/**
 * Issue a HEAD request on `filename` with optional `headers.
 *
 * @param {String} filename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.head = function(filename, headers){
  return this.request('HEAD', filename, headers);
};

/**
 * Issue a HEAD request on `filename` with optional `headers`
 * and callback `fn` with a possible exception and the response.
 *
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.headFile = function(filename, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  return this.head(filename, headers).on('response', function(res){
    fn(null, res);
  }).end();
};

/**
 * Obtains information about uploaded object.
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 */
Client.prototype.fileInfo = function(filename, headers, fn){
	this.headFile(filename, headers, function(res){
		if(res.statusCode == 200) fn({'etag': JSON.parse(res.headers['etag']), 'size': JSON.parse(res.headers['content-length']), 'modified': res.headers['last-modified']});
		else fn(null);
	});
};

/**
 * DELETE `filename` with optional `headers.
 *
 * @param {String} filename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.del = function(filename, headers){
  return this.request('DELETE', filename, headers);
};

/**
 * DELETE `filename` with optional `headers`
 * and callback `fn` with a possible exception and the response.
 *
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.deleteFile = function(filename, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  return this.del(filename, headers).on('response', function(res){
    fn(null, res);
  }).end();
};

/**
 * Return a url to the given `filename`.
 *
 * @param {String} filename
 * @return {String}
 * @api public
 */

Client.prototype.url =
Client.prototype.http = function(filename){
  return 'http://' + join(this.endpoint, this.bucket, filename);
};

/**
 * Return an HTTPS url to the given `filename`.
 *
 * @param {String} filename
 * @return {String}
 * @api public
 */

Client.prototype.https = function(filename){
  return 'https://' + join(this.endpoint, filename);
};

/**
 * Return an S3 presigned url to the given `filename`.
 *
 * @param {String} filename
 * @param {Date} expiration
 * @return {String}
 * @api public
 */

Client.prototype.signedUrl = function(filename, expiration){
  var epoch = Math.floor(expiration.getTime()/1000);
  var signature = auth.signQuery({
    secret: this.secret,
    date: epoch,
    resource: '/' + this.bucket + url.parse(filename).pathname
  });

  return this.url(filename) +
    '?Expires=' + epoch +
    '&AWSAccessKeyId=' + this.key +
    '&Signature=' + encodeURIComponent(signature);
};

/**
 * Shortcut for `new Client()`.
 *
 * @param {Object} options
 * @see Client()
 * @api public
 */

exports.createClient = function(options){
  return new Client(options);
};
