// Supabase REST helper (no client library) + app config
export const Config = {
  supabaseUrl: 'https://vukpgdftmtuxibnkszil.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1a3BnZGZ0bXR1eGlibmtzemlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODk4NDIsImV4cCI6MjA3NTY2NTg0Mn0.4U8uYaOtbFH0GGn1gMPirWa4koslor_3feW7wapxpmw',
  // Adjust table names to match your database
  tables: {
    usuarios: 'usuarios',
    estoque: 'estoque',
    vendas: 'vendas',
    pedidos: 'pedidos_jcb',
    pdi: 'pdi',
    entrega: 'entrega_tecnica',
    alertSettings: 'alert_settings',
  }
};

function headers() {
  return {
    'apikey': Config.supabaseAnonKey,
    'Authorization': `Bearer ${Config.supabaseAnonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

function buildQuery(params) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '') continue;
    usp.set(k, v);
  }
  return usp.toString();
}

// Simple GET helper using raw filter strings: filters should look like ["field=eq.value", "other=ilike.*x*"]
export async function apiGet(table, { select = '*', filters = [], orderBy } = {}) {
  const params = [`select=${encodeURIComponent(select)}`];
  if (Array.isArray(filters)) params.push(...filters);
  if (orderBy) params.push(`order=${orderBy}`);
  const url = `${Config.supabaseUrl}/rest/v1/${table}?${params.join('&')}`;
  const res = await fetch(url, { headers: headers(), method: 'GET' });
  if (!res.ok) throw new Error(`GET ${table} failed: ${await res.text()}`);
  return await res.json();
}

export async function apiInsert(table, payload) {
  const url = `${Config.supabaseUrl}/rest/v1/${table}`;
  const res = await fetch(url, { method: 'POST', headers: headers(), body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`INSERT ${table} failed: ${await res.text()}`);
  return await res.json();
}

export async function apiUpdate(table, matchFilter, payload) {
  const filters = Object.entries(matchFilter).map(([k, v]) => `${encodeURIComponent(k)}=eq.${encodeURIComponent(v)}`);
  const url = `${Config.supabaseUrl}/rest/v1/${table}?${filters.join('&')}`;
  const res = await fetch(url, { method: 'PATCH', headers: headers(), body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`UPDATE ${table} failed: ${await res.text()}`);
  return await res.json();
}

export async function apiUpsert(table, payload) {
  const url = `${Config.supabaseUrl}/rest/v1/${table}`;
  const h = headers();
  h['Prefer'] = 'resolution=merge-duplicates,return=representation';
  const res = await fetch(url, { method: 'POST', headers: h, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`UPSERT ${table} failed: ${await res.text()}`);
  return await res.json();
}

export function ilike(field, term) { if (!term) return null; return `${field}=ilike.*${encodeURIComponent(term)}*`; }
export function eq(field, value) { if (value === undefined || value === null || value === '') return null; return `${field}=eq.${encodeURIComponent(value)}`; }
export function between(field, from, to) {
  const parts = [];
  if (from) parts.push(`${field}=gte.${encodeURIComponent(from)}`);
  if (to) parts.push(`${field}=lte.${encodeURIComponent(to)}`);
  return parts;
}
