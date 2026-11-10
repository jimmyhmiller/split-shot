#!/usr/bin/env python3
"""Reproduce Richards source checks, interpreter projection, correctness and timings.

Use --baseline-only while the projection implementation is under development.
Run source preparation first only when intentionally regenerating pinned inputs.
Native binaries and direct-backend C translation units live in /tmp, never in
or under the read-only backend. Failed/unsupported paths remain in the report.
"""
import argparse
import hashlib
import json
import os
import pathlib
import platform
import re
import shlex
import signal
import statistics
import subprocess
import tempfile
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
DEFAULT_BACKEND = pathlib.Path('/Users/jimmyhmiller/Documents/Code/PlayGround/claude-experiments/partial-new/.worktrees/residual-language/claude-experiments/partial-new')
STANDARD = [1, 2, 10, 100, 1000, 2500, 10000]
UNSEEN = [37, 999, 4093, 12345]
COUNTS = STANDARD + UNSEEN
REPEATS = [0, 1, 2, 3]
INVALID = [0, -1, 1.5, 'NaN', 'Infinity', '-Infinity', 1000001]
commands = []

def run(args, timeout=120, **kw):
    args = list(map(str, args))
    commands.append(shlex.join(args))
    p = subprocess.Popen(args, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                         start_new_session=True, **kw)
    try:
        stdout, stderr = p.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        # Clang may have a child frontend. Bound the complete process group.
        os.killpg(p.pid, signal.SIGKILL)
        stdout, stderr = p.communicate()
        raise subprocess.TimeoutExpired(args, timeout, output=stdout, stderr=stderr)
    if p.returncode:
        raise RuntimeError(f'exit {p.returncode}: {shlex.join(args)}\n{stderr[-6000:]}')
    return subprocess.CompletedProcess(args, p.returncode, stdout, stderr)

def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def save(data, name): (HERE / name).write_text(json.dumps(data, indent=2) + '\n')
def js(file, family, mode, values, options):
    return json.loads(run(['node', HERE / 'js-worker.js', file, family, mode,
                           json.dumps(values), options.samples, options.warmup], timeout=options.timeout).stdout)
def native(exe, n, options, timed=False, sanitized=False):
    env = None
    if sanitized and platform.system() == 'Darwin':
        env = dict(os.environ)
        env['ASAN_OPTIONS'] = (env.get('ASAN_OPTIONS','') + ':detect_leaks=0').lstrip(':')
    data = json.loads(run([exe, n, options.samples if timed else 0,
                          options.warmup if timed else 0], timeout=options.timeout, env=env).stdout)
    if timed: data['median_seconds'] = statistics.median(data['samples_seconds'])
    return data

def rounds(fn, options):
    rows = [fn() for _ in range(options.rounds)]
    assert len({json.dumps(row['value']) for row in rows}) == 1
    return {'independent_process_rounds':options.rounds, 'rounds':rows,
            'median_seconds':statistics.median(r['median_seconds'] for r in rows), 'value':rows[0]['value']}

def error_record(exc):
    if isinstance(exc, subprocess.TimeoutExpired):
        return {'status':'timeout', 'timeout_seconds':exc.timeout, 'command':shlex.join(map(str,exc.cmd))}
    return {'status':'failed', 'error':str(exc)}

