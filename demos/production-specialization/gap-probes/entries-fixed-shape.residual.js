function main(d) {
  let a, b, e, c, f;
  a = d.team;
  b = d.project;
  e = d.path;
  if (typeof a === "string") {
    c = a.replace(/^_NEXTSEP_/, "");
    a = c;
  }
  a: {
    if (typeof b === "string") {
      c = b.replace(/^_NEXTSEP_/, "");
      f = a;
      a = c;
      break a;
    }
    f = a;
    a = b;
  }
  b: {
    if (typeof e === "string") {
      c = e.replace(/^_NEXTSEP_/, "");
      b = a;
      a = c;
      break b;
    }
    b = a;
    a = e;
  }
  return {team: f, project: b, path: a};
}
