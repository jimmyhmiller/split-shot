// Diagnostic probes, not alternate implementations or speedup benchmarks.
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const {spawnSync, execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const assert = require('node:assert/strict');
const acorn = require('acorn');
const root = path.resolve(__dirname, '../..');
const dir = path.join(__dirname, 'gap-probes');
fs.mkdirSync(dir, {recursive:true});
const sha = value => createHash('sha256').update(value).digest('hex');
const binary = path.join(root, 'target/release/js-frontend');
execFileSync('cargo', ['build','-q','--release','-p','js-frontend','--bin','js-frontend'], {cwd:root,stdio:['ignore','pipe','pipe']});
const compilerSha256 = sha(fs.readFileSync(binary));
const report = { compilerSha256, evaluatorSourceSha256: sha(fs.readFileSync(path.join(root,'src/js.rs'))),
  gitCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(), node:process.version,
  measuredAt:new Date().toISOString(), probes:[], dependencyCalls:[] };
const serveRequire = createRequire(require.resolve('serve-handler'));
const p2r = serveRequire('path-to-regexp');
const p2rSource = fs.readFileSync(serveRequire.resolve('path-to-regexp'),'utf8');
const p2rAst = acorn.parse(p2rSource,{ecmaVersion:'latest'});
// Link the complete pure-JS implementation, omitting only module export wiring.
const p2rLibrary = p2rAst.body.map(node => {
  if (['VariableDeclaration','FunctionDeclaration'].includes(node.type)) return p2rSource.slice(node.start,node.end);
  if (node.type === 'ExpressionStatement' && node.expression.type === 'AssignmentExpression' &&
      /^module\.exports(?:\.|\s*=)/.test(p2rSource.slice(node.start,node.end))) return '';
  throw new Error('Unexpected path-to-regexp top-level statement');
}).join('\n');
report.pathToRegexpSourceSha256 = sha(p2rSource);
const cleanLoop = `const cleaned = {}; for (const [key, value] of Object.entries(params)) {
  cleaned[key] = typeof value === 'string' ? value.replace(/^_NEXTSEP_/, '') : value;
} return cleaned;`;
const shapeInputs = [{team:'_NEXTSEP_red',project:'app',path:['a','b']},{team:undefined,project:'x',path:[]},{team:'a',project:undefined,path:undefined},{}];
const nextRouteRegex = require('next/dist/shared/lib/router/utils/route-regex').getRouteRegex('/teams/[team]/projects/[project]/files/[...path]').re;
const cleanup = require('next/dist/lib/route-pattern-normalizer').stripParameterSeparators;
const probes = [
  {name:'entries-fixed-shape', source:`function main(input) { const params={team:input.team,project:input.project,path:input.path}; ${cleanLoop} }`, inputs:shapeInputs},
  {name:'entries-conditional-shape', source:`function main(input) { const params={}; if(input.team!==undefined) params.team=input.team;
    if(input.project!==undefined) params.project=input.project; if(input.path!==undefined) params.path=input.path; ${cleanLoop} }`, inputs:shapeInputs},
  {name:'entries-after-decode', source:`function main(input) { const params={team:decodeURIComponent(input.team),project:decodeURIComponent(input.project),path:input.path}; ${cleanLoop} }`, inputs:shapeInputs},
  {name:'regex-dynamic-result', source:`function main(input) { const match=${nextRouteRegex}.exec(input); if(!match) return false; return [match.length,typeof match[1],typeof match[2],typeof match[3]]; }`, inputs:['/teams/a/projects/b/files/c','/teams/a/projects/b/files/src/x','/no-match']},
  {name:'callback-const-capture', source:`function main(input) { const prefix='_NEXTSEP_'; return input.map(value => typeof value==='string' ? value.replace(new RegExp('^'+prefix),'') : value); }`, inputs:[['_NEXTSEP_a','b',1,null],[],['_NEXTSEP_東京']]},
  {name:'callback-literal-control', source:`function main(input) { return input.map(value => typeof value==='string' ? value.replace(/^_NEXTSEP_/,'') : value); }`, inputs:[['_NEXTSEP_a','b',1,null],[],['_NEXTSEP_東京']]},
  {name:'callback-through-helper', source:`function main(input) { const prefix='_NEXTSEP_'; function clean(values) {return values.map(value => typeof value==='string' ? value.replace(new RegExp('^'+prefix),'') : value);} return clean(input); }`, inputs:[['_NEXTSEP_a','b',1,null],[],['_NEXTSEP_東京']]},
  {name:'callback-inside-loop', source:`function main(input) { const prefix='_NEXTSEP_';const out=[];for(let i=0;i<input.length;i++){out.push(input[i].map(value => typeof value==='string' ? value.replace(new RegExp('^'+prefix),'') : value));}return out; }`, inputs:[[],[['_NEXTSEP_a','b'],['_NEXTSEP_東京',1,null]]]},
  {name:'next-cleanup-loop', source:`function main(input) { const PARAM_SEPARATOR='_NEXTSEP_'; ${cleanup.toString()}\nreturn stripParameterSeparators(input); }`, inputs:shapeInputs,oracle:cleanup},
  {name:'uri-extra-token', source:`function main(input) { const token={name:'slug',prefix:'/'}; const value=encodeURIComponent(String(input),token); return token.prefix+value; }`, inputs:['hello','a b','東京',7,true]},
  {name:'uri-no-extra-token-control', source:`function main(input) { const token={name:'slug',prefix:'/'}; const value=encodeURIComponent(String(input)); return token.prefix+value; }`, inputs:['hello','a b','東京',7,true]},
  {name:'dead-string-call', source:`function main(input) { const name=String(input); name.startsWith('.'); return name.endsWith('/'); }`, inputs:['a/','a','.x',12,null]},
  {name:'dead-string-call-typed', typescript:true, source:`function main(input: string) { input.startsWith('.'); return input.endsWith('/'); }`, inputs:['a/','a','.x','東京/']},
  {name:'primitive-instanceof', source:`function main(input) { return '/legacy/:slug' instanceof RegExp ? input+1 : input; }`, inputs:[0,1,'x']},
  {name:'p2r-static-parse', source:`function main(input) { ${p2rLibrary}\nreturn parse('/legacy/:slug'); }`, inputs:[null,{},'ignored'], oracle:()=>p2r.parse('/legacy/:slug')},
  {name:'p2r-static-matcher', source:`function main(input) { ${p2rLibrary}\nconst keys=[]; const re=pathToRegexp('/legacy/:slug',keys); return {match:re.exec(input),keys}; }`,
    inputs:['/legacy/post-7','/legacy/a%20b','/legacy/東京','/legacy/','/no-match'], oracle:input=>{const keys=[];const re=p2r('/legacy/:slug',keys);return{match:re.exec(input),keys};}},
  {name:'p2r-static-destination', source:`function main(input) { ${p2rLibrary}\nconst toPath=compile('/articles/:slug'); return toPath(input); }`,
    inputs:[{slug:'hello'},{slug:'a b'},{slug:'東京'},{slug:7},{slug:true},{slug:[]},{slug:['a']},{}], oracle:p2r.compile('/articles/:slug')},
];
function outcome(fn,input){try{return{value:fn(input)}}catch(error){return{error:{name:error.name,message:error.message}}}}
for(const probe of probes){
  const filename=path.join(dir,probe.name+(probe.typescript?'.input.ts':'.input.js'));
  fs.writeFileSync(filename,probe.source+'\n');
  const result=spawnSync(binary,['--js','--entry','main','--budget','500K',filename],{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:16*1024*1024});
  const record={name:probe.name,sourceSha256:sha(probe.source+'\n')};
  fs.writeFileSync(path.join(dir,probe.name+'.stderr.txt'),result.stderr||'');
  if(result.status!==0){record.blocked=result.error?.message||result.stderr;}
  else{
    const residual=result.stdout.replace(/^---[^\n]*\n/,'');
    fs.writeFileSync(path.join(dir,probe.name+'.residual.js'),residual);
    record.residualSha256=sha(residual);record.bytes=Buffer.byteLength(residual);
    record.retains={entries:/Object\.entries\(/.test(residual),iterator:/Symbol\.iterator/.test(residual),
      captureBox:/value:/.test(residual),startsWith:/\.startsWith\(/.test(residual),
      regexpConstruction:/new RegExp\(/.test(residual),parseFunction:/function parse\b/.test(residual),instanceof:/instanceof/.test(residual)};
    try{
      const originalSource=probe.typescript?require('esbuild').transformSync(probe.source,{loader:'ts'}).code:probe.source;
      const original=new Function(originalSource+'\nreturn main;')();
      const compiled=new Function(residual+'\nreturn main;')();
      record.verified=0;
      for(const input of probe.inputs){
        const expected=outcome(probe.oracle||original,input);
        assert.deepEqual(outcome(original,input),expected);
        assert.deepEqual(outcome(compiled,input),expected);
        record.verified++;
      }
    }catch(error){record.incorrect=error.message;}
  }
  console.log(`${record.name}: ${record.blocked?'BLOCKED':record.incorrect?'INCORRECT':record.bytes+' bytes; '+record.verified+' checked'} ${JSON.stringify(record.retains||{})}`);
  report.probes.push(record);
}

// Instrument real dependencies to identify which static work still runs per call.
// Wrappers delegate to original functions, preserving receivers and arguments.
for(const request of ['/unmatched/7','/legacy/post-7','/docs/api/page-7']){
  const calls=[];
  const wrap=(label,fn)=>function(...args){calls.push({helper:label,firstArg:typeof args[0]==='string'?args[0]:typeof args[0]});return Reflect.apply(fn,this,args)};
  const actualPath=require('node:path');
  const pathToRegExp=wrap('pathToRegExp',p2r);
  pathToRegExp.compile=wrap('pathToRegExp.compile',p2r.compile);
  const host={path:{...actualPath,posix:{...actualPath.posix,resolve:wrap('path.posix.resolve',actualPath.posix.resolve)}},
    url:{parse:wrap('url.parse',require('node:url').parse)},slasher:wrap('slasher',serveRequire('./glob-slash')),
    minimatch:wrap('minimatch',serveRequire('minimatch')),pathToRegExp};
  const residual=fs.readFileSync(path.join(__dirname,'generated/serve-rewrites.residual.js'),'utf8');
  const fn=new Function('host',residual+'\nreturn main;')(host);
  const value=outcome(fn,request);
  report.dependencyCalls.push({request,result:value,calls});
}
fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');
const failures=report.probes.filter(probe=>probe.blocked||probe.incorrect);
if(failures.length){process.exitCode=1;console.error(`${failures.length} diagnostic probes failed; see gap-probes/report.json`);}
