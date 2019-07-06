/** Rewrite */
const express = require("express")
const bodyParser = require('body-parser')
const Fuzzy = require("../../util/Util.js").FuzzySearch
const sendResponse = require("./responseConstructor.js")
const requiredParams = require("./reqParams.js")

const rateLimiter = require("./rateLimiter.js")

const App = express()
App.disable('x-powered-by');
App.set('trust proxy', true)
App.use(bodyParser.json())
App.use(bodyParser.urlencoded({ extended: true }));

App.use((req, res, next) =>{
    res.set({ // why not do that here?
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
        "accept": "application/json",
        "x-powered-by": "Cloudy 1.1"
    }) 
    next();
})

//App.use("/api/*",rateLimiter)



const dataRoute = require("./routes/data.js");

App.use("/api/data", dataRoute.router)

module.exports = class APIManager {
    constructor(client) {
        this.client = client
        this.token = this.client.config.API.token
        this.fuzzySearch = new Fuzzy(this.client)

        this.app = App
    }

    init() {
        App.post("/api/requestsong", requiredParams({ name: "title", type: "string" }), this.requestSongRoute.bind(this))
        App.post("/api/like", this.giveSongLike.bind(this))
        const infoRoutes = dataRoute.init(this.client, this)
        for (const route in infoRoutes) {
            dataRoute.router.get(route, (req, res) => {
                let response = infoRoutes[route](req)
                if(response instanceof Promise)
                    return response
                        .then(data => sendResponse(res, 200, data))
                        .catch(err => {
                            console.error(err)
                            sendResponse(res, 501, err)
                        })
                return sendResponse(res, 200, response)
            })
        }
        let { port } = this.client.config.API

        App.use("/api/*", (req, res, next) => {
            res.status(404).json({error: "Api route not found"})
            next()
        })
        console.log("starting API on ", port)
        this.app.listen(port, () => console.log("API listening on port", port))
    }

    requestSongRoute(req, res) {
        const { client } = this
        
        let requested = client.queue.request(req.body.title)
        if (requested === false) {
            return sendResponse(res, 404, "Song not found")
        } else if (requested === "full") {
            return sendResponse(res, 413, "Song queue is full")
        } else if (typeof requested === "string" && requested.startsWith("ratelimit")) {
            return sendResponse(res, 429, {
                error: "Song is rate limited",
                tryagain: parseInt(requested.split(" ")[1])
            })
        } else if (requested === "repeat") {
            return sendResponse(res, 429, "This song is already playing")
        }
        client.util.debug(3, `Somebody successfully requested a song '${req.body.title}'`)

        return sendResponse(res, 200, { status: "Found and Requested", data: req.body.title })
    }

    giveSongLike(req, res) {
        const { body } = req
        if(!(body.title && body.id)) return sendResponse(res, 400, "Not enough data in request")
        console.log("Song liked",body)
        return sendResponse(res, 200, {
            status: "Request succesful",
            info: "Work in progess",
            body: body
        })
    }
}