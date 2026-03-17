# AEGIS-CoLAB_APP Glossary

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
