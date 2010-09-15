
/*!
 * ns3 - utils
 * Copyright(c) 2010 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var crypto = require('crypto');

exports.base64 = {
  encode: function(str){
    return new Buffer(str).toString('base64');
  },
  
  decode: function(str){
    return new Buffer(str, 'base64').toString();
  }
};