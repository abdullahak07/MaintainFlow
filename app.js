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
  'Plumbing': { trade: 'Plumber', contractor: 'RapidFlow Plumbing', low: 240, high: 360, timer: '30-min response timer started' },
  'Electrical': { trade: 'Electrician', contractor: 'Westline Electrical', low: 280, high: 450, timer: '30-min response timer started' },
  'Security': { trade: 'Locksmith', contractor: 'SecureKey Locksmiths', low: 180, high: 320, timer: '30-min response timer started' },
  'General': { trade: 'Maintenance tech', contractor: 'Metro Property Services', low: 160, high: 300, timer: '4-hour response timer started' }
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
  const patterns = [
    /(?:i['’]?m|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /(?:hi,?\s+)([A-Z][a-z]+)\s+(?:here|at|from)/,
    /(?:hello,?\s+i['’]?m\s+)([A-Z][a-z]+)/i
  ];
  for (const p of patterns) {
    const match = text.match(p);
    if (match) return match[1];
  }
  const local = email.split('@')[0].replace(/[._-]+/g, ' ');
  return local.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ') || 'Tenant';
}

function matchProperty(address) {
  const normalized = address.toLowerCase().replace(/\s+/g, ' ').trim();
  const exact = propertyRecords.find(p => normalized.includes(p.match) || p.match.includes(normalized));
  return exact || { address, limit: 500 };
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

function processRequest() {
  const raw = $('emailInput').value.trim();
  if (!raw) return toast('Paste an email first.');

  const { from, subject, body } = parseEmail(raw);
  const [category, priority] = classify(`${subject} ${body}`);
  const extractedAddress = extractAddress(body);
  const property = matchProperty(extractedAddress);
  const tenant = extractName(body, from);
  const route = routes[category] || routes.General;
  const id = workOrderNumber(raw);
  const withinLimit = route.high <= property.limit;

  current = { id, subject, property, tenant, category, priority, route, withinLimit };

  $('workOrderId').textContent = id;
  $('propertyValue').textContent = property.address;
  $('priorityPill').textContent = priority;
  $('priorityPill').className = `priority ${priority.toLowerCase()}`;
  $('tenantValue').textContent = tenant;
  $('issueValue').textContent = subject;
  $('tradeValue').textContent = route.trade;
  $('contractorValue').textContent = route.contractor;
  $('estimateValue').textContent = `$${route.low}–$${route.high}`;
  $('limitValue').textContent = `$${property.limit}`;
  $('budgetStatus').textContent = withinLimit ? 'Within limit' : 'Approval needed';
  $('budgetStatus').className = `budget-status${withinLimit ? '' : ' over'}`;
  $('tenantReply').value = tenantMessage(tenant, subject, priority);
  $('approveBtn').textContent = withinLimit ? 'Approve & dispatch' : 'Approve exception';

  show('workOrderView');
}

function approve() {
  if (!current) return;
  $('completeWorkOrderId').textContent = current.id;
  $('completeProperty').textContent = `${current.property.address} · ${current.priority}`;
  $('contractorDone').textContent = `${current.route.contractor} notified`;
  $('timerDone').textContent = current.route.timer;
  show('completeView');
}

function reject() {
  show('rejectedView');
}

function reset() {
  current = null;
  $('emailInput').value = '';
  show('inputView');
}

let toastTimer;
function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 1800);
}

$('processBtn').addEventListener('click', processRequest);
$('approveBtn').addEventListener('click', approve);
$('rejectBtn').addEventListener('click', reject);
$('backBtn').addEventListener('click', () => show('inputView'));
$('clearBtn').addEventListener('click', reset);
$('newRequestBtn').addEventListener('click', reset);
$('rejectedBackBtn').addEventListener('click', () => show('workOrderView'));
document.querySelectorAll('[data-sample]').forEach(btn => btn.addEventListener('click', () => {
  $('emailInput').value = samples[btn.dataset.sample];
}));
