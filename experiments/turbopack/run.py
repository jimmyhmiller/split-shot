#!/usr/bin/env python3
"""Re-run PE on pinned production chunks, preserving inputs, residuals and logs."""
import json, pathlib, subprocess, time
ROOT=pathlib.Path(__file__).resolve().parents[2]
P=pathlib.Path(__file__).resolve().parent
rows=[]
for source in json.loads((P/'sources.json').read_text()):
    name=source['file']; text=(P/name).read_text()
    cases=[('ambient',text+'\nfunction main(input) { return input; }\n')]
    if name=='nextjs-0tjyqs9lrtcyp.js':
        for mode,tail in [
            ('interop','var out = {}; globalThis.TURBOPACK[0][1][1]({}, {}, out); return out._(input);'),
            ('status','var out = {}; globalThis.TURBOPACK[0][1][9]({}, {}, out); return out.getAccessFallbackErrorTypeByStatus(input);')]:
            cases.append((mode,'function main(input) { var globalThis = {Error: function QuietError() { this.stack = undefined; }}; var document;\n'+text+'\n'+tail+'\n}'))
    # Keep the native Error comparison: its unknown stack blocks heap precision.
    for mode, code in list(cases):
        if mode in ('interop', 'status'):
            cases.append((mode+'-native-error',code.replace('function QuietError() { this.stack = undefined; }','Error')))
    for mode,code in cases:
        stem=name[:-3]+'-'+mode
        inp=P/(stem+'.input.js'); inp.write_text(code)
        start=time.monotonic()
        try:
            r=subprocess.run([str(ROOT/'target/release/js-frontend'),'--js','--budget','2M','--why-json',str(P/(stem+'.why.json')),str(inp)],capture_output=True,text=True,timeout=30,cwd=ROOT)
            (P/(stem+'.stderr')).write_text(r.stderr)
            output=r.stdout.removeprefix('--- residual as JavaScript ---\n')
            (P/(stem+'.residual.js')).write_text(output)
            verdict='emitted' if r.returncode==0 else 'error'
            detail=r.stderr[-800:] if r.returncode else ''
        except subprocess.TimeoutExpired:
            verdict='timeout';output='';detail='30 second process limit'
        row=dict(file=name,mode=mode,input_bytes=len(code.encode()),residual_bytes=len(output.encode()),seconds=round(time.monotonic()-start,3),verdict=verdict,detail=detail)
        rows.append(row); print(json.dumps(row),flush=True)
        (P/'results.json').write_text(json.dumps(rows,indent=2))
