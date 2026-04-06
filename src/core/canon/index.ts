/**
 * AEGIS CANON — Single Export Point
 *
 * This is the immutable foundation of every AEGIS application.
 * Import from here. Never duplicate these definitions elsewhere.
 *
 * If something in the codebase contradicts these exports, the codebase is wrong.
 * If a session drifts from these definitions, the drift is detectable here.
 *
 * Source documents (all locked):
 *   - AEGIS Canon v1.0
 *   - AEGIS Core v1.0
 *   - AEGIS Canonical Glossary v1.0
 *   - AEGIS Canon Appendix — DataQuad Extensions v1.0-A
 *   - AEGIS Canon Appendix — HME v1.0
 *   - AEGIS Canon Appendix — TCE v1.0
 *   - AEGIS Canon Appendix — MOM v1.0
 *   - AEGIS Canon Appendix — MOP v1.0
 *   - AEGIS Implementation Appendix — TurboQuant v1.0-IQ
 *   - AEGIS Implementation Appendix — LATTICE Entry Schema v1.0-LS
 *   - IDR & IDQRA Logic Loop document
 *   - Shadow Effects document
 *   - AEGIS Standards & Constraints
 *   - Governance Integrity Validation Protocol v1.0
 */

// ── Axioms ────────────────────────────────────────────────────────────────────
export { AXIOMS, getAxiom } from './aegis-axioms';
export type { Axiom } from './aegis-axioms';

// ── Virtues ───────────────────────────────────────────────────────────────────
export { VIRTUES, VIRTUE_NAMES, getVirtue } from './aegis-virtues';
export type { Virtue, VirtueDefinition } from './aegis-virtues';

// ── Ethos, Imperatives, Authority, Forbidden Language ─────────────────────────
export {
    ETHOS,
    IMPERATIVES,
    AUTHORITY_PRINCIPLES,
    FORBIDDEN_UI_WORDS,
    ALLOWED_UI_ALTERNATIVES,
} from './aegis-ethos';
export type { EthosStatement, Imperative } from './aegis-ethos';

// ── DataQuad Architecture ─────────────────────────────────────────────────────
export {
    DATAQUAD_TENSORS,
    LATTICE_DEFINITION,
    LATTICE_RELATIONSHIP_TYPES,
    HME_DEFINITION,
    TCE_DEFINITION,
    TURBOQUANT_DEFINITION,
    SSSP_DEFINITION,
    SYSTEM_LAYERS,
} from './aegis-dataquad';
export type {
    TensorDefinition,
    TensorKey,
    LatticeRelationshipType,
    LatticeEntry,
} from './aegis-dataquad';

// ── Interaction Sequences ─────────────────────────────────────────────────────
export {
    IDS_SEQUENCE,
    IDR_SEQUENCE,
    IDQRA_SEQUENCE,
    ALL_SEQUENCES,
} from './aegis-sequences';
export type { InteractionSequence } from './aegis-sequences';

// ── Signal Taxonomy & Shadow Affects ─────────────────────────────────────────
export { SIGNAL_TYPES, SHADOW_AFFECTS } from './aegis-signals';
export type { SignalType, ShadowAffect, ShadowAffectName } from './aegis-signals';

// ── MOP, MOM, RBC, CO ─────────────────────────────────────────────────────────
export {
    MOM_ORIGINATION_CONDITIONS,
    MOM_NON_ORIGINATION,
    MOP_ALLOWED_FORMS,
    MOP_DISALLOWED_FORMS,
    MOP_VIOLATIONS,
    MOP_BOUNDARY,
    RBC_DEFINITION,
    CO_DEFINITION,
} from './aegis-mop';
