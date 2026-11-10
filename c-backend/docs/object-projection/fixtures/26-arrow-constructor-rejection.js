// @case {"description": "An arrow is callable but not constructible, so new throws TypeError.", "errorNameOnly": true}
function main(x) { var f = () => x; return new f(); }
