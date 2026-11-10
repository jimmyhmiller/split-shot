#!/usr/bin/env python3
"""Compare three preserved native stages in one execution-only measurement window.

All three are compiled before timing with identical flags and an identical driver.
The baseline is read from Git, never rebuilt using the newer compiler. The flat-
frame and candidate C snapshots are read without changing their source. No guest
algorithm is rewritten. Every timing round runs each stage in a separate process;
stage order rotates between rounds to reduce fixed order bias.
"""
import argparse
import hashlib
import json
import os
import pathlib
import platform
import shlex
import signal
import statistics
import subprocess
import tempfile
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BASELINE = 'fa283978ae28b979f17039fd049090dae0d8f0a1'
FLAT_COMMIT = '4e85986fa'
COUNTS = [1, 2, 10, 100, 1000, 2500, 10000, 37, 999, 4093, 12345]
INVALID = [0, -1, 1.5, 'NaN', 'Infinity', '-Infinity', 1000001]
FLAGS = ['-std=c11', '-O2', '-ffp-contract=off']
commands = []

def digest(data): return hashlib.sha256(data).hexdigest()
def stamp(): return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
def run(args, timeout=120, allow_failure=False, **kw):
    args = list(map(str,args))
    commands.append(shlex.join(args))
    p = subprocess.Popen(args, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                         start_new_session=True, **kw)
    try:
        stdout, stderr = p.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        os.killpg(p.pid, signal.SIGKILL)
        stdout, stderr = p.communicate()
        raise subprocess.TimeoutExpired(args, timeout, output=stdout, stderr=stderr)
    if p.returncode and not allow_failure:
        raise RuntimeError(f'exit {p.returncode}: {shlex.join(args)}\n{stderr[-6000:]}')
    return subprocess.CompletedProcess(args,p.returncode,stdout,stderr)

