// inputs: [{"list":[1,2,3]}, {"list":[]}, {"list":[5,-5,7,8]}]
// max-lines: 24
// A loop condition with a choice in it whose test is known (lodash's `createBaseEach`: `while (fromRight ? index-- : ++index < length)`, `fromRight` false) is a runtime condition when the chosen side is: the dry run of the condition follows the choice instead of taking its test for the loop's. It was taken as a static loop, and unrolled to the engine's bound.
function main(input) {
  function createBaseEach(fromRight) {
    return function (collection, iteratee) {
      var length = collection.length, index = fromRight ? length : -1, iterable = Object(collection);
      while (fromRight ? index-- : ++index < length) {
        if (iteratee(iterable[index], index, iterable) === false) break;
      }
      return collection;
    };
  }
  var baseEach = createBaseEach(false);
  var s = 0;
  baseEach(input.list, function (v) { s += v; return v !== 7; });
  return s;
}
