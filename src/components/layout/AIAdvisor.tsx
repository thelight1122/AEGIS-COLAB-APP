import { useState, useRef, useEffect } from 'react';
import { useAdvisor } from '../../contexts/AdvisorContext';
import { Button } from '../ui/button';
import { 
    X, 
    Minus, 
    Send, 
    Paperclip, 
    Bot, 
    User,
    Loader2,
    AlertCircle
} from 'lucide-react';

export function AIAdvisor() {
    const [isOpen, setIsOpen] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [attachments, setAttachments] = useState<{ name: string; type: string; url: string }[]>([]);
    const { messages, addMessage, isResponding, advisorError } = useAdvisor();
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!messageText.trim() && attachments.length === 0) return;
        await addMessage(messageText, 'user', attachments.length > 0 ? attachments : undefined);
        setMessageText('');
        setAttachments([]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const newAttachment = {
                name: file.name,
                type: file.type,
                url: URL.createObjectURL(file) // Prototype local reference
            };
            setAttachments((prev) => [...prev, newAttachment]);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 font-display">
            {isOpen ? (
                <div className="w-85 h-112 bg-slate-900/90 backdrop-blur-lg border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
                    {/* Header */}
                    <div className="p-4 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-emerald-400" />
                            <div className="font-semibold text-sm text-slate-200">AI Advisor</div>
                            <div
                                className={`w-2 h-2 rounded-full ${advisorError ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`}
                                title={advisorError ? 'Advisor needs attention' : 'Gemini Advisor ready'}
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="w-7 h-7 hover:bg-slate-700" onClick={() => setIsOpen(false)} title="Minimize">
                                <Minus className="w-4 h-4 text-slate-400" />
                            </Button>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-2 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`p-1 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'advisor' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                        {msg.sender === 'advisor' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                    </div>
                                    <div className={`p-3 rounded-2xl text-xs break-words leading-relaxed ${msg.sender === 'advisor' ? 'bg-slate-800 text-slate-200 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none'}`}>
                                        {msg.text}
                                        {msg.attachments && msg.attachments.map((at, idx) => (
                                            <div key={idx} className="mt-1 flex items-center gap-1 p-1.5 bg-slate-900/40 rounded-md border border-slate-700/50 text-[10px]">
                                                <Paperclip className="w-3 h-3 text-slate-400" />
                                                <span className="truncate max-w-[120px]">{at.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isResponding && (
                            <div className="flex justify-start">
                                <div className="flex gap-2 max-w-[80%]">
                                    <div className="p-1 w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/20 text-emerald-400">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <div className="p-3 rounded-2xl text-xs leading-relaxed bg-slate-800 text-slate-300 rounded-tl-none flex items-center gap-2">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Gemini is responding
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Attachments Preview */}
                    {attachments.length > 0 && (
                        <div className="px-4 py-2 bg-slate-800/30 border-t border-slate-800 flex gap-2 overflow-x-auto">
                            {attachments.map((at, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 p-1 bg-slate-800 rounded-md border border-slate-700 pr-2 animate-in zoom-in-75">
                                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[10px] text-slate-300 truncate max-w-[100px]">{at.name}</span>
                                    <button className="text-slate-500 hover:text-slate-300" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} title="Remove attachment">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {advisorError && (
                        <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 text-[10px] text-amber-200 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{advisorError}</span>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-3 bg-slate-800/30 border-t border-slate-800 flex items-center gap-2">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            onChange={handleFileChange} 
                            id="advisor-file-upload"
                            title="Upload File"
                        />
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                            onClick={() => fileInputRef.current?.click()}
                            title="Attach File"
                        >
                            <Paperclip className="w-4 h-4" />
                        </Button>
                        <input 
                            type="text" 
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask Advisor..." 
                            disabled={isResponding}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                        <Button 
                            size="icon" 
                            className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
                            onClick={handleSend}
                            disabled={isResponding}
                            title="Send Message"
                        >
                            {isResponding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        </Button>
                    </div>
                </div>
            ) : (
                <div 
                    className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 cursor-pointer shadow-2xl flex items-center justify-center text-white transition-transform hover:scale-105 duration-200"
                    onClick={() => setIsOpen(true)}
                >
                    <Bot className="w-6 h-6 animate-pulse" />
                </div>
            )}
        </div>
    );
}
