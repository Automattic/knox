var knox = require('..')
  , utils = knox.utils
  , assert = require('assert');

module.exports = function(){
  var client, client2, clientUsWest2;

  try {
    var auth = require("./auth.json");
    assert.notEqual(auth.bucket, auth.bucket2, 'Bucket should not equal bucket2.');

    client = knox.createClient(auth);

    var auth2 = utils.merge({}, auth);
    auth2.bucket = auth.bucket;
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
  } catch (err) {
    console.error(err);
    console.error('The tests require ./auth to contain a JSON string with key, ' +
                  'secret, bucket, bucket2, and bucketUsWest2 in order to run tests. ' +
                  'Both bucket and bucketUsWest2 must exist and should not ' +
                  'contain anything you want to keep. bucketUsWest2 should be ' +
                  'created in the us-west-2 (Oregon) region, not the default ' +
                  'region.');
    process.exit(1);
  }

  return { client: client, client2: client2, clientUsWest2: clientUsWest2 };
};
