// inputs: [0, 1, -3]
// forbid-return: loop|rec|isPaused|make|Agent
// engine262's Agent construction in miniature, in a module-like scope:
// classes with private fields (a private arrow field calling back into the
// instance), getters and a counter of that scope. Making an Agent folds
// completely: the classes and their private stores are runtime values
// (they leave the scope), but the instance made here is not, so its
// private entries stay modeled.
const api = (function () {
  let sig = 0;
  class Loop {
    #state = "idle";
    #fire = () => {
      if (this.#state !== "auto") return;
      this.n++;
    };
    n = 0;
    constructor(a) {
      this.a = a;
    }
    run(t) {
      this.#state = t;
      this.#fire();
    }
  }
  class Agent {
    stack = [];
    get top() {
      return this.stack.at(-1);
    }
    #paused;
    constructor(options = {}) {
      const s = sig;
      sig += 1;
      this.rec = { s, kept: new Set() };
      this.opts = options;
      this.loop = options.loop?.(this) || new Loop(this);
      if (options.start !== false) this.loop.run(options.type || "auto");
    }
    isPaused() {
      return this.#paused !== undefined;
    }
  }
  return { Agent, make: (o) => new Agent(o) };
})();
function main(x) {
  const a = api.make({});
  return a.loop.n + a.rec.s + (a.isPaused() ? 100 : 0) + x;
}
