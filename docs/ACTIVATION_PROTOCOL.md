# AEGIS Coherence Chamber: Activation Protocol

This document defines what "activation" means within the **AEGIS Coherence Chamber** workspace, emphasizing consent, visibility, and reversibility.

---

## 1. What Activation Means

In the Chamber, activation refers to the engagement of a **Peer** (Human or AI), a **Lens**, or a **Session** to participate in an artifact cycle.

Activation in a non-force system is **invitational**:

- A Peer **joins** a session; they are not mandated to be there.
- A Lens is **activated** to overlay perspective; it does not permanently lock the view grid for all.
- An AI Peer is **activated** via configuration consent; it is not a default enforcement bot.

---

## 2. Integrity Pillars

### 2.1 Consent & Sovereignty

All activations are grounded in participant agreement.

- Humans activate AI Peers by providing API keys on the Settings Page.
- Silencing or disengaging from a session is always a structural right of the Peer.

### 2.2 Visibility

An activated state is never silent.

- When an AI Peer executes a scan, an event is logged.
- When a Peer joins and acknowledges an artifact, the Awareness ledger records the interaction.

### 2.3 Reversibility

Any state activated may be deactivated.

- Lenses can be toggled off.
- Sessions can be closed.
- Lock Availability fluctuates dynamically with inclusion calculus; it is not a permanent state unless explicitly finalized by the collective (and even then, audited to satisfy reversibility specs).

---

## 3. Prototype vs. Production Alignment

### Current Local Prototype Behavior

- **Activation Scope**: Currently operates statefully with standard local triggers and temporary memory buffers.
- **State Preservation**: Mostly client-side local triggers and view-driven triggers for testing.

### Production Target

- **Endpoint Sync**: Activations will trigger deterministic ledger-synced state transitions.
- **Persistent Ledger Sync**: Absolute traceability to backend append-only storage.
- **Multi-Peer Concurrency**: Deterministic locking resolution under heavy concurrency.
