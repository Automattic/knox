
/**
 * Module dependencies.
 */

var knox = require('..')
  , utils = knox.utils
  , assert = require('assert');

module.exports = {
  'test .base64.encode()': function(){
    assert.equal('aGV5', utils.base64.encode('hey'));
  },
  
  'test .base64.decode()': function(){
    assert.equal('hey', utils.base64.decode('aGV5'));
  }
};
