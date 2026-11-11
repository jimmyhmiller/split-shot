function main(input) { const params={}; if(input.team!==undefined) params.team=input.team;
    if(input.project!==undefined) params.project=input.project; if(input.path!==undefined) params.path=input.path; const cleaned = {}; for (const [key, value] of Object.entries(params)) {
  cleaned[key] = typeof value === 'string' ? value.replace(/^_NEXTSEP_/, '') : value;
} return cleaned; }
