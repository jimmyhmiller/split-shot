// style: Thompson NFA simulation (regex -> postfix -> state graph at load, lock-step state lists per character)
// residue: NFA_(SPLIT|CHAR|CLASS|ANY|MATCH)
// Russ Cox's "Regular Expression Matching Can Be Simple And Fast" in
// JavaScript: a regex for e-mail addresses is parsed to postfix with explicit
// concatenation, built into an NFA by Thompson's construction once at load,
// and every input string is run through the NFA by simulating all states at
// once. Supports literals, \escapes, ., [classes] with ranges and ^, | * + ? ().
const PATTERN = "[a-z0-9._%+-]+@[a-z0-9-]+(\\.[a-z0-9-]+)*\\.(com|org|net|io)";

function parseClass(re, i) {
  // re[i] is the character after '['
  const ranges = [];
  let negated = false;
  if (re[i] === "^") { negated = true; i++; }
  while (i < re.length && re[i] !== "]") {
    let lo = re[i];
    if (lo === "\\") { i++; lo = re[i]; }
    if (re[i + 1] === "-" && re[i + 2] !== undefined && re[i + 2] !== "]") {
      ranges.push([lo, re[i + 2]]);
      i += 3;
    } else {
      ranges.push([lo, lo]);
      i++;
    }
  }
  if (re[i] !== "]") throw new SyntaxError("unterminated class in " + re);
  return { atom: { kind: "class", ranges, negated }, next: i + 1 };
}

function tokenize(re) {
  const toks = [];
  let i = 0;
  while (i < re.length) {
    const ch = re[i];
    if (ch === "\\") {
      if (i + 1 >= re.length) throw new SyntaxError("trailing backslash");
      toks.push({ t: "atom", atom: { kind: "char", c: re[i + 1] } });
      i += 2;
    } else if (ch === "[") {
      const { atom, next } = parseClass(re, i + 1);
      toks.push({ t: "atom", atom });
      i = next;
    } else if (ch === ".") {
      toks.push({ t: "atom", atom: { kind: "any" } });
      i++;
    } else if (ch === "|" || ch === "*" || ch === "+" || ch === "?" || ch === "(" || ch === ")") {
      toks.push({ t: ch });
      i++;
    } else {
      toks.push({ t: "atom", atom: { kind: "char", c: ch } });
      i++;
    }
  }
  return toks;
}

// Cox's re2post: insert explicit concatenation ("cat") and emit postfix.
function toPostfix(toks) {
  const out = [];
  const parens = [];
  let nalt = 0;
  let natom = 0;
  for (const tok of toks) {
    switch (tok.t) {
      case "(":
        if (natom > 1) { natom--; out.push({ t: "cat" }); }
        parens.push({ nalt, natom });
        nalt = 0;
        natom = 0;
        break;
      case "|":
        if (natom === 0) throw new SyntaxError("empty alternative");
        while (--natom > 0) out.push({ t: "cat" });
        nalt++;
        break;
      case ")": {
        if (parens.length === 0) throw new SyntaxError("unbalanced )");
        if (natom === 0) throw new SyntaxError("empty group");
        while (--natom > 0) out.push({ t: "cat" });
        for (; nalt > 0; nalt--) out.push({ t: "|" });
        const p = parens.pop();
        nalt = p.nalt;
        natom = p.natom;
        natom++;
        break;
      }
      case "*":
      case "+":
      case "?":
        if (natom === 0) throw new SyntaxError("nothing to repeat");
        out.push({ t: tok.t });
        break;
      default:
        if (natom > 1) { natom--; out.push({ t: "cat" }); }
        out.push(tok);
        natom++;
    }
  }
  if (parens.length !== 0) throw new SyntaxError("unbalanced (");
  while (--natom > 0) out.push({ t: "cat" });
  for (; nalt > 0; nalt--) out.push({ t: "|" });
  return out;
}

function atomState(atom) {
  if (atom.kind === "char") return { kind: "NFA_CHAR", c: atom.c, out: null, lastList: -1 };
  if (atom.kind === "any") return { kind: "NFA_ANY", out: null, lastList: -1 };
  return { kind: "NFA_CLASS", ranges: atom.ranges, negated: atom.negated, out: null, lastList: -1 };
}

