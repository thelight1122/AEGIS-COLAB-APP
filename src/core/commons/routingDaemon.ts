export interface TurnTarget {
    peerId: string;
    handle: string;
    type: 'ai' | 'human';
    classification?: string;
}

/**
 * Parses message content for mentions of registered handles (e.g. @vespar, @base).
 * Returns the matching participants in the order they were mentioned.
 */
export function parseIntendedRecipient(
    content: string,
    availablePeers: { id: string; handle: string; type: 'ai' | 'human'; classification?: string }[]
): TurnTarget[] {
    const mentions = content.match(/@[\w\-]+/g);
    if (!mentions) return [];

    const targets: TurnTarget[] = [];
    const seenIds = new Set<string>();

    for (const mention of mentions) {
        const matchedPeer = availablePeers.find(
            p => p.handle.toLowerCase() === mention.toLowerCase()
        );
        if (matchedPeer && !seenIds.has(matchedPeer.id)) {
            seenIds.add(matchedPeer.id);
            targets.push({
                peerId: matchedPeer.id,
                handle: matchedPeer.handle,
                type: matchedPeer.type,
                classification: matchedPeer.classification,
            });
        }
    }
    return targets;
}
