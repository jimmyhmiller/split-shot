// Original binary WebAssembly interpreter. Supports a documented numeric MVP
// subset; unsupported encodings fail explicitly. Input modules must be valid
// WebAssembly (this decoder is not a full WebAssembly type validator).
export function decode(bytes) {
  let p = 0;
  function byte() { if (p >= bytes.length) throw new Error('truncated wasm'); return bytes[p++]; }
  function uint() { let n = 0, shift = 0; for (let i = 0; i < 5; i++) { const b = byte(); if (i === 4 && b > 15) throw new Error('invalid u32'); n += (b & 127) * 2 ** shift; if (b < 128) return n; shift += 7; } throw new Error('invalid u32'); }
  function sint() { let n = 0, shift = 0, b; do { b = byte(); n += (b & 127) * 2 ** shift; shift += 7; if (shift > 35) throw new Error('invalid i32'); } while (b & 128); return (b & 64 ? n - 2 ** shift : n) | 0; }
  function name() { const n = uint(); let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(byte()); return s; }
  function limits() { const flags = uint(), min = uint(); if (flags > 1) throw new Error('unsupported limits'); return { min, max: flags ? uint() : 65536 }; }
  function constant() { const op = byte(); let v; if (op === 65) v = sint(); else throw new Error('unsupported initializer'); if (byte() !== 11) throw new Error('initializer end'); return v; }
  for (const b of [0,97,115,109,1,0,0,0]) if (byte() !== b) throw new Error('bad wasm header');
  const m = { types: [], funcs: [], exports: {}, globals: [], table: [], pages: 0, data: [] };
  const functionTypes = [];
  while (p < bytes.length) {
    const id = byte(), size = uint(), end = p + size;
    if (end > bytes.length) throw new Error('truncated section');
    if (id === 0) p = end;
    else if (id === 1) { const n = uint(); for (let i = 0; i < n; i++) { if (byte() !== 96) throw new Error('unsupported type'); const params = [], results = []; let k = uint(); while (k--) params.push(byte()); k = uint(); while (k--) results.push(byte()); if (results.length > 1) throw new Error('multi-value unsupported'); m.types.push({ params, results }); } }
    else if (id === 3) { const n = uint(); for (let i = 0; i < n; i++) functionTypes.push(uint()); }
    else if (id === 4) { if (uint() !== 1 || byte() !== 112) throw new Error('unsupported table'); const l = limits(); for (let i = 0; i < l.min; i++) m.table.push(-1); }
    else if (id === 5) { if (uint() !== 1) throw new Error('unsupported memory count'); m.pages = limits().min; }
    else if (id === 6) { const n = uint(); for (let i = 0; i < n; i++) { const type = byte(), mutable = byte(); m.globals.push({ type, mutable, value: constant() }); } }
    else if (id === 7) { const n = uint(); for (let i = 0; i < n; i++) { const s = name(); m.exports[s] = { kind: byte(), index: uint() }; } }
    else if (id === 9) { const n = uint(); for (let i = 0; i < n; i++) { if (uint() !== 0) throw new Error('unsupported element segment'); const offset = constant(), count = uint(); if (offset < 0 || offset + count > m.table.length) throw new Error('element bounds'); for (let j = 0; j < count; j++) m.table[offset+j] = uint(); } }
    else if (id === 10) {
      const n = uint(); if (n !== functionTypes.length) throw new Error('function count');
      for (let i = 0; i < n; i++) {
        const length = uint(), bodyEnd = p + length, locals = [], code = [], open = [];
        const groups = uint(); for (let j = 0; j < groups; j++) { const count = uint(), type = byte(); for (let k = 0; k < count; k++) locals.push(type); }
        while (p < bodyEnd) {
          const op = byte(), ins = { op, arg: 0, end: 0, otherwise: -1, result: 0, offset: 0 };
          const pc = code.length;
          if (op >= 2 && op <= 4) { const t = byte(); if (t !== 64 && t !== 127 && t !== 126 && t !== 124) throw new Error('unsupported block type'); ins.result = t === 64 ? 0 : 1; open.push(pc); }
          else if (op === 5) { const start = open[open.length-1]; if (start === undefined || code[start].op !== 4) throw new Error('unexpected else'); code[start].otherwise = pc; }
          else if (op === 11) { if (open.length) { const start = open.pop(); code[start].end = pc; if (code[start].otherwise >= 0) code[code[start].otherwise].end = pc; } else if (p !== bodyEnd) throw new Error('unexpected end'); }
          else if (op === 12 || op === 13 || op === 16 || (op >= 32 && op <= 36)) ins.arg = uint();
          else if (op === 14) { ins.targets = []; const count = uint(); for (let j = 0; j <= count; j++) ins.targets.push(uint()); }
          else if (op === 17) { ins.arg = uint(); if (uint() !== 0) throw new Error('unsupported table index'); }
          else if (op >= 40 && op <= 62) { ins.arg = uint(); ins.offset = uint(); }
          else if (op === 63) { if (byte() !== 0) throw new Error('memory index'); }
          else if (op === 65) ins.arg = sint();
          else if (op === 66) { let v = 0n, shift = 0n, b; do { b = byte(); v |= BigInt(b & 127) << shift; shift += 7n; if (shift > 70n) throw new Error('invalid i64'); } while (b & 128); ins.arg = BigInt.asIntN(64, b & 64 ? v - (1n << shift) : v); }
          else if (op === 68) { const a = []; for (let k = 0; k < 8; k++) a.push(byte()); ins.arg = new DataView(new Uint8Array(a).buffer).getFloat64(0, true); }
          else if (![0,1,15,26,27,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,124,125,126,131,132,133,134,135,136,160,161,162,163,167,172,173].includes(op)) throw new Error('unsupported opcode ' + op);
          code.push(ins);
        }
        if (p !== bodyEnd || open.length || code[code.length-1].op !== 11) throw new Error('invalid function body');
        m.funcs.push({ type: functionTypes[i], locals, code });
      }
    }
    else if (id === 11) { const n = uint(); for (let i = 0; i < n; i++) { if (uint() !== 0) throw new Error('unsupported data segment'); const offset = constant(), count = uint(), data = []; for (let j = 0; j < count; j++) data.push(byte()); m.data.push({ offset, data }); } }
    else throw new Error('unsupported section ' + id);
    if (p !== end) throw new Error('section length mismatch');
  }
  return m;
}

