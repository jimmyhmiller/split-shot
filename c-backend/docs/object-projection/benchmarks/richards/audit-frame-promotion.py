#!/usr/bin/env python3
"""Reproduce runtime-operation counts for a baseline and candidate generated C.

Instrumentation measures executed semantic primitive calls, not elapsed time.
The benchmark algorithms are neither edited nor recognized by this script.
"""
import argparse
import datetime
import hashlib
import json
import pathlib
import re
import statistics
import subprocess
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BASELINE = 'fa283978ae28b979f17039fd049090dae0d8f0a1'
PRIMITIVES = ['oc_values_get', 'oc_values_set', 'oc_get', 'oc_set',
              'oc_dispatch', 'oc_binary', 'oc_function_code', 'oc_function_env']
FLAGS = ['-std=c11', '-O2', '-ffp-contract=off', '-DOBJECT_STANDALONE']


def run(args, **kwargs):
    result = subprocess.run([str(a) for a in args], capture_output=True, text=True,
                            timeout=120, **kwargs)
    if result.returncode:
        raise RuntimeError(f'{args!r}: exit {result.returncode}\n{result.stderr}')
    return result


def digest(source):
    return hashlib.sha256(source.encode()).hexdigest()


def instrument(source):
    declarations = '\n'.join(f'static unsigned long long audit_{n};' for n in PRIMITIVES) + '\nstatic unsigned long long audit_oc_call_known;'
    marker = 'typedef struct oc_obj oc_obj;'
    if source.count(marker) != 1:
        raise ValueError('Expected the object runtime object declaration exactly once')
    source = source.replace(marker, declarations + '\n' + marker, 1)
    for name in PRIMITIVES:
        pattern = rf'(static (?:oc_value|double) {name}\([^;{{}}]*\)\s*\{{)'
        source, count = re.subn(pattern, lambda m: m[1] + f'audit_{name}++;', source)
        if count != 1:
            raise ValueError(f'Expected exactly one runtime definition of {name}, found {count}')
    source = re.sub(r'(OC_KNOWN_INLINE oc_value oc_call_known_\d+\([^;{}]*\)\s*\{)',
                    lambda m: m[1] + 'audit_oc_call_known++;', source)
    reported = PRIMITIVES + ['oc_call_known']
    fields = ','.join(f'\\"{n}\\":%llu' for n in reported)
    args = ','.join('audit_' + n for n in reported)
    report = f'fprintf(stderr,"OBJECT_COUNTERS {{{fields}}}\\n",{args});'
    source, count = re.subn(r'oc_context_free\(ctx\);\s*return status;',
                            lambda _: report + 'oc_context_free(ctx);return status;', source)
    if count != 1:
        raise ValueError('Expected exactly one standalone CLI cleanup')
    return source


