
/*!
 * knox
 * Copyright(c) 2010 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Client is the main export.
 */

exports = module.exports = require('./client');

/**
 * Library version.
 * 
 * @type String
 */

exports.version = '0.0.8';

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