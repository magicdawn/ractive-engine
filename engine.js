/**
 * module dependencies
 */
var Ractive = require('./ractive/ractive');
var types = Ractive.types;
var fs = require('fs');
var path = require('path');
var fixPath = require('./util').fixPath;
// var _ = require('lodash');

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
  this.cache = {};

  /**
   * view extension name
   */
  this.ext = options.ext ? (options.ext[0] === '.' ? options.ext : '.' + options.ext) : '.html';

  /**
   * how to find layout & partials
   *
   * 如果没有设置两个root,那么就
   * 以template的path为base,resolve partial & layout的path
   */
  this.layoutRoot = null;
  this.partialRoot = null;
}

/**
 * renderFile def
 */
RactiveEngine.prototype.renderFileSync = function(viewPath, locals) {
  viewPath = path.resolve(viewPath);
  var template = this._read(viewPath);
  var templateParsed = Ractive.parse(template);
  var full = this._getFull(templateParsed, viewPath);

  /**
   * full = {
   *   nodes: [],
   *   partials: [
   *     { name: , path: ''}
   *   ]
   * }
   */
  var self = this;
  var readedPartials = {};
  full.partials.forEach(function(item) {
    readedPartials[item.name] = self._read(item.path);
  });

  // 最后去除各个block壳
  function removeBlock(nodes) {
    for (var index = 0, len = nodes.length; index < len; index++) {
      var node = nodes[index];
      if (typeof node === 'object') {
        if (node.n === types.SECTION_BLOCK) {
          // 删除这个 block 定义,剥壳
          var blockContents = node.f;
          var args = [index, 1].concat(blockContents);
          [].splice.apply(nodes, args);
          index += blockContents.length - 1;
        } else if (node.f) {
          removeBlock(node.f);
        }
      }
    };
  }
  removeBlock(full.nodes);

  return this._render(full.nodes, locals, readedPartials);
}

/**
 * return parsed templa
 */
RactiveEngine.prototype._read = function(viewPath) {
  viewPath = path.resolve(viewPath);
  if (path.extname(viewPath) === '') {
    viewPath += this.ext;
  }

  if (this.enableCache) {
    if (this.cache[viewPath]) {
      return this.cache[viewPath];
    } else {
      return this.cache[viewPath] = fs.readFileSync(viewPath, 'utf8');
    }
  } else {
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
RactiveEngine.prototype._getFull = function(templateParsed, templatePath) {
  /**
   * get a template's layout & blocks
   */
  var result = this._getChildLayout(templateParsed);
  var layout = result.extend;
  var blocks = result.blocks;
  var partials = this._getPartials(templateParsed, templatePath);

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

  var layoutPath;
  if (layout[0] === '.' || !this.layoutRoot) { // relative path
    layoutPath = path.resolve(path.dirname(templatePath), layout);
  } else {
    layoutPath = path.resolve(this.layoutRoot, layout);
  }

  var layoutTemplate = this._read(layoutPath);
  var layoutParsed = Ractive.parse(layoutTemplate);
  var layoutFull = this._getFull(layoutParsed, layoutPath); // recursive

  // layoutFull
  //  .nodes
  //  .partials
  visitNodes(layoutFull.nodes);

  function visitNodes(nodes) {
    for (var index = 0, len = nodes.length; index < len; index++) {
      var node = nodes[index];

      if (typeof node === 'object') {
        if (node.n === types.SECTION_BLOCK) {
          var blockName = node.r;

          if (blockName === 'body') { // layout中定义 block body 的地方
            // 删除这个body block 定义,body实现放在这里
            // splice(index,1,  block.f[0] ... )
            var blockContents = blocks['bodyImplement'];
            var args = [index, 1].concat(blockContents);
            [].splice.apply(nodes, args);
            index += blockContents.length - 1;

          } else if (blocks[blockName]) { // template 中定义了跟 layout一样的 block
            // 把内容放进block里,行为 replace
            // 未来支持 prepend/append 重构方便

            var blockContents = blocks[blockName];
            node.f = blockContents;
          }
        } else if (node.f) {

          visitNodes(node.f); // recursive
        }
      }
    }
  }

  return {
    nodes: layoutFull.nodes,
    partials: layoutFull.partials.concat(partials)
  };
};

/**
 * 获取template 的 layout相关的东西
 * 一个html会extend一个layout,
 * 称此html为Child, 被extend的layout为parent
 *
 * 返回{
 *   extend: 要extend的名称,
 *   blocks: 定义的blocks
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
      if (item.n === types.SECTION_EXTEND) {
        extend = item.r;
        item.marked = true; // 标记为删除

      } else if (item.n === types.SECTION_BLOCK) {
        var blockName = item.r;
        var blockContents = item.f;

        if (blockName === 'body') {
          return;
        }

        // TODO: 覆盖检测
        item.marked = true;
        blocks[blockName] = blockContents;
      }
    }
  });

  // 实现 parent layout 的body block
  var bodyContents = parsed.t.filter(function(item) {
    return !(item.marked);
  });
  // careful
  blocks['bodyImplement'] = bodyContents;

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
   * 深度优先 dfs
   */
  visitNodes(templateParsed.t);

  function visitNodes(nodes) {
    nodes.forEach(function(node) {
      if (typeof node === 'object') {
        if (node.t === types.PARTIAL) { // partial 节点
          var partialName = node.r;
          partials.push(partialName);
        } else if (node.f && node.f.length > 0) {
          visitNodes(node.f);
        }
      }
    });
  }

  return partials.map(function(item) {
    var relativePath = fixPath(item); // a.b.c -> a/b/c
    var basePath = self.partialRoot || path.dirname(templatePath)

    return {
      name: item,
      path: path.resolve(basePath, relativePath)
    };
  });
};