function entry(n){
 const code=["add",["arg",0],["arg",0]];
 function evaluate(node,values){
  if(node[0]==="arg")return values[node[1]];
  if(node[0]==="add")return evaluate(node[1],values)+evaluate(node[2],values);
  return 0;
 }
 const frame={args:[0]};
 var i=0,sum=0;
 while(i<n){frame.args[0]=i;sum+=evaluate(code,frame.args);i++;}
 return sum;
}
