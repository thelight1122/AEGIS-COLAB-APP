export function normalizeLocalEndpoint(raw?: string): string | undefined {
    if (!raw) return raw;

    try {
        const url = new URL(raw);
        if (url.hostname === '127.0.0.1') {
            url.hostname = 'localhost';
        }
        if (url.pathname === '/' || url.pathname === '') {
            url.pathname = '/v1';
        }
        return url.toString().replace(/\/$/, '');
    } catch {
        return raw;
    }
}
