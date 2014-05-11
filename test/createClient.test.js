"use strict";

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

    it('should throw when an invalid style is given', function () {
      assert.throws(
        function () {
          knox.createClient({
              key: 'foo'
            , secret: 'bar'
            , bucket: 'bucket'
            , style: 'gangnam'
          });
        },
        function (err) {
          return err instanceof Error &&
                 /style must be "virtualHosted" or "path"/.test(err.message);
        }
      );
    });

    it('should throw when an invalid port', function () {
      assert.throws(
        function () {
          knox.createClient({
              key: 'foo'
            , secret: 'bar'
            , bucket: 'bucket'
            , port: ''
          });
        },
        function (err) {
          return err instanceof Error &&
                 /port must be a number/.test(err.message);
        }
      );
    });

    describe('bucket names', function () {
      describe('in us-standard region', function () {
        it('should throw when bucket names are too short', function () {
          assert.throws(
            function () {
              knox.createClient({ key: 'foo', secret: 'bar', bucket: 'bu' });
            },
            /less than 3 characters/
          );
        });

        it('should throw when bucket names are too long', function () {
          var bucket = new Array(257).join('b');
          assert.throws(
            function () {
              knox.createClient({ key: 'foo', secret: 'bar', bucket: bucket });
            },
            /more than 255 characters/
          );
        });

        it('should throw when bucket names contain invalid characters', function () {
          assert.throws(
            function () {
              knox.createClient({ key: 'foo', secret: 'bar', bucket: 'buc!ket' });
            },
            /invalid characters/
          );
        });
      });

      describe('in us-west-1 region', function () {
        it('should throw when bucket names are too long', function () {
          var bucket = new Array(65).join('b');
          assert.throws(
            function () {
              knox.createClient({
                  key: 'foo'
                , secret: 'bar'
                , bucket: bucket
                , region: 'us-west-1'
              });
            },
            /more than 63 characters/
          );
        });

        it('should throw when bucket names contain invalid characters', function () {
          assert.throws(
            function () {
              knox.createClient({
                  key: 'foo'
                , secret: 'bar'
                , bucket: 'buck_et'
                , region: 'us-west-1'
              });
            },
            /valid period-separated labels/
          );
        });

        it('should throw when bucket names look like IPv4 addresses', function () {
          assert.throws(
            function () {
              knox.createClient({
                  key: 'foo'
                , secret: 'bar'
                , bucket: '192.0.0.12'
                , region: 'us-west-1'
              });
            },
            /IPv4 address/
          );
        });
      });

      describe('when forcing virtual hosted style', function () {
        it('should throw when bucket names are too long', function () {
          var bucket = new Array(65).join('b');
          assert.throws(
            function () {
              knox.createClient({
                  key: 'foo'
                , secret: 'bar'
                , bucket: bucket
                , style: 'virtualHosted'
              });
            },
            /more than 63 characters/
          );
        });

        it('should throw when bucket names contain invalid characters', function () {
          assert.throws(
            function () {
              knox.createClient({
                  key: 'foo'
                , secret: 'bar'
                , bucket: 'buck_et'
                , style: 'virtualHosted'
              });
            },
            /valid period-separated labels/
          );
        });

        it('should throw when bucket names look like IPv4 addresses', function () {
          assert.throws(
            function () {
              knox.createClient({
                  key: 'foo'
                , secret: 'bar'
                , bucket: '192.0.0.12'
                , style: 'virtualHosted'
              });
            },
            /IPv4 address/
          );
        });
      });
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

    describe('with virtual hosted style', function () {
      it('should use a default region and endpoint given a bucket', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc'
          , style: 'virtualHosted'
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
          , style: 'virtualHosted'
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
          , style: 'virtualHosted'
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
          , style: 'virtualHosted'
          , region: 'us-standard'
        });

        assert.equal(client.secure, true);
        assert.equal(client.style, 'virtualHosted');
        assert.equal(client.region, 'us-standard');
        assert.equal(client.endpoint, 's3.amazonaws.com');
        assert.equal(client.url('file'), 'https://misc.s3.amazonaws.com/file');
      });

      it('should derive endpoint correctly from explicit us-east-1 region', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc'
          , style: 'virtualHosted'
          , region: 'us-east-1'
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
          , style: 'virtualHosted'
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
          , style: 'virtualHosted'
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

    describe('with automatic style determination', function () {
      it('should choose virtual hosted style by default', function () {
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

      it('should choose path style if the bucket name contains a period', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc.bucket'
        });

        assert.equal(client.secure, true);
        assert.equal(client.style, 'path');
        assert.equal(client.region, 'us-standard');
        assert.equal(client.endpoint, 's3.amazonaws.com');
        assert.equal(client.url('file'), 'https://s3.amazonaws.com/misc.bucket/file');
      });

      it('should choose path style if the bucket name contains an upper-case character', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'MiscBucket'
        });

        assert.equal(client.secure, true);
        assert.equal(client.style, 'path');
        assert.equal(client.region, 'us-standard');
        assert.equal(client.endpoint, 's3.amazonaws.com');
        assert.equal(client.url('file'), 'https://s3.amazonaws.com/MiscBucket/file');
      });

      it('should choose path style if the bucket name contains a non-DNS-compliant character', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc_bucket'
        });

        assert.equal(client.secure, true);
        assert.equal(client.style, 'path');
        assert.equal(client.region, 'us-standard');
        assert.equal(client.endpoint, 's3.amazonaws.com');
        assert.equal(client.url('file'), 'https://s3.amazonaws.com/misc_bucket/file');
      });

      it('should choose path style if the bucket name starts with a dash', function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: '-bucket'
        });

        assert.equal(client.secure, true);
        assert.equal(client.style, 'path');
        assert.equal(client.region, 'us-standard');
        assert.equal(client.endpoint, 's3.amazonaws.com');
        assert.equal(client.url('file'), 'https://s3.amazonaws.com/-bucket/file');
      });

      it('should choose virtual hosted style if the bucket name contains a period but secure is set to false',
         function () {
        var client = knox.createClient({
            key: 'foobar'
          , secret: 'baz'
          , bucket: 'misc.bucket'
          , secure: false
        });

        assert.equal(client.secure, false);
        assert.equal(client.style, 'virtualHosted');
        assert.equal(client.region, 'us-standard');
        assert.equal(client.endpoint, 's3.amazonaws.com');
        assert.equal(client.url('file'), 'http://misc.bucket.s3.amazonaws.com/file');
      });
    });
  });
});
