
const vm=require('vm'),fs=require('fs');
const source=fs.readFileSync(process.argv[1],'utf8');
function encode(v,seen=[]) {
 if(v===undefined)return ['undefined']; if(v===null)return ['null'];
 if(typeof v==='number')return ['number',Number.isNaN(v)?'NaN':v===Infinity?'Infinity':v===-Infinity?'-Infinity':Object.is(v,-0)?'-0':v];
 if(typeof v==='boolean'||typeof v==='string')return [typeof v,v];
 if(seen.includes(v))return ['cycle']; const next=seen.concat([v]);
 if(Array.isArray(v))return ['array',Array.from({length:v.length},(_,i)=>i in v?encode(v[i],next):['hole'])];
 const fields={};for(const k of Object.keys(v))fields[k]=encode(v[k],next);
 return [typeof v==='function'?'function':'object',fields];
}
for(const input of JSON.parse(process.argv[2])) {
 const c=vm.createContext({});
 try {vm.runInContext(source,c);console.log(JSON.stringify(encode(c.main(input))));}
 catch(e){console.log(JSON.stringify(['throw',encode(e.name)]));}
}
