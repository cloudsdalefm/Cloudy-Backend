const Fuse = require("fuse.js")

module.exports = class Search {
  constructor(client) {
    this.client = client
    this.list = new Array()
  }

  setList(list = []) {
    this.list = list.map(s => s.toLowerCase())
    return this
  }

  find(query, max = 5) {
    const result = new Map()
    let tags = query.toLowerCase().split(" ")
    console.log("tags:",tags)
    this.list.find(title => {
      for(const tag of tags) {
        if(title.includes(tag)) {
          console.log("--- found ---")
          console.log("title:", title)
          console.log("tag:", tag)
          let start = 0
          if(result.has(title))
            start += result.get(title)
          result.set(title, start+(tag.length/title.length))
        }
      }
    })
    return Array.from(result.entries()).sort((a, b) => b[1] - a[1])//.map(e => e[0])
  }
}

class FuzzySearch {
    constructor(client) {
        this.client = client
        this.list = new Array()
        this.options = {
            shouldSort: true,
            tokenize: true,
            matchAllTokens: true,
            threshold: 0.6,
            location: 0,
            distance: 100,
            maxPatternLength: 32,
            minMatchCharLength: 2,
            keys: ["t"]
        };
        
        this.fuse = new Fuse(this.list, this.options)
    }

    /**
     * 
     * Takes array as parameter and changes it to array of object with id for Fuse.js
     * 
     * @param {any} [list=[]] 
     * @returns
     */
    setList(list = []) {
        list = list.map(e => {return {t:e}})
        this.list = list
        this.fuse = new Fuse(list, this.options)
        return this
    }

    find(title, resLength = 5) {
        let res = this.fuse.search(title)
        if(res.length < 1) return false
        let songs = res.slice(0,resLength)
        return songs.map(e=>e.t)
    }
}