var Ractive = require('../ractive/ractive');
var assert = require('assert');

describe('Parse extended sections should be OK', function() {
  it('#extend', function() {
    assert.doesNotThrow(function(){
      Ractive.parse('{{#extend layout}}{{/extend}}');
      Ractive.parse('{{#extend "./layout"}}{{/extend}}');
    });
  });

  it('#block,#prepend,#append', function() {
    assert.doesNotThrow(function() {
      Ractive.parse('{{#block body}}{{/block}}');
      Ractive.parse('{{#prepend body}}{{/prepend}}');
      Ractive.parse('{{#append body}}{{/append}}');
    });
  });

  it('#include', function() {
    assert.doesNotThrow(function() {
      Ractive.parse('{{#include part1}}{{/include}}');
      Ractive.parse('{{#include "includes/a"}}{{/include}}');
    });
  });
});