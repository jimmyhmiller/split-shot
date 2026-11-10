const esm = require('./later.mjs');
module.exports = { gotNamespace: Object.prototype.toString.call(esm), late: esm.lateValue(1) };
