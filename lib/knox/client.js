
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
  , join = require('path').join
  , mime = require('mime')
  , fs = require('fs');

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
  this.host = 's3.amazonaws.com';
  utils.merge(this, options);
  if (!this.key) throw new Error('aws "key" required');
  if (!this.secret) throw new Error('aws "secret" required');
  if (!this.bucket) throw new Error('aws "bucket" required');
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
  var client = http.createClient(80, this.host)
    , path = join('/', this.bucket, filename)
    , date = new Date
    , headers = headers || {};

  // Default headers
  utils.merge(headers, {
      Date: date.toUTCString()
    , Host: this.host
  });

  // Authorization header
  headers.Authorization = auth.authorization({
      key: this.key
    , secret: this.secret
    , verb: method
    , date: date
    , resource: path
    , contentType: headers['Content-Type']
    , amazonHeaders: auth.canonicalizeHeaders(headers)
  });

  var req = client.request(method, path, headers);
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
 * @param {Function} fn
 * @api public
 */

Client.prototype.putFile = function(src, filename, fn){
  var self = this;
  fs.readFile(src, function(err, buf){
    if (err) return fn(err);
    self.put(filename, {
        'Content-Length': buf.length
      , 'Content-Type': mime.lookup(src)
    }).on('response', function(res){
      fn(null, res);
    }).end(buf);
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

Client.prototype.getFile = function(filename, fn){
  return this.get(filename).on('response', function(res){
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
 * Return a url to the given `filename`.
 *
 * @param {String} filename
 * @return {String}
 * @api public
 */

Client.prototype.url = function(filename){
  return 'http://' + this.bucket + '.' + this.host + join('/', filename);
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