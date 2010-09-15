
/*!
 * ns3 - auth
 * Copyright(c) 2010 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var crypto = require('crypto');

exports.authorization = function(options){
  return 'AWS ' + options.key + ':' + exports.sign(options);
};

exports.sign = function(options){
  var str = exports.stringToSign(options);
  return crypto.createHmac('sha1').update(str).digest('base64');
};

exports.stringToSign = function(options){
  var headers = options.amazonHeaders || '';
  if (headers) headers += '\n';
  return [
      options.verb
    , options.md5
    , options.contentType
    , options.date.toUTCString()
    , headers + options.resource
  ].join('\n');
};