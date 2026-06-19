import { useMemo } from 'react';
import { loadSessions } from '../core/sessions/sessionStore';
import { loadPeers } from '../core/peers/peerRegistryStore';
import { loadActiveTeam } from '../core/peers/activeTeamStore';
import { HUMAN_PEER } from '../core/peers/humanPeer';
import { computeInclusionState } from '../core/governance/inclusionState';
import { calculateCoherence } from '../core/governance/coherenceMetric';
import { RATIONAL_SYNTHESIS_LENS, AFFECTIVE_SYNTHESIS_LENS } from '../core/governance/systemLenses';
import { MOCK_TELEMETRY } from '../types';
import { useLocation } from 'react-router-dom';

/**
 * useCurrentCoherence
 * 
 * Hook to retrieve the coherence percentage for the currently active or selected session.
 * Used in the Header to display the global "Coherence" metric.
 */
export function useCurrentCoherence() {
    const location = useLocation();

    // We re-load or derive the state. 
    // In a mature app, this would come from a global State Manager or Context.
    // For now, we derive it from sessionStore to satisfy the "derived from real state" rule.

    const coherence = useMemo(() => {
        const sessions = loadSessions();
        const sessionId = location.state?.sessionId;

        // 1. Find the most relevant session (explicit context or just first active)
        const currentSession = sessionId
            ? sessions.find(s => s.id === sessionId)
            : sessions.find(s => s.status === 'Active');

        if (!currentSession) return null;

        // 2. Load necessary registries
        const rawPeers = loadPeers();
        const activeTeam = loadActiveTeam();
        const aiPeers = rawPeers.filter(p => p.enabled && activeTeam.selectedPeerIds.includes(p.id));
        const registryPeers = [HUMAN_PEER, ...aiPeers];

        // 3. Define the artifact context
        const artifact = {
            id: currentSession.artifactId || 'current-artifact',
            domainTags: [], // Metadata might be lost here, but we can try to recover it if needed
            status: "Active" as const,
            isHighImpact: false // Default/Fallback
        };

        // 4. Define lenses (Static list for now, same as in ChamberLayout)
        const governLenses = [
            ...MOCK_TELEMETRY.lenses.map(l => ({
                id: l.name,
                domains: l.domains,
                autoReview: false
            })),
            { id: RATIONAL_SYNTHESIS_LENS, domains: [], autoReview: false },
            { id: AFFECTIVE_SYNTHESIS_LENS, domains: [], autoReview: false }
        ];

        // 5. Compute inclusion state
        const inclusion = computeInclusionState(
            artifact,
            registryPeers.map(p => ({
                id: p.id,
                type: p.type,
                domains: p.domains
            })),
            governLenses,
            currentSession.eventLog
        );

        // 6. Calculate Coherence
        return {
            percent: calculateCoherence(inclusion),
            sessionId: currentSession.id
        };
    }, [location.state?.sessionId]);

    return coherence;
}
