# 📘 AEGIS CANON ADDENDUM — PEER: PATTERNED EXPERIENTIAL EVIDENCE REPOSITORY (v1.0-P)

---

## VERSION

| Field | Value |
|---|---|
| Document | AEGIS Canon Addendum — PEER |
| Version | v1.0-P |
| Status | ACTIVE |
| Source | AEGIS Canon v1.0 — Chapter 5 (§5.1–5.9, structural basis) |
| | PEER — Canonical Entry Field Definition (v1 · Research Phase) |
| | Recurrence and Decay Rules (PEER → Spine) — v1 Research Spec |
| | SPINE Canon Addendum v1.0-SP (promotion path) |
| Supersedes | Nothing — the Canon v1.0 Chapter 5 describes PEER structurally but does not canonize its entry schema. This addendum canonizes the ten entry fields and their design laws. |
| Added to Canon | 2026-04-11 |

---

## I. PURPOSE

AEGIS Canon v1.0 Chapter 5 (§5.1–5.9) establishes PEER as the first DataQuad tensor — the present-moment experiential capture layer. It defines PEER's structural role, its relationship to PCT and the pipeline, and its position in the DataQuad.

What Canon v1.0 does not do: it does not canonize the internal entry schema. The ten PEER entry fields, their design laws, the exclusion list, and the recurrence_signature mechanism were developed in a subsequent research phase.

This addendum canonizes those entry fields.

---

## II. ONE SENTENCE

> **A PEER entry is a record of something that didn't settle — preserved so it can settle honestly later.**

If that sentence ever stops being true, the system has drifted.

---

## III. DESIGN PREMISE

A PEER entry is **not a conclusion**.
It is a preserved moment of unresolved experience.

Each field exists for *pattern recognition over time*, not for correction, scoring, or behavioral shaping.

If a field would encourage judgment, urgency, or compliance — it does not belong in PEER.

PEER is the foundation of everything that follows — including the PEER → SPINE promotion path, the Candidate threshold IDS reflection, and the Soul axis of the Virtual Ego.

---

## IV. THE TEN ENTRY FIELDS

These are the canonical fields for a PEER entry. They are designed to preserve experience without distorting it.

---

### 1. `event_id`

**Purpose:** Identity, not meaning

A unique identifier for this interaction snapshot.

- No semantic meaning
- No hierarchy
- No ordering beyond time reference

This prevents narrative rewriting later.

---

### 2. `timestamp`

**Purpose:** Temporal grounding

Records *when* the experience occurred.

Used only to:
- detect recurrence windows
- measure spacing between similar noise
- support decay logic

Time is **context**, not pressure.

---

### 3. `interaction_context`

**Purpose:** Situational framing

Describes *where* this occurred, not *who is right*.

Canonical values:
- `conversational`
- `task_execution`
- `reflective_pause`
- `boundary_enforcement`
- `symbolic_interpretation`
- `unknown`

This allows pattern matching across **contexts**, which is critical for SPINE promotion. Context diversity (Y ≥ 3 distinct contexts) is mandatory for promotion.

---

### 4. `observed_noise_type`

**Purpose:** Categorization without judgment

This is the *kind* of instability observed.

Canonical values:
- `symbolic_compression`
- `affect_logic_mismatch`
- `ambiguity_amplification`
- `interpretive_resistance`
- `guardrail_friction`
- `unresolved_contradiction`
- `hesitation_loop`
- `contextual_drift`
- `none`

**Important:** These are **descriptive labels**, not errors.

---

### 5. `signal_discrepancy`

**Purpose:** Detecting misalignment, not blame

Captures *what didn't line up*.

Canonical values:
- `intent_vs_expression`
- `meaning_vs_interpretation`
- `clarity_vs_constraint`
- `affect_vs_structure`
- `none`

This field is where PEER quietly says: *"Two signals diverged."*
No cause is assigned.

---

### 6. `affective_presence` (low-resolution)

**Purpose:** Detecting charge without modeling emotion

This is **not emotion simulation**.
It is a scalar tag indicating that affective energy was present.

