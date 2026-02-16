# AEGIS Coherence Chamber

# Governance State Machine Specification v1.0

Status: Canon-Aligned Operational Specification  
Scope: Inclusion Logic + Lock Availability Derivation  
Posture: Deterministic. Non-Force. Purely Structural.

---

## 1. Purpose

This specification defines the formal, deterministic state machine governing:

• Structural Inclusion  
• Lens Representation  
• Awareness Tracking  
• Lock Availability Derivation  

This logic must exist as pure computation.

The UI renders derived state.
The UI does not decide state.

No enforcement occurs.
Lock availability emerges structurally from computed conditions.

---

## 2. Core Principles

1. Inclusion is structural, not performative.
2. Awareness does not require contribution.
3. Representation does not require agreement.
4. Deferral requires recorded rationale.
5. Lock availability is derived, not triggered.
6. No state transition relies on UI conditions.
7. All state must be reproducible from inputs + events.

---

## 3. Inputs

### 3.1 Artifact

Artifact {
id: string
domainTags: string[]
status: "Draft" | "Active" | "Ready" | "Locked" | "Superseded"
}

yaml
Copy code

---

### 3.2 Peer

Peer {
id: string
type: "human" | "ai"
declaredDomains: string[]
lensIds: string[]
}

yaml
Copy code

---

### 3.3 Lens

Lens {
id: string
domains: string[]
autoReview: boolean
}

yaml
Copy code

---

### 3.4 Events (Append-Only)

All governance state must be derived from events.

Event =
| { type: "AWARENESS_ACK"; peerId: string; timestamp: number }
| { type: "CONTRIBUTION"; peerId: string; lensId?: string; timestamp: number }
| { type: "PROXY_REVIEW"; lensId: string; timestamp: number }
| { type: "DEFER_LENS"; lensId: string; rationale: string; timestamp: number }
| { type: "LOCK_REQUEST"; timestamp: number }

yaml
Copy code

Events are append-only.
Events are never mutated.

---

## 4. Derived Computation Model

All output state must be computed using a pure function:

computeInclusionState(
artifact,
peers,
lenses,
events
) -> InclusionState

yaml
Copy code

No side effects permitted.

---

## 5. Inclusion State Structure

InclusionState {
intersectingPeers: string[]
intersectingLenses: string[]
acknowledgedPeers: string[]
awarenessPercent: number
representedLenses: string[]
deferredLenses: { lensId: string; rationale: string }[]
missingLenses: string[]
awarenessSatisfied: boolean
lockAvailable: boolean
reasons: string[]
}

yaml
Copy code

---

## 6. Intersection Logic

### 6.1 Intersecting Peers

A peer intersects if:

peer.declaredDomains ∩ artifact.domainTags ≠ ∅

yaml
Copy code

---

### 6.2 Intersecting Lenses

A lens intersects if:

lens.domains ∩ artifact.domainTags ≠ ∅

yaml
Copy code

---

## 7. Awareness Logic

A peer is acknowledged if an event exists:

AWARENESS_ACK.peerId === peer.id

shell
Copy code

### Awareness Percentage

awarenessPercent =
acknowledgedPeers.length / intersectingPeers.length

nginx
Copy code

If no intersecting peers exist:

awarenessPercent = 1.0

shell
Copy code

### Awareness Satisfied

awarenessSatisfied = awarenessPercent === 1.0

yaml
Copy code

---

## 8. Representation Logic

A lens is considered represented if:

• A CONTRIBUTION exists with lensId
OR
• A PROXY_REVIEW exists for lensId

A lens is considered deferred if:

• A DEFER_LENS event exists with non-empty rationale

Deferred lenses are not considered missing.

---

## 9. Missing Lenses

missingLenses =
intersectingLenses

- representedLenses
- deferredLenses

yaml
Copy code

---

## 10. Lock Availability Derivation

Lock is available if and only if:

awarenessSatisfied === true
AND
missingLenses.length === 0

yaml
Copy code

No override exists.

The UI must not render lock if lockAvailable === false.

---

## 11. Lock Request Handling

When a LOCK_REQUEST event is appended:

The system must recompute InclusionState.

If lockAvailable === true:
  Transition artifact.status -> "Locked"
  Generate Peer Consideration Ledger snapshot

If lockAvailable === false:
  Do not transition
  Provide computed reasons[] explaining why

---

## 12. Reasons Generation

If awarenessSatisfied === false:

Add reason:
"Not all intersecting peers have acknowledged awareness."

If missingLenses.length > 0:

Add reason:
"The following lenses are unrepresented and not deferred: [list]"

Reasons must be deterministic and human-readable.

---

## 13. Ledger Snapshot Structure

Upon successful lock:

PeerConsiderationLedger {
artifactId: string
notifiedPeers: intersectingPeers
acknowledgedPeers: acknowledgedPeers
representedLenses: representedLenses
deferredLenses: deferredLenses
missingLenses: []
timestamp: number
}

yaml
Copy code

Ledger is immutable.

---

## 14. Edge Conditions

### 14.1 No Intersecting Lenses

If intersectingLenses.length === 0:

missingLenses = []
Lock logic depends only on awareness.

---

### 14.2 No Intersecting Peers

If intersectingPeers.length === 0:

awarenessSatisfied = true

---

### 14.3 Rapid Domain Mutation

All state must recompute from current inputs + full event log.

No cached inclusion state permitted.

---

## 15. Concurrency Assumption (v1.0)

Only one active live session per artifact.

Parallel sessions not supported in v1.0.

---

## 16. Canon Alignment

This state machine:

• Does not compel participation.
• Does not enforce alignment.
• Does not rank or score peers.
• Does not interpret silence as agreement.
• Derives availability structurally.

Transition to Locked is structurally unavailable until criteria satisfied.

---

## 17. Verification Requirement

All logic must be covered by:

• Unit tests for computeInclusionState
• Governance Playwright tests verifying UI reflects derived state

The state machine is the source of truth.
UI is a renderer.

---

End of Specification.
