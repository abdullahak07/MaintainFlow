const { select, insert } = require('../lib/supabase');
const {
  parseEmail,
  classify,
  extractAddress,
  extractName,
  routeFor,
  tenantMessage,
  contractorMessage,
  normalizeAddress
} = require('../lib/workflow');

const q = encodeURIComponent;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'no-store');
  const startedAt = Date.now();

  try {
    const rawEmail = String(req.body?.rawEmail || '').trim();
    if (!rawEmail) return res.status(400).json({ error: 'rawEmail is required' });

    const { from, subject, body } = parseEmail(rawEmail);
    const [category, priority] = classify(`${subject} ${body}`);
    const extractedAddress = extractAddress(body);
    const tenantName = extractName(body, from);
    const route = routeFor(category);
    const normalized = normalizeAddress(extractedAddress);

    const [properties, tenantsByEmail, contractors] = await Promise.all([
      select('properties', `select=id,address,address_key,owner_approval_limit&address_key=eq.${q(normalized)}&active=eq.true&limit=1`),
      select('tenants', `select=id,name,email,property_id&email=eq.${q(from)}&active=eq.true&limit=1`),
      select('contractors', `select=id,name,email,trade,response_sla_minutes&trade=eq.${q(route.trade)}&active=eq.true&order=priority_rank.asc&limit=1`)
    ]);

    const property = properties[0] || null;
    let tenant = tenantsByEmail[0] || null;
    const contractor = contractors[0] || null;

    if (!property || !tenant || Number(tenant.property_id) !== Number(property.id)) tenant = null;

    if (property && !tenant) {
      const byProperty = await select('tenants', `select=id,name,email,property_id&property_id=eq.${property.id}&active=eq.true&limit=1`);
      tenant = byProperty[0] || null;
    }

    const ownerLimit = property ? Number(property.owner_approval_limit) : null;
    const withinLimit = ownerLimit != null ? route.high <= ownerLimit : false;
    const requiresAttention = !property || !tenant || !contractor || !withinLimit;
    const draftTenantMessage = tenantMessage(tenant?.name || tenantName, subject, priority);

    const created = await insert('work_orders', {
      property_id: property?.id || null,
      tenant_id: tenant?.id || null,
      contractor_id: contractor?.id || null,
      sender_email: from,
      tenant_name: tenant?.name || tenantName,
      extracted_address: extractedAddress,
      subject,
      raw_email: rawEmail,
      category,
      priority,
      trade: route.trade,
      estimated_low: route.low,
      estimated_high: route.high,
      owner_limit: ownerLimit,
      within_limit: withinLimit,
      tenant_message: draftTenantMessage,
      status: requiresAttention ? 'needs_review' : 'pending_approval'
    });

    const workOrderCode = `MF-${String(created.id).padStart(4, '0')}`;
    const draftContractorMessage = contractorMessage({
      workOrderId: workOrderCode,
      property: property?.address || extractedAddress || 'Unmatched property',
      subject,
      priority,
      tenantName: tenant?.name || tenantName,
      tenantEmail: tenant?.email || from,
      estimatedLow: route.low,
      estimatedHigh: route.high
    });

    await insert('events', {
      work_order_id: created.id,
      event_type: 'processed',
      detail: 'Inbound maintenance email processed and work order prepared.'
    });

    const processingMs = Date.now() - startedAt;
    res.setHeader('Server-Timing', `maintainflow;dur=${processingMs}`);
    return res.status(200).json({
      mode: 'backend',
      workOrderId: created.id,
      workOrderCode,
      status: requiresAttention ? 'needs_review' : 'pending_approval',
      propertyMatched: Boolean(property),
      tenantMatched: Boolean(tenant),
      contractorMatched: Boolean(contractor),
      property: property?.address || extractedAddress || 'Needs confirmation',
      tenant: tenant?.name || tenantName,
      tenantEmail: tenant?.email || from,
      issue: subject,
      category,
      priority,
      trade: route.trade,
      contractor: contractor?.name || 'Needs confirmation',
      contractorEmail: contractor?.email || null,
      estimatedLow: route.low,
      estimatedHigh: route.high,
      ownerLimit,
      withinLimit,
      requiresAttention,
      tenantMessage: draftTenantMessage,
      contractorMessage: draftContractorMessage,
      responseSlaMinutes: contractor?.response_sla_minutes || route.sla_minutes,
      processingMs
    });
  } catch (error) {
    if (error.code === 'NOT_CONFIGURED') {
      return res.status(503).json({ error: 'Backend not configured', code: 'BACKEND_NOT_CONFIGURED' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Could not process request', details: error.details || error.message });
  }
};
