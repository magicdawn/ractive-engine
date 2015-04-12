var express = require('express');
var app = express();
var ractive = require('../');

/**
 * settings
 */
app.engine('.html', ractive.express({
  // layoutRoot: __dirname + '/views',
  // partialRoot: __dirname + '/views'
}));
app.set('view engine', '.html');

app.get('/', function(req, res) {
  return res.render('index');
})

app.listen(3000, function() {
  console.log('Demo Server listening at port : ', this.address().port);
});