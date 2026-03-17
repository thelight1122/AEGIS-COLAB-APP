# AEGIS CoLAB_APP QA Checklist

<<<<<<< HEAD
## 1. Visual Aesthetics

- [ ] Dark mode is consistent across all pages.
- [ ] No layout shifts during navigation.
- [ ] Sidebar icons are properly aligned.
- [ ] Telemetry bars animate smoothly on load.

## 2. Interactive Features (Manual)

- [ ] **Chamber**:
- [ ] Nodes are draggable with smooth performance.
  - [ ] "Add Node" dialog opens and creates nodes correctly.
  - [ ] IDS Stream scroll is smooth.
- [ ] **Peers**:
  - [ ] "Add Peer" dialog validates inputs.
  - [ ] Data persists after full page reload (localStorage check).
  - [ ] Export JSON produces a valid file.
- [ ] **Lenses**:
  - [ ] Priority arrows reorder list correctly.
  - [ ] Toggle active/inactive visually dims the row.

## 3. Resilience

- [ ] Application does not crash on window resize.
- [ ] Empty states are shown if localStorage is cleared.
- [ ] Navigation works predictably using browser back/forward buttons.
=======
## 1. Route Integrity

- [ ] Landing page loads correctly.
- [ ] Framework page loads correctly.
- [ ] Governance page loads correctly.
- [ ] Chamber loads inside the app shell.
- [ ] Artifacts page loads and lists existing artifacts/sessions.
- [ ] Sessions page loads and handles empty/non-empty states.
- [ ] Peers route opens Team Setup correctly.
- [ ] Lenses page loads.
- [ ] Settings page loads.
- [ ] Board page handles authenticated and unauthenticated state cleanly.

## 2. Chamber / Artifact / Session Behavior

- [ ] Chamber renders without crashing.
- [ ] Telemetry panel renders.
- [ ] Artifact Matrix can select an artifact.
- [ ] Start Session works only when structurally available.
- [ ] Join Active Session routes into Chamber correctly.
- [ ] Session detail metrics render from current state.
- [ ] Replay area is labeled or treated as placeholder, not falsely presented as complete.

## 3. Team Setup / Peers

- [ ] Add Member flow works.
- [ ] Edit member flow works.
- [ ] Delete member flow works.
- [ ] Active team selection toggles correctly.
- [ ] Save Team preset works.
- [ ] Load preset works.
- [ ] Clear Team works.

## 4. Lenses

- [ ] Add Lens works.
- [ ] Edit Lens works.
- [ ] Delete Lens works.
- [ ] Priority arrows reorder correctly.
- [ ] Active/inactive toggle updates state correctly.
- [ ] Expanded charter/details render correctly.

## 5. Settings / Provider Vault

- [ ] Vault setup requires passphrase and confirmation.
- [ ] Unlock flow works with valid passphrase.
- [ ] Lock flow clears runtime access.
- [ ] Forget flow wipes local vault state.
- [ ] Provider secrets can be saved once unlocked.
- [ ] Settings copy does not overstate hosted/back-end secret management.

## 6. Governance Truth Checks

- [ ] Docs do not claim that UI invents governance state.
- [ ] Docs do not claim that silence equals agreement.
- [ ] Docs do not overstate distributed append-only infrastructure where behavior is still local/prototype.
- [ ] Lock availability is described as structural, not coercive.

## 7. Resilience

- [ ] Application does not crash on resize.
- [ ] Empty states are sane if local storage is cleared.
- [ ] Back/forward navigation behaves predictably.
- [ ] Session persistence rehydrates without creating duplicate active sessions.
>>>>>>> 0fc14ea7a0c6788b476e6b0418fd0291483a2543

---
**Verified By:** ____________________  
**Date:** ____________________
