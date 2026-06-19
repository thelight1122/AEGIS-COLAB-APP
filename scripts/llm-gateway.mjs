import http from 'http';
import https from 'https';
import { URL } from 'url';

const PORT = process.env.PORT || 3001;

const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/api/llm/chat') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { peer, messages } = JSON.parse(body);
                const { provider, model, baseURL } = peer;

                const envKey = `${provider.toUpperCase()}_API_KEY`;
                const apiKey = process.env[envKey];

                const headers = { 'Content-Type': 'application/json' };
                let responseData;

                if (provider === 'gemini') {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                    const contents = messages.map(m => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }]
                    }));
                    const systemMessage = messages.find(m => m.role === 'system');
                    const systemInstruction = systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined;

                    responseData = await fetchJson(url, {
                        contents: contents.filter(m => messages.find(x => x.content === m.parts[0].text).role !== 'system'),
                        systemInstruction,
                    });

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        message: responseData.candidates?.[0]?.content?.parts?.[0]?.text || '',
                        usage: responseData.usageMetadata ? {
                            promptTokens: responseData.usageMetadata.promptTokenCount,
                            completionTokens: responseData.usageMetadata.candidatesTokenCount,
                            totalTokens: responseData.usageMetadata.totalTokenCount,
                        } : undefined,
                        providerMeta: { model, provider }
                    }));
                } else {
                    const actualBaseURL = baseURL || (provider === 'xai' ? 'https://api.x.ai/v1' : 'https://api.openai.com/v1');
                    const url = `${actualBaseURL}/chat/completions`;

                    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

                    responseData = await fetchJson(url, { model, messages }, headers);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        message: responseData.choices?.[0]?.message?.content || '',
                        usage: responseData.usage ? {
                            promptTokens: responseData.usage.prompt_tokens,
                            completionTokens: responseData.usage.completion_tokens,
                            totalTokens: responseData.usage.total_tokens,
                        } : undefined,
                        providerMeta: { model, provider }
                    }));
                }

            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

async function fetchJson(url, body, headers = { 'Content-Type': 'application/json' }) {
    const parsedUrl = new URL(url);
    const options = {
        method: 'POST',
        headers,
    };

    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify(body));
        req.end();
    });
}

server.listen(PORT, () => {
    console.log(`LLM Gateway running on http://localhost:${PORT}`);
});
