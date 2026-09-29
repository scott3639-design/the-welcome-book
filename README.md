# The Welcome Book — initial private foundation

Single-page editable static website. `dist/index.html`, `dist/styles.css` and `dist/app.js` are deployable source. `build_page.py` generates the HTML; update that generator when changing page copy. All photographs and the approved logo are local assets.

## Scope
Seven standard guest-guide sections; Country, Coast and Modern illustrative template previews; style selection populates the enquiry form and scrolls to it. No actual reusable customer guide system, payments, accounts, CMS or customer data storage.

£350 one-off includes chosen-template setup, supplied-content personalisation, standard sections, mobile-first implementation, QR code, first-year hosting and reasonable pre-launch corrections. After year one: self-host on suitable infrastructure or optional £35/year hosting. Later edits charged separately; no monthly subscription.

## Enquiries: secure integration prepared; not activated
The private static Preview remains non-delivering and retains its notice. Production form submissions POST JSON to the same-origin `/api/enquiry` endpoint. `server/enquiry.mjs` is a server-only Cloudflare Worker module using Resend's HTTPS email API; it is not copied to either public asset directory. The current Sites static hosting manifest remains unchanged. Static hosting alone cannot run the handler.

The private recipient is configured only in the server module: scott.3639business@gmail.com. Notifications contain the six existing fields and source, with the property name in the subject. The verified sender is supplied by deployment configuration; the validated customer email is Reply-To, never From. Plain text prevents execution of submitted markup. No form content is logged or saved by this application; the mail provider and recipient mailbox necessarily process the enquiry. No mailing list, tracking or analytics is added.

Server checks enforce field types, required trimmed name/email/message, email shape, header/control-character restrictions, allowed styles and field lengths. Requests are limited to 32 KiB, POST JSON, and the exact production origin. A hidden, keyboard-excluded honeypot and required rate-limit binding provide lightweight abuse protection. The example limit is five requests per IP per minute per Cloudflare location (approximate, not a global quota; shared IPs can share the limit). Missing configuration or a failed limiter fails closed. No enquiry is reported successful unless Resend returns a successful response and message ID; this means provider acceptance, not guaranteed inbox delivery. Timeout/rejection shows a generic inline error and preserves the fields. Identical retries use a provider idempotency key for 24 hours to reduce duplicate mail. No automatic retries are made.

### Required activation steps — not performed
1. Supply a real Resend account/API key and an authenticated sender domain/address. No account or credentials have been created. Sender authentication/DNS must be handled separately with approval.
2. On a compatible server/Cloudflare Worker hosting deployment, securely set `RESEND_API_KEY` (secret) and `ENQUIRY_FROM` (a real verified bare email address). Do not put values in source, public assets or build-time JavaScript. Set `ENQUIRIES_ENABLED=true` only when ready for the authorised live test.
3. Bind `ENQUIRY_RATE_LIMITER` and `ASSETS`. `server/production-worker.example.jsonc` is an inactive deployment template, not the current Sites configuration. Choose an unused rate-limit namespace in the eventual account. The Worker must execute before static assets at `/api/enquiry`; assets must be the generated `production/` directory. The handler trusts `CF-Connecting-IP` only in Cloudflare's runtime. Another host requires a supported adapter and trustworthy rate limiter, not an unprotected static deployment.
4. Build production, deploy only with separate authorisation, then send ONE clearly labelled `TEST — Welcome Book Form` enquiry and verify receipt and Reply-To in the destination inbox. No real email has been sent during preparation. Review provider delivery failures before launch. Do not activate the production handler on the private Preview.

The telephone number 07887 505778 was supplied by the owner. No public email address or physical business address has been added. Only the production form notice changes to explain use of enquiry details; the form layout and labels remain unchanged. Required controls use native validation and inline status messages are focusable and announced. JavaScript is required for inline submission; no mailto fallback is used.

Run `node --test tests/*.test.mjs` for isolated server/client tests (mock delivery only), plus `python3 scripts/check_build.py` and `node --check dist/app.js`. No additional application dependencies are required. Never serve the repository root: only `dist/` or `production/` assets are public. `.env` and local Worker secrets files are ignored by Git.

References: https://resend.com/docs/api-reference/emails/send-email and https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

## Privacy / publication
Owner-private initial review only. No domain connected. The page includes noindex,nofollow for the private foundation; remove only when approved for public launch. One intended external link: Signature Website Designs credit.

## Assets
Original supplied logo used unchanged. Hospitality photographs generated with the built-in image tool for illustrative use, not presented as real client properties. Triptych displayed as three CSS image crops.

## Editing / responsive
Breakpoints at 1100, 800 and 520px. Reduced-motion support, native labelled controls, visible keyboard focus, semantic sections, skip link. No JavaScript package dependencies or analytics. Lora is used for display/headings, Inter for body/interface text, and Caveat only for the handwritten product annotations. These webfonts are loaded through Google Fonts, with fallback font stacks; font loading requires access to that external service. Source is saved in the Site repository.


## Production/search build (not deployed)

Run `python3 build_page.py` for the protected private-preview output in `dist/`.
Run `python3 build_page.py --production` for a separate public-ready output in `production/`.
Run `python3 scripts/check_build.py` to check both modes, metadata, assets, schema, labels and indexing separation (standard-library Python only).
Deploy only the contents of `production/` to the intended public host; do not deploy the preview `dist/` directory publicly. No Node packages or Python third-party packages are required by the build. The production folder is reproducible generated output and is excluded from Git.

Production uses the canonical homepage `https://thewelcomebook.co.uk/`, index/follow metadata, a permissive robots.txt, a one-URL sitemap.xml, Open Graph/X metadata and the existing Service JSON-LD with canonical service/offer URLs. Preview retains noindex/nofollow and a disallow-all robots.txt; the existing hosting access protection is unchanged. robots.txt itself is not an access-control mechanism.

Social sharing uses `dist/og.png` (1200 × 630), which is metadata-only and never displayed in the page. `favicon.ico`, `assets/favicon-96.png` and `assets/apple-touch-icon.png` are size-specific derivatives of the existing house/open-door emblem; the approved full page logo is unchanged. Lora, Inter and Caveat loading remains unchanged, including Google Fonts preconnects, display=swap and fallback stacks.

Before launch: activate and test the prepared secure enquiry handler using the steps above, build a real demonstration Welcome Book before replacing its demonstration QR, connect the production domain/HTTPS to the correct output, set canonical HTTPS/apex redirects, verify there are no hosting-level noindex headers or access restrictions, verify the domain in Google Search Console, and submit the sitemap. This source preparation neither deploys the site nor connects DNS. No guarantees of indexing, rankings or enhanced search results are implied.

Social asset provenance: `dist/og.png` is a dedicated built-in image-generation result using the approved logo and arrival photograph as references. Brief: a warm cream logo panel beside the welcoming cottage/open green door and WELCOME mat, restrained gold divider, no additional promotional text. Original logo and webpage imagery are unchanged.
