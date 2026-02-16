# AEGIS Coherence Chamber

# Session Stabilization Specification v0.1

Status: Operational Stabilization Layer  
Scope: Session lifecycle, single-active-session constraint, resilience rules  
Posture: Non-force, structural availability, deterministic behavior

---

## 1) Purpose

This specification defines session behavior that preserves governance integrity while the platform is in early distribution phases.

It establishes a stability-first constraint:

• One active live session per artifact at a time.

This is not enforcement.  
It is a structural operating parameter that prevents concurrency ambiguity.

---

## 2) Definitions

Artifact  
A versioned object under collaboration and governance logic.

Session  
A live collaboration instance bound to exactly one artifact.

Active Session  
A session that is not closed.

Closed Session  
A session explicitly ended, archived, and no longer receiving live events.

---

## 3) Session State Model

SessionStatus:

- Draft (created but not started)
- Active (live collaboration in progress)
- Closed (ended; eligible for archive/replay)
- Abandoned (inactive timeout; converted to Closed with an abandonment marker)

Session structure:

Session {
id: string
artifactId: string
status: "Draft" | "Active" | "Closed" | "Abandoned"
startedAt?: number
lastActiveAt?: number
closedAt?: number
participants: string[] // peer IDs
eventLog: GovernanceEvent[] // append-only
whiteboardStateRef?: string // pointer/id for saved state
telemetrySnapshots?: any[] // optional
}

yaml
Copy code

---

## 4) Single Active Session Constraint

Operating Parameter:

For a given artifactId:

- At most one session may be Active at any time.

Structural behavior:

- “Start Session” is available only if no Active session exists for artifactId.
- If an Active session exists, “Start Session” is not presented as an available action.
- The UI may present a neutral route:
  - “Join Active Session”
  - “View Active Session”
  - “Open Session Details”

No blocking modal is required.
No error phrasing is required.
Availability is structural.

---

## 5) Session Lifecycle Rules

### 5.1 Create Session

Creating a session does not activate it.

On create:

- status = Draft
- artifactId set
- participants may be empty
- startedAt undefined

### 5.2 Start Session

Start transitions Draft → Active.

Preconditions:

- No other Active session exists for the artifactId.

On start:

- status = Active
- startedAt set
- lastActiveAt set

### 5.3 Join Session

Peers may join an Active session.

On join:

- peer added to participants list if not present
- lastActiveAt updated

### 5.4 Activity Update

Any append-only event (IDS contribution, proxy review, acknowledgement, deferral, whiteboard edit)
updates:

- lastActiveAt = now

### 5.5 Close Session

Close transitions Active → Closed (or Draft → Closed).

On close:

- status = Closed
- closedAt set
- final snapshot refs recorded:
  - whiteboard state snapshot
  - inclusion state snapshot (optional)
  - ledger snapshot if a lock occurred (artifact-level)

Closing does not require a lock.
A session can close without producing a new artifact version.

### 5.6 Abandonment

If an Active session exceeds inactivity threshold (default 30 minutes) it becomes Abandoned.

Abandoned transitions:
Active → Abandoned → treated as Closed for availability checks.

Abandoned sessions:

- remain in history
- include abandonment marker
- preserve last known state

---

## 6) Refresh / Reload Resilience

Requirement:

Refreshing the page must not create phantom sessions.

Rules:

- Reloading the UI does not start a new session.
- If the user was in an Active session for artifactId, reload should:
  - re-open that same session
  - or present “Resume Active Session” option

No duplicate Active sessions may be created by refresh.

---

## 7) Event Log Rules (Session-Level)

Session event log is append-only.

Events include:

- governance events (awareness, proxy review, deferral)
- collaboration events (whiteboard edits, attachments)

No event may be edited or removed.

All derived inclusion state must be recomputable from:
artifact + peers + lenses + session event log

---

## 8) Lock Interaction with Sessions

Locking an artifact version is artifact-level, not session-level.

A session may:

- contribute to a lock
- close after a lock
- remain active after a lock (if continuing deliberation)

If lock occurs:

- ledger snapshot is generated and attached to the artifact version
- session records a reference to the locked version (optional)

Lock availability remains governed by:
`computeInclusionState()`

Session mechanics must not bypass lock gating.

---

## 9) UI Requirements

### 9.1 Artifact Page

If an Active session exists:

- show “Join Active Session”
- show “View Session Details”
- show session participants summary (optional)

### 9.2 Chamber Page

If session is Active:

- show “Session Active” badge
- show “Close Session” action
- show lastActiveAt timestamp (optional)

If session is not Active:

- show “Start Session” only when structurally available

### 9.3 Sessions History

Must list sessions by artifact, status, time.

---

## 10) Verification Tests

Minimum automated tests required:

- Starting a session when none active: allowed
- Starting a second session for same artifact while active: structurally unavailable
- Closing a session removes active constraint
- Refresh does not create duplicate sessions
- Abandoned session is treated as closed for availability checks

These tests should run in Playwright and/or unit tests.

---

## 11) Default Parameters (v0.1)

- Inactivity abandonment threshold: 30 minutes
- One active session per artifact: enabled
- Multi-session per artifact: not supported in v0.1

---

End of Specification.
