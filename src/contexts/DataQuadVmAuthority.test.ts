import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(path: string) {
    return readFileSync(join(root, path), 'utf8');
}

describe('DataQuad VM authority boundary', () => {
    it('keeps browser DataQuad context free of cloud persistence claims', () => {
        const files = [
            'src/contexts/DataQuadContext.tsx',
            'src/contexts/DataQuadContextBase.ts',
            'src/services/dataquad.ts',
        ].map(read).join('\n');

        expect(files).not.toMatch(/Firestore|Firebase|Supabase/i);
        expect(files).toMatch(/Core VM server/);
        expect(files).toMatch(/Steward\/Advocate/);
    });

    it('does not describe server tensor stores as cloud-hydrated durability shims', () => {
        const files = [
            'server/peer.ts',
            'server/spine.ts',
            'server/bookcase.ts',
        ].map(read).join('\n');

        expect(files).not.toMatch(/Firestore|Firebase|Supabase/i);
        expect(files).toMatch(/VM-local/);
        expect(files).toMatch(/IPFS/);
    });

    it('leaves old Supabase module paths as local shims without client constructors', () => {
        const files = [
            'server/supabase.ts',
            'src/lib/supabase.ts',
            'src/core/supabase/client.ts',
            'src/components/ui/ConfigStatus.tsx',
        ].map(read).join('\n');

        expect(files).not.toMatch(/createClient|@supabase\/supabase-js/);
        expect(files).not.toMatch(/Credentials Missing|Update \.env\.local/);
        expect(files).toMatch(/local/);
    });
});
