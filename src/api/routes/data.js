const express = require("express")
const fetch = require("node-fetch")
const localData = {
    partners: require("../../../data/partners.json"),
    scheluder: require("../../../data/scheluder.json")
}
const config = require("../../../config.json").API
const fs = require("fs")
const authorize = require("../authorize.js");
const sendResponse = require("../responseConstructor.js")
const requiredParams = require("../reqParams.js")

const info = express.Router()

const code = 200

info.get("/partners/:partner?", (req, res) => {
    const { partners } = localData
    if(typeof req.params.partner !== "undefined") {
        const { partner } = req.params
        if(partners.hasOwnProperty(partner)) 
            return sendResponse(res, 200, {
                partners: partners[partner]
            })
    }
    sendResponse(res, 200, { partners })
})


info.post("/partners", 
        authorize, 
        requiredParams({ name: "type", type: "string" }, { name: "name", type: "string"}, "data"),
        (req, res) => {
    if(typeof req.body.data !== "object" && req.body.data !== null) 
        return sendResponse(res, 400, "Invalid parameters") // i know i have function for that stfu
    const { partners } = localData
    const { type, data } = req.body
    const name = req.body.name.toLowerCase()
    let newData = null
    switch(type) {
        case "UPDATE": {
            if(!partners.hasOwnProperty(name)) 
                return sendResponse(res, 400, "Invalid partner")
            if(data.hasOwnProperty("icon") && !data.icon.startsWith("https://")) 
                return sendResponse(res, 400, "Invalid icon (only https allowed)")
            if(!data.hasOwnProperty("webpage") || !data.webpage.startsWith("http"))
                return sendResponse(res, 400, "Invalid webpage")
            newData = { [name]: data }
            break;
        }
        case "ADD": {
            if(partners.hasOwnProperty(name)) return sendResponse(res, 400, "Partner already exists")
            if(data.hasOwnProperty("icon") && !data.icon.startsWith("https://")) 
                return sendResponse(res, 400, "Invalid icon (only https allowed)")
            if(!data.hasOwnProperty("webpage") || !data.webpage.startsWith("http"))
                return sendResponse(res, 400, "Invalid webpage")
            newData = { [name]: data }
            break;
        }
        case "DELETE": {
            if(!partners.hasOwnProperty(name)) 
                return sendResponse(res, 400, "Invalid partner")
            newData = { [name]: null }
        }
    }
    if(updateData("partners", newData))
        return sendResponse(res, 200, {
            updated: "partners",
            with: newData
        })
    return sendResponse(res, 501, "Data update error.")
})


info.get("/scheluder/:day?", (req, res) => {
    const { scheluder } = localData
    if(typeof req.params.day !== "undefined") {
        const { day } = req.params
        const dayNr = parseInt(day)
        if(!isNaN(dayNr) && dayNr > 0 && dayNr < 7)
            return sendResponse(res, 200, {
                scheluder: Object.values(scheluder)[dayNr-1] 
            })
        else if(scheluder.hasOwnProperty(day)) 
            return sendResponse(res, 200, {
                scheluder: scheluder[day]
            })
    }
    sendResponse(res, 200, { scheluder })
})

info.post("/scheluder", 
        authorize, 
        requiredParams({ name: "type", type: "string" }, "day", "data"), 
        (req, res) => {
    if(typeof req.body.data !== "object" && req.body.data !== null) 
        return sendResponse(res, 400, "Invalid parameters")
    const { scheluder } = localData
    const { type, day, data } = req.body
    let newData = null
    switch(type) {
        case "UPDATE": {
            const dayNr = parseInt(day)
            if(!isNaN(dayNr)) {
                if(dayNr < 1 || dayNr > 7)
                    return sendResponse(res, 400, "Invalid day")
                newData = { [Object.keys(scheluder)[dayNr-1]]: data }
            } else if(scheluder.hasOwnProperty(day)) {
                newData = { [day]: data }
            } else return sendResponse(res, 400, "Invalid day")
            break;
        }
        case "ADD": {
            return sendResponse(res, 400, "You can't add new week day")
            break;
        }
        case "DELETE": {
            const dayNr = parseInt(day)
            let updateDay = day
            if(!isNaN(dayNr)) {
                if(dayNr < 1 || dayNr > 7)
                    return sendResponse(res, 400, "Invalid day")
                updateDay = Object.keys(scheluder)[dayNr-1]
            } else if(!scheluder.hasOwnProperty(day))
                return sendResponse(res, 400, "Invalid day")
            
            newData = {}
            if(req.body.time && typeof req.body.time === "string") 
                newData[updateDay] = { [req.body.time]: null }
            else {
                newData[updateDay] = {}
                for(const time of Object.keys(scheluder[updateDay])) {
                    newData[updateDay][time] = null
                }
            }
        }
    }

    if(updateData("scheluder", newData))
        return sendResponse(res, 200, {
            updated: "scheluder",
            with: newData
        })
    return sendResponse(res, 501, "Data update error.")
})

