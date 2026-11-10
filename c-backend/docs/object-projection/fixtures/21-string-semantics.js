// @case {"description": "Primitive concatenation, numeric parsing and comparisons preserve UTF-16 strings."}
function main(x) {
  return ["x=" + x, "" + null, "" + undefined, "" + false,
    "12" + 3, "12" - 3, "10" < "2", "10" < 2,
    +"  0x10  ", +"-0", +"Infinity", "line\n\u0000\u03bb\ud83d\ude80"];
}
