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

### Testing the function with curl

Cloudflare Turnstile only validates tokens from the registered domain, so token verification always fails locally. All other validation logic can be tested via curl:

**Missing fields → 400**
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"","email":"","message":""}'
```

**Invalid email → 400**
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"notanemail","message":"Hello"}'
```

**Honeypot triggered → 200 silent rejection**
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Bot","email":"bot@evil.com","message":"Spam","website":"http://spam.com"}'
```

**Turnstile failure (expected locally) → 400**
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Hello there","turnstileToken":""}'
```

For full end-to-end testing including Turnstile and real emails, push to a branch and use the Vercel preview URL.

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
