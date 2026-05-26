-- Seed experts
insert into public.experts (slug, nome) values
  ('professor', 'Professor'),
  ('iris-aviator', 'Iris Aviator');

-- Seed campanhas do Professor (4 campanhas)
insert into public.campanhas (expert_id, nome, marca, codigo_ux, affiliate_id)
select id, 'LUCAS · BINGO', 'BINGO', 'UX-38485', null
from public.experts where slug = 'professor';

insert into public.campanhas (expert_id, nome, marca, codigo_ux, affiliate_id)
select id, 'LUCASAVIATOR', 'REALS', 'UX-37454', null
from public.experts where slug = 'professor';

insert into public.campanhas (expert_id, nome, marca, codigo_ux, affiliate_id)
select id, 'LUCASREATIVACAO', 'REALS', 'UX-37565', null
from public.experts where slug = 'professor';

insert into public.campanhas (expert_id, nome, marca, codigo_ux, affiliate_id)
select id, 'PROFESSOR STRIZ', 'REALS', 'UX-38281', null
from public.experts where slug = 'professor';

-- Seed campanha da Iris Aviator
insert into public.campanhas (expert_id, nome, marca, codigo_ux, affiliate_id)
select id, 'IRIS THAIZE', 'BINGO', 'UX-38579', '41400'
from public.experts where slug = 'iris-aviator';
