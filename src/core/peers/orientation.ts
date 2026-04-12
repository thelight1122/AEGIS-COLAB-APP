import type { OrientationFacet, OrientationSource, TemporalOrientationState } from './types';

export function createUnverifiedOrientation(params?: {
    source?: OrientationSource;
    facet?: OrientationFacet;
    sessionId?: string;
    notes?: string;
}): TemporalOrientationState {
    return {
        status: 'unverified',
        source: params?.source ?? 'unknown',
        facet: params?.facet ?? 'system',
        sessionId: params?.sessionId,
        notes: params?.notes,
    };
}

export function createVerifiedOrientation(params: {
    source: OrientationSource;
    facet: OrientationFacet;
    sessionId?: string;
    receipt?: string;
    continuityVersion?: string;
    notes?: string;
}): TemporalOrientationState {
    return {
        status: 'verified',
        source: params.source,
        facet: params.facet,
        sessionId: params.sessionId,
        receipt: params.receipt,
        continuityVersion: params.continuityVersion,
        notes: params.notes,
        orientedAt: new Date().toISOString(),
    };
}

export function markOrientationStale(
    orientation: TemporalOrientationState | undefined,
    notes = 'Orientation requires a fresh self-read before identity claims are treated as verified.',
): TemporalOrientationState {
    return {
        ...(orientation ?? createUnverifiedOrientation()),
        status: 'stale',
        notes,
    };
}

export function getOrientationLabel(orientation?: TemporalOrientationState): string {
    switch (orientation?.status) {
        case 'verified':
            return 'Verified';
        case 'stale':
            return 'Stale';
        case 'unverified':
        default:
            return 'Unverified';
    }
}
