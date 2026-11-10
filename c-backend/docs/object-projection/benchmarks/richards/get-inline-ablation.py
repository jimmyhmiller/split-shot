import pathlib,subprocess,json,statistics,hashlib,datetime,math
w=pathlib.Path('/tmp/richards-independent-profile')
checks=[]
for n in ['1','2','10','37','100','999','1000','2500','4093','10000','12345','0','-1','1.5','NaN','Infinity','-Infinity','1000001']:
 a=subprocess.run([str(w/'baseline'),n,'0','0'],capture_output=True,text=True); b=subprocess.run([str(w/'get-inline'),n,'0','0'],capture_output=True,text=True)
 assert (a.returncode,a.stdout,a.stderr)==(b.returncode,b.stdout,b.stderr),(n,a.stdout,b.stdout)
 checks.append({'input':n,'exit_code':a.returncode,'stdout':a.stdout,'stderr':a.stderr})
print('18 exact baseline/candidate output+exit comparisons passed',flush=True)
rows=[]
for n in [1000,10000]:
 for r in range(5):
  for name in (['baseline','get-inline'] if r%2==0 else ['get-inline','baseline']):
   out=subprocess.run([str(w/name),str(n),'7','5'],check=True,capture_output=True,text=True)
   x=json.loads(out.stdout); x['round']=r; x['name']=name; x['median_seconds']=statistics.median(x['samples_seconds']); rows.append(x)
   print(n,r,name,x['median_seconds'],flush=True)
summary=[]
for n in [1000,10000]:
 a=statistics.median(x['median_seconds'] for x in rows if x['input']==n and x['name']=='baseline')
 b=statistics.median(x['median_seconds'] for x in rows if x['input']==n and x['name']=='get-inline')
 summary.append({'input':n,'baseline_median_seconds':a,'inline_get_median_seconds':b,'speedup':a/b,'reduction':1-b/a})
out={'date_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_sha256':{n:hashlib.sha256((w/(n+'.c')).read_bytes()).hexdigest() for n in ['baseline','get-inline']},'flags':['-std=c11','-O2','-ffp-contract=off','-lm'],'correctness':checks,'rounds':rows,'summary':summary,'caveat':'Temporary-copy experiment, not official pipeline benchmark or committed implementation; only oc_get forced always_inline, with full generic semantics retained; all context creation/destruction and output checks included.'}
(w/'get-inline-ablation.json').write_text(json.dumps(out,indent=2)+'\n'); print(json.dumps(summary,indent=2),flush=True)
