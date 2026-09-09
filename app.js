const $ = id => document.getElementById(id);

const samples = {
  leak: `From: sarah.lee@example.com\nSubject: Water leaking under kitchen sink\n\nHi, I'm Sarah at 18 Lakeview Rd, Como. There is water leaking heavily under the kitchen sink and the cupboard is getting wet. It started this morning.`,
  power: `From: daniel.wong@example.com\nSubject: Power keeps tripping\n\nHi, Daniel here from Unit 7, 42 Oxford St, Leederville. The power keeps tripping whenever we use the kitchen outlets. There are no sparks or smoke, but we have lost power to half the apartment.`,
  lock: `From: aisha.khan@example.com\nSubject: Front door lock broken\n\nHello, I'm Aisha at 9 Park Lane, Victoria Park. The front door lock has broken and the property is not secure.`,
  gas: `From: michael.chen@example.com\nSubject: Strong gas smell near stove\n\nHi, Michael at 31 River View, East Perth. There is a strong smell of gas near the stove and it has become worse in the last 20 minutes. We have turned the stove off and opened the windows.`
};

const propertyRecords = [
  { match: '18 lakeview rd, como', address: '18 Lakeview Rd, Como', limit: 500 },
  { match: 'unit 7, 42 oxford st, leederville', address: 'Unit 7, 42 Oxford St, Leederville', limit: 600 },
  { match: '9 park lane, victoria park', address: '9 Park Lane, Victoria Park', limit: 350 },
  { match: '31 river view, east perth', address: '31 River View, East Perth', limit: 500 }
];

const routes = {
  'Gas / safety': { trade: 'Gas fitter', contractor: 'Westside Plumbing & Gas', low: 300, high: 480, timer: '15-min response timer started' },
  Plumbing: { trade: 'Plumber', contractor: 'RapidFlow Plumbing', low: 240, high: 360, timer: '30-min response timer started' },
  Electrical: { trade: 'Electrician', contractor: 'Westline Electrical', low: 280, high: 450, timer: '30-min response timer started' },
  Security: { trade: 'Locksmith', contractor: 'SecureKey Locksmiths', low: 180, high: 320, timer: '30-min response timer started' },
  General: { trade: 'Maintenance tech', contractor: 'Metro Property Services', low: 160, high: 300, timer: '4-hour response timer started' }
};

let current = null;

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
  return generic ? generic[1].trim() : 'Needs confirmation';
}

function extractName(text, email) {
  const patterns = [/(?:i['’]?m|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/, /(?:hi,?\s+)([A-Z][a-z]+)\s+(?:here|at|from)/, /(?:hello,?\s+i['’]?m\s+)([A-Z][a-z]+)/i];
  for (const p of patterns) { const m = text.match(p); if (m) return m[1]; }
  const local = email.split('@')[0].replace(/[._-]+/g, ' ');
  return local.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ') || 'Tenant';
}

function matchProperty(address) {
  const normalized = address.toLowerCase().replace(/\s+/g, ' ').trim();
  return propertyRecords.find(p => normalized.includes(p.match) || p.match.includes(normalized)) || { address, limit: 500 };
}

function workOrderNumber(raw) {
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  return `MF-${1040 + (Math.abs(hash) % 800)}`;
}

function tenantMessage(name, issue, priority) {
  const first = name.split(' ')[0] || 'there';
  if (priority === 'Emergency') return `Hi ${first}, thanks for reporting the ${issue.toLowerCase()}. We have marked this as an emergency and are arranging the appropriate contractor now.`;
  if (priority === 'High') return `Hi ${first}, thanks for reporting the ${issue.toLowerCase()}. We have marked this as high priority and are arranging the appropriate contractor.`;
  return `Hi ${first}, thanks for reporting the ${issue.toLowerCase()}. Your maintenance request has been logged and is being arranged.`;
}

