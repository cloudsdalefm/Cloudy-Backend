const { Writable, Readable } = require('stream');
const config = require("../config.json")
const fs = require("fs")

const debug = require("../util/Util").debug

class ShoutStream extends Writable {
    constructor(client) {
        super()
        this.client = client
        this.shout = client.shout;
    }

    _write(chunk, encoding, next) {
        let res = this.shout.send(chunk, chunk.length)
        if(res != 0) {
            this.client.disconnected()
        }
        
        let delay = Math.abs(this.shout.delay());

        setTimeout(next, delay);
    };
}
module.exports.Writable = ShoutStream


//Fucc this broken shit.
class FileReadStream extends Readable {
    constructor(file, chunkSize) {
        super()
        this.reset();
        this.file = file;
        this.chunkSize = chunkSize;
        this.buffer = new Buffer(this.chunkSize);

        this.start();
    }

    reset() {
        this.file = null;
        this.fileSize = null;
        this.totalBytesRead = null;
        this.chunkSize = null;
        this.fd = null;
    };

    start() {
        this.fd = fs.openSync(this.file, 'r');

        var stats = fs.fstatSync(this.fd);
        this.fileSize = stats.size;
        this.totalBytesRead = 0;
    };

    _read() {

        if (this.totalBytesRead >= this.fileSize) {
            fs.closeSync(this.fd);
            this.push(null);
            return;
        }

        let chunkSize = this.chunkSize
        if(this.totalBytesRead+this.chunkSize > this.fileSize) chunkSize = this.fileSize % this.chunkSize
        let bytesRead = fs.readSync(this.fd, this.buffer, 0, chunkSize, this.totalBytesRead);

        this.totalBytesRead += bytesRead;
        this.push(this.buffer);
        
    };
}

module.exports.Readable = function(songPath) {
    let exists = fs.existsSync(songPath)
    if(!exists) return exists
    
    let fileStream = new FileReadStream(songPath, config.chunkSize);

    return fileStream
}