/**
 * anthropicAdapter.ts — Anthropic Claude API adapter
 *
 * Uses the Anthropic Messages API directly (not OpenAI-compatible).
 * Endpoint: https://api.anthropic.com/v1/messages
 *
 * Message format differences from OpenAI:
 *   - System prompt is a top-level `system` field, not a message with role:'system'
 *   - Response content is in `content[0].text` not `choices[0].message.content`
 *   - Usage keys are `input_tokens` / `output_tokens` not `prompt_tokens` / `completion_tokens`
 *   - Requires `anthropic-version` header
 *   - Requires `x-api-key` header (not Bearer token)
 */

import { type ChatOptions, type ChatResponse, type LLMAdapter } from './index';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

interface AnthropicMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface AnthropicRequest {
    model: string;
    max_tokens: number;
    system?: string;
    messages: AnthropicMessage[];
}

interface AnthropicContentBlock {
    type: 'text';
    text: string;
}

interface AnthropicResponse {
    id: string;
    type: 'message';
    role: 'assistant';
    content: AnthropicContentBlock[];
    model: string;
    stop_reason: string;
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
}

export const anthropicAdapter: LLMAdapter = {
    async completeChat(options: ChatOptions): Promise<ChatResponse> {
        const { model, messages, apiKey } = options;

        if (!apiKey) throw new Error('Anthropic API key required');

        // Split system message from conversation messages
        const systemMessage = messages.find(m => m.role === 'system');
        const conversationMessages = messages.filter(m => m.role !== 'system');

        // Anthropic requires alternating user/assistant turns.
        // Collapse consecutive same-role messages by joining content.
        const anthropicMessages: AnthropicMessage[] = [];
        for (const msg of conversationMessages) {
            const role = msg.role === 'assistant' ? 'assistant' : 'user';
            const last = anthropicMessages[anthropicMessages.length - 1];
            if (last && last.role === role) {
                last.content += '\n\n' + msg.content;
            } else {
                anthropicMessages.push({ role, content: msg.content });
            }
        }

        // Anthropic requires the first message to be from 'user'
        if (anthropicMessages.length === 0 || anthropicMessages[0].role !== 'user') {
            anthropicMessages.unshift({ role: 'user', content: '(begin)' });
        }

        const body: AnthropicRequest = {
            model,
            max_tokens: 4096,
            messages: anthropicMessages,
            ...(systemMessage ? { system: systemMessage.content } : {}),
        };

        const response = await fetch(ANTHROPIC_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': ANTHROPIC_VERSION,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
        }

        const data = await response.json() as AnthropicResponse;
        const text = data.content?.[0]?.text ?? '';

        return {
            text,
            usage: {
                promptTokens: data.usage.input_tokens,
                completionTokens: data.usage.output_tokens,
                totalTokens: data.usage.input_tokens + data.usage.output_tokens,
            },
            raw: data,
        };
    },
};
