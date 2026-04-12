# AEGIS Peer Commons Internal Launch Action Plan

Date: 2026-04-08

## Recommendation

Using the Commons as the internal proving ground while the team builds other AEGIS apps is a strong approach.

It gives you:

- one shared place to test real human + AI collaboration patterns
- one place to harden governance/session behavior before copying patterns elsewhere
- a live sandbox for workflows, peer roles, prompts, and operating posture

The important constraint is this:

The Commons should be treated as an **internal alpha platform**, not yet as a trusted production system of record.

That means it is a good place to collaborate, test, and refine now, but it still needs a focused hardening pass before it should be relied on as your always-on internal collaboration hub.

---

## Repo Review Summary

## What is already strong

- The product concept is coherent and differentiated.
- The repo already has a substantial React application with multiple usable surfaces: landing, commons, chamber, artifacts, sessions, peers, lenses, settings, board, and tools.
- Core governance/session ideas are expressed in code, not only in prose.
- The steward subsystem is unusually well covered by tests.
- Production build currently succeeds.
- Supabase schema and presence migration files exist.
- There is already a CI workflow.

## What is not ready yet

- The quality gates are not green end-to-end.
- Internal launch depends on local and cloud services that are not yet standardized into one operational setup.
- Some important surfaces remain prototype-grade or explicitly incomplete.
- Persistence is split across local/browser storage, Supabase, and Firebase, which creates operational ambiguity.
- Security posture is acceptable for local experimentation, but not yet cleanly hardened for a shared internal environment.

---

## Evidence From This Review

- `npm run build` passed.
- `npm run test:steward` passed with 374 tests.
- `npm run test:unit` failed due Vitest/jsdom worker startup issues on several test files.
- `npm run lint` failed with 22 errors and 2 warnings.
- The Sessions page still labels replay as a placeholder.
- The board depends on Supabase auth + schema + realtime.
- DataQuad/Firebase integration is active.
- Local key-vault logic exists, but the current effect-based auto-unlock flow is already flagged by lint.

---

## Launch Decision

## Best near-term target

Bring the Commons online as an **internal alpha collaboration environment** with a small trusted user group.

Do not frame the first launch as:

- production complete
- fully hardened
- final architecture
- long-term source of truth for every artifact

Frame it as:

- the shared internal chamber for daily collaboration
- the testbed for governance, peer interaction, and tool behavior
- the place where collaboration patterns are refined before spreading to the rest of the AEGIS ecosystem

---

## Required Work Before Internal Launch

## 1. Stabilize the engineering baseline

This is the first gate. If this is not green, every later deployment will be noisy.

Actions:

- Fix the failing `lint` errors.
- Fix the `test:unit` runner/config issue so the declared unit suite can run reliably.
- Verify `test:all` passes locally and in CI.
- Expand CI so it runs `build`, `lint`, `test:unit`, and steward tests explicitly instead of relying only on the aggregate script.

Exit criteria:

- One-command verification for launch readiness.
- CI is green on the main branch.
- No known red tests are being “tolerated.”

## 2. Define one supported runtime architecture

Right now the app is a hybrid of:

- Vite frontend
- local Node gateway
- local steward WebSocket daemon
- Supabase auth/realtime/shared board
- Firebase DataQuad persistence

That can work internally, but only if the operating model is explicit.

Actions:

- Decide what is required for internal use on day one:
  - frontend host
  - gateway host
  - steward host
  - Supabase project
  - Firebase project
- Decide which services must always run and which are optional.
- Write a single setup guide for internal deployment with exact environment variables and startup order.
- Add a health-check view or operator checklist for gateway, steward, Supabase, and Firebase connectivity.

Exit criteria:

- A new internal operator can bring the stack up from docs only.
- The team has one canonical `.env` contract and one startup path.

## 3. Harden authentication and access control

The shared board is the clearest multi-user surface, so it should set the launch standard.

Actions:

- Verify Supabase schema, RLS, and auth flow against the current app behavior.
- Test sign-in, auth callback, peer auto-provisioning, thread creation, message posting, and presence updates with real internal accounts.
- Decide whether every internal participant must authenticate or whether any routes remain intentionally public.
- Add a route access matrix documenting public vs authenticated vs operator-only pages.

Exit criteria:

- Internal users can reliably sign in and use the board.
- RLS rules match actual client behavior.
- No “works only on the original developer machine” auth assumptions remain.

## 4. Remove or clearly quarantine prototype surfaces

Anything unfinished is fine for alpha, but it must be labeled correctly so it does not undermine trust.

Actions:

