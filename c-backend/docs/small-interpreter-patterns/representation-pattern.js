#!/usr/bin/env node
// Small interpreter representation probes, using the existing generic PE.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {spawnSync}=require('node:child_process'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const sha256=x=>createHash('sha256').update(x).digest('hex');
const root=process.env.PE_ROOT||path.resolve(__dirname,'../..'),bin=path.join(root,'..','target/release/js-frontend');
const outIndex=process.argv.indexOf('--out'),outDir=outIndex<0?fs.mkdtempSync(path.join(os.tmpdir(),'pe-representation-pattern-')):path.resolve(process.argv[outIndex+1]);
fs.mkdirSync(outDir,{recursive:true});
const flags={SPEC_WEIGHT_BUDGET:'10000',PE_NO_SHARED_CONTEXTS:'1',PE_CONTEXT_POINTS:'1'};
// Logical sum program uses slots 0=input, 1=i, 2=sum. Dispatch is interpreter
// logic; no fixture-specific arithmetic is emitted by this AST serializer.
const ast=[3,[[1,1,[0,0]],[1,2,[0,0]],[2,[4,[1,1],[1,0]],[3,[[1,2,[2,[1,2],[1,1]]],[1,1,[2,[1,1],[0,1]]]]]]]];
const expr=`function expr(p,e){var t=p[0];if(t===0)return p[1];if(t===1)return e[p[1]];if(t===2)return expr(p[1],e)+expr(p[2],e);if(t===4)return expr(p[1],e)<expr(p[2],e);return undefined;}`;
const stmt=`function stmt(p,e){var t=p[0];if(t===1){e[p[1]]=expr(p[2],e);return;}if(t===2){while(expr(p[1],e)){e[1]=e[1];stmt(p[2],e);}return;}if(t===3){var i=0;while(i<p[1].length){stmt(p[1][i],e);i=i+1;}}}`;
const body=`var e=[x,0,0];stmt(${JSON.stringify(ast)},e);return e[2];`;
const baseline=`function entry(x){${expr}\n${stmt}\n${body}}\n`;
const sumInputs=[-5,-0,0,1,2,3,10,40,1.5,2.5,100,NaN];
function sumOracle(x){let s=0;for(let i=0;i<x;i++)s+=i;return s;}
const cases=[];
function add(name,source,change,oracle=sumOracle,inputs=sumInputs,extra={}){cases.push({name,source,change,oracle,inputs,...extra});}
add('flat-array',baseline,'baseline: private interpreter helpers and direct scalar slots');
add('public-helpers',`${expr}\n${stmt}\nfunction entry(x){${body}}\n`,'only move helpers from private entry scope to public script scope');
add('object-slots',baseline.replace('[x,0,0]','{0:x,1:0,2:0}'),'only numeric slot container: array to plain object');
add('wrapped-slots',baseline.replaceAll('e[p[1]]','e.values[p[1]]').replaceAll('e[1]=e[1]','e.values=e.values').replace('var e=[x,0,0]','var e={values:[x,0,0]}').replace('return e[2]','return e.values[2]'),'only wrap the slot array in an env.values record');
const boxes=baseline.replaceAll('return e[p[1]]','return e[p[1]].value').replace('e[p[1]]=expr(p[2],e)','e[p[1]]={value:expr(p[2],e)}').replace('var e=[x,0,0]','var e=[{value:x},{value:0},{value:0}]').replace('return e[2]','return e[2].value');
add('replace-boxes',boxes,'only box each value and replace its cell on assignment');
add('mutate-boxes',boxes.replace('e[p[1]]={value:expr(p[2],e)}','e[p[1]].value=expr(p[2],e)'),'relative to replace-boxes, mutate existing value cells instead');
add('no-identity-write',baseline.replace('e[1]=e[1];',''),'only remove the identity write exposing hidden mutable store',sumOracle,sumInputs,{budget:'10000',allowLimit:true});
function encode(n,mode,state={id:0}){
 const id=state.id++,t=n[0];let a=t===3?[3,n[1].map(x=>encode(x,mode,state))]:t===2||t===4?[t,encode(n[1],mode,state),encode(n[2],mode,state)]:t===1&&n.length===3?[t,n[1],encode(n[2],mode,state)]:[...n];
 if(mode==='padded17')while(a.length<17)a.push(0);
 if(mode==='numeric-id'||mode==='string-id'){while(a.length<3)a.push(null);a.push(mode==='string-id'?'node'+id:id);}
 if(mode==='record'){const r={tag:a[0],a:a[1]};if(a.length>2)r.b=a[2];return r;}return a;
}
for(const mode of ['numeric-id','string-id','padded17','record']){
 let source=baseline.replace(JSON.stringify(ast),JSON.stringify(encode(ast,mode)));
 if(mode==='record')source=source.replaceAll('p[0]','p.tag').replaceAll('p[1]','p.a').replaceAll('p[2]','p.b');
 add('ast-'+mode,source,'only AST encoding: '+mode);
}
const affineAst=['add',['mul',['var','x'],['lit',2]],['lit',3]];
const affineExpr=`function expr(p,e){var t=p[0];if(t==='lit')return p[1];if(t==='var')return lookup(e,p[1]);if(t==='mul')return expr(p[1],e)*expr(p[2],e);return expr(p[1],e)+expr(p[2],e);}`;
const lookup=`function lookup(e,key){while(e){if(e.name===key)return e.value;e=e.parent;}return undefined;}`;
const affine=`function entry(x){${affineExpr}${lookup}return expr(${JSON.stringify(affineAst)},{name:'x',value:x,parent:null});}\n`;
const affineInputs=[...sumInputs,Infinity,-Infinity];
add('truthy-chain',affine,'baseline affine AST with linked name lookup',x=>x*2+3,affineInputs);
add('null-chain',affine.replace('while(e)','while(e!==null)'),'only lookup traversal guard: truthiness to explicit null comparison',x=>x*2+3,affineInputs);
add('direct-binding',affine.replace('lookup(e,p[1])','e[p[1]]').replace("{name:'x',value:x,parent:null}",'{x:x}'),'direct static property addressing instead of linked lookup',x=>x*2+3,affineInputs);
const rows=[];
for(const c of cases){
 const sourceFile=path.join(outDir,c.name+'.source.js');fs.writeFileSync(sourceFile,c.source);
 const start=performance.now();const result=spawnSync(bin,['--js','--entry','entry',sourceFile],{encoding:'utf8',timeout:5000,maxBuffer:8*1024*1024,env:{...process.env,...flags,SPEC_WEIGHT_BUDGET:c.budget||flags.SPEC_WEIGHT_BUDGET}});
 const row={name:c.name,change:c.change,sourceBytes:Buffer.byteLength(c.source),sourceSha256:sha256(c.source),compileMs:performance.now()-start,budget:c.budget||flags.SPEC_WEIGHT_BUDGET};
 if(result.status!==0){
  assert.ok(c.allowLimit,`${c.name}: ${result.error||result.stderr}`);
  assert.ok(result.error?.code==='ETIMEDOUT'||/specialization budget exceeded/.test(result.stderr),`${c.name}: unexpected error ${result.stderr}`);
  row.status='LIMIT';row.reason=result.error?.code==='ETIMEDOUT'?'5-second timeout':'specialization budget exceeded';
  fs.writeFileSync(path.join(outDir,c.name+'.stderr.txt'),result.stderr||String(result.error));
 }else{
  const residual=result.stdout.replace(/^---.*\n/,'');fs.writeFileSync(path.join(outDir,c.name+'.residual.js'),residual);
  const reference=vm.runInNewContext(c.source+'\nentry;',{},{timeout:1000}),compiled=vm.runInNewContext(residual+'\nentry;',{},{timeout:1000});
  for(const input of c.inputs){assert.ok(Object.is(reference(input),c.oracle(input)),c.name+': interpreter mismatch '+String(input));assert.ok(Object.is(compiled(input),c.oracle(input)),c.name+': residual mismatch '+String(input));}
  row.status='PASS';row.residualBytes=Buffer.byteLength(residual);row.residualSha256=sha256(residual);row.inputChecks=c.inputs.length;row.comparisons=2*c.inputs.length;row.interpreterHelperCalls=(residual.match(/\b(?:stmt|expr|lookup)\s*\(/g)||[]).length;
 }
 rows.push(row);console.log(JSON.stringify(row));
}
const summary={gitHead:spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim(),binarySha256:sha256(fs.readFileSync(bin)),node:process.version,platform:process.platform,architecture:process.arch,flags,rows,comparisons:rows.reduce((n,r)=>n+(r.comparisons||0),0),limits:['Small synthetic fixed ASTs; no general speed claim.','Public script helpers have different visibility obligations than private helpers, even though these entrypoint observations agree.','The identity write is an internal staging aid; removing source complexity does not always improve specialization.','The two PE flags are held fixed across all variants; default configurations are not compared.']};
fs.writeFileSync(path.join(outDir,'metrics.json'),JSON.stringify(summary,null,2)+'\n');console.log('Artifacts: '+outDir);
