function configured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

async function sendEmail({ to, subject, text, intendedTo }) {
  if (!configured()) {
    const err = new Error('Email is not configured');
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }

  const demoRecipient = process.env.DEMO_RECIPIENT && process.env.DEMO_RECIPIENT.trim();
  const liveAllowed = String(process.env.ALLOW_LIVE_DISPATCH || '').toLowerCase() === 'true';
  if (!demoRecipient && !liveAllowed) {
    const err = new Error('Live dispatch is disabled. Set DEMO_RECIPIENT for safe testing.');
    err.code = 'LIVE_DISPATCH_DISABLED';
    throw err;
  }

  const actualTo = demoRecipient || to;
  const safePrefix = demoRecipient && intendedTo ? `[DEMO → ${intendedTo}] ` : '';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [actualTo],
      subject: `${safePrefix}${subject}`,
      text
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Resend failed (${res.status})`);
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return { ...data, actualTo, intendedTo: intendedTo || to, demoRedirected: Boolean(demoRecipient) };
}

module.exports = { configured, sendEmail };
