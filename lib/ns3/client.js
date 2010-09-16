
/*!
 * ns3 - Client
 * Copyright(c) 2010 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var utils = require('./utils')
  , auth = require('./auth')
  , http = require('http')
  , join = require('path').join;

var Client = module.exports = exports = function Client(options) {
  this.host = 's3.amazonaws.com';
  utils.merge(this, options);
  if (!this.key) throw new Error('aws "key" required');
  if (!this.secret) throw new Error('aws "secret" required');
  if (!this.bucket) throw new Error('aws "bucket" required');
};

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

  return client.request(method, path, headers);
};

Client.prototype.put = function(filename, headers){
  headers = utils.merge({
      Expect: '100-continue'
    , 'x-amz-acl': 'public-read'
  }, headers || {});
  return this.request('PUT', filename, headers);
};

Client.prototype.get = function(filename, headers){
  return this.request('GET', filename, headers);
};

Client.prototype.head = function(filename, headers){
  return this.request('HEAD', filename, headers);
};

Client.prototype.del = function(filename, headers){
  return this.request('DELETE', filename, headers);
};

exports.createClient = function(options){
  return new Client(options);
};