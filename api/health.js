const { config, select } = require('../lib/supabase');
const { configured: emailConfigured } = require('../lib/email');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'no-store');

  let database = false;
  let databaseError = null;

  if (config()) {
    try {
      await select('properties', 'select=id&limit=1');
      database = true;
    } catch (error) {
      databaseError = error?.details?.message || error?.message || 'Database check failed';
    }
  }

  return res.status(200).json({
    ok: database && emailConfigured(),
    database,
    email: emailConfigured(),
    safeDemoRecipient: Boolean(process.env.DEMO_RECIPIENT),
    ...(databaseError ? { databaseError } : {})
  });
};