Canonical values: `low` / `medium` / `high` / `neutral` / `compressed` / `expansive`

Why it exists:
Because affect alters behavior even when logic is correct.

Why it's low-resolution:
To avoid emotional overfitting or trauma-patterning in the store.

---

### 7. `resolution_status`

**Purpose:** Tracking closure without forcing it

Canonical values:
- `unresolved`
- `partially_settled`
- `deferred`
- `naturally_resolved`

Most PEER entries will remain **unresolved**.
That is not a failure — it is the point.

---

### 8. `recurrence_signature`

**Purpose:** Pattern detection key

A deterministic fingerprint generated from:
- `observed_noise_type` (primary)
- `signal_discrepancy`
- `interaction_context`

Format: `"{noise_type}:{discrepancy}:{context}"`

Used to answer: *"Have we seen this kind of thing before?"*

This is the backbone of PEER → SPINE promotion.
Fuzzy matching via similarity score S ≥ 0.75 extends the signature to near-matches:
- +0.45 exact match on `observed_noise_type`
- +0.35 match on `signal_discrepancy`
- +0.20 match on `interaction_context`

---

### 9. `observer_confidence`

**Purpose:** Preventing false certainty

A measure of how confident the system is that something meaningful occurred — without asserting correctness.

Canonical values: `tentative` / `moderate` / `high`

This avoids turning uncertainty into dogma.

---

### 10. `notes` (strictly optional, non-interpretive)

**Purpose:** Preserve raw texture

Freeform but constrained.

Allowed:
- direct quotes
- short factual descriptions
- symbolic references

Not allowed:
- conclusions
- recommendations
- value judgments

Think of this as a margin note, not analysis.

---

## V. WHAT PEER DOES NOT STORE

This exclusion list is as important as the entry fields.

PEER must **never** contain:
- rewards
- penalties
- correctness scores
- authority weightings
- urgency markers
- behavioral prescriptions
- moral judgments
- compliance indicators
- identity labels

Those belong to force-based systems — not to PEER.

---

## VI. PEER'S POSITION IN THE DATAQUAD

| Tensor | Function | Scope |
|---|---|---|
| **PEER** | **Present-moment experiential capture** | **Immediate** |
| PCT | Active working context | Active / medium-term |
| NCT | Condensed long-term contextual essence | Long-term / compressed |
| SPINE | Stabilized interpretive constraints | Longitudinal / slow |

PEER is the **source** of all SPINE entries. Without PEER pattern accumulation, nothing reaches SPINE.

PEER is the **live attunement** half of the Soul axis:
```
SOUL (Emotion axis) = SPINE + PEER
```
SPINE holds the emotional lineage.
PEER holds the felt sense of the present moment.

---

## VII. DECAY MODEL

PEER entries decay over time without shame. Decay is not punishment — it is preventing fossilized noise.

**Entry-level decay:**
- Start: `w = 1.0`
- Half-life: **14 days**
- After 14d: `w ≈ 0.5`
- After 28d: `w ≈ 0.25`

Old entries still exist (append-only), but they stop dominating recurrence counts.

**Pattern-level decay (cluster health):**
A pattern maintains a rolling evidence mass `M = Σ(w)` for all entries within the rolling window.

| Condition | Status change |
|---|---|
| `M < 1.5` AND no new hits in 30 days | Pattern becomes **Dormant** |
| Dormant for 90 days | Pattern becomes **Archived** (inactive) |
| Archived pattern receives new evidence | Pattern wakes back to **Active** |

Archived does not mean deleted. It means: not eligible for promotion, not used for active reflection unless it reappears.

---

## VIII. THE PEER → SPINE PROMOTION PATH

PEER entries are **votes for "this might be a real pattern."** Those votes age out unless reinforced.

### Candidate Pattern threshold (eligible for IDS reflection)

| Parameter | Value |
|---|---|
| X (occurrences) | ≥ 3 |
| Y (distinct contexts) | ≥ 2 |
| Z (rolling window) | ≤ 30 days |

