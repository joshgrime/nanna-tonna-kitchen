const axios = require('axios');
const csv = require('fast-csv');
const fs = require('fs');
const OR_KEY = process.env.OR_KEY;
const OR_API = 'https://api.optimoroute.com/v1';

function getRoutes(date){
    return new Promise(function(resolve, reject) {
        var url = OR_API + '/get_routes?key='+OR_KEY+'&date='+date;

        axios.get(url)
        .then(data=>{

            var payload = [];

            for (let route of data.data.routes) {

                var orderNumbers = [];

                for (let order of route.stops) {
                    orderNumbers.push(order.orderNo);
                }
 
                payload.push({
                    name: route.driverName,
                    orders: orderNumbers
                });

            }

            var finalPayload = [];

            var count=0;
            async function queue() {
                if (count >= payload.length) {
                    resolve(finalPayload);
                }
                else {
                    var data = await generateDriverReport(payload[count], date);
                    if (data !== null) finalPayload.push(data);
                    count++;
                    queue();
                }
            }

            queue();

        })

    });
}

function generateDriverReport(details, date){
    return new Promise(function(resolve, reject) {
        var url = OR_API + '/get_orders?key=' + OR_KEY;
        var body = {orders:[]};
        for (let order of details.orders) {
            body.orders.push({"orderNo":order});
        }
        axios.post(url, body)
        .then(x=>{

            var falseCount = 0;
            
            var orderData = x.data.orders.filter(z=>{
                if (z.success !== true) falseCount++;
                return z.success === true;
            });

            if (orderData.length === 0) {
                resolve(null);
                return;
            }

            var CSVGenerated = generateCSV(details.name, orderData, falseCount, date);
            CSVGenerated.then(csv=>{

                resolve(csv);

            })
            .catch(e=>{
                reject(e);
            })
        })

    });
}

function generateCSV(name, data, falseCount, date){
    return new Promise(function(resolve, reject) {

        try {
            if (!fs.existsSync(__dirname+"/schedules/")){
                fs.mkdirSync(__dirname+"/schedules/");
            }
     
                var filename = name +'-schedule-'+ date;           
    
                var aggregates = {
                    meat2:0,
                    meat4:0,
                    meat6:0,
                    veg2:0,
                    veg4:0,
                    veg6:0
                };

                function checkMeat(el) {
                    return el === 'meat';
                }

                function checkVeg(el) {
                    return el === 'veg';
                }
    
                for (let z of data) {
                    var dish = z.data.customField2.toLowerCase()

                    if (dish.indexOf('meat')>-1 && dish.indexOf('veg')>-1) {

                        var dish_split = dish.split(' ');
                        console.log('DISH SPLIT: ');
                        console.log(dish_split);

                        var meat_index = dish_split.findIndex(checkMeat);
                        var veg_index = dish_split.findIndex(checkVeg);
                        console.log('MEAT INDEX FOUND');
                        console.log(meat_index);                        
                        console.log('VEG INDEX FOUND');
                        console.log(veg_index);
                        var veg_quantity = dish_split[veg_index-1];
                        var meat_quantity = dish_split[meat_index-1];

                        aggregates[('meat'+meat_quantity)]++;
                        aggregates[('veg'+veg_quantity)]++;

                        console.log('added a double order:');
                        console.log('Meat: '+meat_quantity);
                        console.log('Veg: '+veg_quantity);
                    }
                    else {

                        var dishy = z.data.customField2.toLowerCase().indexOf("meat") > -1 ? 'meat' : 'veg';
                    
                        var quantity = z.data.customField1;
                        if (typeof quantity === 'string') quantity = parseInt(quantity);
                        aggregates[(dishy+quantity)]++;
                    }



                }
    
                var orders = data.map(x => {
                    return [x.data.orderNo, x.data.customField2, x.data.customField1, x.data.location.notes, x.data.customField3];
                });

                orders.unshift(['Order No', 'Dish', 'Quantity', 'Customer Message', 'New Customer']);
                orders.unshift([' ', ' ', ' ', ' ', ' ']);
                orders.unshift(['Driver: '+name, ' ', ' ', ' ', ' ']);
                orders.push([' ', ' ', ' ', ' ', ' ']);
                orders.push(['Driver Summary', ' ', ' ', ' ', ' ']);
                orders.push(['Meat & Seafood', 'Veg', ' ', ' ', ' ']);
                orders.push(['2 x '+aggregates.meat2, '2 x '+aggregates.veg2, ' ', ' ', ' ']);
                orders.push(['4 x '+aggregates.meat4, '4 x '+aggregates.veg4, ' ', ' ', ' ']);
                orders.push(['6 x '+aggregates.meat6, '6 x '+aggregates.veg6, ' ', ' ', ' ']);

                var totalOrders = 0;

                for(var el in aggregates) {
                    if(aggregates.hasOwnProperty(el)) {
                      totalOrders += aggregates[el];
                    }
                }
    
                csv.writeToPath(__dirname+"/schedules/"+filename+".csv", orders, {headers: true})
                .on("finish", function(){
                      console.log(filename+' file created.');
                      resolve({
                          driver: name,
                          file: filename,
                          total: totalOrders,
                          false: falseCount
                      });
                })
                .on("error", function(e){
                    console.log('Error exporting CSV.');
                    console.log(e);
                    reject(e);
                })
        
            }
            catch (e) {
                reject(e)
            }
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

module.exports = {
    getRoutes:getRoutes,
    getCSVFile: getCSVFile
}