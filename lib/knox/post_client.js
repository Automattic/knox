/*!
 * knox - Client
 * Copyright(c) 2010 Yammer, Inc <dev@yammer.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var utils = require('./utils')
  , knox = require('./client')
  , crypto = require('crypto')
  , formpart = require('./formpart')
  , sys = require('sys')
  , http = require('http');
  
  
var PostClient = module.exports = exports = function PostClient(options) {
  this.client = knox.createClient(options);
  this.filename = null;
  this.stream = null;
  this.acl = null;
  this.callback = null;
  this.fileBuffer = null;
  this.postRequest = null;
};

PostClient.prototype.partReceived = function(form, part) {
  var self = this;
  console.log("GOT PART");
  console.log(part.headers);
  var fieldname = part.headers['content-disposition'].match(/name=\"(.*?)\"/i)[1]
    , filename = part.headers['content-disposition'].match(/filename=\"(.*?)\"/i)[1]
    , boundary = form.headers['content-type'].match(/boundary=([^;]+)/i)[1]
    , filenameLengthDifference = self.filename.length - filename.length
    , policy = self.policy()
    , formParts = [
          formpart.createPart('key', self.filename, {boundary: boundary}).content(),
          formpart.createPart('acl', self.acl, {boundary: boundary}).content(),
          formpart.createPart('AWSAccessKeyId', this.client.key, {boundary: boundary}).content(),
          formpart.createPart('policy', policy.policy, {boundary: boundary}).content(),
          formpart.createPart('signature', policy.signature, {boundary: boundary}).content()].join('')
    , endBoundary = "\r\n" + formpart.createPart(null, null, {boundary: boundary}).endingBoundary()
    , contentLength = form.bytesExpected + filenameLengthDifference + formParts.length;
  
  utils.merge(this.headers, {
    'Content-Type': 'multipart/form-data; boundary=' + formpart.defaultBoundary
    , 'Content-Length': contentLength
  });
  
  self.postRequest = self.client.request('POST', '', this.headers); // Bucketname is filled in automatically
  self.postRequest.addListener('response', function(postResponse) {
    // Grab the response from s3
    var response = '';
    postResponse.addListener('data', function(text) { response += text; });
    postResponse.addListener('end', function() {
      console.log("GOT RESPONSE FROM AMAZON: " + postResponse.statusCode);
      console.log(response);
      if (postResponse.statusCode == 200) {
        fn(postResponse, response);
      } else {
        var errorMsg = "ERROR - uploadpost AMAZON FAILURE: " + postResponse.statusCode + ": " + response;
        console.log(errorMsg);
        throw errorMsg;
      }
    });
  });
    // TODO: remake the headers with the correct format
  this.postRequest.write(formParts);
  var filePartHeader = '--' + boundary + '\r\nContent-Disposition: form-data; name="' + fieldname + '"; filename="' + self.filename + '"' +
      (part.headers['content-type'] ? '\r\nContent-Type:' + part.headers['content-type'] : '') + "\r\n\r\n";
  this.postRequest.write(filePartHeader);
var bytesWritten = '';
  part.addListener('data', function(data){ bytesWritten += data; self.postRequest.write(data); });
  part.addListener('end', function(data){ 
    
    // PICK UP HERE, TRY NON ASCII FILES for size!
    console.log('ORIGINAL BYTES EXPECTED: ' + form.bytesExpected);
    console.log('NEW CONTENT LENGTH: ' + contentLength);
    console.log(contentLength - form.bytesExpected + " ")
    console.log('filename length diff: ' + filenameLengthDifference);
    console.log('formParts length: ' + formParts.length);
    console.log('byteswritten: ' + bytesWritten.length);
    console.log(contentLength - form.bytesExpected + " BYTES DIFFERENCE EXPECTED");
    console.log(bytesWritten.length + formParts.length + filePartHeader.length + endBoundary.length + " BYTES WRITTEN");
    self.postRequest.end(endBoundary);
//    sys.print((formParts + filePartHeader + bytesWritten + endBoundary));
    console.log("==================== END WRITTEN ===============");
  });
}

PostClient.prototype.postStream = function(stream, filename, acl, headers, fn){
  var self = this;
  self.filename = filename;
  self.stream = stream;
  self.acl = acl;
  this.headers = headers;
  if ('function' == typeof headers) {
    fn = headers;
    this.headers = {};
  };
  self.callback = fn;

  // Setup the stream to pipe into the S3 upload
  var bytesReceived = '';
  self.stream.addListener('data', function(data){
      bytesReceived += data.toString('binary');
  });

  self.stream.addListener('end', function(){
    console.log(bytesReceived.length + " BYTES RECEIVED");
//    sys.print(bytesReceived);
    console.log("==================== END RECEIVE ==================");
  });
  
};

PostClient.prototype.expiration = function(expireInSecs) {
  expireInSecs = expireInSecs || 60*10; // 10 minute default
  var date = new Date();
  date.setSeconds(date.getSeconds() + expireInSecs);
  return [date.getUTCFullYear(), date.getUTCMonth()+1, date.getUTCDate()].join('-') + 
      'T' + 
      [date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()].join(':') + 'Z';
}

PostClient.prototype.policy = function(expireInSecs){
  var self = this;
  var policy = JSON.stringify({
      expiration: self.expiration(expireInSecs)
      , conditions: [
        {bucket: self.client.bucket}
        , {acl: self.acl}
        , ["eq", "$key", self.filename]
      ]
    })
  , t = console.log(policy)
  , encodedPolicy = (new Buffer(policy, 'ascii')).toString('base64')
  , policySignature = crypto.createHmac('sha1', this.client.secret).update(encodedPolicy).digest('base64');
  return {policy: encodedPolicy, signature: policySignature};
}

exports.createPostClient = function(options){
  return new PostClient(options);
};
