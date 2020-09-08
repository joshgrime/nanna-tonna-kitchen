require('dotenv').config()
const path = require('path');
const http = require('http');
const express = require('express');
const orderFlow = require('./order-flow.js');
const rclib = require('./recharge-lib.js');
var CronJob = require('cron').CronJob;
const passport = require('passport')
var LocalStrategy = require('passport-local').Strategy;
const cookieSession = require('cookie-session');
const { getTodayOrder } = require('./recharge-lib.js');
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
        var data = rclib.getTodayOrder();
        data.then(x=>{
            console.log(x);
            res.send(x);
        });
    }
    catch (e) {
        res.send(e);
    }
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
var job = new CronJob('00 30 11 * * 1-5', orderFlow.default, null, true, "Europe/London");
job.start();