/*!
 * knox - Client
 * Copyright(c) 2010 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Emitter = require('events').EventEmitter
  , debug = require('debug')('knox')
  , utils = require('./utils')
  , auth = require('./auth')
  , http = require('http')
  , https = require('https')
  , url = require('url')
  , mime = require('mime')
  , fs = require('fs')
  , crypto = require('crypto')
  , xml2js = require('xml2js')
  , qs = require('querystring');

// The max for multi-object delete, bucket listings, etc.
var BUCKET_OPS_MAX = 1000;

/**
 * Register event listeners on a request object to convert standard http
 * request events into appropriate call backs.
 * @param {Request} req The http request
 * @param {Function} fn(err, res) The callback function.
 * err - The exception if an exception occurred while sending the http
 * request (for example if internet connection was lost).
 * res - The http response if no exception occurred.
 * @api private
 */
function registerReqListeners(req, fn){
  req.on('response', function(res){ fn(null, res); });
  req.on('error', fn);
}

function ensureLeadingSlash(filename) {
  return filename[0] !== '/' ? '/' + filename : filename;
}

function removeLeadingSlash(filename) {
  return filename[0] === '/' ? filename.substring(1) : filename;
}

function encodeSpecialCharacters(filename) {
  // Note: these characters are valid in URIs, but S3 does not like them for
  // some reason.
  return filename.replace(/[!'()*]/g, function (char) {
    return '%' + char.charCodeAt(0).toString(16);
  });
}

function getHeader(headers, headerNameLowerCase) {
  for (var header in headers) {
    if (header.toLowerCase() === headerNameLowerCase) {
      return headers[header];
    }
  }
  return null;
}

/**
 * Get headers needed for Client#copy and Client#copyTo.
 *
 * @param {String} sourceFilename
 * @param {Object} headers
 * @api private
 */

function getCopyHeaders(sourceBucket, sourceFilename, headers) {
  sourceFilename = ensureLeadingSlash(sourceFilename);
  headers = utils.merge({
    Expect: '100-continue'
  }, headers || {});
  headers['x-amz-copy-source'] = '/' + sourceBucket + sourceFilename;
  headers['Content-Length'] = 0; // to avoid Node's automatic chunking if omitted
  return headers;
}


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
  if (!options.key) throw new Error('aws "key" required');
  if (!options.secret) throw new Error('aws "secret" required');
  if (!options.bucket) throw new Error('aws "bucket" required');

  if (options.bucket !== options.bucket.toLowerCase()) {
    throw new Error('AWS bucket names must be all lower case. ' +
      'See https://github.com/LearnBoost/knox/issues/44#issuecomment-7074177 ' +
      'for details.');
  }
  // Save original options, we will need them for Client#copyTo
  this.options = utils.merge({}, options);

  var domain = 's3.amazonaws.com';
  if (options.region) {
    if (options.region === 'us-standard') {
      // Pesky inconsistency
      domain = 's3.amazonaws.com';
    } else {
      domain = 's3-' + options.region + '.amazonaws.com';
    }
  }
  this.endpoint = options.bucket + '.' + domain;
  this.secure = 'undefined' == typeof options.port;
  utils.merge(this, options);

  this.url = this.secure ? this.https : this.http;
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
  var options = { host: this.endpoint, agent: this.agent }
    , date = new Date
    , headers = headers || {};

  if ('undefined' != typeof this.port) {
    options.port = this.port;
  }

  filename = encodeSpecialCharacters(ensureLeadingSlash(filename));

  // Default headers
  utils.merge(headers, {
      Date: date.toUTCString()
    , Host: this.endpoint
  });

  if ('undefined' != typeof this.token)
    headers['x-amz-security-token'] = this.token;

  // Authorization header
  headers.Authorization = auth.authorization({
      key: this.key
    , secret: this.secret
    , verb: method
    , date: date
    , resource: auth.canonicalizeResource('/' + this.bucket + filename)
    , contentType: getHeader(headers, 'content-type')
    , md5: getHeader(headers, 'content-md5') || ''
    , amazonHeaders: auth.canonicalizeHeaders(headers)
  });

  // Issue request
  options.method = method;
  options.path = filename;
  options.headers = headers;
  var req = (this.secure ? https : http).request(options);
  req.url = this.url(filename);
  debug('%s %s', method, req.url);

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
  }, headers || {});
  return this.request('PUT', filename, headers);
};

