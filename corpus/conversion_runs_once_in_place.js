// inputs: [{"list":[1,2]}, {"list":["a"]}, {"list":[[3],4]}, {"list":[]}]
// A conversion of a value that may be an object (`"" + list`, `list + "!"`, `+list[1]`) runs that object's own code, so it is done once, where the program does it: before the writes that follow, and not again at each use of the result. So for one stored in an object or an array.
function show(list) { var s = "" + list; list.push(9); return s; }
function main(input) {
  var o = input.list;
  var a = show(o);
  var t = o + "!";
  var box = { text: "<" + o + ">", parts: [o + "", o.length] };
  o[0] = "z";
  var n = +o[1] + 1;
  var twice = t + t;
  o.pop();
  return [a, t, n, twice, box.text, box.parts, "" + o];
}
