const CloudFM = require("./CloudFM")
const client = new CloudFM.Client();
const debug = CloudFM.Debug

debug(3, "Setting and connecting to IceCast")
client.init()

client.strartPlaying()
client.startAPI()

global.client = client
//stream.on('finish', function(wat) {console.log("end")})