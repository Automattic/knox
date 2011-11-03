var s3 = require('knox');
var http = require('http');

var client = s3.createClient({key:YOUR-KEY, secret:YOUR-SECRET, bucket:YOUR-BUCKET });

var options = {
  host: 'www.google.com',
  port: 80,
  path: '/images/logo_sm.gif'
};


http.get(options, function(res) { 
    var headers = {};
    headers['Content-Length'] = res.headers['content-length'];
    headers['Content-Type'] = res.headers['content-type'];
    headers['x-amz-acl'] = 'private';

    client.putStream(res, '/google.logo.gif', headers, function(err, res, hash, uploadSize) {
        if(err) {
          console.log(err);
        }
        else {
          console.log("Successfully store "+uploadSize+" bytes with hash "+hash);
        }

      });
  });

