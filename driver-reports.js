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
                //each route is a driver's route for the day
                var orderNumbers = [];

                //each route has multiple orders
                for (let order of route.stops) {
                    orderNumbers.push(order.orderNo);
                }
 
                //save the driver's name and their order ID's 
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
                    if (data !== null) {
                        console.log('CSV HAS BEEN GENERATED: '+data);
                        finalPayload.push(data);
                    }
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

        //next step is we need the full order details for every order to print on the report

        var body = {orders:[]};
        for (let order of details.orders) {
            body.orders.push({"orderNo":order});
        }
        axios.post(url, body)
        .then(x=>{

            var falseCount = 0;
            
            var orderData = x.data.orders.filter(z=>{
                if (z.success !== true) falseCount++; //if it returns false, it's usually because there are multiple orders with the same ID. This at least keeps track of how many bad requests there were
                if (z.success !== true) console.log(z); 
                return z.success === true;
            });

            if (orderData.length === 0) {
                resolve(null);
                return;
            }

            //now we have the order data, build the cSV

            var CSVGenerated = generateCSV(details.name, orderData, falseCount, date);
            CSVGenerated.then(csv=>{

                resolve(csv);

            })
            .catch(e=>{
                console.log(e);
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
    

                //a requirement is to have two summary tables at the top of the spreadsheet with totals.
                //these objects will be updated as we go through the orders

                var aggregates = {
                    meat2:0,
                    meat4:0,
                    meat6:0,
                    veg2:0,
                    veg4:0,
                    veg6:0
                };

                var aggregates_new = {
                    meat2:0,
                    meat4:0,
                    meat6:0,
                    veg2:0,
                    veg4:0,
                    veg6:0
                };

                //these two functions are used by .findIndex later
                function checkMeat(el) {
                    return el === 'meat';
                }

                function checkVeg(el) {
                    return el.startsWith('veg');
                }
    
                for (let z of data) { //go through order array

                    var agg_type = z.data.customField3 === 'New Customer' ? aggregates_new : aggregates; //new customer check (customField3 comes from recharge API)

                    var dish = z.data.customField2.toLowerCase(); //customField2 is the dish name. 

                    /*
                        The dish name (customField2) in recharge also holds the information on quantity. 
                        Usually something like 'Two Meat & Seafood'
                        It could also be 'four don't mind', in which case it alternates between Meat & Seafood and Vegetarian each week
                        It could also be two types per order e.g. 'Two Meat Four Veg'.

                        In order to summarise the information as per requirement, we have to normalise the data.
                        The following code parses the information out and updates the aggregate tables above.

                    */

                    if (dish.indexOf('meat')>-1 && dish.indexOf('veg')>-1) {
                        var dish_split = dish.split(' ');

                        var meat_index = dish_split.findIndex(checkMeat);
                        var veg_index = dish_split.findIndex(checkVeg);
                        var veg_quantity = dish_split[veg_index-1];
                        var meat_quantity = dish_split[meat_index-1];

                        meat_quantity = meat_quantity === 'two' ? 2 : 4; 
                        veg_quantity = veg_quantity === 'two' ? 2 : 4; 

                        agg_type[('meat'+meat_quantity)]++;
                        agg_type[('veg'+veg_quantity)]++;

                        console.log('added a double order:');
                        console.log('Meat: '+meat_quantity);
                        console.log('Veg: '+veg_quantity);
                    }
                    else {

                        var dishy = z.data.customField2.toLowerCase().indexOf("meat") > -1 ? 'meat' : 'veg';
                    
                        var quantity = z.data.customField1;
                        if (typeof quantity === 'string') quantity = parseInt(quantity);
                        agg_type[(dishy+quantity)]++;
                    }
                }

                //now the aggregate tables are done, we can use the normal dish name in the main section of the CSV.

                //simply map the order data array to the columns we need
    
                var orders = data.map(x => {
                    return [x.data.orderNo, x.data.customField2, x.data.customField1, x.data.location.notes, x.data.customField3];
                });

                var final = [ //csv library works by passing an array of arrays
                    ['Driver: '+name, ' ', ' ', ' ', ' '],
                    [' ', ' ', ' ', ' ', ' '],
                    ['Existing Customers', ' ', ' ', ' ', ' '],
                    ['Meat', 'Veg', ' ', ' ', ' '],
                    ['2 x '+aggregates.meat2, '2 x '+aggregates.veg2, ' ', ' ', ' '],
                    ['4 x '+aggregates.meat4, '4 x '+aggregates.veg4, ' ', ' ', ' '],
                    ['6 x '+aggregates.meat6, '6 x '+aggregates.veg6, ' ', ' ', ' '],
                    [' ', ' ', ' ', ' ', ' '],
                    ['New Customers', ' ', ' ', ' ', ' '],
                    ['Meat', 'Veg', ' ', ' ', ' '],
                    ['2 x '+aggregates_new.meat2, '2 x '+aggregates_new.veg2, ' ', ' ', ' '],
                    ['4 x '+aggregates_new.meat4, '4 x '+aggregates_new.veg4, ' ', ' ', ' '],
                    ['6 x '+aggregates_new.meat6, '6 x '+aggregates_new.veg6, ' ', ' ', ' '],
                    [' ', ' ', ' ', ' ', ' '],
                    ['Order No', 'Dish', 'Quantity', 'Customer Message', 'New Customer'],
                ];

                //add the orders to the end
                final = final.concat(orders);


                //quick count to display in the portal
                var totalOrders = 0;

                for(var el in aggregates) {
                    if(aggregates.hasOwnProperty(el)) {
                      totalOrders += aggregates[el];
                    }
                }
                for(var el2 in aggregates_new) {
                    if(aggregates_new.hasOwnProperty(el2)) {
                      totalOrders += aggregates_new[el2];
                    }
                }
    
                csv.writeToPath(__dirname+"/schedules/"+filename+".csv", final, {headers: true})
                .on("finish", function(){
                      console.log(filename+' file created.');

                      //send back to front end
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
                console.log('fuckin error');
                console.log(e);
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