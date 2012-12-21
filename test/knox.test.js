var knox = require('..')
  , signQuery = require('../lib/auth').signQuery
  , fs = require('fs')
  , http = require('http')
  , assert = require('assert')
  , crypto = require('crypto');

try {
  var auth = require("./auth.json");
  var client = knox.createClient(auth);
  auth.bucket = auth.bucketUsWest2;
  // Without this we get a 307 redirect
  // that putFile can't handle (issue #66). Later
  // when there is an implementation of #66 we can test
  // both with and without this option present, but it's
  // always a good idea for performance
  auth.region = 'us-west-2';
  var clientUsWest2 = knox.createClient(auth);
} catch (err) {
  console.error(err);
  console.error('The tests require ./auth to contain a JSON string with key, ' +
                'secret, bucket, and bucketUsWest2 in order to run tests. ' +
                'Both bucket and bucketUsWest2 must exist and should not ' +
                'contain anything you want to keep. bucketUsWest2 should be ' +
                'created in the us-west-2 (Oregon) region, not the default ' +
                'region.');
  process.exit(1);
}

var jsonFixture = __dirname + '/fixtures/user.json';

module.exports = {
  'test .createClient() invalid': function(){
    assert.throws(
      function () { knox.createClient({}); },
      /aws "key" required/
    );

    assert.throws(
      function () { knox.createClient({ key: 'foo' }); },
      /aws "secret" required/
    );

    assert.throws(
      function () { knox.createClient({ key: 'foo', secret: 'bar' }); },
      /aws "bucket" required/
    );

    assert.throws(
      function () {
        knox.createClient({ key: 'foo', secret: 'bar', bucket: 'BuCkEt' });
      },
      /bucket names must be all lower case/
    );
  },

  'test .createClient() valid': function(){
    var client = knox.createClient({
        key: 'foobar'
      , secret: 'baz'
      , bucket: 'misc'
    });

    assert.equal('foobar', client.key);
    assert.equal('baz', client.secret);
    assert.equal('misc', client.bucket);
    assert.equal('misc.s3.amazonaws.com', client.endpoint);
  },

  'test .createClient() custom endpoint': function(){
    var client = knox.createClient({
        key: 'foobar'
      , secret: 'baz'
      , bucket: 'misc'
      , endpoint: 's3-eu-west-1.amazonaws.com'
    });

    assert.equal('s3-eu-west-1.amazonaws.com', client.endpoint);
  },

  'test .createClient() region is us-west-1': function(){
    var client = knox.createClient({
        key: 'foobar'
      , secret: 'baz'
      , bucket: 'misc'
      , region: 'us-west-1'
    });

    assert.equal('misc.s3-us-west-1.amazonaws.com', client.endpoint);
  },

  'test .createClient() region explicitly us-standard': function(){
    var client = knox.createClient({
        key: 'foobar'
      , secret: 'baz'
      , bucket: 'misc'
      , region: 'us-standard'
    });

    assert.equal('misc.s3.amazonaws.com', client.endpoint);
  },

  'test .putFile()': function(done){
    var n = 0;
    client.putFile(jsonFixture, '/test/user2.json', function(err, res){
      assert.ifError(err);
      assert.equal(200, res.statusCode);
      client.get('/test/user2.json').on('response', function(res){
        assert.equal('application/json', res.headers['content-type']);
        done();
      }).end();
    });
  },

  'test .putFile() in us-west-2': function(done){
    var n = 0;
    clientUsWest2.putFile(jsonFixture, '/test/user2.json', function(err, res){
      assert.ifError(err);
      assert.equal(200, res.statusCode);
      client.get('/test/user2.json').on('response', function(res){
        assert.equal('application/json', res.headers['content-type']);
        done();
      }).end();
    });
  },

  'test .putFile() "progress" event': function(done){
    var progressHappened = false;
    var file = client.putFile(jsonFixture, '/test/user2.json', function(err, res){
      assert.ifError(err);
      assert.equal(200, res.statusCode);
      client.get('/test/user2.json').on('response', function(res){
        assert.equal('application/json', res.headers['content-type']);
        assert.ok(progressHappened);
        done();
      }).end();
    });

    file.on('progress', function(e){
      progressHappened = true;
      assert(e.percent);
      assert(e.total);
      assert(e.written);
    });
  },

  'test .put()': function(done){
    var n = 0;
    fs.stat(jsonFixture, function(err, stat){
      if (err) throw err;
      fs.readFile(jsonFixture, function(err, buf){
        if (err) throw err;
        var req = client.put('/test/user.json', {
            'Content-Length': stat.size
          , 'Content-Type': 'application/json'
        });
        req.on('response', function(res){
          assert.equal(200, res.statusCode);
          assert.equal(
              'https://'+client.endpoint+'/test/user.json'
            , client.url('/test/user.json'));
          assert.equal(
              'https://'+client.endpoint+'/test/user.json'
            , req.url);
          done();
        });
        req.end(buf);
      });
    });
  },

  'test .put() a string': function(done){
      var string = "hello I am a string";
      var req = client.put('/test/string.txt', {
          'Content-Length': string.length
        , 'Content-Type': 'text/plain'
      });
      req.on('response', function(res){
        assert.equal(200, res.statusCode);
        done();
      });
      req.end(string);
  },

  'test .putStream() with file stream': function(done){
    fs.stat(jsonFixture, function(err, stat){
      if (err) throw err;
      var headers = {
          'Content-Length': stat.size
        , 'Content-Type': 'application/json'
      };
      var stream = fs.createReadStream(jsonFixture);
      client.putStream(stream, '/test/user.json', headers, function(err, res){
        assert.ifError(err);
        if (100 !== res.statusCode) assert.equal(200, res.statusCode);
        done();
      });
    });
  },

  'test .putStream() with http stream': function(done){
    var options = {
        host: 'google.com'
      , path: '/'
    };
    http.get(options, function(res){
      var headers = {
          'Content-Length': res.headers['content-length']
        , 'Content-Type': res.headers['content-type']
      };
      client.putStream(res, '/google', headers, function (err, res) {
        assert.ifError(err);
        if (100 !== res.statusCode) assert.equal(200, res.statusCode);
        done();
      });
    });
  },

  'test .putStream() with http stream "progress" event': function(done){
    var progressHappened = false;
    var options = {
        host: 'google.com'
      , path: '/'
    };
    http.get(options, function(res){
      var headers = {
          'Content-Length': res.headers['content-length']
        , 'Content-Type': res.headers['content-type']
      };
      var req = client.putStream(res, '/google', headers, function (err, res) {
        assert.ifError(err);
        if (100 !== res.statusCode) assert.equal(200, res.statusCode);
        assert.ok(progressHappened);
        done();
      });

      req.on('progress', function(e){
        progressHappened = true;
        assert(e.percent);
        assert(e.total);
        assert(e.written);
      });
    });
  },

  'test .putStream() without "Content-Length" header errors': function(done){
    var stream = fs.createReadStream(jsonFixture);
    var headers = {
      'Content-Type': 'application/json'
    };
    client.putStream(stream, '/test/user.json', headers, function(err,res){
      assert.ok(err);
      assert(/Content-Length/.test(err.message));
      done();
    });
  },

  'test .putStream() with lowercase "content-length" header is ok': function(done){
    fs.stat(jsonFixture, function(err, stat){
      if (err) throw err;
      var headers = {
          'content-length': stat.size
        , 'Content-Type': 'application/json'
      };
      var stream = fs.createReadStream(jsonFixture);
      client.putStream(stream, '/test/user.json', headers, function(err, res){
        assert.ifError(err);
        if (100 !== res.statusCode) assert.equal(200, res.statusCode);
        done();
      });
    });
  },

  'test .putBuffer()': function(done){
    var buffer = new Buffer('a string of stuff');
    var headers = { 'Content-Type': 'text/plain' };
    client.putBuffer(buffer, '/buffer.txt', headers, function (err, res) {
      assert.ifError(err);
      if (100 !== res.statusCode) assert.equal(200, res.statusCode);
      done();
    });
  },

  'test .putBuffer() with lowercase "content-type" header works': function(done){
    var buffer = new Buffer('a string of stuff');
    var headers = { 'content-type': 'text/plain' };
    client.putBuffer(buffer, '/buffer2.txt', headers, function (err, res) {
      assert.ifError(err);
      if (100 !== res.statusCode) assert.equal(200, res.statusCode);
      client.getFile('/buffer2.txt', function (err, res) {
        assert.ifError(err);
        assert.equal(200, res.statusCode);
        assert.equal(res.headers['content-type'], 'text/plain');
        done();
      });
    });
  },

  'test .copy()': function(done){
    client.copy('/test/user.json', '/test/user3.json').on('response', function(res){
      assert.equal(200, res.statusCode);
      done();
    }).end();
  },

  'test .copyFile()': function(done){
    client.copyFile('test/user.json', 'test/user4.json', function(err, res){
      assert.ifError(err);
      assert.equal(200, res.statusCode);
      done();
    }).end();
  },

  'test .getFile()': function(done){
    client.getFile('/test/user.json', function(err, res){
      assert.ifError(err);
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type']);
      assert.equal(13, res.headers['content-length']);
      done();
    });
  },

  'test .get()': function(done){
    client.get('/test/user4.json').on('response', function(res){
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type']);
      assert.equal(13, res.headers['content-length']);
      done();
    }).end();
  },

  'test .get() without leading slash': function(done){
    client.get('buffer.txt').on('response', function(res){
      assert.equal(200, res.statusCode);
      assert.equal('text/plain', res.headers['content-type']);
      assert.equal(17, res.headers['content-length']);
      done();
    }).end();
  },

  'test header lowercasing': function(){
    var headers = { 'X-Amz-Acl': 'private' };
    var req = client.put('/test/user.json', headers);

    assert.equal('private', req.getHeader('x-amz-acl'));

    req.on('error', function (){}); // swallow "socket hang up" from aborting
    req.abort();
  },

  'test .head()': function(done){
    client.head('/test/user.json').on('response', function(res){
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type']);
      assert.equal(13, res.headers['content-length']);
      done();
    }).end();
  },

  'test .headFile()': function(done){
    client.headFile('/test/user.json', function(err, res){
      assert.ifError(err);
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type']);
      assert.equal(13, res.headers['content-length']);
      done();
    });
  },

  'test .del()': function(done){
    client.del('/test/user.json').on('response', function(res){
      assert.equal(204, res.statusCode);
      done();
    }).end();
  },

  'test .deleteFile()': function(done){
    client.deleteFile('/test/user2.json', function(err, res){
      assert.ifError(err);
      assert.equal(204, res.statusCode);
      done();
    });
  },

  'test .request() to get ACL (?acl)': function (done) {
    var req = client.request('GET', '/test/user3.json?acl')
      .on('error', function (err) {
        assert.ifError(err);
      }).on('response', function (res) {
        var data = '';
        res.on('data', function (chunk) {
          data += chunk;
        }).on('end', function () {
          assert.ok(data.indexOf('<Permission>FULL_CONTROL</Permission>') !== -1);
          done();
        }).on('error', done);
      }).end();
  },

  'test .deleteMultiple()': function(done){
    // intentionally mix no leading slashes or leading slashes: see #121.
    var files = ['/test/user3.json', 'test/string.txt', '/buffer.txt', '/buffer2.txt', 'google'];
    client.deleteMultiple(files, function (err, res) {
      assert.ifError(err);
      assert.equal(200, res.statusCode);

      client.list(function (err, data) {
        assert.ifError(err);
        var keys = data.Contents.map(function (entry) { return entry.Key; });

        assert(keys.indexOf('test/user3.json') === -1);
        assert(keys.indexOf('test/string.txt') === -1);
        assert(keys.indexOf('buffer.txt') === -1);

        done();
      });
    });
  },

  'test .list()': function(done){
    var files = ['/list/user1.json', '/list/user2.json'];

    client.putFile(jsonFixture, files[0], function(err, res){
      client.putFile(jsonFixture, files[1], function(err, res){
        client.list({prefix: 'list'}, function(err, data){
          assert.ifError(err);
          assert.equal(data.Prefix, 'list');
          assert.strictEqual(data.IsTruncated, false);
          assert.strictEqual(data.MaxKeys, 1000);
          assert.equal(data.Contents.length, 2);
          assert.ok(data.Contents[0].LastModified instanceof Date);
          assert.equal(typeof data.Contents[0].Size, 'number');
          assert.deepEqual(
            Object.keys(data.Contents[0]),
            ['Key', 'LastModified', 'ETag', 'Size', 'Owner', 'StorageClass']
          );
          client.deleteMultiple(files, function(err, res) {
            assert.ifError(err);
            done();
          });
        });
      });
    });
  },

  'test /?delete': function (done) {
    var xml = ['<?xml version="1.0" encoding="UTF-8"?>\n','<Delete>'];
    xml.push('<Object><Key>test/user4.json</Key></Object>');
    xml.push('</Delete>');
    xml = xml.join('');
    var req = client.request('POST', '/?delete', {
      'Content-Length': xml.length,
      'Content-MD5': crypto.createHash('md5').update(xml).digest('base64'),
      'Accept:': '*/*'
    }).on('error', function (err) {
      assert.ifError(err);
    }).on('response', function (res) {
      assert.equal(200, res.statusCode);
      done();
    });
    req.write(xml);
    req.end();
  },

  'test .get() 404': function(done){
    client.get('/test/user.json').on('response', function(res){
      assert.equal(404, res.statusCode);
      done();
    }).end();
  },

  'test .head() 404': function(done){
    client.head('/test/user.json').on('response', function(res){
      assert.equal(404, res.statusCode);
      done();
    }).end();
  },

  'test that we cleaned up and are not using people\'s S3 $$$': function(done){
      client.list(function (err, data) {
        assert.ifError(err);
        var keys = data.Contents.map(function (entry) { return entry.Key; });

        assert.deepEqual(keys, []);

        done();
      });
  },

  'test .signedUrl()': function(){
    // Not much of a test, but hopefully will prevent regressions (see GH-81)
    var date = new Date(2020, 1, 1);
    var timestamp = date.getTime() * 0.001;
    var signedUrl = client.signedUrl('/test/user.json', date);
    var signature = signQuery({
        secret: client.secret
      , date: timestamp
      , resource: '/' + client.bucket + '/test/user.json'
    });

    assert.equal('https://' + client.bucket +
                 '.s3.amazonaws.com/test/user.json?Expires=' +
                 timestamp +
                 '&AWSAccessKeyId=' +
                 client.key +
                 '&Signature=' + encodeURIComponent(signature), signedUrl);
  },

  'test .signedUrl() without a leading slash': function(){
    var date = new Date(2020, 1, 1);
    var timestamp = date.getTime() * 0.001;
    var signedUrl = client.signedUrl('test/user.json', date); // no leading slash
    var signature = signQuery({
        secret: client.secret
      , date: timestamp
      , resource: '/' + client.bucket + '/test/user.json'
    });

    assert.equal('https://' + client.bucket +
                 '.s3.amazonaws.com/test/user.json?Expires=' +
                 timestamp +
                 '&AWSAccessKeyId=' +
                 client.key +
                 '&Signature=' + encodeURIComponent(signature), signedUrl);
  }
};
