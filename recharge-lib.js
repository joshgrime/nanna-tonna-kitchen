const fs = require('fs');
const axios = require('axios');
const moment = require('moment');
const rchost = 'https://api.rechargeapps.com';
const rckey = process.env.RCKEY;

var subsInCache = false;
var ordersInCache = false;

module.exports = {
    getTodayOrder:getTodayOrder,
    getWeekOrder:getWeekOrder,
    makeShopifyRequest: makeShopifyRequest,
    add10Days: add10Days,
    add2Weeks: add2Weeks,
    formatDateNicely: formatDateNicely
}

function add10Days(datestr) {
    var new_date = moment(datestr, "YYYY-MM-DD").add(10, 'days');
    var new_day = new_date.format('DD');
    var new_month = new_date.format('MM');
    var new_year = new_date.format('YYYY');
    var newDate = new_year + '-' + new_month + '-' + new_day;
    return newDate;
}

function add2Weeks(datestr, dayOfWeek) { //gets all the days to the end of this week + 2 weeks
    var daysToAdd = 21;
    daysToAdd -= dayOfWeek;
    console.log('Adding '+daysToAdd+' days');
    var new_date = moment(datestr, "YYYY-MM-DD").add(daysToAdd, 'days');
    var new_day = new_date.format('DD');
    var new_month = new_date.format('MM');
    var new_year = new_date.format('YYYY');
    var newDate = new_year + '-' + new_month + '-' + new_day;
    return newDate;
}

function formatDateNicely(datestr) {
    var mm = moment(datestr, "YYYY-MM-DD");
    var niceDate = mm.format("dddd, MMMM Do");
    return niceDate;
}

function getWeekOrder(){
    return new Promise(function(resolve, reject) {

        if (subsInCache === true) {
            var data = retrieveSubs();
            data.then(x=>{
                resolve(x);
            });
        }
        else {    
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

            var mom = moment(datestr, 'YYYY-MM-DD');
            mom.add(8, 'days');
            var newstr = mom.format('YYYY-MM-DD');

            async function queue(){
                var data = await makeSubRequest(pageCount, datestr, newstr); //use new string too
                payload = payload.concat(data);
                pageCount++;
                if (data.length >= 250) {
                    console.log('More than 250 subs');
                    queue();
                }
                else {
                    console.log('Got '+payload.length+' subs');
                    resolve(payload);
                    exportSubs(payload);
                    subsInCache = true;
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
                var data = await makeShopifyRequest(pageCount, datestr, null);
                payload = payload.concat(data);
                pageCount++;
                if (data.length >= 250) {
                    console.log('More than 250 orders');
                    queue();
                }
                else {
                    console.log('Got '+payload.length+' orders');
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

function makeFakeShopifyRequest(){
    return new Promise(function(resolve, reject){

        fs.readFile('./fake-orders.json', 'utf8', function(err, data) {
            console.log('reading file');
            if (err) console.log ('erroroor'+err);
            data = JSON.parse(data);
            console.log(err);
            console.log(data.shipping_lines);
            resolve(data.orders);
        });

    });
}

function makeShopifyRequest(page, datestr, newstr){
    return new Promise(function(resolve,reject){
        var url = rchost+'/orders?limit=250&scheduled_at_min='+datestr+'&scheduled_at_max='+datestr+'&page='+page;
        console.log('GET: '+url);
        var options = {
            headers: {
                'X-Recharge-Access-Token': rckey
            }
        }
        axios.get(url, options)
        .then(subs=>{
            resolve(subs.data.orders);
        })
        .catch(e=>{
            reject(e);
        });
    });
}

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
            console.log(subs.data);
            resolve(subs.data.charges);
        })
        .catch(e=>{
            reject(e);
        });
    });
}


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