var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');
var request = require('request');
var passport = require('passport');
var Auth0Strategy = require('passport-auth0');

var routes = require('./routes/index');

var app = express();
app.set('port', process.env.PORT || 8000);

var strategy = new Auth0Strategy({
    domain:       process.env['AUTH0_DOMAIN'],
    clientID:     process.env['AUTH0_CLIENT_ID'],
    clientSecret: process.env['AUTH0_CLIENT_SECRET'],
    callbackURL:  process.env['AUTH0_CALLBACK_URL'] || 'http://localhost:8000/callback'
}, function(accessToken, refreshToken, extraParams, profile, done) {
    // add the jwt to their profile for stashing
    profile.jwt = extraParams.id_token;

    /*
    For dev purposes we are going to hard-code your JWT token from topcoder.com
    so we can call their API and fetch profile data successfully. See the reame.md for
    instructions and then paste the cookie string content below.
     */
    profile.jwt = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL3RvcGNvZGVyLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExMTg1ODczMDE2NDUzMzY5OTI4NCIsImF1ZCI6IjZad1pFVW8yWks0YzUwYUxQcGd1cGVnNXYyRmZ4cDlQIiwiZXhwIjoxNzg5NjMzNjY5LCJpYXQiOjE0Mjk2MzM2Njl9.T0FeLHiCJ7DgWpMjCCH38jCifSu63MVLLC0NPsEy0i4';

    //console.log('profile is', profile);
    // call topcoder and get their profile
    var options = {
        url: 'http://api.topcoder.com/v2/user/profile',
        headers: {
            'Authorization': 'Bearer ' + profile.jwt
        }
    };
    request(options, function(error, response, body) {
        profile.member = JSON.parse(body);
        return done(null, profile);
    });
});

passport.use(strategy);

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({ secret: 'iamsosecret' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(passport.initialize());
app.use(passport.session());

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

var server = app.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + server.address().port);
});

module.exports = app;