"use strict";

var knox = require('..')
  , initClients = require('./initClients')
  , signQuery = require('../lib/auth').signQuery
  , https = require('https')
  , assert = require('assert')
  , parseUrl = require('url').parse
  , qs = require('querystring');

var jsonString = JSON.stringify({ name: 'Domenic '});

runTestsForStyle('virtualHosted', 'virtual hosted');
runTestsForStyle('path', 'path');

function runTestsForStyle(style, userFriendlyName) {
  describe('client.signedUrl(): ' + userFriendlyName + '-style', function () {
    var client = initClients(style).client;
    var tokenClient = knox.createClient({
        bucket: 'example'
      , key: 'foo'
      , secret: 'bar'
      , token: 'baz'
      , style: style
    });

    describe('using the signed URL to perform HTTP requests', function () {
      // These tests seem to fail if we don't slow down a bit, probably due to
      // Amazon throttling us. So insert a delay.
      beforeEach(function (done) {
        setTimeout(done, 2000);
      });

      specify('PUT', function (done) {
        var signedUrl = client.signedUrl(
            '/test/user.json'
          , new Date(Date.now() + 50000)
          , { verb: 'PUT', contentType: 'application/json' }
        );

        var options = parseUrl(signedUrl);
        options.method = 'PUT';
        options.headers = {
          'Content-Length': jsonString.length,
          'Content-Type': 'application/json'
        };

        https.request(options).on('response', function (res) {
          assert.equal(res.statusCode, 200);
          done();
        })
        .on('error', assert.ifError)
        .end(jsonString);
      });

      specify('PUT (with spaces in the file name)', function (done) {
        var signedUrl = client.signedUrl(
            'user with spaces.json'
          , new Date(Date.now() + 50000)
          , { verb: 'PUT', contentType: 'application/json' }
        );

        var options = parseUrl(signedUrl);
        options.method = 'PUT';
        options.headers = {
          'Content-Length': jsonString.length,
          'Content-Type': 'application/json'
        };

        https.request(options).on('response', function (res) {
          assert.equal(res.statusCode, 200);
          done();
        })
        .on('error', assert.ifError)
        .end(jsonString);
      });

      specify('PUT (with x-amz-acl)', function (done) {
        var signedUrl = client.signedUrl(
            'acl.json'
          , new Date(Date.now() + 50000)
          , {
                verb: 'PUT'
              , contentType: 'application/json'
              , 'x-amz-acl': 'public-read'
            }
        );

        var options = parseUrl(signedUrl);
        options.method = 'PUT';
        options.headers = {
          'Content-Length': jsonString.length,
          'Content-Type': 'application/json'
        };

        https.request(options).on('response', function (res) {
          assert.equal(res.statusCode, 200);
          done();
        })
        .on('error', assert.ifError)
        .end(jsonString);
      });

      specify('PUT (with x-amz-meta-myField)', function (done) {
        var signedUrl = client.signedUrl(
            'acl.json'
          , new Date(Date.now() + 50000)
          , {
                verb: 'PUT'
              , contentType: 'application/json'
              , extraHeaders: {'x-amz-meta-myField': 'mySignedFieldValue'}
            }
        );

        var options = parseUrl(signedUrl);
        options.method = 'PUT';
        options.headers = {
          'Content-Length': jsonString.length,
          'Content-Type': 'application/json',
          'x-amz-meta-myField': 'mySignedFieldValue'
        };

        https.request(options).on('response', function (res) {
          assert.equal(res.statusCode, 200);
          done();
        })
        .on('error', assert.ifError)
        .end(jsonString);
      });


      specify('GET (with leading slash)', function (done) {
        var signedUrl = client.signedUrl(
            '/test/user.json'
          , new Date(Date.now() + 50000)
        );

        https.get(signedUrl).on('response', function (res) {
          assert.equal(res.statusCode, 200);
          assert.equal(res.headers['content-type'], 'application/json');
          assert.equal(res.headers['content-length'], jsonString.length);
          done();
        })
        .on('error', assert.ifError)
        .end();
      });

      specify('GET (without leading slash)', function (done) {
        var signedUrl = client.signedUrl(
            'test/user.json'
          , new Date(Date.now() + 50000)
        );

        https.get(signedUrl).on('response', function (res) {
          assert.equal(res.statusCode, 200);
          assert.equal(res.headers['content-type'], 'application/json');
          assert.equal(res.headers['content-length'], jsonString.length);
          done();
        })
        .on('error', assert.ifError)
        .end();
      });

      specify('GET (with explicit verb option)', function (done) {
        var signedUrl = client.signedUrl(
            '/test/user.json'
          , new Date(Date.now() + 50000)
          , { verb: 'GET' }
        );

        https.get(signedUrl).on('response', function (res) {
          assert.equal(res.statusCode, 200);
          assert.equal(res.headers['content-type'], 'application/json');
          assert.equal(res.headers['content-length'], jsonString.length);
          done();
        })
        .on('error', assert.ifError)
        .end();
      });

      specify('GET (with Unicode in query string)', function (done) {
        var contentDisposition = 'attachment; filename="ümläüt.txt";';
        var signedUrl = client.signedUrl(
            '/test/user.json'
          , new Date(Date.now() + 50000)
          , { qs: { 'response-content-disposition': contentDisposition } }
        );

        https.get(signedUrl).on('response', function (res) {
          assert.equal(res.statusCode, 200);
          assert.equal(res.headers['content-type'], 'application/json');
          assert.equal(res.headers['content-length'], jsonString.length);

          // TODO: why aren't these equal? Amazon's fault, or ours?
          // assert.equal(res.headers['content-disposition'], contentDisposition);

          done();
        })
        .on('error', assert.ifError)
        .end();
      });

      specify('GET (with spaces in the name)', function (done) {
        var signedUrl = client.signedUrl(
            'user with spaces.json'
          , new Date(Date.now() + 50000)
        );

        https.get(signedUrl).on('response', function (res) {
          assert.equal(res.statusCode, 200);
          assert.equal(res.headers['content-type'], 'application/json');
          assert.equal(res.headers['content-length'], jsonString.length);
          done();
        })
        .on('error', assert.ifError)
        .end();
      });

      specify('HEAD', function (done) {
        var signedUrl = client.signedUrl(
            '/test/user.json'
          , new Date(Date.now() + 50000)
          , { verb: 'HEAD' }
        );

        var options = parseUrl(signedUrl);
        options.method = 'HEAD';
        https.request(options).on('response', function (res) {
          assert.equal(res.statusCode, 200);
          assert.equal(res.headers['content-type'], 'application/json');
          assert.equal(res.headers['content-length'], jsonString.length);
          done();
        })
        .on('error', assert.ifError)
        .end();
      });

      specify('DELETE', function (done) {
        var signedUrl = client.signedUrl(
            '/test/user.json'
          , new Date(Date.now() + 50000)
          , { verb: 'DELETE' }
        );

        var options = parseUrl(signedUrl);
        options.method = 'DELETE';
        https.request(options).on('response', function (res) {
          assert.equal(res.statusCode, 204);
          done();
        })
        .on('error', assert.ifError)
        .end();
      });

      specify('DELETE (with spaces in the file name)', function (done) {
        var signedUrl = client.signedUrl(
            'user with spaces.json'
          , new Date(Date.now() + 50000)
          , { verb: 'DELETE' }
        );

        var options = parseUrl(signedUrl);
        options.method = 'DELETE';
        https.request(options).on('response', function (res) {
          assert.equal(res.statusCode, 204);
          done();
        })
        .on('error', assert.ifError)
        .end();
      });

      specify('DELETE (clean up the x-amz-acl test)', function (done) {
        var signedUrl = client.signedUrl(
            'acl.json'
          , new Date(Date.now() + 50000)
          , { verb: 'DELETE' }
        );

        var options = parseUrl(signedUrl);
        options.method = 'DELETE';
        https.request(options).on('response', function (res) {
          assert.equal(res.statusCode, 204);
          done();
        })
        .on('error', assert.ifError)
        .end();
      });
    });

    describe('checking the signed URL against a known results', function () {
      specify('with extra parameters in the querystring', function () {
        var date = new Date(2020, 1, 1);
        var timestamp = date.getTime() * 0.001;
        var otherParams = {
          filename: 'my?Fi&le.json',
          'response-content-disposition': 'attachment'
        };
        var signedUrl = client.signedUrl(
          '/test/user.json',
          date,
          { qs: otherParams }
        );

        var signature = signQuery({
            secret: client.secret
          , date: timestamp
          , resource: '/' + client.bucket + '/test/user.json?' +
                      decodeURIComponent(qs.stringify(otherParams))
        });

        assert.equal(signedUrl,
                     client.url('/test/user.json') +
                     '?Expires=' + timestamp +
                     '&AWSAccessKeyId=' + client.key +
                     '&Signature=' + encodeURIComponent(signature) +
                     '&filename=' + encodeURIComponent('my?Fi&le.json') +
                     '&response-content-disposition=attachment');
      });

      specify('with a STS token', function () {
        var date = new Date(2020, 1, 1);
        var timestamp = date.getTime() * 0.001;
        var token = tokenClient.token;
        var signedUrl = tokenClient.signedUrl('/test/user.json', date);

        var signature = signQuery({
            secret: tokenClient.secret
          , date: timestamp
          , resource: '/' + tokenClient.bucket + '/test/user.json'
          , token: token
        });

        assert.equal(signedUrl,
                     tokenClient.url('/test/user.json') +
                     '?Expires=' + timestamp +
                     '&AWSAccessKeyId=' + tokenClient.key +
                     '&Signature=' + encodeURIComponent(signature) +
                     '&x-amz-security-token=' + encodeURIComponent(token));
      });
    });
  });
}
