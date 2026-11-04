// Public: client submits the form once. Body: { token, ssn?, bank_name?, routing?, account?, account_type?, full?: {...} }
import { admin, cors, encrypt, json, sha256 } from "../_shared/util.ts";

const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const b = await req.json().catch(() => ({}));
  if (!b.token) return json({ error: "invalid" }, 400);
  const db = admin();
  const hash = await sha256(b.token);
  const { data: r } = await db.from("data_collection_requests").select("id, form_type, status, expires_at, attempts").eq("token_hash", hash).maybeSingle();
  if (!r || r.status !== "pending" || new Date(r.expires_at) < new Date() || r.attempts >= 10) return json({ error: "expired_or_invalid" }, 410);
  await db.from("data_collection_requests").update({ attempts: r.attempts + 1 }).eq("id", r.id);

  const payload: Record<string, unknown> = {};
  let last4: string | null = null, bank: string | null = null;
  if (r.form_type === "ssn" || r.form_type === "full") {
    const ssn = digits(b.ssn);
    if (ssn.length !== 9) return json({ error: "SSN must be 9 digits" }, 422);
    payload.ssn = ssn; last4 = ssn.slice(-4);
  }
  if (r.form_type === "banking" || r.form_type === "full") {
    const routing = digits(b.routing), account = digits(b.account);
    if (routing.length !== 9) return json({ error: "Routing number must be 9 digits" }, 422);
    if (account.length < 4 || account.length > 17) return json({ error: "Check the account number" }, 422);
    payload.routing = routing; payload.account = account;
    payload.account_type = b.account_type === "savings" ? "savings" : "checking";
    bank = String(b.bank_name ?? "").slice(0, 80); payload.bank_name = bank;
  }
  if (r.form_type === "full") payload.full = b.full ?? {};

  const { error } = await db.from("data_collection_requests").update({
    payload_enc: await encrypt(payload), last4_ssn: last4, bank_name: bank,
    status: "completed", completed_at: new Date().toISOString(),
  }).eq("id", r.id).eq("status", "pending");
  if (error) return json({ error: "could not save" }, 500);
  return json({ ok: true });
});
