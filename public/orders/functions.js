async function getTodayOrders(){
    await addDate();
    document.getElementById('full-list-loading').style.display = 'block';
    document.getElementById('summary-loading').style.display = 'block';
    var dataRequest = httpReq(window.location.protocol+'//'+window.location.host+'/today-orders', 'GET');
    dataRequest.then(x=>{
        var data = JSON.parse(x);
        buildTable(data[1]);
        buildTodayOrder(data[0]);
    });
}



/* 
    if week A = false, dish 1 is veg and dish 2 is meat.
    if week A= true, dish 1 is meat and dish 2 is veg
*/

function addDate(){
return new Promise(function(resolve, reject) {
    var weekA = false;
    var today = moment();

    var date_display_string = today.format('DD/MM/YYYY');

    var anchorDate = moment('21-09-2020', 'DD-MM-YYYY');
    var difference = today.diff(anchorDate, 'weeks');

    if (difference === 0) weekA = true;
    else if (difference % 2 === 0) weekA = true;

    var content = weekA === true ? 'Dish 1: Meat & Seafood<br />Dish 2: Vegetarian' : 'Dish 1: Vegetarian<br />Dish 2: Meat & Seafood';

    $('#date-display').append('<h2>'+date_display_string+'</h2><p /><h1>'+content+'</h1>');
    resolve();

});
}

function buildTodayOrder(data) {

    console.log(data[0].date);

    var aggregate = [];
    var anchorDate = moment('21-09-2020', 'DD-MM-YYYY');
    var today = moment(data.date, 'YYYYMMDD');
    var weekA = false;
    var difference = today.diff(anchorDate, 'weeks');

    if (difference === 0) weekA = true;
    else if (difference % 2 === 0) weekA = true;

    for (let x of data) {

            var productTitle = x.line_items[0].title;
    
            var variant = x.line_items[0].variant_title;
    
            var _variant = x.line_items[0].variant_title.toLowerCase();
    
            if (_variant.indexOf('vegetarian') === -1 && _variant.indexOf('meat') === -1) {
                var properties = x.line_items[0].properties;
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
                        variant += (' - ' + label);

                    }
                }
            }
    
            var tagCheck = x.tags.indexOf('Subscription First Order') > -1;
        
            aggregate.push({
                productTitle: productTitle,
                variant: variant,
                firstOrder: tagCheck
            });
        
    }
    createTodayAggregates(aggregate);

}


