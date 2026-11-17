const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const H=require('../../docs/p3/harness.js');
const cogen=H.load(fs.readFileSync(path.join(__dirname,'jsmix.cogen.js'),'utf8'),'main');
const candidates={
 literal:'function interp(program,input){if(program[0]==="literal"){return program[1];}return input;}',
 arithmetic:'function interp(program,input){if(program[0]==="add"){return input+program[1];}return input*program[1];}',
};
for(const [name,source]of Object.entries(candidates)){
 const ast=H.parseProgram(source),compiler=cogen(ast);
 fs.writeFileSync(path.join(__dirname,name+'.compiler.js'),compiler);
 const optimize=H.prelude+'\n'+compiler.replace(/^function main\(/m,'function generatedCompiler(')+'\nfunction main(program){return generatedCompiler(program);}\n';
 const input=path.join(__dirname,name+'.cleanup.input.js');fs.writeFileSync(input,optimize);
 const r=spawnSync(path.join(__dirname,'../../target/release/js-frontend'),['--js',input],{encoding:'utf8',timeout:20000,maxBuffer:32*1024*1024});
 fs.writeFileSync(path.join(__dirname,name+'.cleanup.output.txt'),r.stdout||'');
 console.log(name,'cogen compiler',compiler.length,'Rust cleanup',r.status,r.error?.message,r.stdout?.split('\n')[0],r.stdout?.length,r.stderr?.slice(-200));
}
