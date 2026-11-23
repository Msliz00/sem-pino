# Contexto do projeto (sem-pino)

Dono: 00BABY (Bekas). Idioma: sempre português do Brasil, tom direto.

## O que tem neste repositório
- **App Next.js "painel-experts"** (`src/`, `supabase/`, `package.json`): app em produção na Vercel (projeto `experts-painel`, publicado a partir da `main`). **Não mexer nele sem pedido explícito** — tem Supabase, APIs de upload e sync com Google Sheets.
- **Glassy · Action Forte** (`docs/igaming/`): painel atual da operação de iGaming. HTML único (`index.html`) + dados (`dados.js`, `window.IG`). Foco do trabalho agora.
- Legados em `docs/` (não reintroduzir sem pedido): `painel-central-experts.html` + `painel-dados.js` (Garimpo/desapego), `bingobet_junho_2026_scroll.html`, `painel-preview-v8.html`.

## Glassy (docs/igaming)
- Visual estilo console (referência: tela inicial do PS5, sem logos/símbolos da Sony): barra superior com abas **Métricas | Campanhas**, relógio e avatar (menu com Sair); fundo 3D em canvas (ondas em perspectiva douradas → azuis + partículas; cai para menos detalhe em aparelho lento e fica parado com movimento reduzido); cartões inclinam com o mouse.
- Páginas: **Métricas** = fileira de 10 blocos (Resultado, ROI, Investimento, NGR, Depósitos, Cliques, Registros, FTD, CPA, Custo/FTD); o selecionado cresce e o painel de destaque abaixo mostra valor, variação e gráfico grande de colunas por dia (setas do teclado navegam). **Campanhas** = cadastradas + ranking + tabela ordenável + detalhe lateral.
- Filtros numa linha: 7/14/30 dias, Tudo, Personalizado, Canal (Geral, SMS, E-mail, Live, Hacker). Sem filtro de status (removido a pedido).
- Visual preto e dourado com luzes azuis (`--blue`). Cores de dado validadas para daltonismo sobre `#141310`: ouro `#b38a26` (NGR/lucro), azul `#5b8fd9` (investimento), carmim `#c93d5c` (prejuízo). Texto de variação: `#2fb85a` / `#e5636f`.
- Marca no topo do script: `const MARCA = { nome: "Glassy", sub: "Action Forte" }`.
- **Dados são de EXEMPLO.** Regerar: `python3 scripts/gerar_dados_glassy.py docs/igaming/dados.js` (seed fixo, reproduzível). Formato por campanha/dia: `[investimento, impressões, cliques, registros, FTD, depósitos, NGR]`.
- Login: **Supabase Auth** no projeto `experts-painel` (`SB_URL`/`SB_KEY` publicável no topo do script). Usuário vira e-mail interno: `bekas` → `bekas@glassy.app.invalid`. Só entra quem está em `public.glassy_membros`. **Nunca gravar senha, telefone ou e-mail em texto no repositório** (é público).
- Página Campanhas: cartão "Campanhas cadastradas" + botão **Adicionar campanha** (nome, canal + público, início/fim, status, arquivo da base). Grava em `public.glassy_campanhas`; o arquivo vai para o bucket **privado** `glassy-bases` (lista de contatos = dado pessoal, LGPD: o painel mostra só nome do arquivo e quantidade de contatos).
- Banco: `supabase/migrations/007_glassy_campanhas.sql` (tabelas `glassy_*`, RLS por membro, bucket). Isolado do app dos experts — não alterar tabelas dele.
- A página do claude.ai (artifact) não alcança o Supabase (CSP); o Glassy com login/cadastro roda no GitHub Pages e na Vercel.

## Fluxo de entrega
- Branch de trabalho: `claude/bingobet-instagram-report-june-sh9zlp` (o GitHub Pages publica desta branch, pasta `/docs`).
- PR #1 leva `docs/` para a `main` para um projeto Vercel **separado** (`glassy-action-forte`, Root Directory `docs/igaming`, Framework "Other"). Nunca usar o projeto `experts-painel` para o Glassy.
- Cuidado com nomes de classe CSS repetidos: `.tb` é a tabela e `.mbar` já quebrou barras antes. A barra superior se chama `.topbar`.
- Antes de entregar: testar login, as duas páginas, filtros, sem rolagem lateral em 1440px e 375px, sem erros no console. Depois: commit, push e mandar o link.
