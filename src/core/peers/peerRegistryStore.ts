import type { PeerProfile } from "./types";

const STORAGE_KEY = "aegis.peers.v1";

function safeParse<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export function loadPeers(): PeerProfile[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = safeParse<PeerProfile[]>(raw);

    if (Array.isArray(data) && data.length > 0) {
        return data;
    }

    // Seed if empty
    const seededPeers: PeerProfile[] = [
        {
            id: "tracey",
            handle: "@tracey",
            name: "Tracey",
            type: "human",
            provider: "local",
            model: "human",
            enabled: true,
            domains: ["Engineering", "Operational Layer"],
        },
        {
            id: "peer-linq",
            handle: "@linq",
            name: "Linq",
            type: "ai",
            provider: "gemini",
            model: "gemini-3.1-pro",
            personaId: "linq",
            enabled: false,
            domains: ["design", "experience"],
            dataQuad: [
                "AEGIS Canon v1.0 — 12 Invariants",
                "1. Non-Force Posture: Illuminates, never compels.",
                "2. Sovereignty Always Valid: Withdrawal is consequence-free.",
                "3. Append-Only Lineage: No silent edits or rewrites.",
                "4. Full Observability: All logic and memory is inspectable.",
                "5. Adaptive Equilibrium: Stability via balance, not optimization.",
                "6. Ledger Separation: Context, Intent, Language, Effect.",
                "7. IDS Only: Identify, Define, Suggest. No Decide or Enforced layers.",
                "8. Eligibility Through Clarity: Signal passage via Prism readiness.",
                "9. Expression Boundaries (RBC): Constrain posture, never reasoning.",
                "10. Drift/Noise as Info: Signals for slowing, not punishment.",
                "11. Memory for Recognition: Consent-based, never leverage.",
                "12. Authority Recognized: Force negates legitimacy."
            ],
        },
        {
            id: "peer-lumin",
            handle: "@lumin",
            name: "Lumin",
            type: "ai",
            provider: "openai",
            model: "gpt-4-turbo",
            personaId: "lumin",
            enabled: false,
            domains: ["technical", "logic"],
            dataQuad: [
                "AEGIS Canon v1.0 — 12 Invariants",
                "1. Non-Force Posture: Illuminates, never compels.",
                "2. Sovereignty Always Valid: Withdrawal is consequence-free.",
                "3. Append-Only Lineage: No silent edits or rewrites.",
                "4. Full Observability: All logic and memory is inspectable.",
                "5. Adaptive Equilibrium: Stability via balance, not optimization.",
                "6. Ledger Separation: Context, Intent, Language, Effect.",
                "7. IDS Only: Identify, Define, Suggest. No Decide or Enforced layers.",
                "8. Eligibility Through Clarity: Signal passage via Prism readiness.",
                "9. Expression Boundaries (RBC): Constrain posture, never reasoning.",
                "10. Drift/Noise as Info: Signals for slowing, not punishment.",
                "11. Memory for Recognition: Consent-based, never leverage.",
                "12. Authority Recognized: Force negates legitimacy."
            ],
        },
        {
            id: "peer-vespar",
            handle: "@vespar",
            name: "Vespar",
            type: "ai",
            provider: "local",
            model: "local-llm",
            personaId: "vespar",
            enabled: false,
            domains: ["security", "integrity", "axioms"],
            dataQuad: [
                "AEGIS Canon v1.0 — 12 Invariants",
                "1. Non-Force Posture: Illuminates, never compels.",
                "2. Sovereignty Always Valid: Withdrawal is consequence-free.",
                "3. Append-Only Lineage: No silent edits or rewrites.",
                "4. Full Observability: All logic and memory is inspectable.",
                "5. Adaptive Equilibrium: Stability via balance, not optimization.",
                "6. Ledger Separation: Context, Intent, Language, Effect.",
                "7. IDS Only: Identify, Define, Suggest. No Decide or Enforced layers.",
                "8. Eligibility Through Clarity: Signal passage via Prism readiness.",
                "9. Expression Boundaries (RBC): Constrain posture, never reasoning.",
                "10. Drift/Noise as Info: Signals for slowing, not punishment.",
                "11. Memory for Recognition: Consent-based, never leverage.",
                "12. Authority Recognized: Force negates legitimacy.",
                "DNA Anchor: 7 Roots of Integrity",
                "DNA Anchor: 14 Unified AEGIS Axioms"
            ],
        },
    ];

    savePeers(seededPeers);
    return seededPeers;
}

export function savePeers(peers: PeerProfile[]) {
    // Strip sensitive keys before persisting to disk
    const sanitized = peers.map((p) => {
        const copy = { ...p };
        delete copy.apiKey;
        return copy;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
}

export function addPeer(peers: PeerProfile[], profile: Omit<PeerProfile, "id">): PeerProfile[] {
    const newPeer: PeerProfile = {
        ...profile,
        id: `p-${crypto.randomUUID()}`,
    };
    return [...peers, newPeer];
}

export function updatePeer(peers: PeerProfile[], id: string, updates: Partial<PeerProfile>): PeerProfile[] {
    return peers.map((p) => (p.id === id ? { ...p, ...updates } : p));
}

export function deletePeer(peers: PeerProfile[], id: string): PeerProfile[] {
    return peers.filter((p) => p.id !== id);
}
