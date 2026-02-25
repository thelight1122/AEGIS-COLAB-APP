import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { loadSessions } from '../core/sessions/sessionStore';

/**
 * useCoherencePercent
 * 
 * Computes a real coherence number derived from the active session's eventLog.
 * If there is no active session or too little signal (< 5 events), returns null.
 * 
 * Constructive (Weight 1.0): AWARENESS_ACK, CONTRIBUTION, PROXY_REVIEW, LOCK_REQUEST, AI_CHAT_COMPLETED
 * Friction: AI_CHAT_FAILED (1.0), DEFER_LENS (0.5), lens_deferral_with_rationale (0.5), SESSION_CLEARED (1.0)
 */
export function useCoherencePercent() {
    const location = useLocation();

    return useMemo(() => {
        const sessions = loadSessions();
        const sessionId = location.state?.sessionId;

        const currentSession = sessionId
            ? sessions.find(s => s.id === sessionId)
            : sessions.find(s => s.status === 'Active');

        if (!currentSession || !currentSession.eventLog || currentSession.eventLog.length < 5) {
            return null;
        }

        const log = currentSession.eventLog;

        const constructiveTypes = [
            'AWARENESS_ACK',
            'CONTRIBUTION',
            'PROXY_REVIEW',
            'LOCK_REQUEST',
            'AI_CHAT_COMPLETED'
        ];

        const constructiveCount = log.filter(e => constructiveTypes.includes(e.type)).length;

        let frictionWeight = 0;
        log.forEach(e => {
            if (e.type === 'AI_CHAT_FAILED' || e.type === 'SESSION_CLEARED') {
                frictionWeight += 1.0;
            } else if (e.type === 'DEFER_LENS' || e.type === 'lens_deferral_with_rationale') {
                frictionWeight += 0.5;
            }
        });

        const totalWeight = constructiveCount + frictionWeight;
        if (totalWeight === 0) return 0;

        const raw = constructiveCount / totalWeight;
        return Math.min(100, Math.max(0, Math.round(raw * 100)));
    }, [location.state?.sessionId]);
}
