/**
 * Represens chunk builder that concatenates string chunks in the readable stream.
 * @constructor
 */
function ChunkBuilder(){
    this.data = '';
    this.completed = false;
    this.error = null;
}

/**
 * Creates a new chunk builder for the Readable stream.
 * @param {Object} stream Readable stream.
 * @param {Function} callback A callback function used to receive concatenated data.
 * @returns {Object} An instance of the chunk builder.
 * @function
 */
ChunkBuilder.from_stream = function(stream, callback){
    var obj = new this();
    stream.on('data', function(chunk) {this.data += chunk.toString('binary');}.bind(obj));
    stream.on('error', function(e) { this.error = e; this.completed = true }.bind(obj));
    stream.on('end', function() {
        this.completed = true;
        callback(this.error, this.data);
    }.bind(obj));
    return obj;
};

exports.ChunkBuilder = ChunkBuilder;