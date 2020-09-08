function login(){

    document.getElementById('api-user').style.borderColor = '#2e2d7f';
    document.getElementById('api-token').style.borderColor = '#2e2d7f';
    document.getElementById('error_message').innerText = '';
    
    var api_user = document.getElementById('api-user').value;
    var api_token = document.getElementById('api-token').value;

    var isOkay = true;
    if (api_user === undefined || api_user === null || api_user === '') {
        document.getElementById('api-user').style.borderColor = '#dc2f51';
        isOkay = false;
    };
    if (api_token === undefined || api_token === null || api_token === '') {
        document.getElementById('api-token').style.borderColor = '#dc2f51';
        isOkay = false;
    };

    if (!isOkay) {
        document.getElementById('error_message').innerText = 'Please complete all fields.';
        return;
    };

    document.getElementById('login--form').style.display = 'none';
    document.getElementById('loading').style.display = 'block';

    var loginRequest = httpReq(window.location.protocol+'//'+window.location.host+'/login', 'POST', {'user': api_user, 'pass': api_token});
    loginRequest.then(x=>{
       var isLogin = x.substring(x.length-7,x.length) === '/login/' ? true : false;
       if (isLogin) {
           document.getElementById('login--form').style.display = 'block';
           document.getElementById('loading').style.display = 'none';
           document.getElementById('error_message').innerText = 'Invalid login credentials.';
       }
       else {
           window.location = x;
       }
    })
    .catch(e=>{
        document.getElementById('login--form').style.display = 'block';
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error_message').innerText = 'Sorry, there was an error communicating with the server.';
    });
}

function httpReq(url, method, body) {
    return new Promise(function(resolve, reject) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function() { 
           if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                resolve(xmlHttp.responseURL);
               
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