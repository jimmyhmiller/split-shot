const a = require('./cycle-a');
// a is half-loaded here
exports.sawFromA = JSON.stringify(Object.keys(a));
exports.value = 'B';
