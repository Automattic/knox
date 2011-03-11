
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
postClient = require('./post_client');
exports = module.exports = utils.merge(utils.merge(client, multipartClient), postClient);

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