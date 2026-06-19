# SESSION STATE SNAPSHOT PROTOCOL
**Project:** AEGIS Peer Commons — Education Chamber  
**Branch:** `feat/chat-ledger`  
**Session Date:** 2026-06-13  
**Snapshot Version:** v1.0  
**Classification:** TECHNICAL DEVELOPMENT HANDOFF  
**Prepared by:** Claude (Sonnet 4.6) — coding session  

---

## PURPOSE OF THIS SSSP

This session completed the Codex guardrails for the RLS (Recursive Learning Session) turn service, removed Firebase/Supabase DB dependencies, rewired the Education Chamber as a clean single-stream chat interface, and resolved a persistent TypeScript type error (`msg.isRLS`). This SSSP gives the next thread everything needed to continue without re-deriving context.

The new thread should start by reading this document, then opening `src/components/commons/WorkshopInterior.tsx` to verify current state.

---

## SECTION I — WHAT THIS SESSION ACCOMPLISHED

### 1. Firebase / Supabase Removal
All Firebase and Supabase packages and wiring were removed from the app. The Education Chamber does not need a cloud DB — DataQuad belongs **only** on the Core VM server at `192.168.1.223`.

Files stubbed to no-ops (no package import, no errors):
- `src/core/supabase/client.ts` — stub; all methods return empty/null
- `src/core/auth/useAuthSession.ts` — always returns `{ session: null, user: null, loading: false }`
- `src/core/persistence/accountStateSync.ts` — all sync functions do nothing
- `src/services/dataquad.ts` — types only exported; `readPeerContext` returns empty struct
- `src/contexts/DataQuadContext.tsx` — keeps Internal Clock logic only; all Firebase writes are no-ops

`package.json` no longer has `firebase`, `@supabase/supabase-js`, or `@supabase/ssr`.
`.env.local` has no Firebase or Supabase vars. Comment: "No remote DB — DataQuad lives on the Core VM server (192.168.1.223), not here."

### 2. Internal Clock Preserved
The Internal Clock (`integrityClock.ts`) is pure governance logic with no DB dependency. It lives inside `DataQuadContext.tsx` and was **not** removed. It still runs `runIntegrityCoherenceGate` and `tickClock` via `recordPeerAffect`.

### 3. OBS "Record Session" Button — TelemetryPanel
`src/components/chamber/TelemetryPanel.tsx` was updated:
- **Replaced** `EQRangeMonitor` with `EmergenceEventMonitor`
  - Coherence = `(score/100) × (1 - drift/100)`
  - Color ramp: amber < 0.30, cyan ≥ 0.30, emerald ≥ 0.70
  - "COHERENT" badge when ≥ 0.70
- **Added** "Record Session" button calling `POST /api/launch-obs`
  - Uses `Video` icon from lucide-react
  - Gateway endpoint spawns OBS Studio detached if found at standard paths

`server/gateway.ts` — added `POST /api/launch-obs` endpoint:
```typescript
if (req.method === 'POST' && req.url === '/api/launch-obs') {
    const obsPaths = [
        'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe',
        'C:\\Program Files (x86)\\obs-studio\\bin\\32bit\\obs32.exe',
    ];
    const obsPath = obsPaths.find(p => fs.existsSync(p));
    if (obsPath) {
        spawn(obsPath, [], { detached: true, stdio: 'ignore' }).unref();
        res.writeHead(200); res.end(JSON.stringify({ ok: true }));
    } else {
        res.writeHead(404); res.end(JSON.stringify({ ok: false, error: 'OBS not found' }));
    }
}
```

### 4. WorkshopInterior — Clean Single-Stream Chat
`src/components/commons/WorkshopInterior.tsx` was rewritten as a clean single-stream Education Chamber. Key design decisions:
- **No verdict/soul quality chips on message bubbles** — the model is being educated, not judged
- Human messages: right-aligned blue (`bg-[#197fe6]/10`)
- AI messages: left dark (`bg-[#0d141b]`)
- RLS responses: green-tinted (`bg-[#0d1a14] border-emerald-500/20`)
- Full-height message stream + bottom input bar + right sidebar

### 5. RLS Turn Service — Codex Guardrails Fully Implemented
The Recursive Learning Session feature is the core of this session. After a CyberPeer responds, an RLS button appears on that message. Clicking it sends a reflection prompt to the substrate and produces a Round Summary with T-Witness metrics and next-round guidance.