function split(out, out1) {
  return { kind: "NFA_SPLIT", out, out1, lastList: -1 };
}

function patch(dangling, target) {
  for (const [state, field] of dangling) state[field] = target;
}

// Thompson's construction over the postfix form.
function buildNfa(post) {
  const stack = [];
  for (const p of post) {
    switch (p.t) {
      case "atom": {
        const s = atomState(p.atom);
        stack.push({ start: s, out: [[s, "out"]] });
        break;
      }
      case "cat": {
        const e2 = stack.pop();
        const e1 = stack.pop();
        patch(e1.out, e2.start);
        stack.push({ start: e1.start, out: e2.out });
        break;
      }
      case "|": {
        const e2 = stack.pop();
        const e1 = stack.pop();
        stack.push({ start: split(e1.start, e2.start), out: e1.out.concat(e2.out) });
        break;
      }
      case "?": {
        const e = stack.pop();
        const s = split(e.start, null);
        stack.push({ start: s, out: e.out.concat([[s, "out1"]]) });
        break;
      }
      case "*": {
        const e = stack.pop();
        const s = split(e.start, null);
        patch(e.out, s);
        stack.push({ start: s, out: [[s, "out1"]] });
        break;
      }
      case "+": {
        const e = stack.pop();
        const s = split(e.start, null);
        patch(e.out, s);
        stack.push({ start: e.start, out: [[s, "out1"]] });
        break;
      }
      default:
        throw new Error("bad postfix token " + p.t);
    }
  }
  const e = stack.pop();
  if (stack.length !== 0) throw new Error("malformed postfix");
  patch(e.out, { kind: "NFA_MATCH", lastList: -1 });
  return e.start;
}

let listId = 0;

function addState(list, s) {
  if (s === null || s.lastList === listId) return;
  s.lastList = listId;
  if (s.kind === "NFA_SPLIT") {
    addState(list, s.out);
    addState(list, s.out1);
    return;
  }
  list.push(s);
}

function inClass(s, ch) {
  let hit = false;
  for (const [lo, hi] of s.ranges) {
    if (ch >= lo && ch <= hi) { hit = true; break; }
  }
  return hit !== s.negated;
}

function step(clist, ch) {
  listId++;
  const nlist = [];
  for (const s of clist) {
    switch (s.kind) {
      case "NFA_CHAR":
        if (s.c === ch) addState(nlist, s.out);
        break;
      case "NFA_ANY":
        addState(nlist, s.out);
        break;
      case "NFA_CLASS":
        if (inClass(s, ch)) addState(nlist, s.out);
        break;
      case "NFA_MATCH":
        break;
      default:
        throw new Error("bad state " + s.kind);
    }
  }
  return nlist;
}

function fullMatch(start, str) {
  listId++;
  let clist = [];
  addState(clist, start);
  for (let i = 0; i < str.length && clist.length > 0; i++) {
    clist = step(clist, str[i]);
  }
  for (const s of clist) if (s.kind === "NFA_MATCH") return true;
  return false;
}

const START = buildNfa(toPostfix(tokenize(PATTERN)));

export function main(input) {
  return input.map((s) => fullMatch(START, s));
}

