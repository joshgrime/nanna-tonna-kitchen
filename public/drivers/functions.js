var $input;

function generateReports(){
    document.getElementById('gen-btn').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    var picker = $input.pickadate('picker')
    var date_selected = picker.get('select', 'yyyy-mm-dd');
    var dataRequest = httpReq(window.location.protocol+'//'+window.location.host+'/generate-driver-schedules/'+date_selected, 'GET')
    dataRequest.then(x=>{
        x = JSON.parse(x);
        if (x.length > 0) {
        for (let csv of x) {
            console.log(csv);
            var linkEl = $('<a class="result-a" target="_blank" href="'+window.location.protocol+'//'+window.location.host+'/get-schedule/'+csv.file+'.csv">'+csv.driver+' '+date_selected+'</a>');
            var el = $('<div class="result-link"></div>');
            var sumstr = csv.false>0 ? (csv.total + '/' +csv.false) : csv.total;
            var subEl = $('<div class="result-orders">'+sumstr+' orders</div>');
            el.append(linkEl);
            el.append(subEl);
            $('#results').append(el);
        }
    }
    else {
        $('#results').append('<div>No scheduled deliveries for today!</div>');
        document.getElementById('gen-btn').style.display = 'block';
    }
        document.getElementById('loading').style.display = 'none';
        document.getElementById('results').style.display = 'block';
    });
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

}

function getFile(file){

    var dataRequest = httpReq(window.location.protocol+'//'+window.location.host+'/get-schedule/'+file, 'GET');
    /*dataRequest.then(x=>{
            var filename = file + '.csv';
            var blob = new Blob([x], {type: 'text/csv'});
            if(window.navigator.msSaveOrOpenBlob) {
                window.navigator.msSaveBlob(blob, filename);
            }
            else{
                var elem = window.document.createElement('a');
                elem.href = window.URL.createObjectURL(blob);
                elem.download = filename;        
                document.body.appendChild(elem);
                elem.click();
                document.body.removeChild(elem);
            }
        });*/
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

addDateToPage();

document.getElementById('gen-btn').addEventListener('click', generateReports);