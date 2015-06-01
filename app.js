// See the [GitHub README](https://github.com/rethinkdb/rethinkdb-example-nodejs-chat/blob/master/README.md)
// for details of the complete stack, installation, and running the app.
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var passport = require('passport');
var flash = require('connect-flash');
var local = require('passport-local').Strategy;
var bcrypt = require('bcrypt');
var io = require('socket.io').listen(server);
var util = require('util');
var db = require('./lib/db');

app.configure(function() {
  app.use(express.static('public'));
  app.use(express.cookieParser());
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(flash());
  app.use(app.router);

  // set up the RethinkDB database
  db.setup();
});



// Routes

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/', function (req, res) {
  if (typeof req.user == 'undefined') {
    req.user = false;
  }
  res.render('index', { title: 'Chat 2K', user: req.user });
});

app.get('/login', function (req, res) {
  if (typeof req.user !== 'undefined') {
    // User is logged in.
    res.redirect('/chat');
  }
  else {
    req.user = false;
  }
  var message = req.flash('error');
  if (message.length < 1) {
    message = false;
  }
  res.render('login', { title: 'Login', message: message, user: req.user });
});



// Socket

var usersonline = {};

io.sockets.on('connection', function (socket) {
  var connected_user = {};

  // send updates with online users
  var i = setInterval(function() {
    socket.emit('whoshere', { 'users': usersonline });
  }, 3000);

  console.info("[DEBUG][io.sockets][connection]");


  socket.on('iamhere', function (data) {
    // This is sent by users when they connect, so we can map them to a user.
    console.log("[DEBUG][io.sockets][iamhere] %s", data);

    db.findUserById(data, function (err, user) {
      console.log("[DEBUG][iamhere] %s -> {%j, %j}", data, err, user);
      if (user !== null) {
        connected_user = user;
        usersonline[connected_user.id] = {
          id: connected_user.id,
          name: connected_user.username
        };
      }
    });
  });


  socket.on('message', function (data) {
    if (connected_user.username === undefined) {
      console.warn('[WARN][io.sockets][message] Got message before iamhere {%s}', util.inspect(data));
      socket.emit('new message', {message: '<em>You must log in before chatting. That\'s the rule</em>'});
      return
    }
    var msg = {
      message: data.message,
      from: connected_user.username,
      timestamp: new Date().getTime()
    }

    console.log("[DEBUG][io.sockets][message] New message '%j' from user %s(@%s)", msg, connected_user.username, connected_user.id);

    db.saveMessage(msg, function (err, saved) {
      if (err || !saved) {
        socket.emit('new message', {message: util.format("<em>There was an error saving your message (%s)</em>", msg.message), from: msg.from, timestamp: msg.timestamp});
        return;
      }
      socket.emit('new message', msg);

      // Send message to everyone.
      socket.broadcast.emit('new message', msg);
    });
  });

  db.findMessages(10, function (err, messages) {
    if (!err && messages.length > 0) {
      socket.emit('history', messages);
    }
  });


  socket.on('disconnect', function() {
    if (connected_user.id !== undefined) {
      delete usersonline[connected_user.id];
      console.log("[DEBUG][io.sockets][disconnect] user: %s(@%s) disconnected", connected_user.username, connected_user.id);
    }
    else {
      console.log("[WARN][io.sockets][disconnect] Received disconnect message from another univers");
    }
  });
});


server.listen(8000);
