
/*!
 * knox
 * Copyright(c) 2010 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

var utils = require('./utils');

/**
 * Client and MultiPartClient are the main exports.
 */

client = require('./client');
multipartClient = require('./multi_part_client');
exports = module.exports = utils.merge(client, multipartClient);

console.log(client);
console.log(multipartClient);
console.log(exports);
/**
 * Library version.
 * 
 * @type String
 */

exports.version = '0.0.2';

/**
 * Expose utilities.
 * 
 * @type Object
 */

exports.utils = require('./utils');

/**
 * Expose auth utils.
 *
 * @type Object
 */

exports.auth = require('./auth');