function show(view) {
  ['inputView', 'workOrderView', 'completeView', 'rejectedView'].forEach(id => $(id).classList.add('hidden'));
  $(view).classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderWorkOrder(data) {
  current = data;
  $('workOrderId').textContent = data.workOrderCode || data.id;
  $('propertyValue').textContent = data.property;
  $('priorityPill').textContent = data.priority;
  $('priorityPill').className = `priority ${data.priority.toLowerCase()}`;
  $('tenantValue').textContent = data.tenant;
  $('issueValue').textContent = data.issue;
  $('tradeValue').textContent = data.trade;
  $('contractorValue').textContent = data.contractor;
  $('estimateValue').textContent = `$${data.estimatedLow}–$${data.estimatedHigh}`;
  $('limitValue').textContent = data.ownerLimit == null ? '—' : `$${data.ownerLimit}`;
  $('budgetStatus').textContent = data.withinLimit ? 'Within limit' : 'Approval needed';
  $('budgetStatus').className = `budget-status${data.withinLimit ? '' : ' over'}`;
  $('tenantReply').value = data.tenantMessage;

  const dispatchable = !data.backend || (!data.requiresAttention && data.withinLimit);
  $('approveBtn').disabled = !dispatchable;
  $('approveBtn').textContent = dispatchable ? 'Approve & dispatch' : 'Manual review required';
  show('workOrderView');
}

function localProcess(raw) {
  const { from, subject, body } = parseEmail(raw);
  const [category, priority] = classify(`${subject} ${body}`);
  const extractedAddress = extractAddress(body);
  const property = matchProperty(extractedAddress);
  const tenant = extractName(body, from);
  const route = routes[category] || routes.General;
  const withinLimit = route.high <= property.limit;
  return {
    backend: false,
    id: workOrderNumber(raw),
    workOrderCode: workOrderNumber(raw),
    issue: subject,
    property: property.address,
    ownerLimit: property.limit,
    tenant,
    category,
    priority,
    trade: route.trade,
    contractor: route.contractor,
    estimatedLow: route.low,
    estimatedHigh: route.high,
    withinLimit,
    requiresAttention: false,
    tenantMessage: tenantMessage(tenant, subject, priority),
    responseSlaMinutes: Number(route.timer.match(/\d+/)?.[0] || 30)
  };
}

async function processRequest() {
  const raw = $('emailInput').value.trim();
  if (!raw) return toast('Paste an email first.');
  $('processBtn').disabled = true;
  $('processBtn').textContent = 'Processing…';
  try {
    const res = await fetch('/api/process', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rawEmail: raw }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return renderWorkOrder({ ...data, backend: true });
    if (res.status === 503 && data.code === 'BACKEND_NOT_CONFIGURED') {
      toast('Demo mode — backend not configured yet.');
      return renderWorkOrder(localProcess(raw));
    }
    throw new Error(data.error || 'Backend processing failed');
  } catch (error) {
    if (error instanceof TypeError) {
      toast('Demo mode — backend unavailable.');
      return renderWorkOrder(localProcess(raw));
    }
    toast(error.message);
  } finally {
    $('processBtn').disabled = false;
    $('processBtn').textContent = 'Process request';
  }
}

async function approve() {
  if (!current) return;
  $('approveBtn').disabled = true;
  $('approveBtn').textContent = 'Dispatching…';
  try {
    if (current.backend) {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workOrderId: current.workOrderId, tenantMessage: $('tenantReply').value.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Dispatch failed');
      current.contractor = data.contractor || current.contractor;
      current.responseSlaMinutes = data.responseSlaMinutes || current.responseSlaMinutes;
    }

    $('completeWorkOrderId').textContent = current.workOrderCode || current.id;
    $('completeProperty').textContent = `${current.property} · ${current.priority}`;
    $('contractorDone').textContent = `${current.contractor} notified`;
    $('timerDone').textContent = `${current.responseSlaMinutes || 30}-min response timer started`;
    show('completeView');
  } catch (error) {
    toast(error.message);
    $('approveBtn').disabled = false;
    $('approveBtn').textContent = 'Approve & dispatch';
  }
}

async function reject() {
  if (current?.backend) {
    try {
      const res = await fetch('/api/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workOrderId: current.workOrderId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Reject failed');
    } catch (error) {
      return toast(error.message);
    }
  }
  show('rejectedView');
}

function reset() {
  current = null;
  $('emailInput').value = '';
  $('approveBtn').disabled = false;
  show('inputView');
}

let toastTimer;
function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2400);
}

$('processBtn').addEventListener('click', processRequest);
$('approveBtn').addEventListener('click', approve);
$('rejectBtn').addEventListener('click', reject);
$('backBtn').addEventListener('click', () => show('inputView'));
$('clearBtn').addEventListener('click', reset);
$('newRequestBtn').addEventListener('click', reset);
$('rejectedBackBtn').addEventListener('click', () => show('workOrderView'));
document.querySelectorAll('[data-sample]').forEach(btn => btn.addEventListener('click', () => { $('emailInput').value = samples[btn.dataset.sample]; }));
