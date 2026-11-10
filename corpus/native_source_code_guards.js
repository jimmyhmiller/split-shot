// inputs: [{"mode": 0, "n": 0, "value": 2}, {"mode": 0, "n": 0, "value": "q"}, {"mode": 0, "n": 0, "value": null}, {"mode": 0, "n": 3, "value": 2}, {"mode": 0, "n": 3, "value": "q"}, {"mode": 0, "n": 3, "value": null}, {"mode": 0, "n": 25, "value": 2}, {"mode": 0, "n": 25, "value": "q"}, {"mode": 0, "n": 25, "value": null}, {"mode": 1, "n": 0, "value": 2}, {"mode": 1, "n": 0, "value": "q"}, {"mode": 1, "n": 0, "value": null}, {"mode": 1, "n": 3, "value": 2}, {"mode": 1, "n": 3, "value": "q"}, {"mode": 1, "n": 3, "value": null}, {"mode": 1, "n": 25, "value": 2}, {"mode": 1, "n": 25, "value": "q"}, {"mode": 1, "n": 25, "value": null}, {"mode": 2, "n": 0, "value": 2}, {"mode": 2, "n": 0, "value": "q"}, {"mode": 2, "n": 0, "value": null}, {"mode": 2, "n": 3, "value": 2}, {"mode": 2, "n": 3, "value": "q"}, {"mode": 2, "n": 3, "value": null}, {"mode": 2, "n": 25, "value": 2}, {"mode": 2, "n": 25, "value": "q"}, {"mode": 2, "n": 25, "value": null}, {"mode": 3, "n": 0, "value": 2}, {"mode": 3, "n": 0, "value": "q"}, {"mode": 3, "n": 0, "value": null}, {"mode": 3, "n": 3, "value": 2}, {"mode": 3, "n": 3, "value": "q"}, {"mode": 3, "n": 3, "value": null}, {"mode": 3, "n": 25, "value": 2}, {"mode": 3, "n": 25, "value": "q"}, {"mode": 3, "n": 25, "value": null}, {"mode": 4, "n": 0, "value": 2}, {"mode": 4, "n": 0, "value": "q"}, {"mode": 4, "n": 0, "value": null}, {"mode": 4, "n": 3, "value": 2}, {"mode": 4, "n": 3, "value": "q"}, {"mode": 4, "n": 3, "value": null}, {"mode": 4, "n": 25, "value": 2}, {"mode": 4, "n": 25, "value": "q"}, {"mode": 4, "n": 25, "value": null}, {"mode": 5, "n": 0, "value": 2}, {"mode": 5, "n": 0, "value": "q"}, {"mode": 5, "n": 0, "value": null}, {"mode": 5, "n": 3, "value": 2}, {"mode": 5, "n": 3, "value": "q"}, {"mode": 5, "n": 3, "value": null}, {"mode": 5, "n": 25, "value": 2}, {"mode": 5, "n": 25, "value": "q"}, {"mode": 5, "n": 25, "value": null}]
// From the residual-language branch's C corpus (corpus-c/cases/native-source-code-guards.js),
// where master's specializer got it wrong or did not finish.
function ordinary(x) { return this.bias + x; }
function alternate(x) { return this.bias - x; }
function main(input) {
  let events = [], mode = input.mode, value = input.value;
  let node = {run: ordinary, bias: 7, previous: null};
  for (let i = 0; i < input.n; i++) node = {run: ordinary, bias: 7, previous: node};
  input.saved = node;
  if (mode === 1) node.run = alternate;
  if (mode === 2 || mode === 5) node.run = ordinary.bind({bias: 30});
  if (mode === 3) Object.defineProperty(node, 'run', {
    get: function () { events.push('lookup'); return ordinary; }
  });
  if (mode === 5) Object.defineProperty(node.run, 'call', {
    get: function () { events.push('call-property'); return alternate; }
  });
  Object.defineProperty(input, 'value', {
    get: function () {
      events.push('argument');
      if (mode === 4) { node.run = alternate; node.bias = 100; }
      return value;
    }
  });
  let result = node.run(input.value);
  return [result, events, input.saved === node];
}
