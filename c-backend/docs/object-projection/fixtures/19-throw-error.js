// @case {"description": "Thrown Error name and message survive all execution paths."}
function main(x) { if (x < 0) throw new Error("negative input"); throw new Error("value=" + x); }
