
/**
 * Module dependencies.
 */

var ns3 = require('ns3');

module.exports = {
  'test .version': function(assert){
    assert.match(ns3.version, /^\d+\.\d+\.\d+$/);
  }
};