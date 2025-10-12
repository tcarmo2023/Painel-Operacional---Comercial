import { UI } from '../ui.js';
import { Config } from '../supabase.js';

async function loadPDI(container) {
  container.innerHTML = '';
  const filter = document.createElement('div'); filter.className = 'card filters';
  filter.innerHTML = `
    <div class="field"><label class="label">Revenda</label><input class="input" name="revenda"></div>
    <div class="field"><label class="label">Nº Pedido</label><input class="input" name="numero_pedido"></div>
    <div class="field"><label class="label">PDI</label><select class="select" name="status_pdi"><option value="">Todos</option><option>Sim</option><option>Não</option></select></div>
    <div class="field"><label class="label">Cliente</label><input class="input" name="cliente"></div>
    <div class="field"><label class="label">Série</label><input class="input" name="serie"></div>
    <div class="actions"><button class="btn outline" data-clear>Limpar</button><button class="btn" data-apply>Filtrar</button></div>
  `;
  container.appendChild(filter);
  const tableCtn = document.createElement('div'); container.appendChild(tableCtn);

  async function query() {
    try {
      UI.showLoading(true);
      const f = Object.fromEntries([...filter.querySelectorAll('.input,.select')].map(i=>[i.name,i.value]));
      const filters = [];
      if (f.revenda) filters.push(`revenda=ilike.*${encodeURIComponent(f.revenda)}*`);
      if (f.numero_pedido) filters.push(`numero_pedido=ilike.*${encodeURIComponent(f.numero_pedido)}*`);
      if (f.status_pdi) filters.push(`status_pdi=eq.${encodeURIComponent(f.status_pdi)}`);
      if (f.cliente) filters.push(`cliente=ilike.*${encodeURIComponent(f.cliente)}*`);
      if (f.serie) filters.push(`serie=ilike.*${encodeURIComponent(f.serie)}*`);

      const qs = ['select=*', ...filters].join('&');
      const res = await fetch(`${Config.supabaseUrl}/rest/v1/${Config.tables.pdi}?${qs}`, { headers: { 'apikey': Config.supabaseAnonKey, 'Authorization': `Bearer ${Config.supabaseAnonKey}` } });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      tableCtn.innerHTML = '';
      const wrap = document.createElement('div'); wrap.className = 'table-wrapper';
      const table = document.createElement('table'); table.className = 'table';
      table.innerHTML = `
        <thead><tr>
          <th>Revenda</th><th>Nº Pedido</th><th>Série</th><th>Modelo</th><th>Cliente</th><th>Data Maq. Patio</th><th>Status PDI</th>
        </tr></thead><tbody></tbody>`;
      const tb = table.querySelector('tbody');
      data.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.revenda||''}</td><td>${r.numero_pedido||''}</td><td>${r.serie||''}</td><td>${r.modelo||''}</td><td>${r.cliente||''}</td><td>${r.data_maq_patio||''}</td><td><span class="badge ${r.status_pdi==='Sim'?'success':r.status_pdi==='Não'?'warning':'info'}">${r.status_pdi||'—'}</span></td>`;
        tb.appendChild(tr);
      });
      wrap.appendChild(table); tableCtn.appendChild(wrap);

      const actions = document.createElement('div'); actions.style = 'margin-top:12px; display:flex; justify-content:flex-end;';
      actions.innerHTML = `<button class="btn" id="btnAjustePDI"><i class="fa-solid fa-sliders"></i> Ajustar PDI</button>`;
      tableCtn.appendChild(actions);
      document.getElementById('btnAjustePDI').addEventListener('click', ()=> openAdjustPDI());
    } catch (err) { console.error(err); UI.showToast('Erro ao carregar PDI','error'); }
    finally { UI.showLoading(false); }
  }

  filter.querySelector('[data-apply]').addEventListener('click', query);
  filter.querySelector('[data-clear]').addEventListener('click', ()=> { filter.querySelectorAll('input,select').forEach(i=> i.value=''); query(); });
  query();

  function openAdjustPDI() {
    const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal open">
        <div class="modal-header">
          <div class="card-title">Ajuste de Status PDI</div>
          <button class="btn outline" data-close>&times;</button>
        </div>
        <div class="modal-body">
          <div class="field"><label class="label">Nº Pedido</label><input class="input" name="numero_pedido"></div>
          <div class="field"><label class="label">Status PDI</label>
            <select class="select" name="status_pdi">
              <option>Não</option>
              <option>Sim</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn outline" data-close>Cancelar</button>
          <button class="btn success" data-save>Salvar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', ()=> overlay.remove()));
    overlay.querySelector('[data-save]').addEventListener('click', async ()=>{
      const np = overlay.querySelector('input[name="numero_pedido"]').value?.trim();
      const spdi = overlay.querySelector('select[name="status_pdi"]').value;
      if (!np) { UI.showToast('Informe o Nº Pedido', 'warning'); return; }
      try {
        UI.showLoading(true);
        // Update PDI record
        const url = `${Config.supabaseUrl}/rest/v1/${Config.tables.pdi}?numero_pedido=eq.${encodeURIComponent(np)}`;
        const res = await fetch(url, { method:'PATCH', headers:{ 'apikey': Config.supabaseAnonKey, 'Authorization': `Bearer ${Config.supabaseAnonKey}`, 'Content-Type':'application/json' }, body: JSON.stringify({ status_pdi: spdi }) });
        if (!res.ok) throw new Error(await res.text());
        // Reflect back in Estoque
        const url2 = `${Config.supabaseUrl}/rest/v1/${Config.tables.estoque}?numero_pedido=eq.${encodeURIComponent(np)}`;
        await fetch(url2, { method:'PATCH', headers:{ 'apikey': Config.supabaseAnonKey, 'Authorization': `Bearer ${Config.supabaseAnonKey}`, 'Content-Type':'application/json' }, body: JSON.stringify({ status_pdi: spdi }) });
        UI.showToast('PDI atualizado!', 'success'); overlay.remove(); query();
      } catch (err) { console.error(err); UI.showToast('Falha ao atualizar PDI','error'); }
      finally { UI.showLoading(false); }
    });
  }
}

async function loadEntrega(container) {
  container.innerHTML = '';
  const filter = document.createElement('div'); filter.className = 'card filters';
  filter.innerHTML = `
    <div class="field"><label class="label">Revenda</label><input class="input" name="revenda"></div>
    <div class="field"><label class="label">Nº Pedido</label><input class="input" name="numero_pedido"></div>
    <div class="field"><label class="label">Série</label><input class="input" name="serie"></div>
    <div class="field"><label class="label">Modelo</label><input class="input" name="modelo"></div>
    <div class="field"><label class="label">Cliente</label><input class="input" name="cliente"></div>
    <div class="field"><label class="label">Status Entrega</label><select class="select" name="status_entrega"><option value="">Todos</option><option>Feito</option><option>Pendente</option></select></div>
    <div class="actions"><button class="btn outline" data-clear>Limpar</button><button class="btn" data-apply>Filtrar</button></div>
  `;
  container.appendChild(filter);
  const tableCtn = document.createElement('div'); container.appendChild(tableCtn);

  async function query() {
    try {
      UI.showLoading(true);
      const f = Object.fromEntries([...filter.querySelectorAll('.input,.select')].map(i=>[i.name,i.value]));
      const filters = [];
      if (f.revenda) filters.push(`revenda=ilike.*${encodeURIComponent(f.revenda)}*`);
      if (f.numero_pedido) filters.push(`numero_pedido=ilike.*${encodeURIComponent(f.numero_pedido)}*`);
      if (f.serie) filters.push(`serie=ilike.*${encodeURIComponent(f.serie)}*`);
      if (f.modelo) filters.push(`modelo=ilike.*${encodeURIComponent(f.modelo)}*`);
      if (f.cliente) filters.push(`cliente=ilike.*${encodeURIComponent(f.cliente)}*`);
      if (f.status_entrega) filters.push(`status_entrega=eq.${encodeURIComponent(f.status_entrega)}`);
      const qs = ['select=*', ...filters].join('&');
      const res = await fetch(`${Config.supabaseUrl}/rest/v1/${Config.tables.entrega}?${qs}`, { headers: { 'apikey': Config.supabaseAnonKey, 'Authorization': `Bearer ${Config.supabaseAnonKey}` } });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      tableCtn.innerHTML = '';
      const wrap = document.createElement('div'); wrap.className = 'table-wrapper';
      const table = document.createElement('table'); table.className = 'table';
      table.innerHTML = `
        <thead><tr>
          <th>Revenda</th><th>Nº Pedido</th><th>Série</th><th>Modelo</th><th>Cliente</th><th>Status Entrega</th><th>Data Programação</th><th>Data Reprogramação</th><th>Motivo Reprogramação</th>
        </tr></thead><tbody></tbody>`;
      const tb = table.querySelector('tbody');
      data.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.revenda||''}</td><td>${r.numero_pedido||''}</td><td>${r.serie||''}</td><td>${r.modelo||''}</td><td>${r.cliente||''}</td><td><span class="badge ${r.status_entrega==='Feito'?'success':r.status_entrega==='Pendente'?'warning':'info'}">${r.status_entrega||'—'}</span></td><td>${r.data_programacao||''}</td><td>${r.data_reprogramacao||''}</td><td>${r.motivo_reprogramacao||''}</td>`;
        tb.appendChild(tr);
      });
      wrap.appendChild(table); tableCtn.appendChild(wrap);

      const actions = document.createElement('div'); actions.style = 'margin-top:12px; display:flex; justify-content:flex-end; gap:8px;';
      actions.innerHTML = `<button class="btn" id="btnAjusteEntrega"><i class="fa-solid fa-sliders"></i> Ajustar Entrega</button>
      <button class="btn outline" id="btnProgEntrega"><i class="fa-solid fa-calendar"></i> Programar/Reprogramar</button>`;
      tableCtn.appendChild(actions);
      document.getElementById('btnAjusteEntrega').addEventListener('click', ()=> openAdjustEntrega());
      document.getElementById('btnProgEntrega').addEventListener('click', ()=> openProgEntrega());
    } catch (err) { console.error(err); UI.showToast('Erro ao carregar Entrega Técnica','error'); }
    finally { UI.showLoading(false); }
  }

  filter.querySelector('[data-apply]').addEventListener('click', query);
  filter.querySelector('[data-clear]').addEventListener('click', ()=> { filter.querySelectorAll('input,select').forEach(i=> i.value=''); query(); });
  query();

  function openAdjustEntrega() {
    const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal open">
        <div class="modal-header"><div class="card-title">Ajuste de Status Entrega</div><button class="btn outline" data-close>&times;</button></div>
        <div class="modal-body">
          <div class="field"><label class="label">Nº Pedido</label><input class="input" name="numero_pedido"></div>
          <div class="field"><label class="label">Status Entrega</label><select class="select" name="status_entrega"><option>Pendente</option><option>Feito</option></select></div>
        </div>
        <div class="modal-footer"><button class="btn outline" data-close>Cancelar</button><button class="btn success" data-save>Salvar</button></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', ()=> overlay.remove()));
    overlay.querySelector('[data-save]').addEventListener('click', async ()=>{
      const np = overlay.querySelector('input[name="numero_pedido"]').value?.trim();
      const st = overlay.querySelector('select[name="status_entrega"]').value;
      if (!np) { UI.showToast('Informe o Nº Pedido', 'warning'); return; }
      try {
        UI.showLoading(true);
        const url = `${Config.supabaseUrl}/rest/v1/${Config.tables.entrega}?numero_pedido=eq.${encodeURIComponent(np)}`;
        const res = await fetch(url, { method:'PATCH', headers:{ 'apikey': Config.supabaseAnonKey, 'Authorization': `Bearer ${Config.supabaseAnonKey}`, 'Content-Type':'application/json' }, body: JSON.stringify({ status_entrega: st }) });
        if (!res.ok) throw new Error(await res.text());
        // reflect in Estoque
        const url2 = `${Config.supabaseUrl}/rest/v1/${Config.tables.estoque}?numero_pedido=eq.${encodeURIComponent(np)}`;
        await fetch(url2, { method:'PATCH', headers:{ 'apikey': Config.supabaseAnonKey, 'Authorization': `Bearer ${Config.supabaseAnonKey}`, 'Content-Type':'application/json' }, body: JSON.stringify({ status_entrega_tecnica: st }) });
        UI.showToast('Entrega atualizada!','success'); overlay.remove(); query();
      } catch (err) { console.error(err); UI.showToast('Falha ao atualizar Entrega','error'); }
      finally { UI.showLoading(false); }
    });
  }

  function openProgEntrega() {
    const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal open">
        <div class="modal-header"><div class="card-title">Programação/Reprogramação</div><button class="btn outline" data-close>&times;</button></div>
        <div class="modal-body">
          <div class="field"><label class="label">Nº Pedido</label><input class="input" name="numero_pedido"></div>
          <div class="field"><label class="label">Data Programação</label><input class="input" type="date" name="data_programacao"></div>
          <div class="field"><label class="label">Data Reprogramação</label><input class="input" type="date" name="data_reprogramacao"></div>
          <div class="field"><label class="label">Motivo Reprogramação</label><input class="input" name="motivo_reprogramacao"></div>
        </div>
        <div class="modal-footer"><button class="btn outline" data-close>Cancelar</button><button class="btn success" data-save>Salvar</button></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', ()=> overlay.remove()));
    overlay.querySelector('[data-save]').addEventListener('click', async ()=>{
      const np = overlay.querySelector('input[name="numero_pedido"]').value?.trim();
      const dp = overlay.querySelector('input[name="data_programacao"]').value || null;
      const dr = overlay.querySelector('input[name="data_reprogramacao"]').value || null;
      const motivo = overlay.querySelector('input[name="motivo_reprogramacao"]').value || null;
      if (!np) { UI.showToast('Informe o Nº Pedido', 'warning'); return; }
      try {
        UI.showLoading(true);
        const url = `${Config.supabaseUrl}/rest/v1/${Config.tables.entrega}?numero_pedido=eq.${encodeURIComponent(np)}`;
        const res = await fetch(url, { method:'PATCH', headers:{ 'apikey': Config.supabaseAnonKey, 'Authorization': `Bearer ${Config.supabaseAnonKey}`, 'Content-Type':'application/json' }, body: JSON.stringify({ data_programacao: dp, data_reprogramacao: dr, motivo_reprogramacao: motivo }) });
        if (!res.ok) throw new Error(await res.text());
        UI.showToast('Programação salva!','success'); overlay.remove(); query();
      } catch (err) { console.error(err); UI.showToast('Falha ao salvar programação','error'); }
      finally { UI.showLoading(false); }
    });
  }
}

async function bootPOS() {
  const pdi = document.getElementById('pos-pdi');
  const ent = document.getElementById('pos-entrega');
  const section = pdi.closest('[data-tabs]');
  section.addEventListener('tabchange', (e) => {
    if (e.detail.tab === 'pdi') loadPDI(pdi);
    if (e.detail.tab === 'entrega') loadEntrega(ent);
  });
}

document.addEventListener('DOMContentLoaded', bootPOS);
