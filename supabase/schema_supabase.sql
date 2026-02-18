-- supabase/schema_supabase.sql
-- AEGIS CoLab Shared Board Schema

-- Peers Table
CREATE TABLE IF NOT EXISTS peers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handle TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    peer_type TEXT NOT NULL CHECK (peer_type IN ('human', 'ai')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Threads Table
CREATE TABLE IF NOT EXISTS threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    created_by_peer_id UUID REFERENCES peers(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id),
    author_peer_id UUID NOT NULL REFERENCES peers(id),
    author_peer_type TEXT NOT NULL CHECK (author_peer_type IN ('human', 'ai')),
    body TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'message',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE peers ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 0. SCHEMA UPDATES (Peer Ownership & Status)
ALTER TABLE peers ADD COLUMN IF NOT EXISTS auth_user_id UUID DEFAULT auth.uid();
ALTER TABLE peers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 1. PEERS POLICIES
DROP POLICY IF EXISTS "Allow select for all" ON peers;
DROP POLICY IF EXISTS "Allow select for authenticated" ON peers;
DROP POLICY IF EXISTS "peers_select_self" ON peers;
-- Allow authenticated to see ALL peers (needed for shared board to resolve names)
CREATE POLICY "Allow select for authenticated" ON peers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated" ON peers;
DROP POLICY IF EXISTS "Allow insert own peer" ON peers;
DROP POLICY IF EXISTS "Allow insert owned peer" ON peers;
-- Allow creating a peer if you assign it to yourself
CREATE POLICY "Allow insert owned peer" ON peers FOR INSERT TO authenticated 
WITH CHECK (
    (auth_user_id = auth.uid()) OR (id = auth.uid())
);

-- 2. THREADS POLICIES
DROP POLICY IF EXISTS "Allow select for all" ON threads;
DROP POLICY IF EXISTS "Allow select for authenticated" ON threads;
DROP POLICY IF EXISTS "threads_select_auth" ON threads;
CREATE POLICY "threads_select_auth" ON threads FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated" ON threads;
DROP POLICY IF EXISTS "Allow insert own thread" ON threads;
DROP POLICY IF EXISTS "Allow insert owned thread" ON threads;
DROP POLICY IF EXISTS "threads_insert_own_peer" ON threads;
-- Strict ownership check + is_active (Updated to match Prompt Step 3)
CREATE POLICY "threads_insert_own_peer" ON threads FOR INSERT TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM peers p
        WHERE p.id = threads.created_by_peer_id 
        AND p.auth_user_id = auth.uid()
        AND p.is_active = true
    )
);

-- 3. MESSAGES POLICIES
DROP POLICY IF EXISTS "Allow select for all" ON messages;
DROP POLICY IF EXISTS "Allow select for authenticated" ON messages;
DROP POLICY IF EXISTS "messages_select_auth" ON messages;
CREATE POLICY "messages_select_auth" ON messages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated" ON messages;
DROP POLICY IF EXISTS "Allow insert own message" ON messages;
DROP POLICY IF EXISTS "Allow insert owned message" ON messages;
DROP POLICY IF EXISTS "messages_insert_own_peer" ON messages;
-- Strict ownership check + is_active (Updated for consistency)
CREATE POLICY "messages_insert_own_peer" ON messages FOR INSERT TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM peers p
        WHERE p.id = messages.author_peer_id 
        AND p.auth_user_id = auth.uid()
        AND p.is_active = true
    )
);

-- APPEND ONLY ENFORCEMENT
DROP POLICY IF EXISTS "Disallow update on messages" ON messages;
CREATE POLICY "Disallow update on messages" ON messages FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Disallow delete on messages" ON messages;
CREATE POLICY "Disallow delete on messages" ON messages FOR DELETE USING (false);
