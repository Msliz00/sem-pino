-- Tabela de experts
create table public.experts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  created_at timestamptz default now()
);

-- Tabela de campanhas
create table public.campanhas (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid references public.experts(id) on delete cascade,
  nome text not null,
  marca text not null check (marca in ('BINGO','REALS')),
  codigo_ux text,
  affiliate_id text,
  created_at timestamptz default now()
);

-- Tabela de uploads diários
create table public.uploads_diarios (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid references public.experts(id) on delete cascade not null,
  data_referencia date not null,

  -- Métricas manuais (gestor digita)
  investimento numeric default 0,
  cliques integer default 0,
  entradas_grupo integer default 0,

  -- Métricas extraídas da planilha
  total_registros integer default 0,
  total_ftd integer default 0,
  total_deposits numeric default 0,
  total_withdrawn numeric default 0,
  total_net_deposits numeric default 0,
  total_wagering numeric default 0,
  distribuicao_origens jsonb default '{}'::jsonb,

  -- Metadata
  arquivo_nome text,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz default now(),

  unique(expert_id, data_referencia)
);

-- Índices
create index idx_uploads_data on public.uploads_diarios(data_referencia desc);
create index idx_uploads_expert on public.uploads_diarios(expert_id);
create index idx_campanhas_expert on public.campanhas(expert_id);

-- RLS
alter table public.experts enable row level security;
alter table public.campanhas enable row level security;
alter table public.uploads_diarios enable row level security;

create policy "Authenticated users can read experts"
  on public.experts for select to authenticated using (true);

create policy "Authenticated users can read campanhas"
  on public.campanhas for select to authenticated using (true);

create policy "Authenticated users can read uploads"
  on public.uploads_diarios for select to authenticated using (true);

create policy "Authenticated users can insert uploads"
  on public.uploads_diarios for insert to authenticated with check (true);

create policy "Authenticated users can update uploads"
  on public.uploads_diarios for update to authenticated using (true);
