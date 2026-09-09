const { config } = require('../lib/supabase');
const { configured: emailConfigured } = require('../lib/email');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    database: Boolean(config()),
    email: emailConfigured(),
    safeDemoRecipient: Boolean(process.env.DEMO_RECIPIENT)
  });
};
