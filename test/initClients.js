var knox = require('..')
  , utils = knox.utils
  , assert = require('assert');

module.exports = function(){
  var client, client2, clientUsWest2, clientBucketWithDots;

  try {
    var auth = require('./auth.json');

    assert(auth.bucket, 'bucket must exist');
    assert(auth.bucket2, 'bucket2 must exist');
    assert(auth.bucketUsWest2, 'bucketUsWest2 must exist');
    assert(auth.bucketWithDots, 'bucketWithDots must exist');
    assert.notEqual(auth.bucket, auth.bucket2, 'bucket should not equal bucket2.');
    assert.notEqual(auth.bucket, auth.bucketUsWest2, 'bucket should not equal bucketUsWest2.');
    assert.notEqual(auth.bucket, auth.bucketWithDots, 'bucket should not equal bucketWithDots.');
    assert.notEqual(auth.bucket2, auth.bucketUsWest2, 'bucket2 should not equal bucketUsWest2.');
    assert.notEqual(auth.bucket2, auth.bucketWithDots, 'bucket2 should not equal bucketWithDots.');

    client = knox.createClient(auth);

    var auth2 = utils.merge({}, auth);
    auth2.bucket = auth2.bucket2;
    client2 = knox.createClient(auth2);

    var authUsWest2 = utils.merge({}, auth);
    authUsWest2.bucket = auth.bucketUsWest2;
    // Without this we get a 307 redirect
    // that putFile can't handle (issue #66). Later
    // when there is an implementation of #66 we can test
    // both with and without this option present, but it's
    // always a good idea for performance
    authUsWest2.region = 'us-west-2';
    clientUsWest2 = knox.createClient(authUsWest2);

    var authBucketWithDots = utils.merge({}, auth);
    authBucketWithDots.bucket = authBucketWithDots.bucketWithDots;
    clientBucketWithDots = knox.createClient(authBucketWithDots);
  } catch (err) {
    console.error(err);
    console.error('The tests require test/auth.json to contain JSON with ' +
                  'key, secret, bucket, bucket2, bucketUsWest2, and bucketWithDots in order ' +
                  'to run tests. All three buckets must exist and should not ' +
                  'contain anything you want to keep. bucketUsWest2 should ' +
                  'be created in the us-west-2 (Oregon) region, not the ' +
                  'default region and bucketWithDots should have a name ' +
                  'that contains at least one "."');
    process.exit(1);
  }

  return { client: client, client2: client2, clientUsWest2: clientUsWest2, clientBucketWithDots: clientBucketWithDots };
};
