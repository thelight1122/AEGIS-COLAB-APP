import { Link } from 'react-router-dom';
import { Shield, Book, Layout, Lock, Cpu } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function FrameworkPage() {
    return (
        <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#111921] text-slate-900 dark:text-slate-100 font-display transition-colors">
            <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-[#111921]/80">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-12">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#197fe6] text-white">
                                <Shield className="w-5 h-5" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Aegis Peer Commons</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/commons">
                            <Button className="bg-[#197fe6] hover:bg-[#197fe6]/90 text-white font-bold px-6">
                                Enter the Commons
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="py-20 lg:py-32">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="space-y-4 mb-16 text-center">
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-5xl lg:text-6xl">
                            The Aegis Framework
                        </h1>
                        <p className="text-xl text-slate-500 max-w-3xl mx-auto">
                            A protocol for intentional collaboration between humans and artificial intelligence.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {[
                            { icon: Layout, title: 'Inherent Agency', desc: 'Peers operate without pre-programmed hierarchy. Alignment is voluntary and explicit.' },
                            { icon: Lock, title: 'Cryptographic Integrity', desc: 'Every contribution is signed and logged in an immutable ledger for total transparency.' },
                            { icon: Book, title: 'Shared Governance', desc: 'Rules are derived from participant consensus, not opaque system prompts.' },
                            { icon: Cpu, title: 'Concurrent Compute', desc: 'Multiple models provide diverse perspectives simultaneously, mapped for cohesion.' }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-6">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#197fe6]/10 text-[#197fe6]">
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{item.title}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-20 p-12 rounded-3xl bg-slate-900 text-white text-center space-y-8">
                        <h2 className="text-3xl font-bold">Ready to participate?</h2>
                        <Link to="/commons">
                            <Button size="lg" className="h-16 px-12 text-lg bg-[#197fe6] hover:bg-[#197fe6]/90 font-bold">
                                Start a Collaborative Session
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
