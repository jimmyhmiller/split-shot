function entry(input) {
 const ast=["add",["mul",["var","x"],["var","scale"]],["var","offset"]];
 const buckets=[[["x",input]],[],[],[["offset",3],["scale",2]]]; function lookup(key){var b=buckets[key.charCodeAt(0)&3];for(var i=0;i<b.length;i++)if(b[i][0]===key)return b[i][1];return 0;}
 function evaluate(node){
  if(node[0]==="var")return lookup(node[1]);
  if(node[0]==="add")return evaluate(node[1])+evaluate(node[2]);
  if(node[0]==="mul")return evaluate(node[1])*evaluate(node[2]);
  return 0;
 }
 return evaluate(ast);
}
