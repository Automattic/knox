
/**
 * Module dependencies.
 */

var ns3 = require('ns3');

module.exports = {
  'test .version': function(assert){
    assert.match(ns3.version, /^\d+\.\d+\.\d+$/);
  },
  
  'test .createClient()': function(assert){
    var client = ns3.createClient({
        key: 'foobar'
      , secret: 'baz'
      , bucket: 'misc'
    });
    
    assert.equal('foobar', client.key);
    assert.equal('baz', client.secret);
    assert.equal('misc', client.bucket);
    assert.equal('s3.amazonaws.com', client.host);
  }
};