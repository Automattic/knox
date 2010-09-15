
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
    , Authorization: auth.authorization({
        key: this.key
      , secret: this.secret
      , verb: method
      , date: date
      , resource: path
    })
  });

  return client.request(method, path, headers);
};

Client.prototype.get = function(filename, fn){
  this
    .request('GET', filename)
    .on('response', fn)
    .end();
};

exports.createClient = function(options){
  return new Client(options);
};