function entry(input){
function lookup(env,key){return env.get(key);}
function evaluate(node,env){if(node[0]==='literal')return node[1];if(node[0]==='input')return input[node[1]];return lookup(env,evaluate(node[1],env));}
var entries=[['alpha',11],['beta',input.value],['gamma',33]];
var env=new Map(entries);
return evaluate(["binding",["literal","beta"]],env);
}
