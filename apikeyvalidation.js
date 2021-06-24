var cron = require("node-cron")
var conn = require("./database");
const KrakenClient = require('kraken-api');
var sleep = require("./helpers").sleep;
var axios = require("axios")
var ObjectId = require("mongodb").ObjectID;
var request = require('request');
var validateCredentials = require('./helpers').validateCredentials;

cron.schedule("0 */3 * * * *", async function () {
  conn.then(async db => {

    console.log('first crone starting===========>>>>>>>>', new Date())
      var serverip = await axios.get('https://checkip.amazonaws.com/');

      var tradingIP = serverip.data.trim()

      //check kraken api key is valid or not
      let currentTime = new Date();
      let olderDate = new Date(currentTime.setHours(currentTime.getHours() - 12))
      let lookup = [
        {
          '$match': {
            // 'user_id'   :  '5c0915befc9aadaac61dd1b8',
            '$or': [

              { 'account_block': { '$exists': false } },
              { 'account_block': 'no' },
            ],

            'trading_ip' : tradingIP.toString(),
            '$or': [
              { 'api_key_valid_checking': { '$exists': false } },
              { 'api_key_valid_checking': { '$lte': olderDate } }
            ],

            '$or': [

              { 'count_invalid_api': { '$exists': false } },
              { 'count_invalid_api': { '$lte': 0 } }
            ],

            '$and': [
              {
                'api_key': { '$exists': true },
              },
              {
                'api_key': { '$nin': ['', null] },
              },
              {
                'api_secret': { '$exists': true },
              },
              {
                'api_secret': { '$nin': ['', null] },
              },
            ],
          }
        },
        {
          '$project': {
            '_id': '$_id',
            'user_id': '$user_id',
            'api_key': '$api_key',
            'api_secret': '$api_secret',
            'api_key_secondary': '$api_key_secondary',
            'api_secret_secondary': '$api_secret_secondary',
            'api_key_third_key': '$api_key_third_key',
            'api_secret_third_key': '$api_secret_third_key',
          }
        },
        {
          '$sort': { 'api_key_valid_checking': 1 }
        },
        {
          '$limit': 1
        }
      ];

      let filterUsers = await db.collection('kraken_credentials').aggregate(lookup).toArray();
      var userArr  = filterUsers[0]; 

      console.log("kraken credential collection count ::::", filterUsers.length )

      if (typeof userArr!=="undefined" && filterUsers.length > 0) {

        var reqRes = (async() => {

            // let getUserArr = await db.collection('users').find({ '_id': new ObjectId(userArr['user_id'].toString()) }).toArray();
            // var ResgetUserArr = getUserArr[0]
            var tradingIp     = userArr['trading_ip']  
          
            // console.log('user collection count ===========>>>>>>>>> ', getUserArr.length)
          
            var url1 = 'http://'+tradingIp+':3006/checkcredentials';
    
            console.log('first validation check run time=============>>>>>>>>>>>>>>', new Date())
            let ans = await callApi(userArr['api_key'], userArr['api_secret'], url1);

            console.log('first response api cal ', ans)
    
            if(ans.valid  === true){
      
              let update_array = {

                'is_api_key_valid'      :   "yes",
                'count_invalid_api'     :   0,
                'account_block'         :   'no',
                'api_key_valid_checking':   new Date()
              };
    
              let res = await db.collection('kraken_credentials').updateOne({ '_id': new ObjectId(userArr['_id'].toString()) }, { '$set': update_array });
              console.log('kraken credential modified count step 1===========>>>>>>>>>>',   res.modifiedCount)
    
              let res1 = await db.collection('user_investment_kraken').updateOne({ 'admin_id': userArr['user_id'] }, { '$set': { 'exchange_enabled': 'yes' } });
              console.log('user investment report modified count step 1===========>>>>>>>>>>',   res1.modifiedCount)
    
            } else {
    
              await sleep(5000)
              console.log('second validation check run time=============>>>>>>>>>>>>>>', new Date())
              let ans1 = await callApi(userArr['api_key_secondary'], userArr['api_secret_secondary'], url1);

              console.log('secound response api cal ', ans1)

    
              if (ans1.valid === true) {
    
                let update_array = {

                  'api_key'               : userArr['api_key_secondary'],
                  'api_secret'            : userArr['api_secret_secondary'],
                  'api_key_secondary'     : userArr['api_key'],
                  'api_secret_secondary'  : userArr['api_secret'],
                  'is_api_key_valid'      : "yes",
                  'count_invalid_api'     : 0,
                  'account_block'         : 'no',
                  'api_key_valid_checking': new Date()
                };
      
                let result = await db.collection('kraken_credentials').updateOne({ '_id': new ObjectId(userArr['_id'].toString()) }, { '$set': update_array });
                console.log('kraken credential modified count step 2 =============>>>>>>>>>>.  ',result.modifiedCount)
      
                let result1 = await db.collection('user_investment_kraken').updateOne({ 'admin_id': userArr['user_id'] }, { '$set': { 'exchange_enabled': 'yes' } });
                console.log('user investment report modified count step 2 =============>>>>>>>>>>.  ',result1.modifiedCount)

              } else {
    
                await sleep(3000)
                console.log('3rd validation check run time=============>>>>>>>>>>>>>>', new Date())
                let ans = await callApi(userArr['api_key_third_key'], userArr['api_secret_third_key'], url1);
                console.log('3rd response api cal ', ans)

                if (ans.valid === true) {
    
                  let update_array = {

                    'api_key'               :   userArr['api_key_third_key'],
                    'api_secret'            :   userArr['api_secret_third_key'],
                    'api_key_third_key'     :   userArr['api_key'],
                    'api_secret_third_key'  :   userArr['api_secret'],
                    'is_api_key_valid'      :   "yes",
                    'count_invalid_api'     :   0,
                    'account_block'         :   'no',
                    'api_key_valid_checking':   new Date()
                  };
        
                  let response =  await db.collection('kraken_credentials').updateOne({ '_id': new ObjectId(userArr['_id'].toString()) }, { '$set': update_array });
                  console.log('kraken credential modified count step 3 =============>>>>>>>>>>.  ',response.modifiedCount)

                  let response1 =  await db.collection('user_investment_kraken').updateOne({ 'admin_id': userArr['user_id'] }, { '$set': { 'exchange_enabled': 'yes' } });
                  console.log('user investment modified count step 3 =============>>>>>>>>>>.  ',response1.modifiedCount)

                } else {
    
                  let end  = await db.collection('user_investment_kraken').updateOne({ 'admin_id': userArr['user_id'].toString() }, { '$set': { 'exchange_enabled': 'no' } });
                  console.log('user investment report modified count step final =============>>>>>>>>>>.  ',end.modifiedCount)

                  let end1  = await db.collection('kraken_credentials').updateOne({ '_id': new ObjectId(userArr['_id'].toString()) }, { '$set': { 'api_key_valid_checking': new Date(), 'is_api_key_valid': "no", 'count_invalid_api': 1 } });
                  console.log('kraken credential modified count step final =============>>>>>>>>>>.  ',end1.modifiedCount)

                }
              }
            }
            
        })()
      }//end if 
      console.log("Done!");
  }) // END of conn.then(async db => {
}) //END of cron.schedule("*/10 * * * * *", async function () {


