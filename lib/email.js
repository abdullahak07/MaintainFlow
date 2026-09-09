function configured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

function deliveryFor({ to, intendedTo }) {
  const demoRecipient = process.env.DEMO_RECIPIENT && process.env.DEMO_RECIPIENT.trim();
  const liveAllowed = String(process.env.ALLOW_LIVE_DISPATCH || '').toLowerCase() === 'true';

  if (!demoRecipient && !liveAllowed) {
    const err = new Error('Live dispatch is disabled. Set DEMO_RECIPIENT for safe testing.');
    err.code = 'LIVE_DISPATCH_DISABLED';
    throw err;
  }

  return {
    actualTo: demoRecipient || to,
    intendedTo: intendedTo || to,
    demoRedirected: Boolean(demoRecipient)
  };
}

async function resendRequest(path, body, idempotencyKey) {
  if (!configured()) {
    const err = new Error('Email is not configured');
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }

  const headers = {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const res = await fetch(`https://api.resend.com${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Resend failed (${res.status})`);
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}

async function sendEmail({ to, subject, text, intendedTo, idempotencyKey }) {
  const delivery = deliveryFor({ to, intendedTo });
  const safePrefix = delivery.demoRedirected ? `[DEMO → ${delivery.intendedTo}] ` : '';
  const data = await resendRequest('/emails', {
    from: process.env.MAIL_FROM,
    to: [delivery.actualTo],
    subject: `${safePrefix}${subject}`,
    text
  }, idempotencyKey);

  return { ...data, ...delivery };
}

async function sendBatch(messages, { idempotencyKey } = {}) {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const prepared = messages.map(message => {
    const delivery = deliveryFor(message);
    const safePrefix = delivery.demoRedirected ? `[DEMO → ${delivery.intendedTo}] ` : '';
    return {
      delivery,
      payload: {
        from: process.env.MAIL_FROM,
        to: [delivery.actualTo],
        subject: `${safePrefix}${message.subject}`,
        text: message.text
      }
    };
  });

  const response = await resendRequest('/emails/batch', prepared.map(item => item.payload), idempotencyKey);
  const rows = Array.isArray(response?.data) ? response.data : [];

  return prepared.map((item, index) => ({
    ...(rows[index] || {}),
    ...item.delivery
  }));
}

module.exports = { configured, sendEmail, sendBatch };
