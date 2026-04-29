// ============================================================
// SEM PINO — App principal
// ============================================================

const { createClient } = supabase;
const sb = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.key);

// Email "fake" derivado do username (Supabase Auth exige email)
const userToEmail = (u) => `${u.toLowerCase().trim()}@sem-pino.local`;

// Estado global
const state = {
  user: null,           // auth user
  membro: null,         // perfil em public.membros
  cicloAtual: null,
  ranking: [],
  ciclos: [],
};

// ============================================================
// HELPERS DE UI
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showScreen(name) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $(`#screen-${name}`).classList.add('active');
}

function showTab(name) {
  $$('.tab').forEach(t => t.classList.remove('active'));
  $$('.tab-content').forEach(t => t.classList.remove('active'));
  $(`.tab[data-tab="${name}"]`).classList.add('active');
  $(`#tab-${name}`).classList.add('active');
  if (name === 'historico') loadHistoricoCiclos();
  if (name === 'metricas') renderMetricas();
}

function toast(msg, type = '') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = type;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// Toggle visualização de senha
$$('.pass-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = $(`#${btn.dataset.target}`);
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});

// Switch entre login e cadastro
$('#go-cadastro').addEventListener('click', () => showScreen('cadastro'));
$('#go-login').addEventListener('click', () => showScreen('login'));

// Switch de tabs
$$('.tab').forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));

// ============================================================
// LOGIN
// ============================================================
$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('#login-user').value.trim().toLowerCase();
  const password = $('#login-pass').value;
  const remember = $('#login-remember').checked;
  $('#login-error').textContent = '';

  try {
    const { data, error } = await sb.auth.signInWithPassword({
      email: userToEmail(username),
      password,
    });
    if (error) throw error;

    if (remember) localStorage.setItem('sem-pino-user', username);
    else localStorage.removeItem('sem-pino-user');

    await initPainel(data.user);
  } catch (err) {
    $('#login-error').textContent = traduzErro(err.message);
  }
});

// ============================================================
// CADASTRO
// ============================================================
$('#form-cadastro').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('#cad-user').value;
  const pass = $('#cad-pass').value;
  const pass2 = $('#cad-pass2').value;
  $('#cad-error').textContent = '';

  if (!username) {
    $('#cad-error').textContent = 'Escolha seu nome.';
    return;
  }
  if (pass.length < 6) {
    $('#cad-error').textContent = 'Senha precisa ter pelo menos 6 caracteres.';
    return;
  }
  if (pass !== pass2) {
    $('#cad-error').textContent = 'As senhas não coincidem.';
    return;
  }

  try {
    // 1. Cria conta no Auth
    const { data: signUpData, error: signUpErr } = await sb.auth.signUp({
      email: userToEmail(username),
      password: pass,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (signUpErr) throw signUpErr;

    // 2. Tenta login imediato
    const { data: loginData, error: loginErr } = await sb.auth.signInWithPassword({
      email: userToEmail(username),
      password: pass,
    });

    // 3a. Se login funcionou (confirm email está OFF) → entra direto no painel
    if (!loginErr && loginData?.user) {
      const userId = loginData.user.id;
      const { error: updErr } = await sb
        .from('membros')
        .update({ user_id: userId })
        .eq('username', username);
      if (updErr) throw updErr;

      localStorage.setItem('sem-pino-user', username);
      toast('Conta criada com sucesso!', 'success');
      await initPainel(loginData.user);
      return;
    }

    // 3b. Se login falhou por confirmação pendente → vincula com signUp.user.id e avisa
    if (loginErr && (loginErr.message.toLowerCase().includes('confirm') || loginErr.message.toLowerCase().includes('not confirmed'))) {
      const userId = signUpData?.user?.id;
      if (userId) {
        await sb.from('membros').update({ user_id: userId }).eq('username', username);
      }
      $('#cad-error').style.color = '#ff8c00';
      $('#cad-error').textContent = '✓ Conta criada! Faça login com seu usuário e senha.';
      $('#login-user').value = username;
      setTimeout(() => {
        showScreen('login');
        $('#cad-error').style.color = '';
        $('#cad-error').textContent = '';
      }, 2500);
      return;
    }

    // 3c. Outro erro de login
    if (loginErr) throw loginErr;

  } catch (err) {
    $('#cad-error').style.color = '';
    $('#cad-error').textContent = traduzErro(err.message);
  }
});

// ============================================================
// LOGOUT
// ============================================================
$('#btn-logout').addEventListener('click', async () => {
  await sb.auth.signOut();
  state.user = null;
  state.membro = null;
  showScreen('login');
});

