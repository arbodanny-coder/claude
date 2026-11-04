// Agent-only: decrypt a completed request they own; every reveal is logged. Body: { request_id }
import { admin, agentFrom, cors, decrypt, json } from "../_shared/util.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const user = await agentFrom(req);
  if (!user) return json({ error: "unauthorized" }, 401);
  const { request_id } = await req.json().catch(() => ({}));
  const db = admin();
  const { data: r } = await db.from("data_collection_requests").select("id, agent_id, status, payload_enc").eq("id", request_id).maybeSingle();
  if (!r || r.agent_id !== user.id || r.status !== "completed" || !r.payload_enc) return json({ error: "not found" }, 404);
  await db.from("data_collection_reveals").insert({ request_id: r.id, agent_id: user.id });
  return json(await decrypt(r.payload_enc));
});
