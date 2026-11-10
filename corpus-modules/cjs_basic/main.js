const path = require('node:path');
const util = require('./lib/util');
const data = require('./data.json');
const again = require('./lib/util.js');
const { ping } = require('./cycle-a');
exports.main = function main(input) {
  return {
    same: util === again, sum: util.add(input, data.base), name: util.add.name,
    file: path.basename(__filename), dir: path.basename(__dirname),
    thisIsExports: util.thisWasExports, loaded: module.loaded, mainIsMe: require.main === module,
    cache: Object.keys(require.cache).map((f) => path.basename(f)).sort(),
    ping: ping(), json: data, args: util.argCount,
  };
};