async function callApi(apiKey, apiSecret, url1) {


	if (apiKey, apiSecret) {
		var resp = await validateCredentials(apiKey, apiSecret);
		return resp
	} else {
    return {valid: false};
  }

  // console.log("request coming ===================>>>>>>>>>>>>>>>>>>")

  // let payLoadExchangeVarify = {
  //   'apiKey': apiKey,
  //   'apiSecret': apiSecret
  // };

  // console.log('payload ============>>>>>>>>>.',payLoadExchangeVarify)
  // console.log("url1 ::::", url1)
  // //Update kraken Balance
  // var options = {
  //   method: 'POST',
  //   url: url1,
  //   headers: {
  //       'cache-control'   : 'no-cache',
  //       'Connection'      : 'keep-alive',
  //       'Accept-Encoding' : 'gzip, deflate',
  //       'Postman-Token'   : '0f775934-0a34-46d5-9278-837f4d5f1598,e130f9e1-c850-49ee-93bf-2d35afbafbab',
  //       'Cache-Control'   : 'no-cache',
  //       'Accept'          : '*/*',
  //       'User-Agent'      : 'PostmanRuntime/7.20.1',
  //       'Content-Type'    : 'application/json'
  //   },
  //   json: payLoadExchangeVarify
  // }


  // await request(options, function (error, response, body) {

  //   if(response.body.valid){

  //     console.log('request return===========================>>>>>>>>>>>>>>>>>>', response.body.valid)


  //     return true;
  //   }
  //   if(error){

  //     console.log('response false condition ==============>>>>>>>>>>>')


  //     return false;
  //   }

  // });

}

