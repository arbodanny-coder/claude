// Public: client form asks what to show. Body: { token }
import { admin, cors, json, sha256 } from "../_shared/util.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const { token } = await req.json().catch(() => ({}));
  if (!token) return json({ error: "invalid" }, 400);
  const { data } = await admin().from("data_collection_requests")
    .select("form_type, client_name, status, expires_at").eq("token_hash", await sha256(token)).maybeSingle();
  if (!data || data.status !== "pending" || new Date(data.expires_at) < new Date()) return json({ error: "expired_or_invalid" }, 410);
  return json({ form_type: data.form_type, first_name: (data.client_name ?? "").split(" ")[0] });
});
