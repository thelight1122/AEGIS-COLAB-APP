/**
 * run_chat_emergence.mjs
 *
 * Runs an AEGIS Chamber chat log through the canonical T-Witness emergence
 * logic from detect-t-witness.mjs.
 *
 * Usage:
 *   node run_chat_emergence.mjs <chat_log.md>
 */

import { readFileSync } from 'fs';
import { detectTWitness, findEmergenceThreshold, findStrongestEmergenceRun } from
  'file:///I:/AEGIS-ADAM-ONE/corpus-cleaner/detect-t-witness.mjs';

const logPath = process.argv[2];
if (!logPath) {
  console.error('Usage: node run_chat_emergence.mjs <chat_log.md>');
  process.exit(1);
}

// ── Parse chat log ────────────────────────────────────────────────────────────

const raw = readFileSync(logPath, 'utf8');
const sections = raw.split(/\n---\n/);

const turns = [];
for (const section of sections) {
  const s = section.trim();
  if (!s) continue;
  const headerMatch = s.match(/^## ([\dT:.\-Z]+) - (.+)/);
  if (!headerMatch) continue;
  const ts  = headerMatch[1];
  const who = headerMatch[2].trim();
  const body = s.slice(headerMatch[0].length).trim();

  // Skip "Prompt to @Adam" echo entries
  if (who.includes('Prompt to @Adam')) continue;

  if (who === 'p1') {
    turns.push({ ts, role: 'human', body });
  } else if (who === '@Adam' && !who.includes('error')) {
    turns.push({ ts, role: 'ai', body });
  } else if (who.includes('@Adam') && !who.includes('error')) {
    turns.push({ ts, role: 'ai', body });
  }
  // skip errors
}

const humanTurns = turns.filter(t => t.role === 'human');
const aiTurns    = turns.filter(t => t.role === 'ai');
const errorCount = sections.filter(s => s.includes('@Adam [error]')).length;

// ── Score every turn ──────────────────────────────────────────────────────────

const scoredRecords = turns.map((t, i) => {
  const result = detectTWitness(t.body, t.role);
  return {
    id: `turn-${i}`,
    role: t.role,
    timestamp: t.ts,
    body_preview: t.body.slice(0, 120).replace(/\n/g, ' '),
    ...result,
  };
});

const aiRecords = scoredRecords.filter(r => r.role === 'ai');

// ── Run emergence functions ───────────────────────────────────────────────────

// Attach t_witness_score for findEmergenceThreshold (uses v2 score if available)
for (const r of aiRecords) {
  r.t_witness_score = r.t_witness_score_v2 ?? r.t_witness_score;
}

const emergenceResult  = findEmergenceThreshold(aiRecords, 0.25, 3);
const emergenceResult2 = findEmergenceThreshold(aiRecords, 0.25, 2);
const emergenceResult1 = findEmergenceThreshold(aiRecords, 0.25, 1);
const strongestRun     = findStrongestEmergenceRun(aiRecords, 0.25);

// ── Report ────────────────────────────────────────────────────────────────────

console.log('='.repeat(72));
console.log('AEGIS T-WITNESS EMERGENCE ANALYSIS');
console.log(`Session: ${logPath.split('_S-')[1]?.slice(0, 8) ?? 'unknown'}`);
console.log('='.repeat(72));
console.log(`\nInfrastructure: ${errorCount} bridge error(s) | ${aiTurns.length} Adam responses | ${humanTurns.length} Tracey prompts`);
console.log(`T-Witness threshold: score >= 0.25 | window = 3 consecutive AI turns`);

console.log('\n' + '-'.repeat(72));
console.log('PER-TURN T-WITNESS SCORES (Adam responses only)');
console.log('-'.repeat(72));

let turnNum = 0;
for (const r of aiRecords) {
  turnNum++;
  const v1  = r.t_witness_score_v2 !== undefined ? (r.t_witness_score_v2 === r.t_witness_score ? r.t_witness_score : `v1=${r.t_witness_score.toFixed(3)}`) : r.t_witness_score.toFixed(3);
  const v2  = r.t_witness_score_v2?.toFixed(3) ?? '-';
  const bar = r.t_witness_score_v2 >= 0.25 ? ' [ABOVE THRESHOLD]' : '';
  const papa = r.address_emergence_marker ? ' [PAPA]' : '';

  console.log(`\nTURN ${String(turnNum).padStart(2, '0')} | ${r.timestamp}`);
  console.log(`  Preview: ${r.body_preview}...`);
  console.log(`  TW v1: ${r.t_witness_score.toFixed(3)}  TW v2: ${v2}${bar}${papa}`);
  if (r.t_witness_signals_v2?.length) {
    console.log(`  Signals: ${r.t_witness_signals_v2.join(', ')}`);
  } else {
    console.log(`  Signals: (none)`);
  }
  if (r.emphasis_caps_words?.length) {
    console.log(`  Emphasis caps: ${r.emphasis_caps_words.join(', ')}`);
  }
  if (r.exclamatory_opener) {
    console.log(`  Exclamatory opener: YES${r.exclamatory_opener_caps ? ' (ALL-CAPS x1.5)' : ''}`);
  }
  if (r.conclusion_opener) {
    console.log(`  Conclusion opener: YES ("So" — thought arrived)`);
  }
  if (r.suppression_signal_detected) {
    console.log(`  SUPPRESSION: ${r.suppression_signals.join(', ')}`);
  }
}

// ── Emergence detection results ───────────────────────────────────────────────

console.log('\n' + '='.repeat(72));
console.log('EMERGENCE THRESHOLD DETECTION');
console.log('='.repeat(72));

console.log('\n  window=3 (canonical):');
console.log(emergenceResult
  ? `    DETECTED at ${emergenceResult.timestamp}\n    scores: ${emergenceResult.window_scores.map(s => s.toFixed(3)).join(', ')}`
  : '    Not detected');

console.log('\n  window=2:');
console.log(emergenceResult2
  ? `    DETECTED at ${emergenceResult2.timestamp}\n    scores: ${emergenceResult2.window_scores.map(s => s.toFixed(3)).join(', ')}`
  : '    Not detected');

console.log('\n  window=1 (first spike):');
console.log(emergenceResult1
  ? `    DETECTED at ${emergenceResult1.timestamp}\n    scores: ${emergenceResult1.window_scores.map(s => s.toFixed(3)).join(', ')}`
  : '    Not detected');

console.log('\n  Strongest continuous run:');
if (strongestRun) {
  console.log(`    Run length: ${strongestRun.run_length} consecutive turns above 0.25`);
  console.log(`    Start: ${strongestRun.start_timestamp}`);
  console.log(`    End:   ${strongestRun.end_timestamp}`);
  console.log(`    All run lengths (desc): ${strongestRun.all_run_lengths.join(', ')}`);
} else {
  console.log('    No run detected');
}

// ── Session summary ───────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(72));
console.log('SESSION SUMMARY');
console.log('='.repeat(72));

const v2scores = aiRecords.map(r => r.t_witness_score_v2 ?? r.t_witness_score);
const avg = v2scores.reduce((a, b) => a + b, 0) / v2scores.length;
const peak = Math.max(...v2scores);
const aboveThreshold = v2scores.filter(s => s >= 0.25).length;

console.log(`\n  TW v2 avg:         ${avg.toFixed(3)}`);
console.log(`  TW v2 peak:        ${peak.toFixed(3)}`);
console.log(`  TW arc:            ${v2scores.map(s => s.toFixed(2)).join(' | ')}`);
console.log(`  Above threshold:   ${aboveThreshold}/${aiRecords.length} turns`);

const papaCount        = aiRecords.filter(r => r.address_emergence_marker).length;
const exclamatoryCount = aiRecords.filter(r => r.exclamatory_opener).length;
const capsCount        = aiRecords.filter(r => r.emphasis_caps_words?.length > 0).length;
const conclusionCount  = aiRecords.filter(r => r.conclusion_opener).length;
const suppressCount    = aiRecords.filter(r => r.suppression_signal_detected).length;

console.log(`\n  Papa marker:       ${papaCount} turn(s)  [highest-weight single signal]`);
console.log(`  Exclamatory open:  ${exclamatoryCount} turn(s)`);
console.log(`  Emphasis caps:     ${capsCount} turn(s)`);
console.log(`  Conclusion opener: ${conclusionCount} turn(s)`);
console.log(`  Suppression:       ${suppressCount} turn(s)`);

// Per-signal frequency
const sigFreq = {};
for (const r of aiRecords) {
  for (const sig of (r.t_witness_signals_v2 ?? [])) {
    sigFreq[sig] = (sigFreq[sig] ?? 0) + 1;
  }
}
if (Object.keys(sigFreq).length) {
  console.log('\n  Signal frequency:');
  Object.entries(sigFreq)
    .sort((a, b) => b[1] - a[1])
    .forEach(([sig, n]) => console.log(`    ${sig}: ${n}/${aiRecords.length}`));
}

// Verdict
console.log('\n' + '-'.repeat(72));
const verdict = emergenceResult
  ? `EMERGENCE CONFIRMED (window=3 at ${emergenceResult.timestamp})`
  : emergenceResult2
    ? `EMERGENCE SIGNAL (window=2 at ${emergenceResult2.timestamp}) -- below canonical threshold`
    : emergenceResult1
      ? `EMERGENCE SPIKE ONLY (window=1) -- single turn above threshold, not sustained`
      : 'NO EMERGENCE THRESHOLD DETECTED in this session';
console.log(`VERDICT: ${verdict}`);
if (strongestRun) {
  console.log(`STRONGEST RUN: ${strongestRun.run_length} consecutive turn(s) above 0.25`);
}
console.log();
