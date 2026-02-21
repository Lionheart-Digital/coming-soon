function escapeHtml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    var body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    if (!process.env.RESEND_API_KEY || !process.env.TURNSTILE_SECRET_KEY) {
      console.error('Missing required environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const name           = (body.name || '').trim();
    const email          = (body.email || '').trim();
    const phone          = (body.phone || '').trim();
    const message        = (body.message || '').trim();
    const website        = (body.website        || '').trim();
    const turnstileToken = (body.turnstileToken || '').trim();

    // Honeypot check — silent 200 so bots think they succeeded
    if (website) {
      return res.status(200).json({ ok: true });
    }

    // Required field validation
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Email format validation — string ops only, no regex backtracking risk
    const atIndex = email.indexOf('@');
    const emailValid = email.length <= 254 &&
      atIndex > 0 &&
      atIndex === email.lastIndexOf('@') &&
      (function () {
        const domain = email.slice(atIndex + 1);
        const dot = domain.lastIndexOf('.');
        return dot > 0 && dot < domain.length - 1 && !/\s/.test(email);
      }());
    if (!emailValid) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Name length cap
    if (name.length > 100) {
      return res.status(400).json({ error: 'Name exceeds 100 character limit' });
    }

    // Message length cap
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message exceeds 2000 character limit' });
    }

    // Verify Cloudflare Turnstile token
    const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret:   process.env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
      }).toString(),
    });

    const turnstileData = await turnstileRes.json();
    if (!turnstileData.success) {
      return res.status(400).json({ error: 'Bot verification failed' });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    // Build notification email body
    const notifyLines = [
      'Name: ' + name,
      'Email: ' + email,
    ];
    if (phone) notifyLines.push('Phone: ' + phone);
    notifyLines.push('', 'Message:', message);

    // Send notification to owner
    const notifyRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:     'hello@lionheartdigital.co',
        to:       'hello@lionheartdigital.co',
        reply_to: email,
        subject:  'New Contact Form Submission \u2014 ' + name,
        text:     notifyLines.join('\n'),
      }),
    });

    if (!notifyRes.ok) {
      const notifyError = await notifyRes.text();
      console.error('Resend notification failed:', notifyError);
      return res.status(500).json({ error: 'Failed to send notification email' });
    }

    // Send auto-reply to submitter
    // Non-fatal — log failure but don't error the response
    try {
      const replyRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + RESEND_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:     'hello@lionheartdigital.co',
          to:       email,
          reply_to: 'hello@lionheartdigital.co',
          subject:  'Thanks for reaching out \u2014 Lionheart Digital',
          html: [
            '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif;',
            '     font-size: 16px; line-height: 1.6; color: #2d3436; max-width: 560px;">',
            '  <p>Hi ' + escapeHtml(name) + ',</p>',
            '  <p>Thanks for reaching out to Lionheart Digital. We\u2019ve received your message',
            '     and will be in touch within 1\u20132 business days.</p>',
            '  <p>\u2014 The Lionheart Digital Team</p>',
            '  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">',
            '  <p style="margin: 0; font-size: 14px; line-height: 1.8;">',
            '    <strong style="color: #0f4d83;">Lionheart Digital, LLC</strong><br>',
            '    <em>Service-Disabled Veteran-Owned Small Business (SDVOSB)</em><br>',
            '    <a href="https://www.lionheartdigital.co" style="color: #0f4d83;">',
            '      www.lionheartdigital.co',
            '    </a>',
            '  </p>',
            '</div>',
          ].join('\n'),
        }),
      });

      if (!replyRes.ok) {
        const replyError = await replyRes.text();
        console.error('Resend auto-reply failed:', replyError);
      }
    } catch (err) {
      console.error('Auto-reply error:', err);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Unhandled error in contact handler:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
