# AEGIS Chamber QA Checklist

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

---
**Verified By:** Antigravity  
**Date:** 2026-02-15
