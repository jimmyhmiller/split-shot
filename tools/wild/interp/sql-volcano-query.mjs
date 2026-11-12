// style: SQL query engine (SQL text parsed at load to an expression AST and a plan tree; pull-based volcano iterators, expressions evaluated by a recursive switch)
// residue: "(Plan|Expr)(Scan|Filter|Project|Aggregate|Sort|Limit|Column|Literal|Binary|Not|Call|Agg)"
// A tiny SQL engine: SELECT expressions [AS alias], FROM one table, WHERE,
// GROUP BY with COUNT/SUM/AVG/MIN/MAX, HAVING, ORDER BY (on output columns)
// ASC/DESC, LIMIT. Expressions: + - * / % = <> != < <= > >= AND OR NOT LIKE,
// IS NULL, functions UPPER LOWER LENGTH COALESCE ROUND. Two fixed queries
// over an employees table are parsed and planned once; each call runs both
// over the input table.
const QUERIES = {
  shortlist: `
    SELECT name, dept, salary * 1.1 AS raised, UPPER(city) AS city
    FROM employees
    WHERE (dept = 'eng' OR dept = 'ops') AND salary >= 50000 AND NOT city LIKE 'S%'
      AND manager IS NOT NULL
    ORDER BY dept ASC, raised DESC, name
    LIMIT 10`,
  byDept: `
    SELECT dept, COUNT(*) AS n, ROUND(AVG(salary)) AS avg_salary, MAX(age) AS oldest,
           SUM(bonus) AS bonus
    FROM employees
    WHERE age > 25
    GROUP BY dept
    HAVING COUNT(*) >= 2
    ORDER BY n DESC, dept`,
};

// ---- lexer ----
const KEYWORDS = new Set(["SELECT", "FROM", "WHERE", "GROUP", "BY", "HAVING", "ORDER", "ASC", "DESC", "LIMIT",
  "AS", "AND", "OR", "NOT", "LIKE", "IS", "NULL", "TRUE", "FALSE"]);

function tokenize(sql) {
  const toks = [];
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (c === " " || c === "\n" || c === "\t" || c === "\r") { i++; continue; }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < sql.length && /[A-Za-z0-9_]/.test(sql[j])) j++;
      const word = sql.slice(i, j);
      const upper = word.toUpperCase();
      toks.push(KEYWORDS.has(upper) ? { k: "kw", v: upper } : { k: "id", v: word });
      i = j;
    } else if (/[0-9]/.test(c)) {
      let j = i;
      while (j < sql.length && /[0-9.]/.test(sql[j])) j++;
      toks.push({ k: "num", v: Number(sql.slice(i, j)) });
      i = j;
    } else if (c === "'") {
      let j = i + 1;
      let s = "";
      for (;;) {
        if (j >= sql.length) throw new SyntaxError("unterminated string");
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") { s += "'"; j += 2; continue; }
          break;
        }
        s += sql[j++];
      }
      toks.push({ k: "str", v: s });
      i = j + 1;
    } else {
      const two = sql.slice(i, i + 2);
      if (two === "<=" || two === ">=" || two === "<>" || two === "!=") { toks.push({ k: "op", v: two }); i += 2; }
      else if ("=<>+-*/%(),".includes(c)) { toks.push({ k: "op", v: c }); i++; }
      else throw new SyntaxError("unexpected character " + c);
    }
  }
  toks.push({ k: "eof", v: null });
  return toks;
}

// ---- parser ----
const AGGREGATES = new Set(["COUNT", "SUM", "AVG", "MIN", "MAX"]);