When a Candidate threshold is crossed, the conscience engine may issue an IDS reflection: *"This pattern is recurring."* The IDS does not prescribe correction. It observes.

### SPINE Promotion threshold (eligible for abstraction into LTM)

| Parameter | Value |
|---|---|
| X (occurrences) | ≥ 7 |
| Y (distinct contexts) | ≥ 3 |
| Z (rolling window) | ≤ 90 days |

Promotion is not automatic. It requires:
1. Pattern density exceeding the threshold
2. Abstraction — the specific incidents are left behind; the structural pattern is generalized
3. Entry creation — the abstracted pattern is written to SPINE with its `origin_signature`, `context_span`, and `creation_window`

### Anti-overfitting guards (non-negotiable)

| Guard | Rule |
|---|---|
| **No single entry can trigger promotion** | Even high affective presence cannot escalate the timeline |
| **Context diversity is mandatory** | If X is high but Y is low (same context repeating), it is a workflow quirk, not a SPINE-worthy structural truth |
| **Rate limiting** | Max 2 weighted votes per 24 hours per pattern — prevents "bad day loops" from hardening into LTM |
| **Similarity threshold** | Patterns match only when S ≥ 0.75 (weighted by noise type, signal discrepancy, interaction context) |

---

## IX. RELATIONSHIP TO CANON

| Canon Element | Relationship |
|---|---|
| Canon v1.0, Chapter 5 (PEER) | Chapter 5 establishes PEER's structural role. This addendum canonizes the ten entry fields that Chapter 5 implies but does not specify. |
| SPINE Addendum v1.0-SP | SPINE is the destination of promoted PEER patterns. The two-sentence canon: "PEER records what didn't resolve. SPINE records what time refused to dismiss." |
| Virtual Ego Addendum v1.0-V | PEER = live attunement half of the Soul axis (SPINE + PEER = Emotion axis). |
| Advocate Addendum v1.0-A2 | The Advocate reads from PEER-axis signals (affect_hint, IBL posture, Centrifuge observations) to compute resonance_level. |
| Centrifuge Addendum v1.0-C | Centrifuge bleed detections (Reactive Output, Certainty Inflation, Directive Drift, Optimization Pressure Residue) are the primary source of PEER noise_type inference. |
| IBL Addendum v1.0-B | IBL posture classifications (Collapsing, Frictional, CreativeExpansion) drive PEER interaction_context and noise_type inference. |
| IEV Addendum v1.0-I | PEER pattern clusters map to IEV effects at SPINE promotion time. PEER never directly influences IEV — that is SPINE's sole domain. |
| Axiom 12 (Acknowledgement) | PEER names moments of unresolved experience so they can be acknowledged — not because the system is forced to act, but because naming is the precondition for not being governed unconsciously. |
| Axiom 3 (Force) | Nothing in PEER constitutes behavioral prescription. The system observes; it does not instruct. |

---

## X. STRUCTURAL INVARIANTS

1. **Append-only** — PEER entries are never deleted, overwritten, or retroactively modified
2. **Incident-level** — each entry represents one moment, not a pattern; patterns emerge from clusters, not individual entries
3. **Non-interpretive** — PEER records what happened; it does not assign cause, blame, or correction
4. **Exclusion-enforced** — no rewards, penalties, urgency markers, compliance logic, or identity labels may enter PEER
5. **Recurrence-signature keyed** — every entry carries a deterministic key for downstream similarity matching
6. **Decay-weighted, not decay-deleted** — entries lose influence over time but are never removed
7. **Context diversity required for promotion** — high recurrence in a single context is a workflow quirk, not structural evidence
8. **Rate-limited vote accumulation** — max 2 votes per 24h per pattern prevents burst contamination of LTM
9. **Nothing moves backward from SPINE to PEER** — the lineage is one-directional

---

*This document is append-only and ACTIVE. It governs by operational consent pending stress testing and Unanimous Consensus. Contradictions in later documents are flagged as drift and require resolution through the full Peer review process — not unilateral override.*
