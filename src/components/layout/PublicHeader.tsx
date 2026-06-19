import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Button } from '../ui/button';

export function PublicHeader() {
    return (
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
                <nav className="hidden md:flex items-center gap-8">
                    <Link className="text-sm font-medium text-slate-500 hover:text-[#197fe6] transition-colors" to="/framework">Framework</Link>
                    <Link className="text-sm font-medium text-slate-500 hover:text-[#197fe6] transition-colors" to="/governance">Governance</Link>
                    <Link className="text-sm font-medium text-slate-500 hover:text-[#197fe6] transition-colors" to="/buildmaster">Buildmaster</Link>
                    <Link className="text-sm font-medium text-slate-500 hover:text-[#197fe6] transition-colors" to="/commons">Commons</Link>
                </nav>
                <div className="flex items-center gap-3">
                    <Link to="/commons">
                        <Button variant="outline" className="hidden sm:flex border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold px-5 h-9 text-sm hover:border-[#197fe6]/40 transition-all">
                            Commons Workshop
                        </Button>
                    </Link>
                    <a href="https://adamalign.com" target="_blank" rel="noopener noreferrer">
                        <Button className="bg-[#197fe6] hover:bg-[#197fe6]/90 text-white font-bold px-5 h-9 text-sm">
                            Enter EcoVerse
                        </Button>
                    </a>
                </div>
            </div>
        </header>
    );
}
