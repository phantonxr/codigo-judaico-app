# Privacy Readiness Follow-ups

Status date: 2026-05-07

This file tracks the privacy and data-protection work that still needs product,
legal, security, or operations follow-up before the site should be described as
fully ready for LGPD, GDPR, Canada/PIPEDA/Quebec, and US state privacy laws.

## Already Implemented

- Versioned legal acceptance exists for Terms, Privacy Policy, and Disclaimer.
- Checkout blocks payment session creation until the current legal documents are accepted.
- Logged-in users are gated when a new active legal version is published.
- Cookie/privacy banner supports essential, preferences, and marketing/attribution choices.
- Global Privacy Control disables marketing consent in the browser.
- UTM persistence and UTMfy tracking are gated by marketing consent.
- Authenticated users can export a JSON copy of platform-held personal data.
- Authenticated users can revoke marketing attribution from the privacy area.
- Self-service account deletion anonymizes the account and removes app-level personal state.
- Public privacy page discloses UTMfy, OpenAI, storage, rights, transfers, and multi-jurisdiction scope.

## Remaining Before Claiming Compliance

1. Legal review
   - Have a qualified privacy lawyer review the public policy, versioned legal seeds, Terms, Disclaimer, and checkout copy.
   - Confirm the controller/business identity, processor/operator roles, DPO/contact details, and jurisdiction-specific notices.

2. Data processing agreements
   - Confirm DPAs/subprocessor terms for Stripe, Resend, OpenAI, UTMfy, hosting, database, object/media storage, e-mail, and any WhatsApp/Evolution provider.
   - Record international transfer safeguards for each provider.

3. Retention and deletion operations
   - Add scheduled cleanup for expired sessions, password reset tokens, stale checkout records, old logs, and account data past retention.
   - Define backup retention and backup deletion/anonymization handling.
   - Add an internal retention matrix by data category and legal basis.

4. Privacy request workflow
   - Add an internal request register with request type, requester, verification method, deadline, resolution, and evidence.
   - Add admin tooling for manual access/correction/deletion cases that cannot be fully automated.
   - Define SLA rules for LGPD, GDPR, PIPEDA/Canada, Quebec, and US state requests.

5. Security hardening
   - Verify production TLS for both apex and www domains.
   - Verify production HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy headers after deploy.
   - Consider moving auth from localStorage bearer tokens to Secure, HttpOnly, SameSite cookies or add compensating XSS controls.
   - Rotate any credentials that were ever committed or shared outside the secret manager.

6. Children and sensitive-data posture
   - Decide whether minors are allowed. If not, add age gate/copy and support flow.
   - Add warnings around financial, religious, health, family, and other sensitive inputs in AI prompts.
   - Confirm COPPA/child privacy treatment if under-13 users may access the service.

7. AI and vendor logging
   - Confirm OpenAI data-use settings, retention terms, and logging posture for prompts/responses.
   - Redact or minimize provider error bodies in application logs when they may include personal data.
   - Document AI subprocessors and user-facing AI limitations.

8. California and opt-out specifics
   - Confirm whether CCPA/CPRA thresholds apply.
   - If applicable, add a dedicated California notice with categories collected, sources, purposes, retention, recipients, sale/share status, sensitive personal information treatment, non-discrimination, authorized agents, and GPC handling.

9. Canada and Quebec specifics
   - Confirm PIPEDA and provincial applicability.
   - For Quebec Law 25, add privacy governance documentation, incident register, privacy impact assessment process, default privacy settings review, and profiling/identification/location disclosure if applicable.

10. Evidence and auditability
   - Keep deploy evidence for headers/TLS scans.
   - Keep evidence for legal acceptance versions and privacy preference changes.
   - Keep incident response and breach notification playbooks outside the public app.

## Notes

- This file is an engineering tracker, not legal advice.
- Product can ship incremental controls, but public compliance claims should wait until the remaining legal, vendor, deploy, and operational items above are closed.
