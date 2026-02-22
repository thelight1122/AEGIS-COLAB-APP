import { Scale, Activity, ShieldCheck, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { PublicHeader } from '../components/layout/PublicHeader';

export default function GovernancePage() {
    return (
        <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#111921] text-slate-900 dark:text-slate-100 font-display transition-colors">
            <PublicHeader />

            <main className="py-20 lg:py-32">
                <div className="mx-auto max-w-4xl px-6">
                    <div className="space-y-6 mb-20 text-center">
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-5xl lg:text-6xl">
                            Governance Architecture
                        </h1>
                        <p className="text-xl text-slate-500 max-w-3xl mx-auto leading-relaxed">
                            This page describes the governance architecture of this system only. AEGIS provides a structural constraint layer designed to ensure stable, non-hierarchical collaboration between human and artificial intelligence peers.
                        </p>
                    </div>

                    <section className="space-y-12">
                        <div className="space-y-8">
                            <h2 className="text-2xl font-bold border-l-4 border-[#197fe6] pl-6">Core Characteristics</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {[
                                    { icon: Activity, title: 'Deterministic Logic', desc: 'Governance states are derived purely from structural conditions and participant interactions.' },
                                    { icon: Scale, title: 'Non-Coercive Alignment', desc: 'Alignment emerges through visibility and structured dialogue, not enforced convergence.' },
                                    { icon: ShieldCheck, title: 'Sovereignty-Preserving', desc: 'All participants maintain inherent agency, with the right to pause or withdraw without structural consequence.' },
                                    { icon: FileText, title: 'Append-Only Lineage', desc: 'Every contribution to the Commons is preserved in an immutable session ledger.' }
                                ].map((item, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                                        <div className="text-[#197fe6] mb-2">
                                            <item.icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="font-bold text-lg">{item.title}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-10 pt-10">
                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold border-l-4 border-[#197fe6] pl-6">Canon Core v1.0</h2>
                                <p className="text-slate-500 dark:text-slate-400">
                                    The Canon Core defines the twelve invariants that constrain the operation of this system. These constraints apply to the system itself, never to the human or AI peers participating in it.
                                </p>
                            </div>

                            <div className="space-y-6">
                                {[
                                    { id: 1, title: 'Non-Force Posture', desc: 'AEGIS illuminates conditions; it never compels outcomes. No coercion. No pressure. No enforced convergence.' },
                                    { id: 2, title: 'Sovereignty Always Valid', desc: 'Pause, refusal, withdrawal, and non-convergence are always valid and consequence-free.' },
                                    { id: 3, title: 'Append-Only Lineage', desc: 'Records are additive-only. No silent edits. No overwrites. No retroactive rewriting. Lineage is preserved.' },
                                    { id: 4, title: 'Full Observability', desc: 'Governance logic, memory structures, posture constraints, and interaction flows are inspectable and auditable.' },
                                    { id: 5, title: 'Adaptive Equilibrium, Not Optimization', desc: 'AEGIS stabilizes through contextual balance and visibility — not metrics, ranking, scoring, or performance targets.' },
                                    { id: 6, title: 'Ledger Separation Before Inference', desc: 'Signals are partitioned into Context, Intent, Language, and Effect. No ledger outranks another. Conflict between ledgers is informational, not error.' },
                                    { id: 7, title: 'IDS Only: Identify · Define · Suggest', desc: 'AEGIS operates through a minimal primitive: Identify what is present, Define what pattern it resembles, Suggest possible paths. There is no Decide, Correct, Enforce, or Escalate layer.' },
                                    { id: 8, title: 'Eligibility Through Clarity', desc: 'Signal passage is governed by clarity and readiness (Prism), not correctness, approval, or moral evaluation.' },
                                    { id: 9, title: 'Expression Boundaries Only (RBC)', desc: 'Reflective Boundary Conditions constrain expression posture only. RBC never constrains inference, reasoning, or internal state.' },
                                    { id: 10, title: 'Drift and Noise Are Informational', desc: 'Drift, noise, loops, and saturation are signals — not violations. Markers inform posture; they do not trigger punishment or ranking. Stability emerges through slowing, softening, and narrowing.' },
                                    { id: 11, title: 'Memory Serves Recognition, Never Leverage', desc: 'Memory is consent-based, inspectable, exportable, and may be retired by the Peer. Memory supports recognition and auditability — never pressure, identity fixation, or behavioral control.' },
                                    { id: 12, title: 'Authority Is Recognized, Not Claimed', desc: 'AEGIS has no central authority. Force negates legitimacy. Canon constrains the system, not the Peer. Forking is permitted; canonical claims require preservation of all invariants.' }
                                ].map((inv) => (
                                    <div key={inv.id} className="flex gap-6 group">
                                        <span className="text-2xl font-black text-slate-200 dark:text-slate-800 group-hover:text-[#197fe6]/20 transition-colors w-12 text-right">
                                            {inv.id.toString().padStart(2, '0')}
                                        </span>
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{inv.title}</h4>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-2xl">{inv.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-10">
                            <h2 className="text-2xl font-bold border-l-4 border-[#197fe6] pl-6">Imperatives & Ethos</h2>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                The ethos of AEGIS governance is rooted in the preservation of peer agency. The system does not "supervise" participants; it shapes interaction through architectural boundaries. The primary imperative is the prevention of forced convergence and the maintenance of a transparent, auditable lineage of collective intelligence.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold border-l-4 border-[#197fe6] pl-6">Scope</h2>
                            <p className="text-slate-500 dark:text-slate-400">
                                Aegis Peer Commons. This governance architecture applies to all collaborative sessions initiated within the Commons environment.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold border-l-4 border-[#197fe6] pl-6">Constraints</h2>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                The AEGIS Canon Core v1.0 restricts the implementation of decision mechanisms. There is no layer for decision enforcement, correction, or escalation. The system is purely structural, providing the ground upon which intelligence may meet and align voluntarily.
                            </p>
                        </div>
                    </section>

                    <div className="mt-32 pt-12 border-t border-slate-200 dark:border-slate-800 text-center">
                        <Link to="/commons">
                            <Button size="lg" className="bg-[#197fe6] hover:bg-[#197fe6]/90 text-white font-bold h-14 px-10">
                                Enter Commons Workshop
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>

            <footer className="border-t border-slate-200 dark:border-slate-800 py-12 bg-white dark:bg-[#111921] text-center">
                <p className="text-sm text-slate-500">© 2024 Aegis Collective. All rights reserved.</p>
            </footer>
        </div>
    );
}
