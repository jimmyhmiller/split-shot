var __s0 = "flowchart: unbound variable residual";
var __s1 = "flowchart: unbound variable code";
var __s2 = "flowchart: unbound variable jump";
var __s3 = "flowchart: unbound variable seen";

let __pe_entry;

function __rf0(store) {
  "use strict";
  if (!store.has("vs")) {
    throw new Error("flowchart: unbound variable vs");
  }
  return store.get("vs");
}

function __rf1(store) {
  "use strict";
  if (!store.has("vs")) {
    throw new Error("flowchart: unbound variable vs");
  }
  return store.get("vs");
}

function __rf2(store) {
  "use strict";
  if (!store.has("vs")) {
    throw new Error("flowchart: unbound variable vs");
  }
  return store.get("vs");
}

function __rf3(a, b) {
  "use strict";
  let c, pairs, d, i, x, y;
  let __pc = 0;
  for (;;) {
    switch (__pc) {
      case 0: {
        if (!(a === b)) { __pc = 1; } else { __pc = 2; } break;
      }
      case 1: {
        c = !Array.isArray(a);
        if (!(c)) { __pc = 4; } else { __pc = 5; } break;
      }
      case 2: {
        pairs = [];
        __pc = 9; break;
      }
      case 3: {
        return true;
      }
      case 4: {
        c = !Array.isArray(b);
        __pc = 6; break;
      }
      case 5: {
        __pc = 6; break;
      }
      case 6: {
        d = c ? void 0 : a.length !== b.length;
        if (!(c ? c : d)) { __pc = 7; } else { __pc = 8; } break;
      }
      case 7: {
        pairs = [];
        i = 0;
        x = a;
        y = b;
        __pc = 16; break;
      }
      case 8: {
        return false;
      }
      case 9: {
        if (!(pairs.length > 0)) { __pc = 3; } else { __pc = 10; } break;
      }
      case 10: {
        c = pairs.pop();
        x = c[0];
        y = c[1];
        if (!(x === y)) { __pc = 11; } else { __pc = 9; } break;
      }
      case 11: {
        c = !Array.isArray(x);
        if (!(c)) { __pc = 12; } else { __pc = 13; } break;
      }
      case 12: {
        c = !Array.isArray(y);
        __pc = 14; break;
      }
      case 13: {
        __pc = 14; break;
      }
      case 14: {
        d = c ? void 0 : x.length !== y.length;
        if (!(c ? c : d)) { __pc = 15; } else { __pc = 8; } break;
      }
      case 15: {
        i = 0;
        __pc = 16; break;
      }
      case 16: {
        if (!(i < x.length)) { __pc = 9; } else { __pc = 17; } break;
      }
      case 17: {
        pairs.push;
        c = [x[i], y[i]];
        pairs.push(c);
        i += 1;
        __pc = 16; break;
      }
    }
  }
}

function __rf4(store) {
  "use strict";
  if (!store.has("code")) {
    throw new Error(__s1);
  }
  return store.get("code");
}

function __rf5(store) {
  "use strict";
  if (!store.has("vs")) {
    throw new Error("flowchart: unbound variable vs");
  }
  return store.get("vs");
}

function __rf6(store) {
  "use strict";
  if (!store.has("pp")) {
    throw new Error("flowchart: unbound variable pp");
  }
  return store.get("pp");
}

