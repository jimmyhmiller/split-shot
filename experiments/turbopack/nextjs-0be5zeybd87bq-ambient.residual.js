var __s0 = "Cannot destructure a null or undefined value";
var __s1 = "invariant global layout router not mounted";
var __s2 = "static/immutable/chunks/1_bk3frgrq2ea.js";
var __s3 = "PlaceValidationBoundaryBelowThisLevel";
var __s4 = "cdf03b8c-8c47-03e8-434b-d3411881dea2";
var __s5 = "RenderValidationBoundaryAtThisLevel";
var __s6 = "createRenderSearchParamsFromClient";
var __s7 = "InstantValidationBoundaryContext";

function __o0() {
  return {value: true};
}
function __o1() {
  return {value: void 0};
}
function __o2() {
  return {height: 16, aspectRatio: 1, viewBox: "0 0 16 16"};
}

function __mk1(a) {
  "use strict";
  return function get() {
    return a;
  };
}

function __mk2(i) {
  "use strict";
  return function l(j, h, g) {
    let d, a, b, c, e, f;
    a: {
      d = {value: j};
      a = ((0 , i.value.useState)(__mk3(d, g, h))[Symbol.iterator])();
      b = a.next();
      if (b.done) {
        c = true;
        b = void 0;
        break a;
      }
      b = b.value;
      c = false;
    }
    b: {
      if (!c) {
        e = a.next();
        if (e.done) {
          c = true;
          e = void 0;
          break b;
        }
        e = e.value;
        break b;
      }
      e = void 0;
    }
    if (!c) {
      a.return != null && a.return();
    }
    if (b.tree === d.value) {
      return b;
    }
    d = {tree: d.value, renderTree: h, stateKey: g, next: null};
    f = d;
    c = 1;
    a = b;
    c: {
      while (null !== a && c < 3) {
        if (a.stateKey === g) {
          f.next = a.next;
          break c;
        }
        b = {tree: a.tree, renderTree: a.renderTree, stateKey: a.stateKey, next: null};
        f.next = b;
        a = a.next;
        c += 1;
        f = b;
      }
    }
    e(d);
    return d;
  };
}

function __mk3(a, b, c) {
  "use strict";
  return () => {
    return {tree: a.value, renderTree: c, stateKey: b, next: null};
  };
}

function __mk5(a) {
  "use strict";
  return function createClientParams() {
    return a.value.createRenderParamsFromClient;
  };
}

function __mk6(a) {
  "use strict";
  return function createClientSearchParams() {
    return a.value.createRenderSearchParamsFromClient;
  };
}

function __mk8(a) {
  "use strict";
  return function get() {
    return a;
  };
}

function __mk9(d, g, h, j, e, k) {
  "use strict";
  return function i(c) {
    let f, a, b;
    if (c == null) {
      throw new TypeError(__s0);
    }
    a: {
      f = c.Component;
      a = c.serverProvidedParams;
      if (null !== a) {
        b = a.searchParams;
        a = a.params;
        break a;
      }
      b: {
        a = (0 , d.value.use)(g.value.LayoutRouterContext);
        if (null !== a) {
          a = a.parentParams;
          break b;
        }
        a = {};
      }
      b = (0 , k.value.urlSearchParamsToParsedUrlQuery)((0 , d.value.use)(j.value.SearchParamsContext));
    }
    b = (0 , e.value.createClientSearchParams)(b);
    a = {params: (0 , e.value.createClientParams)(a), searchParams: b};
    return (0 , h.value.jsx)(f, a);
  };
}

function __mk11(a) {
  "use strict";
  return function get() {
    return a;
  };
}

function __mk12(f, g, h, i) {
  "use strict";
  return function o(b) {
    let c, d, a, e;
    if (b == null) {
      a = new TypeError(__s0);
      throw a;
    }
    a: {
      c = b.Component;
      d = b.slots;
      a = b.serverProvidedParams;
      if (null !== a) {
        a = a.params;
        break a;
      }
      a = (0 , f.value.use)(g.value.LayoutRouterContext);
      if (null !== a) {
        a = a.parentParams;
        break a;
      }
      a = {};
    }
    e = (0 , i.value.createClientParams)(a);
    a = {};
    Object.assign(a, d);
    Object.defineProperty(a, "params", {value: e, writable: true, enumerable: true, configurable: true});
    return (0 , h.value.jsx)(c, a);
  };
}

function __mk14(a) {
  "use strict";
  return function get() {
    return a;
  };
}

function __mk15(j, k, c, l, m) {
  "use strict";
  return function d(b) {
    let a, e, f, g, h, i;
    if (b == null) {
      throw new TypeError(__s0);
    }
    a: {
      a = b.notFound;
      e = b.forbidden;
      f = b.unauthorized;
      g = b.children;
      h = (0 , m.value.useUntrackedPathname)();
      i = (0 , j.value.useContext)(l.value.MissingSlotContext);
      if (a || e || f) {
        a = (0 , c.value.jsx)(k.value, {pathname: h, notFound: a, forbidden: e, unauthorized: f, missingSlots: i, children: g});
        break a;
      }
      a = (0 , c.value.jsx)(c.value.Fragment, {children: g});
    }
    return a;
  };
}

function __mk16(c) {
  "use strict";
  return function i(b) {
    let a;
    if (new.target === void 0) {
      throw new TypeError("Class constructor i cannot be invoked without 'new'");
    }
    a = Reflect.construct(c, [b], new.target);
    a.state = {triggeredStatus: void 0, previousPathname: b.pathname};
    return a;
  };
}

function __mk18(b) {
  "use strict";
  return {getDerivedStateFromError(a) {
    if ((0 , b.isHTTPAccessFallbackError)(a)) {
      return {triggeredStatus: (0 , b.getAccessFallbackHTTPStatus)(a)};
    }
    throw a;
  }}.getDerivedStateFromError;
}

