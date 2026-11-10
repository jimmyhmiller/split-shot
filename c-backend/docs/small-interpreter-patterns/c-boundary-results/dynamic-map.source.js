function entry(input) {
 const ast=["add",["get",["mod",["input"],["lit",3]]],["lit",7]];
 const bindings=new Map([[0,input],[1,2],[2,3]]); function lookup(key){var v=bindings.get(key);return v===undefined?0:v;}
 function evaluate(node){
  if(node[0]==="lit")return node[1];
  if(node[0]==="input")return input;
  if(node[0]==="get")return lookup(evaluate(node[1]));
  if(node[0]==="mod")return evaluate(node[1])%evaluate(node[2]);
  if(node[0]==="add")return evaluate(node[1])+evaluate(node[2]);
  return 0;
 }
 return evaluate(ast);
}
