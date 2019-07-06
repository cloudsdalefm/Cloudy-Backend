const sendResponse = require("./responseConstructor.js")

module.exports = requiredParams = (...names) => (req, res, next) => {
    for(const name of names) {
        if(typeof name === "object") {
            if(!req.body.hasOwnProperty(name.name) && typeof req.body[name.name] !== name.type)
                return sendResponse(res, 400, "Not enough parameters")
        } else if(!req.body.hasOwnProperty(name))
            return sendResponse(res, 400, "Not enough parameters")
    }
    next()
} 