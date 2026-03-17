# AEGIS-CoLAB_APP Truth Note

## Purpose

This note distinguishes between what is currently live in the repository, what is prototype/local-only, and what remains planned or partial.

## Currently Live

- React/Vite application with real routed surfaces
- public landing, framework, and governance pages
- chamber workspace shell and chamber layout
- artifact matrix and session launch/join flows
- deterministic inclusion-state and lock-availability computation
- team setup / peer coalition management
- lens configuration surface
- session history/detail surface
- local encrypted provider-key vault with passphrase-based unlock
- authenticated board surface and shared-board governed operations hooks
- environment-gated tools route

## Prototype / Local-Only

- local browser persistence for several working states, including sessions and parts of peer/config state
- local-device encrypted vault behavior for provider secrets
- several collaboration flows that are operational in-browser but not yet described as fully distributed production governance infrastructure

## Partial / Incomplete

- session replay is still presented as a placeholder
- some advanced governance/distribution claims belong to the spec layer more than the fully realized runtime layer
- some routes and surfaces are more mature than others

## Planned / Not Yet Universal

- fully networked append-only persistence across every collaborative surface
- complete replay/history engine
- complete production-grade consent and activation infrastructure across all app flows
- broader hosting/distribution hardening for all collaboration surfaces

## Documentation Rule

If documentation and code disagree, the code defines current implementation truth and the docs must be corrected.
