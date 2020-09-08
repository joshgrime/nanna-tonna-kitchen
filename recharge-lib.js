const axios = require('axios');
const rchost = 'https://api.rechargeapps.com';
const rckey = process.env.RCKEY;

module.exports = {
    getTodayOrder:getTodayOrder,
    makeShopifyRequest: makeShopifyRequest
}

function getTodayOrder(){
    return new Promise(function(resolve, reject) {
        var date = new Date();
        var year = date.getFullYear();
        var month = date.getMonth();
        month++;
        month = month.toString();
        if (month.length<2) month = "0" + month;
        var day = date.getDate();
        day = day.toString();
        if (day.length<2) day = "0" + day;
        var datestr = year+'-'+month+'-'+day;
        
        var payload = [];
        var pageCount = 1;
        async function queue(){
            var data = await makeShopifyRequest(pageCount, datestr);
            payload = payload.concat(data);
            pageCount++;
            if (data.length >= 250) {
                queue();
            }
            else {
                resolve(data);
            }
        }
        queue();
    });
}

function makeShopifyRequest(page, datestr){
    return new Promise(function(resolve,reject){
        var url = rchost+'/orders?status=SUCCESS&page='+page+'&limit=250&scheduled_at_max='+datestr;//scheduled_at_min='+datestr;//+'&scheduled_at_max='+datestr;
        var options = {
            headers: {
                'X-Recharge-Access-Token': rckey
            }
        }
        axios.get(url, options)
        .then(subs=>{
            resolve(subs.data);
        })
        .catch(e=>{
            reject(e);
        });
    });
}