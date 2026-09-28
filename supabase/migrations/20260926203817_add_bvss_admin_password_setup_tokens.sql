create table if not exists public.bvss_admin_password_setup_tokens (
    token_hash text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
  );
  alter table public.bvss_admin_password_setup_tokens enable row level security;
  create index if not exists bvss_admin_password_setup_tokens_user_id_idx
    on public.bvss_admin_password_setup_tokens(user_id);
  create index if not exists bvss_admin_password_setup_tokens_expires_at_idx
    on public.bvss_admin_password_setup_tokens(expires_at);
