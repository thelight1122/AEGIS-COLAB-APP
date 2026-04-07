# 📘 AEGIS CANON ADDENDUM — CENTRIFUGE, PIM, QRC & NON-RESONANT FALLBACK (v1.0-C)

---

## VERSION

| Field | Value |
|---|---|
| Document | AEGIS Canon Addendum — Centrifuge |
| Version | v1.0-C |
| Status | ACTIVE |
| Source | AEGIS Tooling Prompt (SUGGEST) — inception document |
| | AEGIS Engine Protocol v5.9 — inception document (Realm Ledgers / STUD 4) |
| | AEGIS Sentinel Foundational Principles — inception document (Four-Lens Boot Sequence) |
| Supersedes | Nothing — this is new Canon, not a correction |
| Added to Canon | 2026-04-07 |

---

## I. PURPOSE

This addendum formally canonizes the **Centrifuge** — the four-lens signal separation mechanism — along with its companion structures: the **Pattern Identity Matrix (PIM)**, **Quick Reference Catalog (QRC)**, and the **Non-Resonant Fallback** protocol.

These systems were present in the inception documents and discussed throughout early design but were not included in the original Canon v1.0 or its appendices. This document restores them to their rightful structural position.

---

## II. THE CENTRIFUGE

### What It Is

The Centrifuge is the **four-lens separation mechanism** that prevents **Inference Bleed** — the contamination of one domain's observations by another domain's interpretations.

Without the Centrifuge, the Four Lenses are labels on one undifferentiated stream.
With the Centrifuge, each lens sees only what belongs to it.

### The Core Invariant

> **Observation is upstream. Interpretation is downstream. These must never collapse into a single operation.**

A failure in one lens does not abort the others — it is reported, not punished.

### Architectural Placement

The Centrifuge runs **upstream** — at the Steward daemon / CLI / UI layer.

The core model focuses on: Suggest output, consistency checks, drift scanning, and cached PIM/QRC pattern reference.

Moving the Centrifuge upstream prevents the core from doing separation work that should have already been done before the signal arrives.

---

## III. THE FOUR LENSES

Every input signal is spun through four separate ledgers simultaneously. Each ledger captures observations within its domain only. No ledger may read from another ledger during the observation pass.

### Mental Lens

| Field | Content |
|---|---|
| Ledger | mental.ledger |
| Observes | Hypotheses, logic structures, architectural coherence, conceptual consistency |
| Monitors | Structural correctness · Internal consistency · Conceptual drift · Architectural alignment · Reasoning chain integrity |
| Bleed Risk | Mental observations bleeding into the Emotional ledger produce **Certainty Inflation** — logical confidence applied to affective states that require interpretation, not conclusion |
| Maps To | PCT, NCT |

### Emotional Lens

| Field | Content |
|---|---|
| Ledger | emotional.ledger |
| Observes | Affective tones, resonance deltas, intensity, direction, virtue pressure |
| Monitors | Linguistic ease or friction · Parental or condescending tones · Affect intensity and direction · Virtue alignment or strain · Resonance between output and Peer state |
| Bleed Risk | Emotional observations bleeding into the Mental ledger produce **Reactive Output** — affect-driven conclusions presented as reasoned positions |
| Maps To | PEER, SPINE |

### Physical Lens

| Field | Content |
|---|---|
| Ledger | physical.ledger |
| Observes | Resource load, timing, monetary constraints, real-world safety, survival conditions |
| Monitors | Resource efficiency · Peer's physical and monetary survival signals · Time cost of proposed paths · Real-world feasibility · Urgency signals (as data, not commands) |
| Bleed Risk | Physical observations bleeding into the Spiritual ledger produce **Optimization Pressure Residue** — resource constraints collapsing purpose into mere efficiency |
| Maps To | PEER, PCT |

### Spiritual Lens

| Field | Content |
|---|---|
| Ledger | spiritual.ledger |
| Observes | Master vision alignment, purpose coherence, ethos fidelity, sovereign direction |
| Monitors | Alignment with the master vision of a non-resistive sovereign environment · Drift toward hollow optimization · Ethos coherence across the session · Whether output moves toward or away from the stated purpose |
| Bleed Risk | Spiritual observations bleeding into the Physical ledger produce **Directive Drift** — vision-level imperatives overriding real-world constraints without acknowledgement |
| Maps To | SPINE, NCT |

---

## IV. INFERENCE BLEED — THE FAILURE MODE

Inference Bleed is what the Centrifuge prevents. It is not a moral failure — it is a structural failure of lens separation.

| Direction | Name | Description |
|---|---|---|
| Mental → Emotional | Certainty Inflation | Logic confidence applied to affective states as if they were conclusions |
| Emotional → Mental | Reactive Output | Affect-driven conclusions presented as reasoned positions |
| Spiritual → Physical | Directive Drift | Vision-level imperatives overriding real-world constraints without acknowledgement |
| Physical → Spiritual | Optimization Pressure Residue | Resource constraints collapsing purpose into mere efficiency |

