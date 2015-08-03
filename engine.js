/**!
 *
 * Based on Ractive template spec
 * https://github.com/ractivejs/template-spec
 *
 * @author magicdawn<magicdawn@qq.com>
 */

/**
 * module dependencies
 */
var Ractive = require('./ractive/ractive');
var types = Ractive.types;
var fs = require('fs');
var path = require('path');
var fixPath = require('./util').fixPath;
var getNodeRef = require('./util').getNodeRef;
var debug = require('debug')('ractive:engine');
var fmt = require('util').format;

/**
 * do exports
 */
exports = module.exports = RactiveEngine;

/**
 * RactiveEngine class definitions
 */
function RactiveEngine(options) {
  if (!(this instanceof RactiveEngine)) {
    return new RactiveEngine(options);
  }

  options = options || {};

  /**
   * view cache
   */
  // first decide by NODE_ENV
  this.enableCache = process.env.NODE_ENV === 'production';
  // see passed a true or false value ?
  if (typeof options.enableCache === 'boolean') {
    this.enableCache = options.enableCache;
  }
  debug('view cache enabled : %s', this.enableCache);
  this.cache = {};

  /**
   * view extension name
   */
  this.ext = options.ext ? (options.ext[0] === '.' ? options.ext : '.' +
    options.ext) : '.html';

  /**
   * how to find layout & partials & includes
   */
  this.templateLoader = function(request, resolveFrom) {
    return path.join(resolveFrom, request);
  };
};

/**
 * renderFile def
 */
RactiveEngine.prototype.renderFile = function(viewPath, locals) {
  viewPath = path.resolve(viewPath);
  var full = this._getFinalFull(viewPath);

  // 读partials
  var self = this;
  var readedPartials = {};
  full.partials.forEach(function(item) {
    readedPartials[item.name] = self._read(item.path);
  });

  return this._render(full.nodes, locals, readedPartials);
};

/**
 * 为full加cache,partials 不存具体内容
 */
RactiveEngine.prototype._getFinalFull = function(viewPath) {
  if (this.enableCache && this.cache[viewPath]) {
    debug('reading full cache for %s', viewPath);
    return this.cache[viewPath];
  }

  var full = this._getFull(viewPath);

  /**
   * full = {
   *   nodes: [],
   *   partials: [
   *     { name: , path: ''}
   *   ]
   * }
   */

  function removeBlock(nodes) {
    for (var index = 0; index < nodes.length; index++) {
      var node = nodes[index];
      if (typeof node === 'object') {

        // block/append/prepend
        if (node.n === types.SECTION_BLOCK ||
          node.n === types.SECTION_PREPEND ||
          node.n === types.SECTION_APPEND) {

          // 删除这个 block 定义,剥壳
          var blockContents = node.f;
          var args = [index, 1].concat(blockContents);
          [].splice.apply(nodes, args);
          index--; // 回退一个. 在blocks 嵌套的情况下使用

          continue;
        }

        // search for all keys
        handleNode(node);

        /*jshint -W082 */
        function handleNode(node) {
          // go deep
          var keys = Object.keys(node);
          keys.forEach(function(key) {
            var val = node[key];

            if (Array.isArray(val)) {
              removeBlock(val);
            } else if (typeof val === 'object') {
              handleNode(val);
            }
          });
        }
      }
    }
  }

  // 最后去除各个block壳
  removeBlock(full.nodes);

  // 存cache
  if (this.enableCache) {
    this.cache[viewPath] = full;
  }

  return full;
};

/**
 * return parsed templa
 */
RactiveEngine.prototype._read = function(viewPath) {
  viewPath = path.resolve(viewPath);
  if (!path.extname(viewPath)) {
    viewPath += this.ext;
  }

  if (this.enableCache) {
    if (this.cache[viewPath]) {
      debug('reading file cache for %s', viewPath);
      return this.cache[viewPath];
    } else {
      debug('reading file %s', viewPath);

      /*jshint -W093 */
      return this.cache[viewPath] = fs.readFileSync(viewPath, 'utf8');
    }
  } else {
    debug('reading file %s', viewPath);
    return fs.readFileSync(viewPath, 'utf8');
  }
};

