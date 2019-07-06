const express = require("express")
const config = require("../../config.json")

rateLimits = new Map(); // 10 per 10s

const { time, amount } = config.API.rateLimitsTimeouts
const { token } = config.API

function upRateLimit(ip) {
    let now = Date.now()
    let db = rateLimits

    if(!db.has(ip) || db.get(ip).timestamp < now)
        return db.set(ip, { amount: 1, timestamp: now + time })

    return db.get(ip).amount++
}

function findRateLimit(ip) {
    let status = true
    let retryIn = 0
    let timestamp = Date.now()
    let db = rateLimits
    if(db.has(ip)) {
        let user = db.get(ip)
        if(user.amount >= amount && user.timestamp > timestamp) {
            status = false
            retryIn = user.timestamp - timestamp
        }
    }
    return { status, retryIn }
}

function checkAuthorization(req) {
    if(req.headers.hasOwnProperty("authorization")) {
        return (token === req.headers.authorization) 
    } else return false
}

module.exports = function ratelimiter(req, res, next) {
    // how to do this when all ip is the same.. 127.0.0.1 :Thonk:
    if(checkAuthorization(req)) return next()

    let { ip } = req
    let rlStatus = findRateLimit(ip)
    if(!rlStatus.status) return res.status(429).json({
        code: 429, 
        error: "You are ratelimited", 
        tryAgainIn: rlStatus.retryIn
    })
    upRateLimit(ip)

    next()
}