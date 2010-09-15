
/**
 * Module dependencies.
 */

var ns3 = require('ns3');

module.exports = {
  'test .version': function(assert){
    assert.match(ns3.version, /^\d+\.\d+\.\d+$/);
  },
  
  'test .createClient() invalid': function(assert){
    var err;
    try {
      ns3.createClient({});
    } catch (e) {
      err = e;
    }
    assert.equal('aws "key" required', err.message);
    
    var err;
    try {
      ns3.createClient({ key: 'foo' });
    } catch (e) {
      err = e;
    }
    assert.equal('aws "secret" required', err.message);
    
    var err;
    try {
      ns3.createClient({ key: 'foo', secret: 'bar' });
    } catch (e) {
      err = e;
    }
    assert.equal('aws "bucket" required', err.message);
  },
  
  'test .createClient() valid': function(assert){
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