function parseQuery(sql) {
  const toks = tokenize(sql);
  let p = 0;
  const peek = () => toks[p];
  const isKw = (v) => toks[p].k === "kw" && toks[p].v === v;
  const isOp = (v) => toks[p].k === "op" && toks[p].v === v;
  const expectKw = (v) => { if (!isKw(v)) throw new SyntaxError("expected " + v + " at token " + p); p++; };
  const expectOp = (v) => { if (!isOp(v)) throw new SyntaxError("expected " + v + " at token " + p); p++; };

  const BINARY_PREC = { OR: 1, AND: 2, "=": 4, "<>": 4, "!=": 4, "<": 4, "<=": 4, ">": 4, ">=": 4, LIKE: 4,
    "+": 5, "-": 5, "*": 6, "/": 6, "%": 6 };

  function parsePrimary() {
    const t = peek();
    if (t.k === "num" || t.k === "str") { p++; return { type: "ExprLiteral", value: t.v }; }
    if (t.k === "kw" && (t.v === "NULL" || t.v === "TRUE" || t.v === "FALSE")) {
      p++;
      return { type: "ExprLiteral", value: t.v === "NULL" ? null : t.v === "TRUE" };
    }
    if (t.k === "kw" && t.v === "NOT") { p++; return { type: "ExprNot", arg: parseExpr(3) }; }
    if (t.k === "op" && t.v === "-") { p++; return { type: "ExprBinary", op: "-", left: { type: "ExprLiteral", value: 0 }, right: parsePrimary() }; }
    if (t.k === "op" && t.v === "(") { p++; const e = parseExpr(0); expectOp(")"); return e; }
    if (t.k === "id") {
      p++;
      if (!isOp("(")) return { type: "ExprColumn", name: t.v };
      p++;
      const fn = t.v.toUpperCase();
      if (AGGREGATES.has(fn)) {
        let arg = null;
        if (isOp("*")) p++;
        else arg = parseExpr(0);
        expectOp(")");
        return { type: "ExprAgg", fn, arg, slot: -1 };
      }
      const args = [];
      if (!isOp(")")) {
        args.push(parseExpr(0));
        while (isOp(",")) { p++; args.push(parseExpr(0)); }
      }
      expectOp(")");
      return { type: "ExprCall", fn, args };
    }
    throw new SyntaxError("unexpected token " + JSON.stringify(t));
  }

  function parseExpr(minPrec) {
    let left = parsePrimary();
    for (;;) {
      const t = peek();
      if (t.k === "kw" && t.v === "IS") {
        p++;
        let negate = false;
        if (isKw("NOT")) { p++; negate = true; }
        expectKw("NULL");
        left = { type: "ExprBinary", op: negate ? "IS NOT" : "IS", left, right: { type: "ExprLiteral", value: null } };
        continue;
      }
      if (t.k === "kw" && t.v === "NOT" && toks[p + 1].k === "kw" && toks[p + 1].v === "LIKE" && 4 > minPrec) {
        p += 2;
        left = { type: "ExprNot", arg: { type: "ExprBinary", op: "LIKE", left, right: parseExpr(4) } };
        continue;
      }
      const op = t.k === "op" || t.k === "kw" ? t.v : null;
      const prec = op !== null && Object.prototype.hasOwnProperty.call(BINARY_PREC, op) ? BINARY_PREC[op] : -1;
      if (prec <= minPrec) return left;
      p++;
      left = { type: "ExprBinary", op, left, right: parseExpr(prec) };
    }
  }

  expectKw("SELECT");
  const columns = [];
  do {
    if (columns.length > 0) p++;
    const expr = parseExpr(0);
    let alias = expr.type === "ExprColumn" ? expr.name : "col" + (columns.length + 1);
    if (isKw("AS")) { p++; alias = peek().v; p++; }
    columns.push({ expr, alias });
  } while (isOp(","));
  expectKw("FROM");
  const table = peek().v;
  p++;
  let where = null, groupBy = null, having = null, limit = null;
  const orderBy = [];
  if (isKw("WHERE")) { p++; where = parseExpr(0); }
  if (isKw("GROUP")) {
    p++; expectKw("BY");
    groupBy = [parseExpr(0)];
    while (isOp(",")) { p++; groupBy.push(parseExpr(0)); }
  }
  if (isKw("HAVING")) { p++; having = parseExpr(0); }
  if (isKw("ORDER")) {
    p++; expectKw("BY");
    do {
      if (orderBy.length > 0) p++;
      const expr = parseExpr(0);
      let desc = false;
      if (isKw("ASC")) p++;
      else if (isKw("DESC")) { p++; desc = true; }
      orderBy.push({ expr, desc });
    } while (isOp(","));
  }
  if (isKw("LIMIT")) { p++; limit = peek().v; p++; }
  if (peek().k !== "eof") throw new SyntaxError("trailing tokens at " + p);
  return { columns, table, where, groupBy, having, orderBy, limit };
}

// ---- planner ----
function collectAggs(e, out) {
  if (e === null) return;
  switch (e.type) {
    case "ExprAgg": e.slot = out.length; out.push(e); return;
    case "ExprBinary": collectAggs(e.left, out); collectAggs(e.right, out); return;
    case "ExprNot": collectAggs(e.arg, out); return;
    case "ExprCall": for (const a of e.args) collectAggs(a, out); return;
  }
}

function plan(q) {
  let node = { type: "PlanScan", table: q.table };
  if (q.where !== null) node = { type: "PlanFilter", input: node, pred: q.where };
  const aggs = [];
  for (const c of q.columns) collectAggs(c.expr, aggs);
  collectAggs(q.having, aggs);
  if (q.groupBy !== null || aggs.length > 0) {
    node = { type: "PlanAggregate", input: node, keys: q.groupBy || [], aggs };
    if (q.having !== null) node = { type: "PlanFilter", input: node, pred: q.having };
  }
  node = { type: "PlanProject", input: node, columns: q.columns };
  if (q.orderBy.length > 0) node = { type: "PlanSort", input: node, keys: q.orderBy };
  if (q.limit !== null) node = { type: "PlanLimit", input: node, count: q.limit };
  return node;
}

// ---- expressions ----
function likeMatch(s, pat, i, j) {
  while (j < pat.length) {
    const c = pat[j];
    if (c === "%") {
      for (let k = i; k <= s.length; k++) if (likeMatch(s, pat, k, j + 1)) return true;
      return false;
    }
    if (i >= s.length || (c !== "_" && c !== s[i])) return false;
    i++;
    j++;
  }
  return i === s.length;
}

