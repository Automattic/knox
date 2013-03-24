var knox = require('..')
  , assert = require('assert');

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

  'test .createClient() custom domain': function(){
    var client = knox.createClient({
        key: 'foobar'
      , secret: 'baz'
      , bucket: 'misc'
      , domain: 'objects.dreamhost.com'
    });

    assert.equal('misc.objects.dreamhost.com', client.endpoint);
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
  }
};
