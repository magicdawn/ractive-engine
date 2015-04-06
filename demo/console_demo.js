var options = {
  layoutRoot: __dirname + '/views',
  partialRoot: __dirname + '/views'
};

var ractive = require('../').RactiveEngine(options);

var result = ractive.renderFile('views/index');

console.log(result);