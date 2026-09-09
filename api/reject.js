const { select, insert, update } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'no-store');
  try {
    const workOrderId = Number(req.body?.workOrderId);
    if (!Number.isInteger(workOrderId) || workOrderId <= 0) return res.status(400).json({ error: 'Valid workOrderId is required' });
    const rows = await select('work_orders', `select=id,status&id=eq.${workOrderId}&limit=1`);
    const wo = rows[0];
    if (!wo) return res.status(404).json({ error: 'Work order not found' });
    if (wo.status === 'dispatched') return res.status(409).json({ error: 'A dispatched work order cannot be rejected' });
    await update('work_orders', `id=eq.${workOrderId}`, { status: 'rejected' });
    await insert('events', { work_order_id: workOrderId, event_type: 'rejected', detail: 'Property manager rejected the prepared work order.' });
    return res.status(200).json({ ok: true, workOrderCode: `MF-${String(workOrderId).padStart(4, '0')}` });
  } catch (error) {
    if (error.code === 'NOT_CONFIGURED') return res.status(503).json({ error: 'Backend not configured', code: 'BACKEND_NOT_CONFIGURED' });
    console.error(error);
    return res.status(500).json({ error: 'Could not reject work order', details: error.details || error.message });
  }
};
