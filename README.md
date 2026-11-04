# SubVault

Local-first free-trial and subscription safeguard for Chrome, Edge and Safari (Plasmo, Manifest V3, React 18, TypeScript, Tailwind, Dexie).

* **Checkout sheet** – on `/checkout`, `/subscribe`, `/signup`, `/billing`, `/trial` pages and `stripe.com`, `chargebee.com`, `paddle.com`, a floating Apple-HIG sheet offers 7-day / 14-day / custom trial reminders, saves the trial to IndexedDB and downloads a `Cancel_<Service>_Trial.ics` file.
* **Ghost SaaS monitor** – services you track with no visit for 30+ days get an orange toolbar badge and a "wasted per month" figure.
* **Cancellation deep links** – 140+ services in `src/db/cancellation-db.ts`.
* **Private** – no bank access, no network calls, no account. Visit times are recorded only for sites of subscriptions you added.

```bash
npm install
npm run dev          # load build/chrome-mv3-dev via chrome://extensions → Load unpacked
npm run build        # build/chrome-mv3-prod
npm run build:edge   # build/edge-mv3-prod
npm run build:safari # build/safari-mv3-prod → see safari/ConvertToSafari.md
```

Plasmo discovers content scripts in `src/contents/`; `src/contents/checkout-modal.tsx` is a thin entry that renders `src/content/checkout-modal.tsx`.

Cancellation URLs are best-effort and providers change them; each entry is marked `cancel` (opens the cancel flow) or `billing` (opens the page that holds the cancel button).
