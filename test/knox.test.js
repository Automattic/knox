
/**
 * Module dependencies.
 */

var knox = require('..')
  , signQuery = require('../lib/auth').signQuery
  , fs = require('fs')
  , http = require('http')
  , assert = require('assert')
  , crypto = require('crypto');

try {
  var auth = JSON.parse(fs.readFileSync('auth', 'ascii'));
  var client = knox.createClient(auth);
} catch (err) {
  console.error('The tests require ./auth to contain a JSON string with');
  console.error('`key, secret, and bucket in order to run tests.');
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
        knox.createClient({ key: 'foo', secret: 'bar', bucket: 'BuCkEt' })
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

  'test .putFile()': function(done){
    var n = 0;
    client.putFile(jsonFixture, '/test/user2.json', function(err, res){
      assert.ok(!err, 'putFile() got an error!');
      assert.equal(200, res.statusCode);
      client.get('/test/user2.json').on('response', function(res){
        assert.equal('application/json', res.headers['content-type']);
        done();
      }).end();
    });
  },

  'test .putFile() "progress" event': function(done){
    var n = 0;
    var file = client.putFile(jsonFixture, '/test/user2.json', function(err, res){
      assert.ok(!err, 'putFile() got an error!');
      assert.equal(200, res.statusCode);
      client.get('/test/user2.json').on('response', function(res){
        assert.equal('application/json', res.headers['content-type']);
      }).end();
    });

    file.on('progress', function(e){
      assert(e.percent);
      assert(e.total);
      assert(e.written);
      done();
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
          , 'x-amz-acl': 'private'
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
      })
    });
  },

  'test .put() a string': function(done){
      var string = "hello I am a string";
      var req = client.put('/test/string.txt', {
          'Content-Length': string.length
        , 'Content-Type': 'text/plain'
        , 'x-amz-acl': 'private'
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
        , 'x-amz-acl': 'private'
      };
      var stream = fs.createReadStream(jsonFixture);
      client.putStream(stream, '/test/user.json', headers, function(err, res){
        assert.ok(!err);
        if (100 !== res.statusCode) assert.equal(200, res.statusCode);
        done();
      });
    })
  },

  'test .putStream() with http stream': function(done){
    http.get('http://google.com', function(res){
      var headers = {
          'Content-Length': res.headers['content-length']
        , 'Content-Type': res.headers['content-type']
        , 'x-amz-acl': 'private'
      };
      client.putStream(res, '/google', headers, function (err, res) {
        assert.ok(!err);
        if (100 !== res.statusCode) assert.equal(200, res.statusCode);
        done();
      });
    });
  },

  'test .putBuffer()': function(done){
    var buffer = new Buffer('a string of stuff');
    var headers = {
        'Content-Type': 'text/plain'
      , 'x-amz-acl': 'private'
    };
    client.putBuffer(buffer, '/buffer.txt', headers, function (err, res) {
      assert.ok(!err);
        if (100 !== res.statusCode) assert.equal(200, res.statusCode);
        done();
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
      assert.ok(!err);
      assert.equal(200, res.statusCode);
      done();
    }).end();
  },

  'test .getFile()': function(done){
    client.getFile('/test/user.json', function(err, res){
      assert.ok(!err);
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type'])
      assert.equal(13, res.headers['content-length'])
      done();
    });
  },

  'test .get()': function(done){
    client.get('/test/user4.json').on('response', function(res){
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type'])
      assert.equal(13, res.headers['content-length'])
      done();
    }).end();
  },

  'test .get() without leading slash': function(done){
    client.get('buffer.txt').on('response', function(res){
      assert.equal(200, res.statusCode);
      assert.equal('text/plain', res.headers['content-type'])
      assert.equal(17, res.headers['content-length'])
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
      assert.equal('application/json', res.headers['content-type'])
      assert.equal(13, res.headers['content-length'])
      done();
    }).end();
  },

  'test .headFile()': function(done){
    client.headFile('/test/user.json', function(err, res){
      assert.ok(!err);
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type'])
      assert.equal(13, res.headers['content-length'])
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
      assert.ok(!err);
      assert.equal(204, res.statusCode);
      done();
    });
  },

  'test .request() to get ACL (?acl)': function (done) {
    var req = client.request('GET', '/test/user3.json?acl')
      .on('error', function (err) {
        assert.ok(!err);
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
    var files = ['/test/user3.json', '/test/string.txt', '/buffer.txt'];
    client.deleteMultiple(files, function (err, res) {
      assert.ok(!err);
      assert.equal(200, res.statusCode);
      done();
    });
  },

  'test /?delete': function (done) {
    var xml = ['<?xml version="1.0" encoding="UTF-8"?>\n','<Delete>'];
    xml.push('<Object><Key>/test/user4.json</Key></Object>');
    xml.push('</Delete>');
    xml = xml.join('');
    var req = client.request('POST', '/?delete', {
      'Content-Length': xml.length,
      'Content-MD5': crypto.createHash('md5').update(xml).digest('base64'),
      'Accept:': '*/*'
    }).on('error', function (err) {
      assert.ok(!err);
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

  'test .signedUrl()': function(){
    // Not much of a test, but hopefully will prevent regressions (see GH-81)
    var signedUrl = client.signedUrl('/test/user.json', new Date(2020, 1, 1));
    var signature = signQuery({
        secret: client.secret
      , date: 1580533200
      , resource: '/' + client.bucket + '/test/user.json'
    });

    assert.equal('https://' + client.bucket +
                 '.s3.amazonaws.com/test/user.json?Expires=1580533200&AWSAccessKeyId=' +
                 client.key +
                 '&Signature=' + encodeURIComponent(signature), signedUrl);
  }
};
