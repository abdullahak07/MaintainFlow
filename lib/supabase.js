function config() {
  const rawUrl = process.env.SUPABASE_URL;
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!rawUrl || !rawKey) return null;

  const url = String(rawUrl).trim().replace(/\/+$/, '');
  const key = String(rawKey).trim();

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    const err = new Error('SUPABASE_URL is not a valid URL');
    err.code = 'INVALID_SUPABASE_URL';
    throw err;
  }

  return { url: parsed.origin, host: parsed.host, key };
}

function headers(extra = {}) {
  const cfg = config();
  if (!cfg) throw new Error('Supabase is not configured');

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

  let res;
  try {
    res = await fetch(`${cfg.url}/rest/v1/${path}`, {
      ...options,
      headers: headers(options.headers || {})
    });
  } catch (cause) {
    const err = new Error('Supabase network request failed');
    err.code = cause?.cause?.code || cause?.code || 'FETCH_FAILED';
    err.host = cfg.host;
    err.causeMessage = cause?.cause?.message || cause?.message || 'fetch failed';
    throw err;
  }

  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

  if (!res.ok) {
    const err = new Error(`Supabase request failed (${res.status})`);
    err.status = res.status;
    err.details = data;
    err.host = cfg.host;
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
