// inputs: [{"x":1}, {"x":"a"}, {"x":null}]
// The receiver of a method call is read once, even when it is itself a property read and the arguments read more (`o.list.concat([o.x])`): a getter behind it runs once, before the arguments are read.
function main(input) {
  var log = [];
  Object.defineProperty(input, "list", { get: function () { log.push("list"); return [0]; } });
  Object.defineProperty(input, "y", { get: function () { log.push("y"); return input.x; } });
  var a = input.list.concat([input.y]);
  var b = input.list.concat([input.y]).concat(function () { return a; }).length;
  input.list.push(input.y, { k: input.y });
  return [a, b, log.join(",")];
}
