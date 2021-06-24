var cron = require("node-cron");
var axios = require("axios");
var conn = require("./database");

cron.schedule("0 0 */3 * *", async() => {
    conn.then(db => {
        var pairsArr = {
            'XBTUSDT': 'BTCUSDT',
            'LTCUSDT': 'LTCUSDT',
            'LINKXBT': 'LINKBTC',
            'EOSXBT': 'EOSBTC',
            'ADAXBT': 'ADABTC',
            'TRXXBT': 'TRXBTC',
            'XRPUSDT': 'XRPUSDT',
            'QTUMXBT': 'QTUMBTC',
            'DASHXBT': 'DASHBTC',
            'XXLMXXBT': 'XLMBTC',
            'XXMRXXBT': 'XMRBTC',
            'XETHXXBT': 'ETHBTC',
            'XETCXXBT': 'ETCBTC',
            'XXRPXXBT': 'XRPBTC',
            // 'EOSUSDT': 'EOSUSDT',
            'QTUMUSD': 'QTUMSUDT',
            // 'AAVEUSD': 'AAVEUSDT',
            // 'ALGOUSD': 'ALGOUSDT',
            // 'BATUSD': 'BATUSDT',
            // 'COPMUSD': 'COPMUSDT',
            // 'FILUSD': 'FILUSDT',
            // 'GRTUSD': 'GRTUSDT',
            // 'KSMUSD': 'KSMUSDT',
            // 'MANAUSD': 'MANAUSDT',
            // 'OMGUSD': 'OMGUSDT',
            // 'SNXUSD': 'SNXUSDT',
            // 'UNIUSD': 'UNIUSDT',
            'XMRUSD': 'XMRUSDT',
            'LINKUSDT': 'LINKUSDT',
            'BCHUSDT': 'BCHUSDT',
        }
        axios.get("https://api.kraken.com/0/public/AssetPairs").then(resp => {
            // console.log(d, "===> data")
            if (resp.data.error.length <= 0) {
                var result = resp.data.result;
                for (const property in pairsArr) {
                    console.log(`${property}: ${pairsArr[property]}`);
                    console.log(result[property].ordermin)
                    db.collection("market_min_notation_kraken").updateOne({symbol: pairsArr[property]}, {$set: {min_notation: parseFloat(result[property].ordermin)}})
                    last_cron_execution_time("min_notation_kraken_update", "3d", "Cronjob to update kraken min notation weekly  (0 0 */3 * *)", 'min_notation');
                }
                
            }
        });
        
        //console.log(data)
    })
    
})

async function last_cron_execution_time(name, duration, summary, type) {
    let params = {
        'name': name,
        'cron_duration': duration, 
        'cron_summary': summary,
        'type': type,
    };

    axios.post('http://35.171.172.15:3000/api/save_cronjob_execution', params).then(res => {
        console.log(res.data, "=====> data return")
    }).catch(e => {
        console.log("An error occured "+e)
    })

}

