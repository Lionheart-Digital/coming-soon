# Contact Form & Navigation Header Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a sticky navigation header and a contact form with bot protection, server-side email sending via Resend, and an auto-reply confirmation email.

**Architecture:** Static HTML/CSS site on Vercel. A Vercel Serverless Function at `api/contact.js` receives form POSTs, verifies a Cloudflare Turnstile token, then calls Resend twice — once to notify the owner, once to auto-reply to the submitter. No database, no npm dependencies, plain JavaScript throughout.

**Tech Stack:** HTML, CSS, vanilla JS, Vercel Serverless Functions (Node.js), Resend API, Cloudflare Turnstile

---

## Prerequisites (manual, one-time — must be done before Task 5 works in production)

### Resend
1. Create account at https://resend.com
2. Go to Domains → Add Domain → enter `lionheartdigital.co`
3. Resend shows SPF and DKIM DNS records — add them in Cloudflare DNS dashboard
4. Wait for verification (usually under 5 minutes)
5. Go to API Keys → Create API Key → copy the value (you'll need it for Task 5)

### Cloudflare Turnstile
1. Log into Cloudflare dashboard → Turnstile (left sidebar)
2. Add Site → name it "lionheartdigital.co contact form" → set domain to `lionheartdigital.co`
3. Choose widget type: **Managed** (invisible/low friction)
4. Copy **Site Key** (public — goes in `index.html` in Task 3)
5. Copy **Secret Key** (private — goes in Vercel env vars in Task 5)

### Vercel Environment Variables
1. Go to Vercel project → Settings → Environment Variables
2. Add `RESEND_API_KEY` — value from Resend step above
3. Add `TURNSTILE_SECRET_KEY` — value from Cloudflare step above
4. Set both to apply to Production, Preview, and Development environments

---

## Task 1: Add section IDs and fixed-header scroll offset

**Files:**
- Modify: `index.html`
- Modify: `styles.css`

**Step 1: Add IDs to existing sections in `index.html`**

Change the services opening tag (line 58):
```html
<section class="services" id="services" aria-label="Our Services">
```

Change the values opening tag (line 101):
```html
<section class="values" id="values" aria-label="Our Values">
```

Add `scroll-behavior: smooth` to the `html` element in `styles.css` (after line 22):
```css
html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  scroll-behavior: smooth;
}
```

**Step 2: Add padding-top to body for the fixed header**

Add to the `body` rule in `styles.css` (after the existing body styles, around line 32):
```css
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 400;
  line-height: 1.6;
  color: #2d3436;
  background-color: #fafafa;
  padding-top: 64px; /* height of fixed header */
}
```

Add scroll-margin-top to all sections so they don't hide behind the header when anchored:
```css
/* Anchor scroll offset for fixed header */
section {
  scroll-margin-top: 64px;
}
```

Add this block after the `section` rule in styles.css, near the top of the file after the container rule.

**Step 3: Verify**

Open `index.html` in a browser. The page content should not shift visibly yet (no header exists yet). Note the padding-top gap at the top.

**Step 4: Commit**
```bash
git add index.html styles.css
git commit -m "Add section IDs and fixed-header scroll offset"
```

---

## Task 2: Add sticky navigation header

**Files:**
- Modify: `index.html`
- Modify: `styles.css`

**Step 1: Add `<header>` to `index.html`**

Add the following immediately after `<body>` (before `<main>`), at line 42:
```html
<header class="site-header">
  <div class="container header-container">
    <a href="#" class="header-logo-link" aria-label="Lionheart Digital — back to top">
      <img src="LionheartLogo.png" alt="Lionheart Digital" class="header-logo">
    </a>
    <nav aria-label="Main navigation">
      <a href="#services">Services</a>
      <a href="#values">Values</a>
      <a href="#contact">Contact</a>
    </nav>
  </div>
</header>
```

**Step 2: Add header styles to `styles.css`**

Add a new section after the `.container` rule (around line 67):
```css
/* ==========================================================================
   Site Header / Navigation
   ========================================================================== */

.site-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #0f4d83;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.header-logo-link {
  display: flex;
  align-items: center;
  text-decoration: none;
}

.header-logo {
  height: 36px;
  width: auto;
  filter: brightness(0) invert(1);
}

.site-header nav {
  display: flex;
  gap: 32px;
}

.site-header nav a {
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 600;
  font-size: 0.8125rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: color 0.2s ease;
}

.site-header nav a:hover {
  color: #ffffff;
}

.site-header nav a:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.8);
  outline-offset: 3px;
  border-radius: 2px;
}
```

Add responsive overrides in the tablet media query (around line 298):
```css
@media (max-width: 768px) {
  .site-header nav {
    gap: 20px;
  }

  .site-header nav a {
    font-size: 0.75rem;
  }

  .header-logo {
    height: 28px;
  }
}
```

Add responsive overrides in the mobile media query (around line 355):
```css
@media (max-width: 480px) {
  .site-header nav {
    gap: 14px;
  }

  .site-header nav a {
    font-size: 0.6875rem;
    letter-spacing: 0.04em;
  }

  .header-logo {
    height: 24px;
  }
}
```

**Step 3: Verify**

Open `index.html` in a browser:
- Blue header bar is fixed at the top
- White logo appears on the left (blue → white via CSS filter)
- Services, Values, Contact links are visible on the right
- Clicking links scrolls smoothly to sections (no content hides under header)
- Resize to mobile — nav links remain visible, don't overflow

**Step 4: Commit**
```bash
git add index.html styles.css
git commit -m "Add sticky navigation header"
```

---

## Task 3: Add contact form section (HTML + CSS)

**Files:**
- Modify: `index.html`
- Modify: `styles.css`

**Step 1: Add Cloudflare Turnstile script to `<head>` in `index.html`**

Add before `</head>` (around line 40):
```html
  <!-- Cloudflare Turnstile -->
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

**Step 2: Add contact section to `index.html`**

Add the following immediately before `</main>` (after the closing `</section>` of the values section, around line 120):
```html
    <!-- Contact Section -->
    <section class="contact" id="contact" aria-labelledby="contact-heading">
      <div class="container">
        <h2 id="contact-heading" class="contact-heading">Get in Touch</h2>
        <form class="contact-form" id="contactForm" novalidate>

          <!-- Honeypot: hidden from real users, bots fill it -->
          <div class="contact-honeypot" aria-hidden="true">
            <label for="website">Website</label>
            <input type="text" id="website" name="website" tabindex="-1" autocomplete="off">
          </div>

          <div class="form-group">
            <label for="name" class="form-label">Name <span class="form-required" aria-hidden="true">*</span></label>
            <input type="text" id="name" name="name" class="form-input" required autocomplete="name">
            <span class="form-error" id="name-error" role="alert"></span>
          </div>

          <div class="form-group">
            <label for="email" class="form-label">Email <span class="form-required" aria-hidden="true">*</span></label>
            <input type="email" id="email" name="email" class="form-input" required autocomplete="email">
            <span class="form-error" id="email-error" role="alert"></span>
          </div>

          <div class="form-group">
            <label for="phone" class="form-label">
              Phone <span class="form-optional">(optional)</span>
            </label>
            <input type="tel" id="phone" name="phone" class="form-input" autocomplete="tel">
          </div>

          <div class="form-group">
            <label for="message" class="form-label">Message <span class="form-required" aria-hidden="true">*</span></label>
            <textarea id="message" name="message" class="form-input form-textarea" required rows="5" maxlength="2000"></textarea>
            <span class="form-error" id="message-error" role="alert"></span>
          </div>

          <!-- Cloudflare Turnstile widget — replace data-sitekey with your actual site key -->
          <div class="cf-turnstile" data-sitekey="YOUR_TURNSTILE_SITE_KEY" data-theme="light"></div>

          <button type="submit" class="form-submit" id="submitBtn">Send Message</button>

          <div class="form-feedback form-success" id="formSuccess" hidden>
            <p>Thanks for reaching out! We'll be in touch within 1–2 business days.</p>
          </div>
          <div class="form-feedback form-error-banner" id="formErrorBanner" hidden>
            <p>Something went wrong. Please try again or email us directly at <a href="mailto:hello@lionheartdigital.co">hello@lionheartdigital.co</a>.</p>
          </div>

        </form>
      </div>
    </section>
```

**Step 3: Add contact form styles to `styles.css`**

Add a new section before the footer styles (before the `/* Footer */` comment):
```css
/* ==========================================================================
   Contact Section
   ========================================================================== */

.contact {
  padding: 80px 0;
  background-color: #ffffff;
}

.contact-heading {
  font-size: 1.75rem;
  color: #0f4d83;
  text-align: center;
  margin-bottom: 48px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.contact-form {
  max-width: 600px;
  margin: 0 auto;
}

/* Honeypot — visually hidden but not display:none so bots don't skip it */
.contact-honeypot {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #2d3436;
  margin-bottom: 6px;
}

.form-required {
  color: #0f4d83;
}

.form-optional {
  font-weight: 400;
  color: #718096;
  font-size: 0.8125rem;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 1rem;
  color: #2d3436;
  background-color: #ffffff;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  -webkit-appearance: none;
}

.form-input:focus {
  outline: none;
  border-color: #0f4d83;
  box-shadow: 0 0 0 3px rgba(15, 77, 131, 0.15);
}

.form-input.has-error {
  border-color: #e53e3e;
}

.form-input.has-error:focus {
  box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.15);
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
  line-height: 1.6;
}

.form-error {
  display: block;
  font-size: 0.8125rem;
  color: #e53e3e;
  margin-top: 6px;
  min-height: 1em;
}

.cf-turnstile {
  margin-bottom: 24px;
}

.form-submit {
  width: 100%;
  padding: 13px 24px;
  font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #ffffff;
  background-color: #0f4d83;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.form-submit:hover:not(:disabled) {
  background-color: #0a3a64;
}

.form-submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.form-feedback {
  margin-top: 20px;
  padding: 14px 16px;
  border-radius: 4px;
  font-size: 0.9375rem;
}

.form-success {
  background-color: #f0fff4;
  border: 1px solid #9ae6b4;
  color: #276749;
}

.form-error-banner {
  background-color: #fff5f5;
  border: 1px solid #feb2b2;
  color: #9b2c2c;
}

.form-error-banner a {
  color: #9b2c2c;
  font-weight: 500;
}
```

Add contact responsive overrides inside the tablet media query:
```css
@media (max-width: 768px) {
  .contact {
    padding: 60px 0;
  }

  .contact-heading {
    font-size: 1.5rem;
    margin-bottom: 36px;
  }
}
```

Add contact responsive overrides inside the mobile media query:
```css
@media (max-width: 480px) {
  .contact {
    padding: 48px 0;
  }

  .contact-heading {
    font-size: 1.25rem;
    margin-bottom: 28px;
  }
}
```

**Step 4: Replace the Turnstile site key placeholder**

In `index.html`, replace `YOUR_TURNSTILE_SITE_KEY` in the `data-sitekey` attribute with the actual site key from the Cloudflare Turnstile dashboard (from the Prerequisites section above).

**Step 5: Verify**

Open `index.html` in a browser:
- Contact section appears at the bottom of the page above the footer
- All fields render correctly with labels
- Cloudflare Turnstile widget appears (requires internet connection; shows a loading spinner or checkbox)
- Nav "Contact" link scrolls to the section
- Input focus styles show blue ring
- Page looks correct at mobile widths

**Step 6: Commit**
```bash
git add index.html styles.css
git commit -m "Add contact form section with Turnstile widget"
```

---

## Task 4: Add client-side validation and form submission JS

**Files:**
- Modify: `index.html`

**Step 1: Add the form script to `index.html`**

Add the following immediately before `</body>` (after the existing `<script>` block for the year):
```html
  <script>
    (function () {
      var form = document.getElementById('contactForm');
      if (!form) return;

      var nameInput    = document.getElementById('name');
      var emailInput   = document.getElementById('email');
      var messageInput = document.getElementById('message');
      var phoneInput   = document.getElementById('phone');
      var websiteInput = document.getElementById('website');
      var submitBtn    = document.getElementById('submitBtn');
      var formSuccess  = document.getElementById('formSuccess');
      var formErrBanner = document.getElementById('formErrorBanner');

      var fields = [
        { el: nameInput,    errorId: 'name-error',    label: 'Name' },
        { el: emailInput,   errorId: 'email-error',   label: 'Email' },
        { el: messageInput, errorId: 'message-error', label: 'Message' },
      ];

      function showError(field, msg) {
        field.el.classList.add('has-error');
        document.getElementById(field.errorId).textContent = msg;
      }

      function clearError(field) {
        field.el.classList.remove('has-error');
        document.getElementById(field.errorId).textContent = '';
      }

      function isValidEmail(val) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      }

      function validateField(field) {
        var val = field.el.value.trim();
        if (!val) {
          showError(field, field.label + ' is required.');
          return false;
        }
        if (field.el === emailInput && !isValidEmail(val)) {
          showError(field, 'Please enter a valid email address.');
          return false;
        }
        clearError(field);
        return true;
      }

      // Clear error as user corrects each field
      fields.forEach(function (field) {
        field.el.addEventListener('input', function () {
          if (field.el.classList.contains('has-error')) {
            validateField(field);
          }
        });
      });

      form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Validate all required fields
        var allValid = fields.map(validateField).every(Boolean);
        if (!allValid) {
          var firstInvalid = fields.find(function (f) {
            return f.el.classList.contains('has-error');
          });
          if (firstInvalid) firstInvalid.el.focus();
          return;
        }

        // Get Turnstile token (rendered by the widget into a hidden input)
        var tokenInput = form.querySelector('[name="cf-turnstile-response"]');
        var turnstileToken = tokenInput ? tokenInput.value : '';

        // Update UI to sending state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending\u2026';
        formErrBanner.hidden = true;

        try {
          var res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name:           nameInput.value.trim(),
              email:          emailInput.value.trim(),
              phone:          phoneInput.value.trim(),
              message:        messageInput.value.trim(),
              website:        websiteInput.value,
              turnstileToken: turnstileToken,
            }),
          });

          if (!res.ok) throw new Error('Server returned ' + res.status);

          // Success — hide form, show confirmation
          form.hidden = true;
          formSuccess.hidden = false;

        } catch (err) {
          // Failure — restore button, show error banner
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Message';
          formErrBanner.hidden = false;

          // Reset Turnstile widget so user can retry
          if (window.turnstile) {
            window.turnstile.reset();
          }
        }
      });
    })();
  </script>
