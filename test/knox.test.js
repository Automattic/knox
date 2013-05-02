var knox = require('..')
  , initClients = require('./initClients')
  , fs = require('fs')
  , http = require('http')
  , assert = require('assert')
  , crypto = require('crypto');

var clients = initClients();
var client = clients.client;
var client2 = clients.client2;
var clientUsWest2 = clients.clientUsWest2;
var clientUsWest2 = clients.clientUsWest2;
var clientBucketWithDots = clients.clientBucketWithDots;

var jsonFixture = __dirname + '/fixtures/user.json';

module.exports = {
  'test endpoint with custom port': function(done){
    var customPortClient = knox.createClient({
        key: 'foobar'
      , secret: 'baz'
      , bucket: 'misc'
      , port: 81
    });

    assert.equal(
        'http://misc.s3.amazonaws.com:81/test/user.json'
      , customPortClient.url('/test/user.json'));

    done();
  },

  'test .putFile()': function(done){
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
    clientUsWest2.putFile(jsonFixture, '/test/user2.json', function(err, res){
      assert.ifError(err);
      assert.equal(200, res.statusCode);
      clientUsWest2.get('/test/user2.json').on('response', function(res){
        assert.equal('application/json', res.headers['content-type']);
        done();
      }).end();
    });
  },

  'test .putFile() for bucket with dots': function(done) {
    clientBucketWithDots.putFile(jsonFixture, '/test/user2.json', function(err, res){
      assert.ifError(err);
      assert.equal(200, res.statusCode);
      clientBucketWithDots.get('/test/user2.json').on('response', function(res){
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
  'test .put() a string with filename that contains apostrophe': function(done){
      var string = "hello I have a ' in my name";
      var req = client.put('/test/apos\'trophe.txt', {
          'Content-Length': string.length
        , 'Content-Type': 'text/plain'
      });
      req.on('response', function(res){
        assert.equal(200, res.statusCode);
        done();
      });
      req.end(string);
  },

  'test piping from a file stream to .put()': function(done) {
    fs.stat(jsonFixture, function(err, stat){
      assert.ifError(err);

      var headers = {
          'Content-Length': stat.size
        , 'Content-Type': 'application/json'
      };

      var req = client.put('/test/direct-pipe.json', headers);
      req.on('response', function(res){
        assert.equal(200, res.statusCode);
        done();
      });

      var fileStream = fs.createReadStream(jsonFixture);
      fileStream.pipe(req);
    });
  },

  'test .putStream() with file stream': function(done){
    fs.stat(jsonFixture, function(err, stat){
      assert.ifError(err);

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

  'test undefined token is not set in header': function(){
    var client = knox.createClient({
        key: 'foobar'
      , secret: 'baz'
      , bucket: 'misc'
      , token: undefined
    });
    var req = client.get('/');
    assert.equal(false, req._headers.hasOwnProperty('x-amz-security-token'));
  },

  'test token is set in header': function(){
    var client = knox.createClient({
        key: 'foobar'
      , secret: 'baz'
      , bucket: 'misc'
      , token: 'foo'
    });
    var req = client.get('/');
    assert.equal('foo', req._headers['x-amz-security-token']);
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
    var files = ['/test/user3.json', 'test/string.txt', '/test/apos\'trophe.txt', '/buffer.txt', '/buffer2.txt', 'google'];
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

  'test .copyFileTo()': function(done){
    var file = '/copy-file-to/user.json';

    client.putFile(jsonFixture, file, function(err, res){
        client.copyFileTo(file, client2.bucket, file, function(err, res){
          assert.ifError(err);
          assert.equal(200, res.statusCode);
          client.deleteFile(file, function(err, res) {
            assert.ifError(err);
            client2.deleteFile(file, function(err, res) {
              assert.ifError(err);
              done();
            });
          });
        });
    });
  },

  'test .copyTo()': function(done){
    var file = '/copy-file-to/user.json';

    client.putFile(jsonFixture, file, function(err, res){
      client.copyTo(file, client2.bucket, file).on('response', function(res){
        assert.equal(200, res.statusCode);
        client.deleteFile(file, function(err, res) {
          assert.ifError(err);
          client2.deleteFile(file, function(err, res) {
            assert.ifError(err);
            done();
          });
        });
      }).end();
    });
  },

  'test /?delete': function(done){
    var xml = ['<?xml version="1.0" encoding="UTF-8"?>\n','<Delete>'];
    xml.push('<Object><Key>test/user4.json</Key></Object><Object><Key>test/direct-pipe.json</Key></Object>');
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
  }
};
