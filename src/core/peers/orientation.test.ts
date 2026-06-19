import { describe, expect, it } from 'vitest';
import {
    createUnverifiedOrientation,
    createVerifiedOrientation,
    getOrientationLabel,
    markOrientationStale,
} from './orientation';

describe('peer orientation helpers', () => {
    it('creates an unverified orientation by default', () => {
        const orientation = createUnverifiedOrientation({ source: 'commons_session', facet: 'system' });
        expect(orientation.status).toBe('unverified');
        expect(orientation.source).toBe('commons_session');
        expect(orientation.facet).toBe('system');
    });

    it('creates a verified orientation with a timestamp', () => {
        const orientation = createVerifiedOrientation({
            source: 'peer_context',
            facet: 'peer',
            receipt: 'ctx-session-1',
        });
        expect(orientation.status).toBe('verified');
        expect(orientation.receipt).toBe('ctx-session-1');
        expect(orientation.orientedAt).toBeTruthy();
    });

    it('marks an orientation stale while preserving prior metadata', () => {
        const verified = createVerifiedOrientation({
            source: 'peer_context',
            facet: 'peer',
            receipt: 'ctx-session-1',
        });
        const stale = markOrientationStale(verified);
        expect(stale.status).toBe('stale');
        expect(stale.receipt).toBe('ctx-session-1');
    });

    it('formats orientation labels predictably', () => {
        expect(getOrientationLabel(createUnverifiedOrientation())).toBe('Unverified');
        expect(getOrientationLabel(markOrientationStale(undefined))).toBe('Stale');
        expect(getOrientationLabel(createVerifiedOrientation({ source: 'manual', facet: 'observer' }))).toBe('Verified');
    });
});
