const nodeshout = require("nodeshout")
const ShoutStream = require("../util/Util").ShoutStream
const fs = require("fs")

module.exports = class StreamManager {
    constructor(client) {
        this.client = client
        this.stream;
        this.fileStream;
        this.bumperPlayed = false;
        this.playing = false
        this.paused = false
        this._startPlayingAt = Date.now();
        this.listeners = ["finish"]
    }

    setMetadata(title = null) {
        let metadata = nodeshout.createMetadata();
        if(title === null) title = this.client.queue.now
        metadata.add("song", title)
        this.client.util.debug(1, `Playing and setting metadata "title" to "${title}"`)
        this.client.util.debug(this.client.shout.setMetadata(metadata), `Set metadata`)
        return title
    }

    play(path, bumper = false) {
        if(this.playing) {
            this.client.util.debug(2, `Tried to play while stream is already playing, stopping old stream.`)
            this.stream.removeAllListeners("finish")
            this.stream.end()
        }
        if(bumper && !this.bumperPlayed) {
            this.fileStream = fs.createReadStream(path);
            let shoutStream = this.fileStream.pipe(new ShoutStream(this.client));
            this.bumperPlayed = true;
            return this._register(shoutStream)
        }
        this.bumperPlayed = false;

        this.fileStream = fs.createReadStream(path);

        let shoutStream = this.fileStream.pipe(new ShoutStream(this.client));
        this.setMetadata()
        this._register(shoutStream)

        return shoutStream
    }

    _register(shoutStream) {
        this.stream = shoutStream
        this.playing = true
        
        shoutStream.on("finish", () => { //arrow function <3
            if(this.paused) return
            this.playing = false
            this.client.songEND()
        })

    }

    pausePlaying() {
        if(this.playing) {
            this.playing = false
            this.paused = true
            this._startPlayingAt = null
            this.fileStream.pause()
        }
    }

    resumePlaying() {
        if(this.paused) {
            this.playing = true
            this.paused = false
            this._startPlayingAt = Date.now()
            this.client.songEND()
            this.fileStream.resume()
        }
    }

    get uptime() {
        if(this._startPlayingAt === null) return 0
        return Date.now() - this._startPlayingAt
    }
}