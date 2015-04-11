var util = require('../util');
var assert = require('assert');
var Ractive = require('../ractive/ractive');

describe('utility functions', function() {
  it('fixPath should work well', function() {
    var fixPath = util.fixPath;
    assert.equal(fixPath('"./a/b/c"'), './a/b/c');
    assert.equal(fixPath('a.b.c'), 'a/b/c');
  });

  it('getNodeRef should work well', function() {
    var getNodeRef = util.getNodeRef;

    var node;
    /**
     * parse result:
     * { v:1 , t: [ nodes ] }
     */
    node = Ractive.parse('{{#extend layout}}{{/extend}}').t[0]
    assert.equal(getNodeRef(node),'layout');

    node  =Ractive.parse('{{#extend "./layout"}}{{/extend}}').t[0];
    assert.equal(getNodeRef(node),'"./layout"');
  });
});