async function createTodayAggregates(data) {
    var newCustomerPayload = {
        today: {
            meat2:0,
            meat4:0,
            meat6:0,
            veg2:0,
            veg4:0,
            veg6:0
        },
        new: {
            meat2:0,
            meat4:0,
            meat6:0,
            veg2:0,
            veg4:0,
            veg6:0
        }
    };
    var anchorDate = moment('21-09-2020', 'DD-MM-YYYY');

    var todayDate = moment().format('YYYYMMDD');
    var today = moment(todayDate, 'YYYYMMDD');
    for (let x of data) {
        
        var weekA = false;
        var difference = today.diff(anchorDate, 'weeks');

        if (difference === 0) weekA = true;
        else if (difference % 2 === 0) weekA = true;

        var variant = x.variant.toLowerCase();
        var variant_split = x.variant.split(' ');
        var quantity = variant_split[0];
        quantity = parseInt(quantity);

        var label = variant.indexOf('vegetarian') > -1 ? 'veg' : variant.indexOf('meat') > -1 ? 'meat' : 'dontmind';

        if (label === 'dontmind') {
        
            
            var dishNumber = variant_split[variant_split.length-1];

            if (weekA === true) {
                if (dishNumber === 'One') {
                    label = 'meat';
                }
                else {
                    label = 'veg';
                }
            }
            else {
                if (dishNumber === 'One') {
                    label = 'veg';
                }
                else {
                    label = 'meat';
                }
            }

        }
        var variantJoined = variant.replace(/ /g, '');
        var variantIndex = variantJoined.indexOf('people');
        variantIndex--;
        var quantity = parseInt(variantJoined[variantIndex]);

        newCustomerPayload['today'][label+quantity]++;
        if (x.firstOrder === true) newCustomerPayload['new'][label+quantity]++
    }

    var newCustomerSummaryHold = $('<div class="summary-hold"></div>');

    var newCustomerHeaderRow = $('<div class="summary-row"></div>');
    newCustomerSummaryHold.append(newCustomerHeaderRow);

    newCustomerHeaderRow.append('<div class="summary-cell top">Dish</div>');
    newCustomerHeaderRow.append('<div class="summary-cell top">Total<br />'+today.format('DD/MM')+'</div>');
    newCustomerHeaderRow.append('<div class="summary-cell top">New Customers<br />'+today.format('DD/MM')+'</div>');

    var new_meatRow1 = $('<div class="summary-row"></div>');
    newCustomerSummaryHold.append(new_meatRow1);
    buildNewCustSummaryRow(new_meatRow1, 'meat2', newCustomerPayload, 'Meat & Seafood 2');

    var new_meatRow2 = $('<div class="summary-row"></div>');
    newCustomerSummaryHold.append(new_meatRow2);
    buildNewCustSummaryRow(new_meatRow2, 'meat4', newCustomerPayload, 'Meat & Seafood 4');

    var new_meatRow3 = $('<div class="summary-row"></div>');
    newCustomerSummaryHold.append(new_meatRow3);
    buildNewCustSummaryRow(new_meatRow3, 'meat6', newCustomerPayload, 'Meat & Seafood 6');

    var new_vegRow1 = $('<div class="summary-row"></div>');
    newCustomerSummaryHold.append(new_vegRow1);
    buildNewCustSummaryRow(new_vegRow1, 'veg2', newCustomerPayload, 'Vegetarian 2');

    var new_vegRow2 = $('<div class="summary-row"></div>');
    newCustomerSummaryHold.append(new_vegRow2);
    buildNewCustSummaryRow(new_vegRow2, 'veg4', newCustomerPayload, 'Vegetarian 4');

    var new_vegRow3 = $('<div class="summary-row"></div>');
    newCustomerSummaryHold.append(new_vegRow3);
    buildNewCustSummaryRow(new_vegRow3, 'veg6', newCustomerPayload, 'Vegetarian 6');

    $('#new-summary-data').append(newCustomerSummaryHold);

    $('#new-summary-data').append(newCustomerSummaryHold);

    document.getElementById('new-summary-loading').style.display = 'none';
    document.getElementById('new-summary-data').style.display = 'block';
}

function buildTable(data) {
    

    var aggregate = [];

    var tableSections = {};

    var anchorDate = moment('21-09-2020', 'DD-MM-YYYY');

    for (let x of data) {
        
        var today = moment(x.date, 'YYYYMMDD');
        var weekA = false;
        var difference = today.diff(anchorDate, 'weeks');

        if (difference === 0) weekA = true;
        else if (difference % 2 === 0) weekA = true;

            let tr = $('<tr></tr>');
            var email = x.email;
            var productTitle = x.product_title;
            if (x.product_title === undefined) productTitle = x.line_items[0].title;

    
            var variant = x.variant_title;
            if (x.variant_title === undefined) variant = x.line_items[0].variant_title;
            var _variant = variant.toLowerCase();

            
    
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
    
                        
                        variant += (' - ' + label);
                    }
                }

            }
            var quantity = x.quantity;
            if (x.quantity === undefined) quantity = x.line_items[0].quantity;
            var schedule_date = x.scheduled_at.split('T')[0].replace(/-/g, '');
            schedule_date = parseInt(schedule_date);
    
            tr.append('<td>'+email+'</td>');
            tr.append('<td>'+productTitle+'</td>');
            tr.append('<td>'+variant+'</td>');
            tr.append('<td>'+quantity+'</td>');
    
            if (typeof tableSections[schedule_date] !== 'object') tableSections[schedule_date] = [];
        
            tableSections[schedule_date].push(tr);
    
            aggregate.push({
                name: name,
                email: email,
                productTitle: productTitle,
                variant: variant,
                quantity: quantity,
                date: schedule_date,
            });

    }

        sortTable(tableSections);

       createAggregates(aggregate);

       document.getElementById('full-list-loading').style.display = 'none';
       document.getElementById('full-data').style.display = 'block';

}

