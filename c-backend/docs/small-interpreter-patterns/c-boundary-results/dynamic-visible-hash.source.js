function entry(input) {
 const ast=["add",["get",["mod",["input"],["lit",3]]],["lit",7]];
 const buckets=[[[0,input]],[[1,2]],[[2,3]],[]]; function lookup(key){var slot=((key%4)+4)%4;if(slot!==Math.floor(slot))return 0;var b=buckets[slot];for(var i=0;i<b.length;i++)if(b[i][0]===key)return b[i][1];return 0;}
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
