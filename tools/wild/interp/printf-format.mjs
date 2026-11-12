// style: printf-style formatter (format string scanned character by character on every call: flags, width, precision, conversion switch)
// residue: %-12s\|
// A C-like sprintf supporting %d %i %u %f %e %x %X %o %s %c %% with the
// flags - + space 0 #, a width and a precision (either may be *). The format,
// one line of a fixed-width report, is fixed; every call formats each input
// row with it.
const FORMAT = "%-12s|%6d|%+9.2f|%08.3e|%#6x|%5.1s|%c|%*d%%|%-6u|%.3d\n";

function pad(s, width, left, zero) {
  if (s.length >= width) return s;
  if (left) return s + " ".repeat(width - s.length);
  if (zero) {
    const signed = s[0] === "-" || s[0] === "+" || s[0] === " ";
    const prefixLen = signed ? 1 : (s[0] === "0" && (s[1] === "x" || s[1] === "X") ? 2 : 0);
    return s.slice(0, prefixLen) + "0".repeat(width - s.length) + s.slice(prefixLen);
  }
  return " ".repeat(width - s.length) + s;
}

function signOf(negative, plus, space) {
  if (negative) return "-";
  if (plus) return "+";
  if (space) return " ";
  return "";
}

function expString(x, precision) {
  // C's %e: mantissa with `precision` digits, exponent with at least two digits
  const s = x.toExponential(precision);
  const e = s.indexOf("e");
  const mantissa = s.slice(0, e);
  const expSign = s[e + 1];
  let digits = s.slice(e + 2);
  if (digits.length < 2) digits = "0" + digits;
  return mantissa + "e" + expSign + digits;
}

function sprintf(fmt, args) {
  let out = "";
  let argi = 0;
  let i = 0;
  while (i < fmt.length) {
    const ch = fmt[i++];
    if (ch !== "%") {
      out += ch;
      continue;
    }
    let left = false, plus = false, space = false, zero = false, alt = false;
    for (;;) {
      const f = fmt[i];
      if (f === "-") left = true;
      else if (f === "+") plus = true;
      else if (f === " ") space = true;
      else if (f === "0") zero = true;
      else if (f === "#") alt = true;
      else break;
      i++;
    }
    let width = 0;
    if (fmt[i] === "*") {
      width = Number(args[argi++]) | 0;
      if (width < 0) { left = true; width = -width; }
      i++;
    } else {
      while (fmt[i] >= "0" && fmt[i] <= "9") width = width * 10 + (fmt.charCodeAt(i++) - 48);
    }
    let precision = -1;
    if (fmt[i] === ".") {
      i++;
      precision = 0;
      if (fmt[i] === "*") {
        precision = Number(args[argi++]) | 0;
        i++;
      } else {
        while (fmt[i] >= "0" && fmt[i] <= "9") precision = precision * 10 + (fmt.charCodeAt(i++) - 48);
      }
    }
    const conv = fmt[i++];
    let body;
    switch (conv) {
      case "%":
        out += "%";
        continue;
      case "d":
      case "i": {
        const n = Math.trunc(Number(args[argi++]));
        let digits = String(Math.abs(n));
        if (precision >= 0) {
          if (precision === 0 && n === 0) digits = "";
          while (digits.length < precision) digits = "0" + digits;
        }
        body = signOf(n < 0, plus, space) + digits;
        if (precision >= 0) zero = false;
        break;
      }
      case "u": {
        const n = Number(args[argi++]) >>> 0;
        body = String(n);
        break;
      }
      case "x":
      case "X":
      case "o": {
        const n = Number(args[argi++]) >>> 0;
        let digits = n.toString(conv === "o" ? 8 : 16);
        if (conv === "X") digits = digits.toUpperCase();
        if (precision >= 0) while (digits.length < precision) digits = "0" + digits;
        if (alt && n !== 0) digits = (conv === "o" ? "0" : conv === "x" ? "0x" : "0X") + digits;
        body = digits;
        break;
      }
      case "f": {
        const x = Number(args[argi++]);
        const p = precision < 0 ? 6 : precision;
        if (!isFinite(x)) { body = signOf(x < 0, plus, space) + (x !== x ? "nan" : "inf"); zero = false; break; }
        body = signOf(x < 0 || Object.is(x, -0), plus, space) + Math.abs(x).toFixed(p);
        break;
      }
      case "e": {
        const x = Number(args[argi++]);
        const p = precision < 0 ? 6 : precision;
        if (!isFinite(x)) { body = signOf(x < 0, plus, space) + (x !== x ? "nan" : "inf"); zero = false; break; }
        body = signOf(x < 0, plus, space) + expString(Math.abs(x), p);
        break;
      }
      case "s": {
        let s = String(args[argi++]);
        if (precision >= 0) s = s.slice(0, precision);
        body = s;
        zero = false;
        break;
      }
      case "c": {
        const a = args[argi++];
        body = typeof a === "number" ? String.fromCharCode(a) : String(a).charAt(0);
        zero = false;
        break;
      }
      default:
        throw new Error("sprintf: bad conversion %" + conv);
    }
    out += pad(body, width, left, zero && !left);
  }
  return out;
}

export function main(input) {
  let out = "";
  for (const row of input) out += sprintf(FORMAT, row);
  return out;
}

