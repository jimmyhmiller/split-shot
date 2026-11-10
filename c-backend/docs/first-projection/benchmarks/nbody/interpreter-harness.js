function main(input) {
// A deliberately small executable JS target: function/var/if/while/return,
// primitive operators, arrays, indexing and calls. Guest functions are DATA.
// No eval, Function, host callbacks, native new/this, for or switch.
// Plain records and the numeric Math.PI/Math.sqrt primitives are allowed.
function frame(env, depth) {
  var i = 0;
  while (i < depth) { env = env[0]; i = i + 1; }
  return env;
}
function lookup(env, depth, slot) { return frame(env, depth)[1][slot]; }
function store(env, depth, slot, value) { frame(env, depth)[1][slot] = value; return value; }
function scope(env, count) {
  var values = [];
  var i = 0;
  while (i < count) { values[i] = undefined; i = i + 1; }
  return [env, values, env[2]];
}
function nextIteration(env) {
  var values = [];
  var i = 0;
  while (i < env[1].length) { values[i] = env[1][i]; i = i + 1; }
  return [env[0], values, env[2]];
}
function invoke(program, closure, args, receiver) {
  var fn = closure[0];
  var values = [];
  var i = 0;
  while (i < fn[1]) {
    values[i] = undefined;
    i = i + 1;
  }
  if (closure[3]) receiver = closure[1][2];
  var env = [closure[1], values, receiver];
  var code = [closure[2], fn];
  i = 0;
  while (i < fn[0]) {
    values[i] = args[i];
    i = i + 1;
  }
  var completion = exec(program, fn[3], env, code);
  if (completion[0] === 1) return completion[1];
  return undefined;
}
function binary(op, left, right) {
  if (op === "+") return left + right;
  if (op === "-") return left - right;
  if (op === "*") return left * right;
  if (op === "/") return left / right;
  if (op === "%") return left % right;
  if (op === "**") return left ** right;
  if (op === "===") return left === right;
  if (op === "!==") return left !== right;
  if (op === "==") return left == right;
  if (op === "!=") return left != right;
  if (op === "<") return left < right;
  if (op === "<=") return left <= right;
  if (op === ">") return left > right;
  if (op === ">=") return left >= right;
  if (op === "|") return left | right;
  if (op === "&") return left & right;
  if (op === "^") return left ^ right;
  if (op === "<<") return left << right;
  if (op === ">>") return left >> right;
  return left >>> right;
}
function expression(program, node, env, code) {
  var tag = node[0];
  if (tag === "lit") return node[1];
  if (tag === "undefined") return undefined;
  if (tag === "var") return lookup(env, node[1], node[2]);
  if (tag === "this") return env[2];
  if (tag === "mathconst") return 3.141592653589793;
  if (tag === "mathcall") return Math.sqrt(expression(program, node[2][0], env, code));
  if (tag === "decl") {
    var declarationCode = frame(code, node[1]);
    return [declarationCode[1][2][node[2]][1], frame(env, node[1]), declarationCode, false];
  }
  if (tag === "global") {
    var g = 0;
    while (g < program.length) {
      if (program[g][0] === node[1]) return [program[g][1], null, null, false];
      g = g + 1;
    }
  }
  if (tag === "bin") {
    var left = expression(program, node[2], env, code);
    if (node[1] === "&&") {
      if (left) return expression(program, node[3], env, code);
      return left;
    }
    if (node[1] === "||") {
      if (left) return left;
      return expression(program, node[3], env, code);
    }
    if (node[1] === "??") {
      if (left === null || left === undefined) return expression(program, node[3], env, code);
      return left;
    }
    return binary(node[1], left, expression(program, node[3], env, code));
  }
  if (tag === "unary") {
    var operand = expression(program, node[2], env, code);
    if (node[1] === "!") return !operand;
    if (node[1] === "-") return -operand;
    if (node[1] === "+") return +operand;
    if (node[1] === "~") return ~operand;
    if (node[1] === "void") return undefined;
    return typeof operand;
  }
  if (tag === "cond") {
    if (expression(program, node[1], env, code)) return expression(program, node[2], env, code);
    return expression(program, node[3], env, code);
  }
  if (tag === "array") {
    var array = [];
    var i = 0;
    while (i < node[1].length) {
      array[i] = expression(program, node[1][i], env, code);
      i = i + 1;
    }
    return array;
  }
  if (tag === "get") {
    var base = expression(program, node[1], env, code);
    var property = expression(program, node[2], env, code);
    if (property === "length") return base.length;
    return base[property];
  }
  if (tag === "assign") {
    // Resolve the LHS before evaluating the RHS, as JavaScript does.
    var receiver = null;
    var key = null;
    if (node[2][0] === "get") {
      receiver = expression(program, node[2][1], env, code);
      key = expression(program, node[2][2], env, code);
    }
    var old = undefined;
    if (node[1] !== "=") {
      if (node[2][0] === "get") old = receiver[key];
      else old = lookup(env, node[2][1], node[2][2]);
    }
    var value = expression(program, node[3], env, code);
    if (node[1] !== "=") value = binary(node[1], old, value);
    if (node[2][0] === "get") receiver[key] = value;
    else store(env, node[2][1], node[2][2], value);
    return value;
  }
  if (tag === "update") {
    var previous = +lookup(env, node[2], node[3]);
    var next = previous + node[1];
    store(env, node[2], node[3], next);
    if (node[4]) return next;
    return previous;
  }
  if (tag === "fun") return [node[1], env, code, node[2]];
  if (tag === "call" || tag === "new") {
    var callee = expression(program, node[1], env, code);
    var args = [];
    var j = 0;
    while (j < node[2].length) {
      args[j] = expression(program, node[2][j], env, code);
      j = j + 1;
    }
    if (tag === "new") {
      var instance = {};
      var constructed = invoke(program, callee, args, instance);
      if (constructed !== null && (typeof constructed === "object" || typeof constructed === "function")) return constructed;
      return instance;
    }
    return invoke(program, callee, args, undefined);
  }
  var result = undefined;
  var k = 0;
  while (k < node[1].length) {
    result = expression(program, node[1][k], env, code);
    k = k + 1;
  }
  return result;
}
function exec(program, node, env, code) {
  var tag = node[0];
  if (tag === "empty") return [0, undefined];
  if (tag === "expr") {
    expression(program, node[1], env, code);
    return [0, undefined];
  }
  if (tag === "var") {
    var i = 0;
    while (i < node[1].length) {
      if (node[1][i][2] !== null) store(env, node[1][i][0], node[1][i][1], expression(program, node[1][i][2], env, code));
      i = i + 1;
    }
    return [0, undefined];
  }
  if (tag === "return") return [1, expression(program, node[1], env, code)];
  if (tag === "break") return [2, undefined];
  if (tag === "continue") return [3, undefined];
  if (tag === "if") {
    if (expression(program, node[1], env, code)) return exec(program, node[2], env, code);
    return exec(program, node[3], env, code);
  }
  if (tag === "while" || tag === "for") {
    if (tag === "for") {
      if (node[5] > 0) { env = scope(env, node[5]); code = [code, null]; }
      exec(program, node[3], env, code);
      // JS creates a distinct first per-iteration binding as well as the
      // copies between iterations (closures in initializers keep the old one).
      if (node[5] > 0) env = nextIteration(env);
    }
    while (expression(program, node[1], env, code)) {
      // Explicitly expose the mutable store to the PE's loop analysis. The
      // identity write is internal, never a guest-visible property operation.
      env[1] = env[1];
      var step = exec(program, node[2], env, code);
      if (step[0] === 1) return step;
      if (step[0] === 2) return [0, undefined];
      if (tag === "for") {
        if (node[5] > 0) env = nextIteration(env);
        expression(program, node[4], env, code);
      }
    }
    return [0, undefined];
  }
  if (node[2] > 0) { env = scope(env, node[2]); code = [code, null]; }
  var j = 0;
  while (j < node[1].length) {
    var completion = exec(program, node[1][j], env, code);
    if (completion[0] !== 0) return completion;
    j = j + 1;
  }
  return [0, undefined];
}
function interpret(program, input) {
  var i = 0;
  while (i < program.length) {
    if (program[i][0] === "main") return invoke(program, [program[i][1], null, null, false], [input], undefined);
    i = i + 1;
  }
}

return interpret([["main",[1,15,[[1,[7,7,[],["block",[["expr",["assign","=",["get",["this","@syntax0"],["lit","x","@syntax1"],"@syntax2"],["var",0,0,"@syntax3"],"@syntax4"],"@syntax5"],["expr",["assign","=",["get",["this","@syntax6"],["lit","y","@syntax7"],"@syntax8"],["var",0,1,"@syntax9"],"@syntax10"],"@syntax11"],["expr",["assign","=",["get",["this","@syntax12"],["lit","z","@syntax13"],"@syntax14"],["var",0,2,"@syntax15"],"@syntax16"],"@syntax17"],["expr",["assign","=",["get",["this","@syntax18"],["lit","vx","@syntax19"],"@syntax20"],["var",0,3,"@syntax21"],"@syntax22"],"@syntax23"],["expr",["assign","=",["get",["this","@syntax24"],["lit","vy","@syntax25"],"@syntax26"],["var",0,4,"@syntax27"],"@syntax28"],"@syntax29"],["expr",["assign","=",["get",["this","@syntax30"],["lit","vz","@syntax31"],"@syntax32"],["var",0,5,"@syntax33"],"@syntax34"],"@syntax35"],["expr",["assign","=",["get",["this","@syntax36"],["lit","mass","@syntax37"],"@syntax38"],["var",0,6,"@syntax39"],"@syntax40"],"@syntax41"]],0,"@syntax42"]]],[2,[0,0,[],["block",[["return",["new",["decl",1,0,"@syntax43"],[["lit",4.841431442464721,"@syntax44"],["unary","-",["lit",1.1603200440274284,"@syntax45"],"@syntax46"],["unary","-",["lit",0.10362204447112311,"@syntax47"],"@syntax48"],["bin","*",["lit",0.001660076642744037,"@syntax49"],["var",1,13,"@syntax50"],"@syntax51"],["bin","*",["lit",0.007699011184197404,"@syntax52"],["var",1,13,"@syntax53"],"@syntax54"],["bin","*",["unary","-",["lit",0.0000690460016972063,"@syntax55"],"@syntax56"],["var",1,13,"@syntax57"],"@syntax58"],["bin","*",["lit",0.0009547919384243266,"@syntax59"],["var",1,12,"@syntax60"],"@syntax61"]],"@syntax62"],"@syntax63"]],0,"@syntax64"]]],[3,[0,0,[],["block",[["return",["new",["decl",1,0,"@syntax65"],[["lit",8.34336671824458,"@syntax66"],["lit",4.124798564124305,"@syntax67"],["unary","-",["lit",0.4035234171143214,"@syntax68"],"@syntax69"],["bin","*",["unary","-",["lit",0.002767425107268624,"@syntax70"],"@syntax71"],["var",1,13,"@syntax72"],"@syntax73"],["bin","*",["lit",0.004998528012349172,"@syntax74"],["var",1,13,"@syntax75"],"@syntax76"],["bin","*",["lit",0.000023041729757376393,"@syntax77"],["var",1,13,"@syntax78"],"@syntax79"],["bin","*",["lit",0.0002858859806661308,"@syntax80"],["var",1,12,"@syntax81"],"@syntax82"]],"@syntax83"],"@syntax84"]],0,"@syntax85"]]],[4,[0,0,[],["block",[["return",["new",["decl",1,0,"@syntax86"],[["lit",12.894369562139131,"@syntax87"],["unary","-",["lit",15.111151401698631,"@syntax88"],"@syntax89"],["unary","-",["lit",0.22330757889265573,"@syntax90"],"@syntax91"],["bin","*",["lit",0.002964601375647616,"@syntax92"],["var",1,13,"@syntax93"],"@syntax94"],["bin","*",["lit",0.0023784717395948095,"@syntax95"],["var",1,13,"@syntax96"],"@syntax97"],["bin","*",["unary","-",["lit",0.000029658956854023756,"@syntax98"],"@syntax99"],["var",1,13,"@syntax100"],"@syntax101"],["bin","*",["lit",0.00004366244043351563,"@syntax102"],["var",1,12,"@syntax103"],"@syntax104"]],"@syntax105"],"@syntax106"]],0,"@syntax107"]]],[5,[0,0,[],["block",[["return",["new",["decl",1,0,"@syntax108"],[["lit",15.379697114850917,"@syntax109"],["unary","-",["lit",25.919314609987964,"@syntax110"],"@syntax111"],["lit",0.17925877295037118,"@syntax112"],["bin","*",["lit",0.0026806777249038932,"@syntax113"],["var",1,13,"@syntax114"],"@syntax115"],["bin","*",["lit",0.001628241700382423,"@syntax116"],["var",1,13,"@syntax117"],"@syntax118"],["bin","*",["unary","-",["lit",0.00009515922545197159,"@syntax119"],"@syntax120"],["var",1,13,"@syntax121"],"@syntax122"],["bin","*",["lit",0.000051513890204661145,"@syntax123"],["var",1,12,"@syntax124"],"@syntax125"]],"@syntax126"],"@syntax127"]],0,"@syntax128"]]],[6,[0,0,[],["block",[["return",["new",["decl",1,0,"@syntax129"],[["lit",0.0,"@syntax130"],["lit",0.0,"@syntax131"],["lit",0.0,"@syntax132"],["lit",0.0,"@syntax133"],["lit",0.0,"@syntax134"],["lit",0.0,"@syntax135"],["var",1,12,"@syntax136"]],"@syntax137"],"@syntax138"]],0,"@syntax139"]]],[7,[0,5,[],["block",[["var",[[0,0,["lit",0.0,"@syntax140"]]],"@syntax141"],["var",[[0,1,["lit",0.0,"@syntax142"]]],"@syntax143"],["var",[[0,2,["lit",0.0,"@syntax144"]]],"@syntax145"],["var",[[0,3,["get",["var",1,14,"@syntax146"],["lit","length","@syntax147"],"@syntax148"]]],"@syntax149"],["for",["bin","<",["var",0,0,"@syntax150"],["var",1,3,"@syntax151"],"@syntax152"],["block",[["var",[[0,0,["get",["var",3,14,"@syntax153"],["var",1,0,"@syntax154"],"@syntax155"]]],"@syntax156"],["var",[[0,1,["get",["var",0,0,"@syntax157"],["lit","mass","@syntax158"],"@syntax159"]]],"@syntax160"],["expr",["assign","+",["var",2,0,"@syntax161"],["bin","*",["get",["var",0,0,"@syntax162"],["lit","vx","@syntax163"],"@syntax164"],["var",0,1,"@syntax165"],"@syntax166"],"@syntax167"],"@syntax168"],["expr",["assign","+",["var",2,1,"@syntax169"],["bin","*",["get",["var",0,0,"@syntax170"],["lit","vy","@syntax171"],"@syntax172"],["var",0,1,"@syntax173"],"@syntax174"],"@syntax175"],"@syntax176"],["expr",["assign","+",["var",2,2,"@syntax177"],["bin","*",["get",["var",0,0,"@syntax178"],["lit","vz","@syntax179"],"@syntax180"],["var",0,1,"@syntax181"],"@syntax182"],"@syntax183"],"@syntax184"]],2,"@syntax185"],["var",[[0,0,["lit",0.0,"@syntax186"]]],"@syntax187"],["update",1,0,0,false,"@syntax188"],1,"@syntax189"],["var",[[0,4,["get",["var",1,14,"@syntax190"],["lit",0.0,"@syntax191"],"@syntax192"]]],"@syntax193"],["expr",["assign","=",["get",["var",0,4,"@syntax194"],["lit","vx","@syntax195"],"@syntax196"],["bin","/",["unary","-",["var",0,0,"@syntax197"],"@syntax198"],["var",1,12,"@syntax199"],"@syntax200"],"@syntax201"],"@syntax202"],["expr",["assign","=",["get",["var",0,4,"@syntax203"],["lit","vy","@syntax204"],"@syntax205"],["bin","/",["unary","-",["var",0,1,"@syntax206"],"@syntax207"],["var",1,12,"@syntax208"],"@syntax209"],"@syntax210"],"@syntax211"],["expr",["assign","=",["get",["var",0,4,"@syntax212"],["lit","vz","@syntax213"],"@syntax214"],["bin","/",["unary","-",["var",0,2,"@syntax215"],"@syntax216"],["var",1,12,"@syntax217"],"@syntax218"],"@syntax219"],"@syntax220"]],0,"@syntax221"]]],[8,[1,2,[],["block",[["var",[[0,1,["get",["var",1,14,"@syntax222"],["lit","length","@syntax223"],"@syntax224"]]],"@syntax225"],["for",["bin","<",["var",0,0,"@syntax226"],["var",1,1,"@syntax227"],"@syntax228"],["block",[["var",[[0,0,["get",["var",3,14,"@syntax229"],["var",1,0,"@syntax230"],"@syntax231"]]],"@syntax232"],["var",[[0,1,["get",["var",0,0,"@syntax233"],["lit","vx","@syntax234"],"@syntax235"]]],"@syntax236"],["var",[[0,2,["get",["var",0,0,"@syntax237"],["lit","vy","@syntax238"],"@syntax239"]]],"@syntax240"],["var",[[0,3,["get",["var",0,0,"@syntax241"],["lit","vz","@syntax242"],"@syntax243"]]],"@syntax244"],["for",["bin","<",["var",0,0,"@syntax245"],["var",3,1,"@syntax246"],"@syntax247"],["block",[["var",[[0,0,["get",["var",5,14,"@syntax248"],["var",1,0,"@syntax249"],"@syntax250"]]],"@syntax251"],["var",[[0,1,["bin","-",["get",["var",2,0,"@syntax252"],["lit","x","@syntax253"],"@syntax254"],["get",["var",0,0,"@syntax255"],["lit","x","@syntax256"],"@syntax257"],"@syntax258"]]],"@syntax259"],["var",[[0,2,["bin","-",["get",["var",2,0,"@syntax260"],["lit","y","@syntax261"],"@syntax262"],["get",["var",0,0,"@syntax263"],["lit","y","@syntax264"],"@syntax265"],"@syntax266"]]],"@syntax267"],["var",[[0,3,["bin","-",["get",["var",2,0,"@syntax268"],["lit","z","@syntax269"],"@syntax270"],["get",["var",0,0,"@syntax271"],["lit","z","@syntax272"],"@syntax273"],"@syntax274"]]],"@syntax275"],["var",[[0,4,["bin","+",["bin","+",["bin","*",["var",0,1,"@syntax276"],["var",0,1,"@syntax277"],"@syntax278"],["bin","*",["var",0,2,"@syntax279"],["var",0,2,"@syntax280"],"@syntax281"],"@syntax282"],["bin","*",["var",0,3,"@syntax283"],["var",0,3,"@syntax284"],"@syntax285"],"@syntax286"]]],"@syntax287"],["var",[[0,5,["bin","/",["var",4,0,"@syntax288"],["bin","*",["var",0,4,"@syntax289"],["mathcall","sqrt",[["var",0,4,"@syntax290"]],"@syntax291"],"@syntax292"],"@syntax293"]]],"@syntax294"],["var",[[0,6,["get",["var",0,0,"@syntax295"],["lit","mass","@syntax296"],"@syntax297"]]],"@syntax298"],["expr",["assign","-",["var",2,1,"@syntax299"],["bin","*",["bin","*",["var",0,1,"@syntax300"],["var",0,6,"@syntax301"],"@syntax302"],["var",0,5,"@syntax303"],"@syntax304"],"@syntax305"],"@syntax306"],["expr",["assign","-",["var",2,2,"@syntax307"],["bin","*",["bin","*",["var",0,2,"@syntax308"],["var",0,6,"@syntax309"],"@syntax310"],["var",0,5,"@syntax311"],"@syntax312"],"@syntax313"],"@syntax314"],["expr",["assign","-",["var",2,3,"@syntax315"],["bin","*",["bin","*",["var",0,3,"@syntax316"],["var",0,6,"@syntax317"],"@syntax318"],["var",0,5,"@syntax319"],"@syntax320"],"@syntax321"],"@syntax322"],["var",[[0,7,["get",["var",2,0,"@syntax323"],["lit","mass","@syntax324"],"@syntax325"]]],"@syntax326"],["expr",["assign","+",["get",["var",0,0,"@syntax327"],["lit","vx","@syntax328"],"@syntax329"],["bin","*",["bin","*",["var",0,1,"@syntax330"],["var",0,7,"@syntax331"],"@syntax332"],["var",0,5,"@syntax333"],"@syntax334"],"@syntax335"],"@syntax336"],["expr",["assign","+",["get",["var",0,0,"@syntax337"],["lit","vy","@syntax338"],"@syntax339"],["bin","*",["bin","*",["var",0,2,"@syntax340"],["var",0,7,"@syntax341"],"@syntax342"],["var",0,5,"@syntax343"],"@syntax344"],"@syntax345"],"@syntax346"],["expr",["assign","+",["get",["var",0,0,"@syntax347"],["lit","vz","@syntax348"],"@syntax349"],["bin","*",["bin","*",["var",0,3,"@syntax350"],["var",0,7,"@syntax351"],"@syntax352"],["var",0,5,"@syntax353"],"@syntax354"],"@syntax355"],"@syntax356"]],8,"@syntax357"],["var",[[0,0,["bin","+",["var",2,0,"@syntax358"],["lit",1.0,"@syntax359"],"@syntax360"]]],"@syntax361"],["update",1,0,0,false,"@syntax362"],1,"@syntax363"],["expr",["assign","=",["get",["var",0,0,"@syntax364"],["lit","vx","@syntax365"],"@syntax366"],["var",0,1,"@syntax367"],"@syntax368"],"@syntax369"],["expr",["assign","=",["get",["var",0,0,"@syntax370"],["lit","vy","@syntax371"],"@syntax372"],["var",0,2,"@syntax373"],"@syntax374"],"@syntax375"],["expr",["assign","=",["get",["var",0,0,"@syntax376"],["lit","vz","@syntax377"],"@syntax378"],["var",0,3,"@syntax379"],"@syntax380"],"@syntax381"]],4,"@syntax382"],["var",[[0,0,["lit",0.0,"@syntax383"]]],"@syntax384"],["update",1,0,0,false,"@syntax385"],1,"@syntax386"],["for",["bin","<",["var",0,0,"@syntax387"],["var",1,1,"@syntax388"],"@syntax389"],["block",[["var",[[0,0,["get",["var",3,14,"@syntax390"],["var",1,0,"@syntax391"],"@syntax392"]]],"@syntax393"],["expr",["assign","+",["get",["var",0,0,"@syntax394"],["lit","x","@syntax395"],"@syntax396"],["bin","*",["var",2,0,"@syntax397"],["get",["var",0,0,"@syntax398"],["lit","vx","@syntax399"],"@syntax400"],"@syntax401"],"@syntax402"],"@syntax403"],["expr",["assign","+",["get",["var",0,0,"@syntax404"],["lit","y","@syntax405"],"@syntax406"],["bin","*",["var",2,0,"@syntax407"],["get",["var",0,0,"@syntax408"],["lit","vy","@syntax409"],"@syntax410"],"@syntax411"],"@syntax412"],"@syntax413"],["expr",["assign","+",["get",["var",0,0,"@syntax414"],["lit","z","@syntax415"],"@syntax416"],["bin","*",["var",2,0,"@syntax417"],["get",["var",0,0,"@syntax418"],["lit","vz","@syntax419"],"@syntax420"],"@syntax421"],"@syntax422"],"@syntax423"]],1,"@syntax424"],["var",[[0,0,["lit",0.0,"@syntax425"]]],"@syntax426"],["update",1,0,0,false,"@syntax427"],1,"@syntax428"]],0,"@syntax429"]]],[9,[0,2,[],["block",[["var",[[0,0,["lit",0.0,"@syntax430"]]],"@syntax431"],["var",[[0,1,["get",["var",1,14,"@syntax432"],["lit","length","@syntax433"],"@syntax434"]]],"@syntax435"],["for",["bin","<",["var",0,0,"@syntax436"],["var",1,1,"@syntax437"],"@syntax438"],["block",[["var",[[0,0,["get",["var",3,14,"@syntax439"],["var",1,0,"@syntax440"],"@syntax441"]]],"@syntax442"],["expr",["assign","+",["var",2,0,"@syntax443"],["bin","*",["bin","*",["lit",0.5,"@syntax444"],["get",["var",0,0,"@syntax445"],["lit","mass","@syntax446"],"@syntax447"],"@syntax448"],["bin","+",["bin","+",["bin","*",["get",["var",0,0,"@syntax449"],["lit","vx","@syntax450"],"@syntax451"],["get",["var",0,0,"@syntax452"],["lit","vx","@syntax453"],"@syntax454"],"@syntax455"],["bin","*",["get",["var",0,0,"@syntax456"],["lit","vy","@syntax457"],"@syntax458"],["get",["var",0,0,"@syntax459"],["lit","vy","@syntax460"],"@syntax461"],"@syntax462"],"@syntax463"],["bin","*",["get",["var",0,0,"@syntax464"],["lit","vz","@syntax465"],"@syntax466"],["get",["var",0,0,"@syntax467"],["lit","vz","@syntax468"],"@syntax469"],"@syntax470"],"@syntax471"],"@syntax472"],"@syntax473"],"@syntax474"],["for",["bin","<",["var",0,0,"@syntax475"],["var",3,1,"@syntax476"],"@syntax477"],["block",[["var",[[0,0,["get",["var",5,14,"@syntax478"],["var",1,0,"@syntax479"],"@syntax480"]]],"@syntax481"],["var",[[0,1,["bin","-",["get",["var",2,0,"@syntax482"],["lit","x","@syntax483"],"@syntax484"],["get",["var",0,0,"@syntax485"],["lit","x","@syntax486"],"@syntax487"],"@syntax488"]]],"@syntax489"],["var",[[0,2,["bin","-",["get",["var",2,0,"@syntax490"],["lit","y","@syntax491"],"@syntax492"],["get",["var",0,0,"@syntax493"],["lit","y","@syntax494"],"@syntax495"],"@syntax496"]]],"@syntax497"],["var",[[0,3,["bin","-",["get",["var",2,0,"@syntax498"],["lit","z","@syntax499"],"@syntax500"],["get",["var",0,0,"@syntax501"],["lit","z","@syntax502"],"@syntax503"],"@syntax504"]]],"@syntax505"],["var",[[0,4,["mathcall","sqrt",[["bin","+",["bin","+",["bin","*",["var",0,1,"@syntax506"],["var",0,1,"@syntax507"],"@syntax508"],["bin","*",["var",0,2,"@syntax509"],["var",0,2,"@syntax510"],"@syntax511"],"@syntax512"],["bin","*",["var",0,3,"@syntax513"],["var",0,3,"@syntax514"],"@syntax515"],"@syntax516"]],"@syntax517"]]],"@syntax518"],["expr",["assign","-",["var",4,0,"@syntax519"],["bin","/",["bin","*",["get",["var",2,0,"@syntax520"],["lit","mass","@syntax521"],"@syntax522"],["get",["var",0,0,"@syntax523"],["lit","mass","@syntax524"],"@syntax525"],"@syntax526"],["var",0,4,"@syntax527"],"@syntax528"],"@syntax529"],"@syntax530"]],5,"@syntax531"],["var",[[0,0,["bin","+",["var",2,0,"@syntax532"],["lit",1.0,"@syntax533"],"@syntax534"]]],"@syntax535"],["update",1,0,0,false,"@syntax536"],1,"@syntax537"]],1,"@syntax538"],["var",[[0,0,["lit",0.0,"@syntax539"]]],"@syntax540"],["update",1,0,0,false,"@syntax541"],1,"@syntax542"],["return",["var",0,0,"@syntax543"],"@syntax544"]],0,"@syntax545"]]],[10,[0,1,[],["block",[["var",[[0,0,["lit",400000.0,"@syntax546"]]],"@syntax547"],["expr",["call",["decl",1,6,"@syntax548"],[],"@syntax549"],"@syntax550"],["for",["bin","<",["var",0,0,"@syntax551"],["var",1,0,"@syntax552"],"@syntax553"],["block",[["expr",["call",["decl",2,7,"@syntax554"],[["lit",0.01,"@syntax555"]],"@syntax556"],"@syntax557"]],0,"@syntax558"],["var",[[0,0,["lit",0.0,"@syntax559"]]],"@syntax560"],["update",1,0,0,false,"@syntax561"],1,"@syntax562"],["return",["call",["decl",1,8,"@syntax563"],[],"@syntax564"],"@syntax565"]],0,"@syntax566"]]]],["block",[["var",[[0,11,["mathconst","PI","@syntax567"]]],"@syntax568"],["var",[[0,12,["bin","*",["bin","*",["lit",4.0,"@syntax569"],["var",0,11,"@syntax570"],"@syntax571"],["var",0,11,"@syntax572"],"@syntax573"]]],"@syntax574"],["var",[[0,13,["lit",365.24,"@syntax575"]]],"@syntax576"],["var",[[0,14,["array",[["call",["decl",0,5,"@syntax577"],[],"@syntax578"],["call",["decl",0,1,"@syntax579"],[],"@syntax580"],["call",["decl",0,2,"@syntax581"],[],"@syntax582"],["call",["decl",0,3,"@syntax583"],[],"@syntax584"],["call",["decl",0,4,"@syntax585"],[],"@syntax586"]],"@syntax587"]]],"@syntax588"],["expr",["call",["decl",0,6,"@syntax589"],[],"@syntax590"],"@syntax591"],["for",["bin","<",["var",0,0,"@syntax592"],["var",1,0,"@syntax593"],"@syntax594"],["expr",["call",["decl",1,7,"@syntax595"],[["lit",0.01,"@syntax596"]],"@syntax597"],"@syntax598"],["var",[[0,0,["lit",0.0,"@syntax599"]]],"@syntax600"],["update",1,0,0,false,"@syntax601"],1,"@syntax602"],["return",["call",["decl",0,8,"@syntax603"],[],"@syntax604"],"@syntax605"]],0,"@syntax606"]]]], input);
}
