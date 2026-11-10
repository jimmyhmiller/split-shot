// Same workload in the browser and Node/jsdom. Data preparation, keyed list
// reconciliation, DOM calls, and reducers are included; layout/paint are not.
async function benchmarkUI(options) {
  const clock = options.now, document = options.document;
  const pause = options.pause || function () { return Promise.resolve(); };
  const samples = options.samples || 9, targetMs = options.targetMs || 25;
  const sizes = options.sizes || [240, 960, 3840];
  const scenarios = [];
  for (const size of sizes) {
    for (const kind of ['noop', 'inspector', 'search', 'sort', 'feed']) {
      scenarios.push({ size: size, kind: kind, name: ({ noop: 'Unchanged render', inspector: 'Edit operator', search: 'Search + reconcile rows', sort: 'Sort + move keyed rows', feed: '12 simulation ticks + reset' })[kind] });
    }
  }
  function task(program, scenario) {
    const root = document.createElement('div');
    let state = program.prepare(program.initial({ size: scenario.size }));
    let nodes;
    const collections = createCollections(program, document, dispatch);
    function dispatch(action, event) {
      const reduced = action(state, event);
      const next = reduced === state ? state : program.prepare(reduced);
      program.update({ previous: state, next: next, nodes: nodes, collections: collections });
      state = next;
    }
    nodes = program.mount({ document: document, root: root, state: state, dispatch: dispatch, collections: collections });
    const a = state;
    const button = root.querySelector('[data-ui="advance"]');
    const eventTarget = scenario.kind === 'inspector' ? root.querySelector('[data-ui="owner"]')
      : scenario.kind === 'search' ? root.querySelector('[data-ui="search"]') : root.querySelector('[data-ui="sort"]');
    const baselineValue = scenario.kind === 'inspector' ? a.view.focus.owner : scenario.kind === 'search' ? '' : 'risk';
    const changedValue = scenario.kind === 'inspector' ? 'Quinn' : scenario.kind === 'search' ? 'Northstar' : 'customer';
    const eventType = scenario.kind === 'sort' ? 'change' : 'input';
    const forwardEvent = new document.defaultView.Event(eventType, { bubbles: true });
    const backwardEvent = new document.defaultView.Event(eventType, { bubbles: true });
    function apply(raw) {
      const next = raw === state ? state : program.prepare(raw);
      program.update({ previous: state, next: next, nodes: nodes, collections: collections });
      state = next;
    }
    return {
      run: function (count) {
        if (scenario.kind === 'feed') {
          // One measured operation is a complete 12-tick replay plus reset.
          // This keeps all samples active and accounts for reset costs explicitly.
          for (let i = 0; i < count; i++) {
            apply(a);
            for (let tick = 0; tick < 12; tick++) button.click();
          }
        } else if (scenario.kind === 'noop') {
          for (let i = 0; i < count; i++) apply(state);
        } else {
          for (let i = 0; i < count; i += 2) {
            eventTarget.value = changedValue; eventTarget.dispatchEvent(forwardEvent);
            eventTarget.value = baselineValue; eventTarget.dispatchEvent(backwardEvent);
          }
        }
      },
      check: function () {
        const rows = [...root.querySelector('[data-ui="queue-rows"]').children];
        return rows.length === state.view.rows.length && rows.every(function (node, index) {
          return +node.getAttribute('data-record') === state.view.rows[index].id;
        }) && root.querySelector('[data-ui="owner"]').value === state.view.focus.owner;
      },
      close: function () { root.replaceChildren(); nodes = null; }
    };
  }
  function timed(t, count) { const before = clock(); t.run(count); return clock() - before; }
  function median(values) { return values.slice().sort(function (a,b) { return a-b; })[Math.floor(values.length/2)]; }
  const results = [];
  for (const scenario of scenarios) {
    if (options.progress) options.progress(scenario.name + ' · ' + scenario.size + ' records');
    await pause();
    const tasks = [task(options.original, scenario), task(options.compiled, scenario)];
    try {
      tasks[0].run(12); tasks[1].run(12);
      let count = 2;
      while (count < 1024) {
        const elapsed = Math.max(timed(tasks[0],count),timed(tasks[1],count));
        if (elapsed >= targetMs) break;
        count *= 2;
      }
      const timings = [[],[]];
      for (let sample=0;sample<samples;sample++) {
        await pause();
        for (const side of sample%2?[1,0]:[0,1]) timings[side].push(timed(tasks[side],count)*1000/count);
      }
      if (!tasks.every(function(t){return t.check();})) throw new Error('Benchmark DOM correctness check failed');
      const original=median(timings[0]),compiled=median(timings[1]);
      results.push({scenario:scenario.name,records:scenario.size,iterationsPerSample:count,samples:samples,
        originalUs:original,compiledUs:compiled,speedup:original/compiled,
        originalSamplesUs:timings[0],compiledSamplesUs:timings[1]});
    } finally { tasks.forEach(function(t){t.close();}); }
  }
  return results;
}
