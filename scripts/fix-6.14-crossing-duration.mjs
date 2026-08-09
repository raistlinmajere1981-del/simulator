import fs from 'node:fs';

const path = 'src/simulation/stellar-local-horizon-trail.ts';
let source = fs.readFileSync(path, 'utf8');
const before = '      const crossingMs = new Date(crossing.observedAtIso).getTime();';
const after = '      const crossingMs = startMs + crossing.elapsedMinutes * 60_000;';
const first = source.indexOf(before);
if (first < 0) throw new Error('Geçiş süresi parse satırı bulunamadı.');
if (source.indexOf(before, first + before.length) >= 0) throw new Error('Geçiş süresi parse satırı birden fazla bulundu.');
source = source.slice(0, first) + after + source.slice(first + before.length);
fs.writeFileSync(path, source);
console.log('Stage 6.14 crossing duration precision fixed.');