/**
 * PUT the file at `src` to `filename`, with callback `fn`
 * receiving a possible exception, and the response object.
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
 * @return {EventEmitter}
 * @api public
 */

Client.prototype.putFile = function(src, filename, headers, fn){
  var self = this;
  var emitter = new Emitter;

  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }

  debug('put %s', src);
  fs.stat(src, function (err, stat) {
    if (err) return fn(err);

    var contentType = mime.lookup(src);

    // Add charset if it's known.
    var charset = mime.charsets.lookup(contentType);
    if (charset) {
      contentType += '; charset=' + charset;
    }

    headers = utils.merge({
        'Content-Length': stat.size
      , 'Content-Type': contentType
    }, headers);

    var stream = fs.createReadStream(src);
    var req = self.putStream(stream, filename, headers, fn);

    req.on('progress', emitter.emit.bind(emitter, 'progress'));
  });

  return emitter;
};

/**
 * PUT the given `stream` as `filename` with `headers`.
 * `headers` must contain `'Content-Length'` at least.
 *
 * @param {Stream} stream
 * @param {String} filename
 * @param {Object} headers
 * @param {Function} fn
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.putStream = function(stream, filename, headers, fn){
  var contentLength = getHeader(headers, 'content-length');
  if (contentLength === null) {
    process.nextTick(function () {
      fn(new Error('You must specify a Content-Length header.'));
    });
    return;
  }

  var self = this;
  var req = self.put(filename, headers);

  registerReqListeners(req, fn);
  stream.on('error', fn);

  var written = 0;
  stream.on('data', function(chunk){
    written += chunk.length;
    req.emit('progress', {
        percent: written / contentLength * 100 | 0
      , written: written
      , total: contentLength
    });
  });

  stream.pipe(req);
  return req;
};

/**
 * PUT the given `buffer` as `filename` with optional `headers`.
 * Callback `fn` receives a possible exception and the response object.
 *
 * @param {Buffer} buffer
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.putBuffer = function(buffer, filename, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }

  headers['Content-Length'] = buffer.length;

  var req = this.put(filename, headers);
  registerReqListeners(req, fn);
  req.end(buffer);
  return req;
};

/**
 * Copy files from `sourceFilename` to `destFilename` with optional `headers`.
 *
 * @param {String} sourceFilename
 * @param {String} destFilename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.copy = function(sourceFilename, destFilename, headers){
  return this.put(destFilename, getCopyHeaders(this.bucket, sourceFilename, headers));
};

/**
 * Copy files from `sourceFilename` to `destFilename` with optional `headers`
 * and callback `fn` with a possible exception and the response.
 *
 * @param {String} sourceFilename
 * @param {String} destFilename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.copyFile = function(sourceFilename, destFilename, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }

  var req = this.copy(sourceFilename, destFilename, headers);
  registerReqListeners(req, fn);
  req.end();
  return req;
};

/**
 * Copy files from `sourceFilename` to `destFilename` of the bucket `destBucket`
 * with optional `headers`.
 *
 * @param {String} sourceFilename
 * @param {String} destFilename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.copyTo = function(sourceFilename, destBucket, destFilename, headers){
  var options = utils.merge({}, this.options);
  options.bucket = destBucket;
  var client = exports.createClient(options);
  return client.put(destFilename, getCopyHeaders(this.bucket, sourceFilename, headers));
};

/**
 * Copy file from `sourceFilename` to `destFilename` of the bucket `destBucket
 * with optional `headers` and callback `fn` with a possible exception and the response.
 *
 * @param {String} sourceFilename
 * @param {String} destBucket
 * @param {String} destFilename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.copyFileTo = function(sourceFilename, destBucket, destFilename, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }

  var req = this.copyTo(sourceFilename, destBucket, destFilename, headers);
  registerReqListeners(req, fn);
  req.end();
  return req;
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

  var req = this.get(filename, headers);
  registerReqListeners(req, fn);
  req.end();
  return req;
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
  var req = this.head(filename, headers);
  registerReqListeners(req, fn);
  req.end();
  return req;
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
  var req = this.del(filename, headers);
  registerReqListeners(req, fn);
  req.end();
};

function xmlEscape(string) {
  return string
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function makeDeleteXmlString(keys) {
    var tags = keys.map(function(key){
      return '<Object><Key>' +
        xmlEscape(removeLeadingSlash(key)) +
        '</Key></Object>';
    });
    return '<Delete>' + tags.join('') + '</Delete>';
}

/**
 * Delete up to 1000 files at a time, with optional `headers`
 * and callback `fn` with a possible exception and the response.
 *
 * @param {Array[String]} filenames
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.deleteMultiple = function(filenames, headers, fn){
  if (filenames.length > BUCKET_OPS_MAX) {
    throw new Error('Can only delete up to ' + BUCKET_OPS_MAX + ' files ' +
      'at a time. You\'ll need to batch them.');
  }

  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }

  var xml = makeDeleteXmlString(filenames);

  headers['Content-Length'] = xml.length;
  headers['Content-MD5'] = crypto.createHash('md5').update(xml).digest('base64');

  return this.request('POST', '/?delete', headers)
    .on('response', function(res){
      fn(null, res);
    })
    .on('error', function(err){
      fn(err);
    })
    .end(xml);
};

/**
 * Possible params for Client#list.
 *
 * @type {Object}
 */