def error_record(error):
    if isinstance(error,subprocess.TimeoutExpired):
        return {'status':'timeout','command':shlex.join(map(str,error.cmd)),'timeout_seconds':error.timeout}
    return {'status':'failed','error':str(error)}

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--baseline-commit',default=BASELINE)
    ap.add_argument('--flat-source',type=pathlib.Path,default=HERE/'frame-promotion.generated.c')
    ap.add_argument('--candidate-source',type=pathlib.Path,default=HERE/'runtime-count.generated.c')
    ap.add_argument('--output',type=pathlib.Path,default=HERE/'stage-comparison.json')
    ap.add_argument('--counts',type=int,nargs='+',default=[1000,10000])
    ap.add_argument('--rounds',type=int,default=3)
    ap.add_argument('--samples',type=int,default=7)
    ap.add_argument('--warmup',type=int,default=5)
    ap.add_argument('--timeout',type=int,default=120)
    ap.add_argument('--compile-timeout',type=int,default=300)
    a = ap.parse_args()
    assert a.rounds > 0 and a.samples > 0 and a.warmup >= 0
    assert all(n in COUNTS for n in a.counts), 'timing counts need independent oracle coverage'
    driver = HERE/'object-timed-driver.c'
    watched = [driver,a.flat_source,a.candidate_source,HERE/'runtime-count.input.js',
               HERE/'upstream-richards.js',HERE/'oracles.js']
    before = {str(p):digest(p.read_bytes()) for p in watched}
    prefix = run(['git','-C',ROOT,'rev-parse','--show-prefix']).stdout.strip()
    baseline_commit = run(['git','-C',ROOT,'rev-parse',a.baseline_commit]).stdout.strip()
    baseline_path = prefix+'docs/object-projection/benchmarks/richards/runtime-count.generated.c'
    baseline_source = run(['git','-C',ROOT,'show',baseline_commit+':'+baseline_path]).stdout.encode()
    source_bytes = {'generic_baseline':baseline_source,
                    'frame_promotion':a.flat_source.read_bytes(),
                    'known_callee':a.candidate_source.read_bytes()}
    # A forgotten regeneration must not silently benchmark the baseline twice.
    assert len({digest(data) for data in source_bytes.values()}) == 3, 'stage source snapshots are not distinct; regenerate the final candidate first'
    flat_commit = run(['git','-C',ROOT,'rev-parse',FLAT_COMMIT]).stdout.strip()
    flat_saved = run(['git','-C',ROOT,'show',flat_commit+':'+prefix+'docs/object-projection/benchmarks/richards/frame-promotion.generated.c'],allow_failure=True)
    flat_matches_commit = flat_saved.returncode==0 and flat_saved.stdout.encode()==source_bytes['frame_promotion']
    result = {
        'run_started_utc':stamp(),
        'baseline_commit':baseline_commit,
        'executed_comparison_script_sha256':digest(pathlib.Path(__file__).read_bytes()),
        'versions':{'clang':run(['clang','--version']).stdout,'platform':platform.platform(),'machine':platform.machine()},
        'driver_sha256':before[str(driver)],
        'source_sha256':before[str(HERE/'runtime-count.input.js')],
        'methodology':{
            'all_variants_compiled_before_any_timing':True,
            'same_driver_for_all_variants':True,
            'flags':FLAGS,
            'rounds':a.rounds,'samples_per_process':a.samples,'warmup_calls_per_process':a.warmup,
            'one_expected_result_call_and_one_batch_pilot_outside_timing':True,
            'stage_order':'cyclic rotation between paired rounds',
            'timed_region':'fresh context allocation, guest entry, returned queue/hold consumption and validation, all context destruction',
            'excluded':'process startup, source parsing/projection and native compilation',
            'algorithm_edits':False,
            'inputs':'COUNT passed as runtime argv, not a compile-time macro or generated constant',
            'ratio_of_medians':'median process time for earlier stage divided by median process time for later stage',
            'paired_round_ratio':'earlier-stage process median divided by later-stage process median in the same round',
            'same_window_only':'Do not substitute earlier standalone timings for any stage in this report.'
        },
        'stages':{},'correctness':{},'invalid_inputs':{},'timings':{},'round_order':{},'comparisons':{}
    }
    for name,data in source_bytes.items():
        result['stages'][name]={'sha256':digest(data),'bytes':len(data)}
    result['stages']['generic_baseline'].update({'source':'git show '+baseline_commit+':'+baseline_path,'commit':baseline_commit})
    result['stages']['frame_promotion'].update({'source':str(a.flat_source),'source_implementation_commit':flat_commit,
        'snapshot_matches_saved_commit':flat_matches_commit,
        'snapshot_commit_check':'artifact matches commit' if flat_matches_commit else
            ('artifact absent from implementation commit' if flat_saved.returncode else 'saved artifact differs from commit')})
    audit_path = HERE/'frame-promotion-audit.json'
    if audit_path.is_file():
        audit = json.loads(audit_path.read_text())
        audited_sha = audit.get('candidate',{}).get('source_sha256')
        result['stages']['frame_promotion']['saved_artifact_audit'] = {
            'report':str(audit_path), 'report_sha256':digest(audit_path.read_bytes()),
            'audited_source_sha256':audited_sha,
            'source_matches_audit':audited_sha==digest(source_bytes['frame_promotion'])}
    current_commit = run(['git','-C',ROOT,'rev-parse','HEAD']).stdout.strip()
    stored_flat = run(['git','-C',ROOT,'show',current_commit+':'+prefix+'docs/object-projection/benchmarks/richards/frame-promotion.generated.c'],allow_failure=True)
    if stored_flat.returncode==0 and stored_flat.stdout.encode()==source_bytes['frame_promotion']:
        result['stages']['frame_promotion']['verified_artifact_storage_commit'] = current_commit
    result['stages']['known_callee'].update({'source':str(a.candidate_source),'worktree_commit':current_commit})
    try:
        oracle = json.loads(run(['node',HERE/'oracles.js',json.dumps(COUNTS)],timeout=a.timeout).stdout)
        expected = {row['input']:row['value'] for row in oracle['runtimeCount']}
        result['oracles'] = [{'input':n,'value':expected[n]} for n in COUNTS]
        with tempfile.TemporaryDirectory(prefix='richards-stage-comparison-',dir='/tmp') as directory:
            temp = pathlib.Path(directory)
            driver_copy = temp/'object-timed-driver.c'
            driver_copy.write_bytes(driver.read_bytes())
            assert digest(driver_copy.read_bytes()) == result['driver_sha256']
            executables = {}
            # Finish all compilers before launching any performance sample.
            for name,data in source_bytes.items():
                c = temp/(name+'.generated.c'); c.write_bytes(data)
                tu = temp/(name+'.tu.c')
                tu.write_text('#define _POSIX_C_SOURCE 200809L\n#include '+json.dumps(str(c))+'\n#include '+json.dumps(str(driver_copy))+'\n')
                exe = temp/name
                compile_result = run(['clang',*FLAGS,tu,'-lm','-o',exe],timeout=a.compile_timeout)
                result['stages'][name]['compiler_stderr'] = compile_result.stderr
                result['stages'][name]['compiled'] = True
                executables[name] = exe
            for name,exe in executables.items():
                rows=[]
                for n in COUNTS:
                    row=json.loads(run([exe,n,0,0],timeout=a.timeout).stdout)
                    assert row['value']==expected[n], name+' oracle mismatch at '+str(n)
                    rows.append(row)
                result['correctness'][name] = rows
                rejected=[]
                for n in INVALID:
                    p=run([exe,n,0,0],timeout=a.timeout,allow_failure=True)
                    rejected.append({'input':n,'exit_code':p.returncode,'stderr':p.stderr})
                    assert p.returncode==3 and 'COUNT must be an integer from 1 to 1000000' in p.stderr, name+' wrong invalid-input behavior at '+str(n)
                result['invalid_inputs'][name]=rejected
            result['timing_window_started_utc']=stamp()
            names=list(executables)
            for n in a.counts:
                timing={name:{'rounds':[]} for name in names}
                result['round_order'][str(n)]=[]
                for round_index in range(a.rounds):
                    offset=round_index%len(names)
                    order=names[offset:]+names[:offset]
                    result['round_order'][str(n)].append(order)
                    for name in order:
                        row=json.loads(run([executables[name],n,a.samples,a.warmup],timeout=a.timeout).stdout)
                        assert row['value']==expected[n], name+' timed oracle mismatch'
                        assert len(row['samples_seconds'])==a.samples
                        row['median_seconds']=statistics.median(row['samples_seconds'])
                        row['round_index']=round_index
                        timing[name]['rounds'].append(row)
                for stage in timing.values():
                    stage['median_seconds']=statistics.median(row['median_seconds'] for row in stage['rounds'])
                result['timings'][str(n)]=timing
                comparisons={}
                for old,new in [('generic_baseline','frame_promotion'),('frame_promotion','known_callee'),('generic_baseline','known_callee')]:
                    pairs=[x['median_seconds']/y['median_seconds'] for x,y in zip(timing[old]['rounds'],timing[new]['rounds'])]
                    comparisons[old+'_over_'+new]={'ratio_of_medians':timing[old]['median_seconds']/timing[new]['median_seconds'],
                        'paired_round_ratios':pairs,'median_paired_round_ratio':statistics.median(pairs)}
                result['comparisons'][str(n)]=comparisons
            result['timing_window_finished_utc']=stamp()
            result['all_stage_oracles_equal']=True
            result['status']='passed'
    except Exception as error:
        result['failure']=error_record(error)
        result['status']='failed'
        raise
    finally:
        result['commands']=commands
        result['input_hashes_before']=before
        result['input_hashes_after']={str(p):digest(p.read_bytes()) for p in watched}
        result['inputs_unchanged_during_run']=before==result['input_hashes_after']
        if not result['inputs_unchanged_during_run']:
            result['status']='invalidated: source or driver changed during run'
        a.output.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'status':result['status'],'inputs_unchanged':result['inputs_unchanged_during_run'],
        'median_seconds':{n:{name:rows['median_seconds'] for name,rows in stage.items()} for n,stage in result['timings'].items()},
        'comparisons':result['comparisons']},indent=2))
    return result

if __name__=='__main__':
    main()
