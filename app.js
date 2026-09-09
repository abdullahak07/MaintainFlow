(() => {
  'use strict';

  const STORAGE_KEY = 'maintainflow_demo_v2';
  const now = new Date();

  const hoursAgo = (hours) => new Date(now.getTime() - hours * 3600000).toISOString();
  const daysAgo = (days) => new Date(now.getTime() - days * 86400000).toISOString();

  const seedState = () => ({
    nextId: 1087,
    requests: [
      {
        id: 'MF-1086',
        tenant: 'Mia Roberts',
        senderEmail: 'mia.roberts@example.com',
        property: '14 Turner Avenue, Victoria Park WA 6100',
        subject: 'Strong gas smell near cooktop',
        message: 'Hi, this is Mia Roberts at 14 Turner Avenue, Victoria Park. There is a strong smell of gas around the kitchen cooktop. We have turned the cooktop off and opened the windows. Please contact me urgently.',
        issue: 'Strong gas smell around kitchen cooktop',
        category: 'Appliance',
        urgency: 'Emergency',
        status: 'Awaiting review',
        confidence: 97,
        createdAt: hoursAgo(0.45),
        draft: 'Hi Mia, thanks for reporting this. Your maintenance request has been logged as an emergency priority. Please continue following your property emergency procedure and avoid using the affected appliance. A property manager will review this immediately.',
        events: [
          { type: 'Request received', detail: 'Email structured and classified automatically.', at: hoursAgo(0.45) },
          { type: 'Emergency flag raised', detail: 'Gas-related safety language detected for human review.', at: hoursAgo(0.44) }
        ]
      },
      {
        id: 'MF-1085',
        tenant: 'Noah Chen',
        senderEmail: 'noah.chen@example.com',
        property: '82 Hay Street, Subiaco WA 6008',
        subject: 'Front door lock is jammed',
        message: 'Hi team, Noah here from 82 Hay Street in Subiaco. The front door deadlock is jammed and it is getting difficult to lock the house properly. Could someone please arrange this today?',
        issue: 'Front door deadlock jammed and difficult to secure',
        category: 'Security',
        urgency: 'High',
        status: 'Awaiting review',
        confidence: 94,
        createdAt: hoursAgo(1.8),
        draft: 'Hi Noah, thanks for letting us know. We have logged the front door lock issue as a high-priority security maintenance request. A property manager will review the request and confirm the next step shortly.',
        events: [{ type: 'Request received', detail: 'Security issue extracted from tenant email.', at: hoursAgo(1.8) }]
      },
      {
        id: 'MF-1084',
        tenant: 'Sarah Malik',
        senderEmail: 'sarah.malik@example.com',
        property: '12 Smith Street, East Perth WA 6004',
        subject: 'Kitchen tap leaking heavily',
        message: 'Hi, I am Sarah Malik at 12 Smith Street, East Perth. The kitchen tap has been leaking heavily since this morning and water is pooling in the cabinet underneath. It is not flooding yet, but please arrange a plumber soon.',
        issue: 'Kitchen tap leaking heavily with water pooling in cabinet',
        category: 'Plumbing',
        urgency: 'High',
        status: 'Approved',
        confidence: 96,
        createdAt: hoursAgo(4.1),
        draft: 'Hi Sarah, thanks for reporting the leaking kitchen tap. Your request has been logged as a high-priority plumbing issue and approved for follow-up. We will contact you with the next step.',
        events: [
          { type: 'Request received', detail: 'Plumbing request structured automatically.', at: hoursAgo(4.1) },
          { type: 'Approved by property manager', detail: 'Draft acknowledgement approved for demo workflow.', at: hoursAgo(3.6) }
        ]
      },
      {
        id: 'MF-1083',
        tenant: 'Ethan Wilson',
        senderEmail: 'ethan.wilson@example.com',
        property: '6 Lakeview Crescent, Joondalup WA 6027',
        subject: 'Bedroom power points not working',
        message: 'Hello, Ethan Wilson from 6 Lakeview Crescent. Two power points in the main bedroom stopped working last night. There is no smoke or sparking and the rest of the house has power.',
        issue: 'Two bedroom power points stopped working',
        category: 'Electrical',
        urgency: 'Medium',
        status: 'Awaiting review',
        confidence: 91,
        createdAt: hoursAgo(7.7),
        draft: 'Hi Ethan, thanks for reporting the power point issue. We have logged an electrical maintenance request for the property. A property manager will review it and confirm the next step.',
        events: [{ type: 'Request received', detail: 'Electrical issue detected; explicit no-smoke/no-sparking language prevented emergency escalation.', at: hoursAgo(7.7) }]
      },
      {
        id: 'MF-1082',
        tenant: 'Olivia Singh',
        senderEmail: 'olivia.singh@example.com',
        property: '31 Barker Road, Cannington WA 6107',
        subject: 'Air conditioner is not cooling',
        message: 'Hi, Olivia Singh at 31 Barker Road. The split system in the living room turns on but is not cooling properly. No strange smell or noise. It can wait until a normal appointment is available.',
        issue: 'Living-room split system turns on but does not cool',
        category: 'HVAC',
        urgency: 'Low',
        status: 'Resolved',
        confidence: 93,
        createdAt: daysAgo(1.4),
        draft: 'Hi Olivia, thanks for reporting the air-conditioning issue. We have logged the request and will arrange the next available maintenance appointment.',
        events: [
          { type: 'Request received', detail: 'HVAC issue classified as low priority from tenant wording.', at: daysAgo(1.4) },
          { type: 'Approved by property manager', detail: 'Request approved for routine scheduling.', at: daysAgo(1.2) },
          { type: 'Marked resolved', detail: 'Demo request closed.', at: hoursAgo(12) }
        ]
      },
      {
        id: 'MF-1081',
        tenant: 'Liam Foster',
        senderEmail: 'liam.foster@example.com',
        property: '5 Wattle Lane, Fremantle WA 6160',
        subject: 'Crack beside laundry window',
        message: 'Hi, Liam Foster here from 5 Wattle Lane in Fremantle. I noticed a new crack in the wall beside the laundry window. It looks cosmetic and there is no water coming in, but I wanted to report it.',
        issue: 'New wall crack beside laundry window',
        category: 'Structural',
        urgency: 'Low',
        status: 'Approved',
        confidence: 88,
        createdAt: daysAgo(2.1),
        draft: 'Hi Liam, thanks for reporting the wall crack. We have logged the maintenance request for review and routine follow-up.',
        events: [
          { type: 'Request received', detail: 'Structural issue extracted and triaged.', at: daysAgo(2.1) },
          { type: 'Approved by property manager', detail: 'Request accepted for routine inspection.', at: daysAgo(1.9) }
        ]
      }
    ]
  });

  const samples = {
    leak: {
      email: 'jessica.taylor@example.com',
      subject: 'Water leaking under bathroom vanity',
      message: 'Hi, Jessica Taylor here at 27 King Street, Bayswater WA 6053. Water is leaking steadily from the pipe under the bathroom vanity and the cupboard base is getting wet. I have put a bucket underneath but it needs attention today please.'
    },
    power: {
      email: 'daniel.lee@example.com',
      subject: 'Power point making buzzing sound',
      message: 'Hi team, Daniel Lee from 44 Murray Road, Innaloo WA 6018. The power point beside the fridge is making a buzzing sound and felt warm, so I have switched the power off at that outlet. There is no smoke or fire.'
    },
    lock: {
      email: 'emma.wright@example.com',
      subject: 'Back door will not lock',
      message: 'Hello, Emma Wright at 9 Parkside Drive, Balcatta WA 6021. The back door latch has broken and the door will not lock properly. The house cannot be fully secured. Please arrange someone as soon as possible.'
    },
    gas: {
      email: 'jack.martin@example.com',
      subject: 'Urgent gas smell in kitchen',
      message: 'Hi, Jack Martin at 18 Railway Parade, Maylands WA 6051. There is a strong smell of gas in the kitchen near the stove. We have turned it off and moved outside. Please treat this as urgent.'
    }
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  let state = loadState();
  let currentView = 'overview';
  let selectedRequestId = null;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seedState();
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.requests)) return seedState();
      return parsed;
    } catch (_) {
      return seedState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function resetState() {
    state = seedState();
    saveState();
    selectedRequestId = null;
    renderAll();
    closeDrawer();
    toast('Demo reset', 'The original sample portfolio has been restored.');
  }

  function slugify(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, '-');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatRelative(iso) {
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  }

  function categoryIcon(category) {
    const map = { Plumbing: '◉', Electrical: 'ϟ', Security: '⌂', HVAC: '❄', Appliance: '▣', Structural: '◇', General: '•' };
    return map[category] || '•';
  }

  function metricCard(label, value, meta, icon) {
    return `
      <article class="metric-card">
        <div class="metric-icon">${icon}</div>
        <div class="metric-label">${escapeHtml(label)}</div>
        <div class="metric-value">${escapeHtml(value)}</div>
        <div class="metric-meta">${escapeHtml(meta)}</div>
      </article>`;
  }

  function renderMetrics() {
    const open = state.requests.filter(r => !['Resolved', 'Rejected'].includes(r.status));
    const urgent = open.filter(r => ['Emergency', 'High'].includes(r.urgency));
    const awaiting = open.filter(r => r.status === 'Awaiting review');
    const resolvedWeek = state.requests.filter(r => r.status === 'Resolved' && Date.now() - new Date(r.createdAt).getTime() < 7 * 86400000);
    $('#metricGrid').innerHTML = [
      metricCard('Open requests', open.length, 'Across the demo portfolio', '▤'),
      metricCard('Urgent / high', urgent.length, 'Priority attention required', '!'),
      metricCard('Awaiting review', awaiting.length, 'Human approval queue', '✓'),
      metricCard('Resolved this week', resolvedWeek.length, 'Closed demo requests', '↗')
    ].join('');
    $('#navOpenCount').textContent = open.length;
  }

  function renderPriorityQueue() {
    const rank = { Emergency: 0, High: 1, Medium: 2, Low: 3 };
    const rows = state.requests
      .filter(r => !['Resolved', 'Rejected'].includes(r.status))
      .sort((a, b) => (rank[a.urgency] - rank[b.urgency]) || (new Date(b.createdAt) - new Date(a.createdAt)))
      .slice(0, 5);

    $('#priorityQueue').innerHTML = rows.length ? rows.map(r => `
      <div class="request-row" data-request-id="${r.id}">
        <div class="issue-icon">${categoryIcon(r.category)}</div>
        <div class="request-main">
          <strong>${escapeHtml(r.issue)}</strong>
          <span>${escapeHtml(r.property)} · ${escapeHtml(r.tenant)}</span>
        </div>
        <span class="badge ${slugify(r.urgency)}">${escapeHtml(r.urgency)}</span>
        <span class="request-time">${formatRelative(r.createdAt)}</span>
      </div>`).join('') : '<div class="empty-state"><p>No open requests.</p></div>';
  }

  function renderCategoryBars() {
    const open = state.requests.filter(r => !['Resolved', 'Rejected'].includes(r.status));
    const categories = ['Plumbing', 'Electrical', 'Security', 'HVAC', 'Appliance', 'Structural', 'General'];
    const counts = categories
      .map(category => ({ category, count: open.filter(r => r.category === category).length }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);
    const max = Math.max(1, ...counts.map(x => x.count));

    $('#categoryBars').innerHTML = counts.length ? counts.map(item => `
      <div class="bar-item">
        <div class="bar-label"><span>${escapeHtml(item.category)}</span><strong>${item.count}</strong></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(18, item.count / max * 100)}%"></div></div>
      </div>`).join('') : '<p class="muted">No open categories.</p>';

    const structured = open.filter(r => r.category && r.urgency && r.issue && r.property).length;
    $('#automationPercent').textContent = open.length ? Math.round(structured / open.length * 100) : 100;
  }

  function allEvents() {
    return state.requests.flatMap(r => r.events.map(event => ({ ...event, requestId: r.id, issue: r.issue, property: r.property })))
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }

  function activityMarkup(events) {
    if (!events.length) return '<div class="empty-state"><p>No activity yet.</p></div>';
    return events.map(event => `
      <div class="activity-item">
        <span class="activity-dot"></span>
        <div class="activity-body">
          <strong>${escapeHtml(event.type)} · ${escapeHtml(event.requestId)}</strong>
          <p>${escapeHtml(event.detail)} — ${escapeHtml(event.property)}</p>
        </div>
        <span class="activity-time">${formatRelative(event.at)}</span>
      </div>`).join('');
  }

  function renderActivity() {
    const events = allEvents();
    $('#recentActivity').innerHTML = activityMarkup(events.slice(0, 8));
    $('#fullActivity').innerHTML = activityMarkup(events);
  }

  function requestMatchesFilters(r) {
    const q = $('#searchInput')?.value.trim().toLowerCase() || '';
    const status = $('#statusFilter')?.value || 'all';
    const urgency = $('#urgencyFilter')?.value || 'all';
    const category = $('#categoryFilter')?.value || 'all';
    const haystack = `${r.id} ${r.tenant} ${r.senderEmail} ${r.property} ${r.issue} ${r.subject}`.toLowerCase();
    return (!q || haystack.includes(q)) &&
      (status === 'all' || r.status === status) &&
      (urgency === 'all' || r.urgency === urgency) &&
      (category === 'all' || r.category === category);
  }

  function renderRequestTable() {
    const rows = state.requests
      .filter(requestMatchesFilters)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    $('#requestTableBody').innerHTML = rows.map(r => `
      <tr data-request-id="${r.id}">
        <td><div class="table-request"><strong>${escapeHtml(r.issue)}</strong><span>${escapeHtml(r.tenant)} · ${escapeHtml(r.id)}</span></div></td>
        <td>${escapeHtml(r.property)}</td>
        <td><span class="category-tag">${escapeHtml(r.category)}</span></td>
        <td><span class="badge ${slugify(r.urgency)}">${escapeHtml(r.urgency)}</span></td>
        <td><span class="badge ${slugify(r.status)}">${escapeHtml(r.status)}</span></td>
        <td>${formatRelative(r.createdAt)}</td>
        <td class="chevron">›</td>
      </tr>`).join('');

    $('#requestEmptyState').classList.toggle('hidden', rows.length > 0);
    $('.table-wrap').classList.toggle('hidden', rows.length === 0);
  }

  function renderAll() {
    renderMetrics();
    renderPriorityQueue();
    renderCategoryBars();
    renderActivity();
    renderRequestTable();
    if (selectedRequestId) renderDrawer(selectedRequestId);
  }

  function setView(view) {
    const meta = {
      overview: ['Overview', 'Maintenance operations at a glance'],
      requests: ['Requests', 'Review and manage maintenance requests'],
      new: ['New request', 'Turn a tenant email into a structured job'],
      activity: ['Activity', 'Audit trail across the demo workspace']
    };
    if (!meta[view]) return;
    currentView = view;
    $$('.view').forEach(el => el.classList.remove('active'));
    $(`#view-${view}`).classList.add('active');
    $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    $('#pageTitle').textContent = meta[view][0];
    $('#pageSubtitle').textContent = meta[view][1];
    $('#sidebar').classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (view === 'requests') renderRequestTable();
    if (view === 'activity') renderActivity();
    history.replaceState(null, '', `#${view}`);
  }

  function detectTenant(email, message) {
    const direct = message.match(/(?:i am|i'm|this is|here(?:\s+is)?|hello,?|hi,?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i);
    if (direct) return direct[1].replace(/^(?:team\s*)/i, '').trim();
    const local = (email.split('@')[0] || '').replace(/[._-]+/g, ' ');
    return local.split(' ').filter(Boolean).map(part => part[0]?.toUpperCase() + part.slice(1)).join(' ') || 'Tenant';
  }

  function detectProperty(text) {
    const streetTypes = 'Street|St|Road|Rd|Avenue|Ave|Crescent|Cres|Drive|Dr|Lane|Ln|Parade|Pde|Terrace|Tce|Boulevard|Blvd|Way|Close|Court|Ct';
    const pattern = new RegExp(`\\b(\\d{1,4}[A-Za-z]?\\s+[A-Z][A-Za-z' -]{1,35}\\s+(?:${streetTypes})(?:,?\\s+[A-Z][A-Za-z ]{2,25})?(?:\\s+WA\\s+\\d{4})?)`, 'i');
    const match = text.match(pattern);
    return match ? match[1].replace(/\s+/g, ' ').trim() : 'Address needs confirmation';
  }

  function hasAny(text, words) {
    return words.some(word => text.includes(word));
  }

  function classifyCategory(text) {
    const rules = [
      ['Plumbing', ['leak', 'leaking', 'tap', 'pipe', 'toilet', 'drain', 'water', 'shower', 'sink', 'plumber']],
      ['Electrical', ['power point', 'powerpoint', 'electric', 'electrical', 'sparking', 'spark', 'outlet', 'switch', 'circuit', 'power', 'buzzing']],
      ['Security', ['lock', 'deadlock', 'door', 'window latch', 'secure', 'security', 'key']],
      ['HVAC', ['air conditioner', 'air conditioning', 'split system', 'heater', 'heating', 'cooling', 'hvac']],
      ['Appliance', ['stove', 'cooktop', 'oven', 'dishwasher', 'washing machine', 'dryer', 'fridge', 'gas appliance']],
      ['Structural', ['crack', 'ceiling', 'roof', 'wall', 'structural', 'floorboard', 'foundation']]
    ];
    for (const [category, keywords] of rules) if (hasAny(text, keywords)) return category;
    return 'General';
  }

  function classifyUrgency(text, category) {
    const negatedFire = /(no|not|without)\s+(smoke|sparking|spark|fire)/i.test(text);
    const gasRisk = /(?:smell|odor|odour|leak)\s+(?:of\s+)?gas|gas\s+(?:smell|leak|odor|odour)/i.test(text);
    const fireRisk = !negatedFire && hasAny(text, ['fire', 'smoke', 'sparking', 'spark']);
    const activeFlood = hasAny(text, ['flooding', 'burst pipe', 'water pouring', 'ceiling collapsing', 'cannot stop the water']);
    const electricalShock = hasAny(text, ['electric shock', 'shocked me', 'live wire']);
    if (gasRisk || fireRisk || activeFlood || electricalShock) return 'Emergency';

    const explicitLow = hasAny(text, ['can wait', 'not urgent', 'normal appointment', 'routine', 'cosmetic']);
    if (explicitLow) return 'Low';

    const securityRisk = category === 'Security' && hasAny(text, ['will not lock', 'cannot lock', 'cannot be fully secured', 'broken lock', 'not secure']);
    const activeLeak = category === 'Plumbing' && hasAny(text, ['leaking heavily', 'leaking steadily', 'pooling', 'getting wet', 'needs attention today']);
    const hotOrBuzzingElectrical = category === 'Electrical' && hasAny(text, ['buzzing', 'felt warm', 'hot outlet', 'burning smell']);
    if (securityRisk || activeLeak || hotOrBuzzingElectrical || hasAny(text, ['urgent', 'as soon as possible', 'today please'])) return 'High';

    if (category === 'Electrical' || category === 'Plumbing' || category === 'Security') return 'Medium';
    return 'Low';
  }

  function summarizeIssue(subject, message, category) {
    const cleaned = subject.trim().replace(/^(urgent[:\s-]*)/i, '').trim();
    if (cleaned.length >= 8) return cleaned[0].toUpperCase() + cleaned.slice(1);
    const firstSentence = message.split(/[.!?]/)[0].trim();
    return firstSentence.slice(0, 110) || `${category} maintenance request`;
  }

  function buildDraft(tenant, issue, category, urgency) {
    const priority = urgency === 'Emergency'
      ? 'has been logged as an emergency priority for immediate property-manager review'
      : urgency === 'High'
        ? 'has been logged as a high-priority maintenance request'
        : 'has been logged for property-manager review';
    return `Hi ${tenant.split(' ')[0]}, thanks for reporting the ${issue.toLowerCase()}. Your ${category.toLowerCase()} request ${priority}. A property manager will review the details and confirm the next step shortly.`;
  }

  function calculateConfidence(property, category, urgency, issue) {
    let confidence = 82;
    if (!property.includes('needs confirmation')) confidence += 6;
    if (category !== 'General') confidence += 4;
    if (urgency !== 'Low') confidence += 2;
    if (issue.length > 15) confidence += 3;
    return Math.min(98, confidence);
  }

  function analyseInput(email, subject, message) {
    const combined = `${subject} ${message}`.toLowerCase();
    const tenant = detectTenant(email, message);
    const property = detectProperty(`${subject} ${message}`);
    const category = classifyCategory(combined);
    const urgency = classifyUrgency(combined, category);
    const issue = summarizeIssue(subject, message, category);
    return {
      tenant,
      senderEmail: email,
      property,
      subject,
      message,
      issue,
      category,
      urgency,
      confidence: calculateConfidence(property, category, urgency, issue),
      draft: buildDraft(tenant, issue, category, urgency)
    };
  }

  function createRequest(data) {
    const id = `MF-${state.nextId++}`;
    const createdAt = new Date().toISOString();
    const request = {
      id,
      ...data,
      status: 'Awaiting review',
      createdAt,
      events: [{ type: 'Request received', detail: `Email structured automatically with ${data.confidence}% confidence.`, at: createdAt }]
    };
    if (data.urgency === 'Emergency') {
      request.events.push({ type: 'Emergency flag raised', detail: 'Safety-sensitive language detected for immediate human review.', at: createdAt });
    }
    state.requests.unshift(request);
    saveState();
    renderAll();
    return request;
  }

  function renderDrawer(id) {
    const r = state.requests.find(x => x.id === id);
    if (!r) return;
    selectedRequestId = id;
    $('#drawerRequestId').textContent = r.id;
    $('#drawerTitle').textContent = r.issue;

    const actions = r.status === 'Awaiting review'
      ? `<button class="button success" data-action="approve" data-id="${r.id}">✓ Approve request</button>
         <button class="button danger" data-action="reject" data-id="${r.id}">Reject</button>`
      : r.status === 'Approved'
        ? `<button class="button primary" data-action="resolve" data-id="${r.id}">Mark resolved</button>`
        : '';

    $('#drawerContent').innerHTML = `
      <div class="detail-grid">
        <div class="detail-box"><span>Status</span><strong><span class="badge ${slugify(r.status)}">${escapeHtml(r.status)}</span></strong></div>
        <div class="detail-box"><span>Priority</span><strong><span class="badge ${slugify(r.urgency)}">${escapeHtml(r.urgency)}</span></strong></div>
        <div class="detail-box"><span>Category</span><strong>${escapeHtml(r.category)}</strong></div>
        <div class="detail-box"><span>Auto-structure confidence</span><strong>${escapeHtml(r.confidence)}%</strong></div>
        <div class="detail-box"><span>Tenant</span><strong>${escapeHtml(r.tenant)}</strong></div>
        <div class="detail-box"><span>Received</span><strong>${formatRelative(r.createdAt)}</strong></div>
      </div>

      <div class="detail-section">
        <h4>Property</h4>
        <div class="email-card">${escapeHtml(r.property)}</div>
      </div>

      <div class="detail-section">
        <h4>Original tenant email</h4>
        <div class="email-card"><strong>${escapeHtml(r.subject)}</strong>\n\n${escapeHtml(r.message)}</div>
      </div>

      <div class="detail-section">
        <h4>Suggested acknowledgement</h4>
        <div class="draft-card">${escapeHtml(r.draft)}</div>
      </div>

      ${actions ? `<div class="detail-actions">${actions}</div>` : ''}

      <div class="detail-section">
        <h4>Audit trail</h4>
        <div class="timeline-mini">
          ${[...r.events].sort((a,b) => new Date(b.at)-new Date(a.at)).map(event => `
            <div class="timeline-mini-item"><strong>${escapeHtml(event.type)}</strong><span>${escapeHtml(event.detail)} · ${formatRelative(event.at)}</span></div>`).join('')}
        </div>
      </div>`;
  }

  function openDrawer(id) {
    renderDrawer(id);
    $('#drawerBackdrop').classList.remove('hidden');
    $('#requestDrawer').classList.add('open');
    $('#requestDrawer').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    $('#requestDrawer').classList.remove('open');
    $('#drawerBackdrop').classList.add('hidden');
    $('#requestDrawer').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function addEvent(r, type, detail) {
    r.events.push({ type, detail, at: new Date().toISOString() });
  }

  function changeStatus(id, status) {
    const r = state.requests.find(x => x.id === id);
    if (!r) return;
    r.status = status;
    if (status === 'Approved') addEvent(r, 'Approved by property manager', 'Human approval recorded; draft acknowledgement accepted in the demo workflow.');
    if (status === 'Rejected') addEvent(r, 'Rejected by property manager', 'Request was rejected from the automated queue for manual handling.');
    if (status === 'Resolved') addEvent(r, 'Marked resolved', 'Maintenance request closed in the demo workspace.');
    saveState();
    renderAll();
    renderDrawer(id);
    toast(`Request ${status.toLowerCase()}`, `${id} has been updated.`);
  }

  function exportCsv() {
    const headers = ['Request ID', 'Tenant', 'Email', 'Property', 'Issue', 'Category', 'Priority', 'Status', 'Received'];
    const rows = state.requests.map(r => [r.id, r.tenant, r.senderEmail, r.property, r.issue, r.category, r.urgency, r.status, r.createdAt]);
    const encode = v => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const csv = [headers, ...rows].map(row => row.map(encode).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintainflow-requests-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('CSV exported', 'The current demo request queue has been downloaded.');
  }

  function toast(title, message) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
    $('#toastWrap').appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  function fillSample(key) {
    const sample = samples[key];
    if (!sample) return;
    $('#senderEmail').value = sample.email;
    $('#subject').value = sample.subject;
    $('#message').value = sample.message;
  }

  function clearForm() {
    $('#requestForm').reset();
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const nav = event.target.closest('[data-view]');
      if (nav) setView(nav.dataset.view);

      const jump = event.target.closest('[data-view-jump]');
      if (jump) setView(jump.dataset.viewJump);

      const openNew = event.target.closest('[data-open-new]');
      if (openNew) setView('new');

      const request = event.target.closest('[data-request-id]');
      if (request) openDrawer(request.dataset.requestId);

      const action = event.target.closest('[data-action]');
      if (action) {
        event.stopPropagation();
        const map = { approve: 'Approved', reject: 'Rejected', resolve: 'Resolved' };
        changeStatus(action.dataset.id, map[action.dataset.action]);
      }

      const sample = event.target.closest('[data-sample]');
      if (sample) fillSample(sample.dataset.sample);
    });

    $('#requestForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const email = $('#senderEmail').value.trim();
      const subject = $('#subject').value.trim();
      const message = $('#message').value.trim();
      if (!email || !subject || !message) return;
      const request = createRequest(analyseInput(email, subject, message));
      clearForm();
      setView('requests');
      openDrawer(request.id);
      toast('Request created', `${request.id} was automatically structured and added to the review queue.`);
    });

    ['searchInput', 'statusFilter', 'urgencyFilter', 'categoryFilter'].forEach(id => {
      $(`#${id}`).addEventListener(id === 'searchInput' ? 'input' : 'change', renderRequestTable);
    });

    $('#clearFormBtn').addEventListener('click', clearForm);
    $('#exportBtn').addEventListener('click', exportCsv);
    $('#resetDemoBtn').addEventListener('click', resetState);
    $('#closeDrawerBtn').addEventListener('click', closeDrawer);
    $('#drawerBackdrop').addEventListener('click', closeDrawer);
    $('#mobileMenuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeDrawer(); });
  }

  function init() {
    bindEvents();
    renderAll();
    const initial = location.hash.replace('#', '');
    if (['overview', 'requests', 'new', 'activity'].includes(initial)) setView(initial);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