function evalExpr(e, tuple) {
  switch (e.type) {
    case "ExprLiteral": return e.value;
    case "ExprColumn": {
      if (!Object.prototype.hasOwnProperty.call(tuple.row, e.name)) return null;
      return tuple.row[e.name];
    }
    case "ExprAgg":
      if (tuple.aggs === null) throw new Error("aggregate outside GROUP BY");
      return tuple.aggs[e.slot];
    case "ExprNot": {
      const v = evalExpr(e.arg, tuple);
      return v === null ? null : !v;
    }
    case "ExprCall": {
      const args = e.args.map((a) => evalExpr(a, tuple));
      switch (e.fn) {
        case "UPPER": return args[0] === null ? null : String(args[0]).toUpperCase();
        case "LOWER": return args[0] === null ? null : String(args[0]).toLowerCase();
        case "LENGTH": return args[0] === null ? null : String(args[0]).length;
        case "ROUND": return args[0] === null ? null : Math.round(args[0]);
        case "COALESCE": { for (const a of args) if (a !== null) return a; return null; }
      }
      throw new Error("unknown function " + e.fn);
    }
    case "ExprBinary": {
      if (e.op === "AND") {
        const l = evalExpr(e.left, tuple);
        if (l === false) return false;
        const r = evalExpr(e.right, tuple);
        if (r === false) return false;
        return l === null || r === null ? null : true;
      }
      if (e.op === "OR") {
        const l = evalExpr(e.left, tuple);
        if (l === true) return true;
        const r = evalExpr(e.right, tuple);
        if (r === true) return true;
        return l === null || r === null ? null : false;
      }
      const l = evalExpr(e.left, tuple);
      if (e.op === "IS") return l === null;
      if (e.op === "IS NOT") return l !== null;
      const r = evalExpr(e.right, tuple);
      if (l === null || r === null) return null;
      switch (e.op) {
        case "+": return l + r;
        case "-": return l - r;
        case "*": return l * r;
        case "/": return r === 0 ? null : l / r;
        case "%": return r === 0 ? null : l % r;
        case "=": return l === r;
        case "<>": case "!=": return l !== r;
        case "<": return l < r;
        case "<=": return l <= r;
        case ">": return l > r;
        case ">=": return l >= r;
        case "LIKE": return likeMatch(String(l), String(r), 0, 0);
      }
      throw new Error("unknown operator " + e.op);
    }
  }
  throw new Error("unknown expression " + e.type);
}

