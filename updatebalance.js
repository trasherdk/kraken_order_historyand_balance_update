var conn =  require("./database");
var express = require("express")
var app = express();
var cors = require('cors');
const KrakenClient = require('kraken-api');
var sleep = require("./helpers").sleep;
var updateSingleUsersBalance = require('./helpers').updateSingleUsersBalance;
var isKrakenAPIKeySecretValid = require('./helpers').isKrakenAPIKeySecretValid;
var validateCredentials = require('./helpers').validateCredentials;
const helpers = require("./helpers");

app.use(cors());


app.use(express.urlencoded({ extended: false }));
app.use(express.json());

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

app.post('/updateUserBalance', async (req, res) => {
    var userID = req.body.user_id;
    var validating = req.body.validating;

    // console.log(userID, "userID")
	if (!validating) {
		var { ok, msg, data } = await updateSingleUsersBalance(userID)

		var result = {
			"success": ok,
			"message": msg,
			"data": data,
			"test": 123
		}

		console.log(result, "========>  result single update without validate key and secret")

		return res.json(result)
	}

	apiKey = req.body["api_key"]
	apiSecret = req.body["api_secret"]
	//This method also updates user balances if key secret is valid or otherwise return false and error message
	var { ok: ok1, msg: msg1, data: data1 } = await isKrakenAPIKeySecretValid(apiKey, apiSecret)
	var result = {
        "success": ok1,
		"message": msg1,
		"data": data1,
		"test": 1234
	}
	
	console.log(result, "========>  result with validate key and secret")

    return res.json(result)
})


app.post('/getsingleusertradehistory/:id', async (req, res) => {

	conn.then(async db => {


		var id = req.params.id;

		var userKraken = await db.collection("kraken_credentials").findOne({user_id: id, api_key: {$exists: true}, api_secret: {$exists: true}, api_key: {$ne: ""}, api_secret: {$ne: ""}, api_key: {$ne: null}, api_secret: {$ne: null}});
		console.log(userKraken)
		// api_secret: '2bPmjql0h6QHNp1Fn0UqCllt8Cwg8qD0R5UV5UZMOiMgLotWTjPPw+97RrQ6P7Gz1Nr2VJ/RgcszVHNTiF+eJA==',
		// api_key: 'lUebCZ1d6lIBzKYgkCLZrHEaJDs8ZouX2txJk3bX+H5xpsi9iurydmqC',
		// 
		if (userKraken) {

			var apikey    = userKraken["api_key"]
			var apisecret = userKraken["api_secret"]
			var userID    = userKraken["user_id"]
			const kraken       = new KrakenClient(apikey, apisecret);                  

			try {
				var history = await kraken.privateMethod("TradesHistory") // {error: [], result: {zusd: '36.334', xxbt: '432.66'}}
			} catch(e) {
				console.log(e, " ===== > error ")
				// await db.collection("kraken_credentials").updateOne({user_id: userID}, {$set: {"history_update": new Date()}}, {upsert: true}, (err, doc) => {
				// 	if (err) throw err;
				// 	console.log("===> updated kraken_credentials with new date")
				// })
				return 
			}// END of catch(e)
			
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
				// await db.collection("kraken_credentials").updateOne({user_id: userID}, {$set: {"history_update": new Date()}}, {upsert: true}, (err, doc) => {
				// 	if (err) throw err;
				// 	console.log("===> updated kraken_credentials with new date")
				// })
			}// END of if (history.error.length <= 0)
			
			// await db.collection("kraken_credentials").updateOne({user_id: userID}, {$set: {"history_update": new Date()}}, {upsert: true}, (err, doc) => {
			// 	if (err) throw err;
			// 	console.log("===> updated kraken_credentials with new date")
			// })
			
		} else {
			return res.send(`user with this ${id} NOT found!`)
		}

		return res.send("getting user trade history ...")

	})

})


app.post("/iscredentialsvalid", async(req, res) => {

	var apiKey = req.body.apiKey;
	var apiSecret = req.body.apiSecret;

	const kraken       = new KrakenClient(apiKey, apiSecret);

	try {
		var balance = await kraken.privateMethod("Balance") // {error: [], result: {zusd: '36.334', xxbt: '432.66'}}
	} catch(e) {
		return res.json({valid: false})
	}
	

	if (balance.error.length > 0) {
		return res.json({valid: false})
	} else if (Object.keys(balance.result).length > 0) {
		return res.json({valid: true})
	}
})



app.get("/checkcredentials", async(req, res) => {

    var apiKey = req.body.apiKey;
    var apiSecret = req.body.apiSecret;

    // console.log(userID, "userID")
	if (apiKey, apiSecret) {
		var resp = await validateCredentials(apiKey, apiSecret);

		return res.json(resp)
	} else {
        return res.json({valid: false})
    }

})

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});


// finally, let's start our server...
var server = app.listen(process.env.PORT || 3006, function(){
  console.log('Listening on port ' + server.address().port);
});
