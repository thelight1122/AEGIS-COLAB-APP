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
    serverTimestamp,
} from 'firebase/firestore';
import type { PeerProfile } from '../core/peers/types';

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
}

export interface CoherenceSnapshot {
    inclusion_score: number;
    drift_signal: number;
    convergence_rate: number;
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
 * appendLineage — writes one tamper-evident entry to a peer's SPINE.
 * Security rules prevent updates and deletes on this sub-collection.
 */
export async function appendLineage(peerId: string, event: LineageEvent): Promise<void> {
    const ref = collection(db, 'peers', peerId, 'q3_lineage');
    await addDoc(ref, {
        ...event,
        created_at: serverTimestamp(),
    });
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
