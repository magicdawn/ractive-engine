/**
 * useful utility definitions
 */

/**
 * fix path for extend & partials
 *   1. 引号中保持原样
 *   2. 简写时, a.b.c -> a/b/c
 */
exports.fixPath = function(str) {
  var ret = str;

  if (ret[0] === '"' || ret[0] === "'") {
    ret = ret.replace(/^['"]|['"]$/g, '').trim();
  } else {
    ret = ret.replace(/\./g, '/');
  }
  return ret;
};

/**
 * 获取节点引用
 */
exports.getNodeRef = function(node) {
  if (node.r) {
    return node.r;
  }

  if (node.x && node.x.s) {
    return node.x.s;
  }

  console.warn('node ref not found');
  return null;
};