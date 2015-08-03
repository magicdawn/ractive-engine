var ractive = require('../');
var RactiveEngine = ractive.RactiveEngine;
var Ractive = ractive.Ractive;
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var cheerio = require('cheerio');
var should = require('should');

/**
 * partials
 * extend
 * include
 */

describe('RactiveEngine private functions works', function() {
  it('_getPartials ?', function() {
    var tmpl = '{{>partial1}}';
    var tmplParsed = Ractive.parse(tmpl);
    var partials = ractive._getPartials(tmplParsed, __dirname + '/fake.html');

    partials.length.should.equal(1);
    partials[0].name.should.equal('partial1');
    partials[0].path.should.equal(path.resolve(__dirname, 'partial1'));
  });
});

describe('RactiveEngine', function() {

  describe('extend/block works ?', function() {
    it('simple extend/block', function() {
      var result = ractive.renderFile(__dirname + '/views/extend-block/simple.html');
      var $ = cheerio.load(result);
      // console.log(result);

      $('body script').length.should.equal(2);
      $('head link[rel=stylesheet]').length.should.equal(2);
      $('title').text().should.match(/Awesome/);
    });

    it('recursive extend/block', function() {
      var result = ractive.renderFile(__dirname + '/views/extend-block/recursive.html');
      var $ = cheerio.load(result);
      // console.log(result);

      $('.main article .article-top').length.should.equal(1);
      $('.main article .article-top').text().should.equal('top');
      $('.main article .article-bottom').text().should.equal('bottom');
    });

    it('prepend/append', function() {
      var result = ractive.renderFile(__dirname + '/views/extend-block/prepend-append.html');
      var $ = cheerio.load(result);
      // console.log(result);

      $('script').length.should.equal(3); // commom prepend default
      $('script')[1].attribs.src.should.match(/prepend/);
      $('script')[2].attribs.src.should.match(/default/);
    });

    it('append on attributes', function() {
      var result = ractive.renderFile(__dirname + '/views/extend-block/attributes.html');
      var $ = cheerio.load(result);
      // console.log(result);

      assert($('html').hasClass('ie8'));
    });
  });

  describe('partials works ?', function() {
    it('using {{>partial}}', function() {
      var result = ractive.renderFile(__dirname + '/views/partial-test/partial.html');
      var expect = fs.readFileSync(__dirname + '/views/partial-test/partials/part1.html', 'utf8');

      result.should.equal(expect);
    });

    it('using {{#include partial}}', function() {
      // {{#include partials.part1}}
      ractive.partialRoot = __dirname + '/views/partial-test/';
      var result = ractive.renderFile(__dirname + '/views/partial-test/include.html');
      var expect = fs.readFileSync(__dirname + '/views/partial-test/partials/part1.html', 'utf8')

      result.should.equal(expect);
    });

    it('using {{#include "./partial"}}', function() {
      // {{#include './partial/part1'}}
      var result = ractive.renderFile(__dirname + '/views/partial-test/include-relative.html');
      var expect = fs.readFileSync(__dirname + '/views/partial-test/partials/part1.html', 'utf8')

      result.should.equal(expect);
    });
  });
});