export const inputs = [[],[""],["a@b.com","a@b.c","@b.com","a@.com","a@b..com","A@b.com","x@y.z.io"],["first.last+tag@mail.example.org","first.last+tag@mail.example.org.","user@sub-domain.co.uk.net"],["pr7w_+@@03.md6.bd6.net","4@f9kglfk3m.net","%5n4eyksb@56m4p.9.ak.edu","tx6va@0.j.bdi-.net","9d5ssm@@i0f1noaii.gep5616e.c15dpl80.net","l_194a.-5mg@j8.org","lzy@lhg9.id26n3a.edu",".7h1tt-+_a+f@71jh-133.j2.io","r..4v@1mnd288g5.comm","xyrd@jfo8.2.io","%56nopor@8g.4o4o-7kg.c.com","3p1l9f1mga.35l8673o8.48aamnb.com","e6l@o.ek3a.ngn.net","kyy@hhp.e09opcoa.io","c.an@p.e28cmpap.63dbj.io","3104.vb@ac.f3aab.com","48u1kc@ic.8hbai8mf.16k9.org","frtb@gp-kh4fpk.f17feb.i958i.com","+80j0s42ay@l9hieb.d4180ka.ee.com","n4l1y@h.net"],["j8ab.0rk-6+@8455bn.0cp.9dp.net",".nspzx+6qhq0@f-90b59.co","xpsuebi+@o20m31.com","sq_zr1cip@a0ap8.ngi72ook.4pomc8.edu","xip6wxnv7z6s@ghcj8ng.9.org","07_rew_y2rh@12gcc.6k7.8.org","v@bdp9.net","dw9l61dtj@j09.org",".rl4sw.u6ohf@@h37b0m5.ockfl19p.net","tq+6@ele7.cp88h852i.com","jdvfn_v7obvk@4ocbbcdl4.2a.850agl.io","lnbwyl_hku@cdpo1c8.i1ang7a1.Com","yc_k30@eln3i404n.ma.82g6efo8.io","5hbcboe.a.6f85b5d.com","a0oc%bth@72olllpae.org","ip@n1.6b.io","7m5@@4.net",".8rhg%8@@-.h--3.42ii9doem.net","1e2n@c1kp.clh0.io","1t@d6cf.el83b6bd0.klf-e52.io","a3j6b2@knp6734k.2ad24.net","uso_555m@6lgf8f-.4a16j7.h.Com","5tkam@hg36.Com","u-b210j.com","-723vqxszkwkh7k85.3jaaehh2.d40.com","p_l@i5k-a.j1c1kgg.com","x+n+2g6l.e.com","9is.n@8.org","m7g4rpn4fek@@64.net","e.pf1@ig4jb48b.net","p.syas9@e.dd.-2b.com",".5a7-r53@dhh7le.1mim61122.h.co","4+osna%6c2hyndmhb4fge.6d1b7jl-.d3mm6fch.com","afz3o@@8.net","arob9buek36.9f13p9.com","m+8+ekuppu2l@i-0e33h9.net","ob16xfem3bs.@0a39p2kb.io","ek1wx@b-3ajbn3.eojben.g1h36mooi.com","joduayy@h.hi499.com","ip%y3-5zk@aco7pmoh.986f21.hmopn36b.com","wvxhjfn820mmpgn85l.h.87h7.com","aun9d6nu+5@@nba7imoa.kmg2okn.d.net","vqun84@lgcje5.Com","jyhs-.0lkiqx@1.0bebm62d4.of7c.io","d9@@a21.net","zgt0q@d569adl.0771l2o.5j3p3.com","hww0pzfyaz5jicoeog.c8d.com","ky@6ncdg.org","5t@@e.kmj4-6.j3cd7.net","d8om+d9y6b@46e347o-.3lphhd.k5eck4.com","qv-v@j.net","%p1a@159p.c1k7eo.io","434n2cw%i@@1924-5.a.net","u-y0fji@8pacim9.org","+@6eab.-c2pfig.e68jdgc0.io","3p1-dit%_%u@0d2.6oic71b4j.io","3@a54o8l9if.d1fof9olo.5i07jl.io","vlv@k.8.com","dt1q55646b@e.ba3egch2.b0e-m6c9.io","spgof-dc@754dlj7.2093k-3.Com","kozb_y@c5l5h.-.net","-amj9b+fe.@--.com","nk6j+2nfer9@3e7-o.occong64.54jo8f2.edu","9ol@@nkdjn-dn1.net","3@6mngg-md.68jgn.comm","7cqy@@9-n-h.g0a7ghf1n.j569632-n.net","u.9na77lp.9h-k5dc.com","epysf_g.hw@pk55p6bii.co","kojnkd1%@c3178c.io","0rxwsg_0b7tj6m1c.710ng88b.com","oezpe@m-7hjl.oglp4-4b8.nkfg4797.net","%+9fxeuny@398.0g.bd22j.org","t1ll.+1@j1a9.j1mnlog7f.io","%08x2s62a@cmm6h242j.c55-bi93b.net","4xhpo@e4ijm3.nfpah.org","h+e_ob4@@d86.c87.net","aj1y9bz+6%9b@@d2dl9.net","+%0o9vvkaad715-e9c.8hfne.com","85z7l+vyk+x+@2ocmo1g.io","97@@615n.b5dld2.net"]];
