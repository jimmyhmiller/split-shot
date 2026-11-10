function entry(input) {
 const ast=["add",["mul",["var","x"],["var","scale"]],["var","offset"]];
 const bindings=new Map([["offset",3],["scale",2],["x",input]]); function lookup(key){return bindings.get(key);}
 function evaluate(node){
  if(node[0]==="var")return lookup(node[1]);
  if(node[0]==="add")return evaluate(node[1])+evaluate(node[2]);
  if(node[0]==="mul")return evaluate(node[1])*evaluate(node[2]);
  return 0;
 }
 return evaluate(ast);
}