//get invalid api key and check again after 6 hours

cron.schedule("0 */4 * * * *", async function () {

  conn.then(async db => {

    var serverip = await axios.get('https://checkip.amazonaws.com/');
    var tradingIP = serverip.data.trim()

    console.log('second crone run==============>>>>>>>>>..', new Date())
    let currentTime = new Date();
    let olderDate   = new Date(currentTime.setHours(currentTime.getHours() - 6))

    let lookup = [
      {
        '$match' : {

          // 'user_id'   :  '5c0915befc9aadaac61dd1b8',
          '$or' : [
            { 'account_block'    : 'no' },
            { 'account_block'    : { '$exists' : false }},
          ],
          'trading_ip'        : tradingIP.toString(),
          
          'count_invalid_api' : { '$gte' : 1, '$lte' : 4 },

          '$or'  : [
            {'api_key_valid_checking' : {'$exists' : false }},
            {'api_key_valid_checking' : {'$lte' : olderDate }}
          ],
      
          '$and' : [
            {
              'api_key' : {'$exists' : true },
            },
            {
              'api_key' : { '$nin' : ['', null] },
            },
            {
              'api_secret' : { '$exists' : true },
            },
            {
              'api_secret' : { '$nin' : ['', null] },
            },
          ],
        },
      },
      {
        '$project' : {
          '_id'                   :  '$_id',
          'api_key'               :  '$api_key',
          'api_secret'            :  '$api_secret',
          'user_id'               :  '$user_id',
          'api_key_secondary'     :  '$api_key_secondary',
          'api_secret_secondary'  :  '$api_secret_secondary',
          'api_key_third_key'     :  '$api_key_third_key',
          'api_secret_third_key'  :  '$api_secret_third_key',
          'count_invalid_api'     :   '$count_invalid_api'
        }
      },

      {
        '$sort' : { 'api_key_valid_checking' : 1 }
      },
      {
        '$limit' : 1
      }
    ];

    let filter_Users = await db.collection('kraken_credentials').aggregate(lookup).toArray();

    console.log('kraken credental count',  filter_Users.length)
    

    // console.log('api_key user ==================>>>>>>>',filter_Users[0]['api_key'])
    // console.log('securet key of usrer =====================>>>>>>>>>', filter_Users[0]['api_secret'])
    // console.log('second cron starts', filter_Users);

    if(filter_Users.length > 0 ){

      // let getResponse = await db.collection('users').find({ '_id' : new ObjectId(filter_Users[0]['user_id'].toString() ), trading_ip : serverip.toString() } ).toArray()
      var reqRes = (async() => {

        var tradingIP = filter_Users[0]["trading_ip"];
        
        var url1 = 'http://'+tradingIP+':3006/checkcredentials';

        let ans = await callApi(filter_Users[0]['api_key'], filter_Users[0]['api_secret'], url1);

        console.log('validatiobn response ===========>', ans)
        if (ans.valid === true) {

          let update_array = {
            'is_api_key_valid': "yes",
            'count_invalid_api': 0,
            'account_block': 'no',
            'api_key_valid_checking': new Date()
          };

          let result = await db.collection('kraken_credentials').updateOne({ '_id': new ObjectId(filter_Users[0]['_id'].toString() ) }, { '$set': update_array });

          console.log('user id============>>>>>>>>>>>',   filter_Users[0]['user_id'])
          let result1 = await db.collection('user_investment_kraken').updateOne({ 'admin_id': (filter_Users[0]['user_id'].toString() ) }, { '$set': { 'exchange_enabled': 'yes' } });

          console.log('modified count ===========>>',  result.modifiedCount)
          console.log('investment report  ===========>>',  result1.modifiedCount)


          return {try: false};

        } else {

          await sleep(3000)
          let ans2 = await callApi(filter_Users[0]['api_key_secondary'], filter_Users[0]['api_secret_secondary'], url1);

          console.log('validation 2nd ========>>>>>>>',  ans2)

          if (ans2.valid === true) {

            let update_array = {
              'api_key': filter_Users[0]['api_key_secondary'],
              'api_secret': filter_Users[0]['api_secret_secondary'],
              'api_key_secondary': filter_Users[0]['api_key'],
              'api_secret_secondary': filter_Users[0]['api_secret'],
              'is_api_key_valid': "yes",
              'count_invalid_api': 0,
              'account_block': 'no',
              'api_key_valid_checking': new Date()
            };

            let as = await db.collection('kraken_credentials').updateOne({ '_id': new ObjectId(filter_Users[0]['_id'].toString() ) }, { '$set': update_array });

            console.log('update 2nd try ========>>>>>>> credential',  as.modifiedCount)
            let as1  = await db.collection('user_investment_kraken').updateOne({ 'admin_id': (filter_Users[0]['user_id'].toString()) }, { '$set': { 'exchange_enabled': 'yes' } });
            console.log('update 2nd try ========>>>>>>> investment ',  as1.modifiedCount)


            return {try: false};

          } else {

            await sleep(3000)
            let ans = await callApi(filter_Users[0]['api_key_third_key'], filter_Users[0]['api_secret_third_key'], url1);

        if (ans.valid === true ) {

          let update_array = {
            'api_key': filter_Users[0]['api_key_third_key'],
            'api_secret': filter_Users[0]['api_secret_third_key'],
            'api_key_third_key': filter_Users[0]['api_key'],
            'api_secret_third_key': filter_Users[0]['api_secret'],
            'is_api_key_valid': "yes",
            'count_invalid_api': 0,
            'account_block': 'no',
            'api_key_valid_checking': new Date()
          };

          let testing = await db.collection('kraken_credentials').updateOne({ '_id': new ObjectId(filter_Users[0]['_id'].toString() ) }, { '$set': update_array });

          console.log('modified count 3rd tetding ============<>>>>>>>>>', testing.modifiedCount)
          let testing1 = await db.collection('user_investment_kraken').updateOne({ 'admin_id': (filter_Users[0]['user_id'].toString()) }, { '$set': { 'exchange_enabled': 'yes' } });

          console.log('modified count 3rd tetding ============<>>>>>>>>> investment ', testing1.modifiedCount)
        } else {



          console.log('comming request ================>>>>>>>>>>', filter_Users)

          let account_block1 = parseFloat(filter_Users[0]['count_invalid_api']) + 1;

          console.log('new count===============>>>>>>>>>>>', account_block1)

          let update_array_api = {
            'api_key_valid_checking' : new Date(),
            'is_api_key_valid'       : "no", 
            'count_invalid_api'      : account_block1
          };

          if(filter_Users[0]['count_invalid_api'] == 4 ){
            update_array_api['account_block'] = 'yes';
          }

          let count = await db.collection('kraken_credentials').updateOne({ '_id': new ObjectId(filter_Users[0]['_id'].toString() ) }, { '$set': update_array_api });

          console.log('final  kraken credentials modified count =============>>>>>.',    count.modifiedCount)
          let assa  =  await db.collection('user_investment_kraken').updateOne({ 'admin_id': filter_Users[0]['user_id'].toString() }, { '$set': { 'exchange_enabled': 'block' } });

          console.log('final kraken investment modified count =============>>>>>.',    assa.modifiedCount)

        }

          }

        }

      })();

      // if (reqRes.try === true) {

        
      // }

    }
    console.log('Done!!!')
  })
});

