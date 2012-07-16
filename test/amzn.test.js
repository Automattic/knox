/**
 * Module dependencies.
 */

var knox = require('knox')
  , auth = knox.auth;

// comparing Authentication header results for test cases from
// http://docs.amazonwebservices.com/AmazonS3/2006-03-01/dev/index.html?RESTAuthentication.html

module.exports = { 

    getSign: function(assert) {
      var str = auth.authorization({
          verb: 'GET'
        , key: "0PN5J17HBGZHT7JJ3X82"
        , secret: "uV3F3YluFJax1cknvbcGwgjvx4QpvB+leU8dUj2o"
        , resource: '/johnsmith/photos/puppy.jpg'
        , date: 'Tue, 27 Mar 2007 19:36:42 +0000'
      });    
      assert.equal("AWS 0PN5J17HBGZHT7JJ3X82:xXjDGYUmKxnwqr5KXNPGldn5LbA=", str);
    },

    putSign: function(assert) {
      var str = auth.authorization({
          verb: 'PUT'
        , key: "0PN5J17HBGZHT7JJ3X82"
        , secret: "uV3F3YluFJax1cknvbcGwgjvx4QpvB+leU8dUj2o"
        , resource: '/johnsmith/photos/puppy.jpg'
        , contentType: 'image/jpeg'
        , date: 'Tue, 27 Mar 2007 21:15:45 +0000'
      });    
      assert.equal("AWS 0PN5J17HBGZHT7JJ3X82:hcicpDDvL9SsO6AkvxqmIWkmOuQ=", str);
    },
    
    listSign: function(assert) {
      var str = auth.authorization({
          verb: 'GET'
        , key: "0PN5J17HBGZHT7JJ3X82"
        , secret: "uV3F3YluFJax1cknvbcGwgjvx4QpvB+leU8dUj2o"
        , resource: '/johnsmith/'
        , date: 'Tue, 27 Mar 2007 19:42:41 +0000'
      });    
      assert.equal("AWS 0PN5J17HBGZHT7JJ3X82:jsRt/rhG+Vtp88HrYL706QhE4w4=", str);    
    },

    fetchSign: function(assert) {
      var str = auth.authorization({
          verb: 'GET'
        , key: "0PN5J17HBGZHT7JJ3X82"
        , secret: "uV3F3YluFJax1cknvbcGwgjvx4QpvB+leU8dUj2o"
        , resource: '/johnsmith/?acl'
        , date: 'Tue, 27 Mar 2007 19:44:46 +0000'
      });    
      assert.equal("AWS 0PN5J17HBGZHT7JJ3X82:thdUi9VAkzhkniLj96JIrOPGi0g=", str);
    },
    
    deleteSign: function(assert) {
      var str = auth.authorization({
          verb: 'DELETE'
        , key: "0PN5J17HBGZHT7JJ3X82"
        , secret: "uV3F3YluFJax1cknvbcGwgjvx4QpvB+leU8dUj2o"
        , amazonHeaders: auth.canonicalizeHeaders({
            'x-amz-date': 'Tue, 27 Mar 2007 21:20:26 +0000'
          })
        , resource: '/johnsmith/photos/puppy.jpg'
        // NB:- omit date if there's an x-amz-date
      });    
      assert.equal("AWS 0PN5J17HBGZHT7JJ3X82:k3nL7gH3+PadhTEVn5Ip83xlYzk=", str);
    },

    uploadSign: function(assert) {
      var str = auth.authorization({
          verb: 'PUT'
        , key: "0PN5J17HBGZHT7JJ3X82"
        , secret: "uV3F3YluFJax1cknvbcGwgjvx4QpvB+leU8dUj2o"
        , contentType: 'application/x-download'
        , md5: '4gJE4saaMU4BqNR0kLY+lw=='
        , amazonHeaders: auth.canonicalizeHeaders([
            [ 'x-amz-acl', 'public-read' ],
            [ 'X-Amz-Meta-ReviewedBy', 'joe@johnsmith.net' ],
            [ 'X-Amz-Meta-ReviewedBy', 'jane@johnsmith.net' ],
            [ 'X-Amz-Meta-FileChecksum', '0x02661779' ],
            [ 'X-Amz-Meta-ChecksumAlgorithm', 'crc32' ],
          ])
        , resource: '/static.johnsmith.net/db-backup.dat.gz'
        , date: 'Tue, 27 Mar 2007 21:06:08 +0000'
      });    
      assert.equal("AWS 0PN5J17HBGZHT7JJ3X82:C0FlOtU8Ylb9KDTpZqYkZPX91iI=", str);
    },

    listBucketSign: function(assert) {
      var str = auth.authorization({
          verb: 'GET'
        , key: "0PN5J17HBGZHT7JJ3X82"
        , secret: "uV3F3YluFJax1cknvbcGwgjvx4QpvB+leU8dUj2o"
        , resource: '/'
        , date: 'Wed, 28 Mar 2007 01:29:59 +0000'
      });    
      assert.equal("AWS 0PN5J17HBGZHT7JJ3X82:Db+gepJSUbZKwpx1FR0DLtEYoZA=", str);    
    },
    
    unicodeSign: function(assert) {
      var str = auth.authorization({
          verb: 'GET'
        , key: "0PN5J17HBGZHT7JJ3X82"
        , secret: "uV3F3YluFJax1cknvbcGwgjvx4QpvB+leU8dUj2o"
        // NB:- This isn't quite encodeURIComponent('/dictionary/français/préfère')
        //      nor is it escape('/dictionary/français/préfère')... :(
        //      And note how Amazon's example string has different case for
        //      the encoded values of é and ç. Love it.
        , resource: '/dictionary/fran%C3%A7ais/pr%c3%a9f%c3%a8re'
        , date: 'Wed, 28 Mar 2007 01:49:49 +0000'
      });    
      assert.equal("AWS 0PN5J17HBGZHT7JJ3X82:dxhSBHoI6eVSPcXJqEghlUzZMnY=", str);        
    }
    
}