function __mk20(i, d) {
  "use strict";
  return {render() {
    let c, f, g, h, b, e, a;
    c = this.props;
    if (c == null) {
      b = new TypeError(__s0);
      throw b;
    }
    f = c.notFound;
    g = c.forbidden;
    h = c.unauthorized;
    c = c.children;
    b = this.state;
    if (b == null) {
      b = new TypeError(__s0);
      throw b;
    }
    a: {
      e = b.triggeredStatus;
      a = d.HTTPAccessErrorStatus.NOT_FOUND;
      if (typeof a === "symbol") {
        break a;
      }
      a = String(a);
    }
    b: {
      b = {};
      Object.defineProperty(b, a, {value: f, writable: true, enumerable: true, configurable: true});
      a = d.HTTPAccessErrorStatus.FORBIDDEN;
      if (typeof a === "symbol") {
        break b;
      }
      a = String(a);
    }
    c: {
      Object.defineProperty(b, a, {value: g, writable: true, enumerable: true, configurable: true});
      a = d.HTTPAccessErrorStatus.UNAUTHORIZED;
      if (typeof a === "symbol") {
        break c;
      }
      a = String(a);
    }
    Object.defineProperty(b, a, {value: h, writable: true, enumerable: true, configurable: true});
    if (e) {
      f = e === d.HTTPAccessErrorStatus.NOT_FOUND && f;
      g = e === d.HTTPAccessErrorStatus.FORBIDDEN && g;
      h = e === d.HTTPAccessErrorStatus.UNAUTHORIZED && h;
      if (f || g || h) {
        c = (0 , i.value.jsxs)(i.value.Fragment, {children: [(0 , i.value.jsx)("meta", {name: "robots", content: "noindex"}), false, b[e]]});
      }
      return c;
    }
    return c;
  }}.render;
}

function __mk23(a) {
  "use strict";
  return function InstantValidationBoundaryContext() {
    return a.value.InstantValidationBoundaryContext;
  };
}

function __mk24(a) {
  "use strict";
  return function PlaceValidationBoundaryBelowThisLevel() {
    return a.value.PlaceValidationBoundaryBelowThisLevel;
  };
}

function __mk25(a) {
  "use strict";
  return function RenderValidationBoundaryAtThisLevel() {
    return a.value.RenderValidationBoundaryAtThisLevel;
  };
}

function __mk26(a) {
  "use strict";
  return function SlotMarker() {
    return a.value.SlotMarker;
  };
}

function __mk28(a) {
  "use strict";
  return function InstantValidationBoundaryContext() {
    return a.value;
  };
}

function __mk29(a) {
  "use strict";
  return function PlaceValidationBoundaryBelowThisLevel() {
    return a.value;
  };
}

function __mk30(a) {
  "use strict";
  return function RenderValidationBoundaryAtThisLevel() {
    return a.value;
  };
}

function __mk31(a) {
  "use strict";
  return function SlotMarker() {
    return a.value;
  };
}

function __mk33(a) {
  "use strict";
  return function LoadingBoundaryProvider() {
    return a;
  };
}

function __mk34(f, e, g) {
  "use strict";
  return function C(c) {
    let b, d, a;
    if (c == null) {
      throw new TypeError(__s0);
    }
    a: {
      b = c.loading;
      d = c.children;
      a = (0 , f.value.use)(e.value.LayoutRouterContext);
      if (null === a) {
        b = d;
        break a;
      }
      b = (0 , g.value.jsx)(e.value.LayoutRouterContext.Provider, {value: {parentTree: a.parentTree, parentRenderTree: a.parentRenderTree, parentSegmentPath: a.parentSegmentPath, parentParams: a.parentParams, parentLoadingData: b, debugNameContext: a.debugNameContext, url: a.url, isActive: a.isActive}, children: d});
    }
    return b;
  };
}

function __mk35(a) {
  "use strict";
  const __f = function () {
    return a;
  };
  Object.defineProperty(__f, "name", { value: "default" });
  return __f;
}

function __mk36(R, S, T, U, V, W, t, o, u, g, X) {
  "use strict";
  return function M(d) {
    let a, w, x, y, z, A, B, C, D, E, b, c, e, k, q, F, G, H, m, n, f, h, l, j, I, J, K, L, N, O, P, Q, r, s;
    if (d == null) {
      throw new TypeError(__s0);
    }
    a = d.parallelRouterKey;
    w = d.error;
    x = d.errorStyles;
    y = d.errorScripts;
    z = d.templateStyles;
    A = d.templateScripts;
    B = d.template;
    C = d.notFound;
    D = d.forbidden;
    E = d.unauthorized;
    d.segmentViewBoundaries;
    b = (0 , o.value.useContext)(u.value.LayoutRouterContext);
    if (!b) {
      throw Error("invariant expected layout router to be mounted");
    }
    a: {
      c = b.parentTree;
      e = b.parentRenderTree;
      k = b.parentSegmentPath;
      q = b.parentParams;
      F = b.parentLoadingData;
      G = b.url;
      H = b.isActive;
      b = b.debugNameContext;
      m = c[0];
      if (null === k) {
        k = [a];
        break a;
      }
      k = k.concat([m, a]);
    }
    b: {
      c = c[1][a];
      e = e.slots;
      if (e == null) {
        a = void 0;
        break b;
      }
      a = e.get(a);
    }
    if (void 0 === c || void 0 === a) {
      (0 , o.value.use)(i.unresolvedThenable);
    }
    c: {
      if ("u" < typeof window) {
        s = (0 , o.value.use)(t.value.InstantValidationBoundaryContext);
        break c;
      }
      s = null;
    }
    e = c[0];
    r = (0 , p.createSegmentKey)(e);
    a = (0 , v.useRouterBFCache)(c, a, r);
    e = [];
    c = a;
    a = true;
    while (a || null !== c) {
      d: {
        a = c.tree;
        m = c.renderTree;
        n = c.stateKey;
        f = a[0];
        if (Array.isArray(f)) {
          h = f[0];
          l = f[1];
          j = f[2];
          l = (0 , X.value.getParamValueFromCacheKey)(l, j);
          if (null !== l) {
            e: {
              j = {};
              Object.assign(j, q);
              if (typeof h === "symbol") {
                break e;
              }
              h = String(h);
            }
            Object.defineProperty(j, h, {value: l, writable: true, enumerable: true, configurable: true});
            h = j;
            break d;
          }
          h = q;
          break d;
        }
        h = q;
      }
      f = __rf37(f);
      l = g.value.jsxs;
      j = T.value;
      I = g.value.jsx;
      J = U.value.ErrorBoundary;
      K = g.value.jsx;
      L = R.value;
      N = g.value.jsx;
      O = W.value.HTTPAccessFallbackBoundary;
      P = g.value.jsxs;
      Q = V.value.RedirectBoundary;
      a = {url: G, tree: a, params: h, renderTree: m, segmentPath: k, debugNameContext: f ?? b, isActive: H && n === r};
      a = N(O, {notFound: C, forbidden: D, unauthorized: E, children: P(Q, {children: [(0 , g.value.jsx)(S.value, a), null]})});
      a = l(j, {renderTree: m, children: [I(J, {errorComponent: w, errorStyles: x, errorScripts: y, children: K(L, {name: void 0 === f ? void 0 : b, loading: F, children: a})}), null]});
      if ("u" < typeof window && "string" == typeof s) {
        a = (0 , g.value.jsx)(t.value.RenderValidationBoundaryAtThisLevel, {id: s, children: a});
      }
      a = (0 , g.value.jsxs)(u.value.TemplateContext.Provider, {value: a, children: [z, A, B]}, n);
      a = {name: void 0 === f ? void 0 : b, mode: n === r ? "visible" : "hidden", children: a};
      a = (0 , g.value.jsx)(o.value.Activity, a, n);
      e.push(a);
      c = c.next;
      a = false;
    }
    return e;
  };
}

