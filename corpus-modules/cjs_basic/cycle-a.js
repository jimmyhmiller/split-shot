exports.early = 'a-early';
const b = require('./cycle-b');
exports.ping = () => 'a sees b.value=' + b.value + ', b saw ' + b.sawFromA;
