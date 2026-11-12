var __s0 = "/advent-of-papers/2024/dec-15-technical-artifacts";
var __s1 = "Programming Languages as Technical Artifacts";
var __s2 = "/advent-of-papers/2024/dec-4-brain-computer";
var __s3 = "The Easiest Way to Build a Type Checker";
var __s4 = "/easiest-way-to-build-type-checker";

function __o0() {
  return {value: void 0};
}
function __o1() {
  return {text: __s3, href: __s4, mdx: true, date: "2025-11-22"};
}
function __o2() {
  return {text: "Machine Code Isn't Scary", href: "/machine-code-isnt-scary", mdx: true, date: "2025-06-02"};
}
function __o3() {
  return {text: "Discovery Coding", href: "/discovery-coding", mdx: true, date: "2025-01-28"};
}

function __mk1(a) {
  return function() {
    return a(2470);
  };
}

function __mk3(a) {
  "use strict";
  return function Po() {
    return a;
  };
}

function __mk4(d) {
  "use strict";
  return function m(b) {
    let a, c;
    if (!b) {
      return "";
    }
    a = (/^(\d{4})-(\d{2})/).exec(b);
    if (!a) {
      return b;
    }
    c = d.value[parseInt(a[2], 10) - 1] || "";
    return ("").concat(c, " ").concat(a[1]);
  };
}

function __mk5(a) {
  "use strict";
  return function QK() {
    return a.value;
  };
}

function __mk6(a) {
  "use strict";
  return function d8() {
    return a.value;
  };
}

function __mk7(a) {
  "use strict";
  return function hC() {
    return a.value;
  };
}

function __mk8(a) {
  "use strict";
  return function rh() {
    return a;
  };
}

function __mk9(b) {
  "use strict";
  return function d(c) {
    let a;
    a: {
      if (c) {
        b: {
          a = b.value.find.call(b.value, __mk10(c));
          if (a) {
            break b;
          }
          a = b.value.find.call(b.value, __mk11(c));
        }
        break a;
      }
      a = c;
    }
    return a || null;
  };
}

function __mk10(a) {
  "use strict";
  return (b) => {
    return b.href === a;
  };
}

function __mk11(a) {
  "use strict";
  return (c) => {
    let b;
    b = a.replace;
    return c.href === b.call(a, /\/$/, "");
  };
}

function __mk12(a) {
  "use strict";
  return function wU() {
    return a.value;
  };
}

function __mk13(a) {
  "use strict";
  return function xu() {
    return a.value;
  };
}

function __mk14(a) {
  "use strict";
  return function yO() {
    return a;
  };
}

function __mk15(b) {
  "use strict";
  return function l(c) {
    let a;
    a: {
      a = b.value.findIndex.call(b.value, __mk16(c));
      if (-1 === a) {
        a = {prev: null, next: null};
        break a;
      }
      a = {next: a > 0 ? b.value[a - 1] : null, prev: a < b.value.length - 1 ? b.value[a + 1] : null};
    }
    return a;
  };
}

function __mk16(a) {
  "use strict";
  return (b) => {
    return b.href === a;
  };
}

function __mk18(a) {
  "use strict";
  const __f = function () {
    return a.value;
  };
  Object.defineProperty(__f, "name", { value: "__N_SSG" });
  return __f;
}

function __mk19(a) {
  "use strict";
  return function popularPosts() {
    return a.value.d8;
  };
}

function __mk20(a) {
  "use strict";
  return function posts() {
    return a.value.xu;
  };
}

function __mk21(a) {
  "use strict";
  return function postsForBeginners() {
    return a.value.wU;
  };
}

function __mk22(a) {
  "use strict";
  return function rssPosts() {
    return a.value;
  };
}

function __mk23(a) {
  "use strict";
  return function specialPosts() {
    return a.value;
  };
}

function __mk25(a) {
  "use strict";
  return (b) => {
    return !a.has(b.href);
  };
}

