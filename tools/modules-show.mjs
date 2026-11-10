// How a test value prints, the same for Node's run and the residual's.
export function show(v) {
  if (Object.is(v, -0)) return '-0';
  if (typeof v === 'number' && !Number.isFinite(v)) return String(v);
  if (typeof v === 'bigint') return v + 'n';
  if (typeof v === 'symbol') return String(v);
  if (typeof v === 'function') return '<function ' + v.name + '>';
  if (v === undefined) return '<undefined>';
  const j = JSON.stringify(v);
  return j === undefined ? '<' + typeof v + '>' : j;
}
