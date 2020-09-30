const axios = require('axios');
const uniqid = require('uniqid');
const { makeShopifyRequest } = require('./recharge-lib.js');
const moment = require('moment');
const OR_KEY = process.env.OR_KEY;
//const nodeGeocoder = require('node-geocoder');
const csv = require('fast-csv');

const fs = require('fs');

/*var options = {
    provider: 'openstreetmap'
  };
   */
//var geocoder = nodeGeocoder(options);

module.exports = {
    default: initialise,
    getCSVFile: getCSVFile
};

var weekMap = [
    'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
];

function makeOptimoRequest(payload){
    console.log('Uploading to Optimoroute:');
        axios.post('https://api.optimoroute.com/v1/create_or_update_orders?key='+OR_KEY, payload)
        .then(res=>{
            finishProcess(res.data);
        })
        .catch(e=>{
            console.log(e);
        });
}



function queueOrderRequest(datestr, new_date){
    return new Promise(function(resolve, reject){

        
var orderRequestCount = 1;
var orders = [];

        async function queue(){
        var newOrders = await makeShopifyRequest(orderRequestCount, datestr);
        var subPayload = newOrders.filter(y=>{
            return y.scheduled_at.startsWith(new_date);
        });
        orders = orders.concat(subPayload);
        orderRequestCount++;
        if (newOrders.length >= 250) {
            queue();
        }
        else {
           // console.log(orders);
            console.log('there were '+orders.length+' orders');
            //buildOptimoRequest(new_datestr);//buildOnFleetRequest();
            resolve(orders);
        }
    }

    queue();

    }); 

}

async function buildOptimoRequest(date){
    
    var payload = {
        orders: []
    };

    var anchorDate = moment('21-09-2020', 'DD-MM-YYYY');

    var today = moment(date, 'YYYYMMDD');
        var weekA = false;
        var difference = today.diff(anchorDate, 'weeks');

        if (difference === 0) weekA = true;
        else if (difference % 2 === 0) weekA = true;
    
    for (let x of orders) {


        var note = ' ' + x.shipping_address.company;

        


        var newCust = ' ';

        if (tagCheck === true) {
            note += ' New Customer';
            newCust = 'Yes';
        }

        var scheduleData = x.scheduled_at.split('T')[0];
        let newId = uniqid();

        var phone = x.shipping_address.phone.startsWith('44') ? '+' + x.shipping_address.phone : x.shipping_address.phone.startsWith('7') ? '0' + x.shipping_address.phone : x.shipping_address.phone;

        var shipping_address2 = '';
        if (x.shipping_address.address2 !== "null" && x.shipping_address.address2 !== null && x.shipping_address.address2 !== "") {
            shipping_address2 = x.shipping_address.address2 + ', ';
        }

        var variant = x.line_items[0].variant_title;
        var _variant = variant.toLowerCase();

        var quantity;

        if (_variant.indexOf('meat')>-1 && _variant.indexOf('veg')>-1) {

            var dish_split = dish.split(' ');

            var meat_index = dish_split.findIndex(checkMeat);
            var veg_index = dish_split.findIndex(checkVeg);
            var veg_quantity = dish_split[veg_index-1];
            var meat_quantity = dish_split[meat_index-1];

            quantity = parseInt(veg_quantity) + parseInt(meat_quantity);

        }
        else {
            quantity = x.line_items[0].variant_title.substring(0,1);
        }
        if (_variant.indexOf('vegetarian') === -1 && _variant.indexOf('meat') === -1) {
            var properties = x.properties;
            if (x.properties === undefined) properties = x.line_items[0].properties;
            if (properties.length > 0) {
                var prop = properties.filter(prop=>{
                    return prop.name === 'Dont Mind'
                });
                if (prop.length>0) {
                    var variant_split = prop[0].value.split(' ');
                    var dishNumber = variant_split[variant_split.length-1];
                    var label;

                    if (weekA === true) {
                
                        if (dishNumber === 'One') {
                            label = 'Meat & Seafood';
                        }
                        else {
                            label = 'Vegetarian';
                        }
        
                    }
                    else {
                        if (dishNumber === 'One') {
                            label = 'Vegetarian';
                        }
                        else {
                            label = 'Meat & Seafood';
                        }
                    }
                    variant = label;
                }
            }
        }
        else {
                variant = variant_split[variant_split.length-1];
        }

    

    
        var address = x.shipping_address.address1 + ', ' +
        shipping_address2 +
        x.shipping_address.city + ', ' +
        x.shipping_address.zip + ', ' +
        x.shipping_address.country;

        var location = await geocoder.geocode(x.shipping_address.address1 + shipping_address2);

        var lat;
        var long;

        if (location.length>0) {
            lat = location[0].latitude;
            long = location[0].longitude;    
        }
        else {
            lat = 0.0;
            long = 0.0;
        }

        console.log(location);
        console.log(lat);
        console.log(long);


        var obj = {

            "orderNo": newId,
            "date": scheduleData,
            "duration": 4,
            "type": "D",
            "timeWindows": [
                {
                    "twFrom":"00:00",
                    "twTo":"23:59"
                }
            ],
            "email": x.email,
            "phone": phone,
            "location": {
                "address": address,
                "locationNo": x.shipping_address.zip,
                "locationName": x.shipping_address.address1 + ', ' + x.shipping_address.zip,
                "latitude": lat,
                "longitude": long
            },
            "notes": note,
            "customField1": quantity,//dish quantity,
            "customField2": variant, //dish type,
            "customField3": newCust, //new customer
        }

        payload.orders.push(obj);
        //console.log(obj);
    }
   makeOptimoRequest(payload);
    orders = [];
}