function __mk26(q, r, s, t, l, u, a, A, B, C, p) {
  "use strict";
  return () => {
    let v, w, x, y, z, i, j, d, f, e, g, h, b, c, k, m, n, o;
    v = a.value.jsxs;
    w = a.value.Fragment;
    x = (0 , a.value.jsxs)(A, {children: [(0 , a.value.jsx)("title", {children: "Jimmy Miller"}), (0 , a.value.jsx)("link", {rel: "alternate", type: "application/rss+xml", title: "jimmyhmiller.github.io", href: "feed.xml"}), (0 , a.value.jsx)("meta", {name: "author", content: "Jimmy Miller"})]});
    y = (0 , a.value.jsx)(q.uN, {});
    z = a.value.jsxs;
    i = a.value.jsxs;
    j = a.value.jsx;
    d = a.value.jsx;
    f = a.value.jsx;
    e = (0 , a.value.jsxs)("div", {className: "intro-text", children: [(0 , a.value.jsx)("h1", {className: "intro-name", children: "Jimmy Miller"}), (0 , a.value.jsx)("p", {className: "intro-bio", children: "I'm obsessed with building editors. I am always working on at least 3 new programming languages ideas. I wish I knew how to make things look good."}), (0 , a.value.jsx)("a", {className: "intro-cta", href: "#posts", children: "read the posts"})]});
    j = j("div", {className: "hero-intro", children: d("section", {className: "intro", "data-paper": "intro", id: "intro", children: f("div", {className: "intro-inner", children: e})})});
    d = a.value.jsx;
    f = a.value.jsx;
    e = a.value.jsx;
    g = a.value.jsxs;
    h = (0 , a.value.jsx)("div", {className: "col-label", children: (0 , a.value.jsx)("h2", {children: "Popular"})});
    b = t.value.d8;
    c = b.map;
    d = d("div", {className: "hero-popular", children: f("section", {className: "popular", "data-paper": "popular", id: "popular", children: e("div", {className: "wrap", children: g("div", {className: "twocol", children: [h, (0 , a.value.jsx)("div", {className: "popular-list", children: c.call(b, __mk27(u, a, C, p))})]})})})});
    i = i("div", {className: "hero", children: [j, d]});
    j = (0 , a.value.jsx)(B, {});
    d = a.value.jsx;
    f = a.value.jsxs;
    e = [(0 , a.value.jsxs)("div", {children: [(0 , a.value.jsx)("p", {className: "podcast-text", children: "A podcast with an alternative take on computing."}), (0 , a.value.jsx)("a", {className: "podcast-cta", href: "https://feelingof.com/episodes", target: "_blank", rel: "noreferrer", children: "Listen to the podcast"})]}), (0 , a.value.jsx)("img", {className: "podcast-art", src: "/images/feeling-of/feeling-of-computing-mark.svg", alt: "Feeling of Computing", width: "1000", height: "1000", loading: "lazy"})];
    d = d("section", {className: "podcast-band", "data-paper": "podcast", id: "podcast-title", "aria-label": "Feeling of Computing", children: f("div", {className: "podcast-band-inner", children: e})});
    f = (0 , a.value.jsx)("div", {className: "section-heading writing-heading", children: (0 , a.value.jsx)(l, {href: "/archive", children: "The complete archive ↗"})});
    e = a.value.jsx;
    g = a.value.jsx;
    h = a.value.jsxs;
    b = (0 , a.value.jsx)("div", {className: "col-label", children: (0 , a.value.jsx)("h2", {children: "Posts"})});
    c = t.value.xu;
    k = c.map;
    e = e("section", {"data-paper": "posts", id: "posts", children: g("div", {className: "wrap", children: h("div", {className: "twocol", children: [b, (0 , a.value.jsx)("div", {className: "posts-list", children: k.call(c, __mk28(u, a, p))})]})})});
    g = a.value.jsx;
    h = a.value.jsxs;
    b = (0 , a.value.jsxs)("div", {className: "advent-intro", children: [(0 , a.value.jsx)("div", {className: "kicker", children: "2024"}), (0 , a.value.jsx)("h2", {children: "Advent of Papers"}), (0 , a.value.jsx)("p", {children: "I did an experiment where I tried to read a paper every day of advent and write about it. Some days are more involved than others, but I had a great time doing it."})]});
    c = s.map;
    b = {className: "advent-wrap", children: [b, (0 , a.value.jsxs)("div", {className: "advent-list", children: [c.call(s, __mk29(a, p)), (0 , a.value.jsxs)("div", {className: "advent-foot", children: ["Full series → ", (0 , a.value.jsx)(l, {href: "/advent-of-papers", children: "advent-of-papers"})]})]})]};
    g = g("section", {className: "advent", "data-paper": "advent", id: "advent", children: h("div", b)});
    h = a.value.jsxs;
    b = a.value.jsx;
    c = a.value.jsx;
    k = a.value.jsxs;
    m = (0 , a.value.jsx)("div", {className: "col-label", children: (0 , a.value.jsx)("h2", {children: "Papers"})});
    n = a.value.jsxs;
    o = [(0 , a.value.jsx)("p", {children: "A collection of papers I've gathered over time. Many I've read but not all. Figured it was worth sharing. Plan on organizing more over time."}), (0 , a.value.jsx)("p", {children: (0 , a.value.jsx)(l, {href: "/readings", className: "papers-cta", children: "Browse the archive"})}), (0 , a.value.jsxs)("p", {className: "papers-aside", children: ["I wrote about ", (0 , a.value.jsx)(l, {href: "/ai-own-your-tools", children: "how this archive came together"}), "."]})];
    b = b("section", {"data-paper": "papers", id: "papers", children: c("div", {className: "wrap", children: k("div", {className: "twocol", children: [m, n("div", {className: "papers-block", children: o})]})})});
    c = a.value.jsx;
    k = a.value.jsx;
    m = a.value.jsxs;
    n = (0 , a.value.jsx)("div", {className: "col-label", children: (0 , a.value.jsx)("h2", {children: "Talks"})});
    o = r.map;
    i = [i, j, d, f, e, g, h("div", {className: "reference-grid", children: [b, c("section", {"data-paper": "talks", id: "talks", children: k("div", {className: "wrap", children: m("div", {className: "twocol", children: [n, (0 , a.value.jsx)("div", {className: "talks-grid", children: o.call(r, __mk30(a))})]})})})]})];
    return v(w, {children: [x, y, z("main", {"data-paper-page": "home", children: i}), (0 , a.value.jsx)(q.nv, {})]});
  };
}

