#!/usr/bin/env python3
"""Exact guest -> numeric interpreter projection -> strict numeric C, never guest rewriting.
All subprocesses have bounds. Binaries live only in a temporary directory.
Use --baseline-only to prepare the read-only direct-C baseline while projection is built.
"""
import argparse, hashlib, json, os, pathlib, re, shlex, statistics, subprocess, tempfile, time
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
OLD = ROOT/'docs/first-projection/benchmarks/nbody'
BACKEND = pathlib.Path('/Users/jimmyhmiller/Documents/Code/PlayGround/claude-experiments/partial-new/.worktrees/residual-language/claude-experiments/partial-new')
R = BACKEND/'runtime/c'
INPUTS = [0,1,2,10,100,1000,2500,10000,100000]
commands=[]
def run(args, timeout=60, **kw):
    args=list(map(str,args)); commands.append(shlex.join(args))
    p=subprocess.run(args,text=True,capture_output=True,timeout=timeout,**kw)
    if p.returncode: raise RuntimeError(f'{shlex.join(args)}\n{p.stderr[-6000:]}')
    return p

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def native(exe,n,samples=0):
    p=run([exe,n,samples]); lines=[l.split() for l in p.stdout.splitlines()]
    times=[float(l[0]) for l in lines]
    assert len(lines)==(samples or 1)
    assert len({l[1] for l in lines})==1
    return {'input':n,'bits':lines[0][1],'samples_seconds':times,'median_seconds':statistics.median(times),'warmup_calls':5 if samples else 0,'stderr':p.stderr}
def js(file,mode,inputs): return json.loads(run(['node',HERE/'js-worker.js',file,mode,json.dumps(inputs)]).stdout)
def rounds(fn):
    runs=[fn() for _ in range(3)]
    return {'independent_process_rounds':3,'rounds':runs,'median_seconds':statistics.median(x['median_seconds'] for x in runs),'bits':runs[0]['bits']}
