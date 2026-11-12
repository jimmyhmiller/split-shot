// style: backtracking regex matcher (Kernighan/Pike: recursive matchHere/matchStar over pattern suffixes)
// residue: \.slice\([12]\)|ERRO\*R
// Rob Pike's matcher from "Beautiful Code" with a fixed grep pattern, run over
// the lines of a log: which lines report a database timeout error.
// Supports literal characters, . (any), c* (zero or more), ^ and $.
const PATTERN = "ERRO*R.*db.*timeo*ut$";

function match(pattern, text) {
  if (pattern[0] === "^") {
    return matchHere(pattern.slice(1), text, 0);
  }
  let start = 0;
  do {
    if (matchHere(pattern, text, start)) return true;
  } while (start++ < text.length);
  return false;
}

function matchHere(pattern, text, textPos) {
  if (pattern.length === 0) return true;
  if (pattern[1] === "*") {
    return matchStar(pattern[0], pattern.slice(2), text, textPos);
  }
  if (pattern[0] === "$" && pattern.length === 1) {
    return textPos === text.length;
  }
  if (textPos < text.length && (pattern[0] === "." || pattern[0] === text[textPos])) {
    return matchHere(pattern.slice(1), text, textPos + 1);
  }
  return false;
}

function matchStar(character, pattern, text, textPos) {
  do {
    if (matchHere(pattern, text, textPos)) return true;
  } while (textPos < text.length && (text[textPos++] === character || character === "."));
  return false;
}

export function main(input) {
  const hits = [];
  for (let i = 0; i < input.lines.length; i++) {
    if (match(PATTERN, input.lines[i])) hits.push(i);
  }
  return hits;
}

