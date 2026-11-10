import lib, { named, missingLater } from './lib.cjs';
import * as libNs from './lib.cjs';
import conf from './conf.json' with { type: 'json' };
import { basename } from 'node:path';
import { createRequire } from 'node:module';
const viaReq = createRequire(import.meta.url);
export async function main(input) {
  const esmFromCjs = (await import('./uses-require.cjs')).default;
  const dyn = await import('./later.mjs');
  return {
    def: lib.value, named: named(input), nsKeys: Object.keys(libNs), nsDefaultSame: libNs.default === lib,
    esModule: lib.__esModule === true, missingLater,
    conf, base: basename(import.meta.url), dirOk: import.meta.dirname.endsWith('interop'),
    esmFromCjs, dyn: dyn.lateValue(input), dynTag: Object.prototype.toString.call(dyn),
  };
}
