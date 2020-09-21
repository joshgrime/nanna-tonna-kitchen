const axios = require('axios');
const uniqid = require('uniqid');
const { makeShopifyRequest } = require('./recharge-lib.js');
const moment = require('moment');

module.exports = {
    default: initialise
};

var weekMap = [
    'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
];

function makeOptimoRequest(payload){
    console.log('Uploading to Optimoroute:');
   //console.log(payload);
    return;
        axios.post('https://api.optimoroute.com/v1/create_or_update_orders', payload)
        .then(res=>{
            finishProcess(res.data);
        })
        .catch(e=>{
            console.log(e);
        });
}


var orderRequestCount = 1;
var orders = [];

async function queueOrderRequest(datestr){

    var m_datestr = moment(datestr, 'YYYY-MM-DD');
    m_datestr.add(1, 'days');
    var new_datestr = m_datestr.format('YYYY-MM-DD');

    var newOrders = await makeShopifyRequest(orderRequestCount, datestr);
    var subPayload = newOrders.filter(y=>{
        return y.scheduled_at.startsWith(new_datestr);
    });
    orders = orders.concat(subPayload);
    orderRequestCount++;
    if (newOrders.length >= 250) {
        queueOrderRequest(datestr);
    }
    else {
       // console.log(orders);
        console.log('there were '+orders.length+' orders');
        buildOptimoRequest();//buildOnFleetRequest();
        orderRequestCount = 1;
    }
}

function buildOptimoRequest(){
    
    var payload = {
        orders: []
    };
    
    for (let x of orders) {

        var note = x.shipping_address.company;
        var tagCheck = x.tags.indexOf('Subscription First Order') > -1;

        if (tagCheck === true) {
            note += ' New Customer';
        }

        var scheduleData = x.scheduled_at.split('T')[0];
        let newId = uniqid();

        var phone = x.shipping_address.phone.startsWith('44') ? '+' + x.shipping_address.phone : x.shipping_address.phone.startsWith('7') ? '0' + x.shipping_address.phone : x.shipping_address.phone;

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

            "orderNo": newId,
            "date": scheduleData,
            "duration": 2,
            "type": "D",
            "timeWindows": [
                {
                    "twFrom":"09:00",
                    "twTo":"17:00"
                }
            ],
            "priority": "M",
            "email": x.email,
            "phone": phone,
            "location": {
                "address": address
            },
            "notes": note
        }

        console.log(JSON.stringify(obj, null, 4));

        payload.orders.push(obj);
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
    console.log(repsonse);
}

function initialise() {

    console.log('initialised!');

    //this is currently set to get the orders for current day
    //current day orders are not available from subscriptions

    var date = new Date();
    todayIndex = date.getDay();
    tomorrowIndex = todayIndex + 1;
    var timeNow = moment();
    //timeNow.add(1, 'days');
    var datestr = timeNow.format('YYYY-MM-DD');

    queueOrderRequest(datestr);
}