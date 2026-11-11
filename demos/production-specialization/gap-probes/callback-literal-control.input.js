function main(input) { return input.map(value => typeof value==='string' ? value.replace(/^_NEXTSEP_/,'') : value); }