function sortTable(tableSections) {


    var table = $('<table></table>');
    var tableHeader = $('<tr class="toprow"></tr>');

    var allowedAttributes = [
        'Contact',
        'Product Title',
        'Variants',
        'Quantity'
    ]

    for (let z of allowedAttributes) {
        tableHeader.append('<td>'+z+'</td>');
    }

    table.append(tableHeader);

    
    var keys = Object.keys(tableSections);
    var sortedKeys = keys.sort(compareNumbers);

    for (let x of sortedKeys) {

        var date_str = formatDateNicely(x);
        var tr_head = $('<tr class="tr_sub"><td><h2 class="date_header">'+date_str+'</h2></td></tr>');
        table.append(tr_head);

        for (let y of tableSections[x]) {
            table.append(y);
        }

    }

    $('#full-data').append(table);

}

async function createAggregates(data) {

    var payload = {
        monday: {
            meat2:0,
            meat4:0,
            meat6:0,
            veg2:0,
            veg4:0,
            veg6:0
        },
        tuesday: {
            meat2:0,
            meat4:0,
            meat6:0,
            veg2:0,
            veg4:0,
            veg6:0
        },
        wednesday: {
            meat2:0,
            meat4:0,
            meat6:0,
            veg2:0,
            veg4:0,
            veg6:0
        },
        thursday: {
            meat2:0,
            meat4:0,
            meat6:0,
            veg2:0,
            veg4:0,
            veg6:0
        },
        friday: {
            meat2:0,
            meat4:0,
            meat6:0,
            veg2:0,
            veg4:0,
            veg6:0
        },
        nextWeekMonTue: {
            meat2:0,
            meat4:0,
            meat6:0,
            veg2:0,
            veg4:0,
            veg6:0
        },
        nextWeekWedThur: {
            meat2:0,
            meat4:0,
            meat6:0,
            veg2:0,
            veg4:0,
            veg6:0
        },
        weekAfterNext: {
            meat2:0,
            meat4:0,
            meat6:0,
            veg2:0,
            veg4:0,
            veg6:0
        }
    };
    var _dates = await getDateData();

    console.log(_dates);

    
    var anchorDate = moment('21-09-2020', 'DD-MM-YYYY');

    for (let x of data) {
        
        var today = moment(x.date, 'YYYYMMDD');
        var weekA = false;
        var difference = today.diff(anchorDate, 'weeks');

        if (difference === 0) weekA = true;
        else if (difference % 2 === 0) weekA = true;

        var variant = x.variant.toLowerCase();
        var variant_split = x.variant.split(' ');
        var quantity = variant_split[0];
        quantity = parseInt(quantity);

        var label = variant.indexOf('vegetarian') > -1 ? 'veg' : variant.indexOf('meat') > -1 ? 'meat' : 'dontmind';

        if (label === 'dontmind') {
        
            
            var dishNumber = variant_split[variant_split.length-1];

            if (weekA === true) {
                
                if (dishNumber === 'One') {
                    label = 'meat';
                }
                else {
                    label = 'veg';
                }

            }
            else {
                if (dishNumber === 'One') {
                    label = 'veg';
                }
                else {
                    label = 'meat';
                }
            }

        }

        var date = x.date.toString();
        var variantJoined = variant.replace(/ /g, '');
        var variantIndex = variantJoined.indexOf('people');
        variantIndex--;
        var quantity = parseInt(variantJoined[variantIndex]);

        //find the date to put it in
        let key1;
        let key2;

        for (let x in _dates) {
            if (x !== 'colDates') {
                if (typeof _dates[x] === 'string') {
                    if (_dates[x] === date) {
                        key1 = x;
                        the_date = date;
                    }
                }
                if (typeof _dates[x] === 'object') {
                    var d = _dates[x].filter(da=>{
                        return da === date; 
                    });
                    if (d.length>0) {

                        key2 = x;
                    }
                }
            }
        }

        if (key1 === 'monday' || key2 === 'tuesday') {
            console.log('KEY 1 mon/tue: '+key2);
        }

        quantity = quantity.toString();
        if (key1 !== undefined) {
            payload[key1][label+quantity]++;
        }
        if (key2 !== undefined) {
            payload[key2][label+quantity]++;
        }

    }

    var summaryHold = $('<div class="summary-hold"></div>');

    var headerRow = $('<div class="summary-row"></div>');
    summaryHold.append(headerRow);

    headerRow.append('<div class="summary-cell top">Dish</div>');
    headerRow.append('<div class="summary-cell top">Next Week: Mon & Tue</div>');
    headerRow.append('<div class="summary-cell top">Next Week: Wed - Fri</div>');
    headerRow.append('<div class="summary-cell top">Week after next</div>');
    headerRow.append('<div class="summary-cell top">Monday<br />'+_dates.colDates.monday+'</div>');
    headerRow.append('<div class="summary-cell top">Tuesday<br />'+_dates.colDates.tuesday+'</div>');
    headerRow.append('<div class="summary-cell top">Wednesday<br />'+_dates.colDates.wednesday+'</div>');
    headerRow.append('<div class="summary-cell top">Thursday<br />'+_dates.colDates.thursday+'</div>');
    headerRow.append('<div class="summary-cell top">Friday<br />'+_dates.colDates.friday+'</div>');

    var meatRow1 = $('<div class="summary-row"></div>');
    summaryHold.append(meatRow1);
    buildSummaryRow(meatRow1, 'meat2', payload, 'Meat & Seafood 2');

    var meatRow2 = $('<div class="summary-row"></div>');
    summaryHold.append(meatRow2);
    buildSummaryRow(meatRow2, 'meat4', payload, 'Meat & Seafood 4');

    var meatRow3 = $('<div class="summary-row"></div>');
    summaryHold.append(meatRow3);
    buildSummaryRow(meatRow3, 'meat6', payload, 'Meat & Seafood 6');

    var vegRow1 = $('<div class="summary-row"></div>');
    summaryHold.append(vegRow1);
    buildSummaryRow(vegRow1, 'veg2', payload, 'Vegetarian 2');

    var vegRow2 = $('<div class="summary-row"></div>');
    summaryHold.append(vegRow2);
    buildSummaryRow(vegRow2, 'veg4', payload, 'Vegetarian 4');

    var vegRow3 = $('<div class="summary-row"></div>');
    summaryHold.append(vegRow3);
    buildSummaryRow(vegRow3, 'veg6', payload, 'Vegetarian 6');

    

    $('#summary-data').append(summaryHold);
    
    
    document.getElementById('summary-loading').style.display = 'none';
    document.getElementById('summary-data').style.display = 'block';

}

