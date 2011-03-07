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
  , crypto = require('crypto');

/**
 * Initialize a `MultiPartClient` with the given `options`.
 * 
 * Required:
 *
 *  - `key`     amazon api key
 *  - `secret`  amazon secret
 *  - `bucket`  bucket name string, ex: "learnboost"
 *
 * @param {Object} options
 * @api public
 */

var MultiPartClient = module.exports = exports = function MultiPartClient(options) {
  this.client = knox.createClient(options);
  this.uploadId = null;
  this.parts = [];
  this.partCatalogue = []; // Maps part_number => {etag, md5, size}
  this.partCount = 1; // S3 uses natural numbers
  this.filename = null;
  this.stream = null;
  this.lastPartUploaded = false;
};

/**
 * PUT the given `stream` as `filename` with optional `headers`.
 *
 * @param {Stream} stream
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

MultiPartClient.prototype.putStream = function(stream, filename, headers, fn){
  var self = this;
  self.filename = filename;
  self.stream = stream;
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  };
  
  
  try {
    // Setup the stream to handle the actual S3 upload
    self.stream.addListener('data', function(data){
      self.parts[self.partCount] = self.parts[self.partCount] || '';
      if (self.parts[self.partCount].length + data.length > 5000000) {
        self.stream.pause(); // We're going to do some time consuming stuff, hold on.
        self.parts[self.partCount] += data;
        self.uploadPart(self.partCount);
        self.partCount += 1;
        self.stream.resume();
      } else {
        self.parts[self.partCount] += data; 
      }
    });
    // Finish the upload
    self.stream.addListener('end', function(){
      // For some foul reason, this gets called multiple times
      if (!self.lastPartUploaded) {
        self.lastPartUploaded = true; 
        self.uploadPart(self.partCount);
      }
    });
    
    // Pause our stream while we wait for S3 to open a multi-part file
    self.stream.pause();
    
    // Open the s3 multipart file, the end callback here will unpause the upload datastream
    self.beginMultiPartUpload(filename, headers);
    
  } catch(e) {
    throw e;
  }
};

MultiPartClient.prototype.beginMultiPartUpload = function(filename, headers) {
  var self = this;
  headers = utils.merge({'x-amz-acl': 'private'}, headers || {});
  clientRequest = self.client.request('POST', filename + '?uploads', headers);
  clientRequest.addListener('response', function(initResponse) {
    var response_xml = '';
    initResponse.addListener('data', function(xml) { response_xml += xml; });
    initResponse.addListener('end', function() {
      // TODO: Check for errors
      self.uploadId = self.getNode(response_xml, 'UploadId');
      // Start the upload!
      self.stream.resume();
    });
  });
  clientRequest.end();
  console.log("Creating amazonS3 file: " + filename);
};

MultiPartClient.prototype.uploadPart = function(partNumber, catalog) {
  var self = this;
  console.log("UPLOADING PART "  + partNumber);
  if (!this.parts[partNumber]) { // All data was uploaded already
    return;
  }
  var data = self.parts[partNumber];
  var catalogue = catalog || {};
  catalogue.md5 =  crypto.createHash('md5').update(data);
  catalogue.length = data.length;
  catalogue.uploadAttempts = catalogue.uploadAttempts+1 || 1;
  self.partCatalogue[partNumber] = catalogue;
  
  console.log("UPLOADING " + self.parts[partNumber].length);
  partRequest = self.client.request(
      'PUT' 
      , self.filename + '?partNumber=' + partNumber + '&uploadId=' + self.uploadId
      , {'Content-Length': self.parts[partNumber].length}
      , catalogue.md5.digest('base64'));

  partRequest.addListener('response', function(partResponse) {
    console.log("response!");
    var response = '';
    partResponse.addListener('data', function(text) { console.log("."); response += text; });
    partResponse.addListener('end', function() {
      if (partResponse.statusCode == 200) {
        catalogue.etag = partResponse.headers.etag;
        // TODO: free the parts[partNumber] data?
        console.log('status 200 from amz');
        if (self.isUploadComplete()) {
          console.log('sending uploadComplete');
          self.uploadComplete();
        }
      } else {
        var errorMsg = "ERROR - uploadPart AMAZON FAILURE: " + partResponse.statusCode + ": " + response;
        console.log(errorMsg);
        // TODO: Determine based on error if this is recoverable
        if (catalogue.uploadAttempts < 2) {
          self.uploadPart(partNumber, catalogue);
        } else {
          throw errorMsg;
        }
      }
    });
  });
  partRequest.write(self.parts[partNumber], 'binary');
  clientRequest.end();
};

MultiPartClient.prototype.uploadComplete = function(retryNumber) {
  var self = this;
  var body = self.completeXML();
  endRequest = self.client.request('POST', '/' + self.fileName + '?uploadId=' + self.uploadId, {'Content-Length': body.length});
  endRequest.on('response', function(endResponse) {
    var responseBody = '';
    endResponse.addListener('data', function(text) { responseBody += text; });
    endResponse.on('end', function() {
      var code = self.getNode(responseBody, 'Code');
      var error = self.getNode(responseBody, 'Message');
      if (code && error) {
        // TODO: Can we retry?
        // http://docs.amazonwebservices.com/AmazonS3/latest/API/index.html?mpUploadInitiate.html
        var errorMsg = "ERROR - uploadComplete AMAZON FAILURE: " + endResponse.statusCode + ": " + responseBody;
        console.log(errorMsg);
        if (retryNumber < 3) {
          console.log("Retrying complete upload...attempt " + retryNumber);
          self.uploadComplete(retryNumber || 1);
        } else {
          throw errorMsg;
        }
        console.log("UPLOAD FINISHED, GREAT SUCCESS");
      }
    });
  });
};

MultiPartClient.prototype.isUploadComplete = function() {
  var self = this;
  for (part in self.partCatalogue) {
    if (!self.partCatalogue[part].etag) {
      return false;
    }
  }
  return true;
};

MultiPartClient.prototype.getNode = function (xml, tag) {
  var rex = new RegExp('\<' + tag + '>(.*)\<\/' + tag + '\>');
  var m = rex.exec(xml);
  return(m ? m[1] : false);
};


MultiPartClient.prototype.completeXML = function () {
  var self = this;
  var r = '\n<CompleteMultipartUpload>\n';
  for (part in self.parts) {
    r += '  <Part>\n'
       + '    <PartNumber>' + part + '</PartNumber>\n'
       + '    <ETag>' + self.partCatalogue[part].etag + '</ETag>\n'
       + '  </Part>\n';
  }
  r += '</CompleteMultipartUpload>';
  return(r);
};

exports.createMultiPartClient = function(options){
  return new MultiPartClient(options);
};