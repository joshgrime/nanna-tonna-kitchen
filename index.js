require('dotenv').config()
const path = require('path');
const http = require('http');
const express = require('express');
const orderFlow = require('./order-flow.js');
const rclib = require('./recharge-lib.js');
const driverlib = require('./driver-reports.js');
var CronJob = require('cron').CronJob;
const passport = require('passport')
var LocalStrategy = require('passport-local').Strategy;
const cookieSession = require('cookie-session');
const rechargeLib = require('./recharge-lib.js');
const app = express();
app.set('port', 3000);
app.use(express.json());
app.use(cookieSession({
    name: 'rtid',
    secret: 'response'
}));
app.use(passport.initialize());
app.use(passport.session());

const buildpath = path.join(__dirname, '/public');
app.use('/login/functions.js', express.static(buildpath + '/login/functions.js'));
app.use('/style.css', express.static(buildpath + '/style.css'));
app.use(['/assets','/assets*'], express.static(buildpath + '/assets'));

/* Routes */

app.get('/today-orders', isLoggedIn, function(req, res) {
    console.log('getting today order...');
    try {
        var today_data = rclib.getTodayOrder();
        var week_data = rclib.getWeekOrder();
        var prom_array = [today_data, week_data];
        Promise.all(prom_array).then(x=>{
            res.send(x);
        });
    }
    catch (e) {
        res.sendStatus(500);
    }
});

app.get('/generate-driver-schedules/:date', isLoggedIn, function(req, res) {

    console.log(req.params);

    try {
        var data = driverlib.getRoutes(req.params.date);
        data.then(x=>{
            res.send(x);
        })
    }
    catch (e) {
        res.sendStatus(500);
    }
});

app.get('/generate-order-export/:date', isLoggedIn, function(req, res) {
    try {
        var data = orderFlow.default(req.params.date);
        data.then(x=>{
            res.send(x);
        })
    }
    catch (e) {
        res.sendStatus(500);
    }
});

app.get('/generate-referrals-export/:date', isLoggedIn, function(req, res) {
    try {
        var start = rechargeLib.getReferrals(req.params.date);
        start.then(x=>{
            var data = rechargeLib.buildReferralCSV(x[0], x[1]);
            data.then(y=>{
                res.send(y);
            })
        })
    }
    catch (e) {
        res.sendStatus(500);
    }
});

app.get('/get-referral/:fileName', isLoggedIn, function(req, res) {

    try {
        var data = orderFlow.getCSVFile(req.params.fileName);
        res.send(data);
    }
    catch (e) {
        console.log(e);
        res.sendStatus(500);
    }

});


app.get('/get-order/:fileName', isLoggedIn, function(req, res) {

    try {
        var data = orderFlow.getCSVFile(req.params.fileName);
        res.send(data);
    }
    catch (e) {
        console.log(e);
        res.sendStatus(500);
    }

});


app.get('/get-schedule/:fileName', isLoggedIn, function(req, res) {

    try {
        var data = driverlib.getCSVFile(req.params.fileName);
        res.send(data);
    }
    catch (e) {
        console.log(e);
        res.sendStatus(500);
    }

});

app.get('/trigger-cron-job', isAdmin, function(req, res) {

    try {
        if (jobRunning) {
            job.stop();
            jobRunning = false;
            res.send('Cron job stopped.');
        }
        else {
            job.start();
            jobRunning = true;
            res.send('Cron job started.');
        }
    }
    catch (e) {
        console.log(e);
        res.sendStatus(500);
    }

});

app.get('/trigger-order-flow', isAdmin, function(req, res) {

    orderFlow.default();
    res.send('Started.');

});

/* passport authentication */

app.post('/login', passport.authenticate('login', {
    successRedirect: '/',
    failureRedirect: '/login'
}));

app.get('/logout', function(req, res){
    req.session = null ;
    res.redirect('/');
});

var passportConfig = function(passport) {

passport.serializeUser(function(id, done) {
    done(null, id);
});

passport.deserializeUser(function(id, done) {
    done(null, id);
});

passport.use('login', new LocalStrategy({
    usernameField: 'user',
    passwordField: 'pass',
    passReqToCallback: true
},
    function(req, user, pass, done) {
        try {
            console.log('checking user '+user);
            console.log('password is okay?');
            console.log(pass === process.env.PASSWORD);
            var userIsOkay = checkUser(user);
            console.log('user is okay?');
            console.log(userIsOkay);
            if (userIsOkay === 1 && pass === process.env.PASSWORD) {
                req.session.userId = user;
                req.session.admin = checkAdmin(user);
                return done(null, req.session.userId);
            }
            else {
                return done(null, false);
            }
        }
        catch (e) {
            console.log(e);
            return done(null, false);
        }
}
));
}

function checkUser(apiUser){
    if (process.env.USERS === undefined || null) return 0;
    var whitelist = process.env.USERS.split(',');
    if (whitelist.indexOf(apiUser) > -1) {
        return 1;
    }
    else {
        return 0;
    }
}

function checkAdmin(apiUser){
    if (process.env.ADMINS === undefined || null) return 0;
    var whitelist = process.env.ADMINS.split(',');
    if (whitelist.indexOf(apiUser) > -1) {
        return 1;
    }
    else {
        return 0;
    }
}

function isLoggedIn(req, res, next) {
    if (req.path === '/login' || req.path === '/login/') {
        next();
    }
    else if (req.session.userId !== undefined) {
        next();
    }
    else {
        res.redirect('/login');
    }
}

function isAdmin(req, res, next) {
    if (req.session !== undefined && req.session.admin === 1) {
        next();
    }
    else {
        res.sendStatus(401);
    }
}

/* initialise server */

passportConfig(passport);
app.use('/', isLoggedIn, express.static(buildpath));
var server = http.createServer(app).listen(app.get('port'));

//set off integration on cron job
var jobRunning = false;
var job = new CronJob('0 18 * * 0-5', orderFlow.default, null, true, "Europe/London");

console.log(job.nextDates());