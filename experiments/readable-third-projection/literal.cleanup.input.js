// Host builtins available to jsmix2, to the programs it specializes, and to the
// residual programs it emits.
function str(v) { return JSON.stringify(v); }
function isArr(v) { return Array.isArray(v); }
function kind(v) { return v === null ? "null" : Array.isArray(v) ? "array" : typeof v; }
function fail(msg) { throw new Error(msg); }


function generatedCompiler(input) {
var _v17 = (function () {
var _v8 = (function () {
var _v5 = (((kind(input) === "array") || (kind(input) === "string")) ? S_0((input)[0]) : ((isA_1(input) && true) ? (input)[0] : D_4((((paren_3(lift_2(input)) + "[") + "0") + "]"))));
return [((((_v5)[0] === "S") && true) ? S_0(applyOp_6((_v5)[1])) : D_4((((((("(" + lift_7(_v5)) + " ") + "===") + " ") + "\"literal\"") + ")"))), [[],[],0]];
})();
if ((((_v8)[0])[0] === "S")) {
return (((_v8)[0])[1] ? evalStmts_9(input, (_v8)[1]) : evalStmts_10(input, (_v8)[1]));
} else {
var _v12 = evalStmts_11(input, (_v8)[1]);
var _v14 = evalStmts_13(input, (_v12)[1]);
return ((!(isB_15((_v12)[0])) && !(isB_15((_v14)[0]))) ? [D_4((((((("(" + lift_7((_v8)[0])) + " ? ") + lift_7((_v12)[0])) + " : ") + lift_7((_v14)[0])) + ")")), (_v14)[1]] : [["B", (((((("if (" + lift_7((_v8)[0])) + ") {\n") + body_16((_v12)[0])) + "} else {\n") + body_16((_v14)[0])) + "}\n")], (_v14)[1]]);
}
})();
var _v18 = (("function main(input) {\n" + ((((_v17)[0])[0] === "B") ? ((_v17)[0])[1] : (("return " + lift_7((_v17)[0])) + ";\n"))) + "}\n");
if (((((_v17)[1])[1]).length === 0)) {
return _v18;
} else {
var _v19 = (((_v17)[1])[1])[0];
var _v20 = ((_v17)[1])[0];
var _v21 = (((_v17)[1])[1]).slice(1);
var _v22 = ((_v17)[1])[2];
var _v24 = rebuildList_23((_v19)[2]);
var _v26 = unfold_25((_v19)[1], (_v24)[0], _v20, _v21, _v22, (_v19)[3]);
var _v29 = (((((("function " + (_v19)[0]) + "(") + joinStrs_28(paramNames_27((_v24)[1]))) + ") {\n") + body_16((_v26)[0])) + "}\n");
return specializePending_30((_v26)[1], (_v18 + _v29));
}
}
function S_0(p0) {
return ["S", p0];
}
function isA_1(p0) {
return false;
}
function lift_2(p0) {
return str(p0);
}
function paren_3(p0) {
return (("(" + p0) + ")");
}
function D_4(p0) {
return ["D", p0];
}
function applyOp_6(p0) {
return (p0 === "literal");
}
function lift_7(p0) {
return (((p0)[0] === "S") ? str((p0)[1]) : (isD_31(p0) ? (p0)[1] : (("[" + joinCodes_32((p0)[1])) + "]")));
}
function evalStmts_9(p0, p1) {
return [(((kind(p0) === "array") || (kind(p0) === "string")) ? S_0((p0)[1]) : ((isA_1(p0) && true) ? (p0)[1] : D_4((((paren_3(lift_2(p0)) + "[") + "1") + "]")))), p1];
}
function evalStmts_10(p0, p1) {
return [["D","input"], p1];
}
function evalStmts_11(p0, p1) {
return [(((kind(p0) === "array") || (kind(p0) === "string")) ? S_0((p0)[1]) : ((isA_1(p0) && true) ? (p0)[1] : D_4((((paren_3(lift_2(p0)) + "[") + "1") + "]")))), p1];
}
function evalStmts_13(p0, p1) {
return [["D","input"], p1];
}
function isB_15(p0) {
return ((p0)[0] === "B");
}
function body_16(p0) {
return (((p0)[0] === "B") ? (p0)[1] : (("return " + lift_7(p0)) + ";\n"));
}
function rebuildList_23(p0) {
if (((p0).length === 0)) {
return [[],0];
} else {
var _v34 = rebuild_33((p0)[0]);
var _v36 = rebuildList_35((p0).slice(1), (_v34)[1]);
return [([(_v34)[0]]).concat((_v36)[0]), (_v36)[1]];
}
}
function unfold_25(p0, p1, p2, p3, p4, p5) {
if ((((p0)[3]).length === 0)) {
return [["S",null], [p2, p3, p4]];
} else {
var _v38 = ((p0)[3])[0];
var _v39 = ((p0)[3]).slice(1);
var _v40 = (_v38)[0];
if ((_v40 === "return")) {
return ((((_v38)[1])[0] === "call") ? evalCallStmt_41((_v38)[1], ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3, p4, p5) : evalExpr_42((_v38)[1], ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3, p4, p5));
} else {
if ((_v40 === "var")) {
var _v43 = evalExpr_42((_v38)[2], ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3, p4, p5);
var _v45 = nameLeaves_44((_v43)[0], (_v43)[1]);
var _v47 = evalStmts_46(_v39, ([[(_v38)[1], (_v45)[0]]]).concat(((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0]))), (_v45)[1], p5);
return (((_v45)[2] === "") ? _v47 : [["B", ((_v45)[2] + body_16((_v47)[0]))], (_v47)[1]]);
} else {
if ((_v40 === "block")) {
return evalStmts_48(((_v38)[1]).concat(_v39), ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3, p4, p5);
} else {
if ((_v40 === "if")) {
var _v49 = evalExpr_42((_v38)[1], ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3, p4, p5);
var _v50 = ([(_v38)[2]]).concat(_v39);
var _v51 = (((_v38)[3] === null) ? _v39 : ([(_v38)[3]]).concat(_v39));
if (isS_52((_v49)[0])) {
return (((_v49)[0])[1] ? evalStmts_46(_v50, ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v49)[1], p5) : evalStmts_46(_v51, ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v49)[1], p5));
} else {
var _v54 = evalStmts_53(_v50, ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v49)[1], p5);
var _v55 = evalStmts_53(_v51, ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v54)[1], p5);
return ((!(isB_15((_v54)[0])) && !(isB_15((_v55)[0]))) ? [D_4((((((("(" + lift_7((_v49)[0])) + " ? ") + lift_7((_v54)[0])) + " : ") + lift_7((_v55)[0])) + ")")), (_v55)[1]] : [["B", (((((("if (" + lift_7((_v49)[0])) + ") {\n") + body_16((_v54)[0])) + "} else {\n") + body_16((_v55)[0])) + "}\n")], (_v55)[1]]);
}
} else {
return evalStmts_48(_v39, ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3, p4, p5);
}
}
}
}
}
}
function paramNames_27(p0) {
return ((0 >= p0) ? [] : (["p0"]).concat(paramNames_56(p0)));
}
function joinStrs_28(p0) {
return (((p0).length === 0) ? "" : (((p0).length === 1) ? (p0)[0] : (((p0)[0] + ", ") + joinStrs_28((p0).slice(1)))));
}
function specializePending_30(p0, p1) {
if ((((p0)[1]).length === 0)) {
return p1;
} else {
var _v57 = ((p0)[1])[0];
var _v58 = (p0)[0];
var _v59 = ((p0)[1]).slice(1);
var _v60 = (p0)[2];
var _v61 = rebuildList_23((_v57)[2]);
var _v62 = unfold_25((_v57)[1], (_v61)[0], _v58, _v59, _v60, (_v57)[3]);
var _v63 = (((((("function " + (_v57)[0]) + "(") + joinStrs_28(paramNames_27((_v61)[1]))) + ") {\n") + body_16((_v62)[0])) + "}\n");
return specializePending_30((_v62)[1], (p1 + _v63));
}
}
function isD_31(p0) {
return ((p0)[0] === "D");
}
function joinCodes_32(p0) {
return (((p0).length === 0) ? "" : (((p0).length === 1) ? lift_7((p0)[0]) : ((lift_7((p0)[0]) + ", ") + joinCodes_32((p0).slice(1)))));
}
function rebuild_33(p0) {
if (((p0)[0] === "S")) {
return [S_0((p0)[1]), 0];
} else {
if (((p0)[0] === "D")) {
return [["D","p0"],1];
} else {
var _v64 = rebuildList_23((p0)[1]);
return [mkArr_65((_v64)[0]), (_v64)[1]];
}
}
}
function rebuildList_35(p0, p1) {
if (((p0).length === 0)) {
return [[], p1];
} else {
var _v67 = rebuild_66((p0)[0], p1);
var _v68 = rebuildList_35((p0).slice(1), (_v67)[1]);
return [([(_v67)[0]]).concat((_v68)[0]), (_v68)[1]];
}
}
function bindAll_37(p0, p1, p2, p3) {
return (((p0).length === 0) ? [[p2, p3]] : bindAll_69((p0).slice(1), (p1).slice(1), [[(p0)[0], (p1)[0]], [p2, p3]]));
}
function evalCallStmt_41(p0, p1, p2, p3, p4, p5) {
var _v70 = (p0)[1];
var _v74 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], [p2, p3, p4]];
} else {
var _v71 = evalExpr_42(((p0)[2])[0], p1, p2, p3, p4, p5);
var _v73 = evalList_72(((p0)[2]).slice(1), p1, (_v71)[1], p5);
return [([(_v71)[0]]).concat((_v73)[0]), (_v73)[1]];
}
})();
var _v75 = (_v74)[0];
var _v76 = (_v74)[1];
if (((_v70)[0] === "dot")) {
var _v78 = evalExpr_77((_v70)[1], p1, _v76, p5);
return [evalBuiltin_79((_v70)[2], (_v78)[0], _v75), (_v78)[1]];
} else {
var _v81 = findFn_80((_v70)[1]);
return ((_v81 === null) ? [evalBuiltin_82((_v70)[1], _v75), _v76] : unfold_83(_v81, _v75, _v76, p5));
}
}
function evalExpr_42(p0, p1, p2, p3, p4, p5) {
var _v84 = (p0)[0];
if ((_v84 === "lit")) {
return [S_0((p0)[1]), [p2, p3, p4]];
} else {
if ((_v84 === "var")) {
return [lookup_85(p1, (p0)[1]), [p2, p3, p4]];
} else {
if ((_v84 === "arr")) {
var _v87 = evalList_86((p0)[1], p1, p2, p3, p4, p5);
return [mkArr_65((_v87)[0]), (_v87)[1]];
} else {
if ((_v84 === "idx")) {
var _v88 = evalExpr_42((p0)[1], p1, p2, p3, p4, p5);
var _v89 = evalExpr_77((p0)[2], p1, (_v88)[1], p5);
return [index_90((_v88)[0], (_v89)[0]), (_v89)[1]];
} else {
if ((_v84 === "dot")) {
var _v91 = evalExpr_42((p0)[1], p1, p2, p3, p4, p5);
return [prop_92((_v91)[0], (p0)[2]), (_v91)[1]];
} else {
if ((_v84 === "not")) {
var _v93 = evalExpr_42((p0)[1], p1, p2, p3, p4, p5);
return (isS_52((_v93)[0]) ? [S_0(!(((_v93)[0])[1])), (_v93)[1]] : [D_4(("!" + paren_3(lift_7((_v93)[0])))), (_v93)[1]]);
} else {
if ((_v84 === "bin")) {
var _v94 = (p0)[1];
if (((_v94 === "&&") || (_v94 === "||"))) {
return evalLogic_95(_v94, p0, p1, p2, p3, p4, p5);
} else {
var _v96 = evalExpr_42((p0)[2], p1, p2, p3, p4, p5);
var _v97 = evalExpr_77((p0)[3], p1, (_v96)[1], p5);
return [binop_98(_v94, (_v96)[0], (_v97)[0]), (_v97)[1]];
}
} else {
if ((_v84 === "cond")) {
var _v99 = evalExpr_42((p0)[1], p1, p2, p3, p4, p5);
if (isS_52((_v99)[0])) {
return (((_v99)[0])[1] ? evalExpr_77((p0)[2], p1, (_v99)[1], p5) : evalExpr_77((p0)[3], p1, (_v99)[1], p5));
} else {
var _v101 = evalExpr_100((p0)[2], p1, (_v99)[1], p5);
var _v102 = evalExpr_100((p0)[3], p1, (_v101)[1], p5);
return [D_4((((((("(" + lift_7((_v99)[0])) + " ? ") + lift_7((_v101)[0])) + " : ") + lift_7((_v102)[0])) + ")")), (_v102)[1]];
}
} else {
return ((_v84 === "call") ? evalCall_103(p0, p1, p2, p3, p4, p5) : [fail(("jsmix2: unsupported expression " + str(_v84))), [p2, p3, p4]]);
}
}
}
}
}
}
}
}
}
function nameLeaves_44(p0, p1) {
if (((p0)[0] === "S")) {
return [p0, p1, ""];
} else {
if (isD_31(p0)) {
if (isAtom_104((p0)[1])) {
return [p0, p1, ""];
} else {
var _v105 = ("_v" + (p1)[2]);
return [D_4(_v105), [(p1)[0], (p1)[1], ((p1)[2] + 1)], (((("var " + _v105) + " = ") + (p0)[1]) + ";\n")];
}
} else {
var _v107 = nameLeavesList_106((p0)[1], p1);
return [mkArr_65((_v107)[0]), (_v107)[1], (_v107)[2]];
}
}
}
function evalStmts_46(p0, p1, p2, p3) {
if (((p0).length === 0)) {
return [["S",null], p2];
} else {
var _v108 = (p0)[0];
var _v109 = (p0).slice(1);
var _v110 = (_v108)[0];
if ((_v110 === "return")) {
return ((((_v108)[1])[0] === "call") ? evalCallStmt_111((_v108)[1], p1, p2, p3) : evalExpr_77((_v108)[1], p1, p2, p3));
} else {
if ((_v110 === "var")) {
var _v112 = evalExpr_77((_v108)[2], p1, p2, p3);
var _v113 = nameLeaves_44((_v112)[0], (_v112)[1]);
var _v114 = evalStmts_46(_v109, ([[(_v108)[1], (_v113)[0]]]).concat(p1), (_v113)[1], p3);
return (((_v113)[2] === "") ? _v114 : [["B", ((_v113)[2] + body_16((_v114)[0]))], (_v114)[1]]);
} else {
if ((_v110 === "block")) {
return evalStmts_46(((_v108)[1]).concat(_v109), p1, p2, p3);
} else {
if ((_v110 === "if")) {
var _v115 = evalExpr_77((_v108)[1], p1, p2, p3);
var _v116 = ([(_v108)[2]]).concat(_v109);
var _v117 = (((_v108)[3] === null) ? _v109 : ([(_v108)[3]]).concat(_v109));
if (isS_52((_v115)[0])) {
return (((_v115)[0])[1] ? evalStmts_46(_v116, p1, (_v115)[1], p3) : evalStmts_46(_v117, p1, (_v115)[1], p3));
} else {
var _v118 = evalStmts_53(_v116, p1, (_v115)[1], p3);
var _v119 = evalStmts_53(_v117, p1, (_v118)[1], p3);
return ((!(isB_15((_v118)[0])) && !(isB_15((_v119)[0]))) ? [D_4((((((("(" + lift_7((_v115)[0])) + " ? ") + lift_7((_v118)[0])) + " : ") + lift_7((_v119)[0])) + ")")), (_v119)[1]] : [["B", (((((("if (" + lift_7((_v115)[0])) + ") {\n") + body_16((_v118)[0])) + "} else {\n") + body_16((_v119)[0])) + "}\n")], (_v119)[1]]);
}
} else {
return evalStmts_46(_v109, p1, p2, p3);
}
}
}
}
}
}
function evalStmts_48(p0, p1, p2, p3, p4, p5) {
if (((p0).length === 0)) {
return [["S",null], [p2, p3, p4]];
} else {
var _v120 = (p0)[0];
var _v121 = (p0).slice(1);
var _v122 = (_v120)[0];
if ((_v122 === "return")) {
return ((((_v120)[1])[0] === "call") ? evalCallStmt_41((_v120)[1], p1, p2, p3, p4, p5) : evalExpr_42((_v120)[1], p1, p2, p3, p4, p5));
} else {
if ((_v122 === "var")) {
var _v123 = evalExpr_42((_v120)[2], p1, p2, p3, p4, p5);
var _v124 = nameLeaves_44((_v123)[0], (_v123)[1]);
var _v125 = evalStmts_46(_v121, ([[(_v120)[1], (_v124)[0]]]).concat(p1), (_v124)[1], p5);
return (((_v124)[2] === "") ? _v125 : [["B", ((_v124)[2] + body_16((_v125)[0]))], (_v125)[1]]);
} else {
if ((_v122 === "block")) {
return evalStmts_48(((_v120)[1]).concat(_v121), p1, p2, p3, p4, p5);
} else {
if ((_v122 === "if")) {
var _v126 = evalExpr_42((_v120)[1], p1, p2, p3, p4, p5);
var _v127 = ([(_v120)[2]]).concat(_v121);
var _v128 = (((_v120)[3] === null) ? _v121 : ([(_v120)[3]]).concat(_v121));
if (isS_52((_v126)[0])) {
return (((_v126)[0])[1] ? evalStmts_46(_v127, p1, (_v126)[1], p5) : evalStmts_46(_v128, p1, (_v126)[1], p5));
} else {
var _v129 = evalStmts_53(_v127, p1, (_v126)[1], p5);
var _v130 = evalStmts_53(_v128, p1, (_v129)[1], p5);
return ((!(isB_15((_v129)[0])) && !(isB_15((_v130)[0]))) ? [D_4((((((("(" + lift_7((_v126)[0])) + " ? ") + lift_7((_v129)[0])) + " : ") + lift_7((_v130)[0])) + ")")), (_v130)[1]] : [["B", (((((("if (" + lift_7((_v126)[0])) + ") {\n") + body_16((_v129)[0])) + "} else {\n") + body_16((_v130)[0])) + "}\n")], (_v130)[1]]);
}
} else {
return evalStmts_48(_v121, p1, p2, p3, p4, p5);
}
}
}
}
}
}
function isS_52(p0) {
return ((p0)[0] === "S");
}
function evalStmts_53(p0, p1, p2, p3) {
if (((p0).length === 0)) {
return [["S",null], p2];
} else {
var _v131 = (p0)[0];
var _v132 = (p0).slice(1);
var _v133 = (_v131)[0];
if ((_v133 === "return")) {
return ((((_v131)[1])[0] === "call") ? evalCallStmt_134((_v131)[1], p1, p2, p3) : evalExpr_100((_v131)[1], p1, p2, p3));
} else {
if ((_v133 === "var")) {
var _v135 = evalExpr_100((_v131)[2], p1, p2, p3);
var _v136 = nameLeaves_44((_v135)[0], (_v135)[1]);
var _v137 = evalStmts_53(_v132, ([[(_v131)[1], (_v136)[0]]]).concat(p1), (_v136)[1], p3);
return (((_v136)[2] === "") ? _v137 : [["B", ((_v136)[2] + body_16((_v137)[0]))], (_v137)[1]]);
} else {
if ((_v133 === "block")) {
return evalStmts_53(((_v131)[1]).concat(_v132), p1, p2, p3);
} else {
if ((_v133 === "if")) {
var _v138 = evalExpr_100((_v131)[1], p1, p2, p3);
var _v139 = ([(_v131)[2]]).concat(_v132);
var _v140 = (((_v131)[3] === null) ? _v132 : ([(_v131)[3]]).concat(_v132));
if (isS_52((_v138)[0])) {
return (((_v138)[0])[1] ? evalStmts_53(_v139, p1, (_v138)[1], p3) : evalStmts_53(_v140, p1, (_v138)[1], p3));
} else {
var _v141 = evalStmts_53(_v139, p1, (_v138)[1], p3);
var _v142 = evalStmts_53(_v140, p1, (_v141)[1], p3);
return ((!(isB_15((_v141)[0])) && !(isB_15((_v142)[0]))) ? [D_4((((((("(" + lift_7((_v138)[0])) + " ? ") + lift_7((_v141)[0])) + " : ") + lift_7((_v142)[0])) + ")")), (_v142)[1]] : [["B", (((((("if (" + lift_7((_v138)[0])) + ") {\n") + body_16((_v141)[0])) + "} else {\n") + body_16((_v142)[0])) + "}\n")], (_v142)[1]]);
}
} else {
return evalStmts_53(_v132, p1, p2, p3);
}
}
}
}
}
}
function paramNames_56(p0) {
return ((1 >= p0) ? [] : (["p1"]).concat(paramNames_143(p0)));
}
function mkArr_65(p0) {
return ((((p0).length === 0) ? true : (isS_52((p0)[0]) && allStatic_144((p0).slice(1)))) ? S_0(staticsOf_145(p0)) : ["A", p0]);
}
function rebuild_66(p0, p1) {
if (((p0)[0] === "S")) {
return [S_0((p0)[1]), p1];
} else {
if (((p0)[0] === "D")) {
return [D_4(("p" + p1)), (p1 + 1)];
} else {
var _v146 = rebuildList_35((p0)[1], p1);
return [mkArr_65((_v146)[0]), (_v146)[1]];
}
}
}
function bindAll_69(p0, p1, p2) {
return (((p0).length === 0) ? p2 : bindAll_69((p0).slice(1), (p1).slice(1), ([[(p0)[0], (p1)[0]]]).concat(p2)));
}
function evalList_72(p0, p1, p2, p3) {
if (((p0).length === 0)) {
return [[], p2];
} else {
var _v147 = evalExpr_77((p0)[0], p1, p2, p3);
var _v148 = evalList_72((p0).slice(1), p1, (_v147)[1], p3);
return [([(_v147)[0]]).concat((_v148)[0]), (_v148)[1]];
}
}
function evalExpr_77(p0, p1, p2, p3) {
var _v149 = (p0)[0];
if ((_v149 === "lit")) {
return [S_0((p0)[1]), p2];
} else {
if ((_v149 === "var")) {
return [lookup_85(p1, (p0)[1]), p2];
} else {
if ((_v149 === "arr")) {
var _v150 = evalList_72((p0)[1], p1, p2, p3);
return [mkArr_65((_v150)[0]), (_v150)[1]];
} else {
if ((_v149 === "idx")) {
var _v151 = evalExpr_77((p0)[1], p1, p2, p3);
var _v152 = evalExpr_77((p0)[2], p1, (_v151)[1], p3);
return [index_90((_v151)[0], (_v152)[0]), (_v152)[1]];
} else {
if ((_v149 === "dot")) {
var _v153 = evalExpr_77((p0)[1], p1, p2, p3);
return [prop_92((_v153)[0], (p0)[2]), (_v153)[1]];
} else {
if ((_v149 === "not")) {
var _v154 = evalExpr_77((p0)[1], p1, p2, p3);
return (isS_52((_v154)[0]) ? [S_0(!(((_v154)[0])[1])), (_v154)[1]] : [D_4(("!" + paren_3(lift_7((_v154)[0])))), (_v154)[1]]);
} else {
if ((_v149 === "bin")) {
var _v155 = (p0)[1];
if (((_v155 === "&&") || (_v155 === "||"))) {
return evalLogic_156(_v155, p0, p1, p2, p3);
} else {
var _v157 = evalExpr_77((p0)[2], p1, p2, p3);
var _v158 = evalExpr_77((p0)[3], p1, (_v157)[1], p3);
return [binop_98(_v155, (_v157)[0], (_v158)[0]), (_v158)[1]];
}
} else {
if ((_v149 === "cond")) {
var _v159 = evalExpr_77((p0)[1], p1, p2, p3);
if (isS_52((_v159)[0])) {
return (((_v159)[0])[1] ? evalExpr_77((p0)[2], p1, (_v159)[1], p3) : evalExpr_77((p0)[3], p1, (_v159)[1], p3));
} else {
var _v160 = evalExpr_100((p0)[2], p1, (_v159)[1], p3);
var _v161 = evalExpr_100((p0)[3], p1, (_v160)[1], p3);
return [D_4((((((("(" + lift_7((_v159)[0])) + " ? ") + lift_7((_v160)[0])) + " : ") + lift_7((_v161)[0])) + ")")), (_v161)[1]];
}
} else {
return ((_v149 === "call") ? evalCall_162(p0, p1, p2, p3) : [fail(("jsmix2: unsupported expression " + str(_v149))), p2]);
}
}
}
}
}
}
}
}
}
function evalBuiltin_79(p0, p1, p2) {
if (((p0 !== "slice") && ((p2).length !== 1))) {
return fail(((("jsmix2: builtin " + str(p0)) + " takes 1 argument, got ") + str((p2).length)));
} else {
if ((p0 === "str")) {
return (isS_52((p2)[0]) ? S_0(str(((p2)[0])[1])) : D_4((("str(" + lift_7((p2)[0])) + ")")));
} else {
if ((p0 === "isArr")) {
return (isS_52((p2)[0]) ? S_0(isArr(((p2)[0])[1])) : (isA_163((p2)[0]) ? ["S",true] : D_4((("isArr(" + lift_7((p2)[0])) + ")"))));
} else {
if ((p0 === "kind")) {
return (isS_52((p2)[0]) ? S_0(kind(((p2)[0])[1])) : (isA_163((p2)[0]) ? ["S","array"] : D_4((("kind(" + lift_7((p2)[0])) + ")"))));
} else {
if ((p0 === "fail")) {
return (isS_52((p2)[0]) ? fail(((p2)[0])[1]) : D_4((("fail(" + lift_7((p2)[0])) + ")")));
} else {
if ((p0 === "slice")) {
return (((p2).length === 1) ? (((isS_52(p1) && isS_52((p2)[0])) && indexable_164((p1)[1])) ? S_0(((p1)[1]).slice(((p2)[0])[1])) : ((isA_163(p1) && isS_52((p2)[0])) ? mkArr_65(((p1)[1]).slice(((p2)[0])[1])) : D_4((((paren_3(lift_7(p1)) + ".slice(") + lift_7((p2)[0])) + ")")))) : (((p2).length === 2) ? (((isS_52(p1) && allStatic_144(p2)) && indexable_164((p1)[1])) ? S_0(((p1)[1]).slice(((p2)[0])[1], ((p2)[1])[1])) : ((isA_163(p1) && allStatic_144(p2)) ? mkArr_65(((p1)[1]).slice(((p2)[0])[1], ((p2)[1])[1])) : D_4((((paren_3(lift_7(p1)) + ".slice(") + joinCodes_32(p2)) + ")")))) : fail(("jsmix2: slice takes 1 or 2 arguments, got " + str((p2).length)))));
} else {
if ((p0 === "indexOf")) {
return (((isS_52(p1) && isS_52((p2)[0])) && indexable_164((p1)[1])) ? S_0(((p1)[1]).indexOf(((p2)[0])[1])) : D_4((((paren_3(lift_7(p1)) + ".indexOf(") + lift_7((p2)[0])) + ")")));
} else {
if ((p0 === "concat")) {
var _v166 = elems_165(p1);
var _v167 = elems_165((p2)[0]);
return (((_v166 !== null) && (_v167 !== null)) ? mkArr_65((_v166).concat(_v167)) : D_4((((paren_3(lift_7(p1)) + ".concat(") + lift_7((p2)[0])) + ")")));
} else {
return fail(("jsmix2: unknown builtin " + str(p0)));
}
}
}
}
}
}
}
}
}
function findFn_80(p0) {
return (("interp" === p0) ? ["fundecl","interp",["program","input"],[["if",["bin","===",["idx",["var","program"],["lit",0]],["lit","literal"]],["block",[["return",["idx",["var","program"],["lit",1]]]]],null],["return",["var","input"]]]] : findFn_168(p0));
}
function evalBuiltin_82(p0, p1) {
if (((p0 !== "slice") && ((p1).length !== 1))) {
return fail(((("jsmix2: builtin " + str(p0)) + " takes 1 argument, got ") + str((p1).length)));
} else {
if ((p0 === "str")) {
return (isS_52((p1)[0]) ? S_0(str(((p1)[0])[1])) : D_4((("str(" + lift_7((p1)[0])) + ")")));
} else {
if ((p0 === "isArr")) {
return (isS_52((p1)[0]) ? S_0(isArr(((p1)[0])[1])) : (isA_163((p1)[0]) ? ["S",true] : D_4((("isArr(" + lift_7((p1)[0])) + ")"))));
} else {
if ((p0 === "kind")) {
return (isS_52((p1)[0]) ? S_0(kind(((p1)[0])[1])) : (isA_163((p1)[0]) ? ["S","array"] : D_4((("kind(" + lift_7((p1)[0])) + ")"))));
} else {
if ((p0 === "fail")) {
return (isS_52((p1)[0]) ? fail(((p1)[0])[1]) : D_4((("fail(" + lift_7((p1)[0])) + ")")));
} else {
if ((p0 === "slice")) {
return (((p1).length === 1) ? (((((null)[0] === "S") && isS_52((p1)[0])) && indexable_164((null)[1])) ? S_0(((null)[1]).slice(((p1)[0])[1])) : ((((null)[0] === "A") && isS_52((p1)[0])) ? mkArr_65(((null)[1]).slice(((p1)[0])[1])) : D_4((((paren_3((((null)[0] === "S") ? str((null)[1]) : (((null)[0] === "D") ? (null)[1] : (("[" + joinCodes_32((null)[1])) + "]")))) + ".slice(") + lift_7((p1)[0])) + ")")))) : (((p1).length === 2) ? (((((null)[0] === "S") && allStatic_144(p1)) && indexable_164((null)[1])) ? S_0(((null)[1]).slice(((p1)[0])[1], ((p1)[1])[1])) : ((((null)[0] === "A") && allStatic_144(p1)) ? mkArr_65(((null)[1]).slice(((p1)[0])[1], ((p1)[1])[1])) : D_4((((paren_3((((null)[0] === "S") ? str((null)[1]) : (((null)[0] === "D") ? (null)[1] : (("[" + joinCodes_32((null)[1])) + "]")))) + ".slice(") + joinCodes_32(p1)) + ")")))) : fail(("jsmix2: slice takes 1 or 2 arguments, got " + str((p1).length)))));
} else {
if ((p0 === "indexOf")) {
return (((((null)[0] === "S") && isS_52((p1)[0])) && indexable_164((null)[1])) ? S_0(((null)[1]).indexOf(((p1)[0])[1])) : D_4((((paren_3((((null)[0] === "S") ? str((null)[1]) : (((null)[0] === "D") ? (null)[1] : (("[" + joinCodes_32((null)[1])) + "]")))) + ".indexOf(") + lift_7((p1)[0])) + ")")));
} else {
if ((p0 === "concat")) {
var _v170 = (((null)[0] === "A") ? (null)[1] : ((((null)[0] === "S") && isArr((null)[1])) ? elemsOfStatic_169((null)[1]) : null));
var _v171 = elems_165((p1)[0]);
return (((_v170 !== null) && (_v171 !== null)) ? mkArr_65((_v170).concat(_v171)) : D_4((((paren_3((((null)[0] === "S") ? str((null)[1]) : (((null)[0] === "D") ? (null)[1] : (("[" + joinCodes_32((null)[1])) + "]")))) + ".concat(") + lift_7((p1)[0])) + ")")));
} else {
return fail(("jsmix2: unknown builtin " + str(p0)));
}
}
}
}
}
}
}
}
}
function unfold_83(p0, p1, p2, p3) {
if ((((p0)[3]).length === 0)) {
return [["S",null], p2];
} else {
var _v172 = ((p0)[3])[0];
var _v173 = ((p0)[3]).slice(1);
var _v174 = (_v172)[0];
if ((_v174 === "return")) {
return ((((_v172)[1])[0] === "call") ? evalCallStmt_111((_v172)[1], ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3) : evalExpr_77((_v172)[1], ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3));
} else {
if ((_v174 === "var")) {
var _v175 = evalExpr_77((_v172)[2], ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
var _v176 = nameLeaves_44((_v175)[0], (_v175)[1]);
var _v177 = evalStmts_46(_v173, ([[(_v172)[1], (_v176)[0]]]).concat(((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0]))), (_v176)[1], p3);
return (((_v176)[2] === "") ? _v177 : [["B", ((_v176)[2] + body_16((_v177)[0]))], (_v177)[1]]);
} else {
if ((_v174 === "block")) {
return evalStmts_46(((_v172)[1]).concat(_v173), ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
} else {
if ((_v174 === "if")) {
var _v178 = evalExpr_77((_v172)[1], ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
var _v179 = ([(_v172)[2]]).concat(_v173);
var _v180 = (((_v172)[3] === null) ? _v173 : ([(_v172)[3]]).concat(_v173));
if (isS_52((_v178)[0])) {
return (((_v178)[0])[1] ? evalStmts_46(_v179, ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v178)[1], p3) : evalStmts_46(_v180, ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v178)[1], p3));
} else {
var _v181 = evalStmts_53(_v179, ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v178)[1], p3);
var _v182 = evalStmts_53(_v180, ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v181)[1], p3);
return ((!(isB_15((_v181)[0])) && !(isB_15((_v182)[0]))) ? [D_4((((((("(" + lift_7((_v178)[0])) + " ? ") + lift_7((_v181)[0])) + " : ") + lift_7((_v182)[0])) + ")")), (_v182)[1]] : [["B", (((((("if (" + lift_7((_v178)[0])) + ") {\n") + body_16((_v181)[0])) + "} else {\n") + body_16((_v182)[0])) + "}\n")], (_v182)[1]]);
}
} else {
return evalStmts_46(_v173, ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
}
}
}
}
}
}
function lookup_85(p0, p1) {
return (((p0).length === 0) ? D_4(p1) : ((((p0)[0])[0] === p1) ? ((p0)[0])[1] : lookup_85((p0).slice(1), p1)));
}
function evalList_86(p0, p1, p2, p3, p4, p5) {
if (((p0).length === 0)) {
return [[], [p2, p3, p4]];
} else {
var _v183 = evalExpr_42((p0)[0], p1, p2, p3, p4, p5);
var _v184 = evalList_72((p0).slice(1), p1, (_v183)[1], p5);
return [([(_v183)[0]]).concat((_v184)[0]), (_v184)[1]];
}
}
function index_90(p0, p1) {
return (((((p0)[0] === "S") && isS_52(p1)) && indexable_164((p0)[1])) ? S_0(((p0)[1])[(p1)[1]]) : ((isA_163(p0) && isS_52(p1)) ? ((p0)[1])[(p1)[1]] : D_4((((paren_3(lift_7(p0)) + "[") + lift_7(p1)) + "]"))));
}
function prop_92(p0, p1) {
return ((p1 === "length") ? ((isS_52(p0) && indexable_164((p0)[1])) ? S_0(((p0)[1]).length) : (isA_163(p0) ? S_0(((p0)[1]).length) : D_4((paren_3(lift_7(p0)) + ".length")))) : D_4(((paren_3(lift_7(p0)) + ".") + p1)));
}
function evalLogic_95(p0, p1, p2, p3, p4, p5, p6) {
var _v197 = (function () {
var _v185 = ((p1)[2])[0];
if ((_v185 === "lit")) {
return [S_0(((p1)[2])[1]), [p3, p4, p5]];
} else {
if ((_v185 === "var")) {
return [lookup_85(p2, ((p1)[2])[1]), [p3, p4, p5]];
} else {
if ((_v185 === "arr")) {
var _v186 = evalList_86(((p1)[2])[1], p2, p3, p4, p5, p6);
return [mkArr_65((_v186)[0]), (_v186)[1]];
} else {
if ((_v185 === "idx")) {
var _v187 = evalExpr_42(((p1)[2])[1], p2, p3, p4, p5, p6);
var _v188 = evalExpr_77(((p1)[2])[2], p2, (_v187)[1], p6);
return [index_90((_v187)[0], (_v188)[0]), (_v188)[1]];
} else {
if ((_v185 === "dot")) {
var _v189 = evalExpr_42(((p1)[2])[1], p2, p3, p4, p5, p6);
return [prop_92((_v189)[0], ((p1)[2])[2]), (_v189)[1]];
} else {
if ((_v185 === "not")) {
var _v190 = evalExpr_42(((p1)[2])[1], p2, p3, p4, p5, p6);
return (isS_52((_v190)[0]) ? [S_0(!(((_v190)[0])[1])), (_v190)[1]] : [D_4(("!" + paren_3(lift_7((_v190)[0])))), (_v190)[1]]);
} else {
if ((_v185 === "bin")) {
var _v191 = ((p1)[2])[1];
if (((_v191 === "&&") || (_v191 === "||"))) {
return evalLogic_95(_v191, (p1)[2], p2, p3, p4, p5, p6);
} else {
var _v192 = evalExpr_42(((p1)[2])[2], p2, p3, p4, p5, p6);
var _v193 = evalExpr_77(((p1)[2])[3], p2, (_v192)[1], p6);
return [binop_98(_v191, (_v192)[0], (_v193)[0]), (_v193)[1]];
}
} else {
if ((_v185 === "cond")) {
var _v194 = evalExpr_42(((p1)[2])[1], p2, p3, p4, p5, p6);
if (isS_52((_v194)[0])) {
return (((_v194)[0])[1] ? evalExpr_77(((p1)[2])[2], p2, (_v194)[1], p6) : evalExpr_77(((p1)[2])[3], p2, (_v194)[1], p6));
} else {
var _v195 = evalExpr_100(((p1)[2])[2], p2, (_v194)[1], p6);
var _v196 = evalExpr_100(((p1)[2])[3], p2, (_v195)[1], p6);
return [D_4((((((("(" + lift_7((_v194)[0])) + " ? ") + lift_7((_v195)[0])) + " : ") + lift_7((_v196)[0])) + ")")), (_v196)[1]];
}
} else {
return ((_v185 === "call") ? evalCall_103((p1)[2], p2, p3, p4, p5, p6) : [fail(("jsmix2: unsupported expression " + str(_v185))), [p3, p4, p5]]);
}
}
}
}
}
}
}
}
})();
if ((((_v197)[0])[0] === "S")) {
return ((p0 === "&&") ? (((_v197)[0])[1] ? evalExpr_77((p1)[3], p2, (_v197)[1], p6) : _v197) : (((_v197)[0])[1] ? _v197 : evalExpr_77((p1)[3], p2, (_v197)[1], p6)));
} else {
var _v198 = evalExpr_100((p1)[3], p2, (_v197)[1], p6);
return [D_4((((((("(" + lift_7((_v197)[0])) + " ") + p0) + " ") + lift_7((_v198)[0])) + ")")), (_v198)[1]];
}
}
function binop_98(p0, p1, p2) {
return ((((p1)[0] === "S") && isS_52(p2)) ? S_0(applyOp_199(p0, (p1)[1], (p2)[1])) : D_4((((((("(" + lift_7(p1)) + " ") + p0) + " ") + lift_7(p2)) + ")")));
}
function evalExpr_100(p0, p1, p2, p3) {
var _v200 = (p0)[0];
if ((_v200 === "lit")) {
return [S_0((p0)[1]), p2];
} else {
if ((_v200 === "var")) {
return [lookup_85(p1, (p0)[1]), p2];
} else {
if ((_v200 === "arr")) {
var _v202 = evalList_201((p0)[1], p1, p2, p3);
return [mkArr_65((_v202)[0]), (_v202)[1]];
} else {
if ((_v200 === "idx")) {
var _v203 = evalExpr_100((p0)[1], p1, p2, p3);
var _v204 = evalExpr_100((p0)[2], p1, (_v203)[1], p3);
return [index_90((_v203)[0], (_v204)[0]), (_v204)[1]];
} else {
if ((_v200 === "dot")) {
var _v205 = evalExpr_100((p0)[1], p1, p2, p3);
return [prop_92((_v205)[0], (p0)[2]), (_v205)[1]];
} else {
if ((_v200 === "not")) {
var _v206 = evalExpr_100((p0)[1], p1, p2, p3);
return (isS_52((_v206)[0]) ? [S_0(!(((_v206)[0])[1])), (_v206)[1]] : [D_4(("!" + paren_3(lift_7((_v206)[0])))), (_v206)[1]]);
} else {
if ((_v200 === "bin")) {
var _v207 = (p0)[1];
if (((_v207 === "&&") || (_v207 === "||"))) {
return evalLogic_208(_v207, p0, p1, p2, p3);
} else {
var _v209 = evalExpr_100((p0)[2], p1, p2, p3);
var _v210 = evalExpr_100((p0)[3], p1, (_v209)[1], p3);
return [binop_98(_v207, (_v209)[0], (_v210)[0]), (_v210)[1]];
}
} else {
if ((_v200 === "cond")) {
var _v211 = evalExpr_100((p0)[1], p1, p2, p3);
if (isS_52((_v211)[0])) {
return (((_v211)[0])[1] ? evalExpr_100((p0)[2], p1, (_v211)[1], p3) : evalExpr_100((p0)[3], p1, (_v211)[1], p3));
} else {
var _v212 = evalExpr_100((p0)[2], p1, (_v211)[1], p3);
var _v213 = evalExpr_100((p0)[3], p1, (_v212)[1], p3);
return [D_4((((((("(" + lift_7((_v211)[0])) + " ? ") + lift_7((_v212)[0])) + " : ") + lift_7((_v213)[0])) + ")")), (_v213)[1]];
}
} else {
return ((_v200 === "call") ? evalCall_214(p0, p1, p2, p3) : [fail(("jsmix2: unsupported expression " + str(_v200))), p2]);
}
}
}
}
}
}
}
}
}
function evalCall_103(p0, p1, p2, p3, p4, p5) {
var _v223 = (function () {
var _v215 = (p0)[1];
var _v218 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], [p2, p3, p4]];
} else {
var _v216 = evalExpr_42(((p0)[2])[0], p1, p2, p3, p4, p5);
var _v217 = evalList_72(((p0)[2]).slice(1), p1, (_v216)[1], p5);
return [([(_v216)[0]]).concat((_v217)[0]), (_v217)[1]];
}
})();
var _v219 = (_v218)[0];
var _v220 = (_v218)[1];
if (((_v215)[0] === "dot")) {
var _v221 = evalExpr_77((_v215)[1], p1, _v220, p5);
return [evalBuiltin_79((_v215)[2], (_v221)[0], _v219), (_v221)[1]];
} else {
var _v222 = findFn_80((_v215)[1]);
return ((_v222 === null) ? [evalBuiltin_82((_v215)[1], _v219), _v220] : unfold_83(_v222, _v219, _v220, p5));
}
})();
return [((((_v223)[0])[0] === "B") ? D_4((("(function () {\n" + ((_v223)[0])[1]) + "})()")) : (_v223)[0]), (_v223)[1]];
}
function isAtom_104(p0) {
return ((((p0).indexOf(" ") < 0) && ((p0).indexOf("(") < 0)) && ((p0).indexOf("[") < 0));
}
function nameLeavesList_106(p0, p1) {
if (((p0).length === 0)) {
return [[], p1, ""];
} else {
var _v224 = nameLeaves_44((p0)[0], p1);
var _v225 = nameLeavesList_106((p0).slice(1), (_v224)[1]);
return [([(_v224)[0]]).concat((_v225)[0]), (_v225)[1], ((_v224)[2] + (_v225)[2])];
}
}
function evalCallStmt_111(p0, p1, p2, p3) {
var _v226 = (p0)[1];
var _v229 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p2];
} else {
var _v227 = evalExpr_77(((p0)[2])[0], p1, p2, p3);
var _v228 = evalList_72(((p0)[2]).slice(1), p1, (_v227)[1], p3);
return [([(_v227)[0]]).concat((_v228)[0]), (_v228)[1]];
}
})();
var _v230 = (_v229)[0];
var _v231 = (_v229)[1];
if (((_v226)[0] === "dot")) {
var _v232 = evalExpr_77((_v226)[1], p1, _v231, p3);
return [evalBuiltin_79((_v226)[2], (_v232)[0], _v230), (_v232)[1]];
} else {
var _v233 = findFn_80((_v226)[1]);
return ((_v233 === null) ? [evalBuiltin_82((_v226)[1], _v230), _v231] : unfold_83(_v233, _v230, _v231, p3));
}
}
function evalCallStmt_134(p0, p1, p2, p3) {
var _v234 = (p0)[1];
var _v237 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p2];
} else {
var _v235 = evalExpr_100(((p0)[2])[0], p1, p2, p3);
var _v236 = evalList_201(((p0)[2]).slice(1), p1, (_v235)[1], p3);
return [([(_v235)[0]]).concat((_v236)[0]), (_v236)[1]];
}
})();
var _v238 = (_v237)[0];
var _v239 = (_v237)[1];
if (((_v234)[0] === "dot")) {
var _v240 = evalExpr_100((_v234)[1], p1, _v239, p3);
return [evalBuiltin_79((_v234)[2], (_v240)[0], _v238), (_v240)[1]];
} else {
var _v241 = findFn_80((_v234)[1]);
return ((_v241 === null) ? [evalBuiltin_82((_v234)[1], _v238), _v239] : (allStatic_144(_v238) ? unfold_242(_v241, _v238, _v239, p3) : residualCall_243(_v241, _v238, _v239, p3)));
}
}
function paramNames_143(p0) {
return ((2 >= p0) ? [] : (["p2"]).concat(paramNames_244(p0)));
}
function allStatic_144(p0) {
return (((p0).length === 0) ? true : (isS_52((p0)[0]) && allStatic_144((p0).slice(1))));
}
function staticsOf_145(p0) {
return (((p0).length === 0) ? [] : ([((p0)[0])[1]]).concat(staticsOf_145((p0).slice(1))));
}
function evalLogic_156(p0, p1, p2, p3, p4) {
var _v257 = (function () {
var _v245 = ((p1)[2])[0];
if ((_v245 === "lit")) {
return [S_0(((p1)[2])[1]), p3];
} else {
if ((_v245 === "var")) {
return [lookup_85(p2, ((p1)[2])[1]), p3];
} else {
if ((_v245 === "arr")) {
var _v246 = evalList_72(((p1)[2])[1], p2, p3, p4);
return [mkArr_65((_v246)[0]), (_v246)[1]];
} else {
if ((_v245 === "idx")) {
var _v247 = evalExpr_77(((p1)[2])[1], p2, p3, p4);
var _v248 = evalExpr_77(((p1)[2])[2], p2, (_v247)[1], p4);
return [index_90((_v247)[0], (_v248)[0]), (_v248)[1]];
} else {
if ((_v245 === "dot")) {
var _v249 = evalExpr_77(((p1)[2])[1], p2, p3, p4);
return [prop_92((_v249)[0], ((p1)[2])[2]), (_v249)[1]];
} else {
if ((_v245 === "not")) {
var _v250 = evalExpr_77(((p1)[2])[1], p2, p3, p4);
return (isS_52((_v250)[0]) ? [S_0(!(((_v250)[0])[1])), (_v250)[1]] : [D_4(("!" + paren_3(lift_7((_v250)[0])))), (_v250)[1]]);
} else {
if ((_v245 === "bin")) {
var _v251 = ((p1)[2])[1];
if (((_v251 === "&&") || (_v251 === "||"))) {
return evalLogic_156(_v251, (p1)[2], p2, p3, p4);
} else {
var _v252 = evalExpr_77(((p1)[2])[2], p2, p3, p4);
var _v253 = evalExpr_77(((p1)[2])[3], p2, (_v252)[1], p4);
return [binop_98(_v251, (_v252)[0], (_v253)[0]), (_v253)[1]];
}
} else {
if ((_v245 === "cond")) {
var _v254 = evalExpr_77(((p1)[2])[1], p2, p3, p4);
if (isS_52((_v254)[0])) {
return (((_v254)[0])[1] ? evalExpr_77(((p1)[2])[2], p2, (_v254)[1], p4) : evalExpr_77(((p1)[2])[3], p2, (_v254)[1], p4));
} else {
var _v255 = evalExpr_100(((p1)[2])[2], p2, (_v254)[1], p4);
var _v256 = evalExpr_100(((p1)[2])[3], p2, (_v255)[1], p4);
return [D_4((((((("(" + lift_7((_v254)[0])) + " ? ") + lift_7((_v255)[0])) + " : ") + lift_7((_v256)[0])) + ")")), (_v256)[1]];
}
} else {
return ((_v245 === "call") ? evalCall_162((p1)[2], p2, p3, p4) : [fail(("jsmix2: unsupported expression " + str(_v245))), p3]);
}
}
}
}
}
}
}
}
})();
if ((((_v257)[0])[0] === "S")) {
return ((p0 === "&&") ? (((_v257)[0])[1] ? evalExpr_77((p1)[3], p2, (_v257)[1], p4) : _v257) : (((_v257)[0])[1] ? _v257 : evalExpr_77((p1)[3], p2, (_v257)[1], p4)));
} else {
var _v258 = evalExpr_100((p1)[3], p2, (_v257)[1], p4);
return [D_4((((((("(" + lift_7((_v257)[0])) + " ") + p0) + " ") + lift_7((_v258)[0])) + ")")), (_v258)[1]];
}
}
function evalCall_162(p0, p1, p2, p3) {
var _v267 = (function () {
var _v259 = (p0)[1];
var _v262 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p2];
} else {
var _v260 = evalExpr_77(((p0)[2])[0], p1, p2, p3);
var _v261 = evalList_72(((p0)[2]).slice(1), p1, (_v260)[1], p3);
return [([(_v260)[0]]).concat((_v261)[0]), (_v261)[1]];
}
})();
var _v263 = (_v262)[0];
var _v264 = (_v262)[1];
if (((_v259)[0] === "dot")) {
var _v265 = evalExpr_77((_v259)[1], p1, _v264, p3);
return [evalBuiltin_79((_v259)[2], (_v265)[0], _v263), (_v265)[1]];
} else {
var _v266 = findFn_80((_v259)[1]);
return ((_v266 === null) ? [evalBuiltin_82((_v259)[1], _v263), _v264] : unfold_83(_v266, _v263, _v264, p3));
}
})();
return [((((_v267)[0])[0] === "B") ? D_4((("(function () {\n" + ((_v267)[0])[1]) + "})()")) : (_v267)[0]), (_v267)[1]];
}
function isA_163(p0) {
return ((p0)[0] === "A");
}
function indexable_164(p0) {
return ((kind(p0) === "array") || (kind(p0) === "string"));
}
function elems_165(p0) {
return (((p0)[0] === "A") ? (p0)[1] : ((isS_52(p0) && isArr((p0)[1])) ? elemsOfStatic_169((p0)[1]) : null));
}
function findFn_168(p0) {
return null;
}
function elemsOfStatic_169(p0) {
return (((p0).length === 0) ? [] : ([S_0((p0)[0])]).concat(elemsOfStatic_169((p0).slice(1))));
}
function applyOp_199(p0, p1, p2) {
return ((p0 === "+") ? (p1 + p2) : ((p0 === "-") ? (p1 - p2) : ((p0 === "*") ? (p1 * p2) : ((p0 === "===") ? (p1 === p2) : ((p0 === "!==") ? (p1 !== p2) : ((p0 === "<") ? (p1 < p2) : ((p0 === ">") ? (p1 > p2) : ((p0 === "<=") ? (p1 <= p2) : (p1 >= p2)))))))));
}
function evalList_201(p0, p1, p2, p3) {
if (((p0).length === 0)) {
return [[], p2];
} else {
var _v268 = evalExpr_100((p0)[0], p1, p2, p3);
var _v269 = evalList_201((p0).slice(1), p1, (_v268)[1], p3);
return [([(_v268)[0]]).concat((_v269)[0]), (_v269)[1]];
}
}
function evalLogic_208(p0, p1, p2, p3, p4) {
var _v282 = (function () {
var _v270 = ((p1)[2])[0];
if ((_v270 === "lit")) {
return [S_0(((p1)[2])[1]), p3];
} else {
if ((_v270 === "var")) {
return [lookup_85(p2, ((p1)[2])[1]), p3];
} else {
if ((_v270 === "arr")) {
var _v271 = evalList_201(((p1)[2])[1], p2, p3, p4);
return [mkArr_65((_v271)[0]), (_v271)[1]];
} else {
if ((_v270 === "idx")) {
var _v272 = evalExpr_100(((p1)[2])[1], p2, p3, p4);
var _v273 = evalExpr_100(((p1)[2])[2], p2, (_v272)[1], p4);
return [index_90((_v272)[0], (_v273)[0]), (_v273)[1]];
} else {
if ((_v270 === "dot")) {
var _v274 = evalExpr_100(((p1)[2])[1], p2, p3, p4);
return [prop_92((_v274)[0], ((p1)[2])[2]), (_v274)[1]];
} else {
if ((_v270 === "not")) {
var _v275 = evalExpr_100(((p1)[2])[1], p2, p3, p4);
return (isS_52((_v275)[0]) ? [S_0(!(((_v275)[0])[1])), (_v275)[1]] : [D_4(("!" + paren_3(lift_7((_v275)[0])))), (_v275)[1]]);
} else {
if ((_v270 === "bin")) {
var _v276 = ((p1)[2])[1];
if (((_v276 === "&&") || (_v276 === "||"))) {
return evalLogic_208(_v276, (p1)[2], p2, p3, p4);
} else {
var _v277 = evalExpr_100(((p1)[2])[2], p2, p3, p4);
var _v278 = evalExpr_100(((p1)[2])[3], p2, (_v277)[1], p4);
return [binop_98(_v276, (_v277)[0], (_v278)[0]), (_v278)[1]];
}
} else {
if ((_v270 === "cond")) {
var _v279 = evalExpr_100(((p1)[2])[1], p2, p3, p4);
if (isS_52((_v279)[0])) {
return (((_v279)[0])[1] ? evalExpr_100(((p1)[2])[2], p2, (_v279)[1], p4) : evalExpr_100(((p1)[2])[3], p2, (_v279)[1], p4));
} else {
var _v280 = evalExpr_100(((p1)[2])[2], p2, (_v279)[1], p4);
var _v281 = evalExpr_100(((p1)[2])[3], p2, (_v280)[1], p4);
return [D_4((((((("(" + lift_7((_v279)[0])) + " ? ") + lift_7((_v280)[0])) + " : ") + lift_7((_v281)[0])) + ")")), (_v281)[1]];
}
} else {
return ((_v270 === "call") ? evalCall_214((p1)[2], p2, p3, p4) : [fail(("jsmix2: unsupported expression " + str(_v270))), p3]);
}
}
}
}
}
}
}
}
})();
if ((((_v282)[0])[0] === "S")) {
return ((p0 === "&&") ? (((_v282)[0])[1] ? evalExpr_100((p1)[3], p2, (_v282)[1], p4) : _v282) : (((_v282)[0])[1] ? _v282 : evalExpr_100((p1)[3], p2, (_v282)[1], p4)));
} else {
var _v283 = evalExpr_100((p1)[3], p2, (_v282)[1], p4);
return [D_4((((((("(" + lift_7((_v282)[0])) + " ") + p0) + " ") + lift_7((_v283)[0])) + ")")), (_v283)[1]];
}
}
function evalCall_214(p0, p1, p2, p3) {
var _v292 = (function () {
var _v284 = (p0)[1];
var _v287 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p2];
} else {
var _v285 = evalExpr_100(((p0)[2])[0], p1, p2, p3);
var _v286 = evalList_201(((p0)[2]).slice(1), p1, (_v285)[1], p3);
return [([(_v285)[0]]).concat((_v286)[0]), (_v286)[1]];
}
})();
var _v288 = (_v287)[0];
var _v289 = (_v287)[1];
if (((_v284)[0] === "dot")) {
var _v290 = evalExpr_100((_v284)[1], p1, _v289, p3);
return [evalBuiltin_79((_v284)[2], (_v290)[0], _v288), (_v290)[1]];
} else {
var _v291 = findFn_80((_v284)[1]);
return ((_v291 === null) ? [evalBuiltin_82((_v284)[1], _v288), _v289] : (allStatic_144(_v288) ? unfold_242(_v291, _v288, _v289, p3) : residualCall_243(_v291, _v288, _v289, p3)));
}
})();
return [((((_v292)[0])[0] === "B") ? D_4((("(function () {\n" + ((_v292)[0])[1]) + "})()")) : (_v292)[0]), (_v292)[1]];
}
function unfold_242(p0, p1, p2, p3) {
if ((((p0)[3]).length === 0)) {
return [["S",null], p2];
} else {
var _v293 = ((p0)[3])[0];
var _v294 = ((p0)[3]).slice(1);
var _v295 = (_v293)[0];
if ((_v295 === "return")) {
return ((((_v293)[1])[0] === "call") ? evalCallStmt_134((_v293)[1], ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3) : evalExpr_100((_v293)[1], ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3));
} else {
if ((_v295 === "var")) {
var _v296 = evalExpr_100((_v293)[2], ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
var _v297 = nameLeaves_44((_v296)[0], (_v296)[1]);
var _v298 = evalStmts_53(_v294, ([[(_v293)[1], (_v297)[0]]]).concat(((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0]))), (_v297)[1], p3);
return (((_v297)[2] === "") ? _v298 : [["B", ((_v297)[2] + body_16((_v298)[0]))], (_v298)[1]]);
} else {
if ((_v295 === "block")) {
return evalStmts_53(((_v293)[1]).concat(_v294), ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
} else {
if ((_v295 === "if")) {
var _v299 = evalExpr_100((_v293)[1], ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
var _v300 = ([(_v293)[2]]).concat(_v294);
var _v301 = (((_v293)[3] === null) ? _v294 : ([(_v293)[3]]).concat(_v294));
if (isS_52((_v299)[0])) {
return (((_v299)[0])[1] ? evalStmts_53(_v300, ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v299)[1], p3) : evalStmts_53(_v301, ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v299)[1], p3));
} else {
var _v302 = evalStmts_53(_v300, ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v299)[1], p3);
var _v303 = evalStmts_53(_v301, ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v302)[1], p3);
return ((!(isB_15((_v302)[0])) && !(isB_15((_v303)[0]))) ? [D_4((((((("(" + lift_7((_v299)[0])) + " ? ") + lift_7((_v302)[0])) + " : ") + lift_7((_v303)[0])) + ")")), (_v303)[1]] : [["B", (((((("if (" + lift_7((_v299)[0])) + ") {\n") + body_16((_v302)[0])) + "} else {\n") + body_16((_v303)[0])) + "}\n")], (_v303)[1]]);
}
} else {
return evalStmts_53(_v294, ((((p0)[2]).length === 0) ? [] : bindAll_37(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
}
}
}
}
}
}
function residualCall_243(p0, p1, p2, p3) {
var _v306 = (((p1).length === 0) ? [] : ([skel_305((p1)[0])]).concat(skels_304((p1).slice(1))));
var _v307 = (((p0)[1] + ":") + str(_v306));
var _v309 = ((((p2)[0]).length === 0) ? null : (((((p2)[0])[0])[0] === _v307) ? (((p2)[0])[0])[1] : memoFind_308(((p2)[0]).slice(1), _v307)));
var _v312 = (("(" + ((((((p1).length === 0) ? [] : (dynLeavesOf_311((p1)[0])).concat(dynLeaves_310((p1).slice(1))))).length === 0) ? "" : ((((((p1).length === 0) ? [] : (dynLeavesOf_311((p1)[0])).concat(dynLeaves_310((p1).slice(1))))).length === 1) ? ((((p1).length === 0) ? [] : (dynLeavesOf_311((p1)[0])).concat(dynLeaves_310((p1).slice(1)))))[0] : ((((((p1).length === 0) ? [] : (dynLeavesOf_311((p1)[0])).concat(dynLeaves_310((p1).slice(1)))))[0] + ", ") + joinStrs_28(((((p1).length === 0) ? [] : (dynLeavesOf_311((p1)[0])).concat(dynLeaves_310((p1).slice(1))))).slice(1)))))) + ")");
if ((_v309 !== null)) {
return [D_4((_v309 + _v312)), p2];
} else {
var _v315 = smallerAncestor_314(p3, (p0)[1], sizeOfSkels_313(_v306));
if ((_v315 !== null)) {
var _v317 = generalizeList_316(p1, (_v315)[1]);
if ((str(skels_304(_v317)) !== str(_v306))) {
return residualCall_243(p0, _v317, p2, p3);
} else {
if (((countFor_318((p2)[0], ((p0)[1] + ":")) >= 64) && !(allDynamic_319(p1)))) {
return residualCall_243(p0, liftAll_320(p1), p2, p3);
} else {
var _v321 = (((p0)[1] + "_") + (p2)[2]);
var _v322 = (p3).concat([[(p0)[1], _v306]]);
return [D_4((_v321 + _v312)), [([[_v307, _v321]]).concat((p2)[0]), ((p2)[1]).concat([[_v321, p0, _v306, _v322]]), ((p2)[2] + 1)]];
}
}
} else {
if (((countFor_318((p2)[0], ((p0)[1] + ":")) >= 64) && !(allDynamic_319(p1)))) {
return residualCall_243(p0, liftAll_320(p1), p2, p3);
} else {
var _v323 = (((p0)[1] + "_") + (p2)[2]);
var _v324 = (p3).concat([[(p0)[1], _v306]]);
return [D_4((_v323 + _v312)), [([[_v307, _v323]]).concat((p2)[0]), ((p2)[1]).concat([[_v323, p0, _v306, _v324]]), ((p2)[2] + 1)]];
}
}
}
}
function paramNames_244(p0) {
return ((3 >= p0) ? [] : (["p3"]).concat(paramNames_325(p0)));
}
function skels_304(p0) {
return (((p0).length === 0) ? [] : ([skel_305((p0)[0])]).concat(skels_304((p0).slice(1))));
}
function skel_305(p0) {
return (((p0)[0] === "S") ? ["S", (p0)[1]] : (isD_31(p0) ? ["D"] : ["A", skels_304((p0)[1])]));
}
function memoFind_308(p0, p1) {
return (((p0).length === 0) ? null : ((((p0)[0])[0] === p1) ? ((p0)[0])[1] : memoFind_308((p0).slice(1), p1)));
}
function dynLeaves_310(p0) {
return (((p0).length === 0) ? [] : (dynLeavesOf_311((p0)[0])).concat(dynLeaves_310((p0).slice(1))));
}
function dynLeavesOf_311(p0) {
return (((p0)[0] === "S") ? [] : (isD_31(p0) ? [(p0)[1]] : dynLeaves_310((p0)[1])));
}
function sizeOfSkels_313(p0) {
return (((p0).length === 0) ? 0 : (sizeOfSkel_326((p0)[0]) + sizeOfSkels_313((p0).slice(1))));
}
function smallerAncestor_314(p0, p1, p2) {
if (((p0).length === 0)) {
return null;
} else {
var _v327 = (p0)[((p0).length - 1)];
return ((((_v327)[0] === p1) && (sizeOfSkels_313((_v327)[1]) < p2)) ? _v327 : smallerAncestor_314((p0).slice(0, ((p0).length - 1)), p1, p2));
}
}
function generalizeList_316(p0, p1) {
return (((p0).length === 0) ? [] : ([generalize_328((p0)[0], (p1)[0])]).concat(generalizeList_316((p0).slice(1), (p1).slice(1))));
}
function countFor_318(p0, p1) {
return (((p0).length === 0) ? 0 : ((startsWith_329(((p0)[0])[0], p1) ? 1 : 0) + countFor_318((p0).slice(1), p1)));
}
function allDynamic_319(p0) {
return (((p0).length === 0) ? true : (isD_31((p0)[0]) && allDynamic_319((p0).slice(1))));
}
function liftAll_320(p0) {
return (((p0).length === 0) ? [] : ([D_4(lift_7((p0)[0]))]).concat(liftAll_320((p0).slice(1))));
}
function paramNames_325(p0) {
return ((4 >= p0) ? [] : (["p4"]).concat(paramNames_330(p0)));
}
function sizeOfSkel_326(p0) {
return (((p0)[0] === "S") ? sizeOfData_331((p0)[1]) : (((p0)[0] === "D") ? 1 : (1 + sizeOfSkels_313((p0)[1]))));
}
function generalize_328(p0, p1) {
if ((str((((p0)[0] === "S") ? ["S", (p0)[1]] : (isD_31(p0) ? ["D"] : ["A", skels_304((p0)[1])]))) === str(p1))) {
return p0;
} else {
var _v332 = elems_165(p0);
return ((((_v332 !== null) && ((p1)[0] === "A")) && ((_v332).length === ((p1)[1]).length)) ? mkArr_65(generalizeList_316(_v332, (p1)[1])) : (((((_v332 !== null) && ((p1)[0] === "S")) && isArr((p1)[1])) && ((_v332).length === ((p1)[1]).length)) ? mkArr_65(generalizeList_316(_v332, skels_304(elemsOfStatic_169((p1)[1])))) : D_4(lift_7(p0))));
}
}
function startsWith_329(p0, p1) {
return ((p0).slice(0, (p1).length) === p1);
}
function paramNames_330(p0) {
return ((5 >= p0) ? [] : (["p5"]).concat(paramNames_333(p0)));
}
function sizeOfData_331(p0) {
return (isArr(p0) ? (1 + sizeOfList_334(p0)) : 1);
}
function paramNames_333(p0) {
return ((6 >= p0) ? [] : (["p6"]).concat(paramNames_335(p0)));
}
function sizeOfList_334(p0) {
return (((p0).length === 0) ? 0 : (sizeOfData_331((p0)[0]) + sizeOfList_334((p0).slice(1))));
}
function paramNames_335(p0) {
return ((7 >= p0) ? [] : (["p7"]).concat(paramNames_336(p0)));
}
function paramNames_336(p0) {
return ((8 >= p0) ? [] : (["p8"]).concat(paramNames_337(p0)));
}
function paramNames_337(p0) {
return ((9 >= p0) ? [] : (["p9"]).concat(paramNames_338(p0)));
}
function paramNames_338(p0) {
return ((10 >= p0) ? [] : (["p10"]).concat(paramNames_339(p0)));
}
function paramNames_339(p0) {
return ((11 >= p0) ? [] : (["p11"]).concat(paramNames_340(p0)));
}
function paramNames_340(p0) {
return ((12 >= p0) ? [] : (["p12"]).concat(paramNames_341(p0)));
}
function paramNames_341(p0) {
return ((13 >= p0) ? [] : (["p13"]).concat(paramNames_342(p0)));
}
function paramNames_342(p0) {
return ((14 >= p0) ? [] : (["p14"]).concat(paramNames_343(p0)));
}
function paramNames_343(p0) {
return ((15 >= p0) ? [] : (["p15"]).concat(paramNames_344(p0)));
}
function paramNames_344(p0) {
return ((16 >= p0) ? [] : (["p16"]).concat(paramNames_345(p0)));
}
function paramNames_345(p0) {
return ((17 >= p0) ? [] : (["p17"]).concat(paramNames_346(p0)));
}
function paramNames_346(p0) {
return ((18 >= p0) ? [] : (["p18"]).concat(paramNames_347(p0)));
}
function paramNames_347(p0) {
return ((19 >= p0) ? [] : (["p19"]).concat(paramNames_348(p0)));
}
function paramNames_348(p0) {
return ((20 >= p0) ? [] : (["p20"]).concat(paramNames_349(p0)));
}
function paramNames_349(p0) {
return ((21 >= p0) ? [] : (["p21"]).concat(paramNames_350(p0)));
}
function paramNames_350(p0) {
return ((22 >= p0) ? [] : (["p22"]).concat(paramNames_351(p0)));
}
function paramNames_351(p0) {
return ((23 >= p0) ? [] : (["p23"]).concat(paramNames_352(p0)));
}
function paramNames_352(p0) {
return ((24 >= p0) ? [] : (["p24"]).concat(paramNames_353(p0)));
}
function paramNames_353(p0) {
return ((25 >= p0) ? [] : (["p25"]).concat(paramNames_354(p0)));
}
function paramNames_354(p0) {
return ((26 >= p0) ? [] : (["p26"]).concat(paramNames_355(p0)));
}
function paramNames_355(p0) {
return ((27 >= p0) ? [] : (["p27"]).concat(paramNames_356(p0)));
}
function paramNames_356(p0) {
return ((28 >= p0) ? [] : (["p28"]).concat(paramNames_357(p0)));
}
function paramNames_357(p0) {
return ((29 >= p0) ? [] : (["p29"]).concat(paramNames_358(p0)));
}
function paramNames_358(p0) {
return ((30 >= p0) ? [] : (["p30"]).concat(paramNames_359(p0)));
}
function paramNames_359(p0) {
return ((31 >= p0) ? [] : (["p31"]).concat(paramNames_360(p0)));
}
function paramNames_360(p0) {
return ((32 >= p0) ? [] : (["p32"]).concat(paramNames_361(p0)));
}
function paramNames_361(p0) {
return ((33 >= p0) ? [] : (["p33"]).concat(paramNames_362(p0)));
}
function paramNames_362(p0) {
return ((34 >= p0) ? [] : (["p34"]).concat(paramNames_363(p0)));
}
function paramNames_363(p0) {
return ((35 >= p0) ? [] : (["p35"]).concat(paramNames_364(p0)));
}
function paramNames_364(p0) {
return ((36 >= p0) ? [] : (["p36"]).concat(paramNames_365(p0)));
}
function paramNames_365(p0) {
return ((37 >= p0) ? [] : (["p37"]).concat(paramNames_366(p0)));
}
function paramNames_366(p0) {
return ((38 >= p0) ? [] : (["p38"]).concat(paramNames_367(p0)));
}
function paramNames_367(p0) {
return ((39 >= p0) ? [] : (["p39"]).concat(paramNames_368(p0)));
}
function paramNames_368(p0) {
return ((40 >= p0) ? [] : (["p40"]).concat(paramNames_369(p0)));
}
function paramNames_369(p0) {
return ((41 >= p0) ? [] : (["p41"]).concat(paramNames_370(p0)));
}
function paramNames_370(p0) {
return ((42 >= p0) ? [] : (["p42"]).concat(paramNames_371(p0)));
}
function paramNames_371(p0) {
return ((43 >= p0) ? [] : (["p43"]).concat(paramNames_372(p0)));
}
function paramNames_372(p0) {
return ((44 >= p0) ? [] : (["p44"]).concat(paramNames_373(p0)));
}
function paramNames_373(p0) {
return ((45 >= p0) ? [] : (["p45"]).concat(paramNames_374(p0)));
}
function paramNames_374(p0) {
return ((46 >= p0) ? [] : (["p46"]).concat(paramNames_375(p0)));
}
function paramNames_375(p0) {
return ((47 >= p0) ? [] : (["p47"]).concat(paramNames_376(p0)));
}
function paramNames_376(p0) {
return ((48 >= p0) ? [] : (["p48"]).concat(paramNames_377(p0)));
}
function paramNames_377(p0) {
return ((49 >= p0) ? [] : (["p49"]).concat(paramNames_378(p0)));
}
function paramNames_378(p0) {
return ((50 >= p0) ? [] : (["p50"]).concat(paramNames_379(p0)));
}
function paramNames_379(p0) {
return ((51 >= p0) ? [] : (["p51"]).concat(paramNames_380(p0)));
}
function paramNames_380(p0) {
return ((52 >= p0) ? [] : (["p52"]).concat(paramNames_381(p0)));
}
function paramNames_381(p0) {
return ((53 >= p0) ? [] : (["p53"]).concat(paramNames_382(p0)));
}
function paramNames_382(p0) {
return ((54 >= p0) ? [] : (["p54"]).concat(paramNames_383(p0)));
}
function paramNames_383(p0) {
return ((55 >= p0) ? [] : (["p55"]).concat(paramNames_384(p0)));
}
function paramNames_384(p0) {
return ((56 >= p0) ? [] : (["p56"]).concat(paramNames_385(p0)));
}
function paramNames_385(p0) {
return ((57 >= p0) ? [] : (["p57"]).concat(paramNames_386(p0)));
}
function paramNames_386(p0) {
return ((58 >= p0) ? [] : (["p58"]).concat(paramNames_387(p0)));
}
function paramNames_387(p0) {
return ((59 >= p0) ? [] : (["p59"]).concat(paramNames_388(p0)));
}
function paramNames_388(p0) {
return ((60 >= p0) ? [] : (["p60"]).concat(paramNames_389(p0)));
}
function paramNames_389(p0) {
return ((61 >= p0) ? [] : (["p61"]).concat(paramNames_390(p0)));
}
function paramNames_390(p0) {
return ((62 >= p0) ? [] : (["p62"]).concat(paramNames_391(p0)));
}
function paramNames_391(p0) {
return ((63 >= p0) ? [] : (["p63"]).concat(paramNames_392(p0, 64)));
}
function paramNames_392(p0, p1) {
return ((p1 >= p0) ? [] : ([("p" + p1)]).concat(paramNames_392(p0, (p1 + 1))));
}

function main(program){return generatedCompiler(program);}
