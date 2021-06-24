var MongoClient = require('mongodb').MongoClient;
var db;
function connectionDatabase() {

    return new Promise((resolve, reject) => {
        // console.log(db)
	var url = "mongodb://root:95bcqr1Vizz@digiebot-shard-00-00-bhelp.mongodb.net:27017,digiebot-shard-00-01-bhelp.mongodb.net:27017,digiebot-shard-00-02-bhelp.mongodb.net:27017/test?ssl=true&replicaSet=Digiebot-shard-0&authSource=admin&retryWrites=true&w=majority";
        MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, (err, database) => {
            if (err) {
              console.log(err)
            }  
            console.log('connection created')
            db = database.db('binance');
            resolve(db)
        });
    })
}
module.exports = connectionDatabase()