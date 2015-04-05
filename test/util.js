var util = require('../util');
var fixPath = util.fixPath;
var assert = require('assert');

describe('utility functions', function() {
  it('fixPath should work well', function() {
    assert.equal(fixPath('"./a/b/c"'), './a/b/c');
    assert.equal(fixPath('a.b.c'), 'a/b/c');
  });
});