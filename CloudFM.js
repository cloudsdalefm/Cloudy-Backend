let utils = require("./util/Util.js")
module.exports = {
    Client: require("./src/Client.js"),
    Util: utils,
    Debug: utils.debug,
    Queue: require("./src/Queue.js"),
    StreamManager: require("./src/StreamManager.js"),
    RestAPI: require("./src/api/manager.js"),
    version: "0.8.0"
}