import ini from "ini";
export function main(input) { return ini.parse(input); }
export const inputs = [
  "name = app\n[db]\nhost = localhost\nport = 5432\n[db.pool]\nmax = 10\n",
  "; comment\nlist[] = a\nlist[] = b\nflag\nquoted = \"x y\"\n",
  "",
  "é = ü\n[sec tion]\nk=v=w\n",
  "[__proto__]\npolluted = yes\n",
  "a = true\nb = false\nc = null\n",
];
