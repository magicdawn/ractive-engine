/**
 * module dependencies
 */
var Ractive = require('./ractive/ractive');
var RactiveEngine = require('./engine');
var path = require('path');

/**
 * do exports
 */
exports = module.exports = new RactiveEngine;

// expose constructor
exports.RactiveEngine = RactiveEngine.bind(null);

// expose original Ractive
exports.Ractive = Ractive;

/**
 * express framework support
 *
 * example:
 *
 *   app.engine('.html',require('ractive-engine').express({
 *     // options , optional
 *     ext: '.html',
 *     enableCache: true,
 *     partialRoot: __dirname + '/views',
 *     layoutRoot: __dirname + '/views'
 *   }));
 *
 */
exports.express = function(options) {
  var engine = new RactiveEngine(options);
  return function(viewPath, locals, callback) {
    try {
      var result = engine.renderFile(viewPath, locals);
      callback(null, result);
    } catch (e) {
      callback(e);
    }
  };
};

/**
 * koa framework support
 *
 * example:
 *
 *  ractive.koa(app,{
 *    // viewRoot
 *    viewRoot: __dirname + '/views'
 *
 *    // options , optional
 *    ext: '.html',
 *    enableCache: true,
 *    partialRoot: __dirname + '/views',
 *    layoutRoot: __dirname + '/views'
 *  });
 *
 */