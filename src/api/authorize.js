const { token } = require("../../config.json").API
const sendResponse = require("./responseConstructor.js")

module.exports = function authorization(req, res, next) {
    
    if(!req.headers.hasOwnProperty("authorization")) {
        return sendResponse(res, 401, "No Authorization header found.")
    } else 
    if(token !== req.headers.authorization) {
        return sendResponse(res, 403, "Invalid token.")
    }

    next()
}