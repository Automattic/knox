"use strict";

var knox = require('..')
  , initClients = require('./initClients')
  , fs = require('fs')
  , http = require('http')
  , assert = require('assert')
  , crypto = require('crypto');

var jsonFixture = __dirname + '/fixtures/user.json';

runTestsForStyle('virtualHosted', 'virtual hosted');
runTestsForStyle('path', 'path');

function runTestsForStyle(style, userFriendlyName) {
  describe('Client operations: ' + userFriendlyName + '-style', function () {
    var clients = initClients(style);
    var client = clients.client;
    var client2 = clients.client2;
    var clientUsWest2 = clients.clientUsWest2;

    describe('put()', function () {
      specify('from a file statted and read into a buffer', function (done) {
        fs.stat(jsonFixture, function (err, stat) {
          assert.ifError(err);
          fs.readFile(jsonFixture, function (err, buffer) {
            assert.ifError(err);
            var req = client.put('/test/user.json', {
                'Content-Length': stat.size
              , 'Content-Type': 'application/json'
            });

            assert.equal(req.url, client.url('/test/user.json'));

            req.on('response', function (res) {
              assert.equal(res.statusCode, 200);
              done();
            });

            req.end(buffer);
          });
        });
      });

      specify('piping from a file stream', function (done) {
        fs.stat(jsonFixture, function (err, stat) {
          assert.ifError(err);
          var req = client.put('/test/direct-pipe.json', {
              'Content-Length': stat.size
            , 'Content-Type': 'application/json'
          });

          req.on('response', function (res) {
            assert.equal(res.statusCode, 200);
            done();
          });

          var fileStream = fs.createReadStream(jsonFixture);
          fileStream.pipe(req);
        });
      });

      specify('from a string written to the request', function (done) {
        var string = 'hello I am a string';
        var req = client.put('/test/string.txt', {
            'Content-Length': string.length
          , 'Content-Type': 'text/plain'
        });

        req.on('response', function (res) {
          assert.equal(res.statusCode, 200);
          done();
        });

        req.end(string);
      });

      specify('from a string written to the request, into a filename with an apostrophe', function (done) {
        var string = 'hello I have a \' in my name';
        var req = client.put('/test/apos\'trophe.txt', {
            'Content-Length': string.length
          , 'Content-Type': 'text/plain'
        });

        req.on('response', function (res) {
          assert.equal(res.statusCode, 200);
          done();
        });

        req.end(string);
      });

      specify('from a string written to the request, into a filename with an \'#\' sign', function (done) {
        var string = 'hello I have a version \'#\' in my extension';
        var req = client.put('/test/versioned.txt#1', {
            'Content-Length': string.length
          , 'Content-Type': 'text/plain'
        });

        req.on('response', function (res) {
          assert.equal(res.statusCode, 200);
          done();
        });

        req.end(string);
      });

      specify('should upload keys with strange unicode values', function (done) {
        var data = 'knox';

        var req = client.put('/ø', {
            'Content-Length': data.length
          , 'Content-Type': 'text/plain'
        });

        req.on('response', function (res) {
          assert.equal(res.statusCode, 200);
          done();
        });

        req.end(data);
      });

      it('should lower-case headers on requests', function () {
        var headers = { 'X-Amz-Acl': 'private' };
        var req = client.put('/test/user.json', headers);

        assert.equal(req.getHeader('x-amz-acl'), 'private');

        req.on('error', function (){}); // swallow "socket hang up" from aborting
        req.abort();
      });
    });

    describe('putStream()', function () {
      specify('from a file stream', function (done) {
        fs.stat(jsonFixture, function (err, stat) {
          assert.ifError(err);

          var headers = {
              'Content-Length': stat.size
            , 'Content-Type': 'application/json'
          };

          var fileStream = fs.createReadStream(jsonFixture);
          client.putStream(fileStream, '/test/user.json', headers, function (err, res) {
            assert.ifError(err);
            assert.equal(res.statusCode, 200);
            done();
          });
        });
      });

      specify('from a HTTP stream', function (done) {
        http.get({ host: 'google.com', path: '/' }, function (res) {
          var headers = {
              'Content-Length': res.headers['content-length']
            , 'Content-Type': res.headers['content-type']
          };
          client.putStream(res, '/google', headers, function (err, res) {
            assert.ifError(err);
            assert.equal(res.statusCode, 200);
            done();
          });
        });
      });

      it('should emit "progress" events', function (done) {
        http.get({ host: 'google.com', path: '/' }, function (res) {
          var headers = {
              'Content-Length': res.headers['content-length']
            , 'Content-Type': res.headers['content-type']
          };

          var progressHappened = false;

          var req = client.putStream(res, '/google', headers, function (err, res) {
            assert.ifError(err);
            assert.equal(res.statusCode, 200);
            assert(progressHappened);
            done();
          });

          req.on('progress', function (event) {
            progressHappened = true;
            assert(event.percent);
            assert(event.total);
            assert(event.written);
          });
        });
      });

      it('should error early if there is no "Content-Length" header', function (done) {
        var stream = fs.createReadStream(jsonFixture);
        var headers = { 'Content-Type': 'application/json' };
        client.putStream(stream, '/test/user.json', headers, function (err, res) {
          assert(err);
          assert(/Content-Length/.test(err.message));
          done();
        });
      });

      it('should work with a lower-case "content-length" header', function (done) {
        fs.stat(jsonFixture, function (err, stat) {
          assert.ifError(err);

          var headers = {
              'content-length': stat.size
            , 'Content-Type': 'application/json'
          };

          var fileStream = fs.createReadStream(jsonFixture);
          client.putStream(fileStream, '/test/user.json', headers, function (err, res) {
            assert.ifError(err);
            assert.equal(res.statusCode, 200);
            done();
          });
        });
      });
    });

    describe('putFile()', function () {
      specify('the basic case', function (done) {
        client.putFile(jsonFixture, '/test/user2.json', function (err, res) {
          assert.ifError(err);
          assert.equal(res.statusCode, 200);

          client.get('/test/user2.json').on('response', function (res) {
            assert.equal(res.headers['content-type'], 'application/json');
            done();
          }).end();
        });
      });

      it('should work the same in us-west-2', function (done) {
        clientUsWest2.putFile(jsonFixture, '/test/user2.json', function (err, res) {
          assert.ifError(err);
          assert.equal(res.statusCode, 200);

          clientUsWest2.get('/test/user2.json').on('response', function (res) {
            assert.equal(res.headers['content-type'], 'application/json');
            done();
          }).end();
        });
      });

      it('should emit "progress" events', function (done) {
        var progressHappened = false;

        var file = client.putFile(jsonFixture, '/test/user2.json', function (err, res) {
          assert.ifError(err);
          assert.equal(res.statusCode, 200);

          clientUsWest2.get('/test/user2.json').on('response', function (res) {
            assert.equal(res.headers['content-type'], 'application/json');
            assert(progressHappened);
            done();
          }).end();
        });

        file.on('progress', function (event) {
          progressHappened = true;
          assert(event.percent);
          assert(event.total);
          assert(event.written);
        });
      });
    });

    describe('putBuffer()', function () {
      specify('the basic case', function (done) {
        var buffer = new Buffer('a string of stuff');
        var headers = { 'Content-Type': 'text/plain' };

        client.putBuffer(buffer, '/buffer.txt', headers, function (err, res) {
          assert.ifError(err);
          assert.equal(res.statusCode, 200);
          done();
        });
      });

      specify('with a lower-case "content-type" header', function (done) {
        var buffer = new Buffer('a string of stuff');
        var headers = { 'content-type': 'text/plain' };

        client.putBuffer(buffer, '/buffer2.txt', headers, function (err, res) {
          assert.ifError(err);
          assert.equal(res.statusCode, 200);

          client.getFile('/buffer2.txt', function (err, res) {
            assert.ifError(err);
            assert.equal(res.statusCode, 200);
            assert.equal(res.headers['content-type'], 'text/plain');
            done();
          });
        });
      });

      specify('with spaces in the file name', function (done) {
        var buffer = new Buffer('a string of stuff');
        var headers = { 'Content-Type': 'text/plain' };

        client.putBuffer(buffer, '/buffer with spaces.txt', headers, function (err, res) {
          assert.ifError(err);
          assert.equal(res.statusCode, 200);
          done();
        });
      });

      specify('with pluses in the file name', function (done) {
        var buffer = new Buffer('a string of stuff');
        var headers = { 'Content-Type': 'text/plain' };

        client.putBuffer(buffer, '/buffer+with+pluses.txt', headers, function (err, res) {
          assert.ifError(err);
          assert.equal(res.statusCode, 200);
          done();
        });
      });

      specify('with ? in the file name', function (done) {
        var buffer = new Buffer('a string of stuff');
        var headers = { 'Content-Type': 'text/plain' };

        client.putBuffer(buffer, '/buffer?with?questions.txt', headers, function (err, res) {
          assert.ifError(err);
          assert.equal(res.statusCode, 200);
          done();
        });
      });
    });

    describe('copy()', function () {
      it('should return with 200 OK', function (done) {
        client.copy('/test/user.json', '/test/user3.json').on('response', function (res) {
          assert.equal(res.statusCode, 200);
          done();
        }).end();
      });
    });

    describe('copy() with unicode characters', function() {
      it('should return with 200 OK', function(done) {
        client.copy('/ø', '/ø/ø').on('response', function(res) {
          assert.equal(res.statusCode, 200);
          done();
        }).end();
      });
    });

    describe('copyTo()', function () {
      it('should return with 200 OK', function (done) {
        client.copyTo('/test/user.json', client2.bucket, '/test/user3.json').on('response', function (res) {
          assert.equal(res.statusCode, 200);
          done();
        }).end();
      });
    });

    describe('copyFile()', function () {
      it('should return with 200 OK', function (done) {
        client.copyFile('/test/user.json', '/test/user4.json', function (err, res) {
          assert.ifError(err);
          assert.equal(res.statusCode, 200);
          done();
        }).end();
      });
    });

    describe('copyFileTo()', function () {
      it('should return with 200 OK', function (done) {
        client.copyFileTo('/test/user4.json', client2.bucket, '/test/user4.json', function (err, res) {
          assert.ifError(err);
          assert.equal(res.statusCode, 200);
          done();
        }).end();
      });
    });

    describe('get()', function () {
      specify('the basic case', function (done) {
        client.get('/test/user.json').on('response', function (res) {
          assert.equal(res.statusCode, 200);
          assert.equal(res.headers['content-type'], 'application/json');
          assert.equal(res.headers['content-length'], 13);
          done();
        }).end();
      });

      it('should work without a leading slash', function (done) {
        client.get('test/user.json').on('response', function (res) {
          assert.equal(res.statusCode, 200);
          assert.equal(res.headers['content-type'], 'application/json');
          assert.equal(res.headers['content-length'], 13);
          done();
        }).end();
      });

      it('should give a 404 for the file not found', function (done) {
        client.get('/test/whatever').on('response', function (res) {
          assert.equal(res.statusCode, 404);
          done();
        }).end();
      });

      it('should set tokens passed to client construction as the x-amz-security-token header', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc'
          , token: 'foo'
        });

        var req = client.get('/');
        assert.equal(req.getHeader('x-amz-security-token'), 'foo');

        req.on('error', function (){}); // swallow "socket hang up" from aborting
        req.abort();
      });

      it('should not set a token header if the token option is undefined', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc'
          , token: undefined
        });

        var req = client.get('/');
        assert(!req.getHeader('x-amz-security-token'));

        req.on('error', function (){}); // swallow "socket hang up" from aborting
        req.abort();
      });
    });

    describe('getFile()', function () {
      specify('the basic case', function (done) {
        client.getFile('/test/user.json', function(err, res){
          assert.ifError(err);
          assert.equal(res.statusCode, 200);
          assert.equal(res.headers['content-type'], 'application/json');
          assert.equal(res.headers['content-length'], 13);
          done();
        });
      });
    });

    describe('head()', function () {
      specify('the basic case', function (done) {
        client.head('/test/user.json').on('response', function (res) {
          assert.equal(res.statusCode, 200);
          assert.equal(res.headers['content-type'], 'application/json');
          assert.equal(res.headers['content-length'], 13);
          done();
        }).end();
      });

      it('should work without a leading slash', function (done) {
        client.head('test/user.json').on('response', function (res) {
          assert.equal(res.statusCode, 200);
          assert.equal(res.headers['content-type'], 'application/json');
          assert.equal(res.headers['content-length'], 13);
          done();
        }).end();
      });

      it('should give a 404 for the file not found', function (done) {
        client.head('/test/whatever').on('response', function (res) {
          assert.equal(res.statusCode, 404);
          done();
        }).end();
      });
    });

    describe('headFile()', function () {
      specify('the basic case', function (done) {
        client.headFile('/test/user.json', function(err, res){
          assert.ifError(err);
          assert.equal(res.statusCode, 200);
          assert.equal(res.headers['content-type'], 'application/json');
          assert.equal(res.headers['content-length'], 13);
          done();
        });
      });
    });

    describe('list()', function () {
      it('should list files with a specified prefix', function (done) {
        var files = ['/list/user1.json', '/list/user2.json'];

        client.putFile(jsonFixture, files[0], function (err, res) {
          assert.ifError(err);
          client.putFile(jsonFixture, files[1], function (err, res) {
            assert.ifError(err);
            client.list({ prefix: 'list' }, function (err, data) {
              assert.ifError(err);

              assert.strictEqual(data.Prefix, 'list');
              assert.strictEqual(data.IsTruncated, false);
              assert.strictEqual(data.MaxKeys, 1000);
              assert.strictEqual(data.Contents.length, 2);
              assert(data.Contents[0].LastModified instanceof Date);
              assert.strictEqual(typeof data.Contents[0].Size, 'number');
              assert.deepEqual(
                Object.keys(data.Contents[0]),
                ['Key', 'LastModified', 'ETag', 'Size', 'Owner', 'StorageClass']
              );

              done();
            });
          });
        });
      });

      it('should list files with a specified prefix with slash', function (done) {
        var files = ['/list/slash-1.json', '/list/slash-2.json'];

        client.putFile(jsonFixture, files[0], function (err, res) {
          assert.ifError(err);
          client.putFile(jsonFixture, files[1], function (err, res) {
            assert.ifError(err);
            client.list({ prefix: 'list/slash-' }, function (err, data) {
              assert.ifError(err);

              assert.strictEqual(data.Prefix, 'list/slash-');
              assert.strictEqual(data.IsTruncated, false);
              assert.strictEqual(data.MaxKeys, 1000);
              assert.strictEqual(data.Contents.length, 2);
              assert(data.Contents[0].LastModified instanceof Date);
              assert.strictEqual(typeof data.Contents[0].Size, 'number');
              assert.deepEqual(
                Object.keys(data.Contents[0]),
                ['Key', 'LastModified', 'ETag', 'Size', 'Owner', 'StorageClass']
              );

              done();
            });
          });
        });
      });

    });

    describe('request()', function () {
      it('should work to get an object\'s ACL via ?acl', function (done) {
        var req = client.request('GET', '/test/user3.json?acl')
          .on('error', done)
          .on('response', function (res) {
            var data = '';
            res.on('data', function (chunk) {
              data += chunk;
            }).on('end', function () {
              assert(data.indexOf('<Permission>FULL_CONTROL</Permission>') !== -1);
              done();
            }).on('error', done);
          }).end();
      });

      it('should work to delete files via ?delete', function (done) {
        var xml = '<?xml version="1.0" encoding="UTF-8"?><Delete>' +
                  '<Object><Key>test/user4.json</Key></Object>' +
                  '<Object><Key>test/direct-pipe.json</Key></Object>' +
                  '<Object><Key>list/user1.json</Key></Object>' +
                  '<Object><Key>list/user2.json</Key></Object>' +
                  '<Object><Key>list/slash-1.json</Key></Object>' +
                  '<Object><Key>list/slash-2.json</Key></Object>' +
                  '</Delete>';

        var req = client.request('POST', '/?delete', {
          'Content-Length': xml.length,
          'Content-MD5': crypto.createHash('md5').update(xml).digest('base64'),
          'Accept:': '*\/*'
        })
        .on('error',done)
        .on('response', function (res) {
          assert.equal(res.statusCode, 200);
          done();
        })
        .end(xml);
      });
    });

    describe('del()', function () {
      it('should return with 204 No Content', function (done) {
        client.del('/test/user.json').on('response', function (res) {
          assert.equal(res.statusCode, 204);
          done();
        }).end();
      });
    });

    describe('deleteFile()', function () {
      it('should return with 204 No Content', function (done) {
        client.deleteFile('/test/user2.json', function (err, res) {
          assert.ifError(err);
          assert.equal(res.statusCode, 204);
          done();
        });
      });
    });

    describe('deleteMultiple()', function () {
      it('should remove the files as seen in list()', function (done) {
        // Intentionally mix no leading slashes or leading slashes: see #121.
        var files = ['/test/user3.json', 'test/string.txt', '/test/apos\'trophe.txt', '/buffer.txt', '/buffer2.txt',
                     'google', 'buffer with spaces.txt', 'buffer+with+pluses.txt', 'buffer?with?questions.txt',
                      '/ø', 'ø/ø', '/test/versioned.txt#1'];
        client.deleteMultiple(files, function (err, res) {
          assert.ifError(err);
          assert.equal(res.statusCode, 200);

          client.list(function (err, data) {
            assert.ifError(err);
            var keys = data.Contents.map(function (entry) { return entry.Key; });

            assert(keys.indexOf('test/user3.json') === -1);
            assert(keys.indexOf('test/string.txt') === -1);
            assert(keys.indexOf('test/apos\'trophe.txt') === -1);
            assert(keys.indexOf('buffer.txt') === -1);
            assert(keys.indexOf('buffer2.txt') === -1);
            assert(keys.indexOf('google') === -1);
            assert(keys.indexOf('buffer with spaces.txt') === -1);
            assert(keys.indexOf('buffer+with+pluses.txt') === -1);
            assert(keys.indexOf('buffer?with?questions.txt') === -1);
            assert(keys.indexOf('ø') === -1);
            assert(keys.indexOf('ø/ø') === -1);
            assert(keys.indexOf('/test/versioned.txt#1') === -1);

            done();
          });
        });
      });

      it('should work in bucket2', function (done) {
        client2.deleteMultiple(['test/user3.json', 'test/user4.json'], function (err, res) {
          assert.ifError(err);
          assert.equal(res.statusCode, 200);
          done();
        });
      });

      it('should work in bucketUsWest2', function (done) {
        clientUsWest2.deleteMultiple(['test/user2.json'], function (err, res) {
          assert.ifError(err);
          assert.equal(res.statusCode, 200);
          done();
        });
      });
    });

    describe('we should clean up and not use people\'s S3 $$$', function () {
      specify('in bucket', function (done) {
        client.list(function (err, data) {
          assert.ifError(err);

          // Do the assertion like this for nicer error reporting.
          var keys = data.Contents.map(function (entry) { return entry.Key; });
          assert.deepEqual(keys, []);

          done();
        });
      });

      specify('in bucket2', function (done) {
        client2.list(function (err, data) {
          assert.ifError(err);

          // Do the assertion like this for nicer error reporting.
          var keys = data.Contents.map(function (entry) { return entry.Key; });
          assert.deepEqual(keys, []);

          done();
        });
      });

      specify('in bucketUsWest2', function (done) {
        clientUsWest2.list(function (err, data) {
          assert.ifError(err);

          // Do the assertion like this for nicer error reporting.
          var keys = data.Contents.map(function (entry) { return entry.Key; });
          assert.deepEqual(keys, []);

          done();
        });
      });
    });
  });
}
