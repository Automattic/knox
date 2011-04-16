
/**
 * Module dependencies.
 */

var knox = require('knox')
  , fs = require('fs');

try {
  var auth = JSON.parse(fs.readFileSync('auth', 'ascii'));
  var client = knox.createClient(auth);
} catch (err) {
  console.error('`make test` requires ./auth to contain a JSON string with');
  console.error('`key, secret, and bucket in order to run tests.');
  process.exit(1);
}

var jsonFixture = __dirname + '/fixtures/user.json';

module.exports = {
  'test .version': function(assert){
    assert.match(knox.version, /^\d+\.\d+\.\d+$/);
  },
  
  'test .createClient() invalid': function(assert){
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
  
  'test .createClient() valid': function(assert){
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
  
  'test .createClient() custom endpoint': function(assert){
    var client = knox.createClient({
        key: 'foobar'
      , secret: 'baz'
      , bucket: 'misc'
      , endpoint: 's3-eu-west-1.amazonaws.com'
    });

    assert.equal('s3-eu-west-1.amazonaws.com', client.endpoint);
  },

  'test .putFile()': function(assert, done){
    var n = 0;
    client.putFile(jsonFixture, '/test/user.json', function(err, res){
      assert.ok(!err, 'putFile() got an error!');
      assert.equal(200, res.statusCode);
      client.get('/test/user.json').on('response', function(res){
        assert.equal('application/json', res.headers['content-type']);
        done();
      }).end();
    });
  },
  
  'test .put()': function(assert, done){
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
              'http://'+client.bucket+'.s3.amazonaws.com/test/user.json'
            , client.url('/test/user.json'));
          assert.equal(
              'http://'+client.bucket+'.s3.amazonaws.com/test/user.json'
            , req.url);
          done();
        });
        req.end(buf);
      })
    });
  },
  
  'test .putStream()': function(assert, done){
    var stream = fs.createReadStream(jsonFixture);
    client.putStream(stream, '/test/user.json', function(err, res){
      assert.ok(!err);
      if (100 !== res.statusCode) assert.equal(200, res.statusCode);
      done();
    });
  },
  
  'test .getFile()': function(assert, done){
    client.getFile('/test/user.json', function(err, res){
      assert.ok(!err);
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type'])
      assert.equal(13, res.headers['content-length'])
      done();
    });
  },
  
  'test .get()': function(assert, done){
    client.get('/test/user.json').on('response', function(res){
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type'])
      assert.equal(13, res.headers['content-length'])
      done();
    }).end();
  },
  
  'test .head()': function(assert, done){
    client.head('/test/user.json').on('response', function(res){
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type'])
      assert.equal(13, res.headers['content-length'])
      done();
    }).end();
  },
  
  'test .headFile()': function(assert, done){
    client.headFile('/test/user.json', function(err, res){
      assert.ok(!err);
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type'])
      assert.equal(13, res.headers['content-length'])
      done();
    });
  },
  
  'test .del()': function(assert, done){
    client.del('/test/user.json').on('response', function(res){
      assert.equal(204, res.statusCode);
      done();
    }).end();
  },
  
  'test .deleteFile()': function(assert, done){
    client.deleteFile('/test/user.json', function(err, res){
      assert.ok(!err);
      assert.equal(204, res.statusCode);
      done();
    });
  },
  
  'test .get() 404': function(assert, done){
    client.get('/test/user.json').on('response', function(res){
      assert.equal(404, res.statusCode);
      done();
    }).end();
  },
  
  'test .head() 404': function(assert, done){
    client.head('/test/user.json').on('response', function(res){
      assert.equal(404, res.statusCode);
      done();
    }).end();
  }
};
