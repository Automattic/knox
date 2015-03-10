"use strict";

var knox = require('..')
  , auth = knox.auth
  , assert = require('assert');

describe('knox.auth', function () {
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
});
