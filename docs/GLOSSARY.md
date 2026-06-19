<<<<<<< HEAD
# AEGIS Coherence Chamber: Glossary

This glossary standardizes the vocabulary used within the **AEGIS Coherence Chamber** and aligns with the broader **AEGIS Canon** and **EcoVerse Core** definitions.

---

| Term | Definition |
| :--- | :--- |
| **Artifact** | A structured contribution, decision framework, or specification created collaboratively (e.g., node map, whiteboard state). |
| **Awareness** | The measure of acknowledgement by Peers intersecting with an Artifact. It represents "Review Status", not consensus. Silence is tracked, not assumed as agreement. |
| **Chamber** | The visual workspace environment where collective Human-AI synthesis takes place. |
| **Drift Sentinel** | An AI Peer type that tracks divergence from core session objectives and highlights areas of drift without enforcing course correction. |
| **Canon Guardian** | An AI Peer type that preserves alignment with grounded truth repositories (e.g., project canons) by illuminating discrepancies. |
| **Governance Event** | An atomic, append-only ledger entry (e.g., `AWARENESS_ACK`, `SESSION_CLEARED`) representing a state transition trigger. |
| **Inclusion State** | The computed score/readiness level of an Artifact based on Lens coverage and Awareness targets (`computeInclusionState`). |
| **Lens** | A perspective filter applied to the Chamber canvas to visualize specific attributes, concerns, or domains intersecting with the Artifact. |
| **Lock Availability** | The structural display logic making a "Lock Version" action selectable. Derived strictly from condition math (`canLock`), not access control. |
| **Peer** | Any direct participant in the Chamber workspace, regardless of origin. Peers can be **Human** or **AI** and carry equivalent sovereignty. |
| **Session** | An active cycle of workspace collaboration bound to a single Artifact framing at any given time. |
=======
# AEGIS-CoLAB_APP Glossary

This glossary remains the app-specific quick reference.

For the expanded terminology model that correlates these terms to broader AEGIS meaning, see [AEGIS_LEXICON.md](./AEGIS_LEXICON.md).

## Chamber

The primary collaborative workspace where Peers interact around a live artifact/session context.

## Peer

A participant in the Coherence Chamber. In AEGIS posture, Humans and AIs are recognized as Peers.

## Team Setup

The coalition-management surface exposed at `/peers`, where a user assembles and configures Human and AI participants for collaborative work.

## Artifact

A versioned object under collaborative and governance consideration.

## Session

A live or historical collaboration instance bound to exactly one artifact.

## Active Session

A session currently in live collaboration state. In the current model, only one active session per artifact is permitted.

## Awareness

Acknowledgment that an intersecting Peer has seen the artifact context. Awareness does not require contribution and silence is not agreement.

## Lens

A perspective, domain, or review frame that can participate in artifact consideration and governance derivation.

## Representation

The condition in which an intersecting lens has been covered either by contribution or proxy review.

## Deferral

A recorded choice to defer a lens with rationale, so it is not treated as silently ignored.

## Inclusion State

The deterministic derived state computed from artifact inputs, peers, lenses, and governance events.

## Lock Availability

A structurally derived condition indicating whether lock may be requested. It is availability, not force.

## Governance Event

An append-oriented event such as awareness acknowledgment, contribution, proxy review, deferral, or lock request that participates in derived state.

## Telemetry

The visible signal layer that summarizes collaboration/governance condition such as inclusion score, drift, convergence, and lens status.

## Key Vault

The local encrypted storage mechanism for provider secrets. In the current app, it uses local-device encrypted storage plus runtime-memory unlock behavior.

## Commons

The shared collaboration environment or entry context through which users enter the governed workspace.

## Truth Boundary

The line between what is currently implemented, what is prototype/local-only, and what is planned.
>>>>>>> 0fc14ea7a0c6788b476e6b0418fd0291483a2543
