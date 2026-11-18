/* ============================================================================
   panchang-ui.js — rendering + page logic for panchang.html
   Pure render functions (no DOM access) so they can be exercised in node;
   the browser wiring at the bottom only runs when `document` exists.
   Depends on: Astro (astro.js), Panchang (panchang-engine.js), JY (jy-common.js)
   ========================================================================== */
(function (root) {
  'use strict';
  var UI = {};
  var P = function () { return root.Panchang; };

  var G_MONTH_HI = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
  var G_MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WD_SHORT = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
  var PRADOSH_NAME = ['रवि', 'सोम', 'भौम', 'बुध', 'गुरु', 'शुक्र', 'शनि'];

  // Ekadashi names (traditional, purnimanta month; [krishna, shukla])
  var EKADASHI = [
    ['पापमोचिनी', 'कामदा'], ['वरूथिनी', 'मोहिनी'], ['अपरा', 'निर्जला'], ['योगिनी', 'देवशयनी'],
    ['कामिका', 'पुत्रदा (श्रावण)'], ['अजा', 'परिवर्तिनी'], ['इंदिरा', 'पापांकुशा'], ['रमा', 'देवउठनी (प्रबोधिनी)'],
    ['उत्पन्ना', 'मोक्षदा'], ['सफला', 'पुत्रदा (पौष)'], ['षटतिला', 'जया'], ['विजया', 'आमलकी']
  ];

  function esc(s) {
    s = String(s == null ? '' : s);
    return s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }

  /** hours since local midnight -> "07:08 AM (अगले दिन)" (HTML) */
  function T(h) {
    var s = P().fmtHM(h);
    return s.replace(/ \(\+\d+d\)/, ' <small>(अगले दिन)</small>').replace(/ \(−\d+d\)/, ' <small>(पिछले दिन)</small>');
  }
  function range(a, b) { return T(a) + ' – ' + T(b); }
  function dur(h) { var m = Math.round(h * 60); return Math.floor(m / 60) + ' घं ' + pad(m % 60) + ' मि'; }

  /** tzone offset for a city object {tz: IANA string | number} on a date */
  function tzFor(city, y, m, d) {
    if (typeof city.tz === 'number') return city.tz;
    return root.JY.cityTz(city, y, m, d, 12, 0);
  }
  function computeFor(city, y, m, d) {
    return P().compute({ y: y, m: m, d: d, lat: city.lat, lon: city.lon, tz: tzFor(city, y, m, d), place: city.name });
  }

  /** which segment of an element (tithi/nak...) prevails at local hour h */
  function segAt(all, h) {
    for (var i = 0; i < all.length; i++) { if (h < all[i].end) return all[i]; }
    return all[all.length - 1];
  }

  function gDateHi(dt) { return pad(dt.d) + ' ' + G_MONTH_HI[dt.m - 1] + ' ' + dt.y; }
  function gDateEn(dt) { return dt.d + ' ' + G_MONTH_EN[dt.m - 1] + ' ' + dt.y; }

  /* ------------------------------------------------------------------ */
  /* Day rendering                                                      */
  /* ------------------------------------------------------------------ */
  function elementRow(label, list, extra) {
    var h = '<div class="pk-el"><div class="pk-el-h">' + label + '</div><div class="pk-el-b">';
    list.forEach(function (s, i) {
      h += '<div class="pk-seg' + (i === 0 ? ' first' : '') + '"><b>' + esc(s.name) + (s.sub ? ' <small>' + esc(s.sub) + '</small>' : '') + '</b>' +
        '<span>' + (i === 0 ? '' : 'फिर · ') + T(s.end) + ' तक</span></div>';
    });
    if (extra) h += '<div class="pk-extra">' + extra + '</div>';
    return h + '</div></div>';
  }

  function headCard(r, placeLabel) {
    var d = r.date, dt = { y: d.y, m: d.m, d: d.d };
    var m = r.masa;
    var tithiLine = r.paksha + ' पक्ष ' + (r.tithi.index === 14 ? 'पूर्णिमा' : r.tithi.index === 29 ? 'अमावस्या' : r.tithi.name + ' (' + r.tithi.no + ')');
    var h = '<div class="jy-card pk-head">';
    h += '<div class="pk-date-hi">' + esc(d.vara) + ', ' + gDateHi(dt) + '</div>';
    h += '<div class="pk-date-en">' + esc(d.varaEn) + ', ' + gDateEn(dt) + ' · <i class="fas fa-location-dot"></i> ' + esc(placeLabel) + '</div>';
    h += '<div class="pk-hindu"><span class="jy-chip">' + (m.adhika ? 'अधिक मास · ' : '') + esc(m.purnimanta) + ' (पूर्णिमांत)</span> <span class="jy-chip">' + esc(m.amanta) + ' (अमांत)</span> <span class="jy-chip good">' + esc(tithiLine) + '</span></div>';
    h += '<div class="jy-kv" style="margin-top:14px">' +
      kv('विक्रम संवत', root.JY ? root.JY.dev(r.samvat.vikram) + ' (' + r.samvat.vikram + ')' : r.samvat.vikram, 'चैत्र शुक्ल प्रतिपदा से नववर्ष') +
      kv('शक संवत', r.samvat.shaka, 'राष्ट्रीय पंचांग') +
      kv('हिन्दू मास', esc(m.purnimanta) + ' / ' + esc(m.amanta), 'पूर्णिमांत (उत्तर भारत) / अमांत') +
      kv('पक्ष', esc(r.paksha), r.paksha === 'शुक्ल' ? 'बढ़ता चंद्र' : 'घटता चंद्र') +
      '</div>';
    if (m.adhika) h += '<div class="jy-note" style="margin-top:12px">यह अधिक (मल) मास है — सामान्यतः विवाह, गृह-प्रवेश आदि शुभ संस्कार वर्जित माने जाते हैं।</div>';
    return h + '</div>';
  }
  function kv(k, v, s) { return '<div class="it"><small>' + k + '</small><b>' + v + '</b>' + (s ? '<span>' + s + '</span>' : '') + '</div>'; }

  function fiveLimbs(r) {
    var h = '<div class="jy-card"><h3><i class="fas fa-om"></i> पंचांग के पाँच अंग</h3><div class="pk-els">';
    h += elementRow('तिथि', r.tithi.all.map(function (s) { return { name: (s.index < 15 ? 'शुक्ल ' : 'कृष्ण ') + s.name, end: s.end }; }));
    h += elementRow('वार', [{ name: r.date.vara, end: r.nextSunrise, sub: 'स्वामी: ' + r.date.varaLord }].map(function (s) { return { name: s.name, sub: s.sub, end: s.end }; }), null)
      .replace(/<span>.*?<\/span>/, '<span>सूर्योदय से सूर्योदय</span>');
    h += elementRow('नक्षत्र', r.nakshatra.all.map(function (s, i) { return { name: s.name, sub: i === 0 ? 'पद ' + r.nakshatra.pada : '', end: s.end }; }));
    h += elementRow('योग', r.yoga.all.map(function (s) { return { name: s.name, sub: root.JY && PK_BAD_YOGA(s.index) ? 'अशुभ' : '', end: s.end }; }));
    h += elementRow('करण', r.karana.all.map(function (s) { return { name: s.name, end: s.end }; }));
    return h + '</div><p class="jy-hint">तिथि/नक्षत्र आदि सूर्योदय के समय प्रचलित अंग से दिन का नाम तय होता है; बाद में बदलने वाले अंग क्रम से दिए गए हैं।</p></div>';
  }
  function PK_BAD_YOGA(i) { return { 0: 1, 5: 1, 8: 1, 9: 1, 12: 1, 16: 1, 18: 1, 26: 1 }[i] === 1; }

  function sunMoonCard(r) {
    return '<div class="jy-card"><h3><i class="fas fa-sun"></i> सूर्य · चंद्र</h3><div class="jy-kv">' +
      kv('सूर्योदय', T(r.sunrise)) + kv('सूर्यास्त', T(r.sunset)) +
      kv('चंद्रोदय', r.moonrise == null ? '—' : T(r.moonrise)) + kv('चंद्रास्त', r.moonset == null ? '—' : T(r.moonset)) +
      kv('दिनमान', dur(r.dayLength), 'रात्रिमान ' + dur(r.nightLength)) +
      kv('सूर्य राशि', esc(r.sunRashi)) +
      kv('चंद्र राशि', esc(r.moonRashi), 'राशि परिवर्तन ' + T(r.moonRashiEnd)) +
      '</div></div>';
  }

  function slot(name, rg, cls, note) {
    return '<div class="pk-slot ' + cls + '"><b>' + name + '</b><span>' + rg + '</span>' + (note ? '<small>' + note + '</small>' : '') + '</div>';
  }
  function timingsCard(r) {
    var good = '<h4 class="pk-sub good"><i class="fas fa-circle-check"></i> शुभ समय</h4><div class="pk-slots">' +
      slot('ब्रह्म मुहूर्त', range(r.brahma.start, r.brahma.end), 'good', 'साधना, जप, अध्ययन') +
      slot('प्रातः संध्या', range(r.pratahSandhya.start, r.pratahSandhya.end), 'good', 'सूर्योदय से पूर्व') +
      slot('अभिजित मुहूर्त', range(r.abhijit.start, r.abhijit.end), r.date.weekday === 3 ? 'mid' : 'good', r.date.weekday === 3 ? 'बुधवार को कई परंपराओं में वर्जित' : 'दिन का सर्वोत्तम मुहूर्त') +
      slot('गोधूलि बेला', range(r.godhuli.start, r.godhuli.end), 'good', 'सूर्यास्त के आसपास') +
      slot('निशीथ काल', range(r.nishita.start, r.nishita.end), 'mid', 'मध्यरात्रि · तांत्रिक/पूजन') +
      '</div>';
    var bad = '<h4 class="pk-sub bad"><i class="fas fa-ban"></i> अशुभ समय</h4><div class="pk-slots">' +
      slot('राहु काल', range(r.rahu.start, r.rahu.end), 'bad', 'शुभ कार्य आरंभ वर्जित') +
      slot('यमगण्ड', range(r.yamaganda.start, r.yamaganda.end), 'bad', 'नए कार्य टालें') +
      slot('गुलिक काल', range(r.gulika.start, r.gulika.end), 'bad', 'शुभ कार्य वर्जित');
    if (r.bhadra.length) r.bhadra.forEach(function (b) { bad += slot('भद्रा (विष्टि करण)', range(b.start, b.end), 'bad', 'शुभ संस्कार वर्जित'); });
    else bad += slot('भद्रा', 'आज दिन में नहीं', 'mid', '');
    bad += '</div>';
    return '<div class="jy-card"><h3><i class="fas fa-clock"></i> शुभ-अशुभ समय</h3>' + good + bad + '</div>';
  }

  function notesCard(r) {
    if (!r.notes || !r.notes.length) return '';
    var h = '<div class="jy-card"><h3><i class="fas fa-lightbulb"></i> आज की विशेष बातें</h3><ul class="pk-notes">';
    r.notes.forEach(function (n) { h += '<li class="' + (n.good ? 'good' : 'bad') + '"><i class="fas ' + (n.good ? 'fa-circle-check' : 'fa-triangle-exclamation') + '"></i> ' + esc(n.text) + '</li>'; });
    return h + '</ul></div>';
  }

  /** nowHours = current local hour in the city when viewing today, else null */
  function choghadiyaCard(r, nowHours) {
    function cls(g) { return g === 1 ? 'good' : g === 0.5 ? 'mid' : 'bad'; }
    function lab(g) { return g === 1 ? 'शुभ' : g === 0.5 ? 'मध्यम' : 'अशुभ'; }
    function grid(night) {
      var h = '<div class="pk-chog">';
      r.choghadiya.filter(function (c) { return c.night === night; }).forEach(function (c) {
        var cur = nowHours != null && nowHours >= c.start && nowHours < c.end;
        h += '<div class="pk-ch ' + cls(c.good) + (cur ? ' now' : '') + '"><b>' + esc(c.name) + '</b><em>' + lab(c.good) + '</em><span>' + range(c.start, c.end) + '</span>' + (cur ? '<i>अभी</i>' : '') + '</div>';
      });
      return h + '</div>';
    }
    return '<div class="jy-card"><h3><i class="fas fa-table-cells"></i> चौघड़िया</h3><h4 class="pk-sub">दिन का चौघड़िया</h4>' + grid(false) +
      '<h4 class="pk-sub">रात्रि का चौघड़िया</h4>' + grid(true) +
      '<p class="jy-hint">दिनमान व रात्रिमान को 8-8 भागों में बाँटकर वार के क्रम से गणना की गई है।</p></div>';
  }

  /** whole day (everything except the admin note) */
  function renderDay(r, placeLabel, nowHours) {
    if (r.error) return '<div class="jy-note warn">' + esc(r.error) + '</div>';
    return headCard(r, placeLabel) + '<div class="jy-grid jy-g2" style="margin-top:18px">' + fiveLimbs(r) + sunMoonCard(r) + '</div>' +
      '<div class="jy-grid jy-g2" style="margin-top:18px">' + timingsCard(r) + notesCard(r) + '</div>' +
      '<div style="margin-top:18px">' + choghadiyaCard(r, nowHours) + '</div>';
  }
  function renderNote(text) {
    if (!text) return '';
    return '<div class="jy-card cream pk-admin" style="margin-top:18px"><h3><i class="fas fa-feather-pointed"></i> विशेष टिप्पणी</h3><div style="white-space:pre-wrap;line-height:1.8">' + esc(text) + '</div></div>';
  }

  /* ------------------------------------------------------------------ */
  /* Month view                                                          */
  /* ------------------------------------------------------------------ */
  function monthData(city, y, m) {
    var n = new Date(Date.UTC(y, m, 0)).getUTCDate(), out = [];
    for (var d = 1; d <= n; d++) {
      var r = computeFor(city, y, m, d);
      if (r.error) { out.push({ d: d, error: true }); continue; }
      var t = r.tithi;
      out.push({ d: d, wd: r.date.weekday, tithi: t.name, tidx: t.index, paksha: r.paksha, nak: r.nakshatra.name, masa: r.masa.purnimanta, sunrise: r.sunrise });
    }
    return out;
  }
  function renderMonth(days, y, m, sel, today) {
    var first = P().weekday(y, m, 1);
    var h = '<div class="pk-mgrid">';
    WD_SHORT.forEach(function (w) { h += '<div class="pk-mh">' + w + '</div>'; });
    var i;
    for (i = 0; i < first; i++) h += '<div class="pk-mc empty"></div>';
    days.forEach(function (c) {
      if (c.error) { h += '<div class="pk-mc empty"></div>'; return; }
      var cls = 'pk-mc';
      if (c.tidx === 14) cls += ' pn'; else if (c.tidx === 29) cls += ' am'; else if (c.tidx % 15 === 10) cls += ' ek';
      if (sel && sel.d === c.d && sel.m === m && sel.y === y) cls += ' sel';
      if (today && today.d === c.d && today.m === m && today.y === y) cls += ' today';
      h += '<button type="button" class="' + cls + '" data-d="' + c.d + '"><b>' + c.d + '</b><span class="t">' + (c.tidx === 14 || c.tidx === 29 ? '' : (c.paksha === 'शुक्ल' ? 'शु' : 'कृ') + '·') + esc(c.tithi) + '</span><span class="n">' + esc(c.nak) + '</span></button>';
    });
    return h + '</div>' +
      '<div class="pk-legend"><span><i class="pn"></i> पूर्णिमा</span><span><i class="am"></i> अमावस्या</span><span><i class="ek"></i> एकादशी</span><span><i class="today"></i> आज</span></div>';
  }

  /* ------------------------------------------------------------------ */
  /* Upcoming vrat / festival-type days — all derived from computation  */
  /* ------------------------------------------------------------------ */
  function sankrantiTime(city, y, m, d, rPrev, r) {
    // exact instant Sun reaches the new rashi boundary between the two sunrises
    var tz = tzFor(city, y, m, d), pm = P().addDays(y, m, d, -1);
    var jdA = P().jdFromLocal(pm.y, pm.m, pm.d, rPrev.sunrise, tzFor(city, pm.y, pm.m, pm.d));
    var jdB = P().jdFromLocal(y, m, d, r.sunrise, tz);
    var target = (Astro.RASHI.indexOf(r.sunRashi)) * 30, i, mid;
    function f(t) { var x = ((P().sunSid(t) - target) % 360 + 540) % 360 - 180; return x; }
    for (i = 0; i < 40; i++) { mid = (jdA + jdB) / 2; if (f(mid) < 0) jdA = mid; else jdB = mid; }
    var jd0 = P().jdFromLocal(y, m, d, 0, tz);
    return ((jdA + jdB) / 2 - jd0) * 24;       // may be negative => previous civil day
  }

  /** events for `days` civil days starting at start={y,m,d} */
  function upcoming(city, start, days) {
    var ev = [], pv = P().addDays(start.y, start.m, start.d, -1);
    var rPrev = computeFor(city, pv.y, pv.m, pv.d);
    function push(dt, kind, label, sub) { ev.push({ y: dt.y, m: dt.m, d: dt.d, off: 0, vara: P().VARA[P().weekday(dt.y, dt.m, dt.d)], kind: kind, label: label, sub: sub || '' }); }
    for (var i = 0; i < days; i++) {
      var dt = P().addDays(start.y, start.m, start.d, i);
      var r = computeFor(city, dt.y, dt.m, dt.d);
      if (r.error) { rPrev = r; continue; }
      var wd = r.date.weekday;
      var tSr = r.tithi.index;                                   // tithi at sunrise
      var tSs = segAt(r.tithi.all, r.sunset).index;              // at sunset (pradosh)
      var tMid = segAt(r.tithi.all, (r.sunrise + r.sunset) / 2).index;   // madhyahna
      var tNish = segAt(r.tithi.all, (r.nishita.start + r.nishita.end) / 2).index;
      var tMoon = segAt(r.tithi.all, r.moonrise == null ? r.sunset + 2 : Math.min(r.moonrise, 24 + r.sunrise - 0.01)).index;
      var pIdx = P().MASA.indexOf(r.masa.purnimanta);
      var hasEk = false;
      // Ekadashi (prevailing at sunrise = udaya tithi)
      if (tSr % 15 === 10) {
        var krishna = tSr >= 15;
        push(dt, 'vrat', (r.masa.adhika ? 'अधिक मास की ' : '') + EKADASHI[pIdx][krishna ? 0 : 1] + ' एकादशी', (krishna ? 'कृष्ण' : 'शुक्ल') + ' एकादशी · व्रत (उदयकालीन तिथि)');
        hasEk = true;
      }
      if (tSs === 14) push(dt, 'purnima', 'पूर्णिमा', esc(r.masa.purnimanta) + ' पूर्णिमा · सत्यनारायण कथा, दान-स्नान');
      if (tSr === 29) push(dt, 'amavasya', 'अमावस्या', esc(r.masa.amanta) + ' अमावस्या · पितृ-तर्पण, दान-स्नान');
      if (tMid === 3) push(dt, 'vrat', 'विनायक चतुर्थी', 'शुक्ल चतुर्थी · गणेश पूजन');
      if (tMoon === 18) push(dt, 'vrat', 'संकष्टी चतुर्थी', 'कृष्ण चतुर्थी · चंद्रोदय पर अर्घ्य');
      if (tSs === 12 || tSs === 27) push(dt, 'vrat', PRADOSH_NAME[wd] + ' प्रदोष व्रत', (tSs === 27 ? 'कृष्ण' : 'शुक्ल') + ' त्रयोदशी · प्रदोष काल में शिव पूजन');
      if (tNish === 28) {
        if (r.masa.amantaIdx === 10) push(dt, 'festival', 'महाशिवरात्रि', 'माघ कृष्ण चतुर्दशी (निशीथ काल में) — नियम आधारित गणना');
        else push(dt, 'vrat', 'मासिक शिवरात्रि', 'कृष्ण चतुर्दशी (निशीथ काल में)');
      }
      if (tSs === 29 && r.masa.amantaIdx === 6 && !r.masa.adhika) push(dt, 'festival', 'दीपावली (लक्ष्मी पूजन)', 'आश्विन अमावस्या (प्रदोष काल में) — नियम आधारित गणना');
      if (tMid === 8 && r.masa.amantaIdx === 0 && !r.masa.adhika) push(dt, 'festival', 'राम नवमी', 'चैत्र शुक्ल नवमी (मध्याह्न में) — नियम आधारित गणना');
      // Sankranti
      if (rPrev && !rPrev.error && rPrev.sunRashi !== r.sunRashi) {
        var h = sankrantiTime(city, dt.y, dt.m, dt.d, rPrev, r), sd = dt;
        if (h < 0) { sd = P().addDays(dt.y, dt.m, dt.d, -1); h += 24; }
        if (!(sd.y === start.y && sd.m === start.m && sd.d === start.d && false)) {
          var sRash = Astro.RASHI.indexOf(r.sunRashi) === 9 ? 'मकर संक्रांति' : esc(r.sunRashi) + ' संक्रांति';
          push(sd, 'sankranti', sRash, 'सूर्य का ' + esc(r.sunRashi) + ' राशि में प्रवेश · ' + T(h));
        }
      }
      rPrev = r;
    }
    // keep only events whose date falls in the window, stable sort by date
    var key = function (e) { return e.y * 10000 + e.m * 100 + e.d; };
    var k0 = key(start), k1 = key(P().addDays(start.y, start.m, start.d, days - 1));
    ev = ev.filter(function (e) { var k = key(e); return k >= k0 && k <= k1; });
    ev.sort(function (a, b) { return key(a) - key(b); });
    ev.forEach(function (e) { e.off = Math.round((Date.UTC(e.y, e.m - 1, e.d) - Date.UTC(start.y, start.m - 1, start.d)) / 86400000); });
    return ev;
  }
  function renderUpcoming(ev) {
    if (!ev.length) return '<p class="jy-hint">इस अवधि में कोई विशेष तिथि नहीं मिली।</p>';
    var ICON = { vrat: 'fa-hands-praying', purnima: 'fa-moon', amavasya: 'fa-cloud-moon', sankranti: 'fa-sun', festival: 'fa-star' };
    var h = '<div class="pk-ev">';
    ev.forEach(function (e) {
      h += '<button type="button" class="pk-evi ' + e.kind + '" data-date="' + iso(e.y, e.m, e.d) + '"><div class="dd"><b>' + e.d + '</b><span>' + G_MONTH_HI[e.m - 1] + '</span></div>' +
        '<div class="tx"><b><i class="fas ' + ICON[e.kind] + '"></i> ' + e.label + '</b><span>' + e.vara + ' · ' + (e.off === 0 ? 'आज' : e.off === 1 ? 'कल' : e.off + ' दिन बाद') + '</span><small>' + e.sub + '</small></div></button>';
    });
    return h + '</div>';
  }

  UI.esc = esc; UI.T = T; UI.renderDay = renderDay; UI.renderNote = renderNote; UI.monthData = monthData; UI.renderMonth = renderMonth;
  UI.upcoming = upcoming; UI.renderUpcoming = renderUpcoming; UI.computeFor = computeFor; UI.tzFor = tzFor; UI.segAt = segAt;
  UI.gDateHi = gDateHi; UI.G_MONTH_HI = G_MONTH_HI; UI.iso = iso;
  root.PanchangUI = UI;
  if (typeof module !== 'undefined' && module.exports) module.exports = UI;

  /* ------------------------------------------------------------------ */
  /* Browser wiring                                                      */
  /* ------------------------------------------------------------------ */
  if (typeof document === 'undefined') return;
  var $ = function (id) { return document.getElementById(id); };
  var state = { city: null, y: 0, m: 0, d: 0, my: 0, mm: 0, monthCache: {} };

  function nowInCity(city) {
    var u = new Date(), off;
    off = typeof city.tz === 'number' ? city.tz : root.JY.tzOffset(city.tz, u.getUTCFullYear(), u.getUTCMonth() + 1, u.getUTCDate(), u.getUTCHours(), u.getUTCMinutes());
    var l = new Date(u.getTime() + off * 3600000);
    return { y: l.getUTCFullYear(), m: l.getUTCMonth() + 1, d: l.getUTCDate(), h: l.getUTCHours() + l.getUTCMinutes() / 60 };
  }
  function cityLabel(c) { return c.custom ? c.name + ' (' + c.lat.toFixed(2) + '°, ' + c.lon.toFixed(2) + '°)' : root.JY.cityLabel(c); }

  /** read the city controls; returns city object or null (with message) */
  function readCity() {
    var txt = $('pCity').value.trim();
    var c = root.JY.findCity(txt);
    if (c) { $('pCustom').open = false; return { name: c.name, state: c.state, country: c.country, lat: c.lat, lon: c.lon, tz: c.tz, label: root.JY.cityLabel(c), src: c }; }
    var lat = parseFloat($('pLat').value), lon = parseFloat($('pLon').value), tzs = $('pTz').value.trim();
    if (!isNaN(lat) && !isNaN(lon) && tzs) {
      var tz = /^[+-]?\d+(\.\d+)?$/.test(tzs) ? parseFloat(tzs) : tzs;
      if (typeof tz === 'string') { try { new Intl.DateTimeFormat('en', { timeZone: tz }); } catch (e) { return { err: 'टाइम-ज़ोन "' + tzs + '" पहचाना नहीं गया (उदा. Asia/Kolkata या 5.5)।' }; } }
      if (lat < -66 || lat > 66) return { err: 'अक्षांश -66° से +66° के बीच दें।' };
      return { name: txt || 'कस्टम स्थान', lat: lat, lon: lon, tz: tz, custom: true, label: (txt || 'कस्टम स्थान') + ' (' + lat.toFixed(2) + '°, ' + lon.toFixed(2) + '°)' };
    }
    $('pCustom').open = true;
    return { err: 'शहर सूची से चुनें, या "अन्य स्थान" में अक्षांश, देशांतर व टाइम-ज़ोन भरें।' };
  }

  function show(msg) { $('pOut').innerHTML = '<div class="jy-note warn">' + esc(msg) + '</div>'; }

  function renderAll(opts) {
    opts = opts || {};
    var city = state.city;
    var r;
    try { r = computeFor(city, state.y, state.m, state.d); } catch (e) { show('गणना में त्रुटि: ' + e.message); return; }
    var nw = nowInCity(city), isToday = nw.y === state.y && nw.m === state.m && nw.d === state.d;
    $('pOut').innerHTML = renderDay(r, city.label, isToday ? nw.h : null) + '<div id="pNote"></div>';
    $('pDate').value = iso(state.y, state.m, state.d);
    root.JY.store.get('panchang_note_' + iso(state.y, state.m, state.d), '').then(function (t) { var el = $('pNote'); if (el) el.innerHTML = renderNote(typeof t === 'string' ? t : ''); });
    renderMonthBox(); renderUpcomingBox();
  }

  function renderMonthBox() {
    var key = state.my + '-' + state.mm + '|' + state.city.lat + ',' + state.city.lon + ',' + state.city.tz;
    $('pMonthTitle').textContent = G_MONTH_HI[state.mm - 1] + ' ' + state.my;
    var box = $('pMonth');
    function draw(days) {
      box.innerHTML = renderMonth(days, state.my, state.mm, { y: state.y, m: state.m, d: state.d }, nowInCity(state.city));
      Array.prototype.forEach.call(box.querySelectorAll('.pk-mc[data-d]'), function (b) {
        b.addEventListener('click', function () { state.y = state.my; state.m = state.mm; state.d = parseInt(b.getAttribute('data-d'), 10); renderAll(); $('pOut').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      });
    }
    if (state.monthCache[key]) { draw(state.monthCache[key]); return; }
    box.innerHTML = '<p class="jy-hint">मासिक पंचांग की गणना हो रही है…</p>';
    setTimeout(function () { var days = monthData(state.city, state.my, state.mm); state.monthCache[key] = days; draw(days); }, 20);
  }

  function renderUpcomingBox() {
    var box = $('pUpcoming'), city = state.city, nw = nowInCity(city);
    box.innerHTML = '<p class="jy-hint">आगामी व्रत-पर्वों की गणना हो रही है…</p>';
    setTimeout(function () {
      var ev = upcoming(city, { y: nw.y, m: nw.m, d: nw.d }, 30);
      box.innerHTML = renderUpcoming(ev);
      Array.prototype.forEach.call(box.querySelectorAll('.pk-evi'), function (b) {
        b.addEventListener('click', function () {
          var p = b.getAttribute('data-date').split('-'); state.y = +p[0]; state.m = +p[1]; state.d = +p[2]; state.my = state.y; state.mm = state.m;
          renderAll(); $('pOut').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }, 40);
  }

  function setDate(y, m, d) { state.y = y; state.m = m; state.d = d; state.my = y; state.mm = m; renderAll(); }
  function shiftDay(n) { var x = P().addDays(state.y, state.m, state.d, n); setDate(x.y, x.m, x.d); }

  function applyCity() {
    var c = readCity();
    if (c.err) { show(c.err); return false; }
    state.city = c; state.monthCache = {};
    if (c.src) root.JY.saveCity(c.src);
    return true;
  }

  document.addEventListener('DOMContentLoaded', function () {
    root.JY.fillCityList($('pCityList'));
    var saved = root.JY.lastCity();
    $('pCity').value = root.JY.cityLabel(saved);
    var q = {}; location.search.replace(/^\?/, '').split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) q[p[0]] = decodeURIComponent(p[1] || ''); });
    if (q.city && root.JY.findCity(q.city)) $('pCity').value = root.JY.cityLabel(root.JY.findCity(q.city));
    if (!applyCity()) return;
    var nw = nowInCity(state.city), y = nw.y, m = nw.m, d = nw.d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(q.date || '')) { var p = q.date.split('-'); y = +p[0]; m = +p[1]; d = +p[2]; }
    setDate(y, m, d);

    $('pCity').addEventListener('change', function () { if (applyCity()) renderAll(); });
    ['pLat', 'pLon', 'pTz'].forEach(function (id) { $(id).addEventListener('change', function () { if ($('pLat').value && $('pLon').value && $('pTz').value) { $('pCity').value = $('pCity').value && !root.JY.findCity($('pCity').value) ? $('pCity').value : ''; if (applyCity()) renderAll(); } }); });
    $('pDate').addEventListener('change', function () { var v = this.value; if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return; var p = v.split('-'); setDate(+p[0], +p[1], +p[2]); });
    $('pPrev').addEventListener('click', function () { shiftDay(-1); });
    $('pNext').addEventListener('click', function () { shiftDay(1); });
    $('pToday').addEventListener('click', function () { var n = nowInCity(state.city); setDate(n.y, n.m, n.d); });
    $('pMPrev').addEventListener('click', function () { state.mm--; if (state.mm < 1) { state.mm = 12; state.my--; } renderMonthBox(); });
    $('pMNext').addEventListener('click', function () { state.mm++; if (state.mm > 12) { state.mm = 1; state.my++; } renderMonthBox(); });
    $('pShare').addEventListener('click', function () {
      var u = location.origin + location.pathname + '?date=' + iso(state.y, state.m, state.d) + '&city=' + encodeURIComponent(state.city.name);
      var txt = 'पंचांग ' + gDateHi({ y: state.y, m: state.m, d: state.d }) + ' — ' + state.city.name;
      if (navigator.share) navigator.share({ title: 'PanditSeva पंचांग', text: txt, url: u }).catch(function () { });
      else if (navigator.clipboard) navigator.clipboard.writeText(txt + '\n' + u).then(function () { root.JY.toast('लिंक कॉपी हो गया'); });
    });
  });
})(typeof window !== 'undefined' ? window : global);
