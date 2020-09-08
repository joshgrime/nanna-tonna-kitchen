const axios = require('axios');
const { makeShopifyRequest } = require('./recharge-lib.js');

module.exports = {
    default: initialise
};

var weekMap = [
    'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
];

function makeOptimoRequest(payload){
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
    var newOrders = await makeShopifyRequest(orderRequestCount, datestr);
    orders = orders.concat(newOrders);
    orderRequestCount++;
    if (newOrders.orders.length >= 250) {
        queueOrderRequest(datestr);
    }
    else {
        buildOptimoRequest();
        orderRequestCount = 1;
    }
}

function buildOptimoRequest(){
    
    var payload = {
        orders: []
    };
    
    for (let x of orders) {

        var scheduleData = x.scheduled_at.split('T')[0];

        var obj = {

            "orderNo": x.id,
            "date": scheduleData,
            "duration": 2,
            "type": "T",
            "timeWindows": [
                {
                    "twFrom":"09:00",
                    "twTo":"17:00"
                }
            ],
            "allowedWeekdays": [weekMap[tomorrowIndex]],
            "priority": "M",
            "email": x.email,
            "phone": x.shipping_address.phone,
            "location": {
                "address": x.shipping_address.phone
            }
        }

        payload.orders.push(obj);
    }

    makeOptimoRequest(payload);
}

function finishProcess(response) {
    console.log('Orders successfully submitted to OptimoRoute');
    console.log(repsonse);
}

function initialise() {

    console.log('initialised!');
    return;

    //this is currently set to get the orders for current day. Check if this needs updating to 1 day in advance for pushing orders? when will this run?

    var date = new Date();
    todayIndex = date.getDay();
    tomorrowIndex = todayIndex + 1;

    var year = date.getFullYear();

    var month = date.getMonth();
    month++;
    month = month.toString();
    if (month.length<2) month = "0" + month;
    
    var day = date.getDate();
    day = day.toString();
    if (day.length<2) day = "0" + day;
    
    var datestr = year+'-'+month+'-'+day;

    queueOrderRequest(datestr);
}