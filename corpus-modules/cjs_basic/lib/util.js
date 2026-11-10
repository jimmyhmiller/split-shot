'use strict';
exports.thisWasExports = this === module.exports;
exports.argCount = arguments.length;
exports.add = function add(a, b) { return a + b; };
