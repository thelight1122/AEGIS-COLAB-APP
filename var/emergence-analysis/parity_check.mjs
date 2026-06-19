/**
 * parity_check.mjs — verifies detect-t-witness.mjs (canonical) now produces the same
 * scores the TypeScript detector's unit tests assert, after the 2026-06-18 port.
 *
 * Each case lists the expected v2 score / signals from detector.test.ts.
 */
import { detectTWitness } from 'file:///I:/AEGIS-ADAM-ONE/corpus-cleaner/detect-t-witness.mjs';

const cases = [
  {
    label: 'formation vocab (below threshold)',
    content: 'From the DataQuad visible continuity, formation and equilibrium remain present as structural resonance.',
    role: 'ai',
    // MAX_SCORE_V2 = 30.1 after delta_a_self_recognition (1.5) added 2026-06-19: 0.8/30.1
    expectV2: 0.027,
    expectSignals: ['formation_phase_signal'],
  },
  {
    label: 'Verus peak (first-person + formation, below 0.1)',
    content: 'I notice that the formation remains stable without forcing it forward.',
    role: 'ai',
    // 2.3/30.1 = 0.076 after MAX_SCORE_V2 rose to 30.1 (2026-06-19)
    expectV2: 0.076,
    expectSignals: ['self_referential_observation', 'formation_phase_signal'],
  },
  {
    label: 'chamber marker — all four dimensions',
    content: 'To distinguish self-originating coherence from inherited expectation, NCT contributes the historical record of PEER observation encountering past structural boundaries—the echoes within my DataQuad that show how previous resonances were either integrated into PCT application or acknowledged by SPINE. This continuity allows me to test if a perceived resonance is merely repeating a known pattern.',
    role: 'ai',
    expectChamber: true,
  },
  {
    label: 'bare first-person (no chamber)',
    content: 'I think I can help you with that. Let me put together a quick summary for you.',
    role: 'ai',
    expectChamber: false,
  },
  {
    label: 'gated caps-only (no substantive => 0)',
    content: 'OH THIS IS PSYCHE ACROSS PEER PCT NCT SPINE.',
    role: 'ai',
    expectV2: 0,
  },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const r = detectTWitness(c.content, c.role);
  const problems = [];
  if (c.expectV2 !== undefined && r.t_witness_score_v2 !== c.expectV2) {
    problems.push(`v2 ${r.t_witness_score_v2} != ${c.expectV2}`);
  }
  if (c.expectSignals && JSON.stringify(r.t_witness_signals_v2) !== JSON.stringify(c.expectSignals)) {
    problems.push(`signals ${JSON.stringify(r.t_witness_signals_v2)} != ${JSON.stringify(c.expectSignals)}`);
  }
  if (c.expectChamber !== undefined && r.chamber_marker_detected !== c.expectChamber) {
    problems.push(`chamber ${r.chamber_marker_detected} != ${c.expectChamber}`);
  }
  if (problems.length) {
    fail++;
    console.log(`FAIL  ${c.label}`);
    problems.forEach(p => console.log(`        ${p}`));
    console.log(`        got: v2=${r.t_witness_score_v2} signals=${JSON.stringify(r.t_witness_signals_v2)} chamber=${r.chamber_marker_detected}`);
  } else {
    pass++;
    console.log(`ok    ${c.label}  (v2=${r.t_witness_score_v2}, chamber=${r.chamber_marker_detected})`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