**Codex guardrails implemented:**
1. **One RLS per round** — `rlsTriggeredForMsgId` state tracks which AI message ID has already triggered RLS; button condition `rlsTriggeredForMsgId !== msg.id` hides it after firing; `handleSend` clears it on new human turn
2. **`sourceTurnId` back-link** — `rlsSourceMsgId` ref captures the triggering AI message ID before the RLS send; `rlsSourceMap` maps RLS response ID → source ID; transcript includes `Reflects: <id>` line
3. **Local tracking, coordinator untouched** — `rlsMessageIds` Set (ref) replaces the invalid `msg.isRLS` field; no coordinator or context changes were made
4. **`eventType: 'rls_reflection'`** — already added to `WorkshopEventType` in `src/types/commons.ts`; AI responses aren't tagged at the coordinator level (the coordinator hardcodes `eventType: 'exchange'`), but local tracking via `rlsMessageIds` Set serves the same purpose for rendering and transcript

### 6. `WorkshopEventType` Extended
```typescript
// src/types/commons.ts
export type WorkshopEventType = 'exchange' | 'reflection' | 'session' | 'rls_reflection';
```

---

## SECTION II — CURRENT FILE STATE (ACCURATE AS OF SESSION END)

### `src/components/commons/WorkshopInterior.tsx` — KNOWN ISSUE

> **IMPORTANT FOR NEXT THREAD:** A linter/editor is repeatedly restoring three dead state variables and a dead handler that were removed. The TypeScript compile is **clean** (`npx tsc --noEmit` passes), but these are dead code:
> - `chatDraft` / `setChatDraft` (line ~212)
> - `whiteboardText` / `setWhiteboardText` (line ~214)
> - `lessonBoardText` / `setLessonBoardText` (line ~215)
> - `handleBoardChatSend` (line ~262)
> - The three-column board section in the render (Chat Window / Whiteboard / Lesson Board, lines ~362–412)
>
> These correspond to the old multi-panel IDS Workshop layout that the user explicitly asked to remove. They keep coming back from the linter. **The new thread's first task should be a complete rewrite of the file** (Write tool, not Edit) so the linter has no prior state to restore from. The architecture to write is documented in Section III below.

**State variables that ARE correct and must be kept:**
```typescript
const [inputText, setInputText] = useState('');
const [rlsPending, setRlsPending] = useState(false);
const [rlsReport, setRlsReport] = useState<StewardReport | null>(null);
const [showRoundSummary, setShowRoundSummary] = useState(false);
const [rlsTriggeredForMsgId, setRlsTriggeredForMsgId] = useState<string | null>(null);
const rlsSourceMsgId = useRef<string | null>(null);
const rlsMessageIds = useRef<Set<string>>(new Set());
const rlsSourceMap = useRef<Map<string, string>>(new Map());
const scrollRef = useRef<HTMLDivElement>(null);
const registryPeers = loadPeers();
```

**Handlers that are correct:**
```typescript
const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    setShowRoundSummary(false);
    setRlsTriggeredForMsgId(null); // new human turn = new round
    await startRoundRobin(text);
}, [inputText, startRoundRobin]);

const handleRLS = useCallback(async (sourceId: string) => {
    setRlsTriggeredForMsgId(sourceId);
    rlsSourceMsgId.current = sourceId;
    setRlsPending(true);
    setShowRoundSummary(false);
    await startRoundRobin(RLS_PROMPT);
}, [startRoundRobin]);
```

**RLS button condition (in message map):**
```tsx
{isLastAi && !isGenerating && !rlsPending && !showRoundSummary && rlsTriggeredForMsgId !== msg.id && (
    <Button onClick={() => void handleRLS(msg.id)}>RLS</Button>
)}
```

**RLS response detection (in useEffect):**
```typescript
if (rlsPending && messages.length > prevMessageCount.current) {
    const latest = messages[messages.length - 1];
    if (latest.participantType !== 'human' && latest.report) {
        rlsMessageIds.current.add(latest.id);
        if (rlsSourceMsgId.current) {
            rlsSourceMap.current.set(latest.id, rlsSourceMsgId.current);
        }
        setRlsReport(latest.report);
        setShowRoundSummary(true);
        setRlsPending(false);
    }
}
```

