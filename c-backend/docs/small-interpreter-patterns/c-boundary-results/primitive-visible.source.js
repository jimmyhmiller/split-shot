function entry(input){
 const ast=["mul",["input"],["sqrt",["lit",4]]];
 function evaluate(node){
  if(node[0]==="input")return input;
  if(node[0]==="lit")return node[1];
  if(node[0]==="sqrt")return Math.sqrt(evaluate(node[1]));
  if(node[0]==="mul")return evaluate(node[1])*evaluate(node[2]);
  return 0;
 }
 return evaluate(ast);
}
