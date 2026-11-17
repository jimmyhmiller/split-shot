// Host builtins available to jsmix2, to the programs it specializes, and to the
// residual programs it emits.
function str(v) { return JSON.stringify(v); }
function isArr(v) { return Array.isArray(v); }
function kind(v) { return v === null ? "null" : Array.isArray(v) ? "array" : typeof v; }
function fail(msg) { throw new Error(msg); }


function generatedCompiler(input) {
var _v17 = (function () {
var _v8 = (function () {
var _v5 = (((kind(input) === "array") || (kind(input) === "string")) ? S_0((input).length) : (isA_1(input) ? S_0((input).length) : D_4((paren_3(lift_2(input)) + ".length"))));
return [((((_v5)[0] === "S") && true) ? S_0(applyOp_6((_v5)[1])) : D_4((((((("(" + lift_7(_v5)) + " ") + "===") + " ") + "0") + ")"))), [[],[],0]];
})();
if ((((_v8)[0])[0] === "S")) {
return (((_v8)[0])[1] ? evalStmts_9(input, (_v8)[1]) : evalStmts_10(input, (_v8)[1]));
} else {
var _v12 = evalStmts_11(input, (_v8)[1]);
var _v14 = evalStmts_13(input, (_v12)[1]);
return ((!(isB_15((_v12)[0])) && !(isB_15((_v14)[0]))) ? [D_4((((((("(" + lift_7((_v8)[0])) + " ? ") + lift_7((_v12)[0])) + " : ") + lift_7((_v14)[0])) + ")")), (_v14)[1]] : [["B", (((((("if (" + lift_7((_v8)[0])) + ") {\n") + body_16((_v12)[0])) + "} else {\n") + body_16((_v14)[0])) + "}\n")], (_v14)[1]]);
}
})();
var _v18 = (("function main(x) {\n" + ((((_v17)[0])[0] === "B") ? ((_v17)[0])[1] : (("return " + lift_7((_v17)[0])) + ";\n"))) + "}\n");
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
return (p0 === 0);
}
function lift_7(p0) {
return (((p0)[0] === "S") ? str((p0)[1]) : (isD_31(p0) ? (p0)[1] : (("[" + joinCodes_32((p0)[1])) + "]")));
}
function evalStmts_9(p0, p1) {
return [["S",0], p1];
}
function evalStmts_10(p0, p1) {
var _v33 = (((kind(p0) === "array") || (kind(p0) === "string")) ? S_0((p0)[0]) : ((isA_1(p0) && true) ? (p0)[0] : D_4((((paren_3(lift_2(p0)) + "[") + "0") + "]"))));
var _v39 = (function () {
if (((_v33)[0] === "S")) {
return [_v33, p1, ""];
} else {
if (isD_31(_v33)) {
if (isAtom_34((_v33)[1])) {
return [_v33, p1, ""];
} else {
var _v35 = ("_v" + (p1)[2]);
return [D_4(_v35), [(p1)[0], (p1)[1], ((p1)[2] + 1)], (((("var " + _v35) + " = ") + (_v33)[1]) + ";\n")];
}
} else {
var _v37 = nameLeavesList_36((_v33)[1], p1);
return [mkArr_38((_v37)[0]), (_v37)[1], (_v37)[2]];
}
}
})();
var _v89 = (function () {
var _v44 = (function () {
var _v40 = (_v39)[0];
var _v41 = (_v39)[1];
return [(((((_v40)[0] === "S") && true) && indexable_42((_v40)[1])) ? S_0(((_v40)[1])[0]) : ((isA_43(_v40) && true) ? ((_v40)[1])[0] : D_4((((paren_3(lift_7(_v40)) + "[") + "0") + "]")))), _v41];
})();
var _v47 = (function () {
if ((((_v44)[0])[0] === "S")) {
return [(_v44)[0], (_v44)[1], ""];
} else {
if (isD_31((_v44)[0])) {
if (isAtom_34(((_v44)[0])[1])) {
return [(_v44)[0], (_v44)[1], ""];
} else {
var _v45 = ("_v" + ((_v44)[1])[2]);
return [D_4(_v45), [((_v44)[1])[0], ((_v44)[1])[1], (((_v44)[1])[2] + 1)], (((("var " + _v45) + " = ") + ((_v44)[0])[1]) + ";\n")];
}
} else {
var _v46 = nameLeavesList_36(((_v44)[0])[1], (_v44)[1]);
return [mkArr_38((_v46)[0]), (_v46)[1], (_v46)[2]];
}
}
})();
var _v88 = (function () {
var _v58 = (function () {
var _v51 = (function () {
var _v48 = (_v47)[0];
var _v49 = (_v47)[1];
return [((((_v48)[0] === "S") && true) ? S_0(applyOp_50((_v48)[1])) : D_4((((((("(" + lift_7(_v48)) + " ") + "===") + " ") + "\"addlit\"") + ")"))), _v49];
})();
if ((((_v51)[0])[0] === "S")) {
return (((_v51)[0])[1] ? evalExpr_52((_v47)[0], (_v39)[0], p0, (_v51)[1]) : evalExpr_53((_v47)[0], (_v39)[0], p0, (_v51)[1]));
} else {
var _v55 = evalExpr_54((_v47)[0], (_v39)[0], p0, (_v51)[1]);
var _v57 = evalExpr_56((_v47)[0], (_v39)[0], p0, (_v55)[1]);
return [D_4((((((("(" + lift_7((_v51)[0])) + " ? ") + lift_7((_v55)[0])) + " : ") + lift_7((_v57)[0])) + ")")), (_v57)[1]];
}
})();
var _v61 = (function () {
if ((((_v58)[0])[0] === "S")) {
return [(_v58)[0], (_v58)[1], ""];
} else {
if (isD_31((_v58)[0])) {
if (isAtom_34(((_v58)[0])[1])) {
return [(_v58)[0], (_v58)[1], ""];
} else {
var _v59 = ("_v" + ((_v58)[1])[2]);
return [D_4(_v59), [((_v58)[1])[0], ((_v58)[1])[1], (((_v58)[1])[2] + 1)], (((("var " + _v59) + " = ") + ((_v58)[0])[1]) + ";\n")];
}
} else {
var _v60 = nameLeavesList_36(((_v58)[0])[1], (_v58)[1]);
return [mkArr_38((_v60)[0]), (_v60)[1], (_v60)[2]];
}
}
})();
var _v87 = (function () {
var _v74 = (function () {
var _v70 = (function () {
var _v69 = (function () {
var _v63 = (function () {
var _v62 = (_v61)[1];
return [[["S",1]], _v62];
})();
var _v64 = (_v63)[0];
var _v65 = (_v63)[1];
return [(((_v64).length === 1) ? (((isS_66(p0) && isS_67((_v64)[0])) && indexable_42(p0)) ? S_0((p0).slice(((_v64)[0])[1])) : ((isA_1(p0) && isS_67((_v64)[0])) ? mkArr_38((p0).slice(((_v64)[0])[1])) : D_4((((paren_3(lift_2(p0)) + ".slice(") + lift_7((_v64)[0])) + ")")))) : (((_v64).length === 2) ? (((isS_66(p0) && allStatic_68(_v64)) && indexable_42(p0)) ? S_0((p0).slice(((_v64)[0])[1], ((_v64)[1])[1])) : ((isA_1(p0) && allStatic_68(_v64)) ? mkArr_38((p0).slice(((_v64)[0])[1], ((_v64)[1])[1])) : D_4((((paren_3(lift_2(p0)) + ".slice(") + joinCodes_32(_v64)) + ")")))) : fail(("jsmix2: slice takes 1 or 2 arguments, got " + str((_v64).length))))), _v65];
})();
return [((((_v69)[0])[0] === "B") ? D_4((("(function () {\n" + ((_v69)[0])[1]) + "})()")) : (_v69)[0]), (_v69)[1]];
})();
var _v73 = (function () {
var _v71 = (_v61)[0];
var _v72 = (_v70)[1];
return [[_v71, ["D","x"]], _v72];
})();
return [([(_v70)[0]]).concat((_v73)[0]), (_v73)[1]];
})();
var _v75 = (_v74)[0];
var _v76 = (_v74)[1];
var _v80 = (function () {
var _v78 = (function () {
var _v77 = (_v75)[0];
return [((((_v77)[0] === "S") && indexable_42((_v77)[1])) ? S_0(((_v77)[1]).length) : (isA_43(_v77) ? S_0(((_v77)[1]).length) : D_4((paren_3(lift_7(_v77)) + ".length")))), _v76];
})();
var _v79 = (_v78)[1];
return [(((((_v78)[0])[0] === "S") && true) ? S_0(applyOp_6(((_v78)[0])[1])) : D_4((((((("(" + lift_7((_v78)[0])) + " ") + "===") + " ") + "0") + ")"))), _v79];
})();
if ((((_v80)[0])[0] === "S")) {
return (((_v80)[0])[1] ? evalStmts_81([["block",[["return",["var","acc"]]]],["var","ins",["idx",["var","prog"],["lit",0]]],["var","op",["idx",["var","ins"],["lit",0]]],["var","next",["cond",["bin","===",["var","op"],["lit","addlit"]],["bin","+",["var","acc"],["idx",["var","ins"],["lit",1]]],["cond",["bin","===",["var","op"],["lit","mullit"]],["bin","*",["var","acc"],["idx",["var","ins"],["lit",1]]],["cond",["bin","===",["var","op"],["lit","addin"]],["bin","+",["var","acc"],["var","x"]],["cond",["bin","===",["var","op"],["lit","subin"]],["bin","-",["var","acc"],["var","x"]],["var","acc"]]]]]],["return",["call",["var","run"],[["call",["dot",["var","prog"],"slice"],[["lit",1]]],["var","next"],["var","x"]]]]], (((_v75).slice(1)).slice(1))[0], ((_v75).slice(1))[0], (_v75)[0], (_v80)[1]) : evalStmts_82((((_v75).slice(1)).slice(1))[0], ((_v75).slice(1))[0], (_v75)[0], (_v80)[1]));
} else {
var _v84 = evalStmts_83([["block",[["return",["var","acc"]]]],["var","ins",["idx",["var","prog"],["lit",0]]],["var","op",["idx",["var","ins"],["lit",0]]],["var","next",["cond",["bin","===",["var","op"],["lit","addlit"]],["bin","+",["var","acc"],["idx",["var","ins"],["lit",1]]],["cond",["bin","===",["var","op"],["lit","mullit"]],["bin","*",["var","acc"],["idx",["var","ins"],["lit",1]]],["cond",["bin","===",["var","op"],["lit","addin"]],["bin","+",["var","acc"],["var","x"]],["cond",["bin","===",["var","op"],["lit","subin"]],["bin","-",["var","acc"],["var","x"]],["var","acc"]]]]]],["return",["call",["var","run"],[["call",["dot",["var","prog"],"slice"],[["lit",1]]],["var","next"],["var","x"]]]]], (((_v75).slice(1)).slice(1))[0], ((_v75).slice(1))[0], (_v75)[0], (_v80)[1], true);
var _v86 = evalStmts_85((((_v75).slice(1)).slice(1))[0], ((_v75).slice(1))[0], (_v75)[0], (_v84)[1]);
return ((!(isB_15((_v84)[0])) && !(isB_15((_v86)[0]))) ? [D_4((((((("(" + lift_7((_v80)[0])) + " ? ") + lift_7((_v84)[0])) + " : ") + lift_7((_v86)[0])) + ")")), (_v86)[1]] : [["B", (((((("if (" + lift_7((_v80)[0])) + ") {\n") + body_16((_v84)[0])) + "} else {\n") + body_16((_v86)[0])) + "}\n")], (_v86)[1]]);
}
})();
return (((_v61)[2] === "") ? _v87 : [["B", ((_v61)[2] + body_16((_v87)[0]))], (_v87)[1]]);
})();
return (((_v47)[2] === "") ? _v88 : [["B", ((_v47)[2] + body_16((_v88)[0]))], (_v88)[1]]);
})();
return (((_v39)[2] === "") ? _v89 : [["B", ((_v39)[2] + body_16((_v89)[0]))], (_v89)[1]]);
}
function evalStmts_11(p0, p1) {
return [["S",0], p1];
}
function evalStmts_13(p0, p1) {
var _v90 = (((kind(p0) === "array") || (kind(p0) === "string")) ? S_0((p0)[0]) : ((isA_1(p0) && true) ? (p0)[0] : D_4((((paren_3(lift_2(p0)) + "[") + "0") + "]"))));
var _v93 = (function () {
if (((_v90)[0] === "S")) {
return [_v90, p1, ""];
} else {
if (isD_31(_v90)) {
if (isAtom_34((_v90)[1])) {
return [_v90, p1, ""];
} else {
var _v91 = ("_v" + (p1)[2]);
return [D_4(_v91), [(p1)[0], (p1)[1], ((p1)[2] + 1)], (((("var " + _v91) + " = ") + (_v90)[1]) + ";\n")];
}
} else {
var _v92 = nameLeavesList_36((_v90)[1], p1);
return [mkArr_38((_v92)[0]), (_v92)[1], (_v92)[2]];
}
}
})();
var _v125 = (function () {
var _v96 = (function () {
var _v94 = (_v93)[0];
var _v95 = (_v93)[1];
return [(((((_v94)[0] === "S") && true) && indexable_42((_v94)[1])) ? S_0(((_v94)[1])[0]) : ((isA_43(_v94) && true) ? ((_v94)[1])[0] : D_4((((paren_3(lift_7(_v94)) + "[") + "0") + "]")))), _v95];
})();
var _v99 = (function () {
if ((((_v96)[0])[0] === "S")) {
return [(_v96)[0], (_v96)[1], ""];
} else {
if (isD_31((_v96)[0])) {
if (isAtom_34(((_v96)[0])[1])) {
return [(_v96)[0], (_v96)[1], ""];
} else {
var _v97 = ("_v" + ((_v96)[1])[2]);
return [D_4(_v97), [((_v96)[1])[0], ((_v96)[1])[1], (((_v96)[1])[2] + 1)], (((("var " + _v97) + " = ") + ((_v96)[0])[1]) + ";\n")];
}
} else {
var _v98 = nameLeavesList_36(((_v96)[0])[1], (_v96)[1]);
return [mkArr_38((_v98)[0]), (_v98)[1], (_v98)[2]];
}
}
})();
var _v124 = (function () {
var _v105 = (function () {
var _v102 = (function () {
var _v100 = (_v99)[0];
var _v101 = (_v99)[1];
return [((((_v100)[0] === "S") && true) ? S_0(applyOp_50((_v100)[1])) : D_4((((((("(" + lift_7(_v100)) + " ") + "===") + " ") + "\"addlit\"") + ")"))), _v101];
})();
if ((((_v102)[0])[0] === "S")) {
return (((_v102)[0])[1] ? evalExpr_54((_v99)[0], (_v93)[0], p0, (_v102)[1]) : evalExpr_56((_v99)[0], (_v93)[0], p0, (_v102)[1]));
} else {
var _v103 = evalExpr_54((_v99)[0], (_v93)[0], p0, (_v102)[1]);
var _v104 = evalExpr_56((_v99)[0], (_v93)[0], p0, (_v103)[1]);
return [D_4((((((("(" + lift_7((_v102)[0])) + " ? ") + lift_7((_v103)[0])) + " : ") + lift_7((_v104)[0])) + ")")), (_v104)[1]];
}
})();
var _v108 = (function () {
if ((((_v105)[0])[0] === "S")) {
return [(_v105)[0], (_v105)[1], ""];
} else {
if (isD_31((_v105)[0])) {
if (isAtom_34(((_v105)[0])[1])) {
return [(_v105)[0], (_v105)[1], ""];
} else {
var _v106 = ("_v" + ((_v105)[1])[2]);
return [D_4(_v106), [((_v105)[1])[0], ((_v105)[1])[1], (((_v105)[1])[2] + 1)], (((("var " + _v106) + " = ") + ((_v105)[0])[1]) + ";\n")];
}
} else {
var _v107 = nameLeavesList_36(((_v105)[0])[1], (_v105)[1]);
return [mkArr_38((_v107)[0]), (_v107)[1], (_v107)[2]];
}
}
})();
var _v123 = (function () {
var _v118 = (function () {
var _v114 = (function () {
var _v113 = (function () {
var _v110 = (function () {
var _v109 = (_v108)[1];
return [[["S",1]], _v109];
})();
var _v111 = (_v110)[0];
var _v112 = (_v110)[1];
return [(((_v111).length === 1) ? (((isS_66(p0) && isS_67((_v111)[0])) && indexable_42(p0)) ? S_0((p0).slice(((_v111)[0])[1])) : ((isA_1(p0) && isS_67((_v111)[0])) ? mkArr_38((p0).slice(((_v111)[0])[1])) : D_4((((paren_3(lift_2(p0)) + ".slice(") + lift_7((_v111)[0])) + ")")))) : (((_v111).length === 2) ? (((isS_66(p0) && allStatic_68(_v111)) && indexable_42(p0)) ? S_0((p0).slice(((_v111)[0])[1], ((_v111)[1])[1])) : ((isA_1(p0) && allStatic_68(_v111)) ? mkArr_38((p0).slice(((_v111)[0])[1], ((_v111)[1])[1])) : D_4((((paren_3(lift_2(p0)) + ".slice(") + joinCodes_32(_v111)) + ")")))) : fail(("jsmix2: slice takes 1 or 2 arguments, got " + str((_v111).length))))), _v112];
})();
return [((((_v113)[0])[0] === "B") ? D_4((("(function () {\n" + ((_v113)[0])[1]) + "})()")) : (_v113)[0]), (_v113)[1]];
})();
var _v117 = (function () {
var _v115 = (_v108)[0];
var _v116 = (_v114)[1];
return [[_v115, ["D","x"]], _v116];
})();
return [([(_v114)[0]]).concat((_v117)[0]), (_v117)[1]];
})();
var _v119 = (_v118)[0];
var _v120 = (_v118)[1];
return ((((_v119).length === 0) ? true : (isS_67((_v119)[0]) && allStatic_68((_v119).slice(1)))) ? unfold_121(_v119, _v120) : residualCall_122(_v119, _v120));
})();
return (((_v108)[2] === "") ? _v123 : [["B", ((_v108)[2] + body_16((_v123)[0]))], (_v123)[1]]);
})();
return (((_v99)[2] === "") ? _v124 : [["B", ((_v99)[2] + body_16((_v124)[0]))], (_v124)[1]]);
})();
return (((_v93)[2] === "") ? _v125 : [["B", ((_v93)[2] + body_16((_v125)[0]))], (_v125)[1]]);
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
var _v127 = rebuild_126((p0)[0]);
var _v129 = rebuildList_128((p0).slice(1), (_v127)[1]);
return [([(_v127)[0]]).concat((_v129)[0]), (_v129)[1]];
}
}
function unfold_25(p0, p1, p2, p3, p4, p5) {
if ((((p0)[3]).length === 0)) {
return [["S",null], [p2, p3, p4]];
} else {
var _v131 = ((p0)[3])[0];
var _v132 = ((p0)[3]).slice(1);
var _v133 = (_v131)[0];
if ((_v133 === "return")) {
return ((((_v131)[1])[0] === "call") ? evalCallStmt_134((_v131)[1], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3, p4, p5) : evalExpr_135((_v131)[1], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3, p4, p5));
} else {
if ((_v133 === "var")) {
var _v136 = evalExpr_135((_v131)[2], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3, p4, p5);
var _v138 = nameLeaves_137((_v136)[0], (_v136)[1]);
var _v140 = evalStmts_139(_v132, ([[(_v131)[1], (_v138)[0]]]).concat(((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0]))), (_v138)[1], p5);
return (((_v138)[2] === "") ? _v140 : [["B", ((_v138)[2] + body_16((_v140)[0]))], (_v140)[1]]);
} else {
if ((_v133 === "block")) {
return evalStmts_141(((_v131)[1]).concat(_v132), ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3, p4, p5);
} else {
if ((_v133 === "if")) {
var _v142 = evalExpr_135((_v131)[1], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3, p4, p5);
var _v143 = ([(_v131)[2]]).concat(_v132);
var _v144 = (((_v131)[3] === null) ? _v132 : ([(_v131)[3]]).concat(_v132));
if (isS_67((_v142)[0])) {
return (((_v142)[0])[1] ? evalStmts_139(_v143, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v142)[1], p5) : evalStmts_139(_v144, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v142)[1], p5));
} else {
var _v146 = evalStmts_145(_v143, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v142)[1], p5);
var _v147 = evalStmts_145(_v144, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v146)[1], p5);
return ((!(isB_15((_v146)[0])) && !(isB_15((_v147)[0]))) ? [D_4((((((("(" + lift_7((_v142)[0])) + " ? ") + lift_7((_v146)[0])) + " : ") + lift_7((_v147)[0])) + ")")), (_v147)[1]] : [["B", (((((("if (" + lift_7((_v142)[0])) + ") {\n") + body_16((_v146)[0])) + "} else {\n") + body_16((_v147)[0])) + "}\n")], (_v147)[1]]);
}
} else {
return evalStmts_141(_v132, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3, p4, p5);
}
}
}
}
}
}
function paramNames_27(p0) {
return ((0 >= p0) ? [] : (["p0"]).concat(paramNames_148(p0)));
}
function joinStrs_28(p0) {
return (((p0).length === 0) ? "" : (((p0).length === 1) ? (p0)[0] : (((p0)[0] + ", ") + joinStrs_28((p0).slice(1)))));
}
function specializePending_30(p0, p1) {
if ((((p0)[1]).length === 0)) {
return p1;
} else {
var _v149 = ((p0)[1])[0];
var _v150 = (p0)[0];
var _v151 = ((p0)[1]).slice(1);
var _v152 = (p0)[2];
var _v153 = rebuildList_23((_v149)[2]);
var _v154 = unfold_25((_v149)[1], (_v153)[0], _v150, _v151, _v152, (_v149)[3]);
var _v155 = (((((("function " + (_v149)[0]) + "(") + joinStrs_28(paramNames_27((_v153)[1]))) + ") {\n") + body_16((_v154)[0])) + "}\n");
return specializePending_30((_v154)[1], (p1 + _v155));
}
}
function isD_31(p0) {
return ((p0)[0] === "D");
}
function joinCodes_32(p0) {
return (((p0).length === 0) ? "" : (((p0).length === 1) ? lift_7((p0)[0]) : ((lift_7((p0)[0]) + ", ") + joinCodes_32((p0).slice(1)))));
}
function isAtom_34(p0) {
return ((((p0).indexOf(" ") < 0) && ((p0).indexOf("(") < 0)) && ((p0).indexOf("[") < 0));
}
function nameLeavesList_36(p0, p1) {
if (((p0).length === 0)) {
return [[], p1, ""];
} else {
var _v156 = nameLeaves_137((p0)[0], p1);
var _v157 = nameLeavesList_36((p0).slice(1), (_v156)[1]);
return [([(_v156)[0]]).concat((_v157)[0]), (_v157)[1], ((_v156)[2] + (_v157)[2])];
}
}
function mkArr_38(p0) {
return ((((p0).length === 0) ? true : (isS_67((p0)[0]) && allStatic_68((p0).slice(1)))) ? S_0(staticsOf_158(p0)) : ["A", p0]);
}
function indexable_42(p0) {
return ((kind(p0) === "array") || (kind(p0) === "string"));
}
function isA_43(p0) {
return ((p0)[0] === "A");
}
function applyOp_50(p0) {
return (p0 === "addlit");
}
function evalExpr_52(p0, p1, p2, p3) {
var _v159 = (((((p1)[0] === "S") && true) && indexable_42((p1)[1])) ? S_0(((p1)[1])[1]) : ((isA_43(p1) && true) ? ((p1)[1])[1] : D_4((((paren_3(lift_7(p1)) + "[") + "1") + "]"))));
return [(((_v159)[0] === "S") ? S_0(applyOp_160((_v159)[1])) : D_4((("(0 + " + lift_7(_v159)) + ")"))), p3];
}
function evalExpr_53(p0, p1, p2, p3) {
var _v162 = ((((p0)[0] === "S") && true) ? S_0(applyOp_161((p0)[1])) : D_4((((((("(" + lift_7(p0)) + " ") + "===") + " ") + "\"mullit\"") + ")")));
if (((_v162)[0] === "S")) {
return ((_v162)[1] ? evalExpr_163(p0, p1, p2, p3) : evalExpr_164(p0, p1, p2, p3));
} else {
var _v166 = evalExpr_165(p0, p1, p2, p3);
var _v168 = evalExpr_167(p0, p1, p2, (_v166)[1]);
return [D_4((((((("(" + lift_7(_v162)) + " ? ") + lift_7((_v166)[0])) + " : ") + lift_7((_v168)[0])) + ")")), (_v168)[1]];
}
}
function evalExpr_54(p0, p1, p2, p3) {
var _v169 = (((((p1)[0] === "S") && true) && indexable_42((p1)[1])) ? S_0(((p1)[1])[1]) : ((isA_43(p1) && true) ? ((p1)[1])[1] : D_4((((paren_3(lift_7(p1)) + "[") + "1") + "]"))));
return [(((_v169)[0] === "S") ? S_0(applyOp_160((_v169)[1])) : D_4((("(0 + " + lift_7(_v169)) + ")"))), p3];
}
function evalExpr_56(p0, p1, p2, p3) {
var _v170 = ((((p0)[0] === "S") && true) ? S_0(applyOp_161((p0)[1])) : D_4((((((("(" + lift_7(p0)) + " ") + "===") + " ") + "\"mullit\"") + ")")));
if (((_v170)[0] === "S")) {
return ((_v170)[1] ? evalExpr_165(p0, p1, p2, p3) : evalExpr_167(p0, p1, p2, p3));
} else {
var _v171 = evalExpr_165(p0, p1, p2, p3);
var _v172 = evalExpr_167(p0, p1, p2, (_v171)[1]);
return [D_4((((((("(" + lift_7(_v170)) + " ? ") + lift_7((_v171)[0])) + " : ") + lift_7((_v172)[0])) + ")")), (_v172)[1]];
}
}
function isS_66(p0) {
return true;
}
function isS_67(p0) {
return ((p0)[0] === "S");
}
function allStatic_68(p0) {
return (((p0).length === 0) ? true : (isS_67((p0)[0]) && allStatic_68((p0).slice(1))));
}
function evalStmts_81(p0, p1, p2, p3, p4) {
if (((p0).length === 0)) {
return [["S",null], p4];
} else {
var _v173 = (p0)[0];
var _v174 = (p0).slice(1);
var _v175 = (_v173)[0];
if ((_v175 === "return")) {
return ((((_v173)[1])[0] === "call") ? evalCallStmt_176((_v173)[1], p1, p2, p3, p4) : evalExpr_177((_v173)[1], p1, p2, p3, p4));
} else {
if ((_v175 === "var")) {
var _v178 = evalExpr_177((_v173)[2], p1, p2, p3, p4);
var _v179 = nameLeaves_137((_v178)[0], (_v178)[1]);
var _v181 = evalStmts_180(_v174, [[(_v173)[1], (_v179)[0]], ["x", p1], ["acc", p2], ["prog", p3]], (_v179)[1]);
return (((_v179)[2] === "") ? _v181 : [["B", ((_v179)[2] + body_16((_v181)[0]))], (_v181)[1]]);
} else {
if ((_v175 === "block")) {
return evalStmts_81(((_v173)[1]).concat(_v174), p1, p2, p3, p4);
} else {
if ((_v175 === "if")) {
var _v182 = evalExpr_177((_v173)[1], p1, p2, p3, p4);
var _v183 = ([(_v173)[2]]).concat(_v174);
var _v184 = (((_v173)[3] === null) ? _v174 : ([(_v173)[3]]).concat(_v174));
if (isS_67((_v182)[0])) {
return (((_v182)[0])[1] ? evalStmts_81(_v183, p1, p2, p3, (_v182)[1]) : evalStmts_81(_v184, p1, p2, p3, (_v182)[1]));
} else {
var _v186 = evalStmts_185(_v183, p1, p2, p3, (_v182)[1]);
var _v187 = evalStmts_185(_v184, p1, p2, p3, (_v186)[1]);
return ((!(isB_15((_v186)[0])) && !(isB_15((_v187)[0]))) ? [D_4((((((("(" + lift_7((_v182)[0])) + " ? ") + lift_7((_v186)[0])) + " : ") + lift_7((_v187)[0])) + ")")), (_v187)[1]] : [["B", (((((("if (" + lift_7((_v182)[0])) + ") {\n") + body_16((_v186)[0])) + "} else {\n") + body_16((_v187)[0])) + "}\n")], (_v187)[1]]);
}
} else {
return evalStmts_81(_v174, p1, p2, p3, p4);
}
}
}
}
}
}
function evalStmts_82(p0, p1, p2, p3) {
var _v188 = (((((p2)[0] === "S") && true) && indexable_42((p2)[1])) ? S_0(((p2)[1])[0]) : ((isA_43(p2) && true) ? ((p2)[1])[0] : D_4((((paren_3(lift_7(p2)) + "[") + "0") + "]"))));
var _v191 = (function () {
if (((_v188)[0] === "S")) {
return [_v188, p3, ""];
} else {
if (isD_31(_v188)) {
if (isAtom_34((_v188)[1])) {
return [_v188, p3, ""];
} else {
var _v189 = ("_v" + (p3)[2]);
return [D_4(_v189), [(p3)[0], (p3)[1], ((p3)[2] + 1)], (((("var " + _v189) + " = ") + (_v188)[1]) + ";\n")];
}
} else {
var _v190 = nameLeavesList_36((_v188)[1], p3);
return [mkArr_38((_v190)[0]), (_v190)[1], (_v190)[2]];
}
}
})();
var _v231 = (function () {
var _v194 = (function () {
var _v192 = (_v191)[0];
var _v193 = (_v191)[1];
return [(((((_v192)[0] === "S") && true) && indexable_42((_v192)[1])) ? S_0(((_v192)[1])[0]) : ((isA_43(_v192) && true) ? ((_v192)[1])[0] : D_4((((paren_3(lift_7(_v192)) + "[") + "0") + "]")))), _v193];
})();
var _v197 = (function () {
if ((((_v194)[0])[0] === "S")) {
return [(_v194)[0], (_v194)[1], ""];
} else {
if (isD_31((_v194)[0])) {
if (isAtom_34(((_v194)[0])[1])) {
return [(_v194)[0], (_v194)[1], ""];
} else {
var _v195 = ("_v" + ((_v194)[1])[2]);
return [D_4(_v195), [((_v194)[1])[0], ((_v194)[1])[1], (((_v194)[1])[2] + 1)], (((("var " + _v195) + " = ") + ((_v194)[0])[1]) + ";\n")];
}
} else {
var _v196 = nameLeavesList_36(((_v194)[0])[1], (_v194)[1]);
return [mkArr_38((_v196)[0]), (_v196)[1], (_v196)[2]];
}
}
})();
var _v230 = (function () {
var _v207 = (function () {
var _v200 = (function () {
var _v198 = (_v197)[0];
var _v199 = (_v197)[1];
return [((((_v198)[0] === "S") && true) ? S_0(applyOp_50((_v198)[1])) : D_4((((((("(" + lift_7(_v198)) + " ") + "===") + " ") + "\"addlit\"") + ")"))), _v199];
})();
if ((((_v200)[0])[0] === "S")) {
return (((_v200)[0])[1] ? evalExpr_201((_v197)[0], (_v191)[0], p0, p1, p2, (_v200)[1]) : evalExpr_202((_v197)[0], (_v191)[0], p0, p1, p2, (_v200)[1]));
} else {
var _v204 = evalExpr_203((_v197)[0], (_v191)[0], p0, p1, p2, (_v200)[1]);
var _v206 = evalExpr_205((_v197)[0], (_v191)[0], p0, p1, p2, (_v204)[1]);
return [D_4((((((("(" + lift_7((_v200)[0])) + " ? ") + lift_7((_v204)[0])) + " : ") + lift_7((_v206)[0])) + ")")), (_v206)[1]];
}
})();
var _v210 = (function () {
if ((((_v207)[0])[0] === "S")) {
return [(_v207)[0], (_v207)[1], ""];
} else {
if (isD_31((_v207)[0])) {
if (isAtom_34(((_v207)[0])[1])) {
return [(_v207)[0], (_v207)[1], ""];
} else {
var _v208 = ("_v" + ((_v207)[1])[2]);
return [D_4(_v208), [((_v207)[1])[0], ((_v207)[1])[1], (((_v207)[1])[2] + 1)], (((("var " + _v208) + " = ") + ((_v207)[0])[1]) + ";\n")];
}
} else {
var _v209 = nameLeavesList_36(((_v207)[0])[1], (_v207)[1]);
return [mkArr_38((_v209)[0]), (_v209)[1], (_v209)[2]];
}
}
})();
var _v229 = (function () {
var _v220 = (function () {
var _v216 = (function () {
var _v215 = (function () {
var _v212 = (function () {
var _v211 = (_v210)[1];
return [[["S",1]], _v211];
})();
var _v213 = (_v212)[0];
var _v214 = (_v212)[1];
return [(((_v213).length === 1) ? (((isS_67(p2) && isS_67((_v213)[0])) && indexable_42((p2)[1])) ? S_0(((p2)[1]).slice(((_v213)[0])[1])) : ((isA_43(p2) && isS_67((_v213)[0])) ? mkArr_38(((p2)[1]).slice(((_v213)[0])[1])) : D_4((((paren_3(lift_7(p2)) + ".slice(") + lift_7((_v213)[0])) + ")")))) : (((_v213).length === 2) ? (((isS_67(p2) && allStatic_68(_v213)) && indexable_42((p2)[1])) ? S_0(((p2)[1]).slice(((_v213)[0])[1], ((_v213)[1])[1])) : ((isA_43(p2) && allStatic_68(_v213)) ? mkArr_38(((p2)[1]).slice(((_v213)[0])[1], ((_v213)[1])[1])) : D_4((((paren_3(lift_7(p2)) + ".slice(") + joinCodes_32(_v213)) + ")")))) : fail(("jsmix2: slice takes 1 or 2 arguments, got " + str((_v213).length))))), _v214];
})();
return [((((_v215)[0])[0] === "B") ? D_4((("(function () {\n" + ((_v215)[0])[1]) + "})()")) : (_v215)[0]), (_v215)[1]];
})();
var _v219 = (function () {
var _v217 = (_v210)[0];
var _v218 = (_v216)[1];
return [[_v217, p0], _v218];
})();
return [([(_v216)[0]]).concat((_v219)[0]), (_v219)[1]];
})();
var _v221 = (_v220)[0];
var _v222 = (_v220)[1];
var _v226 = (function () {
var _v224 = (function () {
var _v223 = (_v221)[0];
return [((((_v223)[0] === "S") && indexable_42((_v223)[1])) ? S_0(((_v223)[1]).length) : (isA_43(_v223) ? S_0(((_v223)[1]).length) : D_4((paren_3(lift_7(_v223)) + ".length")))), _v222];
})();
var _v225 = (_v224)[1];
return [(((((_v224)[0])[0] === "S") && true) ? S_0(applyOp_6(((_v224)[0])[1])) : D_4((((((("(" + lift_7((_v224)[0])) + " ") + "===") + " ") + "0") + ")"))), _v225];
})();
if ((((_v226)[0])[0] === "S")) {
return (((_v226)[0])[1] ? evalStmts_81([["block",[["return",["var","acc"]]]],["var","ins",["idx",["var","prog"],["lit",0]]],["var","op",["idx",["var","ins"],["lit",0]]],["var","next",["cond",["bin","===",["var","op"],["lit","addlit"]],["bin","+",["var","acc"],["idx",["var","ins"],["lit",1]]],["cond",["bin","===",["var","op"],["lit","mullit"]],["bin","*",["var","acc"],["idx",["var","ins"],["lit",1]]],["cond",["bin","===",["var","op"],["lit","addin"]],["bin","+",["var","acc"],["var","x"]],["cond",["bin","===",["var","op"],["lit","subin"]],["bin","-",["var","acc"],["var","x"]],["var","acc"]]]]]],["return",["call",["var","run"],[["call",["dot",["var","prog"],"slice"],[["lit",1]]],["var","next"],["var","x"]]]]], (((_v221).slice(1)).slice(1))[0], ((_v221).slice(1))[0], (_v221)[0], (_v226)[1]) : evalStmts_82((((_v221).slice(1)).slice(1))[0], ((_v221).slice(1))[0], (_v221)[0], (_v226)[1]));
} else {
var _v227 = evalStmts_83([["block",[["return",["var","acc"]]]],["var","ins",["idx",["var","prog"],["lit",0]]],["var","op",["idx",["var","ins"],["lit",0]]],["var","next",["cond",["bin","===",["var","op"],["lit","addlit"]],["bin","+",["var","acc"],["idx",["var","ins"],["lit",1]]],["cond",["bin","===",["var","op"],["lit","mullit"]],["bin","*",["var","acc"],["idx",["var","ins"],["lit",1]]],["cond",["bin","===",["var","op"],["lit","addin"]],["bin","+",["var","acc"],["var","x"]],["cond",["bin","===",["var","op"],["lit","subin"]],["bin","-",["var","acc"],["var","x"]],["var","acc"]]]]]],["return",["call",["var","run"],[["call",["dot",["var","prog"],"slice"],[["lit",1]]],["var","next"],["var","x"]]]]], (((_v221).slice(1)).slice(1))[0], ((_v221).slice(1))[0], (_v221)[0], (_v226)[1], true);
var _v228 = evalStmts_85((((_v221).slice(1)).slice(1))[0], ((_v221).slice(1))[0], (_v221)[0], (_v227)[1]);
return ((!(isB_15((_v227)[0])) && !(isB_15((_v228)[0]))) ? [D_4((((((("(" + lift_7((_v226)[0])) + " ? ") + lift_7((_v227)[0])) + " : ") + lift_7((_v228)[0])) + ")")), (_v228)[1]] : [["B", (((((("if (" + lift_7((_v226)[0])) + ") {\n") + body_16((_v227)[0])) + "} else {\n") + body_16((_v228)[0])) + "}\n")], (_v228)[1]]);
}
})();
return (((_v210)[2] === "") ? _v229 : [["B", ((_v210)[2] + body_16((_v229)[0]))], (_v229)[1]]);
})();
return (((_v197)[2] === "") ? _v230 : [["B", ((_v197)[2] + body_16((_v230)[0]))], (_v230)[1]]);
})();
return (((_v191)[2] === "") ? _v231 : [["B", ((_v191)[2] + body_16((_v231)[0]))], (_v231)[1]]);
}
function evalStmts_83(p0, p1, p2, p3, p4, p5) {
if (((p0).length === 0)) {
return [["S",null], p4];
} else {
var _v232 = (p0)[0];
var _v233 = (p0).slice(1);
var _v234 = (_v232)[0];
if ((_v234 === "return")) {
return ((((_v232)[1])[0] === "call") ? evalCallStmt_235((_v232)[1], p1, p2, p3, p4, p5) : evalExpr_236((_v232)[1], p1, p2, p3, p4, p5));
} else {
if ((_v234 === "var")) {
var _v237 = evalExpr_236((_v232)[2], p1, p2, p3, p4, p5);
var _v238 = nameLeaves_137((_v237)[0], (_v237)[1]);
var _v240 = evalStmts_239(_v233, [[(_v232)[1], (_v238)[0]], ["x", p1], ["acc", p2], ["prog", p3]], (_v238)[1], p5);
return (((_v238)[2] === "") ? _v240 : [["B", ((_v238)[2] + body_16((_v240)[0]))], (_v240)[1]]);
} else {
if ((_v234 === "block")) {
return evalStmts_83(((_v232)[1]).concat(_v233), p1, p2, p3, p4, p5);
} else {
if ((_v234 === "if")) {
var _v241 = evalExpr_236((_v232)[1], p1, p2, p3, p4, p5);
var _v242 = ([(_v232)[2]]).concat(_v233);
var _v243 = (((_v232)[3] === null) ? _v233 : ([(_v232)[3]]).concat(_v233));
if (isS_67((_v241)[0])) {
return (((_v241)[0])[1] ? evalStmts_83(_v242, p1, p2, p3, (_v241)[1], p5) : evalStmts_83(_v243, p1, p2, p3, (_v241)[1], p5));
} else {
var _v244 = evalStmts_185(_v242, p1, p2, p3, (_v241)[1]);
var _v245 = evalStmts_185(_v243, p1, p2, p3, (_v244)[1]);
return ((!(isB_15((_v244)[0])) && !(isB_15((_v245)[0]))) ? [D_4((((((("(" + lift_7((_v241)[0])) + " ? ") + lift_7((_v244)[0])) + " : ") + lift_7((_v245)[0])) + ")")), (_v245)[1]] : [["B", (((((("if (" + lift_7((_v241)[0])) + ") {\n") + body_16((_v244)[0])) + "} else {\n") + body_16((_v245)[0])) + "}\n")], (_v245)[1]]);
}
} else {
return evalStmts_83(_v233, p1, p2, p3, p4, p5);
}
}
}
}
}
}
function evalStmts_85(p0, p1, p2, p3) {
var _v246 = (((((p2)[0] === "S") && true) && indexable_42((p2)[1])) ? S_0(((p2)[1])[0]) : ((isA_43(p2) && true) ? ((p2)[1])[0] : D_4((((paren_3(lift_7(p2)) + "[") + "0") + "]"))));
var _v249 = (function () {
if (((_v246)[0] === "S")) {
return [_v246, p3, ""];
} else {
if (isD_31(_v246)) {
if (isAtom_34((_v246)[1])) {
return [_v246, p3, ""];
} else {
var _v247 = ("_v" + (p3)[2]);
return [D_4(_v247), [(p3)[0], (p3)[1], ((p3)[2] + 1)], (((("var " + _v247) + " = ") + (_v246)[1]) + ";\n")];
}
} else {
var _v248 = nameLeavesList_36((_v246)[1], p3);
return [mkArr_38((_v248)[0]), (_v248)[1], (_v248)[2]];
}
}
})();
var _v279 = (function () {
var _v252 = (function () {
var _v250 = (_v249)[0];
var _v251 = (_v249)[1];
return [(((((_v250)[0] === "S") && true) && indexable_42((_v250)[1])) ? S_0(((_v250)[1])[0]) : ((isA_43(_v250) && true) ? ((_v250)[1])[0] : D_4((((paren_3(lift_7(_v250)) + "[") + "0") + "]")))), _v251];
})();
var _v255 = (function () {
if ((((_v252)[0])[0] === "S")) {
return [(_v252)[0], (_v252)[1], ""];
} else {
if (isD_31((_v252)[0])) {
if (isAtom_34(((_v252)[0])[1])) {
return [(_v252)[0], (_v252)[1], ""];
} else {
var _v253 = ("_v" + ((_v252)[1])[2]);
return [D_4(_v253), [((_v252)[1])[0], ((_v252)[1])[1], (((_v252)[1])[2] + 1)], (((("var " + _v253) + " = ") + ((_v252)[0])[1]) + ";\n")];
}
} else {
var _v254 = nameLeavesList_36(((_v252)[0])[1], (_v252)[1]);
return [mkArr_38((_v254)[0]), (_v254)[1], (_v254)[2]];
}
}
})();
var _v278 = (function () {
var _v261 = (function () {
var _v258 = (function () {
var _v256 = (_v255)[0];
var _v257 = (_v255)[1];
return [((((_v256)[0] === "S") && true) ? S_0(applyOp_50((_v256)[1])) : D_4((((((("(" + lift_7(_v256)) + " ") + "===") + " ") + "\"addlit\"") + ")"))), _v257];
})();
if ((((_v258)[0])[0] === "S")) {
return (((_v258)[0])[1] ? evalExpr_203((_v255)[0], (_v249)[0], p0, p1, p2, (_v258)[1]) : evalExpr_205((_v255)[0], (_v249)[0], p0, p1, p2, (_v258)[1]));
} else {
var _v259 = evalExpr_203((_v255)[0], (_v249)[0], p0, p1, p2, (_v258)[1]);
var _v260 = evalExpr_205((_v255)[0], (_v249)[0], p0, p1, p2, (_v259)[1]);
return [D_4((((((("(" + lift_7((_v258)[0])) + " ? ") + lift_7((_v259)[0])) + " : ") + lift_7((_v260)[0])) + ")")), (_v260)[1]];
}
})();
var _v264 = (function () {
if ((((_v261)[0])[0] === "S")) {
return [(_v261)[0], (_v261)[1], ""];
} else {
if (isD_31((_v261)[0])) {
if (isAtom_34(((_v261)[0])[1])) {
return [(_v261)[0], (_v261)[1], ""];
} else {
var _v262 = ("_v" + ((_v261)[1])[2]);
return [D_4(_v262), [((_v261)[1])[0], ((_v261)[1])[1], (((_v261)[1])[2] + 1)], (((("var " + _v262) + " = ") + ((_v261)[0])[1]) + ";\n")];
}
} else {
var _v263 = nameLeavesList_36(((_v261)[0])[1], (_v261)[1]);
return [mkArr_38((_v263)[0]), (_v263)[1], (_v263)[2]];
}
}
})();
var _v277 = (function () {
var _v274 = (function () {
var _v270 = (function () {
var _v269 = (function () {
var _v266 = (function () {
var _v265 = (_v264)[1];
return [[["S",1]], _v265];
})();
var _v267 = (_v266)[0];
var _v268 = (_v266)[1];
return [(((_v267).length === 1) ? (((isS_67(p2) && isS_67((_v267)[0])) && indexable_42((p2)[1])) ? S_0(((p2)[1]).slice(((_v267)[0])[1])) : ((isA_43(p2) && isS_67((_v267)[0])) ? mkArr_38(((p2)[1]).slice(((_v267)[0])[1])) : D_4((((paren_3(lift_7(p2)) + ".slice(") + lift_7((_v267)[0])) + ")")))) : (((_v267).length === 2) ? (((isS_67(p2) && allStatic_68(_v267)) && indexable_42((p2)[1])) ? S_0(((p2)[1]).slice(((_v267)[0])[1], ((_v267)[1])[1])) : ((isA_43(p2) && allStatic_68(_v267)) ? mkArr_38(((p2)[1]).slice(((_v267)[0])[1], ((_v267)[1])[1])) : D_4((((paren_3(lift_7(p2)) + ".slice(") + joinCodes_32(_v267)) + ")")))) : fail(("jsmix2: slice takes 1 or 2 arguments, got " + str((_v267).length))))), _v268];
})();
return [((((_v269)[0])[0] === "B") ? D_4((("(function () {\n" + ((_v269)[0])[1]) + "})()")) : (_v269)[0]), (_v269)[1]];
})();
var _v273 = (function () {
var _v271 = (_v264)[0];
var _v272 = (_v270)[1];
return [[_v271, p0], _v272];
})();
return [([(_v270)[0]]).concat((_v273)[0]), (_v273)[1]];
})();
var _v275 = (_v274)[0];
var _v276 = (_v274)[1];
return ((((_v275).length === 0) ? true : (isS_67((_v275)[0]) && allStatic_68((_v275).slice(1)))) ? unfold_121(_v275, _v276) : residualCall_122(_v275, _v276));
})();
return (((_v264)[2] === "") ? _v277 : [["B", ((_v264)[2] + body_16((_v277)[0]))], (_v277)[1]]);
})();
return (((_v255)[2] === "") ? _v278 : [["B", ((_v255)[2] + body_16((_v278)[0]))], (_v278)[1]]);
})();
return (((_v249)[2] === "") ? _v279 : [["B", ((_v249)[2] + body_16((_v279)[0]))], (_v279)[1]]);
}
function unfold_121(p0, p1) {
var _v283 = (function () {
var _v281 = (function () {
var _v280 = (p0)[0];
return [((((_v280)[0] === "S") && indexable_42((_v280)[1])) ? S_0(((_v280)[1]).length) : (isA_43(_v280) ? S_0(((_v280)[1]).length) : D_4((paren_3(lift_7(_v280)) + ".length")))), p1];
})();
var _v282 = (_v281)[1];
return [(((((_v281)[0])[0] === "S") && true) ? S_0(applyOp_6(((_v281)[0])[1])) : D_4((((((("(" + lift_7((_v281)[0])) + " ") + "===") + " ") + "0") + ")"))), _v282];
})();
if ((((_v283)[0])[0] === "S")) {
return (((_v283)[0])[1] ? evalStmts_185([["block",[["return",["var","acc"]]]],["var","ins",["idx",["var","prog"],["lit",0]]],["var","op",["idx",["var","ins"],["lit",0]]],["var","next",["cond",["bin","===",["var","op"],["lit","addlit"]],["bin","+",["var","acc"],["idx",["var","ins"],["lit",1]]],["cond",["bin","===",["var","op"],["lit","mullit"]],["bin","*",["var","acc"],["idx",["var","ins"],["lit",1]]],["cond",["bin","===",["var","op"],["lit","addin"]],["bin","+",["var","acc"],["var","x"]],["cond",["bin","===",["var","op"],["lit","subin"]],["bin","-",["var","acc"],["var","x"]],["var","acc"]]]]]],["return",["call",["var","run"],[["call",["dot",["var","prog"],"slice"],[["lit",1]]],["var","next"],["var","x"]]]]], (((p0).slice(1)).slice(1))[0], ((p0).slice(1))[0], (p0)[0], (_v283)[1]) : evalStmts_85((((p0).slice(1)).slice(1))[0], ((p0).slice(1))[0], (p0)[0], (_v283)[1]));
} else {
var _v284 = evalStmts_185([["block",[["return",["var","acc"]]]],["var","ins",["idx",["var","prog"],["lit",0]]],["var","op",["idx",["var","ins"],["lit",0]]],["var","next",["cond",["bin","===",["var","op"],["lit","addlit"]],["bin","+",["var","acc"],["idx",["var","ins"],["lit",1]]],["cond",["bin","===",["var","op"],["lit","mullit"]],["bin","*",["var","acc"],["idx",["var","ins"],["lit",1]]],["cond",["bin","===",["var","op"],["lit","addin"]],["bin","+",["var","acc"],["var","x"]],["cond",["bin","===",["var","op"],["lit","subin"]],["bin","-",["var","acc"],["var","x"]],["var","acc"]]]]]],["return",["call",["var","run"],[["call",["dot",["var","prog"],"slice"],[["lit",1]]],["var","next"],["var","x"]]]]], (((p0).slice(1)).slice(1))[0], ((p0).slice(1))[0], (p0)[0], (_v283)[1]);
var _v285 = evalStmts_85((((p0).slice(1)).slice(1))[0], ((p0).slice(1))[0], (p0)[0], (_v284)[1]);
return ((!(isB_15((_v284)[0])) && !(isB_15((_v285)[0]))) ? [D_4((((((("(" + lift_7((_v283)[0])) + " ? ") + lift_7((_v284)[0])) + " : ") + lift_7((_v285)[0])) + ")")), (_v285)[1]] : [["B", (((((("if (" + lift_7((_v283)[0])) + ") {\n") + body_16((_v284)[0])) + "} else {\n") + body_16((_v285)[0])) + "}\n")], (_v285)[1]]);
}
}
function residualCall_122(p0, p1) {
var _v288 = (((p0).length === 0) ? [] : ([skel_287((p0)[0])]).concat(skels_286((p0).slice(1))));
var _v289 = ("run:" + str(_v288));
var _v291 = ((((p1)[0]).length === 0) ? null : (((((p1)[0])[0])[0] === _v289) ? (((p1)[0])[0])[1] : memoFind_290(((p1)[0]).slice(1), _v289)));
var _v294 = (("(" + ((((((p0).length === 0) ? [] : (dynLeavesOf_293((p0)[0])).concat(dynLeaves_292((p0).slice(1))))).length === 0) ? "" : ((((((p0).length === 0) ? [] : (dynLeavesOf_293((p0)[0])).concat(dynLeaves_292((p0).slice(1))))).length === 1) ? ((((p0).length === 0) ? [] : (dynLeavesOf_293((p0)[0])).concat(dynLeaves_292((p0).slice(1)))))[0] : ((((((p0).length === 0) ? [] : (dynLeavesOf_293((p0)[0])).concat(dynLeaves_292((p0).slice(1)))))[0] + ", ") + joinStrs_28(((((p0).length === 0) ? [] : (dynLeavesOf_293((p0)[0])).concat(dynLeaves_292((p0).slice(1))))).slice(1)))))) + ")");
if ((_v291 !== null)) {
return [D_4((_v291 + _v294)), p1];
} else {
var _v297 = smallerAncestor_296(sizeOfSkels_295(_v288));
if ((_v297 !== null)) {
var _v299 = generalizeList_298(p0, (_v297)[1]);
if ((str(skels_286(_v299)) !== str(_v288))) {
return residualCall_122(_v299, p1);
} else {
if (((countFor_300((p1)[0]) >= 64) && !(allDynamic_301(p0)))) {
return residualCall_122(liftAll_302(p0), p1);
} else {
var _v303 = ("run_" + (p1)[2]);
return [D_4((_v303 + _v294)), [([[_v289, _v303]]).concat((p1)[0]), ((p1)[1]).concat([[_v303, ["fundecl","run",["prog","acc","x"],[["if",["bin","===",["dot",["var","prog"],"length"],["lit",0]],["block",[["return",["var","acc"]]]],null],["var","ins",["idx",["var","prog"],["lit",0]]],["var","op",["idx",["var","ins"],["lit",0]]],["var","next",["cond",["bin","===",["var","op"],["lit","addlit"]],["bin","+",["var","acc"],["idx",["var","ins"],["lit",1]]],["cond",["bin","===",["var","op"],["lit","mullit"]],["bin","*",["var","acc"],["idx",["var","ins"],["lit",1]]],["cond",["bin","===",["var","op"],["lit","addin"]],["bin","+",["var","acc"],["var","x"]],["cond",["bin","===",["var","op"],["lit","subin"]],["bin","-",["var","acc"],["var","x"]],["var","acc"]]]]]],["return",["call",["var","run"],[["call",["dot",["var","prog"],"slice"],[["lit",1]]],["var","next"],["var","x"]]]]]], _v288, [["run", _v288]]]]), ((p1)[2] + 1)]];
}
}
} else {
if (((countFor_300((p1)[0]) >= 64) && !(allDynamic_301(p0)))) {
return residualCall_122(liftAll_302(p0), p1);
} else {
var _v304 = ("run_" + (p1)[2]);
return [D_4((_v304 + _v294)), [([[_v289, _v304]]).concat((p1)[0]), ((p1)[1]).concat([[_v304, ["fundecl","run",["prog","acc","x"],[["if",["bin","===",["dot",["var","prog"],"length"],["lit",0]],["block",[["return",["var","acc"]]]],null],["var","ins",["idx",["var","prog"],["lit",0]]],["var","op",["idx",["var","ins"],["lit",0]]],["var","next",["cond",["bin","===",["var","op"],["lit","addlit"]],["bin","+",["var","acc"],["idx",["var","ins"],["lit",1]]],["cond",["bin","===",["var","op"],["lit","mullit"]],["bin","*",["var","acc"],["idx",["var","ins"],["lit",1]]],["cond",["bin","===",["var","op"],["lit","addin"]],["bin","+",["var","acc"],["var","x"]],["cond",["bin","===",["var","op"],["lit","subin"]],["bin","-",["var","acc"],["var","x"]],["var","acc"]]]]]],["return",["call",["var","run"],[["call",["dot",["var","prog"],"slice"],[["lit",1]]],["var","next"],["var","x"]]]]]], _v288, [["run", _v288]]]]), ((p1)[2] + 1)]];
}
}
}
}
function rebuild_126(p0) {
if (((p0)[0] === "S")) {
return [S_0((p0)[1]), 0];
} else {
if (((p0)[0] === "D")) {
return [["D","p0"],1];
} else {
var _v305 = rebuildList_23((p0)[1]);
return [mkArr_38((_v305)[0]), (_v305)[1]];
}
}
}
function rebuildList_128(p0, p1) {
if (((p0).length === 0)) {
return [[], p1];
} else {
var _v307 = rebuild_306((p0)[0], p1);
var _v308 = rebuildList_128((p0).slice(1), (_v307)[1]);
return [([(_v307)[0]]).concat((_v308)[0]), (_v308)[1]];
}
}
function bindAll_130(p0, p1, p2, p3) {
return (((p0).length === 0) ? [[p2, p3]] : bindAll_309((p0).slice(1), (p1).slice(1), [[(p0)[0], (p1)[0]], [p2, p3]]));
}
function evalCallStmt_134(p0, p1, p2, p3, p4, p5) {
var _v310 = (p0)[1];
var _v314 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], [p2, p3, p4]];
} else {
var _v311 = evalExpr_135(((p0)[2])[0], p1, p2, p3, p4, p5);
var _v313 = evalList_312(((p0)[2]).slice(1), p1, (_v311)[1], p5);
return [([(_v311)[0]]).concat((_v313)[0]), (_v313)[1]];
}
})();
var _v315 = (_v314)[0];
var _v316 = (_v314)[1];
if (((_v310)[0] === "dot")) {
var _v318 = evalExpr_317((_v310)[1], p1, _v316, p5);
return [evalBuiltin_319((_v310)[2], (_v318)[0], _v315), (_v318)[1]];
} else {
var _v321 = findFn_320((_v310)[1]);
return ((_v321 === null) ? [evalBuiltin_322((_v310)[1], _v315), _v316] : unfold_323(_v321, _v315, _v316, p5));
}
}
function evalExpr_135(p0, p1, p2, p3, p4, p5) {
var _v324 = (p0)[0];
if ((_v324 === "lit")) {
return [S_0((p0)[1]), [p2, p3, p4]];
} else {
if ((_v324 === "var")) {
return [lookup_325(p1, (p0)[1]), [p2, p3, p4]];
} else {
if ((_v324 === "arr")) {
var _v327 = evalList_326((p0)[1], p1, p2, p3, p4, p5);
return [mkArr_38((_v327)[0]), (_v327)[1]];
} else {
if ((_v324 === "idx")) {
var _v328 = evalExpr_135((p0)[1], p1, p2, p3, p4, p5);
var _v329 = evalExpr_317((p0)[2], p1, (_v328)[1], p5);
return [index_330((_v328)[0], (_v329)[0]), (_v329)[1]];
} else {
if ((_v324 === "dot")) {
var _v331 = evalExpr_135((p0)[1], p1, p2, p3, p4, p5);
return [prop_332((_v331)[0], (p0)[2]), (_v331)[1]];
} else {
if ((_v324 === "not")) {
var _v333 = evalExpr_135((p0)[1], p1, p2, p3, p4, p5);
return (isS_67((_v333)[0]) ? [S_0(!(((_v333)[0])[1])), (_v333)[1]] : [D_4(("!" + paren_3(lift_7((_v333)[0])))), (_v333)[1]]);
} else {
if ((_v324 === "bin")) {
var _v334 = (p0)[1];
if (((_v334 === "&&") || (_v334 === "||"))) {
return evalLogic_335(_v334, p0, p1, p2, p3, p4, p5);
} else {
var _v336 = evalExpr_135((p0)[2], p1, p2, p3, p4, p5);
var _v337 = evalExpr_317((p0)[3], p1, (_v336)[1], p5);
return [binop_338(_v334, (_v336)[0], (_v337)[0]), (_v337)[1]];
}
} else {
if ((_v324 === "cond")) {
var _v339 = evalExpr_135((p0)[1], p1, p2, p3, p4, p5);
if (isS_67((_v339)[0])) {
return (((_v339)[0])[1] ? evalExpr_317((p0)[2], p1, (_v339)[1], p5) : evalExpr_317((p0)[3], p1, (_v339)[1], p5));
} else {
var _v341 = evalExpr_340((p0)[2], p1, (_v339)[1], p5);
var _v342 = evalExpr_340((p0)[3], p1, (_v341)[1], p5);
return [D_4((((((("(" + lift_7((_v339)[0])) + " ? ") + lift_7((_v341)[0])) + " : ") + lift_7((_v342)[0])) + ")")), (_v342)[1]];
}
} else {
return ((_v324 === "call") ? evalCall_343(p0, p1, p2, p3, p4, p5) : [fail(("jsmix2: unsupported expression " + str(_v324))), [p2, p3, p4]]);
}
}
}
}
}
}
}
}
}
function nameLeaves_137(p0, p1) {
if (((p0)[0] === "S")) {
return [p0, p1, ""];
} else {
if (isD_31(p0)) {
if (isAtom_34((p0)[1])) {
return [p0, p1, ""];
} else {
var _v344 = ("_v" + (p1)[2]);
return [D_4(_v344), [(p1)[0], (p1)[1], ((p1)[2] + 1)], (((("var " + _v344) + " = ") + (p0)[1]) + ";\n")];
}
} else {
var _v345 = nameLeavesList_36((p0)[1], p1);
return [mkArr_38((_v345)[0]), (_v345)[1], (_v345)[2]];
}
}
}
function evalStmts_139(p0, p1, p2, p3) {
if (((p0).length === 0)) {
return [["S",null], p2];
} else {
var _v346 = (p0)[0];
var _v347 = (p0).slice(1);
var _v348 = (_v346)[0];
if ((_v348 === "return")) {
return ((((_v346)[1])[0] === "call") ? evalCallStmt_349((_v346)[1], p1, p2, p3) : evalExpr_317((_v346)[1], p1, p2, p3));
} else {
if ((_v348 === "var")) {
var _v350 = evalExpr_317((_v346)[2], p1, p2, p3);
var _v351 = nameLeaves_137((_v350)[0], (_v350)[1]);
var _v352 = evalStmts_139(_v347, ([[(_v346)[1], (_v351)[0]]]).concat(p1), (_v351)[1], p3);
return (((_v351)[2] === "") ? _v352 : [["B", ((_v351)[2] + body_16((_v352)[0]))], (_v352)[1]]);
} else {
if ((_v348 === "block")) {
return evalStmts_139(((_v346)[1]).concat(_v347), p1, p2, p3);
} else {
if ((_v348 === "if")) {
var _v353 = evalExpr_317((_v346)[1], p1, p2, p3);
var _v354 = ([(_v346)[2]]).concat(_v347);
var _v355 = (((_v346)[3] === null) ? _v347 : ([(_v346)[3]]).concat(_v347));
if (isS_67((_v353)[0])) {
return (((_v353)[0])[1] ? evalStmts_139(_v354, p1, (_v353)[1], p3) : evalStmts_139(_v355, p1, (_v353)[1], p3));
} else {
var _v356 = evalStmts_145(_v354, p1, (_v353)[1], p3);
var _v357 = evalStmts_145(_v355, p1, (_v356)[1], p3);
return ((!(isB_15((_v356)[0])) && !(isB_15((_v357)[0]))) ? [D_4((((((("(" + lift_7((_v353)[0])) + " ? ") + lift_7((_v356)[0])) + " : ") + lift_7((_v357)[0])) + ")")), (_v357)[1]] : [["B", (((((("if (" + lift_7((_v353)[0])) + ") {\n") + body_16((_v356)[0])) + "} else {\n") + body_16((_v357)[0])) + "}\n")], (_v357)[1]]);
}
} else {
return evalStmts_139(_v347, p1, p2, p3);
}
}
}
}
}
}
function evalStmts_141(p0, p1, p2, p3, p4, p5) {
if (((p0).length === 0)) {
return [["S",null], [p2, p3, p4]];
} else {
var _v358 = (p0)[0];
var _v359 = (p0).slice(1);
var _v360 = (_v358)[0];
if ((_v360 === "return")) {
return ((((_v358)[1])[0] === "call") ? evalCallStmt_134((_v358)[1], p1, p2, p3, p4, p5) : evalExpr_135((_v358)[1], p1, p2, p3, p4, p5));
} else {
if ((_v360 === "var")) {
var _v361 = evalExpr_135((_v358)[2], p1, p2, p3, p4, p5);
var _v362 = nameLeaves_137((_v361)[0], (_v361)[1]);
var _v363 = evalStmts_139(_v359, ([[(_v358)[1], (_v362)[0]]]).concat(p1), (_v362)[1], p5);
return (((_v362)[2] === "") ? _v363 : [["B", ((_v362)[2] + body_16((_v363)[0]))], (_v363)[1]]);
} else {
if ((_v360 === "block")) {
return evalStmts_141(((_v358)[1]).concat(_v359), p1, p2, p3, p4, p5);
} else {
if ((_v360 === "if")) {
var _v364 = evalExpr_135((_v358)[1], p1, p2, p3, p4, p5);
var _v365 = ([(_v358)[2]]).concat(_v359);
var _v366 = (((_v358)[3] === null) ? _v359 : ([(_v358)[3]]).concat(_v359));
if (isS_67((_v364)[0])) {
return (((_v364)[0])[1] ? evalStmts_139(_v365, p1, (_v364)[1], p5) : evalStmts_139(_v366, p1, (_v364)[1], p5));
} else {
var _v367 = evalStmts_145(_v365, p1, (_v364)[1], p5);
var _v368 = evalStmts_145(_v366, p1, (_v367)[1], p5);
return ((!(isB_15((_v367)[0])) && !(isB_15((_v368)[0]))) ? [D_4((((((("(" + lift_7((_v364)[0])) + " ? ") + lift_7((_v367)[0])) + " : ") + lift_7((_v368)[0])) + ")")), (_v368)[1]] : [["B", (((((("if (" + lift_7((_v364)[0])) + ") {\n") + body_16((_v367)[0])) + "} else {\n") + body_16((_v368)[0])) + "}\n")], (_v368)[1]]);
}
} else {
return evalStmts_141(_v359, p1, p2, p3, p4, p5);
}
}
}
}
}
}
function evalStmts_145(p0, p1, p2, p3) {
if (((p0).length === 0)) {
return [["S",null], p2];
} else {
var _v369 = (p0)[0];
var _v370 = (p0).slice(1);
var _v371 = (_v369)[0];
if ((_v371 === "return")) {
return ((((_v369)[1])[0] === "call") ? evalCallStmt_372((_v369)[1], p1, p2, p3) : evalExpr_340((_v369)[1], p1, p2, p3));
} else {
if ((_v371 === "var")) {
var _v373 = evalExpr_340((_v369)[2], p1, p2, p3);
var _v374 = nameLeaves_137((_v373)[0], (_v373)[1]);
var _v375 = evalStmts_145(_v370, ([[(_v369)[1], (_v374)[0]]]).concat(p1), (_v374)[1], p3);
return (((_v374)[2] === "") ? _v375 : [["B", ((_v374)[2] + body_16((_v375)[0]))], (_v375)[1]]);
} else {
if ((_v371 === "block")) {
return evalStmts_145(((_v369)[1]).concat(_v370), p1, p2, p3);
} else {
if ((_v371 === "if")) {
var _v376 = evalExpr_340((_v369)[1], p1, p2, p3);
var _v377 = ([(_v369)[2]]).concat(_v370);
var _v378 = (((_v369)[3] === null) ? _v370 : ([(_v369)[3]]).concat(_v370));
if (isS_67((_v376)[0])) {
return (((_v376)[0])[1] ? evalStmts_145(_v377, p1, (_v376)[1], p3) : evalStmts_145(_v378, p1, (_v376)[1], p3));
} else {
var _v379 = evalStmts_145(_v377, p1, (_v376)[1], p3);
var _v380 = evalStmts_145(_v378, p1, (_v379)[1], p3);
return ((!(isB_15((_v379)[0])) && !(isB_15((_v380)[0]))) ? [D_4((((((("(" + lift_7((_v376)[0])) + " ? ") + lift_7((_v379)[0])) + " : ") + lift_7((_v380)[0])) + ")")), (_v380)[1]] : [["B", (((((("if (" + lift_7((_v376)[0])) + ") {\n") + body_16((_v379)[0])) + "} else {\n") + body_16((_v380)[0])) + "}\n")], (_v380)[1]]);
}
} else {
return evalStmts_145(_v370, p1, p2, p3);
}
}
}
}
}
}
function paramNames_148(p0) {
return ((1 >= p0) ? [] : (["p1"]).concat(paramNames_381(p0)));
}
function staticsOf_158(p0) {
return (((p0).length === 0) ? [] : ([((p0)[0])[1]]).concat(staticsOf_158((p0).slice(1))));
}
function applyOp_160(p0) {
return (0 + p0);
}
function applyOp_161(p0) {
return (p0 === "mullit");
}
function evalExpr_163(p0, p1, p2, p3) {
var _v382 = (((((p1)[0] === "S") && true) && indexable_42((p1)[1])) ? S_0(((p1)[1])[1]) : ((isA_43(p1) && true) ? ((p1)[1])[1] : D_4((((paren_3(lift_7(p1)) + "[") + "1") + "]"))));
return [(((_v382)[0] === "S") ? S_0(applyOp_383((_v382)[1])) : D_4((("(0 * " + lift_7(_v382)) + ")"))), p3];
}
function evalExpr_164(p0, p1, p2, p3) {
var _v385 = ((((p0)[0] === "S") && true) ? S_0(applyOp_384((p0)[1])) : D_4((((((("(" + lift_7(p0)) + " ") + "===") + " ") + "\"addin\"") + ")")));
if (((_v385)[0] === "S")) {
return ((_v385)[1] ? evalExpr_386(p0, p1, p2, p3) : evalExpr_387(p0, p1, p2, p3));
} else {
var _v389 = evalExpr_388(p0, p1, p2, p3);
var _v391 = evalExpr_390(p0, p1, p2, (_v389)[1]);
return [D_4((((((("(" + lift_7(_v385)) + " ? ") + lift_7((_v389)[0])) + " : ") + lift_7((_v391)[0])) + ")")), (_v391)[1]];
}
}
function evalExpr_165(p0, p1, p2, p3) {
var _v392 = (((((p1)[0] === "S") && true) && indexable_42((p1)[1])) ? S_0(((p1)[1])[1]) : ((isA_43(p1) && true) ? ((p1)[1])[1] : D_4((((paren_3(lift_7(p1)) + "[") + "1") + "]"))));
return [(((_v392)[0] === "S") ? S_0(applyOp_383((_v392)[1])) : D_4((("(0 * " + lift_7(_v392)) + ")"))), p3];
}
function evalExpr_167(p0, p1, p2, p3) {
var _v393 = ((((p0)[0] === "S") && true) ? S_0(applyOp_384((p0)[1])) : D_4((((((("(" + lift_7(p0)) + " ") + "===") + " ") + "\"addin\"") + ")")));
if (((_v393)[0] === "S")) {
return ((_v393)[1] ? evalExpr_388(p0, p1, p2, p3) : evalExpr_390(p0, p1, p2, p3));
} else {
var _v394 = evalExpr_388(p0, p1, p2, p3);
var _v395 = evalExpr_390(p0, p1, p2, (_v394)[1]);
return [D_4((((((("(" + lift_7(_v393)) + " ? ") + lift_7((_v394)[0])) + " : ") + lift_7((_v395)[0])) + ")")), (_v395)[1]];
}
}
function evalCallStmt_176(p0, p1, p2, p3, p4) {
var _v396 = (p0)[1];
var _v400 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p4];
} else {
var _v397 = evalExpr_177(((p0)[2])[0], p1, p2, p3, p4);
var _v399 = evalList_398(((p0)[2]).slice(1), p1, p2, p3, (_v397)[1]);
return [([(_v397)[0]]).concat((_v399)[0]), (_v399)[1]];
}
})();
var _v401 = (_v400)[0];
var _v402 = (_v400)[1];
if (((_v396)[0] === "dot")) {
var _v403 = evalExpr_177((_v396)[1], p1, p2, p3, _v402);
return [evalBuiltin_319((_v396)[2], (_v403)[0], _v401), (_v403)[1]];
} else {
var _v404 = findFn_320((_v396)[1]);
return ((_v404 === null) ? [evalBuiltin_322((_v396)[1], _v401), _v402] : unfold_405(_v404, _v401, _v402));
}
}
function evalExpr_177(p0, p1, p2, p3, p4) {
var _v406 = (p0)[0];
if ((_v406 === "lit")) {
return [S_0((p0)[1]), p4];
} else {
if ((_v406 === "var")) {
return [lookup_407(p1, p2, p3, (p0)[1]), p4];
} else {
if ((_v406 === "arr")) {
var _v408 = evalList_398((p0)[1], p1, p2, p3, p4);
return [mkArr_38((_v408)[0]), (_v408)[1]];
} else {
if ((_v406 === "idx")) {
var _v409 = evalExpr_177((p0)[1], p1, p2, p3, p4);
var _v410 = evalExpr_177((p0)[2], p1, p2, p3, (_v409)[1]);
return [index_330((_v409)[0], (_v410)[0]), (_v410)[1]];
} else {
if ((_v406 === "dot")) {
var _v411 = evalExpr_177((p0)[1], p1, p2, p3, p4);
return [prop_332((_v411)[0], (p0)[2]), (_v411)[1]];
} else {
if ((_v406 === "not")) {
var _v412 = evalExpr_177((p0)[1], p1, p2, p3, p4);
return (isS_67((_v412)[0]) ? [S_0(!(((_v412)[0])[1])), (_v412)[1]] : [D_4(("!" + paren_3(lift_7((_v412)[0])))), (_v412)[1]]);
} else {
if ((_v406 === "bin")) {
var _v413 = (p0)[1];
if (((_v413 === "&&") || (_v413 === "||"))) {
return evalLogic_414(_v413, p0, p1, p2, p3, p4);
} else {
var _v415 = evalExpr_177((p0)[2], p1, p2, p3, p4);
var _v416 = evalExpr_177((p0)[3], p1, p2, p3, (_v415)[1]);
return [binop_338(_v413, (_v415)[0], (_v416)[0]), (_v416)[1]];
}
} else {
if ((_v406 === "cond")) {
var _v417 = evalExpr_177((p0)[1], p1, p2, p3, p4);
if (isS_67((_v417)[0])) {
return (((_v417)[0])[1] ? evalExpr_177((p0)[2], p1, p2, p3, (_v417)[1]) : evalExpr_177((p0)[3], p1, p2, p3, (_v417)[1]));
} else {
var _v419 = evalExpr_418((p0)[2], p1, p2, p3, (_v417)[1]);
var _v420 = evalExpr_418((p0)[3], p1, p2, p3, (_v419)[1]);
return [D_4((((((("(" + lift_7((_v417)[0])) + " ? ") + lift_7((_v419)[0])) + " : ") + lift_7((_v420)[0])) + ")")), (_v420)[1]];
}
} else {
return ((_v406 === "call") ? evalCall_421(p0, p1, p2, p3, p4) : [fail(("jsmix2: unsupported expression " + str(_v406))), p4]);
}
}
}
}
}
}
}
}
}
function evalStmts_180(p0, p1, p2) {
if (((p0).length === 0)) {
return [["S",null], p2];
} else {
var _v422 = (p0)[0];
var _v423 = (p0).slice(1);
var _v424 = (_v422)[0];
if ((_v424 === "return")) {
return ((((_v422)[1])[0] === "call") ? evalCallStmt_425((_v422)[1], p1, p2) : evalExpr_426((_v422)[1], p1, p2));
} else {
if ((_v424 === "var")) {
var _v427 = evalExpr_426((_v422)[2], p1, p2);
var _v428 = nameLeaves_137((_v427)[0], (_v427)[1]);
var _v429 = evalStmts_180(_v423, ([[(_v422)[1], (_v428)[0]]]).concat(p1), (_v428)[1]);
return (((_v428)[2] === "") ? _v429 : [["B", ((_v428)[2] + body_16((_v429)[0]))], (_v429)[1]]);
} else {
if ((_v424 === "block")) {
return evalStmts_180(((_v422)[1]).concat(_v423), p1, p2);
} else {
if ((_v424 === "if")) {
var _v430 = evalExpr_426((_v422)[1], p1, p2);
var _v431 = ([(_v422)[2]]).concat(_v423);
var _v432 = (((_v422)[3] === null) ? _v423 : ([(_v422)[3]]).concat(_v423));
if (isS_67((_v430)[0])) {
return (((_v430)[0])[1] ? evalStmts_180(_v431, p1, (_v430)[1]) : evalStmts_180(_v432, p1, (_v430)[1]));
} else {
var _v434 = evalStmts_433(_v431, p1, (_v430)[1]);
var _v435 = evalStmts_433(_v432, p1, (_v434)[1]);
return ((!(isB_15((_v434)[0])) && !(isB_15((_v435)[0]))) ? [D_4((((((("(" + lift_7((_v430)[0])) + " ? ") + lift_7((_v434)[0])) + " : ") + lift_7((_v435)[0])) + ")")), (_v435)[1]] : [["B", (((((("if (" + lift_7((_v430)[0])) + ") {\n") + body_16((_v434)[0])) + "} else {\n") + body_16((_v435)[0])) + "}\n")], (_v435)[1]]);
}
} else {
return evalStmts_180(_v423, p1, p2);
}
}
}
}
}
}
function evalStmts_185(p0, p1, p2, p3, p4) {
if (((p0).length === 0)) {
return [["S",null], p4];
} else {
var _v436 = (p0)[0];
var _v437 = (p0).slice(1);
var _v438 = (_v436)[0];
if ((_v438 === "return")) {
return ((((_v436)[1])[0] === "call") ? evalCallStmt_439((_v436)[1], p1, p2, p3, p4) : evalExpr_418((_v436)[1], p1, p2, p3, p4));
} else {
if ((_v438 === "var")) {
var _v440 = evalExpr_418((_v436)[2], p1, p2, p3, p4);
var _v441 = nameLeaves_137((_v440)[0], (_v440)[1]);
var _v442 = evalStmts_433(_v437, [[(_v436)[1], (_v441)[0]], ["x", p1], ["acc", p2], ["prog", p3]], (_v441)[1]);
return (((_v441)[2] === "") ? _v442 : [["B", ((_v441)[2] + body_16((_v442)[0]))], (_v442)[1]]);
} else {
if ((_v438 === "block")) {
return evalStmts_185(((_v436)[1]).concat(_v437), p1, p2, p3, p4);
} else {
if ((_v438 === "if")) {
var _v443 = evalExpr_418((_v436)[1], p1, p2, p3, p4);
var _v444 = ([(_v436)[2]]).concat(_v437);
var _v445 = (((_v436)[3] === null) ? _v437 : ([(_v436)[3]]).concat(_v437));
if (isS_67((_v443)[0])) {
return (((_v443)[0])[1] ? evalStmts_185(_v444, p1, p2, p3, (_v443)[1]) : evalStmts_185(_v445, p1, p2, p3, (_v443)[1]));
} else {
var _v446 = evalStmts_185(_v444, p1, p2, p3, (_v443)[1]);
var _v447 = evalStmts_185(_v445, p1, p2, p3, (_v446)[1]);
return ((!(isB_15((_v446)[0])) && !(isB_15((_v447)[0]))) ? [D_4((((((("(" + lift_7((_v443)[0])) + " ? ") + lift_7((_v446)[0])) + " : ") + lift_7((_v447)[0])) + ")")), (_v447)[1]] : [["B", (((((("if (" + lift_7((_v443)[0])) + ") {\n") + body_16((_v446)[0])) + "} else {\n") + body_16((_v447)[0])) + "}\n")], (_v447)[1]]);
}
} else {
return evalStmts_185(_v437, p1, p2, p3, p4);
}
}
}
}
}
}
function evalExpr_201(p0, p1, p2, p3, p4, p5) {
var _v448 = (((((p1)[0] === "S") && true) && indexable_42((p1)[1])) ? S_0(((p1)[1])[1]) : ((isA_43(p1) && true) ? ((p1)[1])[1] : D_4((((paren_3(lift_7(p1)) + "[") + "1") + "]"))));
return [((((p3)[0] === "S") && isS_67(_v448)) ? S_0(applyOp_449((p3)[1], (_v448)[1])) : D_4((((((("(" + lift_7(p3)) + " ") + "+") + " ") + lift_7(_v448)) + ")"))), p5];
}
function evalExpr_202(p0, p1, p2, p3, p4, p5) {
var _v450 = ((((p0)[0] === "S") && true) ? S_0(applyOp_161((p0)[1])) : D_4((((((("(" + lift_7(p0)) + " ") + "===") + " ") + "\"mullit\"") + ")")));
if (((_v450)[0] === "S")) {
return ((_v450)[1] ? evalExpr_451(p0, p1, p2, p3, p4, p5) : evalExpr_452(p0, p1, p2, p3, p4, p5));
} else {
var _v454 = evalExpr_453(p0, p1, p2, p3, p4, p5);
var _v456 = evalExpr_455(p0, p1, p2, p3, p4, (_v454)[1]);
return [D_4((((((("(" + lift_7(_v450)) + " ? ") + lift_7((_v454)[0])) + " : ") + lift_7((_v456)[0])) + ")")), (_v456)[1]];
}
}
function evalExpr_203(p0, p1, p2, p3, p4, p5) {
var _v457 = (((((p1)[0] === "S") && true) && indexable_42((p1)[1])) ? S_0(((p1)[1])[1]) : ((isA_43(p1) && true) ? ((p1)[1])[1] : D_4((((paren_3(lift_7(p1)) + "[") + "1") + "]"))));
return [((((p3)[0] === "S") && isS_67(_v457)) ? S_0(applyOp_449((p3)[1], (_v457)[1])) : D_4((((((("(" + lift_7(p3)) + " ") + "+") + " ") + lift_7(_v457)) + ")"))), p5];
}
function evalExpr_205(p0, p1, p2, p3, p4, p5) {
var _v458 = ((((p0)[0] === "S") && true) ? S_0(applyOp_161((p0)[1])) : D_4((((((("(" + lift_7(p0)) + " ") + "===") + " ") + "\"mullit\"") + ")")));
if (((_v458)[0] === "S")) {
return ((_v458)[1] ? evalExpr_453(p0, p1, p2, p3, p4, p5) : evalExpr_455(p0, p1, p2, p3, p4, p5));
} else {
var _v459 = evalExpr_453(p0, p1, p2, p3, p4, p5);
var _v460 = evalExpr_455(p0, p1, p2, p3, p4, (_v459)[1]);
return [D_4((((((("(" + lift_7(_v458)) + " ? ") + lift_7((_v459)[0])) + " : ") + lift_7((_v460)[0])) + ")")), (_v460)[1]];
}
}
function evalCallStmt_235(p0, p1, p2, p3, p4, p5) {
var _v461 = (p0)[1];
var _v465 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p4];
} else {
var _v462 = evalExpr_236(((p0)[2])[0], p1, p2, p3, p4, p5);
var _v464 = evalList_463(((p0)[2]).slice(1), p1, p2, p3, (_v462)[1], p5);
return [([(_v462)[0]]).concat((_v464)[0]), (_v464)[1]];
}
})();
var _v466 = (_v465)[0];
var _v467 = (_v465)[1];
if (((_v461)[0] === "dot")) {
var _v468 = evalExpr_236((_v461)[1], p1, p2, p3, _v467, p5);
return [evalBuiltin_319((_v461)[2], (_v468)[0], _v466), (_v468)[1]];
} else {
var _v469 = findFn_320((_v461)[1]);
return ((_v469 === null) ? [evalBuiltin_322((_v461)[1], _v466), _v467] : ((!(p5) || allStatic_68(_v466)) ? unfold_470(_v469, _v466, _v467, p5) : residualCall_471(_v469, _v466, _v467)));
}
}
function evalExpr_236(p0, p1, p2, p3, p4, p5) {
var _v472 = (p0)[0];
if ((_v472 === "lit")) {
return [S_0((p0)[1]), p4];
} else {
if ((_v472 === "var")) {
return [lookup_407(p1, p2, p3, (p0)[1]), p4];
} else {
if ((_v472 === "arr")) {
var _v473 = evalList_463((p0)[1], p1, p2, p3, p4, p5);
return [mkArr_38((_v473)[0]), (_v473)[1]];
} else {
if ((_v472 === "idx")) {
var _v474 = evalExpr_236((p0)[1], p1, p2, p3, p4, p5);
var _v475 = evalExpr_236((p0)[2], p1, p2, p3, (_v474)[1], p5);
return [index_330((_v474)[0], (_v475)[0]), (_v475)[1]];
} else {
if ((_v472 === "dot")) {
var _v476 = evalExpr_236((p0)[1], p1, p2, p3, p4, p5);
return [prop_332((_v476)[0], (p0)[2]), (_v476)[1]];
} else {
if ((_v472 === "not")) {
var _v477 = evalExpr_236((p0)[1], p1, p2, p3, p4, p5);
return (isS_67((_v477)[0]) ? [S_0(!(((_v477)[0])[1])), (_v477)[1]] : [D_4(("!" + paren_3(lift_7((_v477)[0])))), (_v477)[1]]);
} else {
if ((_v472 === "bin")) {
var _v478 = (p0)[1];
if (((_v478 === "&&") || (_v478 === "||"))) {
return evalLogic_479(_v478, p0, p1, p2, p3, p4, p5);
} else {
var _v480 = evalExpr_236((p0)[2], p1, p2, p3, p4, p5);
var _v481 = evalExpr_236((p0)[3], p1, p2, p3, (_v480)[1], p5);
return [binop_338(_v478, (_v480)[0], (_v481)[0]), (_v481)[1]];
}
} else {
if ((_v472 === "cond")) {
var _v482 = evalExpr_236((p0)[1], p1, p2, p3, p4, p5);
if (isS_67((_v482)[0])) {
return (((_v482)[0])[1] ? evalExpr_236((p0)[2], p1, p2, p3, (_v482)[1], p5) : evalExpr_236((p0)[3], p1, p2, p3, (_v482)[1], p5));
} else {
var _v483 = evalExpr_418((p0)[2], p1, p2, p3, (_v482)[1]);
var _v484 = evalExpr_418((p0)[3], p1, p2, p3, (_v483)[1]);
return [D_4((((((("(" + lift_7((_v482)[0])) + " ? ") + lift_7((_v483)[0])) + " : ") + lift_7((_v484)[0])) + ")")), (_v484)[1]];
}
} else {
return ((_v472 === "call") ? evalCall_485(p0, p1, p2, p3, p4, p5) : [fail(("jsmix2: unsupported expression " + str(_v472))), p4]);
}
}
}
}
}
}
}
}
}
function evalStmts_239(p0, p1, p2, p3) {
if (((p0).length === 0)) {
return [["S",null], p2];
} else {
var _v486 = (p0)[0];
var _v487 = (p0).slice(1);
var _v488 = (_v486)[0];
if ((_v488 === "return")) {
return ((((_v486)[1])[0] === "call") ? evalCallStmt_489((_v486)[1], p1, p2, p3) : evalExpr_490((_v486)[1], p1, p2, p3));
} else {
if ((_v488 === "var")) {
var _v491 = evalExpr_490((_v486)[2], p1, p2, p3);
var _v492 = nameLeaves_137((_v491)[0], (_v491)[1]);
var _v493 = evalStmts_239(_v487, ([[(_v486)[1], (_v492)[0]]]).concat(p1), (_v492)[1], p3);
return (((_v492)[2] === "") ? _v493 : [["B", ((_v492)[2] + body_16((_v493)[0]))], (_v493)[1]]);
} else {
if ((_v488 === "block")) {
return evalStmts_239(((_v486)[1]).concat(_v487), p1, p2, p3);
} else {
if ((_v488 === "if")) {
var _v494 = evalExpr_490((_v486)[1], p1, p2, p3);
var _v495 = ([(_v486)[2]]).concat(_v487);
var _v496 = (((_v486)[3] === null) ? _v487 : ([(_v486)[3]]).concat(_v487));
if (isS_67((_v494)[0])) {
return (((_v494)[0])[1] ? evalStmts_239(_v495, p1, (_v494)[1], p3) : evalStmts_239(_v496, p1, (_v494)[1], p3));
} else {
var _v497 = evalStmts_433(_v495, p1, (_v494)[1]);
var _v498 = evalStmts_433(_v496, p1, (_v497)[1]);
return ((!(isB_15((_v497)[0])) && !(isB_15((_v498)[0]))) ? [D_4((((((("(" + lift_7((_v494)[0])) + " ? ") + lift_7((_v497)[0])) + " : ") + lift_7((_v498)[0])) + ")")), (_v498)[1]] : [["B", (((((("if (" + lift_7((_v494)[0])) + ") {\n") + body_16((_v497)[0])) + "} else {\n") + body_16((_v498)[0])) + "}\n")], (_v498)[1]]);
}
} else {
return evalStmts_239(_v487, p1, p2, p3);
}
}
}
}
}
}
function skels_286(p0) {
return (((p0).length === 0) ? [] : ([skel_287((p0)[0])]).concat(skels_286((p0).slice(1))));
}
function skel_287(p0) {
return (((p0)[0] === "S") ? ["S", (p0)[1]] : (isD_31(p0) ? ["D"] : ["A", skels_286((p0)[1])]));
}
function memoFind_290(p0, p1) {
return (((p0).length === 0) ? null : ((((p0)[0])[0] === p1) ? ((p0)[0])[1] : memoFind_290((p0).slice(1), p1)));
}
function dynLeaves_292(p0) {
return (((p0).length === 0) ? [] : (dynLeavesOf_293((p0)[0])).concat(dynLeaves_292((p0).slice(1))));
}
function dynLeavesOf_293(p0) {
return (((p0)[0] === "S") ? [] : (isD_31(p0) ? [(p0)[1]] : dynLeaves_292((p0)[1])));
}
function sizeOfSkels_295(p0) {
return (((p0).length === 0) ? 0 : (sizeOfSkel_499((p0)[0]) + sizeOfSkels_295((p0).slice(1))));
}
function smallerAncestor_296(p0) {
return null;
}
function generalizeList_298(p0, p1) {
return (((p0).length === 0) ? [] : ([generalize_500((p0)[0], (p1)[0])]).concat(generalizeList_298((p0).slice(1), (p1).slice(1))));
}
function countFor_300(p0) {
return (((p0).length === 0) ? 0 : ((startsWith_501(((p0)[0])[0]) ? 1 : 0) + countFor_300((p0).slice(1))));
}
function allDynamic_301(p0) {
return (((p0).length === 0) ? true : (isD_31((p0)[0]) && allDynamic_301((p0).slice(1))));
}
function liftAll_302(p0) {
return (((p0).length === 0) ? [] : ([D_4(lift_7((p0)[0]))]).concat(liftAll_302((p0).slice(1))));
}
function rebuild_306(p0, p1) {
if (((p0)[0] === "S")) {
return [S_0((p0)[1]), p1];
} else {
if (((p0)[0] === "D")) {
return [D_4(("p" + p1)), (p1 + 1)];
} else {
var _v502 = rebuildList_128((p0)[1], p1);
return [mkArr_38((_v502)[0]), (_v502)[1]];
}
}
}
function bindAll_309(p0, p1, p2) {
return (((p0).length === 0) ? p2 : bindAll_309((p0).slice(1), (p1).slice(1), ([[(p0)[0], (p1)[0]]]).concat(p2)));
}
function evalList_312(p0, p1, p2, p3) {
if (((p0).length === 0)) {
return [[], p2];
} else {
var _v503 = evalExpr_317((p0)[0], p1, p2, p3);
var _v504 = evalList_312((p0).slice(1), p1, (_v503)[1], p3);
return [([(_v503)[0]]).concat((_v504)[0]), (_v504)[1]];
}
}
function evalExpr_317(p0, p1, p2, p3) {
var _v505 = (p0)[0];
if ((_v505 === "lit")) {
return [S_0((p0)[1]), p2];
} else {
if ((_v505 === "var")) {
return [lookup_325(p1, (p0)[1]), p2];
} else {
if ((_v505 === "arr")) {
var _v506 = evalList_312((p0)[1], p1, p2, p3);
return [mkArr_38((_v506)[0]), (_v506)[1]];
} else {
if ((_v505 === "idx")) {
var _v507 = evalExpr_317((p0)[1], p1, p2, p3);
var _v508 = evalExpr_317((p0)[2], p1, (_v507)[1], p3);
return [index_330((_v507)[0], (_v508)[0]), (_v508)[1]];
} else {
if ((_v505 === "dot")) {
var _v509 = evalExpr_317((p0)[1], p1, p2, p3);
return [prop_332((_v509)[0], (p0)[2]), (_v509)[1]];
} else {
if ((_v505 === "not")) {
var _v510 = evalExpr_317((p0)[1], p1, p2, p3);
return (isS_67((_v510)[0]) ? [S_0(!(((_v510)[0])[1])), (_v510)[1]] : [D_4(("!" + paren_3(lift_7((_v510)[0])))), (_v510)[1]]);
} else {
if ((_v505 === "bin")) {
var _v511 = (p0)[1];
if (((_v511 === "&&") || (_v511 === "||"))) {
return evalLogic_512(_v511, p0, p1, p2, p3);
} else {
var _v513 = evalExpr_317((p0)[2], p1, p2, p3);
var _v514 = evalExpr_317((p0)[3], p1, (_v513)[1], p3);
return [binop_338(_v511, (_v513)[0], (_v514)[0]), (_v514)[1]];
}
} else {
if ((_v505 === "cond")) {
var _v515 = evalExpr_317((p0)[1], p1, p2, p3);
if (isS_67((_v515)[0])) {
return (((_v515)[0])[1] ? evalExpr_317((p0)[2], p1, (_v515)[1], p3) : evalExpr_317((p0)[3], p1, (_v515)[1], p3));
} else {
var _v516 = evalExpr_340((p0)[2], p1, (_v515)[1], p3);
var _v517 = evalExpr_340((p0)[3], p1, (_v516)[1], p3);
return [D_4((((((("(" + lift_7((_v515)[0])) + " ? ") + lift_7((_v516)[0])) + " : ") + lift_7((_v517)[0])) + ")")), (_v517)[1]];
}
} else {
return ((_v505 === "call") ? evalCall_518(p0, p1, p2, p3) : [fail(("jsmix2: unsupported expression " + str(_v505))), p2]);
}
}
}
}
}
}
}
}
}
function evalBuiltin_319(p0, p1, p2) {
if (((p0 !== "slice") && ((p2).length !== 1))) {
return fail(((("jsmix2: builtin " + str(p0)) + " takes 1 argument, got ") + str((p2).length)));
} else {
if ((p0 === "str")) {
return (isS_67((p2)[0]) ? S_0(str(((p2)[0])[1])) : D_4((("str(" + lift_7((p2)[0])) + ")")));
} else {
if ((p0 === "isArr")) {
return (isS_67((p2)[0]) ? S_0(isArr(((p2)[0])[1])) : (isA_43((p2)[0]) ? ["S",true] : D_4((("isArr(" + lift_7((p2)[0])) + ")"))));
} else {
if ((p0 === "kind")) {
return (isS_67((p2)[0]) ? S_0(kind(((p2)[0])[1])) : (isA_43((p2)[0]) ? ["S","array"] : D_4((("kind(" + lift_7((p2)[0])) + ")"))));
} else {
if ((p0 === "fail")) {
return (isS_67((p2)[0]) ? fail(((p2)[0])[1]) : D_4((("fail(" + lift_7((p2)[0])) + ")")));
} else {
if ((p0 === "slice")) {
return (((p2).length === 1) ? (((isS_67(p1) && isS_67((p2)[0])) && indexable_42((p1)[1])) ? S_0(((p1)[1]).slice(((p2)[0])[1])) : ((isA_43(p1) && isS_67((p2)[0])) ? mkArr_38(((p1)[1]).slice(((p2)[0])[1])) : D_4((((paren_3(lift_7(p1)) + ".slice(") + lift_7((p2)[0])) + ")")))) : (((p2).length === 2) ? (((isS_67(p1) && allStatic_68(p2)) && indexable_42((p1)[1])) ? S_0(((p1)[1]).slice(((p2)[0])[1], ((p2)[1])[1])) : ((isA_43(p1) && allStatic_68(p2)) ? mkArr_38(((p1)[1]).slice(((p2)[0])[1], ((p2)[1])[1])) : D_4((((paren_3(lift_7(p1)) + ".slice(") + joinCodes_32(p2)) + ")")))) : fail(("jsmix2: slice takes 1 or 2 arguments, got " + str((p2).length)))));
} else {
if ((p0 === "indexOf")) {
return (((isS_67(p1) && isS_67((p2)[0])) && indexable_42((p1)[1])) ? S_0(((p1)[1]).indexOf(((p2)[0])[1])) : D_4((((paren_3(lift_7(p1)) + ".indexOf(") + lift_7((p2)[0])) + ")")));
} else {
if ((p0 === "concat")) {
var _v520 = elems_519(p1);
var _v521 = elems_519((p2)[0]);
return (((_v520 !== null) && (_v521 !== null)) ? mkArr_38((_v520).concat(_v521)) : D_4((((paren_3(lift_7(p1)) + ".concat(") + lift_7((p2)[0])) + ")")));
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
function findFn_320(p0) {
return (("interp" === p0) ? ["fundecl","interp",["prog","x"],[["return",["call",["var","run"],[["var","prog"],["lit",0],["var","x"]]]]]] : findFn_522(p0));
}
function evalBuiltin_322(p0, p1) {
if (((p0 !== "slice") && ((p1).length !== 1))) {
return fail(((("jsmix2: builtin " + str(p0)) + " takes 1 argument, got ") + str((p1).length)));
} else {
if ((p0 === "str")) {
return (isS_67((p1)[0]) ? S_0(str(((p1)[0])[1])) : D_4((("str(" + lift_7((p1)[0])) + ")")));
} else {
if ((p0 === "isArr")) {
return (isS_67((p1)[0]) ? S_0(isArr(((p1)[0])[1])) : (isA_43((p1)[0]) ? ["S",true] : D_4((("isArr(" + lift_7((p1)[0])) + ")"))));
} else {
if ((p0 === "kind")) {
return (isS_67((p1)[0]) ? S_0(kind(((p1)[0])[1])) : (isA_43((p1)[0]) ? ["S","array"] : D_4((("kind(" + lift_7((p1)[0])) + ")"))));
} else {
if ((p0 === "fail")) {
return (isS_67((p1)[0]) ? fail(((p1)[0])[1]) : D_4((("fail(" + lift_7((p1)[0])) + ")")));
} else {
if ((p0 === "slice")) {
return (((p1).length === 1) ? (((((null)[0] === "S") && isS_67((p1)[0])) && indexable_42((null)[1])) ? S_0(((null)[1]).slice(((p1)[0])[1])) : ((((null)[0] === "A") && isS_67((p1)[0])) ? mkArr_38(((null)[1]).slice(((p1)[0])[1])) : D_4((((paren_3((((null)[0] === "S") ? str((null)[1]) : (((null)[0] === "D") ? (null)[1] : (("[" + joinCodes_32((null)[1])) + "]")))) + ".slice(") + lift_7((p1)[0])) + ")")))) : (((p1).length === 2) ? (((((null)[0] === "S") && allStatic_68(p1)) && indexable_42((null)[1])) ? S_0(((null)[1]).slice(((p1)[0])[1], ((p1)[1])[1])) : ((((null)[0] === "A") && allStatic_68(p1)) ? mkArr_38(((null)[1]).slice(((p1)[0])[1], ((p1)[1])[1])) : D_4((((paren_3((((null)[0] === "S") ? str((null)[1]) : (((null)[0] === "D") ? (null)[1] : (("[" + joinCodes_32((null)[1])) + "]")))) + ".slice(") + joinCodes_32(p1)) + ")")))) : fail(("jsmix2: slice takes 1 or 2 arguments, got " + str((p1).length)))));
} else {
if ((p0 === "indexOf")) {
return (((((null)[0] === "S") && isS_67((p1)[0])) && indexable_42((null)[1])) ? S_0(((null)[1]).indexOf(((p1)[0])[1])) : D_4((((paren_3((((null)[0] === "S") ? str((null)[1]) : (((null)[0] === "D") ? (null)[1] : (("[" + joinCodes_32((null)[1])) + "]")))) + ".indexOf(") + lift_7((p1)[0])) + ")")));
} else {
if ((p0 === "concat")) {
var _v524 = (((null)[0] === "A") ? (null)[1] : ((((null)[0] === "S") && isArr((null)[1])) ? elemsOfStatic_523((null)[1]) : null));
var _v525 = elems_519((p1)[0]);
return (((_v524 !== null) && (_v525 !== null)) ? mkArr_38((_v524).concat(_v525)) : D_4((((paren_3((((null)[0] === "S") ? str((null)[1]) : (((null)[0] === "D") ? (null)[1] : (("[" + joinCodes_32((null)[1])) + "]")))) + ".concat(") + lift_7((p1)[0])) + ")")));
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
function unfold_323(p0, p1, p2, p3) {
if ((((p0)[3]).length === 0)) {
return [["S",null], p2];
} else {
var _v526 = ((p0)[3])[0];
var _v527 = ((p0)[3]).slice(1);
var _v528 = (_v526)[0];
if ((_v528 === "return")) {
return ((((_v526)[1])[0] === "call") ? evalCallStmt_349((_v526)[1], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3) : evalExpr_317((_v526)[1], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3));
} else {
if ((_v528 === "var")) {
var _v529 = evalExpr_317((_v526)[2], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
var _v530 = nameLeaves_137((_v529)[0], (_v529)[1]);
var _v531 = evalStmts_139(_v527, ([[(_v526)[1], (_v530)[0]]]).concat(((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0]))), (_v530)[1], p3);
return (((_v530)[2] === "") ? _v531 : [["B", ((_v530)[2] + body_16((_v531)[0]))], (_v531)[1]]);
} else {
if ((_v528 === "block")) {
return evalStmts_139(((_v526)[1]).concat(_v527), ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
} else {
if ((_v528 === "if")) {
var _v532 = evalExpr_317((_v526)[1], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
var _v533 = ([(_v526)[2]]).concat(_v527);
var _v534 = (((_v526)[3] === null) ? _v527 : ([(_v526)[3]]).concat(_v527));
if (isS_67((_v532)[0])) {
return (((_v532)[0])[1] ? evalStmts_139(_v533, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v532)[1], p3) : evalStmts_139(_v534, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v532)[1], p3));
} else {
var _v535 = evalStmts_145(_v533, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v532)[1], p3);
var _v536 = evalStmts_145(_v534, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v535)[1], p3);
return ((!(isB_15((_v535)[0])) && !(isB_15((_v536)[0]))) ? [D_4((((((("(" + lift_7((_v532)[0])) + " ? ") + lift_7((_v535)[0])) + " : ") + lift_7((_v536)[0])) + ")")), (_v536)[1]] : [["B", (((((("if (" + lift_7((_v532)[0])) + ") {\n") + body_16((_v535)[0])) + "} else {\n") + body_16((_v536)[0])) + "}\n")], (_v536)[1]]);
}
} else {
return evalStmts_139(_v527, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
}
}
}
}
}
}
function lookup_325(p0, p1) {
return (((p0).length === 0) ? D_4(p1) : ((((p0)[0])[0] === p1) ? ((p0)[0])[1] : lookup_325((p0).slice(1), p1)));
}
function evalList_326(p0, p1, p2, p3, p4, p5) {
if (((p0).length === 0)) {
return [[], [p2, p3, p4]];
} else {
var _v537 = evalExpr_135((p0)[0], p1, p2, p3, p4, p5);
var _v538 = evalList_312((p0).slice(1), p1, (_v537)[1], p5);
return [([(_v537)[0]]).concat((_v538)[0]), (_v538)[1]];
}
}
function index_330(p0, p1) {
return (((((p0)[0] === "S") && isS_67(p1)) && indexable_42((p0)[1])) ? S_0(((p0)[1])[(p1)[1]]) : ((isA_43(p0) && isS_67(p1)) ? ((p0)[1])[(p1)[1]] : D_4((((paren_3(lift_7(p0)) + "[") + lift_7(p1)) + "]"))));
}
function prop_332(p0, p1) {
return ((p1 === "length") ? ((isS_67(p0) && indexable_42((p0)[1])) ? S_0(((p0)[1]).length) : (isA_43(p0) ? S_0(((p0)[1]).length) : D_4((paren_3(lift_7(p0)) + ".length")))) : D_4(((paren_3(lift_7(p0)) + ".") + p1)));
}
function evalLogic_335(p0, p1, p2, p3, p4, p5, p6) {
var _v551 = (function () {
var _v539 = ((p1)[2])[0];
if ((_v539 === "lit")) {
return [S_0(((p1)[2])[1]), [p3, p4, p5]];
} else {
if ((_v539 === "var")) {
return [lookup_325(p2, ((p1)[2])[1]), [p3, p4, p5]];
} else {
if ((_v539 === "arr")) {
var _v540 = evalList_326(((p1)[2])[1], p2, p3, p4, p5, p6);
return [mkArr_38((_v540)[0]), (_v540)[1]];
} else {
if ((_v539 === "idx")) {
var _v541 = evalExpr_135(((p1)[2])[1], p2, p3, p4, p5, p6);
var _v542 = evalExpr_317(((p1)[2])[2], p2, (_v541)[1], p6);
return [index_330((_v541)[0], (_v542)[0]), (_v542)[1]];
} else {
if ((_v539 === "dot")) {
var _v543 = evalExpr_135(((p1)[2])[1], p2, p3, p4, p5, p6);
return [prop_332((_v543)[0], ((p1)[2])[2]), (_v543)[1]];
} else {
if ((_v539 === "not")) {
var _v544 = evalExpr_135(((p1)[2])[1], p2, p3, p4, p5, p6);
return (isS_67((_v544)[0]) ? [S_0(!(((_v544)[0])[1])), (_v544)[1]] : [D_4(("!" + paren_3(lift_7((_v544)[0])))), (_v544)[1]]);
} else {
if ((_v539 === "bin")) {
var _v545 = ((p1)[2])[1];
if (((_v545 === "&&") || (_v545 === "||"))) {
return evalLogic_335(_v545, (p1)[2], p2, p3, p4, p5, p6);
} else {
var _v546 = evalExpr_135(((p1)[2])[2], p2, p3, p4, p5, p6);
var _v547 = evalExpr_317(((p1)[2])[3], p2, (_v546)[1], p6);
return [binop_338(_v545, (_v546)[0], (_v547)[0]), (_v547)[1]];
}
} else {
if ((_v539 === "cond")) {
var _v548 = evalExpr_135(((p1)[2])[1], p2, p3, p4, p5, p6);
if (isS_67((_v548)[0])) {
return (((_v548)[0])[1] ? evalExpr_317(((p1)[2])[2], p2, (_v548)[1], p6) : evalExpr_317(((p1)[2])[3], p2, (_v548)[1], p6));
} else {
var _v549 = evalExpr_340(((p1)[2])[2], p2, (_v548)[1], p6);
var _v550 = evalExpr_340(((p1)[2])[3], p2, (_v549)[1], p6);
return [D_4((((((("(" + lift_7((_v548)[0])) + " ? ") + lift_7((_v549)[0])) + " : ") + lift_7((_v550)[0])) + ")")), (_v550)[1]];
}
} else {
return ((_v539 === "call") ? evalCall_343((p1)[2], p2, p3, p4, p5, p6) : [fail(("jsmix2: unsupported expression " + str(_v539))), [p3, p4, p5]]);
}
}
}
}
}
}
}
}
})();
if ((((_v551)[0])[0] === "S")) {
return ((p0 === "&&") ? (((_v551)[0])[1] ? evalExpr_317((p1)[3], p2, (_v551)[1], p6) : _v551) : (((_v551)[0])[1] ? _v551 : evalExpr_317((p1)[3], p2, (_v551)[1], p6)));
} else {
var _v552 = evalExpr_340((p1)[3], p2, (_v551)[1], p6);
return [D_4((((((("(" + lift_7((_v551)[0])) + " ") + p0) + " ") + lift_7((_v552)[0])) + ")")), (_v552)[1]];
}
}
function binop_338(p0, p1, p2) {
return ((((p1)[0] === "S") && isS_67(p2)) ? S_0(applyOp_553(p0, (p1)[1], (p2)[1])) : D_4((((((("(" + lift_7(p1)) + " ") + p0) + " ") + lift_7(p2)) + ")")));
}
function evalExpr_340(p0, p1, p2, p3) {
var _v554 = (p0)[0];
if ((_v554 === "lit")) {
return [S_0((p0)[1]), p2];
} else {
if ((_v554 === "var")) {
return [lookup_325(p1, (p0)[1]), p2];
} else {
if ((_v554 === "arr")) {
var _v556 = evalList_555((p0)[1], p1, p2, p3);
return [mkArr_38((_v556)[0]), (_v556)[1]];
} else {
if ((_v554 === "idx")) {
var _v557 = evalExpr_340((p0)[1], p1, p2, p3);
var _v558 = evalExpr_340((p0)[2], p1, (_v557)[1], p3);
return [index_330((_v557)[0], (_v558)[0]), (_v558)[1]];
} else {
if ((_v554 === "dot")) {
var _v559 = evalExpr_340((p0)[1], p1, p2, p3);
return [prop_332((_v559)[0], (p0)[2]), (_v559)[1]];
} else {
if ((_v554 === "not")) {
var _v560 = evalExpr_340((p0)[1], p1, p2, p3);
return (isS_67((_v560)[0]) ? [S_0(!(((_v560)[0])[1])), (_v560)[1]] : [D_4(("!" + paren_3(lift_7((_v560)[0])))), (_v560)[1]]);
} else {
if ((_v554 === "bin")) {
var _v561 = (p0)[1];
if (((_v561 === "&&") || (_v561 === "||"))) {
return evalLogic_562(_v561, p0, p1, p2, p3);
} else {
var _v563 = evalExpr_340((p0)[2], p1, p2, p3);
var _v564 = evalExpr_340((p0)[3], p1, (_v563)[1], p3);
return [binop_338(_v561, (_v563)[0], (_v564)[0]), (_v564)[1]];
}
} else {
if ((_v554 === "cond")) {
var _v565 = evalExpr_340((p0)[1], p1, p2, p3);
if (isS_67((_v565)[0])) {
return (((_v565)[0])[1] ? evalExpr_340((p0)[2], p1, (_v565)[1], p3) : evalExpr_340((p0)[3], p1, (_v565)[1], p3));
} else {
var _v566 = evalExpr_340((p0)[2], p1, (_v565)[1], p3);
var _v567 = evalExpr_340((p0)[3], p1, (_v566)[1], p3);
return [D_4((((((("(" + lift_7((_v565)[0])) + " ? ") + lift_7((_v566)[0])) + " : ") + lift_7((_v567)[0])) + ")")), (_v567)[1]];
}
} else {
return ((_v554 === "call") ? evalCall_568(p0, p1, p2, p3) : [fail(("jsmix2: unsupported expression " + str(_v554))), p2]);
}
}
}
}
}
}
}
}
}
function evalCall_343(p0, p1, p2, p3, p4, p5) {
var _v577 = (function () {
var _v569 = (p0)[1];
var _v572 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], [p2, p3, p4]];
} else {
var _v570 = evalExpr_135(((p0)[2])[0], p1, p2, p3, p4, p5);
var _v571 = evalList_312(((p0)[2]).slice(1), p1, (_v570)[1], p5);
return [([(_v570)[0]]).concat((_v571)[0]), (_v571)[1]];
}
})();
var _v573 = (_v572)[0];
var _v574 = (_v572)[1];
if (((_v569)[0] === "dot")) {
var _v575 = evalExpr_317((_v569)[1], p1, _v574, p5);
return [evalBuiltin_319((_v569)[2], (_v575)[0], _v573), (_v575)[1]];
} else {
var _v576 = findFn_320((_v569)[1]);
return ((_v576 === null) ? [evalBuiltin_322((_v569)[1], _v573), _v574] : unfold_323(_v576, _v573, _v574, p5));
}
})();
return [((((_v577)[0])[0] === "B") ? D_4((("(function () {\n" + ((_v577)[0])[1]) + "})()")) : (_v577)[0]), (_v577)[1]];
}
function evalCallStmt_349(p0, p1, p2, p3) {
var _v578 = (p0)[1];
var _v581 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p2];
} else {
var _v579 = evalExpr_317(((p0)[2])[0], p1, p2, p3);
var _v580 = evalList_312(((p0)[2]).slice(1), p1, (_v579)[1], p3);
return [([(_v579)[0]]).concat((_v580)[0]), (_v580)[1]];
}
})();
var _v582 = (_v581)[0];
var _v583 = (_v581)[1];
if (((_v578)[0] === "dot")) {
var _v584 = evalExpr_317((_v578)[1], p1, _v583, p3);
return [evalBuiltin_319((_v578)[2], (_v584)[0], _v582), (_v584)[1]];
} else {
var _v585 = findFn_320((_v578)[1]);
return ((_v585 === null) ? [evalBuiltin_322((_v578)[1], _v582), _v583] : unfold_323(_v585, _v582, _v583, p3));
}
}
function evalCallStmt_372(p0, p1, p2, p3) {
var _v586 = (p0)[1];
var _v589 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p2];
} else {
var _v587 = evalExpr_340(((p0)[2])[0], p1, p2, p3);
var _v588 = evalList_555(((p0)[2]).slice(1), p1, (_v587)[1], p3);
return [([(_v587)[0]]).concat((_v588)[0]), (_v588)[1]];
}
})();
var _v590 = (_v589)[0];
var _v591 = (_v589)[1];
if (((_v586)[0] === "dot")) {
var _v592 = evalExpr_340((_v586)[1], p1, _v591, p3);
return [evalBuiltin_319((_v586)[2], (_v592)[0], _v590), (_v592)[1]];
} else {
var _v593 = findFn_320((_v586)[1]);
return ((_v593 === null) ? [evalBuiltin_322((_v586)[1], _v590), _v591] : (allStatic_68(_v590) ? unfold_594(_v593, _v590, _v591, p3) : residualCall_595(_v593, _v590, _v591, p3)));
}
}
function paramNames_381(p0) {
return ((2 >= p0) ? [] : (["p2"]).concat(paramNames_596(p0)));
}
function applyOp_383(p0) {
return (0 * p0);
}
function applyOp_384(p0) {
return (p0 === "addin");
}
function evalExpr_386(p0, p1, p2, p3) {
return [["D","(0 + x)"], p3];
}
function evalExpr_387(p0, p1, p2, p3) {
var _v598 = ((((p0)[0] === "S") && true) ? S_0(applyOp_597((p0)[1])) : D_4((((((("(" + lift_7(p0)) + " ") + "===") + " ") + "\"subin\"") + ")")));
if (((_v598)[0] === "S")) {
return ((_v598)[1] ? evalExpr_599(p0, p1, p2, p3) : evalExpr_600(p0, p1, p2, p3));
} else {
var _v602 = evalExpr_601(p0, p1, p2, p3);
var _v604 = evalExpr_603(p0, p1, p2, (_v602)[1]);
return [D_4((((((("(" + lift_7(_v598)) + " ? ") + lift_7((_v602)[0])) + " : ") + lift_7((_v604)[0])) + ")")), (_v604)[1]];
}
}
function evalExpr_388(p0, p1, p2, p3) {
return [["D","(0 + x)"], p3];
}
function evalExpr_390(p0, p1, p2, p3) {
var _v605 = ((((p0)[0] === "S") && true) ? S_0(applyOp_597((p0)[1])) : D_4((((((("(" + lift_7(p0)) + " ") + "===") + " ") + "\"subin\"") + ")")));
if (((_v605)[0] === "S")) {
return ((_v605)[1] ? evalExpr_601(p0, p1, p2, p3) : evalExpr_603(p0, p1, p2, p3));
} else {
var _v606 = evalExpr_601(p0, p1, p2, p3);
var _v607 = evalExpr_603(p0, p1, p2, (_v606)[1]);
return [D_4((((((("(" + lift_7(_v605)) + " ? ") + lift_7((_v606)[0])) + " : ") + lift_7((_v607)[0])) + ")")), (_v607)[1]];
}
}
function evalList_398(p0, p1, p2, p3, p4) {
if (((p0).length === 0)) {
return [[], p4];
} else {
var _v608 = evalExpr_177((p0)[0], p1, p2, p3, p4);
var _v609 = evalList_398((p0).slice(1), p1, p2, p3, (_v608)[1]);
return [([(_v608)[0]]).concat((_v609)[0]), (_v609)[1]];
}
}
function unfold_405(p0, p1, p2) {
if ((((p0)[3]).length === 0)) {
return [["S",null], p2];
} else {
var _v610 = ((p0)[3])[0];
var _v611 = ((p0)[3]).slice(1);
var _v612 = (_v610)[0];
if ((_v612 === "return")) {
return ((((_v610)[1])[0] === "call") ? evalCallStmt_425((_v610)[1], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2) : evalExpr_426((_v610)[1], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2));
} else {
if ((_v612 === "var")) {
var _v613 = evalExpr_426((_v610)[2], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2);
var _v614 = nameLeaves_137((_v613)[0], (_v613)[1]);
var _v615 = evalStmts_180(_v611, ([[(_v610)[1], (_v614)[0]]]).concat(((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0]))), (_v614)[1]);
return (((_v614)[2] === "") ? _v615 : [["B", ((_v614)[2] + body_16((_v615)[0]))], (_v615)[1]]);
} else {
if ((_v612 === "block")) {
return evalStmts_180(((_v610)[1]).concat(_v611), ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2);
} else {
if ((_v612 === "if")) {
var _v616 = evalExpr_426((_v610)[1], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2);
var _v617 = ([(_v610)[2]]).concat(_v611);
var _v618 = (((_v610)[3] === null) ? _v611 : ([(_v610)[3]]).concat(_v611));
if (isS_67((_v616)[0])) {
return (((_v616)[0])[1] ? evalStmts_180(_v617, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v616)[1]) : evalStmts_180(_v618, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v616)[1]));
} else {
var _v619 = evalStmts_433(_v617, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v616)[1]);
var _v620 = evalStmts_433(_v618, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v619)[1]);
return ((!(isB_15((_v619)[0])) && !(isB_15((_v620)[0]))) ? [D_4((((((("(" + lift_7((_v616)[0])) + " ? ") + lift_7((_v619)[0])) + " : ") + lift_7((_v620)[0])) + ")")), (_v620)[1]] : [["B", (((((("if (" + lift_7((_v616)[0])) + ") {\n") + body_16((_v619)[0])) + "} else {\n") + body_16((_v620)[0])) + "}\n")], (_v620)[1]]);
}
} else {
return evalStmts_180(_v611, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2);
}
}
}
}
}
}
function lookup_407(p0, p1, p2, p3) {
return (("x" === p3) ? p0 : lookup_621(p1, p2, p3));
}
function evalLogic_414(p0, p1, p2, p3, p4, p5) {
var _v634 = (function () {
var _v622 = ((p1)[2])[0];
if ((_v622 === "lit")) {
return [S_0(((p1)[2])[1]), p5];
} else {
if ((_v622 === "var")) {
return [lookup_407(p2, p3, p4, ((p1)[2])[1]), p5];
} else {
if ((_v622 === "arr")) {
var _v623 = evalList_398(((p1)[2])[1], p2, p3, p4, p5);
return [mkArr_38((_v623)[0]), (_v623)[1]];
} else {
if ((_v622 === "idx")) {
var _v624 = evalExpr_177(((p1)[2])[1], p2, p3, p4, p5);
var _v625 = evalExpr_177(((p1)[2])[2], p2, p3, p4, (_v624)[1]);
return [index_330((_v624)[0], (_v625)[0]), (_v625)[1]];
} else {
if ((_v622 === "dot")) {
var _v626 = evalExpr_177(((p1)[2])[1], p2, p3, p4, p5);
return [prop_332((_v626)[0], ((p1)[2])[2]), (_v626)[1]];
} else {
if ((_v622 === "not")) {
var _v627 = evalExpr_177(((p1)[2])[1], p2, p3, p4, p5);
return (isS_67((_v627)[0]) ? [S_0(!(((_v627)[0])[1])), (_v627)[1]] : [D_4(("!" + paren_3(lift_7((_v627)[0])))), (_v627)[1]]);
} else {
if ((_v622 === "bin")) {
var _v628 = ((p1)[2])[1];
if (((_v628 === "&&") || (_v628 === "||"))) {
return evalLogic_414(_v628, (p1)[2], p2, p3, p4, p5);
} else {
var _v629 = evalExpr_177(((p1)[2])[2], p2, p3, p4, p5);
var _v630 = evalExpr_177(((p1)[2])[3], p2, p3, p4, (_v629)[1]);
return [binop_338(_v628, (_v629)[0], (_v630)[0]), (_v630)[1]];
}
} else {
if ((_v622 === "cond")) {
var _v631 = evalExpr_177(((p1)[2])[1], p2, p3, p4, p5);
if (isS_67((_v631)[0])) {
return (((_v631)[0])[1] ? evalExpr_177(((p1)[2])[2], p2, p3, p4, (_v631)[1]) : evalExpr_177(((p1)[2])[3], p2, p3, p4, (_v631)[1]));
} else {
var _v632 = evalExpr_418(((p1)[2])[2], p2, p3, p4, (_v631)[1]);
var _v633 = evalExpr_418(((p1)[2])[3], p2, p3, p4, (_v632)[1]);
return [D_4((((((("(" + lift_7((_v631)[0])) + " ? ") + lift_7((_v632)[0])) + " : ") + lift_7((_v633)[0])) + ")")), (_v633)[1]];
}
} else {
return ((_v622 === "call") ? evalCall_421((p1)[2], p2, p3, p4, p5) : [fail(("jsmix2: unsupported expression " + str(_v622))), p5]);
}
}
}
}
}
}
}
}
})();
if ((((_v634)[0])[0] === "S")) {
return ((p0 === "&&") ? (((_v634)[0])[1] ? evalExpr_177((p1)[3], p2, p3, p4, (_v634)[1]) : _v634) : (((_v634)[0])[1] ? _v634 : evalExpr_177((p1)[3], p2, p3, p4, (_v634)[1])));
} else {
var _v635 = evalExpr_418((p1)[3], p2, p3, p4, (_v634)[1]);
return [D_4((((((("(" + lift_7((_v634)[0])) + " ") + p0) + " ") + lift_7((_v635)[0])) + ")")), (_v635)[1]];
}
}
function evalExpr_418(p0, p1, p2, p3, p4) {
var _v636 = (p0)[0];
if ((_v636 === "lit")) {
return [S_0((p0)[1]), p4];
} else {
if ((_v636 === "var")) {
return [lookup_407(p1, p2, p3, (p0)[1]), p4];
} else {
if ((_v636 === "arr")) {
var _v638 = evalList_637((p0)[1], p1, p2, p3, p4);
return [mkArr_38((_v638)[0]), (_v638)[1]];
} else {
if ((_v636 === "idx")) {
var _v639 = evalExpr_418((p0)[1], p1, p2, p3, p4);
var _v640 = evalExpr_418((p0)[2], p1, p2, p3, (_v639)[1]);
return [index_330((_v639)[0], (_v640)[0]), (_v640)[1]];
} else {
if ((_v636 === "dot")) {
var _v641 = evalExpr_418((p0)[1], p1, p2, p3, p4);
return [prop_332((_v641)[0], (p0)[2]), (_v641)[1]];
} else {
if ((_v636 === "not")) {
var _v642 = evalExpr_418((p0)[1], p1, p2, p3, p4);
return (isS_67((_v642)[0]) ? [S_0(!(((_v642)[0])[1])), (_v642)[1]] : [D_4(("!" + paren_3(lift_7((_v642)[0])))), (_v642)[1]]);
} else {
if ((_v636 === "bin")) {
var _v643 = (p0)[1];
if (((_v643 === "&&") || (_v643 === "||"))) {
return evalLogic_644(_v643, p0, p1, p2, p3, p4);
} else {
var _v645 = evalExpr_418((p0)[2], p1, p2, p3, p4);
var _v646 = evalExpr_418((p0)[3], p1, p2, p3, (_v645)[1]);
return [binop_338(_v643, (_v645)[0], (_v646)[0]), (_v646)[1]];
}
} else {
if ((_v636 === "cond")) {
var _v647 = evalExpr_418((p0)[1], p1, p2, p3, p4);
if (isS_67((_v647)[0])) {
return (((_v647)[0])[1] ? evalExpr_418((p0)[2], p1, p2, p3, (_v647)[1]) : evalExpr_418((p0)[3], p1, p2, p3, (_v647)[1]));
} else {
var _v648 = evalExpr_418((p0)[2], p1, p2, p3, (_v647)[1]);
var _v649 = evalExpr_418((p0)[3], p1, p2, p3, (_v648)[1]);
return [D_4((((((("(" + lift_7((_v647)[0])) + " ? ") + lift_7((_v648)[0])) + " : ") + lift_7((_v649)[0])) + ")")), (_v649)[1]];
}
} else {
return ((_v636 === "call") ? evalCall_650(p0, p1, p2, p3, p4) : [fail(("jsmix2: unsupported expression " + str(_v636))), p4]);
}
}
}
}
}
}
}
}
}
function evalCall_421(p0, p1, p2, p3, p4) {
var _v659 = (function () {
var _v651 = (p0)[1];
var _v654 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p4];
} else {
var _v652 = evalExpr_177(((p0)[2])[0], p1, p2, p3, p4);
var _v653 = evalList_398(((p0)[2]).slice(1), p1, p2, p3, (_v652)[1]);
return [([(_v652)[0]]).concat((_v653)[0]), (_v653)[1]];
}
})();
var _v655 = (_v654)[0];
var _v656 = (_v654)[1];
if (((_v651)[0] === "dot")) {
var _v657 = evalExpr_177((_v651)[1], p1, p2, p3, _v656);
return [evalBuiltin_319((_v651)[2], (_v657)[0], _v655), (_v657)[1]];
} else {
var _v658 = findFn_320((_v651)[1]);
return ((_v658 === null) ? [evalBuiltin_322((_v651)[1], _v655), _v656] : unfold_405(_v658, _v655, _v656));
}
})();
return [((((_v659)[0])[0] === "B") ? D_4((("(function () {\n" + ((_v659)[0])[1]) + "})()")) : (_v659)[0]), (_v659)[1]];
}
function evalCallStmt_425(p0, p1, p2) {
var _v660 = (p0)[1];
var _v664 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p2];
} else {
var _v661 = evalExpr_426(((p0)[2])[0], p1, p2);
var _v663 = evalList_662(((p0)[2]).slice(1), p1, (_v661)[1]);
return [([(_v661)[0]]).concat((_v663)[0]), (_v663)[1]];
}
})();
var _v665 = (_v664)[0];
var _v666 = (_v664)[1];
if (((_v660)[0] === "dot")) {
var _v667 = evalExpr_426((_v660)[1], p1, _v666);
return [evalBuiltin_319((_v660)[2], (_v667)[0], _v665), (_v667)[1]];
} else {
var _v668 = findFn_320((_v660)[1]);
return ((_v668 === null) ? [evalBuiltin_322((_v660)[1], _v665), _v666] : unfold_405(_v668, _v665, _v666));
}
}
function evalExpr_426(p0, p1, p2) {
var _v669 = (p0)[0];
if ((_v669 === "lit")) {
return [S_0((p0)[1]), p2];
} else {
if ((_v669 === "var")) {
return [lookup_325(p1, (p0)[1]), p2];
} else {
if ((_v669 === "arr")) {
var _v670 = evalList_662((p0)[1], p1, p2);
return [mkArr_38((_v670)[0]), (_v670)[1]];
} else {
if ((_v669 === "idx")) {
var _v671 = evalExpr_426((p0)[1], p1, p2);
var _v672 = evalExpr_426((p0)[2], p1, (_v671)[1]);
return [index_330((_v671)[0], (_v672)[0]), (_v672)[1]];
} else {
if ((_v669 === "dot")) {
var _v673 = evalExpr_426((p0)[1], p1, p2);
return [prop_332((_v673)[0], (p0)[2]), (_v673)[1]];
} else {
if ((_v669 === "not")) {
var _v674 = evalExpr_426((p0)[1], p1, p2);
return (isS_67((_v674)[0]) ? [S_0(!(((_v674)[0])[1])), (_v674)[1]] : [D_4(("!" + paren_3(lift_7((_v674)[0])))), (_v674)[1]]);
} else {
if ((_v669 === "bin")) {
var _v675 = (p0)[1];
if (((_v675 === "&&") || (_v675 === "||"))) {
return evalLogic_676(_v675, p0, p1, p2);
} else {
var _v677 = evalExpr_426((p0)[2], p1, p2);
var _v678 = evalExpr_426((p0)[3], p1, (_v677)[1]);
return [binop_338(_v675, (_v677)[0], (_v678)[0]), (_v678)[1]];
}
} else {
if ((_v669 === "cond")) {
var _v679 = evalExpr_426((p0)[1], p1, p2);
if (isS_67((_v679)[0])) {
return (((_v679)[0])[1] ? evalExpr_426((p0)[2], p1, (_v679)[1]) : evalExpr_426((p0)[3], p1, (_v679)[1]));
} else {
var _v681 = evalExpr_680((p0)[2], p1, (_v679)[1]);
var _v682 = evalExpr_680((p0)[3], p1, (_v681)[1]);
return [D_4((((((("(" + lift_7((_v679)[0])) + " ? ") + lift_7((_v681)[0])) + " : ") + lift_7((_v682)[0])) + ")")), (_v682)[1]];
}
} else {
return ((_v669 === "call") ? evalCall_683(p0, p1, p2) : [fail(("jsmix2: unsupported expression " + str(_v669))), p2]);
}
}
}
}
}
}
}
}
}
function evalStmts_433(p0, p1, p2) {
if (((p0).length === 0)) {
return [["S",null], p2];
} else {
var _v684 = (p0)[0];
var _v685 = (p0).slice(1);
var _v686 = (_v684)[0];
if ((_v686 === "return")) {
return ((((_v684)[1])[0] === "call") ? evalCallStmt_687((_v684)[1], p1, p2) : evalExpr_680((_v684)[1], p1, p2));
} else {
if ((_v686 === "var")) {
var _v688 = evalExpr_680((_v684)[2], p1, p2);
var _v689 = nameLeaves_137((_v688)[0], (_v688)[1]);
var _v690 = evalStmts_433(_v685, ([[(_v684)[1], (_v689)[0]]]).concat(p1), (_v689)[1]);
return (((_v689)[2] === "") ? _v690 : [["B", ((_v689)[2] + body_16((_v690)[0]))], (_v690)[1]]);
} else {
if ((_v686 === "block")) {
return evalStmts_433(((_v684)[1]).concat(_v685), p1, p2);
} else {
if ((_v686 === "if")) {
var _v691 = evalExpr_680((_v684)[1], p1, p2);
var _v692 = ([(_v684)[2]]).concat(_v685);
var _v693 = (((_v684)[3] === null) ? _v685 : ([(_v684)[3]]).concat(_v685));
if (isS_67((_v691)[0])) {
return (((_v691)[0])[1] ? evalStmts_433(_v692, p1, (_v691)[1]) : evalStmts_433(_v693, p1, (_v691)[1]));
} else {
var _v694 = evalStmts_433(_v692, p1, (_v691)[1]);
var _v695 = evalStmts_433(_v693, p1, (_v694)[1]);
return ((!(isB_15((_v694)[0])) && !(isB_15((_v695)[0]))) ? [D_4((((((("(" + lift_7((_v691)[0])) + " ? ") + lift_7((_v694)[0])) + " : ") + lift_7((_v695)[0])) + ")")), (_v695)[1]] : [["B", (((((("if (" + lift_7((_v691)[0])) + ") {\n") + body_16((_v694)[0])) + "} else {\n") + body_16((_v695)[0])) + "}\n")], (_v695)[1]]);
}
} else {
return evalStmts_433(_v685, p1, p2);
}
}
}
}
}
}
function evalCallStmt_439(p0, p1, p2, p3, p4) {
var _v696 = (p0)[1];
var _v699 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p4];
} else {
var _v697 = evalExpr_418(((p0)[2])[0], p1, p2, p3, p4);
var _v698 = evalList_637(((p0)[2]).slice(1), p1, p2, p3, (_v697)[1]);
return [([(_v697)[0]]).concat((_v698)[0]), (_v698)[1]];
}
})();
var _v700 = (_v699)[0];
var _v701 = (_v699)[1];
if (((_v696)[0] === "dot")) {
var _v702 = evalExpr_418((_v696)[1], p1, p2, p3, _v701);
return [evalBuiltin_319((_v696)[2], (_v702)[0], _v700), (_v702)[1]];
} else {
var _v703 = findFn_320((_v696)[1]);
return ((_v703 === null) ? [evalBuiltin_322((_v696)[1], _v700), _v701] : (allStatic_68(_v700) ? unfold_704(_v703, _v700, _v701) : residualCall_471(_v703, _v700, _v701)));
}
}
function applyOp_449(p0, p1) {
return (p0 + p1);
}
function evalExpr_451(p0, p1, p2, p3, p4, p5) {
var _v705 = (((((p1)[0] === "S") && true) && indexable_42((p1)[1])) ? S_0(((p1)[1])[1]) : ((isA_43(p1) && true) ? ((p1)[1])[1] : D_4((((paren_3(lift_7(p1)) + "[") + "1") + "]"))));
return [((((p3)[0] === "S") && isS_67(_v705)) ? S_0(applyOp_706((p3)[1], (_v705)[1])) : D_4((((((("(" + lift_7(p3)) + " ") + "*") + " ") + lift_7(_v705)) + ")"))), p5];
}
function evalExpr_452(p0, p1, p2, p3, p4, p5) {
var _v707 = ((((p0)[0] === "S") && true) ? S_0(applyOp_384((p0)[1])) : D_4((((((("(" + lift_7(p0)) + " ") + "===") + " ") + "\"addin\"") + ")")));
if (((_v707)[0] === "S")) {
return ((_v707)[1] ? evalExpr_708(p0, p1, p2, p3, p4, p5) : evalExpr_709(p0, p1, p2, p3, p4, p5));
} else {
var _v711 = evalExpr_710(p0, p1, p2, p3, p4, p5);
var _v713 = evalExpr_712(p0, p1, p2, p3, p4, (_v711)[1]);
return [D_4((((((("(" + lift_7(_v707)) + " ? ") + lift_7((_v711)[0])) + " : ") + lift_7((_v713)[0])) + ")")), (_v713)[1]];
}
}
function evalExpr_453(p0, p1, p2, p3, p4, p5) {
var _v714 = (((((p1)[0] === "S") && true) && indexable_42((p1)[1])) ? S_0(((p1)[1])[1]) : ((isA_43(p1) && true) ? ((p1)[1])[1] : D_4((((paren_3(lift_7(p1)) + "[") + "1") + "]"))));
return [((((p3)[0] === "S") && isS_67(_v714)) ? S_0(applyOp_706((p3)[1], (_v714)[1])) : D_4((((((("(" + lift_7(p3)) + " ") + "*") + " ") + lift_7(_v714)) + ")"))), p5];
}
function evalExpr_455(p0, p1, p2, p3, p4, p5) {
var _v715 = ((((p0)[0] === "S") && true) ? S_0(applyOp_384((p0)[1])) : D_4((((((("(" + lift_7(p0)) + " ") + "===") + " ") + "\"addin\"") + ")")));
if (((_v715)[0] === "S")) {
return ((_v715)[1] ? evalExpr_710(p0, p1, p2, p3, p4, p5) : evalExpr_712(p0, p1, p2, p3, p4, p5));
} else {
var _v716 = evalExpr_710(p0, p1, p2, p3, p4, p5);
var _v717 = evalExpr_712(p0, p1, p2, p3, p4, (_v716)[1]);
return [D_4((((((("(" + lift_7(_v715)) + " ? ") + lift_7((_v716)[0])) + " : ") + lift_7((_v717)[0])) + ")")), (_v717)[1]];
}
}
function evalList_463(p0, p1, p2, p3, p4, p5) {
if (((p0).length === 0)) {
return [[], p4];
} else {
var _v718 = evalExpr_236((p0)[0], p1, p2, p3, p4, p5);
var _v719 = evalList_463((p0).slice(1), p1, p2, p3, (_v718)[1], p5);
return [([(_v718)[0]]).concat((_v719)[0]), (_v719)[1]];
}
}
function unfold_470(p0, p1, p2, p3) {
if ((((p0)[3]).length === 0)) {
return [["S",null], p2];
} else {
var _v720 = ((p0)[3])[0];
var _v721 = ((p0)[3]).slice(1);
var _v722 = (_v720)[0];
if ((_v722 === "return")) {
return ((((_v720)[1])[0] === "call") ? evalCallStmt_489((_v720)[1], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3) : evalExpr_490((_v720)[1], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3));
} else {
if ((_v722 === "var")) {
var _v723 = evalExpr_490((_v720)[2], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
var _v724 = nameLeaves_137((_v723)[0], (_v723)[1]);
var _v725 = evalStmts_239(_v721, ([[(_v720)[1], (_v724)[0]]]).concat(((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0]))), (_v724)[1], p3);
return (((_v724)[2] === "") ? _v725 : [["B", ((_v724)[2] + body_16((_v725)[0]))], (_v725)[1]]);
} else {
if ((_v722 === "block")) {
return evalStmts_239(((_v720)[1]).concat(_v721), ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
} else {
if ((_v722 === "if")) {
var _v726 = evalExpr_490((_v720)[1], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
var _v727 = ([(_v720)[2]]).concat(_v721);
var _v728 = (((_v720)[3] === null) ? _v721 : ([(_v720)[3]]).concat(_v721));
if (isS_67((_v726)[0])) {
return (((_v726)[0])[1] ? evalStmts_239(_v727, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v726)[1], p3) : evalStmts_239(_v728, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v726)[1], p3));
} else {
var _v729 = evalStmts_433(_v727, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v726)[1]);
var _v730 = evalStmts_433(_v728, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v729)[1]);
return ((!(isB_15((_v729)[0])) && !(isB_15((_v730)[0]))) ? [D_4((((((("(" + lift_7((_v726)[0])) + " ? ") + lift_7((_v729)[0])) + " : ") + lift_7((_v730)[0])) + ")")), (_v730)[1]] : [["B", (((((("if (" + lift_7((_v726)[0])) + ") {\n") + body_16((_v729)[0])) + "} else {\n") + body_16((_v730)[0])) + "}\n")], (_v730)[1]]);
}
} else {
return evalStmts_239(_v721, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
}
}
}
}
}
}
function residualCall_471(p0, p1, p2) {
var _v731 = (((p1).length === 0) ? [] : ([skel_287((p1)[0])]).concat(skels_286((p1).slice(1))));
var _v732 = (((p0)[1] + ":") + str(_v731));
var _v733 = ((((p2)[0]).length === 0) ? null : (((((p2)[0])[0])[0] === _v732) ? (((p2)[0])[0])[1] : memoFind_290(((p2)[0]).slice(1), _v732)));
var _v734 = (("(" + ((((((p1).length === 0) ? [] : (dynLeavesOf_293((p1)[0])).concat(dynLeaves_292((p1).slice(1))))).length === 0) ? "" : ((((((p1).length === 0) ? [] : (dynLeavesOf_293((p1)[0])).concat(dynLeaves_292((p1).slice(1))))).length === 1) ? ((((p1).length === 0) ? [] : (dynLeavesOf_293((p1)[0])).concat(dynLeaves_292((p1).slice(1)))))[0] : ((((((p1).length === 0) ? [] : (dynLeavesOf_293((p1)[0])).concat(dynLeaves_292((p1).slice(1)))))[0] + ", ") + joinStrs_28(((((p1).length === 0) ? [] : (dynLeavesOf_293((p1)[0])).concat(dynLeaves_292((p1).slice(1))))).slice(1)))))) + ")");
if ((_v733 !== null)) {
return [D_4((_v733 + _v734)), p2];
} else {
var _v736 = smallerAncestor_735((p0)[1], sizeOfSkels_295(_v731));
if ((_v736 !== null)) {
var _v737 = generalizeList_298(p1, (_v736)[1]);
if ((str(skels_286(_v737)) !== str(_v731))) {
return residualCall_471(p0, _v737, p2);
} else {
if (((countFor_738((p2)[0], ((p0)[1] + ":")) >= 64) && !(allDynamic_301(p1)))) {
return residualCall_471(p0, liftAll_302(p1), p2);
} else {
var _v739 = (((p0)[1] + "_") + (p2)[2]);
var _v740 = (p0)[1];
return [D_4((_v739 + _v734)), [([[_v732, _v739]]).concat((p2)[0]), ((p2)[1]).concat([[_v739, p0, _v731, [[_v740, _v731]]]]), ((p2)[2] + 1)]];
}
}
} else {
if (((countFor_738((p2)[0], ((p0)[1] + ":")) >= 64) && !(allDynamic_301(p1)))) {
return residualCall_471(p0, liftAll_302(p1), p2);
} else {
var _v741 = (((p0)[1] + "_") + (p2)[2]);
var _v742 = (p0)[1];
return [D_4((_v741 + _v734)), [([[_v732, _v741]]).concat((p2)[0]), ((p2)[1]).concat([[_v741, p0, _v731, [[_v742, _v731]]]]), ((p2)[2] + 1)]];
}
}
}
}
function evalLogic_479(p0, p1, p2, p3, p4, p5, p6) {
var _v755 = (function () {
var _v743 = ((p1)[2])[0];
if ((_v743 === "lit")) {
return [S_0(((p1)[2])[1]), p5];
} else {
if ((_v743 === "var")) {
return [lookup_407(p2, p3, p4, ((p1)[2])[1]), p5];
} else {
if ((_v743 === "arr")) {
var _v744 = evalList_463(((p1)[2])[1], p2, p3, p4, p5, p6);
return [mkArr_38((_v744)[0]), (_v744)[1]];
} else {
if ((_v743 === "idx")) {
var _v745 = evalExpr_236(((p1)[2])[1], p2, p3, p4, p5, p6);
var _v746 = evalExpr_236(((p1)[2])[2], p2, p3, p4, (_v745)[1], p6);
return [index_330((_v745)[0], (_v746)[0]), (_v746)[1]];
} else {
if ((_v743 === "dot")) {
var _v747 = evalExpr_236(((p1)[2])[1], p2, p3, p4, p5, p6);
return [prop_332((_v747)[0], ((p1)[2])[2]), (_v747)[1]];
} else {
if ((_v743 === "not")) {
var _v748 = evalExpr_236(((p1)[2])[1], p2, p3, p4, p5, p6);
return (isS_67((_v748)[0]) ? [S_0(!(((_v748)[0])[1])), (_v748)[1]] : [D_4(("!" + paren_3(lift_7((_v748)[0])))), (_v748)[1]]);
} else {
if ((_v743 === "bin")) {
var _v749 = ((p1)[2])[1];
if (((_v749 === "&&") || (_v749 === "||"))) {
return evalLogic_479(_v749, (p1)[2], p2, p3, p4, p5, p6);
} else {
var _v750 = evalExpr_236(((p1)[2])[2], p2, p3, p4, p5, p6);
var _v751 = evalExpr_236(((p1)[2])[3], p2, p3, p4, (_v750)[1], p6);
return [binop_338(_v749, (_v750)[0], (_v751)[0]), (_v751)[1]];
}
} else {
if ((_v743 === "cond")) {
var _v752 = evalExpr_236(((p1)[2])[1], p2, p3, p4, p5, p6);
if (isS_67((_v752)[0])) {
return (((_v752)[0])[1] ? evalExpr_236(((p1)[2])[2], p2, p3, p4, (_v752)[1], p6) : evalExpr_236(((p1)[2])[3], p2, p3, p4, (_v752)[1], p6));
} else {
var _v753 = evalExpr_418(((p1)[2])[2], p2, p3, p4, (_v752)[1]);
var _v754 = evalExpr_418(((p1)[2])[3], p2, p3, p4, (_v753)[1]);
return [D_4((((((("(" + lift_7((_v752)[0])) + " ? ") + lift_7((_v753)[0])) + " : ") + lift_7((_v754)[0])) + ")")), (_v754)[1]];
}
} else {
return ((_v743 === "call") ? evalCall_485((p1)[2], p2, p3, p4, p5, p6) : [fail(("jsmix2: unsupported expression " + str(_v743))), p5]);
}
}
}
}
}
}
}
}
})();
if ((((_v755)[0])[0] === "S")) {
return ((p0 === "&&") ? (((_v755)[0])[1] ? evalExpr_236((p1)[3], p2, p3, p4, (_v755)[1], p6) : _v755) : (((_v755)[0])[1] ? _v755 : evalExpr_236((p1)[3], p2, p3, p4, (_v755)[1], p6)));
} else {
var _v756 = evalExpr_418((p1)[3], p2, p3, p4, (_v755)[1]);
return [D_4((((((("(" + lift_7((_v755)[0])) + " ") + p0) + " ") + lift_7((_v756)[0])) + ")")), (_v756)[1]];
}
}
function evalCall_485(p0, p1, p2, p3, p4, p5) {
var _v765 = (function () {
var _v757 = (p0)[1];
var _v760 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p4];
} else {
var _v758 = evalExpr_236(((p0)[2])[0], p1, p2, p3, p4, p5);
var _v759 = evalList_463(((p0)[2]).slice(1), p1, p2, p3, (_v758)[1], p5);
return [([(_v758)[0]]).concat((_v759)[0]), (_v759)[1]];
}
})();
var _v761 = (_v760)[0];
var _v762 = (_v760)[1];
if (((_v757)[0] === "dot")) {
var _v763 = evalExpr_236((_v757)[1], p1, p2, p3, _v762, p5);
return [evalBuiltin_319((_v757)[2], (_v763)[0], _v761), (_v763)[1]];
} else {
var _v764 = findFn_320((_v757)[1]);
return ((_v764 === null) ? [evalBuiltin_322((_v757)[1], _v761), _v762] : ((!(p5) || allStatic_68(_v761)) ? unfold_470(_v764, _v761, _v762, p5) : residualCall_471(_v764, _v761, _v762)));
}
})();
return [((((_v765)[0])[0] === "B") ? D_4((("(function () {\n" + ((_v765)[0])[1]) + "})()")) : (_v765)[0]), (_v765)[1]];
}
function evalCallStmt_489(p0, p1, p2, p3) {
var _v766 = (p0)[1];
var _v770 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p2];
} else {
var _v767 = evalExpr_490(((p0)[2])[0], p1, p2, p3);
var _v769 = evalList_768(((p0)[2]).slice(1), p1, (_v767)[1], p3);
return [([(_v767)[0]]).concat((_v769)[0]), (_v769)[1]];
}
})();
var _v771 = (_v770)[0];
var _v772 = (_v770)[1];
if (((_v766)[0] === "dot")) {
var _v773 = evalExpr_490((_v766)[1], p1, _v772, p3);
return [evalBuiltin_319((_v766)[2], (_v773)[0], _v771), (_v773)[1]];
} else {
var _v774 = findFn_320((_v766)[1]);
return ((_v774 === null) ? [evalBuiltin_322((_v766)[1], _v771), _v772] : ((!(p3) || allStatic_68(_v771)) ? unfold_470(_v774, _v771, _v772, p3) : residualCall_471(_v774, _v771, _v772)));
}
}
function evalExpr_490(p0, p1, p2, p3) {
var _v775 = (p0)[0];
if ((_v775 === "lit")) {
return [S_0((p0)[1]), p2];
} else {
if ((_v775 === "var")) {
return [lookup_325(p1, (p0)[1]), p2];
} else {
if ((_v775 === "arr")) {
var _v776 = evalList_768((p0)[1], p1, p2, p3);
return [mkArr_38((_v776)[0]), (_v776)[1]];
} else {
if ((_v775 === "idx")) {
var _v777 = evalExpr_490((p0)[1], p1, p2, p3);
var _v778 = evalExpr_490((p0)[2], p1, (_v777)[1], p3);
return [index_330((_v777)[0], (_v778)[0]), (_v778)[1]];
} else {
if ((_v775 === "dot")) {
var _v779 = evalExpr_490((p0)[1], p1, p2, p3);
return [prop_332((_v779)[0], (p0)[2]), (_v779)[1]];
} else {
if ((_v775 === "not")) {
var _v780 = evalExpr_490((p0)[1], p1, p2, p3);
return (isS_67((_v780)[0]) ? [S_0(!(((_v780)[0])[1])), (_v780)[1]] : [D_4(("!" + paren_3(lift_7((_v780)[0])))), (_v780)[1]]);
} else {
if ((_v775 === "bin")) {
var _v781 = (p0)[1];
if (((_v781 === "&&") || (_v781 === "||"))) {
return evalLogic_782(_v781, p0, p1, p2, p3);
} else {
var _v783 = evalExpr_490((p0)[2], p1, p2, p3);
var _v784 = evalExpr_490((p0)[3], p1, (_v783)[1], p3);
return [binop_338(_v781, (_v783)[0], (_v784)[0]), (_v784)[1]];
}
} else {
if ((_v775 === "cond")) {
var _v785 = evalExpr_490((p0)[1], p1, p2, p3);
if (isS_67((_v785)[0])) {
return (((_v785)[0])[1] ? evalExpr_490((p0)[2], p1, (_v785)[1], p3) : evalExpr_490((p0)[3], p1, (_v785)[1], p3));
} else {
var _v786 = evalExpr_680((p0)[2], p1, (_v785)[1]);
var _v787 = evalExpr_680((p0)[3], p1, (_v786)[1]);
return [D_4((((((("(" + lift_7((_v785)[0])) + " ? ") + lift_7((_v786)[0])) + " : ") + lift_7((_v787)[0])) + ")")), (_v787)[1]];
}
} else {
return ((_v775 === "call") ? evalCall_788(p0, p1, p2, p3) : [fail(("jsmix2: unsupported expression " + str(_v775))), p2]);
}
}
}
}
}
}
}
}
}
function sizeOfSkel_499(p0) {
return (((p0)[0] === "S") ? sizeOfData_789((p0)[1]) : (((p0)[0] === "D") ? 1 : (1 + sizeOfSkels_295((p0)[1]))));
}
function generalize_500(p0, p1) {
if ((str((((p0)[0] === "S") ? ["S", (p0)[1]] : (isD_31(p0) ? ["D"] : ["A", skels_286((p0)[1])]))) === str(p1))) {
return p0;
} else {
var _v790 = elems_519(p0);
return ((((_v790 !== null) && ((p1)[0] === "A")) && ((_v790).length === ((p1)[1]).length)) ? mkArr_38(generalizeList_298(_v790, (p1)[1])) : (((((_v790 !== null) && ((p1)[0] === "S")) && isArr((p1)[1])) && ((_v790).length === ((p1)[1]).length)) ? mkArr_38(generalizeList_298(_v790, skels_286(elemsOfStatic_523((p1)[1])))) : D_4(lift_7(p0))));
}
}
function startsWith_501(p0) {
return ((p0).slice(0, 4) === "run:");
}
function evalLogic_512(p0, p1, p2, p3, p4) {
var _v803 = (function () {
var _v791 = ((p1)[2])[0];
if ((_v791 === "lit")) {
return [S_0(((p1)[2])[1]), p3];
} else {
if ((_v791 === "var")) {
return [lookup_325(p2, ((p1)[2])[1]), p3];
} else {
if ((_v791 === "arr")) {
var _v792 = evalList_312(((p1)[2])[1], p2, p3, p4);
return [mkArr_38((_v792)[0]), (_v792)[1]];
} else {
if ((_v791 === "idx")) {
var _v793 = evalExpr_317(((p1)[2])[1], p2, p3, p4);
var _v794 = evalExpr_317(((p1)[2])[2], p2, (_v793)[1], p4);
return [index_330((_v793)[0], (_v794)[0]), (_v794)[1]];
} else {
if ((_v791 === "dot")) {
var _v795 = evalExpr_317(((p1)[2])[1], p2, p3, p4);
return [prop_332((_v795)[0], ((p1)[2])[2]), (_v795)[1]];
} else {
if ((_v791 === "not")) {
var _v796 = evalExpr_317(((p1)[2])[1], p2, p3, p4);
return (isS_67((_v796)[0]) ? [S_0(!(((_v796)[0])[1])), (_v796)[1]] : [D_4(("!" + paren_3(lift_7((_v796)[0])))), (_v796)[1]]);
} else {
if ((_v791 === "bin")) {
var _v797 = ((p1)[2])[1];
if (((_v797 === "&&") || (_v797 === "||"))) {
return evalLogic_512(_v797, (p1)[2], p2, p3, p4);
} else {
var _v798 = evalExpr_317(((p1)[2])[2], p2, p3, p4);
var _v799 = evalExpr_317(((p1)[2])[3], p2, (_v798)[1], p4);
return [binop_338(_v797, (_v798)[0], (_v799)[0]), (_v799)[1]];
}
} else {
if ((_v791 === "cond")) {
var _v800 = evalExpr_317(((p1)[2])[1], p2, p3, p4);
if (isS_67((_v800)[0])) {
return (((_v800)[0])[1] ? evalExpr_317(((p1)[2])[2], p2, (_v800)[1], p4) : evalExpr_317(((p1)[2])[3], p2, (_v800)[1], p4));
} else {
var _v801 = evalExpr_340(((p1)[2])[2], p2, (_v800)[1], p4);
var _v802 = evalExpr_340(((p1)[2])[3], p2, (_v801)[1], p4);
return [D_4((((((("(" + lift_7((_v800)[0])) + " ? ") + lift_7((_v801)[0])) + " : ") + lift_7((_v802)[0])) + ")")), (_v802)[1]];
}
} else {
return ((_v791 === "call") ? evalCall_518((p1)[2], p2, p3, p4) : [fail(("jsmix2: unsupported expression " + str(_v791))), p3]);
}
}
}
}
}
}
}
}
})();
if ((((_v803)[0])[0] === "S")) {
return ((p0 === "&&") ? (((_v803)[0])[1] ? evalExpr_317((p1)[3], p2, (_v803)[1], p4) : _v803) : (((_v803)[0])[1] ? _v803 : evalExpr_317((p1)[3], p2, (_v803)[1], p4)));
} else {
var _v804 = evalExpr_340((p1)[3], p2, (_v803)[1], p4);
return [D_4((((((("(" + lift_7((_v803)[0])) + " ") + p0) + " ") + lift_7((_v804)[0])) + ")")), (_v804)[1]];
}
}
function evalCall_518(p0, p1, p2, p3) {
var _v813 = (function () {
var _v805 = (p0)[1];
var _v808 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p2];
} else {
var _v806 = evalExpr_317(((p0)[2])[0], p1, p2, p3);
var _v807 = evalList_312(((p0)[2]).slice(1), p1, (_v806)[1], p3);
return [([(_v806)[0]]).concat((_v807)[0]), (_v807)[1]];
}
})();
var _v809 = (_v808)[0];
var _v810 = (_v808)[1];
if (((_v805)[0] === "dot")) {
var _v811 = evalExpr_317((_v805)[1], p1, _v810, p3);
return [evalBuiltin_319((_v805)[2], (_v811)[0], _v809), (_v811)[1]];
} else {
var _v812 = findFn_320((_v805)[1]);
return ((_v812 === null) ? [evalBuiltin_322((_v805)[1], _v809), _v810] : unfold_323(_v812, _v809, _v810, p3));
}
})();
return [((((_v813)[0])[0] === "B") ? D_4((("(function () {\n" + ((_v813)[0])[1]) + "})()")) : (_v813)[0]), (_v813)[1]];
}
function elems_519(p0) {
return (((p0)[0] === "A") ? (p0)[1] : ((isS_67(p0) && isArr((p0)[1])) ? elemsOfStatic_523((p0)[1]) : null));
}
function findFn_522(p0) {
return (("run" === p0) ? ["fundecl","run",["prog","acc","x"],[["if",["bin","===",["dot",["var","prog"],"length"],["lit",0]],["block",[["return",["var","acc"]]]],null],["var","ins",["idx",["var","prog"],["lit",0]]],["var","op",["idx",["var","ins"],["lit",0]]],["var","next",["cond",["bin","===",["var","op"],["lit","addlit"]],["bin","+",["var","acc"],["idx",["var","ins"],["lit",1]]],["cond",["bin","===",["var","op"],["lit","mullit"]],["bin","*",["var","acc"],["idx",["var","ins"],["lit",1]]],["cond",["bin","===",["var","op"],["lit","addin"]],["bin","+",["var","acc"],["var","x"]],["cond",["bin","===",["var","op"],["lit","subin"]],["bin","-",["var","acc"],["var","x"]],["var","acc"]]]]]],["return",["call",["var","run"],[["call",["dot",["var","prog"],"slice"],[["lit",1]]],["var","next"],["var","x"]]]]]] : findFn_814(p0));
}
function elemsOfStatic_523(p0) {
return (((p0).length === 0) ? [] : ([S_0((p0)[0])]).concat(elemsOfStatic_523((p0).slice(1))));
}
function applyOp_553(p0, p1, p2) {
return ((p0 === "+") ? (p1 + p2) : ((p0 === "-") ? (p1 - p2) : ((p0 === "*") ? (p1 * p2) : ((p0 === "===") ? (p1 === p2) : ((p0 === "!==") ? (p1 !== p2) : ((p0 === "<") ? (p1 < p2) : ((p0 === ">") ? (p1 > p2) : ((p0 === "<=") ? (p1 <= p2) : (p1 >= p2)))))))));
}
function evalList_555(p0, p1, p2, p3) {
if (((p0).length === 0)) {
return [[], p2];
} else {
var _v815 = evalExpr_340((p0)[0], p1, p2, p3);
var _v816 = evalList_555((p0).slice(1), p1, (_v815)[1], p3);
return [([(_v815)[0]]).concat((_v816)[0]), (_v816)[1]];
}
}
function evalLogic_562(p0, p1, p2, p3, p4) {
var _v829 = (function () {
var _v817 = ((p1)[2])[0];
if ((_v817 === "lit")) {
return [S_0(((p1)[2])[1]), p3];
} else {
if ((_v817 === "var")) {
return [lookup_325(p2, ((p1)[2])[1]), p3];
} else {
if ((_v817 === "arr")) {
var _v818 = evalList_555(((p1)[2])[1], p2, p3, p4);
return [mkArr_38((_v818)[0]), (_v818)[1]];
} else {
if ((_v817 === "idx")) {
var _v819 = evalExpr_340(((p1)[2])[1], p2, p3, p4);
var _v820 = evalExpr_340(((p1)[2])[2], p2, (_v819)[1], p4);
return [index_330((_v819)[0], (_v820)[0]), (_v820)[1]];
} else {
if ((_v817 === "dot")) {
var _v821 = evalExpr_340(((p1)[2])[1], p2, p3, p4);
return [prop_332((_v821)[0], ((p1)[2])[2]), (_v821)[1]];
} else {
if ((_v817 === "not")) {
var _v822 = evalExpr_340(((p1)[2])[1], p2, p3, p4);
return (isS_67((_v822)[0]) ? [S_0(!(((_v822)[0])[1])), (_v822)[1]] : [D_4(("!" + paren_3(lift_7((_v822)[0])))), (_v822)[1]]);
} else {
if ((_v817 === "bin")) {
var _v823 = ((p1)[2])[1];
if (((_v823 === "&&") || (_v823 === "||"))) {
return evalLogic_562(_v823, (p1)[2], p2, p3, p4);
} else {
var _v824 = evalExpr_340(((p1)[2])[2], p2, p3, p4);
var _v825 = evalExpr_340(((p1)[2])[3], p2, (_v824)[1], p4);
return [binop_338(_v823, (_v824)[0], (_v825)[0]), (_v825)[1]];
}
} else {
if ((_v817 === "cond")) {
var _v826 = evalExpr_340(((p1)[2])[1], p2, p3, p4);
if (isS_67((_v826)[0])) {
return (((_v826)[0])[1] ? evalExpr_340(((p1)[2])[2], p2, (_v826)[1], p4) : evalExpr_340(((p1)[2])[3], p2, (_v826)[1], p4));
} else {
var _v827 = evalExpr_340(((p1)[2])[2], p2, (_v826)[1], p4);
var _v828 = evalExpr_340(((p1)[2])[3], p2, (_v827)[1], p4);
return [D_4((((((("(" + lift_7((_v826)[0])) + " ? ") + lift_7((_v827)[0])) + " : ") + lift_7((_v828)[0])) + ")")), (_v828)[1]];
}
} else {
return ((_v817 === "call") ? evalCall_568((p1)[2], p2, p3, p4) : [fail(("jsmix2: unsupported expression " + str(_v817))), p3]);
}
}
}
}
}
}
}
}
})();
if ((((_v829)[0])[0] === "S")) {
return ((p0 === "&&") ? (((_v829)[0])[1] ? evalExpr_340((p1)[3], p2, (_v829)[1], p4) : _v829) : (((_v829)[0])[1] ? _v829 : evalExpr_340((p1)[3], p2, (_v829)[1], p4)));
} else {
var _v830 = evalExpr_340((p1)[3], p2, (_v829)[1], p4);
return [D_4((((((("(" + lift_7((_v829)[0])) + " ") + p0) + " ") + lift_7((_v830)[0])) + ")")), (_v830)[1]];
}
}
function evalCall_568(p0, p1, p2, p3) {
var _v839 = (function () {
var _v831 = (p0)[1];
var _v834 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p2];
} else {
var _v832 = evalExpr_340(((p0)[2])[0], p1, p2, p3);
var _v833 = evalList_555(((p0)[2]).slice(1), p1, (_v832)[1], p3);
return [([(_v832)[0]]).concat((_v833)[0]), (_v833)[1]];
}
})();
var _v835 = (_v834)[0];
var _v836 = (_v834)[1];
if (((_v831)[0] === "dot")) {
var _v837 = evalExpr_340((_v831)[1], p1, _v836, p3);
return [evalBuiltin_319((_v831)[2], (_v837)[0], _v835), (_v837)[1]];
} else {
var _v838 = findFn_320((_v831)[1]);
return ((_v838 === null) ? [evalBuiltin_322((_v831)[1], _v835), _v836] : (allStatic_68(_v835) ? unfold_594(_v838, _v835, _v836, p3) : residualCall_595(_v838, _v835, _v836, p3)));
}
})();
return [((((_v839)[0])[0] === "B") ? D_4((("(function () {\n" + ((_v839)[0])[1]) + "})()")) : (_v839)[0]), (_v839)[1]];
}
function unfold_594(p0, p1, p2, p3) {
if ((((p0)[3]).length === 0)) {
return [["S",null], p2];
} else {
var _v840 = ((p0)[3])[0];
var _v841 = ((p0)[3]).slice(1);
var _v842 = (_v840)[0];
if ((_v842 === "return")) {
return ((((_v840)[1])[0] === "call") ? evalCallStmt_372((_v840)[1], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3) : evalExpr_340((_v840)[1], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3));
} else {
if ((_v842 === "var")) {
var _v843 = evalExpr_340((_v840)[2], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
var _v844 = nameLeaves_137((_v843)[0], (_v843)[1]);
var _v845 = evalStmts_145(_v841, ([[(_v840)[1], (_v844)[0]]]).concat(((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0]))), (_v844)[1], p3);
return (((_v844)[2] === "") ? _v845 : [["B", ((_v844)[2] + body_16((_v845)[0]))], (_v845)[1]]);
} else {
if ((_v842 === "block")) {
return evalStmts_145(((_v840)[1]).concat(_v841), ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
} else {
if ((_v842 === "if")) {
var _v846 = evalExpr_340((_v840)[1], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
var _v847 = ([(_v840)[2]]).concat(_v841);
var _v848 = (((_v840)[3] === null) ? _v841 : ([(_v840)[3]]).concat(_v841));
if (isS_67((_v846)[0])) {
return (((_v846)[0])[1] ? evalStmts_145(_v847, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v846)[1], p3) : evalStmts_145(_v848, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v846)[1], p3));
} else {
var _v849 = evalStmts_145(_v847, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v846)[1], p3);
var _v850 = evalStmts_145(_v848, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v849)[1], p3);
return ((!(isB_15((_v849)[0])) && !(isB_15((_v850)[0]))) ? [D_4((((((("(" + lift_7((_v846)[0])) + " ? ") + lift_7((_v849)[0])) + " : ") + lift_7((_v850)[0])) + ")")), (_v850)[1]] : [["B", (((((("if (" + lift_7((_v846)[0])) + ") {\n") + body_16((_v849)[0])) + "} else {\n") + body_16((_v850)[0])) + "}\n")], (_v850)[1]]);
}
} else {
return evalStmts_145(_v841, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2, p3);
}
}
}
}
}
}
function residualCall_595(p0, p1, p2, p3) {
var _v851 = (((p1).length === 0) ? [] : ([skel_287((p1)[0])]).concat(skels_286((p1).slice(1))));
var _v852 = (((p0)[1] + ":") + str(_v851));
var _v853 = ((((p2)[0]).length === 0) ? null : (((((p2)[0])[0])[0] === _v852) ? (((p2)[0])[0])[1] : memoFind_290(((p2)[0]).slice(1), _v852)));
var _v854 = (("(" + ((((((p1).length === 0) ? [] : (dynLeavesOf_293((p1)[0])).concat(dynLeaves_292((p1).slice(1))))).length === 0) ? "" : ((((((p1).length === 0) ? [] : (dynLeavesOf_293((p1)[0])).concat(dynLeaves_292((p1).slice(1))))).length === 1) ? ((((p1).length === 0) ? [] : (dynLeavesOf_293((p1)[0])).concat(dynLeaves_292((p1).slice(1)))))[0] : ((((((p1).length === 0) ? [] : (dynLeavesOf_293((p1)[0])).concat(dynLeaves_292((p1).slice(1)))))[0] + ", ") + joinStrs_28(((((p1).length === 0) ? [] : (dynLeavesOf_293((p1)[0])).concat(dynLeaves_292((p1).slice(1))))).slice(1)))))) + ")");
if ((_v853 !== null)) {
return [D_4((_v853 + _v854)), p2];
} else {
var _v856 = smallerAncestor_855(p3, (p0)[1], sizeOfSkels_295(_v851));
if ((_v856 !== null)) {
var _v857 = generalizeList_298(p1, (_v856)[1]);
if ((str(skels_286(_v857)) !== str(_v851))) {
return residualCall_595(p0, _v857, p2, p3);
} else {
if (((countFor_738((p2)[0], ((p0)[1] + ":")) >= 64) && !(allDynamic_301(p1)))) {
return residualCall_595(p0, liftAll_302(p1), p2, p3);
} else {
var _v858 = (((p0)[1] + "_") + (p2)[2]);
var _v859 = (p3).concat([[(p0)[1], _v851]]);
return [D_4((_v858 + _v854)), [([[_v852, _v858]]).concat((p2)[0]), ((p2)[1]).concat([[_v858, p0, _v851, _v859]]), ((p2)[2] + 1)]];
}
}
} else {
if (((countFor_738((p2)[0], ((p0)[1] + ":")) >= 64) && !(allDynamic_301(p1)))) {
return residualCall_595(p0, liftAll_302(p1), p2, p3);
} else {
var _v860 = (((p0)[1] + "_") + (p2)[2]);
var _v861 = (p3).concat([[(p0)[1], _v851]]);
return [D_4((_v860 + _v854)), [([[_v852, _v860]]).concat((p2)[0]), ((p2)[1]).concat([[_v860, p0, _v851, _v861]]), ((p2)[2] + 1)]];
}
}
}
}
function paramNames_596(p0) {
return ((3 >= p0) ? [] : (["p3"]).concat(paramNames_862(p0)));
}
function applyOp_597(p0) {
return (p0 === "subin");
}
function evalExpr_599(p0, p1, p2, p3) {
return [["D","(0 - x)"], p3];
}
function evalExpr_600(p0, p1, p2, p3) {
return [["S",0], p3];
}
function evalExpr_601(p0, p1, p2, p3) {
return [["D","(0 - x)"], p3];
}
function evalExpr_603(p0, p1, p2, p3) {
return [["S",0], p3];
}
function lookup_621(p0, p1, p2) {
return (("acc" === p2) ? p0 : lookup_863(p1, p2));
}
function evalList_637(p0, p1, p2, p3, p4) {
if (((p0).length === 0)) {
return [[], p4];
} else {
var _v864 = evalExpr_418((p0)[0], p1, p2, p3, p4);
var _v865 = evalList_637((p0).slice(1), p1, p2, p3, (_v864)[1]);
return [([(_v864)[0]]).concat((_v865)[0]), (_v865)[1]];
}
}
function evalLogic_644(p0, p1, p2, p3, p4, p5) {
var _v878 = (function () {
var _v866 = ((p1)[2])[0];
if ((_v866 === "lit")) {
return [S_0(((p1)[2])[1]), p5];
} else {
if ((_v866 === "var")) {
return [lookup_407(p2, p3, p4, ((p1)[2])[1]), p5];
} else {
if ((_v866 === "arr")) {
var _v867 = evalList_637(((p1)[2])[1], p2, p3, p4, p5);
return [mkArr_38((_v867)[0]), (_v867)[1]];
} else {
if ((_v866 === "idx")) {
var _v868 = evalExpr_418(((p1)[2])[1], p2, p3, p4, p5);
var _v869 = evalExpr_418(((p1)[2])[2], p2, p3, p4, (_v868)[1]);
return [index_330((_v868)[0], (_v869)[0]), (_v869)[1]];
} else {
if ((_v866 === "dot")) {
var _v870 = evalExpr_418(((p1)[2])[1], p2, p3, p4, p5);
return [prop_332((_v870)[0], ((p1)[2])[2]), (_v870)[1]];
} else {
if ((_v866 === "not")) {
var _v871 = evalExpr_418(((p1)[2])[1], p2, p3, p4, p5);
return (isS_67((_v871)[0]) ? [S_0(!(((_v871)[0])[1])), (_v871)[1]] : [D_4(("!" + paren_3(lift_7((_v871)[0])))), (_v871)[1]]);
} else {
if ((_v866 === "bin")) {
var _v872 = ((p1)[2])[1];
if (((_v872 === "&&") || (_v872 === "||"))) {
return evalLogic_644(_v872, (p1)[2], p2, p3, p4, p5);
} else {
var _v873 = evalExpr_418(((p1)[2])[2], p2, p3, p4, p5);
var _v874 = evalExpr_418(((p1)[2])[3], p2, p3, p4, (_v873)[1]);
return [binop_338(_v872, (_v873)[0], (_v874)[0]), (_v874)[1]];
}
} else {
if ((_v866 === "cond")) {
var _v875 = evalExpr_418(((p1)[2])[1], p2, p3, p4, p5);
if (isS_67((_v875)[0])) {
return (((_v875)[0])[1] ? evalExpr_418(((p1)[2])[2], p2, p3, p4, (_v875)[1]) : evalExpr_418(((p1)[2])[3], p2, p3, p4, (_v875)[1]));
} else {
var _v876 = evalExpr_418(((p1)[2])[2], p2, p3, p4, (_v875)[1]);
var _v877 = evalExpr_418(((p1)[2])[3], p2, p3, p4, (_v876)[1]);
return [D_4((((((("(" + lift_7((_v875)[0])) + " ? ") + lift_7((_v876)[0])) + " : ") + lift_7((_v877)[0])) + ")")), (_v877)[1]];
}
} else {
return ((_v866 === "call") ? evalCall_650((p1)[2], p2, p3, p4, p5) : [fail(("jsmix2: unsupported expression " + str(_v866))), p5]);
}
}
}
}
}
}
}
}
})();
if ((((_v878)[0])[0] === "S")) {
return ((p0 === "&&") ? (((_v878)[0])[1] ? evalExpr_418((p1)[3], p2, p3, p4, (_v878)[1]) : _v878) : (((_v878)[0])[1] ? _v878 : evalExpr_418((p1)[3], p2, p3, p4, (_v878)[1])));
} else {
var _v879 = evalExpr_418((p1)[3], p2, p3, p4, (_v878)[1]);
return [D_4((((((("(" + lift_7((_v878)[0])) + " ") + p0) + " ") + lift_7((_v879)[0])) + ")")), (_v879)[1]];
}
}
function evalCall_650(p0, p1, p2, p3, p4) {
var _v888 = (function () {
var _v880 = (p0)[1];
var _v883 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p4];
} else {
var _v881 = evalExpr_418(((p0)[2])[0], p1, p2, p3, p4);
var _v882 = evalList_637(((p0)[2]).slice(1), p1, p2, p3, (_v881)[1]);
return [([(_v881)[0]]).concat((_v882)[0]), (_v882)[1]];
}
})();
var _v884 = (_v883)[0];
var _v885 = (_v883)[1];
if (((_v880)[0] === "dot")) {
var _v886 = evalExpr_418((_v880)[1], p1, p2, p3, _v885);
return [evalBuiltin_319((_v880)[2], (_v886)[0], _v884), (_v886)[1]];
} else {
var _v887 = findFn_320((_v880)[1]);
return ((_v887 === null) ? [evalBuiltin_322((_v880)[1], _v884), _v885] : (allStatic_68(_v884) ? unfold_704(_v887, _v884, _v885) : residualCall_471(_v887, _v884, _v885)));
}
})();
return [((((_v888)[0])[0] === "B") ? D_4((("(function () {\n" + ((_v888)[0])[1]) + "})()")) : (_v888)[0]), (_v888)[1]];
}
function evalList_662(p0, p1, p2) {
if (((p0).length === 0)) {
return [[], p2];
} else {
var _v889 = evalExpr_426((p0)[0], p1, p2);
var _v890 = evalList_662((p0).slice(1), p1, (_v889)[1]);
return [([(_v889)[0]]).concat((_v890)[0]), (_v890)[1]];
}
}
function evalLogic_676(p0, p1, p2, p3) {
var _v903 = (function () {
var _v891 = ((p1)[2])[0];
if ((_v891 === "lit")) {
return [S_0(((p1)[2])[1]), p3];
} else {
if ((_v891 === "var")) {
return [lookup_325(p2, ((p1)[2])[1]), p3];
} else {
if ((_v891 === "arr")) {
var _v892 = evalList_662(((p1)[2])[1], p2, p3);
return [mkArr_38((_v892)[0]), (_v892)[1]];
} else {
if ((_v891 === "idx")) {
var _v893 = evalExpr_426(((p1)[2])[1], p2, p3);
var _v894 = evalExpr_426(((p1)[2])[2], p2, (_v893)[1]);
return [index_330((_v893)[0], (_v894)[0]), (_v894)[1]];
} else {
if ((_v891 === "dot")) {
var _v895 = evalExpr_426(((p1)[2])[1], p2, p3);
return [prop_332((_v895)[0], ((p1)[2])[2]), (_v895)[1]];
} else {
if ((_v891 === "not")) {
var _v896 = evalExpr_426(((p1)[2])[1], p2, p3);
return (isS_67((_v896)[0]) ? [S_0(!(((_v896)[0])[1])), (_v896)[1]] : [D_4(("!" + paren_3(lift_7((_v896)[0])))), (_v896)[1]]);
} else {
if ((_v891 === "bin")) {
var _v897 = ((p1)[2])[1];
if (((_v897 === "&&") || (_v897 === "||"))) {
return evalLogic_676(_v897, (p1)[2], p2, p3);
} else {
var _v898 = evalExpr_426(((p1)[2])[2], p2, p3);
var _v899 = evalExpr_426(((p1)[2])[3], p2, (_v898)[1]);
return [binop_338(_v897, (_v898)[0], (_v899)[0]), (_v899)[1]];
}
} else {
if ((_v891 === "cond")) {
var _v900 = evalExpr_426(((p1)[2])[1], p2, p3);
if (isS_67((_v900)[0])) {
return (((_v900)[0])[1] ? evalExpr_426(((p1)[2])[2], p2, (_v900)[1]) : evalExpr_426(((p1)[2])[3], p2, (_v900)[1]));
} else {
var _v901 = evalExpr_680(((p1)[2])[2], p2, (_v900)[1]);
var _v902 = evalExpr_680(((p1)[2])[3], p2, (_v901)[1]);
return [D_4((((((("(" + lift_7((_v900)[0])) + " ? ") + lift_7((_v901)[0])) + " : ") + lift_7((_v902)[0])) + ")")), (_v902)[1]];
}
} else {
return ((_v891 === "call") ? evalCall_683((p1)[2], p2, p3) : [fail(("jsmix2: unsupported expression " + str(_v891))), p3]);
}
}
}
}
}
}
}
}
})();
if ((((_v903)[0])[0] === "S")) {
return ((p0 === "&&") ? (((_v903)[0])[1] ? evalExpr_426((p1)[3], p2, (_v903)[1]) : _v903) : (((_v903)[0])[1] ? _v903 : evalExpr_426((p1)[3], p2, (_v903)[1])));
} else {
var _v904 = evalExpr_680((p1)[3], p2, (_v903)[1]);
return [D_4((((((("(" + lift_7((_v903)[0])) + " ") + p0) + " ") + lift_7((_v904)[0])) + ")")), (_v904)[1]];
}
}
function evalExpr_680(p0, p1, p2) {
var _v905 = (p0)[0];
if ((_v905 === "lit")) {
return [S_0((p0)[1]), p2];
} else {
if ((_v905 === "var")) {
return [lookup_325(p1, (p0)[1]), p2];
} else {
if ((_v905 === "arr")) {
var _v907 = evalList_906((p0)[1], p1, p2);
return [mkArr_38((_v907)[0]), (_v907)[1]];
} else {
if ((_v905 === "idx")) {
var _v908 = evalExpr_680((p0)[1], p1, p2);
var _v909 = evalExpr_680((p0)[2], p1, (_v908)[1]);
return [index_330((_v908)[0], (_v909)[0]), (_v909)[1]];
} else {
if ((_v905 === "dot")) {
var _v910 = evalExpr_680((p0)[1], p1, p2);
return [prop_332((_v910)[0], (p0)[2]), (_v910)[1]];
} else {
if ((_v905 === "not")) {
var _v911 = evalExpr_680((p0)[1], p1, p2);
return (isS_67((_v911)[0]) ? [S_0(!(((_v911)[0])[1])), (_v911)[1]] : [D_4(("!" + paren_3(lift_7((_v911)[0])))), (_v911)[1]]);
} else {
if ((_v905 === "bin")) {
var _v912 = (p0)[1];
if (((_v912 === "&&") || (_v912 === "||"))) {
return evalLogic_913(_v912, p0, p1, p2);
} else {
var _v914 = evalExpr_680((p0)[2], p1, p2);
var _v915 = evalExpr_680((p0)[3], p1, (_v914)[1]);
return [binop_338(_v912, (_v914)[0], (_v915)[0]), (_v915)[1]];
}
} else {
if ((_v905 === "cond")) {
var _v916 = evalExpr_680((p0)[1], p1, p2);
if (isS_67((_v916)[0])) {
return (((_v916)[0])[1] ? evalExpr_680((p0)[2], p1, (_v916)[1]) : evalExpr_680((p0)[3], p1, (_v916)[1]));
} else {
var _v917 = evalExpr_680((p0)[2], p1, (_v916)[1]);
var _v918 = evalExpr_680((p0)[3], p1, (_v917)[1]);
return [D_4((((((("(" + lift_7((_v916)[0])) + " ? ") + lift_7((_v917)[0])) + " : ") + lift_7((_v918)[0])) + ")")), (_v918)[1]];
}
} else {
return ((_v905 === "call") ? evalCall_919(p0, p1, p2) : [fail(("jsmix2: unsupported expression " + str(_v905))), p2]);
}
}
}
}
}
}
}
}
}
function evalCall_683(p0, p1, p2) {
var _v928 = (function () {
var _v920 = (p0)[1];
var _v923 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p2];
} else {
var _v921 = evalExpr_426(((p0)[2])[0], p1, p2);
var _v922 = evalList_662(((p0)[2]).slice(1), p1, (_v921)[1]);
return [([(_v921)[0]]).concat((_v922)[0]), (_v922)[1]];
}
})();
var _v924 = (_v923)[0];
var _v925 = (_v923)[1];
if (((_v920)[0] === "dot")) {
var _v926 = evalExpr_426((_v920)[1], p1, _v925);
return [evalBuiltin_319((_v920)[2], (_v926)[0], _v924), (_v926)[1]];
} else {
var _v927 = findFn_320((_v920)[1]);
return ((_v927 === null) ? [evalBuiltin_322((_v920)[1], _v924), _v925] : unfold_405(_v927, _v924, _v925));
}
})();
return [((((_v928)[0])[0] === "B") ? D_4((("(function () {\n" + ((_v928)[0])[1]) + "})()")) : (_v928)[0]), (_v928)[1]];
}
function evalCallStmt_687(p0, p1, p2) {
var _v929 = (p0)[1];
var _v932 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p2];
} else {
var _v930 = evalExpr_680(((p0)[2])[0], p1, p2);
var _v931 = evalList_906(((p0)[2]).slice(1), p1, (_v930)[1]);
return [([(_v930)[0]]).concat((_v931)[0]), (_v931)[1]];
}
})();
var _v933 = (_v932)[0];
var _v934 = (_v932)[1];
if (((_v929)[0] === "dot")) {
var _v935 = evalExpr_680((_v929)[1], p1, _v934);
return [evalBuiltin_319((_v929)[2], (_v935)[0], _v933), (_v935)[1]];
} else {
var _v936 = findFn_320((_v929)[1]);
return ((_v936 === null) ? [evalBuiltin_322((_v929)[1], _v933), _v934] : (allStatic_68(_v933) ? unfold_704(_v936, _v933, _v934) : residualCall_471(_v936, _v933, _v934)));
}
}
function unfold_704(p0, p1, p2) {
if ((((p0)[3]).length === 0)) {
return [["S",null], p2];
} else {
var _v937 = ((p0)[3])[0];
var _v938 = ((p0)[3]).slice(1);
var _v939 = (_v937)[0];
if ((_v939 === "return")) {
return ((((_v937)[1])[0] === "call") ? evalCallStmt_687((_v937)[1], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2) : evalExpr_680((_v937)[1], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2));
} else {
if ((_v939 === "var")) {
var _v940 = evalExpr_680((_v937)[2], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2);
var _v941 = nameLeaves_137((_v940)[0], (_v940)[1]);
var _v942 = evalStmts_433(_v938, ([[(_v937)[1], (_v941)[0]]]).concat(((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0]))), (_v941)[1]);
return (((_v941)[2] === "") ? _v942 : [["B", ((_v941)[2] + body_16((_v942)[0]))], (_v942)[1]]);
} else {
if ((_v939 === "block")) {
return evalStmts_433(((_v937)[1]).concat(_v938), ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2);
} else {
if ((_v939 === "if")) {
var _v943 = evalExpr_680((_v937)[1], ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2);
var _v944 = ([(_v937)[2]]).concat(_v938);
var _v945 = (((_v937)[3] === null) ? _v938 : ([(_v937)[3]]).concat(_v938));
if (isS_67((_v943)[0])) {
return (((_v943)[0])[1] ? evalStmts_433(_v944, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v943)[1]) : evalStmts_433(_v945, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v943)[1]));
} else {
var _v946 = evalStmts_433(_v944, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v943)[1]);
var _v947 = evalStmts_433(_v945, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), (_v946)[1]);
return ((!(isB_15((_v946)[0])) && !(isB_15((_v947)[0]))) ? [D_4((((((("(" + lift_7((_v943)[0])) + " ? ") + lift_7((_v946)[0])) + " : ") + lift_7((_v947)[0])) + ")")), (_v947)[1]] : [["B", (((((("if (" + lift_7((_v943)[0])) + ") {\n") + body_16((_v946)[0])) + "} else {\n") + body_16((_v947)[0])) + "}\n")], (_v947)[1]]);
}
} else {
return evalStmts_433(_v938, ((((p0)[2]).length === 0) ? [] : bindAll_130(((p0)[2]).slice(1), (p1).slice(1), ((p0)[2])[0], (p1)[0])), p2);
}
}
}
}
}
}
function applyOp_706(p0, p1) {
return (p0 * p1);
}
function evalExpr_708(p0, p1, p2, p3, p4, p5) {
return [((((p3)[0] === "S") && isS_67(p2)) ? S_0(applyOp_449((p3)[1], (p2)[1])) : D_4((((((("(" + lift_7(p3)) + " ") + "+") + " ") + lift_7(p2)) + ")"))), p5];
}
function evalExpr_709(p0, p1, p2, p3, p4, p5) {
var _v948 = ((((p0)[0] === "S") && true) ? S_0(applyOp_597((p0)[1])) : D_4((((((("(" + lift_7(p0)) + " ") + "===") + " ") + "\"subin\"") + ")")));
if (((_v948)[0] === "S")) {
return ((_v948)[1] ? evalExpr_949(p0, p1, p2, p3, p4, p5) : evalExpr_950(p0, p1, p2, p3, p4, p5));
} else {
var _v952 = evalExpr_951(p0, p1, p2, p3, p4, p5);
var _v954 = evalExpr_953(p0, p1, p2, p3, p4, (_v952)[1]);
return [D_4((((((("(" + lift_7(_v948)) + " ? ") + lift_7((_v952)[0])) + " : ") + lift_7((_v954)[0])) + ")")), (_v954)[1]];
}
}
function evalExpr_710(p0, p1, p2, p3, p4, p5) {
return [((((p3)[0] === "S") && isS_67(p2)) ? S_0(applyOp_449((p3)[1], (p2)[1])) : D_4((((((("(" + lift_7(p3)) + " ") + "+") + " ") + lift_7(p2)) + ")"))), p5];
}
function evalExpr_712(p0, p1, p2, p3, p4, p5) {
var _v955 = ((((p0)[0] === "S") && true) ? S_0(applyOp_597((p0)[1])) : D_4((((((("(" + lift_7(p0)) + " ") + "===") + " ") + "\"subin\"") + ")")));
if (((_v955)[0] === "S")) {
return ((_v955)[1] ? evalExpr_951(p0, p1, p2, p3, p4, p5) : evalExpr_953(p0, p1, p2, p3, p4, p5));
} else {
var _v956 = evalExpr_951(p0, p1, p2, p3, p4, p5);
var _v957 = evalExpr_953(p0, p1, p2, p3, p4, (_v956)[1]);
return [D_4((((((("(" + lift_7(_v955)) + " ? ") + lift_7((_v956)[0])) + " : ") + lift_7((_v957)[0])) + ")")), (_v957)[1]];
}
}
function smallerAncestor_735(p0, p1) {
return null;
}
function countFor_738(p0, p1) {
return (((p0).length === 0) ? 0 : ((startsWith_958(((p0)[0])[0], p1) ? 1 : 0) + countFor_738((p0).slice(1), p1)));
}
function evalList_768(p0, p1, p2, p3) {
if (((p0).length === 0)) {
return [[], p2];
} else {
var _v959 = evalExpr_490((p0)[0], p1, p2, p3);
var _v960 = evalList_768((p0).slice(1), p1, (_v959)[1], p3);
return [([(_v959)[0]]).concat((_v960)[0]), (_v960)[1]];
}
}
function evalLogic_782(p0, p1, p2, p3, p4) {
var _v973 = (function () {
var _v961 = ((p1)[2])[0];
if ((_v961 === "lit")) {
return [S_0(((p1)[2])[1]), p3];
} else {
if ((_v961 === "var")) {
return [lookup_325(p2, ((p1)[2])[1]), p3];
} else {
if ((_v961 === "arr")) {
var _v962 = evalList_768(((p1)[2])[1], p2, p3, p4);
return [mkArr_38((_v962)[0]), (_v962)[1]];
} else {
if ((_v961 === "idx")) {
var _v963 = evalExpr_490(((p1)[2])[1], p2, p3, p4);
var _v964 = evalExpr_490(((p1)[2])[2], p2, (_v963)[1], p4);
return [index_330((_v963)[0], (_v964)[0]), (_v964)[1]];
} else {
if ((_v961 === "dot")) {
var _v965 = evalExpr_490(((p1)[2])[1], p2, p3, p4);
return [prop_332((_v965)[0], ((p1)[2])[2]), (_v965)[1]];
} else {
if ((_v961 === "not")) {
var _v966 = evalExpr_490(((p1)[2])[1], p2, p3, p4);
return (isS_67((_v966)[0]) ? [S_0(!(((_v966)[0])[1])), (_v966)[1]] : [D_4(("!" + paren_3(lift_7((_v966)[0])))), (_v966)[1]]);
} else {
if ((_v961 === "bin")) {
var _v967 = ((p1)[2])[1];
if (((_v967 === "&&") || (_v967 === "||"))) {
return evalLogic_782(_v967, (p1)[2], p2, p3, p4);
} else {
var _v968 = evalExpr_490(((p1)[2])[2], p2, p3, p4);
var _v969 = evalExpr_490(((p1)[2])[3], p2, (_v968)[1], p4);
return [binop_338(_v967, (_v968)[0], (_v969)[0]), (_v969)[1]];
}
} else {
if ((_v961 === "cond")) {
var _v970 = evalExpr_490(((p1)[2])[1], p2, p3, p4);
if (isS_67((_v970)[0])) {
return (((_v970)[0])[1] ? evalExpr_490(((p1)[2])[2], p2, (_v970)[1], p4) : evalExpr_490(((p1)[2])[3], p2, (_v970)[1], p4));
} else {
var _v971 = evalExpr_680(((p1)[2])[2], p2, (_v970)[1]);
var _v972 = evalExpr_680(((p1)[2])[3], p2, (_v971)[1]);
return [D_4((((((("(" + lift_7((_v970)[0])) + " ? ") + lift_7((_v971)[0])) + " : ") + lift_7((_v972)[0])) + ")")), (_v972)[1]];
}
} else {
return ((_v961 === "call") ? evalCall_788((p1)[2], p2, p3, p4) : [fail(("jsmix2: unsupported expression " + str(_v961))), p3]);
}
}
}
}
}
}
}
}
})();
if ((((_v973)[0])[0] === "S")) {
return ((p0 === "&&") ? (((_v973)[0])[1] ? evalExpr_490((p1)[3], p2, (_v973)[1], p4) : _v973) : (((_v973)[0])[1] ? _v973 : evalExpr_490((p1)[3], p2, (_v973)[1], p4)));
} else {
var _v974 = evalExpr_680((p1)[3], p2, (_v973)[1]);
return [D_4((((((("(" + lift_7((_v973)[0])) + " ") + p0) + " ") + lift_7((_v974)[0])) + ")")), (_v974)[1]];
}
}
function evalCall_788(p0, p1, p2, p3) {
var _v983 = (function () {
var _v975 = (p0)[1];
var _v978 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p2];
} else {
var _v976 = evalExpr_490(((p0)[2])[0], p1, p2, p3);
var _v977 = evalList_768(((p0)[2]).slice(1), p1, (_v976)[1], p3);
return [([(_v976)[0]]).concat((_v977)[0]), (_v977)[1]];
}
})();
var _v979 = (_v978)[0];
var _v980 = (_v978)[1];
if (((_v975)[0] === "dot")) {
var _v981 = evalExpr_490((_v975)[1], p1, _v980, p3);
return [evalBuiltin_319((_v975)[2], (_v981)[0], _v979), (_v981)[1]];
} else {
var _v982 = findFn_320((_v975)[1]);
return ((_v982 === null) ? [evalBuiltin_322((_v975)[1], _v979), _v980] : ((!(p3) || allStatic_68(_v979)) ? unfold_470(_v982, _v979, _v980, p3) : residualCall_471(_v982, _v979, _v980)));
}
})();
return [((((_v983)[0])[0] === "B") ? D_4((("(function () {\n" + ((_v983)[0])[1]) + "})()")) : (_v983)[0]), (_v983)[1]];
}
function sizeOfData_789(p0) {
return (isArr(p0) ? (1 + sizeOfList_984(p0)) : 1);
}
function findFn_814(p0) {
return null;
}
function smallerAncestor_855(p0, p1, p2) {
if (((p0).length === 0)) {
return null;
} else {
var _v985 = (p0)[((p0).length - 1)];
return ((((_v985)[0] === p1) && (sizeOfSkels_295((_v985)[1]) < p2)) ? _v985 : smallerAncestor_855((p0).slice(0, ((p0).length - 1)), p1, p2));
}
}
function paramNames_862(p0) {
return ((4 >= p0) ? [] : (["p4"]).concat(paramNames_986(p0)));
}
function lookup_863(p0, p1) {
return (("prog" === p1) ? p0 : lookup_987(p1));
}
function evalList_906(p0, p1, p2) {
if (((p0).length === 0)) {
return [[], p2];
} else {
var _v988 = evalExpr_680((p0)[0], p1, p2);
var _v989 = evalList_906((p0).slice(1), p1, (_v988)[1]);
return [([(_v988)[0]]).concat((_v989)[0]), (_v989)[1]];
}
}
function evalLogic_913(p0, p1, p2, p3) {
var _v1002 = (function () {
var _v990 = ((p1)[2])[0];
if ((_v990 === "lit")) {
return [S_0(((p1)[2])[1]), p3];
} else {
if ((_v990 === "var")) {
return [lookup_325(p2, ((p1)[2])[1]), p3];
} else {
if ((_v990 === "arr")) {
var _v991 = evalList_906(((p1)[2])[1], p2, p3);
return [mkArr_38((_v991)[0]), (_v991)[1]];
} else {
if ((_v990 === "idx")) {
var _v992 = evalExpr_680(((p1)[2])[1], p2, p3);
var _v993 = evalExpr_680(((p1)[2])[2], p2, (_v992)[1]);
return [index_330((_v992)[0], (_v993)[0]), (_v993)[1]];
} else {
if ((_v990 === "dot")) {
var _v994 = evalExpr_680(((p1)[2])[1], p2, p3);
return [prop_332((_v994)[0], ((p1)[2])[2]), (_v994)[1]];
} else {
if ((_v990 === "not")) {
var _v995 = evalExpr_680(((p1)[2])[1], p2, p3);
return (isS_67((_v995)[0]) ? [S_0(!(((_v995)[0])[1])), (_v995)[1]] : [D_4(("!" + paren_3(lift_7((_v995)[0])))), (_v995)[1]]);
} else {
if ((_v990 === "bin")) {
var _v996 = ((p1)[2])[1];
if (((_v996 === "&&") || (_v996 === "||"))) {
return evalLogic_913(_v996, (p1)[2], p2, p3);
} else {
var _v997 = evalExpr_680(((p1)[2])[2], p2, p3);
var _v998 = evalExpr_680(((p1)[2])[3], p2, (_v997)[1]);
return [binop_338(_v996, (_v997)[0], (_v998)[0]), (_v998)[1]];
}
} else {
if ((_v990 === "cond")) {
var _v999 = evalExpr_680(((p1)[2])[1], p2, p3);
if (isS_67((_v999)[0])) {
return (((_v999)[0])[1] ? evalExpr_680(((p1)[2])[2], p2, (_v999)[1]) : evalExpr_680(((p1)[2])[3], p2, (_v999)[1]));
} else {
var _v1000 = evalExpr_680(((p1)[2])[2], p2, (_v999)[1]);
var _v1001 = evalExpr_680(((p1)[2])[3], p2, (_v1000)[1]);
return [D_4((((((("(" + lift_7((_v999)[0])) + " ? ") + lift_7((_v1000)[0])) + " : ") + lift_7((_v1001)[0])) + ")")), (_v1001)[1]];
}
} else {
return ((_v990 === "call") ? evalCall_919((p1)[2], p2, p3) : [fail(("jsmix2: unsupported expression " + str(_v990))), p3]);
}
}
}
}
}
}
}
}
})();
if ((((_v1002)[0])[0] === "S")) {
return ((p0 === "&&") ? (((_v1002)[0])[1] ? evalExpr_680((p1)[3], p2, (_v1002)[1]) : _v1002) : (((_v1002)[0])[1] ? _v1002 : evalExpr_680((p1)[3], p2, (_v1002)[1])));
} else {
var _v1003 = evalExpr_680((p1)[3], p2, (_v1002)[1]);
return [D_4((((((("(" + lift_7((_v1002)[0])) + " ") + p0) + " ") + lift_7((_v1003)[0])) + ")")), (_v1003)[1]];
}
}
function evalCall_919(p0, p1, p2) {
var _v1012 = (function () {
var _v1004 = (p0)[1];
var _v1007 = (function () {
if ((((p0)[2]).length === 0)) {
return [[], p2];
} else {
var _v1005 = evalExpr_680(((p0)[2])[0], p1, p2);
var _v1006 = evalList_906(((p0)[2]).slice(1), p1, (_v1005)[1]);
return [([(_v1005)[0]]).concat((_v1006)[0]), (_v1006)[1]];
}
})();
var _v1008 = (_v1007)[0];
var _v1009 = (_v1007)[1];
if (((_v1004)[0] === "dot")) {
var _v1010 = evalExpr_680((_v1004)[1], p1, _v1009);
return [evalBuiltin_319((_v1004)[2], (_v1010)[0], _v1008), (_v1010)[1]];
} else {
var _v1011 = findFn_320((_v1004)[1]);
return ((_v1011 === null) ? [evalBuiltin_322((_v1004)[1], _v1008), _v1009] : (allStatic_68(_v1008) ? unfold_704(_v1011, _v1008, _v1009) : residualCall_471(_v1011, _v1008, _v1009)));
}
})();
return [((((_v1012)[0])[0] === "B") ? D_4((("(function () {\n" + ((_v1012)[0])[1]) + "})()")) : (_v1012)[0]), (_v1012)[1]];
}
function evalExpr_949(p0, p1, p2, p3, p4, p5) {
return [((((p3)[0] === "S") && isS_67(p2)) ? S_0(applyOp_1013((p3)[1], (p2)[1])) : D_4((((((("(" + lift_7(p3)) + " ") + "-") + " ") + lift_7(p2)) + ")"))), p5];
}
function evalExpr_950(p0, p1, p2, p3, p4, p5) {
return [p3, p5];
}
function evalExpr_951(p0, p1, p2, p3, p4, p5) {
return [((((p3)[0] === "S") && isS_67(p2)) ? S_0(applyOp_1013((p3)[1], (p2)[1])) : D_4((((((("(" + lift_7(p3)) + " ") + "-") + " ") + lift_7(p2)) + ")"))), p5];
}
function evalExpr_953(p0, p1, p2, p3, p4, p5) {
return [p3, p5];
}
function startsWith_958(p0, p1) {
return ((p0).slice(0, (p1).length) === p1);
}
function sizeOfList_984(p0) {
return (((p0).length === 0) ? 0 : (sizeOfData_789((p0)[0]) + sizeOfList_984((p0).slice(1))));
}
function paramNames_986(p0) {
return ((5 >= p0) ? [] : (["p5"]).concat(paramNames_1014(p0)));
}
function lookup_987(p0) {
return ["D", p0];
}
function applyOp_1013(p0, p1) {
return (p0 - p1);
}
function paramNames_1014(p0) {
return ((6 >= p0) ? [] : (["p6"]).concat(paramNames_1015(p0)));
}
function paramNames_1015(p0) {
return ((7 >= p0) ? [] : (["p7"]).concat(paramNames_1016(p0)));
}
function paramNames_1016(p0) {
return ((8 >= p0) ? [] : (["p8"]).concat(paramNames_1017(p0)));
}
function paramNames_1017(p0) {
return ((9 >= p0) ? [] : (["p9"]).concat(paramNames_1018(p0)));
}
function paramNames_1018(p0) {
return ((10 >= p0) ? [] : (["p10"]).concat(paramNames_1019(p0)));
}
function paramNames_1019(p0) {
return ((11 >= p0) ? [] : (["p11"]).concat(paramNames_1020(p0)));
}
function paramNames_1020(p0) {
return ((12 >= p0) ? [] : (["p12"]).concat(paramNames_1021(p0)));
}
function paramNames_1021(p0) {
return ((13 >= p0) ? [] : (["p13"]).concat(paramNames_1022(p0)));
}
function paramNames_1022(p0) {
return ((14 >= p0) ? [] : (["p14"]).concat(paramNames_1023(p0)));
}
function paramNames_1023(p0) {
return ((15 >= p0) ? [] : (["p15"]).concat(paramNames_1024(p0)));
}
function paramNames_1024(p0) {
return ((16 >= p0) ? [] : (["p16"]).concat(paramNames_1025(p0)));
}
function paramNames_1025(p0) {
return ((17 >= p0) ? [] : (["p17"]).concat(paramNames_1026(p0)));
}
function paramNames_1026(p0) {
return ((18 >= p0) ? [] : (["p18"]).concat(paramNames_1027(p0)));
}
function paramNames_1027(p0) {
return ((19 >= p0) ? [] : (["p19"]).concat(paramNames_1028(p0)));
}
function paramNames_1028(p0) {
return ((20 >= p0) ? [] : (["p20"]).concat(paramNames_1029(p0)));
}
function paramNames_1029(p0) {
return ((21 >= p0) ? [] : (["p21"]).concat(paramNames_1030(p0)));
}
function paramNames_1030(p0) {
return ((22 >= p0) ? [] : (["p22"]).concat(paramNames_1031(p0)));
}
function paramNames_1031(p0) {
return ((23 >= p0) ? [] : (["p23"]).concat(paramNames_1032(p0)));
}
function paramNames_1032(p0) {
return ((24 >= p0) ? [] : (["p24"]).concat(paramNames_1033(p0)));
}
function paramNames_1033(p0) {
return ((25 >= p0) ? [] : (["p25"]).concat(paramNames_1034(p0)));
}
function paramNames_1034(p0) {
return ((26 >= p0) ? [] : (["p26"]).concat(paramNames_1035(p0)));
}
function paramNames_1035(p0) {
return ((27 >= p0) ? [] : (["p27"]).concat(paramNames_1036(p0)));
}
function paramNames_1036(p0) {
return ((28 >= p0) ? [] : (["p28"]).concat(paramNames_1037(p0)));
}
function paramNames_1037(p0) {
return ((29 >= p0) ? [] : (["p29"]).concat(paramNames_1038(p0)));
}
function paramNames_1038(p0) {
return ((30 >= p0) ? [] : (["p30"]).concat(paramNames_1039(p0)));
}
function paramNames_1039(p0) {
return ((31 >= p0) ? [] : (["p31"]).concat(paramNames_1040(p0)));
}
function paramNames_1040(p0) {
return ((32 >= p0) ? [] : (["p32"]).concat(paramNames_1041(p0)));
}
function paramNames_1041(p0) {
return ((33 >= p0) ? [] : (["p33"]).concat(paramNames_1042(p0)));
}
function paramNames_1042(p0) {
return ((34 >= p0) ? [] : (["p34"]).concat(paramNames_1043(p0)));
}
function paramNames_1043(p0) {
return ((35 >= p0) ? [] : (["p35"]).concat(paramNames_1044(p0)));
}
function paramNames_1044(p0) {
return ((36 >= p0) ? [] : (["p36"]).concat(paramNames_1045(p0)));
}
function paramNames_1045(p0) {
return ((37 >= p0) ? [] : (["p37"]).concat(paramNames_1046(p0)));
}
function paramNames_1046(p0) {
return ((38 >= p0) ? [] : (["p38"]).concat(paramNames_1047(p0)));
}
function paramNames_1047(p0) {
return ((39 >= p0) ? [] : (["p39"]).concat(paramNames_1048(p0)));
}
function paramNames_1048(p0) {
return ((40 >= p0) ? [] : (["p40"]).concat(paramNames_1049(p0)));
}
function paramNames_1049(p0) {
return ((41 >= p0) ? [] : (["p41"]).concat(paramNames_1050(p0)));
}
function paramNames_1050(p0) {
return ((42 >= p0) ? [] : (["p42"]).concat(paramNames_1051(p0)));
}
function paramNames_1051(p0) {
return ((43 >= p0) ? [] : (["p43"]).concat(paramNames_1052(p0)));
}
function paramNames_1052(p0) {
return ((44 >= p0) ? [] : (["p44"]).concat(paramNames_1053(p0)));
}
function paramNames_1053(p0) {
return ((45 >= p0) ? [] : (["p45"]).concat(paramNames_1054(p0)));
}
function paramNames_1054(p0) {
return ((46 >= p0) ? [] : (["p46"]).concat(paramNames_1055(p0)));
}
function paramNames_1055(p0) {
return ((47 >= p0) ? [] : (["p47"]).concat(paramNames_1056(p0)));
}
function paramNames_1056(p0) {
return ((48 >= p0) ? [] : (["p48"]).concat(paramNames_1057(p0)));
}
function paramNames_1057(p0) {
return ((49 >= p0) ? [] : (["p49"]).concat(paramNames_1058(p0)));
}
function paramNames_1058(p0) {
return ((50 >= p0) ? [] : (["p50"]).concat(paramNames_1059(p0)));
}
function paramNames_1059(p0) {
return ((51 >= p0) ? [] : (["p51"]).concat(paramNames_1060(p0)));
}
function paramNames_1060(p0) {
return ((52 >= p0) ? [] : (["p52"]).concat(paramNames_1061(p0)));
}
function paramNames_1061(p0) {
return ((53 >= p0) ? [] : (["p53"]).concat(paramNames_1062(p0)));
}
function paramNames_1062(p0) {
return ((54 >= p0) ? [] : (["p54"]).concat(paramNames_1063(p0)));
}
function paramNames_1063(p0) {
return ((55 >= p0) ? [] : (["p55"]).concat(paramNames_1064(p0)));
}
function paramNames_1064(p0) {
return ((56 >= p0) ? [] : (["p56"]).concat(paramNames_1065(p0)));
}
function paramNames_1065(p0) {
return ((57 >= p0) ? [] : (["p57"]).concat(paramNames_1066(p0)));
}
function paramNames_1066(p0) {
return ((58 >= p0) ? [] : (["p58"]).concat(paramNames_1067(p0)));
}
function paramNames_1067(p0) {
return ((59 >= p0) ? [] : (["p59"]).concat(paramNames_1068(p0)));
}
function paramNames_1068(p0) {
return ((60 >= p0) ? [] : (["p60"]).concat(paramNames_1069(p0)));
}
function paramNames_1069(p0) {
return ((61 >= p0) ? [] : (["p61"]).concat(paramNames_1070(p0)));
}
function paramNames_1070(p0) {
return ((62 >= p0) ? [] : (["p62"]).concat(paramNames_1071(p0)));
}
function paramNames_1071(p0) {
return ((63 >= p0) ? [] : (["p63"]).concat(paramNames_1072(p0, 64)));
}
function paramNames_1072(p0, p1) {
return ((p1 >= p0) ? [] : ([("p" + p1)]).concat(paramNames_1072(p0, (p1 + 1))));
}

function main(program){return generatedCompiler(program);}