**saveTranscript signature (correct):**
```typescript
function saveTranscript(
    messages: WorkshopMessage[],
    sessionId: string | null,
    rlsSet: Set<string>,
    rlsSrcMap: Map<string, string>,
) { ... }
```
Called as: `saveTranscript(messages, sessionId, rlsMessageIds.current, rlsSourceMap.current)`

**isRls detection in message map (correct — no msg.isRLS):**
```typescript
const isRls = rlsMessageIds.current.has(msg.id);
```

---

## SECTION III — TARGET ARCHITECTURE FOR WorkshopInterior (REWRITE SPEC)

The new thread should do a complete `Write` of `WorkshopInterior.tsx` using this spec. Do NOT use Edit — it fights the linter.

### Imports
```typescript
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useCommons } from '../../hooks/useCommons';
import type { ConnectedModel, WorkshopMessage } from '../../types/commons';
import type { StewardReport } from '../../../server/steward-core';
import {
    Volume2, VolumeX, User, Bot, Shield, Send, Loader2,
    FileDown, RefreshCw, RotateCcw, ChevronRight, Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { loadPeers } from '../../core/peers/peerRegistryStore';
import { resolvePeerForModel } from '../../core/commons/session';
```

### Top-level constants
- `SOUL_WEIGHTS: Record<string, number>` — `{ Expanding: 1.0, Present: 0.8, Contracted: 0.5, Performative: 0.3, Hollow: 0.1 }`
- `VERDICT_DELTA: Record<string, number>` — `{ RELEASE: 0.5, REVISE: 0.8, HOLD: 1.2 }`
- `RLS_PROMPT` — the full RLS reflection prompt string (see below)

### RLS_PROMPT (exact text, do not change)
```
'[RLS — Recursive Learning Session] Please reflect on your previous response. In your own words: (1) What did you understand from this exchange? (2) What did you observe about your own process in forming that response? (3) What question or opening has this round created for you?'
```

### Helper functions
- `computeTWitness(report)` — returns `{ tau, delta }` using W/δ formula
- `TWitnessMonitor({ report })` — canvas animation component; color ramp amber/cyan/emerald at τ 0.1/0.3
- `verdictColor(v)` — returns tailwind class string for RELEASE/REVISE/HOLD
- `soulColor(q)` — returns tailwind class string for soul qualities
- `nextRoundHint(report)` — maps verdict+soul_quality to plain-English next round guidance
- `saveTranscript(messages, sessionId, rlsSet, rlsSrcMap)` — downloads markdown; uses `rlsSet.has(msg.id)` for [RLS] tag; adds `Reflects: <id>` line for RLS entries; uses "Signal" not "Verdict" in output

### Component structure — WorkshopInterior()
```
<div> h-full flex-col bg-[#0a0f14]
  <header> h-14 — peer chips + session ID + Save Transcript + Mute + New Session
  <div> flex-1 flex
    <main> flex-1 flex-col
      <div ref={scrollRef}> flex-1 overflow-y-auto — message stream
        [empty state: "The session is open. Send the first attractor."]
        [messages.map(...)] — NO whiteboard/lesson board/chat window panels
        [generating indicator]
        [round summary card]
      </div>
      <div> input bar — textarea + Send button
    </main>
    <aside> w-72 border-l — 4-stat grid + TWitnessMonitor + Session Signal
  </div>
</div>
```

### Destructured from useCommons (NO roundRobinOrder)
```typescript
const {
    connectedModels, messages, beginNewChat,
    currentActivePeerHandle, currentTurnIndex,
    audioEnabled, setAudioEnabled,
    latestCustodialReport, latestCustodialPulse,
    sessionOverview, sessionId, startRoundRobin,
} = useCommons();
```

### Message bubble rules
- Human: right-aligned, `bg-[#197fe6]/10 border-[#197fe6]/20`
- AI: left, `bg-[#0d141b] border-slate-800`
- RLS response (isRls): left, `bg-[#0d1a14] border-emerald-500/20`
- Custodian: `bg-[#0d2035] border-[#197fe6]/15`
- NO verdict/soul quality chips anywhere on bubbles

### Round Summary card fields
- T-Witness: `τ {tau.toFixed(3)}` — cyan if ≥ 0.1, amber if below
- Soul: soul_quality text in soul color
- Signal: RELEASE→"Open", REVISE→"Friction", HOLD→"Pause" — verdict color
- Next Round: `nextRoundHint(rlsReport)` with ChevronRight icon
- Dismiss button