def compile_direct(source, temp, backend, options):
    compiler = backend / 'target/debug/js-frontend'
    if not compiler.is_file(): raise RuntimeError('read-only direct backend executable unavailable: ' + str(compiler))
    r = backend / 'runtime/c'
    c = temp / (source.stem + '.direct.c')
    c.write_text(run([compiler, '--c', source], timeout=options.compile_timeout).stdout)
    exe = temp / (source.stem + '.direct')
    run(['clang','-std=c11','-O2','-ffp-contract=off','-I',r,'-I',r/'vendor',c,
         r/'partial_runtime.c',r/'number_string.c',r/'vendor/ryu/d2s.c',
         HERE/'direct-timed-driver.c','-lm','-o',exe], timeout=options.compile_timeout)
    return exe, {'source_sha256':digest(c), 'source_bytes':c.stat().st_size,
                 'translation_unit_stored_only_in_temporary_directory':True}

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--baseline-only', action='store_true')
    ap.add_argument('--backend', type=pathlib.Path, default=DEFAULT_BACKEND)
    ap.add_argument('--samples', type=int, default=7)
    ap.add_argument('--warmup', type=int, default=5)
    ap.add_argument('--rounds', type=int, default=3)
    ap.add_argument('--timeout', type=int, default=120)
    ap.add_argument('--compile-timeout', type=int, default=300)
    ap.add_argument('--timing-counts', type=int, nargs='+', default=[1000,10000])
    ap.add_argument('--skip-direct', action='store_true')
    ap.add_argument('--skip-timings', action='store_true')
    options = ap.parse_args()
    assert options.samples > 0 and options.rounds > 0 and options.warmup >= 0
    provenance = json.loads((HERE/'provenance.json').read_text())
    for file in ['input.js','runtime-count.input.js','upstream-richards.js']:
        assert digest(HERE/file) == provenance['sha256'][file], file+' source provenance mismatch'
    r = options.backend/'runtime/c'
    watch = [options.backend/'target/debug/js-frontend', options.backend/'tools/c-target.py',
             options.backend/'corpus-c/upstream/richards.js',options.backend/'corpus-c/adapters/richards.js',
             options.backend/'js-frontend/src/c_backend.rs']
    if r.is_dir(): watch += sorted(p for p in r.rglob('*') if p.is_file())
    before = {str(p):digest(p) for p in watch if p.is_file()}
    pipeline_files = [ROOT.parent/'target/release/object-project',ROOT.parent/'target/release/object-to-c',
        ROOT/'docs/object-projection/interpreter.js',ROOT/'docs/object-projection/intrinsics.js',
        ROOT/'src/object_c_runtime.h',ROOT/'src/object_c.rs',ROOT/'src/object_projection.rs']
    pipeline_before = {str(p.relative_to(ROOT)):digest(p) for p in pipeline_files if p.is_file()}
    result = {'source_provenance':provenance, 'run_started_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
              'inherited_relevant_environment':{k:v for k,v in os.environ.items() if k.startswith(('PE_','SPEC_','ASAN_','UBSAN_'))},
              'versions':{'node':run(['node','--version']).stdout.strip(), 'clang':run(['clang','--version']).stdout,
                          'python':platform.python_version(), 'platform':platform.platform(), 'machine':platform.machine()},
              'pipeline_hashes_before':pipeline_before,
              'projector_environment':{k:os.environ.get(k,v) for k,v in {'SPEC_WEIGHT_BUDGET':'150000000','PE_NO_SHARED_CONTEXTS':'1','PE_CONTEXT_POINTS':'1'}.items()},
              'projection_worktree_commit':run(['git','-C',ROOT,'rev-parse','HEAD']).stdout.strip(),
              'methodology':{'rounds':options.rounds,'samples_per_round':options.samples,'warmup_calls_per_round':options.warmup,
                  'one_untimed_expected_call_per_round':True,'one_untimed_batch_pilot_call':True,
                  'sample_batch_target_seconds':0.03,'sample_batch_max':1000,
                  'timed_region':'repeated invocation, output consumption and mismatch checks; process startup, parsing, projection and native compilation excluded',
                  'object_c_lifetime':'fresh context, all allocation blocks and destruction included for every invocation; whole-entry lifetime arena, no GC',
                  'direct_c_lifetime':'fresh context construction and destruction included for every invocation; source/global initialization is part of pe_run',
                  'original_node_fresh_module':'factory source compiled once outside timing; each timed invocation creates fresh guest functions/prototypes/globals and then executes main, without reparsing',
                  'js_lifetime':'source loaded once per process; calls allocate normal JS objects and include any GC triggered during the timed batch',
                  'original_repeat_adapter':'unchanged COUNT=1000 workload, input selects number of independent runs',
                  'runtime_count_adapter':'input controls actual IdleTask scheduling countdown; returned queue and hold counts consumed',
                  'timing_count_inputs':options.timing_counts,'flags':['-O2','-ffp-contract=off'],
                  'official_octane_score':False,'benchmark_algorithm_rewritten':False},
              'correctness':{},'timings':{},'stages':{}}
    try:
        oracles = json.loads(run(['node',HERE/'oracles.js',json.dumps(COUNTS)]).stdout)
        save(oracles, 'oracles.json')
        result['oracles'] = oracles
        reference = {'exact':[{'input':row['input'],'value':row['value']} for row in oracles['originalAdapter']],
                     'runtime_count':[{'input':row['input'],'value':row['value']} for row in oracles['runtimeCount']]}
        with tempfile.TemporaryDirectory(prefix='object-richards-', dir='/tmp') as directory:
            temp = pathlib.Path(directory)
            for variant, filename, inputs in [('exact','input.js',REPEATS),('runtime_count','runtime-count.input.js',COUNTS)]:
                source = HERE/filename
                correct = result['correctness'][variant] = {}
                correct['original_node'] = js(source,'original','check',inputs,options)
                assert correct['original_node'] == reference[variant]
                correct['original_node_fresh_module'] = js(source,'original_fresh','check',inputs,options)
                assert correct['original_node_fresh_module'] == reference[variant]
                stages = result['stages'][variant] = {}
                native_paths = {}
                if not options.skip_direct:
                    try:
                        executable, metadata = compile_direct(source,temp,options.backend,options)
                        correct['direct_c'] = [native(executable,n,options) for n in inputs]
                        assert correct['direct_c'] == reference[variant], 'direct C correctness mismatch'
                        stages['direct_c'] = {'status':'passed',**metadata}
                        native_paths['direct_c'] = executable
                    except (RuntimeError, subprocess.TimeoutExpired, AssertionError) as exc:
                        stages['direct_c'] = error_record(exc)
                js_paths = {'original_node':(source,'original'), 'original_node_fresh_module':(source,'original_fresh')}
                if not options.baseline_only:
                    try:
                        project = ROOT.parent/'target/release/object-project'
                        emit = ROOT.parent/'target/release/object-to-c'
                        assert project.is_file(), 'object-project not built'
                        prefix = 'exact' if variant=='exact' else 'runtime-count'
                        guest_ast = HERE/(prefix+'.guest-ast.json')
                        ast_text = run([project,'--ast',source],timeout=options.compile_timeout).stdout
                        ast_data = json.loads(ast_text)
                        guest_ast.write_text(ast_text)
                        stages['encoded_guest_ast'] = {'status':'produced','sha256':digest(guest_ast),'bytes':guest_ast.stat().st_size,
                            'nodes':len(ast_data['nodes']), 'functions':len(ast_data['functions'])}
                        harness = HERE/(prefix+'.interpreter-harness.js')
                        harness.write_text(run([project,'--harness',source],timeout=options.compile_timeout).stdout)
                        correct['ordinary_interpreter'] = js(harness,'object','check',inputs,options)
                        assert correct['ordinary_interpreter'] == reference[variant], 'ordinary interpreter mismatch'
                        js_paths['ordinary_interpreter'] = (harness,'object')
                        stages['ordinary_interpreter'] = {'status':'passed','sha256':digest(harness)}
                        projected = run([project,source],timeout=options.compile_timeout)
                        residual = HERE/(prefix+'.residual.js'); residual.write_text(projected.stdout)
                        (HERE/(prefix+'.projection.log')).write_text(projected.stderr)
                        correct['projected_js'] = js(residual,'object','check',inputs,options)
                        assert correct['projected_js'] == reference[variant], 'projected JS mismatch'
                        js_paths['projected_js'] = (residual,'object')
                        ast_identifiers = re.findall(r'\b(?:nodes|functions|lists|constants|execute|expression|invoke)\b',projected.stdout)
                        assert not ast_identifiers, 'static AST identifiers survived projection: '+str(ast_identifiers[:8])
                        stages['projected_js'] = {'status':'passed','sha256':digest(residual),'bytes':residual.stat().st_size,
                            'static_ast_identifiers_absent':True,
                            'residual_guest_functions':len(re.findall(r'function\s+guest_\d+\s*\(',projected.stdout)),
                            'generic_guest_call_sites':len(re.findall(r'\bcallGuest\s*\(',projected.stdout)),
                            'function_identity_reads':len(re.findall(r'\bfnCode\s*\(',projected.stdout))}
                        assert emit.is_file(), 'object-to-c not built'
                        c = HERE/(prefix+'.generated.c')
                        c.write_text(run([emit,residual],timeout=options.compile_timeout).stdout)
                        assert not re.search(r'\b(?:pe_value|pe_call|pe_dispatch)\b|partial_runtime',c.read_text()), 'direct-C runtime leaked into interpreter projection'
                        assert (HERE/'object-timed-driver.c').is_file(), 'native timing driver ABI pending'
                        exe = temp/(prefix+'.object')
                        # Single translation unit shares the generated runtime ABI with driver.
                        tu = temp/(prefix+'.object-tu.c')
                        tu.write_text('#define _POSIX_C_SOURCE 200809L\n#include '+json.dumps(str(c))+'\n#include '+json.dumps(str(HERE/'object-timed-driver.c'))+'\n')
                        common = ['clang','-std=c11','-O2','-ffp-contract=off',tu,'-lm']
                        run(common+['-o',exe],timeout=options.compile_timeout)
                        object_checks = [native(exe,n,options) for n in inputs]
                        correct['object_c'] = [{'input':row['input'],'value':row['value']} for row in object_checks]
                        assert correct['object_c'] == reference[variant], 'object C mismatch'
                        native_paths['object_c'] = exe
                        stages['object_c'] = {'status':'passed','sha256':digest(c),'bytes':c.stat().st_size,'allocation_observations':object_checks}
                        san = temp/(prefix+'.object-san')
                        run(['clang','-std=c11','-O1','-g','-DOC_VERIFY_PROOFS','-DOC_GC_STRESS','-fsanitize=address,undefined','-fno-sanitize-recover=all','-ffp-contract=off',tu,'-lm','-o',san],timeout=options.compile_timeout)
                        san_checks = [native(san,n,options,sanitized=True) for n in inputs]
                        assert [{'input':row['input'],'value':row['value']} for row in san_checks] == reference[variant], 'sanitizer native output mismatch'
                        stages['sanitizers'] = {'status':'passed','checks':san_checks,
                            'flags':['address','undefined'], 'analysis_proofs_checked':True,'collection_at_every_allocation':True, 'leak_detection':'disabled: macOS runtime does not support LeakSanitizer' if platform.system()=='Darwin' else 'platform default'}
                    except (RuntimeError, subprocess.TimeoutExpired, AssertionError) as exc:
                        stages['object_pipeline'] = error_record(exc)
                if variant=='runtime_count':
                    result['invalid_inputs'] = {}
                    for name,(file,family) in js_paths.items():
                        rows = [{'input':n,**js(file,family,'reject',n,options)} for n in INVALID]
                        result['invalid_inputs'][name] = rows
                        assert all(not row['accepted'] and row.get('error') == 'Error' and row.get('message') == 'COUNT must be an integer from 1 to 1000000' for row in rows), name+' did not reject invalid COUNT with the intended guest Error'
                    for name,exe in native_paths.items():
                        rows=[]
                        for n in INVALID:
                            args=[exe,n,0,0]; commands.append(shlex.join(map(str,args)))
                            p=subprocess.run(list(map(str,args)),text=True,capture_output=True,timeout=options.timeout)
                            rows.append({'input':n,'exit_code':p.returncode,'stderr':p.stderr[-1000:]})
                        result['invalid_inputs'][name]=rows
                        assert all(row['exit_code'] == 3 and 'COUNT must be an integer from 1 to 1000000' in row['stderr'] for row in rows), name+' did not reject invalid COUNT with a guest exception'
                if not options.skip_timings:
                    for n in ([1,3] if variant=='exact' else options.timing_counts):
                        timings = result['timings'].setdefault(variant,{}).setdefault(str(n),{})
                        for name,(file,family) in js_paths.items():
                            try: timings[name] = rounds(lambda:js(file,family,'time',n,options),options)
                            except (RuntimeError, subprocess.TimeoutExpired) as exc: timings[name] = error_record(exc)
                        for name,exe in native_paths.items():
                            try: timings[name] = rounds(lambda:native(exe,n,options,True),options)
                            except (RuntimeError, subprocess.TimeoutExpired) as exc: timings[name] = error_record(exc)
                print(json.dumps({'variant':variant,'stages':stages,'timing_paths':list(result['timings'].get(variant,{}))}),flush=True)
        result['all_executed_comparisons_equal'] = all(rows == reference[variant] for variant, paths in result['correctness'].items() for rows in paths.values())
        result['all_five_paths_correct'] = result['all_executed_comparisons_equal'] and all({'original_node','direct_c','ordinary_interpreter','projected_js','object_c'} <= set(paths) for paths in result['correctness'].values())
    except Exception as exc:
        result['run_failure'] = error_record(exc)
        raise
    finally:
        result['read_only_input_hashes_before'] = before
        result['read_only_input_hashes_after'] = {str(p):digest(p) for p in watch if p.is_file()}
        result['read_only_inputs_unchanged'] = before == result['read_only_input_hashes_after']
        result['commands'] = commands
        result['pipeline_hashes_after'] = {str(p.relative_to(ROOT)):digest(p) for p in pipeline_files if p.is_file()}
        result['pipeline_unchanged_during_run'] = pipeline_before == result['pipeline_hashes_after']
        save(result, 'baseline-results.json' if options.baseline_only else 'results.json')
    return result

if __name__=='__main__':
    result=main()
    print(json.dumps({'all_five_paths_correct':result.get('all_five_paths_correct'),
                      'read_only_inputs_unchanged':result['read_only_inputs_unchanged'],
                      'timings':{v:{n:{k:r.get('median_seconds',r.get('status')) for k,r in rows.items()} for n,rows in ns.items()} for v,ns in result['timings'].items()}},indent=2))
