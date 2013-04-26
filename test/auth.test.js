var knox = require('..')
  , auth = knox.auth
  , assert = require('assert');

describe('knox.auth', function () {
  describe('.stringToSign()', function () {
    specify('for a basic PUT', function () {
      var actual = auth.stringToSign({
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

      assert.equal(actual, expected);
    });
  });

  describe('.sign()', function () {
    specify('for a basic PUT', function () {
      var actual = auth.sign({
          verb: 'PUT'
        , secret: 'test'
        , md5: '09c68b914d66457508f6ad727d860d5b'
        , contentType: 'text/plain'
        , resource: '/learnboost'
        , date: new Date('Mon, May 25 1987 00:00:00 GMT')
      });

      assert.equal(actual, '7xIdjyy+W17/k0le5kwBnfrZTiM=');
    });
  });

  describe('.canonicalizeHeaders()', function () {
    specify('with no Amazon headers', function () {
      assert.equal(auth.canonicalizeHeaders({}), '');
    });

    specify('with several Amazon headers', function () {
      var actual = auth.canonicalizeHeaders({
          'X-Amz-Copy-Source-If-Match': 'etagvalue'
        , 'X-Amz-Copy-Source': '/bucket/object'
        , 'X-Amz-Date': 'some date'
        , 'X-Amz-Acl': 'private'
        , 'X-Foo': 'bar'
      });

      var expected = [
          'x-amz-acl:private'
        , 'x-amz-copy-source:/bucket/object'
        , 'x-amz-copy-source-if-match:etagvalue'
        , 'x-amz-date:some date'
      ].join('\n');

      assert.equal(actual, expected);
    });
  });

  describe('.queryStringToSign()', function() {
    var date = new Date().toUTCString()
      , resource = 'foo.jpg';

    specify('for a HEAD request', function () {
      var actual = auth.queryStringToSign({
          verb: 'HEAD'
        , date: date
        , resource: resource
      });

      var expected = [
          'HEAD\n\n'
        , date
        , resource
      ].join('\n');

      assert.equal(actual, expected);
    });

    specify('for a GET request', function () {
      var actual = auth.queryStringToSign({
          verb: 'GET'
        , date: date
        , resource: resource
      });

      var expected = [
          'GET\n\n'
        , date
        , resource
      ].join('\n');

      assert.equal(actual, expected);
    });

    specify('for a GET request with a token', function () {
      var actual = auth.queryStringToSign({
          verb: 'GET'
        , date: date
        , resource: resource
        , token: 'foobar'
      });

      var expected = [
          'GET\n\n'
        , date
        , 'x-amz-security-token:foobar'
        , resource
      ].join('\n');

      assert.equal(actual, expected);
    });
  });

  describe('.canonicalizeResource()', function () {
    specify('for a bucket alone', function () {
      assert.equal(auth.canonicalizeResource('/bucket/'), '/bucket/');
    });

    specify('for a bucket, folder, and file', function () {
      assert.equal(auth.canonicalizeResource('/bucket/test/user2.json'), '/bucket/test/user2.json');
    });

    specify('for a bucket\'s ACL list URL', function () {
      assert.equal(auth.canonicalizeResource('/bucket/?acl'), '/bucket/?acl');
    });

    specify('for a bucket\'s delete multiple URL', function () {
      assert.equal(auth.canonicalizeResource('/bucket/?delete'), '/bucket/?delete');
    });

    specify('for a bucket filtered by a simple prefix', function () {
      assert.equal(auth.canonicalizeResource('/bucket/?prefix=logs'), '/bucket/');
    });

    specify('for a bucket filtered by a simple prefix and a delimiter', function () {
      assert.equal(auth.canonicalizeResource('/bucket/?prefix=logs/&delimiter=/'), '/bucket/');
    });

    specify('for a bucket filtered by a complex prefix and a delimiter', function () {
      assert.equal(auth.canonicalizeResource('/bucket/?prefix=log%20files/&delimiter=/'), '/bucket/');
    });
  });
});
