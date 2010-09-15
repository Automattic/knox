
/**
 * Module dependencies.
 */

var ns3 = require('ns3')
  , auth = ns3.auth;

module.exports = {
  'test .stringToSign()': function(assert){
    var str = auth.stringToSign({
        verb: 'PUT'
      , md5: '09c68b914d66457508f6ad727d860d5b'
      , contentType: 'text/plain'
      , resource: '/learnboost'
    });
    
    var expected = [
        'PUT'
      , '09c68b914d66457508f6ad727d860d5b'
      , 'text/plain'
      , new Date().toUTCString()
      , '/learnboost'
    ].join('\n');
    
    assert.equal(expected, str);
  },
  
  'test .sign()': function(assert){
    var str = auth.sign({
        verb: 'PUT'
      , md5: '09c68b914d66457508f6ad727d860d5b'
      , contentType: 'text/plain'
      , resource: '/learnboost'
      , date: new Date('may 25 1987')
    });

    assert.equal('9huBjjAJN00uCvd14ofvHu6mhGE=', str);
  }
};
