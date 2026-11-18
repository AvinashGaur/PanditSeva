/* ============================================================================
   babynames.js — Baby Name Finder UI + logic (PanditSeva.in)
   Birth details -> Moon sidereal longitude (Panchang.moonSid, Lahiri) ->
   Nakshatra + Pada -> Rashi -> traditional naam-akshar -> names (names-data.js).
   Needs: astro.js, panchang-engine.js, jy-common.js, names-data.js
   ========================================================================== */
(function () {
  'use strict';

  var D = window.JYNames;
  var FREE_LIMIT = 8;                      // names per gender shown before "सभी नाम देखें"
  var GENDER_HI = { boy: 'लड़का', girl: 'लड़की', unisex: 'यूनिसेक्स' };
  var FAV_KEY = 'jy_fav_names';
  var NAK_SPAN = 40 / 3, PADA_SPAN = 10 / 3;

  var byKey = {};
  D.NAMES.forEach(function (r) { r.key = r.hi + '|' + r.syllable; byKey[r.key] = r; });

  var state = { gender: 'all', q: '', syl: '', rashi: '', nak: '', sort: 'az', favOnly: false, expanded: false, mode: 'browse', birth: null };
  var favs = JY.ls.get(FAV_KEY, []);
  if (!Array.isArray(favs)) favs = [];

  function $(id) { return document.getElementById(id); }
  function esc(s) { return JY.esc(s); }

  /* ---------------- birth calculation ---------------- */
  function computeBirth() {
    var ds = $('bnDate').value, ts = $('bnTime').value;
    if (!ds || !ts) { JY.toast('कृपया जन्म तिथि और समय भरें।'); return null; }
    var dp = ds.split('-').map(Number), tp = ts.split(':').map(Number);
    var y = dp[0], m = dp[1], d = dp[2], hh = tp[0], mm = tp[1];
    var place = $('bnPlace').value.trim(), notes = [];
    var city = JY.findCity(place), tz, label;
    var customTz = $('bnTz').value !== '' ? parseFloat($('bnTz').value) : null;
    if (customTz != null && !isNaN(customTz) && !city) {
      tz = customTz; label = 'UTC' + (tz >= 0 ? '+' : '') + tz + ' (स्वयं दिया)';
    } else if (city) {
      tz = JY.cityTz(city, y, m, d, hh, mm); label = JY.cityLabel(city) + ' · UTC' + (tz >= 0 ? '+' : '') + tz;
      JY.saveCity(city);
    } else {
      tz = 5.5; label = 'भारतीय मानक समय (UTC+5:30)';
      notes.push(place ? 'दिया गया शहर सूची में नहीं मिला, इसलिए भारतीय समय (UTC+5:30) माना गया। विदेश का जन्म हो तो “अन्य स्थान” में UTC अंतर भरें।' : 'जन्म स्थान नहीं चुना, इसलिए भारतीय समय (UTC+5:30) माना गया।');
    }
    var jd = Astro.julianDay(y, m, d, hh + mm / 60 - tz);
    var lon = Panchang.moonSid(jd);
    var nak = Math.floor(lon / NAK_SPAN) % 27;
    var inNak = lon - nak * NAK_SPAN;
    var pada = Math.min(4, Math.floor(inNak / PADA_SPAN) + 1);
    var inPada = inNak - (pada - 1) * PADA_SPAN;
    var edge = Math.min(inPada, PADA_SPAN - inPada);              // degrees to nearest pada boundary
    if (edge < 0.08) notes.push('चंद्रमा पद-संधि के बहुत निकट है (लगभग ' + Math.max(1, Math.round(edge / 0.55 * 60)) + ' मिनट का अंतर)। जन्म-समय में थोड़ा भी अंतर हो तो अक्षर बदल सकता है — कृपया सटीक समय पंडित जी से मिलाएँ।');
    var syl = D.SYLLABLES[nak][pada - 1];
    var rashi = D.SYL_INFO[syl].rashi;
    return { y: y, m: m, d: d, hh: hh, mm: mm, tz: tz, label: label, notes: notes, moonLon: lon, nak: nak, pada: pada, syl: syl, rashi: rashi };
  }

  function showResult(b) {
    state.birth = b; state.mode = 'result';
    $('rSyl').textContent = b.syl;
    $('rTitle').textContent = 'नाम ' + b.syl + ' से शुरू करें';
    $('rSub').textContent = 'चंद्रमा ' + D.NAK[b.nak] + ' नक्षत्र के ' + JY.dev(b.pada) + 'वें चरण में · ' + b.label;
    $('rNak').textContent = D.NAK[b.nak]; $('rNakEn').textContent = D.NAK_EN[b.nak] + ' (' + JY.dev(b.nak + 1) + '/२७)';
    $('rPada').textContent = JY.dev(b.pada) + 'वाँ पद'; $('rRashi').textContent = D.RASHI[b.rashi];
    $('rRashiEn').textContent = D.RASHI_EN[b.rashi]; $('rLord').textContent = D.RASHI_LORD[b.rashi];
    $('rSyls').innerHTML = D.SYLLABLES[b.nak].map(function (s, i) {
      return '<button type="button" class="s' + (i + 1 === b.pada ? ' mine' : '') + (state.syl === s ? ' on' : '') + '" data-s="' + esc(s) + '">' + esc(s) + '</button>';
    }).join('');
    var warn = $('rWarn'); warn.style.display = b.notes.length ? 'block' : 'none'; warn.innerHTML = b.notes.map(esc).join('<br>');
    $('bnResult').style.display = 'block';

    state.gender = 'all'; state.q = ''; state.rashi = ''; state.nak = ''; state.favOnly = false; state.expanded = false;
    state.syl = b.syl;
    if (!(D.RAW[b.syl] || []).length) { state.syl = ''; state.nak = String(b.nak); }       // no names for this exact sound -> same nakshatra
    syncControls(); render();
    $('bnResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------------- filtering / rendering ---------------- */
  function matches(r) {
    if (state.gender !== 'all' && r.gender !== state.gender) return false;
    if (state.syl && r.syllable !== state.syl) return false;
    if (state.rashi !== '' && String(r.rashi) !== state.rashi) return false;
    if (state.nak !== '' && String(r.nak) !== state.nak) return false;
    if (state.favOnly && favs.indexOf(r.key) === -1) return false;
    if (r.fam && !state.syl && state.nak === '' && !state.q && !state.favOnly) return false;   // pure browse: exact-syllable names only
    if (state.q) {
      var q = state.q.toLowerCase();
      if ((r.hi + ' ' + r.en + ' ' + r.mHi + ' ' + r.mEn + ' ' + r.origin).toLowerCase().indexOf(q) === -1) return false;
    }
    return true;
  }
  function sylOrder(s) { return D.SYLLABLES.join(',').split(',').indexOf(s); }
  function filtered() {
    var list = D.NAMES.filter(matches);
    if (state.q) {                                   // a search hit on a sound-family copy should not duplicate an exact one
      var seen = {}; list = list.filter(function (r) { if (r.fam && seen[r.hi]) return false; seen[r.hi] = 1; return true; });
    }
    list.sort(function (a, b) {
      if (state.sort === 'syl') { var d = sylOrder(a.syllable) - sylOrder(b.syllable); if (d) return d; }
      if (a.fam !== b.fam) return a.fam ? 1 : -1;
      return a.hi.localeCompare(b.hi, 'hi');
    });
    return list;
  }
  function limited(list) {
    if (state.expanded) return list;
    var c = { boy: 0, girl: 0, unisex: 0 };
    return list.filter(function (r) { if (c[r.gender] >= FREE_LIMIT) return false; c[r.gender]++; return true; });
  }

  function cardHTML(r) {
    var isFav = favs.indexOf(r.key) !== -1;
    return '<article class="bn-card ' + r.gender + '">' +
      '<button type="button" class="bn-heart' + (isFav ? ' on' : '') + '" data-k="' + esc(r.key) + '" aria-label="पसंदीदा" title="पसंदीदा"><i class="fas fa-heart"></i></button>' +
      '<div class="bn-hi">' + esc(r.hi) + (r.fam ? ' <sup title="समीपी ध्वनि" style="font-size:.6em;color:var(--primary)">*</sup>' : '') + '</div>' +
      '<div class="bn-en">' + esc(r.en) + ' <span class="jy-chip ' + (r.gender === 'girl' ? 'bad' : r.gender === 'boy' ? 'good' : 'mid') + '" style="font-size:.66rem;padding:1px 8px">' + GENDER_HI[r.gender] + '</span></div>' +
      '<div class="bn-mean">' + esc(r.mHi) + '<small>' + esc(r.mEn) + '</small></div>' +
      '<div class="bn-tags"><span>अक्षर: ' + esc(r.syllable) + '</span><span>' + esc(r.rashiHi) + ' राशि</span><span>' + esc(r.nakHi) + ' · ' + JY.dev(r.pada) + '</span></div>' +
      '<div class="bn-org"><b>मूल:</b> ' + esc(r.origin) + '</div>' +
      '</article>';
  }

  function render() {
    var all = filtered(), shown = limited(all);
    var out = $('bnOut');
    out.innerHTML = shown.length ? shown.map(cardHTML).join('') : '<div class="bn-empty" style="grid-column:1/-1">कोई नाम नहीं मिला। फ़िल्टर बदलकर देखें, या <a href="https://wa.me/' + JY.CONFIG.whatsapp + '" style="color:var(--primary);font-weight:600">पंडित जी से नाम पूछें</a>।</div>';
    var title = 'नाम सुझाव';
    if (state.mode === 'result' && state.birth) title = state.syl ? 'अक्षर “' + state.syl + '” से नाम' : D.NAK[state.birth.nak] + ' नक्षत्र के नाम';
    else if (state.syl) title = 'अक्षर “' + state.syl + '” से नाम';
    $('bnListTitle').textContent = title;
    $('bnCount').textContent = all.length + ' नाम मिले' + (shown.length < all.length ? ' · ' + shown.length + ' दिखाए जा रहे हैं (हर वर्ग में पहले ' + FREE_LIMIT + ')' : '');

    var more = $('bnMore'), hidden = all.length - shown.length;
    if (hidden > 0) {
      var canAll = JY.can('babynames_full');
      more.innerHTML = canAll
        ? '<button type="button" class="jy-btn" id="bnExpand"><i class="fas fa-eye"></i> सभी नाम देखें (+' + hidden + ')</button>'
        : '<a class="jy-btn gold" href="premium.html"><i class="fas fa-crown"></i> सभी ' + all.length + ' नाम देखने के लिए Premium लें</a>';
      var ex = $('bnExpand'); if (ex) ex.onclick = function () { state.expanded = true; render(); };
    } else more.innerHTML = '';
    $('bnPrem').innerHTML = (hidden > 0 || state.expanded) ? JY.premiumBadge() + ' <span style="font-size:.76rem;color:var(--text-muted)">पूरी सूची</span>' : '';

    // sound-family / fallback note
    var fn = $('rFamNote');
    if (state.mode === 'result' && state.birth) {
      var b = state.birth, rows = D.RAW[b.syl] || [], famCount = rows.filter(function (l) { return /\|f$/.test(l); }).length;
      var msg = '';
      if (!rows.length) msg = 'अक्षर “' + b.syl + '” से शुरू होने वाले प्रचलित हिंदू/संस्कृत नाम नहीं मिलते, इसलिए इसी नक्षत्र (' + D.NAK[b.nak] + ') के सभी नाम दिखाए गए हैं। नामकरण हेतु पंडित जी से परामर्श लें।';
      else if (famCount === rows.length) msg = 'अक्षर “' + b.syl + '” से शुद्ध नाम बहुत कम मिलते हैं; * चिह्नित नाम इसकी समीपी ध्वनि (' + (D.FAMILY[b.syl] || []).join(' / ') + ') से शुरू होते हैं।';
      else if (famCount) msg = '* चिह्नित नाम अक्षर “' + b.syl + '” की समीपी ध्वनि (' + (D.FAMILY[b.syl] || []).join(' / ') + ') से शुरू होते हैं।';
      fn.style.display = msg ? 'block' : 'none'; fn.textContent = msg;
    } else fn.style.display = 'none';
    // highlight chosen syllable chips
    Array.prototype.forEach.call($('rSyls').children, function (c) { c.classList.toggle('on', c.getAttribute('data-s') === state.syl); });
    updateFavUI();
  }

  function syncControls() {
    $('fQ').value = state.q; $('fSyl').value = state.syl; $('fRashi').value = state.rashi; $('fNak').value = state.nak;
    $('fSort').value = state.sort; $('fFav').checked = state.favOnly;
    Array.prototype.forEach.call($('bnTabs').children, function (t) { t.classList.toggle('on', t.getAttribute('data-g') === state.gender); });
  }

  /* ---------------- favourites ---------------- */
  function saveFavs() { JY.ls.set(FAV_KEY, favs); }
  function toggleFav(k) {
    var i = favs.indexOf(k);
    if (i === -1) { favs.push(k); JY.toast('♥ पसंदीदा में जोड़ा'); } else favs.splice(i, 1);
    saveFavs(); updateFavUI();
  }
  function favText() {
    var lines = ['मेरे पसंदीदा नाम — PanditSeva.in'];
    favs.forEach(function (k, i) { var r = byKey[k]; if (r) lines.push((i + 1) + '. ' + r.hi + ' (' + r.en + ') — ' + r.mHi + ' [' + GENDER_HI[r.gender] + ', अक्षर ' + r.syllable + ']'); });
    lines.push('https://avinashgaur.github.io/PanditSeva/baby-names.html');
    return lines.join('\n');
  }
  function updateFavUI() {
    $('favCount').textContent = favs.length;
    Array.prototype.forEach.call(document.querySelectorAll('.bn-heart'), function (b) { b.classList.toggle('on', favs.indexOf(b.getAttribute('data-k')) !== -1); });
    var box = $('favList');
    var valid = favs.filter(function (k) { return byKey[k]; });
    box.innerHTML = valid.length ? valid.map(function (k) {
      var r = byKey[k];
      return '<div class="bn-fav"><div class="t"><b>' + esc(r.hi) + ' · ' + esc(r.en) + '</b><small>' + esc(r.mHi) + ' — ' + GENDER_HI[r.gender] + ', अक्षर ' + esc(r.syllable) + '</small></div><button type="button" data-rm="' + esc(k) + '" aria-label="हटाएँ"><i class="fas fa-trash"></i></button></div>';
    }).join('') : '<div class="bn-empty">अभी कोई नाम पसंदीदा नहीं है। किसी भी नाम के ♥ पर टैप करें।</div>';
    $('favWa').href = 'https://wa.me/?text=' + encodeURIComponent(favText());
  }
  function openDrawer(o) { $('favDrawer').classList.toggle('open', o); $('favDrawer').setAttribute('aria-hidden', o ? 'false' : 'true'); }

  /* ---------------- init ---------------- */
  document.addEventListener('DOMContentLoaded', function () {
    JY.fillCityList($('bnCityList'));
    JY.launchBanner($('launchBanner'));
    var last = JY.lastCity(); if (last) $('bnPlace').value = JY.cityLabel(last);

    // filter selects
    var selS = $('fSyl'), seenSyl = {};
    D.SYLLABLES.forEach(function (row, n) {
      row.forEach(function (s, p) {
        if (!(D.RAW[s] || []).length || seenSyl[s]) return; seenSyl[s] = 1;
        var o = document.createElement('option'); o.value = s; o.textContent = s + '  (' + D.NAK[n] + ' ' + (p + 1) + ')'; selS.appendChild(o);
      });
    });
    D.RASHI.forEach(function (r, i) { var o = document.createElement('option'); o.value = String(i); o.textContent = r; $('fRashi').appendChild(o); });
    D.NAK.forEach(function (r, i) { var o = document.createElement('option'); o.value = String(i); o.textContent = r; $('fNak').appendChild(o); });

    $('bnForm').addEventListener('submit', function (e) { e.preventDefault(); var b = computeBirth(); if (b) showResult(b); });
    $('bnBrowse').addEventListener('click', function () {
      state.mode = 'browse'; state.birth = null; state.gender = 'all'; state.q = ''; state.syl = ''; state.rashi = ''; state.nak = ''; state.expanded = false; state.favOnly = false;
      $('bnResult').style.display = 'none'; syncControls(); render(); $('bnNames').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('bnSample').addEventListener('click', function () {
      $('bnDate').value = '2024-03-15'; $('bnTime').value = '09:30'; $('bnPlace').value = 'Jaipur, Rajasthan, India';
    });
    $('bnAdvToggle').addEventListener('click', function (e) { e.preventDefault(); var a = $('bnAdv'); a.style.display = a.style.display === 'none' ? 'block' : 'none'; });

    $('bnTabs').addEventListener('click', function (e) {
      var t = e.target.closest('.jy-tab'); if (!t) return; state.gender = t.getAttribute('data-g'); syncControls(); render();
    });
    var qT; $('fQ').addEventListener('input', function () { clearTimeout(qT); qT = setTimeout(function () { state.q = $('fQ').value.trim(); render(); }, 120); });
    $('fSyl').addEventListener('change', function () { state.syl = this.value; render(); });
    $('fRashi').addEventListener('change', function () { state.rashi = this.value; render(); });
    $('fNak').addEventListener('change', function () { state.nak = this.value; render(); });
    $('fSort').addEventListener('change', function () { state.sort = this.value; render(); });
    $('fFav').addEventListener('change', function () { state.favOnly = this.checked; render(); });
    $('fReset').addEventListener('click', function () {
      state.gender = 'all'; state.q = ''; state.syl = ''; state.rashi = ''; state.nak = ''; state.favOnly = false; state.expanded = false;
      syncControls(); render();
    });
    $('rSyls').addEventListener('click', function (e) {
      var s = e.target.closest('.s'); if (!s) return; state.syl = s.getAttribute('data-s'); state.nak = ''; state.expanded = false; syncControls(); render();
    });

    $('bnOut').addEventListener('click', function (e) { var h = e.target.closest('.bn-heart'); if (h) toggleFav(h.getAttribute('data-k')); });
    $('favFab').addEventListener('click', function () { openDrawer(true); });
    $('favClose').addEventListener('click', function () { openDrawer(false); });
    $('favBd').addEventListener('click', function () { openDrawer(false); });
    $('favList').addEventListener('click', function (e) {
      var b = e.target.closest('[data-rm]'); if (!b) return; var i = favs.indexOf(b.getAttribute('data-rm')); if (i > -1) favs.splice(i, 1); saveFavs(); updateFavUI(); if (state.favOnly) render();
    });
    $('favClear').addEventListener('click', function () { if (favs.length && confirm('सभी पसंदीदा नाम हटाएँ?')) { favs = []; saveFavs(); updateFavUI(); if (state.favOnly) render(); } });
    $('favCopy').addEventListener('click', function () {
      var t = favText();
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { JY.toast('सूची कॉपी हो गई'); }, function () { JY.toast('कॉपी नहीं हो सका'); });
      else { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); JY.toast('सूची कॉपी हो गई'); } catch (x) { JY.toast('कॉपी नहीं हो सका'); } ta.remove(); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') openDrawer(false); });

    syncControls(); render();
  });
})();
