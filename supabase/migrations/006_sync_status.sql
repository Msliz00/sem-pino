create table if not exists public.sync_status (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid references public.experts(id),
  fonte text not null,
  synced_at timestamptz not null default now(),
  unique (expert_id, fonte)
);

alter table public.sync_status enable row level security;

drop policy if exists "leitura_autenticada_sync_status" on public.sync_status;
create policy "leitura_autenticada_sync_status"
  on public.sync_status
  for select
  to authenticated
  using (true);
