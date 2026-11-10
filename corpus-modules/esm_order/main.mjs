import './left.mjs';
import { r } from './right.mjs';
import cj from './dep.cjs';
console.log('main body', r, cj.tag);
export function main(input) { return input; }
