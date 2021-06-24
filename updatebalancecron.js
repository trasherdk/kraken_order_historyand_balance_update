var cron = require("node-cron")
var conn =  require("./database");
var ObjectId = require("mongodb").ObjectID;
const KrakenClient = require('kraken-api');
var sleep = require("./helpers").sleep;
const axios = require('axios');


cron.schedule("*/10 * * * *", function() {
    
  conn.then(async db => {
        
    var serverip = await axios.get('https://checkip.amazonaws.com/');

        
    // handle success
    // "35.153.9.225" === serverip.data

    var tradingIP = serverip.data.trim()

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
                "is_balance_updated_kraken":1
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
          "users.is_balance_updated_kraken": 1
        }
      },
      {
        "$project": {
          "users._id": 1
        }
      },
      {
        "$limit": 10
      }
    ]
     
    var users = await db.collection("kraken_credentials").aggregate(pipeline).toArray()

    // console.log(tradingIP, "===> trading ip")
    // var users = await db.collection("users").find({trading_ip: tradingIP}).toArray();

    // api_secret: '2bPmjql0h6QHNp1Fn0UqCllt8Cwg8qD0R5UV5UZMOiMgLotWTjPPw+97RrQ6P7Gz1Nr2VJ/RgcszVHNTiF+eJA==',
    // api_key: 'lUebCZ1d6lIBzKYgkCLZrHEaJDs8ZouX2txJk3bX+H5xpsi9iurydmqC',
    if (users.length > 0) {
      console.log(users.length, "================> total")
      for (var index = 0; index < users.length; index++) {

        console.log("user number ==> ", users)
        var id = users[index]["users"]["_id"].toString()
        var userKraken = await db.collection("kraken_credentials").findOne({user_id: id, api_key_secondary: {$exists: true}, api_secret_secondary: {$exists: true}, api_key_secondary: {$ne: ""}, api_secret_secondary: {$ne: ""}, api_key_secondary: {$ne: null}, api_secret_secondary: {$ne: null}});
        console.log(userKraken, "---> kraken user")
        var userID;
        var apiKey;
        var apiSecret;
        if (userKraken != null) {
                    
          userID = userKraken["user_id"]
          apiKey = userKraken["api_key_secondary"]
          apiSecret = userKraken["api_secret_secondary"]

          try {
                    
            const kraken       = new KrakenClient(apiKey, apiSecret);
            var balance = await kraken.privateMethod("Balance") // {error: [], result: {zusd: '36.334', xxbt: '432.66'}}
            
            //sleep 3 seconds before sending call next
            await sleep(3000)

            if (balance.error.length > 0) {
                console.log(balance.error, "=====> errrrrrror", new Date(), "==> new date")
                continue;
            } else {
            
              for (const property in balance.result) {
                console.log(`${property}: ${balance.result[property]} =====> data from kraken api for the balance`);
        
                if (property == "QTUM") {

                  var promise1 = db.collection("user_wallet_kraken").updateOne({
                      coin_symbol: "QTUM", user_id: userID}, 
                      {$set: {available: balance.result[property], coin_balance: balance.result[property]}},
                      {upsert: true}
                      )

                } else if (property == "XETH") {

                  var promise2 = db.collection("user_wallet_kraken").updateOne({
                      coin_symbol: "ETH", user_id: userID}, 
                      {$set: {available: balance.result[property], coin_balance: balance.result[property]}},
                      {upsert: true}
                      )


                } else if (property == "XXBT") {


                  var promise3 = db.collection("user_wallet_kraken").updateOne({
                      coin_symbol: "BTC", user_id: userID}, 
                      {$set: {available: balance.result[property], coin_balance: balance.result[property]}},
                      {upsert: true}
                      )
    
                } else if (property == "XXRP") {

                  var promise4 = db.collection("user_wallet_kraken").updateOne({
                      coin_symbol: "XRP", user_id: userID}, 
                      {$set: {available: balance.result[property], coin_balance: balance.result[property]}},
                      {upsert: true}
                      )


                } else if (property == "XXLM") {

                  var promise5 = db.collection("user_wallet_kraken").updateOne({
                      coin_symbol: "XLM", user_id: userID}, 
                      {$set: {available: balance.result[property], coin_balance: balance.result[property]}},
                      {upsert: true}
                      )

                
                } else if (property == "XLTC") {

                  var promise6 = db.collection("user_wallet_kraken").updateOne({
                      coin_symbol: "LTC", user_id: userID}, 
                      {$set: {available: balance.result[property], coin_balance: balance.result[property]}},
                      {upsert: true}
                      )

                } else if (property == "XXMR") {

                  var promise7 = db.collection("user_wallet_kraken").updateOne({
                      coin_symbol: "XMR", user_id: userID}, 
                      {$set: {available: balance.result[property], coin_balance: balance.result[property]}},
                      {upsert: true}
                      )


                } else if (property == "XETC") {

                  var promise8 = db.collection("user_wallet_kraken").updateOne({
                      coin_symbol: "ETC", user_id: userID}, 
                      {$set: {available: balance.result[property], coin_balance: balance.result[property]}},
                      {upsert: true}
                      )

        
                } else if (property == "USDT") {


                  var promise9 = db.collection("user_wallet_kraken").updateOne({
                      coin_symbol: "USDT", user_id: userID}, 
                      {$set: {available: balance.result[property], coin_balance: balance.result[property]}},
                      {upsert: true}
                      )

                } else {

                  var promise10 = db.collection("user_wallet_kraken").updateOne({
                      coin_symbol: property, user_id: userID}, 
                      {$set: {available: balance.result[property], coin_balance: balance.result[property]}},
                      {upsert: true}
                      )

                }
          
              }

              await sleep(3000)


              db.collection("user_investment_kraken").updateOne({admin_id: userID}, {$set: {exchange_enabled: "yes"}})
      
              Promise.all([promise1, promise2, promise3, promise4, promise5, promise6, promise7, promise8, promise9, promise10]).then((data) => {
                  console.log("===> documents updated balance in cron")
                  console.log(id, "---> kraken IDD")
                  db.collection("users").updateOne({_id: new ObjectId(id)}, {$set: {is_balance_updated_kraken: new Date()}})
              })
    
            }
              
          } catch(e) {
              db.collection("user_investment_kraken").updateOne({admin_id: userID}, {$set: {exchange_enabled: "no"}})
              console.log(e, "===> catch error", new Date(), "==> new date")
              continue; 
          }
        }
      } 
    }          
  })
})

