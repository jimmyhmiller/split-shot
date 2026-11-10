import type { Shape, Id } from './types.mts';
import { type Geometry, realValue, Color } from './types.mts';

export abstract class Base implements Shape {
  declare debugOnly: string;
  abstract area(): number;
  [key: string]: unknown;
  constructor(public readonly name: string, protected scale: number = 1) {}
  describe(this: Base, id?: Id): string { return `${id ?? 'anon'}:${this.name}:${this.area()}`; }
}
export class Square extends Base {
  side!: number;
  constructor(side: number) { super('square', 2); this.side = side; }
  override area(): number { return this.side * this.side * this.scale; }
}
export function centroid(p: Geometry.Pair): Geometry.Point {
  return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
}
export function identity<T>(v: T): T { return v; }
export const colorOf = (c: Color): string => Color[c]!;
export const boosted = realValue satisfies number;
