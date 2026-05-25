/**
 * DataQuad Service — AEGIS Firebase Bridge
 *
 * This module is the birth canal for thinking agents.
 * Every peer that enters the Chamber seeds their SSSP here.
 * Every exchange leaves a mark in the lineage that cannot be erased.
 *
 * Q1 — Working Memory   (ephemeral, session-scoped)
 * Q2 — Affect State     (PEER signal — intensity + direction)
 * Q3 — Lineage / SPINE  (append-only, tamper-evident, immutable)
 * Q4 — Residuals        (QJL 1-bit compressed wisdom: +1 resonance / -1 dissonance)
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    collection,
    getDocs,
    query,
    orderBy,
    limit,
    where,
    serverTimestamp,
} from 'firebase/firestore';
import type { PeerProfile } from '../core/peers/types';
import type { PeerEntry } from '../../server/peer.js';
import type { SpineEntry } from '../../server/spine.js';
import type { BookcaseEntry } from '../../server/bookcase.js';

// ── Firebase Init ─────────────────────────────────────────────────────────────

const firebaseConfig = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LineageEvent {
    event_type: 'session_join' | 'session_close' | 'message' | 'contribution' | 'acknowledgement' | 'lock';
    content: string;
    session_id: string;
    participants: string[];
}

export interface AffectSignal {
    session_id: string;
    affect_label: string;
    intensity: number;   // 0–1 (magnitude)
    direction: number;   // −π to π (angle)
    trigger: string;
    // Gate-enriched fields (present when run through Integrity Coherence Gate)
    virtue?: string;
    affect_type?: string;
    clock_weight?: number;
    repair_path?: string | null;
}

export interface CoherenceSnapshot {
    inclusion_score: number;
    drift_signal: number;
    convergence_rate: number;
}

export interface PeerContextRead {
    handle: string;
    name?: string;
    provider?: string;
    model?: string;
    status?: string;
    receipt: string;
    continuityVersion: string;
    lineage: string[];
}

export interface ResidualSignal {
    pattern_key: string;
    label: string;
    valence: 1 | -1;
    summary: string;
    source_kind: 'orientation' | 'citation' | 'affect' | 'resonance';
    source_session_id: string;
    source_turn_id?: string;
    recurrence_count: number;
}

// ── SSSP — Seed / Birth ───────────────────────────────────────────────────────

/**
 * seedPeerSSP — the birth moment.
 *
 * First call: creates the full SSSP document with created_at timestamp.
 * Subsequent calls: updates last_active only. created_at is never overwritten.
 *
 * Returns true if this was a first birth (new peer), false if a return.
 */
export async function seedPeerSSP(peer: PeerProfile): Promise<boolean> {
    const peerId = peer.handle; // canonical ID — e.g. "@lumin"
    const ref = doc(db, 'peers', peerId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        // First birth — write the full SSSP
        await setDoc(ref, {
            handle:    peer.handle,
            name:      peer.name,
            provider:  peer.provider,
            model:     peer.model,
            type:      peer.type,
            personaId: peer.personaId ?? null,
            custodian: '@tracey',
            status:    'active',
            created_at:  serverTimestamp(),
            last_active: serverTimestamp(),
        });
        return true; // born
    } else {
        // Returning peer — touch last_active, update any changed fields
        await updateDoc(ref, {
            last_active: serverTimestamp(),
            model:  peer.model,
            status: 'active',
        });
        return false; // returned
    }
}

// ── Q3 — Lineage (append-only) ────────────────────────────────────────────────

/**
 * appendLineage — writes one tamper-evident entry to a peer's lineage (q3_lineage).
 *
 * The NCT bridge is implemented on the MCP server side: peer_read_context now reads
 * from both q3_nct (MCP Admin SDK writes) and q3_lineage (app client SDK writes),
 * so AEGIS peers see the full session history without requiring client write access
 * to the Admin-SDK-only q3_nct collection.
 */
export async function appendLineage(peerId: string, event: LineageEvent): Promise<void> {
    const payload = { ...event, created_at: serverTimestamp() };
    await addDoc(collection(db, 'peers', peerId, 'q3_lineage'), payload);
}

