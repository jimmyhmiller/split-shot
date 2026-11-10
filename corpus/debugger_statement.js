// inputs: [0, 4]
// forbid: debugger
// `debugger;` does nothing when no debugger is attached.
function main(input) {
  debugger;
  let s = 0;
  for (let i = 0; i < input; i++) { debugger; s += i; }
  return s;
}
