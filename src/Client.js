const nodeshout = require("nodeshout")
const EventEmitter = require('events');
const StreamManager = require("./StreamManager.js")
const APImanager = require("./api/manager.js")
const debug = require("../util/Util.js").debug
const Queue = require("./Queue.js")

class Client extends EventEmitter {
    constructor() {
        super()
        this.config = require("../config.json")
        this.util = require("../util/Util")
        this.rest = new APImanager(this, this.config.API.token)
        this.stream = new StreamManager(this)
        this.queue = new Queue(this, this.config.playlist)
        this.shout = null
        this.lastDisconnect = 0
        this.reconnecting = false;
        this._createdAt = Date.now()
        this.playingSince = 0
        this._lastBumperTime = this.hourNow
    }

    init() {
        let config = this.config.iceCast
        nodeshout.init();
        this.shout = nodeshout.create();
        debug(this.shout.setHost(config.host), "Set ice Host -", config.host)
        debug(this.shout.setPort(config.port), "Set ice Port -", config.port)
        debug(this.shout.setUser(config.user), "Set ice User -", config.user)
        debug(this.shout.setPassword(config.password), "Set ice Password")
        debug(this.shout.setDescription(config.description), "Set ice Description -", config.description)
        debug(this.shout.setMount(config.mount), "Set ice Mount -", config.mount)
        debug(this.shout.setFormat(config.format), `Set ice Format - ${config.format === 1 ? "mp3" : "ogg"}`)

        for(const info in config.audioInfo) {
            debug(this.shout.setAudioInfo(info, config.audioInfo[info]), `Set audio info ${info} to ${config.audioInfo[info]}`)
        }

        debug(1, "Opening shout connection...")
        let conn = this.shout.open()
        debug(conn, "Open shout connection")
        return conn
    }

    songEND() {
        if(this._lastBumperTime < this.hourNow || (this._lastBumperTime === "23" && this.hourNow === "00")) {
            this._lastBumperTime = this.hourNow
            this.util.debug(1, `Playing "Its ${this.hourNow}" bumper, no metadata set.`)
            return this.stream.play(this.queue.getBumper(true), true)
        } else if(this.queue.songsPlayed % this.config.bumpers.every === 0) {
            this.queue.songsPlayed++
            this.util.debug(1, "Playing random default bumper")
            return this.stream.play(this.queue.getBumper(), true)
        }
        this.stream.play(this.queue.playNow())
    }

    strartPlaying() {
        this.playingSince = Date.now();
        if(this.stream.playing) return false
        this.stream.play(this.queue.playNow())
        debug(0, "Started playing!")
        return true
    }

    startAPI() {
        debug(0, "Initiating rest API at port",this.config.API.port)
        this.rest.init(this)
    }

    disconnected() {
        if(this.reconnecting) return
        this.lastDisconnect = Date.now()
        this.reconnecting = true
        debug("100", "Shout disconnected! Retrying every 10s")
        debug(this.shout.close(), "Closing shout!")
        this.stream.pausePlaying()
        this._attemptReconnect()
    }

    _attemptReconnect() {
        if(this.init() === 0) return this._reconnectedTreshold()
        let trys = 1;
        let inter = setInterval(() => {
            let connTry = this.shout.open()
            debug(connTry, "Attempting to connect!", trys, "time!")
            trys++
            if(connTry === 0) {
                clearTimeout(inter)
                this._reconnectedTreshold()
            }
        }, this.config.attemptReconnectEvery)
    }

    _reconnectedTreshold() {
        debug(0, "Connected back!")
        this.stream.resumePlaying()
        setTimeout(() => {
            this.reconnecting = false
        }, 5000)
    }

    get status() {
        let description = ""
        if(client.reconnecting) description += "Client is not connected to iceCast. "
        if(!client.stream.playing && client.stream.paused)  description += "Stream is paused. "
        else if(!client.stream.playing && !client.stream.paused) description += "Stream is not playing anything. "
        if(description.length === 0) description = "All systems operational, CloudFM ready to play!"
        else description += "Api is operational"
        return {
            "Client connected": !client.reconnecting,
            "Stream playing": client.stream.playing,
            "API": true,
            "HoomanReadable": description
        }
    }

    get uptime() {
        return Date.now() - this._createdAt
    }

    get hourNow() {
        return new Date(Date.now() + 21600000).toLocaleString().split(" ")[1].split(":")[0]
    }
}

module.exports = Client


