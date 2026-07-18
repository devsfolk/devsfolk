-- ============================================================================
-- Migration 005: Etsy Per-Tenant App Credentials
-- ============================================================================
-- Mirrors the existing printify_credentials pattern:
-- plaintext storage, authenticated-only RLS, no anon policy.
-- ============================================================================

create table if not exists public.etsy_credentials (
  id text primary key,
  keystring text not null default '',
  shared_secret text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.etsy_credentials enable row level security;

drop policy if exists "Authenticated can manage Etsy credentials" on public.etsy_credentials;
create policy "Authenticated can manage Etsy credentials"
on public.etsy_credentials
for all
to authenticated
using (true)
with check (true);

-- ============================================================================
-- Verification
-- ============================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'etsy_credentials'
-- ORDER BY ordinal_position;
-- ============================================================================
