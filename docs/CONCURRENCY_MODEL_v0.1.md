# AEGIS Chamber Concurrency Model v0.1

## Objective

Prevent inconsistent governance states (phantom locks, duplicated ledger entries) when multiple actors interact with the same artifact.

## Core Rules

### 1. Single Active Session (Option A)

- **Rule**: Each artifact (unique `artifactId`) can have exactly ONE active "Live Session" at any given time.
- **Enforcement**:
  - When a user opens an artifact, the system checks for an existing active session.
  - If found, the user joins the existing session.
  - If not found, a new session is initialized.
- **Benefit**: Eliminates fork-join complexity and ensures a single source of truth for the local environment.

### 2. Append-Only Event Stream

- **Rule**: All governance actions must be recorded as immutable events in a sequence.
- **Rules of Append**:
  - Events cannot be deleted or modified once committed.
  - Each event must have a monotonic timestamp and a session CID (Context ID).
- **Merge Policy**: Since only one session is active, "merging" is trivial (simply appending to the singular stream).

### 3. Critical State Guard

- **Phantom Lock Prevention**: `lockAvailable` is always re-calculated from the full event stream before rendering the Lock action.
- **No Duplication**: The ledger snapshot is generated once upon the first successful `LOCK` event in the stream. Subsequent attempts to lock a locked artifact are rejected.

## Implementation Strategy

- **Persistence**: Use a shared event log (simulated via `localStorage` for MVP).
- **Rehydration**: On page refresh, the inclusion state is reconstructed by replaying the event stream from the active session.
