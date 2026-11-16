const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const repo=path.resolve(__dirname,'../../..');
const {parseProgram}=require(path.join(repo,'docs/p2real/parse.js'));
const variant=process.argv[2]||'original';
const files={original:path.join(repo,'docs/p2real/jsmix.js'),direct:path.join(__dirname,'jsmix-before-cells.js'),cells:path.join(__dirname,'jsmix-array-cells.js')};
if(!files[variant])throw new Error('Expected original, direct, or cells');
const ast=parseProgram(fs.readFileSync(path.join(__dirname,'baseline-interpreter.js'),'utf8'));
for(const fn of ast){
 const names=[...fn[2]];
 function visit(n){if(!Array.isArray(n))return;if(n[0]==='fun')return;if(n[0]==='var'&&n.length===3&&!names.includes(n[1]))names.push(n[1]);for(const x of n)visit(x);}
 visit(fn[3]);fn.push(names);
}
const input=fs.readFileSync(files[variant],'utf8')+'\nfunction main(program){var INT='+JSON.stringify(ast)+';return jsmix(INT,"interp",program);}\n';
const prefix=path.join(__dirname,'probe-'+variant);fs.writeFileSync(prefix+'.input.js',input);
const r=spawnSync(path.join(repo,'target/release/js-frontend'),['--js',prefix+'.input.js'],{encoding:'utf8',timeout:30000,maxBuffer:32*1024*1024,env:{...process.env,RESID_DEBUG:'1'}});
fs.writeFileSync(prefix+'.output.txt',r.stdout||'');fs.writeFileSync(prefix+'.trace.txt',r.stderr||'');
if(r.status!==0)throw r.error||new Error(r.stderr);
console.log(variant,r.stdout.split('\n')[0]);
