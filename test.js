const axios = require('axios');
const { Db } = require('mongodb');

var test;
(async function () {
    test = await axios.get('https://checkip.amazonaws.com/')

    console.log(test.data)
})()
// Make a request for a user with a given ID


 function getLiveUsersWithApiKeySet(exchange = '') {

    let collection_name = exchange == "binance" ? "users" : exchange+"_credentials";
    let id_field = exchange == "binance" ? '$_id' : '$user_id';
    let is_key_valid_last_check = exchange == "binance" ? 'is_key_valid_last_check' : exchange+"_is_key_valid_last_check";
    let is_key_valid = exchange == "binance" ? 'is_key_valid' : exchange+"_is_key_valid";

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
                "trading_ip": "192.461.1.4",
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
                }
              },
              "kraken_is_key_valid": {
                "$ne": "yes"
              }
            },
            {
              "$project": {
                "_id": 1
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
          "is_modified_trade_history_kraken": 1
        }
      },
      {
        "$project": {
          "_id": 1
        }
      },
      {
        "$limit": 1
      }
    ]

    pipeline[2]['pipeline'][0][is_key_valid] = {'$ne' : 'yes'}
    pipeline[6]['$sort'][is_key_valid_last_check] = 1


    

    // echo "<pre>";
    // echo "Total user count: ".count($users)."<br>";
    // print_r($users);

    return $users;

    // die('<br> ************* Testing code ************* <br>');
}