function buildSummaryRow(parent, key, payload, dish) {
    parent.append('<div class="summary-cell">'+dish+'</div>');
    parent.append('<div class="summary-cell">'+payload.nextWeekMonTue[key]+'</div>');
    parent.append('<div class="summary-cell">'+payload.nextWeekWedThur[key]+'</div>');
    parent.append('<div class="summary-cell">'+payload.weekAfterNext[key]+'</div>');
    parent.append('<div class="summary-cell">'+payload.monday[key]+'</div>');
    parent.append('<div class="summary-cell">'+payload.tuesday[key]+'</div>');
    parent.append('<div class="summary-cell">'+payload.wednesday[key]+'</div>');
    parent.append('<div class="summary-cell">'+payload.thursday[key]+'</div>');
    parent.append('<div class="summary-cell">'+payload.friday[key]+'</div>');
}

function buildNewCustSummaryRow(parent, key, payload, dish) {
    parent.append('<div class="summary-cell">'+dish+'</div>');
    parent.append('<div class="summary-cell">'+payload.today[key]+'</div>');
    parent.append('<div class="summary-cell">'+payload.new[key]+'</div>');
}


function getDateData(){
return new Promise(function(resolve, reject){
    var payload = {
        monday:'',
        tuesday:'',
        wednesday:'',
        thursday:'',
        friday:'',
        nextWeekMonTue: [],
        nextWeekWedThur: [],
        weekAfterNext: [],
        colDates:{}
    }

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

    console.log('Date string is '+datestr);
    console.log(datestr)

    var currentDay = moment(datestr, "YYYY-MM-DD");
    currentDay.add(1, 'days'); //todays orders are blank

    var weekEndCheck = currentDay.format("dd");
    if (weekEndCheck === 'Sa') currentDay.add(2, 'days');
    else if (weekEndCheck === 'Su') currentDay.add(1, 'days');



    var todayIndex = currentDay.format("d");
    todayIndex = parseInt(todayIndex);



    for (let i=todayIndex; i<6; i++) {

        let thisDay;

        if (i===1) thisDay = 'monday';
        else if (i===2) thisDay = 'tuesday';
        else if (i===3) thisDay = 'wednesday';
        else if (i===4) thisDay = 'thursday';
        else if (i===5) thisDay = 'friday';

        var d = currentDay.format("YYYYMMDD");

        console.log(thisDay +' is '+d);

        payload[thisDay] = d;
        payload.colDates[thisDay] = d.substring(d.length-2, d.length);

        currentDay.add(1, 'days');
    }

    currentDay.add(2, 'days');//covers the weekend

    var daysLeftToDo = todayIndex - 1;

    for (let i=0; i<daysLeftToDo; i++) {

        let thisDay;
        if (i===0) thisDay = 'monday';
        else if (i===1) thisDay = 'tuesday';
        else if (i===2) thisDay = 'wednesday';
        else if (i===3) thisDay = 'thursday';
        else if (i===4) thisDay = 'friday';

        
        var d = currentDay.format("YYYYMMDD");

        payload[thisDay] = d;
        payload.colDates[thisDay] = d.substring(d.length-2, d.length);

        currentDay.add(1, 'days');
    }

    var _todayIndex = currentDay.format("d");
    _todayIndex = parseInt(todayIndex);

    if (_todayIndex === 0) todayIndex = 6;
    else _todayIndex--;

    payload.nextWeekMonTue = monTueNextWeek(datestr, _todayIndex);
    payload.nextWeekWedThur = wedThurFriNextWeek(datestr, _todayIndex);
    payload.weekAfterNext = weekAfterNext(datestr, _todayIndex);

    resolve(payload);
    });
}

