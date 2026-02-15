import { useState } from 'react';
import { Save, Bot, Key, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const SETTINGS_KEY = 'aegis-system-settings';

interface SystemSettings {
    geminiKey: string;
    openaiKey: string;
    grokKey: string;
    lmStudioKey: string;
}

const defaultSettings: SystemSettings = {
    geminiKey: '',
    openaiKey: '',
    grokKey: '',
    lmStudioKey: '',
};

export default function Settings() {
    const [settings, setSettings] = useState<SystemSettings>(() => {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            return stored ? JSON.parse(stored) : defaultSettings;
        } catch {
            return defaultSettings;
        }
    });

    const [isSaved, setIsSaved] = useState(false);

    const handleSave = () => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const handleReset = () => {
        if (confirm('Are you sure you want to reset all settings?')) {
            setSettings(defaultSettings);
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
        }
    };

    return (
        <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
                <p className="text-muted-foreground mt-2">
                    Configure global application preferences and AI integrations.
                </p>
            </div>

            <div className="space-y-6">
                {/* AI Configuration Section */}
                <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Bot className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-card-foreground">AI Configuration</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Key className="w-4 h-4 opacity-70" />
                                Gemini API Key
                            </label>
                            <Input
                                type="password"
                                placeholder="Enter your Gemini API key"
                                value={settings.geminiKey}
                                onChange={(e) => setSettings({ ...settings, geminiKey: e.target.value })}
                                className="bg-muted/30 focus-visible:ring-primary"
                            />
                            <p className="text-[11px] text-muted-foreground italic">
                                Required for Google's Gemini models.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Key className="w-4 h-4 opacity-70" />
                                OpenAI API Key
                            </label>
                            <Input
                                type="password"
                                placeholder="Enter your OpenAI API key"
                                value={settings.openaiKey}
                                onChange={(e) => setSettings({ ...settings, openaiKey: e.target.value })}
                                className="bg-muted/30 focus-visible:ring-primary"
                            />
                            <p className="text-[11px] text-muted-foreground italic">
                                Required for GPT-4 and other OpenAI models.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Key className="w-4 h-4 opacity-70" />
                                Grok (xAI) API Key
                            </label>
                            <Input
                                type="password"
                                placeholder="Enter your Grok API key"
                                value={settings.grokKey}
                                onChange={(e) => setSettings({ ...settings, grokKey: e.target.value })}
                                className="bg-muted/30 focus-visible:ring-primary"
                            />
                            <p className="text-[11px] text-muted-foreground italic">
                                Required for xAI's Grok models.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Key className="w-4 h-4 opacity-70" />
                                LM Studio (Local)
                            </label>
                            <Input
                                type="password"
                                placeholder="Enter your LM Studio API key/endpoint"
                                value={settings.lmStudioKey}
                                onChange={(e) => setSettings({ ...settings, lmStudioKey: e.target.value })}
                                className="bg-muted/30 focus-visible:ring-primary"
                            />
                            <p className="text-[11px] text-muted-foreground italic">
                                Config for local model interaction via LM Studio.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Status Indicator */}
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={handleSave}
                            className="gap-2 px-6"
                        >
                            <Save className="w-4 h-4" />
                            Save Settings
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            className="gap-2 text-muted-foreground hover:text-destructive"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset
                        </Button>
                    </div>

                    {isSaved && (
                        <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            Changes saved successfully
                        </div>
                    )}
                </div>

                {/* Important Note */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400">Security Note</h4>
                        <p className="text-xs text-amber-600/90 dark:text-amber-400/80 leading-relaxed mt-1">
                            API keys are stored in your browser's local storage. They are never sent to our servers.
                            If you clear your browser data, you will need to re-enter them.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