export const inputs = [{"lines":[]},{"lines":[""]},{"lines":["ERRR db timeout","ERROOOR db timeout","ERROR db timeout!","ERROR timeout db"]},{"lines":["ERROR: connection to db lost after timeout","eRROR db timeout","ERROR db timeout\n"]},{"lines":["2026-11-12T10:39 [WARN] svc=worker auth request 6794 ok","2026-11-12T10:10 [DEBUG] svc=cron dbx request 7394 timeut","2026-11-12T10:47 [WARN] svc=worker http request 2090 retry","2026-11-12T10:52 [DEBUG] svc=api db request 7313 timeut","2026-11-12T10:16 [ERROR] svc=cron auth request 4193 timeout ","2026-11-12T10:49 [WARN] svc=api http request 3770 timeout ","2026-11-12T10:58 [ERROR] svc=cron http request 4360 timed out","2026-11-12T10:49 [WARN] svc=worker auth request 7002 timeout","2026-11-12T10:35 [INFO] svc=cron db request 6996 timeoooout","2026-11-12T10:22 [ERROR] svc=worker auth request 4305 timeout","2026-11-12T10:15 [INFO] svc=cron db pool request 2863 timeoooout","2026-11-12T10:25 [WARN] svc=cron db request 5382 retry"]},{"lines":["2026-11-12T10:36 [ERRR] svc=api cache request 4487 timeout ","2026-11-12T10:39 [WARN] svc=worker auth request 2016 timeout ","2026-11-12T10:54 [ERR] svc=api cache request 6489 timeut","2026-11-12T10:48 [ERRR] svc=api dbx request 9954 timeout ","2026-11-12T10:11 [ERR] svc=cron auth request 5722 ok","2026-11-12T10:05 [DEBUG] svc=api http request 4532 retry","2026-11-12T10:18 [DEBUG] svc=api dbx request 4090 timeout ","2026-11-12T10:00 [WARN] svc=cron dbx request 7942 timed out","2026-11-12T10:35 [DEBUG] svc=api db pool request 2542 timeout ","2026-11-12T10:38 [ERRR] svc=cron db request 6557 timed out","2026-11-12T10:40 [INFO] svc=worker http request 6763 timeout ","2026-11-12T10:19 [ERRR] svc=worker db request 2456 timeut","2026-11-12T10:07 [ERR] svc=cron dbx request 5181 retry","2026-11-12T10:48 [WARN] svc=worker db request 1359 timed out","2026-11-12T10:20 [INFO] svc=worker db request 969 timeout","2026-11-12T10:07 [INFO] svc=cron dbx request 7026 timeut","2026-11-12T10:13 [ERROR] svc=cron http request 954 timed out","2026-11-12T10:21 [DEBUG] svc=api http request 5819 timed out","2026-11-12T10:15 [ERRR] svc=api dbx request 2874 timeout ","2026-11-12T10:43 [ERR] svc=cron dbx request 2717 timeout","2026-11-12T10:46 [INFO] svc=api db request 4630 timeut","2026-11-12T10:41 [ERR] svc=worker db request 4338 timeout ","2026-11-12T10:35 [WARN] svc=cron auth request 6148 timeut","2026-11-12T10:53 [WARN] svc=api db request 3991 timed out","2026-11-12T10:58 [INFO] svc=worker db request 1716 timed out","2026-11-12T10:17 [DEBUG] svc=cron auth request 7837 timeout ","2026-11-12T10:40 [DEBUG] svc=api dbx request 5984 ok","2026-11-12T10:33 [INFO] svc=cron dbx request 252 ok","2026-11-12T10:17 [ERRR] svc=cron auth request 5256 timed out","2026-11-12T10:12 [INFO] svc=api auth request 7988 timeoooout","2026-11-12T10:19 [DEBUG] svc=cron dbx request 7034 timeoooout","2026-11-12T10:49 [ERRR] svc=cron http request 1542 timeout","2026-11-12T10:14 [ERROR] svc=worker db request 626 timeut","2026-11-12T10:37 [DEBUG] svc=api db pool request 2522 retry","2026-11-12T10:29 [ERR] svc=worker db pool request 8093 timeout ","2026-11-12T10:38 [ERR] svc=api db pool request 5872 timeout ","2026-11-12T10:46 [ERROR] svc=api auth request 7962 retry","2026-11-12T10:14 [WARN] svc=cron auth request 4067 timeout ","2026-11-12T10:58 [ERRR] svc=worker dbx request 5288 timeout ","2026-11-12T10:42 [ERRR] svc=api http request 489 timeoooout","2026-11-12T10:51 [ERROR] svc=api db pool request 1022 timed out","2026-11-12T10:48 [ERR] svc=cron dbx request 7213 retry","2026-11-12T10:58 [ERR] svc=cron db pool request 7941 timeut","2026-11-12T10:40 [ERROR] svc=cron db request 325 ok","2026-11-12T10:07 [INFO] svc=cron db request 4445 timeout","2026-11-12T10:55 [ERROR] svc=worker auth request 7878 retry","2026-11-12T10:22 [WARN] svc=cron db pool request 259 retry","2026-11-12T10:24 [DEBUG] svc=worker http request 1516 timeout","2026-11-12T10:35 [ERR] svc=worker db pool request 2773 timeoooout","2026-11-12T10:05 [WARN] svc=api http request 8444 timeout","2026-11-12T10:29 [DEBUG] svc=api dbx request 6791 timeut","2026-11-12T10:00 [INFO] svc=api dbx request 8200 ok","2026-11-12T10:12 [ERROR] svc=api dbx request 168 timeoooout","2026-11-12T10:18 [ERROR] svc=worker db request 773 timeout","2026-11-12T10:53 [INFO] svc=worker auth request 8048 timeoooout","2026-11-12T10:03 [WARN] svc=cron dbx request 3534 timed out","2026-11-12T10:18 [INFO] svc=worker cache request 4892 timeout ","2026-11-12T10:28 [ERR] svc=worker db pool request 5626 timed out","2026-11-12T10:45 [DEBUG] svc=worker db request 1430 timeout ","2026-11-12T10:18 [ERROR] svc=cron db request 4036 retry"]}];
