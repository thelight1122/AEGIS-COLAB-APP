import React, { useState } from 'react';
import { X, Lock, Unlock, Search, Trash2, Download, Upload, ShieldCheck, FileText, Calendar, Tag, ChevronRight } from 'lucide-react';
import { useArchive } from '../../contexts/ArchiveContext';

interface ArchiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onResumeSession?: (session: any) => void;
}

export function ArchiveModal({ isOpen, onClose, onResumeSession }: ArchiveModalProps) {
    const {
        status,
        manifest,
        unlockArchive,
        retrieveItem,
        removeItem,
        exportVault,
        importVault
    } = useArchive();

    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [selectedPayload, setSelectedPayload] = useState<any | null>(null);
    const [isLoadingPayload, setIsLoadingPayload] = useState(false);

    if (!isOpen) return null;

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const ok = await unlockArchive(passcode);
        if (ok) {
            setPasscode('');
        } else {
            setError('Unlock failed. Invalid passcode.');
        }
    };

    const handleViewEntry = async (id: string) => {
        setIsLoadingPayload(true);
        setSelectedEntryId(id);
        setSelectedPayload(null);
        try {
            const data = await retrieveItem(id);
            setSelectedPayload(data);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to decrypt payload.');
            setSelectedEntryId(null);
        } finally {
            setIsLoadingPayload(false);
        }
    };

    const handleDeleteEntry = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to permanently delete this archived item? This cannot be undone.')) {
            removeItem(id);
            if (selectedEntryId === id) {
                setSelectedEntryId(null);
                setSelectedPayload(null);
            }
        }
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const count = await importVault(file);
            alert(`Import successful: ${count} entries added.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed.');
        }
    };

    const filteredEntries = manifest?.entries.filter(entry => 
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || [];

    const formatDate = (isoStr: string) => {
        return new Date(isoStr).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-[#121b24] border border-slate-800 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-[#16202a]">
                    <div className="flex items-center gap-2 text-green-400">
                        <ShieldCheck className="w-6 h-6" />
                        <div>
                            <h2 className="text-xl font-bold text-white">Secured Archive Vault</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Isolated AES-GCM local cryptographic records</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Close Archive Vault" aria-label="Close Archive Vault">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {status === 'locked' || status === 'empty' ? (
                    /* Locked View */
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#111921] space-y-6">
                        <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full">
                            <Lock className="w-8 h-8" />
                        </div>
                        <div className="text-center max-w-sm space-y-2">
                            <h3 className="text-lg font-bold text-white">Vault Access Protected</h3>
                            <p className="text-sm text-slate-400">
                                {status === 'empty'
                                    ? "Vault passcode is not set up on this device. Please visit Settings first to configure the Archive passcode."
                                    : "Enter your Archive passcode to unlock the cryptographic indices and decrypt your records."}
                            </p>
                        </div>
                        {status === 'locked' && (
                            <form onSubmit={handleUnlock} className="flex gap-2 w-full max-w-xs">
                                <input
                                    type="password"
                                    placeholder="Enter passcode..."
                                    value={passcode}
                                    onChange={(e) => setPasscode(e.target.value)}
                                    className="flex-1 bg-[#1a242e] border border-slate-850 rounded-lg px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
                                    autoFocus
                                />
                                <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold text-sm rounded-lg transition-colors">
                                    Unlock
                                </button>
                            </form>
                        )}
                        {error && (
                            <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg">
                                {error}
                            </p>
                        )}
                    </div>
                ) : (
                    /* Unlocked Dashboard */
                    <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-[#0f171e]">
                        
                        {/* Sidebar: Entries List */}
                        <div className="w-full md:w-2/5 border-r border-slate-800 flex flex-col min-h-0">
                            {/* Search and Actions */}
                            <div className="p-4 border-b border-slate-800 bg-[#141d26] space-y-3 shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Search archives..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-[#10171e] border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={exportVault} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors">
                                        <Download className="w-3.5 h-3.5" />
                                        Export
                                    </button>
                                    <div className="relative flex-1">
                                        <input
                                            type="file"
                                            accept=".aegis"
                                            onChange={handleImportFile}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            title="Import archive file"
                                            aria-label="Import archive file"
                                        />
                                        <button className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors">
                                            <Upload className="w-3.5 h-3.5" />
                                            Import
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Entries List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {filteredEntries.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 italic text-xs">
                                        No archives stored.
                                    </div>
                                ) : (
                                    filteredEntries.map(entry => (
                                        <div
                                            key={entry.id}
                                            onClick={() => handleViewEntry(entry.id)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-start gap-2 ${
                                                selectedEntryId === entry.id
                                                    ? 'bg-green-500/10 border-green-500/30'
                                                    : 'bg-[#151e27] border-slate-800 hover:border-slate-750'
                                            }`}
                                        >
                                            <div className="space-y-1.5 min-w-0">
                                                <h4 className="text-sm font-bold text-white truncate">{entry.title}</h4>
                                                <div className="flex flex-wrap gap-1">
                                                    <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded">
                                                        {entry.contentType}
                                                    </span>
                                                    {entry.tags.slice(0, 2).map((t, idx) => (
                                                        <span key={idx} className="text-[9px] text-green-400 bg-green-500/5 border border-green-500/15 px-1.5 py-0.5 rounded">
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 shrink-0" />
                                                    {formatDate(entry.archivedAt)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteEntry(entry.id, e)}
                                                className="p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors shrink-0"
                                                title="Delete archive entry"
                                                aria-label="Delete archive entry"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Content Viewer Panel */}
                        <div className="flex-1 flex flex-col min-h-0 bg-[#0c1218] p-6">
                            {selectedEntryId ? (
                                <div className="flex-1 flex flex-col min-h-0 space-y-4">
                                    {isLoadingPayload ? (
                                        <div className="flex-grow flex items-center justify-center text-slate-400 gap-2">
                                            <Unlock className="w-5 h-5 animate-bounce" />
                                            Decrypting secure payload...
                                        </div>
                                    ) : selectedPayload ? (
                                        <div className="flex-1 flex flex-col min-h-0 space-y-4">
                                            <div className="flex justify-between items-start shrink-0 pb-4 border-b border-slate-800">
                                                <div>
                                                    <h3 className="text-lg font-bold text-white">{selectedPayload.title || manifest?.entries.find(e => e.id === selectedEntryId)?.title}</h3>
                                                    <p className="text-xs text-slate-400 mt-1">Archived By: {selectedPayload.archivedBy || '@tracey'}</p>
                                                </div>
                                                {selectedPayload.id && onResumeSession && (
                                                    <button
                                                        onClick={() => onResumeSession(selectedPayload)}
                                                        className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                        Restore to Chamber
                                                    </button>
                                                )}
                                            </div>

                                            {/* Preview Pane */}
                                            <div className="flex-grow overflow-auto bg-[#0a0f14] border border-slate-850 rounded-xl p-4 font-mono text-xs text-slate-300">
                                                <pre className="whitespace-pre-wrap">
                                                    {JSON.stringify(selectedPayload, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-grow flex items-center justify-center text-red-500">
                                            Failed to load decrypted content.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-2">
                                    <FileText className="w-12 h-12 opacity-15" />
                                    <p className="text-sm font-medium">Select an archive entry to decrypt and preview details.</p>
                                </div>
                            )}
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}

export default ArchiveModal;
