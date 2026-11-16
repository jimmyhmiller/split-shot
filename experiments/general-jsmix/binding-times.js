// Monovariant, flow-insensitive binding-time analysis for the JS subset.
// No instruction names or host method names participate in this analysis.
function analyze(functions, entry, staticCount = 1) {
  const table = new Map(functions.map(fn => [fn[1], fn]));
  const flags = new Map(), returns = new Map();
  for (const fn of functions) { flags.set(fn[1], new Map(fn[4].map(name => [name, false]))); returns.set(fn[1], false); }
  const root = table.get(entry);
  if(!root)throw new Error("Unknown entry function: "+entry);
  if(root[2].length!==2)throw new Error("Entry requires one static and one dynamic parameter");
  root[2].forEach((name, i) => flags.get(entry).set(name, i >= staticCount));
  let changed;
  const promote = (map, name) => { if (!map.get(name)) { map.set(name, true); changed = true; } };
  function expr(e, env, propagate) {
    switch(e[0]) {
      case 'lit': case 'undef': return false;
      case 'var': return env.get(e[1]) || false;
      case 'unary': return expr(e[2],env,propagate);
      case 'arr': e[1].map(x => expr(x,env,propagate)); return true;
      case 'idx': return [expr(e[1],env,propagate), expr(e[2],env,propagate)].some(Boolean);
      case 'dot': return expr(e[1],env,propagate);
      case 'bin': return [expr(e[2],env,propagate), expr(e[3],env,propagate)].some(Boolean);
      case 'cond': return [e[1],e[2],e[3]].map(x => expr(x,env,propagate)).some(Boolean);
      case 'new': return e[2].map(x => expr(x,env,propagate)).some(Boolean);
      case 'call': {
        const args = e[2].map(x => expr(x,env,propagate));
        if(e[1][0] === 'var') {
          const fn=table.get(e[1][1]); if(!fn)throw new Error('Unknown function: '+e[1][1]);
          if(propagate) fn[2].forEach((p,i)=>{if(args[i])promote(flags.get(fn[1]),p);});
          return returns.get(fn[1]);
        }
        const receiver = expr(e[1][1],env,propagate);
        return e[1][2] === 'slice' ? receiver || args.some(Boolean) : true;
      }
      default: throw new Error('Unsupported binding-time expression: '+e[0]);
    }
  }
  function stmt(s, env, fn, control = false) {
    switch(s[0]) {
      case 'var': case 'assign': if(expr(s[2],env,true)||control)promote(env,s[1]); break;
      case 'return': if(expr(s[1],env,true)||control)promote(returns,fn); break;
      case 'expr': case 'throw': expr(s[1],env,true); break;
      case 'block': s[1].forEach(x=>stmt(x,env,fn,control)); break;
      case 'if': {const d=expr(s[1],env,true)||control;stmt(s[2],env,fn,d);if(s[3])stmt(s[3],env,fn,d);break;}
      case 'while': {const d=expr(s[1],env,true)||control;stmt(s[2],env,fn,d);break;}
      default: throw new Error('Unsupported binding-time statement: '+s[0]);
    }
  }
  do { changed=false;for(const fn of functions)fn[3].forEach(s=>stmt(s,flags.get(fn[1]),fn[1])); } while(changed);
  function annotate(e, env) {
    const d=expr(e,env,false);
    switch(e[0]) {
      case 'lit': case 'undef': case 'var': break;
      case 'unary': annotate(e[2],env);break;
      case 'idx': annotate(e[1],env);annotate(e[2],env);break;
      case 'dot': annotate(e[1],env);break;
      case 'bin': annotate(e[2],env);annotate(e[3],env);break;
      case 'cond': annotate(e[1],env);annotate(e[2],env);annotate(e[3],env);break;
      case 'arr': e[1].forEach(x=>annotate(x,env));break;
      case 'call': if(e[1][0]==='dot')annotate(e[1][1],env);e[2].forEach(x=>annotate(x,env));break;
      case 'new': e[2].forEach(x=>annotate(x,env));break;
    }
    e.push(d);
  }
  function annotateStmt(s,env,fn) {
    switch(s[0]) {
      case 'var': case 'assign': annotate(s[2],env);s.push(env.get(s[1]));break;
      case 'expr': case 'throw': annotate(s[1],env);break;
      case 'return': annotate(s[1],env);s.push(returns.get(fn));break;
      case 'block':s[1].forEach(x=>annotateStmt(x,env,fn));break;
      case 'if':annotate(s[1],env);annotateStmt(s[2],env,fn);if(s[3])annotateStmt(s[3],env,fn);break;
      case 'while':annotate(s[1],env);annotateStmt(s[2],env,fn);break;
    }
  }
  for(const fn of functions){annotateStmt(['block',fn[3]],flags.get(fn[1]),fn[1]);fn.push(fn[2].map(n=>flags.get(fn[1]).get(n)));fn.push(fn[4].map(n=>flags.get(fn[1]).get(n)));}
  return functions;
}
