
/*!
 * ns3 - Client
 * Copyright(c) 2010 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var utils = require('./utils');

var Client = module.exports = exports = function Client(options) {
  this.host = 's3.amazonaws.com';
  utils.merge(this, options);
};

exports.createClient = function(options){
  return new Client(options);
};