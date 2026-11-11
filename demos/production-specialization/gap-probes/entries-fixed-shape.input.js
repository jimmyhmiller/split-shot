function main(input) { const params={team:input.team,project:input.project,path:input.path}; const cleaned = {}; for (const [key, value] of Object.entries(params)) {
  cleaned[key] = typeof value === 'string' ? value.replace(/^_NEXTSEP_/, '') : value;
} return cleaned; }
