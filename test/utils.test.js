
/**
 * Module dependencies.
 */

var knox = require('knox')
  , utils = knox.utils;

module.exports = {
  'test .base64.encode()': function(assert){
    assert.equal('aGV5', utils.base64.encode('hey'));
  },
  
  'test .base64.decode()': function(assert){
    assert.equal('hey', utils.base64.decode('aGV5'));
  }
};
