import fancy from 'fancy';
import { feature } from 'fancy/feat/one';
import { which } from '#internal';
import { f } from '#feat/alpha';
import { basename } from '#ospath';
import { selfRef } from 'my-app/util';
import old from 'oldpkg';
import { esm } from 'esmonly';
import thing from '@scope/thing';
export function main(input) {
  let excluded;
  try { require('x'); } catch (e) { excluded = e.name; }
  return { fancy: fancy(input), feature, which, f, base: basename('/a/b/c.txt'), selfRef, old: old.v, esm, thing };
}
