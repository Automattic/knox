var s3 = require('../../knox');
var http = require('http');

var client = s3.createClient({key:'MY-KEY', secret:'MY-SECRET', bucket:'MY-BUCKET' });


var headers = {};
headers['x-amz-acl'] = 'private';


var aclPublic = '<?xml version="1.0" encoding="UTF-8"?>\
<AccessControlPolicy xmlns="http://s3.amazonaws.com/doc/2006-03-01/">\
  <Owner>\
    <ID>CANONICAL-ID</ID>\
    <DisplayName></DisplayName>\
  </Owner>\
  <AccessControlList>\
    <Grant>\
      <Grantee xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="CanonicalUser">\
        <ID>CANONICAL ID</ID>\
        <DisplayName></DisplayName>\
      </Grantee>\
      <Permission>FULL_CONTROL</Permission>\
    </Grant>\
    <Grant>\
      <Grantee xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="Group">\
        <URI>http://acs.amazonaws.com/groups/global/AllUsers</URI> \
      </Grantee>\
      <Permission>READ</Permission>\
    </Grant>\
  </AccessControlList>\
  </AccessControlPolicy>';

var aclPrivate= '<?xml version="1.0" encoding="UTF-8"?>\
<AccessControlPolicy xmlns="http://s3.amazonaws.com/doc/2006-03-01/">\
  <Owner>\
    <ID>CANONICAL ID</ID>\
    <DisplayName></DisplayName>\
  </Owner>\
  <AccessControlList>\
    <Grant>\
      <Grantee xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="CanonicalUser">\
        <ID>CANONICAL ID</ID>\
        <DisplayName></DisplayName>\
      </Grantee>\
      <Permission>FULL_CONTROL</Permission>\
    </Grant>\
  </AccessControlList>\
  </AccessControlPolicy>';




var acl = new Buffer(aclPublic);


client.putAcl(acl, '/google.logo.gif', {}, function(err, res) {
        if(err) {
          console.log(err);
        }
        else {
          console.log("OK");
        }
      });