def save(data,name='results.json'): (HERE/name).write_text(json.dumps(data,indent=2)+'\n')
def compile_direct(tmp):
    c=run([BACKEND/'target/debug/js-frontend','--c',HERE/'input.js']).stdout
    (HERE/'direct-generated.c').write_text(c)
    common=['clang','-std=c11','-O2','-ffp-contract=off','-I',R,'-I',R/'vendor',HERE/'direct-generated.c',R/'partial_runtime.c',R/'number_string.c',R/'vendor/ryu/d2s.c']
    run(common+[HERE/'direct-timed-driver.c','-lm','-o',tmp/'direct'])
    return tmp/'direct'
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--baseline-only',action='store_true'); a=ap.parse_args()
    assert (HERE/'input.js').read_bytes()==(OLD/'input.js').read_bytes()
    watched=[BACKEND/'target/debug/js-frontend',BACKEND/'js-frontend/src/c_backend.rs',OLD/'input.js']+[p for p in sorted(R.rglob('*')) if p.is_file()]
    before={str(p):digest(p) for p in watched}
    result={'inputs':INPUTS,'source_sha256':digest(HERE/'input.js'),'source_original':str(OLD/'input.js'),'baseline_backend':str(BACKEND),'baseline_commit':run(['git','-C',BACKEND,'rev-parse','HEAD']).stdout.strip(),'versions':{'node':run(['node','--version']).stdout.strip(),'clang':run(['clang','--version']).stdout},'correctness':{},'timings':{},'methodology':{'independent_timing_rounds':3,'samples_per_round':7,'warmup_calls_per_round':5,'timed_region':'execution only, excluding process startup and source compilation','numeric_c_allocations':'all numeric_main allocations and frees included','direct_c_context':'context creation/free excluded, guest execution allocations included','flags':['-O2','-ffp-contract=off'],'timeout_seconds_per_process':60,'source_algorithm_edits':False}}
    try:
        with tempfile.TemporaryDirectory(prefix='numeric-nbody-') as d:
            tmp=pathlib.Path(d); direct=compile_direct(tmp)
            reference=js(HERE/'input.js','check',INPUTS); result['correctness']['original_js']=reference
            result['correctness']['direct_c']=[{'input':n,'bits':native(direct,n)['bits']} for n in INPUTS]
            assert result['correctness']['direct_c']==reference
            for n in [10000,100000]:
                result['timings'][str(n)]={'original_js':rounds(lambda:js(HERE/'input.js','time',n)),'direct_c':rounds(lambda:native(direct,n,7))}
            if a.baseline_only: return result
            project=ROOT.parent/'target/release/numeric-project'; emit=ROOT.parent/'target/release/numeric-to-c'
            result['numeric_pipeline_sha256']={str(p):digest(p) for p in [project,emit,ROOT/'docs/numeric-projection/interpreter.js']}
            result['projector_environment']={k:os.environ.get(k,v) for k,v in {'PE_CONTEXT_POINTS':'1','PE_NO_SHARED_CONTEXTS':'1','SPEC_WEIGHT_BUDGET':'150000000'}.items()}
            p=run([project,'--harness',HERE/'input.js']); (HERE/'interpreter-harness.js').write_text(p.stdout)
            p=run([project,HERE/'input.js'],timeout=300); (HERE/'residual.js').write_text(p.stdout); (HERE/'projection.log').write_text(p.stderr)
            residual=p.stdout
            # Numeric-to-C additionally rejects every construct outside the typed subset.
            forbidden=r'\b(?:nodes|functions|lists|constants|expression|execute|invoke|frame|pushFrame)\b|\bnew\s|\b(?:let|var|const)\s+\w+\s*=\s*[\[{]'
            assert not re.search(forbidden,residual), 'interpreter dispatch/static tables/ordinary arrays survived projection'
            p=run([emit,HERE/'residual.js']); (HERE/'generated.c').write_text(p.stdout)
            c=p.stdout
            assert not re.search(r'partial_runtime|\bpe_value\b|\bpe_dispatch\b|\bpe_call\b',c)
            result['structure']={'residual_bytes':len(residual.encode()),'c_bytes':len(c.encode()),'residual_sha256':digest(HERE/'residual.js'),'c_sha256':digest(HERE/'generated.c'),'buffer_allocation_call_sites':len(re.findall(r'\bnumeric_alloc\s*\(',c))-1,'calloc_implementation_sites':len(re.findall(r'\bcalloc\s*\(',c)),'buffer_free_call_sites':len(re.findall(r'\bfree\s*\(',c)),'no_hotpath_memory_helpers':not bool(re.search(r'\b(?:loadF64|storeF64)\s*\(',c)),'no_runtime_pc_or_switch':not bool(re.search(r'\b(?:__pc|switch)\b',c)),'allocF64_call_sites':len(re.findall(r'\ballocF64\s*\(',residual)),'no_tagged_runtime':True,'no_interpreter_dispatch':True,'C_function_definitions':re.findall(r'^(?:static )?double (\w+)\(',c,re.M)}
            common=['clang','-std=c11','-O2','-ffp-contract=off',HERE/'generated.c',HERE/'numeric-driver.c','-lm']
            run(common+['-o',tmp/'numeric'])
            standalone=['clang','-std=c11','-O2','-ffp-contract=off','-DNUMERIC_STANDALONE',HERE/'generated.c','-lm','-o',tmp/'standalone']
            run(standalone)
            result['standalone_smoke']={'input':100000,'stdout':run([tmp/'standalone',100000]).stdout}
            for name,file in [('ordinary_numeric_interpreter','interpreter-harness.js'),('numeric_projected_js','residual.js')]:
                result['correctness'][name]=js(HERE/file,'check',INPUTS)
                assert result['correctness'][name]==reference, name+' bit mismatch'
            result['correctness']['numeric_c']=[{'input':n,'bits':native(tmp/'numeric',n)['bits']} for n in INPUTS]
            assert result['correctness']['numeric_c']==reference
            result['first_numeric_c_timing']=native(tmp/'numeric',100000,7)
            print(json.dumps({'first_numeric_c_timing':result['first_numeric_c_timing'],'baseline_100000':result['timings']['100000']}),flush=True)
            result['allocation_observations']=json.loads(run(['node',HERE/'observe-memory.js',HERE/'interpreter-harness.js',json.dumps(INPUTS)]).stdout)
            assert [{'input':x['input'],'bits':x['bits']} for x in result['allocation_observations']]==reference
            assert all(x['allocations']==3 for x in result['allocation_observations'])
            result['all_bitwise_equal']=True
            print(json.dumps({'correctness':'all five paths bitwise equal','structure':result['structure']}),flush=True)
            for n in [10000,100000]:
                for name,file in [('ordinary_numeric_interpreter','interpreter-harness.js'),('numeric_projected_js','residual.js')]:
                    try: result['timings'][str(n)][name]=rounds(lambda:js(HERE/file,'time',n))
                    except subprocess.TimeoutExpired: result['timings'][str(n)][name]={'timeout_seconds':60}
                result['timings'][str(n)]['numeric_c']=rounds(lambda:native(tmp/'numeric',n,7))
            san=common.copy(); san[san.index('-O2')]='-O1'; san[1:1]=['-g','-fsanitize=address,undefined','-fno-sanitize-recover=all']
            run(san+['-o',tmp/'numeric-san'])
            result['sanitizers']={'flags':['address','undefined'],'checks':[native(tmp/'numeric-san',n) for n in [0,1,100,10000,100000]]}
            assert all(x['bits']==reference[INPUTS.index(x['input'])]['bits'] for x in result['sanitizers']['checks'])
            return result
    finally:
        result['read_only_input_hashes_before']=before
        result['read_only_input_hashes_after']={str(p):digest(p) for p in watched}
        result['read_only_inputs_unchanged']=result['read_only_input_hashes_before']==result['read_only_input_hashes_after']
        result['commands']=commands
        save(result,'baseline-results.json' if a.baseline_only else 'results.json')
if __name__=='__main__':
    data=main(); print(json.dumps({'all_bitwise_equal':data.get('all_bitwise_equal'),'timings':data['timings'],'read_only_inputs_unchanged':data['read_only_inputs_unchanged']},indent=2))
