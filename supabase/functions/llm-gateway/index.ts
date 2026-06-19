import "jsr:@supabase/functions-js/edge-runtime.d.ts";
declare const Deno: {
    serve: (handler: (req: Request) => Promise<Response>) => void;
    env: {
        get: (key: string) => string | undefined;
    };
};

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface Peer {
    provider: string;
    model: string;
    baseURL?: string;
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { peer, messages }: { peer: Peer, messages: Message[] } = await req.json();
        const { provider, model, baseURL } = peer;

        // Get key from env
        const envKey = `${provider.toUpperCase()}_API_KEY`;
        const apiKey = Deno.env.get(envKey);

        if (!apiKey && provider !== 'local') {
            return new Response(JSON.stringify({ error: `Missing API key for ${provider}` }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Logic to talk to LLMs
        // We'll reimplement or import the adapter logic here
        // For simplicity in this script, I'll use the logic directly

        let result;
        if (provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            const systemMessage = messages.find(m => m.role === 'system');
            const systemInstruction = systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined;

            const contents = messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }));

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    systemInstruction,
                }),
            });
            const data = await res.json();
            result = {
                message: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
                usage: data.usageMetadata ? {
                    promptTokens: data.usageMetadata.promptTokenCount,
                    completionTokens: data.usageMetadata.candidatesTokenCount,
                    totalTokens: data.usageMetadata.totalTokenCount,
                } : undefined,
                providerMeta: { model, provider }
            };
        } else {
            // OpenAI compat (Grok, OpenAI, Local)
            const actualBaseURL = baseURL || (provider === 'xai' ? 'https://api.x.ai/v1' : 'https://api.openai.com/v1');
            const url = `${actualBaseURL}/chat/completions`;

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
                },
                body: JSON.stringify({
                    model,
                    messages,
                }),
            });
            const data = await res.json();
            result = {
                message: data.choices?.[0]?.message?.content || '',
                usage: data.usage ? {
                    promptTokens: data.usage.prompt_tokens,
                    completionTokens: data.usage.completion_tokens,
                    totalTokens: data.usage.total_tokens,
                } : undefined,
                providerMeta: { model, provider }
            };
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
