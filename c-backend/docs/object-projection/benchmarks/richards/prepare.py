#!/usr/bin/env python3
"""Prepare Richards from the pinned, read-only C target corpus.

The exact adapter is byte-for-byte tools/c-target.py prepare(hermes-richards).
The runtime COUNT adapter changes input, output, and the fixed-size oracle only.
No scheduler, packet, or task algorithm is rewritten.
"""
import argparse
import hashlib
import importlib.util
import json
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
DEFAULT_BACKEND = pathlib.Path('/Users/jimmyhmiller/Documents/Code/PlayGround/claude-experiments/partial-new/.worktrees/residual-language/claude-experiments/partial-new')

def sha(data):
    return hashlib.sha256(data).hexdigest()

def replace_once(source, old, new):
    assert source.count(old) == 1, 'source boundary changed: ' + old[:80]
    return source.replace(old, new, 1)

def prepare(backend):
    sys.dont_write_bytecode = True  # importing the read-only tool must not write __pycache__
    tool = backend / 'tools/c-target.py'
    spec = importlib.util.spec_from_file_location('read_only_c_target', tool)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    manifest = json.loads((backend / 'corpus-c/manifest.json').read_text())
    case, = [c for c in manifest if c['name'] == 'hermes-richards']
    exact = module.prepare(case)
    upstream = backend / 'corpus-c/upstream/richards.js'
    adapter = backend / 'corpus-c/adapters' / case['adapter']
    original_adapter = adapter.read_text()
    assert exact.endswith(original_adapter)
    body = exact[:-len(original_adapter)]
    old_check = 'if (scheduler.queueCount != EXPECTED_QUEUE_COUNT ||\n      scheduler.holdCount != EXPECTED_HOLD_COUNT) {'
    new_check = 'if (COUNT === 1000 && (scheduler.queueCount != EXPECTED_QUEUE_COUNT ||\n      scheduler.holdCount != EXPECTED_HOLD_COUNT)) {'
    runtime = replace_once(body, old_check, new_check)
    old_end = '    throw new Error(msg);\n  }\n}'
    new_end = '    throw new Error(msg);\n  }\n  return [scheduler.queueCount, scheduler.holdCount];\n}'
    runtime = replace_once(runtime, old_end, new_end)
    runtime_adapter = '''// Adaptation: runtime COUNT, not an outer repeat count. Algorithms above unchanged.
function main(input) {
  if (input < 1 || input > 1000000 || input !== (input | 0))
    throw new Error("COUNT must be an integer from 1 to 1000000");
  COUNT = input;
  return runRichards();
}
'''
    runtime += runtime_adapter
    # Reverse the explicitly allowed edits to prove algorithm preservation.
    restored = runtime[:-len(runtime_adapter)]
    restored = replace_once(restored, new_check, old_check)
    restored = replace_once(restored, new_end, old_end)
    assert restored == body
    (HERE / 'input.js').write_text(exact)
    (HERE / 'runtime-count.input.js').write_text(runtime)
    (HERE / 'upstream-richards.js').write_bytes(upstream.read_bytes())
    notices = []
    for block in upstream.read_text().split('// Copyright ')[1:]:
        notice = '// Copyright ' + block.split('\n\n', 1)[0]
        notices.append('\n'.join(line.removeprefix('//').removeprefix(' ') for line in notice.splitlines()))
    assert len(notices) == 2, 'expected framework and Richards copyright notices'
    (HERE / 'LICENSE.md').write_text('Richards and its bundled benchmark framework retain these upstream BSD notices.\n\n' + '\n\n'.join(notices) + '\n')
    source = json.loads((backend / 'corpus-c/upstream/SOURCE.json').read_text())
    data = {
        'source': source,
        'richards_path': 'benchmarks/octane/richards.js',
        'source_url': source['repository'] + '/blob/' + source['commit'] + '/benchmarks/octane/richards.js',
        'preparation': 'tools/c-target.py prepare(manifest case hermes-richards)',
        'backend_path': str(backend),
        'backend_commit': subprocess.check_output(['git', '-C', str(backend), 'rev-parse', 'HEAD'], text=True).strip(),
        'sha256': {
            'upstream-richards.js': sha(upstream.read_bytes()),
            'input.js': sha(exact.encode()),
            'runtime-count.input.js': sha(runtime.encode()),
            'original_adapter': sha(adapter.read_bytes()),
            'original_preparation_tool': sha(tool.read_bytes()),
            'original_manifest': sha((backend / 'corpus-c/manifest.json').read_bytes()),
        },
        'exact_adapter': {'meaning': 'repeat unchanged runRichards with COUNT=1000 input times, checking the original oracle each time', 'inputs': [0, 1, 2, 3], 'expected': True},
        'runtime_count_adapter': {
            'meaning': 'set COUNT from runtime input, execute unchanged scheduler once, return [queueCount,holdCount]',
            'domain': 'integer 1..1000000 inclusive; all other values rejected',
            'edits': ['guard standard oracle with COUNT === 1000', 'return queueCount and holdCount from runRichards', 'replace outer repeat driver with validated runtime COUNT driver'],
            'original_algorithm_preserved_by_reverse_edit_check': True,
        },
    }
    (HERE / 'provenance.json').write_text(json.dumps(data, indent=2) + '\n')
    return data

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backend', type=pathlib.Path, default=DEFAULT_BACKEND)
    args = parser.parse_args()
    print(json.dumps(prepare(args.backend), indent=2))
