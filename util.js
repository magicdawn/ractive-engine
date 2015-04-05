/**
 * useful utility
 */

/**
 * module dependencies
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