function buildOnFleetRequest(){

    var payload = {
        tasks: []
    }

    for (let x of orders) {
        var name = x.first_name + ' ' + x.last_name;

        var product_notes_array = x.line_items.map(item=> {
            return item.product_title;
        });
        
    
        var product_notes = product_notes_array.join(' + ');

        var shipping_address2 = '';
        if (x.shipping_address.address2 !== "null" && x.shipping_address.address2 !== null && x.shipping_address.address2 !== "") {
            shipping_address2 = x.shipping_address.address2 + ', ';
        }
    
        var address = x.shipping_address.address1 + ', ' +
        shipping_address2 +
        x.shipping_address.city + ', ' +
        x.shipping_address.zip + ', ' +
        x.shipping_address.country;
    
        var obj = {
            "destination": {
                "address": {
                    "unparsed":address
                }
            },
            "recipients": [
                    {
                        "name": name,
                        "phone": x.shipping_address.phone,
                        "notes": x.email
                    }
                ],
            "notes": product_notes,
            "autoAssign": {
                "mode":"distance"
            }
        };

        console.log(obj);


        payload.tasks.push(obj);

    }
    

}

function finishProcess(response) {
    console.log('Orders successfully submitted to OptimoRoute');
    console.log(response);
}

function buildCSV(data, new_date_){
    console.log('buildin gcsv with '+data.length+' orders');
    return new Promise(function(resolve, reject) {
        try {
        var orderMap = [];

        var anchorDate = moment('21-09-2020', 'DD-MM-YYYY');

        var today = moment(new_date_, 'YYYY-MM-DD');

            var weekA = false;
            var difference = today.diff(anchorDate, 'weeks');
    
            if (difference === 0) weekA = true;
            else if (difference % 2 === 0) weekA = true;

            function checkMeat(el) {
                return el === 'meat';
            }

            function checkVeg(el) {
                return el.startsWith('veg');
            }

            function convertToNum(textNumber) {
                let tn = textNumber.toLowerCase();
                var num = tn === 'two' ? 2 : tn === 'four' ? 4 : 6;
                return num;
            }
        
        for (let x of data) {
    
    
            var note = ' ' + x.shipping_address.company;
            var newCust = ' ';

            if (x.total_price === '0.00' && x.total_discounts === '0.0') {
                newCust = 'New Customer';
            }

            var __phone = x.shipping_address.phone !== null ? x.shipping_address.phone : '';

            var phone = __phone.startsWith('44') ? '+' + __phone : __phone.startsWith('7') ? '0' + __phone : __phone;
            var variant = x.line_items[0].variant_title;
            var _variant = variant.toLowerCase();

            var variant = x.line_items[0].variant_title;
            var _variant = variant.toLowerCase();

        var quantity;

        if (_variant.indexOf('meat')>-1 && _variant.indexOf('veg')>-1) {

            var dish_split = _variant.split(' ');
            var meat_index = dish_split.findIndex(checkMeat);
            var veg_index = dish_split.findIndex(checkVeg);
            var veg_quantity = dish_split[veg_index-1];
            var meat_quantity = dish_split[meat_index-1];
            quantity = convertToNum(veg_quantity) + convertToNum(meat_quantity);

        }
        else {
            quantity = x.line_items[0].variant_title.substring(0,1);
        }
    
            if (_variant.indexOf('vegetarian') === -1 && _variant.indexOf('meat') === -1) {
                var properties = x.properties;
                if (x.properties === undefined) properties = x.line_items[0].properties;
                if (properties.length > 0) {
                    var prop = properties.filter(prop=>{
                        return prop.name === 'Dont Mind'
                    });
                    if (prop.length>0) {
                        var variant_split = prop[0].value.split(' ');
                        var dishNumber = variant_split[variant_split.length-1];
                    }
                    else {
                        var dishNumber = 'One';
                    }
                }
                else {
                    var dishNumber = 'One';
                }
                var label;
                    
    
                        if (weekA === true) {
                    
                            if (dishNumber === 'One') {
                                label = 'Meat & Seafood';
                            }
                            else {
                                label = 'Vegetarian';
                            }
            
                        }
                        else {
                            if (dishNumber === 'One') {
                                label = 'Vegetarian';
                            }
                            else {
                                label = 'Meat & Seafood';
                            }
                        }
                        variant = label;
                }
            else {
                var variant_split = variant.split(' / ');
    
                if (variant_split.length > 3) {
    
                variant = variant_split[variant_split.length-2] + ' + ' + variant_split[variant_split.length-1];
                    
    
                }
                else {
                    variant = variant_split[variant_split.length-1];
    
                }
    
            }

            orderMap.push([x.id, x.shipping_address.first_name, x.shipping_address.last_name, x.email, phone, x.shipping_address.address1, x.shipping_address.address2, note, x.shipping_address.zip, variant, quantity, newCust, x.line_items[0].quantity]);

        }

        orderMap.unshift(['Order ID', 'First name', 'Surname', 'Email', 'phone', 'Address 1', 'Address 2', 'Notes', 'Postcode', 'Dish', 'Quantity', 'New customer', 'Box']);

        var filename = 'orders-'+ today.format('YYYY-MM-DD');     

        csv.writeToPath(__dirname+"/schedules/"+filename+".csv", orderMap, {headers: true})
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

function initialise(datestr) {

    console.log('initialised!');

    //this is currently set to get the orders for current day
    //current day orders are not available from subscriptions
    return new Promise(function(resolve, reject) {
        var date = new Date();
        todayIndex = date.getDay();
        tomorrowIndex = todayIndex + 1;
        var new_date = moment(datestr);
        var new_date_ = new_date.format('YYYY-MM-DD');
        var orders = queueOrderRequest(datestr, new_date_);
        orders.then(x=>{
            var csv = buildCSV(x, new_date_);
            csv.then(y=>{
                resolve(y);
            });
        });
    });
}
        


function getCSVFile(fileName) {
    if (!fs.existsSync(__dirname+"/schedules/")){
        return null;
    }
    else {
        var file = fs.readFileSync(__dirname+"/schedules/"+fileName);
        return file;
    }
}