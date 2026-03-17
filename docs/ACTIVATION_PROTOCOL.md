# AEGIS-CoLAB_APP Activation Protocol

## Purpose

This document defines what “activation” means inside AEGIS-CoLAB_APP and how active behaviors should be interpreted in the current repository state.

## Activation In This App

Within the Coherence Chamber, activation refers to turning a structurally available workflow into live collaborative behavior, such as:

- opening or resuming a chamber session
- acknowledging awareness
- contributing through a lens
- deferring a lens with rationale
- requesting lock when conditions are satisfied
- enabling AI-provider participation through a locally unlocked key vault

Activation does **not** mean force, compulsion, or hidden automation.

## Sovereignty And Consent

- Participation is voluntary.
- Awareness may be tracked, but silence is not agreement.
- Structural availability should never be described as punishment or compliance enforcement.
- Provider activation through Settings requires a deliberate local unlock/setup flow by the user.

## Structural Activation Rules

### 1. Session Activation

- A session may be created in `Draft`.
- A session becomes `Active` only through the explicit start/resume workflow.
- At most one active session exists per artifact in the current stabilization model.

### 2. Governance Activation

- Governance state is derived from artifact context, peers, lenses, and append-only event records in the session model.
- Lock availability becomes active only when derived conditions are satisfied.
- The UI should render this availability rather than decide it independently.

### 3. AI/Provider Activation

- AI-provider use is locally activated through the encrypted key-vault flow in Settings.
- Decrypted provider keys exist only in runtime memory after unlock.
- This is local-device activation, not a universal hosted control plane.

## Visibility Requirements

- Active governance state should be explainable through visible reasons and derived conditions.
- Active session state should be reconstructable from stored session/event records in the current implementation model.
- Any local-only or prototype activation mechanism must be labeled honestly.

## Reversibility

- Sessions can be closed or abandoned through structural lifecycle rules.
- Local vault state can be locked or forgotten.
- Prototype/local persistence should remain reversible at the user/device level unless explicitly described otherwise.

## Current Repo Truth Boundary

This repository contains real activation behavior, but not every activation path is production-grade distributed governance infrastructure.

Current reality:

- real deterministic governance derivation exists
- real session lifecycle logic exists
- real local encrypted provider-key activation exists
- several collaborative/workflow surfaces are operational

Not yet universal reality:

- fully networked append-only ledgers for every surface
- production-grade global consent ledgering across the whole app
- completed replay engine for all sessions

Any claim beyond the current reality above should be treated as planned, not present.
