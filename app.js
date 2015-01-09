var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var _ = require('underscore');
var mongoose = require('mongoose');

/*
    intialize database
*/
var is_database_open = false;
mongoose.connect('mongodb://localhost/bulletin');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
    console.log("database opened");
    is_database_open = true;
});

// console.log("waiting for database connection");
// while(!is_database_open){console.log(is_database_open);}
// console.log("database connected");

var log_item_schema = mongoose.Schema({
        name: String,
        message: String,
        time: String
    });

var log = mongoose.model('log', log_item_schema);

var routes = require('./routes/index');
var users = require('./routes/users');
var app = express();
var http = require("http").createServer(app)
  , io = require("socket.io").listen(http)

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

/* 
  The list of participants in our chatroom.
  The format of each participant will be:
  {
    id: "sessionId",
    name: "participantName"
  }
*/
app.set('io', io);
var participants = [];
//set server ip address
app.set('ipaddr', '127.0.0.1');
app.set('port', 8080);

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: "err.message",
        error: {}
    });
});


//Handle route "GET /", as in "http://localhost:8080/"
app.get("/", function (request, response) {

    //Return what's on your mind
    response.json(200, { message: "express is cool" });

});



/* Socket.IO events */
app.get('io').on("connection", function (socket) {

    /*
      When a new user connects to our server, we expect an event called "newUser"
      and then we'll emit an event called "newConnection" with a list of all 
      participants to all connected clients
    */
    socket.on("newUser", function (data) {
        participants.push({ id: data.id, name: data.name });
        io.sockets.emit("newConnection", { participants: participants });
    });

    /*
      When a user changes his name, we are expecting an event called "nameChange" 
      and then we'll emit an event called "nameChanged" to all participants with
      the id and new name of the user who emitted the original message
    */
    socket.on("nameChange", function (data) {
        _.findWhere(participants, { id: socket.id }).name = data.name;
        io.sockets.emit("nameChanged", { id: data.id, name: data.name });
    });

    /* 
      When a client disconnects from the server, the event "disconnect" is automatically 
      captured by the server. It will then emit an event called "userDisconnected" to 
      all participants with the id of the client that disconnected
    */
    socket.on("disconnect", function () {
        participants = _.without(participants, _.findWhere(participants, { id: socket.id }));
        io.sockets.emit("userDisconnected", { id: socket.id, sender: "system" });
    });

});

routes.post("/message", function (request, response) {

    //console.log(typeof(app.get('io').sockets));
    //The request body expects a param named "message"
    var message = request.body.message;

    //If the message is empty or wasn't sent it's a bad request
    if (_.isUndefined(message) || _.isEmpty(message.trim())) {
        return response.json(400, { error: "Message is invalid" });
    }
    //We also expect the sender's name with the message
    var name = request.body.name;

    //Let our chatroom know there was a new message
    app.get('io').sockets.emit("incomingMessage", { message: message, name: name });
    //adding to database
    var time = new Date();
    log.create({
        name: name,
        message: message,
        time: time
    }, function(err){
        if(err) console.log(err);
    });


    //Looks good, let the client know
    response.json(200, { message: "Message received" });
});

//get previous logs and load them when initialize the index page


routes.get("/", function(req, res){
    var prev_log;
    log.find(function(err, logs){
        if(err) return console.error(err);
        prev_log = logs;
        prev_log.reverse();
        res.render("index", { log: prev_log });
    });
});

http.listen(8080, app.get("ipaddr"), function () {
    console.log("Server up and running. Go to http://" + app.get("ipaddr") + ":" + app.get("port"));
});

module.exports = app;
