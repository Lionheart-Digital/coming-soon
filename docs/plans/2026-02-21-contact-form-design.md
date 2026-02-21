# Contact Form & Navigation Header — Design Document

**Date:** 2026-02-21
**Status:** Approved

---

## Overview

Add a sticky navigation header and a contact form section to the existing static Lionheart Digital site. Form submissions are handled by a Vercel Serverless Function that verifies bot protection and sends email via Resend. An automatic plain-text confirmation reply is sent to the submitter.

---

## Architecture

```
Browser → Vercel (static site + /api/contact function)
                        ↓
             Cloudflare Turnstile (verify token server-side)
                        ↓
                    Resend API
                    ↙              ↘
     Notification email          Auto-reply email
     → hello@lionheartdigital.co  → submitter
```

**Stack:**
- Hosting: Vercel (static site + serverless functions)
- DNS / CDN: Cloudflare
- Email sending: Resend (free tier: 3,000 emails/month, 100/day)
- Bot protection: Cloudflare Turnstile (free) + honeypot field
- No database. No framework. Plain HTML, CSS, and JavaScript.

---

## 1. Sticky Navigation Header

### Behavior
- Fixed to the top of the viewport (`position: fixed`)
- Background: primary blue (`#0f4d83`)
- Left: Lionheart logo with `filter: brightness(0) invert(1)` to render white on blue
- Right: anchor links — **Services**, **Values**, **Contact** — white text, underline on hover
- Smooth scroll via `scroll-behavior: smooth` on `<html>`
- Page `<main>` gets `padding-top` to prevent content hiding under the fixed bar

### Section IDs added
- `<section id="services">` (existing)
- `<section id="values">` (existing)
- `<section id="contact">` (new)

### Responsive
- Mobile (≤480px): logo left, links right in a smaller font — no hamburger menu needed, page is short

---

## 2. Contact Form Section

### Layout
- White background (matches hero)
- Centered, max-width 600px
- Heading: "Get in Touch" — Montserrat, primary blue, consistent with existing section headings
- Positioned at the bottom of `<main>`, above the footer

### Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | text | Yes | |
| Email | email | Yes | Browser + JS validation |
| Phone | tel | No | Labeled optional |
| Message | textarea | Yes | Max 2,000 chars enforced server-side |
| `website` | hidden (honeypot) | — | Hidden via CSS, not `display:none` |

### Cloudflare Turnstile
- Rendered just above the submit button
- Site key embedded in HTML (public)
- Token sent with form POST, verified server-side

### Submit states
- **Default:** "Send Message" button, primary blue
- **Sending:** button disabled, text changes to "Sending…"
- **Success:** form hidden, success message shown
- **Error:** inline error message shown, form preserved so user doesn't lose input

---

## 3. Client-Side Validation

Runs on submit, before any network request.

**Checks:**
1. Name is not empty
2. Email is not empty and matches a valid email format (regex + `type="email"` native validation)
3. Message is not empty

**Behavior:**
- Inline error message displayed below each invalid field
- Field gets an error border state
- Focus moves to the first invalid field
- Errors clear as the user corrects them (on input event)

**Note on SQL injection:** Not applicable. There is no database in this stack. Data flows from the form to the Vercel function to Resend's structured API — no SQL queries exist anywhere. Resend's structured API (`to`, `subject`, `text` fields) handles email header safety automatically.

---

## 4. Vercel Serverless Function (`api/contact.js`)

Plain JavaScript, no dependencies beyond the fetch API (available in Vercel's Node runtime).

**Request flow:**
1. Reject non-POST requests → `405`
2. Parse JSON body
3. Check honeypot field — if filled, return `200` silently (do not reveal rejection to bots)
4. Validate required fields (name, email, message present and non-empty) → `400` if invalid
5. Enforce message length ≤ 2,000 chars → `400` if exceeded
6. POST Turnstile token to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `TURNSTILE_SECRET_KEY` → `400` if verification fails
7. Call Resend API — send notification email to `hello@lionheartdigital.co`
8. Call Resend API — send auto-reply to submitter
9. Return `200` on success, `500` on Resend failure

**Environment variables (set in Vercel dashboard — never in code):**
- `RESEND_API_KEY`
- `TURNSTILE_SECRET_KEY`

---

## 5. Emails via Resend

### Domain verification (one-time manual step)
Resend requires SPF and DKIM DNS records to send from `@lionheartdigital.co`. Resend provides the exact records to add in the Cloudflare DNS dashboard. Without this, emails may land in spam.

### Notification email (to hello@lionheartdigital.co)
- **From:** `hello@lionheartdigital.co`
- **Subject:** `New Contact Form Submission — [Name]`
- **Format:** Plain text
- **Body:** All submitted fields (name, email, phone if provided, message)

### Auto-reply email (to submitter)
- **From:** `hello@lionheartdigital.co`
- **Reply-To:** `hello@lionheartdigital.co`
- **Subject:** `Thanks for reaching out — Lionheart Digital`
- **Format:** Minimal HTML styled to feel like a personal plain-text email (no images, no layout tables)

**Body:**
```
Hi [Name],

Thanks for reaching out to Lionheart Digital. We've received
your message and will be in touch within 1–2 business days.

— The Lionheart Digital Team
```

**Signature block:**
```
Lionheart Digital, LLC          (color: #0f4d83)
Service-Disabled Veteran-Owned Small Business (SDVOSB)  (italic)
www.lionheartdigital.co         (hyperlink)
```

---

## 6. Bot Protection

Two independent layers:

| Layer | Mechanism | Where enforced |
|-------|-----------|---------------|
| Honeypot field | Hidden `<input name="website">` — bots fill it, humans don't | Server-side in `/api/contact` |
| Cloudflare Turnstile | Free CAPTCHA alternative, usually invisible challenge | Server-side token verification in `/api/contact` |

Both checks happen server-side. Client-side Turnstile rendering is UX only — the server always re-verifies independently.

---

## 7. Files Changed

| File | Change |
|------|--------|
| `index.html` | Add `<header>` nav, section IDs, contact form section with Turnstile widget |
| `styles.css` | Header styles, contact form styles, input error states, header offset |
| `api/contact.js` | New — Vercel serverless function |
| `README.md` | Full rewrite covering architecture, setup, and deploy |

---

## 8. Manual Setup Steps (one-time, outside the codebase)

These must be completed before the form works in production:

1. **Resend**
   - Create account at resend.com
   - Add and verify domain `lionheartdigital.co` (adds SPF + DKIM records in Cloudflare DNS)
   - Create API key, copy value

2. **Cloudflare Turnstile**
   - Go to Cloudflare dashboard → Turnstile
   - Create a new widget for `lionheartdigital.co`
   - Copy **Site Key** (goes in `index.html`)
   - Copy **Secret Key** (goes in Vercel env vars)

3. **Vercel**
   - Go to project Settings → Environment Variables
   - Add `RESEND_API_KEY`
   - Add `TURNSTILE_SECRET_KEY`

---

## 9. README Update

The README will be rewritten to cover:
- Project overview and tech stack
- Local development (no build step — open `index.html` directly)
- Environment variables reference
- Third-party service setup (Resend domain verification, Turnstile)
- Deploy process (Vercel git integration — push to `main` deploys automatically)
- Architecture diagram
