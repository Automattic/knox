
/**
 * Module dependencies.
 */

var knox = require('..')
  , auth = knox.auth
  , assert = require('assert');

module.exports = {
  'test .stringToSign()': function(){
    var str = auth.stringToSign({
        verb: 'PUT'
      , md5: '09c68b914d66457508f6ad727d860d5b'
      , contentType: 'text/plain'
      , resource: '/learnboost'
      , date: new Date('Mon, May 25 1987 00:00:00 GMT')
    });

    var expected = [
        'PUT'
      , '09c68b914d66457508f6ad727d860d5b'
      , 'text/plain'
      , new Date('Mon, May 25 1987 00:00:00 GMT').toUTCString()
      , '/learnboost'
    ].join('\n');

    assert.equal(expected, str);
  },

  'test .sign()': function(){
    var str = auth.sign({
        verb: 'PUT'
      , secret: 'test'
      , md5: '09c68b914d66457508f6ad727d860d5b'
      , contentType: 'text/plain'
      , resource: '/learnboost'
      , date: new Date('Mon, May 25 1987 00:00:00 GMT')
    });

    assert.equal('7xIdjyy+W17/k0le5kwBnfrZTiM=', str);
  },

  'test .canonicalizeHeaders()': function(){
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
  },

  'test .queryStringToSign()': function() {
    var date = new Date().toUTCString()
      , resource = 'foo.jpg';

    var strHead = auth.queryStringToSign({
        verb: 'HEAD'
      , date: date
      , resource: resource
    });

    var expectedHead = [
        'HEAD'
      , ''
      , ''
      , date
      , resource
    ].join('\n');

    assert.equal(expectedHead, strHead);

    var strGet = auth.queryStringToSign({
        verb: 'GET'
      , date: date
      , resource: resource
    });

    var expectedGet = [
        'GET'
      , ''
      , ''
      , date
      , resource
    ].join('\n');
    assert.equal(expectedGet, strGet);
  },

  'test .canonicalizeResource()': function(){
    assert.equal(auth.canonicalizeResource('/bucket/'), '/bucket/');
    assert.equal(auth.canonicalizeResource('/bucket/test/user2.json'), '/bucket/test/user2.json');
    assert.equal(auth.canonicalizeResource('/bucket/?acl'), '/bucket/?acl');
    assert.equal(auth.canonicalizeResource('/bucket/?delete'), '/bucket/?delete');
    assert.equal(auth.canonicalizeResource('/bucket/?prefix=logs'), '/bucket/');
    assert.equal(auth.canonicalizeResource('/bucket/?prefix=logs/&delimiter=/'), '/bucket/');
    assert.equal(auth.canonicalizeResource('/bucket/?prefix=log%20files/&delimiter=/'), '/bucket/');
  }
};
