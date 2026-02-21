module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  var name           = (body.name || '').trim();
  var email          = (body.email || '').trim();
  var phone          = (body.phone || '').trim();
  var message        = (body.message || '').trim();
  var website        = body.website || '';
  var turnstileToken = body.turnstileToken || '';

  // Honeypot check — silent 200 so bots think they succeeded
  if (website) {
    return res.status(200).json({ ok: true });
  }

  // Required field validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Email format validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  // Message length cap
  if (message.length > 2000) {
    return res.status(400).json({ error: 'Message exceeds 2000 character limit' });
  }

  // Verify Cloudflare Turnstile token
  var turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret:   process.env.TURNSTILE_SECRET_KEY,
      response: turnstileToken,
    }).toString(),
  });

  var turnstileData = await turnstileRes.json();
  if (!turnstileData.success) {
    return res.status(400).json({ error: 'Bot verification failed' });
  }

  var RESEND_API_KEY = process.env.RESEND_API_KEY;

  // Build notification email body
  var notifyLines = [
    'Name: ' + name,
    'Email: ' + email,
  ];
  if (phone) notifyLines.push('Phone: ' + phone);
  notifyLines.push('', 'Message:', message);

  // Send notification to owner
  var notifyRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    'hello@lionheartdigital.co',
      to:      'hello@lionheartdigital.co',
      subject: 'New Contact Form Submission \u2014 ' + name,
      text:    notifyLines.join('\n'),
    }),
  });

  if (!notifyRes.ok) {
    var notifyError = await notifyRes.text();
    console.error('Resend notification failed:', notifyError);
    return res.status(500).json({ error: 'Failed to send notification email' });
  }

  // Send auto-reply to submitter
  // Non-fatal — log failure but don't error the response
  try {
    var replyRes = await fetch('https://api.resend.com/emails', {
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
          '  <p>Hi ' + name + ',</p>',
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
      var replyError = await replyRes.text();
      console.error('Resend auto-reply failed:', replyError);
    }
  } catch (err) {
    console.error('Auto-reply error:', err);
  }

  return res.status(200).json({ ok: true });
};
