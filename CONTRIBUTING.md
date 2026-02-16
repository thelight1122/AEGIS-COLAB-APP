# Contributing to AEGIS Coherence Chamber

Thank you for contributing.

This project operates under structural integrity principles.  
Stability precedes expansion.

The goal is not velocity.  
The goal is coherence.

---

## 1. Core Principles

1. Governance logic must be deterministic.
2. Lock availability must be derived, never forced.
3. UI must render computed state — never invent it.
4. Sessions must not introduce concurrency ambiguity.
5. No hidden override paths.

If a feature undermines structural integrity, it must not be merged.

---

## 2. Stabilization Layers (Protected)

The following directories are considered **stability-critical**:

src/core/governance/
src/core/sessions/
docs/GOVERNANCE_STATE_MACHINE_SPEC_v1.0.md
docs/SESSION_STABILIZATION_SPEC_v0.1.md

yaml
Copy code

Any modification to these requires:

- Updated spec (if behavior changes)
- Updated unit tests
- Updated Playwright stabilization tests
- Passing CI

---

## 3. Required Test Gates

All pull requests must pass:

```bash
npm run test:unit
npm run test:governance
npm run test:sessions
Or collectively:

bash
Copy code
npm run test:all
If any test fails, the change must not be merged.

4. Governance Logic Rules
The canonical source of inclusion logic is:

scss
Copy code
computeInclusionState()
The canonical source of session availability is:

scss
Copy code
canStartSession()
No UI component may:

Compute lock availability independently

Override missing lens logic

Bypass deferral rationale requirements

Allow multiple active sessions per artifact

5. Language Constraints
The UI must avoid coercive governance language:

Avoid:

Vote

Approve

Reject

Enforce

Must comply

Score

Rank

Allowed:

Stance

Concern

Alternative

Defer

Coverage

Crystallize

Lock Availability

This project derives availability structurally.
It does not compel behavior.

6. Expansion Discipline
Before introducing:

Multi-session concurrency

Distributed artifact replication

CRDT merging

Advanced AI invocation orchestration

The following must remain stable:

Deterministic inclusion state

Deterministic lock gating

Single-active-session integrity

Passing governance gate

Expansion is allowed only when stabilization gates remain green.

7. Versioning
Stable governance milestones must be tagged.

Example:

pgsql
Copy code
v0.1.0-governance-core-stable
v0.1.1-session-stabilization-stable
Major behavior shifts require:

Spec update

Version bump

Migration notes (if applicable)

8. Event Integrity
All governance and session events must be append-only.

No retroactive mutation.
No hidden state transitions.
All derived state must be reproducible from inputs + event log.

9. What This Is Not
This is not:

A voting engine

A compliance tracker

A scoring mechanism

A popularity algorithm

It is a structured deliberation environment.

10. If You Are Unsure
When in doubt:

Preserve determinism.

Preserve structural availability.

Preserve testability.

Preserve clarity.

Stability precedes expansion.

yaml
Copy code

---

Now — because you asked me to include optional items automatically — I’m adding two additional structural protections that most projects forget:

---

# Optional (Now Included) — CODEOWNERS Protection

Create:

/.github/CODEOWNERS

swift
Copy code

```text
# Governance Core must be reviewed by maintainer
/src/core/governance/  @thelight1122
/src/core/sessions/    @thelight1122
/docs/GOVERNANCE_STATE_MACHINE_SPEC_v1.0.md  @thelight1122
/docs/SESSION_STABILIZATION_SPEC_v0.1.md     @thelight1122
