import { useState } from 'react';
import { Button } from '../components/ui/button';
import { ExternalLink, RefreshCw, TerminalSquare } from 'lucide-react';

export default function BuildmasterWorkshop() {
    const [key, setKey] = useState(0);

    return (
        <div className="h-full flex flex-col bg-[#0a0f14] text-slate-100 overflow-hidden">
            <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0a0f14]/80 backdrop-blur-md z-30 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#197fe6]/10 text-[#197fe6] flex items-center justify-center">
                        <TerminalSquare className="w-4 h-4" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight text-white">Buildmaster Agent Workshop</h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Local IDE</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setKey(k => k + 1)} className="h-8 gap-2 bg-transparent border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800">
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reload UI
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 gap-2 bg-transparent border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800" asChild>
                        <a href="http://localhost:5174/buildmasters" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open Externally
                        </a>
                    </Button>
                </div>
            </header>

            <div className="flex-1 min-h-0 bg-black">
                <iframe
                    key={key}
                    src="http://localhost:5174/buildmasters"
                    className="w-full h-full border-0"
                    title="Buildmaster Agent UI"
                />
            </div>
        </div>
    );
}
