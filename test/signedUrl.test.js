var knox = require('..')
  , initClients = require('./initClients')
  , signQuery = require('../lib/auth').signQuery
  , https = require('https')
  , assert = require('assert')
  , url = require('url')
  , qs = require('querystring');

var client = initClients().client;

var string = JSON.stringify({ name: 'Domenic '});

module.exports = {
  'test .signedUrl() for PUT': function(done){
    var signedUrl = client.signedUrl('/test/user.json', new Date(Date.now() + 50000), {
      verb: 'PUT',
      contentType: 'application/json'
    });

    var options = url.parse(signedUrl);
    options.method = 'PUT';
    options.headers = {
      'Content-Length': string.length,
      'Content-Type': 'application/json'
    };

    https.request(options).on('response', function(res){
      assert.equal(200, res.statusCode);
      done();
    })
    .on('error', assert.ifError)
    .end(string);
  },

  'test .signedUrl()': function(done){
    var signedUrl = client.signedUrl('/test/user.json', new Date(Date.now() + 50000));

    https.get(signedUrl).on('response', function(res){
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type']);
      assert.equal(string.length, res.headers['content-length']);
      done();
    })
    .on('error', assert.ifError)
    .end();
  },

  'test .signedUrl() without leading slash': function(done){
    var signedUrl = client.signedUrl('test/user.json', new Date(Date.now() + 50000));

    https.get(signedUrl).on('response', function(res){
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type']);
      assert.equal(string.length, res.headers['content-length']);
      done();
    })
    .on('error', assert.ifError)
    .end();
  },

  'test .signedUrl() with explicit verb GET': function(done){
    var signedUrl = client.signedUrl('/test/user.json', new Date(Date.now() + 50000), { verb: 'GET' });

    https.get(signedUrl).on('response', function(res){
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type']);
      assert.equal(string.length, res.headers['content-length']);
      done();
    })
    .on('error', assert.ifError)
    .end();
  },

  'test .signedUrl() with verb HEAD': function(done){
    var signedUrl = client.signedUrl('/test/user.json', new Date(Date.now() + 50000), { verb: 'HEAD' });

    var options = url.parse(signedUrl);
    options.method = 'HEAD';
    https.request(options).on('response', function(res){
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type']);
      assert.equal(string.length, res.headers['content-length']);
      done();
    })
    .on('error', assert.ifError)
    .end();
  },

  'test .signedUrl() with Unicode in query string': function(done){
    var signedUrl = client.signedUrl('/test/user.json', new Date(Date.now() + 50000), {
      qs: {
        'response-content-disposition': 'attachment; filename="ümläüt.txt";'
      }
    });

    https.get(signedUrl).on('response', function(res){
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type']);
      assert.equal(string.length, res.headers['content-length']);
      done();
    })
    .on('error', assert.ifError)
    .end();
  },

  'test .signedUrl() with verb DELETE': function(done){
    var signedUrl = client.signedUrl('/test/user.json', new Date(Date.now() + 50000), { verb: 'DELETE' });

    var options = url.parse(signedUrl);
    options.method = 'DELETE';
    https.request(options).on('response', function(res){
      assert.equal(204, res.statusCode);
      done();
    })
    .on('error', assert.ifError)
    .end();
  },

  'test .signedUrl() with extra params': function(){
    var date = new Date(2020, 1, 1);
    var timestamp = date.getTime() * 0.001;
    var otherParams = {
      filename: 'my?Fi&le.json',
      'response-content-disposition': 'attachment'
    };
    var signedUrl = client.signedUrl('/test/user.json', date, { qs: otherParams });
    var signature = signQuery({
        secret: client.secret
      , date: timestamp
      , resource: '/' + client.bucket + '/test/user.json?' + decodeURIComponent(qs.stringify(otherParams))
    });

    assert.equal('https://' + client.bucket +
                 '.s3.amazonaws.com/test/user.json?Expires=' +
                 timestamp +
                 '&AWSAccessKeyId=' +
                 client.key +
                 '&Signature=' + encodeURIComponent(signature) +
                 '&filename=' + encodeURIComponent('my?Fi&le.json') +
                 '&response-content-disposition=attachment'
                 , signedUrl);
  },

  'test .signedUrl() with sts token': function(){
    var date = new Date(2020, 1, 1);
    var timestamp = date.getTime() * 0.001;
    var tokenClient = knox.createClient({
      bucket: 'example',
      key: 'foo',
      secret: 'bar',
      token: 'baz'
    });
    var signedUrl = tokenClient.signedUrl('/test/user.json', date);
    var signature = signQuery({
        secret: tokenClient.secret
      , date: timestamp
      , resource: '/' + tokenClient.bucket + '/test/user.json'
      , token: 'baz'
    });

    assert.equal('https://' + tokenClient.bucket +
                 '.s3.amazonaws.com/test/user.json?Expires=' +
                 timestamp +
                 '&AWSAccessKeyId=' +
                 tokenClient.key +
                 '&Signature=' + encodeURIComponent(signature) +
                 '&x-amz-security-token=baz', signedUrl);

  }
};
