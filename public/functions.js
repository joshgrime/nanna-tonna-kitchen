var $input;

var $input2;

function generateReports(){
    $('#results').html('');
    document.getElementById('gen-btn').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    var picker = $input.pickadate('picker')
    var date_selected = picker.get('select', 'yyyy-mm-dd');
    var dataRequest = httpReq(window.location.protocol+'//'+window.location.host+'/generate-order-export/'+date_selected, 'GET')
    dataRequest.then(x=>{
            var linkEl = $('<a class="result-a" target="_blank" href="'+window.location.protocol+'//'+window.location.host+'/get-order/'+x+'.csv">Download File</a>');
            var el = $('<div class="result-link"></div>');
            el.append(linkEl);
            $('#results').append(el);
            document.getElementById('loading').style.display = 'none';
            document.getElementById('results').style.display = 'block';
    });
}

function generateReferrals(){
    $('#results2').html('');
    document.getElementById('gen-btn2').style.display = 'none';
    document.getElementById('loading2').style.display = 'block';
    var picker = $input2.pickadate('picker')
    var date_selected = picker.get('select', 'yyyy-mm-dd');
    var dataRequest = httpReq(window.location.protocol+'//'+window.location.host+'/generate-referrals-export/'+date_selected, 'GET')
    dataRequest.then(x=>{
            var linkEl = $('<a class="result-a" target="_blank" href="'+window.location.protocol+'//'+window.location.host+'/get-referral/'+x+'.csv">Download File</a>');
            var el = $('<div class="result-link"></div>');
            el.append(linkEl);
            $('#results2').append(el);
            document.getElementById('loading2').style.display = 'none';
            document.getElementById('results2').style.display = 'block';
    });
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

function addDateToPage(){

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

    $input = $('#datepicker').pickadate({
        clear: '',
        firstDay: 'Monday'
    });
    var picker = $input.pickadate('picker')
    picker.set('select', datestr, {format: 'yyyy-mm-dd' });

    $input2 = $('#datepicker2').pickadate({
        clear: '',
        firstDay: 'Monday'
    });
    var picker2 = $input2.pickadate('picker')
    picker2.set('select', datestr, {format: 'yyyy-mm-dd' });

}

addDateToPage();

document.getElementById('gen-btn').addEventListener('click', generateReports);
document.getElementById('gen-btn2').addEventListener('click', generateReferrals);
