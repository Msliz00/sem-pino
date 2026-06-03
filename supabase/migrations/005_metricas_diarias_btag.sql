-- Métricas diárias por BTAG (fonte da verdade: gSheet gerencial do operador)
-- REG, FTD, DEP, NGR por BTAG por dia, sincronizados da planilha Iris.
create table public.metricas_diarias_btag (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid references public.experts(id) on delete cascade not null,
  campanha_id uuid references public.campanhas(id) on delete cascade not null,
  data date not null,
  registros integer default 0,
  ftd integer default 0,
  depositos numeric default 0,
  ngr numeric default 0,
  updated_at timestamptz default now(),

  unique(campanha_id, data)
);

-- Índices
create index idx_metricas_btag_data on public.metricas_diarias_btag(data desc);
create index idx_metricas_btag_expert on public.metricas_diarias_btag(expert_id);
create index idx_metricas_btag_campanha on public.metricas_diarias_btag(campanha_id);

-- RLS
alter table public.metricas_diarias_btag enable row level security;

create policy "Authenticated users can read metricas_btag"
  on public.metricas_diarias_btag for select to authenticated using (true);

create policy "Authenticated users can insert metricas_btag"
  on public.metricas_diarias_btag for insert to authenticated with check (true);

create policy "Authenticated users can update metricas_btag"
  on public.metricas_diarias_btag for update to authenticated using (true);
