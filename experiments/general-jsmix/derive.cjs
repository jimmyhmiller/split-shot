const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const read=file=>fs.readFileSync(path.join(__dirname,file),'utf8');
// The parser and the binding-time analysis, as the program runs them.
const {parseProgram}=Function(read('subset-parse.js')+'\nreturn {parseProgram};')();
const {analyze}=require('./binding-times.cjs');
function parse(source) {
  return analyze(parseProgram(source), "interp");
}
// The program split-shot specializes: the interpreter, then the parser, the
// binding-time analysis and jsmix (files of function declarations only, so the
// program has no top-level code), and a main that parses the interpreter's own
// source and runs jsmix on it with the program dynamic.
const TOOLKIT=['subset-parse.js','binding-times.js','jsmix.js'];
function plainProgram(source) {
  const names=parseProgram(source).map(fn=>fn[1]);
  const toolkit=TOOLKIT.map(read);
  const taken=new Set(toolkit.flatMap(src=>parseDeclaredNames(src)));
  for(const n of names)if(taken.has(n)||n==='main')throw new Error('The interpreter function '+n+' has the name of one of '+TOOLKIT.join(', ')+' or main');
  return source.replace(/\s*$/,'\n')+'\n'+toolkit.join('\n')+
    '\nfunction main(program) {\n  var INT = analyze(parseProgram('+names.map(n=>n+'.toString()').join(' + "\\n" + ')+'), "interp");\n  return jsmix(INT, "interp", program);\n}\n';
}
function parseDeclaredNames(src){return [...src.matchAll(/^function ([A-Za-z_$][\w$]*)/gm)].map(m=>m[1]);}
function derive(source, name='prompt-print', {outputDirectory} = {}) {
  const ast=parse(source);
  const input=plainProgram(source);
  const generated=outputDirectory || path.join(__dirname,'generated');fs.mkdirSync(generated,{recursive:true});
  const prefix=path.join(generated,name);fs.writeFileSync(prefix+'.input.js',input);
  const output=execFileSync(path.join(__dirname,'../../target/release/js-frontend'),['--js',prefix+'.input.js'],{encoding:'utf8',timeout:30000,maxBuffer:32*1024*1024});
  fs.writeFileSync(prefix+'.output.txt',output);
  const residual=output.slice(output.indexOf('\n')+1).replace(/^function main\(/m,'function compile(');
  let helperPath=path.relative(generated,path.join(__dirname,'codegen.cjs')).split(path.sep).join('/');
  if(!helperPath.startsWith('.'))helperPath='./'+helperPath;
  const linkage='\nconst codegen = require('+JSON.stringify(helperPath)+');\nmodule.exports={compile,run:function(program,io){return Function("return ("+compile(program)+");")()(io);}};\n';
  fs.writeFileSync(prefix+'.compiler.cjs',residual+linkage);
  if (name === 'prompt-print') {
    const {simplify}=require('../../tools/readable-js/index.cjs');
    const readable=simplify(residual,{names:{compile:{e:'program',c:'lines',a:'temp',b:'remaining',d:'value',f:'args'}}});
    fs.writeFileSync(prefix+'.readable.cjs',readable.code+linkage);
    fs.writeFileSync(prefix+'.simplification.json',JSON.stringify(readable.counts,null,2)+'\n');
  }
  console.log(name,output.split('\n')[0],residual.split('\n').length+' lines');
  return {ast,output,residual,linkage,prefix};
}
module.exports={derive,parse,plainProgram};
if(require.main===module)derive(fs.readFileSync(path.join(__dirname,'../readable-second-projection/interpreter.js'),'utf8'));
