-- 007 · Glassy (painel Action Forte): cadastro de campanhas + listas de contatos.
-- Isolado do app dos experts: só usuários presentes em glassy_membros leem ou gravam.
-- As listas de contatos são dados pessoais (LGPD): bucket privado, sem acesso anônimo.

-- quem pode usar o Glassy
create table if not exists public.glassy_membros (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.glassy_membros enable row level security;
revoke all on public.glassy_membros from anon, authenticated;
grant select on public.glassy_membros to authenticated;
create policy "glassy_membros_ve_a_si_mesmo" on public.glassy_membros
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.glassy_eh_membro()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.glassy_membros m where m.user_id = (select auth.uid()));
$$;
revoke all on function public.glassy_eh_membro() from public, anon;
grant execute on function public.glassy_eh_membro() to authenticated;

-- campanhas cadastradas
create table if not exists public.glassy_campanhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 2 and 120),
  canal text not null check (canal in ('SMS', 'E-mail', 'Live', 'Hacker')),
  publico text not null check (char_length(btrim(publico)) between 2 and 80),
  data_inicio date not null,
  data_fim date not null,
  status text not null check (status in ('agendada', 'ativa', 'em teste', 'pausada', 'encerrada')),
  base_caminho text,
  base_nome text check (base_nome is null or char_length(base_nome) <= 200),
  base_contatos integer check (base_contatos is null or base_contatos >= 0),
  base_bytes bigint check (base_bytes is null or base_bytes >= 0),
  criado_por uuid not null default auth.uid() references auth.users(id),
  criado_em timestamptz not null default now(),
  constraint glassy_campanhas_periodo check (data_fim >= data_inicio),
  constraint glassy_campanhas_base check ((base_caminho is null) = (base_nome is null))
);
create index if not exists glassy_campanhas_criado_em_idx on public.glassy_campanhas (criado_em desc);
create index if not exists glassy_campanhas_criado_por_idx on public.glassy_campanhas (criado_por);
alter table public.glassy_campanhas enable row level security;
revoke all on public.glassy_campanhas from anon, authenticated;
grant select, insert on public.glassy_campanhas to authenticated;
create policy "glassy_campanhas_membros_leem" on public.glassy_campanhas
  for select to authenticated using ((select public.glassy_eh_membro()));
create policy "glassy_campanhas_membros_cadastram" on public.glassy_campanhas
  for insert to authenticated
  with check ((select public.glassy_eh_membro()) and criado_por = (select auth.uid()));

-- arquivos das bases (privado, até 50 MB)
insert into storage.buckets (id, name, public, file_size_limit)
values ('glassy-bases', 'glassy-bases', false, 52428800)
on conflict (id) do nothing;

create policy "glassy_bases_membros_enviam" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'glassy-bases' and (select public.glassy_eh_membro()));
create policy "glassy_bases_membros_leem" on storage.objects
  for select to authenticated
  using (bucket_id = 'glassy-bases' and (select public.glassy_eh_membro()));
create policy "glassy_bases_dono_remove" on storage.objects
  for delete to authenticated
  using (bucket_id = 'glassy-bases' and (select public.glassy_eh_membro()) and owner_id = (select auth.uid())::text);