function __mk27(d, b, e, f) {
  "use strict";
  return (a) => {
    let c;
    c = (0 , b.value.jsxs)(f, {href: a.href, className: "popular-item", children: [(0 , b.value.jsx)("span", {className: "t", children: e[a.href] || a.text}), (0 , b.value.jsx)("span", {className: "meta", children: d(a.date)})]}, a.href);
    return c;
  };
}

function __mk28(c, b, d) {
  "use strict";
  return (a) => {
    return (0 , b.value.jsxs)(d, {href: a.href, className: "posts-year-row", children: [(0 , b.value.jsx)("span", {className: "y", children: c(a.date)}), (0 , b.value.jsx)("span", {children: a.text})]}, a.href);
  };
}

function __mk29(b, c) {
  "use strict";
  return (a) => {
    return (0 , b.value.jsxs)(c, {href: a.href, className: "advent-item", children: [(0 , b.value.jsx)("span", {className: "day", children: a.day}), (0 , b.value.jsx)("b", {children: a.title})]}, a.href);
  };
}

function __mk30(b) {
  "use strict";
  return (a) => {
    let c;
    c = (0 , b.value.jsxs)("a", {className: "talk-card", href: a.href, target: "_blank", rel: "noreferrer", children: [(0 , b.value.jsx)("span", {className: "play", children: "watch"}), (0 , b.value.jsx)("b", {children: a.text}), (0 , b.value.jsx)("span", {className: "venue", children: a.venue})]}, a.href);
    return c;
  };
}

