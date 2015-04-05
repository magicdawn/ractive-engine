/**
 * module dependencies
 */
var Ractive = require('./ractive/ractive');
var RactiveEngine = require('./engine');

/**
 * do exports
 */
exports = module.exports = new RactiveEngine;
// expose constructor
exports.RactiveEngine = RactiveEngine;
// expose original Ractive
exports.Ractive = Ractive;