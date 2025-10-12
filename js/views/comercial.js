import { UI } from '../ui.js';
import { Config, apiGet, apiInsert, apiUpdate, ilike, eq, between } from '../supabase.js';

function mountFilters(container, fields) {
  const wrap = document.createElement('div');
  wrap.className = 'card filters';
  fields.forEach(f => {
    const field = document.createElement('div');
    field.className = 'field';
    field.innerHTML = `<label class="label">${f.label}</label>`;
    let input;
    if (f.type === 'select') {
      input = document.createElement('select'); input.className = 'select';
      (f.options || []).forEach(opt => { const o = document.createElement('option'); o.value = opt.value; o.textContent = opt.label; input.appendChild(o); });
    } else { input = document.createElement('input'); input.className = 'input'; input.type = f.type || 'text'; input.placeholder = f.placeholder || ''; }
    input.name = f.name;
    field.appendChild(input);
    wrap.appendChild(field);
  });
  const actions = document.createElement('div'); actions.className = 'actions';
  actions.innerHTML = `
    <button class="btn outline" data-action="clear"><i class="fa-solid fa-eraser"></i> Limpar</button>
    <button class="btn" data-action="apply"><i class="fa-solid fa-filter"></i> Filtrar</button>
  `;
  wrap.appendChild(actions);
  container.appendChild(wrap);
  return wrap;
}

