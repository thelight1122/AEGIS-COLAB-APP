<<<<<<< HEAD
# AEGIS Coherence Chamber: Standards & Constraints

This document defines the behavioral and system boundaries governing the development and execution of the **AEGIS Coherence Chamber**.

---

## 1. Non-Force Posture

The application operates strictly under a non-force primitive.

### Allowed Patterns

- **Structural Availability**: Options (e.g., "Lock Version") become visible or selectable based on the underlying governance state calculus (`computeInclusionState`).
- **Illumination**: Visualizing gaps in lens coverage or missing awareness acknowledgments.
- **Descriptive Status**: Displaying "Incomplete Coverage" rather than throwing "Validation Error".

### Forbidden Patterns

- **Blocking Modals**: Preventing user movement or editing due to incomplete governance fields.
- **Coercive Terminology**: Using verbs like "enforce", "require", "comply", or "must" in the UI or code logic.
- **Assumed Consent**: Treating inactive participation or silence as agreement.

---

## 2. Governance Integrity

Governance logic is **deterministic, neutral, and behavior-centered**.

- **Identity Agnostic**: The system computes state based on contribution type and coverage, not participant identity.
- **Derived State**: The UI is a view layer for computed state. State is never arbitrarily set or mutated by UI interaction without a supporting general governance ledger event.
- **Append-Only Logging**: All governance actions append to an auditable event ledger. There are **no in-place edits** to the governance history once committed.

---

## 3. Structural Availability vs. Locking

Coherence locking fits into a condition set, not a restriction set.

- **Lock Availability**: The visual status to lock an artifact frame only arises once the `canLock` routine evaluates to true based on threshold rules (e.g., lens acknowledgment threshold).
- **Reversibility**: Locks may be structurally reviewable or unlockable if subsequent events trigger a state recomputation that breaks the lock condition.

---

## 4. Transparency & Auditability

Nothing happens "behind the scenes" to mutate state.

- All state transitions must be traceable back to a specific governance event ledger entry (e.g., `AWARENESS_ACK`, `LENS_REVIEW`).
- Calculations like `computeInclusionState` must remain inspectable and fully testable in isolation (pure logic).
=======
# AEGIS-CoLAB_APP Standards & Constraints

## Purpose

This document defines the operating boundaries for AEGIS-CoLAB_APP so the app remains truthful to the AEGIS posture while it evolves.

## Core Standards

### 1. Non-Force Operation

- The app must not coerce participation.
- Governance state may change structurally, but participation remains voluntary.
- The system must not interpret silence as agreement.

### 2. Structural Availability Over Enforcement

- Actions such as session start or lock availability should emerge from current state.
- The UI may withhold unavailable actions without punitive language.
- The app should prefer neutral routing such as “Join Active Session” over force-framed denial.

### 3. Visible Governance

- Governance-relevant state must be derivable from declared inputs and recorded events.
- The UI must render derived governance state rather than inventing it ad hoc.
- Hidden moderation or undisclosed authority logic is out of bounds.

### 4. Auditability And Append-Only Posture

- Governance events within active collaboration flows should be treated as append-only.
- Derived state should be recomputable from artifact context, peer/lens configuration, and recorded events.
- Historical lineage should not be silently overwritten.

### 5. Truthful Implementation Claims

- Documentation must distinguish clearly between:
  - currently implemented
  - prototype/local-only
  - planned
- No document or UI copy may present planned capability as live fact.

### 6. Human/AI Peer Parity

- Humans and AIs are recognized as Peers under shared governance posture.
- The app may differentiate peer type for configuration or display, but not for dignity or standing.
- Peer labels should remain identity-agnostic and behavior-centered.

## Current Technical Constraints

### Local Persistence

- Session and governance-related prototype persistence currently relies in part on local browser storage.
- Local encrypted key storage is used for provider secrets via the key vault.
- These local patterns must be described honestly as local-device behavior, not as fully distributed immutable infrastructure.

### Single Active Session Constraint

- At most one active session per artifact is allowed in the current model.
- This is a structural stabilization parameter, not a punishment system.

### Environment-Gated Surfaces

- Some features, such as `/tools/*`, are gated by environment flags.
- Gated routes must not be documented as universally available if they depend on deployment configuration.

### Placeholder / Incomplete Areas

- Session replay is still presented as a placeholder.
- Any similar placeholder or future-facing control should be labeled clearly.

## Forbidden Patterns

- coercive compliance language
- hidden governance state
- fake append-only claims where mutable local state is still in use
- invented product capabilities not present in the codebase
- representing Human or AI peers as subordinate classes by default

## Documentation Rule

When in doubt, the app should under-claim rather than over-claim.
>>>>>>> 0fc14ea7a0c6788b476e6b0418fd0291483a2543
