import { AlertTriangle, Settings2 } from 'lucide-react';

export function ConfigStatus() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const isMissing = !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder');

    if (!isMissing) return null;

    return (
        <div className="bg-red-500/10 border-y border-red-500/20 px-6 py-2 flex items-center justify-between text-[11px] font-bold text-red-500 uppercase tracking-wider backdrop-blur-md z-50">
            <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 animate-pulse" />
                <span>Configuration Critical Failure: Supabase Credentials Missing or Invalid</span>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex gap-2">
                    {!supabaseUrl && <span className="underline decoration-dotted">URL MISSING</span>}
                    {!supabaseAnonKey && <span className="underline decoration-dotted">KEY MISSING</span>}
                </div>
                <div className="h-4 w-px bg-red-500/20" />
                <span className="text-muted-foreground normal-case font-medium">Update .env.local and restart facility</span>
                <Settings2 className="w-3.5 h-3.5 opacity-50" />
            </div>
        </div>
    );
}
