import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { loadSessions } from '../core/sessions/sessionStore';

export interface CoherenceResult {
    percent: number;
    reason: string;
}

/**
 * useCoherencePercent
 * 
 * Computes a real coherence number derived from the active session's eventLog,
 * or aggregates all session histories if no active session requires computation.
 */
export function useCoherencePercent(): CoherenceResult {
    const location = useLocation();

    return useMemo(() => {
        const sessions = loadSessions();
        const sessionId = location.state?.sessionId;

        const currentSession = sessionId
            ? sessions.find(s => s.id === sessionId)
            : sessions.find(s => s.status === 'Active');

        // Identify appropriate log context
        let log = currentSession?.eventLog || [];
        let isAggregate = false;

        if (log.length < 5) {
            // Aggregate all log histories across sessions for a more substantial reading
            const allLogs = sessions.flatMap(s => s.eventLog || []);
            if (allLogs.length > log.length) {
                log = allLogs;
                isAggregate = true;
            }
        }

        if (log.length === 0) {
            return { 
                percent: 100, 
                reason: "Perfect coherence. No requirement conflicts or friction logged in blank slate." 
            };
        }

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
        if (totalWeight === 0) {
            return { 
                percent: 100, 
                reason: `Balanced baseline alignment. No explicit friction logged across ${isAggregate ? 'aggregate history' : 'active session'}.` 
            };
        }

        const raw = constructiveCount / totalWeight;
        const percent = Math.min(100, Math.max(0, Math.round(raw * 100)));

        return {
            percent,
            reason: `${percent}% aggregate alignment (${constructiveCount} constructive vs ${frictionWeight} friction weighs)`
        };
    }, [location.state?.sessionId]);
}
