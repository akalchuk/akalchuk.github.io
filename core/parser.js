export function parseStepClimb(input){
  if (typeof input !== 'string') throw new TypeError('parseStepClimb: input must be a string');
  const parts = input.split(',');
  const out = [];
  for (const raw of parts){
    const p = raw.trim();
    if (!p) continue; // ignore empty segments
    const match = p.match(/^FL(\d+)\/(.+)$/i);
    if (!match) throw new Error(`parseStepClimb: invalid segment syntax: "${p}"`);
    const fl = Number(match[1]);
    if (!Number.isFinite(fl)) throw new Error(`parseStepClimb: invalid flight level in "${p}"`);
    let spec = match[2].trim().toUpperCase();
    let until;
    if (spec === 'END') {
      until = { type: 'end' };
    } else if (spec.endsWith('NM')) {
      const val = Number(spec.replace(/NM$/i, ''));
      if (Number.isNaN(val)) throw new Error(`parseStepClimb: invalid distance in "${p}"`);
      until = { type: 'distance', value: val };
    } else if (spec.includes(':')) {
      const partsTime = spec.split(':').map(Number);
      if (partsTime.length !== 2 || partsTime.some(Number.isNaN)) {
        throw new Error(`parseStepClimb: invalid time in "${p}"`);
      }
      const [h, mn] = partsTime;
      if (mn < 0 || mn >= 60 || h < 0) throw new Error(`parseStepClimb: invalid time in "${p}"`);
      until = { type: 'time', value: h * 60 + mn }; // minutes
    } else {
      throw new Error(`parseStepClimb: unknown until specifier in "${p}"`);
    }
    out.push({ fl, until });
  }
  if (out.length === 0) throw new Error('parseStepClimb: no valid segments found');
  return out;
}
