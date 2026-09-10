const $ = id => document.getElementById(id);

const samples = [
  {
    key: 'power',
    raw: `From: daniel.wong@example.com\nSubject: Power keeps tripping\n\nHi, Daniel here from Unit 7, 42 Oxford St, Leederville. The power keeps tripping whenever we use the kitchen outlets. There are no sparks or smoke, but we have lost power to half the apartment.`
  },
  {
    key: 'leak',
    raw: `From: sarah.lee@example.com\nSubject: Water leaking under kitchen sink\n\nHi, I'm Sarah at 18 Lakeview Rd, Como. There is water leaking heavily under the kitchen sink and the cupboard is getting wet. It started this morning.`
  },
  {
    key: 'lock',
    raw: `From: aisha.khan@example.com\nSubject: Front door lock broken\n\nHello, I'm Aisha at 9 Park Lane, Victoria Park. The front door lock has broken and the property is not secure.`
  },
  {
    key: 'gas',
    raw: `From: michael.chen@example.com\nSubject: Strong gas smell near stove\n\nHi, Michael at 31 River View, East Perth. There is a strong smell of gas near the stove and it has become worse in the last 20 minutes. We have turned the stove off and opened the windows.`
  }
];

const propertyRecords = [
  { match: '18 lakeview rd, como', address: '18 Lakeview Rd, Como', limit: 500 },
  { match: 'unit 7, 42 oxford st, leederville', address: 'Unit 7, 42 Oxford St, Leederville', limit: 600 },
  { match: '9 park lane, victoria park', address: '9 Park Lane, Victoria Park', limit: 350 },
  { match: '31 river view, east perth', address: '31 River View, East Perth', limit: 500 }
];

const routes = {
  'Gas / safety': { trade: 'Gas fitter', contractor: 'Westside Plumbing & Gas', low: 300, high: 480, sla: 15 },
  Plumbing: { trade: 'Plumber', contractor: 'RapidFlow Plumbing', low: 240, high: 360, sla: 30 },
  Electrical: { trade: 'Electrician', contractor: 'Westline Electrical', low: 280, high: 450, sla: 30 },
  Security: { trade: 'Locksmith', contractor: 'SecureKey Locksmiths', low: 180, high: 320, sla: 30 },
  General: { trade: 'Maintenance tech', contractor: 'Metro Property Services', low: 160, high: 300, sla: 240 }
};

