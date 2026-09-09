const $ = id => document.getElementById(id);

const samples = {
  leak: `From: sarah.lee@example.com\nSubject: Water leaking under kitchen sink\n\nHi, I'm Sarah at 18 Lakeview Rd, Como. There is water leaking heavily under the kitchen sink and the cupboard is getting wet. It started this morning. Can someone please organise a plumber?`,
  power: `From: daniel.wong@example.com\nSubject: Power keeps tripping\n\nHi, Daniel here from Unit 7, 42 Oxford St, Leederville. The power keeps tripping whenever we use the kitchen outlets. There are no sparks or smoke, but we have lost power to half the apartment.`,
  lock: `From: aisha.khan@example.com\nSubject: Front door lock broken\n\nHello, I'm Aisha at 9 Park Lane, Victoria Park. The front door lock has broken and the door will not lock properly. The property is not secure.`,
  gas: `From: michael.chen@example.com\nSubject: Strong gas smell near stove\n\nHi, Michael at 31 River View, East Perth. There is a strong smell of gas near the stove and it has become worse in the last 20 minutes. We have turned the stove off and opened the windows.`
};

function parseEmail(raw) {
  const from = (raw.match(/^From:\s*(.+)$/mi) || [,'tenant@example.com'])[1].trim();
  const subject = (raw.match(/^Subject:\s*(.+)$/mi) || [,'Maintenance request'])[1].trim();
  const body = raw.replace(/^From:.*$/mi,'').replace(/^Subject:.*$/mi,'').trim();
  return { from, subject, body };
}

function classify(text) {
  const t = text.toLowerCase();
  if (/gas smell|smell of gas|gas leak|carbon monoxide/.test(t)) return ['Gas / safety','Emergency'];
  if (/spark|sparking|smoke|burning smell|exposed wire/.test(t) && !/no spark|no sparking|no smoke/.test(t)) return ['Electrical','Emergency'];
  if (/lock|not secure|door.*secure|break.?in/.test(t)) return ['Security','High'];
  if (/leak|water|tap|sink|toilet|pipe|plumb/.test(t)) return ['Plumbing',/flood|burst|heavily|ceiling|cannot stop/.test(t) ? 'High' : 'Medium'];
  if (/power|electric|outlet|socket|tripping|circuit/.test(t)) return ['Electrical',/lost power|no power|half the apartment/.test(t) ? 'High' : 'Medium'];
  if (/air.?con|air conditioning|heater|heating|cooling|hvac/.test(t)) return ['HVAC','Medium'];
  if (/oven|stove|dishwasher|washing machine|dryer|fridge/.test(t)) return ['Appliance','Medium'];
  return ['General','Low'];
}

function extractAddress(text) {
  const unit = text.match(/(?:unit|apt|apartment)\s*([\w-]+)[,\s]+(\d+\s+[A-Za-z][A-Za-z\s]+(?:St|Street|Rd|Road|Ave|Avenue|Lane|Ln|Dr|Drive|Way|Cres|Crescent|Tce|Terrace))[,\s]+([A-Za-z][A-Za-z\s]+)/i);
  if (unit) return `Unit ${unit[1]}, ${unit[2].trim()}, ${unit[3].trim()}`;
  const slash = text.match(/(\d+\/\d+\s+[A-Za-z][A-Za-z\s]+(?:St|Street|Rd|Road|Ave|Avenue|Lane|Ln|Dr|Drive|Way|Cres|Crescent|Tce|Terrace))[,\s]+([A-Za-z][A-Za-z\s]+)/i);
  if (slash) return `${slash[1].trim()}, ${slash[2].trim()}`;
  const plain = text.match(/(\d+\s+[A-Za-z][A-Za-z\s]+(?:St|Street|Rd|Road|Ave|Avenue|Lane|Ln|Dr|Drive|Way|Cres|Crescent|Tce|Terrace))[,\s]+([A-Za-z][A-Za-z\s]+)/i);
  return plain ? `${plain[1].trim()}, ${plain[2].trim()}` : 'Needs confirmation';
}

function extractName(text, email) {
  const patterns = [/(?:i['’]?m|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/, /(?:hi,?\s+)([A-Z][a-z]+)\s+(?:here|from)/, /(?:hello,?\s+i['’]?m\s+)([A-Z][a-z]+)/i];
  for (const p of patterns) { const m = text.match(p); if (m) return m[1]; }
  const local = email.split('@')[0].replace(/[._-]+/g,' ');
  return local.split(' ').map(w => w ? w[0].toUpperCase()+w.slice(1) : '').join(' ') || 'Tenant';
}

function issueSummary(subject, body) {
  const clean = body.replace(/\s+/g,' ').trim();
  const first = clean.split(/(?<=[.!?])\s+/).slice(0,2).join(' ');
  return first || subject;
}

function draftReply(name, property, category, priority) {
  const first = name.split(' ')[0] || 'there';
  const line = priority === 'Emergency' ? 'We have marked this for immediate review.' : priority === 'High' ? 'We have marked this as high priority.' : 'We have logged the request for review.';
  return `Hi ${first},\n\nThanks for letting us know about the ${category.toLowerCase()} issue at ${property}. ${line}\n\nA property manager will review it and confirm the next step.\n\nRegards,\nProperty Management Team`;
}

function setStatus(text, type='') {
  const badge = $('statusBadge');
  badge.textContent = text;
  badge.className = `status ${type}`.trim();
}

function analyse() {
  const raw = $('emailInput').value.trim();
  if (!raw) return toast('Paste an email first.');
  const { from, subject, body } = parseEmail(raw);
  const [category, priority] = classify(`${subject} ${body}`);
  const property = extractAddress(body);
  const tenant = extractName(body, from);
  $('emptyState').classList.add('hidden');
  $('resultContent').classList.remove('hidden');
  $('propertyValue').textContent = property;
  $('tenantValue').textContent = tenant;
  $('categoryValue').textContent = category;
  $('priorityValue').textContent = priority;
  $('issueValue').textContent = issueSummary(subject, body);
  $('replyValue').value = draftReply(tenant, property, category, priority);
  $('actions').classList.remove('hidden');
  $('doneState').className = 'done hidden';
  setStatus('Awaiting review');
  if (window.innerWidth < 761) $('resultContent').scrollIntoView({behavior:'smooth',block:'start'});
}

function review(type) {
  const approved = type === 'approved';
  setStatus(approved ? 'Approved' : 'Rejected', type);
  $('actions').classList.add('hidden');
  const done = $('doneState');
  done.textContent = approved ? 'Approved.' : 'Rejected.';
  done.className = `done ${type}`;
}

function reset() {
  $('emailInput').value = '';
  $('resultContent').classList.add('hidden');
  $('emptyState').classList.remove('hidden');
  $('statusBadge').classList.add('hidden');
}

let toastTimer;
function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}

$('analyseBtn').addEventListener('click', analyse);
$('approveBtn').addEventListener('click', () => review('approved'));
$('rejectBtn').addEventListener('click', () => review('rejected'));
$('clearBtn').addEventListener('click', reset);
document.querySelectorAll('[data-sample]').forEach(btn => btn.addEventListener('click', () => { $('emailInput').value = samples[btn.dataset.sample]; }));