require("colors")

const ErrorTypes = {
    "0": "SUCCESS",
    "-1": "INSANE",
    "-2": "NOCONNECT",
    "-3": "NOLOGIN",
    "-4": "SOCKET",
    "-5": "MALLOC",
    "-6": "METADATA",
    "-7": "CONNECTED",
    "-8": "UNCONNECTED",
    "-9": "UNSUPPORTED",
    "-10": "BUSY",
    "1": "AWAIT", //custom messages
    "2": "ERROR",
    "3":"INFO",
    "100": "CRITICAL ERROR"
};

function format(err) {
    if(typeof err != "string") err = err.toString()
    let msg = `[Unknown Error ${err.bold}]`
    if(ErrorTypes.hasOwnProperty(err)) {
        msg = `[${ErrorTypes[err]}]`
    }
    if(err === "0") msg = msg.green
    if(err === "100" || err === "2") msg = msg.red
    else msg = msg.yellow
    return msg
}

module.exports = function(err, ...Args) {
    console.log(format(err),`<${new Date().toLocaleString().split(" ")[1]}>`, Args.join(" "))
}