const updateData = (target, newData = {}) => {
    if(!localData[target]) return false
    if(typeof newData !== "object") return false
    const obj = localData[target]
    for(const [ key, val ] of Object.entries(newData)) {
        if(newData[key] === null) 
            obj[key] && delete obj[key]
        else if(obj.hasOwnProperty(key) && typeof obj[key] === "object") {
            for(const hour of Object.keys(newData[key])) {
                if(newData[key][hour] === null) 
                    obj[key][hour] && delete obj[key][hour]
                else
                    obj[key][hour] = newData[key][hour]
            }
        }
        else obj[key] = val
    }
    fs.writeFileSync(`./data/${target}.json`, JSON.stringify(obj), { encoding: "UTF-8" })
    return true
}

let shoutData = {
    listeners: 0,
    updatedAt: 0
}
const getListeners = () => {
    if(shoutData.updatedAt+config.iceRefresh*1000 > Date.now()) return Promise.resolve(shoutData)
    return fetch("http://localhost:2137/status-json.xsl")
        .then(res => {
            if (!res.ok) {
                shoutData.listeners = 0
                return false
            }
            return res.json()
        })
        .then(body => {
            if (!body) return shoutData
            const data = body.icestats.source
            if (typeof data === "object" && Array.isArray(data)) {
                if (data[0].hasOwnProperty("title"))
                    shoutData.listeners = data[0].listeners
                else
                    shoutData.listeners = data[1].listeners
            } else if (typeof data === "object" && data.hasOwnProperty("title"))
                shoutData.listeners = data.listeners
            shoutData.updatedAt = Date.now()
            return shoutData
        })
}

info.get("/debug", (req, res) => {
    sendResponse(res, 200, {
        headers: req.headers
    })
})

const createInfoRoutes = (client, api) => {
    const { queue } = client
    return ({
        "/queue": () => ({
            length: queue.length,
            queue: queue.full
        }),
        "/songs": req => {
            const songs = queue.get("default")
            if(typeof req.query.page !== "undefined") {
                let page = parseInt(req.query.page) || 1
                let pageSize = req.query.size || 20
                if(isNaN(page)) page = 1
                if(isNaN(pageSize)) pageSize = 20
                return {
                    pages: Math.ceil(songs.length / pageSize),
                    data: songs.slice(page*pageSize-pageSize, page*pageSize)
                }
            }
            return songs
        },
        "/next": () => queue.nextPlaying,
        "/now": () => ({ track: queue.now}),
        "/playing": () => {
            let data = queue.nowPlayingInfo
            return getListeners().then(shoutData => ({
                    track: data.track,
                    title: data.title,
                    artist: data.artist,
                    listeners: shoutData.listeners,
                    duration: "Maybe never",
                    playingFor: data.playingFor
                })
            )
        },
        "/listeners": () => getListeners(),
        "/history": () => queue.history,
        "/searchsong": req => {
            if(typeof req.query.title === "undefined") return { code: 400, error: "You have to provide title in url query form" }
            let length = 5
            if(typeof req.query.length !== "undefined") {
                length = parseInt(req.query.length)
                if(isNaN(length))
                    length = 5
            }
            let search = api.fuzzySearch.find(req.query.title, length)
            let res = { exists: true, titles: search }
            if (!search) res = { exists: false, titles: null }
            return res
        },
        "/status": req => ({
            data: {
                unit: "ms",
                serverTime: new Date().toLocaleString(),
                clientUptime: client.uptime,
                streamUptime: client.stream.uptime,
                lastDisconnect: client.lastDisconnect,
                playingSince: client.playingSince,
                songsPlayed: queue.songsPlayed,
                songsTotal: queue.totalSongs,
                bumperAfter: client.config.bumpers.every - (queue.songsPlayed % client.config.bumpers.every),
                status: client.status,
            }
        }),
        "/like": req => {
            let title = req.query.title
            return { data: "Work in progress" }
        }
    })
}

module.exports = {
    router: info,
    init: createInfoRoutes,
    update: updateData
}
/*
fetch("https://www.cloudsdalefm.net/api/data/partners", {
    method: "POST",
    headers: {
        "content-type": "application/json",
        "Authorization": "YbawuxgobaAJ.Wcu.8hZi7L"
    },
    body: JSON.stringify({
        type: "UPDATE",
        name: "Draconager",
        data: {
            "webpage": "https://www.youtube.com/channel/UCDR5iezmOMrd_tfzD4gAn7w"
        }
    })
}).then(res => res.json()).then(console.log)

fetch("https://www.cloudsdalefm.net/api/data/scheluder", {
    method: "POST",
    headers: {
        "content-type": "application/json",
        "Authorization": "YbawuxgobaAJ.Wcu.8hZi7L"
    },
    body: JSON.stringify({
        "type": "UPDATE",
        "day": 7,
        data: {
            "19:00": "Spojlerowanie z Berliettem - Omawiamy odcinki Sezonu 8"
        }
    })
}).then(res => res.json()).then(console.log)

*/