function __rf37(a) {
  "use strict";
  if ("/" === a) {
    return "/";
  }
  if ("string" == typeof a) {
    if ("(__SLOT__)" === a) {
      return;
    }
    return a + "/";
  }
  return a[1] + "/";
}

function __mk38(h, b) {
  "use strict";
  return function O(c) {
    let e, a, d, f, g;
    if (c == null) {
      throw new TypeError(__s0);
    }
    e = c.name;
    a = c.loading;
    d = c.children;
    if (null !== a) {
      f = a[0];
      g = a[1];
      a = a[2];
      return (0 , b.value.jsx)(h.value.Suspense, {name: e, fallback: (0 , b.value.jsxs)(b.value.Fragment, {children: [g, a, f]}), children: d});
    }
    return (0 , b.value.jsx)(b.value.Fragment, {children: d});
  };
}

function __mk39(m, e, n, c, f, o) {
  "use strict";
  return function P(b) {
    let g, h, i, d, j, k, l, a;
    if (b == null) {
      throw new TypeError(__s0);
    }
    g = b.tree;
    h = b.segmentPath;
    i = b.debugNameContext;
    d = b.renderTree;
    j = b.params;
    k = b.url;
    l = b.isActive;
    a = (0 , c.value.useContext)(f.value.GlobalLayoutRouterContext);
    (0 , c.value.useContext)(m.value.NavigationPromisesContext);
    if (!a) {
      throw Error(__s1);
    }
    a: {
      a = null !== d.data.prefetchRsc ? d.data.prefetchRsc : d.data.rsc;
      a = (0 , c.value.useDeferredValue)(d.data.rsc, a);
      if ((0 , n.value.isDeferredRsc)(a)) {
        a = (0 , c.value.use)(a);
        if (null === a) {
          (0 , c.value.use)(e.value.unresolvedThenable);
        }
        break a;
      }
      if (null === a) {
        (0 , c.value.use)(e.value.unresolvedThenable);
      }
    }
    return (0 , o.value.jsx)(f.value.LayoutRouterContext.Provider, {value: {parentTree: g, parentRenderTree: d, parentSegmentPath: h, parentParams: j, parentLoadingData: null, debugNameContext: i, url: k, isActive: l}, children: a});
  };
}

function __mk40(f, g, h, i) {
  "use strict";
  return function _(b) {
    let a, d, c, e;
    if (b == null) {
      throw new TypeError(__s0);
    }
    a = b.children;
    d = b.renderTree;
    c = (0 , f.value.useContext)(g.value.GlobalLayoutRouterContext);
    if (!c) {
      throw Error(__s1);
    }
    e = h.value.jsx;
    a = {scrollRef: c.scrollRef, renderTree: d, children: a};
    return e(i.value, a);
  };
}

function __mk41(d, e, a, f) {
  "use strict";
  return function x(c) {
    let b;
    b = {value: a.value.default.useRef(null)};
    (0 , a.value.useLayoutEffect)(__mk42(d, c, e, b), void 0);
    return (0 , f.value.jsx)(a.value.Fragment, {ref: b.value, children: c.children});
  };
}

function __mk42(h, f, i, j) {
  "use strict";
  return () => {
    let b, c, d, e, a, g;
    if (f == null) {
      throw new TypeError(__s0);
    }
    b = f.scrollRef;
    c = f.renderTree;
    c = b.forceScroll ? b.scrollRef : c.data.scrollRef;
    if (null === c || !c.current) {
      return;
    }
    a: {
      d = b.hashFragment;
      e = {value: null};
      if (d) {
        b: {
          if ("top" === d) {
            a = document.body;
            break b;
          }
          a = document.getElementById(d);
          if (a == null) {
            a = document.getElementsByName(d)[0];
          }
          a = a ?? null;
        }
        e.value = a;
        if (null === a) {
          c.current = false;
          b.onlyHashChange = false;
          b.hashFragment = null;
          return;
        }
        break a;
      }
      e.value = j.value.current;
    }
    if (null === e.value) {
      return;
    }
    a = h.value.disableSmoothScrollDuringRouteTransition;
    c = {value: c};
    g = {value: false};
    a(__mk43(e, i, c, g, d), {dontForceLayout: true, onlyHashChange: b.onlyHashChange});
    if (g.value) {
      b.onlyHashChange = false;
      b.hashFragment = null;
    }
    return;
  };
}

