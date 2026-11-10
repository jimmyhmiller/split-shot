// inputs: ["a-b", "c"]
// forbid-main: "x_y_z"\.replace|\.replace\(/-/
// A global RegExp of the script's top-level code that `replace` runs: its
// `lastIndex` goes back to 0, so no call changes it and each folds again.
const dash = /-/g;
function main(s) {
  return ["x-y-z".replace(dash, "_"), dash.lastIndex, s.length];
}
