// @case {"description": "Keep booleans, numbers, null, undefined, strings, and signed zero distinct."}
function main(x) {
  return [false, true, 0, -0, 1, null, undefined, "", "hi", x,
    false === 0, true === 1, null === undefined, null == undefined,
    false == 0, !null, !undefined, !!x, 1 / x];
}
