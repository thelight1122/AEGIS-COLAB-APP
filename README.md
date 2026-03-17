# AEGIS Coherence Chamber

The **AEGIS Coherence Chamber** (`AEGIS-CoLAB_APP`) is a real-time collaborative workspace designed for **Human and AI Peers** to co-develop artifacts such as decisions, specifications, and mechanics.

It integrates structured contributions with non-coercive governance trackers to support collective synthesis without exerting force.

---

## 🚀 Core Workspace

The Chamber provides a visual canvas for mapping intelligence:

- **Structured Contributions**: Users contribute via **Identify / Define / Suggest** primitives.
- **Lens Coverage Overlay**: Visualization of perspective intersections and blind spots.
- **Awareness Tracking**: Measures acknowledgment, not consensus. Silence is not treated as agreement.
- **Inclusion Calculus**: A deterministic model that derives readiness scoring (`computeInclusionState`).
- **Lock Availability**: Controls (e.g., "Lock Version") become selectable only when inclusion thresholds are met structurally (`canLock`), creating lock conditions rather than enforcement constraints.

---

## ⚖️ Governance Posture

Within the **AEGIS Align EcoVerse**, the Coherence Chamber operates under a strict **non-force architecture**:

- **Illumination**: Surfacing gaps in lens intersection or missing awareness frames rather than blocking user input.
- **Append-Only Ledger**: All governance actions (such as `AWARENESS_ACK` or session clears) append to an immutable event log for auditability and replay.
- **Derived State**: The UI renders computed outcomes and does not make arbitrary governance decisions or state mutations.

---

## 🛠️ Development & Testing

### Real-Time Diagnostics

Run fast unit and integration triggers to safely test state transitions:

- **Start Workspace**: `npm run dev`
- **Unit Tests** (Session/Lock core): `npm run test:unit`
- **Governance Gate** (Integrity & calculus): `npm run test:governance`
- **Session Stabilization Gate**: `npm run test:sessions`
- **Full Testing Setup**: `npm run test:all`

---

## 📖 Supporting Documentation

Review detailed specifications inside the `docs/` folder:

- [**Overview**](file:///e:/AEGIS-COLAB-APP/docs/OVERVIEW.md)
- [**Standards & Constraints**](file:///e:/AEGIS-COLAB-APP/docs/STANDARDS_CONSTRAINTS.md)
- [**Activation Protocol**](file:///e:/AEGIS-COLAB-APP/docs/ACTIVATION_PROTOCOL.md)
- [**Glossary**](file:///e:/AEGIS-COLAB-APP/docs/GLOSSARY.md)
- [**Truth Note**](file:///e:/AEGIS-COLAB-APP/docs/TRUTH_NOTE.md)
