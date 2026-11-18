/* premium.js — renders plans (prices from JY.getPricing), login (Supabase email OTP), membership status */
(function () {
  'use strict';
  var P = window.JYPay, PRICING = null, client = null, user = null;

  var COPY = {
    premiumKundali:    ['प्रीमियम कुंडली रिपोर्ट', ['विस्तृत जन्म कुंडली + हिंदी व्याख्या', 'हस्तलिखित-शैली मल्टी-पेज रिपोर्ट', 'दशा विश्लेषण']],
    kundaliMatching:   ['संपूर्ण कुंडली मिलान', ['अष्टकूट 36 गुण रिपोर्ट', 'मांगलिक/नाड़ी/भकूट दोष विश्लेषण', 'मिलान PDF']],
    detailedPdf:       ['विस्तृत PDF', ['किसी भी रिपोर्ट का विस्तृत PDF', 'प्रिंट व शेयर के लिए']],
    membershipMonthly: ['मासिक सदस्यता', ['सभी Premium सुविधाएँ', '30 दिन की वैधता', 'असीमित रिपोर्ट']],
    membershipYearly:  ['वार्षिक सदस्यता', ['सभी Premium सुविधाएँ', '365 दिन की वैधता', 'सबसे किफ़ायती']]
  };

  function $(id) { return document.getElementById(id); }
  function msg(text, cls) { $('payMsg').innerHTML = text ? '<div class="jy-note ' + (cls || '') + '">' + JY.esc(text) + '</div>' : ''; }

  function card(id, best) {
    var c = COPY[id], price = P.priceFor(PRICING, id);
    var per = id === 'membershipMonthly' ? '<small> / माह</small>' : id === 'membershipYearly' ? '<small> / वर्ष</small>' : '';
    var li = c[1].map(function (t) { return '<li>' + JY.esc(t) + '</li>'; }).join('');
    return '<div class="jy-card plan' + (best ? ' best' : '') + '">' + (best ? '<span class="jy-prem-badge ribbon"><i class="fas fa-crown"></i> Best Value</span>' : '') +
      '<div class="nm">' + JY.esc(c[0]) + '</div><div class="pr">' + (price == null ? '—' : P.formatINR(price)) + per + '</div><ul>' + li + '</ul>' +
      '<button class="jy-btn' + (best ? ' gold' : '') + '" data-buy="' + id + '"' + (price == null ? ' disabled' : '') + '>' + buyLabel() + '</button></div>';
  }
  function buyLabel() {
    if (P.paymentsConfigured(JY.CONFIG)) return '<i class="fas fa-lock"></i> खरीदें';
    return '<i class="fab fa-whatsapp"></i> संपर्क करें';
  }
  function renderPlans() {
    $('onceGrid').innerHTML = card('premiumKundali') + card('kundaliMatching') + card('detailedPdf');
    $('memGrid').innerHTML = card('membershipMonthly') + card('membershipYearly', true);
    if (!P.paymentsConfigured(JY.CONFIG)) {
      msg('भुगतान जल्द शुरू — WhatsApp पर संपर्क करें। (ऑनलाइन भुगतान अभी चालू नहीं है; कोई भुगतान स्वीकार नहीं किया जा रहा।)', 'info');
    }
  }

  function onBuy(id) {
    if (!P.paymentsConfigured(JY.CONFIG)) {
      var label = (COPY[id] || [id])[0];
      window.open(P.whatsappLink(JY.CONFIG, 'नमस्ते, मुझे "' + label + '" लेना है।'), '_blank', 'noopener');
      return;
    }
    if (!user) { msg('पहले नीचे "मेरा खाता" में ईमेल से लॉगिन करें।', 'warn'); $('accountCard').scrollIntoView({ behavior: 'smooth' }); return; }
    var btns = document.querySelectorAll('[data-buy]'); btns.forEach(function (b) { b.disabled = true; });
    var enable = function () { btns.forEach(function (b) { b.disabled = P.priceFor(PRICING, b.getAttribute('data-buy')) == null; }); };
    P.buy(id, {
      onStatus: function (t) { msg(t, 'info'); },
      onPaid: function () { enable(); msg('भुगतान सफल — आपकी सुविधा सक्रिय कर दी गई है। धन्यवाद!', 'info'); refreshAccount(); },
      onTimeout: function (pid) { enable(); msg('भुगतान प्राप्त हुआ पर पुष्टि में देर हो रही है। कृपया कुछ मिनट बाद पेज रिफ़्रेश करें; समस्या रहे तो Payment ID ' + (pid || '') + ' के साथ WhatsApp करें।', 'warn'); },
      onError: function (t) { enable(); msg(t, 'warn'); }
    });
  }

  /* ---------- account ---------- */
  function renderAcct(html) { $('acctBody').innerHTML = html; }
  function loginForm(stage, email) {
    if (stage === 'code') {
      renderAcct('<p style="font-size:.88rem;margin-bottom:10px">' + JY.esc(email) + ' पर भेजा गया कोड/लिंक देखें। लिंक खोलने पर आप स्वतः लॉगिन हो जाएँगे, या कोड यहाँ डालें:</p>' +
        '<div class="jy-row"><input class="jy-input" id="otpCode" inputmode="numeric" autocomplete="one-time-code" placeholder="कोड" style="max-width:200px">' +
        '<button class="jy-btn sm" id="otpVerify">सत्यापित करें</button><button class="jy-btn sm ghost" id="otpBack">बदलें</button></div><div id="acctErr" style="margin-top:8px"></div>');
      $('otpVerify').onclick = function () {
        var tok = $('otpCode').value.trim(); if (!tok) return;
        client.auth.verifyOtp({ email: email, token: tok, type: 'email' }).then(function (r) {
          if (r.error) $('acctErr').innerHTML = '<div class="jy-note warn">' + JY.esc(r.error.message) + '</div>';
        });
      };
      $('otpBack').onclick = function () { loginForm('email'); };
      return;
    }
    renderAcct('<p style="font-size:.88rem;margin-bottom:10px;color:var(--text-muted)">अपनी खरीदारी और सदस्यता देखने के लिए ईमेल से लॉगिन करें (पासवर्ड नहीं चाहिए)।</p>' +
      '<div class="jy-row"><input class="jy-input" id="loginEmail" type="email" autocomplete="email" placeholder="आपका ईमेल" style="max-width:300px">' +
      '<button class="jy-btn sm" id="sendCode"><i class="fas fa-paper-plane"></i> कोड/लिंक भेजें</button></div><div id="acctErr" style="margin-top:8px"></div>');
    $('sendCode').onclick = function () {
      var em = $('loginEmail').value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { $('acctErr').innerHTML = '<div class="jy-note warn">सही ईमेल लिखें।</div>'; return; }
      $('sendCode').disabled = true;
      client.auth.signInWithOtp({ email: em, options: { emailRedirectTo: location.origin + location.pathname } }).then(function (r) {
        if (r.error) { $('sendCode').disabled = false; $('acctErr').innerHTML = '<div class="jy-note warn">' + JY.esc(r.error.message) + '</div>'; }
        else loginForm('code', em);
      });
    };
  }
  function fmtDate(s) { try { return new Date(s).toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } }
  function refreshAccount() {
    if (!user) return;
    P.fetchAccount(client, user.id).then(function (a) {
      var active = P.membershipActive(a.membership);
      JY.ls.set('jy_membership', { active: active, until: a.membership && a.membership.valid_until ? new Date(a.membership.valid_until).getTime() : null });   // UX cache only
      var mem = active ? '<span class="jy-chip good"><i class="fas fa-crown"></i> Premium सक्रिय — ' + JY.esc(fmtDate(a.membership.valid_until)) + ' तक</span>'
        : '<span class="jy-chip mid">Free खाता</span>';
      var ent = a.entitlements.length ? '<ul style="margin-top:10px;font-size:.88rem;line-height:1.8">' + a.entitlements.map(function (e) {
        return '<li>' + JY.esc((P.PRODUCTS[e.product] || { hi: e.product }).hi) + ' <small style="color:var(--text-light)">(' + JY.esc(fmtDate(e.granted_at)) + ')</small></li>'; }).join('') + '</ul>' : '';
      renderAcct('<div class="acct-state"><span><span class="jy-badge-live"></span>' + JY.esc(user.email || '') + '</span>' + mem +
        '<button class="jy-btn sm ghost" id="signOut">लॉगआउट</button></div>' + ent);
      $('signOut').onclick = function () { client.auth.signOut(); };
    });
  }
  function onSession(session) {
    user = session && session.user || null;
    JY.ls.set('jy_sb_token', session ? session.access_token : null);   // lets JY.store send the user's JWT
    if (user) refreshAccount(); else loginForm('email');
  }

  function init() {
    JY.launchBanner($('launchBanner'));
    $('faqWa').href = P.whatsappLink(JY.CONFIG, 'नमस्ते, PanditSeva प्रीमियम के बारे में पूछना है।');
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-buy]'); if (b && !b.disabled) onBuy(b.getAttribute('data-buy'));
    });
    JY.getPricing().then(function (p) { PRICING = p; renderPlans(); });

    if (!JY.backendReady()) {
      renderAcct('<div class="jy-note info">खाता/लॉगिन सेवा अभी चालू नहीं है। लॉन्च के बाद आप यहाँ अपनी सदस्यता और रिपोर्ट देख सकेंगे। तब तक सहायता के लिए <a href="' + JY.esc(P.whatsappLink(JY.CONFIG, 'नमस्ते')) + '" style="color:var(--primary);font-weight:600">WhatsApp</a> करें।</div>');
      return;
    }
    P.getClient().then(function (c) {
      client = c;
      client.auth.onAuthStateChange(function (_e, s) { onSession(s); });
      client.auth.getSession().then(function (r) { onSession(r.data.session); });
    }).catch(function () { renderAcct('<div class="jy-note warn">लॉगिन सेवा लोड नहीं हो सकी। इंटरनेट जाँचकर पेज रिफ़्रेश करें।</div>'); });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
