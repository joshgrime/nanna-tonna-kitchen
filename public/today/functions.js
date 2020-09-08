function getTodayOrders(){
    document.getElementById('full-list-loading').style.display = 'block';
    document.getElementById('summary-loading').style.display = 'block';
    var dataRequest = httpReq(window.location.protocol+'//'+window.location.host+'/today-orders', 'GET');
    dataRequest.then(x=>{
        var data = JSON.parse(x);
        buildTable(data);
    });
}


function buildTable(data) {
    console.log('building table');
    var table = $('<table></table>');
    var tableHeader = $('<tr class="toprow"></tr>');

    var allowedAttributes = [
        'Name',
        'Contact',
        'Product Title',
        'Variants',
        'Address',
        'Quantity' 
    ]

    for (let x of allowedAttributes) {
        tableHeader.append('<td>'+x+'</td>');
    }

    table.append(tableHeader);

    var aggregate = [];

    for (let x of data.orders) {
        console.log('processing order')
        let tr = $('<tr></tr>');
        var name = x.first_name + ' ' + x.last_name;
        var email = x.email;
        var phone = x.shipping_address.phone;
        var productTitle = x.line_items[0].product_title;
        var variant = x.line_items[0].variant_title;
        var address = x.shipping_address.address1 + '\n' + (x.shipping_address.address2 === null ? '' : x.shipping_address.address2 + '\n') + x.shipping_address.city + '\n' + x.shipping_address.zip;
        var quantity = x.line_items[0].quantity;



        tr.append('<td>'+name+'</td>');
        tr.append('<td>'+email+'\n'+phone+'</td>');
        tr.append('<td>'+productTitle+'</td>');
        tr.append('<td>'+variant+'</td>');
        tr.append('<td>'+address+'</td>');
        tr.append('<td>'+quantity+'</td>');

        console.log(tr);

        table.append(tr);
        
        aggregate.push({
            name: name,
            email: email,
            phone: phone,
            productTitle: productTitle,
            variant: variant,
            quantity: quantity
        });

    }

        createAggregates(aggregate);

        console.log('adding table');
        $('#full-data').append(table);
        console.log('unhiding table');

        document.getElementById('full-list-loading').style.display = 'none';
        document.getElementById('full-data').style.display = 'block';

}

function createAggregates(data) {

    var payload = {
        meat: 0,
        dontmind:0,
        veg:0
    }

    for (let x of data) {

        var variant = x.variant.toLowerCase();
        var quantity = variant.split(' ')[0];
        quantity = parseInt(quantity);

        var label = variant.indexOf('vegetarian') > -1 ? 'veg' : variant.indexOf('meat') > -1 ? 'meat' : 'dontmind';
        var total = quantity * x.quantity;
        payload[label] += total;

    }
    console.log('Finished aggregates');
    console.log(payload);
    $('#summary-data').append('<div class="summary-hold"><div>Meat & Seafood: '+payload.meat+'</div><div>Vegetarian: '+payload.veg+'</div><div>Don\'t mind: '+payload.dontmind+'</div></div>');
    document.getElementById('summary-loading').style.display = 'none';
    document.getElementById('summary-data').style.display = 'block';

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