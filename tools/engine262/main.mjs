// engine262 (its ES module build, lib/engine262.mjs) evaluating one fixed
// program on a dynamic `x`: the specializer's first Futamura projection target.
import { Agent, setSurroundingAgent, ManagedRealm, Value, F, CreateDataProperty, skipDebugger } from './node_modules/@engine262/engine262/lib/engine262.mjs';

export function main(input) {
  setSurroundingAgent(new Agent({}));
  const realm = new ManagedRealm({});
  const pop = realm.pushTopContext();
  const c = CreateDataProperty(realm.GlobalObject, Value('x'), F(input));
  if (c && typeof c.next === 'function') skipDebugger(c);
  pop();
  const r = realm.evaluateScriptSkipDebugger('var s = 0; for (var i = 0; i < 10; i++) s += i * x; s + 1');
  return r.Value.value;
}
