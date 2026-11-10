const fs = require('node:fs'), path = require('node:path'), esbuild = require('esbuild');
const result = esbuild.buildSync({ entryPoints: [path.join(__dirname,'workbench.js')], bundle: true,
  format: 'iife', globalName: 'RelayCodeWorkbench', minify: true, legalComments: 'eof', metafile: true,
  outfile: path.join(__dirname,'../vendor/codemirror.js'), write: true });
const packages = new Set();
for(const input of Object.keys(result.metafile.inputs)) {
  const full=path.resolve(input), index=full.lastIndexOf('/node_modules/');
  if(index<0)continue;
  const rest=full.slice(index+14).split('/'), count=rest[0].startsWith('@')?2:1;
  packages.add(full.slice(0,index+14)+rest.slice(0,count).join('/'));
}
const licenses=[];
for(const directory of [...packages].sort()) {
  const info=JSON.parse(fs.readFileSync(path.join(directory,'package.json'),'utf8'));
  const license=['LICENSE','LICENSE.md','LICENSE.txt'].find(file=>fs.existsSync(path.join(directory,file)));
  if(!license)throw new Error('Missing license for '+info.name);
  licenses.push(info.name+' '+info.version+'\n'+fs.readFileSync(path.join(directory,license),'utf8'));
}
fs.writeFileSync(path.join(__dirname,'../vendor/CODEMIRROR-LICENSES.txt'),licenses.join('\n\n---\n\n'));
const bundle=fs.readFileSync(path.join(__dirname,'../vendor/codemirror.js'),'utf8');
if(/<\/script/i.test(bundle))throw new Error('Bundle cannot be embedded in inline HTML');
console.log('Built offline CodeMirror bundle with '+packages.size+' package licenses.');
