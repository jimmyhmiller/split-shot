// style: PEG recognizer (grammar as combinator-built data, recursive parse(node, text, pos) dispatching on node.kind)
// residue: ['"](literal|set|range|sequence|choice|repeat)['"]
// demos/parser-specialization's PEG recognizer with its assignments grammar:
//   number      <- [0-9]+
//   name        <- [a-zA-Z_]+
//   assignment  <- name '=' number
//   separator   <- ';\n' / ';'
//   assignments <- assignment (separator assignment)*
// Each input string is parsed; the result is the offset parsing stopped at,
// whether the whole string is consumed, or -1 on failure.
function literal(text) {
  return { kind: "literal", text };
}

function range(first, last) {
  return { kind: "range", lo: first.charCodeAt(0), hi: last.charCodeAt(0) };
}

function characterSet(chars) {
  return { kind: "set", chars };
}

function sequence(...items) {
  return items.reduceRight((right, left) => ({ kind: "sequence", left, right }));
}

function choice(...items) {
  return items.reduceRight((right, left) => ({ kind: "choice", left, right }));
}

function zeroOrMore(item) {
  return { kind: "repeat", item, min: 0 };
}

function oneOrMore(item) {
  return { kind: "repeat", item, min: 1 };
}

// Failure is -1; success is the next UTF-16 offset.
// Ordered choice backtracks; repetition is greedy and never backtracks.
function parse(node, text, pos) {
  if (node.kind === "literal") {
    for (let i = 0; i < node.text.length; i++) {
      if (text[pos + i] !== node.text[i]) return -1;
    }
    return pos + node.text.length;
  }
  if (node.kind === "set") {
    return pos < text.length && node.chars.indexOf(text[pos]) >= 0 ? pos + 1 : -1;
  }
  if (node.kind === "range") {
    if (pos >= text.length) return -1;
    const c = text.charCodeAt(pos);
    return c >= node.lo && c <= node.hi ? pos + 1 : -1;
  }
  if (node.kind === "sequence") {
    const next = parse(node.left, text, pos);
    return next < 0 ? -1 : parse(node.right, text, next);
  }
  if (node.kind === "choice") {
    const next = parse(node.left, text, pos);
    return next >= 0 ? next : parse(node.right, text, pos);
  }
  if (node.kind === "repeat") {
    let next = pos;
    let count = 0;
    while (true) {
      const end = parse(node.item, text, next);
      if (end < 0) break;
      if (end === next) throw new Error("Nullable repetition");
      next = end;
      count++;
    }
    return count >= node.min ? next : -1;
  }
  throw new Error("Unknown grammar node");
}

const number = oneOrMore(range("0", "9"));
const name = oneOrMore(characterSet("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_"));
const separator = choice(literal(";\n"), literal(";"));
const GRAMMAR = sequence(
  name,
  literal("="),
  number,
  zeroOrMore(sequence(separator, name, literal("="), number)),
);

export function main(input) {
  return input.map((text) => {
    const end = parse(GRAMMAR, text, 0);
    return { end, complete: end === text.length };
  });
}

