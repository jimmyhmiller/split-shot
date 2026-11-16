const acorn = require('acorn');
// Generic syntax lowering only; no source-language instruction names occur here.
function parseProgram(source) {
  const ast=acorn.parse(source,{ecmaVersion:2022});
  function unsupported(node){throw new Error('Unsupported JavaScript subset syntax: '+node.type);}
  function expr(n,allowError=false){
    if(!n)return ['undef'];
    switch(n.type){
      case 'Literal': if(n.regex||typeof n.value==='bigint'||typeof n.value==='number'&&!Number.isFinite(n.value))return unsupported(n);return ['lit',n.value];
      case 'Identifier':return ['var',n.name];
      case 'ArrayExpression':if(n.elements.some(x=>!x||x.type==='SpreadElement'))return unsupported(n);return ['arr',n.elements.map(x=>expr(x))];
      case 'MemberExpression':if(n.optional)return unsupported(n);return n.computed?['idx',expr(n.object),expr(n.property)]:['dot',expr(n.object),n.property.name];
      case 'BinaryExpression':if(!['+','-','*','/','%','**','&','===','!==','==','!=','<','>','<=','>='].includes(n.operator))return unsupported(n);return ['bin',n.operator,expr(n.left),expr(n.right)];
      case 'UnaryExpression':if(!['!','-','+','typeof'].includes(n.operator))return unsupported(n);return ['unary',n.operator,expr(n.argument)];
      case 'ConditionalExpression':return ['cond',expr(n.test),expr(n.consequent),expr(n.alternate)];
      case 'CallExpression':if(n.optional||n.arguments.some(a=>a.type==='SpreadElement')||!(n.callee.type==='Identifier'||n.callee.type==='MemberExpression'&&!n.callee.computed))return unsupported(n);return ['call',expr(n.callee),n.arguments.map(x=>expr(x))];
      case 'NewExpression':if(!allowError||n.arguments.length>1)return unsupported(n);if(n.callee.type!=='Identifier'||!['Error','TypeError','RangeError','SyntaxError','ReferenceError'].includes(n.callee.name))return unsupported(n);return ['new',n.callee.name,n.arguments.map(x=>expr(x))];
      default:return unsupported(n);
    }
  }
  function stmt(n,names){
    switch(n.type){
      case 'EmptyStatement':return ['block',[]];
      case 'BlockStatement':return ['block',n.body.map(x=>stmt(x,names))];
      case 'VariableDeclaration':
        if(n.kind!=='var'||n.declarations.some(d=>d.id.type!=='Identifier'))return unsupported(n);
        return ['block',n.declarations.map(d=>{if(!names.includes(d.id.name))names.push(d.id.name);return d.init?['var',d.id.name,expr(d.init)]:['block',[]];})];
      case 'ReturnStatement':return ['return',expr(n.argument)];
      case 'ThrowStatement':return ['throw',expr(n.argument,true)];
      case 'WhileStatement':return ['while',expr(n.test),stmt(n.body,names)];
      case 'IfStatement':return ['if',expr(n.test),stmt(n.consequent,names),n.alternate?stmt(n.alternate,names):null];
      case 'ExpressionStatement':{
        if(n.expression.type==='AssignmentExpression'){
          const a=n.expression;if(a.operator!=='='||a.left.type!=='Identifier')return unsupported(a);
          return ['assign',a.left.name,expr(a.right)];
        }
        return ['expr',expr(n.expression)];
      }
      default:return unsupported(n);
    }
  }
  const functions=ast.body.map(n=>{
    if(n.type!=='FunctionDeclaration'||n.async||n.generator||n.params.some(p=>p.type!=='Identifier'))return unsupported(n);
    const params=n.params.map(p=>p.name),names=[...new Set(params)];
    const body=n.body.body.map(s=>stmt(s,names));
    return ['fundecl',n.id.name,params,body,names];
  });
  const functionNames=new Set(functions.map(fn=>fn[1]));
  if(functionNames.size!==functions.length)throw new Error("Duplicate function declarations are not supported");
  for(const fn of functions){
    const names=new Set(fn[4]);
    function check(n){
      if(!Array.isArray(n))return;
      if(n[0]==='var'&&n.length===2&&!names.has(n[1])){if(n[1]==='undefined'){n.splice(0,n.length,'undef');return;}throw new Error('Unbound variable: '+n[1]);}
      if(n[0]==='new'&&(names.has(n[1])||functionNames.has(n[1])))throw new Error('Shadowed builtin constructor is not supported: '+n[1]);
      if(n[0]==='assign'&&!names.has(n[1]))throw new Error('Undeclared assignment: '+n[1]);
      if(n[0]==='call'){
        if(n[1][0]==='dot')check(n[1][1]);
        for(const a of n[2])check(a);return;
      }
      for(const child of n)check(child);
    }
    check(fn[3]);
  }
  return functions;
}
module.exports={parseProgram};