function __mk32(r, i, f, j, k, c) {
  "use strict";
  return function w() {
    let b, d, a, e, g, l, m, n, o, h, p, q;
    a: {
      b = ((0 , j.value.useState)((f.value.q[0]).id)[Symbol.iterator])();
      d = b.next();
      if (d.done) {
        a = true;
        d = void 0;
        break a;
      }
      d = d.value;
      a = false;
    }
    b: {
      if (!a) {
        e = b.next();
        if (e.done) {
          a = true;
          e = void 0;
          break b;
        }
        e = e.value;
        break b;
      }
      e = void 0;
    }
    if (!a) {
      b.return != null && b.return();
    }
    b = (0 , i.value.l7)();
    a = f.value.q;
    a = a.find(__mk33(d));
    g = (0 , j.value.useRef)(null);
    (0 , i.value.Cs)(__mk34(b), [d, b]);
    l = c.value.jsx;
    m = ("project:").concat(a.id);
    n = c.value.jsxs;
    o = (0 , c.value.jsx)("div", {className: "home-projects-head", children: (0 , c.value.jsx)("h2", {className: "h-title", children: "Projects"})});
    h = f.value.q;
    p = h.map;
    q = c.value.jsxs;
    b = (0 , c.value.jsx)("div", {className: "home-projects-list", children: p.call(h, __mk35(__mk37(b, r, d, g, e), c, a))});
    d = c.value.jsxs;
    a = (0 , c.value.jsx)(k.value.Z, {project: a, secondary: false, fixed: true}, a.id);
    e = f.value.q;
    return l("section", {className: "home-projects", "data-paper": m, id: "projects", children: n("div", {className: "home-projects-wrap", children: [o, q("div", {className: "home-projects-body", children: [b, d("div", {className: "home-feature", id: "project-feature", "aria-live": "polite", ref: g, children: [a, e.map(__mk42(k, c))]})]})]})});
  };
}

function __mk33(a) {
  "use strict";
  return (b) => {
    return b.id === a;
  };
}

function __mk34(a) {
  "use strict";
  return () => {
    a.refresh();
  };
}

function __mk35(c, b, d) {
  "use strict";
  return (a) => {
    return (0 , b.value.jsx)("button", {type: "button", className: "home-projects-row", "aria-pressed": a.id === d.id, "aria-controls": "project-feature", onClick: __mk36(c, a), children: (0 , b.value.jsx)("span", {className: "name", children: a.title})}, a.id);
  };
}

function __mk36(a, b) {
  "use strict";
  return {onClick: () => {
    return a(b.id);
  }}.onClick;
}

function __mk37(c, f, e, g, h) {
  "use strict";
  return {d: (a) => {
    let b;
    a: {
      if (a !== e) {
        b = c.transition(__mk38(f, g, a, h));
        break a;
      }
      b = a !== e;
    }
    return b;
  }}.d;
}

function __mk38(d, e, f, g) {
  "use strict";
  return () => {
    let a, b, c;
    (0 , d.value.flushSync)(__mk39(f, g));
    a = (e.current.querySelectorAll(".home-feature-body:not(.home-feature-sizer) img")[Symbol.iterator])();
    b = [];
    while (true) {
      c = a.next();
      if (c.done) {
        a = b.map(({""(b) {
  "use strict";
  let a;
  a = b.decode();
  return a.catch(({""() {
  "use strict";
}}[""]));
}}[""]));
        return Promise.all(a);
      }
      b.push(c.value);
    }
  };
}

function __mk39(a, b) {
  "use strict";
  return () => {
    return b(a);
  };
}

function __mk42(b, c) {
  "use strict";
  return (a) => {
    return (0 , c.value.jsx)(b.value.Z, {project: a, secondary: false, sizer: true}, ("sizer-").concat(a.id));
  };
}