var LIST_PARAMS = {
    delimiter: true
  , marker: true
  ,'max-keys': true
  , prefix: true
};

/**
 * Normalization map for Client#list.
 *
 * @type {Object}
 */

var RESPONSE_NORMALIZATION = {
    MaxKeys: Number,
    IsTruncated: Boolean,
    LastModified: Date,
    Size: Number,
    Contents: Array
};

/**
 * Convert data we get from S3 xml in Client#list, since every primitive
 * value there is a string.
 *
 * @type {Object}
 */

function normalizeResponse(data) {
  for (var key in data) {
    var Constr = RESPONSE_NORMALIZATION[key];

    if (Constr) {
      if (Constr === Date) {
        data[key] = new Date(data[key]);
      } else if (Constr === Array) {
        // If there's only one element in the array xml2js doesn't know that
        // it should be an array; array-ify it.
        if (!Array.isArray(data[key])) {
          data[key] = [data[key]];
        }
      } else if (Constr === Boolean) {
        data[key] = data[key] === 'true';
      } else {
        data[key] = Constr(data[key]);
      }
    }

    if (Array.isArray(data[key])) {
      data[key].forEach(normalizeResponse);
    }
  }
}

/**
 * List up to 1000 objects at a time, with optional `headers`, `params`
 * and callback `fn` with a possible exception and the response.
 *
 * @param {Object|Function} params
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.list = function(params, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }

  if ('function' == typeof params) {
    fn = params;
    params = null;
  }

  if (params && !LIST_PARAMS[Object.keys(params)[0]]) {
    headers = params;
    params = null;
  }

  var url = params ? '?' + qs.stringify(params) : '';

  this.getFile(url, headers, function(err, res){
    if (err) return fn(err);

    var xmlStr = '';

    res.on('data', function(chunk){
      xmlStr += chunk;
    });

    res.on('end', function(){
      new xml2js.Parser({explicitArray: false, explicitRoot: false})
        .parseString(xmlStr, function(err, data){
          if (err) return fn(err);

          delete data.$;
          normalizeResponse(data);

          if (!('Contents' in data)) {
            data.Contents = [];
          }

          fn(null, data);
        });
    }).on('error', fn);
  });
};

/**
 * Return a url to the given `filename`.
 *
 * @param {String} filename
 * @return {String}
 * @api public
 */

Client.prototype.http = function(filename){
  return 'http://' + this.endpoint + filename;
};

/**
 * Return an HTTPS url to the given `filename`.
 *
 * @param {String} filename
 * @return {String}
 * @api public
 */

Client.prototype.https = function(filename){
  return 'https://' + this.endpoint + filename;
};

/**
 * Return an S3 presigned url to the given `filename`.
 *
 * @param {String} filename
 * @param {Date} expiration
 * @return {String}
 * @api public
 */

Client.prototype.signedUrl = function(filename, expiration, otherParams){
  var epoch = Math.floor(expiration.getTime()/1000)
    , pathname = url.parse(filename).pathname
    , resource = '/' + this.bucket + ensureLeadingSlash(pathname);

  if (otherParams) {
    resource += '?' + qs.stringify(otherParams);
  }

  var signature = auth.signQuery({
      secret: this.secret
    , date: epoch
    , resource: resource
  });

  var queryString = qs.stringify(utils.merge({
    Expires: epoch,
    AWSAccessKeyId: this.key,
    Signature: signature
  }, otherParams || {}));

  return this.url(ensureLeadingSlash(filename)) + '?' + queryString;
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
