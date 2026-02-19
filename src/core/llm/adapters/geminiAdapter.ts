import { type ChatOptions, type ChatResponse, type LLMAdapter } from './index';

export const geminiAdapter: LLMAdapter = {
    async completeChat(options: ChatOptions): Promise<ChatResponse> {
        const { model, messages, apiKey } = options;
        // Map common model names to Gemini ones if needed, or assume correct model passed
        // Use the v1beta API or v1
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Format messages for Gemini
        const contents = messages.map(m => {
            // Gemini doesn't have a 'system' role in the same way, usually handled via systemInstruction
            // But for simple v1beta call, we can map system to user or use systemInstruction field
            return {
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            };
        });

        // Separate system instruction if present
        const systemMessage = messages.find(m => m.role === 'system');
        const systemInstruction = systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: contents.filter(m => messages[messages.indexOf(messages.find(x => x.content === m.parts[0].text)!)].role !== 'system'),
                systemInstruction,
                generationConfig: {
                    maxOutputTokens: 2048,
                }
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Gemini error: ${response.status} ${err}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return {
            text,
            usage: data.usageMetadata ? {
                promptTokens: data.usageMetadata.promptTokenCount,
                completionTokens: data.usageMetadata.candidatesTokenCount,
                totalTokens: data.usageMetadata.totalTokenCount,
            } : undefined,
            raw: data,
        };
    }
};