def count(source, name, work, cc, input_value):
    c = work / (name + '.c')
    exe = work / name
    c.write_text(instrument(source))
    run([cc, *FLAGS, c, '-lm', '-o', exe])
    result = run([exe, input_value])
    lines = [line[len('OBJECT_COUNTERS '):] for line in result.stderr.splitlines()
             if line.startswith('OBJECT_COUNTERS ')]
    if len(lines) != 1:
        raise ValueError('Missing unique counter report: ' + result.stderr)
    return {'source_sha256': digest(source), 'counts': json.loads(lines[0]),
            'result': json.loads(result.stdout), 'instrumented_source': str(c)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline-commit', default=BASELINE)
    parser.add_argument('--baseline-source', type=pathlib.Path)
    parser.add_argument('--candidate', type=pathlib.Path,
                        default=HERE / 'frame-promotion.generated.c')
    parser.add_argument('--output', type=pathlib.Path,
                        default=HERE / 'frame-promotion-audit.json')
    parser.add_argument('--input', default='1000')
    parser.add_argument('--cc', default='clang')
    args = parser.parse_args()
    git_root = pathlib.Path(run(['git', 'rev-parse', '--show-toplevel'], cwd=ROOT).stdout.strip())
    baseline_path = HERE.relative_to(git_root) / 'runtime-count.generated.c'
    baseline_command = ['git', 'show', f'{args.baseline_commit}:{baseline_path.as_posix()}']
    baseline = args.baseline_source.read_text() if args.baseline_source else run(baseline_command, cwd=git_root).stdout
    candidate = args.candidate.read_text()
    with tempfile.TemporaryDirectory(prefix='object-counter-audit-') as temporary:
        work = pathlib.Path(temporary)
        old = count(baseline, 'baseline', work, args.cc, args.input)
        new = count(candidate, 'candidate', work, args.cc, args.input)
        old.pop('instrumented_source')
        new.pop('instrumented_source')
    if old['result'] != new['result']:
        raise ValueError('Instrumented baseline/candidate outputs differ')
    old_accesses = sum(old['counts'][n] for n in ('oc_values_get', 'oc_values_set'))
    new_accesses = sum(new['counts'][n] for n in ('oc_values_get', 'oc_values_set'))
    report = {
        'measured_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'purpose': 'Executed primitive audit for generic noncaptured lexical-frame promotion',
        'baseline_commit': args.baseline_commit if not args.baseline_source else None,
        'baseline_source': str(args.baseline_source) if args.baseline_source else None,
        'baseline_source_command': [str(a) for a in baseline_command] if not args.baseline_source else None,
        'candidate_source': str(args.candidate),
        'original_candidate_source': '/tmp/richards-flat.c' if digest(candidate) == hashlib.sha256((HERE / 'frame-promotion.generated.c').read_bytes()).hexdigest() else None,
        'input': args.input, 'compiler': run([args.cc, '--version']).stdout,
        'flags': FLAGS + ['-lm'],
        'reproduce_command': 'python3 docs/object-projection/benchmarks/richards/audit-frame-promotion.py',
        'baseline': old, 'candidate': new,
        'value_buffer_accesses': {'baseline': old_accesses, 'candidate': new_accesses,
                                  'reduction_fraction': 1 - new_accesses / old_accesses},
        'counter_caveat': 'Counters are from separately instrumented execution. No instrumented elapsed time is used as a performance result.',
        'preliminary_timing': {
            'candidate_source_sha256': digest(candidate),
            'driver_source': 'docs/object-projection/benchmarks/richards/object-timed-driver.c',
            'driver_sha256': hashlib.sha256((HERE / 'object-timed-driver.c').read_bytes()).hexdigest(),
            'compile_command': 'cat /tmp/richards-flat.c docs/object-projection/benchmarks/richards/object-timed-driver.c > /tmp/richards-flat.timed.c; clang -std=c11 -O2 -ffp-contract=off /tmp/richards-flat.timed.c -lm -o /tmp/richards-flat.timed',
            'run_command': '/tmp/richards-flat.timed 1000 7 5',
            'samples_seconds': [0.00135841666876, 0.00138312499621, 0.00138129166832,
                                0.00138604166568, 0.001371499995, 0.00138337499811,
                                0.00136025000635],
            'median_seconds': statistics.median([0.00135841666876, 0.00138312499621,
                                                0.00138129166832, 0.00138604166568,
                                                0.001371499995, 0.00138337499811,
                                                0.00136025000635]),
            'warmup_calls': 5, 'batch': 24,
            'included_costs': 'Host context creation, guest allocation, execution, output consumption and all context cleanup',
            'caveat': 'One preliminary seven-sample process, not the final multi-round benchmark; no cross-stage speed claim should use this alone.'
        }
    }
    if digest(candidate) != hashlib.sha256((HERE / 'frame-promotion.generated.c').read_bytes()).hexdigest():
        report.pop('preliminary_timing')
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'baseline': old['counts'], 'candidate': new['counts'],
                      'value_buffer_accesses': report['value_buffer_accesses']}, indent=2))


if __name__ == '__main__':
    main()
