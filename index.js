var express = require('express');
var logger = require('morgan');
var bodyParser = require('body-parser');

var app = express();

// Middleware
app.use(express.static('public'));
app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.engine('.html', require('ejs').renderFile);

// Database
var r = require('rethinkdb');
var db = r.db('wiki');
var connection = null;
r.connect({host: 'localhost', port: 28015}, function(err, conn) {
  if (err) throw err;
  connection = conn;
});

// Routes
app.use('/', function(request, response) {
  changefeed(state, function(change) {
    console.log('state change');
    console.log(change);
    titles(function(err, titles) {
      broadcast('titles', titles);
    });
  });
  response.render('index.html');
});

var server = require('http').Server(app);
var io = require('socket.io')(server);

// Db, Util

function jsonResponse(response) {
  return function (err, cursor) {
    if (err) throw err;
    cursor.toArray(function(err, result) {
      if (err) throw err;
      response.json(result);
    });
  };
}

function changefeed(datasource, listener) {
  datasource().changes().run(connection, function(err, cursor) {
    if (err) throw err;
    cursor.each(function(err, change) {
      if (err) throw err;
      listener(change);
    });
  });
}

function state() {
  return db.table('state').get(1);
}

function updateState(prefix) {
  db.table('state').get(1).update({from: prefix, to: prefix + 'z'}).run(connection);
}

function titles(callback) {
  return db.table('state')
    .get(1)
    .merge(function(state) {
      return db.table('titles')
        .between(state.getField('from'), state.getField('to'), {index: 'page_title'})
        .limit(1000)
        .coerceTo('array');
    })
    .run(connection, function(err, cursor) {
      if (err) throw err;
      cursor.toArray(callback);
    });
}


// Socket connections

var clients = {};

function broadcast(topic, msg) {
  Object.getOwnPropertyNames(clients).forEach(function(id) {
    clients[id].emit(topic, msg);
  });
}

io.on('connection', function (socket) {
  var id = Date.now();
  clients[id] = socket;
  console.log(id, 'connected');

  socket.on('disconnect', function() {
    delete clients[id];
    console.log(id, 'disconnected');
  });

  socket.on('prefix', function(prefix) {
    console.log('prefix', prefix);
    updateState(prefix);
  });

  titles(function(err, titles) {
    socket.emit('titles', {titles: titles});
  });
});


server.listen(3000, '0.0.0.0');
