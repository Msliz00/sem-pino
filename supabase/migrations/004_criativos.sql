create table public.criativos (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid references public.experts(id) on delete cascade not null,
  nome text not null,
  data_criacao date not null,
  status text not null default 'PENDENTE' check (status in ('ATIVO','DESCARTE','PENDENTE')),
  drive_url text,
  meta_ad_id text,
  destination_url text,

  -- 11 metricas manuais
  thumbstop numeric default 0,
  hold_rate numeric default 0,
  ctr numeric default 0,
  cpm numeric default 0,
  cpc numeric default 0,
  frequencia numeric default 0,
  alcance integer default 0,
  impressoes integer default 0,
  cliques integer default 0,
  investimento numeric default 0,
  cpa numeric default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_criativos_expert on public.criativos(expert_id);
create index idx_criativos_data on public.criativos(data_criacao desc);
create index idx_criativos_status on public.criativos(status);

alter table public.criativos enable row level security;

create policy "Authenticated can select criativos" on public.criativos for select to authenticated using (true);
create policy "Authenticated can insert criativos" on public.criativos for insert to authenticated with check (true);
create policy "Authenticated can update criativos" on public.criativos for update to authenticated using (true);
create policy "Authenticated can delete criativos" on public.criativos for delete to authenticated using (true);