function compareValues(a, b) {
  if (a === b) return 0;
  if (a === null) return -1; // NULLS FIRST
  if (b === null) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

// ---- volcano executor: open(plan) gives an iterator whose next() is a tuple or null ----
function open(node, db) {
  switch (node.type) {
    case "PlanScan": {
      const rows = db[node.table];
      if (!Array.isArray(rows)) throw new Error("no such table " + node.table);
      let i = 0;
      return { next: () => (i < rows.length ? { row: rows[i++], aggs: null } : null) };
    }
    case "PlanFilter": {
      const input = open(node.input, db);
      return {
        next: () => {
          for (let t = input.next(); t !== null; t = input.next()) {
            if (evalExpr(node.pred, t) === true) return t;
          }
          return null;
        },
      };
    }
    case "PlanAggregate": {
      const input = open(node.input, db);
      let groups = null;
      let gi = 0;
      const build = () => {
        const byKey = new Map();
        groups = [];
        for (let t = input.next(); t !== null; t = input.next()) {
          const keyVals = node.keys.map((k) => evalExpr(k, t));
          const key = JSON.stringify(keyVals);
          let g = byKey.get(key);
          if (g === undefined) {
            g = { row: t.row, states: node.aggs.map(() => ({ count: 0, sum: 0, min: null, max: null })) };
            byKey.set(key, g);
            groups.push(g);
          }
          node.aggs.forEach((agg, s) => {
            const st = g.states[s];
            if (agg.arg === null) { st.count++; return; }
            const v = evalExpr(agg.arg, t);
            if (v === null) return;
            st.count++;
            st.sum += v;
            if (st.min === null || v < st.min) st.min = v;
            if (st.max === null || v > st.max) st.max = v;
          });
        }
        if (groups.length === 0 && node.keys.length === 0) {
          groups.push({ row: {}, states: node.aggs.map(() => ({ count: 0, sum: 0, min: null, max: null })) });
        }
      };
      return {
        next: () => {
          if (groups === null) build();
          if (gi >= groups.length) return null;
          const g = groups[gi++];
          const aggs = node.aggs.map((agg, s) => {
            const st = g.states[s];
            switch (agg.fn) {
              case "COUNT": return st.count;
              case "SUM": return st.count === 0 ? null : st.sum;
              case "AVG": return st.count === 0 ? null : st.sum / st.count;
              case "MIN": return st.min;
              case "MAX": return st.max;
            }
            throw new Error("unknown aggregate " + agg.fn);
          });
          return { row: g.row, aggs };
        },
      };
    }
    case "PlanProject": {
      const input = open(node.input, db);
      return {
        next: () => {
          const t = input.next();
          if (t === null) return null;
          const out = {};
          for (const c of node.columns) out[c.alias] = evalExpr(c.expr, t);
          return { row: out, aggs: null };
        },
      };
    }
    case "PlanSort": {
      const input = open(node.input, db);
      let sorted = null;
      let i = 0;
      return {
        next: () => {
          if (sorted === null) {
            const all = [];
            for (let t = input.next(); t !== null; t = input.next()) {
              all.push({ t, keys: node.keys.map((k) => evalExpr(k.expr, t)) });
            }
            all.sort((a, b) => {
              for (let k = 0; k < node.keys.length; k++) {
                const c = compareValues(a.keys[k], b.keys[k]);
                if (c !== 0) return node.keys[k].desc ? -c : c;
              }
              return 0;
            });
            sorted = all.map((x) => x.t);
          }
          return i < sorted.length ? sorted[i++] : null;
        },
      };
    }
    case "PlanLimit": {
      const input = open(node.input, db);
      let n = 0;
      return { next: () => (n++ < node.count ? input.next() : null) };
    }
  }
  throw new Error("unknown plan node " + node.type);
}

function run(planRoot, db) {
  const it = open(planRoot, db);
  const out = [];
  for (let t = it.next(); t !== null; t = it.next()) out.push(t.row);
  return out;
}

const PLANS = Object.keys(QUERIES).map((name) => [name, plan(parseQuery(QUERIES[name]))]);

export function main(input) {
  const result = {};
  for (const [name, p] of PLANS) result[name] = run(p, input);
  return result;
}

export const inputs = [{"employees":[]},{"employees":[{"name":"Solo","dept":"eng","salary":50000,"city":"Boston","manager":"M1","age":26,"bonus":null}]},{"employees":[{"name":"A","dept":"eng","salary":60000,"city":"Seattle","manager":"M","age":30},{"name":"B","dept":"eng","salary":70000,"city":"Austin","manager":null,"age":40,"bonus":100}]},{"employees":[{"name":"Bo0","dept":"hr","salary":129000,"city":"San Jose","manager":"M2","age":47,"bonus":2000},{"name":"Eve1","dept":"sales","salary":40000,"city":"Seattle","manager":null,"age":42,"bonus":6000},{"name":"Sam2","dept":"eng","salary":131000,"city":"Austin","manager":"M2","age":44,"bonus":null},{"name":"Eve3","dept":"hr","salary":75000,"city":"Denver","manager":null,"age":36,"bonus":null},{"name":"O'Neil4","dept":"sales","salary":37000,"city":"Boston","manager":"M5","age":64,"bonus":6000},{"name":"Ada5","dept":"sales","salary":90000,"city":"Boston","manager":"M1","age":55,"bonus":3000},{"name":"Eve6","dept":"hr","salary":91000,"city":"Boston","manager":"M1","age":40,"bonus":null},{"name":"Fay7","dept":"hr","salary":54000,"city":"San Jose","manager":null,"age":25,"bonus":null},{"name":"O'Neil8","dept":"eng","salary":123000,"city":"Austin","manager":null,"age":37,"bonus":4000},{"name":"Di9","dept":"hr","salary":58000,"city":"San Jose","manager":"M1","age":51,"bonus":null},{"name":"Fay10","dept":"ops","salary":126000,"city":"San Jose","manager":null,"age":43,"bonus":3000},{"name":"Fay11","dept":"eng","salary":37000,"city":"Denver","manager":"M1","age":53,"bonus":9500}]},{"employees":[{"name":"Ada0","dept":"ops","salary":79000,"city":"San Jose","manager":null,"age":27,"bonus":8500},{"name":"Bo1","dept":"hr","salary":104000,"city":"Denver","manager":"M2","age":52,"bonus":null},{"name":"Di2","dept":"eng","salary":30000,"city":"Denver","manager":"M5","age":22,"bonus":null},{"name":"Cy3","dept":"ops","salary":123000,"city":"Seattle","manager":"M5","age":60,"bonus":8000},{"name":"Di4","dept":"eng","salary":135000,"city":"Denver","manager":"M4","age":22,"bonus":4500},{"name":"Di5","dept":"eng","salary":65000,"city":"Boston","manager":"M1","age":56,"bonus":9000},{"name":"Sam6","dept":"ops","salary":59000,"city":"Boston","manager":"M2","age":39,"bonus":null},{"name":"Ada7","dept":"eng","salary":105000,"city":"San Jose","manager":"M4","age":42,"bonus":6000},{"name":"O'Neil8","dept":"eng","salary":129000,"city":"Austin","manager":"M5","age":54,"bonus":5500},{"name":"O'Neil9","dept":"eng","salary":84000,"city":"Denver","manager":"M3","age":36,"bonus":7000},{"name":"Fay10","dept":"eng","salary":118000,"city":"Austin","manager":null,"age":34,"bonus":6500},{"name":"O'Neil11","dept":"sales","salary":150000,"city":"Seattle","manager":null,"age":22,"bonus":1000},{"name":"Di12","dept":"eng","salary":105000,"city":"Denver","manager":"M1","age":31,"bonus":9500},{"name":"Bo13","dept":"hr","salary":132000,"city":"Boston","manager":"M2","age":27,"bonus":null},{"name":"Fay14","dept":"sales","salary":110000,"city":"Denver","manager":"M5","age":34,"bonus":4000},{"name":"Ada15","dept":"ops","salary":145000,"city":"Denver","manager":"M4","age":41,"bonus":null},{"name":"Sam16","dept":"hr","salary":65000,"city":"Denver","manager":null,"age":21,"bonus":8500},{"name":"Bo17","dept":"eng","salary":73000,"city":"Seattle","manager":null,"age":46,"bonus":null},{"name":"Cy18","dept":"eng","salary":54000,"city":"Austin","manager":"M2","age":38,"bonus":10000},{"name":"Sam19","dept":"sales","salary":76000,"city":"Austin","manager":"M2","age":43,"bonus":null},{"name":"Di20","dept":"ops","salary":97000,"city":"Seattle","manager":"M2","age":21,"bonus":4500},{"name":"Sam21","dept":"ops","salary":84000,"city":"Seattle","manager":null,"age":40,"bonus":null},{"name":"Ada22","dept":"sales","salary":108000,"city":"Boston","manager":"M1","age":21,"bonus":null},{"name":"Eve23","dept":"ops","salary":109000,"city":"San Jose","manager":null,"age":32,"bonus":3500},{"name":"Sam24","dept":"hr","salary":44000,"city":"Boston","manager":"M5","age":28,"bonus":8500},{"name":"Di25","dept":"ops","salary":95000,"city":"Denver","manager":"M1","age":43,"bonus":8000},{"name":"Eve26","dept":"sales","salary":146000,"city":"Denver","manager":"M3","age":40,"bonus":9500},{"name":"Ada27","dept":"hr","salary":97000,"city":"San Jose","manager":null,"age":33,"bonus":4000},{"name":"Sam28","dept":"ops","salary":41000,"city":"Denver","manager":null,"age":28,"bonus":9500},{"name":"Sam29","dept":"hr","salary":136000,"city":"Denver","manager":"M4","age":38,"bonus":4000},{"name":"Sam30","dept":"eng","salary":33000,"city":"Denver","manager":"M2","age":60,"bonus":10000},{"name":"Cy31","dept":"sales","salary":77000,"city":"Seattle","manager":null,"age":53,"bonus":8000},{"name":"Sam32","dept":"hr","salary":109000,"city":"Austin","manager":null,"age":53,"bonus":5000},{"name":"Eve33","dept":"eng","salary":97000,"city":"Seattle","manager":"M4","age":33,"bonus":null},{"name":"Bo34","dept":"eng","salary":94000,"city":"Seattle","manager":"M3","age":32,"bonus":10000},{"name":"Fay35","dept":"hr","salary":103000,"city":"Boston","manager":"M3","age":62,"bonus":7500},{"name":"Fay36","dept":"eng","salary":121000,"city":"Austin","manager":null,"age":21,"bonus":3000},{"name":"Di37","dept":"eng","salary":120000,"city":"San Jose","manager":null,"age":49,"bonus":0},{"name":"Cy38","dept":"ops","salary":57000,"city":"Seattle","manager":"M4","age":40,"bonus":null},{"name":"Ada39","dept":"eng","salary":98000,"city":"Austin","manager":"M3","age":56,"bonus":10000},{"name":"Cy40","dept":"eng","salary":115000,"city":"Seattle","manager":"M3","age":51,"bonus":2000},{"name":"Fay41","dept":"sales","salary":82000,"city":"Boston","manager":"M5","age":47,"bonus":5500},{"name":"Ada42","dept":"ops","salary":73000,"city":"San Jose","manager":"M2","age":53,"bonus":null},{"name":"O'Neil43","dept":"eng","salary":95000,"city":"Denver","manager":"M5","age":25,"bonus":7500},{"name":"Cy44","dept":"sales","salary":109000,"city":"Boston","manager":"M4","age":59,"bonus":8000},{"name":"Eve45","dept":"eng","salary":72000,"city":"San Jose","manager":"M2","age":22,"bonus":4000},{"name":"Cy46","dept":"eng","salary":93000,"city":"Denver","manager":null,"age":43,"bonus":1000},{"name":"Ada47","dept":"sales","salary":139000,"city":"Boston","manager":null,"age":47,"bonus":10000},{"name":"Ada48","dept":"sales","salary":36000,"city":"Denver","manager":null,"age":51,"bonus":9500},{"name":"Ada49","dept":"hr","salary":61000,"city":"Seattle","manager":null,"age":23,"bonus":1000},{"name":"Bo50","dept":"hr","salary":121000,"city":"Boston","manager":"M1","age":40,"bonus":null},{"name":"Fay51","dept":"hr","salary":79000,"city":"Boston","manager":"M5","age":20,"bonus":3000},{"name":"Eve52","dept":"ops","salary":68000,"city":"Denver","manager":"M5","age":31,"bonus":null},{"name":"Fay53","dept":"ops","salary":76000,"city":"San Jose","manager":"M3","age":22,"bonus":2000},{"name":"Cy54","dept":"ops","salary":35000,"city":"Austin","manager":null,"age":50,"bonus":7000},{"name":"Di55","dept":"eng","salary":33000,"city":"Austin","manager":"M2","age":54,"bonus":7500},{"name":"O'Neil56","dept":"sales","salary":126000,"city":"San Jose","manager":"M1","age":40,"bonus":1500},{"name":"Sam57","dept":"ops","salary":112000,"city":"Denver","manager":"M3","age":21,"bonus":0},{"name":"Bo58","dept":"eng","salary":147000,"city":"Austin","manager":null,"age":26,"bonus":0},{"name":"Di59","dept":"ops","salary":121000,"city":"Denver","manager":"M1","age":55,"bonus":7500}]},{"employees":[{"name":"O'Neil0","dept":"sales","salary":51000,"city":"Seattle","manager":"M5","age":20,"bonus":9000},{"name":"Sam1","dept":"hr","salary":78000,"city":"San Jose","manager":"M4","age":63,"bonus":8500},{"name":"Eve2","dept":"ops","salary":125000,"city":"Seattle","manager":"M1","age":37,"bonus":2000},{"name":"Cy3","dept":"hr","salary":32000,"city":"Austin","manager":null,"age":20,"bonus":null},{"name":"Eve4","dept":"eng","salary":44000,"city":"San Jose","manager":"M2","age":40,"bonus":null},{"name":"O'Neil5","dept":"eng","salary":139000,"city":"Seattle","manager":"M4","age":36,"bonus":4500},{"name":"Fay6","dept":"sales","salary":141000,"city":"San Jose","manager":null,"age":34,"bonus":6000},{"name":"Fay7","dept":"sales","salary":39000,"city":"San Jose","manager":null,"age":28,"bonus":6000},{"name":"Bo8","dept":"hr","salary":138000,"city":"Austin","manager":"M4","age":23,"bonus":1000},{"name":"Fay9","dept":"eng","salary":91000,"city":"Boston","manager":"M4","age":49,"bonus":null},{"name":"Sam10","dept":"sales","salary":34000,"city":"Seattle","manager":"M5","age":27,"bonus":null},{"name":"Eve11","dept":"eng","salary":101000,"city":"Boston","manager":null,"age":40,"bonus":null},{"name":"Bo12","dept":"ops","salary":113000,"city":"Austin","manager":"M2","age":23,"bonus":9000},{"name":"O'Neil13","dept":"hr","salary":107000,"city":"Boston","manager":"M4","age":57,"bonus":4000},{"name":"Cy14","dept":"hr","salary":126000,"city":"San Jose","manager":"M1","age":47,"bonus":null},{"name":"O'Neil15","dept":"ops","salary":116000,"city":"Seattle","manager":"M5","age":57,"bonus":null},{"name":"O'Neil16","dept":"eng","salary":61000,"city":"San Jose","manager":null,"age":62,"bonus":2000},{"name":"Fay17","dept":"eng","salary":140000,"city":"Seattle","manager":"M1","age":23,"bonus":7500},{"name":"O'Neil18","dept":"ops","salary":59000,"city":"Seattle","manager":"M3","age":27,"bonus":1500},{"name":"Ada19","dept":"ops","salary":70000,"city":"Boston","manager":"M5","age":32,"bonus":10000},{"name":"Ada20","dept":"ops","salary":98000,"city":"Boston","manager":"M1","age":64,"bonus":9500},{"name":"Di21","dept":"sales","salary":132000,"city":"Seattle","manager":"M2","age":58,"bonus":3000},{"name":"Fay22","dept":"ops","salary":109000,"city":"Denver","manager":null,"age":27,"bonus":0},{"name":"Eve23","dept":"eng","salary":77000,"city":"Seattle","manager":"M2","age":52,"bonus":8500},{"name":"Cy24","dept":"sales","salary":149000,"city":"Boston","manager":null,"age":54,"bonus":null},{"name":"Di25","dept":"ops","salary":80000,"city":"Denver","manager":"M1","age":58,"bonus":1500},{"name":"Fay26","dept":"sales","salary":97000,"city":"Boston","manager":"M5","age":37,"bonus":null},{"name":"Ada27","dept":"hr","salary":59000,"city":"Denver","manager":"M5","age":22,"bonus":6500},{"name":"Cy28","dept":"ops","salary":95000,"city":"Austin","manager":null,"age":22,"bonus":2500},{"name":"Eve29","dept":"hr","salary":101000,"city":"Boston","manager":"M5","age":63,"bonus":null},{"name":"Ada30","dept":"ops","salary":39000,"city":"Seattle","manager":null,"age":49,"bonus":null},{"name":"Cy31","dept":"sales","salary":42000,"city":"Boston","manager":"M5","age":33,"bonus":null},{"name":"O'Neil32","dept":"ops","salary":78000,"city":"Seattle","manager":"M2","age":35,"bonus":3500},{"name":"Fay33","dept":"hr","salary":128000,"city":"Boston","manager":"M4","age":22,"bonus":9500},{"name":"Cy34","dept":"ops","salary":115000,"city":"Boston","manager":"M3","age":42,"bonus":3500},{"name":"Sam35","dept":"ops","salary":147000,"city":"Seattle","manager":"M1","age":61,"bonus":null},{"name":"Ada36","dept":"eng","salary":103000,"city":"Seattle","manager":"M5","age":63,"bonus":8000},{"name":"Sam37","dept":"ops","salary":44000,"city":"Seattle","manager":"M3","age":51,"bonus":5000},{"name":"Cy38","dept":"sales","salary":82000,"city":"San Jose","manager":"M1","age":26,"bonus":null},{"name":"Di39","dept":"hr","salary":94000,"city":"Seattle","manager":"M2","age":44,"bonus":500},{"name":"Sam40","dept":"ops","salary":30000,"city":"Austin","manager":"M1","age":42,"bonus":6000},{"name":"Ada41","dept":"hr","salary":63000,"city":"Denver","manager":"M3","age":22,"bonus":null},{"name":"Sam42","dept":"eng","salary":69000,"city":"Denver","manager":"M4","age":44,"bonus":2000},{"name":"Bo43","dept":"sales","salary":72000,"city":"Boston","manager":null,"age":38,"bonus":5500},{"name":"Bo44","dept":"eng","salary":120000,"city":"Seattle","manager":"M4","age":58,"bonus":1000},{"name":"Fay45","dept":"eng","salary":50000,"city":"Boston","manager":"M3","age":36,"bonus":7500},{"name":"Sam46","dept":"sales","salary":146000,"city":"Boston","manager":"M2","age":51,"bonus":10000},{"name":"Eve47","dept":"eng","salary":62000,"city":"Seattle","manager":"M3","age":20,"bonus":10000},{"name":"Bo48","dept":"hr","salary":117000,"city":"San Jose","manager":"M1","age":44,"bonus":8000},{"name":"Ada49","dept":"sales","salary":43000,"city":"Seattle","manager":"M4","age":20,"bonus":6500},{"name":"Ada50","dept":"ops","salary":132000,"city":"Seattle","manager":"M5","age":38,"bonus":null},{"name":"Eve51","dept":"ops","salary":34000,"city":"Boston","manager":null,"age":36,"bonus":null},{"name":"Ada52","dept":"hr","salary":71000,"city":"Boston","manager":"M4","age":27,"bonus":4500},{"name":"Sam53","dept":"ops","salary":140000,"city":"Denver","manager":"M2","age":46,"bonus":1000},{"name":"O'Neil54","dept":"hr","salary":103000,"city":"San Jose","manager":"M2","age":53,"bonus":null},{"name":"O'Neil55","dept":"eng","salary":68000,"city":"Boston","manager":null,"age":41,"bonus":3500},{"name":"Sam56","dept":"ops","salary":88000,"city":"Austin","manager":"M3","age":46,"bonus":null},{"name":"Cy57","dept":"sales","salary":145000,"city":"Boston","manager":null,"age":29,"bonus":7000},{"name":"Eve58","dept":"sales","salary":100000,"city":"San Jose","manager":"M2","age":28,"bonus":6000},{"name":"Fay59","dept":"sales","salary":150000,"city":"Seattle","manager":"M2","age":20,"bonus":null},{"name":"Sam60","dept":"ops","salary":57000,"city":"Austin","manager":"M4","age":41,"bonus":9000},{"name":"Sam61","dept":"ops","salary":31000,"city":"Boston","manager":"M3","age":52,"bonus":3000},{"name":"Eve62","dept":"hr","salary":106000,"city":"Boston","manager":"M1","age":39,"bonus":3500},{"name":"Ada63","dept":"ops","salary":71000,"city":"Seattle","manager":"M4","age":39,"bonus":8500},{"name":"Ada64","dept":"sales","salary":46000,"city":"Denver","manager":"M2","age":45,"bonus":9500},{"name":"Fay65","dept":"ops","salary":129000,"city":"Boston","manager":"M4","age":31,"bonus":1500},{"name":"Sam66","dept":"hr","salary":100000,"city":"San Jose","manager":"M5","age":43,"bonus":5000},{"name":"Bo67","dept":"hr","salary":141000,"city":"Seattle","manager":"M1","age":58,"bonus":null},{"name":"Sam68","dept":"hr","salary":76000,"city":"Austin","manager":"M2","age":35,"bonus":null},{"name":"Bo69","dept":"ops","salary":83000,"city":"Denver","manager":null,"age":34,"bonus":null},{"name":"O'Neil70","dept":"ops","salary":137000,"city":"Denver","manager":"M5","age":57,"bonus":4500},{"name":"O'Neil71","dept":"ops","salary":82000,"city":"San Jose","manager":"M5","age":27,"bonus":9500},{"name":"Sam72","dept":"sales","salary":58000,"city":"Seattle","manager":"M1","age":24,"bonus":null},{"name":"Cy73","dept":"ops","salary":147000,"city":"San Jose","manager":null,"age":51,"bonus":9000},{"name":"Eve74","dept":"ops","salary":74000,"city":"Austin","manager":"M2","age":52,"bonus":5500},{"name":"Di75","dept":"sales","salary":56000,"city":"Austin","manager":null,"age":54,"bonus":null},{"name":"Di76","dept":"sales","salary":78000,"city":"Seattle","manager":"M2","age":59,"bonus":4500},{"name":"O'Neil77","dept":"hr","salary":86000,"city":"Austin","manager":null,"age":49,"bonus":8000},{"name":"Eve78","dept":"sales","salary":48000,"city":"San Jose","manager":null,"age":29,"bonus":1500},{"name":"Sam79","dept":"sales","salary":141000,"city":"Boston","manager":"M3","age":51,"bonus":4000},{"name":"O'Neil80","dept":"sales","salary":88000,"city":"Boston","manager":"M5","age":59,"bonus":4000},{"name":"Cy81","dept":"eng","salary":120000,"city":"San Jose","manager":"M3","age":45,"bonus":10000},{"name":"Sam82","dept":"hr","salary":128000,"city":"Denver","manager":null,"age":34,"bonus":9000},{"name":"Cy83","dept":"eng","salary":40000,"city":"Denver","manager":"M2","age":30,"bonus":1500},{"name":"Cy84","dept":"hr","salary":87000,"city":"San Jose","manager":"M5","age":49,"bonus":500},{"name":"Bo85","dept":"ops","salary":70000,"city":"San Jose","manager":"M3","age":35,"bonus":10000},{"name":"Bo86","dept":"hr","salary":141000,"city":"Boston","manager":"M4","age":52,"bonus":2500},{"name":"Bo87","dept":"hr","salary":38000,"city":"Denver","manager":"M1","age":51,"bonus":null},{"name":"Eve88","dept":"eng","salary":108000,"city":"Denver","manager":"M4","age":55,"bonus":null},{"name":"Ada89","dept":"eng","salary":91000,"city":"San Jose","manager":"M5","age":24,"bonus":6000},{"name":"Fay90","dept":"sales","salary":33000,"city":"Denver","manager":null,"age":40,"bonus":null},{"name":"Di91","dept":"eng","salary":67000,"city":"Seattle","manager":"M2","age":40,"bonus":0},{"name":"Ada92","dept":"sales","salary":83000,"city":"Denver","manager":null,"age":46,"bonus":9000},{"name":"Eve93","dept":"ops","salary":66000,"city":"Boston","manager":"M1","age":48,"bonus":7500},{"name":"Bo94","dept":"ops","salary":136000,"city":"Boston","manager":null,"age":37,"bonus":null},{"name":"Eve95","dept":"eng","salary":142000,"city":"Boston","manager":null,"age":32,"bonus":7500},{"name":"O'Neil96","dept":"hr","salary":105000,"city":"Seattle","manager":null,"age":61,"bonus":9500},{"name":"Ada97","dept":"eng","salary":104000,"city":"Denver","manager":"M5","age":46,"bonus":0},{"name":"Bo98","dept":"eng","salary":37000,"city":"Boston","manager":"M1","age":62,"bonus":1000},{"name":"O'Neil99","dept":"hr","salary":59000,"city":"Seattle","manager":"M2","age":51,"bonus":null},{"name":"Ada100","dept":"sales","salary":132000,"city":"Boston","manager":"M2","age":27,"bonus":7000},{"name":"Cy101","dept":"eng","salary":130000,"city":"Denver","manager":"M5","age":41,"bonus":2000},{"name":"Cy102","dept":"hr","salary":104000,"city":"Boston","manager":"M2","age":20,"bonus":null},{"name":"Bo103","dept":"sales","salary":50000,"city":"Denver","manager":"M2","age":52,"bonus":null},{"name":"Sam104","dept":"hr","salary":141000,"city":"Seattle","manager":null,"age":26,"bonus":null},{"name":"Eve105","dept":"hr","salary":59000,"city":"Boston","manager":"M3","age":30,"bonus":null},{"name":"Bo106","dept":"sales","salary":56000,"city":"Boston","manager":"M1","age":32,"bonus":null},{"name":"Sam107","dept":"ops","salary":79000,"city":"Seattle","manager":null,"age":52,"bonus":500},{"name":"O'Neil108","dept":"ops","salary":31000,"city":"Austin","manager":"M4","age":54,"bonus":null},{"name":"Bo109","dept":"eng","salary":60000,"city":"Austin","manager":"M5","age":42,"bonus":9000},{"name":"Ada110","dept":"eng","salary":121000,"city":"San Jose","manager":"M2","age":42,"bonus":null},{"name":"Fay111","dept":"ops","salary":31000,"city":"Denver","manager":"M2","age":29,"bonus":7500},{"name":"Cy112","dept":"sales","salary":51000,"city":"Denver","manager":"M2","age":46,"bonus":5500},{"name":"Fay113","dept":"ops","salary":44000,"city":"San Jose","manager":"M5","age":62,"bonus":2000},{"name":"Sam114","dept":"eng","salary":44000,"city":"Boston","manager":"M1","age":58,"bonus":1000},{"name":"Di115","dept":"hr","salary":51000,"city":"Denver","manager":"M2","age":35,"bonus":null},{"name":"Bo116","dept":"sales","salary":75000,"city":"Denver","manager":"M3","age":31,"bonus":null},{"name":"Eve117","dept":"hr","salary":131000,"city":"Denver","manager":"M1","age":44,"bonus":4500},{"name":"O'Neil118","dept":"eng","salary":147000,"city":"Denver","manager":null,"age":58,"bonus":1000},{"name":"Sam119","dept":"hr","salary":112000,"city":"Boston","manager":"M3","age":52,"bonus":null},{"name":"Sam120","dept":"ops","salary":87000,"city":"San Jose","manager":"M5","age":50,"bonus":null},{"name":"Fay121","dept":"hr","salary":33000,"city":"Denver","manager":"M5","age":52,"bonus":1500},{"name":"Eve122","dept":"hr","salary":111000,"city":"Seattle","manager":"M2","age":52,"bonus":null},{"name":"Bo123","dept":"ops","salary":102000,"city":"Austin","manager":"M5","age":58,"bonus":8000},{"name":"Cy124","dept":"ops","salary":35000,"city":"Austin","manager":"M4","age":51,"bonus":10000},{"name":"Fay125","dept":"eng","salary":39000,"city":"San Jose","manager":"M4","age":36,"bonus":null},{"name":"Eve126","dept":"ops","salary":47000,"city":"Denver","manager":"M5","age":46,"bonus":null},{"name":"Di127","dept":"hr","salary":126000,"city":"Austin","manager":"M2","age":41,"bonus":9500},{"name":"Eve128","dept":"eng","salary":85000,"city":"Austin","manager":"M1","age":63,"bonus":10000},{"name":"Eve129","dept":"ops","salary":55000,"city":"San Jose","manager":"M3","age":53,"bonus":7000},{"name":"Bo130","dept":"eng","salary":139000,"city":"Austin","manager":"M4","age":62,"bonus":null},{"name":"Bo131","dept":"sales","salary":37000,"city":"Seattle","manager":null,"age":50,"bonus":3500},{"name":"Sam132","dept":"eng","salary":46000,"city":"Seattle","manager":"M4","age":26,"bonus":3000},{"name":"Eve133","dept":"hr","salary":68000,"city":"Denver","manager":null,"age":35,"bonus":null},{"name":"Bo134","dept":"eng","salary":75000,"city":"Boston","manager":"M5","age":23,"bonus":2000},{"name":"Bo135","dept":"eng","salary":44000,"city":"Boston","manager":"M2","age":50,"bonus":8500},{"name":"Bo136","dept":"hr","salary":69000,"city":"Austin","manager":"M1","age":45,"bonus":9500},{"name":"Cy137","dept":"eng","salary":84000,"city":"Boston","manager":"M2","age":52,"bonus":5000},{"name":"Sam138","dept":"ops","salary":124000,"city":"Denver","manager":"M1","age":48,"bonus":4500},{"name":"Cy139","dept":"sales","salary":97000,"city":"Austin","manager":"M2","age":60,"bonus":4000},{"name":"Eve140","dept":"hr","salary":149000,"city":"San Jose","manager":"M3","age":30,"bonus":9500},{"name":"Cy141","dept":"hr","salary":63000,"city":"Austin","manager":"M4","age":64,"bonus":9000},{"name":"Ada142","dept":"hr","salary":55000,"city":"Seattle","manager":null,"age":43,"bonus":8000},{"name":"Ada143","dept":"hr","salary":32000,"city":"San Jose","manager":"M4","age":53,"bonus":7000},{"name":"Fay144","dept":"hr","salary":108000,"city":"Boston","manager":"M5","age":59,"bonus":2000},{"name":"Bo145","dept":"ops","salary":130000,"city":"Seattle","manager":"M1","age":56,"bonus":9000},{"name":"Fay146","dept":"hr","salary":113000,"city":"San Jose","manager":null,"age":63,"bonus":7500},{"name":"Eve147","dept":"sales","salary":75000,"city":"Boston","manager":"M4","age":39,"bonus":2500},{"name":"Eve148","dept":"ops","salary":87000,"city":"Austin","manager":null,"age":32,"bonus":9000},{"name":"O'Neil149","dept":"hr","salary":78000,"city":"Seattle","manager":"M1","age":29,"bonus":9000}]}];
