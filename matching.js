const csv = require('fast-csv');
const axios = require('axios');
const fs = require('fs');
const rchost = 'https://api.rechargeapps.com';
const rckey = '2b26ea478533d01f34dacfb82e9a3a37da4cf0ab4ab3d24b948db990';

var source = [];

const stream = fs.createReadStream('data.csv');

csv.parseStream(stream, {headers:true, objectMode:true})
    .on('error', error => console.error(error))
    .on('data', row => {
        let obj = {
            subId: row['Subscription ID'],
            cusId: row.customer_id,
            name: row['first name'] + ' ' + row['Last name'],
            status: row['Woo Commerce On Hold'] === 'wc-active' ? 'ACTIVE' : row['Woo Commerce On Hold'] === 'wc-on-hold' ? 'CANCELLED': row['Woo Commerce On Hold'] === 'wc-cancelled' ? 'CANCELLED': row['Woo Commerce On Hold'] === 'wc-pending' ? 'PENDING' : 'BLANK',
            email: row.email.toLowerCase()
        }
        console.log('Status was '+row['Woo Commerce On Hold']+' so now it is '+obj.status);

        source.push(obj);
    })
    .on('end', rowCount => {
        console.log(`Parsed ${rowCount} rows`);
        //console.log(source);
       queue();
});


function makeShopifyRequest(page, datestr, newstr){
    return new Promise(function(resolve,reject){
        var url = rchost+'/subscriptions?limit=250&page='+page;
        console.log('GET: '+url);
        var options = {
            headers: {
                'X-Recharge-Access-Token': rckey
            }
        }
        axios.get(url, options)
        .then(subs=>{
            resolve(subs.data.subscriptions);
        })
        .catch(e=>{
            reject(e);
        });
    });
}

var payload = [];
var pageCount = 1;

async function queue(){
    var data = await makeShopifyRequest(pageCount); //use new string too
    //var data = await makeFakeShopifyRequest();
    payload = payload.concat(data);
    pageCount++;
    if (data.length >= 250) {
        console.log('More than 250 subs');
        console.log(data[0]);
        queue();
    }
    else {
        console.log('Got '+payload.length+' subs from recharge, compared to '+source.length+' in the CSV.');
        formatRCData();
    }
}

function formatRCData(){


    var data = payload.map(x=>{

        return {
            email: x.email.toLowerCase(),
            status: x.status,
            rechargeId: x.id
        }

    });

    runComparisons(data);

}

var matched = [];
var unmatched = [];


function runComparisons(data) {

    for (let x of source) {

        
        var matchedx = false;
        var subStatusMatch = false;
        var rcSub;

            for (let i=0; i<data.length; i++) {


                if (data[i].email === x.email) {
                    data[i].csvMatch = true;
                    matchedx = true;
                    rcSub = data[i].status;
                    subStatusMatch = rcSub === x.status;
                }

            }

            if (matchedx === true) {
                console.log('Matched sub '+x.cusId);
                x.subStatusMatch = subStatusMatch;
                x.rcSub = rcSub;
                    matched.push(x);
                }
            else {
    
                console.log('No match sub '+x.cusId);
                if (x.email !== undefined) {
                    unmatched.push(x);

                }
    
            }

    }

    var inRechargeButNotCsv = data.filter(zip=>{

        return zip.csvMatch !== true;

    })

    postResults(inRechargeButNotCsv);

}

function postResults(remainder) {

    console.log('Processing completed.');

    console.log('There were '+matched.length+' matches between Recharge the CSV file.');
    console.log(unmatched.length+' rows in the CSV file were not found in ReCharge');
    console.log('There were also '+remainder.length+' subs which were in Recharge, but not found in the CSV.');

    var filename = 'matched';
    
    var completed = matched.map(x => {
        return [x.cusId, x.subId, x.name, x.email, x.status, x.rcSub, x.subStatusMatch];
    });
    completed.unshift(['Customer ID', 'Subscription ID', 'Name', 'Email', 'Status in CSV', 'Status in Recharge', 'Status Match']);
    csv.writeToPath(__dirname+"/"+filename+".csv", completed, {headers: true})
    .on("finish", function(){
          console.log(filename+' file 1 created.');
    })
    .on("error", function(e){
        console.log('Error exporting CSV.');
        console.log(e);
    });


    var filename2 = 'unmatched';
    
    var completed2 = unmatched.map(x => {
        return [x.cusId, x.subId, x.name, x.email, x.status];
    });
    completed2.unshift(['Customer ID', 'Subscription ID', 'Name', 'Email', 'Status in CSV']);
    csv.writeToPath(__dirname+"/"+filename2+".csv", completed2, {headers: true})
    .on("finish", function(){
          console.log(filename+' file 2 created.');
    })
    .on("error", function(e){
        console.log('Error exporting CSV 2.');
        console.log(e);
    });

    
    var filename3 = 'recharge-only';
    
    var completed3 = remainder.map(x => {
        return [x.rechargeId, x.email, x.status];
    });
    completed3.unshift(['Recharge Customer ID', 'Email', 'Status in Recharge']);
    csv.writeToPath(__dirname+"/"+filename3+".csv", completed3, {headers: true})
    .on("finish", function(){
          console.log(filename+' file 3 created.');
    })
    .on("error", function(e){
        console.log('Error exporting CSV 3.');
        console.log(e);
    });


}
