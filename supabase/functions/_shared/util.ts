import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("FORM_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

export const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

export async function agentFrom(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const c = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data } = await c.auth.getUser();
  return data.user ?? null;
}

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function key() {
  const raw = unb64(Deno.env.get("DC_ENCRYPTION_KEY")!); // 32 random bytes, base64
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function encrypt(obj: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), new TextEncoder().encode(JSON.stringify(obj))));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return b64(out);
}
export async function decrypt(s: string) {
  const buf = unb64(s);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.slice(0, 12) }, await key(), buf.slice(12));
  return JSON.parse(new TextDecoder().decode(pt));
}
export async function sha256(s: string) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return Array.from(h).map((x) => x.toString(16).padStart(2, "0")).join("");
}