export const inputs = [[],[["",0,0,0,0,"","x",0,0,0,0]],[["negative",-42,-0.005,1.5e-7,255,"hello",99,-6,7,-1,5]],[["big",2147483647,1e+21,123456789,4294967295,"q","",3,100,4294967296,0]],[["widget",4212,-739.6187782287598,868150.5024433136,28043,"Z","b",8,4,2619323849,9279],["nut",2231,-489.96949195861816,519385.6954574585,68057,"xyzzy",66,3,14,3603791833,8595],["widget",2757,-554.5718669891357,664693.9814090729,52127,"Z",66,4,55,1264156339,7417],["",-166,105.81785440444946,264255.8813095093,42417,"Z","b",1,84,3038882255,1910],["",1857,-691.5194988250732,915891.7963504791,3023,"ABC","A",7,1,2299728497,1881],["widget",1763,-93.5598611831665,932151.734828949,2586,"Z","A",3,93,1466716764,9431],["widget",510,-575.5187273025513,819324.2251873016,6440,"xyzzy","A",3,55,2501002311,6871],["widget",1181,374.2334842681885,39712.54825592041,29275,"Z","b",7,96,3687263489,472]],[["widget",4210,-608.1833839416504,532356.0535907745,63383,"xyzzy","b",2,58,658535001,9768],["",1150,374.2341995239258,687517.6429748535,16045,"Z","A",1,16,1365188954,3848],["",1532,-337.74709701538086,244522.3331451416,25805,"Z",66,6,39,2937661170,6995],["",1081,-737.3843193054199,611266.4043903351,75,"xyzzy","b",1,63,642212865,5206],["gizmo-deluxe-extra",4394,-700.3200054168701,322006.37459754944,24891,"Z","A",7,74,2314853190,6550],["widget",3558,345.6158638000488,808604.4788360596,39961,"Z","A",7,54,434742448,5029],["gizmo-deluxe-extra",3920,553.3323287963867,689088.3445739746,27244,"Z","A",4,22,1693303702,169],["gizmo-deluxe-extra",811,701.5443444252014,58375.95462799072,61140,"Z",66,6,22,2961563229,2129],["widget",4695,-727.7727127075195,816129.2374134064,26315,"ABC","A",2,14,1602363942,753],["gizmo-deluxe-extra",-207,555.3763508796692,454097.7478027344,29434,"xyzzy","A",3,19,2300384163,5430],["gizmo-deluxe-extra",81,21.760523319244385,110987.78247833252,68152,"ABC","b",7,57,2657447337,5956],["",299,-556.5187335014343,226543.24769973755,34193,"xyzzy",66,6,51,2557997703,6362],["widget",686,-874.2157220840454,130792.11115837097,41230,"ABC","A",6,67,1109732625,1817],["widget",427,-46.37056589126587,309861.30237579346,507,"ABC",66,1,0,684644445,3437],["nut",1667,-983.1118583679199,875365.5217587948,14575,"xyzzy","b",6,92,1175312517,6092],["",4578,600.6803512573242,992211.8186950684,13943,"xyzzy","A",2,31,2435314416,3503],["",2430,470.8876609802246,787040.4720306396,22247,"xyzzy","A",1,43,246156451,9348],["gizmo-deluxe-extra",4214,-948.8976001739502,632071.4019238949,66609,"xyzzy",66,1,48,3679999829,422],["widget",351,936.4321827888489,308066.36810302734,47144,"xyzzy","b",2,44,2037774561,9906],["nut",4494,691.3022994995117,700639.2478942871,20768,"ABC","A",1,15,2325736522,1561],["gizmo-deluxe-extra",205,193.45813989639282,822511.7921829224,60630,"xyzzy","b",7,2,1665089233,6969],["",2889,250.0917911529541,593326.210975647,4880,"Z","b",5,72,1279623029,8104],["nut",3004,538.7983322143555,289563.6558532715,44242,"ABC","b",6,10,902160284,5078],["nut",3718,321.49791717529297,919347.2862243652,55858,"xyzzy","A",1,65,1050138948,2693],["gizmo-deluxe-extra",3361,-311.2914562225342,710097.4321365356,55862,"xyzzy","b",8,96,1929878710,8406],["gizmo-deluxe-extra",2637,91.05706214904785,623199.1052627563,22947,"ABC","b",2,69,983760831,3665],["widget",3098,-834.1140747070312,745866.8053150177,28320,"Z",66,3,17,2761825203,1310],["widget",500,539.3590331077576,281440.8540725708,2443,"xyzzy",66,8,30,899131772,2171],["gizmo-deluxe-extra",2031,-459.91718769073486,472879.5886039734,5167,"xyzzy","A",7,86,3589304924,6499],["nut",3671,297.4371910095215,854497.6711273193,63420,"ABC","A",4,72,2609499930,137],["nut",2579,174.05271530151367,884438.2762908936,10397,"xyzzy",66,1,82,3243183136,2219],["",-366,-652.3496583104134,991964.6978378296,39611,"xyzzy","A",4,42,3171779155,306],["gizmo-deluxe-extra",1200,-596.1365699768066,964298.0396747589,35330,"Z",66,3,23,171141263,2469],["widget",4390,-479.88271713256836,416099.78675842285,9042,"xyzzy","A",3,69,110492703,4655],["nut",2575,920.3681945800781,366127.01416015625,51245,"xyzzy","A",2,10,643351433,2862],["nut",1232,304.64911460876465,673267.7221298218,23568,"ABC","b",7,69,912282464,4894],["widget",198,-534.9403619766235,196494.54951286316,66280,"ABC","b",2,80,1955319880,5049],["",1399,914.9990081787109,842549.3240356445,51645,"ABC","A",5,71,2202303885,1950],["nut",1493,779.5956134796143,704946.6371536255,736,"ABC","A",6,6,1805091975,8446],["gizmo-deluxe-extra",4669,-64.26072120666504,746880.8889389038,10026,"xyzzy","b",6,26,2349232672,3548]]];
