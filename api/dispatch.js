const { select, insert, update } = require('../lib/supabase');
const { sendBatch } = require('../lib/email');
const { contractorMessage } = require('../lib/workflow');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'no-store');
  const startedAt = Date.now();

  try {
    const workOrderId = Number(req.body?.workOrderId);
    const tenantMessageOverride = String(req.body?.tenantMessage || '').trim();
    if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
      return res.status(400).json({ error: 'Valid workOrderId is required' });
    }

    const maxPerHour = Math.max(1, Number(process.env.MAX_DEMO_DISPATCHES_PER_HOUR || 20));
    const since = encodeURIComponent(new Date(Date.now() - 3600000).toISOString());
    const joinedSelect = encodeURIComponent('*,properties(id,address),tenants(id,name,email),contractors(id,name,email,trade,response_sla_minutes)');

    const [recent, rows] = await Promise.all([
      select('events', `select=id&event_type=eq.tenant_notified&created_at=gte.${since}&limit=${maxPerHour}`),
      select('work_orders', `select=${joinedSelect}&id=eq.${workOrderId}&limit=1`)
    ]);

    if (recent.length >= maxPerHour) {
      return res.status(429).json({ error: 'Demo dispatch limit reached. Try again later.', code: 'DEMO_RATE_LIMIT' });
    }

    const wo = rows[0];
    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    if (wo.status === 'dispatched') {
      return res.status(200).json({
        ok: true,
        alreadyDispatched: true,
        workOrderCode: `MF-${String(wo.id).padStart(4, '0')}`
      });
    }

    if (!wo.property_id || !wo.tenant_id || !wo.contractor_id) {
      return res.status(409).json({ error: 'Work order needs manual review before dispatch', code: 'INCOMPLETE_MATCH' });
    }
    if (!wo.within_limit) {
      return res.status(409).json({ error: 'Owner approval is required before dispatch', code: 'OWNER_APPROVAL_REQUIRED' });
    }

    const property = wo.properties;
    const tenant = wo.tenants;
    const contractor = wo.contractors;
    if (!property || !tenant || !contractor) {
      return res.status(409).json({ error: 'Related records are missing' });
    }

    const workOrderCode = `MF-${String(wo.id).padStart(4, '0')}`;
    const tenantText = tenantMessageOverride || wo.tenant_message;
    const contractorText = contractorMessage({
      workOrderId: workOrderCode,
      property: property.address,
      subject: wo.subject,
      priority: wo.priority,
      tenantName: tenant.name,
      tenantEmail: tenant.email,
      estimatedLow: wo.estimated_low,
      estimatedHigh: wo.estimated_high
    });

    const [tenantSend, contractorSend] = await sendBatch([
      {
        to: tenant.email,
        intendedTo: tenant.email,
        subject: `${workOrderCode}: Maintenance request received`,
        text: tenantText
      },
      {
        to: contractor.email,
        intendedTo: contractor.email,
        subject: `${workOrderCode}: ${wo.priority} maintenance — ${property.address}`,
        text: contractorText
      }
    ], { idempotencyKey: `maintainflow-dispatch-${wo.id}` });

    const dispatchedAt = new Date().toISOString();
    const events = [
      { work_order_id: wo.id, event_type: 'work_order_logged', detail: 'Work order logged in MaintainFlow.' },
      { work_order_id: wo.id, event_type: 'tenant_notified', detail: `Tenant notification sent to ${tenantSend.actualTo}.` },
      { work_order_id: wo.id, event_type: 'contractor_notified', detail: `${contractor.name} notification sent to ${contractorSend.actualTo}.` },
      { work_order_id: wo.id, event_type: 'property_timeline_updated', detail: 'Property timeline updated.' },
      { work_order_id: wo.id, event_type: 'response_timer_started', detail: `${contractor.response_sla_minutes || 30}-minute contractor response timer started.` }
    ];

    await Promise.all([
      update('work_orders', `id=eq.${wo.id}`, {
        tenant_message: tenantText,
        status: 'dispatched',
        dispatched_at: dispatchedAt,
        tenant_email_message_id: tenantSend.id || null,
        contractor_email_message_id: contractorSend.id || null
      }),
      insert('events', events)
    ]);

    const dispatchMs = Date.now() - startedAt;
    res.setHeader('Server-Timing', `maintainflow;dur=${dispatchMs}`);
    return res.status(200).json({
      ok: true,
      workOrderCode,
      property: property.address,
      priority: wo.priority,
      contractor: contractor.name,
      responseSlaMinutes: contractor.response_sla_minutes || 30,
      tenantNotification: tenantSend,
      contractorNotification: contractorSend,
      dispatchedAt,
      dispatchMs
    });
  } catch (error) {
    if (error.code === 'NOT_CONFIGURED') return res.status(503).json({ error: 'Backend not configured', code: 'BACKEND_NOT_CONFIGURED' });
    if (error.code === 'EMAIL_NOT_CONFIGURED') return res.status(503).json({ error: 'Email not configured', code: 'EMAIL_NOT_CONFIGURED' });
    if (error.code === 'LIVE_DISPATCH_DISABLED') return res.status(503).json({ error: error.message, code: 'LIVE_DISPATCH_DISABLED' });
    console.error(error);
    return res.status(500).json({ error: 'Could not dispatch work order', details: error.details || error.message });
  }
};