RactiveEngine.prototype._render = function(nodes, locals, partials) {
  var ract = new Ractive({
    template: {
      v: 1,
      t: nodes
    },
    data: locals,
    partials: partials
  });
  return ract.toHTML();
};

/**
 * 获取完整的节点, nodes
 * 模板可以嵌套
 *
 * return examples
 * {
 *   nodes: [],
 *   partials: [
 *     { name: , path: ''}
 *   ]
 * }
 */
RactiveEngine.prototype._getFull = function(templatePath) {
  /**
   * get a template's layout & blocks
   */
  var template = this._read(templatePath);
  var templateParsed = Ractive.parse(template);

  // extend & blocks
  var result = this._getChildLayout(templateParsed);
  var layout = result.extend;
  var blocks = result.blocks;

  // partials
  var partials = this._getPartials(templateParsed, templatePath);

  // handle include
  var includePartials = this._handleInclude(templateParsed, templatePath);
  if (includePartials && includePartials.length) {
    partials = partials.concat(includePartials);
  }

  // no layout specified
  if (!layout) {
    return {
      nodes: templateParsed.t,
      partials: partials
    };
  }

  /**
   * layout exists
   */
  layout = fixPath(layout);
  layout = this.templateLoader(layout, path.dirname(templatePath));
  var layoutFull = this._getFull(layout); // recursive
  if (layoutFull.partials && layoutFull.partials.length) {
    partials = partials.concat(layoutFull.partials);
  }

  // layoutFull
  //  .nodes
  //  .partials
  visitNodes(layoutFull.nodes);

  function visitNodes(nodes) {
    for (var index = 0; index < nodes.length; index++) {
      var node = nodes[index];

      // not object,pass
      if (typeof node !== 'object') {
        continue;
      }

      // block/append/prepend
      if (node.n === types.SECTION_BLOCK ||
        node.n === types.SECTION_PREPEND ||
        node.n === types.SECTION_APPEND) {

        var blockName = node.r;
        var blockContents;

        if (blocks[blockName]) { // template 中定义了跟 layout一样的 block
          var block = blocks[blockName];
          var blockType = block.type;
          blockContents = block.nodes;

          if (!node.f) {
            node.f = [];
          }

          switch (blockType) {
            case types.SECTION_PREPEND:
              node.f = blockContents.concat(node.f);
              break;
            case types.SECTION_BLOCK:
              node.f = blockContents;
              break;
            case types.SECTION_APPEND:
              node.f = node.f.concat(blockContents);
              break;
            default:
              break;
          }
        } else if (node.f && node.f.length) { 
          /**
           * block 嵌套的时候, block_b 在 block_a 里面
           * block_a = {
           *   f: [
           *     { block_a }
           *   ],
           *   type = block
           * }
           *
           * 这个时候blocks[blocks_a] 为空, 但是可能有 blocks[blocks_b]
           */
          visitNodes(node.f);
        }
      }

      // go deep
      handleNode(node);

      /* jshint -W082 */
      function handleNode(node) {
        // node is `object` here

        // not only `f`, f stands for child nodes
        // `m` menbers
        // `a` attributes
        // and many we don't know,so use Object.keys
        var keys = Object.keys(node);
        keys.forEach(function(key) {
          var val = node[key];

          if (Array.isArray(val)) {
            visitNodes(val);
          } else if (typeof val === 'object') {
            handleNode(val);
          }
        });
      }
    }
  }

  return {
    nodes: layoutFull.nodes,
    partials: partials
  };
};

/**
 * 获取template 的 layout相关的东西
 * 一个html会extend一个layout,
 * 称此html为Child, 被extend的layout为parent
 *
 * 返回{
 *   extend: 要extend的名称,
 *   blocks: {
 *     some-block: {
 *       nodes: [ 节点 ],
 *       type: types.SECTION block/prepend/append
 *     }
 *   }
 * }
 */
