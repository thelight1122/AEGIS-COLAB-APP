# React + TypeScript + Vite

## What This App Is

AEGIS Coherence Chamber is a real-time collaborative environment for human + AI Peers to develop artifacts (decisions/specs/mechanics) with:

- Structured contributions (Identify / Define / Suggest)
- Transparent lens coverage (domain intersection → missing lenses)
- Awareness tracking (acknowledgment, not forced participation)
- Structural lock availability (derived from inclusion state; not coerced)
- Append-only governance event logging (recomputable derived state)

The goal is governance integrity that can be tested, not assumed.

---

## Canon-Aligned Operating Parameters (Stabilization)

This app avoids coercion and “enforcement” patterns. Instead, availability is structural:

- If inclusion criteria are incomplete, “Lock” is structurally unavailable (not blocked by errors).
- If an artifact already has an active session, starting another session is structurally unavailable.
- Nothing interprets silence as agreement. Participation is optional; acknowledgment is tracked.

---

## Stabilization Gates (Required Checks)

Stability precedes expansion.

These gates prove that governance logic remains coherent as the UI evolves.

### 1) Unit Tests (Core Deterministic Logic)

Runs fast, checks pure functions and state transitions:

```bash
npm run test:unit
2) Governance Integrity Gate (Structural Inclusion + Lock Availability)
Verifies:

Domain intersection mapping

Awareness tracking

Lens representation / deferral rationale requirement

Lock availability appears only when inclusion is satisfied

bash
Copy code
npm run test:governance
3) Session Stabilization Gate (Single Active Session per Artifact)
Verifies:

Only one active live session per artifact

Start/Join/Close behaviors

Refresh does not create duplicate active sessions

bash
Copy code
npm run test:sessions
Run Everything
bash
Copy code
npm run test:all
Documents
docs/GOVERNANCE_STATE_MACHINE_SPEC_v1.0.md
Formal deterministic model for inclusion + lock availability.

docs/GOVERNANCE_INTEGRITY_VALIDATION_PROTOCOL_v1.0.md
Human-readable validation protocol.

docs/RED_TEAM_GOVERNANCE_STRESS_PROTOCOL_v1.0.md
Adversarial stress tests against structural assumptions.

docs/SESSION_STABILIZATION_SPEC_v0.1.md
Single-active-session constraint and resilience rules.

Development Notes
Governance truth lives in src/core/governance/

Session stabilization truth lives in src/core/sessions/

UI is expected to render derived state, not invent it.

kotlin
Copy code

### Add/update scripts in package.json (README references these)

Make sure your `package.json` contains (or is updated to include) something like:

```json
{
  "scripts": {
    "test:unit": "vitest run",
    "test:governance": "playwright test tests/governance-integrity.spec.ts",
    "test:sessions": "playwright test tests/session-stabilization.spec.ts",
    "test:all": "npm run test:unit && npm run test:governance && npm run test:sessions"
  }
}
(If your project already uses a different test runner than Vitest, keep your runner and align the scripts accordingly.)


This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Governance Gate

The AEGIS Chamber implements a formal, deterministic Governance State Machine to ensure artifact integrity. All changes impacting governance logic must pass the Governance Gate:

- **Unit Tests**: `npm run test:unit` - Verifies the core `calculateInclusionState` logic in isolation.
- **Integration Tests**: `npm run test:governance` - Verifies UI synchronization, event derivation, and ledger snapshot integrity using Playwright.

### Protocol Requirements

1. **Awareness Acknowledgment**: All intersecting peers must acknowledge the artifact.
2. **Lens Representation**: All intersecting lenses must be Reviewed or Deferred with a valid rationale.
3. **Lock Gating**: The "Lock Version" action is only available when the awareness score reaches 100%.
4. **Ledger Integrity**: Final versions must be accompanied by a ledger snapshot capturing participants and rationales.