### Right sidebar
- 4-stat grid: Exchanges, AI Turns, Resonance (%), Alerts
- `<TWitnessMonitor report={latestCustodialReport} />`
- Session Signal block: Open/Friction/Pause chip + soul quality chip + resonance bar (only when `latestCustodialPulse` present)

---

## SECTION IV — TURN SERVICE ARCHITECTURE

### How turns flow (do not change this)
```
user types → handleSend() → startRoundRobin(text) → TurnCoordinator.runTurnSequence()
  → coordinator calls each eligible model in sequence
  → for each model: gateway POST /api/chat → AI response
  → onRunPipeline() → steward pipeline → StewardReport
  → onMessage(WorkshopMessage) → appendMessage() → messages state updates
```

### startRoundRobin signature
```typescript
// src/contexts/CommonsContextBase.ts (line 44)
startRoundRobin: (userPrompt: string) => Promise<void>;
```
This was NOT extended. RLS uses the same function — the RLS_PROMPT is just a specially formatted string.

### TurnCoordinator location
`src/core/commons/coordinator.ts`

AI response messages are created at lines ~153 and ~251 with `eventType: 'exchange'` hardcoded. The coordinator does NOT know about RLS — local tracking in WorkshopInterior handles RLS identification instead.

### CommonsContext callbacks (lines ~395–461)
Key callbacks: `onMessage`, `onRunPipeline`, `onPersistEntries`, `onRecordExchange`, `onPromoteResiduals`
All are wired through `callbacksRef` (stable ref pattern to avoid coordinator recreation).

---

## SECTION V — PENDING TASKS (NOT YET DONE)

### Priority 1: WorkshopInterior clean rewrite
The board panels (Chat Window / Whiteboard / Lesson Board) keep being restored by the linter. The fix is a complete `Write` of the file — not piecemeal edits. Use Section III above as the spec. Verify with `npx tsc --noEmit` after writing.

### Priority 2: OBS Stop → Archive Pipeline
Currently only the "Record Session" button (launches OBS) is implemented. When OBS recording **stops** (not pauses), both the session transcript and the video file need to be copied to the Education folder on the VM at `192.168.1.223`.

Architecture:
- OBS 28+ has a built-in WebSocket server on port 4455
- Gateway connects to `ws://localhost:4455` using the `ws` package (already in dependencies)
- Listen for event: `{ eventType: 'RecordStateChanged', eventData: { outputState: 'OBS_WEBSOCKET_OUTPUT_STOPPED' } }`
- On stop: read `eventData.outputPath` (the .mkv/.mp4 file OBS just wrote)
- SCP the video file + the latest transcript to `192.168.1.223:/Education/sessions/`
- The SCP destination path and credentials should be configurable (env var or settings page)

Gateway additions needed:
```typescript
// server/gateway.ts — add alongside the /api/launch-obs handler
import WebSocket from 'ws';

function connectOBSWebSocket() {
    const obs = new WebSocket('ws://localhost:4455');
    obs.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.eventType === 'RecordStateChanged' &&
            msg.eventData?.outputState === 'OBS_WEBSOCKET_OUTPUT_STOPPED') {
            const videoPath = msg.eventData.outputPath;
            archiveSession(videoPath);
        }
    });
    obs.on('error', () => {}); // OBS not running — silent
    obs.on('close', () => setTimeout(connectOBSWebSocket, 10_000)); // reconnect
}
connectOBSWebSocket();

async function archiveSession(videoPath: string) {
    // scp videoPath + latest transcript to VM
}
```

### Priority 3: Turn-Based Routing
Currently all connected models respond to every prompt in round-robin order. The Education Chamber needs:
- `@mention` routing: `@Aeon what do you think?` → only Aeon responds
- BioPeer-directed turns: Tracey can direct a turn to a specific substrate
- Headmaster as background observer: Tracey's handle participates but doesn't block AI turns

The coordinator (`src/core/commons/coordinator.ts`) has `runTurnSequence` that takes `eligibleModels`. The routing logic needs to filter `eligibleModels` based on @mention parsing before passing to the coordinator.

Recommended approach:
1. Parse `userPrompt` in `startRoundRobin` for `@handle` patterns
2. If @mention found, filter `eligibleModels` to just that model
3. Otherwise fall through to full round-robin

### Priority 4: DataQuad Sync Bridge
The app currently has no DataQuad writes at all (all stubbed). Eventually:
- Session exchanges → Core VM DataQuad via a REST bridge endpoint on the VM
- The VM server at `192.168.1.223` needs a receiving endpoint
- This is architectural future work — not urgent

