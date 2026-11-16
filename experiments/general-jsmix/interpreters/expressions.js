// Arithmetic expressions as trees: ["num", n], ["input"] (the next number
// read), ["+", a, b], ["-", a, b], ["*", a, b], ["<", a, b],
// ["if", test, yes, no] and ["print", e] (prints and gives the value).
function interp(program, io) {
  return ev(program, io);
}

function ev(e, io) {
  var op = e[0];
  if (op === "num") {
    return e[1];
  }
  if (op === "input") {
    return io.read();
  }
  if (op === "+") {
    return ev(e[1], io) + ev(e[2], io);
  }
  if (op === "-") {
    return ev(e[1], io) - ev(e[2], io);
  }
  if (op === "*") {
    return ev(e[1], io) * ev(e[2], io);
  }
  if (op === "<") {
    return ev(e[1], io) < ev(e[2], io);
  }
  if (op === "if") {
    return ev(e[1], io) ? ev(e[2], io) : ev(e[3], io);
  }
  if (op === "print") {
    var value = ev(e[1], io);
    io.print(value);
    return value;
  }
  throw new Error("Unknown expression: " + op);
}
