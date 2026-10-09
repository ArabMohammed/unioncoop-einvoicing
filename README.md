# Union Coop — E-Invoicing Supplier Data Update Form

A static web form (HTML/CSS/JS, no frameworks or build step) that collects supplier master data for UAE Peppol e-invoicing. It follows the *UC Customer/Supplier E-invoicing Data Update Form (v3)*.

## Files
```
index.html            page and form markup
assets/css/styles.css UC brand styling, responsive layout
assets/js/app.js      validation, conditional fields, draft autosave, submission
assets/img/logo.jpg   Union Coop logo (taken from the official form)
```

## Deploy
Copy the folder to any static web host (IIS, Apache, nginx, Azure Static Web Apps, and so on). Nothing needs to be built or installed.

## Connect a backend
In `assets/js/app.js`, set `CONFIG.endpoint` to the URL that will receive submissions:

```js
var CONFIG = { endpoint: 'https://your-server/api/einvoicing/suppliers', ... };
```

The form sends a `POST` with a JSON body grouped into `entity`, `legal_registration`, `registered_address`, `free_zone`, `implementation_phase`, `primary_contact` and `acknowledgements`. Return any `2xx` status. If the response is JSON with a `reference` field, that value is shown to the supplier in place of the reference generated in the browser.

While `endpoint` is empty, the form runs in **preview mode**: it validates normally but sends nothing, and the confirmation page says so.

**The server must validate the data again.** Browser-side checks only help the user and can be bypassed.

## Validation rules (summary)
| Field | Rule |
|---|---|
| TRN | 15 digits, starts with 1. Can be marked "not VAT-registered". |
| TIN | 10 digits, starts with 1. Must equal the first 10 digits of the TRN. Auto-filled from the TRN. Shown as Peppol ID `0235:<TIN>`. |
| Registration ID | Depends on type. **TL**: 2–30 alphanumeric characters. **EID**: `784-YYYY-NNNNNNN-C` with Luhn check digit. **PAS**: 6–12 alphanumeric characters. **CD**: free format. |
| Expiry date | Must be after today. At most 10 years ahead (100 years for CD). Shows a warning when the date is within 60 days. |
| Passport country | Required only when the type is PAS. ISO 3166 alpha-2 code. |
| Emirate | Required when the country is the UAE (codes AUH, DXB, SHJ, AJM, UAQ, RAK, FUJ). |
| P.O. Box | 1–7 digits in the UAE. 2–10 alphanumeric characters elsewhere. |
| Beneficiary ID | Required when the entity is a Free Zone entity. 10-digit TIN or 15-digit TRN. |
| Phone | Normalised to E.164. UAE mobile and landline numbers are checked against the national format. |
| Email | Syntax check. Converted to lowercase. |
