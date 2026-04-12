import type { PeerProfile } from './types';
import { createVerifiedOrientation } from './orientation';

export const HUMAN_PEER: PeerProfile = {
    id: "human",
    handle: "@tracey",
    name: "Tracey",
    type: "human",
    provider: "lmstudio",
    model: "",
    enabled: true,
    domains: [],
    orientation: createVerifiedOrientation({
        source: 'manual',
        facet: 'observer',
        notes: 'Human observer is self-present by definition within the current session.',
    }),
};