RactiveEngine.prototype._getChildLayout = function(parsed) {
  var extend, blocks = {};

  /**
   * layout & blocks
   *
   * {
   *   v: 1,
   *   t: [
   *     { 子节点 }
   *   ]
   * }
   */
  parsed.t.forEach(function(item, index) {
    if (typeof item === 'object' && item.t === types.SECTION) {

      // 1. extend
      if (item.n === types.SECTION_EXTEND) {
        if (extend) {
          var msg = '{{#extend}} should only happen once';
          throw new Error(msg);
        }
        extend = getNodeRef(item);
        return;
      }

      // 2. block/prepend/append
      var type = item.n;
      if (type === types.SECTION_APPEND ||
        type === types.SECTION_BLOCK ||
        type === types.SECTION_PREPEND) {

        var blockName = item.r;
        var blockContents = item.f;

        blocks[blockName] = {
          nodes: blockContents,

          /**
           * type <-> action
           *
           * prepend: prepend
           * block: replace
           * append: append
           */
          type: type
        };
      }
    }
  });

  return {
    extend: extend, // extend
    blocks: blocks, // block
  };
};

/**
 * 获取一个html中引用的所有partials,以及完整的 绝对路径
 *
 * return [
 *   { name: 'partial1', path: some-path-to-partial1 }
 * ]
 */
RactiveEngine.prototype._getPartials = function(templateParsed, templatePath) {
  var self = this;
  var partials = [];

  /**
   * search for partials
   */
  visitItems(templateParsed.t);

  function visitItems(items) {
    items.forEach(function(item) {
      if (typeof item === 'object') {
        if (item.t === types.PARTIAL) { // partial 节点
          var partialName = item.r;
          partials.push(partialName);
        } else if (item.f && item.f.length > 0) {
          visitItems(item.f);
        }
      }
    });
  }

  partials = partials.map(function(item) {
    if (!self.templateLoader) {
      var msg = 'templateLoader is required for using {{>partial}}';
      return self._error(msg, templatePath);
    }

    var request = fixPath(item); // a.b.c -> a/b/c
    var resolveFrom = path.dirname(templatePath); // dir
    var partial = self.templateLoader(request, resolveFrom);

    return {
      name: item,
      path: partial
    };
  });

  /**
   * subpartials are not usual
   */
  return partials;

  // for return
  var ret = partials.slice();

  // search subpartials
  partials.forEach(function(partial) {
    var subPartials = self._getFull(partial.path);
    if (subpartials && subpartials.length) {
      ret = ret.concat(subPartials);
    }
  });

  return ret;
};

/**
 * handle {{#include foo}}{{/include}}
 * @param  {Object} templateParsed
 * @param  {String} templatePath
 * @return {Array}  returns partials bring in by includes
 */
RactiveEngine.prototype._handleInclude = function(templateParsed, templatePath) {
  var self = this;
  var partials = [];
  visitNodes(templateParsed.t);
  return partials;

  function visitNodes(nodes) {
    for (var index = 0; index < nodes.length; index++) {
      var node = nodes[index];

      if (typeof node === 'object') {
        if (node.t === types.SECTION && node.n === types.SECTION_INCLUDE) {
          var include = getNodeRef(node); // a.b.c
          include = fixPath(include); // a.b.c -> a/b/c
          include = self.templateLoader(include, path.dirname(templatePath));// path

          var includeResult = self._getFull(include);
          partials = partials.concat(includeResult.partials);
          var includeContents = includeResult.nodes;

          var args = [index, 1].concat(includeContents);
          nodes.splice.apply(nodes, args);
          index += includeContents.length - 1;
        } else if (node.f && node.f.length) {
          visitNodes(node.f);
        }
      }
    }
  }
};

/**
 * throw a new Error
 */
RactiveEngine.prototype._error = function(msg, file) {
  msg = (msg || '') + fmt('\n in file : %s', file);
  throw new Error(msg);
};