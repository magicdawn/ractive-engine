var ractive = require('../');
var RactiveEngine = ractive.RactiveEngine;
var Ractive = ractive.Ractive;
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var cheerio = require('cheerio');

/**
 * partials
 * extend
 * include
 */

describe('RactiveEngine private functions works', function() {
  it('_getPartials ?', function() {
    var tmpl = '{{>partial1}}';
    var tmplParsed = Ractive.parse(tmpl);

    assert.throws(function() {
      ractive._getPartials(tmplParsed, 'C:\\views\\fake.html');
    });

    ractive.partialRoot = __dirname;
    var partials = ractive._getPartials(tmplParsed, 'C:\\views\\fake.html');

    assert.equal(partials.length, 1);
    assert.equal(partials[0].name, 'partial1');
    assert.equal(partials[0].path, path.resolve(__dirname, 'partial1'));
  });
});

describe('RactiveEngine', function() {

  describe('extend/block works ?', function() {
    it('simple extend/block', function() {
      var result = ractive.renderFile(__dirname + '/views/extend-block/simple.html');
      var $ = cheerio.load(result);
      // console.log(result);

      assert.equal($('body script').length, 2);
      assert.equal($('head link[rel=stylesheet]').length, 2);
      assert($('title').text().indexOf('Awesome') > -1);
    });

    it('recursive extend/block', function() {
      var result = ractive.renderFile(__dirname + '/views/extend-block/recursive.html');
      var $ = cheerio.load(result);
      // console.log(result);

      assert.equal($('.main article .article-top').length, 1);
      assert.equal($('.main article .article-top').text(), 'top');
      assert.equal($('.main article .article-bottom').text(), 'bottom');
    });

    it('prepend/append', function() {
      var result = ractive.renderFile(__dirname + '/views/extend-block/prepend-append.html');
      var $ = cheerio.load(result);
      // console.log(result);

      assert.equal($('script').length, 3); // commom prepend default
      assert($('script')[1].attribs.src.indexOf('prepend') > -1);
      assert($('script')[2].attribs.src.indexOf('default') > -1);
    });
  });

  describe('partials works ?', function() {
    it('using {{>partial}}', function() {

      assert.throws(function() {
        ractive.partialRoot = null;
        // partials.partRoot required
        ractive.renderFile('views/partial-test/partial.html');
      });

      ractive.partialRoot = __dirname + '/views/partial-test/';
      var result = ractive.renderFile(__dirname + '/views/partial-test/partial.html');
      assert.equal(result,
        fs.readFileSync(__dirname + '/views/partial-test/partials/part1.html', 'utf8')
      );
    });

    it('using {{#include partial}}', function() {
      assert.throws(function() {
        ractive.partialRoot = null;
        // partialRoot is required
        var result = ractive.renderFile(__dirname + '/views/partial-test/include.html');
      });

      // {{#include partials.part1}}
      ractive.partialRoot = __dirname + '/views/partial-test/';
      var result = ractive.renderFile(__dirname + '/views/partial-test/include.html');
      assert.equal(result,
        fs.readFileSync(__dirname + '/views/partial-test/partials/part1.html', 'utf8')
      );
    });

    it('using {{#include "./partial"}}', function() {
      // {{#include './partial/part1'}}
      var result = ractive.renderFile(__dirname + '/views/partial-test/include-relative.html');
      assert.equal(result,
        fs.readFileSync(__dirname + '/views/partial-test/partials/part1.html', 'utf8')
      );
    });
  });
});