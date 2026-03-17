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
