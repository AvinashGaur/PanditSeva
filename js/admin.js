/* ============================================================================
   admin.js — PanditSeva admin dashboard
   Auth: Supabase Auth (email+password). Role is read from public.profiles; the browser
   check is UX only — Row Level Security on the server is what actually protects writes.
   No hard-coded credentials, no fake login. Without a backend there is only a clearly
   labelled "local preview" mode that saves to THIS browser only.
   Everything admin-typed is stored as plain text; every page that shows it must escape
   it (JY.esc / textContent). This file escapes on render too.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ===================== pure helpers (unit-tested in node) ===================== */
  var DEFAULT_PRICING = { currency: 'INR', premiumKundali: 499, kundaliMatching: 299, detailedPdf: 199, membershipMonthly: 199, membershipYearly: 1499 };
  var PRICE_FIELDS = [
    ['premiumKundali', 'प्रीमियम कुंडली रिपोर्ट'], ['kundaliMatching', 'संपूर्ण कुंडली मिलान'], ['detailedPdf', 'विस्तृत PDF'],
    ['membershipMonthly', 'मासिक सदस्यता'], ['membershipYearly', 'वार्षिक सदस्यता']
  ];
  var RASHI = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'];
  var GENDERS = ['boy', 'girl', 'unisex'];
  var MAX_PRICE = 100000;

  function cleanText(s, max) {
    s = String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
    return max ? s.slice(0, max) : s;
  }
  function isISODate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
    var p = s.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return d.getUTCFullYear() === p[0] && d.getUTCMonth() === p[1] - 1 && d.getUTCDate() === p[2];
  }
  function keyPanchang(date) { return isISODate(date) ? 'panchang_note_' + date : null; }
  function keyFaladesh(date) { return isISODate(date) ? 'faladesh_override_' + date : null; }
  function keyRashifal(date, idx) {
    idx = Number(idx);
    return (isISODate(date) && Number.isInteger(idx) && idx >= 0 && idx <= 11) ? 'rashifal_override_' + date + '_' + idx : null;
  }
  function mergePricing(defaults, stored) {
    var out = Object.assign({}, defaults);
    if (stored && typeof stored === 'object') Object.keys(defaults).forEach(function (k) {
      if (k !== 'currency' && Number.isInteger(stored[k]) && stored[k] > 0 && stored[k] <= MAX_PRICE) out[k] = stored[k];
    });
    out.currency = 'INR';
    return out;
  }
  /** raw: {field: stringOrNumber}. Only whole rupees, 1..100000. */
  function validatePricing(raw) {
    var errors = [], value = { currency: 'INR' };
    PRICE_FIELDS.forEach(function (f) {
      var s = String(raw[f[0]] == null ? '' : raw[f[0]]).trim();
      if (!/^\d+$/.test(s)) { errors.push(f[1] + ': केवल पूर्ण संख्या (₹) लिखें'); return; }
      var n = parseInt(s, 10);
      if (n < 1 || n > MAX_PRICE) { errors.push(f[1] + ': 1 से ' + MAX_PRICE + ' के बीच होना चाहिए'); return; }
      value[f[0]] = n;
    });
    return { ok: errors.length === 0, value: value, errors: errors };
  }
  function validateHttps(u) {
    u = cleanText(u, 500); if (!u) return { ok: true, value: '' };
    try { var x = new URL(u); return x.protocol === 'https:' ? { ok: true, value: x.href } : { ok: false, value: '' }; } catch (e) { return { ok: false, value: '' }; }
  }
  function validatePhone(p) {
    p = cleanText(p, 20); if (!p) return { ok: true, value: '' };
    var d = p.replace(/[\s\-+()]/g, '');
    return /^\d{10,15}$/.test(d) ? { ok: true, value: d } : { ok: false, value: '' };
  }
  function validateBabyName(n) {
    var errors = [], v = {
      hi: cleanText(n.hi, 60), en: cleanText(n.en, 60), gender: cleanText(n.gender, 10), meaning: cleanText(n.meaning, 300),
      origin: cleanText(n.origin, 60), rashi: cleanText(n.rashi, 20), nakshatra: cleanText(n.nakshatra, 40), syllable: cleanText(n.syllable, 8)
    };
    if (!v.hi) errors.push('हिंदी नाम ज़रूरी है');
    if (!v.en || !/^[A-Za-z][A-Za-z .'-]*$/.test(v.en)) errors.push('English नाम (अंग्रेज़ी अक्षरों में) ज़रूरी है');
    if (GENDERS.indexOf(v.gender) === -1) errors.push('लिंग चुनें');
    if (!v.meaning) errors.push('अर्थ ज़रूरी है');
    if (v.rashi && RASHI.indexOf(v.rashi) === -1) errors.push('अमान्य राशि');
    return { ok: errors.length === 0, value: v, errors: errors };
  }
  function validateSiteContent(o) {
    var errors = [], ph = validatePhone(o.phone), wa = validatePhone(o.whatsapp);
    if (!ph.ok) errors.push('फ़ोन नंबर में 10–15 अंक होने चाहिए');
    if (!wa.ok) errors.push('WhatsApp नंबर में 10–15 अंक (देश कोड सहित) होने चाहिए');
    return { ok: !errors.length, errors: errors, value: { banner_text: cleanText(o.banner_text, 300), phone: ph.value, whatsapp: wa.value } };
  }
  function validateAstrologer(o) {
    var errors = [], ph = validatePhone(o.phone), photo = validateHttps(o.photo_url);
    var exp = o.experience_years === '' || o.experience_years == null ? null : Number(o.experience_years);
    if (!cleanText(o.name, 80)) errors.push('नाम ज़रूरी है');
    if (!ph.ok) errors.push('फ़ोन नंबर अमान्य');
    if (!photo.ok) errors.push('फ़ोटो URL केवल https:// हो सकता है');
    if (exp != null && (!Number.isInteger(exp) || exp < 0 || exp > 80)) errors.push('अनुभव 0–80 वर्ष की पूर्ण संख्या हो');
    return { ok: !errors.length, errors: errors, value: {
      name: cleanText(o.name, 80), title: cleanText(o.title, 80), experience_years: exp, city: cleanText(o.city, 60),
      bio: cleanText(o.bio, 1000), phone: ph.value, photo_url: photo.value, credentials: cleanText(o.credentials, 300) } };
  }
  function validateGrant(o) {
    var errors = [], days = Number(o.days);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanText(o.email, 200))) errors.push('सही ईमेल लिखें');
    if (['membershipMonthly', 'membershipYearly', 'manual'].indexOf(o.plan) === -1) errors.push('अमान्य प्लान');
    if (!Number.isInteger(days) || days < 1 || days > 3650) errors.push('दिन 1–3650 के बीच हों');
    return { ok: !errors.length, errors: errors, value: { email: cleanText(o.email, 200).toLowerCase(), plan: o.plan, days: days } };
  }
  function pdfError(file) {
    if (!file) return 'फ़ाइल चुनें';
    if (file.type !== 'application/pdf') return 'केवल PDF फ़ाइल अपलोड करें';
    if (file.size > 10 * 1024 * 1024) return 'PDF 10 MB से छोटी होनी चाहिए';
    return null;
  }
  var SECTIONS = [
    { id: 'dashboard', label: 'डैशबोर्ड', icon: 'fa-gauge', roles: ['admin', 'astrologer'] },
    { id: 'panchang', label: 'पंचांग सामग्री', icon: 'fa-calendar-day', roles: ['admin'] },
    { id: 'faladesh', label: 'दैनिक फलादेश', icon: 'fa-sun', roles: ['admin'] },
    { id: 'rashifal', label: 'राशिफल', icon: 'fa-star', roles: ['admin'] },
    { id: 'babynames', label: 'बच्चों के नाम', icon: 'fa-baby', roles: ['admin'] },
    { id: 'pricing', label: 'प्रीमियम मूल्य', icon: 'fa-indian-rupee-sign', roles: ['admin'] },
    { id: 'users', label: 'यूज़र्स', icon: 'fa-users', roles: ['admin'] },
    { id: 'reports', label: 'रिपोर्ट व PDF अप्रूवल', icon: 'fa-scroll', roles: ['admin', 'astrologer'] },
    { id: 'members', label: 'सदस्यता प्रबंधन', icon: 'fa-crown', roles: ['admin'] },
    { id: 'site', label: 'वेबसाइट सामग्री', icon: 'fa-pen-to-square', roles: ['admin'] },
    { id: 'astrologer', label: 'ज्योतिषी प्रोफ़ाइल', icon: 'fa-user-tie', roles: ['admin'] }
  ];
  function sectionsFor(role) { return SECTIONS.filter(function (s) { return s.roles.indexOf(role) !== -1; }); }

  var helpers = {
    DEFAULT_PRICING: DEFAULT_PRICING, PRICE_FIELDS: PRICE_FIELDS, RASHI: RASHI, SECTIONS: SECTIONS,
    cleanText: cleanText, isISODate: isISODate, keyPanchang: keyPanchang, keyFaladesh: keyFaladesh, keyRashifal: keyRashifal,
    mergePricing: mergePricing, validatePricing: validatePricing, validateHttps: validateHttps, validatePhone: validatePhone,
    validateBabyName: validateBabyName, validateSiteContent: validateSiteContent, validateAstrologer: validateAstrologer,
    validateGrant: validateGrant, pdfError: pdfError, sectionsFor: sectionsFor
  };
  global.JYAdminHelpers = helpers;
  if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
  if (typeof document === 'undefined') return;

  /* ===================== UI ===================== */
  var JY = global.JY, esc = JY.esc;
  var root, client = null, mode = 'locked', role = null, me = null, current = 'dashboard';

  function $(id) { return document.getElementById(id); }
  function note(text, cls) { return '<div class="jy-note ' + (cls || '') + '">' + esc(text) + '</div>'; }
  function errList(errs) { return '<div class="jy-note warn"><ul style="margin-left:18px">' + errs.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul></div>'; }
  function setMsg(html) { var m = $('msg'); if (m) m.innerHTML = html || ''; }
  function fail(e) { setMsg(note('त्रुटि: ' + (e && e.message ? e.message : e), 'warn')); }

  /* ---- data layer: Supabase when configured, else this-browser store ---- */
  var db = {
    get: function (key, dflt) {
      if (mode === 'admin') return client.from('jy_content').select('value').eq('key', key).maybeSingle().then(function (r) { if (r.error) throw r.error; return r.data ? r.data.value : dflt; });
      return JY.store.get(key, dflt);
    },
    set: function (key, value) {
      if (mode === 'admin') return client.from('jy_content').upsert({ key: key, value: value }).then(function (r) { if (r.error) throw r.error; return true; });
      return JY.store.set(key, value);
    },
    del: function (key) {
      if (mode === 'admin') return client.from('jy_content').delete().eq('key', key).then(function (r) { if (r.error) throw r.error; return true; });
      try { localStorage.removeItem('jy_c_' + key); } catch (e) { /* ignore */ }
      return Promise.resolve(true);
    },
    list: function (prefix) {
      if (mode === 'admin') return client.from('jy_content').select('key,value').like('key', prefix + '%').order('key', { ascending: false }).limit(60).then(function (r) { if (r.error) throw r.error; return r.data || []; });
      var out = [];
      try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf('jy_c_' + prefix) === 0) out.push({ key: k.slice(5), value: JSON.parse(localStorage.getItem(k)) }); } } catch (e) { /* ignore */ }
      out.sort(function (a, b) { return a.key < b.key ? 1 : -1; });
      return Promise.resolve(out.slice(0, 60));
    }
  };
  function needBackend() { return note('यह सेक्शन केवल बैकएंड (Supabase) जुड़ने पर काम करता है। backend/README.md देखें।', 'info'); }

  /* ---- shell ---- */
  function shell() {
    var nav = sectionsFor(role).map(function (s) { return '<button data-sec="' + s.id + '"' + (s.id === current ? ' class="on"' : '') + '><i class="fas ' + s.icon + '"></i> ' + esc(s.label) + '</button>'; }).join('');
    root.innerHTML = '<div class="adm"><aside class="adm-side"><div class="adm-who">' + (mode === 'local' ? 'लोकल प्रीव्यू' : esc(me && me.email || '') + '<br><b>' + esc(role) + '</b>') + '</div>' + nav +
      '<button data-act="logout"><i class="fas fa-right-from-bracket"></i> ' + (mode === 'local' ? 'बाहर निकलें' : 'लॉगआउट') + '</button></aside>' +
      '<main class="adm-main">' + (mode === 'local' ? '<div class="adm-mode"><b>लोकल प्रीव्यू मोड:</b> डेटा सिर्फ़ इसी ब्राउज़र में सेव होता है, वेबसाइट के विज़िटर्स को नहीं दिखेगा। असली प्रकाशन के लिए backend/README.md के अनुसार Supabase जोड़ें।</div>' : '') +
      '<div id="msg"></div><div id="sec"></div></main></div>';
    show(current);
  }
  function show(id) {
    if (!sectionsFor(role).some(function (s) { return s.id === id; })) id = 'dashboard';
    current = id; setMsg('');
    document.querySelectorAll('.adm-side [data-sec]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-sec') === id); });
    (RENDER[id] || RENDER.dashboard)($('sec'));
  }
  function head(el, title, sub) { el.innerHTML = '<h2 class="hi" style="color:var(--maroon)">' + esc(title) + '</h2><p class="sub">' + esc(sub || '') + '</p><div id="body"></div>'; return $('body'); }

  /* ---- generic "keyed text override" editor ---- */
  function keyedEditor(el, o) {
    var b = head(el, o.title, o.sub);
    b.innerHTML = '<div class="jy-card"><div class="jy-form">' + o.fields + '<div class="jy-field full"><label>' + esc(o.textLabel) + '</label><textarea class="jy-input" id="ke_text" maxlength="4000"></textarea><div class="jy-hint">सादा टेक्स्ट लिखें (HTML नहीं)। खाली छोड़कर "हटाएँ" दबाने पर ओवरराइड हट जाएगा।</div></div></div>' +
      '<div class="jy-row" style="margin-top:14px"><button class="jy-btn" data-act="ke_save">सेव करें</button><button class="jy-btn ghost" data-act="ke_del">हटाएँ</button></div></div><div class="adm-list" id="ke_list"></div>';
    var load = function () {
      var k = o.keyFn(); if (!k) return;
      db.get(k, null).then(function (v) { $('ke_text').value = v && v.text ? v.text : ''; }).catch(fail);
    };
    var refreshList = function () {
      db.list(o.prefix).then(function (rows) {
        $('ke_list').innerHTML = '<b>हाल की प्रविष्टियाँ</b>' + (rows.length ? rows.map(function (r) {
          return '<div class="row"><code>' + esc(r.key) + '</code><span>' + esc(String((r.value && r.value.text) || '').slice(0, 50)) + '</span></div>'; }).join('') : '<div class="row"><span>अभी कोई नहीं</span></div>');
      }).catch(function () { /* list is optional */ });
    };
    o.ctx = { load: load, refreshList: refreshList }; ACTIVE_EDITOR = o;
    el.querySelectorAll('input,select').forEach(function (i) { i.addEventListener('change', load); });
    load(); refreshList();
  }
  var ACTIVE_EDITOR = null;

  var RENDER = {
    dashboard: function (el) {
      var b = head(el, 'डैशबोर्ड', 'एक नज़र में स्थिति');
      if (mode !== 'admin') {
        b.innerHTML = '<div class="jy-card">' + note('लोकल प्रीव्यू में केवल कंटेंट एडिटर उपलब्ध हैं। यूज़र/ऑर्डर आँकड़े Supabase जुड़ने पर दिखेंगे।', 'info') + '</div>'; return;
      }
      b.innerHTML = '<div class="jy-grid jy-g4" id="stats"><div class="jy-card adm-stat"><b>…</b><span>लोड हो रहा है</span></div></div>';
      var cnt = function (t, f) { var q = client.from(t).select('*', { count: 'exact', head: true }); return (f ? f(q) : q).then(function (r) { return r.count || 0; }); };
      Promise.all([
        role === 'admin' ? cnt('profiles') : Promise.resolve('—'),
        role === 'admin' ? cnt('memberships', function (q) { return q.eq('status', 'active'); }) : Promise.resolve('—'),
        role === 'admin' ? cnt('orders', function (q) { return q.eq('status', 'paid'); }) : Promise.resolve('—'),
        cnt('reports', function (q) { return q.eq('status', 'pending_review'); }),
        role === 'admin' ? client.from('orders').select('amount_paise').eq('status', 'paid').limit(1000).then(function (r) { return (r.data || []).reduce(function (s, x) { return s + x.amount_paise; }, 0) / 100; }) : Promise.resolve('—')
      ]).then(function (v) {
        var box = function (n, l) { return '<div class="jy-card adm-stat"><b>' + esc(n) + '</b><span>' + esc(l) + '</span></div>'; };
        $('stats').innerHTML = box(v[0], 'कुल यूज़र्स') + box(v[1], 'सक्रिय सदस्य') + box(v[2], 'सफल ऑर्डर') + box(v[3], 'अप्रूवल लंबित रिपोर्ट') + box(v[4] === '—' ? '—' : '₹' + Number(v[4]).toLocaleString('en-IN'), 'कुल भुगतान (पहले 1000 ऑर्डर)');
      }).catch(fail);
    },

    panchang: function (el) {
      keyedEditor(el, { title: 'पंचांग सामग्री', sub: 'किसी तारीख के पंचांग पर विशेष टिप्पणी (जैसे पर्व/व्रत/मुहूर्त नोट)। गणना स्वचालित रहती है; यह केवल अतिरिक्त नोट है।', prefix: 'panchang_note_',
        fields: '<div class="jy-field"><label>तारीख</label><input type="date" class="jy-input" id="ke_date" value="' + JY.todayISO() + '"></div>', textLabel: 'पंचांग नोट',
        keyFn: function () { return keyPanchang($('ke_date').value); } });
    },
    faladesh: function (el) {
      keyedEditor(el, { title: 'दैनिक फलादेश ओवरराइड', sub: 'चुनी तारीख के लिए स्वचालित फलादेश की जगह अपना लिखा फलादेश दिखाएँ।', prefix: 'faladesh_override_',
        fields: '<div class="jy-field"><label>तारीख</label><input type="date" class="jy-input" id="ke_date" value="' + JY.todayISO() + '"></div>', textLabel: 'फलादेश',
        keyFn: function () { return keyFaladesh($('ke_date').value); } });
    },
    rashifal: function (el) {
      keyedEditor(el, { title: 'राशिफल ओवरराइड', sub: 'किसी तारीख व राशि का दैनिक राशिफल अपने शब्दों में लिखें।', prefix: 'rashifal_override_',
        fields: '<div class="jy-field"><label>तारीख</label><input type="date" class="jy-input" id="ke_date" value="' + JY.todayISO() + '"></div><div class="jy-field"><label>राशि</label><select class="jy-select" id="ke_rashi">' +
          RASHI.map(function (r, i) { return '<option value="' + i + '">' + esc(r) + '</option>'; }).join('') + '</select></div>', textLabel: 'राशिफल',
        keyFn: function () { return keyRashifal($('ke_date').value, $('ke_rashi').value); } });
    },

    babynames: function (el) {
      var b = head(el, 'बच्चों के नाम — नए नाम जोड़ें', 'यहाँ जोड़े नाम बेबी-नेम फ़ाइंडर की सूची में जुड़ेंगे।');
      b.innerHTML = '<div class="jy-card"><div class="jy-form">' +
        '<div class="jy-field"><label>हिंदी नाम *</label><input class="jy-input" id="bn_hi" maxlength="60"></div>' +
        '<div class="jy-field"><label>English नाम *</label><input class="jy-input" id="bn_en" maxlength="60"></div>' +
        '<div class="jy-field"><label>लिंग *</label><select class="jy-select" id="bn_gender"><option value="boy">लड़का</option><option value="girl">लड़की</option><option value="unisex">Unisex</option></select></div>' +
        '<div class="jy-field"><label>नाम अक्षर</label><input class="jy-input" id="bn_syllable" maxlength="8" placeholder="जैसे: चू"></div>' +
        '<div class="jy-field"><label>राशि</label><select class="jy-select" id="bn_rashi"><option value="">—</option>' + RASHI.map(function (r) { return '<option>' + esc(r) + '</option>'; }).join('') + '</select></div>' +
        '<div class="jy-field"><label>नक्षत्र</label><input class="jy-input" id="bn_nak" maxlength="40"></div>' +
        '<div class="jy-field"><label>संस्कृत मूल/व्युत्पत्ति</label><input class="jy-input" id="bn_origin" maxlength="60"></div>' +
        '<div class="jy-field full"><label>अर्थ *</label><input class="jy-input" id="bn_meaning" maxlength="300"></div></div>' +
        '<div class="jy-row" style="margin-top:14px"><button class="jy-btn" data-act="bn_add"><i class="fas fa-plus"></i> नाम जोड़ें</button></div></div><div class="adm-list" id="bn_list"></div>';
      renderBabyList();
    },

    pricing: function (el) {
      var b = head(el, 'प्रीमियम मूल्य', 'कीमतें पूर्ण रुपये में। ग्राहक को यही कीमत दिखती है, और भुगतान के समय सर्वर इसी तालिका से राशि तय करता है।');
      db.get('pricing', null).then(function (stored) {
        var p = mergePricing(DEFAULT_PRICING, stored);
        b.innerHTML = '<div class="jy-card"><div class="jy-form">' + PRICE_FIELDS.map(function (f) {
          return '<div class="jy-field"><label>' + esc(f[1]) + ' (₹)</label><input class="jy-input" inputmode="numeric" id="pr_' + f[0] + '" value="' + esc(p[f[0]]) + '"></div>'; }).join('') +
          '<div class="jy-field"><label>मुद्रा</label><input class="jy-input" value="INR" disabled></div></div>' +
          '<div class="jy-row" style="margin-top:14px"><button class="jy-btn" data-act="pr_save">सेव करें</button><button class="jy-btn ghost" data-act="pr_reset">डिफ़ॉल्ट पर लौटें</button></div></div>';
      }).catch(fail);
    },

    users: function (el) {
      var b = head(el, 'यूज़र्स', 'पंजीकृत यूज़र्स और उनकी भूमिका (role)। पहला admin SQL से बनता है — backend/README.md देखें।');
      if (mode !== 'admin') { b.innerHTML = needBackend(); return; }
      client.from('profiles').select('id,email,full_name,phone,role,created_at').order('created_at', { ascending: false }).limit(200).then(function (r) {
        if (r.error) throw r.error;
        b.innerHTML = '<div class="jy-card jy-scroll"><table class="jy-table"><thead><tr><th>ईमेल</th><th>नाम</th><th>फ़ोन</th><th>Role</th><th></th></tr></thead><tbody>' + r.data.map(function (u) {
          return '<tr><td>' + esc(u.email) + '</td><td>' + esc(u.full_name) + '</td><td>' + esc(u.phone) + '</td><td><select class="jy-select" data-role-for="' + esc(u.id) + '">' +
            ['user', 'astrologer', 'admin'].map(function (x) { return '<option' + (x === u.role ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></td>' +
            '<td><button class="jy-btn sm ghost" data-act="role_save" data-id="' + esc(u.id) + '">सेव</button></td></tr>'; }).join('') + '</tbody></table></div>';
      }).catch(fail);
    },

    reports: function (el) {
      var b = head(el, 'रिपोर्ट व PDF अप्रूवल', 'असली हस्तलिखित/ज्योतिषी-सत्यापित कुंडली की PDF अपलोड करें, फिर अनुमोदित करें। ग्राहक अपनी PDF केवल अनुमोदन के बाद देख पाता है।');
      if (mode !== 'admin') { b.innerHTML = needBackend(); return; }
      Promise.all([
        client.from('reports').select('*').order('created_at', { ascending: false }).limit(100),
        client.from('profiles').select('id,email').limit(1000)
      ]).then(function (rs) {
        if (rs[0].error) throw rs[0].error;
        var emails = {}; (rs[1].data || []).forEach(function (p) { emails[p.id] = p.email; });
        b.innerHTML = '<div class="jy-card" style="margin-bottom:16px"><h3 class="hi">नई रिपोर्ट प्रविष्टि</h3><div class="jy-form">' +
          '<div class="jy-field"><label>यूज़र ईमेल</label><input class="jy-input" id="rp_email" type="email"></div>' +
          '<div class="jy-field"><label>प्रकार</label><select class="jy-select" id="rp_kind"><option value="kundali">कुंडली</option><option value="matching">मिलान</option></select></div>' +
          '<div class="jy-field full"><label>नोट (वैकल्पिक)</label><input class="jy-input" id="rp_note" maxlength="300"></div></div>' +
          '<div class="jy-row" style="margin-top:12px"><button class="jy-btn sm" data-act="rp_create">प्रविष्टि बनाएँ</button></div></div>' +
          '<div class="jy-card jy-scroll"><table class="jy-table"><thead><tr><th>यूज़र</th><th>प्रकार</th><th>स्थिति</th><th>PDF</th><th>कार्य</th></tr></thead><tbody>' +
          (rs[0].data.length ? rs[0].data.map(function (r) {
            var chip = r.status === 'approved' ? 'good' : r.status === 'pending_review' ? 'mid' : '';
            return '<tr><td>' + esc(emails[r.user_id] || r.user_id.slice(0, 8)) + '</td><td>' + esc(r.kind) + '</td><td><span class="jy-chip ' + chip + '">' + esc(r.status) + '</span></td>' +
              '<td>' + (r.file_path ? '<button class="jy-btn sm ghost" data-act="rp_view" data-path="' + esc(r.file_path) + '">देखें</button>' : '—') + '</td>' +
              '<td><label class="jy-btn sm ghost" style="cursor:pointer">PDF चुनें<input type="file" accept="application/pdf" hidden data-upload="' + esc(r.id) + '" data-user="' + esc(r.user_id) + '"></label> ' +
              (r.status === 'pending_review' ? '<button class="jy-btn sm gold" data-act="rp_approve" data-id="' + esc(r.id) + '">अनुमोदित करें</button>' : '') + '</td></tr>'; }).join('') : '<tr><td colspan="5">कोई रिपोर्ट नहीं</td></tr>') + '</tbody></table></div>';
      }).catch(fail);
    },

    members: function (el) {
      var b = head(el, 'सदस्यता प्रबंधन', 'मैन्युअल रूप से Premium दें या रद्द करें। ऑनलाइन भुगतान से सदस्यता अपने-आप (वेबहुक से) बनती है।');
      if (mode !== 'admin') { b.innerHTML = needBackend(); return; }
      Promise.all([client.from('memberships').select('*').order('updated_at', { ascending: false }).limit(200), client.from('profiles').select('id,email').limit(1000)]).then(function (rs) {
        if (rs[0].error) throw rs[0].error;
        var emails = {}; (rs[1].data || []).forEach(function (p) { emails[p.id] = p.email; });
        b.innerHTML = '<div class="jy-card" style="margin-bottom:16px"><h3 class="hi">Premium दें</h3><div class="jy-form">' +
          '<div class="jy-field"><label>यूज़र ईमेल (पहले साइन-अप होना चाहिए)</label><input class="jy-input" id="mb_email" type="email"></div>' +
          '<div class="jy-field"><label>प्लान</label><select class="jy-select" id="mb_plan"><option value="manual">मैन्युअल</option><option value="membershipMonthly">मासिक</option><option value="membershipYearly">वार्षिक</option></select></div>' +
          '<div class="jy-field"><label>दिन</label><input class="jy-input" id="mb_days" inputmode="numeric" value="30"></div></div>' +
          '<div class="jy-row" style="margin-top:12px"><button class="jy-btn sm" data-act="mb_grant">Premium सक्रिय करें</button></div></div>' +
          '<div class="jy-card jy-scroll"><table class="jy-table"><thead><tr><th>यूज़र</th><th>प्लान</th><th>स्थिति</th><th>वैधता</th><th></th></tr></thead><tbody>' +
          (rs[0].data.length ? rs[0].data.map(function (m) {
            return '<tr><td>' + esc(emails[m.user_id] || m.user_id.slice(0, 8)) + '</td><td>' + esc(m.plan) + '</td><td>' + esc(m.status) + '</td><td>' + esc(m.valid_until ? new Date(m.valid_until).toLocaleDateString('en-IN') : '—') + '</td>' +
              '<td>' + (m.status === 'active' ? '<button class="jy-btn sm ghost" data-act="mb_revoke" data-id="' + esc(m.user_id) + '">रद्द करें</button>' : '') + '</td></tr>'; }).join('') : '<tr><td colspan="5">कोई सदस्य नहीं</td></tr>') + '</tbody></table></div>';
      }).catch(fail);
    },

    site: function (el) {
      var b = head(el, 'वेबसाइट सामग्री', 'बैनर संदेश और संपर्क नंबर। (जो पेज इन्हें पढ़ते हैं, वही बदलाव दिखाते हैं।)');
      db.get('site_content', {}).then(function (v) {
        v = v || {};
        b.innerHTML = '<div class="jy-card"><div class="jy-form"><div class="jy-field full"><label>बैनर संदेश</label><input class="jy-input" id="sc_banner" maxlength="300" value="' + esc(v.banner_text || '') + '"></div>' +
          '<div class="jy-field"><label>फ़ोन</label><input class="jy-input" id="sc_phone" value="' + esc(v.phone || '') + '"></div>' +
          '<div class="jy-field"><label>WhatsApp (देश कोड सहित)</label><input class="jy-input" id="sc_wa" value="' + esc(v.whatsapp || '') + '"></div></div>' +
          '<div class="jy-row" style="margin-top:14px"><button class="jy-btn" data-act="sc_save">सेव करें</button></div></div>';
      }).catch(fail);
    },

    astrologer: function (el) {
      var b = head(el, 'ज्योतिषी प्रोफ़ाइल', 'प्रीमियम कुंडली के कवर पेज पर दिखने वाला ज्योतिषी/पंडित विवरण। केवल सही, सत्यापित जानकारी भरें।');
      db.get('astrologer', {}).then(function (v) {
        v = v || {};
        var f = function (id, label, val, extra) { return '<div class="jy-field' + (extra || '') + '"><label>' + label + '</label><input class="jy-input" id="as_' + id + '" value="' + esc(val == null ? '' : val) + '"></div>'; };
        b.innerHTML = '<div class="jy-card"><div class="jy-form">' + f('name', 'नाम *', v.name) + f('title', 'उपाधि/पद', v.title) + f('experience_years', 'अनुभव (वर्ष)', v.experience_years) + f('city', 'शहर', v.city) +
          f('phone', 'फ़ोन', v.phone) + f('photo_url', 'फ़ोटो URL (https)', v.photo_url) + f('credentials', 'योग्यता/प्रमाण', v.credentials, ' full') +
          '<div class="jy-field full"><label>परिचय</label><textarea class="jy-input" id="as_bio" maxlength="1000">' + esc(v.bio || '') + '</textarea></div></div>' +
          '<div class="jy-row" style="margin-top:14px"><button class="jy-btn" data-act="as_save">सेव करें</button></div></div>';
      }).catch(fail);
    }
  };

  /* ---- baby names list ---- */
  function renderBabyList() {
    db.get('babynames_extra', []).then(function (arr) {
      arr = Array.isArray(arr) ? arr : [];
      $('bn_list').innerHTML = '<b>जोड़े गए नाम (' + arr.length + ')</b>' + (arr.length ? arr.map(function (n, i) {
        return '<div class="row"><span><b>' + esc(n.hi) + '</b> (' + esc(n.en) + ') · ' + esc(n.gender) + ' · ' + esc(n.meaning) + '</span><button class="jy-btn sm ghost" data-act="bn_del" data-i="' + i + '">हटाएँ</button></div>'; }).join('') : '<div class="row"><span>अभी कोई नहीं</span></div>');
    }).catch(fail);
  }

  /* ---- actions (event delegation; ids come from data-attributes, never inline JS) ---- */
  function lookupUser(email) {
    return client.from('profiles').select('id,email').eq('email', email).maybeSingle().then(function (r) {
      if (r.error) throw r.error;
      if (!r.data) throw new Error('यह ईमेल पंजीकृत नहीं है — यूज़र को पहले साइन-अप करना होगा।');
      return r.data;
    });
  }
  var ACT = {
    logout: function () { if (mode === 'local') { location.reload(); return; } client.auth.signOut().then(function () { JY.ls.set('jy_sb_token', null); route(); }); },
    ke_save: function () {
      var o = ACTIVE_EDITOR, k = o.keyFn(), t = cleanText($('ke_text').value, 4000);
      if (!k) return setMsg(note('सही तारीख चुनें।', 'warn'));
      if (!t) return setMsg(note('टेक्स्ट खाली है — हटाने के लिए "हटाएँ" दबाएँ।', 'warn'));
      db.set(k, { text: t }).then(function () { setMsg(note('सेव हो गया।', 'info')); o.ctx.refreshList(); }).catch(fail);
    },
    ke_del: function () {
      var o = ACTIVE_EDITOR, k = o.keyFn(); if (!k) return setMsg(note('सही तारीख चुनें।', 'warn'));
      db.del(k).then(function () { $('ke_text').value = ''; setMsg(note('हटा दिया गया।', 'info')); o.ctx.refreshList(); }).catch(fail);
    },
    bn_add: function () {
      var r = validateBabyName({ hi: $('bn_hi').value, en: $('bn_en').value, gender: $('bn_gender').value, meaning: $('bn_meaning').value, origin: $('bn_origin').value, rashi: $('bn_rashi').value, nakshatra: $('bn_nak').value, syllable: $('bn_syllable').value });
      if (!r.ok) return setMsg(errList(r.errors));
      db.get('babynames_extra', []).then(function (arr) {
        arr = Array.isArray(arr) ? arr : [];
        if (arr.length >= 2000) throw new Error('सूची की सीमा (2000) पूरी हो गई।');
        arr.push(r.value); return db.set('babynames_extra', arr);
      }).then(function () { setMsg(note('नाम जोड़ दिया गया।', 'info')); ['bn_hi', 'bn_en', 'bn_meaning', 'bn_origin', 'bn_nak', 'bn_syllable'].forEach(function (i) { $(i).value = ''; }); renderBabyList(); }).catch(fail);
    },
    bn_del: function (btn) {
      var i = Number(btn.getAttribute('data-i'));
      db.get('babynames_extra', []).then(function (arr) { arr = Array.isArray(arr) ? arr : []; arr.splice(i, 1); return db.set('babynames_extra', arr); }).then(renderBabyList).catch(fail);
    },
    pr_save: function () {
      var raw = {}; PRICE_FIELDS.forEach(function (f) { raw[f[0]] = $('pr_' + f[0]).value; });
      var r = validatePricing(raw); if (!r.ok) return setMsg(errList(r.errors));
      db.set('pricing', r.value).then(function () { setMsg(note('मूल्य सेव हो गए।', 'info')); }).catch(fail);
    },
    pr_reset: function () { if (confirm('सभी मूल्य डिफ़ॉल्ट पर लौटाएँ?')) db.set('pricing', DEFAULT_PRICING).then(function () { show('pricing'); }).catch(fail); },
    role_save: function (btn) {
      var id = btn.getAttribute('data-id'), sel = document.querySelector('[data-role-for="' + id + '"]');
      if (me && id === me.id && sel.value !== 'admin' && !confirm('आप अपनी admin भूमिका हटा रहे हैं। जारी रखें?')) return;
      client.from('profiles').update({ role: sel.value }).eq('id', id).then(function (r) { if (r.error) throw r.error; setMsg(note('भूमिका अपडेट हुई।', 'info')); }).catch(fail);
    },
    rp_create: function () {
      var em = cleanText($('rp_email').value, 200).toLowerCase(), kind = $('rp_kind').value;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return setMsg(note('सही ईमेल लिखें।', 'warn'));
      lookupUser(em).then(function (u) {
        return client.from('reports').insert({ user_id: u.id, kind: kind, input: { note: cleanText($('rp_note').value, 300) }, status: 'generated' });
      }).then(function (r) { if (r.error) throw r.error; setMsg(note('प्रविष्टि बन गई।', 'info')); show('reports'); }).catch(fail);
    },
    rp_view: function (btn) {
      client.storage.from('reports').createSignedUrl(btn.getAttribute('data-path'), 120).then(function (r) {
        if (r.error) throw r.error; window.open(r.data.signedUrl, '_blank', 'noopener');
      }).catch(fail);
    },
    rp_approve: function (btn) {
      if (!confirm('इस रिपोर्ट को अनुमोदित करें? ग्राहक को PDF दिखने लगेगी।')) return;
      client.from('reports').update({ status: 'approved', approved_by: me.id, approved_at: new Date().toISOString() }).eq('id', btn.getAttribute('data-id')).eq('status', 'pending_review')
        .then(function (r) { if (r.error) throw r.error; setMsg(note('अनुमोदित।', 'info')); show('reports'); }).catch(fail);
    },
    mb_grant: function () {
      var r = validateGrant({ email: $('mb_email').value, plan: $('mb_plan').value, days: $('mb_days').value });
      if (!r.ok) return setMsg(errList(r.errors));
      lookupUser(r.value.email).then(function (u) {
        return client.from('memberships').upsert({ user_id: u.id, plan: r.value.plan, status: 'active', valid_until: new Date(Date.now() + r.value.days * 86400000).toISOString(), updated_at: new Date().toISOString() });
      }).then(function (x) { if (x.error) throw x.error; setMsg(note('Premium सक्रिय कर दिया गया।', 'info')); show('members'); }).catch(fail);
    },
    mb_revoke: function (btn) {
      if (!confirm('इस यूज़र की सदस्यता रद्द करें?')) return;
      client.from('memberships').update({ status: 'revoked', updated_at: new Date().toISOString() }).eq('user_id', btn.getAttribute('data-id'))
        .then(function (r) { if (r.error) throw r.error; show('members'); }).catch(fail);
    },
    sc_save: function () {
      var r = validateSiteContent({ banner_text: $('sc_banner').value, phone: $('sc_phone').value, whatsapp: $('sc_wa').value });
      if (!r.ok) return setMsg(errList(r.errors));
      db.set('site_content', r.value).then(function () { setMsg(note('सेव हो गया।', 'info')); }).catch(fail);
    },
    as_save: function () {
      var g = function (i) { return $('as_' + i).value; };
      var r = validateAstrologer({ name: g('name'), title: g('title'), experience_years: g('experience_years'), city: g('city'), phone: g('phone'), photo_url: g('photo_url'), credentials: g('credentials'), bio: g('bio') });
      if (!r.ok) return setMsg(errList(r.errors));
      db.set('astrologer', r.value).then(function () { setMsg(note('प्रोफ़ाइल सेव हो गई।', 'info')); }).catch(fail);
    }
  };
  function onUpload(inp) {
    var f = inp.files && inp.files[0], err = pdfError(f);
    if (err) { inp.value = ''; return setMsg(note(err, 'warn')); }
    var id = inp.getAttribute('data-upload'), uid = inp.getAttribute('data-user'), path = uid + '/' + id + '.pdf';
    setMsg(note('अपलोड हो रहा है…', 'info'));
    client.storage.from('reports').upload(path, f, { contentType: 'application/pdf', upsert: true }).then(function (r) {
      if (r.error) throw r.error;
      return client.from('reports').update({ file_path: path, status: 'pending_review', approved_by: null, approved_at: null }).eq('id', id);
    }).then(function (r) { if (r.error) throw r.error; setMsg(note('PDF अपलोड हुई — अब अनुमोदन लंबित है।', 'info')); show('reports'); }).catch(fail);
  }

  /* ---- boot / auth ---- */
  function lockedScreen() {
    root.innerHTML = '<div class="jy-card locked"><h2 class="hi" style="color:var(--maroon)"><i class="fas fa-lock"></i> Admin लॉक है</h2>' +
      '<p style="font-size:.92rem;line-height:1.8;margin-top:8px">Admin पैनल के लिए असली लॉगिन चाहिए, जो बैकएंड (Supabase) से आता है। अभी बैकएंड जुड़ा नहीं है, इसलिए कोई लॉगिन उपलब्ध नहीं है।</p>' +
      '<ol><li>Supabase प्रोजेक्ट बनाएँ और <code>backend/schema.sql</code> चलाएँ</li><li><code>js/jy-common.js</code> में <code>supabaseUrl</code> और <code>supabaseAnonKey</code> (सिर्फ़ public key) भरें</li><li>साइन-अप करके SQL से अपना role admin करें</li></ol>' +
      '<p style="font-size:.86rem;color:var(--text-muted)">विवरण: <code>backend/README.md</code></p><hr style="border:0;border-top:1px dashed var(--line);margin:16px 0">' +
      '<p style="font-size:.86rem;line-height:1.7"><b>लोकल प्रीव्यू मोड</b> — सिर्फ़ यह देखने के लिए कि एडिटर कैसे काम करते हैं। डेटा सिर्फ़ इसी ब्राउज़र में रहेगा और वेबसाइट के विज़िटर्स को <u>नहीं</u> दिखेगा। यह लॉगिन नहीं है।</p>' +
      '<div class="jy-row" style="margin-top:10px"><button class="jy-btn ghost" id="goLocal">लोकल प्रीव्यू मोड खोलें</button></div></div>';
    $('goLocal').onclick = function () { mode = 'local'; role = 'admin'; shell(); };
  }
  function loginScreen(errText) {
    root.innerHTML = '<div class="jy-card locked"><h2 class="hi" style="color:var(--maroon)"><i class="fas fa-user-shield"></i> Admin लॉगिन</h2>' + (errText ? '<div style="margin:10px 0">' + note(errText, 'warn') + '</div>' : '') +
      '<div class="jy-form" style="grid-template-columns:1fr;margin-top:12px"><div class="jy-field"><label>ईमेल</label><input class="jy-input" id="ad_email" type="email" autocomplete="username"></div>' +
      '<div class="jy-field"><label>पासवर्ड</label><input class="jy-input" id="ad_pass" type="password" autocomplete="current-password"></div></div>' +
      '<div class="jy-row" style="margin-top:14px"><button class="jy-btn" id="ad_login">लॉगिन</button></div></div>';
    var go = function () {
      $('ad_login').disabled = true;
      client.auth.signInWithPassword({ email: $('ad_email').value.trim(), password: $('ad_pass').value }).then(function (r) {
        if (r.error) { loginScreen('लॉगिन विफल: ' + r.error.message); return; }
        route();
      });
    };
    $('ad_login').onclick = go; $('ad_pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
  }
  function route() {
    client.auth.getSession().then(function (r) {
      var s = r.data && r.data.session;
      JY.ls.set('jy_sb_token', s ? s.access_token : null);
      if (!s) return loginScreen();
      me = s.user;
      return client.from('profiles').select('role').eq('id', me.id).maybeSingle().then(function (p) {
        role = p.data && p.data.role;
        if (role !== 'admin' && role !== 'astrologer') {
          root.innerHTML = '<div class="jy-card locked">' + note('यह खाता (' + (me.email || '') + ') Admin/Astrologer अधिकृत नहीं है।', 'warn') + '<div class="jy-row" style="margin-top:14px"><button class="jy-btn ghost" id="ad_out">लॉगआउट</button></div></div>';
          $('ad_out').onclick = function () { client.auth.signOut().then(route); };
          return;
        }
        mode = 'admin'; current = 'dashboard'; shell();
      });
    }).catch(function (e) { loginScreen('त्रुटि: ' + (e && e.message || e)); });
  }
  function init() {
    root = $('adminRoot');
    root.addEventListener('click', function (e) {
      var s = e.target.closest('[data-sec]'); if (s) return show(s.getAttribute('data-sec'));
      var a = e.target.closest('[data-act]'); if (a && ACT[a.getAttribute('data-act')]) ACT[a.getAttribute('data-act')](a);
    });
    root.addEventListener('change', function (e) { if (e.target.matches && e.target.matches('input[data-upload]')) onUpload(e.target); });
    if (!JY.backendReady()) return lockedScreen();
    loadSupabase().then(function (c) { client = c; route(); }).catch(function () { root.innerHTML = '<div class="jy-card locked">' + note('Supabase लोड नहीं हो सका। इंटरनेट जाँचें।', 'warn') + '</div>'; });
  }
  function loadSupabase() {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
      s.onload = function () { res(global.supabase.createClient(JY.CONFIG.supabaseUrl, JY.CONFIG.supabaseAnonKey)); }; s.onerror = rej; document.head.appendChild(s);
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})(typeof window !== 'undefined' ? window : globalThis);
