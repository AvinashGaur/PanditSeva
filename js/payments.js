/* ============================================================================
   payments.js — Razorpay checkout flow + Supabase client loader (PanditSeva.in)
   - NO secrets here. Only public values from JY.CONFIG (anon key, Razorpay key id).
   - The browser never decides price or unlocks anything: it asks the server
     (create-order Edge Function) to create the order, opens Checkout, and then
     POLLS the server until the webhook has marked the order 'paid'.
   - No mock/fake success path exists. If the backend/payment config is missing,
     the UI shows a WhatsApp contact state instead.
   ========================================================================== */
(function (global) {
  'use strict';

  var SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  var RAZORPAY_JS = 'https://checkout.razorpay.com/v1/checkout.js';

  // product id -> display info (ids must match JY.DEFAULT_PRICING keys and the server list)
  var PRODUCTS = {
    premiumKundali:    { hi: 'प्रीमियम कुंडली रिपोर्ट', type: 'once' },
    kundaliMatching:   { hi: 'संपूर्ण कुंडली मिलान रिपोर्ट', type: 'once' },
    detailedPdf:       { hi: 'विस्तृत PDF डाउनलोड', type: 'once' },
    membershipMonthly: { hi: 'प्रीमियम सदस्यता — मासिक', type: 'membership', days: 30 },
    membershipYearly:  { hi: 'प्रीमियम सदस्यता — वार्षिक', type: 'membership', days: 365 }
  };

  /* ---------- pure helpers (unit-tested in node) ---------- */
  function isProduct(id) { return Object.prototype.hasOwnProperty.call(PRODUCTS, id); }
  function rupeesToPaise(r) {
    var n = Number(r);
    if (!isFinite(n) || n <= 0) return null;
    return Math.round(n * 100);
  }
  /** amount in whole rupees for a product from a pricing object, or null if unset/invalid */
  function priceFor(pricing, id) {
    if (!isProduct(id) || !pricing) return null;
    var n = Number(pricing[id]);
    return (isFinite(n) && n > 0 && Math.floor(n) === n) ? n : null;
  }
  function formatINR(n) {
    if (n == null || isNaN(n)) return '—';
    return '₹' + Number(n).toLocaleString('en-IN');
  }
  /** can we even attempt online payment from this page? */
  function paymentsConfigured(cfg) {
    cfg = cfg || {};
    return !!(cfg.supabaseUrl && cfg.supabaseAnonKey && cfg.razorpayKeyId && cfg.paymentEndpoint);
  }
  function whatsappLink(cfg, text) {
    return 'https://wa.me/' + ((cfg && cfg.whatsapp) || '917737782519') + '?text=' + encodeURIComponent(text || '');
  }
  /** a membership row counts as active only if status active and not expired */
  function membershipActive(m, nowMs) {
    if (!m || m.status !== 'active') return false;
    if (!m.valid_until) return true;
    return new Date(m.valid_until).getTime() > (nowMs == null ? Date.now() : nowMs);
  }

  /* ---------- loaders ---------- */
  var _scripts = {};
  function loadScript(src) {
    if (_scripts[src]) return _scripts[src];
    _scripts[src] = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = res; s.onerror = function () { delete _scripts[src]; rej(new Error('script load failed: ' + src)); };
      document.head.appendChild(s);
    });
    return _scripts[src];
  }
  var _client = null;
  /** Supabase client (only when backend configured). Resolves null if not configured. */
  function getClient() {
    var cfg = global.JY && global.JY.CONFIG;
    if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return Promise.resolve(null);
    if (_client) return Promise.resolve(_client);
    return loadScript(SUPABASE_JS).then(function () {
      _client = global.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      return _client;
    });
  }

  /* ---------- server state ---------- */
  function fetchAccount(client, userId) {
    return Promise.all([
      client.from('memberships').select('*').eq('user_id', userId).maybeSingle(),
      client.from('entitlements').select('product,granted_at').eq('user_id', userId).order('granted_at', { ascending: false })
    ]).then(function (r) {
      return { membership: r[0].data || null, entitlements: r[1].data || [] };
    });
  }
  /** poll until the order row (own-select RLS) shows status 'paid'. Resolves true/false. */
  function pollOrderPaid(client, razorpayOrderId, tries, everyMs, onTick) {
    tries = tries || 24; everyMs = everyMs || 2500;
    return new Promise(function (resolve) {
      var n = 0;
      (function tick() {
        client.from('orders').select('status').eq('razorpay_order_id', razorpayOrderId).maybeSingle().then(function (r) {
          if (r.data && r.data.status === 'paid') return resolve(true);
          if (++n >= tries) return resolve(false);
          if (onTick) onTick(n);
          setTimeout(tick, everyMs);
        }, function () { if (++n >= tries) resolve(false); else setTimeout(tick, everyMs); });
      })();
    });
  }

  /**
   * Start a purchase. handlers: { onStatus(msg), onPaid(), onTimeout(paymentId), onError(msg) }
   * Never reports success unless the server confirms.
   */
  function buy(productId, handlers) {
    handlers = handlers || {};
    var cfg = global.JY.CONFIG, say = handlers.onStatus || function () {};
    if (!isProduct(productId)) return handlers.onError && handlers.onError('अमान्य प्रोडक्ट');
    if (!paymentsConfigured(cfg)) return handlers.onError && handlers.onError('ऑनलाइन भुगतान अभी चालू नहीं है।');
    var client;
    getClient().then(function (c) {
      client = c;
      return client.auth.getSession();
    }).then(function (r) {
      var session = r.data && r.data.session;
      if (!session) { handlers.onError && handlers.onError('पहले लॉगिन करें।'); return null; }
      say('ऑर्डर बन रहा है…');
      return fetch(cfg.paymentEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token, apikey: cfg.supabaseAnonKey },
        body: JSON.stringify({ product: productId })
      }).then(function (resp) {
        return resp.json().then(function (j) { if (!resp.ok) throw new Error(j && j.error || ('http ' + resp.status)); return j; });
      }).then(function (order) {
        return loadScript(RAZORPAY_JS).then(function () { return { order: order, session: session }; });
      });
    }).then(function (ctx) {
      if (!ctx) return;
      var order = ctx.order, done = false;
      var rzp = new global.Razorpay({
        key: order.key_id || cfg.razorpayKeyId,
        amount: order.amount, currency: order.currency || 'INR',
        name: 'PanditSeva.in', description: PRODUCTS[productId].hi, order_id: order.order_id,
        prefill: { email: ctx.session.user && ctx.session.user.email || '' },
        theme: { color: '#A8321B' },
        handler: function (resp) {
          // The handler firing is NOT proof of payment. Wait for the webhook-confirmed server state.
          done = true; say('भुगतान की पुष्टि हो रही है… कृपया पेज बंद न करें।');
          pollOrderPaid(client, order.order_id, 24, 2500).then(function (ok) {
            if (ok) handlers.onPaid && handlers.onPaid(); else handlers.onTimeout && handlers.onTimeout(resp.razorpay_payment_id);
          });
        },
        modal: { ondismiss: function () { if (!done) say('भुगतान रद्द/अधूरा रहा।'); } }
      });
      rzp.on('payment.failed', function (e) { handlers.onError && handlers.onError('भुगतान विफल: ' + ((e.error && e.error.description) || '')); });
      rzp.open();
    }).catch(function (e) {
      var m = String(e && e.message || e);
      var map = { login_required: 'पहले लॉगिन करें।', payments_not_configured: 'भुगतान अभी चालू नहीं है।', price_not_set: 'इस प्रोडक्ट की कीमत सेट नहीं है।', gateway_error: 'पेमेंट गेटवे त्रुटि, कुछ देर बाद प्रयास करें।' };
      handlers.onError && handlers.onError(map[m] || ('त्रुटि: ' + m));
    });
  }

  var api = {
    PRODUCTS: PRODUCTS, isProduct: isProduct, rupeesToPaise: rupeesToPaise, priceFor: priceFor, formatINR: formatINR,
    paymentsConfigured: paymentsConfigured, whatsappLink: whatsappLink, membershipActive: membershipActive,
    getClient: getClient, fetchAccount: fetchAccount, pollOrderPaid: pollOrderPaid, buy: buy, loadScript: loadScript
  };
  global.JYPay = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
