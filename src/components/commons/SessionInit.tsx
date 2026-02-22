import { useState } from 'react';
import { useCommons } from '../../hooks/useCommons';
import type { ModelProvider, ConnectedModel } from '../../types/commons';
import { Shield, Check, AlertCircle, Loader2, Globe, Cpu } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

const MODEL_OPTIONS: { provider: ModelProvider, label: string, defaultModel: string }[] = [
    { provider: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o' },
    { provider: 'gemini', label: 'Gemini (Google)', defaultModel: 'gemini-1.5-pro' },
    { provider: 'anthropic', label: 'Anthropic', defaultModel: 'claude-3-5-sonnet' },
    { provider: 'grok', label: 'Grok (xAI)', defaultModel: 'grok-2-latest' }
];

const LOCAL_OPTIONS: { provider: ModelProvider, label: string, defaultEndpoint: string }[] = [
    { provider: 'lmstudio', label: 'LM Studio', defaultEndpoint: 'http://localhost:1234/v1' },
    { provider: 'ollama', label: 'Ollama', defaultEndpoint: 'http://localhost:11434' }
];

export function SessionInit() {
    const { connectedModels, addModel, validateModel, enterWorkshop } = useCommons();
    const [inputs, setInputs] = useState<Record<string, string>>({});
    const [localInputs, setLocalInputs] = useState<Record<string, { endpoint: string, model: string }>>({
        lmstudio: { endpoint: 'http://localhost:1234/v1', model: '' },
        ollama: { endpoint: 'http://localhost:11434', model: '' }
    });

    const handleAddHosted = (provider: ModelProvider, model: string) => {
        const key = inputs[provider];
        if (!key) return;
        addModel({ provider, model, apiKey: key, type: 'hosted' });
        setInputs(prev => ({ ...prev, [provider]: '' }));
    };

    const handleAddLocal = (provider: ModelProvider) => {
        const config = localInputs[provider as keyof typeof localInputs];
        if (!config.endpoint || !config.model) return;
        addModel({
            provider,
            model: config.model,
            endpointUrl: config.endpoint,
            type: 'local'
        });
    };

    const hasConnected = connectedModels.some((m: ConnectedModel) => m.status === 'Connected');

    const ModelCard = ({ opt, type }: { opt: { provider: ModelProvider, label: string, defaultModel?: string, defaultEndpoint?: string }, type: 'hosted' | 'local' }) => {
        const existing = connectedModels.find((m: ConnectedModel) => m.provider === opt.provider);
        return (
            <div key={opt.provider} className="bg-[#1a242e] border border-slate-800 rounded-xl p-6 space-y-6 flex flex-col transition-all hover:border-slate-700">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">{opt.label}</h3>
                    {existing?.status === 'Connected' && <Check className="w-5 h-5 text-green-500" />}
                    {existing?.status === 'Not Connected' && <AlertCircle className="w-5 h-5 text-yellow-500" />}
                </div>

                <div className="flex-1 space-y-4">
                    {type === 'hosted' ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">API KEY</label>
                                <input
                                    type="password"
                                    className="w-full bg-[#111921] border border-slate-800 rounded px-3 py-2 text-sm text-white focus:border-[#197fe6] outline-none transition-colors"
                                    placeholder="sk-..."
                                    value={inputs[opt.provider] || ''}
                                    onChange={(e) => setInputs(prev => ({ ...prev, [opt.provider]: e.target.value }))}
                                    disabled={!!existing}
                                />
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                                Default Model: {opt.defaultModel}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">ENDPOINT URL</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#111921] border border-slate-800 rounded px-3 py-2 text-sm text-white focus:border-[#197fe6] outline-none transition-colors"
                                    placeholder={opt.defaultEndpoint}
                                    value={localInputs[opt.provider as keyof typeof localInputs]?.endpoint || ''}
                                    onChange={(e) => setLocalInputs(prev => ({
                                        ...prev,
                                        [opt.provider]: { ...prev[opt.provider as keyof typeof localInputs], endpoint: e.target.value }
                                    }))}
                                    disabled={!!existing}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">MODEL NAME</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#111921] border border-slate-800 rounded px-3 py-2 text-sm text-white focus:border-[#197fe6] outline-none transition-colors"
                                    placeholder="e.g. llama3"
                                    value={localInputs[opt.provider as keyof typeof localInputs]?.model || ''}
                                    onChange={(e) => setLocalInputs(prev => ({
                                        ...prev,
                                        [opt.provider]: { ...prev[opt.provider as keyof typeof localInputs], model: e.target.value }
                                    }))}
                                    disabled={!!existing}
                                />
                            </div>
                        </>
                    )}
                </div>

                {!existing ? (
                    <Button
                        onClick={() => type === 'hosted' ? handleAddHosted(opt.provider, opt.defaultModel || '') : handleAddLocal(opt.provider)}
                        className="w-full bg-[#197fe6] hover:bg-[#197fe6]/90 text-white font-bold"
                        disabled={type === 'hosted' ? !inputs[opt.provider] : (!localInputs[opt.provider as keyof typeof localInputs]?.endpoint || !localInputs[opt.provider as keyof typeof localInputs]?.model)}
                    >
                        Connect Model
                    </Button>
                ) : (
                    <Button
                        onClick={() => validateModel(existing.id)}
                        className={cn(
                            "w-full font-bold",
                            existing.status === 'Connected'
                                ? "bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20"
                                : "bg-[#197fe6] text-white"
                        )}
                        disabled={existing.status === 'Connected' || existing.status === 'Validating'}
                    >
                        {existing.status === 'Validating' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {existing.status === 'Connected' ? 'Connected' : 'Validate Connection'}
                    </Button>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-full py-20 px-6 bg-[#111921] overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-16">
                <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-[#197fe6]/10 rounded-xl flex items-center justify-center text-[#197fe6] mb-6">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
                        Initialize Your Commons Session
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        You assemble your peer panel. API keys remain in your browser. We do not store or proxy them.
                    </p>
                </div>

                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <Globe className="w-5 h-5 text-slate-500" />
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Hosted Models</h2>
                        <div className="flex-1 h-px bg-slate-800" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {MODEL_OPTIONS.map((opt) => (
                            <ModelCard key={opt.provider} opt={opt} type="hosted" />
                        ))}
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <Cpu className="w-5 h-5 text-slate-500" />
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Local Models</h2>
                        <div className="flex-1 h-px bg-slate-800" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {LOCAL_OPTIONS.map((opt) => (
                            <ModelCard key={opt.provider} opt={opt} type="local" />
                        ))}
                    </div>
                </div>

                <div className="flex justify-center pt-8">
                    <Button
                        size="lg"
                        className={cn(
                            "h-16 px-12 text-lg font-bold transition-all",
                            hasConnected
                                ? "bg-[#197fe6] text-white shadow-xl shadow-[#197fe6]/20 hover:scale-[1.02]"
                                : "bg-slate-800 text-slate-500 cursor-not-allowed"
                        )}
                        disabled={!hasConnected}
                        onClick={enterWorkshop}
                    >
                        Enter Commons Workshop
                    </Button>
                </div>
            </div>
        </div>
    );
}