export function instantiate(m) {
  const memory = new ArrayBuffer(m.pages * 65536), view = new DataView(memory);
  for (const segment of m.data) { if (segment.offset < 0 || segment.offset + segment.data.length > memory.byteLength) throw new Error('data bounds'); new Uint8Array(memory).set(segment.data, segment.offset); }
  return { memory, view, globals: m.globals.map(g => g.value) };
}

export function invoke(m, state, index, args) {
  const f = m.funcs[index], type = m.types[f.type], locals = args.slice(), stack = [];
  for (const t of f.locals) locals.push(t === 126 ? 0n : 0);
  const code = f.code;
  const labels = [{ loop: false, target: code.length, height: 0, arity: type.results.length }];
  let pc = 0;
  function branch(depth) {
    const at = labels.length - 1 - depth, label = labels[at];
    const value = label.arity ? stack.pop() : 0;
    stack.length = label.height; if (label.arity) stack.push(value);
    labels.length = at + (label.loop ? 1 : 0); pc = label.target;
  }
  while (pc < code.length) {
    const ins = code[pc], op = ins.op; pc++;
    if (op === 0) throw new Error('unreachable');
    else if (op === 1) {}
    else if (op >= 2 && op <= 4) {
      const cond = op === 4 ? stack.pop() : 1;
      labels.push({ loop: op === 3, target: op === 3 ? pc : ins.end + 1, height: stack.length, arity: op === 3 ? 0 : ins.result });
      if (!cond) { if (ins.otherwise >= 0) pc = ins.otherwise + 1; else { labels.pop(); pc = ins.end + 1; } }
    }
    else if (op === 5) { labels.pop(); pc = ins.end + 1; }
    else if (op === 11) labels.pop();
    else if (op === 12) branch(ins.arg);
    else if (op === 13) { if (stack.pop()) branch(ins.arg); }
    else if (op === 14) { const i = stack.pop() >>> 0; branch(ins.targets[Math.min(i, ins.targets.length-1)]); }
    else if (op === 15) { const result = type.results.length ? stack.pop() : undefined; return result; }
    else if (op === 16 || op === 17) {
      let callee = ins.arg;
      if (op === 17) { callee = m.table[stack.pop() >>> 0]; if (callee === undefined || callee < 0) throw new Error('indirect call bounds'); const actual = m.types[m.funcs[callee].type], expected = m.types[ins.arg]; if (actual.params.join(',') !== expected.params.join(',') || actual.results.join(',') !== expected.results.join(',')) throw new Error('indirect call type'); }
      const ct = m.types[m.funcs[callee].type], a = stack.splice(stack.length - ct.params.length, ct.params.length);
      const value = invoke(m, state, callee, a); if (ct.results.length) stack.push(value);
    }
    else if (op === 26) stack.pop();
    else if (op === 27) { const c = stack.pop(), b = stack.pop(), a = stack.pop(); stack.push(c ? a : b); }
    else if (op === 32) stack.push(locals[ins.arg]);
    else if (op === 33) locals[ins.arg] = stack.pop();
    else if (op === 34) locals[ins.arg] = stack[stack.length-1];
    else if (op === 35) stack.push(state.globals[ins.arg]);
    else if (op === 36) { if (!m.globals[ins.arg].mutable) throw new Error('immutable global'); state.globals[ins.arg] = stack.pop(); }
    else if (op >= 40 && op <= 62) {
      const store = op >= 54, value = store ? stack.pop() : 0, address = (stack.pop() >>> 0) + ins.offset;
      const v = state.view; let result;
      // DataView performs the required bounds trap; addresses never wrap.
      switch (op) {
        case 40: result = v.getInt32(address,true); break;
        case 41: result = v.getBigInt64(address,true); break;
        case 43: result = v.getFloat64(address,true); break;
        case 44: result = v.getInt8(address); break;
        case 45: result = v.getUint8(address); break;
        case 46: result = v.getInt16(address,true); break;
        case 47: result = v.getUint16(address,true); break;
        case 54: v.setInt32(address,value,true); break;
        case 55: v.setBigInt64(address,value,true); break;
        case 57: v.setFloat64(address,value,true); break;
        case 58: v.setInt8(address,value); break;
        case 59: v.setInt16(address,value,true); break;
        default: throw new Error('unsupported memory opcode ' + op);
      }
      if (!store) stack.push(result);
    }
    else if (op === 63) stack.push(state.memory.byteLength / 65536);
    else if (op === 65 || op === 66 || op === 68) stack.push(ins.arg);
    else if (op === 69) stack.push(stack.pop() === 0 ? 1 : 0);
    else if (op === 80) stack.push(stack.pop() === 0n ? 1 : 0);
    else if (op === 103) stack.push(Math.clz32(stack.pop()));
    else if (op === 104) { let x = stack.pop() >>> 0, n = 0; if (!x) n = 32; else while (!(x & 1)) { n++; x >>>= 1; } stack.push(n); }
    else if (op === 105) { let x = stack.pop(), n = 0; while (x) { x &= x-1; n++; } stack.push(n); }
    else if (op === 167) stack.push(Number(BigInt.asIntN(32,stack.pop())));
    else if (op === 172) stack.push(BigInt(stack.pop() | 0));
    else if (op === 173) stack.push(BigInt(stack.pop() >>> 0));
    else {
      const b = stack.pop(), a = stack.pop(); let r;
      switch (op) {
        case 70: case 81: case 97: r = a === b ? 1 : 0; break;
        case 71: case 82: case 98: r = a !== b ? 1 : 0; break;
        case 72: case 83: case 99: r = a < b ? 1 : 0; break;
        case 74: case 85: case 100: r = a > b ? 1 : 0; break;
        case 76: case 87: case 101: r = a <= b ? 1 : 0; break;
        case 78: case 89: case 102: r = a >= b ? 1 : 0; break;
        case 73: r = (a>>>0) < (b>>>0) ? 1 : 0; break;
        case 75: r = (a>>>0) > (b>>>0) ? 1 : 0; break;
        case 77: r = (a>>>0) <= (b>>>0) ? 1 : 0; break;
        case 79: r = (a>>>0) >= (b>>>0) ? 1 : 0; break;
        case 84: r = BigInt.asUintN(64,a) < BigInt.asUintN(64,b) ? 1 : 0; break;
        case 86: r = BigInt.asUintN(64,a) > BigInt.asUintN(64,b) ? 1 : 0; break;
        case 88: r = BigInt.asUintN(64,a) <= BigInt.asUintN(64,b) ? 1 : 0; break;
        case 90: r = BigInt.asUintN(64,a) >= BigInt.asUintN(64,b) ? 1 : 0; break;
        case 106: r = (a+b)|0; break;
        case 107: r = (a-b)|0; break;
        case 108: r = Math.imul(a,b); break;
        case 109: if (!b || (a === -2147483648 && b === -1)) throw new Error('division trap'); r = (a/b)|0; break;
        case 110: if (!b) throw new Error('division trap'); r = ((a>>>0)/(b>>>0))|0; break;
        case 111: if (!b) throw new Error('division trap'); r = (a%b)|0; break;
        case 112: if (!b) throw new Error('division trap'); r = ((a>>>0)%(b>>>0))|0; break;
        case 113: r = a&b; break;
        case 114: r = a|b; break;
        case 115: r = a^b; break;
        case 116: r = a<<b; break;
        case 117: r = a>>b; break;
        case 118: r = (a>>>b)|0; break;
        case 119: r = (a<<b)|(a>>>((-b)&31)); break;
        case 120: r = (a>>>b)|(a<<((-b)&31)); break;
        case 124: r = BigInt.asIntN(64,a+b); break;
        case 125: r = BigInt.asIntN(64,a-b); break;
        case 126: r = BigInt.asIntN(64,a*b); break;
        case 131: r = a&b; break;
        case 132: r = a|b; break;
        case 133: r = a^b; break;
        case 134: r = BigInt.asIntN(64,a<<(b&63n)); break;
        case 135: r = a>>(b&63n); break;
        case 136: r = BigInt.asIntN(64,BigInt.asUintN(64,a)>>(b&63n)); break;
        case 160: r = a+b; break;
        case 161: r = a-b; break;
        case 162: r = a*b; break;
        case 163: r = a/b; break;
        default: throw new Error('unsupported opcode ' + op);
      }
      stack.push(r);
    }
  }
  return type.results.length ? stack.pop() : undefined;
}