let workOrders = [];
let pendingSyncs = [];
let selectedIndex = null;
let batchVersion = 0;
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
  const patterns = [
    /(?:i['’]?m|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /(?:hi,?\s+)([A-Z][a-z]+)\s+(?:here|at|from)/,
    /(?:hello,?\s+i['’]?m\s+)([A-Z][a-z]+)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  const local = email.split('@')[0].replace(/[._-]+/g, ' ');
  return local.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ') || 'Tenant';
}

function matchProperty(address) {
  const normalized = address.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
  const found = propertyRecords.find(p => {
    const key = p.match.replace(/[.,]/g, '');
    return normalized.includes(key) || key.includes(normalized);
  });
  return found || { address, limit: 500 };
}

function tenantMessage(name, issue, priority) {
  const first = name.split(' ')[0] || 'there';
  if (priority === 'Emergency') return `Hi ${first}, thanks for reporting the ${issue.toLowerCase()}. We have marked this as an emergency and are arranging the appropriate contractor now.`;
  if (priority === 'High') return `Hi ${first}, thanks for reporting the ${issue.toLowerCase()}. We have marked this as high priority and are arranging the appropriate contractor.`;
  return `Hi ${first}, thanks for reporting the ${issue.toLowerCase()}. Your maintenance request has been logged and is being arranged.`;
}

function show(view) {
  ['inboxView', 'queueView', 'workOrderView', 'completeView', 'rejectedView'].forEach(id => $(id).classList.add('hidden'));
  $(view).classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function localProcess(raw, sampleKey) {
  const { from, subject, body } = parseEmail(raw);
  const [category, priority] = classify(`${subject} ${body}`);
  const extractedAddress = extractAddress(body);
  const property = matchProperty(extractedAddress);
  const tenant = extractName(body, from);
  const route = routes[category] || routes.General;
  const withinLimit = route.high <= property.limit;

  return {
    sampleKey,
    raw,
    backend: false,
    syncing: true,
    demoFallback: false,
    syncError: false,
    workOrderCode: 'Preparing…',
    issue: subject,
    property: property.address,
    ownerLimit: property.limit,
    tenant,
    tenantEmail: from,
    category,
    priority,
    trade: route.trade,
    contractor: route.contractor,
    estimatedLow: route.low,
    estimatedHigh: route.high,
    withinLimit,
    requiresAttention: false,
    tenantMessage: tenantMessage(tenant, subject, priority),
    editedTenantMessage: null,
    responseSlaMinutes: route.sla,
    uiStatus: 'ready'
  };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function renderInboxEmails() {
  $('inboxList').innerHTML = samples.map((sample, index) => {
    const { from, subject, body } = parseEmail(sample.raw);
    const snippet = body.replace(/\s+/g, ' ').slice(0, 118) + (body.length > 118 ? '…' : '');
    return `
      <article class="mail-row" style="--delay:${index * 85}ms">
        <span class="unread-dot"></span>
        <div class="mail-row-body">
          <div class="mail-row-top"><strong>${escapeHtml(from)}</strong><span>Just now</span></div>
          <h2>${escapeHtml(subject)}</h2>
          <p>${escapeHtml(snippet)}</p>
        </div>
      </article>`;
  }).join('');
}

function simulateIncoming() {
  $('inboxIdle').classList.add('hidden');
  renderInboxEmails();
  $('inboxList').classList.remove('hidden');
  $('simulateBtn').classList.add('hidden');
  $('analyzeBtn').classList.remove('hidden');
  $('inboxCount').textContent = '4 new tenant emails received automatically';
}

function statusFor(order) {
  if (order.uiStatus === 'dispatched') return ['Dispatched', 'done'];
  if (order.uiStatus === 'rejected') return ['Rejected', 'rejected'];
  if (order.syncError) return ['Backend unavailable', 'error'];
  if (order.syncing) return ['Preparing…', 'preparing'];
  if (order.requiresAttention || !order.withinLimit) return ['Review needed', 'review'];
  return ['Ready', 'ready'];
}

function renderQueue() {
  const dispatched = workOrders.filter(o => o.uiStatus === 'dispatched').length;
  const rejected = workOrders.filter(o => o.uiStatus === 'rejected').length;
  const remaining = workOrders.length - dispatched - rejected;
  $('queueSubtitle').textContent = `${workOrders.length} requests analyzed · ${remaining} awaiting review`;

  $('workOrderList').innerHTML = workOrders.map((order, index) => {
    const [status, statusClass] = statusFor(order);
    return `
      <button class="work-order-card" type="button" data-order-index="${index}">
        <div class="work-order-card-top">
          <div>
            <span class="order-code">${escapeHtml(order.workOrderCode || 'Preparing…')}</span>
            <strong>${escapeHtml(order.issue)}</strong>
          </div>
          <span class="queue-priority ${order.priority.toLowerCase()}">${escapeHtml(order.priority)}</span>
        </div>
        <div class="queue-property">${escapeHtml(order.property)}</div>
        <div class="queue-meta"><span>${escapeHtml(order.trade)}</span><span>${escapeHtml(order.contractor)}</span></div>
        <div class="queue-footer"><span>$${order.estimatedLow}–$${order.estimatedHigh}</span><span class="queue-status ${statusClass}">${status}</span></div>
      </button>`;
  }).join('');

  document.querySelectorAll('[data-order-index]').forEach(btn => {
    btn.addEventListener('click', () => openWorkOrder(Number(btn.dataset.orderIndex)));
  });
}

function syncOne(index, version) {
  const order = workOrders[index];
  return fetch('/api/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawEmail: order.raw })
  })
    .then(async res => ({ res, data: await res.json().catch(() => ({})) }))
    .then(({ res, data }) => {
      if (version !== batchVersion || !workOrders[index]) return null;

      if (res.ok) {
        workOrders[index] = {
          ...workOrders[index],
          ...data,
          backend: true,
          syncing: false,
          demoFallback: false,
          syncError: false,
          uiStatus: workOrders[index].uiStatus
        };
      } else if (res.status === 503 && data.code === 'BACKEND_NOT_CONFIGURED') {
        workOrders[index] = { ...workOrders[index], syncing: false, demoFallback: true, syncError: false };
      } else {
        throw new Error(data.error || 'Could not save work order');
      }

      renderQueue();
      if (selectedIndex === index && !$('workOrderView').classList.contains('hidden')) paintWorkOrder(workOrders[index], true);
      return workOrders[index];
    })
    .catch(() => {
      if (version !== batchVersion || !workOrders[index]) return null;
      workOrders[index] = { ...workOrders[index], syncing: false, syncError: true, demoFallback: false };
      renderQueue();
      if (selectedIndex === index && !$('workOrderView').classList.contains('hidden')) paintWorkOrder(workOrders[index], true);
      return null;
    });
}

function analyzeAll() {
  const version = ++batchVersion;
  $('analyzeBtn').disabled = true;
  $('analyzeBtn').textContent = 'Analyzing 4 emails…';
  workOrders = samples.map(sample => localProcess(sample.raw, sample.key));
  pendingSyncs = workOrders.map((_, index) => syncOne(index, version));
  renderQueue();
  show('queueView');
}

function saveCurrentReply() {
  if (selectedIndex == null || !workOrders[selectedIndex]) return;
  workOrders[selectedIndex].editedTenantMessage = $('tenantReply').value.trim();
}

function paintWorkOrder(order, preserveReply = false) {
  const currentReply = preserveReply ? $('tenantReply').value : null;
  current = order;

  $('workOrderId').textContent = order.workOrderCode || 'Preparing…';
  $('propertyValue').textContent = order.property;
  $('priorityPill').textContent = order.priority;
  $('priorityPill').className = `priority ${order.priority.toLowerCase()}`;
  $('tenantValue').textContent = order.tenant;
  $('issueValue').textContent = order.issue;
  $('tradeValue').textContent = order.trade;
  $('contractorValue').textContent = order.contractor;
  $('estimateValue').textContent = `$${order.estimatedLow}–$${order.estimatedHigh}`;
  $('limitValue').textContent = order.ownerLimit == null ? '—' : `$${order.ownerLimit}`;
  $('budgetStatus').textContent = order.withinLimit ? 'Within limit' : 'Approval needed';
  $('budgetStatus').className = `budget-status${order.withinLimit ? '' : ' over'}`;
  $('tenantReply').value = currentReply || order.editedTenantMessage || order.tenantMessage;

  if (order.uiStatus === 'dispatched') {
    $('approveBtn').disabled = true;
    $('approveBtn').textContent = 'Already dispatched';
    $('rejectBtn').disabled = true;
  } else if (order.uiStatus === 'rejected') {
    $('approveBtn').disabled = true;
    $('approveBtn').textContent = 'Rejected';
    $('rejectBtn').disabled = true;
  } else if (order.syncing) {
    $('approveBtn').disabled = true;
    $('approveBtn').textContent = 'Preparing…';
    $('rejectBtn').disabled = false;
  } else if (order.syncError && !order.demoFallback) {
    $('approveBtn').disabled = true;
    $('approveBtn').textContent = 'Backend unavailable';
    $('rejectBtn').disabled = false;
  } else {
    const dispatchable = order.demoFallback || (order.backend && !order.requiresAttention && order.withinLimit);
    $('approveBtn').disabled = !dispatchable;
    $('approveBtn').textContent = dispatchable ? 'Approve & dispatch' : 'Manual review required';
    $('rejectBtn').disabled = false;
  }
}

function openWorkOrder(index) {
  selectedIndex = index;
  paintWorkOrder(workOrders[index]);
  show('workOrderView');
}

function backToQueue() {
  saveCurrentReply();
  selectedIndex = null;
  current = null;
  renderQueue();
  show('queueView');
}

async function approve() {
  if (selectedIndex == null || !workOrders[selectedIndex]) return;
  const index = selectedIndex;
  saveCurrentReply();
  $('approveBtn').disabled = true;
  $('approveBtn').textContent = 'Dispatching…';

  try {
    if (workOrders[index].syncing && pendingSyncs[index]) await pendingSyncs[index];
    const order = workOrders[index];
    if (!order) throw new Error('Work order unavailable');
    if (order.syncError && !order.demoFallback) throw new Error('Work order was not saved. Try again.');

    if (order.backend) {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderId: order.workOrderId,
          tenantMessage: order.editedTenantMessage || order.tenantMessage
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Dispatch failed');
      workOrders[index] = {
        ...order,
        contractor: data.contractor || order.contractor,
        responseSlaMinutes: data.responseSlaMinutes || order.responseSlaMinutes,
        uiStatus: 'dispatched'
      };
    } else {
      workOrders[index] = { ...order, uiStatus: 'dispatched' };
    }

    const done = workOrders[index];
    current = done;
    renderQueue();
    $('completeWorkOrderId').textContent = done.workOrderCode || '—';
    $('completeProperty').textContent = `${done.property} · ${done.priority}`;
    $('contractorDone').textContent = `${done.contractor} notified`;
    $('timerDone').textContent = `${done.responseSlaMinutes || 30}-min response timer started`;
    show('completeView');
  } catch (error) {
    toast(error.message);
    paintWorkOrder(workOrders[index], true);
  }
}

async function reject() {
  if (selectedIndex == null || !workOrders[selectedIndex]) return;
  const index = selectedIndex;
  saveCurrentReply();

  try {
    if (workOrders[index].syncing && pendingSyncs[index]) await pendingSyncs[index];
    const order = workOrders[index];
    if (order?.backend) {
      const res = await fetch('/api/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workOrderId: order.workOrderId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Reject failed');
    }
    workOrders[index] = { ...order, uiStatus: 'rejected' };
    renderQueue();
    show('rejectedView');
  } catch (error) {
    toast(error.message);
  }
}

function resetDemo() {
  batchVersion += 1;
  workOrders = [];
  pendingSyncs = [];
  selectedIndex = null;
  current = null;
  $('inboxList').innerHTML = '';
  $('inboxList').classList.add('hidden');
  $('inboxIdle').classList.remove('hidden');
  $('simulateBtn').classList.remove('hidden');
  $('simulateBtn').disabled = false;
  $('analyzeBtn').classList.add('hidden');
  $('analyzeBtn').disabled = false;
  $('analyzeBtn').textContent = 'Analyze 4 maintenance emails';
  $('inboxCount').textContent = 'Waiting for new tenant requests';
  $('approveBtn').disabled = false;
  $('rejectBtn').disabled = false;
  show('inboxView');
}

let toastTimer;
function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2400);
}

$('simulateBtn').addEventListener('click', simulateIncoming);
$('analyzeBtn').addEventListener('click', analyzeAll);
$('approveBtn').addEventListener('click', approve);
$('rejectBtn').addEventListener('click', reject);
$('backBtn').addEventListener('click', backToQueue);
$('backToQueueBtn').addEventListener('click', backToQueue);
$('rejectedBackBtn').addEventListener('click', backToQueue);
$('queueResetBtn').addEventListener('click', resetDemo);
