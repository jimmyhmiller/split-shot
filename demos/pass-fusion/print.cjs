const {generate, GENERATOR} = require('astring');

// ESTree literals created by folding may contain -0, NaN, infinities or
// negative values. Print valid expressions without losing their numeric value
// or breaking exponentiation precedence. No global NaN/Infinity bindings.
function print(ast) {
  return generate(ast, {generator: {
    ...GENERATOR,
    Literal(node, state) {
      if (typeof node.value !== 'number') throw Error('Expected numeric literal');
      const n = node.value;
      if (Number.isNaN(n)) state.write('(0 / 0)');
      else if (n === Infinity) state.write('(1 / 0)');
      else if (n === -Infinity) state.write('(-1 / 0)');
      else if (Object.is(n, -0)) state.write('(-0)');
      else if (n < 0) state.write('(' + n + ')');
      else state.write(String(n));
    }
  }});
}
module.exports = {print};
