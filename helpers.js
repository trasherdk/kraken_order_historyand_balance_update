const { response } = require('express');
const KrakenClient = require('kraken-api');
var conn =  require("./database");

async function updateSingleUsersBalance(userID, validating) {

    //UpdateUsersBalance "Updates User Balance"
    return conn.then(async db => {


        //Get all API Keys Secrets set of all users
        APIKeySetMap = await listKrakenApiKeySet(userID, db)

		console.log(APIKeySetMap)
        if (APIKeySetMap === false) {
            console.log("Not OK or error returned from function call ListAllKrakenApiKeySet ")
            return {ok: false, msg: "Not OK or error returned from function call ListAllKrakenApiKeySet ", data: null};
        }

        if (APIKeySetMap.length > 0) {
            apiKey = APIKeySetMap[0]["api_key"]
            apiSecret = APIKeySetMap[0]["api_secret"]

			var {ok, msg, data} = await getBalanceFromKraken(userID, apiKey, apiSecret, db)

			if (ok) {
				return {ok, msg, data}
			} else if (!ok) {
                apiKeySec = APIKeySetMap[0]["api_key_secondary"]
                apiSecretSec = APIKeySetMap[0]["api_secret_secondary"]
				var {ok1, msg1, data1} = await getBalanceFromKraken(userID, apiKeySec, apiSecretSec, db)
				
				return {ok1, msg1, data1}
            }

        }

        return {ok: false, msg: "Not OK or error returned from function call ListAllKrakenApiKeySet in actual func UpdateUsersBalance", data: null}


    })

    
}




async function listKrakenApiKeySet(userID, db) {


    var mapArray = await db.collection("kraken_credentials").find({"user_id": userID}).limit(1).toArray()

    if (mapArray.length <= 0) {
		console.log("Got error while querying mongodb in function ListAllKrakenApiKeySet in helpers.js")
		return false;
    } else {
        return mapArray;
    }
}

async function getBalanceFromKraken(userID = null, apiKey, apiSecret, db) {

	if (userID != null) {

		try {	

			const kraken       = new KrakenClient(apiKey, apiSecret);
			var balance = await kraken.privateMethod("Balance") // {error: [], result: {zusd: '36.334', xxbt: '432.66'}}
	
			if (balance.error.length > 0) {
				return {ok: false, msg: "Error while getting balances from kraken live in func GetBalanceFromKraken", data: null}
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
				db.collection("user_investment_kraken").updateOne({admin_id: userID}, {$set: {exchange_enabled: "yes"}})
				return Promise.all([promise1, promise2, promise3, promise4, promise5, promise6, promise7, promise8, promise9, promise10]).then(() => {
					return {ok: true, msg: "All ok", data: balance.result}
				})
	
			}
	
		} catch(e) {
			db.collection("user_investment_kraken").updateOne({admin_id: userID}, {$set: {exchange_enabled: "no"}})
			return {ok: false, msg: e.message, data: null}
		}

	} else {

		try {

			var kraken2       = new KrakenClient(apiKey, apiSecret);
			var balance2 = await kraken2.privateMethod("Balance") // {error: [], result: {zusd: '36.334', xxbt: '432.66'}}

		} catch(e) {
			return {ok: false, msg: e.message, data: null}
		}
	
		if (balance2.error.length > 0) {
			return {ok: false, msg: "Error while getting balances from kraken live in func GetBalanceFromKraken", data: null}
		} else {
			return {ok: true, msg: "valid api key and secret", data: balance2.result}
		}

	}

}


//IsKrakenAPIKeySecretValid "Validates given api key and secret"
async function isKrakenAPIKeySecretValid(apiKey, apiSecret) {

	var {ok, msg, data} = await getBalanceFromKraken(null, apiKey, apiSecret)

	return {ok, msg, data}

}

async function validateCredentials(apiKey, apiSecret) {

	try {	

		const kraken       = new KrakenClient(apiKey, apiSecret);
		var balance = await kraken.privateMethod("Balance") // {error: [], result: {zusd: '36.334', xxbt: '432.66'}}

		if (balance.error.length > 0) {

			console.log('print=========>>>>>>>>>>', balance.error)
			return {valid: false}
		} else {

			return {valid: true}

		}

	} catch(e) {
		console.log('e print ==========>>>>>>>>>>>>',e)
		return {valid: false}
	}

}

function sleep(millis) {
	return new Promise(function (resolve, reject) {
		setTimeout(function () { resolve(); }, millis);
	});
}

module.exports = {
    'updateSingleUsersBalance': updateSingleUsersBalance,
    'listKrakenApiKeySet': listKrakenApiKeySet,
	'getBalanceFromKraken': getBalanceFromKraken,
	'isKrakenAPIKeySecretValid': isKrakenAPIKeySecretValid,
	'sleep': sleep,
	'validateCredentials': validateCredentials
}