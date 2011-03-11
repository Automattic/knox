
// opts can include boundary and filename
var Part = module.exports = exports = function Part(name, value, opts) {
  this.name = name;
  this.value = value;
  this.boundary = (opts && opts.boundary) || exports.defaultBoundary;
  this.filename = opts && opts.filename;
}


Part.prototype = {
	
  //returns the Content-Disposition header
  header: function() {
	  var header;
	  
    if (this.filename) {
	    header = "Content-Disposition: form-data; name=\"" + this.name + 
  	            "\"; filename=\"" + this.filename;
  	} else {
      header = "Content-Disposition: form-data; name=\"" + this.name + "\"";
  	}
  	
	  return "--" + this.boundary + "\r\n" + header + "\r\n\r\n";
  },

  //calculates the size of the Part
  sizeOf: function() {
	  var valueSize;
	  valueSize = this.value.length;
  	return valueSize + this.header().length + 2; 
  },

  // Writes the Part out to a writable stream that supports the write(data) method
  // You can also pass in a String and a String will be returned to the callback
  // with the whole Part
  // Calls the callback when complete
  write: function(stream, callback) {
	  // Write the Headers and content
	  stream.write(this.content());
	  callback && callback();
  },
  
  content: function() {
    return this.header() + this.value + "\r\n";
  },
  
  endingBoundary: function() {
    return '--' + this.boundary + '--' + "\r\n";
  }
}

exports.defaultBoundary = '48940923NODERESLTER3890457293';

exports.createPart = function(name, value, opts){
  return new Part(name, value, opts);
};
