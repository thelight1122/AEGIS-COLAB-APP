# AEGIS E2E Storage Keys Report

This document lists the internal `localStorage` keys used by the AEGIS-COLAB application for state persistence. These are critical for E2E testing and deterministic state seeding.

## Core Storage Keys

| Key | Purpose | Defined In |
| :--- | :--- | :--- |
| `aegis.sessions.v0` | Registry of all sessions (Live Sessions) | `src/core/sessions/sessionStore.ts` |
| `aegis-peers-registry` | Peer directory and profile persistence | `src/lib/peerStore.ts` |
| `aegis_events_current-artifact` | Governance event stream for the current item | `src/components/chamber/ChamberLayout.tsx` |
| `aegis_metadata_current-artifact` | Metadata (Title, Domains) for the current item | `src/components/chamber/ChamberLayout.tsx` |

## E2E Reset Logic

The E2E harness (`src/core/e2e/e2eHarness.ts`) provides a `resetAppState()` function that clears all of the above keys to ensure a clean slate for each test run.

In E2E mode (`?e2e=1`), the application ignores default mock data, making it entirely dependent on these storage keys or harness seeding.
