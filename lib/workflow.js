function parseEmail(raw) {
  const from = (raw.match(/^From:\s*(.+)$/mi) || [, 'tenant@example.com'])[1].trim();
  const subject = (raw.match(/^Subject:\s*(.+)$/mi) || [, 'Maintenance request'])[1].trim();
  const body = raw.replace(/^From:.*$/mi, '').replace(/^Subject:.*$/mi, '').trim();
  return { from, subject, body };
}

function classify(text) {
  const t = text.toLowerCase();
  if (/gas smell|smell of gas|gas leak|carbon monoxide/.test(t)) return ['Gas / safety', 'Emergency'];
  if (/spark|sparking|smoke|burning smell|exposed wire/.test(t) && !/no spark|no sparking|no smoke/.test(t)) return ['Electrical', 'Emergency'];
  if (/lock|not secure|door.*secure|break.?in/.test(t)) return ['Security', 'High'];
  if (/leak|water|tap|sink|toilet|pipe|plumb/.test(t)) return ['Plumbing', /flood|burst|heavily|ceiling|cannot stop/.test(t) ? 'High' : 'Medium'];
  if (/power|electric|outlet|socket|tripping|circuit/.test(t)) return ['Electrical', /lost power|no power|half the apartment/.test(t) ? 'High' : 'Medium'];
  return ['General', 'Low'];
}

function extractAddress(text) {
  const afterAt = text.match(/\b(?:at|from)\s+((?:Unit\s+[\w-]+,\s*)?\d+(?:\/\d+)?\s+[A-Za-z0-9][A-Za-z0-9 .'-]+,\s*[A-Za-z][A-Za-z .'-]+?)(?=[.!?]|$)/i);
  if (afterAt) return afterAt[1].trim();
  const generic = text.match(/((?:Unit\s+[\w-]+,\s*)?\d+(?:\/\d+)?\s+[A-Za-z0-9][A-Za-z0-9 .'-]+,\s*[A-Za-z][A-Za-z .'-]+?)(?=[.!?]|$)/i);
  return generic ? generic[1].trim() : null;
}

function extractName(text, email) {
  const patterns = [
    /(?:i['’]?m|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /(?:hi,?\s+)([A-Z][a-z]+)\s+(?:here|at|from)/,
    /(?:hello,?\s+i['’]?m\s+)([A-Z][a-z]+)/i
  ];
  for (const p of patterns) {
    const match = text.match(p);
    if (match) return match[1];
  }
  const local = String(email || '').split('@')[0].replace(/[._-]+/g, ' ');
  return local.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ') || 'Tenant';
}

function routeFor(category) {
  const routes = {
    'Gas / safety': { trade: 'Gas fitter', low: 300, high: 480, sla_minutes: 15 },
    'Plumbing': { trade: 'Plumber', low: 240, high: 360, sla_minutes: 30 },
    'Electrical': { trade: 'Electrician', low: 280, high: 450, sla_minutes: 30 },
    'Security': { trade: 'Locksmith', low: 180, high: 320, sla_minutes: 30 },
    'General': { trade: 'Maintenance tech', low: 160, high: 300, sla_minutes: 240 }
  };
  return routes[category] || routes.General;
}

function tenantMessage(name, issue, priority) {
  const first = String(name || 'there').split(' ')[0] || 'there';
  if (priority === 'Emergency') return `Hi ${first}, thanks for reporting the ${issue.toLowerCase()}. We have marked this as an emergency and are arranging the appropriate contractor now.`;
  if (priority === 'High') return `Hi ${first}, thanks for reporting the ${issue.toLowerCase()}. We have marked this as high priority and are arranging the appropriate contractor.`;
  return `Hi ${first}, thanks for reporting the ${issue.toLowerCase()}. Your maintenance request has been logged and is being arranged.`;
}

function contractorMessage({ workOrderId, property, subject, priority, tenantName, tenantEmail, estimatedLow, estimatedHigh }) {
  return [
    `Work order ${workOrderId}`,
    `Property: ${property}`,
    `Issue: ${subject}`,
    `Priority: ${priority}`,
    `Tenant: ${tenantName} (${tenantEmail})`,
    `Estimated range: $${estimatedLow}–$${estimatedHigh}`,
    '',
    'Please confirm receipt and availability.'
  ].join('\n');
}

function normalizeAddress(value) {
  return String(value || '').toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
}

module.exports = {
  parseEmail,
  classify,
  extractAddress,
  extractName,
  routeFor,
  tenantMessage,
  contractorMessage,
  normalizeAddress
};
