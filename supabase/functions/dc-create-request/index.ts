// Agent-only: creates a one-time link for a client. Body: { form_type, client_name, client_contact?, channel?, lead_id? }
import { admin, agentFrom, cors, json, sha256 } from "../_shared/util.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const user = await agentFrom(req);
  if (!user) return json({ error: "unauthorized" }, 401);
  const b = await req.json().catch(() => ({}));
  if (!["ssn", "banking", "full"].includes(b.form_type)) return json({ error: "bad form_type" }, 400);

  const token = Array.from(crypto.getRandomValues(new Uint8Array(32))).map((x) => x.toString(16).padStart(2, "0")).join("");
  const { data, error } = await admin().from("data_collection_requests").insert({
    token_hash: await sha256(token), agent_id: user.id, lead_id: b.lead_id ?? null,
    client_name: b.client_name ?? null, client_contact: b.client_contact ?? null,
    channel: b.channel ?? "copy", form_type: b.form_type,
  }).select("id, expires_at").single();
  if (error) return json({ error: "could not create" }, 500);

  const link = `${Deno.env.get("FORM_BASE_URL")}?t=${token}`;
  // SMS/email delivery is intentionally not wired yet (needs Twilio/Resend keys). Agent copies the link for now.
  return json({ id: data.id, link, expires_at: data.expires_at });
});