let __x1000015, __x1000018, __x1000020, __x1000025, __x1000027, __x1000066, __x1000069, __x1000071, __x1000076, __x1000078, __x1000086, __x1000091, __x1000095, __x1000099, __x1000104, __x1000110, __x1000112, __x1000115, __x1000118, __x1000120, __x1000122, __x1000212, __x1000214, __x1000240, __x1000299, __x1000348, __x1000464, __x1000495, __x1000635, __x1001029, __x1001045, __x1001078, __x1001126, __x1001142, __x1001158, __x1001178, __x1001238, __x1001241, __x1001265, __x1001267, __x1001273, __x1001296, __x1001311, __x1001331, __x1001382;
(function () {
  "use strict";
  __x1000015 = ["var", "setAt"];
  Object.freeze(__x1000015);
  __x1000018 = ["var", "tape"];
  Object.freeze(__x1000018);
  __x1000020 = ["var", "ptr"];
  Object.freeze(__x1000020);
  __x1000025 = ["var", "tape"];
  Object.freeze(__x1000025);
  __x1000027 = ["var", "ptr"];
  Object.freeze(__x1000027);
  __x1000066 = ["var", "setAt"];
  Object.freeze(__x1000066);
  __x1000069 = ["var", "tape"];
  Object.freeze(__x1000069);
  __x1000071 = ["var", "ptr"];
  Object.freeze(__x1000071);
  __x1000076 = ["var", "tape"];
  Object.freeze(__x1000076);
  __x1000078 = ["var", "ptr"];
  Object.freeze(__x1000078);
  __x1000095 = ["var", "ptr"];
  Object.freeze(__x1000095);
  __x1000099 = ["var", "ptr"];
  Object.freeze(__x1000099);
  __x1000104 = ["var", "out"];
  Object.freeze(__x1000104);
  __x1000110 = ["var", "tape"];
  Object.freeze(__x1000110);
  __x1000112 = ["var", "ptr"];
  Object.freeze(__x1000112);
  __x1000115 = ["var", "setAt"];
  Object.freeze(__x1000115);
  __x1000118 = ["var", "tape"];
  Object.freeze(__x1000118);
  __x1000120 = ["var", "ptr"];
  Object.freeze(__x1000120);
  __x1000122 = ["var", "input"];
  Object.freeze(__x1000122);
  __x1000212 = ["var", "tape"];
  Object.freeze(__x1000212);
  __x1000214 = ["var", "ptr"];
  Object.freeze(__x1000214);
  __x1001265 = ["var", "tape"];
  Object.freeze(__x1001265);
  __x1001267 = ["var", "ptr"];
  Object.freeze(__x1001267);
  __x1000091 = ["var", "out"];
  Object.freeze(__x1000091);
  __x1000495 = [];
  Object.freeze(__x1000495);
  __x1001126 = [];
  Object.freeze(__x1001126);
  __x1001142 = [];
  Object.freeze(__x1001142);
  __x1000635 = [];
  Object.freeze(__x1000635);
  __x1001158 = [];
  Object.freeze(__x1001158);
  __x1000299 = [];
  Object.freeze(__x1000299);
  __x1000348 = [];
  Object.freeze(__x1000348);
  __x1001238 = ["input"];
  Object.freeze(__x1001238);
  __x1000086 = ["input"];
  Object.freeze(__x1000086);
  __x1001178 = [];
  Object.freeze(__x1001178);
  __x1000464 = [];
  Object.freeze(__x1000464);
  __x1000240 = [];
  Object.freeze(__x1000240);
  __x1001029 = [];
  Object.freeze(__x1001029);
  __x1001273 = [];
  Object.freeze(__x1001273);
  __x1001045 = [];
  Object.freeze(__x1001045);
  __x1001296 = [];
  Object.freeze(__x1001296);
  __x1001241 = ["input"];
  Object.freeze(__x1001241);
  __x1001311 = [];
  Object.freeze(__x1001311);
  __x1001078 = [];
  Object.freeze(__x1001078);
  __x1001382 = ["input"];
  Object.freeze(__x1001382);
  __x1001331 = [];
  Object.freeze(__x1001331);
})();
export function main(program) {
  "use strict";
  let c, d, b, e, a, f, g, k, h, l, a2, out, values, store, i, state, seen, pairs, a1, j, x, y;
  let __pc = 0;
  for (;;) {
    switch (__pc) {
      case 0: {
        c = [program, void 0, void 0, void 0, void 0, void 0];
        d = ["L1", c];
        d = [d];
        d = ["seen", d];
        b = ["residual", __x1000495];
        e = ["n", 0];
        a = ["pp", "L1"];
        f = [program, 0, 0, void 0, void 0, void 0];
        f = ["vs", f];
        g = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        g = ["lit", g];
        g = ["=", "tape", g];
        k = ["lit", 0];
        k = ["=", "ptr", k];
        h = [];
        h = ["lit", h];
        h = ["=", "out", h];
        g = [g, k, h];
        g = ["code", g];
        k = ["jump", null];
        h = ["yes", void 0];
        l = ["no", void 0];
        c = ["vs0", c];
        c = [d, b, e, a, f, g, k, h, l, c];
        if (!(0 < program.length)) { __pc = 1; } else { __pc = 2; } break;
      }
      case 1: {
        c = new Map(c);
        __pc = 364; break;
      }
      case 2: {
        c = new Map(c);
        __pc = 193; break;
      }
      case 3: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 4; } else { __pc = 5; } break;
      }
      case 4: {
        b = c.get("vs");
        if (!(!c.has("vs"))) { __pc = 6; } else { __pc = 7; } break;
      }
      case 5: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 6: {
        e = b;
        b = c.get("vs");
        a2 = b[0][b[2]];
        b = e.slice();
        b[3] = a2;
        d.call(c, "vs", b);
        if (!(!c.has("vs"))) { __pc = 8; } else { __pc = 9; } break;
      }
      case 7: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 8: {
        b = c.get("vs");
        d = b[3];
        b[0];
        b[1];
        b[2];
        b[3];
        b[4];
        b[5];
        if (!(d === "+")) { __pc = 723; } else { __pc = 10; } break;
      }
      case 9: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 10: {
        d = c.set;
        if (!(!c.has("code"))) { __pc = 11; } else { __pc = 12; } break;
      }
      case 11: {
        b = c.get("code");
        if (!(!c.has("vs"))) { __pc = 13; } else { __pc = 14; } break;
      }
      case 12: {
        throw new Error(__s1);
      }
      case 13: {
        e = b;
        b = c.get("vs");
        out = [__x1000018];
        values = b;
        out.push;
        out.push(__x1000020);
        out.push;
        b = ["bin", "%", ["bin", "+", ["idx", __x1000025, __x1000027], ["lit", 1]], ["lit", 256]];
        values[0];
        values[1];
        values[2];
        values[3];
        values[4];
        values[5];
        out.push(b);
        b = e.concat([["=", "tape", ["call", __x1000015, out]]]);
        d.call(c, "code", b);
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 15; } else { __pc = 16; } break;
      }
      case 14: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 15: {
        b = c.get("vs");
        if (!(!c.has("vs"))) { __pc = 17; } else { __pc = 18; } break;
      }
      case 16: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 17: {
        e = b;
        b = c.get("vs");
        a2 = b[2] + 1;
        b = e.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        if (!(!c.has("vs"))) { __pc = 19; } else { __pc = 20; } break;
      }
      case 18: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 19: {
        b = c.get("vs");
        d = b[2];
        e = (b[0]).length;
        b[0];
        b[1];
        b[2];
        b[3];
        b[4];
        b[5];
        if (!(d < e)) { __pc = 21; } else { __pc = 3; } break;
      }
      case 20: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 21: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 22; } else { __pc = 23; } break;
      }
      case 22: {
        c.get("vs");
        d.call(c, "jump", ["return", __x1000091]);
        d = c.set;
        if (!(!c.has("residual"))) { __pc = 24; } else { __pc = 25; } break;
      }
      case 23: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 24: {
        b = c.get("residual");
        if (!(!c.has("n"))) { __pc = 26; } else { __pc = 27; } break;
      }
      case 25: {
        throw new Error(__s0);
      }
      case 26: {
        e = b;
        b = c.get("n");
        if (!(!c.has("code"))) { __pc = 28; } else { __pc = 29; } break;
      }
      case 27: {
        throw new Error("flowchart: unbound variable n");
      }
      case 28: {
        a = "S" + b;
        b = c.get("code");
        if (!(!c.has("jump"))) { __pc = 30; } else { __pc = 31; } break;
      }
      case 29: {
        throw new Error(__s1);
      }
      case 30: {
        f = b;
        b = c.get("jump");
        b = e.concat([[a, f, b]]);
        d.call(c, "residual", b);
        if (!(!c.has("pp"))) { __pc = 32; } else { __pc = 33; } break;
      }
      case 31: {
        throw new Error(__s2);
      }
      case 32: {
        b = c.get("pp");
        if (!("L7" === b)) { __pc = 243; } else { __pc = 34; } break;
      }
      case 33: {
        throw new Error("flowchart: unbound variable pp");
      }
      case 34: {
        c.set("code", __x1000299);
        c.set("jump", null);
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 35; } else { __pc = 36; } break;
      }
      case 35: {
        b = c.get("vs");
        if (!(!c.has("vs"))) { __pc = 37; } else { __pc = 38; } break;
      }
      case 36: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 37: {
        e = b;
        b = c.get("vs");
        a2 = b[2] + 1;
        b = e.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        if (!(!c.has("vs"))) { __pc = 39; } else { __pc = 40; } break;
      }
      case 38: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 39: {
        b = c.get("vs");
        d = b[2];
        e = (b[0]).length;
        b[0];
        b[1];
        b[2];
        b[3];
        b[4];
        b[5];
        if (!(d < e)) { __pc = 59; } else { __pc = 41; } break;
      }
      case 40: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 41: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 42; } else { __pc = 43; } break;
      }
      case 42: {
        b = c.get("vs");
        if (!(!c.has("vs"))) { __pc = 44; } else { __pc = 45; } break;
      }
      case 43: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 44: {
        e = b;
        b = c.get("vs");
        a2 = b[0][b[2]];
        b = e.slice();
        b[3] = a2;
        d.call(c, "vs", b);
        if (!(!c.has("vs"))) { __pc = 46; } else { __pc = 47; } break;
      }
      case 45: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 46: {
        b = c.get("vs");
        d = b[3];
        b[0];
        b[1];
        b[2];
        b[3];
        b[4];
        b[5];
        if (!(d === "+")) { __pc = 628; } else { __pc = 48; } break;
      }
      case 47: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 48: {
        d = c.set;
        if (!(!c.has("code"))) { __pc = 49; } else { __pc = 50; } break;
      }
      case 49: {
        b = c.get("code");
        if (!(!c.has("vs"))) { __pc = 51; } else { __pc = 52; } break;
      }
      case 50: {
        throw new Error(__s1);
      }
      case 51: {
        e = b;
        c.get("vs");
        b = e.concat([["=", "tape", ["call", __x1000015, [__x1000018, __x1000020, ["bin", "%", ["bin", "+", ["idx", __x1000025, __x1000027], ["lit", 1]], ["lit", 256]]]]]]);
        d.call(c, "code", b);
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 53; } else { __pc = 54; } break;
      }
      case 52: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 53: {
        b = c.get("vs");
        if (!(!c.has("vs"))) { __pc = 55; } else { __pc = 56; } break;
      }
      case 54: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 55: {
        e = b;
        b = c.get("vs");
        a2 = b[2] + 1;
        b = e.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        if (!(!c.has("vs"))) { __pc = 57; } else { __pc = 58; } break;
      }
      case 56: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 57: {
        b = c.get("vs");
        d = b[2];
        e = (b[0]).length;
        b[0];
        b[1];
        b[2];
        b[3];
        b[4];
        b[5];
        if (!(d < e)) { __pc = 59; } else { __pc = 41; } break;
      }
      case 58: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 59: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 60; } else { __pc = 61; } break;
      }
      case 60: {
        c.get("vs");
        d.call(c, "jump", ["return", __x1000091]);
        d = c.set;
        if (!(!c.has("residual"))) { __pc = 62; } else { __pc = 63; } break;
      }
      case 61: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 62: {
        b = c.get("residual");
        if (!(!c.has("n"))) { __pc = 64; } else { __pc = 65; } break;
      }
      case 63: {
        throw new Error(__s0);
      }
      case 64: {
        e = b;
        b = c.get("n");
        if (!(!c.has("code"))) { __pc = 66; } else { __pc = 67; } break;
      }
      case 65: {
        throw new Error("flowchart: unbound variable n");
      }
      case 66: {
        a = "S" + b;
        b = c.get("code");
        if (!(!c.has("jump"))) { __pc = 68; } else { __pc = 69; } break;
      }
      case 67: {
        throw new Error(__s1);
      }
      case 68: {
        f = b;
        b = c.get("jump");
        b = e.concat([[a, f, b]]);
        d.call(c, "residual", b);
        if (!(!c.has("pp"))) { __pc = 70; } else { __pc = 71; } break;
      }
      case 69: {
        throw new Error(__s2);
      }
      case 70: {
        b = c.get("pp");
        if (!("L41" === b)) { __pc = 246; } else { __pc = 72; } break;
      }
      case 71: {
        throw new Error("flowchart: unbound variable pp");
      }
      case 72: {
        c.set("code", __x1000348);
        c.set("jump", null);
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 73; } else { __pc = 74; } break;
      }
      case 73: {
        b = c.get("vs");
        if (!(!c.has("vs"))) { __pc = 75; } else { __pc = 76; } break;
      }
      case 74: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 75: {
        e = b;
        c.get("vs");
        b = e.slice();
        b[5] = 1;
        d.call(c, "vs", b);
        if (!(!c.has("vs"))) { __pc = 77; } else { __pc = 78; } break;
      }
      case 76: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 77: {
        b = c.get("vs");
        d = b[5];
        b[0];
        b[1];
        b[2];
        b[3];
        b[4];
        b[5];
        if (!(d > 0)) { __pc = 332; } else { __pc = 79; } break;
      }
      case 78: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 79: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 80; } else { __pc = 81; } break;
      }
      case 80: {
        b = c.get("vs");
        if (!(!c.has("vs"))) { __pc = 82; } else { __pc = 83; } break;
      }
      case 81: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 82: {
        e = b;
        b = c.get("vs");
        a2 = b[2] - 1;
        b = e.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        if (!(!c.has("vs"))) { __pc = 84; } else { __pc = 85; } break;
      }
      case 83: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 84: {
        b = c.get("vs");
        d = b[0][b[2]];
        b[0];
        b[1];
        b[2];
        b[3];
        b[4];
        b[5];
        if (!(d === "]")) { __pc = 107; } else { __pc = 86; } break;
      }
      case 85: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 86: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 87; } else { __pc = 88; } break;
      }
      case 87: {
        b = c.get("vs");
        if (!(!c.has("vs"))) { __pc = 89; } else { __pc = 90; } break;
      }
      case 88: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 89: {
        e = b;
        b = c.get("vs");
        a2 = b[5] + 1;
        b = e.slice();
        b[5] = a2;
        d.call(c, "vs", b);
        if (!(!c.has("vs"))) { __pc = 91; } else { __pc = 92; } break;
      }
      case 90: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 91: {
        b = c.get("vs");
        d = b[0][b[2]];
        b[0];
        b[1];
        b[2];
        b[3];
        b[4];
        b[5];
        if (!(d === "[")) { __pc = 625; } else { __pc = 93; } break;
      }
      case 92: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 93: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 94; } else { __pc = 95; } break;
      }
      case 94: {
        b = c.get("vs");
        if (!(!c.has("vs"))) { __pc = 96; } else { __pc = 97; } break;
      }
      case 95: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 96: {
        e = b;
        b = c.get("vs");
        a2 = b[5] - 1;
        b = e.slice();
        b[5] = a2;
        d.call(c, "vs", b);
        if (!(!c.has("vs"))) { __pc = 98; } else { __pc = 99; } break;
      }
      case 97: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 98: {
        b = c.get("vs");
        d = b[5];
        b[0];
        b[1];
        b[2];
        b[3];
        b[4];
        b[5];
        if (!(d > 0)) { __pc = 117; } else { __pc = 100; } break;
      }
      case 99: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 100: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 101; } else { __pc = 102; } break;
      }
      case 101: {
        b = c.get("vs");
        if (!(!c.has("vs"))) { __pc = 103; } else { __pc = 104; } break;
      }
      case 102: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 103: {
        e = b;
        b = c.get("vs");
        a2 = b[2] - 1;
        b = e.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        if (!(!c.has("vs"))) { __pc = 105; } else { __pc = 106; } break;
      }
      case 104: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 105: {
        b = c.get("vs");
        d = b[0][b[2]];
        b[0];
        b[1];
        b[2];
        b[3];
        b[4];
        b[5];
        if (!(d === "]")) { __pc = 107; } else { __pc = 86; } break;
      }
      case 106: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 107: {
        if (!(!c.has("vs"))) { __pc = 108; } else { __pc = 109; } break;
      }
      case 108: {
        b = c.get("vs");
        d = b[0][b[2]];
        b[0];
        b[1];
        b[2];
        b[3];
        b[4];
        b[5];
        if (!(d === "[")) { __pc = 622; } else { __pc = 110; } break;
      }
      case 109: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 110: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 111; } else { __pc = 112; } break;
      }
      case 111: {
        b = c.get("vs");
        if (!(!c.has("vs"))) { __pc = 113; } else { __pc = 114; } break;
      }
      case 112: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 113: {
        e = b;
        b = c.get("vs");
        a2 = b[5] - 1;
        b = e.slice();
        b[5] = a2;
        d.call(c, "vs", b);
        if (!(!c.has("vs"))) { __pc = 115; } else { __pc = 116; } break;
      }
      case 114: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 115: {
        b = c.get("vs");
        d = b[5];
        b[0];
        b[1];
        b[2];
        b[3];
        b[4];
        b[5];
        if (!(d > 0)) { __pc = 117; } else { __pc = 100; } break;
      }
      case 116: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 117: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 118; } else { __pc = 119; } break;
      }
      case 118: {
        b = c.get("vs");
        if (!(!c.has("vs"))) { __pc = 120; } else { __pc = 121; } break;
      }
      case 119: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 120: {
        e = b;
        b = c.get("vs");
        a2 = b[2] + 1;
        b = e.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        if (!(!c.has("vs"))) { __pc = 122; } else { __pc = 123; } break;
      }
      case 121: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 122: {
        b = c.get("vs");
        d = b[2];
        e = (b[0]).length;
        b[0];
        b[1];
        b[2];
        b[3];
        b[4];
        b[5];
        if (!(d < e)) { __pc = 142; } else { __pc = 124; } break;
      }
      case 123: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 124: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 125; } else { __pc = 126; } break;
      }
      case 125: {
        b = c.get("vs");
        if (!(!c.has("vs"))) { __pc = 127; } else { __pc = 128; } break;
      }
      case 126: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 127: {
        e = b;
        b = c.get("vs");
        a2 = b[0][b[2]];
        b = e.slice();
        b[3] = a2;
        d.call(c, "vs", b);
        if (!(!c.has("vs"))) { __pc = 129; } else { __pc = 130; } break;
      }
      case 128: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 129: {
        b = c.get("vs");
        d = b[3];
        b[0];
        b[1];
        b[2];
        b[3];
        b[4];
        b[5];
        if (!(d === "+")) { __pc = 515; } else { __pc = 131; } break;
      }
      case 130: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 131: {
        d = c.set;
        if (!(!c.has("code"))) { __pc = 132; } else { __pc = 133; } break;
      }
      case 132: {
        b = c.get("code");
        if (!(!c.has("vs"))) { __pc = 134; } else { __pc = 135; } break;
      }
      case 133: {
        throw new Error(__s1);
      }
      case 134: {
        e = b;
        c.get("vs");
        b = e.concat([["=", "tape", ["call", __x1000015, [__x1000018, __x1000020, ["bin", "%", ["bin", "+", ["idx", __x1000025, __x1000027], ["lit", 1]], ["lit", 256]]]]]]);
        d.call(c, "code", b);
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 136; } else { __pc = 137; } break;
      }
      case 135: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 136: {
        b = c.get("vs");
        if (!(!c.has("vs"))) { __pc = 138; } else { __pc = 139; } break;
      }
      case 137: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 138: {
        e = b;
        b = c.get("vs");
        a2 = b[2] + 1;
        b = e.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        if (!(!c.has("vs"))) { __pc = 140; } else { __pc = 141; } break;
      }
      case 139: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 140: {
        b = c.get("vs");
        d = b[2];
        e = (b[0]).length;
        b[0];
        b[1];
        b[2];
        b[3];
        b[4];
        b[5];
        if (!(d < e)) { __pc = 142; } else { __pc = 124; } break;
      }
      case 141: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 142: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 143; } else { __pc = 144; } break;
      }
      case 143: {
        c.get("vs");
        d.call(c, "jump", ["return", __x1000091]);
        d = c.set;
        if (!(!c.has("residual"))) { __pc = 145; } else { __pc = 146; } break;
      }
      case 144: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 145: {
        b = c.get("residual");
        if (!(!c.has("n"))) { __pc = 147; } else { __pc = 148; } break;
      }
      case 146: {
        throw new Error(__s0);
      }
      case 147: {
        e = b;
        b = c.get("n");
        if (!(!c.has("code"))) { __pc = 149; } else { __pc = 150; } break;
      }
      case 148: {
        throw new Error("flowchart: unbound variable n");
      }
      case 149: {
        a = "S" + b;
        b = c.get("code");
        if (!(!c.has("jump"))) { __pc = 151; } else { __pc = 152; } break;
      }
      case 150: {
        throw new Error(__s1);
      }
      case 151: {
        f = b;
        b = c.get("jump");
        b = e.concat([[a, f, b]]);
        d.call(c, "residual", b);
        d = c.set;
        if (!(!c.has("n"))) { __pc = 153; } else { __pc = 154; } break;
      }
      case 152: {
        throw new Error(__s2);
      }
      case 153: {
        b = c.get("n");
        d.call(c, "n", b + 1);
        if (!(!c.has("n"))) { __pc = 155; } else { __pc = 156; } break;
      }
      case 154: {
        throw new Error("flowchart: unbound variable n");
      }
      case 155: {
        b = c.get("n");
        if (!(!c.has("seen"))) { __pc = 157; } else { __pc = 158; } break;
      }
      case 156: {
        throw new Error("flowchart: unbound variable n");
      }
      case 157: {
        d = b;
        b = c.get("seen");
        if (!(d < b.length)) { __pc = 253; } else { __pc = 159; } break;
      }
      case 158: {
        throw new Error(__s3);
      }
      case 159: {
        d = c.set;
        if (!(!c.has("seen"))) { __pc = 160; } else { __pc = 161; } break;
      }
      case 160: {
        b = c.get("seen");
        if (!(!c.has("n"))) { __pc = 162; } else { __pc = 163; } break;
      }
      case 161: {
        throw new Error(__s3);
      }
      case 162: {
        e = b;
        b = c.get("n");
        d.call(c, "pp", e[b][0]);
        d = c.set;
        if (!(!c.has("seen"))) { __pc = 164; } else { __pc = 165; } break;
      }
      case 163: {
        throw new Error("flowchart: unbound variable n");
      }
      case 164: {
        b = c.get("seen");
        if (!(!c.has("n"))) { __pc = 166; } else { __pc = 167; } break;
      }
      case 165: {
        throw new Error(__s3);
      }
      case 166: {
        e = b;
        b = c.get("n");
        d.call(c, "vs", e[b][1]);
        if (!(!c.has("pp"))) { __pc = 168; } else { __pc = 169; } break;
      }
      case 167: {
        throw new Error("flowchart: unbound variable n");
      }
      case 168: {
        b = c.get("pp");
        if (!("L1" === b)) { __pc = 514; } else { __pc = 170; } break;
      }
      case 169: {
        throw new Error("flowchart: unbound variable pp");
      }
      case 170: {
        c.set("code", __x1000464);
        c.set("jump", null);
        d = c.set;
        if (!(!c.has("code"))) { __pc = 171; } else { __pc = 172; } break;
      }
      case 171: {
        b = c.get("code");
        if (!(!c.has("vs"))) { __pc = 173; } else { __pc = 174; } break;
      }
      case 172: {
        throw new Error(__s1);
      }
      case 173: {
        e = b;
        c.get("vs");
        b = e.concat([["=", "tape", ["lit", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]]]);
        d.call(c, "code", b);
        d = c.set;
        if (!(!c.has("code"))) { __pc = 175; } else { __pc = 176; } break;
      }
      case 174: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 175: {
        b = c.get("code");
        if (!(!c.has("vs"))) { __pc = 177; } else { __pc = 178; } break;
      }
      case 176: {
        throw new Error(__s1);
      }
      case 177: {
        e = b;
        c.get("vs");
        b = e.concat([["=", "ptr", ["lit", 0]]]);
        d.call(c, "code", b);
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 179; } else { __pc = 180; } break;
      }
      case 178: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 179: {
        b = c.get("vs");
        if (!(!c.has("vs"))) { __pc = 181; } else { __pc = 182; } break;
      }
      case 180: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 181: {
        e = b;
        c.get("vs");
        b = e.slice();
        b[1] = 0;
        d.call(c, "vs", b);
        d = c.set;
        if (!(!c.has("code"))) { __pc = 183; } else { __pc = 184; } break;
      }
      case 182: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 183: {
        b = c.get("code");
        if (!(!c.has("vs"))) { __pc = 185; } else { __pc = 186; } break;
      }
      case 184: {
        throw new Error(__s1);
      }
      case 185: {
        e = b;
        c.get("vs");
        b = e.concat([["=", "out", ["lit", []]]]);
        d.call(c, "code", b);
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 187; } else { __pc = 188; } break;
      }
      case 186: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 187: {
        b = c.get("vs");
        if (!(!c.has("vs"))) { __pc = 189; } else { __pc = 190; } break;
      }
      case 188: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 189: {
        e = b;
        c.get("vs");
        b = e.slice();
        b[2] = 0;
        d.call(c, "vs", b);
        if (!(!c.has("vs"))) { __pc = 191; } else { __pc = 192; } break;
      }
      case 190: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 191: {
        b = c.get("vs");
        d = b[2];
        e = (b[0]).length;
        b[0];
        b[1];
        b[2];
        b[3];
        b[4];
        b[5];
        if (!(d < e)) { __pc = 364; } else { __pc = 193; } break;
      }
      case 192: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 193: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 194; } else { __pc = 195; } break;
      }
      case 194: {
        b = c.get("vs");
        if (!(!c.has("vs"))) { __pc = 196; } else { __pc = 197; } break;
      }
      case 195: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 196: {
        e = b;
        b = c.get("vs");
        a2 = b[0][b[2]];
        b = e.slice();
        b[3] = a2;
        d.call(c, "vs", b);
        if (!(!c.has("vs"))) { __pc = 198; } else { __pc = 199; } break;
      }
      case 197: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 198: {
        b = c.get("vs");
        d = b[3];
        b[0];
        b[1];
        b[2];
        b[3];
        b[4];
        b[5];
        if (!(d === "+")) { __pc = 206; } else { __pc = 200; } break;
      }
      case 199: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 200: {
        d = c.set;
        if (!(!c.has("code"))) { __pc = 201; } else { __pc = 202; } break;
      }
      case 201: {
        b = c.get("code");
        store = c;
        if (!(!store.has("vs"))) { __pc = 203; } else { __pc = 204; } break;
      }
      case 202: {
        throw new Error(__s1);
      }
      case 203: {
        e = b;
        store.get("vs");
        b = e.concat([["=", "tape", ["call", __x1000015, [__x1000018, __x1000020, ["bin", "%", ["bin", "+", ["idx", __x1000025, __x1000027], ["lit", 1]], ["lit", 256]]]]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 212; } else { __pc = 205; } break;
      }
      case 204: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 205: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[0][a[2]];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[3] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "+")) { __pc = 206; } else { __pc = 200; } break;
      }
      case 206: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "-")) { __pc = 256; } else { __pc = 207; } break;
      }
      case 207: {
        d = c.set;
        if (!(!c.has("code"))) { __pc = 208; } else { __pc = 209; } break;
      }
      case 208: {
        b = c.get("code");
        if (!(!c.has("vs"))) { __pc = 210; } else { __pc = 211; } break;
      }
      case 209: {
        throw new Error(__s1);
      }
      case 210: {
        e = b;
        c.get("vs");
        b = e.concat([["=", "tape", ["call", __x1000066, [__x1000069, __x1000071, ["bin", "%", ["bin", "+", ["idx", __x1000076, __x1000078], ["lit", 255]], ["lit", 256]]]]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 212; } else { __pc = 205; } break;
      }
      case 211: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 212: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 213; } else { __pc = 214; } break;
      }
      case 213: {
        c.get("vs");
        d.call(c, "jump", ["return", __x1000091]);
        d = c.set;
        if (!(!c.has("residual"))) { __pc = 215; } else { __pc = 216; } break;
      }
      case 214: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 215: {
        b = c.get("residual");
        if (!(!c.has("n"))) { __pc = 217; } else { __pc = 218; } break;
      }
      case 216: {
        throw new Error(__s0);
      }
      case 217: {
        e = b;
        b = c.get("n");
        if (!(!c.has("code"))) { __pc = 219; } else { __pc = 220; } break;
      }
      case 218: {
        throw new Error("flowchart: unbound variable n");
      }
      case 219: {
        a = "S" + b;
        b = c.get("code");
        if (!(!c.has("jump"))) { __pc = 221; } else { __pc = 222; } break;
      }
      case 220: {
        throw new Error(__s1);
      }
      case 221: {
        f = b;
        b = c.get("jump");
        b = e.concat([[a, f, b]]);
        d.call(c, "residual", b);
        if (!(!c.has("pp"))) { __pc = 223; } else { __pc = 224; } break;
      }
      case 222: {
        throw new Error(__s2);
      }
      case 223: {
        b = c.get("pp");
        if (!("L26" === b)) { __pc = 240; } else { __pc = 225; } break;
      }
      case 224: {
        throw new Error("flowchart: unbound variable pp");
      }
      case 225: {
        c.set("code", __x1000635);
        c.set("jump", null);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[4] = 1;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[4];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d > 0)) { __pc = 239; } else { __pc = 226; } break;
      }
      case 226: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[0][a[2]];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "[")) { __pc = 230; } else { __pc = 227; } break;
      }
      case 227: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[4] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[4] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[0][a[2]];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "]")) { __pc = 236; } else { __pc = 228; } break;
      }
      case 228: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[4] - 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[4] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[4];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d > 0)) { __pc = 232; } else { __pc = 229; } break;
      }
      case 229: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[0][a[2]];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "[")) { __pc = 230; } else { __pc = 227; } break;
      }
      case 230: {
        a = __rf2(c);
        d = a[0][a[2]];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "]")) { __pc = 233; } else { __pc = 231; } break;
      }
      case 231: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[4] - 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[4] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[4];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d > 0)) { __pc = 232; } else { __pc = 229; } break;
      }
      case 232: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 21; } else { __pc = 3; } break;
      }
      case 233: {
        a = __rf2(c);
        d = a[4];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d > 0)) { __pc = 235; } else { __pc = 234; } break;
      }
      case 234: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[0][a[2]];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "[")) { __pc = 230; } else { __pc = 227; } break;
      }
      case 235: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 21; } else { __pc = 3; } break;
      }
      case 236: {
        a = __rf2(c);
        d = a[4];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d > 0)) { __pc = 238; } else { __pc = 237; } break;
      }
      case 237: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[0][a[2]];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "[")) { __pc = 230; } else { __pc = 227; } break;
      }
      case 238: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 21; } else { __pc = 3; } break;
      }
      case 239: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 21; } else { __pc = 3; } break;
      }
      case 240: {
        if (!(!c.has("pp"))) { __pc = 241; } else { __pc = 242; } break;
      }
      case 241: {
        b = c.get("pp");
        if (!("L7" === b)) { __pc = 243; } else { __pc = 34; } break;
      }
      case 242: {
        throw new Error("flowchart: unbound variable pp");
      }
      case 243: {
        if (!(!c.has("pp"))) { __pc = 244; } else { __pc = 245; } break;
      }
      case 244: {
        b = c.get("pp");
        if (!("L41" === b)) { __pc = 246; } else { __pc = 72; } break;
      }
      case 245: {
        throw new Error("flowchart: unbound variable pp");
      }
      case 246: {
        d = c.set;
        if (!(!c.has("n"))) { __pc = 247; } else { __pc = 248; } break;
      }
      case 247: {
        b = c.get("n");
        d.call(c, "n", b + 1);
        if (!(!c.has("n"))) { __pc = 249; } else { __pc = 250; } break;
      }
      case 248: {
        throw new Error("flowchart: unbound variable n");
      }
      case 249: {
        b = c.get("n");
        if (!(!c.has("seen"))) { __pc = 251; } else { __pc = 252; } break;
      }
      case 250: {
        throw new Error("flowchart: unbound variable n");
      }
      case 251: {
        d = b;
        b = c.get("seen");
        if (!(d < b.length)) { __pc = 253; } else { __pc = 159; } break;
      }
      case 252: {
        throw new Error(__s3);
      }
      case 253: {
        if (!(!c.has("residual"))) { __pc = 254; } else { __pc = 255; } break;
      }
      case 254: {
        b = c.get("residual");
        return ["flowchart", __x1000086, b];
      }
      case 255: {
        throw new Error(__s0);
      }
      case 256: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === ">")) { __pc = 262; } else { __pc = 257; } break;
      }
      case 257: {
        d = c.set;
        if (!(!c.has("code"))) { __pc = 258; } else { __pc = 259; } break;
      }
      case 258: {
        b = c.get("code");
        if (!(!c.has("vs"))) { __pc = 260; } else { __pc = 261; } break;
      }
      case 259: {
        throw new Error(__s1);
      }
      case 260: {
        e = b;
        c.get("vs");
        b = e.concat([["=", "ptr", ["bin", "+", __x1000095, ["lit", 1]]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 212; } else { __pc = 205; } break;
      }
      case 261: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 262: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "<")) { __pc = 268; } else { __pc = 263; } break;
      }
      case 263: {
        d = c.set;
        if (!(!c.has("code"))) { __pc = 264; } else { __pc = 265; } break;
      }
      case 264: {
        b = c.get("code");
        if (!(!c.has("vs"))) { __pc = 266; } else { __pc = 267; } break;
      }
      case 265: {
        throw new Error(__s1);
      }
      case 266: {
        e = b;
        c.get("vs");
        b = e.concat([["=", "ptr", ["bin", "-", __x1000099, ["lit", 1]]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 212; } else { __pc = 205; } break;
      }
      case 267: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 268: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === ".")) { __pc = 274; } else { __pc = 269; } break;
      }
      case 269: {
        d = c.set;
        if (!(!c.has("code"))) { __pc = 270; } else { __pc = 271; } break;
      }
      case 270: {
        b = c.get("code");
        if (!(!c.has("vs"))) { __pc = 272; } else { __pc = 273; } break;
      }
      case 271: {
        throw new Error(__s1);
      }
      case 272: {
        e = b;
        c.get("vs");
        b = e.concat([["=", "out", ["call", ["dot", __x1000104, "concat"], [["arr", [["idx", __x1000110, __x1000112]]]]]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 212; } else { __pc = 205; } break;
      }
      case 273: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 274: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === ",")) { __pc = 280; } else { __pc = 275; } break;
      }
      case 275: {
        d = c.set;
        if (!(!c.has("code"))) { __pc = 276; } else { __pc = 277; } break;
      }
      case 276: {
        b = c.get("code");
        store = c;
        if (!(!store.has("vs"))) { __pc = 278; } else { __pc = 279; } break;
      }
      case 277: {
        throw new Error(__s1);
      }
      case 278: {
        e = b;
        b = store.get("vs");
        values = b;
        b = [["=", "tape", ["call", __x1000115, [__x1000118, __x1000120, ["idx", __x1000122, ["lit", values[1]]]]]]];
        b = e.concat(b);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[1] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[1] = a2;
        d.call(c, "vs", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 212; } else { __pc = 205; } break;
      }
      case 279: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 280: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "[")) { __pc = 443; } else { __pc = 281; } break;
      }
      case 281: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 282; } else { __pc = 283; } break;
      }
      case 282: {
        b = c.get("vs");
        if (!(!c.has("seen"))) { __pc = 284; } else { __pc = 285; } break;
      }
      case 283: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 284: {
        e = b;
        b = c.get("seen");
        i = 0;
        state = ["L26", e];
        seen = b;
        __pc = 286; break;
      }
      case 285: {
        throw new Error(__s3);
      }
      case 286: {
        if (!(i < seen.length)) { __pc = 287; } else { __pc = 288; } break;
      }
      case 287: {
        e = seen.concat;
        b = ["S" + seen.length, e.call(seen, [state])];
        d.call(c, "yes", b);
        __pc = 292; break;
      }
      case 288: {
        e = seen[i][0] === state[0];
        if (!(e)) { __pc = 430; } else { __pc = 289; } break;
      }
      case 289: {
        b = seen[i][1];
        e = state[1];
        if (!(b === e)) { __pc = 290; } else { __pc = 291; } break;
      }
      case 290: {
        a = !Array.isArray(b);
        if (!(a)) { __pc = 425; } else { __pc = 426; } break;
      }
      case 291: {
        pairs = [];
        __pc = 433; break;
      }
      case 292: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 293; } else { __pc = 294; } break;
      }
      case 293: {
        b = c.get("vs");
        if (!(!c.has("yes"))) { __pc = 295; } else { __pc = 296; } break;
      }
      case 294: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 295: {
        e = b;
        b = c.get("yes");
        a1 = b[1];
        i = 0;
        state = ["L7", e];
        seen = a1;
        __pc = 297; break;
      }
      case 296: {
        throw new Error("flowchart: unbound variable yes");
      }
      case 297: {
        if (!(i < seen.length)) { __pc = 298; } else { __pc = 299; } break;
      }
      case 298: {
        e = seen.concat;
        b = ["S" + seen.length, e.call(seen, [state])];
        d.call(c, "no", b);
        __pc = 304; break;
      }
      case 299: {
        e = seen[i][0] === state[0];
        if (!(e)) { __pc = 301; } else { __pc = 300; } break;
      }
      case 300: {
        e = __rf3(seen[i][1], state[1]);
        __pc = 301; break;
      }
      case 301: {
        if (!(e)) { __pc = 302; } else { __pc = 303; } break;
      }
      case 302: {
        i += 1;
        __pc = 297; break;
      }
      case 303: {
        b = ["S" + i, seen];
        d.call(c, "no", b);
        __pc = 304; break;
      }
      case 304: {
        d = c.set;
        if (!(!c.has("no"))) { __pc = 305; } else { __pc = 306; } break;
      }
      case 305: {
        b = c.get("no");
        d.call(c, "seen", b[1]);
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 307; } else { __pc = 308; } break;
      }
      case 306: {
        throw new Error("flowchart: unbound variable no");
      }
      case 307: {
        c.get("vs");
        if (!(!c.has("yes"))) { __pc = 309; } else { __pc = 310; } break;
      }
      case 308: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 309: {
        b = c.get("yes");
        e = b[0];
        if (!(!c.has("no"))) { __pc = 311; } else { __pc = 312; } break;
      }
      case 310: {
        throw new Error("flowchart: unbound variable yes");
      }
      case 311: {
        b = c.get("no");
        b = ["if", ["bin", "===", ["idx", __x1000212, __x1000214], ["lit", 0]], e, b[0]];
        d.call(c, "jump", b);
        d = c.set;
        if (!(!c.has("residual"))) { __pc = 313; } else { __pc = 314; } break;
      }
      case 312: {
        throw new Error("flowchart: unbound variable no");
      }
      case 313: {
        b = c.get("residual");
        if (!(!c.has("n"))) { __pc = 315; } else { __pc = 316; } break;
      }
      case 314: {
        throw new Error(__s0);
      }
      case 315: {
        e = b;
        b = c.get("n");
        if (!(!c.has("code"))) { __pc = 317; } else { __pc = 318; } break;
      }
      case 316: {
        throw new Error("flowchart: unbound variable n");
      }
      case 317: {
        a = "S" + b;
        b = c.get("code");
        if (!(!c.has("jump"))) { __pc = 319; } else { __pc = 320; } break;
      }
      case 318: {
        throw new Error(__s1);
      }
      case 319: {
        f = b;
        b = c.get("jump");
        b = e.concat([[a, f, b]]);
        d.call(c, "residual", b);
        if (!(!c.has("pp"))) { __pc = 321; } else { __pc = 322; } break;
      }
      case 320: {
        throw new Error(__s2);
      }
      case 321: {
        b = c.get("pp");
        if (!("L26" === b)) { __pc = 324; } else { __pc = 323; } break;
      }
      case 322: {
        throw new Error("flowchart: unbound variable pp");
      }
      case 323: {
        c.set("code", __x1000240);
        c.set("jump", null);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[4] = 1;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[4];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d > 0)) { __pc = 239; } else { __pc = 226; } break;
      }
      case 324: {
        if (!(!c.has("pp"))) { __pc = 325; } else { __pc = 326; } break;
      }
      case 325: {
        b = c.get("pp");
        if (!("L7" === b)) { __pc = 328; } else { __pc = 327; } break;
      }
      case 326: {
        throw new Error("flowchart: unbound variable pp");
      }
      case 327: {
        c.set("code", __x1001029);
        c.set("jump", null);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 59; } else { __pc = 41; } break;
      }
      case 328: {
        if (!(!c.has("pp"))) { __pc = 329; } else { __pc = 330; } break;
      }
      case 329: {
        b = c.get("pp");
        if (!("L41" === b)) { __pc = 333; } else { __pc = 331; } break;
      }
      case 330: {
        throw new Error("flowchart: unbound variable pp");
      }
      case 331: {
        c.set("code", __x1001045);
        c.set("jump", null);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[5] = 1;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[5];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d > 0)) { __pc = 332; } else { __pc = 79; } break;
      }
      case 332: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 142; } else { __pc = 124; } break;
      }
      case 333: {
        d = c.set;
        if (!(!c.has("n"))) { __pc = 334; } else { __pc = 335; } break;
      }
      case 334: {
        b = c.get("n");
        d.call(c, "n", b + 1);
        if (!(!c.has("n"))) { __pc = 336; } else { __pc = 337; } break;
      }
      case 335: {
        throw new Error("flowchart: unbound variable n");
      }
      case 336: {
        b = c.get("n");
        if (!(!c.has("seen"))) { __pc = 338; } else { __pc = 339; } break;
      }
      case 337: {
        throw new Error("flowchart: unbound variable n");
      }
      case 338: {
        d = b;
        b = c.get("seen");
        if (!(d < b.length)) { __pc = 422; } else { __pc = 340; } break;
      }
      case 339: {
        throw new Error(__s3);
      }
      case 340: {
        d = c.set;
        if (!(!c.has("seen"))) { __pc = 341; } else { __pc = 342; } break;
      }
      case 341: {
        b = c.get("seen");
        if (!(!c.has("n"))) { __pc = 343; } else { __pc = 344; } break;
      }
      case 342: {
        throw new Error(__s3);
      }
      case 343: {
        e = b;
        b = c.get("n");
        d.call(c, "pp", e[b][0]);
        d = c.set;
        if (!(!c.has("seen"))) { __pc = 345; } else { __pc = 346; } break;
      }
      case 344: {
        throw new Error("flowchart: unbound variable n");
      }
      case 345: {
        b = c.get("seen");
        if (!(!c.has("n"))) { __pc = 347; } else { __pc = 348; } break;
      }
      case 346: {
        throw new Error(__s3);
      }
      case 347: {
        e = b;
        b = c.get("n");
        d.call(c, "vs", e[b][1]);
        if (!(!c.has("pp"))) { __pc = 349; } else { __pc = 350; } break;
      }
      case 348: {
        throw new Error("flowchart: unbound variable n");
      }
      case 349: {
        b = c.get("pp");
        if (!("L1" === b)) { __pc = 419; } else { __pc = 351; } break;
      }
      case 350: {
        throw new Error("flowchart: unbound variable pp");
      }
      case 351: {
        c.set("code", __x1001078);
        c.set("jump", null);
        d = c.set;
        if (!(!c.has("code"))) { __pc = 352; } else { __pc = 353; } break;
      }
      case 352: {
        b = c.get("code");
        if (!(!c.has("vs"))) { __pc = 354; } else { __pc = 355; } break;
      }
      case 353: {
        throw new Error(__s1);
      }
      case 354: {
        e = b;
        c.get("vs");
        b = e.concat([["=", "tape", ["lit", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]]]);
        d.call(c, "code", b);
        d = c.set;
        if (!(!c.has("code"))) { __pc = 356; } else { __pc = 357; } break;
      }
      case 355: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 356: {
        b = c.get("code");
        if (!(!c.has("vs"))) { __pc = 358; } else { __pc = 359; } break;
      }
      case 357: {
        throw new Error(__s1);
      }
      case 358: {
        e = b;
        c.get("vs");
        b = e.concat([["=", "ptr", ["lit", 0]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[1] = 0;
        d.call(c, "vs", b);
        d = c.set;
        if (!(!c.has("code"))) { __pc = 360; } else { __pc = 361; } break;
      }
      case 359: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 360: {
        b = c.get("code");
        if (!(!c.has("vs"))) { __pc = 362; } else { __pc = 363; } break;
      }
      case 361: {
        throw new Error(__s1);
      }
      case 362: {
        e = b;
        c.get("vs");
        b = e.concat([["=", "out", ["lit", []]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = 0;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 364; } else { __pc = 193; } break;
      }
      case 363: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 364: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 365; } else { __pc = 366; } break;
      }
      case 365: {
        c.get("vs");
        d.call(c, "jump", ["return", __x1000091]);
        d = c.set;
        if (!(!c.has("residual"))) { __pc = 367; } else { __pc = 368; } break;
      }
      case 366: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 367: {
        b = c.get("residual");
        if (!(!c.has("n"))) { __pc = 369; } else { __pc = 370; } break;
      }
      case 368: {
        throw new Error(__s0);
      }
      case 369: {
        e = b;
        b = c.get("n");
        if (!(!c.has("code"))) { __pc = 371; } else { __pc = 372; } break;
      }
      case 370: {
        throw new Error("flowchart: unbound variable n");
      }
      case 371: {
        a = "S" + b;
        b = c.get("code");
        if (!(!c.has("jump"))) { __pc = 373; } else { __pc = 374; } break;
      }
      case 372: {
        throw new Error(__s1);
      }
      case 373: {
        f = b;
        b = c.get("jump");
        b = e.concat([[a, f, b]]);
        d.call(c, "residual", b);
        if (!(!c.has("pp"))) { __pc = 375; } else { __pc = 376; } break;
      }
      case 374: {
        throw new Error(__s2);
      }
      case 375: {
        b = c.get("pp");
        if (!("L26" === b)) { __pc = 378; } else { __pc = 377; } break;
      }
      case 376: {
        throw new Error("flowchart: unbound variable pp");
      }
      case 377: {
        c.set("code", __x1001126);
        c.set("jump", null);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[4] = 1;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[4];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d > 0)) { __pc = 239; } else { __pc = 226; } break;
      }
      case 378: {
        if (!(!c.has("pp"))) { __pc = 379; } else { __pc = 380; } break;
      }
      case 379: {
        b = c.get("pp");
        if (!("L7" === b)) { __pc = 382; } else { __pc = 381; } break;
      }
      case 380: {
        throw new Error("flowchart: unbound variable pp");
      }
      case 381: {
        c.set("code", __x1001142);
        c.set("jump", null);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 59; } else { __pc = 41; } break;
      }
      case 382: {
        if (!(!c.has("pp"))) { __pc = 383; } else { __pc = 384; } break;
      }
      case 383: {
        b = c.get("pp");
        if (!("L41" === b)) { __pc = 386; } else { __pc = 385; } break;
      }
      case 384: {
        throw new Error("flowchart: unbound variable pp");
      }
      case 385: {
        c.set("code", __x1001158);
        c.set("jump", null);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[5] = 1;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[5];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d > 0)) { __pc = 332; } else { __pc = 79; } break;
      }
      case 386: {
        d = c.set;
        if (!(!c.has("n"))) { __pc = 387; } else { __pc = 388; } break;
      }
      case 387: {
        b = c.get("n");
        d.call(c, "n", b + 1);
        if (!(!c.has("n"))) { __pc = 389; } else { __pc = 390; } break;
      }
      case 388: {
        throw new Error("flowchart: unbound variable n");
      }
      case 389: {
        b = c.get("n");
        if (!(!c.has("seen"))) { __pc = 391; } else { __pc = 392; } break;
      }
      case 390: {
        throw new Error("flowchart: unbound variable n");
      }
      case 391: {
        d = b;
        b = c.get("seen");
        if (!(d < b.length)) { __pc = 416; } else { __pc = 393; } break;
      }
      case 392: {
        throw new Error(__s3);
      }
      case 393: {
        d = c.set;
        if (!(!c.has("seen"))) { __pc = 394; } else { __pc = 395; } break;
      }
      case 394: {
        b = c.get("seen");
        if (!(!c.has("n"))) { __pc = 396; } else { __pc = 397; } break;
      }
      case 395: {
        throw new Error(__s3);
      }
      case 396: {
        e = b;
        b = c.get("n");
        d.call(c, "pp", e[b][0]);
        d = c.set;
        if (!(!c.has("seen"))) { __pc = 398; } else { __pc = 399; } break;
      }
      case 397: {
        throw new Error("flowchart: unbound variable n");
      }
      case 398: {
        b = c.get("seen");
        if (!(!c.has("n"))) { __pc = 400; } else { __pc = 401; } break;
      }
      case 399: {
        throw new Error(__s3);
      }
      case 400: {
        e = b;
        b = c.get("n");
        d.call(c, "vs", e[b][1]);
        if (!(!c.has("pp"))) { __pc = 402; } else { __pc = 403; } break;
      }
      case 401: {
        throw new Error("flowchart: unbound variable n");
      }
      case 402: {
        b = c.get("pp");
        if (!("L1" === b)) { __pc = 413; } else { __pc = 404; } break;
      }
      case 403: {
        throw new Error("flowchart: unbound variable pp");
      }
      case 404: {
        c.set("code", __x1001178);
        c.set("jump", null);
        d = c.set;
        if (!(!c.has("code"))) { __pc = 405; } else { __pc = 406; } break;
      }
      case 405: {
        b = c.get("code");
        if (!(!c.has("vs"))) { __pc = 407; } else { __pc = 408; } break;
      }
      case 406: {
        throw new Error(__s1);
      }
      case 407: {
        e = b;
        c.get("vs");
        b = e.concat([["=", "tape", ["lit", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]]]);
        d.call(c, "code", b);
        d = c.set;
        if (!(!c.has("code"))) { __pc = 409; } else { __pc = 410; } break;
      }
      case 408: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 409: {
        b = c.get("code");
        if (!(!c.has("vs"))) { __pc = 411; } else { __pc = 412; } break;
      }
      case 410: {
        throw new Error(__s1);
      }
      case 411: {
        e = b;
        c.get("vs");
        b = e.concat([["=", "ptr", ["lit", 0]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[1] = 0;
        d.call(c, "vs", b);
        d = c.set;
        b = __rf4(c);
        a = __rf5(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.concat([["=", "out", ["lit", []]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = 0;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 364; } else { __pc = 193; } break;
      }
      case 412: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 413: {
        if (!(!c.has("pp"))) { __pc = 414; } else { __pc = 415; } break;
      }
      case 414: {
        b = c.get("pp");
        if (!("L26" === b)) { __pc = 378; } else { __pc = 377; } break;
      }
      case 415: {
        throw new Error("flowchart: unbound variable pp");
      }
      case 416: {
        if (!(!c.has("residual"))) { __pc = 417; } else { __pc = 418; } break;
      }
      case 417: {
        b = c.get("residual");
        return ["flowchart", __x1001238, b];
      }
      case 418: {
        throw new Error(__s0);
      }
      case 419: {
        if (!(!c.has("pp"))) { __pc = 420; } else { __pc = 421; } break;
      }
      case 420: {
        b = c.get("pp");
        if (!("L26" === b)) { __pc = 324; } else { __pc = 323; } break;
      }
      case 421: {
        throw new Error("flowchart: unbound variable pp");
      }
      case 422: {
        if (!(!c.has("residual"))) { __pc = 423; } else { __pc = 424; } break;
      }
      case 423: {
        b = c.get("residual");
        return ["flowchart", __x1001241, b];
      }
      case 424: {
        throw new Error(__s0);
      }
      case 425: {
        a = !Array.isArray(e);
        __pc = 427; break;
      }
      case 426: {
        __pc = 427; break;
      }
      case 427: {
        if (!(a ? a : b.length !== e.length)) { __pc = 428; } else { __pc = 429; } break;
      }
      case 428: {
        pairs = [];
        j = 0;
        x = b;
        y = e;
        __pc = 441; break;
      }
      case 429: {
        e = false;
        __pc = 430; break;
      }
      case 430: {
        if (!(e)) { __pc = 431; } else { __pc = 432; } break;
      }
      case 431: {
        i += 1;
        __pc = 286; break;
      }
      case 432: {
        b = ["S" + i, seen];
        d.call(c, "yes", b);
        __pc = 292; break;
      }
      case 433: {
        if (!(pairs.length > 0)) { __pc = 434; } else { __pc = 435; } break;
      }
      case 434: {
        e = true;
        __pc = 430; break;
      }
      case 435: {
        b = pairs.pop();
        x = b[0];
        y = b[1];
        if (!(x === y)) { __pc = 436; } else { __pc = 433; } break;
      }
      case 436: {
        a = !Array.isArray(x);
        if (!(a)) { __pc = 437; } else { __pc = 438; } break;
      }
      case 437: {
        a = !Array.isArray(y);
        __pc = 439; break;
      }
      case 438: {
        __pc = 439; break;
      }
      case 439: {
        if (!(a ? a : x.length !== y.length)) { __pc = 440; } else { __pc = 429; } break;
      }
      case 440: {
        j = 0;
        __pc = 441; break;
      }
      case 441: {
        if (!(j < x.length)) { __pc = 433; } else { __pc = 442; } break;
      }
      case 442: {
        pairs.push;
        b = [x[j], y[j]];
        pairs.push(b);
        j += 1;
        __pc = 441; break;
      }
      case 443: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "]")) { __pc = 513; } else { __pc = 444; } break;
      }
      case 444: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 445; } else { __pc = 446; } break;
      }
      case 445: {
        b = c.get("vs");
        if (!(!c.has("seen"))) { __pc = 447; } else { __pc = 448; } break;
      }
      case 446: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 447: {
        a = b;
        b = c.get("seen");
        i = 0;
        __pc = 507; break;
      }
      case 448: {
        throw new Error(__s3);
      }
      case 449: {
        e = b.concat;
        b = ["S" + b.length, e.call(b, [["L41", a]])];
        d.call(c, "yes", b);
        __pc = 450; break;
      }
      case 450: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 451; } else { __pc = 452; } break;
      }
      case 451: {
        b = c.get("vs");
        if (!(!c.has("yes"))) { __pc = 453; } else { __pc = 454; } break;
      }
      case 452: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 453: {
        a = b;
        b = c.get("yes");
        a1 = b[1];
        i = 0;
        __pc = 501; break;
      }
      case 454: {
        throw new Error("flowchart: unbound variable yes");
      }
      case 455: {
        e = a1.concat;
        b = ["S" + a1.length, e.call(a1, [["L7", a]])];
        d.call(c, "no", b);
        __pc = 456; break;
      }
      case 456: {
        d = c.set;
        if (!(!c.has("no"))) { __pc = 457; } else { __pc = 458; } break;
      }
      case 457: {
        b = c.get("no");
        d.call(c, "seen", b[1]);
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 459; } else { __pc = 460; } break;
      }
      case 458: {
        throw new Error("flowchart: unbound variable no");
      }
      case 459: {
        c.get("vs");
        if (!(!c.has("yes"))) { __pc = 461; } else { __pc = 462; } break;
      }
      case 460: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 461: {
        b = c.get("yes");
        e = b[0];
        if (!(!c.has("no"))) { __pc = 463; } else { __pc = 464; } break;
      }
      case 462: {
        throw new Error("flowchart: unbound variable yes");
      }
      case 463: {
        b = c.get("no");
        b = ["if", ["bin", "!==", ["idx", __x1001265, __x1001267], ["lit", 0]], e, b[0]];
        d.call(c, "jump", b);
        d = c.set;
        if (!(!c.has("residual"))) { __pc = 465; } else { __pc = 466; } break;
      }
      case 464: {
        throw new Error("flowchart: unbound variable no");
      }
      case 465: {
        b = c.get("residual");
        if (!(!c.has("n"))) { __pc = 467; } else { __pc = 468; } break;
      }
      case 466: {
        throw new Error(__s0);
      }
      case 467: {
        e = b;
        b = c.get("n");
        if (!(!c.has("code"))) { __pc = 469; } else { __pc = 470; } break;
      }
      case 468: {
        throw new Error("flowchart: unbound variable n");
      }
      case 469: {
        a = "S" + b;
        b = c.get("code");
        if (!(!c.has("jump"))) { __pc = 471; } else { __pc = 472; } break;
      }
      case 470: {
        throw new Error(__s1);
      }
      case 471: {
        f = b;
        b = c.get("jump");
        b = e.concat([[a, f, b]]);
        d.call(c, "residual", b);
        if (!(!c.has("pp"))) { __pc = 473; } else { __pc = 474; } break;
      }
      case 472: {
        throw new Error(__s2);
      }
      case 473: {
        b = c.get("pp");
        if (!("L26" === b)) { __pc = 476; } else { __pc = 475; } break;
      }
      case 474: {
        throw new Error("flowchart: unbound variable pp");
      }
      case 475: {
        c.set("code", __x1001273);
        c.set("jump", null);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[4] = 1;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[4];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d > 0)) { __pc = 239; } else { __pc = 226; } break;
      }
      case 476: {
        if (!("L7" === __rf6(c))) { __pc = 478; } else { __pc = 477; } break;
      }
      case 477: {
        c.set("code", __x1001296);
        c.set("jump", null);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 59; } else { __pc = 41; } break;
      }
      case 478: {
        if (!("L41" === __rf6(c))) { __pc = 480; } else { __pc = 479; } break;
      }
      case 479: {
        c.set("code", __x1001311);
        c.set("jump", null);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[5] = 1;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[5];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d > 0)) { __pc = 332; } else { __pc = 79; } break;
      }
      case 480: {
        d = c.set;
        if (!(!c.has("n"))) { __pc = 481; } else { __pc = 482; } break;
      }
      case 481: {
        b = c.get("n");
        d.call(c, "n", b + 1);
        if (!(!c.has("n"))) { __pc = 483; } else { __pc = 484; } break;
      }
      case 482: {
        throw new Error("flowchart: unbound variable n");
      }
      case 483: {
        b = c.get("n");
        if (!(!c.has("seen"))) { __pc = 485; } else { __pc = 486; } break;
      }
      case 484: {
        throw new Error("flowchart: unbound variable n");
      }
      case 485: {
        d = b;
        b = c.get("seen");
        if (!(d < b.length)) { __pc = 498; } else { __pc = 487; } break;
      }
      case 486: {
        throw new Error(__s3);
      }
      case 487: {
        d = c.set;
        if (!(!c.has("seen"))) { __pc = 488; } else { __pc = 489; } break;
      }
      case 488: {
        b = c.get("seen");
        if (!(!c.has("n"))) { __pc = 490; } else { __pc = 491; } break;
      }
      case 489: {
        throw new Error(__s3);
      }
      case 490: {
        e = b;
        b = c.get("n");
        d.call(c, "pp", e[b][0]);
        d = c.set;
        if (!(!c.has("seen"))) { __pc = 492; } else { __pc = 493; } break;
      }
      case 491: {
        throw new Error("flowchart: unbound variable n");
      }
      case 492: {
        b = c.get("seen");
        if (!(!c.has("n"))) { __pc = 494; } else { __pc = 495; } break;
      }
      case 493: {
        throw new Error(__s3);
      }
      case 494: {
        e = b;
        b = c.get("n");
        d.call(c, "vs", e[b][1]);
        if (!("L1" === __rf6(c))) { __pc = 497; } else { __pc = 496; } break;
      }
      case 495: {
        throw new Error("flowchart: unbound variable n");
      }
      case 496: {
        c.set("code", __x1001331);
        c.set("jump", null);
        d = c.set;
        b = __rf4(c);
        a = __rf5(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.concat([["=", "tape", ["lit", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf4(c);
        a = __rf5(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.concat([["=", "ptr", ["lit", 0]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[1] = 0;
        d.call(c, "vs", b);
        d = c.set;
        b = __rf4(c);
        a = __rf5(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.concat([["=", "out", ["lit", []]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = 0;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 364; } else { __pc = 193; } break;
      }
      case 497: {
        if (!("L26" === __rf6(c))) { __pc = 476; } else { __pc = 475; } break;
      }
      case 498: {
        if (!(!c.has("residual"))) { __pc = 499; } else { __pc = 500; } break;
      }
      case 499: {
        b = c.get("residual");
        return ["flowchart", __x1001382, b];
      }
      case 500: {
        throw new Error(__s0);
      }
      case 501: {
        if (!(i < a1.length)) { __pc = 455; } else { __pc = 502; } break;
      }
      case 502: {
        e = a1[i][0] === "L7";
        if (!(e)) { __pc = 504; } else { __pc = 503; } break;
      }
      case 503: {
        e = __rf3(a1[i][1], a);
        __pc = 504; break;
      }
      case 504: {
        if (!(e)) { __pc = 505; } else { __pc = 506; } break;
      }
      case 505: {
        i += 1;
        __pc = 501; break;
      }
      case 506: {
        b = ["S" + i, a1];
        d.call(c, "no", b);
        __pc = 456; break;
      }
      case 507: {
        if (!(i < b.length)) { __pc = 449; } else { __pc = 508; } break;
      }
      case 508: {
        e = b[i][0] === "L41";
        if (!(e)) { __pc = 510; } else { __pc = 509; } break;
      }
      case 509: {
        e = __rf3(b[i][1], a);
        __pc = 510; break;
      }
      case 510: {
        if (!(e)) { __pc = 511; } else { __pc = 512; } break;
      }
      case 511: {
        i += 1;
        __pc = 507; break;
      }
      case 512: {
        b = ["S" + i, b];
        d.call(c, "yes", b);
        __pc = 450; break;
      }
      case 513: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 212; } else { __pc = 205; } break;
      }
      case 514: {
        if (!("L26" === __rf6(c))) { __pc = 240; } else { __pc = 225; } break;
      }
      case 515: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "-")) { __pc = 517; } else { __pc = 516; } break;
      }
      case 516: {
        d = c.set;
        b = __rf4(c);
        a = __rf5(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.concat([["=", "tape", ["call", __x1000066, [__x1000069, __x1000071, ["bin", "%", ["bin", "+", ["idx", __x1000076, __x1000078], ["lit", 255]], ["lit", 256]]]]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 142; } else { __pc = 124; } break;
      }
      case 517: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === ">")) { __pc = 519; } else { __pc = 518; } break;
      }
      case 518: {
        d = c.set;
        b = __rf4(c);
        a = __rf5(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.concat([["=", "ptr", ["bin", "+", __x1000095, ["lit", 1]]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 142; } else { __pc = 124; } break;
      }
      case 519: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "<")) { __pc = 521; } else { __pc = 520; } break;
      }
      case 520: {
        d = c.set;
        b = __rf4(c);
        a = __rf5(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.concat([["=", "ptr", ["bin", "-", __x1000099, ["lit", 1]]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 142; } else { __pc = 124; } break;
      }
      case 521: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === ".")) { __pc = 523; } else { __pc = 522; } break;
      }
      case 522: {
        d = c.set;
        b = __rf4(c);
        __rf5(c);
        b = b.concat([["=", "out", ["call", ["dot", __x1000104, "concat"], [["arr", [["idx", __x1000110, __x1000112]]]]]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 142; } else { __pc = 124; } break;
      }
      case 523: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === ",")) { __pc = 525; } else { __pc = 524; } break;
      }
      case 524: {
        d = c.set;
        b = __rf4(c);
        a = __rf5(c);
        e = [["=", "tape", ["call", __x1000115, [__x1000118, __x1000120, ["idx", __x1000122, ["lit", a[1]]]]]]];
        b = b.concat(e);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[1] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[1] = a2;
        d.call(c, "vs", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 142; } else { __pc = 124; } break;
      }
      case 525: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "[")) { __pc = 573; } else { __pc = 526; } break;
      }
      case 526: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 527; } else { __pc = 528; } break;
      }
      case 527: {
        b = c.get("vs");
        if (!(!c.has("seen"))) { __pc = 529; } else { __pc = 530; } break;
      }
      case 528: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 529: {
        a = b;
        b = c.get("seen");
        i = 0;
        __pc = 567; break;
      }
      case 530: {
        throw new Error(__s3);
      }
      case 531: {
        e = b.concat;
        b = ["S" + b.length, e.call(b, [["L26", a]])];
        d.call(c, "yes", b);
        __pc = 532; break;
      }
      case 532: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 533; } else { __pc = 534; } break;
      }
      case 533: {
        b = c.get("vs");
        if (!(!c.has("yes"))) { __pc = 535; } else { __pc = 536; } break;
      }
      case 534: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 535: {
        a = b;
        b = c.get("yes");
        a1 = b[1];
        i = 0;
        __pc = 561; break;
      }
      case 536: {
        throw new Error("flowchart: unbound variable yes");
      }
      case 537: {
        e = a1.concat;
        b = ["S" + a1.length, e.call(a1, [["L7", a]])];
        d.call(c, "no", b);
        __pc = 538; break;
      }
      case 538: {
        d = c.set;
        if (!(!c.has("no"))) { __pc = 539; } else { __pc = 540; } break;
      }
      case 539: {
        b = c.get("no");
        d.call(c, "seen", b[1]);
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 541; } else { __pc = 542; } break;
      }
      case 540: {
        throw new Error("flowchart: unbound variable no");
      }
      case 541: {
        c.get("vs");
        if (!(!c.has("yes"))) { __pc = 543; } else { __pc = 544; } break;
      }
      case 542: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 543: {
        b = c.get("yes");
        e = b[0];
        if (!(!c.has("no"))) { __pc = 545; } else { __pc = 546; } break;
      }
      case 544: {
        throw new Error("flowchart: unbound variable yes");
      }
      case 545: {
        b = c.get("no");
        b = ["if", ["bin", "===", ["idx", __x1000212, __x1000214], ["lit", 0]], e, b[0]];
        d.call(c, "jump", b);
        d = c.set;
        if (!(!c.has("residual"))) { __pc = 547; } else { __pc = 548; } break;
      }
      case 546: {
        throw new Error("flowchart: unbound variable no");
      }
      case 547: {
        b = c.get("residual");
        if (!(!c.has("n"))) { __pc = 549; } else { __pc = 550; } break;
      }
      case 548: {
        throw new Error(__s0);
      }
      case 549: {
        e = b;
        b = c.get("n");
        if (!(!c.has("code"))) { __pc = 551; } else { __pc = 552; } break;
      }
      case 550: {
        throw new Error("flowchart: unbound variable n");
      }
      case 551: {
        a = "S" + b;
        b = c.get("code");
        if (!(!c.has("jump"))) { __pc = 553; } else { __pc = 554; } break;
      }
      case 552: {
        throw new Error(__s1);
      }
      case 553: {
        f = b;
        b = c.get("jump");
        b = e.concat([[a, f, b]]);
        d.call(c, "residual", b);
        d = c.set;
        if (!(!c.has("n"))) { __pc = 555; } else { __pc = 556; } break;
      }
      case 554: {
        throw new Error(__s2);
      }
      case 555: {
        b = c.get("n");
        d.call(c, "n", b + 1);
        if (!(!c.has("n"))) { __pc = 557; } else { __pc = 558; } break;
      }
      case 556: {
        throw new Error("flowchart: unbound variable n");
      }
      case 557: {
        b = c.get("n");
        if (!(!c.has("seen"))) { __pc = 559; } else { __pc = 560; } break;
      }
      case 558: {
        throw new Error("flowchart: unbound variable n");
      }
      case 559: {
        d = b;
        b = c.get("seen");
        if (!(d < b.length)) { __pc = 422; } else { __pc = 340; } break;
      }
      case 560: {
        throw new Error(__s3);
      }
      case 561: {
        if (!(i < a1.length)) { __pc = 537; } else { __pc = 562; } break;
      }
      case 562: {
        e = a1[i][0] === "L7";
        if (!(e)) { __pc = 564; } else { __pc = 563; } break;
      }
      case 563: {
        e = __rf3(a1[i][1], a);
        __pc = 564; break;
      }
      case 564: {
        if (!(e)) { __pc = 565; } else { __pc = 566; } break;
      }
      case 565: {
        i += 1;
        __pc = 561; break;
      }
      case 566: {
        b = ["S" + i, a1];
        d.call(c, "no", b);
        __pc = 538; break;
      }
      case 567: {
        if (!(i < b.length)) { __pc = 531; } else { __pc = 568; } break;
      }
      case 568: {
        e = b[i][0] === "L26";
        if (!(e)) { __pc = 570; } else { __pc = 569; } break;
      }
      case 569: {
        e = __rf3(b[i][1], a);
        __pc = 570; break;
      }
      case 570: {
        if (!(e)) { __pc = 571; } else { __pc = 572; } break;
      }
      case 571: {
        i += 1;
        __pc = 567; break;
      }
      case 572: {
        b = ["S" + i, b];
        d.call(c, "yes", b);
        __pc = 532; break;
      }
      case 573: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "]")) { __pc = 621; } else { __pc = 574; } break;
      }
      case 574: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 575; } else { __pc = 576; } break;
      }
      case 575: {
        b = c.get("vs");
        if (!(!c.has("seen"))) { __pc = 577; } else { __pc = 578; } break;
      }
      case 576: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 577: {
        a = b;
        b = c.get("seen");
        i = 0;
        __pc = 615; break;
      }
      case 578: {
        throw new Error(__s3);
      }
      case 579: {
        e = b.concat;
        b = ["S" + b.length, e.call(b, [["L41", a]])];
        d.call(c, "yes", b);
        __pc = 580; break;
      }
      case 580: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 581; } else { __pc = 582; } break;
      }
      case 581: {
        b = c.get("vs");
        if (!(!c.has("yes"))) { __pc = 583; } else { __pc = 584; } break;
      }
      case 582: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 583: {
        a = b;
        b = c.get("yes");
        a1 = b[1];
        i = 0;
        __pc = 609; break;
      }
      case 584: {
        throw new Error("flowchart: unbound variable yes");
      }
      case 585: {
        e = a1.concat;
        b = ["S" + a1.length, e.call(a1, [["L7", a]])];
        d.call(c, "no", b);
        __pc = 586; break;
      }
      case 586: {
        d = c.set;
        if (!(!c.has("no"))) { __pc = 587; } else { __pc = 588; } break;
      }
      case 587: {
        b = c.get("no");
        d.call(c, "seen", b[1]);
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 589; } else { __pc = 590; } break;
      }
      case 588: {
        throw new Error("flowchart: unbound variable no");
      }
      case 589: {
        c.get("vs");
        if (!(!c.has("yes"))) { __pc = 591; } else { __pc = 592; } break;
      }
      case 590: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 591: {
        b = c.get("yes");
        e = b[0];
        if (!(!c.has("no"))) { __pc = 593; } else { __pc = 594; } break;
      }
      case 592: {
        throw new Error("flowchart: unbound variable yes");
      }
      case 593: {
        b = c.get("no");
        b = ["if", ["bin", "!==", ["idx", __x1001265, __x1001267], ["lit", 0]], e, b[0]];
        d.call(c, "jump", b);
        d = c.set;
        if (!(!c.has("residual"))) { __pc = 595; } else { __pc = 596; } break;
      }
      case 594: {
        throw new Error("flowchart: unbound variable no");
      }
      case 595: {
        b = c.get("residual");
        if (!(!c.has("n"))) { __pc = 597; } else { __pc = 598; } break;
      }
      case 596: {
        throw new Error(__s0);
      }
      case 597: {
        e = b;
        b = c.get("n");
        if (!(!c.has("code"))) { __pc = 599; } else { __pc = 600; } break;
      }
      case 598: {
        throw new Error("flowchart: unbound variable n");
      }
      case 599: {
        a = "S" + b;
        b = c.get("code");
        if (!(!c.has("jump"))) { __pc = 601; } else { __pc = 602; } break;
      }
      case 600: {
        throw new Error(__s1);
      }
      case 601: {
        f = b;
        b = c.get("jump");
        b = e.concat([[a, f, b]]);
        d.call(c, "residual", b);
        d = c.set;
        if (!(!c.has("n"))) { __pc = 603; } else { __pc = 604; } break;
      }
      case 602: {
        throw new Error(__s2);
      }
      case 603: {
        b = c.get("n");
        d.call(c, "n", b + 1);
        if (!(!c.has("n"))) { __pc = 605; } else { __pc = 606; } break;
      }
      case 604: {
        throw new Error("flowchart: unbound variable n");
      }
      case 605: {
        b = c.get("n");
        if (!(!c.has("seen"))) { __pc = 607; } else { __pc = 608; } break;
      }
      case 606: {
        throw new Error("flowchart: unbound variable n");
      }
      case 607: {
        d = b;
        b = c.get("seen");
        if (!(d < b.length)) { __pc = 498; } else { __pc = 487; } break;
      }
      case 608: {
        throw new Error(__s3);
      }
      case 609: {
        if (!(i < a1.length)) { __pc = 585; } else { __pc = 610; } break;
      }
      case 610: {
        e = a1[i][0] === "L7";
        if (!(e)) { __pc = 612; } else { __pc = 611; } break;
      }
      case 611: {
        e = __rf3(a1[i][1], a);
        __pc = 612; break;
      }
      case 612: {
        if (!(e)) { __pc = 613; } else { __pc = 614; } break;
      }
      case 613: {
        i += 1;
        __pc = 609; break;
      }
      case 614: {
        b = ["S" + i, a1];
        d.call(c, "no", b);
        __pc = 586; break;
      }
      case 615: {
        if (!(i < b.length)) { __pc = 579; } else { __pc = 616; } break;
      }
      case 616: {
        e = b[i][0] === "L41";
        if (!(e)) { __pc = 618; } else { __pc = 617; } break;
      }
      case 617: {
        e = __rf3(b[i][1], a);
        __pc = 618; break;
      }
      case 618: {
        if (!(e)) { __pc = 619; } else { __pc = 620; } break;
      }
      case 619: {
        i += 1;
        __pc = 615; break;
      }
      case 620: {
        b = ["S" + i, b];
        d.call(c, "yes", b);
        __pc = 580; break;
      }
      case 621: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 142; } else { __pc = 124; } break;
      }
      case 622: {
        a = __rf2(c);
        d = a[5];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d > 0)) { __pc = 624; } else { __pc = 623; } break;
      }
      case 623: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] - 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[0][a[2]];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "]")) { __pc = 107; } else { __pc = 86; } break;
      }
      case 624: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 142; } else { __pc = 124; } break;
      }
      case 625: {
        a = __rf2(c);
        d = a[5];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d > 0)) { __pc = 627; } else { __pc = 626; } break;
      }
      case 626: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] - 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[0][a[2]];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "]")) { __pc = 107; } else { __pc = 86; } break;
      }
      case 627: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 142; } else { __pc = 124; } break;
      }
      case 628: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "-")) { __pc = 630; } else { __pc = 629; } break;
      }
      case 629: {
        d = c.set;
        b = __rf4(c);
        a = __rf5(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.concat([["=", "tape", ["call", __x1000066, [__x1000069, __x1000071, ["bin", "%", ["bin", "+", ["idx", __x1000076, __x1000078], ["lit", 255]], ["lit", 256]]]]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 59; } else { __pc = 41; } break;
      }
      case 630: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === ">")) { __pc = 632; } else { __pc = 631; } break;
      }
      case 631: {
        d = c.set;
        b = __rf4(c);
        a = __rf5(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.concat([["=", "ptr", ["bin", "+", __x1000095, ["lit", 1]]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 59; } else { __pc = 41; } break;
      }
      case 632: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "<")) { __pc = 634; } else { __pc = 633; } break;
      }
      case 633: {
        d = c.set;
        b = __rf4(c);
        a = __rf5(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.concat([["=", "ptr", ["bin", "-", __x1000099, ["lit", 1]]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 59; } else { __pc = 41; } break;
      }
      case 634: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === ".")) { __pc = 636; } else { __pc = 635; } break;
      }
      case 635: {
        d = c.set;
        b = __rf4(c);
        __rf5(c);
        b = b.concat([["=", "out", ["call", ["dot", __x1000104, "concat"], [["arr", [["idx", __x1000110, __x1000112]]]]]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 59; } else { __pc = 41; } break;
      }
      case 636: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === ",")) { __pc = 638; } else { __pc = 637; } break;
      }
      case 637: {
        d = c.set;
        b = __rf4(c);
        a = __rf5(c);
        e = [["=", "tape", ["call", __x1000115, [__x1000118, __x1000120, ["idx", __x1000122, ["lit", a[1]]]]]]];
        b = b.concat(e);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[1] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[1] = a2;
        d.call(c, "vs", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 59; } else { __pc = 41; } break;
      }
      case 638: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "[")) { __pc = 680; } else { __pc = 639; } break;
      }
      case 639: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 640; } else { __pc = 641; } break;
      }
      case 640: {
        b = c.get("vs");
        if (!(!c.has("seen"))) { __pc = 642; } else { __pc = 643; } break;
      }
      case 641: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 642: {
        a = b;
        b = c.get("seen");
        i = 0;
        __pc = 674; break;
      }
      case 643: {
        throw new Error(__s3);
      }
      case 644: {
        e = b.concat;
        b = ["S" + b.length, e.call(b, [["L26", a]])];
        d.call(c, "yes", b);
        __pc = 645; break;
      }
      case 645: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 646; } else { __pc = 647; } break;
      }
      case 646: {
        b = c.get("vs");
        if (!(!c.has("yes"))) { __pc = 648; } else { __pc = 649; } break;
      }
      case 647: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 648: {
        a = b;
        b = c.get("yes");
        a1 = b[1];
        i = 0;
        __pc = 668; break;
      }
      case 649: {
        throw new Error("flowchart: unbound variable yes");
      }
      case 650: {
        e = a1.concat;
        b = ["S" + a1.length, e.call(a1, [["L7", a]])];
        d.call(c, "no", b);
        __pc = 651; break;
      }
      case 651: {
        d = c.set;
        if (!(!c.has("no"))) { __pc = 652; } else { __pc = 653; } break;
      }
      case 652: {
        b = c.get("no");
        d.call(c, "seen", b[1]);
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 654; } else { __pc = 655; } break;
      }
      case 653: {
        throw new Error("flowchart: unbound variable no");
      }
      case 654: {
        c.get("vs");
        if (!(!c.has("yes"))) { __pc = 656; } else { __pc = 657; } break;
      }
      case 655: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 656: {
        b = c.get("yes");
        e = b[0];
        if (!(!c.has("no"))) { __pc = 658; } else { __pc = 659; } break;
      }
      case 657: {
        throw new Error("flowchart: unbound variable yes");
      }
      case 658: {
        b = c.get("no");
        b = ["if", ["bin", "===", ["idx", __x1000212, __x1000214], ["lit", 0]], e, b[0]];
        d.call(c, "jump", b);
        d = c.set;
        if (!(!c.has("residual"))) { __pc = 660; } else { __pc = 661; } break;
      }
      case 659: {
        throw new Error("flowchart: unbound variable no");
      }
      case 660: {
        b = c.get("residual");
        if (!(!c.has("n"))) { __pc = 662; } else { __pc = 663; } break;
      }
      case 661: {
        throw new Error(__s0);
      }
      case 662: {
        e = b;
        b = c.get("n");
        if (!(!c.has("code"))) { __pc = 664; } else { __pc = 665; } break;
      }
      case 663: {
        throw new Error("flowchart: unbound variable n");
      }
      case 664: {
        a = "S" + b;
        b = c.get("code");
        if (!(!c.has("jump"))) { __pc = 666; } else { __pc = 667; } break;
      }
      case 665: {
        throw new Error(__s1);
      }
      case 666: {
        f = b;
        b = c.get("jump");
        b = e.concat([[a, f, b]]);
        d.call(c, "residual", b);
        if (!("L41" === __rf6(c))) { __pc = 333; } else { __pc = 331; } break;
      }
      case 667: {
        throw new Error(__s2);
      }
      case 668: {
        if (!(i < a1.length)) { __pc = 650; } else { __pc = 669; } break;
      }
      case 669: {
        e = a1[i][0] === "L7";
        if (!(e)) { __pc = 671; } else { __pc = 670; } break;
      }
      case 670: {
        e = __rf3(a1[i][1], a);
        __pc = 671; break;
      }
      case 671: {
        if (!(e)) { __pc = 672; } else { __pc = 673; } break;
      }
      case 672: {
        i += 1;
        __pc = 668; break;
      }
      case 673: {
        b = ["S" + i, a1];
        d.call(c, "no", b);
        __pc = 651; break;
      }
      case 674: {
        if (!(i < b.length)) { __pc = 644; } else { __pc = 675; } break;
      }
      case 675: {
        e = b[i][0] === "L26";
        if (!(e)) { __pc = 677; } else { __pc = 676; } break;
      }
      case 676: {
        e = __rf3(b[i][1], a);
        __pc = 677; break;
      }
      case 677: {
        if (!(e)) { __pc = 678; } else { __pc = 679; } break;
      }
      case 678: {
        i += 1;
        __pc = 674; break;
      }
      case 679: {
        b = ["S" + i, b];
        d.call(c, "yes", b);
        __pc = 645; break;
      }
      case 680: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "]")) { __pc = 722; } else { __pc = 681; } break;
      }
      case 681: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 682; } else { __pc = 683; } break;
      }
      case 682: {
        b = c.get("vs");
        if (!(!c.has("seen"))) { __pc = 684; } else { __pc = 685; } break;
      }
      case 683: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 684: {
        a = b;
        b = c.get("seen");
        i = 0;
        __pc = 716; break;
      }
      case 685: {
        throw new Error(__s3);
      }
      case 686: {
        e = b.concat;
        b = ["S" + b.length, e.call(b, [["L41", a]])];
        d.call(c, "yes", b);
        __pc = 687; break;
      }
      case 687: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 688; } else { __pc = 689; } break;
      }
      case 688: {
        b = c.get("vs");
        if (!(!c.has("yes"))) { __pc = 690; } else { __pc = 691; } break;
      }
      case 689: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 690: {
        a = b;
        b = c.get("yes");
        a1 = b[1];
        i = 0;
        __pc = 710; break;
      }
      case 691: {
        throw new Error("flowchart: unbound variable yes");
      }
      case 692: {
        e = a1.concat;
        b = ["S" + a1.length, e.call(a1, [["L7", a]])];
        d.call(c, "no", b);
        __pc = 693; break;
      }
      case 693: {
        d = c.set;
        if (!(!c.has("no"))) { __pc = 694; } else { __pc = 695; } break;
      }
      case 694: {
        b = c.get("no");
        d.call(c, "seen", b[1]);
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 696; } else { __pc = 697; } break;
      }
      case 695: {
        throw new Error("flowchart: unbound variable no");
      }
      case 696: {
        c.get("vs");
        if (!(!c.has("yes"))) { __pc = 698; } else { __pc = 699; } break;
      }
      case 697: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 698: {
        b = c.get("yes");
        e = b[0];
        if (!(!c.has("no"))) { __pc = 700; } else { __pc = 701; } break;
      }
      case 699: {
        throw new Error("flowchart: unbound variable yes");
      }
      case 700: {
        b = c.get("no");
        b = ["if", ["bin", "!==", ["idx", __x1001265, __x1001267], ["lit", 0]], e, b[0]];
        d.call(c, "jump", b);
        d = c.set;
        if (!(!c.has("residual"))) { __pc = 702; } else { __pc = 703; } break;
      }
      case 701: {
        throw new Error("flowchart: unbound variable no");
      }
      case 702: {
        b = c.get("residual");
        if (!(!c.has("n"))) { __pc = 704; } else { __pc = 705; } break;
      }
      case 703: {
        throw new Error(__s0);
      }
      case 704: {
        e = b;
        b = c.get("n");
        if (!(!c.has("code"))) { __pc = 706; } else { __pc = 707; } break;
      }
      case 705: {
        throw new Error("flowchart: unbound variable n");
      }
      case 706: {
        a = "S" + b;
        b = c.get("code");
        if (!(!c.has("jump"))) { __pc = 708; } else { __pc = 709; } break;
      }
      case 707: {
        throw new Error(__s1);
      }
      case 708: {
        f = b;
        b = c.get("jump");
        b = e.concat([[a, f, b]]);
        d.call(c, "residual", b);
        if (!("L41" === __rf6(c))) { __pc = 480; } else { __pc = 479; } break;
      }
      case 709: {
        throw new Error(__s2);
      }
      case 710: {
        if (!(i < a1.length)) { __pc = 692; } else { __pc = 711; } break;
      }
      case 711: {
        e = a1[i][0] === "L7";
        if (!(e)) { __pc = 713; } else { __pc = 712; } break;
      }
      case 712: {
        e = __rf3(a1[i][1], a);
        __pc = 713; break;
      }
      case 713: {
        if (!(e)) { __pc = 714; } else { __pc = 715; } break;
      }
      case 714: {
        i += 1;
        __pc = 710; break;
      }
      case 715: {
        b = ["S" + i, a1];
        d.call(c, "no", b);
        __pc = 693; break;
      }
      case 716: {
        if (!(i < b.length)) { __pc = 686; } else { __pc = 717; } break;
      }
      case 717: {
        e = b[i][0] === "L41";
        if (!(e)) { __pc = 719; } else { __pc = 718; } break;
      }
      case 718: {
        e = __rf3(b[i][1], a);
        __pc = 719; break;
      }
      case 719: {
        if (!(e)) { __pc = 720; } else { __pc = 721; } break;
      }
      case 720: {
        i += 1;
        __pc = 716; break;
      }
      case 721: {
        b = ["S" + i, b];
        d.call(c, "yes", b);
        __pc = 687; break;
      }
      case 722: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 59; } else { __pc = 41; } break;
      }
      case 723: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "-")) { __pc = 725; } else { __pc = 724; } break;
      }
      case 724: {
        d = c.set;
        b = __rf4(c);
        a = __rf5(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.concat([["=", "tape", ["call", __x1000066, [__x1000069, __x1000071, ["bin", "%", ["bin", "+", ["idx", __x1000076, __x1000078], ["lit", 255]], ["lit", 256]]]]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 21; } else { __pc = 3; } break;
      }
      case 725: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === ">")) { __pc = 727; } else { __pc = 726; } break;
      }
      case 726: {
        d = c.set;
        b = __rf4(c);
        a = __rf5(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.concat([["=", "ptr", ["bin", "+", __x1000095, ["lit", 1]]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 21; } else { __pc = 3; } break;
      }
      case 727: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "<")) { __pc = 729; } else { __pc = 728; } break;
      }
      case 728: {
        d = c.set;
        b = __rf4(c);
        a = __rf5(c);
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.concat([["=", "ptr", ["bin", "-", __x1000099, ["lit", 1]]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 21; } else { __pc = 3; } break;
      }
      case 729: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === ".")) { __pc = 731; } else { __pc = 730; } break;
      }
      case 730: {
        d = c.set;
        b = __rf4(c);
        __rf5(c);
        b = b.concat([["=", "out", ["call", ["dot", __x1000104, "concat"], [["arr", [["idx", __x1000110, __x1000112]]]]]]]);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 21; } else { __pc = 3; } break;
      }
      case 731: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === ",")) { __pc = 733; } else { __pc = 732; } break;
      }
      case 732: {
        d = c.set;
        b = __rf4(c);
        a = __rf5(c);
        e = [["=", "tape", ["call", __x1000115, [__x1000118, __x1000120, ["idx", __x1000122, ["lit", a[1]]]]]]];
        b = b.concat(e);
        d.call(c, "code", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[1] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[1] = a2;
        d.call(c, "vs", b);
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 21; } else { __pc = 3; } break;
      }
      case 733: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "[")) { __pc = 775; } else { __pc = 734; } break;
      }
      case 734: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 735; } else { __pc = 736; } break;
      }
      case 735: {
        b = c.get("vs");
        if (!(!c.has("seen"))) { __pc = 737; } else { __pc = 738; } break;
      }
      case 736: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 737: {
        a = b;
        b = c.get("seen");
        i = 0;
        __pc = 769; break;
      }
      case 738: {
        throw new Error(__s3);
      }
      case 739: {
        e = b.concat;
        b = ["S" + b.length, e.call(b, [["L26", a]])];
        d.call(c, "yes", b);
        __pc = 740; break;
      }
      case 740: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 741; } else { __pc = 742; } break;
      }
      case 741: {
        b = c.get("vs");
        if (!(!c.has("yes"))) { __pc = 743; } else { __pc = 744; } break;
      }
      case 742: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 743: {
        a = b;
        b = c.get("yes");
        a1 = b[1];
        i = 0;
        __pc = 763; break;
      }
      case 744: {
        throw new Error("flowchart: unbound variable yes");
      }
      case 745: {
        e = a1.concat;
        b = ["S" + a1.length, e.call(a1, [["L7", a]])];
        d.call(c, "no", b);
        __pc = 746; break;
      }
      case 746: {
        d = c.set;
        if (!(!c.has("no"))) { __pc = 747; } else { __pc = 748; } break;
      }
      case 747: {
        b = c.get("no");
        d.call(c, "seen", b[1]);
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 749; } else { __pc = 750; } break;
      }
      case 748: {
        throw new Error("flowchart: unbound variable no");
      }
      case 749: {
        c.get("vs");
        if (!(!c.has("yes"))) { __pc = 751; } else { __pc = 752; } break;
      }
      case 750: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 751: {
        b = c.get("yes");
        e = b[0];
        if (!(!c.has("no"))) { __pc = 753; } else { __pc = 754; } break;
      }
      case 752: {
        throw new Error("flowchart: unbound variable yes");
      }
      case 753: {
        b = c.get("no");
        b = ["if", ["bin", "===", ["idx", __x1000212, __x1000214], ["lit", 0]], e, b[0]];
        d.call(c, "jump", b);
        d = c.set;
        if (!(!c.has("residual"))) { __pc = 755; } else { __pc = 756; } break;
      }
      case 754: {
        throw new Error("flowchart: unbound variable no");
      }
      case 755: {
        b = c.get("residual");
        if (!(!c.has("n"))) { __pc = 757; } else { __pc = 758; } break;
      }
      case 756: {
        throw new Error(__s0);
      }
      case 757: {
        e = b;
        b = c.get("n");
        if (!(!c.has("code"))) { __pc = 759; } else { __pc = 760; } break;
      }
      case 758: {
        throw new Error("flowchart: unbound variable n");
      }
      case 759: {
        a = "S" + b;
        b = c.get("code");
        if (!(!c.has("jump"))) { __pc = 761; } else { __pc = 762; } break;
      }
      case 760: {
        throw new Error(__s1);
      }
      case 761: {
        f = b;
        b = c.get("jump");
        b = e.concat([[a, f, b]]);
        d.call(c, "residual", b);
        if (!("L7" === __rf6(c))) { __pc = 328; } else { __pc = 327; } break;
      }
      case 762: {
        throw new Error(__s2);
      }
      case 763: {
        if (!(i < a1.length)) { __pc = 745; } else { __pc = 764; } break;
      }
      case 764: {
        e = a1[i][0] === "L7";
        if (!(e)) { __pc = 766; } else { __pc = 765; } break;
      }
      case 765: {
        e = __rf3(a1[i][1], a);
        __pc = 766; break;
      }
      case 766: {
        if (!(e)) { __pc = 767; } else { __pc = 768; } break;
      }
      case 767: {
        i += 1;
        __pc = 763; break;
      }
      case 768: {
        b = ["S" + i, a1];
        d.call(c, "no", b);
        __pc = 746; break;
      }
      case 769: {
        if (!(i < b.length)) { __pc = 739; } else { __pc = 770; } break;
      }
      case 770: {
        e = b[i][0] === "L26";
        if (!(e)) { __pc = 772; } else { __pc = 771; } break;
      }
      case 771: {
        e = __rf3(b[i][1], a);
        __pc = 772; break;
      }
      case 772: {
        if (!(e)) { __pc = 773; } else { __pc = 774; } break;
      }
      case 773: {
        i += 1;
        __pc = 769; break;
      }
      case 774: {
        b = ["S" + i, b];
        d.call(c, "yes", b);
        __pc = 740; break;
      }
      case 775: {
        a = __rf2(c);
        d = a[3];
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d === "]")) { __pc = 817; } else { __pc = 776; } break;
      }
      case 776: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 777; } else { __pc = 778; } break;
      }
      case 777: {
        b = c.get("vs");
        if (!(!c.has("seen"))) { __pc = 779; } else { __pc = 780; } break;
      }
      case 778: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 779: {
        a = b;
        b = c.get("seen");
        i = 0;
        __pc = 811; break;
      }
      case 780: {
        throw new Error(__s3);
      }
      case 781: {
        e = b.concat;
        b = ["S" + b.length, e.call(b, [["L41", a]])];
        d.call(c, "yes", b);
        __pc = 782; break;
      }
      case 782: {
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 783; } else { __pc = 784; } break;
      }
      case 783: {
        b = c.get("vs");
        if (!(!c.has("yes"))) { __pc = 785; } else { __pc = 786; } break;
      }
      case 784: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 785: {
        a = b;
        b = c.get("yes");
        a1 = b[1];
        i = 0;
        __pc = 805; break;
      }
      case 786: {
        throw new Error("flowchart: unbound variable yes");
      }
      case 787: {
        e = a1.concat;
        b = ["S" + a1.length, e.call(a1, [["L7", a]])];
        d.call(c, "no", b);
        __pc = 788; break;
      }
      case 788: {
        d = c.set;
        if (!(!c.has("no"))) { __pc = 789; } else { __pc = 790; } break;
      }
      case 789: {
        b = c.get("no");
        d.call(c, "seen", b[1]);
        d = c.set;
        if (!(!c.has("vs"))) { __pc = 791; } else { __pc = 792; } break;
      }
      case 790: {
        throw new Error("flowchart: unbound variable no");
      }
      case 791: {
        c.get("vs");
        if (!(!c.has("yes"))) { __pc = 793; } else { __pc = 794; } break;
      }
      case 792: {
        throw new Error("flowchart: unbound variable vs");
      }
      case 793: {
        b = c.get("yes");
        e = b[0];
        if (!(!c.has("no"))) { __pc = 795; } else { __pc = 796; } break;
      }
      case 794: {
        throw new Error("flowchart: unbound variable yes");
      }
      case 795: {
        b = c.get("no");
        b = ["if", ["bin", "!==", ["idx", __x1001265, __x1001267], ["lit", 0]], e, b[0]];
        d.call(c, "jump", b);
        d = c.set;
        if (!(!c.has("residual"))) { __pc = 797; } else { __pc = 798; } break;
      }
      case 796: {
        throw new Error("flowchart: unbound variable no");
      }
      case 797: {
        b = c.get("residual");
        if (!(!c.has("n"))) { __pc = 799; } else { __pc = 800; } break;
      }
      case 798: {
        throw new Error(__s0);
      }
      case 799: {
        e = b;
        b = c.get("n");
        if (!(!c.has("code"))) { __pc = 801; } else { __pc = 802; } break;
      }
      case 800: {
        throw new Error("flowchart: unbound variable n");
      }
      case 801: {
        a = "S" + b;
        b = c.get("code");
        if (!(!c.has("jump"))) { __pc = 803; } else { __pc = 804; } break;
      }
      case 802: {
        throw new Error(__s1);
      }
      case 803: {
        f = b;
        b = c.get("jump");
        b = e.concat([[a, f, b]]);
        d.call(c, "residual", b);
        if (!("L7" === __rf6(c))) { __pc = 478; } else { __pc = 477; } break;
      }
      case 804: {
        throw new Error(__s2);
      }
      case 805: {
        if (!(i < a1.length)) { __pc = 787; } else { __pc = 806; } break;
      }
      case 806: {
        e = a1[i][0] === "L7";
        if (!(e)) { __pc = 808; } else { __pc = 807; } break;
      }
      case 807: {
        e = __rf3(a1[i][1], a);
        __pc = 808; break;
      }
      case 808: {
        if (!(e)) { __pc = 809; } else { __pc = 810; } break;
      }
      case 809: {
        i += 1;
        __pc = 805; break;
      }
      case 810: {
        b = ["S" + i, a1];
        d.call(c, "no", b);
        __pc = 788; break;
      }
      case 811: {
        if (!(i < b.length)) { __pc = 781; } else { __pc = 812; } break;
      }
      case 812: {
        e = b[i][0] === "L41";
        if (!(e)) { __pc = 814; } else { __pc = 813; } break;
      }
      case 813: {
        e = __rf3(b[i][1], a);
        __pc = 814; break;
      }
      case 814: {
        if (!(e)) { __pc = 815; } else { __pc = 816; } break;
      }
      case 815: {
        i += 1;
        __pc = 811; break;
      }
      case 816: {
        b = ["S" + i, b];
        d.call(c, "yes", b);
        __pc = 782; break;
      }
      case 817: {
        d = c.set;
        b = __rf0(c);
        a = __rf1(c);
        a2 = a[2] + 1;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        b = b.slice();
        b[2] = a2;
        d.call(c, "vs", b);
        a = __rf2(c);
        d = a[2];
        e = (a[0]).length;
        a[0];
        a[1];
        a[2];
        a[3];
        a[4];
        a[5];
        if (!(d < e)) { __pc = 21; } else { __pc = 3; } break;
      }
    }
  }
}
