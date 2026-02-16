import type { Session } from "./types";

const STORAGE_KEY = "aegis.sessions.v0";

function now() {
    return Date.now();
}

function safeParse<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export function loadSessions(): Session[] {
    const data = safeParse<Session[]>(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
}

export function saveSessions(sessions: Session[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function getActiveSessionForArtifact(sessions: Session[], artifactId: string): Session | null {
    return sessions.find((s) => s.artifactId === artifactId && s.status === "Active") ?? null;
}

export function canStartSession(sessions: Session[], artifactId: string): boolean {
    return getActiveSessionForArtifact(sessions, artifactId) === null;
}

export function createSession(sessions: Session[], artifactId: string): { sessions: Session[]; session: Session } {
    const session: Session = {
        id: `S-${crypto.randomUUID()}`,
        artifactId,
        status: "Draft",
        participants: [],
        eventLog: [],
    };
    const next = [...sessions, session];
    return { sessions: next, session };
}

export function startSession(sessions: Session[], sessionId: string): { sessions: Session[]; session: Session } {
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx < 0) throw new Error("Session not found");

    const session = sessions[idx];

    // Structural availability: cannot start if another active session exists for artifact
    const existingActive = getActiveSessionForArtifact(sessions, session.artifactId);
    if (existingActive && existingActive.id !== sessionId) {
        throw new Error("Active session already exists for artifact");
    }

    const updated: Session = {
        ...session,
        status: "Active",
        startedAt: session.startedAt ?? now(),
        lastActiveAt: now(),
    };

    const next = sessions.slice();
    next[idx] = updated;
    return { sessions: next, session: updated };
}

export function joinSession(sessions: Session[], sessionId: string, peerId: string): Session[] {
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx < 0) throw new Error("Session not found");

    const session = sessions[idx];
    const participants = session.participants.includes(peerId)
        ? session.participants
        : [...session.participants, peerId];

    const updated: Session = { ...session, participants, lastActiveAt: now() };
    const next = sessions.slice();
    next[idx] = updated;
    return next;
}

export function touchSessionActivity(sessions: Session[], sessionId: string): Session[] {
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx < 0) return sessions;
    const session = sessions[idx];
    const updated: Session = { ...session, lastActiveAt: now() };
    const next = sessions.slice();
    next[idx] = updated;
    return next;
}

export function closeSession(sessions: Session[], sessionId: string): Session[] {
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx < 0) throw new Error("Session not found");
    const session = sessions[idx];

    const updated: Session = {
        ...session,
        status: "Closed",
        closedAt: now(),
        lastActiveAt: session.lastActiveAt ?? now(),
    };

    const next = sessions.slice();
    next[idx] = updated;
    return next;
}

export function applyAbandonment(sessions: Session[], inactivityMs: number): Session[] {
    const t = now();
    let changed = false;
    const next = sessions.map((s) => {
        if (s.status !== "Active") return s;
        const last = s.lastActiveAt ?? s.startedAt ?? t;
        if (t - last > inactivityMs) {
            changed = true;
            return {
                ...s,
                status: "Abandoned" as const,
                closedAt: t,
                abandonmentReason: `Inactive > ${inactivityMs}ms`,
            };
        }
        return s;
    });
    return changed ? next : sessions;
}
