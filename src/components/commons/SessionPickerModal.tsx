import React, { useState, useEffect } from 'react';
import { X, Search, Filter, Play, Archive, Calendar, Users, Cpu } from 'lucide-react';
import { loadSessions, closeSession, saveSessions } from '../../core/sessions/sessionStore';
import type { Session } from '../../core/sessions/types';
import { useArchive } from '../../contexts/ArchiveContext';

interface SessionPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectSession: (sessionId: string) => void;
}

export function SessionPickerModal({ isOpen, onClose, onSelectSession }: SessionPickerModalProps) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [modeFilter, setModeFilter] = useState<'all' | 'one-on-one' | 'ai-peer'>('all');
    const { status: archiveLockStatus, archiveItem } = useArchive();

    useEffect(() => {
        if (isOpen) {
            setSessions(loadSessions());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleArchiveSession = async (session: Session) => {
        if (archiveLockStatus !== 'unlocked') {
            alert('Archive Vault is locked. Please unlock it in Settings first.');
            return;
        }

        if (confirm(`Send session ${session.id} to the Secured Archive? This will encrypt and store it safely.`)) {
            try {
                // Archive session payload
                await archiveItem(
                    `Chamber Session: ${session.id}`,
                    'session',
                    session,
                    ['session-history', session.lessonMode || 'generic', `participants-${session.participants.length}`]
                );

                // Update session state in local store to Closed or delete it
                const nextSessions = closeSession(sessions, session.id);
                saveSessions(nextSessions);
                setSessions(nextSessions);
                alert(`Session ${session.id} successfully archived.`);
            } catch (err) {
                alert(`Archiving failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        }
    };

    const filteredSessions = sessions.filter(s => {
        const matchesQuery = s.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
            s.participants.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
        
        if (modeFilter === 'all') return matchesQuery;
        return matchesQuery && s.lessonMode === modeFilter;
    });

    const formatDate = (timestamp?: number) => {
        if (!timestamp) return 'Unknown';
        return new Date(timestamp).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#16202a] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div>
                        <h2 className="text-xl font-bold text-white">Historical Calibration Sessions</h2>
                        <p className="text-xs text-slate-400 mt-1">Select a session to resume or move it to the secure archive.</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Close Session Picker" aria-label="Close Session Picker">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 bg-[#1a242e] border-b border-slate-800 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by Session ID or Peer IDs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#111921] border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-primary focus:outline-none transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-500" />
                        <select
                            value={modeFilter}
                            onChange={(e: any) => setModeFilter(e.target.value)}
                            className="bg-[#111921] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                            title="Filter by Lesson Mode"
                            aria-label="Filter by Lesson Mode"
                        >
                            <option value="all">All Lesson Modes</option>
                            <option value="one-on-one">One-on-One</option>
                            <option value="ai-peer">AI Peer</option>
                        </select>
                    </div>
                </div>

                {/* Session List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {filteredSessions.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 space-y-2">
                            <Users className="w-12 h-12 mx-auto opacity-20" />
                            <p className="text-sm font-medium">No sessions found matching your filters.</p>
                        </div>
                    ) : (
                        filteredSessions.map(session => (
                            <div 
                                key={session.id} 
                                className="bg-[#1c2834] border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-sm font-bold text-primary">{session.id}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                            session.status === 'Active' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                            session.status === 'Closed' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' :
                                            'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                        }`}>
                                            {session.status}
                                        </span>
                                        {session.lessonMode && (
                                            <span className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full capitalize">
                                                {session.lessonMode} Mode
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 opacity-70" />
                                            Active: {formatDate(session.lastActiveAt || session.startedAt)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3.5 h-3.5 opacity-70" />
                                            Peers: {session.participants.length}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                                    {session.status !== 'Closed' && (
                                        <button
                                            onClick={() => onSelectSession(session.id)}
                                            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/95 text-background-dark font-bold text-xs rounded-lg shadow-sm transition-all flex-1 sm:flex-none"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-background-dark" />
                                            Resume
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleArchiveSession(session)}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs transition-all flex-1 sm:flex-none"
                                    >
                                        <Archive className="w-3.5 h-3.5" />
                                        Archive
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
}

export default SessionPickerModal;
