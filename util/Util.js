let createStream = require("./helperStreams.js")
module.exports = {
    createStream: createStream.Readable,
    debug: require("./shoutDebug.js"),
    random: function(max) {
        return Math.floor(Math.random()*max) 
    },
    ShoutStream: createStream.Writable,
    FuzzySearch: require("./FuzzySearch.js"),
}

/**
 * "shorter" version of Object.defineProperty, it's ment to be used in colsoe.
 * Function must be `function() { return this }`
 * @param {object} obj 
 * @param {string} name 
 * @param {function} func 
 * @param {string} type 
 */
global.SetObjectProp = (obj, name, func, type = "value") => {
    if(typeof obj === "undefined") return "Object, Name, Function, Type. Function must be `function() { return this }`"
    if(typeof obj !== "object" || typeof name !== "string" || typeof func !== "function" ||  typeof type !== "string") return "Nope. Look without parameters."

    let props = {}
    if(["get", "set", "value"].includes(type))
        props[type] = func.bind(obj)
    else 
        return "NOOOOO you can set prop, get, set"

    Object.defineProperty(obj, name, props)
}