export const inputs = [[],[""],["a=0","name=123;B_=456","=1","a=","a=1;","a1=2","a=-1","a=1\n","é=2"],["a=1;\nb=2","a=1;\n","a=1;;b=2"],["alpha=33822","alpha=7711;Beta=40965","alpha=78039;\nBeta=57914;\n_count=7576","alpha=15712;Beta=88593;_count=84699;x=34925;","alpha=15989;\nBeta=74175;\n_count=51818;\nx=5150;\nzz_Top=21267","alpha=15568;Beta=66798;_count=5787;x=97360;zz_Top=46255;alpha=92707","alpha=37338;\nBeta=19012;\n_count=12982;\nx=68402;\nzz_Top=27101;\nalpha=39054;\nBeta=79466","alpha=52243;Beta=52530;_count=30167;x=18472;zz_Top=34216;alpha=76194;Beta=59529;_count=1237;","alpha=81725;\nBeta=9008;\n_count=27311;\nx=79328;\nzz_Top=51671;\nalpha=91013;\nBeta=55043;\n_count=94519;\nx=54436","alpha=1761;Beta=48482;_count=41355;x=64373;zz_Top=36757;alpha=45587;Beta=73083;_count=59400;x=97061;zz_Top=74220"],["alpha=40186;\nBeta=97908;\n_count=34343;\nx=80905;\nzz_Top=52431;\nalpha=44352;\nBeta=73993;\n_count=33219;\nx=75834;\nzz_Top=94432","alpha=47652;Beta=79992;_count=32659;x=75104;zz_Top=93210;alpha=51301;Beta=1423;_count=44570;x=32448;zz_Top=29220;alpha=20728","alpha=21241;Beta=18674;_count=46924;x=26137;zz_Top=29689;alpha=67841;Beta=92712;_count=91097;x=62411;zz_Top=58105;alpha=46813;Beta=9338","alpha=10536;\nBeta=67506;\n_count=55826;\nx=72359;\nzz_Top=39839;\nalpha=66381;\nBeta=69291;\n_count=11541;\nx=2505;\nzz_Top=91518;\nalpha=85526;\nBeta=78548;\n_count=23784","alpha=12849;Beta=94761;_count=84826;x=64856;zz_Top=49538;alpha=25232;Beta=75678;_count=92289;x=22158;zz_Top=24839;alpha=75879;Beta=3825;_count=83684;x=9188","alpha=94250;Beta=5053;_count=77403;x=44798;zz_Top=93873;alpha=191;Beta=65872;_count=2692;x=85144;zz_Top=4737;alpha=12041;Beta=53783;_count=39122;x=90532;zz_Top=47337","alpha=29753;\nBeta=91197;\n_count=4228;\nx=27733;\nzz_Top=19095;\nalpha=88252;\nBeta=12346;\n_count=32944;\nx=46252;\nzz_Top=63730;\nalpha=16953;\nBeta=6174;\n_count=90229;\nx=5788;\nzz_Top=86043;\nalpha=32862","alpha=5959;Beta=1659;_count=77542;x=15888;zz_Top=10114;alpha=16616;Beta=86457;_count=99649;x=19983;zz_Top=23522;alpha=73227;Beta=27682;_count=40577;x=22242;zz_Top=26549;alpha=82768;Beta=80292","alpha=36938;Beta=16526;_count=15574;x=28899;zz_Top=98777;alpha=58479;Beta=17186;_count=67974;x=53817;zz_Top=97679;alpha=19570;Beta=50979;_count=89666;x=63203;zz_Top=78878;alpha=18520;Beta=95026;_count=78792","alpha=50956;\nBeta=8921;\n_count=34576;\nx=8997;\nzz_Top=12866;\nalpha=57112;\nBeta=13139;\n_count=29619;\nx=31848;\nzz_Top=50417;\nalpha=80692;\nBeta=91425;\n_count=22317;\nx=82594;\nzz_Top=65309;\nalpha=90495;\nBeta=74144;\n_count=25214;\nx=71569","alpha=70873;Beta=22451;_count=85602;x=89180;zz_Top=28567;alpha=94869;Beta=54355;_count=3468;x=16541;zz_Top=54461;alpha=58069;Beta=86206;_count=96911;x=32568;zz_Top=12903;alpha=88110;Beta=18212;_count=50546;x=89112;zz_Top=52721","alpha=18673;Beta=82436;_count=15944;x=95807;zz_Top=37313;alpha=89436;Beta=31649;_count=14395;x=71843;zz_Top=34503;alpha=6172;Beta=61008;_count=59645;x=80039;zz_Top=14834;alpha=25768;Beta=27173;_count=60463;x=84925;zz_Top=33696;alpha=23928","alpha=78497;\nBeta=13070;\n_count=59431;\nx=12348;\nzz_Top=94409;\nalpha=47491;\nBeta=36675;\n_count=55879;\nx=16489;\nzz_Top=48039;\nalpha=81056;\nBeta=17596;\n_count=15929;\nx=94968;\nzz_Top=55391;\nalpha=10340;\nBeta=28118;\n_count=21963;\nx=37307;\nzz_Top=14944;\nalpha=38420;\nBeta=5375","alpha=93598;Beta=60561;_count=496;x=20984;zz_Top=17476;alpha=30978;Beta=48866;_count=59850;x=87871;zz_Top=35286;alpha=48598;Beta=46907;_count=4712;x=33392;zz_Top=82719;alpha=39579;Beta=3687;_count=69063;x=96233;zz_Top=42108;alpha=26390;Beta=16574;_count=39700","alpha=53273;Beta=72081;_count=19378;x=96424;zz_Top=65882;alpha=65672;Beta=39495;_count=75148;x=38017;zz_Top=86838;alpha=72709;Beta=87564;_count=79100;x=84314;zz_Top=65814;alpha=26508;Beta=41524;_count=43889;x=45030;zz_Top=25038;alpha=3462;Beta=61513;_count=32341;x=25643","alpha=74171;\nBeta=82498;\n_count=94567;\nx=39148;\nzz_Top=9865;\nalpha=13392;\nBeta=36260;\n_count=56993;\nx=60286;\nzz_Top=58086;\nalpha=61143;\nBeta=17337;\n_count=93919;\nx=89731;\nzz_Top=69583;\nalpha=20304;\nBeta=7424;\n_count=88742;\nx=99716;\nzz_Top=18658;\nalpha=7109;\nBeta=34307;\n_count=60883;\nx=44692;\nzz_Top=26784","alpha=51252;Beta=42271;_count=81903;x=24256;zz_Top=88940;alpha=86617;Beta=81355;_count=71339;x=8294;zz_Top=36440;alpha=2907;Beta=65274;_count=93089;x=19814;zz_Top=23029;alpha=78099;Beta=45463;_count=31057;x=90036;zz_Top=12110;alpha=94362;Beta=51267;_count=34573;x=33629;zz_Top=84375;alpha=19314","alpha=42044;Beta=32838;_count=4286;x=42597;zz_Top=40784;alpha=7051;Beta=59004;_count=90919;x=92157;zz_Top=52517;alpha=99330;Beta=67985;_count=47043;x=96014;zz_Top=82658;alpha=49201;Beta=29321;_count=301;x=67207;zz_Top=67501;alpha=86457;Beta=5356;_count=33099;x=52785;zz_Top=67200;alpha=78177;Beta=47169","alpha=55700;\nBeta=59015;\n_count=15169;\nx=12020;\nzz_Top=29088;\nalpha=92062;\nBeta=61630;\n_count=67291;\nx=8086;\nzz_Top=52021;\nalpha=31664;\nBeta=8160;\n_count=82895;\nx=29979;\nzz_Top=35041;\nalpha=85133;\nBeta=33822;\n_count=86540;\nx=73504;\nzz_Top=61021;\nalpha=96092;\nBeta=30804;\n_count=93297;\nx=86183;\nzz_Top=26068;\nalpha=14428;\nBeta=75376;\n_count=23667","alpha=17266;Beta=72168;_count=68212;x=4741;zz_Top=47751;alpha=28979;Beta=74728;_count=34543;x=67270;zz_Top=29732;alpha=56648;Beta=3101;_count=79830;x=69878;zz_Top=27214;alpha=91805;Beta=10840;_count=4519;x=8641;zz_Top=46894;alpha=90802;Beta=96574;_count=29925;x=82716;zz_Top=62797;alpha=72290;Beta=9261;_count=43758;x=13389"]];
