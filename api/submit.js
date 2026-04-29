import { Resend } from 'resend';

// Env vars (set in Vercel → Project Settings → Environment Variables):
//   RESEND_API_KEY  — required, from resend.com → API Keys
//   FROM_EMAIL      — optional, defaults to onboarding@resend.dev (works immediately
//                     before you verify monumentequity.com in Resend). Once verified,
//                     set to forms@monumentequity.com or similar.
//   TO_EMAIL        — required, where general inquiries land (your real inbox).
//   DEALS_EMAIL     — optional, where deal submissions land. Falls back to TO_EMAIL.

const FROM = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const TO_GENERAL = process.env.TO_EMAIL;
const TO_DEALS = process.env.DEALS_EMAIL || TO_GENERAL;

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nl2br(s) {
  return escapeHtml(s).replace(/\n/g, '<br>');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.RESEND_API_KEY || !TO_GENERAL) {
    console.error('Missing required env vars: RESEND_API_KEY and/or TO_EMAIL');
    return res.status(500).json({ error: 'Server not configured. Please email us directly.' });
  }

  const body = req.body || {};

  // Honeypot — if filled, silently succeed
  if (body.website) {
    return res.status(200).json({ ok: true });
  }

  if (!body.formType) {
    return res.status(400).json({ error: 'Missing form type' });
  }
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  let subject;
  let html;
  let recipient;

  switch (body.formType) {
    case 'inquiry': {
      const name = `${body.firstName || ''} ${body.lastName || ''}`.trim() || '(no name)';
      subject = `[Monument Equity] Inquiry from ${name} (${body.role || 'unspecified'})`;
      recipient = TO_GENERAL;
      html = `
        <h2 style="font-family:Georgia,serif">New inquiry from monumentequity.com</h2>
        <p><strong>Type:</strong> ${escapeHtml(body.role || 'Unspecified')}</p>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(body.email)}">${escapeHtml(body.email)}</a></p>
        <p><strong>Message:</strong></p>
        <p>${nl2br(body.message || '(none)')}</p>
      `;
      break;
    }

    case 'deal': {
      subject = `[Monument Equity] Deal: ${body.address || 'unspecified'} (${body.units || '?'} units)`;
      recipient = TO_DEALS;
      html = `
        <h2 style="font-family:Georgia,serif">New deal submission</h2>
        <p><strong>Property:</strong> ${escapeHtml(body.address)}</p>
        <p><strong>Units:</strong> ${escapeHtml(body.units)}</p>
        <p><strong>Year built:</strong> ${escapeHtml(body.vintage || 'n/a')}</p>
        <p><strong>Asking:</strong> ${escapeHtml(body.ask || 'n/a')}</p>
        <p><strong>NOI / cap:</strong> ${escapeHtml(body.noi || 'n/a')}</p>
        <p><strong>Broker / firm:</strong> ${escapeHtml(body.brokerName || 'n/a')}</p>
        <p><strong>From:</strong> <a href="mailto:${escapeHtml(body.email)}">${escapeHtml(body.email)}</a></p>
        <p><strong>Notes / OM:</strong></p>
        <p>${nl2br(body.notes || '(none)')}</p>
      `;
      break;
    }

    case 'owner': {
      subject = `[Monument Equity] Owner inquiry: ${body.address || 'unspecified'}`;
      recipient = TO_GENERAL;
      html = `
        <h2 style="font-family:Georgia,serif">New owner inquiry</h2>
        <p><strong>Property:</strong> ${escapeHtml(body.address)}</p>
        <p><strong>Name:</strong> ${escapeHtml(body.name)}</p>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(body.email)}">${escapeHtml(body.email)}</a></p>
        <p><strong>Notes:</strong></p>
        <p>${nl2br(body.notes || '(none)')}</p>
      `;
      break;
    }

    default:
      return res.status(400).json({ error: 'Unknown form type' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: `Monument Equity <${FROM}>`,
      to: [recipient],
      replyTo: body.email,
      subject,
      html,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Resend send error:', err);
    return res.status(500).json({ error: 'Failed to send. Please email us directly.' });
  }
}