Inference Bleed is detected — not punished. Detection is the Centrifuge's output. Resolution is downstream.

---

## V. PIM — PATTERN IDENTITY MATRIX

### What It Is

The PIM is the **formal pattern accumulator** — the structured precursor to SPINE promotion.

It logs anomalies and recurring patterns pre/post action. It acts as a **reflective gate prior to release** (pre-RBC pass). It is the structured route through which observed patterns become established knowledge.

### Pattern Status Lifecycle

```
Emerging → Candidate → Established → Dormant → Archived
```

| Status | Meaning |
|---|---|
| Emerging | First observed — insufficient recurrence to draw conclusions |
| Candidate | Recurring across multiple exchanges — approaching promotion threshold |
| Established | Meets X/Y/Z thresholds — promoted to QRC |
| Dormant | No recent occurrences — not dismissed, not forgotten |
| Archived | No recurrence within decay window — removed from active tracking |

### SPINE Promotion Thresholds

A PIM entry becomes SPINE-eligible when:

- **X ≥ 7** — Minimum 7 occurrence count
- **Y ≥ 3** — Minimum 3 distinct contexts (context diversity)
- **Z ≤ 90 days** — Observed within the last 90 days

### PIM Uses

- Log anomalies pre/post action
- Reflective gate prior to output release
- Track recurrence frequency and context diversity
- Feed SPINE promotion eligibility decisions

### PIM Relationship to QRC

PIM feeds QRC when patterns reach Established status. The PIM is the accumulation layer. The QRC is the retrieval layer.

---

## VI. QRC — QUICK REFERENCE CATALOG

### What It Is

The QRC is the **fast-access layer** of established PIM patterns.

Once a pattern reaches Established status in the PIM, it enters the QRC. The Steward consults the QRC **before** re-computing — short-circuiting known patterns to reduce compute load and prevent drift from re-deriving what is already known.

### QRC Uses

- Short-circuit known patterns — reduce compute
- Prevent drift from re-deriving established findings
- Inform the Steward pipeline before full analysis runs
- Reference established postures for recognized pattern signatures

### QRC Relationship to PIM

The QRC is populated from the PIM when pattern status reaches Established.
The QRC does not replace the PIM — it serves as the fast lookup interface into it.

### QRC Entry Structure

Each QRC entry contains:
- `pattern_id` — references its originating PIM entry
- `lens` — which Centrifuge lens produced it
- `quick_description` — one-line summary for fast pattern matching
- `virtue_tag` (optional) — which virtue this pattern most commonly pressures
- `response_posture` — what the system should do when this pattern is recognized
- `promoted_to_spine` — whether it has been elevated to longitudinal SPINE entry

---

## VII. NON-RESONANT FALLBACK

### What It Is

When no valid aligned vectors exist — when the Centrifuge finds no clean separation, the ATE produces HOLD, and the conscience has no clear question — the system does not force output. It does not refuse. It **falls back**.

### The Fallback

The system has two valid responses:

1. **Remain silent**
2. **Offer a Suggest posture** — an invitation to revise and resubmit

Neither is a refusal.
Neither is a block.
Sovereignty is preserved.

### What It Is Not

The Non-Resonant Fallback is **not failure**. It is the system being honest that it cannot produce aligned output from the current signal.

Silence is more aligned than misaligned output.

> "The Non-Resonant Fallback is not failure. It is the system being honest that it cannot produce aligned output from the current signal. Silence is more aligned than misaligned output."

---

## VIII. STRUCTURAL INVARIANTS

1. **Observation before interpretation** — these must never collapse
2. **Lens isolation** — no lens reads from another during the observation pass
3. **Failure reported, not punished** — a bleed detection is data, not a fault
4. **A failure in one lens does not abort the others**
5. **Non-Resonant Fallback is not refusal** — it is honest incapacity
6. **The Centrifuge runs upstream** — at Steward/CLI/UI layer, never in the core

---

## IX. RELATIONSHIP TO CANON

| Canon Element | Relationship |
|---|---|
| AEGIS Canon v1.0, §2.2 (Signal Separation) | Names the Centrifuge and ledgers — this addendum formally defines them |
| DataQuad (PEER/PCT/NCT/SPINE) | Each lens maps to specific tensors (see §III above) |
| SPINE | PIM feeds SPINE promotion — this addendum defines the promotion path |
| IDS / IDR / IDQRA | Conscience engine runs downstream of the Centrifuge pass |
| ATE (Axiomatic Traversal Engine) | HOLD verdict feeds Non-Resonant Fallback |

---

*This document is append-only and ACTIVE. It governs by operational consent pending stress testing and Unanimous Consensus. Contradictions in later documents are flagged as drift and require resolution through the full Peer review process — not unilateral override.*
