# AFG CRM – secure client data collection

Agents create a one-time link (SSN / banking / full) from a lead; the client fills `form/index.html`; data is AES-GCM encrypted in edge functions.

Setup (not yet deployed):
1. Apply `supabase/migrations/*` to the AFG CRM project.
2. Secrets: `DC_ENCRYPTION_KEY` (base64 of 32 random bytes: `openssl rand -base64 32`), `FORM_BASE_URL` (where `form/` is hosted), optional `FORM_ORIGIN`.
3. Deploy functions: dc-create-request, dc-get-request, dc-submit, dc-reveal.
4. Host `form/` (e.g. Netlify) and paste the publishable (anon) key into `form/index.html`.
5. Leads screen: add a "Request client info" button calling `dc-create-request`, and a masked status/reveal view using `dc-reveal`.
Delivery by SMS/email is not wired yet (needs Twilio/Resend); for now the agent copies the link.