```

**Step 2: Verify client-side validation**

Open `index.html` in a browser. Scroll to the contact form and try the following:

- Click "Send Message" with all fields empty → error messages appear under Name, Email, Message
- Type an invalid email (e.g. `notanemail`) → "Please enter a valid email address." appears
- Correct the email → error clears immediately
- Fill all required fields and click submit → button shows "Sending…" and disables (will fail with a network error since the API doesn't exist yet — that's expected)

**Step 3: Commit**
```bash
git add index.html
git commit -m "Add client-side form validation and submission logic"
```

---

## Task 5: Create Vercel serverless function

**Files:**
- Create: `api/contact.js`

**Step 1: Create the `api/` directory and `contact.js`**

Create `api/contact.js` with the following content:
```javascript
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
```

**Step 2: Verify the function locally with Vercel CLI**

If `vercel` CLI is not installed:
```bash
npm install -g vercel
```

Run the local dev server from the project root:
```bash
vercel dev
```

Vercel will prompt to link to your project the first time — follow the prompts.

Once running (default: http://localhost:3000), test with curl. The Turnstile token won't verify locally (Cloudflare rejects non-production tokens), but you can test the validation logic:

Test missing fields:
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"","email":"","message":""}'
```
Expected: `{"error":"Missing required fields"}`

