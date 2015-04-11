var ractive = require('../');
var RactiveEngine = ractive.RactiveEngine;
var Ractive = ractive.Ractive;
var assert = require('assert');
var path = require('path');
var cheerio = require('cheerio');

/**
 * partials
 * extend
 * include
 */

describe('RactiveEngine private functions works', function() {
  it('_getPartials ?', function(done) {
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

    done();
  });
});

describe('RactiveEngine', function() {

  describe('extend/block works ?', function() {
    it('simple extend/block', function(done) {
      var result = ractive.renderFile(__dirname + '/views/extend-block/simple.html');
      var $ = cheerio.load(result);
      // console.log(result);

      assert.equal($('body script').length, 2);
      assert.equal($('head link[rel=stylesheet]').length, 2);
      assert($('title').text().indexOf('Awesome') > -1);

      done();
    });

    it('recursive extend/block', function(done) {
      var result = ractive.renderFile(__dirname + '/views/extend-block/recursive.html');
      var $ = cheerio.load(result);
      // console.log(result);

      assert.equal($('.main article .article-top').length, 1);
      assert.equal($('.main article .article-top').text(), 'top');
      assert.equal($('.main article .article-bottom').text(), 'bottom');

      done();
    });

    it('prepend/append', function(done) {
      var result = ractive.renderFile(__dirname + '/views/extend-block/prepend-append.html');
      var $ = cheerio.load(result);
      // console.log(result);

      assert.equal($('script').length,3);// commom prepend default
      assert($('script')[1].attribs.src.indexOf('prepend') > -1);
      assert($('script')[2].attribs.src.indexOf('default') > -1);
      done();
    });
  });

  describe('partials works ?', function() {
    it('using {{>partial}}', function(done) {
      done();
    });

    it('using {{#include partial}}', function(done) {
      done();
    });

    it('using {{#include "./partial"}}', function(done) {
      done();
    });
  });
});