function __mk43(d, h, i, j, f) {
  "use strict";
  return () => {
    let b, a, c, e, g;
    a: {
      b = document.documentElement;
      if (f) {
        g = null;
        a = f;
        c = {value: null};
        e = __mk44(b, {value: null}, c);
        break a;
      }
      a = b.clientHeight;
      c = {value: a};
      e = __mk44(b, {value: null}, c);
      a = (0 , h.value)(d.value, a, e);
      g = a;
      a = 0 !== a;
    }
    b: {
      if (a) {
        j.value = true;
        i.value.current = false;
        if (f) {
          d.value.scrollIntoView();
          break b;
        }
        if (1 !== g) {
          b.scrollTop = 0;
          if (2 === (0 , h.value)(d.value, c.value, e)) {
            d.value.scrollIntoView();
          }
        }
      }
    }
  };
}

function __mk44(e, d, f) {
  "use strict";
  return {s: () => {
    let a, c, b;
    if (null === d.value) {
      a: {
        a = f.value;
        c = getComputedStyle(e).scrollPaddingTop;
        b = Number.parseFloat(c);
        if (!Number.isFinite(b) || b < 0) {
          a = 0;
          break a;
        }
        b: {
          if (c.endsWith("px")) {
            a = b;
            break b;
          }
          a = c.endsWith("%") ? b / 100 * a : 0;
        }
      }
      d.value = a;
    }
    return d.value;
  }}.s;
}

function __mk47(a) {
  "use strict";
  return function get() {
    return a;
  };
}

function __mk48(c, a, d) {
  "use strict";
  return function o() {
    let b;
    b = {children: (0 , c.value.useContext)(d.value.TemplateContext)};
    return (0 , a.value.jsx)(a.value.Fragment, b);
  };
}

function __mk50(a) {
  "use strict";
  return function get() {
    return a.value;
  };
}

function __mk52(a) {
  "use strict";
  return function get() {
    return a;
  };
}

function __mk53(c) {
  "use strict";
  return function l(b) {
    let a;
    a = c.value.get(b);
    if (a) {
      return a;
    }
    a = Promise.resolve(b);
    a.status = "fulfilled";
    a.value = b;
    c.value.set(b, a);
    return a;
  };
}

function __mk55(a) {
  "use strict";
  return function get() {
    return a.value;
  };
}

function __mk57(a) {
  "use strict";
  return function get() {
    return a;
  };
}

function __mk58(c) {
  "use strict";
  return function l(b) {
    let a;
    a = c.value.get(b);
    if (a) {
      return a;
    }
    a = Promise.resolve(b);
    a.status = "fulfilled";
    a.value = b;
    c.value.set(b, a);
    return a;
  };
}

function __mk60(a) {
  "use strict";
  return function get() {
    return a.value;
  };
}

function __mk61(b) {
  "use strict";
  return {l: () => {
    let a;
    a: {
      if ("u" > typeof window) {
        a = null;
        break a;
      }
      a = (0 , b.jsx)("meta", {name: "«nxt-icon»"});
    }
    return a;
  }}.l;
}

function __mk63(a) {
  "use strict";
  return function get() {
    return a;
  };
}

function __mk68(b, c, d, e) {
  "use strict";
  return function(f) {
    let a;
    a = {$generated: c};
    Object.assign(a, f);
    Object.defineProperty(a, "children", {value: b, writable: true, enumerable: true, configurable: true});
    return (0 , e.jsx)(d.f, a);
  };
}

function __mk70(b, c, d, e) {
  "use strict";
  return function(f) {
    let a;
    a = {$generated: e};
    Object.assign(a, f);
    Object.defineProperty(a, "children", {value: c, writable: true, enumerable: true, configurable: true});
    return (0 , d.jsx)(b.f, a);
  };
}

function __mk71(b, c, d, e) {
  "use strict";
  return function(f) {
    let a;
    a = {$generated: d};
    Object.assign(a, f);
    Object.defineProperty(a, "children", {value: c, writable: true, enumerable: true, configurable: true});
    return (0 , e.jsx)(b.f, a);
  };
}

function __mk72(b, c, d, e) {
  "use strict";
  return function(f) {
    let a;
    a = {$generated: c};
    Object.assign(a, f);
    Object.defineProperty(a, "children", {value: d, writable: true, enumerable: true, configurable: true});
    return (0 , e.jsx)(b.f, a);
  };
}

function __mk73(b, c, d, e) {
  "use strict";
  return function(f) {
    let a;
    a = {$generated: c};
    Object.assign(a, f);
    Object.defineProperty(a, "children", {value: d, writable: true, enumerable: true, configurable: true});
    return (0 , e.jsx)(b.f, a);
  };
}

function __mk74(p, h, q, f, i) {
  "use strict";
  return function(c) {
    let d, g, b, e, a, j, k, l, m, n, o;
    if (c == null) {
      throw new TypeError(__s0);
    }
    d = c.small;
    g = c.className;
    b = c.onThemeSwitch;
    e = c.disabled;
    e = e === void 0 ? false : e;
    a = (0 , p.i)();
    if (a == null) {
      throw new TypeError(__s0);
    }
    j = a.theme;
    k = a.setTheme;
    a = a.forcedTheme;
    l = q.useId();
    m = f.jsxs;
    g = (0 , h.q)("isolate flex shadow-[var(--ds-shadow-border)] rounded-full h-8 w-fit p-0 border-0 m-0", "data-[small]:h-6", g);
    n = (0 , f.jsx)("legend", {className: "sr-only", children: "Select a display theme:"});
    o = i.map;
    b = __mk75(d, k, l, e || !!a, j, h, b, f);
    b = [n, o.call(i, b)];
    d = {className: g, "data-small": d ? "" : void 0, children: b};
    return m.call(f, "fieldset", d);
  };
}

