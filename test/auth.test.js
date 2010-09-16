
/**
 * Module dependencies.
 */

var knox = require('knox')
  , auth = knox.auth;

module.exports = {
  'test .stringToSign()': function(assert){
    var str = auth.stringToSign({
        verb: 'PUT'
      , md5: '09c68b914d66457508f6ad727d860d5b'
      , contentType: 'text/plain'
      , resource: '/learnboost'
      , date: new Date('may 25 1987')
    });
    
    var expected = [
        'PUT'
      , '09c68b914d66457508f6ad727d860d5b'
      , 'text/plain'
      , new Date('may 25 1987').toUTCString()
      , '/learnboost'
    ].join('\n');
    
    assert.equal(expected, str);
  },
  
  'test .sign()': function(assert){
    var str = auth.sign({
        verb: 'PUT'
      , secret: 'test'
      , md5: '09c68b914d66457508f6ad727d860d5b'
      , contentType: 'text/plain'
      , resource: '/learnboost'
      , date: new Date('may 25 1987')
    });

    assert.equal('bTT7MI/iAdtBc6qhB+39DogbGII=', str);
  },
  
  'test .canonicalizeHeaders()': function(assert){
    var str = auth.canonicalizeHeaders({
        'X-Amz-Date': 'some date'
      , 'X-Amz-Acl': 'private'
      , 'X-Foo': 'bar'
    });
    
    var expected = [
        'x-amz-acl:private'
      , 'x-amz-date:some date'
    ].join('\n');

    assert.equal(expected, str);
    
    assert.equal('', auth.canonicalizeHeaders({}));
  }
};
