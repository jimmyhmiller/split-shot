import { tag, callable, log } from './deco.mts';

@tag('outer') @tag('inner')
class Point {
  static field = 'set';
  constructor(public x: number) {}
}

@callable((_t, _this, [v]) => new Value(v as number * 10))
export class Value {
  // (engine262's pattern: inside the class, its name is the decorated class.)
  static selfIsDecorated = () => Value;
  sawNewTarget: boolean;
  constructor(public v: number) { this.sawNewTarget = new.target === Value; }
  get twice() { return this.v * 2; }
  static make(n: number) { return new Value(n); }
}

export function main(input: number) {
  const p = new Point(input);
  const viaCall = (Value as any)(input);
  return {
    log, x: p.x, name: Point.name,
    called: viaCall.v, isValue: viaCall instanceof Value, newed: new Value(input).twice,
    made: Value.make(input).v, valueName: Value.name, typeofValue: typeof Value,
    newTargetIsDecorated: new Value(1).sawNewTarget, innerIsOuter: Value.selfIsDecorated() === Value,
  };
}
