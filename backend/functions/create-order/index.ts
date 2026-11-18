// Supabase Edge Function: create-order
// Authenticated user asks to buy a product -> we price it SERVER-SIDE, create a Razorpay order,
// store a pending order row, and return what Checkout needs.
// The browser never decides the amount. UNTESTED until real Razorpay keys are configured.
//
// Required secrets:  RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET   (supabase secrets set ...)
// Optional:          ALLOWED_ORIGIN (default https://avinashgaur.github.io)
// Auto-provided by Supabase: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const DEFAULT_PRICING: Record<string, number> = {
  premiumKundali: 499, kundaliMatching: 299, detailedPdf: 199, membershipMonthly: 199, membershipYearly: 1499,
};
const ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "https://avinashgaur.github.io";
const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "login_required" }, 401);

  // who is calling? (validates the JWT with Supabase Auth)
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: uerr } = await userClient.auth.getUser();
  if (uerr || !user) return json({ error: "login_required" }, 401);

  let body: { product?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const product = String(body.product ?? "");
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_PRICING, product)) return json({ error: "unknown_product" }, 400);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // price comes from the admin-managed table, never from the request
  const { data: row } = await admin.from("jy_content").select("value").eq("key", "pricing").maybeSingle();
  const pricing = { ...DEFAULT_PRICING, ...((row?.value as Record<string, number>) ?? {}) };
  const rupees = Number(pricing[product]);
  if (!Number.isInteger(rupees) || rupees <= 0) return json({ error: "price_not_set" }, 400);
  const amountPaise = rupees * 100;

  const keyId = Deno.env.get("RAZORPAY_KEY_ID"), keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) return json({ error: "payments_not_configured" }, 503);

  const rzp = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(`${keyId}:${keySecret}`) },
    body: JSON.stringify({
      amount: amountPaise, currency: "INR",
      receipt: `ps_${Date.now().toString(36)}_${user.id.slice(0, 8)}`.slice(0, 40),
      notes: { user_id: user.id, product },
    }),
  });
  if (!rzp.ok) { console.error("razorpay order failed", rzp.status, await rzp.text()); return json({ error: "gateway_error" }, 502); }
  const order = await rzp.json();

  const { data: saved, error: ierr } = await admin.from("orders").insert({
    user_id: user.id, product, amount_paise: amountPaise, currency: "INR",
    razorpay_order_id: order.id, status: "created",
  }).select("id").single();
  if (ierr) { console.error("order insert failed", ierr); return json({ error: "db_error" }, 500); }

  return json({ order_id: order.id, amount: amountPaise, currency: "INR", key_id: keyId, order_row_id: saved.id, product });
});
