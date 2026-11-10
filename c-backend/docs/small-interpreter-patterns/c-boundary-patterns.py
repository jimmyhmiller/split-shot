#!/usr/bin/env python3
"""One-factor interpreter probes using the existing PE and strict numeric C target."""
import hashlib, json, os, pathlib, re, subprocess, tempfile, time
ROOT = pathlib.Path(os.environ.get('PE_ROOT', pathlib.Path(__file__).resolve().parents[2]))
OUT = pathlib.Path(__file__).with_name('c-boundary-results')
OUT.mkdir(exist_ok=True)
FLAGS = dict(SPEC_WEIGHT_BUDGET='10000', PE_NO_SHARED_CONTEXTS='1', PE_CONTEXT_POINTS='1')
ENV = dict(os.environ, **FLAGS)
PE, C = ROOT.parent/'target/release/js-frontend', ROOT.parent/'target/release/numeric-to-c'
def sha(value): return hashlib.sha256(value).hexdigest()
def run(argv, **kwargs): return subprocess.run(list(map(str, argv)), capture_output=True, text=True, timeout=20, **kwargs)
static = '''function entry(input) {
 const ast=["add",["mul",["var","x"],["var","scale"]],["var","offset"]];
 SETUP
 function evaluate(node){
  if(node[0]==="var")return lookup(node[1]);
  if(node[0]==="add")return evaluate(node[1])+evaluate(node[2]);
  if(node[0]==="mul")return evaluate(node[1])*evaluate(node[2]);
  return 0;
 }
 return evaluate(ast);
}
'''
dynamic = '''function entry(input) {
 const ast=["add",["get",["mod",["input"],["lit",3]]],["lit",7]];
 SETUP
 function evaluate(node){
  if(node[0]==="lit")return node[1];
  if(node[0]==="input")return input;
  if(node[0]==="get")return lookup(evaluate(node[1]));
  if(node[0]==="mod")return evaluate(node[1])%evaluate(node[2]);
  if(node[0]==="add")return evaluate(node[1])+evaluate(node[2]);
  return 0;
 }
 return evaluate(ast);
}
'''
setups = {
 'linear': ('const bindings=[["offset",3],["scale",2],["x",input]]; function lookup(key){for(var i=0;i<bindings.length;i++)if(bindings[i][0]===key)return bindings[i][1];return 0;}',
            'const bindings=[[0,input],[1,2],[2,3]]; function lookup(key){for(var i=0;i<bindings.length;i++)if(bindings[i][0]===key)return bindings[i][1];return 0;}'),
 'object': ('const bindings={offset:3,scale:2,x:input}; function lookup(key){return bindings[key];}',
            'const bindings={0:input,1:2,2:3}; function lookup(key){var v=bindings[key];return v===undefined?0:v;}'),
 'map': ('const bindings=new Map([["offset",3],["scale",2],["x",input]]); function lookup(key){return bindings.get(key);}',
         'const bindings=new Map([[0,input],[1,2],[2,3]]); function lookup(key){var v=bindings.get(key);return v===undefined?0:v;}'),
 'visible-hash': ('const buckets=[[["x",input]],[],[],[["offset",3],["scale",2]]]; function lookup(key){var b=buckets[key.charCodeAt(0)&3];for(var i=0;i<b.length;i++)if(b[i][0]===key)return b[i][1];return 0;}',
                  'const buckets=[[[0,input]],[[1,2]],[[2,3]],[]]; function lookup(key){var slot=((key%4)+4)%4;if(slot!==Math.floor(slot))return 0;var b=buckets[slot];for(var i=0;i<b.length;i++)if(b[i][0]===key)return b[i][1];return 0;}')}
cases = [(family+'-'+name, family, template.replace('SETUP', setup[index])) for family,template,index in [('static',static,0),('dynamic',dynamic,1)] for name,setup in setups.items()]
primitive = '''function entry(input){
 const ast=["mul",["input"],["sqrt",["lit",4]]];
 function evaluate(node){
  if(node[0]==="input")return input;
  if(node[0]==="lit")return node[1];
  if(node[0]==="sqrt")return SQRT(evaluate(node[1]));
  if(node[0]==="mul")return evaluate(node[1])*evaluate(node[2]);
  return 0;
 }
 return evaluate(ast);
}
'''
cases += [('primitive-'+name,'primitive',primitive.replace('SQRT',call)) for name,call in [('visible','Math.sqrt'),('opaque','f64Sqrt')]]
call = '''function entry(n){
 const code=["add",["arg",0],["arg",0]];
 function evaluate(node,values){
  if(node[0]==="arg")return values[node[1]];
  if(node[0]==="add")return evaluate(node[1],values)+evaluate(node[2],values);
  return 0;
 }
 FRAME
 var i=0,sum=0;
 while(i<n){frame.args[0]=i;sum+=evaluate(CODE,frame.args);i++;}
 return sum;
}
'''
cases += [('call-'+name,'call',call.replace('FRAME',frame).replace('CODE',code)) for name,frame,code in [('mixed','const frame={code:code,args:[0]};','frame.code'),('split','const frame={args:[0]};','code')]]
# Same sum AST/interpreter as the representation suite. Only numeric slot
# allocation/initialization changes; interpreter dispatch is unchanged.
sum_source = pathlib.Path(__file__).with_name('representation-results').joinpath('flat-array.source.js').read_text()
cases += [('sum-array','sum',sum_source),('sum-buffer','sum',sum_source.replace('var e=[x,0,0];','var e=allocF64(3);e[0]=x;e[1]=0;e[2]=0;'))]
cache = """function entry(input){
 input=+input;
 const ast=["add",["var","x"],["var","x"]];
 const bindings=[["x",input]];
 CACHE
 function find(key){for(var i=0;i<bindings.length;i++)if(bindings[i][0]===key)return bindings[i][1];return 0;}
 LOOKUP
 function evaluate(node){if(node[0]==="var")return lookup(node[1]);return evaluate(node[1])+evaluate(node[2]);}
 return evaluate(ast);
}
"""
cache_variants = {
 'direct':('', 'function lookup(key){return find(key);}'),
 'static-key':('const cache=new Map();','function lookup(key){if(cache.has(key))return cache.get(key);var value=find(key);cache.set(key,value);return value;}'),
 'runtime-key':('const cache=new Map();','function lookup(key){var cacheKey=key+"@"+input;if(cache.has(cacheKey))return cache.get(cacheKey);var value=find(key);cache.set(cacheKey,value);return value;}')}
