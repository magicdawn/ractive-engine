/**
 * module dependencies
 */
var Ractive = require('./ractive/ractive');
var types = Ractive.types;
var fs = require('fs');
var path = require('path');
var fixPath = require('./util').fixPath;
var getNodeRef = require('./util').getNodeRef;
var debug = require('debug')('magicdawn:ractive-engine');
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
  this.ext = options.ext ? (options.ext[0] === '.' ? options.ext : '.' + options.ext) : '.html';

  /**
   * how to find layout & partials
   *
   * 如果没有设置两个root,那么就
   * 以template的path为base,resolve partial & layout的path
   */
  this.layoutRoot = options.layoutRoot ? path.resolve(options.layoutRoot) : null;
  this.partialRoot = options.partialRoot ? path.resolve(options.partialRoot) : null;
}

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
}

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
  if (path.extname(viewPath) === '') {
    viewPath += this.ext;
  }

  if (this.enableCache) {
    if (this.cache[viewPath]) {
      debug('reading file cache for %s', viewPath);
      return this.cache[viewPath];
    } else {
      debug('reading file %s', viewPath);
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
  var result = this._getChildLayout(templateParsed);
  var layout = result.extend;
  var blocks = result.blocks;
  var partials = this._getPartials(templateParsed, templatePath);

  // handle include
  var includePartials = this._handleInclude(templateParsed, templatePath);
  if (includePartials && includePartials.length) {
    partials.push(includePartials);
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

  var layoutPath;
  if (layout[0] === '.') {
    layoutPath = path.resolve(path.dirname(templatePath), layout);
  } else if (!this.layoutRoot) {
    var msg = 'layoutRoot option is required for none relative layout :\n';
    msg += fmt('{{#extend %s}}\n', layout);
    msg += fmt('in file: %s\n', templatePath);
    throw new Error(msg);
  } else {
    layoutPath = path.resolve(this.layoutRoot, layout);
  }

  var layoutFull = this._getFull(layoutPath); // recursive

  // layoutFull
  //  .nodes
  //  .partials
  visitNodes(layoutFull.nodes);

  function visitNodes(nodes) {
    for (var index = 0, len = nodes.length; index < len; index++) {
      var node = nodes[index];

      if (typeof node === 'object') {
        if (node.n === types.SECTION_BLOCK || node.n === types.SECTION_PREPEND || node.n === types.SECTION_APPEND) {
          var blockName = node.r;

          if (blockName === 'body') { // layout中定义 block body 的地方
            // 删除这个body block 定义,body实现放在这里
            // splice(index,1,  block.f[0] ... )
            var blockContents = blocks['bodyImplement'].nodes;
            var args = [index, 1].concat(blockContents);
            [].splice.apply(nodes, args);
            index += blockContents.length - 1;
          } else if (blocks[blockName]) { // template 中定义了跟 layout一样的 block

            var block = blocks[blockName];
            var blockType = block.type;
            var blockContents = block.nodes;

            if(!node.f){
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
      if (item.n === types.SECTION_EXTEND) {
        item.marked = true; // 标记为删除
        extend = getNodeRef(item);
        return;
      }

      var type = item.n;
      if (type === types.SECTION_APPEND || type === types.SECTION_BLOCK || type === types.SECTION_PREPEND) {
        var blockName = item.r;
        var blockContents = item.f;

        if (blockName === 'body') {
          // 模板嵌套,此模板的body,当作parent 模板的body实现一部分
          // 不做处理即可
          return;
        }

        // mark as a block,not body implement
        item.marked = true;
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

  // 实现 parent layout 的body block
  var bodyContents = parsed.t.filter(function(item) {
    return !(item.marked);
  });
  // careful
  blocks['bodyImplement'] = {
    nodes: bodyContents,
    type: types.SECTION_BLOCK, // replace
  };

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
    if (!self.partialRoot) {
      var msg = 'partialRoot option is required for partial:\n';
      msg += fmt('{{>%s}}\n', item);
      msg += fmt('in file: %s\n', templatePath);
      throw new Error(msg);
    };

    var relativePath = fixPath(item); // a.b.c -> a/b/c

    return {
      name: relativePath,
      path: path.resolve(self.partialRoot, relativePath)
    };
  });
};

/**
 * handle {{#include foo}}{{/include}}
 * @param  {Object} templateParsed
 * @param  {String} templatePath
 * @return {Array}  returns partials bring in by includes
 */
RactiveEngine.prototype._handleInclude = function(templateParsed, templatePath) {
  var partials = [];
  visitNodes(templateParsed.t);
  return partials;

  function visitNodes(nodes) {
    for (var index = 0, len = nodes.length; index < len; index++) {
      var node = nodes[index];

      if (typeof node === 'object') {
        if (node.t === types.SECTION && node.n === types.SECTION_INCLUDE) {
          if (node.f.length) {
            console.warn('RactiveEngine : include section should be empty\n' + fmt('in file : %s', templatePath));
          }

          var includeName = getNodeRef(node);
          var includePath = fixPath(includeName);
          if (includePath[0] === '.') {
            includePath = path.resolve(templatePath, includePath);
          } else if (!this.partialRoot) {
            var msg = 'partialRoot option is required for none relative partial:\n';
            msg += fmt('{{#include %s}}\n', includeName);
            msg += fmt('in file: %s\n', templatePath);
            throw new Error(msg);
          } else {
            includePath = path.resolve(this.partialRoot, includePath);
          }

          var includeResult = this._getFull(include);
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