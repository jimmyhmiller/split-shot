const acorn = require('acorn');
const astring = require('astring');
const eslintScope = require('eslint-scope');

function children(node) {
  return Object.values(node).flatMap(value => Array.isArray(value)
    ? value.filter(x => x && typeof x.type === 'string')
    : value && typeof value.type === 'string' ? [value] : []);
}
function walk(node, fn) { fn(node); for (const child of children(node)) walk(child, fn); }
function cleanBindings(source) {
  const ast = acorn.parse(source, {ecmaVersion: 2022, ranges: true});
  walk(ast, node => {
    if (node.type === 'WithStatement' || node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'eval') {
      throw new Error('Binding cleanup does not support with or direct eval');
    }
    if (node.type === 'Property' && node.shorthand) { node.key = {...node.key}; node.shorthand = false; }
  });
  const parents = new Map();
  walk(ast, node => { for (const child of children(node)) parents.set(child, node); });
  const manager = eslintScope.analyze(ast, {ecmaVersion: 2022, sourceType: 'script'});
  const fresh = new Set();
  walk(ast, node => { if (node.type === 'Identifier') fresh.add(node.name); });
  const counts = {splitBindings: 0, constDeclarations: 0, mutableDeclarations: 0, skippedFunctions: 0};
  const cap = name => name[0].toUpperCase() + name.slice(1);
  function hint(expr, fallback) {
    if (!expr) return fallback;
    if (expr.type === 'MemberExpression') {
      const key = expr.computed ? expr.property.value : expr.property.name;
      if (expr.object.type === 'CallExpression' && typeof key === 'string') return hint(expr.object, fallback) + cap(key);
      if (expr.object.type === 'Identifier' && expr.computed && typeof key === 'number') return expr.object.name + 'Item';
    }
    if (expr.type === 'CallExpression') {
      const callee = expr.callee;
      const method = callee.type === 'MemberExpression' && !callee.computed ? callee.property.name : callee.type === 'Identifier' ? callee.name : null;
      if (method) {
        const arg = expr.arguments[0];
        if (method === 'reference' && arg && (arg.type === 'Identifier' || arg.type === 'Literal' && typeof arg.value === 'string' && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(arg.value))) {
          return (arg.name || arg.value) + cap(method);
        }
        return method;
      }
    }
    if (expr.type === 'BinaryExpression' && expr.operator === '+' && expr.left.type === 'Literal' && typeof expr.left.value === 'string') return 'text';
    return fallback;
  }
  function newName(base) {
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(base)) base = 'binding';
    let name = base, number = 2;
    while (fresh.has(name)) name = base + number++;
    fresh.add(name); return name;
  }
  for (const scope of manager.scopes) {
    if (scope.type !== 'function' || scope.block.async || scope.block.generator || scope.block.body.type !== 'BlockStatement') continue;
    const candidates = [];
    for (const variable of scope.variables) {
      if (variable.defs.length !== 1 || variable.defs[0].type !== 'Variable' || variable.defs[0].kind !== 'let') continue;
      const declaration = variable.defs[0].node;
      if (declaration.id.type !== 'Identifier') continue;
      const declarationStatement = parents.get(declaration);
      if (!['BlockStatement', 'Program'].includes(parents.get(declarationStatement)?.type)) continue;
      if (variable.references.some(ref => ref.from.variableScope !== scope)) continue;
      if (variable.references.some(ref => ref.isRead() && ref.identifier.start < declaration.id.start)) continue;
      let safe = true;
      for (const ref of variable.references) {
        if (ref.isRead()) {
          for (let parent = parents.get(ref.identifier); parent && parent !== scope.block; parent = parents.get(parent)) {
            if (parent === declaration) safe = false; // retain initializer TDZ/self-reference
          }
        }
        if (!ref.isWrite()) continue;
        const parent = parents.get(ref.identifier);
        const isInitial = declaration.id === ref.identifier;
        const simple = parent?.type === 'AssignmentExpression' && parent.left === ref.identifier && parents.get(parent)?.type === 'ExpressionStatement';
        if (!isInitial && !simple) safe = false;
        const value = isInitial ? declaration.init : simple ? parent.right : null;
        if (value && (value.type === 'ArrowFunctionExpression' || ['FunctionExpression', 'ClassExpression'].includes(value.type) && !value.id)) safe = false;
      }
      if (safe) candidates.push(variable);
    }
    if (!candidates.length) continue;
    const owned = new Map(), reads = new Map();
    for (const variable of candidates) {
      owned.set(variable.identifiers[0], variable);
      for (const ref of variable.references) { owned.set(ref.identifier, variable); if (ref.isRead()) reads.set(ref.identifier, variable); }
    }
    const nodes = [], definitions = [], statementNodes = new Map();
    function node(readIds = [], definition = null) {
      const id = nodes.length;
      nodes.push({id, reads: readIds, definition, next: new Set(), previous: new Set()});
      if (definition) { definition.id = definitions.length; definition.node = id; definitions.push(definition); }
      return id;
    }
    function readExpr(expr) {
      const ids = [];
      function scan(n) { if (!n || /Function/.test(n.type)) return; if (reads.has(n)) ids.push(n); for (const child of children(n)) scan(child); }
      scan(expr); return ids;
    }
    const exit = node();
    function link(from, to) { nodes[from].next.add(to); nodes[to].previous.add(from); }
    function expression(expr, next, statement) {
      const id = node(readExpr(expr)); link(id, next); if (statement) statementNodes.set(statement, id); return id;
    }
    function statements(body, next, loop) { for (let i = body.length - 1; i >= 0; i--) next = stmt(body[i], next, loop); return next; }
    function stmt(s, next, loop) {
      if (s.type === 'BlockStatement') return statements(s.body, next, loop);
      if (s.type === 'VariableDeclaration') {
        let head = next;
        for (let i = s.declarations.length - 1; i >= 0; i--) {
          const d = s.declarations[i], variable = owned.get(d.id);
          if (!variable) { head = expression(d.init, head); continue; }
          const def = {variable, identifier: d.id, expression: d.init, statement: s, declarator: d, initial: true};
          const id = node([], def); link(id, head); head = expression(d.init, id); statementNodes.set(d, id);
        }
        return head;
      }
      if (s.type === 'ExpressionStatement') {
        const a = s.expression, variable = a.type === 'AssignmentExpression' && owned.get(a.left);
        if (variable && a.left.type === 'Identifier') {
          const def = {variable, identifier: a.left, expression: a.right, statement: s, initial: false, compound: a.operator !== '='};
          const id = node([], def); link(id, next); statementNodes.set(s, id); return expression(a, id);
        }
        return expression(a, next, s);
      }
      if (s.type === 'IfStatement') {
        const id = node(readExpr(s.test));
        link(id, stmt(s.consequent, next, loop)); link(id, s.alternate ? stmt(s.alternate, next, loop) : next);
        return id;
      }
      if (s.type === 'WhileStatement') {
        const id = node(readExpr(s.test));
        link(id, next); link(id, stmt(s.body, id, {break: next, continue: id})); return id;
      }
      if (s.type === 'ContinueStatement' || s.type === 'BreakStatement') {
        if (!loop || s.label) throw new Error('unsupported jump');
        const id = node(); link(id, s.type === 'ContinueStatement' ? loop.continue : loop.break); return id;
      }
      if (s.type === 'ReturnStatement' || s.type === 'ThrowStatement') return expression(s.argument, exit, s);
      if (s.type === 'FunctionDeclaration' || s.type === 'EmptyStatement') return next;
      throw new Error('unsupported control flow: ' + s.type);
    }
    let entry;
    try { entry = statements(scope.block.body.body, exit, null); }
    catch { counts.skippedFunctions++; continue; }
    const reachable = new Set(), stack = [entry];
    while (stack.length) { const id = stack.pop(); if (reachable.has(id)) continue; reachable.add(id); stack.push(...nodes[id].next); }
    const incoming = nodes.map(() => new Set()), outgoing = nodes.map(() => new Set());
    function same(a,b) { return a.size === b.size && [...a].every(x => b.has(x)); }
    let changed;
    do {
      changed = false;
      for (const id of reachable) {
        const n = nodes[id], input = new Set();
        for (const p of n.previous) if (reachable.has(p)) for (const d of outgoing[p]) input.add(d);
        const output = new Set([...input].filter(d => !n.definition || definitions[d].variable !== n.definition.variable));
        if (n.definition) output.add(n.definition.id);
        if (!same(input,incoming[id]) || !same(output,outgoing[id])) { incoming[id] = input; outgoing[id] = output; changed = true; }
      }
    } while (changed);
    const parent = definitions.map((_,i)=>i);
    function find(i) { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }
    function union(a,b) { parent[find(a)] = find(b); }
    // A compound assignment reads and writes one binding in a single token.
    // Its incoming definitions must stay in the same live-range component.
    for (const n of nodes) if (n.definition?.compound) {
      for (const d of incoming[n.id]) if (definitions[d].variable === n.definition.variable) union(d,n.definition.id);
    }
    const uses = new Map();
    for (const id of reachable) for (const identifier of nodes[id].reads) {
      const variable = reads.get(identifier), defs = [...incoming[id]].filter(d => definitions[d].variable === variable);
      if (defs.length === 0) { uses.set(identifier, null); continue; }
      for (const d of defs.slice(1)) union(defs[0],d);
      uses.set(identifier, defs[0]);
    }
    const dominators = nodes.map((_,id)=>id === entry ? new Set([entry]) : new Set(reachable));
    do {
      changed = false;
      for (const id of reachable) {
        if (id === entry) continue;
        const preds = [...nodes[id].previous].filter(p=>reachable.has(p));
        const next = preds.length ? new Set([...dominators[preds[0]]].filter(x=>preds.every(p=>dominators[p].has(x)))) : new Set();
        next.add(id); if (!same(next,dominators[id])) { dominators[id] = next; changed = true; }
      }
    } while(changed);
    function lexicalBlock(n) { while (n && n.type !== 'BlockStatement') n = parents.get(n); return n; }
    function inside(node, block) { while (node) { if (node === block) return true; node = parents.get(node); } return false; }
    const replacements = new Map(), declarations = new Map(), renamed = new Map();
    for (const variable of candidates) {
      if ([...uses].some(([id,def])=>reads.get(id) === variable && def === null)) continue;
      const defs = definitions.filter(d=>d.variable === variable);
      // Unreachable writes/reads are retained conservatively, as they can carry
      // lexical bindings even when the CFG has no normal path to them.
      if (defs.some(d=>!reachable.has(d.node)) || variable.references.some(r=>r.isRead()&&!uses.has(r.identifier))) continue;
      const groups = new Map();
      for (const d of defs) { const key = find(d.id); if (!groups.has(key)) groups.set(key,{defs:[],uses:[]}); groups.get(key).defs.push(d); }
      for (const [identifier,d] of uses) if (reads.get(identifier) === variable) groups.get(find(d)).uses.push(identifier);
      const active = [...groups.values()].filter(g=>g.uses.length || g.defs.some(d=>!d.initial || d.expression));
      active.sort((a,b)=>Math.min(...a.defs.map(d=>d.identifier.start))-Math.min(...b.defs.map(d=>d.identifier.start)));
      const initial = defs.find(d=>d.initial);
      const plans = [];
      for (const [index,g] of active.entries()) {
        const actual = g.defs.filter(d=>!d.initial || d.expression);
        let anchor = actual.find(d=>!d.compound && parents.get(d.statement)?.type === "BlockStatement" && g.defs.every(other=>other===d || other.initial&&!other.expression || dominators[other.node].has(d.node)) &&
          g.uses.every(identifier=>{const use=nodes.find(n=>n.reads.includes(identifier));return dominators[use.id].has(d.node);}) &&
          g.uses.every(identifier=>inside(identifier,lexicalBlock(d.statement))) &&
          actual.every(other=>inside(other.statement,lexicalBlock(d.statement))));
        let kind = actual.length === 1 && !actual[0].compound ? 'const' : 'let';
        if (!actual.length) { anchor = initial; kind = 'const'; }
        if (!anchor) { anchor = initial; kind = 'let'; }
        const base = active.length === 1 || index === 0 && !/^(?:temp|tmp|[a-z]|v\d+)$/.test(variable.name)
          ? variable.name : hint(actual[0]?.expression,variable.name+'Value');
        const name = base === variable.name && index === 0 ? variable.name : newName(base);
        plans.push({g,anchor,kind,name,actual});
      }
      // Plan all replacements before changing nodes; declaration relocation does
      // not move the initializer or change the order of any evaluated expression.
      declarations.set(initial.declarator, []);
      for (const p of plans) {
        const {g,anchor,kind,name,actual} = p;
        for (const id of g.uses) renamed.set(id,name);
        for (const d of g.defs) renamed.set(d.identifier,name);
        const make = init => ({type:'VariableDeclaration',kind,declarations:[{type:'VariableDeclarator',id:{type:'Identifier',name},init}]});
        if (anchor.initial && !anchor.expression) {
          const init = kind === 'const' ? {type:'UnaryExpression',operator:'void',prefix:true,argument:{type:'Literal',value:0}} : null;
          declarations.get(initial.declarator).push(make(init));
          kind === 'const' ? counts.constDeclarations++ : counts.mutableDeclarations++;
        }
        for (const d of actual) {
          const init = d.expression;
          if (d === anchor) {
            const decl = make(init);
            if (d.initial) declarations.get(initial.declarator).push(decl); else replacements.set(d.statement,decl);
            kind === 'const' ? counts.constDeclarations++ : counts.mutableDeclarations++;
          }
        }
      }
      counts.splitBindings += Math.max(0,active.length-1);
    }
    for (const [identifier,name] of renamed) identifier.name = name;
    function apply(n) {
      if (n !== scope.block && /Function/.test(n.type)) return n;
      if (n.type === 'BlockStatement') {
        n.body = n.body.flatMap(s=>{
          if (s.type === 'VariableDeclaration') return s.declarations.flatMap(d=>declarations.has(d)
            ? declarations.get(d) : [{...s,declarations:[d]}]);
          return [replacements.get(s)||s];
        });
      }
      for (const child of children(n)) apply(child);
      return n;
    }
    apply(scope.block.body);
    // Removing a declaration must not turn a former string statement into a
    // newly active directive (notably "use strict" / "use asm").
    for (const statement of scope.block.body.body) {
      if (statement.type !== 'ExpressionStatement' || statement.expression.type !== 'Literal' || typeof statement.expression.value !== 'string') break;
      if (!statement.directive) {
        statement.expression = {type:'SequenceExpression',expressions:[{type:'Literal',value:0},statement.expression]};
        break;
      }
    }
  }
  const code = astring.generate(ast);
  acorn.parse(code,{ecmaVersion:2022});
  return {code,counts};
}
module.exports = {cleanBindings};
if (require.main === module) {
  const fs = require('node:fs');
  const result = cleanBindings(fs.readFileSync(process.argv[2],'utf8'));
  process.stdout.write(result.code);
  process.stderr.write(JSON.stringify(result.counts)+'\n');
}
