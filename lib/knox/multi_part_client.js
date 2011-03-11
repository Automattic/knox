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
  this.receivedLength = null;
  this.uploadLength = null;
  this.callback = null;
  
  // Stupid flags
  this.uploadBegun = false;
  this.streamFinished = false;
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
  self.callback = fn;
  
  
  try {
    // Setup the stream to handle the actual S3 upload
    self.stream.addListener('data', function(data){
      self.receivedLength += data.length;
      self.parts[self.partCount] = self.parts[self.partCount] || '';
      self.parts[self.partCount] += data.toString('binary');
      
      // Tell anyone who cares how much we've received
      self.stream.emit('dataReceived', self.receivedLength);
      
      if (self.uploadBegun && self.parts[self.partCount].length > 5542880) { // Amazon minimum data part length
        self.uploadPart(self.partCount);
        self.partCount += 1;  // Lock out the last part
      }
    });
    // Finish the upload
    self.stream.addListener('end', function(){
      self.streamFinished = true;
      
      // For some foul reason, this gets called multiple times
      if (self.uploadBegun && !self.lastPartUploaded) {
        self.lastPartUploaded = true; 
        self.uploadPart(self.partCount);
      }
    });
    
    console.log("Creating amazon s3 file: " + filename);
    // Open the s3 multipart file
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
      self.uploadBegun = true;
      if (self.streamFinished) {
        self.uploadPart(self.partCount);
      }
    });
  });
  clientRequest.end();
};

MultiPartClient.prototype.uploadPart = function(partNumber, catalog) {
  var self = this;
  if (!this.parts[partNumber]) { // All data was uploaded already
    return;
  }
  var data = self.parts[partNumber];
  var catalogue = catalog || {};
  catalogue.md5 =  crypto.createHash('md5').update(data);
  catalogue.length = data.length;
  catalogue.uploadAttempts = catalogue.uploadAttempts+1 || 1;
  self.partCatalogue[partNumber] = catalogue;
  
  partRequest = self.client.request(
      'PUT' 
      , self.filename + '?partNumber=' + partNumber + '&uploadId=' + self.uploadId
      , {'Content-Length': self.parts[partNumber].length}
      , catalogue.md5.digest('base64'));

  partRequest.addListener('response', function(partResponse) {
    var response = '';
    partResponse.addListener('data', function(text) { response += text; });
    partResponse.addListener('end', function() {
      if (partResponse.statusCode == 200) {
        self.partCatalogue[partNumber].etag = partResponse.headers.etag;
        self.uploadLength += self.parts[partNumber].length;
        
        // Tell anyone who cares how much we've received
        self.stream.emit('partUploaded', self.uploadLength);
        
        // TODO: free the parts[partNumber] data?
        if (self.isUploadComplete()) {
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
  partRequest.end();
};

MultiPartClient.prototype.uploadComplete = function(retryNumber) {
  var self = this;
  var body = self.completeXML();

  endRequest = self.client.request('POST', '/' + self.filename + '?uploadId=' + self.uploadId, {'Content-Length': body.length});
  endRequest.addListener('response', function(endResponse) {
    var responseBody = '';
    endResponse.addListener('data', function(text) { responseBody += text; });
    endResponse.addListener('end', function() {
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
      }
      if (self.callback) {
        self.callback();
      }
    });
  });
  endRequest.write(self.completeXML());
  endRequest.end();
};

MultiPartClient.prototype.isUploadComplete = function() {
  var self = this;
  for (part in self.parts) {
    if (!self.partCatalogue[part] || !self.partCatalogue[part].etag) {
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