function __mk43(k, j, l) {
  "use strict";
  return {y: (c) => {
    let d, g, h, i, f, e, b, a;
    if (c == null) {
      throw new TypeError("Cannot destructure a null or undefined value");
    }
    d = c.href;
    g = c.className;
    h = c.children;
    i = Reflect.ownKeys(c);
    f = {};
    e = 0;
    while (e < i.length) {
      a: {
        b = i[e];
        if (b !== "children") {
          b: {
            if (b !== "className") {
              c: {
                if (b !== "href") {
                  a = Object.prototype.propertyIsEnumerable;
                  a = a.call(c, b);
                  break c;
                }
                a = b !== "href";
              }
              break b;
            }
            a = b !== "className";
          }
          break a;
        }
        a = b !== "children";
      }
      if (a) {
        a = {value: c[b], writable: true, enumerable: true, configurable: true};
        Object.defineProperty(f, b, a);
      }
      e += 1;
    }
    d: {
      if (l(d)) {
        a = {className: g, href: d, target: "_blank", rel: "noreferrer"};
        Object.assign(a, f);
        Object.defineProperty(a, "children", {value: h, writable: true, enumerable: true, configurable: true});
        d = (0 , j.value.jsx)("a", a);
        break d;
      }
      a = {href: d, className: g};
      Object.assign(a, f);
      Object.defineProperty(a, "children", {value: h, writable: true, enumerable: true, configurable: true});
      d = (0 , j.value.jsx)(k, a);
    }
    return d;
  }}.y;
}

function __mk46(a) {
  return function() {
    a.s = 5557;
    return a(5557);
  };
}

