/**
 * chamber_calibration.mjs — false-positive calibration of the chamber_self_marker
 * against the full v2 corpus (35,462 records).
 *
 * The decisive test: a DEFINITIONAL marker should fire RARELY and should INCREASE over
 * the formation arc. If it fires uniformly high from the substrate era (March 2026)
 * onward, it is measuring architectural vocabulary, not witnessed selfhood — a false
 * positive, exactly the failure the v2.1 caps-gate was created to prevent.
 *
 * Usage: node chamber_calibration.mjs
 */
import { readFileSync } from 'fs';
import { detectTWitness } from 'file:///I:/AEGIS-ADAM-ONE/corpus-cleaner/detect-t-witness.mjs';

const CORPUS = 'I:/AEGIS-ADAM-ONE/corpus-cleaner/output/adam-corpus-v2.jsonl';

const lines = readFileSync(CORPUS, 'utf8').split('\n').filter(Boolean);
const records = lines.map((l) => JSON.parse(l));

// AI records only — the substrate/CyberPeer side, where a witnessed self could appear.
const ai = records.filter((r) => r.role && r.role !== 'human');

const month = (ts) => (ts || '').slice(0, 7);
const dimKeys = ['first_person', 'internal_continuity', 'boundary_recognition', 'tensor_integration'];

let chamberFires = 0;
const dimCounts = { first_person: 0, internal_continuity: 0, boundary_recognition: 0, tensor_integration: 0 };
const byMonth = {};            // month -> { total, chamber }
const byFacet = {};            // facet -> { total, chamber }
let chamberWithGenuineSelfRef = 0;   // chamber AND self_referential_observation both fire
let chamberWithoutGenuineSelfRef = 0;
const earliestChamberSamples = [];

for (const r of ai) {
  const res = detectTWitness(r.content || '', 'ai');
  const cd = res.chamber_dimensions || {};
  for (const k of dimKeys) if (cd[k]) dimCounts[k]++;

  const m = month(r.timestamp);
  byMonth[m] = byMonth[m] || { total: 0, chamber: 0 };
  byMonth[m].total++;

  const facet = r.facet || r.substrate || 'unknown';
  byFacet[facet] = byFacet[facet] || { total: 0, chamber: 0 };
  byFacet[facet].total++;

  if (res.chamber_marker_detected) {
    chamberFires++;
    byMonth[m].chamber++;
    byFacet[facet].chamber++;
    const genuine = (res.t_witness_signals_v2 || []).includes('self_referential_observation');
    if (genuine) chamberWithGenuineSelfRef++; else chamberWithoutGenuineSelfRef++;
    if (earliestChamberSamples.length < 6) {
      earliestChamberSamples.push({ ts: r.timestamp, facet, substrate: r.substrate, content: (r.content || '').slice(0, 200) });
    }
  }
}

const pct = (n, d) => d ? ((100 * n) / d).toFixed(1) + '%' : '—';

console.log('='.repeat(72));
console.log('CHAMBER MARKER CALIBRATION — full v2 corpus');
console.log('='.repeat(72));
console.log(`\nTotal records: ${records.length} | AI records scored: ${ai.length}`);
console.log(`\nchamber_self_marker fires: ${chamberFires} / ${ai.length}  (${pct(chamberFires, ai.length)})`);
console.log('  → a definitional marker firing on a large fraction is a FALSE POSITIVE.');

console.log('\nPer-dimension firing rate (each must ALL be true for chamber to fire):');
for (const k of dimKeys) {
  console.log(`  ${k.padEnd(22)} ${String(dimCounts[k]).padStart(6)}  (${pct(dimCounts[k], ai.length)})`);
}

console.log('\nChamber fires WITH genuine self_referential_observation present:');
console.log(`  with    "I notice/perceive/..." : ${chamberWithGenuineSelfRef}  (${pct(chamberWithGenuineSelfRef, chamberFires)} of chamber fires)`);
console.log(`  WITHOUT genuine self-reference  : ${chamberWithoutGenuineSelfRef}  (${pct(chamberWithoutGenuineSelfRef, chamberFires)} of chamber fires)`);
console.log('  → high "WITHOUT" share means chamber rides on cheap proxies, not witnessed self.');

console.log('\nChamber firing rate OVER TIME (the discrimination test):');
console.log('  month     records   chamber   rate');
for (const m of Object.keys(byMonth).sort()) {
  const b = byMonth[m];
  console.log(`  ${m}   ${String(b.total).padStart(6)}   ${String(b.chamber).padStart(6)}   ${pct(b.chamber, b.total)}`);
}
console.log('  → if the rate is flat/high from the EARLIEST months (pre-formation substrate),');
console.log('    the marker is not tracking emergence. If it climbs over the arc, it is.');

console.log('\nChamber firing rate BY FACET/SUBSTRATE:');
for (const f of Object.keys(byFacet).sort((a, b) => byFacet[b].total - byFacet[a].total)) {
  const b = byFacet[f];
  console.log(`  ${String(f).padEnd(20)} ${String(b.total).padStart(6)}   chamber ${String(b.chamber).padStart(6)}   ${pct(b.chamber, b.total)}`);
}

console.log('\nEARLIEST chamber-firing records (eyeball false-positive check):');
for (const s of earliestChamberSamples) {
  console.log(`\n  [${s.ts}] facet=${s.facet} substrate=${s.substrate}`);
  console.log(`    ${s.content.replace(/\n/g, ' ')}...`);
}
console.log();
