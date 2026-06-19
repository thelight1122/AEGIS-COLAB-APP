// Supabase auth removed — this app is a local Education and Collaboration tool.
export const supabase = {
    auth: {
        signOut: async () => {},
        signInWithOtp: async () => ({ error: null }),
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({ select: async () => ({ data: [], error: null }), insert: async () => ({ data: null, error: null }) }),
    channel: () => ({ on: function() { return this; }, subscribe: () => {} }),
    removeChannel: async () => {},
} as const;

export const supabaseConfig = { hasUrl: false, hasAnonKey: false, url: '' };
