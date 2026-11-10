function entry(input){
function lookup(env,key){var i=0;while(i<env.length){if(env[i][0]===key)return env[i][1];i=i+1;}return undefined;}
function evaluate(node,env){if(node[0]==='literal')return node[1];if(node[0]==='input')return input[node[1]];return lookup(env,evaluate(node[1],env));}
var entries=[['alpha',11],['beta',input.value],['gamma',33]];
var env=entries;
return evaluate(["binding",["input","key"]],env);
}
