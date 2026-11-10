import anonFn from './counter.mjs';
import { count, bump, tenfold, Box } from './reexport.mjs';
import * as all from './reexport.mjs';
import { shapeArea, Anon, shapes } from './reexport.mjs';
import ShapeDefault, { Box as ShapeBox, count as shapeCount } from './shapes.mjs';

export function main(input) {
  const before = count;
  bump(input);
  bump(1);
  let threw;
  try { count = 5; } catch (e) { threw = e.constructor.name; }
  return {
    before, after: count, live: all.count,
    ten: tenfold(input), area: shapeArea(input),
    names: [bump.name, tenfold.name, anonFn.name, Box.name, ShapeBox.name, ShapeDefault.name, Anon.name],
    box: new Box(input).doubled, kind: ShapeBox.kind, hello: new Anon().hello(),
    anon: anonFn(), shapeCount, nsCount: shapes.count,
    keys: Object.keys(all), tag: Object.prototype.toString.call(all), threw,
  };
}