function renderTable(container, columns, rows) {
  const wrapper = document.createElement('div'); wrapper.className = 'table-wrapper fade-in';
  const table = document.createElement('table'); table.className = 'table';
  const thead = document.createElement('thead'); const trh = document.createElement('tr');
  columns.forEach(c => { const th = document.createElement('th'); th.textContent = c.label; trh.appendChild(th); });
  thead.appendChild(trh); table.appendChild(thead);
  const tbody = document.createElement('tbody');
  rows.forEach(row => {
    const tr = document.createElement('tr');
    columns.forEach(c => {
      const td = document.createElement('td');
      const value = typeof c.format === 'function' ? c.format(row[c.key], row) : row[c.key];
      td.innerHTML = value ?? '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrapper.appendChild(table);
  container.appendChild(wrapper);
  return { wrapper, table };
}

async function loadEstoque(container, filters) {
  container.innerHTML = '';
  const cols = [
    { key: 'revenda', label: 'Revenda' },
    { key: 'numero_pedido', label: 'Nº Pedido' },
    { key: 'status_pdi', label: 'Status PDI', format: (v)=>`<span class="badge ${v==='Sim'?'success':v==='Não'?'warning':'info'}">${v||'—'}</span>` },
    { key: 'status_entrega_tecnica', label: 'Status Entrega Tecnica', format: (v)=>`<span class="badge ${v==='Feito'?'success':v==='Pendente'?'warning':'info'}">${v||'—'}</span>` },
    { key: 'cliente', label: 'Cliente' },
    { key: 'qtde', label: 'Qtde' },
    { key: 'modelo', label: 'Modelo' },
    { key: 'localizacao', label: 'Localização' },
    { key: 'dias_faturado_fabrica', label: 'Dias Fat. Fabrica' },
    { key: 'status_pagamento', label: 'Status Pagamento' },
    { key: 'ano', label: 'Ano' },
    { key: 'previsao_chegada', label: 'Previsão Chegada' },
    { key: 'chegada_patio', label: 'Chegada Patio' },
    { key: 'data_venda', label: 'Data Venda' },
    { key: 'status_maq', label: 'Status Maq.' }
  ];

  const filterBar = mountFilters(container, [
    { name: 'pdi', label: 'PDI', type: 'select', options: [{value:'',label:'Todos'},{value:'Sim',label:'Sim'},{value:'Não',label:'Não'}] },
    { name: 'status_pagamento', label: 'Status Pagamento', type: 'text', placeholder:'Ex.: Pago' },
    { name: 'numero_pedido', label: 'Nº Pedido', type: 'text' },
    { name: 'serie', label: 'Série', type: 'text' },
    { name: 'revenda', label: 'Revenda', type: 'text' },
    { name: 'chegada_patio', label: 'Data (Chegada Patio) de', type: 'date' },
    { name: 'chegada_patio_ate', label: 'Data (Chegada Patio) até', type: 'date' },
    { name: 'ano', label: 'Ano', type: 'number' }
  ]);

  async function query() {
    try {
      UI.showLoading(true);
      const fields = Object.fromEntries([...filterBar.querySelectorAll('.field .input, .field .select')].map(i => [i.name, i.value]));
      const filters = [];
      if (fields.pdi) filters.push(`status_pdi=eq.${encodeURIComponent(fields.pdi)}`);
      if (fields.status_pagamento) filters.push(`status_pagamento=ilike.*${encodeURIComponent(fields.status_pagamento)}*`);
      if (fields.numero_pedido) filters.push(`numero_pedido=ilike.*${encodeURIComponent(fields.numero_pedido)}*`);
      if (fields.serie) filters.push(`serie=ilike.*${encodeURIComponent(fields.serie)}*`);
      if (fields.revenda) filters.push(`revenda=ilike.*${encodeURIComponent(fields.revenda)}*`);
      if (fields.ano) filters.push(`ano=eq.${encodeURIComponent(fields.ano)}`);
      if (fields.chegada_patio) filters.push(`chegada_patio=gte.${encodeURIComponent(fields.chegada_patio)}`);
      if (fields.chegada_patio_ate) filters.push(`chegada_patio=lte.${encodeURIComponent(fields.chegada_patio_ate)}`);

      const qs = ['select=*', ...filters, 'order=chegada_patio.desc'].join('&');
      const res = await fetch(`${Config.supabaseUrl}/rest/v1/${Config.tables.estoque}?${qs}`, { headers: { 'apikey': Config.supabaseAnonKey, 'Authorization': `Bearer ${Config.supabaseAnonKey}` } });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      container.querySelectorAll('.table-wrapper').forEach(e => e.remove());
      const { wrapper } = renderTable(container, cols, data.map(r => ({
        revenda: r.revenda,
        numero_pedido: r.numero_pedido,
        status_pdi: r.status_pdi || (r.status_pdi === false ? 'Não' : r.status_pdi),
        status_entrega_tecnica: r.status_entrega_tecnica,
        cliente: r.cliente,
        qtde: r.qtde,
        modelo: r.modelo,
        localizacao: r.localizacao,
        dias_faturado_fabrica: r.dias_faturado_fabrica,
        status_pagamento: r.status_pagamento,
        ano: r.ano,
        previsao_chegada: r.previsao_chegada,
        chegada_patio: r.chegada_patio,
        data_venda: r.data_venda,
        status_maq: r.status_maq
      })));

      // Add status adjust action
      const actions = document.createElement('div'); actions.style = 'margin-top:12px; display:flex; justify-content:flex-end;';
      actions.innerHTML = `<button class="btn" id="btnAjuste"><i class="fa-solid fa-sliders"></i> Ajustar Status</button>`;
      container.appendChild(actions);
      document.getElementById('btnAjuste').addEventListener('click', () => openAjusteModal());
    } catch (err) {
      console.error(err); UI.showToast('Erro ao carregar estoque', 'error');
    } finally { UI.showLoading(false); }
  }

  filterBar.querySelector('[data-action="apply"]').addEventListener('click', query);
  filterBar.querySelector('[data-action="clear"]').addEventListener('click', () => { filterBar.querySelectorAll('input,select').forEach(i=>i.value=''); query(); });
  query();

  // Ajuste Status modal
  function openAjusteModal() {
    const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div class="card-title">Ajuste de Status</div>
          <button class="btn outline" data-close>&times;</button>
        </div>
        <div class="modal-body">
          <div class="field"><label class="label">Nº Pedido</label><input class="input" name="numero_pedido"></div>
          <div class="field"><label class="label">Localização</label>
            <select class="select" name="localizacao">
              <option value="Em Trânsito">Em Trânsito</option>
              <option value="Maquina no Patio">Maquina no Patio</option>
              <option value="Cliente">Cliente</option>
            </select>
          </div>
          <div class="field"><label class="label">Status Maq.</label>
            <select class="select" name="status_maq">
              <option value="Em Trânsito">Em Trânsito</option>
              <option value="Estoque">Estoque</option>
              <option value="Entrega ao Cliente">Entrega ao Cliente</option>
            </select>
          </div>
          <div class="field"><label class="label">Cliente</label><input class="input" name="cliente"></div>
        </div>
        <div class="modal-footer">
          <button class="btn outline" data-close>Cancelar</button>
          <button class="btn success" data-save>Salvar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const panel = overlay.querySelector('.modal'); panel.classList.add('open');

    overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', ()=> overlay.remove()));
    overlay.querySelector('[data-save]').addEventListener('click', async () => {
      const np = overlay.querySelector('input[name="numero_pedido"]').value?.trim();
      const loc = overlay.querySelector('select[name="localizacao"]').value;
      const sm = overlay.querySelector('select[name="status_maq"]').value;
      const cliente = overlay.querySelector('input[name="cliente"]').value?.trim();
      if (!np) { UI.showToast('Informe o Nº Pedido', 'warning'); return; }
      try {
        UI.showLoading(true);
        // Fetch existing estoque row for derived fields (revenda, serie, modelo)
        const getUrl = new URL(`${Config.supabaseUrl}/rest/v1/${Config.tables.estoque}`);
        getUrl.searchParams.set('select','*');
        getUrl.searchParams.append(`numero_pedido=eq.${encodeURIComponent(np)}`,'');
        const exRes = await fetch(getUrl.toString(), { headers: { 'apikey': Config.supabaseAnonKey, 'Authorization': `Bearer ${Config.supabaseAnonKey}` } });
        const ex = exRes.ok ? (await exRes.json())[0] : null;

        await apiUpdate(Config.tables.estoque, { numero_pedido: np }, { localizacao: loc, status_maq: sm, cliente });

        // Side effects: when localizacao becomes Maquina no Patio -> ensure PDI record defaults
        if (loc === 'Maquina no Patio') {
          try {
            await apiInsert(Config.tables.pdi, {
              revenda: ex?.revenda || null,
              numero_pedido: np,
              serie: ex?.serie || null,
              modelo: ex?.modelo || null,
              cliente: cliente || ex?.cliente || null,
              data_maq_patio: new Date().toISOString().slice(0,10),
              status_pdi: 'Não'
            });
          } catch (_) { /* ignore if exists */ }
        }
        // When status_maq becomes Entrega ao Cliente -> ensure Entrega Técnica record defaults
        if (sm === 'Entrega ao Cliente') {
          try {
            await apiInsert(Config.tables.entrega, {
              revenda: ex?.revenda || null,
              numero_pedido: np,
              serie: ex?.serie || null,
              modelo: ex?.modelo || null,
              cliente: cliente || ex?.cliente || null,
              status_entrega: 'Pendente'
            });
          } catch (_) { /* ignore if exists */ }
        }

        UI.showToast('Atualizado com sucesso!', 'success');
        overlay.remove();
        // refresh
        loadEstoque(container);
      } catch (err) { console.error(err); UI.showToast('Falha ao atualizar', 'error'); }
      finally { UI.showLoading(false); }
    });
  }
}

async function loadVendas(container) {
  container.innerHTML = '';
  const cols = [
    { key: 'revenda', label: 'Revenda' },
    { key: 'numero_pedido', label: 'Nº Pedido' },
    { key: 'serie', label: 'Série' },
    { key: 'data_venda', label: 'Data Venda' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'qtde', label: 'Qtde' },
    { key: 'modelo', label: 'Modelo' },
    { key: 'localizacao', label: 'Localização' },
    { key: 'status_pagamento', label: 'Status Pagamento' }
  ];

  const filterBar = mountFilters(container, [
    { name: 'revenda', label: 'Revenda', type: 'text' },
    { name: 'numero_pedido', label: 'Nº Pedido', type: 'text' },
    { name: 'status_pagamento', label: 'Status Pagamento', type: 'text' },
    { name: 'data_venda', label: 'Data Venda', type: 'date' }
  ]);

  async function query() {
    try {
      UI.showLoading(true);
      const fields = Object.fromEntries([...filterBar.querySelectorAll('.field .input, .field .select')].map(i => [i.name, i.value]));
      const filters = [];
      if (fields.revenda) filters.push(`revenda=ilike.*${encodeURIComponent(fields.revenda)}*`);
      if (fields.numero_pedido) filters.push(`numero_pedido=ilike.*${encodeURIComponent(fields.numero_pedido)}*`);
      if (fields.status_pagamento) filters.push(`status_pagamento=ilike.*${encodeURIComponent(fields.status_pagamento)}*`);
      if (fields.data_venda) filters.push(`data_venda=eq.${encodeURIComponent(fields.data_venda)}`);
      const qs = ['select=*', ...filters, 'order=data_venda.desc'].join('&');
      const res = await fetch(`${Config.supabaseUrl}/rest/v1/${Config.tables.vendas}?${qs}`, { headers: { 'apikey': Config.supabaseAnonKey, 'Authorization': `Bearer ${Config.supabaseAnonKey}` } });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      container.querySelectorAll('.table-wrapper').forEach(e => e.remove());
      renderTable(container, cols, data);
    } catch (err) { console.error(err); UI.showToast('Erro ao carregar vendas','error'); }
    finally { UI.showLoading(false); }
  }

  filterBar.querySelector('[data-action="apply"]').addEventListener('click', query);
  filterBar.querySelector('[data-action="clear"]').addEventListener('click', () => { filterBar.querySelectorAll('input,select').forEach(i=>i.value=''); query(); });
  query();
}

async function loadPedidos(container) {
  container.innerHTML = '';
  const cols = [
    { key: 'numero_pedido', label: 'Nº Pedido' },
    { key: 'modelo', label: 'Modelo' },
    { key: 'entrega', label: 'Entrega' },
    { key: 'uf', label: 'UF' },
    { key: 'revenda', label: 'Revenda' },
    { key: 'status', label: 'Status' },
    { key: 'ano', label: 'Ano' }
  ];

  const filterBar = mountFilters(container, [
    { name: 'revenda', label: 'Revenda', type: 'text' },
    { name: 'numero_pedido', label: 'Nº Pedido', type: 'text' },
    { name: 'entrega', label: 'Entrega', type: 'text' },
    { name: 'status', label: 'Status', type: 'text' },
    { name: 'ano', label: 'Ano', type: 'number' }
  ]);

  async function query() {
    try {
      UI.showLoading(true);
      const fields = Object.fromEntries([...filterBar.querySelectorAll('.field .input, .field .select')].map(i => [i.name, i.value]));
      const filters = [];
      if (fields.revenda) filters.push(`revenda=ilike.*${encodeURIComponent(fields.revenda)}*`);
      if (fields.numero_pedido) filters.push(`numero_pedido=ilike.*${encodeURIComponent(fields.numero_pedido)}*`);
      if (fields.entrega) filters.push(`entrega=ilike.*${encodeURIComponent(fields.entrega)}*`);
      if (fields.status) filters.push(`status=ilike.*${encodeURIComponent(fields.status)}*`);
      if (fields.ano) filters.push(`ano=eq.${encodeURIComponent(fields.ano)}`);
      const qs = ['select=*', ...filters].join('&');
      const res = await fetch(`${Config.supabaseUrl}/rest/v1/${Config.tables.pedidos}?${qs}`, { headers: { 'apikey': Config.supabaseAnonKey, 'Authorization': `Bearer ${Config.supabaseAnonKey}` } });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      container.querySelectorAll('.table-wrapper').forEach(e => e.remove());
      renderTable(container, cols, data);
    } catch (err) { console.error(err); UI.showToast('Erro ao carregar pedidos','error'); }
    finally { UI.showLoading(false); }
  }

  filterBar.querySelector('[data-action="apply"]').addEventListener('click', query);
  filterBar.querySelector('[data-action="clear"]').addEventListener('click', () => { filterBar.querySelectorAll('input,select').forEach(i=>i.value=''); query(); });
  query();
}

function loadNovos(container) {
  container.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'card';
  wrapper.innerHTML = `
    <div class="card-header"><div class="card-title">Novos Registros</div></div>
    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
      <button class="btn" data-k="estoque">Estoque</button>
      <button class="btn" data-k="vendas">Vendas</button>
      <button class="btn" data-k="pedidos">Pedidos JCB</button>
    </div>
    <div id="formArea" class="grid" style="display:grid; gap:10px;"></div>
    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px;">
      <button class="btn outline" id="btnClear">Limpar</button>
      <button class="btn success" id="btnSave">Salvar</button>
    </div>
  `;
  container.appendChild(wrapper);
  const formArea = wrapper.querySelector('#formArea');
  let current = 'estoque';

  const fieldsMap = {
    estoque: ['revenda','numero_pedido','serie','faturado_fabrica','cliente','qtde','modelo','nf_jcb','localizacao','dias_faturado_fabrica','frete','dealer_net','status_pagamento','ano','data_retirada_fabrica','previsao_chegada','chegada_patio','dias_no_patio','data_venda','data_et','status_pdi'],
    vendas: ['revenda','numero_pedido','serie','data_venda','cliente','qtde','modelo','nf_jcb','localizacao','dias_no_patio','frete_sp_pe_ce','venda','status_pagamento'],
    pedidos: ['numero_pedido','modelo','dealer_net','entrega','uf','revenda','status','ano']
  };

  function renderForm(kind) {
    current = kind; formArea.innerHTML = '';
    fieldsMap[kind].forEach(name => {
      const div = document.createElement('div'); div.className = 'field';
      const label = name.replace(/_/g,' ').replace(/\b\w/g, c=>c.toUpperCase());
      div.innerHTML = `<label class="label">${label}</label><input class="input" name="${name}" />`;
      formArea.appendChild(div);
    });
  }

  wrapper.querySelectorAll('button[data-k]').forEach(b => b.addEventListener('click', ()=> renderForm(b.dataset.k)));
  wrapper.querySelector('#btnClear').addEventListener('click', ()=> formArea.querySelectorAll('input').forEach(i=> i.value = ''));
  wrapper.querySelector('#btnSave').addEventListener('click', async () => {
    try {
      UI.showLoading(true);
      const payload = {}; formArea.querySelectorAll('input').forEach(i => payload[i.name] = i.value || null);
      const map = { estoque: Config.tables.estoque, vendas: Config.tables.vendas, pedidos: Config.tables.pedidos };
      await fetch(`${Config.supabaseUrl}/rest/v1/${map[current]}`, { method:'POST', headers: { 'apikey': Config.supabaseAnonKey, 'Authorization': `Bearer ${Config.supabaseAnonKey}`, 'Content-Type':'application/json', 'Prefer':'return=representation' }, body: JSON.stringify(payload) });
      UI.showToast('Registro salvo!', 'success');
      formArea.querySelectorAll('input').forEach(i=> i.value = '');
    } catch (err) { console.error(err); UI.showToast('Falha ao salvar','error'); }
    finally { UI.showLoading(false); }
  });

  renderForm('estoque');
}

function bootComercial() {
  const esto = document.getElementById('comercial-estoque');
  const ven = document.getElementById('comercial-vendas');
  const ped = document.getElementById('comercial-pedidos');
  const nov = document.getElementById('comercial-novos');

  const section = esto.closest('[data-tabs]');
  section.addEventListener('tabchange', (e) => {
    if (e.detail.tab === 'estoque') loadEstoque(esto);
    if (e.detail.tab === 'vendas') loadVendas(ven);
    if (e.detail.tab === 'pedidos') loadPedidos(ped);
    if (e.detail.tab === 'novos') loadNovos(nov);
  });
}

document.addEventListener('DOMContentLoaded', bootComercial);
