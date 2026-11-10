import arrowDefault from './defaults/arrow.mjs';
import classDefault from './defaults/klass.mjs';
import valueDefault from './defaults/value.mjs';
import * as viaOne from './state.mjs';
import * as viaTwo from './sub/../state.mjs';
import { incr, value } from './state.mjs';
const topThis = this;
const argsType = typeof arguments;
export function main(input) {
  incr(input);
  let reflect = Object.getOwnPropertyDescriptor(viaOne, 'value');
  let setThrew;
  try { viaOne.value = 9; } catch (e) { setThrew = e.constructor.name; }
  return {
    names: [arrowDefault.name, classDefault.name, valueDefault.name ?? null],
    sameInstance: viaOne === viaTwo, live: [value, viaOne.value],
    topThis: topThis === undefined, argsType, enumerable: reflect.enumerable, configurable: reflect.configurable,
    extensible: Object.isExtensible(viaOne), proto: Object.getPrototypeOf(viaOne), setThrew,
    metaResolveOk: import.meta.resolve('./state.mjs').endsWith('/state.mjs'),
    arrow: arrowDefault(input), klass: new classDefault().k, value: valueDefault,
  };
}
