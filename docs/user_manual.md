# AEGIS Coherence Chamber User Manual

Welcome to the **AEGIS Coherence Chamber**, a governed collaboration environment for Human and AI Peers working on shared artifacts.

<<<<<<< HEAD
---

## 1. Workspaces

### The Chamber Dashboard

The **Chamber** is your primary theater of operations. It is a visual canvas where collective intelligence is mapped.

- **Nodes**: Create nodes to map concepts (Proposals, Tensions, Evidence).
- **Links**: Connect nodes to establish relationships and logic flow.
- **IDS Stream (Intelligence Definition System)**: A real-time card feed representing snapshots of intelligence that can be attached to workspace nodes for context.
- **Telemetry Panel**: Monitor the health of your collaborative session via **Drift** and **Inclusion** metrics.
=======
This manual reflects the current repository state and avoids claiming features that are not yet fully implemented.

## 1. Getting Oriented

The app includes both public and workspace surfaces.

### Public Surfaces

- **Landing** — the public entry and orientation page
- **Framework** — public framing for the collaboration model
- **Governance** — public explanation of the AEGIS governance architecture used by this app

### Workspace Surfaces

- **Chamber** — live collaboration workspace
- **Artifacts** — artifact/session launch and review surface
- **Sessions** — session history and detail
- **Peers** — team setup and coalition management
- **Lenses** — lens configuration
- **Settings** — encrypted local provider-key management
- **Board** — authenticated shared board

## 2. The Chamber Workspace

The Chamber is the main live collaboration surface.
>>>>>>> 0fc14ea7a0c6788b476e6b0418fd0291483a2543

Key elements currently present:

<<<<<<< HEAD
## 2. Navigation & Views

Access these areas via the sidebar or workspace navigation:

### Workspace Streams

- **LandingPage**: Workspace entry and general posture greeting.
- **Peers**: View and configure Human and AI Peers (e.g., active triggers).
- **Lenses**: Manage perspective filters applied to the workspace views.
- **Sessions**: Review active cycle history and synchronization benchmarks.
- **Artifacts**: Access the locked "Golden Version" archives of previous boards.

### System Control

- **FrameworkPage**: Overview of the governing rulesets and triggers.
- **GovernancePage**: Direct inspection of the append-only event ledger stream.
- **TeamSetup**: Interface for initializing peer participation matrices.
- **Settings**: Centralized configuration for AI Peer keys.

---

## 3. Peer Integration & AI

Collaboration in the Chamber recognizes **Human** and **AI** Peers equally.

### Managing Peers

- Access the **Peers** page to manage participants.
- **AI Peers**: Specialized agents (e.g., Drift Sentinel, Canon Guardian) that provide automated insights.

### Empowering AI

1. Go to the **Settings** page.
2. Enter your API keys (e.g., OpenAI, Gemini, local).
3. Once active, status indicators update inside workspace grids.
=======
- **Whiteboard area** for artifact-focused collaboration
- **Telemetry panel** showing collaboration/governance signals
- **Peer presence / coalition context**
- **Governance-derived session state**

The Chamber is designed to render derived state rather than invent governance state on its own.

## 3. Artifacts And Sessions

Artifacts and sessions are closely connected in the current app.

### Artifacts

The **Artifacts** page groups work by `artifactId` and shows:

- latest activity
- active-vs-inactive session state
- participant counts
- event counts

From there you can:

- start a new session when structurally available
- join an existing active session
- review session trajectories

### Sessions

The **Sessions** page provides historical and current session review.
>>>>>>> 0fc14ea7a0c6788b476e6b0418fd0291483a2543

Current session detail includes:

- inclusion-style summary metrics
- participant counts
- event counts
- session dates and status

<<<<<<< HEAD
- **Session Cycles**: Every cycle in the Chamber corresponds to a frame.
- **Lock Availability**: Once threshold inclusion conditions are met structurally, the version can be archived for permanent sync.
=======
Important truth note:

- **Replay is still a placeholder** in the current implementation and should not be interpreted as a finished playback engine.
>>>>>>> 0fc14ea7a0c6788b476e6b0418fd0291483a2543

## 4. Peers And Team Setup

<<<<<<< HEAD
## 5. System Integrity

- All API keys are preserved strictly inside your local client environment. They are never transmitted outwards for decision extraction.
- Supports local setups for offline Peer interaction with **LM Studio**.

> [!TIP]
> Use local nodes to test prompts before submitting to the wider ledger sync to conserve resources.
=======
The `/peers` route currently functions as a **Team Setup** surface rather than only a simple registry viewer.

Current capabilities include:

- adding Human and AI team members
- editing and deleting AI peers
- selecting active team participants
- saving team presets
- loading saved team presets
- clearing the active team

Human participation is treated as foundational in the current team model, while AI peers are included through explicit selection.

## 5. Lenses

The **Lenses** page allows you to configure perspective layers used in collaboration and governance interpretation.

Current capabilities include:

- adding a lens
- editing a lens
- deleting a lens
- changing priority order
- toggling active/inactive state
- reviewing charter text and domain coverage

Lenses are part of the app’s governance/context model, not decorative filters.

## 6. Settings And AI Provider Configuration

The **Settings** page manages provider integrations and the local encrypted key vault.

Current behavior:

- provider secrets are encrypted locally with a passphrase
- the vault can be unlocked, locked, and forgotten
- decrypted keys exist only in runtime memory after unlock
- the app supports provider entries such as Gemini, OpenAI, Anthropic, Grok/xAI, LM Studio, and related local/generic endpoints

Important truth note:

- This is **not** a hosted secrets-management system.
- It is a **local-device encrypted vault** in the current implementation.

## 7. Governance Posture

The Chamber uses a non-force governance posture.

That means:

- awareness may be tracked without forcing contribution
- silence is not treated as agreement
- lock availability is structurally derived
- UI state should reflect governance computation rather than replace it

## 8. Current Limitations

As of the current repo state:

- some persistence is still local/browser-based
- replay is not yet complete
- some advanced governance/distribution features are specified more fully in docs than in fully productionized runtime behavior
- some routes are gated by environment flags or authentication state

## 9. Practical Usage Advice

- Use **Artifacts** to find or launch the right collaboration trajectory.
- Use **Peers** to assemble the right coalition before deep work.
- Use **Lenses** to make perspective coverage explicit.
- Use **Settings** to unlock provider-backed AI participation locally.
- Treat session replay and similar future-facing surfaces as evolving, not final.
>>>>>>> 0fc14ea7a0c6788b476e6b0418fd0291483a2543
