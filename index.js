var express = require('express');
var logger = require('morgan');
var bodyParser = require('body-parser');

var app = express();

app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


var r = require('rethinkdb');
var db = r.db('wiki');
var connection = null;
r.connect({host: 'localhost', port: 28015}, function(err, conn) {
  if (err) throw err;
  connection = conn;
});

app.use('/', function(request, response) {
  checkCreateDB();
  db.table('state').get(1).merge(function(state) {
    console.log(state);
    return db.table('titles').between(state.getField('from'), state.getField('to'), {index: 'page_title'}).coerceTo('array');
  }).limit(1000).run(connection, function(err, cursor) {
    if (err) throw err;
    cursor.toArray(function(err, result) {
      if (err) throw err;
      response.json(result);
    });
  });
});

app.use(function (error, request, response, next) {
  response.status(error.status || 500);
  response.json({ error: error.message });
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('App is listening on http://%s:%s', host, port);
});

function checkCreateDB() {
  console.log('checkCreateDB');
}
