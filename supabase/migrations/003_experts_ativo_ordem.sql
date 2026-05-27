alter table public.experts add column ativo boolean default true not null;
alter table public.experts add column ordem integer;

-- Inicializar ordem baseado em created_at
with ranked as (
  select id, row_number() over (order by created_at) as rn
  from public.experts
)
update public.experts e
set ordem = r.rn
from ranked r
where e.id = r.id;

alter table public.experts alter column ordem set not null;
create index idx_experts_ordem on public.experts(ordem);
create index idx_experts_ativo on public.experts(ativo);

-- Policies de INSERT/UPDATE/DELETE em experts e campanhas
create policy "Authenticated can insert experts"
  on public.experts for insert to authenticated with check (true);
create policy "Authenticated can update experts"
  on public.experts for update to authenticated using (true);
create policy "Authenticated can insert campanhas"
  on public.campanhas for insert to authenticated with check (true);
create policy "Authenticated can update campanhas"
  on public.campanhas for update to authenticated using (true);
create policy "Authenticated can delete campanhas"
  on public.campanhas for delete to authenticated using (true);
