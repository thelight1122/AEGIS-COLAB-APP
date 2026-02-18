-- supabase/presence_migration.sql
-- Part 3A: Add peer_presence table and RLS

CREATE TABLE IF NOT EXISTS public.peer_presence (
    peer_id UUID PRIMARY KEY REFERENCES public.peers(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION public.handle_presence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_presence_updated_at
BEFORE UPDATE ON public.peer_presence
FOR EACH ROW EXECUTE FUNCTION public.handle_presence_updated_at();

-- Enable RLS
ALTER TABLE public.peer_presence ENABLE ROW LEVEL SECURITY;

-- RLS: any authenticated reads
CREATE POLICY "Allow select for authenticated" ON public.peer_presence
FOR SELECT TO authenticated USING (true);

-- RLS: only the owner can UPSERT their presence
-- Note: peer_id must belong to the authenticated user in the 'peers' table
CREATE POLICY "Allow upsert for own presence" ON public.peer_presence
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.peers p
        WHERE p.id = peer_presence.peer_id
        AND p.auth_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.peers p
        WHERE p.id = peer_id -- refers to NEW.peer_id in INSERT/UPDATE
        AND p.auth_user_id = auth.uid()
    )
);
