var knox = require('..')
  , assert = require('assert');

describe('knox.createClient()', function () {
  describe('invalid options', function () {
    it('should ask for a key when nothing is passed', function () {
      assert.throws(
        function () { knox.createClient({}); },
        /aws "key" required/
      );
    });

    it('should ask for a secret when only a key is passed', function () {
      assert.throws(
        function () { knox.createClient({ key: 'foo' }); },
        /aws "secret" required/
      );
    });

    it('should ask for a bucket when only a key and secret are passed', function () {
      assert.throws(
        function () { knox.createClient({ key: 'foo', secret: 'bar' }); },
        /aws "bucket" required/
      );
    });

    it('should throw when bucket names are not all lower-case', function () {
      assert.throws(
        function () { knox.createClient({ key: 'foo', secret: 'bar', bucket: 'BuCkEt' }); },
        /bucket names must be all lower case/
      );
    });

    it('should throw when an invalid style is given', function () {
      assert.throws(
        function () { knox.createClient({ key: 'foo', secret: 'bar', bucket: 'bucket', style: 'gangnam' }); },
        function (err) {
          return err instanceof Error && /style must be "virtualHosted" or "path"/.test(err.message);
        }
      );
    });
  });

  describe('valid options', function () {
    it('should copy over basic properties', function () {
      var client = knox.createClient({
          key: 'foobar'
        , secret: 'baz'
        , bucket: 'misc'
      });

      assert.equal(client.key, 'foobar');
      assert.equal(client.secret, 'baz');
      assert.equal(client.bucket, 'misc');
    });

    describe('with virtual host style', function () {
      it('should use a default region and endpoint given a bucket', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc'
        });

        assert.equal(client.secure, true);
        assert.equal(client.style, 'virtualHosted');
        assert.equal(client.region, 'us-standard');
        assert.equal(client.endpoint, 's3.amazonaws.com');
        assert.equal(client.url('file'), 'https://misc.s3.amazonaws.com/file');
      });

      it('should use a custom endpoint directly', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc'
          , endpoint: 'objects.dreamhost.com'
        });

        assert.equal(client.secure, true);
        assert.equal(client.style, 'virtualHosted');
        assert.equal(client.region, undefined);
        assert.equal(client.domain, undefined);
        assert.equal(client.endpoint, 'objects.dreamhost.com');
        assert.equal(client.url('file'), 'https://misc.objects.dreamhost.com/file');
      });

      it('should derive endpoint correctly from a region', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc'
          , region: 'us-west-1'
        });

        assert.equal(client.secure, true);
        assert.equal(client.style, 'virtualHosted');
        assert.equal(client.region, 'us-west-1');
        assert.equal(client.endpoint, 's3-us-west-1.amazonaws.com');
        assert.equal(client.url('file'), 'https://misc.s3-us-west-1.amazonaws.com/file');
      });

      it('should derive endpoint correctly from explicit us-standard region', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc'
          , region: 'us-standard'
        });

        assert.equal(client.secure, true);
        assert.equal(client.style, 'virtualHosted');
        assert.equal(client.region, 'us-standard');
        assert.equal(client.endpoint, 's3.amazonaws.com');
        assert.equal(client.url('file'), 'https://misc.s3.amazonaws.com/file');
      });

      it('should set secure to false and update the URL when given a port', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc'
          , region: 'us-west-1'
          , port: 1234
        });

        assert.equal(client.secure, false);
        assert.equal(client.style, 'virtualHosted');
        assert.equal(client.region, 'us-west-1');
        assert.equal(client.endpoint, 's3-us-west-1.amazonaws.com');
        assert.equal(client.url('file'), 'http://misc.s3-us-west-1.amazonaws.com:1234/file');
      });

      it('should let secure set to true override custom port defaulting it to false', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc'
          , region: 'us-west-1'
          , port: 1234
          , secure: true
        });

        assert.equal(client.secure, true);
        assert.equal(client.style, 'virtualHosted');
        assert.equal(client.region, 'us-west-1');
        assert.equal(client.endpoint, 's3-us-west-1.amazonaws.com');
        assert.equal(client.url('file'), 'https://misc.s3-us-west-1.amazonaws.com:1234/file');
      });
    });

    describe('with path style', function () {
      it('should use a default region and endpoint given a bucket', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc'
          , style: 'path'
        });

        assert.equal(client.secure, true);
        assert.equal(client.style, 'path');
        assert.equal(client.region, 'us-standard');
        assert.equal(client.endpoint, 's3.amazonaws.com');
        assert.equal(client.url('file'), 'https://s3.amazonaws.com/misc/file');
      });

      it('should use a custom endpoint directly', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc'
          , style: 'path'
          , endpoint: 'objects.dreamhost.com'
        });

        assert.equal(client.secure, true);
        assert.equal(client.style, 'path');
        assert.equal(client.region, undefined);
        assert.equal(client.domain, undefined);
        assert.equal(client.endpoint, 'objects.dreamhost.com');
        assert.equal(client.url('file'), 'https://objects.dreamhost.com/misc/file');
      });

      it('should derive endpoint correctly from a region', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc'
          , style: 'path'
          , region: 'us-west-1'
        });

        assert.equal(client.secure, true);
        assert.equal(client.style, 'path');
        assert.equal(client.region, 'us-west-1');
        assert.equal(client.endpoint, 's3-us-west-1.amazonaws.com');
        assert.equal(client.url('file'), 'https://s3-us-west-1.amazonaws.com/misc/file');
      });

      it('should derive endpoint correctly from explicit us-standard region', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc'
          , style: 'path'
          , region: 'us-standard'
        });

        assert.equal(client.secure, true);
        assert.equal(client.style, 'path');
        assert.equal(client.region, 'us-standard');
        assert.equal(client.endpoint, 's3.amazonaws.com');
        assert.equal(client.url('file'), 'https://s3.amazonaws.com/misc/file');
      });

      it('should set secure to false and update the URL when given a port', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc'
          , style: 'path'
          , region: 'us-west-1'
          , port: 1234
        });

        assert.equal(client.secure, false);
        assert.equal(client.style, 'path');
        assert.equal(client.region, 'us-west-1');
        assert.equal(client.endpoint, 's3-us-west-1.amazonaws.com');
        assert.equal(client.url('file'), 'http://s3-us-west-1.amazonaws.com:1234/misc/file');
      });

      it('should let secure set to true override custom port defaulting it to false', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc'
          , style: 'path'
          , region: 'us-west-1'
          , port: 1234
          , secure: true
        });

        assert.equal(client.secure, true);
        assert.equal(client.style, 'path');
        assert.equal(client.region, 'us-west-1');
        assert.equal(client.endpoint, 's3-us-west-1.amazonaws.com');
        assert.equal(client.url('file'), 'https://s3-us-west-1.amazonaws.com:1234/misc/file');
      });
    });
  });
});
