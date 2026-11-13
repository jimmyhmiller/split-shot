const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'input.js'),'utf8');
const variants={
 'capture-items':source.replace('return Array.isArray(value) &&\n        value.every(item => validate(schema.items, item));','{\n      const items = schema.items;\n      return Array.isArray(value) && value.every(item => validate(items, item));\n      }'),
 'array-loop':source.replace('return Array.isArray(value) &&\n        value.every(item => validate(schema.items, item));','if (!Array.isArray(value)) return false;\n      const length = value.length;\n      for (let i = 0; i < length; i++) {\n        if (i in value && !validate(schema.items, value[i])) return false;\n      }\n      return true;'),
 'array-helper':source.replace('function validate(schema, value) {','function everyItem(schema, values) {\n  const length = values.length;\n  for (let i = 0; i < length; i++) {\n    if (i in values && !validate(schema, values[i])) return false;\n  }\n  return true;\n}\nfunction validate(schema, value) {').replace('value.every(item => validate(schema.items, item))','everyItem(schema.items, value)')
};
for(const [name,input] of Object.entries(variants)) {
 fs.writeFileSync(path.join(__dirname,name+'.input.js'),input);
 for(const context of [false,true]) {
 const stem=name+(context?'.context':'');
 const r=spawnSync(path.resolve(__dirname,'../../target/release/js-frontend'),['--js','--budget','2M',path.join(__dirname,name+'.input.js')],{encoding:'utf8',env:{...process.env,...(context?{PE_NO_SHARED_CONTEXTS:'1',PE_CONTEXT_POINTS:'1'}:{})},timeout:30000});
 fs.writeFileSync(path.join(__dirname,stem+'.residual.js'),r.stdout||'');
 fs.writeFileSync(path.join(__dirname,stem+'.stderr.txt'),r.stderr||'');
 console.log(stem,r.status,(r.stdout||'').length,(r.stderr||'').slice(0,200));
 }
}
