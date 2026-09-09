function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), key: key.trim() };
}

function headers(extra = {}) {
  const cfg = config();
  if (!cfg) throw new Error('Supabase is not configured');

  // New Supabase server keys use the sb_secret_... format and should be sent
  // as the apikey. Legacy service-role keys are JWTs and can also be used as
  // the Bearer token. Sending an sb_secret_ key as a Bearer JWT causes real
  // REST requests to fail even though the configuration appears present.
  const base = {
    apikey: cfg.key,
    'Content-Type': 'application/json'
  };

  if (cfg.key.startsWith('eyJ')) {
    base.Authorization = `Bearer ${cfg.key}`;
  }

  return { ...base, ...extra };
}

async function request(path, options = {}) {
  const cfg = config();
  if (!cfg) {
    const err = new Error('Supabase is not configured');
    err.code = 'NOT_CONFIGURED';
    throw err;
  }

  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    ...options,
    headers: headers(options.headers || {})
  });

  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

  if (!res.ok) {
    const err = new Error(`Supabase request failed (${res.status})`);
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}

async function select(table, query = '') {
  return request(`${table}?${query}`);
}

async function insert(table, body) {
  const rows = await request(table, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(body)
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

async function update(table, query, body) {
  const rows = await request(`${table}?${query}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(body)
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

module.exports = { config, select, insert, update };
