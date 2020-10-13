const fs = require('fs');
const axios = require('axios');
const moment = require('moment');
const rchost = 'https://api.rechargeapps.com';
const rckey = process.env.RCKEY;
const csv = require('fast-csv');


var subsInCache = false;
var ordersInCache = false;

function getWeekOrder(){
    return new Promise(function(resolve, reject) {

        //read from cache instead of using API
        if (subsInCache === true) {
            var data = retrieveSubs();
            data.then(x=>{
                resolve(x);
            });
        }
        else { 
            var datestr = getDateString();
            var payload = [];
            var pageCount = 1;

            var mom = moment(datestr, 'YYYY-MM-DD');
            mom.add(8, 'days');
            var newstr = mom.format('YYYY-MM-DD');

            async function queue(){
                var data = await makeSubRequest(pageCount, datestr, newstr); //use new string too
                payload = payload.concat(data);
                pageCount++;
                if (data.length >= 250) { //if there are 250 returned, that is the max page so call the next one
                    queue();
                }
                else {
                    //send back to front end
                    resolve(payload);

                    //set cache
                    exportSubs(payload);
                    subsInCache = true;

                    //set cache timeout
                    setTimeout(function(){
                        subsInCache = false;
                    }, 1000 * 60 * 60);
                }
            }
            queue();
        }       
    });
}

function getTodayOrder(){
    return new Promise(function(resolve, reject) {

        if (ordersInCache === true) {
            var data = retrieveOrders();
            data.then(x=>{
                console.log('got orders from cace')
                resolve(x);
            });
        }
        else {
            var datestr = getDateString();
            var payload = [];
            var pageCount = 1;
            async function queue(){
                var data = await makeShopifyRequest(pageCount, datestr, 'today');

                //manually filter since the API does not return consistent results
                var subPayload = data.filter(y=>{
                    return y.scheduled_at.startsWith(datestr);
                });

                payload = payload.concat(subPayload);
                pageCount++;

                if (data.length >= 250) {
                    queue();
                }
                else {
                    resolve(payload);

                    exportOrders(payload);
                    ordersInCache = true;

                    setTimeout(function(){
                        ordersInCache = false;
                    }, 1000 * 60 * 60);
                }
            }
            queue();
        }       
    });
}


/*

    This function was added as an extra feature later on.
    It checks if any new customers had been referred by someone

    Used by 'Referral Export' in the online portal


*/

function getReferrals(datestr){
    return new Promise(function(resolve, reject) {

            var _datestr = getDateString();

            var today = _datestr === datestr ? 'today' : null;
           
            var payload = [];
            var pageCount = 1;
            async function queue(){
                var data = await makeShopifyRequest(pageCount, datestr, today);
                var subPayload = data.filter(y=>{
                    var referred = false;
                    var properties = y.line_items[0].properties; //the referral info is in the properties

                    var firstOrder = y.total_price === '0.00' && y.total_discounts === '0.0'; //if it's a customers first order these fields equal to 0 ... as strings.... formatted differently...!!!!!!
                    
                    if (properties !== undefined && properties.length > 0 && firstOrder === true) { //if the order has properties and its customer's first order....
                        
                    for (let xxx of properties) { //its an array of objects, the key is 'recommended by'
                            if (xxx.name === 'Recommended By') referred = true; 
                        }
                        return y.scheduled_at.startsWith(datestr) && referred;
                    }
                    else {
                        return false;
                    }
                });
                payload = payload.concat(subPayload);
                pageCount++;
                if (data.length >= 250) {
                    queue();
                }
                else {
                    //send back today's new orders which were referred, and the date to name the file
                    resolve([payload, datestr]);
                }
            }
            queue();     
    });
}

function buildReferralCSV(data, date){
    return new Promise(function(resolve, reject) {
        try {
            //csv library takes an array of arrays as input
        var final = [

            ['Referred Customers', date, ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' '],
            ['Name', 'Referred Customer Email', 'Referred By', ' ', ' ']

        ]

        //map data into the two columns we need, name, email and referrer's email
        var referrals = data.map(x=>{
            var name = x.first_name + ' ' + x.last_name;
            var custemail = x.email;
            var properties = x.line_items[0].properties;
            var email;
            for (let xxx of properties) {
                if (xxx.name === 'Recommended By') {
                    email = xxx.value;
                }
            }
            return [name, custemail, email]
        });

        final = final.concat(referrals);
        

        var filename = 'referrals-'+ date;     

        csv.writeToPath(__dirname+"/schedules/"+filename+".csv", final)
        .on("finish", function(){
              console.log(filename+' file created.');
              resolve(filename);
        })
        .on("error", function(e){
            console.log('Error exporting CSV.');
            console.log(e);
            reject(e);
        })

    }
    catch (e) {
        console.log(e);
        reject(e);
    }

    });


}