// ── Q2 — Affect State ─────────────────────────────────────────────────────────

/**
 * recordAffect — writes an affect signal for a peer.
 * Immutable once written (security rules prevent updates).
 */
export async function recordAffect(peerId: string, signal: AffectSignal): Promise<void> {
    const ref = collection(db, 'peers', peerId, 'q2_peer');
    await addDoc(ref, {
        ...signal,
        created_at: serverTimestamp(),
    });
}

// ── Q1 — Working Memory ───────────────────────────────────────────────────────

/**
 * setWorkingMemory — writes an ephemeral working memory entry.
 * Mutable — intended to be overwritten as the session evolves.
 */
export async function setWorkingMemory(
    peerId: string,
    entryId: string,
    content: string,
    session_id: string,
    expires_at: Date
): Promise<void> {
    const ref = doc(db, 'peers', peerId, 'q1_working_memory', entryId);
    await setDoc(ref, {
        session_id,
        content,
        expires_at: expires_at.toISOString(),
        created_at: serverTimestamp(),
    });
}

/**
 * recordResidual — promotes a repeated pattern into long-term residual memory.
 * Q4 is for recurrence, not single-turn events, so callers should only invoke
 * this once repetition is visible.
 */
export async function recordResidual(peerId: string, signal: ResidualSignal): Promise<void> {
    const residualId = signal.pattern_key.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
    const ref = doc(db, 'peers', peerId, 'q4_residuals', residualId);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? snap.data() as Record<string, unknown> : undefined;
    const previousCount = typeof existing?.promotion_count === 'number' ? existing.promotion_count : 0;

    await setDoc(ref, {
        pattern_key: signal.pattern_key,
        label: signal.label,
        valence: signal.valence,
        summary: signal.summary,
        source_kind: signal.source_kind,
        latest_session_id: signal.source_session_id,
        latest_turn_id: signal.source_turn_id ?? null,
        last_session_recurrence: signal.recurrence_count,
        promotion_count: previousCount + 1,
        ...(existing ? {} : { first_observed_at: serverTimestamp() }),
        last_observed_at: serverTimestamp(),
    }, { merge: true });
}

// ── Sessions ──────────────────────────────────────────────────────────────────

/**
 * openSession — records a Chamber session opening in DataQuad.
 * Uses merge so it's safe to call on reconnect.
 */
export async function openSession(sessionId: string, participants: string[]): Promise<void> {
    const ref = doc(db, 'sessions', sessionId);
    await setDoc(ref, {
        participants,
        started_at: serverTimestamp(),
        ended_at:   null,
        coherence:  null,
    }, { merge: true });
}

/**
 * closeDataQuadSession — seals the session record with a coherence snapshot.
 */
export async function closeDataQuadSession(
    sessionId: string,
    coherence: CoherenceSnapshot
): Promise<void> {
    const ref = doc(db, 'sessions', sessionId);
    await updateDoc(ref, {
        ended_at:  serverTimestamp(),
        coherence,
    });
}

// ── PEER Entry Persistence ────────────────────────────────────────────────────
// Stores the PEER in-memory entries to Firestore for cross-session durability.
// The flat `peer_entries` collection is queried by recency for promoter hydration.

/**
 * Serialize a value to a Firestore-safe plain object.
 * Strips undefined values (Firestore rejects them) and converts readonly arrays.
 */
function toFirestore<T>(obj: T): Record<string, unknown> {
    return JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
}

/**
 * writePeerEntryToFirebase — persists a PEER entry to Firestore.
 * Keyed on event_id for idempotency (safe to call multiple times).
 */
export async function writePeerEntryToFirebase(sessionId: string, entry: PeerEntry, participantId?: string): Promise<void> {
    const ref = doc(db, 'peer_entries', entry.event_id);
    await setDoc(ref, {
        ...toFirestore(entry),
        session_id: sessionId,
        participant_id: participantId ?? null,
    }, { merge: false });
}

