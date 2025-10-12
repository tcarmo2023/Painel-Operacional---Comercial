import { UI } from '../ui.js';
import { Config } from '../supabase.js';

async function loadUsers(container) {
  container.innerHTML = '';
  const card = document.createElement('div'); card.className = 'card';
  card.innerHTML = `
    <div class="card-header"><div class="card-title">Usuários</div></div>
    <div class="grid" style="display:grid; gap:10px; grid-template-columns: repeat(2, minmax(0,1fr));">
      <div class="field"><label class="label">Nome Completo</label><input class="input" name="nome"></div>
      <div class="field"><label class="label">E-mail</label><input class="input" type="email" name="email"></div>
      <div class="field"><label class="label">Senha Temporária</label><input class="input" name="senha_temporaria"></div>
      <div class="field"><label class="label">Tipo de Usuário</label>
        <select class="select" name="role"><option value="usuario">Usuario</option><option value="admin">Administrador</option></select></div>
      <div class="field"><label class="label">Setor</label>
        <select class="select" name="setor"><option>Apenas Comercial</option><option>Apenas Pós-Vendas</option><option>Comercial e Pós-Vendas</option></select></div>
    </div>
    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px;">
      <button class="btn outline" data-clear>Limpar</button>
      <button class="btn success" data-save>Salvar</button>
    </div>`;
  container.appendChild(card);

  card.querySelector('[data-clear]').addEventListener('click', ()=> card.querySelectorAll('input,select').forEach(i=> i.value=''));
  card.querySelector('[data-save]').addEventListener('click', async ()=>{
    const payload = Object.fromEntries([...card.querySelectorAll('input,select')].map(i=> [i.name, i.value]));
    if (!payload.email || !payload.nome) { UI.showToast('Nome e e-mail são obrigatórios','warning'); return; }
    try {
      UI.showLoading(true);
      const res = await fetch(`${Config.supabaseUrl}/rest/v1/${Config.tables.usuarios}`, { method:'POST', headers:{ 'apikey': Config.supabaseAnonKey, 'Authorization': `Bearer ${Config.supabaseAnonKey}`, 'Content-Type':'application/json', 'Prefer':'return=representation' }, body: JSON.stringify({
        nome: payload.nome,
        email: payload.email,
        senha_temporaria: payload.senha_temporaria || null,
        senha_hash: null,
        role: payload.role,
        setor: payload.setor.toLowerCase().includes('pós') ? 'pós-vendas' : payload.setor.toLowerCase().includes('comercial e') ? 'ambos' : 'comercial',
        ativo: true
      }) });
      if (!res.ok) throw new Error(await res.text());
      UI.showToast('Usuário criado!', 'success');
      card.querySelectorAll('input').forEach(i=> i.value='');
    } catch (err) { console.error(err); UI.showToast('Falha ao criar usuário','error'); }
    finally { UI.showLoading(false); }
  });
}

async function loadAlerts(container) {
  container.innerHTML = '';
  const card = document.createElement('div'); card.className = 'card';
  card.innerHTML = `
    <div class="card-header"><div class="card-title">Configurações de Alerta</div></div>
    <div class="grid" style="display:grid; gap:10px; grid-template-columns: repeat(2, minmax(0,1fr));">
      <div class="field"><label class="label">E-mail para Notificação</label><input class="input" type="email" name="email"></div>
      <div class="field"><label class="label">Tipo de Notificação</label><select class="select" name="tipo"><option value="ambos">Ambos</option><option value="pdi">PDI Pendente</option><option value="entrega">Entrega Técnica Pendente</option></select></div>
    </div>
    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px;">
      <button class="btn success" data-add>Adicionar</button>
    </div>
    <div class="table-wrapper" style="margin-top:12px;"><table class="table"><thead><tr><th>E-mail</th><th>Tipo</th></tr></thead><tbody></tbody></table></div>
  `;
  container.appendChild(card);
  const tbody = card.querySelector('tbody');

  async function refreshList() {
    tbody.innerHTML = '';
    try {
      const url = new URL(`${Config.supabaseUrl}/rest/v1/${Config.tables.alertSettings}`);
      url.searchParams.set('select','*');
      const res = await fetch(url.toString(), { headers: { 'apikey': Config.supabaseAnonKey, 'Authorization': `Bearer ${Config.supabaseAnonKey}` } });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      data.forEach(r => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${r.email}</td><td>${r.tipo}</td>`; tbody.appendChild(tr); });
    } catch (err) { console.error(err); UI.showToast('Erro ao carregar alertas','error'); }
  }

  card.querySelector('[data-add]').addEventListener('click', async ()=>{
    const email = card.querySelector('input[name="email"]').value.trim();
    const tipo = card.querySelector('select[name="tipo"]').value;
    if (!email) { UI.showToast('Informe o e-mail', 'warning'); return; }
    try {
      UI.showLoading(true);
      const res = await fetch(`${Config.supabaseUrl}/rest/v1/${Config.tables.alertSettings}`, { method:'POST', headers:{ 'apikey': Config.supabaseAnonKey, 'Authorization': `Bearer ${Config.supabaseAnonKey}`, 'Content-Type':'application/json', 'Prefer':'return=representation' }, body: JSON.stringify({ email, tipo }) });
      if (!res.ok) throw new Error(await res.text());
      UI.showToast('Alerta adicionado!', 'success');
      card.querySelector('input[name="email"]').value='';
      await refreshList();
    } catch (err) { console.error(err); UI.showToast('Falha ao adicionar alerta','error'); }
    finally { UI.showLoading(false); }
  });

  refreshList();
}

function bootAdmin() {
  const users = document.getElementById('admin-users');
  const alerts = document.getElementById('admin-alerts');
  loadUsers(users); loadAlerts(alerts);
}

document.addEventListener('DOMContentLoaded', bootAdmin);
