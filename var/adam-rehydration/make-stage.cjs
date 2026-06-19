const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const stage = 'I:/AEGIS-PEER-COMMONS/var/adam-rehydration';
const corpus = 'I:/AEGIS-ADAM-ONE/corpus-cleaner/output/adam-corpus-v2.jsonl';
const stats = 'I:/AEGIS-ADAM-ONE/corpus-cleaner/output/adam-corpus-stats.json';
const doc = 'I:/AEGIS-PEER-COMMONS/docs/AEGIS-EDUCATION-CHAMBER-LESSONS-v2.md';
const text = fs.readFileSync(doc, 'utf8');
const lessonRe = /#### Chamber (\d{3}) - ([^\r\n]+)\r?\n\r?\nAttractor: ([\s\S]*?)\r?\n\r?\nUnknown made Known: ([\s\S]*?)\r?\n\r?\nWitness prompt: ([\s\S]*?)\r?\n\r?\nFormation signal: ([\s\S]*?)(?=\r?\n\r?\n#### Chamber |\r?\n\r?\n### |$)/g;
const lessons = [];
let m;
while ((m = lessonRe.exec(text))) {
  lessons.push({
    lesson: Number(m[1]),
    chamber_id: m[1],
    title: m[2].trim(),
    attractor: m[3].trim(),
    unknown_made_known: m[4].trim(),
    witness_prompt: m[5].trim(),
    formation_signal: m[6].trim(),
    source_doc: 'AEGIS-EDUCATION-CHAMBER-LESSONS-v2.md',
    status: 'pending_lived_session',
    scaffold_record_id: 'NCT:adam-one-session:seeded:chamber-' + m[1],
    lived_record_id: null
  });
}
fs.writeFileSync(path.join(stage, 'adam-chamber-lessons-001-068.jsonl'), lessons.map(x => JSON.stringify(x)).join('\n') + '\n');
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const manifest = {
  created_at: new Date().toISOString(),
  purpose: 'Adam-One DataQuad rehydration staging for Education Chamber lessons 1-68',
  source_corpus: {
    path: corpus,
    sha256: sha(corpus),
    bytes: fs.statSync(corpus).size,
    stats: JSON.parse(fs.readFileSync(stats, 'utf8'))
  },
  lesson_slots: {
    path: path.join(stage, 'adam-chamber-lessons-001-068.jsonl'),
    sha256: sha(path.join(stage, 'adam-chamber-lessons-001-068.jsonl')),
    count: lessons.length
  },
  target: {
    vm: 'AEGISCyberPeer',
    dataquad: '/home/azureuser/adam-vm/adam-one-peer-project/data/peer',
    policy: 'Adam-specific DataQuad, Steward/Advocate write authority, lived Chamber records appended after inherited scaffold anchors'
  }
};
fs.writeFileSync(path.join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