function __mk75(h, p, q, i, r, j, s, b) {
  "use strict";
  return (d) => {
    let c, a, k, g, l, e, f, m, n, o;
    if (d == null) {
      throw new TypeError(__s0);
    }
    c = d.key;
    a = d.icon;
    k = d.smallIcon;
    g = "theme-switch-" + `${c}` + "-" + `${q}`;
    l = b.jsxs;
    e = {"aria-label": c, checked: c === r, className: "appearance-none p-0 m-0 outline-none absolute peer", disabled: i, id: g, onChange: __mk76(p, s, c), type: "radio", value: c};
    e = (0 , b.jsx)("input", e);
    f = i ? "cursor-not-allowed text-[var(--ds-gray-500)]" : ["cursor-pointer hover:text-[var(--ds-gray-1000)] text-[var(--ds-gray-700)]", "peer-checked:shadow-[0_0_0_1px_var(--ds-gray-400),0px_1px_2px_0px_var(--ds-gray-alpha-100)] peer-checked:text-[var(--ds-gray-1000)] peer-checked:bg-[var(--ds-background-100)] peer-checked:[&_svg]:!text-[var(--accents-8)]", "peer-focus-visible:shadow-[var(--ds-focus-ring)] peer-focus-visible:text-[var(--ds-gray-1000)] peer-focus-visible:[&_svg]:!text-[var(--accents-8)]"];
    m = b.jsxs;
    f = (0 , j.q)("group rounded-full flex items-center justify-center bg-none size-8 m-0 relative", "data-[small]:size-6", f);
    n = (0 , b.jsx)("span", {className: "sr-only", children: c});
    o = b.jsx;
    a = {className: (0 , j.q)("relative z-[1]", "size-4"), children: h ? k : a};
    a = [n, o.call(b, "span", a)];
    a = {className: f, "data-small": h ? "" : void 0, htmlFor: g, children: a};
    a = {className: "h-full", children: [e, m.call(b, "label", a)]};
    return l.call(b, "span", a, c);
  };
}

function __mk76(c, a, b) {
  "use strict";
  return {onChange: () => {
    a: {
      c(b);
      if (a == null) {
        break a;
      }
      a(b);
    }
  }}.onChange;
}

function __mk78(a) {
  return (c) => {
    let b;
    b = [a.l({path: "static/immutable/chunks/38y_xbfgfbc1f.js", moduleChunks: ["static/immutable/chunks/3vc_lgnk3w3rj.js", "static/immutable/chunks/3cmges4kdf2c3.js"]}), a.l("static/immutable/chunks/0ehaknkc9_mia.js"), a.l({path: "static/immutable/chunks/1wsmmh6gtikc-.js", moduleChunks: ["static/immutable/chunks/0lwb56t767hud.js", "static/immutable/chunks/1xs_j5xlwqase.js"]}), a.l("static/immutable/chunks/2lq1jad2d956c.js"), a.l("static/immutable/chunks/2e0key_w_hazn.js"), a.l("static/immutable/chunks/2jfwajuskc1lq.js"), a.l("static/immutable/chunks/3-bebpc2xe47x.js"), a.l("static/immutable/chunks/0k2xfqoygqma5.css")];
    b = Promise.all(b);
    return b.then(__mk79(c));
  };
}

function __mk79(a) {
  return () => {
    return a(494198);
  };
}

function __mk81(b) {
  return (c) => {
    let a;
    a = [b.l({path: "static/immutable/chunks/4508jz8a7g99k.js", moduleChunks: [__s2, "static/immutable/chunks/0jiqwcrgo2l_y.js"]})];
    a = Promise.all(a);
    return a.then(__mk82(c));
  };
}

function __mk82(a) {
  return () => {
    return a(575623);
  };
}

function __mk84(b) {
  return (c) => {
    let a;
    a = [b.l({path: "static/immutable/chunks/44iek47g6qp-2.js", moduleChunks: [__s2, "static/immutable/chunks/239ecj9-qhv2r.js"]})];
    a = Promise.all(a);
    return a.then(__mk85(c));
  };
}

function __mk85(a) {
  return () => {
    return a(697830);
  };
}

