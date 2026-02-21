# Lionheart Digital — Website

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Lionheart-Digital_coming-soon&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Lionheart-Digital_coming-soon)

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

### Request flow

```
Browser
  │
  ├─ Static assets (index.html, styles.css, images)
  │   └─ Served by Vercel CDN — no server involved
  │
  └─ Contact form POST /api/contact
       │
       ├─ 1. Honeypot check (server-side)
       │       Bots that fill the hidden field get a silent 200 — they think it worked
       │
       ├─ 2. Input validation (server-side)
       │       Required fields, email format, name ≤ 100 chars, message ≤ 2000 chars
       │
       ├─ 3. Turnstile token verification → challenges.cloudflare.com
       │       Invisible widget runs a background challenge in the browser.
       │       Token is always re-verified server-side regardless of client result.
       │
       └─ 4. Resend API (two calls)
               ├─ Notification → hello@lionheartdigital.co (plain text, all fields)
               └─ Auto-reply  → submitter (branded HTML, confirms receipt)
                   Non-fatal: logged but does not fail the request if it errors
```

### Bot protection layers

| Layer | Mechanism | Where enforced |
|-------|-----------|----------------|
| Honeypot field | Hidden `<input name="website">` — humans leave it blank, bots fill it | Server-side in `api/contact.js` |
| Cloudflare Turnstile | Invisible challenge runs in the browser on page load | Server-side token verification in `api/contact.js` |

### Security decisions

- **No database** — form data flows directly to Resend's structured API. No SQL, no injection surface.
- **Server-side validation** mirrors client-side — the API cannot be bypassed by disabling JS.
- **`escapeHtml()`** sanitizes user-supplied name before it is embedded in the HTML auto-reply email body.
- **Env vars only** — API keys are never in source code. Read at function runtime from Vercel's environment.
- **Resend API key** scoped to Sending Access + `lionheartdigital.co` domain only (principle of least privilege).

---

## Local Development

No build step required. For static content only, open `index.html` directly in a browser.

To test the contact form serverless function locally:

**1. Install the Vercel CLI (once)**
```bash
npm install -g vercel
```

**2. Pull environment variables from Vercel (once per machine)**
```bash
vercel env pull .env.local
```
This creates a `.env.local` file with your real keys. It is already in `.gitignore` — never commit it.

**3. Start the local dev server**
```bash
vercel dev
```
The first run links the project to your Vercel account. The local server runs at http://localhost:3000.

---

## Testing

### Static site

No server needed. Open `index.html` directly in any browser.

```bash
open index.html
```

Check that the contact form renders, placeholders appear, and validation fires on submit with empty fields.

---

### API — serverless function (local)

Start the local server first (`vercel dev`), then use curl to exercise each code path.

> **Note:** Turnstile token verification always fails locally — Cloudflare only validates tokens issued from the registered production domain. All other validation runs normally.

**Missing required fields → 400**
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"","email":"","message":""}'
```

**Invalid email format → 400**
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"notanemail","message":"Hello"}'
```

**Name exceeds 100 characters → 400**
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","email":"test@example.com","message":"Hello"}'
```

**Honeypot field filled → 200 silent rejection (no email sent)**
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Bot","email":"bot@evil.com","message":"Spam","website":"http://spam.com"}'
```

**Turnstile token missing → 400 (expected locally)**
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Hello there","turnstileToken":""}'
```

---

### End-to-end (real emails + Turnstile)

Turnstile only issues valid tokens on the registered domain. To test the full flow including real email delivery:

1. Push to a feature branch — Vercel automatically creates a preview deploy
2. Open the preview URL (shown in the Vercel dashboard or GitHub PR checks)
3. Submit the contact form with a real email address
4. Verify in **[Resend dashboard](https://resend.com) → Logs** that both emails were sent
5. Check that the notification arrived at `hello@lionheartdigital.co`
6. Check that the auto-reply arrived at the address you submitted

---

### Accessibility

Run an automated WCAG 2.1 AA scan against the HTML file:

```bash
npx pa11y file://$(pwd)/index.html
```

Expected output: `No issues found!`

For a fuller browser-rendered scan (catches dynamic content), start the local server and scan the running URL:

```bash
vercel dev &
npx pa11y http://localhost:3000
```

---

### Email delivery — Resend logs

Every send attempt (success or failure) is visible in the Resend dashboard:

1. Log in to [resend.com](https://resend.com)
2. Go to **Emails** → **Logs**
3. Filter by domain `lionheartdigital.co`

Each entry shows the recipient, subject, status, and full delivery detail. Use this to debug bounces or verify sends after a form submission.

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
