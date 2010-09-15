
/**
 * Module dependencies.
 */

var ns3 = require('ns3')
  , fs = require('fs');

try {
  var auth = JSON.parse(fs.readFileSync('auth', 'ascii'));
  var client = ns3.createClient(auth);
} catch (err) {
  console.error('`make test` requires ./auth to contain a JSON string with');
  console.error('`key, secret, and bucket in order to run tests.');
  process.exit(1);
}

module.exports = {
  'test .version': function(assert){
    assert.match(ns3.version, /^\d+\.\d+\.\d+$/);
  },
  
  'test .createClient() invalid': function(assert){
    var err;
    try {
      ns3.createClient({});
    } catch (e) {
      err = e;
    }
    assert.equal('aws "key" required', err.message);
    
    var err;
    try {
      ns3.createClient({ key: 'foo' });
    } catch (e) {
      err = e;
    }
    assert.equal('aws "secret" required', err.message);
    
    var err;
    try {
      ns3.createClient({ key: 'foo', secret: 'bar' });
    } catch (e) {
      err = e;
    }
    assert.equal('aws "bucket" required', err.message);
  },
  
  'test .createClient() valid': function(assert){
    var client = ns3.createClient({
        key: 'foobar'
      , secret: 'baz'
      , bucket: 'misc'
    });
    
    assert.equal('foobar', client.key);
    assert.equal('baz', client.secret);
    assert.equal('misc', client.bucket);
    assert.equal('s3.amazonaws.com', client.host);
  },
  
  'test PUT': function(assert, done){
    var path = __dirname + '/fixtures/user.json'
      , n = 0;
    fs.stat(path, function(err, stat){
      if (err) throw err;
      fs.readFile(path, function(err, buf){
        if (err) throw err;
        var req = client.put('/test/user.json', {
          'Content-Length': stat.size,
          'Content-Type': 'application/json'
        });
        req.on('response', function(res){
          switch (++n) {
            case 1:
              assert.equal(100, res.statusCode);
              break;
            case 2:
              assert.equal(200, res.statusCode);
              done();
              break;
          }
        });
        req.end(buf);
      })
    });
  },
  
  'test GET': function(assert, done){
    client.get('/test/user.json').on('response', function(res){
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type'])
      assert.equal(13, res.headers['content-length'])
      done();
    }).end();
  },
  
  'test DELETE': function(assert, done){
    client.del('/test/user.json').on('response', function(res){
      assert.equal(204, res.statusCode);
      done();
    }).end();
  },
  
  'test GET 404': function(assert, done){
    client.get('/test/user.json').on('response', function(res){
      assert.equal(404, res.statusCode);
      done();
    }).end();
  },
  
  'test GET 404': function(assert, done){
    client.get('/test/user.json').on('response', function(res){
      assert.equal(404, res.statusCode);
      done();
    }).end();
  }
};