# Cloudy - A CloudsdaleFM back-end streaming application

This is very messy and terrible piece of app, I was still learning all workings of audio streaming and ice cast workings while making it.

# Running it yourself.

## Installation

Well, you can. I don't know why would you but it is possible.

Hard part will be installing all node-modules.
Most of them should work with just `npm install` but i don't promise as they might have became outdated.
You might have problems to install `nodeshout` since it's super old, don't want to build properly and is overall mess, you might need to get it's C libraries and add functions to node using FFI yourself.

## Configuration

You have 3 files you need to fix, `/config.json`, `/data/partners.json` and `/data/scheluder.json`.
I provided examples in case you need help

## How to start it

Well, if you just have one music folder and don't want to mess with it after you start you can do `npm start`.

But, if you want to chagne music folders or files mid working without needing to restart it, start a REPL session (just `node`) and require index.js with `require('./index.js')`, you'll have few 'commands' aka. functions you can use, but I don't remember them.. 

All i can tell is that they all are in `client` object.

# Credits

All the code you see is made by me, easiest way to contact me is @ Discord - BlackBird#9999
<br/>I'll happly help with anything you ask.. if I have time
