# Union Coop — E-Invoicing Supplier Data Update Form

A static web form (HTML/CSS/JS, no frameworks or build step) that collects supplier master data for UAE Peppol e-invoicing. It follows the *UC Customer/Supplier E-invoicing Data Update Form (v3)*.

## Files
```
public/                      ← the only folder that gets published
  index.html                 page and form markup
  404.html                   "page not found" page
  _headers                   Cloudflare headers: security policy and caching
  robots.txt                 keeps the form out of search engines
  assets/css/styles.css      UC brand styling, responsive layout
  assets/js/app.js           validation, conditional fields, draft autosave, submission
  assets/img/logo.jpg        Union Coop logo (taken from the official form)
wrangler.toml                Cloudflare settings: serve ./public as a static site
README.md, *.pdf             project documents; not published
```

## Publish on Cloudflare

The site is deployed as a **Cloudflare Worker with static assets**. `wrangler.toml` tells Cloudflare to serve the `public/` folder; there is no build step and no Worker script.

**Option A: connect the GitHub repository (recommended; every push redeploys)**
1. Push this repository to GitHub.
2. In the Cloudflare dashboard, go to **Workers & Pages → Create → Import a repository** and pick the repository.
3. Use these settings:
   - Build command: *(leave empty)*
   - Deploy command: **`npx wrangler deploy`** (the default)
   - Root directory: *(leave empty — the repository root, where `wrangler.toml` is)*
4. Deploy. The site goes live at `https://unioncoop-einvoicing.<your-subdomain>.workers.dev`. To use your own domain, add it under **Settings → Domains & Routes**, e.g. `einvoicing.unioncoop.ae`.

The Worker name in `wrangler.toml` (`unioncoop-einvoicing`) must match the Worker name in the dashboard. If you named it differently there, change `name` in `wrangler.toml` to match.

**Option B: deploy from the command line**
```bash
npx wrangler login
npx wrangler deploy              # reads wrangler.toml and uploads ./public
```

### When you change CSS, JS or the logo
Assets are cached by browsers for 7 days. After editing `styles.css`, `app.js` or `logo.jpg`, raise the `?v=1` number on their links in `index.html` (and `404.html`), e.g. to `?v=2`, so visitors download the new version straight away.

### If the submission endpoint is on another domain
`_headers` only lets the page send data to its own domain (`connect-src 'self'`). If `CONFIG.endpoint` points to another domain, add that domain to `connect-src` in `public/_headers`, or the browser will block the submission.

## Connect a backend
In `public/assets/js/app.js`, set `CONFIG.endpoint` to the URL that will receive submissions:

```js
var CONFIG = { endpoint: 'https://your-server/api/einvoicing/suppliers', ... };
```

The form sends a `POST` with a JSON body grouped into `entity`, `legal_registration`, `registered_address`, `free_zone`, `implementation_phase`, `primary_contact` and `acknowledgements`. Return any `2xx` status. If the response is JSON with a `reference` field, that value is shown to the supplier in place of the reference generated in the browser.

While `endpoint` is empty, the form runs in **preview mode**: it validates normally but sends nothing, and the confirmation page says so.

**The server must validate the data again.** Browser-side checks only help the user and can be bypassed.

## Authority ID formats
Each authority's ID format is defined in the `AUTHORITIES` table at the top of `public/assets/js/app.js`. Passport formats are in `PASSPORT_FORMATS` just below it. Each entry has a pattern, a plain-language description and an example. If an authority changes its numbering, edit its entry there; nothing else needs to change.

> These formats are defaults based on typical licence numbers. Please check them against real licences from your supplier base before going live. A rule that is too strict will block genuine suppliers.

## Validation rules (summary)
| Field | Rule |
|---|---|
| TRN | 15 digits, starts with 1. Can be marked "not VAT-registered". |
| TIN | 10 digits, starts with 1. Must equal the first 10 digits of the TRN. Auto-filled from the TRN. Shown as Peppol ID `0235:<TIN>`. |
| Issuing authority | Chosen from a list filtered by ID type: 7 mainland economic departments and 14 free zones for TL, ICP for EID (selected automatically), UAE Cabinet for CD (selected automatically). "Other" asks for the authority name. For PAS, the passport issuing country acts as the authority. |
| Registration ID | Locked until the issuing authority (or, for passports, the issuing country) is chosen. It is then checked against **that authority's own format**, e.g. Dubai DET 5–7 digits, ADDED `CN-1234567`, DMCC `DMCC-123456`, ICP `784-YYYY-NNNNNNN-C` with Luhn check digit, Cabinet `25/2023`. Passports are checked by country (India, Pakistan, Philippines, UK and US have their own rules; other countries use 6–9 characters). |
| Expiry date | Must be after today. At most 10 years ahead (100 years for CD). Shows a warning when the date is within 60 days. |
| Passport country | Required only when the type is PAS. ISO 3166 alpha-2 code. |
| Emirate | Required when the country is the UAE (codes AUH, DXB, SHJ, AJM, UAQ, RAK, FUJ). |
| P.O. Box | 1–7 digits in the UAE. 2–10 alphanumeric characters elsewhere. |
| Beneficiary ID | Required when the entity is a Free Zone entity. 10-digit TIN or 15-digit TRN. |
| Phone | Normalised to E.164. UAE mobile and landline numbers are checked against the national format. |
| Email | Syntax check. Converted to lowercase. |
