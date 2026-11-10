function entry(input){
 input=+input;
 const ast=["add",["var","x"],["var","x"]];
 const bindings=[["x",input]];
 const cache=new Map();
 function find(key){for(var i=0;i<bindings.length;i++)if(bindings[i][0]===key)return bindings[i][1];return 0;}
 function lookup(key){if(cache.has(key))return cache.get(key);var value=find(key);cache.set(key,value);return value;}
 function evaluate(node){if(node[0]==="var")return lookup(node[1]);return evaluate(node[1])+evaluate(node[2]);}
 return evaluate(ast);
}