// ============================================================
// INIT PAINEL (carrega dados após login)
// ============================================================
async function initPainel(user) {
  state.user = user;

  // Busca perfil do membro
  const { data: membro, error } = await sb
    .from('membros')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !membro) {
    toast('Perfil não encontrado. Contate o ADM.', 'error');
    await sb.auth.signOut();
    return;
  }

  state.membro = membro;

  // Busca ciclo atual
  const { data: ciclo } = await sb
    .from('ciclos')
    .select('*')
    .eq('ativo', true)
    .single();
  state.cicloAtual = ciclo;

  // Atualiza UI da topbar
  $('#user-nome').textContent = membro.nome_exibicao;
  $('#user-badge').style.display = membro.is_adm ? 'inline-block' : 'none';
  $('#ciclo-numero').textContent = `#${ciclo?.numero ?? '?'}`;

  // Mostra painel
  showScreen('painel');
  showTab('ranking');

  // Carrega ranking
  await loadRanking();

  // Realtime: escuta mudanças em cartões
  sb.channel('cartoes-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cartoes' }, () => {
      loadRanking();
    })
    .subscribe();
}

// ============================================================
// RANKING
// ============================================================
async function loadRanking() {
  const { data, error } = await sb.rpc('get_ranking_atual');
  if (error) {
    toast('Erro ao carregar ranking', 'error');
    console.error(error);
    return;
  }
  state.ranking = data || [];
  renderRanking();
  // Se métricas estiver visível, atualiza também
  if ($('#tab-metricas').classList.contains('active')) renderMetricas();
}

function renderRanking() {
  const grid = $('#ranking-grid');
  const isAdm = state.membro?.is_adm;

  grid.innerHTML = state.ranking.map((m, idx) => {
    const pos = idx + 1;
    const saldoClass = m.saldo > 0 ? '' : (m.saldo < 0 ? 'negativo' : 'zero');
    const saldoTxt = m.saldo > 0 ? `+${m.saldo}` : `${m.saldo}`;
    const rankClass = pos <= 3 ? `rank-${pos}` : '';

    return `
      <div class="ranking-card ${rankClass}" data-membro-id="${m.membro_id}">
        <div class="rank-position">#${pos}</div>
        <div class="card-avatar-wrap">
          <img src="avatars/${m.username}.png" alt="${m.nome_exibicao}" onerror="this.src='avatars/${m.username}.png'">
        </div>
        <div class="card-nome">${m.nome_exibicao}</div>
        <div class="card-saldo ${saldoClass}">${saldoTxt}</div>
        <div class="card-stats">
          <div class="card-stat"><span class="stat-num">${m.azuis}</span>🔵</div>
          <div class="card-stat"><span class="stat-num">${m.amarelos}</span>🟨</div>
          <div class="card-stat"><span class="stat-num">${m.vermelhos}</span>🟥</div>
        </div>
        <div class="card-actions">
          <button class="btn-cartao azul"     data-tipo="azul"     data-membro="${m.membro_id}" ${isAdm ? '' : 'disabled'}>+1 🔵</button>
          <button class="btn-cartao amarelo"  data-tipo="amarelo"  data-membro="${m.membro_id}" ${isAdm ? '' : 'disabled'}>-1 🟨</button>
          <button class="btn-cartao vermelho" data-tipo="vermelho" data-membro="${m.membro_id}" ${isAdm ? '' : 'disabled'}>-3 🟥</button>
        </div>
      </div>
    `;
  }).join('');

  // Listeners dos botões de cartão
  $$('.btn-cartao').forEach(btn => {
    btn.addEventListener('click', (e) => onAplicarCartao(e, btn));
  });
}

// ============================================================
// APLICAR CARTÃO (com animação)
// ============================================================
async function onAplicarCartao(evt, btn) {
  if (btn.disabled) return;
  const tipo = btn.dataset.tipo;
  const membroId = btn.dataset.membro;

  // Animação visual antes de chamar API (resposta instantânea)
  spawnCartaoAnim(evt.clientX, evt.clientY, tipo);

  // Desabilita botão durante request
  btn.disabled = true;

  try {
    const { error } = await sb.rpc('aplicar_cartao', {
      p_membro_id: membroId,
      p_tipo: tipo,
      p_motivo: null,
    });
    if (error) throw error;
    // Realtime vai recarregar; mas chamamos manual pra garantir UI rápida
    await loadRanking();
  } catch (err) {
    toast('Erro: ' + err.message, 'error');
    console.error(err);
  } finally {
    setTimeout(() => { btn.disabled = !state.membro?.is_adm; }, 400);
  }
}

function spawnCartaoAnim(x, y, tipo) {
  const layer = $('#anim-layer');
  const el = document.createElement('div');
  el.className = `cartao-flying ${tipo}`;

  const pts = tipo === 'azul' ? '+1' : (tipo === 'amarelo' ? '-1' : '-3');
  const labels = { azul: 'AZUL', amarelo: 'AMARELO', vermelho: 'VERMELHO' };
  el.innerHTML = `<div class="pts">${pts}</div><div class="label">${labels[tipo]}</div>`;

  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  layer.appendChild(el);

  setTimeout(() => el.remove(), 1500);
}

