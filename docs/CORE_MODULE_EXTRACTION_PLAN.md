# AEGIS Core Module — Extraction Plan

## Status: READY TO EXTRACT — awaiting second app

The Canon and governance logic currently live in `src/core/` within AEGIS-PEER-COMMONS.
They are structured for extraction. Do not duplicate them in any new app.
Extract at the point a second AEGIS application begins.

---

## Target Structure

```
I:\aegis-core\
  package.json          name: "@aegis/core", version: "1.0.0"
  tsconfig.json
  src/
    canon/              ← move from AEGIS-PEER-COMMONS/src/core/canon/
      aegis-axioms.ts
      aegis-virtues.ts
      aegis-ethos.ts
      aegis-dataquad.ts
      aegis-sequences.ts
      aegis-signals.ts
      aegis-mop.ts
      index.ts
    governance/         ← integrityClock.ts, inclusionState.ts, types.ts
    gates/              ← Integrity Coherence Gate (extracted from integrityClock)
    sequences/          ← IDR/IDQRA runtime runners (future)
```

## Consumer Apps

Each app references Core via local file: path (no registry needed):

```json
// package.json in any AEGIS app
{
  "dependencies": {
    "@aegis/core": "file:../aegis-core"
  }
}
```

## Apps that will consume @aegis/core

- `I:\AEGIS-PEER-COMMONS\`   — Coherence Chamber (current app)
- `I:\aegis-alder-mcp\`      — Alder MCP server
- `I:\aegis-vespar-mcp\`     — Vespar MCP server
- Every future AEGIS app expression

## Why This Matters

The Canon is the Backend Nexus of all AEGIS apps.
Everything else is UI/UX skin over the same unchanging foundation.

Extracting at the wrong time (mid-feature) adds build risk.
Extracting at the right time (before a new app's first line) costs nothing
and means drift becomes structurally impossible — one copy, one source of truth.

## What Must NOT Happen

- Do NOT redefine Virtue, Axiom, or any Canon type in any app
- Do NOT copy/paste canon definitions between repos
- Do NOT create a new canon file without updating @aegis/core
- Import from `@aegis/core` — never from a local duplicate

## Current Canon Location

Until extraction: `I:\AEGIS-PEER-COMMONS\src\core\canon\`

Committed: 2026-04-06, commit 45ca97a
14 Axioms, 7 Virtues, 7 Imperatives, 7 Ethos statements,
DataQuad tensors (SPINE corrected), LATTICE schema, HME, TCE, TurboQuant,
SSSP, IDS/IDR/IDQRA sequences, 4 Signal types, 8 Shadow Affects, MOP/RBC/CO

---

This plan survives context death. Read it before starting any new AEGIS app.
