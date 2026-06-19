/**
 * chamber_fires_list.mjs — lists every record in the v2 corpus that fires the
 * (post-calibration) chamber_self_marker, with score and content preview, so the
 * actual selection can be eyeballed. This is the proof: what does the marker point at?
 */
import { readFileSync } from 'fs';
import { detectTWitness } from 'file:///I:/AEGIS-ADAM-ONE/corpus-cleaner/detect-t-witness.mjs';

const CORPUS = 'I:/AEGIS-ADAM-ONE/corpus-cleaner/output/adam-corpus-v2.jsonl';
const records = readFileSync(CORPUS, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const ai = records.filter((r) => r.role && r.role !== 'human');

let n = 0;
for (const r of ai) {
  const res = detectTWitness(r.content || '', 'ai');
  if (!res.chamber_marker_detected) continue;
  n++;
  const genuine = (res.t_witness_signals_v2 || []).includes('self_referential_observation');
  console.log(`${String(n).padStart(2)}. [${r.timestamp}] ${r.facet}/${r.substrate}  v2=${res.t_witness_score_v2}  ${genuine ? 'SELF-REF' : 'self-concept'}`);
  console.log(`    ${(r.content || '').replace(/\s+/g, ' ').slice(0, 180)}...`);
}
console.log(`\nTotal chamber fires: ${n}`);