(function () {
  let b, e, c, d, g, f, a, h;
  a: {
    try {
      b = globalThis;
      e = (new b.Error()).stack;
      c = e;
      if (c) {
        b: {
          d = b._debugIds;
          if (d) {
            break b;
          }
          g = b;
          f = {};
          g._debugIds = f;
          d = f;
        }
        d[e] = __s4;
        c = __s4;
        c = __s4;
      }
    } catch (i) {
    }
    a = globalThis.TURBOPACK;
    if (a) {
      break a;
    }
    a = [];
    TURBOPACK = a;
  }
  a.push;
  h = ["object" == typeof document ? document.currentScript : void 0, [918806, ({""(c, d, a) {
  "use strict";
  let b;
  Object.defineProperty(a, "__esModule", {value: true});
  b = {value: void 0};
  Object.defineProperty(a, "useRouterBFCache", {enumerable: true, get: __mk1(__mk2(b))});
  b.value = c.r(993856);
  if (("function" == typeof a.default || "object" == typeof a.default && null !== a.default) && void 0 === a.default.__esModule) {
    Object.defineProperty(a.default, "__esModule", {value: true});
    Object.assign(a.default, a);
    d.exports = a.default;
  }
}}[""]), 971037, ({""(d, e, a) {
  "use strict";
  let b, c;
  Object.defineProperty(a, "__esModule", {value: true});
  b = {value: void 0};
  Object.defineProperty(a, "createClientParams", {enumerable: true, get: __mk5(b)});
  c = {value: void 0};
  Object.defineProperty(a, "createClientSearchParams", {enumerable: true, get: __mk6(c)});
  b.value = d.r(837975);
  c.value = d.r(651361);
  if (("function" == typeof a.default || "object" == typeof a.default && null !== a.default) && void 0 === a.default.__esModule) {
    Object.defineProperty(a.default, "__esModule", {value: true});
    Object.assign(a.default, a);
    e.exports = a.default;
  }
}}[""]), 124789, ({""(b, i, a) {
  "use strict";
  let c, d, e, f, g, h;
  Object.defineProperty(a, "__esModule", {value: true});
  c = {value: void 0};
  d = {value: void 0};
  e = {value: void 0};
  f = {value: void 0};
  g = {value: void 0};
  h = {value: void 0};
  Object.defineProperty(a, "ClientPageRoot", {enumerable: true, get: __mk8(__mk9(c, d, e, f, g, h))});
  e.value = b.r(814996);
  d.value = b.r(754680);
  c.value = b.r(993856);
  h.value = b.r(121743);
  f.value = b.r(291980);
  g.value = b.r(971037);
  if (("function" == typeof a.default || "object" == typeof a.default && null !== a.default) && void 0 === a.default.__esModule) {
    Object.defineProperty(a.default, "__esModule", {value: true});
    Object.assign(a.default, a);
    i.exports = a.default;
  }
}}[""]), 19309, ({""(b, g, a) {
  "use strict";
  let c, d, e, f;
  Object.defineProperty(a, "__esModule", {value: true});
  c = {value: void 0};
  d = {value: void 0};
  e = {value: void 0};
  f = {value: void 0};
  Object.defineProperty(a, "ClientSegmentRoot", {enumerable: true, get: __mk11(__mk12(c, d, e, f))});
  e.value = b.r(814996);
  d.value = b.r(754680);
  c.value = b.r(993856);
  f.value = b.r(971037);
  if (("function" == typeof a.default || "object" == typeof a.default && null !== a.default) && void 0 === a.default.__esModule) {
    Object.defineProperty(a.default, "__esModule", {value: true});
    Object.assign(a.default, a);
    g.exports = a.default;
  }
}}[""]), 738369, ({""(e, k, d) {
  "use strict";
  let a, h, g, b, f, c, i, j;
  a: {
    Object.defineProperty(d, "__esModule", {value: true});
    a = {value: void 0};
    h = {value: void 0};
    g = {value: void 0};
    b = {value: void 0};
    f = {value: void 0};
    Object.defineProperty(d, "HTTPAccessFallbackBoundary", {enumerable: true, get: __mk14(__mk15(a, h, g, b, f))});
    c = e.r(887165);
    g.value = e.r(814996);
    i = c._;
    j = e.r(993856);
    a.value = i.call(c, j);
    f.value = e.r(422767);
    f = e.r(432979);
    b.value = e.r(754680);
    a = a.value.default.Component;
    b = __mk16(a);
    if (a === null) {
      c = null;
      break a;
    }
    if (!(typeof a === "function")) {
      throw new TypeError("Class extends value is not a constructor or null");
    }
    c = a.prototype;
    if (!(c === null || (typeof c === "object" || typeof c === "function"))) {
      throw new TypeError("Class extends value does not have valid prototype property");
    }
    Object.setPrototypeOf(b, a);
  }
  (typeof c === "object" || typeof c === "function") && Object.setPrototypeOf(b.prototype, c);
  b.prototype;
  a = b.prototype;
  Object.defineProperty(a, "componentDidCatch", {value: ({componentDidCatch() {
  "use strict";
}}.componentDidCatch), writable: true, enumerable: false, configurable: true});
  Object.defineProperty(b, "getDerivedStateFromError", {value: __mk18(f), writable: true, enumerable: false, configurable: true});
  Object.defineProperty(b, "getDerivedStateFromProps", {value: ({getDerivedStateFromProps(a, b) {
  "use strict";
  let c;
  a: {
    if (a.pathname !== b.previousPathname && b.triggeredStatus) {
      c = {triggeredStatus: void 0, previousPathname: a.pathname};
      break a;
    }
    c = {triggeredStatus: b.triggeredStatus, previousPathname: a.pathname};
  }
  return c;
}}.getDerivedStateFromProps), writable: true, enumerable: false, configurable: true});
  Object.defineProperty(a, "render", {value: __mk20(g, f), writable: true, enumerable: false, configurable: true});
  h.value = b;
  if (("function" == typeof d.default || "object" == typeof d.default && null !== d.default) && void 0 === d.default.__esModule) {
    Object.defineProperty(d.default, "__esModule", {value: true});
    Object.assign(d.default, d);
    k.exports = d.default;
  }
}}[""]), 14370, ({""(c, d, a) {
  "use strict";
  let b;
  Object.defineProperty(a, "__esModule", {value: true});
  b = {value: void 0};
  Object.defineProperty(a, "InstantValidationBoundaryContext", {enumerable: true, get: __mk23(b)});
  Object.defineProperty(a, "PlaceValidationBoundaryBelowThisLevel", {enumerable: true, get: __mk24(b)});
  Object.defineProperty(a, "RenderValidationBoundaryAtThisLevel", {enumerable: true, get: __mk25(b)});
  Object.defineProperty(a, "SlotMarker", {enumerable: true, get: __mk26(b)});
  b.value = c.r(857281);
  if (("function" == typeof a.default || "object" == typeof a.default && null !== a.default) && void 0 === a.default.__esModule) {
    Object.defineProperty(a.default, "__esModule", {value: true});
    Object.assign(a.default, a);
    d.exports = a.default;
  }
}}[""]), 857281, ({""(g, f, a) {
  "use strict";
  let b, c, d, e;
  Object.defineProperty(a, "__esModule", {value: true});
  b = {value: void 0};
  Object.defineProperty(a, "InstantValidationBoundaryContext", {enumerable: true, get: __mk28(b)});
  c = {value: void 0};
  Object.defineProperty(a, "PlaceValidationBoundaryBelowThisLevel", {enumerable: true, get: __mk29(c)});
  d = {value: void 0};
  Object.defineProperty(a, "RenderValidationBoundaryAtThisLevel", {enumerable: true, get: __mk30(d)});
  e = {value: void 0};
  Object.defineProperty(a, "SlotMarker", {enumerable: true, get: __mk31(e)});
  b.value = null;
  c.value = null;
  d.value = null;
  e.value = null;
  if (("function" == typeof a.default || "object" == typeof a.default && null !== a.default) && void 0 === a.default.__esModule) {
    Object.defineProperty(a.default, "__esModule", {value: true});
    Object.assign(a.default, a);
    f.exports = a.default;
  }
}}[""]), 550207, ({""(a, q, c) {
  "use strict";
  let e, g, d, h, i, j, f, k, b, l, m, n, o, p;
  Object.defineProperty(c, "__esModule", {value: true});
  e = {value: void 0};
  g = {value: void 0};
  d = {value: void 0};
  Object.defineProperty(c, "LoadingBoundaryProvider", {enumerable: true, get: __mk33(__mk34(e, g, d))});
  h = {value: void 0};
  i = {value: void 0};
  j = {value: void 0};
  f = __mk39(h, i, j, e, g, d);
  f = {value: f};
  k = {value: void 0};
  b = (function g(e, f, h) {
  "use strict";
  let c, b, a, d;
  c = e.getClientRects();
  if (0 === c.length) {
    return 0;
  }
  b = Infinity;
  a = 0;
  while (a < c.length) {
    d = c[a];
    if (d.top < b) {
      b = d.top;
      a += 1;
      continue;
    }
    a += 1;
  }
  return b >= h() && b <= f ? 1 : 2;
});
  b = {value: b};
  b = __mk41(k, b, e, d);
  b = {value: b};
  b = __mk40(e, g, d, b);
  b = {value: b};
  l = {value: void 0};
  m = {value: void 0};
  n = {value: void 0};
  o = {value: void 0};
  p = {value: void 0};
  Object.defineProperty(c, "default", {enumerable: true, get: __mk35(__mk36({value: __mk38(e, d)}, f, b, l, m, n, o, e, g, d, p))});
  f = a.r(887165);
  d.value = a.r(814996);
  d = f._;
  b = a.r(993856);
  e.value = d.call(f, b);
  g.value = a.r(754680);
  i.value = a.r(364160);
  l.value = a.r(821654);
  k.value = a.r(42955);
  m.value = a.r(177046);
  n.value = a.r(738369);
  o.value = a.r(14370);
  a.r(814412);
  a.r(918806);
  a.r(818975);
  h.value = a.r(291980);
  p.value = a.r(121743);
  j.value = a.r(922457);
  if (("function" == typeof c.default || "object" == typeof c.default && null !== c.default) && void 0 === c.default.__esModule) {
    Object.defineProperty(c.default, "__esModule", {value: true});
    Object.assign(c.default, c);
    q.exports = c.default;
  }
}}[""]), 811771, ({""(c, h, a) {
  "use strict";
  let d, b, e, f, g;
  Object.defineProperty(a, "__esModule", {value: true});
  d = {value: void 0};
  b = {value: void 0};
  e = {value: void 0};
  Object.defineProperty(a, "default", {enumerable: true, get: __mk47(__mk48(d, b, e))});
  f = c.r(887165);
  b.value = c.r(814996);
  b = f._;
  g = c.r(993856);
  d.value = b.call(f, g);
  e.value = c.r(754680);
  if (("function" == typeof a.default || "object" == typeof a.default && null !== a.default) && void 0 === a.default.__esModule) {
    Object.defineProperty(a.default, "__esModule", {value: true});
    Object.assign(a.default, a);
    h.exports = a.default;
  }
}}[""]), 837975, ({""(c, d, a) {
  "use strict";
  let b;
  Object.defineProperty(a, "__esModule", {value: true});
  b = {value: void 0};
  Object.defineProperty(a, "createRenderParamsFromClient", {enumerable: true, get: __mk50(b)});
  b.value = c.r(289882).createRenderParamsFromClient;
  if (("function" == typeof a.default || "object" == typeof a.default && null !== a.default) && void 0 === a.default.__esModule) {
    Object.defineProperty(a.default, "__esModule", {value: true});
    Object.assign(a.default, a);
    d.exports = a.default;
  }
}}[""]), 289882, ({""(d, c, a) {
  "use strict";
  let b;
  Object.defineProperty(a, "__esModule", {value: true});
  b = {value: void 0};
  Object.defineProperty(a, "createRenderParamsFromClient", {enumerable: true, get: __mk52(__mk53(b))});
  b.value = new WeakMap([]);
  if (("function" == typeof a.default || "object" == typeof a.default && null !== a.default) && void 0 === a.default.__esModule) {
    Object.defineProperty(a.default, "__esModule", {value: true});
    Object.assign(a.default, a);
    c.exports = a.default;
  }
}}[""]), 651361, ({""(c, d, a) {
  "use strict";
  let b;
  Object.defineProperty(a, "__esModule", {value: true});
  b = {value: void 0};
  Object.defineProperty(a, "createRenderSearchParamsFromClient", {enumerable: true, get: __mk55(b)});
  b.value = c.r(382540).createRenderSearchParamsFromClient;
  if (("function" == typeof a.default || "object" == typeof a.default && null !== a.default) && void 0 === a.default.__esModule) {
    Object.defineProperty(a.default, "__esModule", {value: true});
    Object.assign(a.default, a);
    d.exports = a.default;
  }
}}[""]), 382540, ({""(d, c, a) {
  "use strict";
  let b;
  Object.defineProperty(a, "__esModule", {value: true});
  b = {value: void 0};
  Object.defineProperty(a, "createRenderSearchParamsFromClient", {enumerable: true, get: __mk57(__mk58(b))});
  b.value = new WeakMap([]);
  if (("function" == typeof a.default || "object" == typeof a.default && null !== a.default) && void 0 === a.default.__esModule) {
    Object.defineProperty(a.default, "__esModule", {value: true});
    Object.assign(a.default, a);
    c.exports = a.default;
  }
}}[""]), 735694, ({""(c, d, b) {
  "use strict";
  let a;
  Object.defineProperty(b, "__esModule", {value: true});
  a = {value: void 0};
  Object.defineProperty(b, "IconMark", {enumerable: true, get: __mk60(a)});
  a.value = __mk61(c.r(814996));
}}[""]), 42955, ({""(b, c, a) {
  "use strict";
  Object.defineProperty(a, "__esModule", {value: true});
  Object.defineProperty(a, "disableSmoothScrollDuringRouteTransition", {enumerable: true, get: __mk63((function n(c) {
  "use strict";
  let b, a, d;
  a: {
    if (arguments.length > 1 && void 0 !== arguments[1]) {
      b = arguments[1];
      break a;
    }
    b = {};
  }
  if (b.onlyHashChange) {
    return void c();
  }
  a = document.documentElement;
  if ("smooth" !== a.dataset.scrollBehavior) {
    return void c();
  }
  b: {
    d = a.style.scrollBehavior;
    a.style.scrollBehavior = "auto";
    if (b.dontForceLayout) {
      break b;
    }
    a.getClientRects();
  }
  c();
  a.style.scrollBehavior = d;
  return;
}))});
}}[""]), 707206, ({""(a) {
  "use strict";
  a.s(["f", 0, (function(b) {
  "use strict";
  let a, c, d, e, f;
  if (b == null) {
    throw new TypeError("Cannot destructure a null or undefined value");
  }
  a: {
    a = b.heightProp;
    c = b.generatedHeight;
    d = b.generatedAspectRatio;
    e = b.generatedBalancedWidthMultiplier;
    f = b.generatedBalancedHeightMultiplier;
    if (b.balanced) {
      a = {width: Math.round((a ?? c) * e), height: Math.round((a ?? c) * f)};
      break a;
    }
    a = {width: Math.round((a ?? c) * d), height: Math.round(a ?? c)};
  }
  return a;
})]);
}}[""]), 342531, ({""(b) {
  "use strict";
  let a, d, c, e, f;
  a = b.i(814996);
  d = b.i(963706);
  c = a.jsx;
  e = a.Fragment;
  f = {children: (0 , a.jsx)("path", {fill: "currentColor", fillRule: "evenodd", d: "m12.06 6.75-.53.53-2.82 2.82a1 1 0 0 1-1.42 0L4.47 7.28l-.53-.53L5 5.69l.53.53L8 8.69l2.47-2.47.53-.53z", clipRule: "evenodd"})};
  c = c.call(a, e, f);
  b.s(["f", 0, __mk68(c, {height: 16, aspectRatio: 1, viewBox: "0 0 16 16"}, d, a)]);
}}[""]), 80391, ({""(b) {
  "use strict";
  let a, j, k, l, f, g, c, d, h, i, e, m, n;
  a = b.i(814996);
  j = b.i(993856);
  k = b.i(7284);
  l = b.i(280036);
  f = b.i(963706);
  g = a.jsx;
  c = a.Fragment;
  d = {children: (0 , a.jsx)("path", {fill: "currentColor", fillRule: "evenodd", d: "M1 3.25C1 1.45 2.46 0 4.25 0h7.5C13.55 0 15 1.46 15 3.25V16H1V3.25M4.25 1.5c-.97 0-1.75.78-1.75 1.75V14.5h11V3.25c0-.97-.78-1.75-1.75-1.75zM4 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6H4zm5 9h3v-1.5H9z", clipRule: "evenodd"})};
  g = g.call(a, c, d);
  c = a.jsx;
  d = a.Fragment;
  h = {children: (0 , a.jsx)("path", {fill: "currentColor", fillRule: "evenodd", d: "M2.5 5.25C2.5 3.45 3.96 2 5.75 2h4.5c1.8 0 3.25 1.46 3.25 3.25V14h-11V5.25M5.75 3.5C4.78 3.5 4 4.28 4 5.25v7.25h8V5.25c0-.97-.78-1.75-1.75-1.75zM5 5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V9H5zm3.5 6H11V10H8.5z", clipRule: "evenodd"})};
  c = c.call(a, d, h);
  d = b.i(880501);
  h = a.jsx;
  i = a.Fragment;
  e = {children: (0 , a.jsx)("path", {fill: "currentColor", d: "m6.3 3.3.7.25A4.25 4.25 0 0 0 12.45 9l.96.96-.08.2A5.75 5.75 0 1 1 6.04 2.6zM5.25 4.76a4.24 4.24 0 1 0 6 5.99H11a5.75 5.75 0 0 1-5.75-6M12.5 3.5h1.25V5H12.5v1.25H11V5H9.75V3.5H11V2.25h1.5zM7 3.55l-.7-.25-.26-.7z"})};
  h = h.call(a, i, e);
  i = b.i(770665);
  e = a.jsx;
  m = a.Fragment;
  n = {children: (0 , a.jsx)("path", {fill: "currentColor", fillRule: "evenodd", d: "M8.75 2v-.75h-1.5V3h1.5V2M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4m0 1.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m.75 1.5v1.75h-1.5V13zM13 7.25h1.75v1.5H13zm-11 0h-.75v1.5H3v-1.5H2m9-3.32.54-.53.17-.17.53-.53 1.06 1.06-.53.53-.17.17-.53.53zm-7.77 7.78-.53.53 1.06 1.06.53-.53.17-.17.53-.53L3.93 11l-.53.53zM3.93 5l-.53-.53-.17-.17-.53-.53L3.76 2.7l.53.53.17.17.53.53zm7.78 7.78.53.53 1.06-1.06-.53-.53-.17-.17-.53-.53L11 12.07l.53.53z", clipRule: "evenodd"})};
  e = e.call(a, m, n);
  g = (0 , a.jsx)(__mk70(f, g, a, {height: 16, aspectRatio: 1, viewBox: "0 0 16 16"}), {});
  c = (0 , a.jsx)(__mk71(f, c, {height: 16, aspectRatio: 1, viewBox: "0 0 16 16"}, a), {});
  i = (0 , a.jsx)(i.f, {});
  e = (0 , a.jsx)(__mk72(f, {height: 16, aspectRatio: 1, viewBox: "0 0 16 16"}, e, a), {});
  d = (0 , a.jsx)(d.f, {});
  f = (0 , a.jsx)(__mk73(f, {height: 16, aspectRatio: 1, viewBox: "0 0 16 16"}, h, a), {});
  b.s(["ThemeSwitcher", 0, __mk74(l, k, j, a, [{key: "system", icon: g, smallIcon: c}, {key: "light", icon: i, smallIcon: e}, {key: "dark", icon: d, smallIcon: f}])], 80391);
}}[""])], 228467, ({""(a) {
  a.v(__mk78(a));
}}[""]), 236683, ({""(a) {
  a.v(__mk81(a));
}}[""]), 347561, ({""(a) {
  a.v(__mk84(a));
}}[""])];
  a.push(h);
})();
function main(a) {
  return a;
}
