const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,file),'utf8');
const engine=read('engine.js');
if(/<\/script/i.test(engine)) throw new Error('Engine contains an unsafe HTML script terminator');
const html=read('index.template.html').replace('/*ENGINE*/',()=>engine);
fs.writeFileSync(path.join(__dirname,'index.html'),html);
console.log(`Built standalone index.html (${Buffer.byteLength(html)} bytes)`);