//reads from sample json instead of using the API
function makeFakeShopifyRequest(){
    return new Promise(function(resolve, reject){

        fs.readFile('./fake-orders.json', 'utf8', function(err, data) {
            if (err) console.log (err);
            data = JSON.parse(data);
            console.log(err);
            console.log(data.shipping_lines);
            resolve(data.orders);
        });

    });
}

/*

    On recharge's advice, to get the weekly orders ahead, we should use the 'charges' endpoint with a filter of status = QUEUED
    This does not return today's orders, as these charges have now gone through.

    A filter you can use with the recharge API is sheduled_at_min and scheduled_at_max - this approach did not return consistent
    results for some reason. I have resorted to getting all the orders from the API and filtering them on the server.

    To get the charges ahead, set argument today as null or undefined. To get today's orders, pass it 'today' as a string.

    You also have to pass it the page number (results come in 250s)

*/


function makeShopifyRequest(page, datestr, today){
    return new Promise(function(resolve,reject){

        var ep =  today === 'today' ? 'orders' : 'charges';
        var status = today === 'today' ? '' : '&status=QUEUED';

        var url = rchost+'/'+ep+'?limit=250'+status+'&page='+page;
        console.log('GET: '+url);
        var options = {
            headers: {
                'X-Recharge-Access-Token': rckey
            }
        }
        axios.get(url, options)
        .then(subs=>{
            if (subs.data.orders === undefined) {
                console.log(subs.data.charges[0]);
                resolve(subs.data.charges);
            }
            else resolve(subs.data.orders);
        })
        .catch(e=>{
            reject(e);
        });
    });
}

/*

    This seems to work consistently in getting the orders from between two dates.

    Called when a user goes to the Orders page of the portal.

*/

function makeSubRequest(page, datestr, newstr){
    return new Promise(function(resolve,reject){
        var url = rchost+'/charges?status=queued&limit=250&page='+page+'&date_min='+datestr+'&date_max='+newstr;
        console.log('GET: '+url);
        var options = {
            headers: {
                'X-Recharge-Access-Token': rckey
            }
        }
        axios.get(url, options)
        .then(subs=>{
            resolve(subs.data.charges);
        })
        .catch(e=>{
            reject(e);
        });
    });
}



// these functions read and write the orders to a sort of 'cache'. The api takes a while to go through all of the pages, so this speeds things up

function exportOrders(data){

    var fileData = {
        orders: data
    };

    fileData = JSON.stringify(fileData);

    if (!fs.existsSync(__dirname+"/temp/")){
        fs.mkdirSync(__dirname+"/temp/");
    }
    console.log('Starting JSON export.');
    fs.writeFileSync(__dirname+"/temp/orders.json", fileData);
}

function exportSubs(data){

    var fileData = {
        subs: data
    };

    fileData = JSON.stringify(fileData);

    if (!fs.existsSync(__dirname+"/temp/")){
        fs.mkdirSync(__dirname+"/temp/");
    }
    console.log('Starting JSON export.');
    fs.writeFileSync(__dirname+"/temp/subs.json", fileData);
}

function retrieveSubs() {
    return new Promise(function(resolve, reject) {
        if (!fs.existsSync(__dirname+"/temp/subs.json")){
            return null;
        }
        else {
            var file = fs.readFileSync(__dirname+"/temp/subs.json");
            var data = JSON.parse(file);
            resolve(data.subs); 

        }
    });

}

function retrieveOrders() {
    return new Promise(function(resolve, reject) {
        if (!fs.existsSync(__dirname+"/temp/orders.json")){
            return null;
        }
        else {
            var file = fs.readFileSync(__dirname+"/temp/orders.json");
            var data = JSON.parse(file);
            resolve(data.orders); 

        }
    });

}

function getDateString(){
    var date = new Date();
    var year = date.getFullYear();
    var month = date.getMonth();
    month++;
    month = month.toString();
    if (month.length<2) month = "0" + month;
    var day = date.getDate();
    day = day.toString();
    if (day.length<2) day = "0" + day;
    return year+'-'+month+'-'+day; 
}

module.exports = {
    getTodayOrder:getTodayOrder,
    getWeekOrder:getWeekOrder,
    makeShopifyRequest: makeShopifyRequest,
    add10Days: add10Days,
    add2Weeks: add2Weeks,
    formatDateNicely: formatDateNicely,
    buildReferralCSV: buildReferralCSV,
    getReferrals: getReferrals
}