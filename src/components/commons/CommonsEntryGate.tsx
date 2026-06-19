import React from 'react';
import { Play, FolderOpen, Archive, ShieldAlert } from 'lucide-react';

interface CommonsEntryGateProps {
    onNewSession: () => void;
    onResumeSession: () => void;
    onOpenArchive: () => void;
}

export function CommonsEntryGate({ onNewSession, onResumeSession, onOpenArchive }: CommonsEntryGateProps) {
    return (
        <div className="max-w-4xl mx-auto px-6 py-20 flex flex-col items-center justify-center space-y-12">
            <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary mb-6">
                    <ShieldAlert className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
                    AEGIS Education Chamber
                </h1>
                <p className="text-lg text-slate-400 max-w-xl mx-auto">
                    Manage sovereign peer dialogs, resume historical calibrations, or unlock the Secured Archive.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
                {/* Card 1: New Session */}
                <div
                    onClick={onNewSession}
                    className="group relative bg-[#1a242e] hover:bg-[#202c38] border border-slate-800 hover:border-primary/40 rounded-2xl p-6 flex flex-col items-center text-center cursor-pointer transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-primary/5"
                >
                    <div className="p-4 bg-primary/10 text-primary rounded-xl mb-4 group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-primary/20" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">New Session</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Configure new AI participants, set calibration constraints, and open a fresh Chamber field.
                    </p>
                </div>

                {/* Card 2: Resume Session */}
                <div
                    onClick={onResumeSession}
                    className="group relative bg-[#1a242e] hover:bg-[#202c38] border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-6 flex flex-col items-center text-center cursor-pointer transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-indigo-500/5"
                >
                    <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                        <FolderOpen className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Resume Session</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Select a suspended calibration session, restore memory matrices, and resume observation.
                    </p>
                </div>

                {/* Card 3: Secured Archive */}
                <div
                    onClick={onOpenArchive}
                    className="group relative bg-[#1a242e] hover:bg-[#202c38] border border-slate-800 hover:border-green-500/40 rounded-2xl p-6 flex flex-col items-center text-center cursor-pointer transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-green-500/5"
                >
                    <div className="p-4 bg-green-500/10 text-green-400 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                        <Archive className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Secured Archive</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Decrypt files inside the isolated vault, export manifest databases, or replay finalized lesson plans.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default CommonsEntryGate;
