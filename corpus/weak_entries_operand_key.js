// inputs: [0, 1, 4]
// An object a step has popped as its operand is in use while the step runs:
// when the step makes another object escape first, the weak entries keyed
// by the operand are not dead. (Writing a fresh instance into a runtime
// object dropped its private fields, which live in weak stores, so reading
// one threw; a plain WeakMap's entry for the second argument of a runtime
// call was dropped the same way.)
function main(x) {
  const rt = new Function("return {}")();
  const sink = new Function("a", "b", "return [a, b];");
  class Agent {
    #prev = false;
    #bp = new Map([[x, x]]);
    get previewing() { return this.#prev; }
    size() { return this.#bp.size; }
  }
  function setAgent(a) { rt.agent = a; }
  setAgent(new Agent());
  const wm = new WeakMap();
  rt.wm = wm;
  const mk = () => { const k = { k: x }; wm.set(k, x + 1); return k; };
  const pair = sink({ first: x }, mk());
  return [rt.agent.previewing, rt.agent.size(), rt.wm.get(pair[1]), x].join();
}
