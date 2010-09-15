
/*!
 * ns3 - utils
 * Copyright(c) 2010 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Base64.
 */

exports.base64 = {
  
  /**
   * Base64 encode the given `str`.
   *
   * @param {String} str
   * @return {String}
   * @api public
   */
  
  encode: function(str){
    return new Buffer(str).toString('base64');
  },
  
  /**
   * Base64 decode the given `str`.
   *
   * @param {String} str
   * @return {String}
   * @api public
   */
  
  decode: function(str){
    return new Buffer(str, 'base64').toString();
  }
};