cases += [('cache-'+name,'cache',cache.replace('CACHE',setup).replace('LOOKUP',lookup)) for name,(setup,lookup) in cache_variants.items()]
rows=[]
with tempfile.TemporaryDirectory(prefix='pe-small-c-') as tmp:
 for name,family,source in cases:
  source='\n'.join(line.rstrip() for line in source.splitlines())+'\n'
  src=OUT/(name+'.source.js');src.write_text(source)
  started=time.perf_counter();p=run([PE,'--js','--entry','entry',src],env=ENV)
  assert p.returncode==0,(name,p.stderr)
  residual=p.stdout.split('\n',1)[1];js=OUT/(name+'.residual.js');js.write_text(residual)
  row=dict(name=name,family=family,source_bytes=len(source.encode()),source_sha256=sha(source.encode()),residual_bytes=len(residual.encode()),residual_sha256=sha(residual.encode()),compile_process_ms=(time.perf_counter()-started)*1000,residual_function_declarations=len(re.findall(r'\bfunction\s',residual)))
  checks=run(['node',pathlib.Path(__file__).with_name('check-c-boundary.js'),src,js,family])
  assert checks.returncode==0,(name,checks.stderr)
  row['js_checks']=json.loads(checks.stdout)
  # Entry-name normalization only. No expressions, ASTs or algorithms change.
  normalized=re.sub(r'\bfunction entry\(', 'function main(', residual)
  cinput=OUT/(name+'.c-input.js');cinput.write_text(normalized)
  native=run([C,cinput]);row['c_status']='accepted' if native.returncode==0 else 'refused';row['c_reason']=native.stderr.strip()
  if native.returncode==0:
   cp=OUT/(name+'.generated.c');cp.write_text(native.stdout);row['c_bytes']=len(native.stdout.encode());row['c_sha256']=sha(native.stdout.encode())
   exe=pathlib.Path(tmp)/name
   cc=run(['clang','-std=c11','-O2','-ffp-contract=off','-DNUMERIC_STANDALONE',cp,'-lm','-o',exe]);assert cc.returncode==0,(name,cc.stderr)
   for check in row['js_checks']['values']:
    got=run([exe,check['input']]);assert got.returncode==0,(name,got.stderr)
    import math
    actual=float(got.stdout);expected=check['value'];wanted=float(expected)
    assert (math.isnan(actual) and math.isnan(wanted)) or (actual==wanted and (actual!=0 or math.copysign(1,actual)==math.copysign(1,wanted))),(name,check,got.stdout)
   row['c_input_checks']=len(row['js_checks']['values'])
   assembly=OUT/(name+'.s');cc=run(['clang','-std=c11','-O2','-ffp-contract=off','-S',cp,'-o',assembly]);assert cc.returncode==0
   text=assembly.read_text();body=text.split('_numeric_main:',1)[1].split('.cfi_endproc',1)[0]
   body='\n'.join(x.strip() for x in body.splitlines() if x.strip() and not x.lstrip().startswith((';','.')))
   row['native_body_sha256']=sha(body.encode());row['native_body']=body
  rows.append(row);print(json.dumps({k:v for k,v in row.items() if k not in ['js_checks','native_body']},sort_keys=True))
summary=dict(compiler_version=run(['clang','--version']).stdout.strip(),node_version=run(['node','--version']).stdout.strip(),flags=FLAGS,frontend_sha256=sha(PE.read_bytes()),c_backend_sha256=sha(C.read_bytes()),git_head=run(['git','rev-parse','HEAD'],cwd=ROOT).stdout.strip(),rows=rows,notes=['Actual interpreters execute shared static AST data. There is no handwritten residual lowering.','Input is dynamic during specialization. Fresh binding collections are constructed per invocation.','C input changes only the entry declaration name from entry to main. Refused C is not a failed JS correctness comparison.','Compile process milliseconds include CLI startup; comparisons use the same invocation/profile.','No C timing claim: optimized native bodies are compared exactly; affine kernels are below useful isolated timing scale.'])
by_name={row['name']:row for row in rows}
assert len({by_name['static-'+name]['residual_sha256'] for name in setups})==1
assert len({by_name['static-'+name]['c_sha256'] for name in setups})==1
assert by_name['primitive-visible']['native_body_sha256']==by_name['primitive-opaque']['native_body_sha256']
assert by_name['cache-direct']['residual_sha256']==by_name['cache-static-key']['residual_sha256']
assert not re.search(r'\b(?:bl|blr|callq?)\b',by_name['sum-buffer']['native_body'])
(OUT/'metrics.json').write_text(json.dumps(summary,indent=2)+'\n')
