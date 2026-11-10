import { Square, centroid, identity, colorOf, boosted } from './shapes.mts';
import { Color, Tone } from './types.mts';
import type { Shape } from './types.mts';
// (`Shape` is used only as a type: TypeScript elides it.)
export function main(input: number) {
  const s: Shape = new Square(input);
  const sq = s as Square;
  return {
    area: s.area(), desc: sq.describe(input), name: s.name,
    hasDebug: 'debugOnly' in sq, keys: Object.keys(sq).sort(),
    mid: centroid([{ x: 0, y: 0 }, { x: input, y: input * 2 }]),
    id: identity<string>('x' + input), color: colorOf(Color.Blue), colorNum: Color.Green,
    reverse: Color[6], tone: Tone.Cool, toneKeys: Object.keys(Tone), boosted,
  };
}
