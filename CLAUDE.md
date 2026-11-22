# Contexto do projeto (sem-pino)

Dono: 00BABY (Bekas). Idioma: sempre português do Brasil, tom direto.

## O que tem neste repositório
- **App Next.js "painel-experts"** (`src/`, `supabase/`, `package.json`): app em produção na Vercel (projeto `experts-painel`, publicado a partir da `main`). **Não mexer nele sem pedido explícito** — tem Supabase, APIs de upload e sync com Google Sheets.
- **Glassy · Action Forte** (`docs/igaming/`): painel atual da operação de iGaming. HTML único (`index.html`) + dados (`dados.js`, `window.IG`). Foco do trabalho agora.
- Legados em `docs/` (não reintroduzir sem pedido): `painel-central-experts.html` + `painel-dados.js` (Garimpo/desapego), `bingobet_junho_2026_scroll.html`, `painel-preview-v8.html`.

## Glassy (docs/igaming)
- Páginas: **Métricas** (só 10 blocos com gráfico de colunas por dia: Resultado, ROI, Investimento, NGR, Depósitos, Cliques, Registros, FTD, CPA, Custo por FTD) e **Campanhas** (ranking, tabela ordenável, detalhe em painel lateral).
- Filtros numa linha: 7/14/30 dias, Tudo, Personalizado, Canal (Geral, SMS, E-mail, Live, Hacker). Sem filtro de status (removido a pedido).
- Visual preto e dourado. Cores de dado validadas para daltonismo sobre `#141310`: ouro `#b38a26` (NGR/lucro), azul `#5b8fd9` (investimento), carmim `#c93d5c` (prejuízo). Texto de variação: `#2fb85a` / `#e5636f`.
- Marca no topo do script: `const MARCA = { nome: "Glassy", sub: "Action Forte" }`.
- **Dados são de EXEMPLO.** Regerar: `python3 scripts/gerar_dados_glassy.py docs/igaming/dados.js` (seed fixo, reproduzível). Formato por campanha/dia: `[investimento, impressões, cliques, registros, FTD, depósitos, NGR]`.
- Login: só hash PBKDF2 no arquivo (objeto `ACESSO`). **Nunca gravar senha, telefone ou e-mail em texto no repositório** (é público). O login só protege a tela; antes de dados reais, validar no servidor (ex.: Supabase Auth).

## Fluxo de entrega
- Branch de trabalho: `claude/bingobet-instagram-report-june-sh9zlp` (o GitHub Pages publica desta branch, pasta `/docs`).
- PR #1 leva `docs/` para a `main` para um projeto Vercel **separado** (`glassy-action-forte`, Root Directory `docs/igaming`, Framework "Other"). Nunca usar o projeto `experts-painel` para o Glassy.
- Antes de entregar: testar login, as duas páginas, filtros, sem rolagem lateral em 1440px e 375px, sem erros no console. Depois: commit, push e mandar o link.
