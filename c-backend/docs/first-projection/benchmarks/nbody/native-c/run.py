#!/usr/bin/env python3
"""Read-only use of existing backend; output artifacts only beside this script."""
import ast, hashlib, json, os, pathlib, re, shlex, statistics, subprocess, tempfile, time
HERE=pathlib.Path(__file__).resolve().parent
B=pathlib.Path('/Users/jimmyhmiller/Documents/Code/PlayGround/claude-experiments/partial-new/.worktrees/residual-language/claude-experiments/partial-new')
R=B/'runtime/c'; INPUTS=[0,1,2,10,100,1000,2500,10000]
commands=[]
def run(args, **kw):
    args=list(map(str,args)); commands.append(shlex.join(args))
    p=subprocess.run(args, text=True, capture_output=True, timeout=120, **kw)
    if p.returncode: raise RuntimeError(f'{shlex.join(args)}\n{p.stderr}')
    return p

def literal(path,name):
    for n in ast.parse(path.read_text()).body:
        if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id==name for t in n.targets): return ast.literal_eval(n.value)

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
files=[B/'target/debug/js-frontend',B/'js-frontend/src/c_backend.rs',HERE.parent/'input.js',HERE.parent/'residual.js']+sorted(p for p in R.rglob('*') if p.is_file())
hashes={str(p):digest(p) for p in files}
results={'backend_commit':run(['git','-C',B,'rev-parse','HEAD']).stdout.strip(),'backend_status_before':run(['git','-C',B,'status','--porcelain']).stdout,'sha256_before':hashes,'versions':{'clang':run(['clang','--version']).stdout,'node':run(['node','--version']).stdout}}
c=run([B/'target/debug/js-frontend','--c',HERE.parent/'residual.js']).stdout
(HERE/'generated.c').write_text(c)
results['generated_c_bytes']=len(c.encode());results['generated_c_sha256']=digest(HERE/'generated.c')
results['generated_function_definitions']=re.findall(r'^pe_value (\w+)\([^\n]*\)\{',c,re.M)
results['program_function_count']=re.search(r'pe_program_function_count = (\d+)',c).group(1)
results['runtime_call_sites']={s:len(re.findall(r'\b'+s+r'\s*\(',c)) for s in sorted(set(re.findall(r'\b(pe_\w+)\s*\(',c)))}
node=literal(B/'tools/c-target.py','NODE'); (HERE/'reference.cjs').write_text(node)
expected=run(['node','-e',node,HERE.parent/'input.js',json.dumps(INPUTS)]).stdout.splitlines()
with tempfile.TemporaryDirectory(prefix='nbody-native-c-') as tmp:
    tmp=pathlib.Path(tmp)
    common=['clang','-std=c11','-O2','-ffp-contract=off','-I',R,'-I',R/'vendor',HERE/'generated.c',R/'partial_runtime.c',R/'number_string.c',R/'vendor/ryu/d2s.c']
    run(common+[R/'driver.c','-lm','-o',tmp/'run'])
    actual=run([tmp/'run']+INPUTS).stdout.splitlines()
    results['comparisons']=[{'input':n,'node':e,'native_c':a,'exact_tagged_match':e==a} for n,e,a in zip(INPUTS,expected,actual)]
    results['all_exact_matches']=len(actual)==len(INPUTS) and actual==expected
    print(json.dumps({'direct_compile':True,'bytes':len(c.encode()),'all_exact_matches':results['all_exact_matches'],'comparisons':results['comparisons']}),flush=True)
    san=common.copy(); san[san.index('-O2')]='-O1';san[1:1]=['-g','-fsanitize=address,undefined','-fno-sanitize-recover=all']
    run(san+[R/'driver.c','-lm','-o',tmp/'san'])
    checked=[0,1,100,10000]; checked_result=run([tmp/'san']+checked)
    results['sanitizers']={'flags':['address','undefined'],'inputs':checked,'stderr':checked_result.stderr,'stdout':checked_result.stdout,'exact_matches':checked_result.stdout.splitlines()==[expected[INPUTS.index(i)] for i in checked]}
    driver=literal(B/'tools/c-performance.py','C');(HERE/'timed-driver.c').write_text(driver)
    run(common+[HERE/'timed-driver.c','-lm','-o',tmp/'timed'])
    timing=run([tmp/'timed',10000,7]); samples=[float(l.split()[0]) for l in timing.stdout.splitlines()]
    results['timing']={'input':10000,'samples_seconds':samples,'median_seconds':statistics.median(samples),'warmup_calls':3,'fresh_context_per_call':True,'includes_context_creation':False,'stdout':timing.stdout,'stderr':timing.stderr}
results['sha256_after']={str(p):digest(p) for p in files}; results['read_only_inputs_unchanged']=results['sha256_before']==results['sha256_after']
results['backend_status_after']=run(['git','-C',B,'status','--porcelain']).stdout
results['commands']=commands
(HERE/'results.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({'sanitizers':results['sanitizers'],'timing':results['timing'],'unchanged':results['read_only_inputs_unchanged']}))
