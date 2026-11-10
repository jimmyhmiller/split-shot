function entry(x){function expr(p,e){var t=p[0];if(t===0)return p[1];if(t===1)return e.values[p[1]];if(t===2)return expr(p[1],e)+expr(p[2],e);if(t===4)return expr(p[1],e)<expr(p[2],e);return undefined;}
function stmt(p,e){var t=p[0];if(t===1){e.values[p[1]]=expr(p[2],e);return;}if(t===2){while(expr(p[1],e)){e.values=e.values;stmt(p[2],e);}return;}if(t===3){var i=0;while(i<p[1].length){stmt(p[1][i],e);i=i+1;}}}
var e={values:[x,0,0]};stmt([3,[[1,1,[0,0]],[1,2,[0,0]],[2,[4,[1,1],[1,0]],[3,[[1,2,[2,[1,2],[1,1]]],[1,1,[2,[1,1],[0,1]]]]]]]],e);return e.values[2];}
