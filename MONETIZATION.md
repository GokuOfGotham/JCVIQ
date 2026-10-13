# Monetizing JCVIQ

Notes on turning JCVIQ into a paid product. General information, not legal or tax advice.

## Do I need a business?

- **Free or donations:** no. Income is still taxable as self-employment income in most places.
- **Charging money:** a sole proprietorship works to start. An LLC (or local equivalent) is worth forming early for:
  - Liability protection
  - Payment processors (Stripe, Paddle, Lemon Squeezy) and a separate bank account
  - Cleaner bookkeeping and taxes
- **Sales tax / VAT:** selling software to EU/UK customers triggers VAT. A merchant of record (Paddle, Lemon Squeezy) handles this.
- Check local rules or talk to an accountant.

## What blocks charging today

1. **BYO Gemini key doesn't scale.** A paid product needs a small backend that holds the key, checks subscriptions, and rate-limits usage.
2. **Distribution.** "Load unpacked" won't reach customers. Publish on the Chrome Web Store ($5 one-time fee, privacy policy required).
3. **Transcript fetching** (`fetchTranscript` in `background.js`) uses YouTube's unofficial `timedtext` endpoint. It can break and is a YouTube ToS gray area.
4. **Studio automation** (one-click apply, mass update) depends on YouTube's DOM and will need ongoing maintenance.
5. **Per-user cost.** `gemini-2.5-flash` with search grounding and images is cheap but not free. Cap heavy mass-update users.
6. **Housekeeping.**
   - Add a real LICENSE file (the README says "as-is for personal and commercial use").
   - Add a privacy policy and terms. A backend ends the "no backend, no telemetry" claim.
   - Don't imply affiliation with YouTube or Google.

## Revenue models

- **Freemium subscription:** a few free optimizations per month; paid unlocks more usage, mass update, and history sync. Typically $5-15/month.
- **Keep BYO key, charge a license:** simple, no server cost, lower revenue, easy to pirate.
- **Lifetime deals** for early users to validate demand.
- **Agency tier** for multi-channel managers.

## Suggested path

1. Get 5-10 other creators (ideally VidIQ users) to try it.
2. Ask what they'd pay before building billing.
3. If there's interest: build the backend and billing, form the LLC, submit to the Chrome Web Store.