// ============================================================
// MÉTRICAS (ciclo atual)
// ============================================================
function renderMetricas() {
  const totAzul = state.ranking.reduce((s, m) => s + Number(m.azuis), 0);
  const totAmar = state.ranking.reduce((s, m) => s + Number(m.amarelos), 0);
  const totVerm = state.ranking.reduce((s, m) => s + Number(m.vermelhos), 0);
  const totGeral = totAzul + totAmar + totVerm;

  $('#metricas-resumo').innerHTML = `
    <div class="resumo-card total">
      <div class="resumo-label">Total Cartões</div>
      <div class="resumo-num">${totGeral}</div>
    </div>
    <div class="resumo-card azul">
      <div class="resumo-label">🔵 Azuis</div>
      <div class="resumo-num">${totAzul}</div>
    </div>
    <div class="resumo-card amarelo">
      <div class="resumo-label">🟨 Amarelos</div>
      <div class="resumo-num">${totAmar}</div>
    </div>
    <div class="resumo-card vermelho">
      <div class="resumo-label">🟥 Vermelhos</div>
      <div class="resumo-num">${totVerm}</div>
    </div>
  `;

  $('#metricas-tbody').innerHTML = state.ranking.map((m, idx) => {
    const saldoClass = m.saldo > 0 ? '' : (m.saldo < 0 ? 'negativo' : 'zero');
    const saldoTxt = m.saldo > 0 ? `+${m.saldo}` : `${m.saldo}`;
    return `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <div class="tabela-avatar">
            <img src="avatars/${m.username}.png" alt="${m.nome_exibicao}">
            <span>${m.nome_exibicao}</span>
          </div>
        </td>
        <td>${m.azuis}</td>
        <td>${m.amarelos}</td>
        <td>${m.vermelhos}</td>
        <td class="col-saldo ${saldoClass}">${saldoTxt}</td>
      </tr>
    `;
  }).join('');
}

// ============================================================
// HISTÓRICO (ciclos antigos)
// ============================================================
async function loadHistoricoCiclos() {
  const { data, error } = await sb
    .from('ciclos')
    .select('*')
    .order('numero', { ascending: false });
  if (error) { toast('Erro ao carregar ciclos', 'error'); return; }
  state.ciclos = data || [];

  const sel = $('#select-ciclo');
  sel.innerHTML = state.ciclos.map(c => {
    const ini = new Date(c.data_inicio).toLocaleDateString('pt-BR');
    const fim = c.data_fim ? new Date(c.data_fim).toLocaleDateString('pt-BR') : 'em curso';
    const flag = c.ativo ? ' (atual)' : '';
    return `<option value="${c.id}">Ciclo #${c.numero} — ${ini} → ${fim}${flag}</option>`;
  }).join('');

  sel.removeEventListener('change', onCicloChange);
  sel.addEventListener('change', onCicloChange);

  if (state.ciclos.length > 0) {
    sel.value = state.ciclos[0].id;
    await loadRankingHistorico(state.ciclos[0].id);
  }
}

async function onCicloChange() {
  await loadRankingHistorico($('#select-ciclo').value);
}

async function loadRankingHistorico(cicloId) {
  const { data, error } = await sb.rpc('get_ranking_ciclo', { p_ciclo_id: cicloId });
  if (error) { toast('Erro ao carregar histórico', 'error'); return; }
  const ranking = data || [];

  $('#historico-tbody').innerHTML = ranking.map((m, idx) => {
    const saldoClass = m.saldo > 0 ? '' : (m.saldo < 0 ? 'negativo' : 'zero');
    const saldoTxt = m.saldo > 0 ? `+${m.saldo}` : `${m.saldo}`;
    return `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <div class="tabela-avatar">
            <img src="avatars/${m.username}.png" alt="${m.nome_exibicao}">
            <span>${m.nome_exibicao}</span>
          </div>
        </td>
        <td>${m.azuis}</td>
        <td>${m.amarelos}</td>
        <td>${m.vermelhos}</td>
        <td class="col-saldo ${saldoClass}">${saldoTxt}</td>
      </tr>
    `;
  }).join('');
}

// ============================================================
// TRADUTOR DE ERROS
// ============================================================
function traduzErro(msg) {
  if (!msg) return 'Erro desconhecido.';
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Usuário ou senha incorretos.';
  if (m.includes('already registered') || m.includes('already exists')) return 'Esse usuário já tem conta. Faça login.';
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde 1 min.';
  if (m.includes('email')) return 'Erro de validação. Tente outro usuário.';
  return msg;
}

// ============================================================
// AUTO-LOGIN (sessão salva)
// ============================================================
(async function init() {
  // Pré-preenche username salvo
  const saved = localStorage.getItem('sem-pino-user');
  if (saved) $('#login-user').value = saved;

  // Restaura sessão se houver
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    await initPainel(session.user);
  } else {
    showScreen('login');
  }
})();
