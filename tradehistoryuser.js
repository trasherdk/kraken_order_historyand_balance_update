var cron = require("node-cron")
var conn =  require("./database");
const KrakenClient = require('kraken-api');
var sleep = require("./helpers").sleep;
var axios = require("axios")
var ObjectId = require("mongodb").ObjectID;

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
    'XRPUSDT': 'XRPUSDT',
    'XRPBTC': 'XXRPXXBT',
    'LTCUSDT': 'LTCUSDT',
    'EOSBTC': 'EOSXBT',
    'ETCBTC': 'XETCXXBT',
    'DASHBTC': 'DASHXBT',
}

cron.schedule("*/2 * * * *", async function() {

    conn.then(async db => {

        var serverip = await axios.get('https://checkip.amazonaws.com/');

        
        // handle success
        // "35.153.9.225" === serverip.data

        var tradingIP = serverip.data.trim()
        // console.log(tradingIP, "===> trading ip")
       
        let pipeline = [
            {
              "$match": {
                "api_key": {
                  "$exists": true,
                  "$nin": [
                    "",
                    null
                  ]
                },
                "api_secret": {
                  "$exists": true,
                  "$nin": [
                    "",
                    null
                  ]
                }
              }
            },
            {
              "$project": {
                "my_id": {
                  "$toString": "$user_id"
                }
              }
            },
            {
              "$lookup": {
                "from": "users",
                "let": {
                  "user_id_obj": {
                    "$toObjectId": "$my_id"
                  }
                },
                "pipeline": [
                  {
                    "$match": {
                      "trading_ip": tradingIP,
                      "$expr": {
                        "$eq": [
                          "$_id",
                          "$$user_id_obj"
                        ]
                      },
                      "application_mode": {
                        "$in": [
                          "both",
                          "live"
                        ]
                      },
                      "kraken_is_key_valid": {
                        "$ne": "yes"
                      }
                    },
                  },
                  {
                    "$project": {
                      "_id": 1,
                      "is_modified_trade_history_kraken":1
                    }
                  }
                ],
                "as": "users"
              }
            },
            {
              "$match": {
                "$expr": {
                  "$gt": [
                    {
                      "$size": "$users"
                    },
                    0
                  ]
                }
              }
            },
            {
              "$project": {
                "users": 1
              }
            },
            {
              "$unwind": "$users"
            },
            {
              "$sort": {
                "users.is_modified_trade_history_kraken": 1
              }
            },
            {
              "$project": {
                "users._id": 1
              }
            },
            {
              "$limit": 1
            }
          ]
        var users = await db.collection("kraken_credentials").aggregate(pipeline).toArray()


        // api_secret: '2bPmjql0h6QHNp1Fn0UqCllt8Cwg8qD0R5UV5UZMOiMgLotWTjPPw+97RrQ6P7Gz1Nr2VJ/RgcszVHNTiF+eJA==',
        // api_key: 'lUebCZ1d6lIBzKYgkCLZrHEaJDs8ZouX2txJk3bX+H5xpsi9iurydmqC',
        if (users.length > 0) {
            
            // for (var index = 0; index < users.length; index++) {
                console.log(users[0], "=====> first user in the array")
                var id = users[0]["users"]["_id"].toString()
                var userKraken = await db.collection("kraken_credentials").findOne({user_id: id, api_key: {$exists: true}, api_secret: {$exists: true}, api_key: {$ne: ""}, api_secret: {$ne: ""}, api_key: {$ne: null}, api_secret: {$ne: null}})//.sort({history_update: 1})
                var userID    = id
                // console.log(userKraken)
                // api_secret: '2bPmjql0h6QHNp1Fn0UqCllt8Cwg8qD0R5UV5UZMOiMgLotWTjPPw+97RrQ6P7Gz1Nr2VJ/RgcszVHNTiF+eJA==',
                // api_key: 'lUebCZ1d6lIBzKYgkCLZrHEaJDs8ZouX2txJk3bX+H5xpsi9iurydmqC',
                // 
                if (userKraken) {
            
                //     for (let index = 0; index < userKraken.length; index++) {
            
                        var apikey    = userKraken["api_key"]
                        var apisecret = userKraken["api_secret"]
                        userID    = userKraken["user_id"]
                        const kraken       = new KrakenClient(apikey, apisecret);                  

                        try {
                            var history = await kraken.privateMethod("TradesHistory") // {error: [], result: {zusd: '36.334', xxbt: '432.66'}}
                        } catch(e) {
                            console.log(e, " ===== > error ")
                            await db.collection("users").updateOne({_id: new ObjectId(userID)}, {$set: {"is_modified_trade_history_kraken": new Date()}}, (err, doc) => {
                                if (err) throw err;
                                console.log("===> updated is_modified_trade_history_kraken with new date in catch")
                            })
                            await db.collection("kraken_credentials").updateOne({user_id: userID}, {$set: {"history_update": new Date()}}, {upsert: true}, (err, doc) => {
                                if (err) throw err;
                                console.log("===> updated kraken_credentials with new date")
                            })
                            return 
                        }// END of catch(e)
                        
                        await sleep(8000)
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
                                }// END of for (const prop in coinPairsObj)

                                let oldTrade = {
                                    number: property,
                                    value: history.result.trades[property],
                                    new: true
                                }// END of let oldTrade 
        
                                await db.collection("user_trade_history_kraken").updateOne({$and: [{user_id: userID}, {"trades.number": property}]}, {$set: {"trades": oldTrade}}, {upsert: true}, (err, doc) => {
                                    if (err) throw err;
                                    console.log("===> updated user_trade_history_kraken with new trade history")
                                })
                            }// END of for (const property in history.result.trades)
                            await db.collection("users").updateOne({_id: new ObjectId(userID)}, {$set: {"is_modified_trade_history_kraken": new Date()}}, (err, doc) => {
                                if (err) throw err;
                                console.log("===> updated is_modified_trade_history_kraken with new date in after history")
                            })
                            await db.collection("kraken_credentials").updateOne({user_id: userID}, {$set: {"history_update": new Date()}}, {upsert: true}, (err, doc) => {
                                if (err) throw err;
                                console.log("===> updated kraken_credentials with new date")
                            })
                        }// END of if (history.error.length <= 0)

                        await db.collection("users").updateOne({_id: new ObjectId(userID)}, {$set: {"is_modified_trade_history_kraken": new Date()}}, (err, doc) => {
                            if (err) throw err;
                            console.log("===> updated is_modified_trade_history_kraken with new date in after history")
                        })
                        
                        await db.collection("kraken_credentials").updateOne({user_id: userID}, {$set: {"history_update": new Date()}}, {upsert: true}, (err, doc) => {
                            if (err) throw err;
                            console.log("===> updated kraken_credentials with new date")
                        })
            
                //     }// END of for (let index = 0; index < userKraken.length; index++) {
                    
                } else {
                    console.log(userID, "^^^^^^^^^^^^^^^^^^^^")
                    await db.collection("users").updateOne({_id: new ObjectId(userID)}, {$set: {"is_modified_trade_history_kraken": new Date()}}, (err, doc) => {
                        if (err) throw err;
                        console.log("===> updated is_modified_trade_history_kraken with new date in else block")
                    })
                }

            // } // END of for (var index = 0; index < users.length; index++) {

        } // END of (users.length > 0)

        
    }) // END of conn.then(async db => {

    
   
}) //END of cron.schedule("*/5 * * * *", async function() {

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
