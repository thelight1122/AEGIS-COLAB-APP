// Auth removed — always returns no session.
export function useAuthSession() {
    return { session: null, user: null, loading: false };
}
