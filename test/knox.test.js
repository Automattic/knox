
/**
 * Module dependencies.
 */

var knox = require('..')
  , fs = require('fs')
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
  'test .version': function(){
    assert.ok(/^\d+\.\d+\.\d+$/.test(knox.version));
  },

  'test .createClient() invalid': function(){
    var err;
    try {
      knox.createClient({});
    } catch (e) {
      err = e;
    }
    assert.equal('aws "key" required', err.message);

    var err;
    try {
      knox.createClient({ key: 'foo' });
    } catch (e) {
      err = e;
    }
    assert.equal('aws "secret" required', err.message);

    var err;
    try {
      knox.createClient({ key: 'foo', secret: 'bar' });
    } catch (e) {
      err = e;
    }
    assert.equal('aws "bucket" required', err.message);
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
              'http://'+client.endpoint+'/test/user.json'
            , client.url('/test/user.json'));
          assert.equal(
              'http://'+client.endpoint+'/test/user.json'
            , req.url);
          done();
        });
        req.end(buf);
      })
    });
  },

  'test .putStream()': function(done){
    var stream = fs.createReadStream(jsonFixture);
    client.putStream(stream, '/test/user.json', function(err, res){
      assert.ok(!err);
      if (100 !== res.statusCode) assert.equal(200, res.statusCode);
      done();
    });
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
    client.get('/test/user.json').on('response', function(res){
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type'])
      assert.equal(13, res.headers['content-length'])
      done();
    }).end();
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

  'test .deleteMultiple()': function(done){
    client.deleteMultiple(['test/user.json', '/test/user2.json'],
                          function (err, res) {
      assert.ok(!err);
      assert.equal(200, res.statusCode);
      done();
    });
  },

  'test /?delete': function (done) {
    var xml = ['<?xml version="1.0" encoding="UTF-8"?>\n','<Delete>'];
    xml.push('<Object><Key>/test/user3.json</Key></Object>');
    xml.push('</Delete>');
    xml = xml.join('');
    var req = client.request('POST', '/?delete', {
      'Content-Length': xml.length,
      'Content-MD5': crypto.createHash('md5').update(xml).digest('base64'),
      'Accept:': '*/*',
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
  }
};
