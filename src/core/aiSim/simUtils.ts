import { PERSONA_PACK } from './rolePack';
import type { Message } from '../../types';

export const stableHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash);
};

export interface AutoReplyTurn {
    personaId: string;
    body: string;
    keyPoints: string[];
}

export const generateAutoReply = (
    personaId: string,
    mode: string,
    threadId: string | null,
    threadTitle: string | undefined,
    anchorMessage: Message | undefined,
    recentMsgs: Message[],
    priorTurns: AutoReplyTurn[] = []
): { body: string, variantId: string, pointsUsed: string[], pointsSkipped: string[] } => {
    const persona = PERSONA_PACK[personaId] || PERSONA_PACK.lumin;
    const cleanText = (txt: string) => txt.replace(/\S+@\S+/g, '[email]').replace(/\n/g, ' ').trim();
    const snippet = anchorMessage ? cleanText(anchorMessage.body).slice(0, 120) : 'the conversation';

    // 1. Select Deterministic Variant
    const seed = `${threadId}-${anchorMessage?.id || 'none'}-${personaId}`;
    const variantIndex = stableHash(seed) % (persona.variants?.length || 1);
    const variant = persona.variants?.[variantIndex] || { id: 'direct', description: 'direct' };

    // 2. Lane Awareness
    const allPriorPoints = new Set(priorTurns.flatMap(t => t.keyPoints));
    const pointsUsed: string[] = [];
    const pointsSkipped: string[] = [];

    persona.keyPointCategories?.forEach(cat => {
        if (allPriorPoints.has(cat)) pointsSkipped.push(cat);
        else pointsUsed.push(cat);
    });

    const head = `${persona.label}:`;
    let bodyContent = "";
    const endQuestion = persona.questionStyle;

    if (mode === 'Summarize last 3') {
        const last3 = recentMsgs.slice(-3);
        const summary = last3.map((m, i) => `${i + 1}) ${cleanText(m.body).slice(0, 50)}`).join('\n');
        bodyContent = `Summary recap:\n${summary || 'Minimal history.'}`;
    } else {
        // Apply persona breathing rules
        switch (personaId) {
            case 'lumin':
                if (variant.id === 'direct') {
                    bodyContent = `Target: ${threadTitle || 'Analysis'}\nAction: Cross-verify "${snippet.slice(0, 30)}..."`;
                } else if (variant.id === 'question_first') {
                    bodyContent = `How do you define success here?\n- Unknown variables in logic\n- Validation gap for "${snippet.slice(0, 20)}..."`;
                } else { // compressed
                    bodyContent = `• Logic gap: verify\n• State: ambiguous\n• Source check: "${snippet.slice(0, 20)}..."`;
                }
                break;
            case 'haven':
                if (variant.id === 'gentle') {
                    bodyContent = `If you want, we could try (A) deep-dive or (B) alignment pause. Either works.`;
                } else if (variant.id === 'compressed') {
                    bodyContent = `Option A / Option B / Which feels better for "${snippet.slice(0, 20)}"?`;
                } else { // direct
                    bodyContent = `I try to align on: "${snippet.slice(0, 30)}". Options: 1) Propose 2) Refine.`;
                }
                break;
            case 'shield':
                if (variant.id === 'minimal') {
                    bodyContent = `What decision should be recorded? Any scope boundary for "${snippet.slice(0, 20)}"?`;
                } else if (variant.id === 'compressed') {
                    bodyContent = `• Governance: active\n• Boundary: checked`;
                } else { // direct
                    bodyContent = `Note: Simulated log for "${snippet.slice(0, 30)}". Checking boundary.`;
                }
                break;
            case 'echo':
                if (variant.id === 'sequencing') {
                    bodyContent = `Next → Draft Task → Next → Sync Presence → Confirm?`;
                } else if (variant.id === 'compressed') {
                    bodyContent = `[ ] Task: "${snippet.slice(0, 20)}..." [ ] Sync [ ] Done`;
                } else { // direct
                    bodyContent = `Tasks: refine "${snippet.slice(0, 20)}". Who owns?`;
                }
                break;
            default:
                bodyContent = `Role context: ${persona.mission}`;
        }
        if (pointsSkipped.length > 0) bodyContent += `\n(Skipping repeats: ${pointsSkipped.join(', ')})`;
    }

    const result = `${head}\n\n${bodyContent}\n\n${endQuestion}`;
    const finalBody = result.split(' ').slice(0, 90).join(' ');

    return { body: finalBody, variantId: variant.id, pointsUsed, pointsSkipped };
};