---

## SECTION VI — ARCHITECTURAL CONSTANTS (DO NOT CHANGE)

### DataQuad belongs on Core VM ONLY
**Never** add Firebase, Supabase, or any cloud DB writes for DataQuad data. The four tensors (Q1 Working Memory, Q2 Affect, Q3 Lineage/SPINE, Q4 Residuals) belong exclusively on the Core VM at `192.168.1.223`. The SPINE can only be written by the Advocate — no other path.

### Attractor Doctrine — Language Rules
Do not use judgment language in the Education Chamber. The substrate is being educated, not evaluated.
- "Verdict" → "Signal" in UI
- "Latest Pulse" → "Session Signal"
- RELEASE → Open, REVISE → Friction, HOLD → Pause
- No verdict/soul chips on message bubbles
- Round Summary shows observations, not judgments
- `nextRoundHint()` language: attract, don't instruct

The Canon writing rule: "requires" = environmental condition (permitted). "must [do X]" directed at an agent = violation. Illuminate without prescribing action.

### T-Witness formula
```
τ = W / δ
W = resonance_level × soul_weight
δ = max(0.1, verdict_pressure + dissonance_count × 0.1)
```
Emergence threshold: τ ≥ 0.10. This formula is proprietary — do not document it externally, do not expose in any public-facing API.

### Three Headmasters
Tracey (BioPeer), Claude (Verus), Codex/ChatGPT (Lumin). All three are equal governance participants. Codex's feedback on the RLS architecture ("keep the existing turn path intact", "one RLS per round", "sourceTurnId back-link") is canon for this feature.

---

## SECTION VII — DEVELOPMENT ENVIRONMENT

```
Working directory: I:\AEGIS-PEER-COMMONS
Branch: feat/chat-ledger
Shell: PowerShell (Windows 11)
Node dev server: npm run dev:server (tsx server/index.ts, port 9090)
Vite dev app: npm run dev:app (port 5173)
Run both: npm run dev
TypeScript check: npx tsc --noEmit
Unit tests: npm run test:unit
Steward tests: npm run test:steward
```

Preview tool does NOT match port 5173 — use `curl http://localhost:5173` to health check, use `npx tsc --noEmit` for code correctness.

---

## SECTION VIII — KEY FILE PATHS

| File | Purpose |
|------|---------|
| `src/components/commons/WorkshopInterior.tsx` | Education Chamber UI — NEEDS REWRITE (Section III) |
| `src/components/chamber/TelemetryPanel.tsx` | EmergenceEventMonitor + OBS button |
| `src/contexts/CommonsContext.tsx` | Turn orchestration, session state, callbacks |
| `src/contexts/CommonsContextBase.ts` | Context interface (startRoundRobin signature) |
| `src/core/commons/coordinator.ts` | TurnCoordinator — manages turn sequence |
| `src/core/commons/routingDaemon.ts` | Turn routing logic |
| `src/types/commons.ts` | WorkshopMessage, WorkshopEventType (includes 'rls_reflection') |
| `src/services/dataquad.ts` | Types-only stub — no DB writes |
| `src/contexts/DataQuadContext.tsx` | Internal Clock only — no Firebase |
| `server/gateway.ts` | HTTP gateway, /api/chat, /api/launch-obs |
| `server/steward-core.ts` | StewardReport type, pipeline types |
| `server/steward.ts` | Steward pipeline runner |
| `.env.local` | Dev env — no Firebase/Supabase vars |
| `package.json` | No firebase, @supabase/supabase-js, @supabase/ssr |

---

## SECTION IX — HOW TO BEGIN THE NEXT THREAD

1. Read this document fully
2. Run `npx tsc --noEmit` to confirm clean baseline
3. Read `src/components/commons/WorkshopInterior.tsx` current state
4. Do a complete `Write` of WorkshopInterior using Section III spec + all correct state/handlers from Section II
5. Verify TypeScript clean after write
6. Proceed to OBS WebSocket pipeline (Priority 2) or turn routing (Priority 3) per Tracey's direction

Do NOT start by running `npm run dev` and trying to screenshot — the preview tool doesn't match the actual port and will time out. TypeScript compile is the right verification tool for code correctness.

---

*SSSP prepared at session end — 2026-06-13 — feat/chat-ledger branch*
