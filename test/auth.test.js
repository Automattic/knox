"use strict";

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

  describe('.authorization() [from the Amazon docs]', function () {
    // http://docs.aws.amazon.com/AmazonS3/latest/dev/RESTAuthentication.html#RESTAuthenticationExamples

    specify('Example Object GET', function () {
      var actual = auth.authorization({
          verb: 'GET'
        , key: 'AKIAIOSFODNN7EXAMPLE'
        , secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
        , resource: auth.canonicalizeResource('/johnsmith/photos/puppy.jpg')
        , date: 'Tue, 27 Mar 2007 19:36:42 +0000'
      });

      assert.equal(actual, 'AWS AKIAIOSFODNN7EXAMPLE:bWq2s1WEIj+Ydj0vQ697zp+IXMU=');
    });

    specify('Example Object PUT', function () {
      var actual = auth.authorization({
          verb: 'PUT'
        , key: 'AKIAIOSFODNN7EXAMPLE'
        , secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
        , resource: auth.canonicalizeResource('/johnsmith/photos/puppy.jpg')
        , contentType: 'image/jpeg'
        , date: 'Tue, 27 Mar 2007 21:15:45 +0000'
      });

      assert.equal(actual, 'AWS AKIAIOSFODNN7EXAMPLE:MyyxeRY7whkBe+bq8fHCL/2kKUg=');
    });

    specify('Example List', function () {
      var actual = auth.authorization({
          verb: 'GET'
        , key: 'AKIAIOSFODNN7EXAMPLE'
        , secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
        , resource: auth.canonicalizeResource('/johnsmith/')
        , date: 'Tue, 27 Mar 2007 19:42:41 +0000'
      });

      assert.equal(actual, 'AWS AKIAIOSFODNN7EXAMPLE:htDYFYduRNen8P9ZfE/s9SuKy0U=');
    });

    specify('Example Fetch', function () {
      var actual = auth.authorization({
          verb: 'GET'
        , key: 'AKIAIOSFODNN7EXAMPLE'
        , secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
        , resource: auth.canonicalizeResource('/johnsmith/?acl')
        , date: 'Tue, 27 Mar 2007 19:44:46 +0000'
      });

      assert.equal(actual, 'AWS AKIAIOSFODNN7EXAMPLE:c2WLPFtWHVgbEmeEG93a4cG37dM=');
    });

    specify('Example Delete', function () {
      // This is modified from the docs: knox does not allow setting the date
      // through x-amz-date, so we test that the x-amz-date is ignored and the
      // date is instead used.
      var actual = auth.authorization({
          verb: 'DELETE'
        , key: 'AKIAIOSFODNN7EXAMPLE'
        , secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
        , resource: auth.canonicalizeResource('/johnsmith/photos/puppy.jpg')
        , amazonHeaders: auth.canonicalizeHeaders({
            'x-amz-date': 'Tue, 27 Mar 2007 21:20:27 +0000'
          })
        , date: 'Tue, 27 Mar 2007 21:20:26 +0000'
      });

      assert.equal(actual, 'AWS AKIAIOSFODNN7EXAMPLE:lx3byBScXR6KzyMaifNkardMwNk=');
    });

    specify.skip('Example Upload', function () {
      // Knox doesn't support multiple values for a single header; see
      // discussion at https://github.com/LearnBoost/knox/pull/6. Elegant pull
      // requests to implement this feature welcome!
    });

    specify('Example List All My Buckets', function () {
      var actual = auth.authorization({
          verb: 'GET'
        , key: 'AKIAIOSFODNN7EXAMPLE'
        , secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
        , resource: auth.canonicalizeResource('/')
        , date: 'Wed, 28 Mar 2007 01:29:59 +0000'
      });

      assert.equal(actual, 'AWS AKIAIOSFODNN7EXAMPLE:qGdzdERIC03wnaRNKh6OqZehG9s=');
    });

    specify('Example Unicode Keys', function () {
      var actual = auth.authorization({
          verb: 'GET'
        , key: 'AKIAIOSFODNN7EXAMPLE'
        , secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
        , resource: auth.canonicalizeResource('/dictionary/fran%C3%A7ais/pr%c3%a9f%c3%a8re')
        , date: 'Wed, 28 Mar 2007 01:49:49 +0000'
      });

      assert.equal(actual, 'AWS AKIAIOSFODNN7EXAMPLE:DNEZGsoieTZ92F3bUfSPQcbGmlM=');
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
