const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {parseProgram}=require('./parse.cjs');
function parse(source) {
  const ast=parseProgram(source);
  return require("./binding-times.cjs").analyze(ast, "interp");
}
function derive(source, name='prompt-print', {outputDirectory} = {}) {
  const ast=parse(source);
  const input=fs.readFileSync(path.join(__dirname,'jsmix.js'),'utf8')+'\nfunction main(program){var INT='+JSON.stringify(ast)+';return jsmix(INT,"interp",program);}\n';
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
module.exports={derive,parse};
if(require.main===module)derive(fs.readFileSync(path.join(__dirname,'../readable-second-projection/interpreter.js'),'utf8'));