Test invalid email:
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"notanemail","message":"Hello"}'
```
Expected: `{"error":"Invalid email address"}`

Test honeypot trigger:
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Bot","email":"bot@evil.com","message":"Spam","website":"http://spam.com"}'
```
Expected: `{"ok":true}` (silent rejection)

Test Turnstile failure (empty token):
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Hello there","turnstileToken":""}'
```
Expected: `{"error":"Bot verification failed"}`

**Step 3: Commit**
```bash
git add api/contact.js
git commit -m "Add Vercel contact form serverless function"
```

---

## Task 6: Rewrite README

**Files:**
- Modify: `README.md`

**Step 1: Replace the entire contents of `README.md`**

```markdown
# Lionheart Digital — Website

Marketing and contact site for Lionheart Digital, LLC. Veteran-owned, community-focused.

**Live site:** https://lionheartdigital.co

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Hosting | [Vercel](https://vercel.com) |
| DNS / CDN | [Cloudflare](https://cloudflare.com) |
| Email sending | [Resend](https://resend.com) |
| Bot protection | [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) |
| Frontend | Plain HTML, CSS, vanilla JavaScript |
| Backend | Vercel Serverless Function (Node.js) |

No build step. No framework. No npm dependencies.

---

## Architecture

```
Browser → Vercel (static files + /api/contact function)
                        ↓
             Cloudflare Turnstile (token verified server-side)
                        ↓
                    Resend API
                   ↙            ↘
    Notification email        Auto-reply email
    → hello@lionheartdigital.co  → contact form submitter
```

**Contact form flow:**
1. User fills the form; Cloudflare Turnstile runs a challenge in the browser
2. On submit, client-side JS validates required fields and email format
3. A `POST` to `/api/contact` sends the form data + Turnstile token to the Vercel function
4. The function checks a honeypot field, validates inputs, and verifies the Turnstile token with Cloudflare
5. On success, Resend sends two emails: a notification to the owner and a confirmation to the submitter

---

## Local Development

No build step required. For static content only, open `index.html` directly in a browser.

To test the contact form serverless function locally, install the Vercel CLI and run:

```bash
npm install -g vercel
vercel dev
```

The first run links the project to your Vercel account. The local server runs at http://localhost:3000.

Note: Cloudflare Turnstile token verification will fail locally (Cloudflare only validates tokens from registered domains). Validation logic and honeypot behaviour can still be tested via curl — see `docs/plans/2026-02-21-contact-form.md` for test commands.

---

## Environment Variables

Set these in the Vercel project dashboard under **Settings → Environment Variables**.

| Variable | Where to get it |
|----------|----------------|
| `RESEND_API_KEY` | [Resend dashboard](https://resend.com) → API Keys |
| `TURNSTILE_SECRET_KEY` | [Cloudflare dashboard](https://cloudflare.com) → Turnstile → your widget → Secret Key |

Never commit these values to the repository.

---

## Third-Party Setup (one-time)

### Resend — domain verification

Resend must be authorised to send email from `@lionheartdigital.co`. This requires adding DNS records in Cloudflare.

1. Log in to [resend.com](https://resend.com)
2. Go to **Domains** → **Add Domain** → enter `lionheartdigital.co`
3. Resend displays SPF and DKIM records — add them in the Cloudflare DNS dashboard
4. Click **Verify** in Resend once the records are live (usually under 5 minutes)

### Cloudflare Turnstile — widget setup

1. Log in to [cloudflare.com](https://cloudflare.com)
2. Go to **Turnstile** in the left sidebar
3. **Add Site** → name it, set domain to `lionheartdigital.co`, choose **Managed** widget type
4. Copy the **Site Key** and paste it into `index.html` as the `data-sitekey` attribute on the `.cf-turnstile` div
5. Copy the **Secret Key** and add it to Vercel as `TURNSTILE_SECRET_KEY`

---

## Deployment

The site deploys automatically via Vercel's GitHub integration.

- Push to `main` → production deploy at https://lionheartdigital.co
- Push to any other branch → preview deploy at a unique Vercel URL

No manual deploy steps. Vercel detects the `api/` directory and deploys `api/contact.js` as a serverless function automatically.

---

## Project Structure

```
/
├── index.html                  # Main page (single-page site)
├── styles.css                  # All styles
├── api/
│   └── contact.js              # Vercel serverless function — handles form submissions
├── docs/
│   └── plans/                  # Design and implementation documents
├── LionheartLogo.png
├── og-image.png
├── favicon.*                   # Favicon variants
└── site.webmanifest
```
```

**Step 2: Verify**

Read through the rendered README on GitHub after pushing. Confirm all links, the architecture diagram, and the project structure table render correctly.

**Step 3: Commit**
```bash
git add README.md
git commit -m "Rewrite README with architecture, setup, and deploy docs"
```

---

## Final Verification (end-to-end in production)

After deploying to Vercel with both environment variables set and Resend domain verified:

1. Visit https://lionheartdigital.co
2. Click "Contact" in the nav — page scrolls to form
3. Submit the form empty — validation errors appear
4. Fill the form with a real email address you control
5. Complete the Turnstile challenge
6. Click "Send Message"
7. Confirm the success message appears
8. Check `hello@lionheartdigital.co` — notification email received
9. Check the email address you used in the form — auto-reply received from `hello@lionheartdigital.co`

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (this session)** — Fresh subagent dispatched per task, reviewed between tasks, fast iteration

**2. Parallel Session (separate)** — Open a new Claude Code session, reference `docs/plans/2026-02-21-contact-form.md`, execute with `superpowers:executing-plans`

Which approach?
