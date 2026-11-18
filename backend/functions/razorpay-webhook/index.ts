// Supabase Edge Function: razorpay-webhook
// Razorpay calls this server-to-server. This (not the browser) is what unlocks purchases.
// Deploy WITHOUT JWT verification:  supabase functions deploy razorpay-webhook --no-verify-jwt
// Required secrets: RAZORPAY_WEBHOOK_SECRET (the secret you type in Razorpay Dashboard -> Webhooks)
// UNTESTED until real Razorpay keys are configured.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const enc = new TextEncoder();
async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string): boolean {   // constant-time compare
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const DAYS: Record<string, number> = { membershipMonthly: 30, membershipYearly: 365 };

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) return new Response("not configured", { status: 503 });

  const raw = await req.text();                                   // signature is over the RAW body
  const given = req.headers.get("x-razorpay-signature") ?? "";
  if (!safeEqual(await hmacHex(secret, raw), given)) return new Response("bad signature", { status: 400 });

  let evt: any;
  try { evt = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }
  if (evt.event !== "payment.captured") return new Response("ignored", { status: 200 });

  const pay = evt?.payload?.payment?.entity;
  if (!pay?.order_id || !pay?.id) return new Response("no payment", { status: 200 });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: order } = await db.from("orders").select("*").eq("razorpay_order_id", pay.order_id).maybeSingle();
  if (!order) return new Response("unknown order", { status: 200 });   // not ours; don't make Razorpay retry
  if (order.status === "paid") return new Response("already processed", { status: 200 });   // idempotent
  // amount/currency must match what WE priced — never grant on a mismatch
  if (pay.amount !== order.amount_paise || pay.currency !== order.currency) {
    console.error("amount mismatch", pay.order_id, pay.amount, order.amount_paise);
    return new Response("amount mismatch", { status: 200 });
  }

  // claim the order exactly once (guards against concurrent webhook retries)
  const { data: claimed, error: cerr } = await db.from("orders")
    .update({ status: "paid", razorpay_payment_id: pay.id, paid_at: new Date().toISOString() })
    .eq("id", order.id).eq("status", "created").select("id");
  if (cerr) { console.error(cerr); return new Response("db error", { status: 500 }); }   // 500 => Razorpay retries
  if (!claimed || claimed.length === 0) return new Response("already processed", { status: 200 });
  // if granting fails below, release the claim so Razorpay's retry can grant it
  const unclaim = () => db.from("orders").update({ status: "created", paid_at: null }).eq("id", order.id);

  if (DAYS[order.product]) {
    const { data: m } = await db.from("memberships").select("valid_until,status").eq("user_id", order.user_id).maybeSingle();
    const base = m?.status === "active" && m.valid_until && new Date(m.valid_until) > new Date() ? new Date(m.valid_until) : new Date();
    const until = new Date(base.getTime() + DAYS[order.product] * 86400000);
    const { error } = await db.from("memberships").upsert({
      user_id: order.user_id, plan: order.product, status: "active",
      valid_until: until.toISOString(), razorpay_payment_id: pay.id, updated_at: new Date().toISOString(),
    });
    if (error) { console.error(error); await unclaim(); return new Response("db error", { status: 500 }); }
  } else {
    const { error } = await db.from("entitlements").upsert(
      { user_id: order.user_id, product: order.product, order_id: order.id }, { onConflict: "user_id,order_id", ignoreDuplicates: true });
    if (error) { console.error(error); await unclaim(); return new Response("db error", { status: 500 }); }
  }
  return new Response("ok", { status: 200 });
});
