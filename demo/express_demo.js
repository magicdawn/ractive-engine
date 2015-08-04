var express = require('express');
var app = express();
var ractive = require('../');
var path = require('path');

app.engine('.html', ractive.express(
));

// set html view engine
app.set('view engine', '.html');

// custom template loader
ractive.templateLoader = function(request, resolveFrom) {
  // relative
  var file = path.join(resolveFrom, request);
  if (fs.existsSync(file)) {
    return file;
  }

  // form view root
  return path.join(__dirname + '/views', request);
};

app.get('/', function(req, res) {
  return res.render('index');
})

app.listen(3000, function() {
  console.log('Demo Server listening at port : ', this.address().port);
});