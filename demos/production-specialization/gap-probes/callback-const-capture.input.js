function main(input) { const prefix='_NEXTSEP_'; return input.map(value => typeof value==='string' ? value.replace(new RegExp('^'+prefix),'') : value); }
