const succesCodes = [
    200
]

module.exports = function sendResponse(res, code, data) {
    let result;
    if (succesCodes.includes(code)) {
        result = { code, data }
    } else {
        result = { code, error: data }
    }
    if (typeof data === "object" && !Array.isArray(data)) {
        if(data.hasOwnProperty("error") && data.code) code = data.code
        result = Object.assign({ code }, data)
    }
    res.status(code).json(result)
}
