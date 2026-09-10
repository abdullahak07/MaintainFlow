const { select, insert, update } = require('../lib/supabase');
const { sendEmail } = require('../lib/email');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'no-store');

  try {
    const workOrderId = Number(req.body?.workOrderId);
    const reason = String(req.body?.reason || 'Not proceeding').trim().slice(0, 160);
    const tenantMessage = String(req.body?.tenantMessage || '').trim();

    if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
      return res.status(400).json({ error: 'Valid workOrderId is required' });
    }
    if (!tenantMessage) {
      return res.status(400).json({ error: 'Tenant message is required' });
    }

    const joinedSelect = encodeURIComponent('*,tenants(id,name,email),properties(id,address)');
    const rows = await select('work_orders', `select=${joinedSelect}&id=eq.${workOrderId}&limit=1`);
    const wo = rows[0];

    if (!wo) return res.status(404).json({ error: 'Work order not found' });
    if (wo.status === 'dispatched') {
      return res.status(409).json({ error: 'A dispatched work order cannot be rejected' });
    }
    if (wo.status === 'rejected') {
      return res.status(200).json({
        ok: true,
        alreadyRejected: true,
        workOrderCode: `MF-${String(wo.id).padStart(4, '0')}`
      });
    }

    const tenant = wo.tenants;
    const property = wo.properties;
    if (!tenant?.email) {
      return res.status(409).json({ error: 'Tenant email is missing', code: 'TENANT_EMAIL_MISSING' });
    }

    const workOrderCode = `MF-${String(wo.id).padStart(4, '0')}`;
    const tenantSend = await sendEmail({
      to: tenant.email,
      intendedTo: tenant.email,
      subject: `${workOrderCode}: Maintenance request update`,
      text: tenantMessage,
      idempotencyKey: `maintainflow-reject-${wo.id}`
    });

    await Promise.all([
      update('work_orders', `id=eq.${wo.id}`, {
        status: 'rejected',
        tenant_message: tenantMessage,
        tenant_email_message_id: tenantSend.id || null
      }),
      insert('events', [
        {
          work_order_id: wo.id,
          event_type: 'rejected',
          detail: `Property manager rejected the prepared work order. Reason: ${reason}`
        },
        {
          work_order_id: wo.id,
          event_type: 'tenant_rejection_notified',
          detail: `Tenant rejection/update sent to ${tenantSend.actualTo}.`
        }
      ])
    ]);

    return res.status(200).json({
      ok: true,
      workOrderCode,
      property: property?.address || null,
      reason,
      tenantNotification: tenantSend
    });
  } catch (error) {
    if (error.code === 'NOT_CONFIGURED') return res.status(503).json({ error: 'Backend not configured', code: 'BACKEND_NOT_CONFIGURED' });
    if (error.code === 'EMAIL_NOT_CONFIGURED') return res.status(503).json({ error: 'Email not configured', code: 'EMAIL_NOT_CONFIGURED' });
    if (error.code === 'LIVE_DISPATCH_DISABLED') return res.status(503).json({ error: error.message, code: 'LIVE_DISPATCH_DISABLED' });
    console.error(error);
    return res.status(500).json({ error: 'Could not reject work order', details: error.details || error.message });
  }
};
