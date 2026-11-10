function entry(input) {
 const ast=["add",["get",["mod",["input"],["lit",3]]],["lit",7]];
 const bindings=[[0,input],[1,2],[2,3]]; function lookup(key){for(var i=0;i<bindings.length;i++)if(bindings[i][0]===key)return bindings[i][1];return 0;}
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