function formatDateNicely(datestr) {
    var mm = moment(datestr, "YYYYMMDD");
    var niceDate = mm.format("dddd, MMMM Do");
    return niceDate;
}

function formatWeekDayNicely(datestr) {
    var mm = moment(datestr, "YYYYMMDD");
    var niceDate = mm.format("ddd");
    return niceDate;
}

function compareNumbers(a, b) {
    return a - b;
}

function monTueNextWeek(datestr, dayOfWeek) { //gets monday and tuesday next week dates
    console.log('HIT MON TUE NEXT WEEK WITH');
    console.log(datestr);
    console.log(dayOfWeek);
    var daysToAdd = 8; //to monday
    daysToAdd -= dayOfWeek;

    console.log('Adding '+daysToAdd);
    var new_date = moment(datestr, "YYYY-MM-DD").add(daysToAdd, 'days');
    var monday = new_date.format('YYYYMMDD');
    new_date.add(1, 'days');
    var tuesday = new_date.format('YYYYMMDD');
    return [monday, tuesday];
}

function wedThurFriNextWeek(datestr, dayOfWeek) { //gets weds thurs and friday next week dates
    var daysToAdd = 10; //to weds
    daysToAdd -= dayOfWeek;
    var new_date = moment(datestr, "YYYY-MM-DD").add(daysToAdd, 'days');
    var wednesday = new_date.format('YYYYMMDD');
    new_date.add(1, 'days');
    var thursday = new_date.format('YYYYMMDD');
    new_date.add(1, 'days');
    var friday = new_date.format('YYYYMMDD');
    return [wednesday, thursday, friday];
}

function weekAfterNext(datestr, dayOfWeek) { //gets all weekday dates for week after next
    var daysToAdd = 15; //to start of week after next
    daysToAdd -= dayOfWeek;
    var new_date = moment(datestr, "YYYY-MM-DD").add(daysToAdd, 'days');
    var monday = new_date.format('YYYYMMDD');
    new_date.add(1, 'days');
    var tuesday = new_date.format('YYYYMMDD');
    new_date.add(1, 'days');
    var wednesday = new_date.format('YYYYMMDD');
    new_date.add(1, 'days');
    var thursday = new_date.format('YYYYMMDD');
    new_date.add(1, 'days');
    var friday = new_date.format('YYYYMMDD');
    return [monday, tuesday, wednesday, thursday, friday];
}

function httpReq(url, method, body) {
    return new Promise(function(resolve, reject) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function() { 
           if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                resolve(xmlHttp.response);
            }
        }
        xmlHttp.open(method, url, true);
        if (body !== null) {
            body = JSON.stringify(body);
            xmlHttp.setRequestHeader("Content-Type", "application/json");
        }
        xmlHttp.send(body);
    })
}

getTodayOrders();