- Keep replay marked as incomplete until it is real, or hide it from internal launch.
- Audit placeholder and prototype-only UI affordances.
- Hide routes behind feature flags where needed.
- Publish a truth note for internal users listing what is real, experimental, or non-authoritative.

Exit criteria:

- Internal users can tell what is production-worthy versus exploratory.
- No launch-critical surface is knowingly fake or misleading.

## 5. Unify persistence expectations

This is one of the biggest architectural questions in the repo.

Current state appears to mix:

- local/browser persistence for some chamber/session features
- Supabase for board/auth/realtime
- Firebase for DataQuad/session lineage

Actions:

- Decide which data stores are authoritative for internal alpha.
- Document the responsibility of each store.
- Identify which artifacts must survive device changes and team-wide usage.
- Reduce ambiguous overlap where the same conceptual entity seems split across local and remote storage.
- Add backup/export expectations for anything important.

Exit criteria:

- The team knows where each class of data lives.
- Shared collaboration data is not accidentally trapped in one browser.

## 6. Secure the internal deployment path

The current posture is closer to “trusted local development” than “shared internal service.”

Actions:

- Review the Node gateway and decide whether it remains local-only or becomes a hosted internal service.
- If hosted, add authentication and tighter CORS policy.
- Standardize secret handling for hosted services instead of depending on ad hoc machine env vars.
- Review whether provider keys should stay purely device-local for launch, or whether internal service accounts are needed.
- Add a minimal internal security checklist for launch.

Exit criteria:

- The team has a deliberate security model.
- Internal users know which credentials are local, shared, or service-owned.

## 7. Run an internal launch QA pass

Before launch, validate the actual collaboration loops.

Actions:

- Test onboarding from a clean machine/profile.
- Test peer setup, lens setup, chamber work, artifact/session flow, and shared board collaboration.
- Test the app with at least two real internal users and at least one AI-assisted workflow.
- Confirm graceful behavior when external providers are unavailable.
- Validate recovery after refresh, reconnect, sign-out, and service restart.

Exit criteria:

- Real internal collaboration works without developer intervention.
- The team has a short known-issues list instead of hidden surprises.

---

## Work That Should Follow Soon After Launch

These items matter, but they do not all need to block the internal alpha.

## 1. Extract `@aegis/core`

This is strategically important once the Commons is actively informing other AEGIS apps.

Why:

- it prevents canon/governance drift
- it lets other apps consume the same logic
- it reduces copy/paste risk across repos

Do this when:

- a second app is ready to consume the shared core
- the current hardening work has settled enough to avoid extracting churn

## 2. Improve bundle/runtime performance

The current production bundle is large enough for Vite to warn on chunk size.

Actions:

- split large routes
- isolate heavy tooling/admin surfaces
- measure first-load performance on the internal deployment target

## 3. Add operational observability

Actions:

- structured logs for gateway and steward
- basic uptime/health checks
- operator runbook for common failures

## 4. Formalize release management

Actions:

- define release cadence
- tag internal alpha releases
- maintain a short changelog and known-issues log

---

## Suggested Delivery Sequence

## Phase 1: Launch blockers

- Fix lint
- Fix unit test execution
- Make CI green
- Standardize environment/config
- Validate auth/RLS
- Decide launch-visible vs hidden prototype surfaces

## Phase 2: Internal alpha deployment

- Deploy the stack for trusted internal users
- Run multi-user QA
- Use the Commons as the active collaboration hub for internal work
- Track issues found through real usage

## Phase 3: Post-launch hardening

- clarify data ownership across stores
- add observability
- reduce operational fragility
- tighten security model

## Phase 4: Platform extraction

- extract `@aegis/core`
- reuse proven governance/canon modules in other AEGIS apps

---

## Practical Recommendation For Your Strategy

Yes, I think the approach is good.

Using the Commons as the place where the human + AI collaboration model is stress-tested while the team works on the other AEGIS apps is exactly the kind of leverage point that can pay off across the whole ecosystem.

My recommendation is to do it with one guardrail:

Treat the next step as an **internal alpha launch with hard launch criteria**, not as “ship whatever exists and refine it later.”

If you give this repo one focused stabilization sprint, it can become the right internal chamber for:

- live collaboration
- workflow testing
- governance validation
- prompt and peer refinement
- early operational discipline for the rest of the ecosystem

---

## Immediate Next Actions

1. Fix the red gates: `lint` and `test:unit`.
2. Create a canonical internal deployment/config document.
3. Validate Supabase auth + board flows with real internal accounts.
4. Hide or relabel unfinished surfaces before inviting users in.
5. Run a small internal alpha with 2-5 trusted users.

If those five are completed, the Commons becomes a credible internal home base rather than only a promising prototype.
