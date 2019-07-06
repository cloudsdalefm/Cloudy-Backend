const fs = require("fs")
const config = require("../config.json")

class FolderManager {
    constructor() {
        this.ID = 0
        this.all = config.folders
    }

    get get() {
        return this.all[this.ID]
    }
    next() {
        this.ID++
        if(this.ID > this.all.length -1) this.ID = 0
        return this.get
    }
    use(f) {
        if(!this.all.includes(f)) return false
        this.ID = this.all.indexOf(f)
        return this.get
    }
}

module.exports = class Queue extends Map{
    constructor(client, path) {
        super([
            ["folder", new FolderManager()],
            ["bumpers", {global: new Array(), time: new Array()}],
            ["default", null],
            ["custom", new Array()],
            ["history", new Array()]
        ])
        this.client = client
        this.now = null
        this.playingInfo = {
            startedPlaying: new Date()
        }
        this.next = null
        this.playingCustom = false
        this.songsPlayed = 0
        this.songsCooldown = config.songTimeout*60 // in seconds <= mins * 60s
        this.requestCooldown = new Map();
        this.loadDefaultSongs()
        this.loadBumpers()

        this.move() // what? it works...
    }

    get length() {
        return this.get("custom").length
    }

    get full() {
        let res = this.get("custom").slice()
        res.unshift(this.next)
        return res
    } 
    get totalSongs() {
        return this.get("default").length
    }

    // getter... kinda
    getTrackInfo(name) {
        let parts = name.split(" - ")
        return {
            track: name,
            title: parts.slice(1).join(" - "),
            artist: parts[0]
        }
    }

    get nowPlayingInfo() {
        if(this.playingInfo.track !== this.now) {
            this.playingInfo.playingFor = parseInt(Date.now() - this.playingInfo.startedPlaying)
            Object.assign(this.playingInfo, this.getTrackInfo(this.now))
        } else {
            this.playingInfo.playingFor = parseInt(Date.now() - this.playingInfo.startedPlaying)
        }
        return this.playingInfo
    }
    get history() {
        return this.get("history") // .map(title => typeof title === "string" ? this.getTrackInfo(title) : title )
    }
    get nextPlaying() {
        return this.getTrackInfo(this.next)
    }

    filePath(name) {
        return `${this.client.config.playlist}/${this.get("folder").get}/${name}.mp3`
    }

    getBumper(time = false) {
        let bumpers = this.get("bumpers")
        let db = bumpers[time ? "time" : "global"]
        if(time) 
            return `${this.client.config.playlist}/${this.client.config.bumpers["timeFolder"]}/godzina ${this.client.hourNow}.mp3`
        return `${this.client.config.playlist}/${this.client.config.bumpers["folder"]}/${db[this.client.util.random(db.length)]}.mp3`
    }

    loadDefaultSongs() {
        let songs = fs.readdirSync(`${config.playlist}/${this.get("folder").get}`)
        songs = songs.map(e => e.slice(0, -4))
        this.set("default", songs)
        this.client.rest.fuzzySearch.setList(songs)
        return songs
    }

    loadBumpers() {
        let global = fs.readdirSync(`${config.playlist}/${config.bumpers.folder}`)
        global = global.map(e => e.slice(0, -4))

        let time = fs.readdirSync(`${config.playlist}/${config.bumpers.timeFolder}`)
        time = time.map(e => e.slice(0, -4))

        this.set("bumpers", { global, time })
        return { global, time }
    }

    getNext() {
        let custom = this.get("custom")
        let def = this.get("default")
        if(custom.length > 0) {
            this.next = custom.shift()
            this.playingCustom = true
        } else {
            this.next = def[this.client.util.random(def.length)]
            if(this.next === this.now) this.next = def[this.client.util.random(def.length)]
            this.playingCustom = false
        }
        if(!def.includes(this.next)) {
            this.client.util.debug(2, `Next song ${this.next} not found in ${this.get("folder").get} folder but was requested, skipping...`)
            return this.getNext()
        }
        return this
    }

    move() {
        if(!this.get("default").includes(this.next)) {
            this.now = this.next
            this.client.util.debug(2, `Next song not found, but was set to be played, skipping`)
            return this.getNext()
        }
        let history = this.get("history")
        history.unshift(this.now)
        if(history.length > config.API.historyLength) history.pop()
        this.now = this.next
        this.getNext()
        return this
    }

    nextFolder() {
        const folder = this.get("folder").next()
        this.loadDefaultSongs()
        this.getNext()
        return folder
    }

    setFoler(name) {
        let res = this.get("folder").use(name)
        if(!res) return false
        this.loadDefaultSongs()
        this.getNext()
        return true
    }

    get nowPlayingPath() {
        return `${this.client.config.playlist}/${this.get("folder").get}/${this.now}.mp3`
    }

    playNow() {
        this.move()
        this.songsPlayed++
        this.playingInfo.startedPlaying = Date.now()
        this.requestCooldown.set(this.now, Date.now() + this.songsCooldown*1000)
        return this.nowPlayingPath
    }

    request(song) {
        if(!this.get("default").includes(song)) {
            this.client.util.debug(2, `Someone tried to request ${song} but i can't find it.`)
            return false
        }
        if(this.now === song) return "repeat"

        let timestamp = Date.now()
        if(this.requestCooldown.has(song)) {
            let canPlayAt = this.requestCooldown.get(song)
            if(canPlayAt > timestamp) return `ratelimit ${canPlayAt - timestamp}`
            this.requestCooldown.delete(song)
        }

        if(this.length >= this.client.config.API.queueSize) return "full"
        
        this.get("custom").push(song)
        this.requestCooldown.set(song, timestamp + this.songsCooldown*1000)
        if(!this.playingCustom) this.getNext()
        return true
    }
}