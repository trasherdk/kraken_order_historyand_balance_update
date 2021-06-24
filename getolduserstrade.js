var cron = require("node-cron")
var conn =  require("./database");
const KrakenClient = require('kraken-api');
var sleep = require("./helpers").sleep;
var axios = require("axios")


var coinPairsObj = {
    'BTCUSDT': 'XBTUSDT',
    'XRPBTC': 'XRPXBT',
    'LINKBTC': 'LINKXBT',
    'XLMBTC': 'XXLMXXBT',
    'ETHBTC': 'XETHXXBT',
    'XMRBTC': 'XMRXBT',
    'XMRBTC': 'XXMRXXBT',
    'ADABTC': 'ADAXBT',
    'QTUMBTC': 'QTUMXBT',
    'TRXBTC': 'TRXXBT',
    'XRPBTC': 'XXRPXXBT',
    'XRPUSDT': 'XRPUSDT',
    'LTCUSDT': 'LTCUSDT',
    'EOSBTC': 'EOSXBT',
    'ETCBTC': 'XETCXXBT',
    'DASHBTC': 'DASHXBT',
}

// cron.schedule("*/10 * * * *", async function() {

    conn.then(async db => {

        // var serverip = await axios.get('https://checkip.amazonaws.com/');

        

        // handle success
        // "35.153.9.225" === serverip.data

        // var tradingIP = serverip.data.trim()
        // console.log(tradingIP, "===> trading ip")
        // var users = await db.collection("users").find({trading_ip: tradingIP}).toArray();

        // if (users.length > 0) {
            // console.log(users.length, "================> total")
            // for (let index = 0; index < users.length; index++) {

                // var id = users[index]["_id"].toString()

                var getoffset = await db.collection("kraken_credentials").findOne({user_id: "5c09142afc9aadaac61dd0fd"});
                var offset = 0;
                if (getoffset != null && getoffset["offset_field"] != null) {
                    
                    offset = getoffset["offset_field"]

                } 
     
                var krakenuser = await db.collection("kraken_credentials").findOne({user_id: "5c09142afc9aadaac61dd0fd", api_key: {$exists: true}, api_secret: {$exists: true}, api_key: {$ne: ""}, api_secret: {$ne: ""}, api_key: {$ne: null}, api_secret: {$ne: null}})
                console.log(krakenuser, "----> kraken user")

                // api_secret: '2bPmjql0h6QHNp1Fn0UqCllt8Cwg8qD0R5UV5UZMOiMgLotWTjPPw+97RrQ6P7Gz1Nr2VJ/RgcszVHNTiF+eJA==',
                // api_key: 'lUebCZ1d6lIBzKYgkCLZrHEaJDs8ZouX2txJk3bX+H5xpsi9iurydmqC',
                // 
                // if (krakenuser.length > 0) {
            
                //     for (let index = 0; index < krakenuser.length; index++) {
            
                        var apikey = krakenuser["api_key"]
                        var apisecret = krakenuser["api_secret"]
                        var userID = krakenuser["user_id"]
                        const kraken       = new KrakenClient(apikey, apisecret);
        
                        // var count = await getHistoryCount(kraken);
        
                        // var total = await db.collection("user_trade_history_kraken").aggregate([
                        //     {
                        //       '$match': {
                        //         'user_id': userID
                        //       }
                        //     }, {
                        //       '$count': 'total'
                        //     }
                        //   ]).toArray();
        
                        // console.log(count, "==> count")
        
                        // if (count) {
        
                        // if (total.length > 0) {
                        //     total = total[0].total - 50;
                        // }
                        
                        for (offset; offset <= 600; offset+=50) {
                            
                            try {
                                
                                var history = await kraken.privateMethod("TradesHistory", {'ofs': offset}) // {error: [], result: {zusd: '36.334', xxbt: '432.66'}}
                            } catch(e) {
                                console.log(e, " ===== > error ")
                                // await db.collection("kraken_credentials").updateOne({user_id: userID}, {$set: {"history_update": new Date(), offset_field: offset}}, {upsert: true}, (err, doc) => {
                                //     if (err) throw err;
                                //     console.log("===> updated kraken_credentials with new date")
                                // })
                                return 
                            }
                            
                            
                            await sleep(5000)
            
                            console.log(JSON.stringify(history))
        
                            if (history.error.length <= 0) {
        
                                for (const property in history.result.trades) {
                                    console.log(`${property}: ${history.result.trades[property]} =====> data from kraken api for the trades`);
                                    var symbol = history.result.trades[property].pair;
                                    for (const prop in coinPairsObj) {
                                        if (coinPairsObj[prop] == symbol) {
                                            console.log(history.result.trades[property].pair, "===> before")
                                            history.result.trades[property].pair = prop
                                            console.log(history.result.trades[property].pair, "===> after")
                                        }
                                    }
        
                                    let oldTrade = {
                                        number: property,
                                        value: history.result.trades[property],
                                        new: true,
                                        offset_field: offset
                                    }
            
                                    await db.collection("user_trade_history_kraken").updateOne({$and: [{user_id: userID}, {"trades.number": property}]}, {$set: {"trades": oldTrade}}, {upsert: true}, (err, doc) => {
                                        if (err) throw err;
                                        console.log("===> updated user_trade_history_kraken with new trade history")
                                    })
        
                                    await db.collection("kraken_credentials").updateOne({user_id: userID}, {$set: {offset_field: offset}}, {upsert: true}, (err, doc) => {
                                        if (err) throw err;
                                        console.log("===> updated kraken_credentials with new date")
                                    })
                                }
        
        
                                console.log("done")
                
                            }
                
                            
                            
                        }
        
                        // }
                        // await db.collection("kraken_credentials").updateOne({user_id: userID}, {$set: {"history_update": new Date(), offset_field: offset}}, {upsert: true}, (err, doc) => {
                        //     if (err) throw err;
                        //     console.log("===> updated kraken_credentials with new date")
                        // })
            
                    // }
                    
                // }

            // }
        // }
    })

    
   
// })

async function getHistoryCount(kraken) {
    try {
        var history = await kraken.privateMethod("TradesHistory", {'ofs': 0}) // {error: [], result: {zusd: '36.334', xxbt: '432.66'}}
    } catch(e) {
        console.log(e)
        return false
    }
    if (history.error.length <= 0) {

        return history.result.count;

    }

    await sleep(5000)
}