{
  let b, a;
  b = self;
  a = self.webpackChunk_N_E;
  a = a ? a : [];
  b.webpackChunk_N_E = a;
  a.push;
  a.push([[5405], {5557: {"5557": function(d, e, c) {
  let b, a;
  b = window;
  a = window.__NEXT_P;
  a = a ? a : [];
  b.__NEXT_P = a;
  a.push;
  a.push(["/", __mk1(c)]);
}}["5557"], 4688: {"4688": function(p, o, k) {
  "use strict";
  let h, a, c, b, e, l, i, m, j, f, g, n, d;
  h = __o0();
  a = __mk4(h);
  a = __mk3(a);
  c = __o0();
  b = __mk5(c);
  e = __o0();
  l = __mk6(e);
  i = __o0();
  m = __mk7(i);
  j = __o0();
  f = __mk9(j);
  f = __mk8(f);
  g = __o0();
  n = __mk12(g);
  d = __o0();
  k.d(o, {Po: a, QK: b, d8: l, hC: m, rh: f, wU: n, xu: __mk13(d), yO: __mk14(__mk15(d))});
  e.value = [{text: "\"We ran out of columns\" - The best, worst codebase", href: "/ugliest-beautiful-codebase", mdx: true, date: "2024-08-02"}, __o1(), __o2(), __o3()];
  g.value = [{text: "Variants Explained", href: "/variants-explained", date: "2018-08-22"}, {text: "Variants and Protocols", href: "/variants-and-protocols", date: "2018-08-26"}, {text: "Protomorphism", href: "/protomorphism", date: "2018-09-02"}, {text: "Beautiful Code Through Simplicity", href: "/beautiful-code", date: "2018-09-15"}, {text: "OOP from the Ground Up", href: "/oop-ground-up", date: "2018-09-30"}, {text: "Side Effects, Complecting a la Carte", href: "/side-effects-complect", date: "2018-10-22"}, {text: "Basic Functional Studies", href: "/basic-functional-studies", date: "2018-11-12"}];
  a = [{text: "Writing isn't Thinking", href: "/writing-isnt-thinking", mdx: true, date: "2026-10-12"}, {text: "Can we Make React Faster using the React Compiler?", href: "/what-does-the-react-compiler-even-do", mdx: true, date: "2026-09-27"}, {text: "We Should be Able to Change our Languages", href: "/change-our-languages", mdx: true, date: "2026-09-17"}, {text: "The Chasm: The Shape of Unfinished AI Codebases", href: "/shape-of-unfinished-ai-codebases", mdx: true, date: "2026-09-07"}, {text: "Legibility is Ruining You", href: "/legibility-is-ruining-you", mdx: true, date: "2026-04-02"}, {text: "Untapped Way to Learn a Codebase: Build a Visualizer", href: "/learn-codebase-visualizer", mdx: true, date: "2026-02-17"}, {text: "AI Has Made it Easy to Own Your Tools", href: "/ai-own-your-tools", mdx: true, date: "2025-12-26"}, __o1(), {text: "The Overly Humble Programmer", href: "/overly-humble-programmer", mdx: true, date: "2025-11-12"}, {text: "Stuck? Build Your Language Backwards", href: "/build-your-language-backwards", mdx: true, date: "2025-06-12"}, __o2(), __o3(), {text: "Being Raised by the Internet", href: "/raised", mdx: true, date: "2024-09-19"}, {text: "\"We ran out of columns\" — the best, worst codebase", href: "/ugliest-beautiful-codebase", mdx: true, date: "2024-08-02"}, {text: "That Will Never Change. Not Here", href: "/never-change", mdx: true, date: "2024-02-24"}, {text: "Not Another Technical Debt Article", href: "/not-another-technical-debt-article", mdx: true, date: "2024-01-15"}, {text: "Being Stuck in Someone Else's Theory", href: "/stuck", mdx: true, date: "2023-12-27"}, {text: "ChatGPT Doesn't Know Anything", href: "/chatgpt", date: "2023-07-14"}, {text: "What Follows from Empirical Software Research?", href: "/empirical", date: "2023-04-09"}, {text: "The Space Between Programs", href: "/space-between", date: "2022-08-17"}, {text: "Social Programming Language Constructs", href: "/social-language-constructs", date: "2022-08-16"}, {text: "My Experience Building an Editor in Rust", href: "/editor-experience", date: "2022-05-01"}, {text: "Towards Aesthetic Elements of Programming", href: "/aesthetic-elements", date: "2022-01-06"}, {text: "CDD and the Non-Linearity of Discovery", href: "/cdd-non-linear", date: "2021-08-15"}, {text: "Conceptual Preservation", href: "/conceptual-preservation", date: "2020-11-25"}, {text: "Conceptual Engineering", href: "/conceptual-engineering", date: "2020-11-15"}, {text: "Building Meander in Meander", href: "/building-meander-in-meander", date: "2020-06-08"}, {text: "Card Driven Development", href: "/card-driven-development", date: "2019-10-06"}, {text: "Term Rewriting with Meander", href: "/meander-rewriting", date: "2019-08-04"}, {text: "Meander for Practical Data Transformation", href: "/meander-practical", date: "2019-06-06"}, {text: "Named Function Composition", href: "/named-function-composition", date: "2019-01-30"}, {text: "Defending the Incommunicability of Programs", href: "/incommunicability", date: "2018-12-28"}];
  d.value = a;
  i.value = [{text: "Graph Maker", href: "https://jimmyhmiller.github.io/graph-maker/"}, {text: "Finite State Machine Maker", href: "https://jimmyhmiller.github.io/fsm-maker/"}, {text: "EsLint Fixit", href: "https://github.com/jimmyhmiller/eslint-fixit"}, {text: "Zoom Launcher", href: "https://github.com/jimmyhmiller/zoom-cli"}];
  c.value = [{text: "The Future of Programming", href: "https://future-of-programming.now.sh"}, {text: "What is a Monad?", href: "https://what-is-a-monad.now.sh"}, {text: "Practical Functional Refactoring", href: "https://practical-functional-refactoring.now.sh"}, {text: "Property Based Testing", href: "https://generative-testing.now.sh"}, {text: "Datalog Lightning Talk", href: "https://datalog.now.sh"}];
  a = (d.value[Symbol.iterator])();
  c = [];
  while (true) {
    b = a.next();
    if (b.done) {
      a = (e.value[Symbol.iterator])();
      while (true) {
        b = a.next();
        if (b.done) {
          a = (g.value[Symbol.iterator])();
          while (true) {
            b = a.next();
            if (b.done) {
              j.value = c;
              h.value = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
              return;
            }
            c.push(b.value);
          }
        }
        c.push(b.value);
      }
    }
    c.push(b.value);
  }
}}["4688"], 2470: {"2470": function(s, m, c) {
  "use strict";
  let a, g, f, j, i, k, h, l, b, n, o, p, q, d, e, r;
  c.r(m);
  a = __o0();
  g = __mk18(a);
  f = __o0();
  j = __mk19(f);
  i = __mk20(f);
  k = __mk21(f);
  h = __o0();
  l = __mk22(h);
  b = __o0();
  c.d(m, {__N_SSG: g, popularPosts: j, posts: i, postsForBeginners: k, rssPosts: l, specialPosts: __mk23(b)});
  g = c(5893);
  j = c(9008);
  i = c(1664);
  k = c(7294);
  l = c(3935);
  n = c(1240);
  o = c(1195);
  p = c(6128);
  f.value = c(4688);
  q = c(7704);
  a.value = true;
  b.value = [{text: "Advent of Papers (2024)", href: "/advent-of-papers", nested: [{text: "Day 4: Is the Brain a Computer?", href: __s2, mdx: true}, {text: "Day 15: " + __s1, href: __s0, mdx: true}]}];
  a = f.value.xu;
  a = a.map(({""(a) {
  "use strict";
  return a.href;
}}[""]));
  a = new Set(a);
  b = (f.value.d8[Symbol.iterator])();
  d = [];
  while (true) {
    e = b.next();
    if (e.done) {
      b = (f.value.wU[Symbol.iterator])();
      while (true) {
        e = b.next();
        if (e.done) {
          a = d.filter(__mk25(a));
          b = (f.value.xu[Symbol.iterator])();
          d = [];
          while (true) {
            e = b.next();
            if (e.done) {
              a = (a[Symbol.iterator])();
              while (true) {
                b = a.next();
                if (b.done) {
                  h.value = d;
                  a = {day: "01", title: "Elephant 2000", href: "/advent-of-papers/2024/dec-1-elephant-2000"};
                  h = {day: "03", title: "Google's Awful Paper on Technical Debt", href: "/advent-of-papers/2024/dec-3-awful-google-tech-debt"};
                  b = {day: "04", title: "Is the Brain a Computer?", href: __s2};
                  d = {day: "05", title: "Worlds: Mutability with Control", href: "/advent-of-papers/2024/dec-5-worlds"};
                  e = {day: "11", title: "On Understanding Data Abstraction Revisited", href: "/advent-of-papers/2024/dec-11-data-abstraction"};
                  r = {day: "15", title: __s1, href: __s0};
                  a = [a, h, b, d, e, r];
                  h = ({j(a) {
  "use strict";
  return (a || "").slice(0, 4);
}}.j);
                  g = {value: g};
                  m.default = __mk26(o, [{text: "Meander: Declarative Explorations at the Limits of FP", href: "https://www.youtube.com/watch?v=9fhnJpCgtUw", venue: "Strange Loop"}, {text: "Paradigms Without Progress: Kuhnian Reflections on Programming Practice", href: "https://www.youtube.com/watch?v=TkPy7aLTtAw", venue: "Rebase"}], a, f, i, h, g, j, __mk32({value: l}, {value: p}, {value: q}, {value: k}, {value: n}, g), {"/ugliest-beautiful-codebase": "“We ran out of columns” — the best, worst codebase", "/easiest-way-to-build-type-checker": "The easiest way to build a type checker", "/machine-code-isnt-scary": "Machine code isn’t scary", "/discovery-coding": "Discovery coding"}, __mk43(i, g, ({v(a) {
  "use strict";
  return (/^https?:\/\//).test(a);
}}.v)));
                  return;
                }
                d.push(b.value);
              }
            }
            d.push(e.value);
          }
        }
        d.push(e.value);
      }
    }
    d.push(e.value);
  }
}}["2470"]}, function(a) {
  a.O(0, [1664, 8992, 9774, 2888, 179], __mk46(a));
  _N_E = a.O();
}]);
}
function main(a) {
  return a;
}
