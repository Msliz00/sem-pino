# Tech Debt

## 1. Padronização de BTAG (campanhas)

**Status:** aberto · introduzido em `feat/multi-btag`

A tabela `public.campanhas` tem dois campos que podem armazenar identificadores
de BTAG:

- `codigo_ux` (text) — historicamente usado pra "Código UX" (renomeado em
  /gestao pra "BTAG" sem migrar o nome da coluna)
- `affiliate_id` (text) — BTAG numérico real do BingoBet

Na validação de upload (`POST /api/upload`), o conjunto de BTAGs aceitos é a
**união** dos dois campos por expert. Isso evita travar a Fase D enquanto a
fonte de verdade não está consolidada.

### Plano de descontinuação

1. Migrar dados: copiar `codigo_ux` pra `affiliate_id` onde este último for
   nulo e o `codigo_ux` for um BTAG válido (numérico).
2. Dropar a coluna `codigo_ux` via migration nova
   (`supabase/migrations/00X_drop_codigo_ux.sql`).
3. Atualizar:
   - `src/app/api/upload/route.ts` — usar só `affiliate_id`
   - `src/app/api/campanhas/route.ts` e `[id]/route.ts`
   - `src/components/CampanhaModal.tsx` e `CampanhasSection.tsx`
   - Seeds em `supabase/migrations/002_seed_experts.sql`

## 2. Body size limit do upload

**Status:** aceito · documentado em `vercel.json` e no header de
`src/app/api/upload/route.ts`

Vercel impõe **4.5 MB** de limite no body do request em serverless functions
no plano Hobby e Pro. Não há config no App Router pra alterar.

Cenário típico: 5 planilhas XLSX × ~500 KB = 2.5 MB → cabe folgado.

Se algum expert subir planilhas grandes (≥ 1 MB cada), precisamos:

- Plano Enterprise (limite maior)
- Ou: pré-compactar
- Ou: subir uma por vez (perdendo o consolidado)

## 3. arquivo_nome como JSON string

**Status:** aceito · workaround pra evitar migration

Em uploads multi-BTAG, `uploads_diarios.arquivo_nome` agora guarda
`JSON.stringify(paths[])` em vez de um path único.

- `/api/uploads/[id]/download?index=N` retorna o N-ésimo arquivo
- `/api/uploads/[id]/files` retorna o array completo com signed URLs
- UI detecta o formato (string vs JSON array) e renderiza single link ou
  dropdown.

Migração futura: criar coluna `arquivos jsonb` dedicada e mover os paths pra
lá; manter `arquivo_nome` por retrocompatibilidade até deprecar.