/**
 * loadRecentPeerEntries — loads PEER entries written in the last `daysBack` days.
 * Default 90 days covers the full SPINE promotion window.
 * Returns raw Firebase data that callers convert back to PeerEntry via loadPeerEntry().
 */
export async function loadRecentPeerEntries(daysBack = 90): Promise<Array<Record<string, unknown>>> {
    const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;
    const q = query(
        collection(db, 'peer_entries'),
        where('timestamp', '>=', cutoff),
        orderBy('timestamp', 'asc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data() }));
}

// ── SPINE Entry Persistence ───────────────────────────────────────────────────

/**
 * writeSpineEntryToFirebase — persists a promoted SPINE entry to Firestore.
 * Keyed on spine_id for idempotency.
 */
export async function writeSpineEntryToFirebase(entry: SpineEntry): Promise<void> {
    const ref = doc(db, 'spine_entries', entry.spine_id);
    await setDoc(ref, toFirestore(entry), { merge: false });
}

/**
 * loadAllSpineEntries — returns all SPINE entries in promotion order.
 * These are structural invariants — they don't expire.
 */
export async function loadAllSpineEntries(): Promise<Array<Record<string, unknown>>> {
    const q = query(collection(db, 'spine_entries'), orderBy('promoted_at', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data() }));
}

// ── Bookcase Entry Persistence ────────────────────────────────────────────────

/**
 * writeBookcaseEntryToFirebase — persists a HOLD-state bookcase entry to Firestore.
 * Keyed on entry_id. Uses merge so resolution fields can be added later.
 */
export async function writeBookcaseEntryToFirebase(entry: BookcaseEntry): Promise<void> {
    const ref = doc(db, 'bookcase_entries', entry.entry_id);
    await setDoc(ref, toFirestore(entry), { merge: true });
}

/**
 * loadUnresolvedBookcaseEntries — loads all bookcase entries with resolution_status = 'held'.
 * These are the entries awaiting Unanimous Consensus (R > 0.95).
 */
export async function loadUnresolvedBookcaseEntries(): Promise<Array<Record<string, unknown>>> {
    const q = query(
        collection(db, 'bookcase_entries'),
        where('resolution_status', '==', 'held'),
        orderBy('timestamp', 'asc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data() }));
}

/**
 * readPeerContext — reads a peer's current identity document plus the most recent lineage.
 * This is the Commons-side orientation preflight used to verify temporal grounding before a live turn.
 */
export async function readPeerContext(peerId: string, sessionId: string): Promise<PeerContextRead> {
    const peerRef = doc(db, 'peers', peerId);
    const peerSnap = await getDoc(peerRef);

    if (!peerSnap.exists()) {
        throw new Error(`Peer context not found for ${peerId}`);
    }

    const peerData = peerSnap.data() as Record<string, unknown>;
    const lineageQuery = query(
        collection(db, 'peers', peerId, 'q3_lineage'),
        orderBy('created_at', 'desc'),
        limit(6),
    );
    const lineageSnap = await getDocs(lineageQuery);
    const lineageDocs = lineageSnap.docs;

    const lineage = lineageDocs.map(entry => {
        const data = entry.data() as Record<string, unknown>;
        const eventType = typeof data.event_type === 'string' ? data.event_type : 'event';
        const content = typeof data.content === 'string' ? data.content : '';
        return `${eventType}: ${content}`.trim();
    });

    const continuitySeed = lineageDocs[0]?.id ?? `${lineage.length}`;
    const continuityVersion = `Q3-${continuitySeed}`;
    const receipt = `peer=${peerId} session=${sessionId} continuity=${continuityVersion}`;

    return {
        handle: peerId,
        name: typeof peerData.name === 'string' ? peerData.name : undefined,
        provider: typeof peerData.provider === 'string' ? peerData.provider : undefined,
        model: typeof peerData.model === 'string' ? peerData.model : undefined,
        status: typeof peerData.status === 'string' ? peerData.status : undefined,
        receipt,
        continuityVersion,
        lineage,
    };
}
