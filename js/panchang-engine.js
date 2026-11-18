/* ============================================================================
   panchang-engine.js — Real Panchang calculation for PanditSeva.in
   ----------------------------------------------------------------------------
   Sidereal (Lahiri) Sun & Moon -> Tithi, Nakshatra, Yoga, Karana, Vara,
   sunrise/sunset, moonrise/moonset, Rahu Kaal, Yamaganda, Gulika, Abhijit,
   Brahma Muhurta, Choghadiya, Hindu month (Amanta + Purnimanta),
   Vikram / Shaka Samvat.  NOTHING is fabricated or looked up from a table of
   dates: every time is solved from astronomical positions.

   Moon: Meeus (Astronomical Algorithms ch.47) main periodic terms.
   Sun : Schlyter orbital elements (via Astro.tropicalLongitudes).
   Needs astro.js loaded first.  Exposes global `Panchang`.
   ========================================================================== */
(function (global) {
  'use strict';
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  function sind(x) { return Math.sin(x * D2R); }
  function cosd(x) { return Math.cos(x * D2R); }
  function rev(x) { return x - Math.floor(x / 360) * 360; }
  function wrap180(x) { return rev(x + 180) - 180; }

  /* ---------- names ---------- */
  var TITHI = ['प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पंचमी', 'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी'];
  var YOGA = ['विष्कम्भ', 'प्रीति', 'आयुष्मान', 'सौभाग्य', 'शोभन', 'अतिगण्ड', 'सुकर्मा', 'धृति', 'शूल', 'गण्ड', 'वृद्धि', 'ध्रुव', 'व्याघात', 'हर्षण', 'वज्र', 'सिद्धि', 'व्यतीपात', 'वरीयान', 'परिघ', 'शिव', 'सिद्ध', 'साध्य', 'शुभ', 'शुक्ल', 'ब्रह्म', 'ऐन्द्र', 'वैधृति'];
  var YOGA_BAD = { 0: 1, 5: 1, 8: 1, 9: 1, 12: 1, 16: 1, 18: 1, 26: 1 }; // Vishkambha, Atiganda, Shula, Ganda, Vyaghata, Vyatipata, Parigha, Vaidhriti
  var KARANA_REP = ['बव', 'बालव', 'कौलव', 'तैतिल', 'गर', 'वणिज', 'विष्टि (भद्रा)'];
  var VARA = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
  var VARA_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var VARA_LORD = ['सूर्य', 'चंद्र', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
  var MASA = ['चैत्र', 'वैशाख', 'ज्येष्ठ', 'आषाढ़', 'श्रावण', 'भाद्रपद', 'आश्विन', 'कार्तिक', 'मार्गशीर्ष', 'पौष', 'माघ', 'फाल्गुन'];
  var MASA_EN = ['Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada', 'Ashvina', 'Kartika', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna'];
  var RAHU_SEG = [8, 2, 7, 5, 6, 4, 3];   // Sun..Sat
  var YAMA_SEG = [5, 4, 3, 2, 1, 7, 6];
  var GULIKA_SEG = [7, 6, 5, 4, 3, 2, 1];
  var CHOG_CYCLE = ['उद्वेग', 'चर', 'लाभ', 'अमृत', 'काल', 'शुभ', 'रोग'];
  var CHOG_GOOD = { 'लाभ': 1, 'अमृत': 1, 'शुभ': 1, 'चर': 0.5 };
  var CHOG_DAY0 = [0, 3, 6, 2, 5, 1, 4];   // index into CHOG_CYCLE for first day choghadiya Sun..Sat
  var CHOG_NIGHT0 = [5, 1, 4, 0, 3, 6, 2];
  var NAK = Astro.NAK;

  /* ---------- Moon (Meeus ch.47, main terms) ---------- */
  // [D, M, M', F, sumL (1e-6 deg)]
  var ML = [[0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618], [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066], [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720], [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528], [0, 0, 1, -2, 10980], [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034], [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888], [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036], [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665], [0, 1, -2, 0, -2689], [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390], [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236], [0, 1, 2, 0, -2120], [0, 2, 0, 0, -2069], [2, -2, -1, 0, 2048], [2, 0, 1, -2, -1773], [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215], [0, 0, 2, 2, -1110], [3, 0, -1, 0, -892], [2, 1, 1, 0, -810], [4, -1, -2, 0, 759], [0, 2, -1, 0, -713], [2, 2, -1, 0, -700], [2, 1, -2, 0, 691], [2, -1, 0, -2, 596], [4, 0, 1, 0, 549], [0, 0, 4, 0, 537], [4, -1, 0, 0, 520], [1, 0, -2, 0, -487], [2, 1, 0, -2, -399], [0, 0, 2, -2, -381], [1, 1, 1, 0, 351], [3, 0, -2, 0, -340], [4, 0, -3, 0, 330], [2, -1, 2, 0, 327], [0, 2, 1, 0, -323], [1, 1, -1, 0, 299], [2, 0, 3, 0, 294]];
  var MB = [[0, 0, 0, 1, 5128122], [0, 0, 1, 1, 280602], [0, 0, 1, -1, 277693], [2, 0, 0, -1, 173237], [2, 0, -1, 1, 55413], [2, 0, -1, -1, 46271], [2, 0, 0, 1, 32573], [0, 0, 2, 1, 17198], [2, 0, 1, -1, 9266], [0, 0, 2, -1, 8822], [2, -1, 0, -1, 8216], [2, 0, -2, -1, 4324], [2, 0, 1, 1, 4200], [2, 1, 0, -1, -3359], [2, -1, -1, 1, 2463], [2, -1, 0, 1, 2211], [2, -1, -1, -1, 2065], [0, 1, -1, -1, -1870], [4, 0, -1, -1, 1828], [0, 1, 0, 1, -1794], [0, 0, 0, 3, -1749], [0, 1, -1, 1, -1565], [1, 0, 0, 1, -1491], [0, 1, 1, 1, -1475], [0, 1, 1, -1, -1410], [0, 1, 0, -1, -1344], [1, 0, 0, -1, -1335], [0, 0, 3, 1, 1107], [4, 0, 0, -1, 1021], [4, 0, -1, 1, 833]];

  /** Moon tropical ecliptic longitude & latitude (deg) at JD (UT) */
  function moonTropical(jd) {
    var T = (jd - 2451545.0) / 36525;
    var Lp = rev(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T);
    var D = rev(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T);
    var M = rev(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T);
    var Mp = rev(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T);
    var F = rev(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T);
    var A1 = rev(119.75 + 131.849 * T), A2 = rev(53.09 + 479264.290 * T), A3 = rev(313.45 + 481266.484 * T);
    var E = 1 - 0.002516 * T - 0.0000074 * T * T;
    var sl = 0, sb = 0, i, t, e;
    for (i = 0; i < ML.length; i++) {
      t = ML[i]; e = t[1] === 0 ? 1 : (Math.abs(t[1]) === 1 ? E : E * E);
      sl += t[4] * e * sind(t[0] * D + t[1] * M + t[2] * Mp + t[3] * F);
    }
    for (i = 0; i < MB.length; i++) {
      t = MB[i]; e = t[1] === 0 ? 1 : (Math.abs(t[1]) === 1 ? E : E * E);
      sb += t[4] * e * sind(t[0] * D + t[1] * M + t[2] * Mp + t[3] * F);
    }
    sl += 3958 * sind(A1) + 1962 * sind(Lp - F) + 318 * sind(A2);
    sb += -2235 * sind(Lp) + 382 * sind(A3) + 175 * sind(A1 - F) + 175 * sind(A1 + F) + 127 * sind(Lp - Mp) - 115 * sind(Lp + Mp);
    return { lon: rev(Lp + sl / 1e6), lat: sb / 1e6 };
  }
  function sunTropical(jd) { return Astro.tropicalLongitudes(jd).Sun; }

  /* ---------- sidereal helpers ---------- */
  function moonSid(jd) { return rev(moonTropical(jd).lon - Astro.lahiriAyanamsa(jd)); }
  function sunSid(jd) { return rev(sunTropical(jd) - Astro.lahiriAyanamsa(jd)); }
  function elong(jd) { return rev(moonTropical(jd).lon - sunTropical(jd)); }

  /** solve angleFn(jd) == target (deg, mod 360) for jd in [a,b] where angle increases through target */
  function solveAngle(angleFn, target, a, b) {
    var fa = wrap180(angleFn(a) - target);
    for (var i = 0; i < 48; i++) {
      var m = (a + b) / 2, fm = wrap180(angleFn(m) - target);
      if (fm < 0) a = m; else b = m;
    }
    return (a + b) / 2;
  }
  /** first jd after `jd` at which angleFn reaches the next multiple of `unit` */
  function nextBoundary(angleFn, unit, jd, span) {
    var cur = angleFn(jd);
    var target = (Math.floor(cur / unit) + 1) * unit;
    // bracket: coarse forward scan so we never skip over a boundary
    var step = span / 24, a = jd, b = jd + step;
    for (var i = 0; i < 24; i++) {
      var d = wrap180(angleFn(b) - target);
      if (d >= 0 && wrap180(angleFn(a) - target) < 0) return solveAngle(angleFn, rev(target), a, b);
      a = b; b += step;
    }
    return solveAngle(angleFn, rev(target), jd, jd + span);
  }
  function sumSid(jd) { return rev(moonSid(jd) + sunSid(jd)); }

  /* ---------- rise / set ---------- */
  function gmstDeg(jd) { var T = (jd - 2451545.0) / 36525; return rev(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T); }
  function eclToEq(lon, lat, jd) {
    var T = (jd - 2451545.0) / 36525, eps = 23.4392911 - 0.0130042 * T;
    var ra = Math.atan2(sind(lon) * cosd(eps) - Math.tan(lat * D2R) * sind(eps), cosd(lon)) * R2D;
    var dec = Math.asin(sind(lat) * cosd(eps) + cosd(lat) * sind(eps) * sind(lon)) * R2D;
    return { ra: rev(ra), dec: dec };
  }
  function altitude(body, jd, lat, lon) {
    var eq = body === 'sun' ? eclToEq(sunTropical(jd), 0, jd) : (function () { var m = moonTropical(jd); return eclToEq(m.lon, m.lat, jd); })();
    var H = gmstDeg(jd) + lon - eq.ra;
    return Math.asin(sind(lat) * sind(eq.dec) + cosd(lat) * cosd(eq.dec) * cosd(H)) * R2D;
  }
  var H0 = { sun: -0.8333, moon: 0.125 };   // upper limb + refraction; moon incl. parallax
  /** rise & set events within [jd0, jd0+span days] */
  function riseSet(body, jd0, span, lat, lon) {
    var rises = [], sets = [], step = 10 / 1440, h0 = H0[body];
    var a = jd0, fa = altitude(body, a, lat, lon) - h0;
    for (var t = jd0 + step; t <= jd0 + span + 1e-9; t += step) {
      var fb = altitude(body, t, lat, lon) - h0;
      if ((fa < 0) !== (fb < 0)) {
        var lo = a, hi = t, flo = fa;
        for (var i = 0; i < 30; i++) {
          var m = (lo + hi) / 2, fm = altitude(body, m, lat, lon) - h0;
          if ((fm < 0) === (flo < 0)) { lo = m; flo = fm; } else hi = m;
        }
        ((fb >= 0) ? rises : sets).push((lo + hi) / 2);
      }
      a = t; fa = fb;
    }
    return { rises: rises, sets: sets };
  }

  /* ---------- date/time utils ---------- */
  function jdFromLocal(y, m, d, hour, tz) { return Astro.julianDay(y, m, d, hour - tz); }
  function localHours(jd, y, m, d, tz) { return (jd - Astro.julianDay(y, m, d, -tz)) * 24; }   // hours since local midnight of (y,m,d)
  function fmtHM(h) {
    if (h == null || isNaN(h)) return '—';
    var extra = '', hh = h;
    var s = Math.round(hh * 60);                     // minutes
    var day = Math.floor(s / 1440); s -= day * 1440;
    var H = Math.floor(s / 60), M = s % 60;
    var ap = H >= 12 ? 'PM' : 'AM', h12 = H % 12 === 0 ? 12 : H % 12;
    if (day > 0) extra = ' (+' + day + 'd)'; else if (day < 0) extra = ' (−' + (-day) + 'd)';
    return (h12 < 10 ? '0' : '') + h12 + ':' + (M < 10 ? '0' : '') + M + ' ' + ap + extra;
  }
  function addDays(y, m, d, n) { var t = new Date(Date.UTC(y, m - 1, d + n)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
  function weekday(y, m, d) { return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }

  /* ---------- new moon / month ---------- */
  function newMoonNear(jd) {
    var t = jd;
    for (var i = 0; i < 8; i++) { var f = wrap180(elong(t)); t -= f / 12.19; }
    return t;
  }
  function lunarMonth(jd) {
    var e = elong(jd);
    var nm1 = newMoonNear(jd - e / 12.19 - 0.5);      // new moon at/just before jd
    if (nm1 > jd) nm1 = newMoonNear(nm1 - 29.5);
    var nm2 = newMoonNear(nm1 + 29.53);
    var s1 = Math.floor(sunSid(nm1) / 30) % 12, s2 = Math.floor(sunSid(nm2) / 30) % 12;
    var adhika = (s1 === s2);
    var idx = (s1 + 1) % 12;
    return { idx: idx, adhika: adhika, start: nm1, end: nm2 };
  }

  /* ---------- segments of an element between two instants ---------- */
  function segmentsOf(angleFn, unit, nameFn, jdA, jdB, span) {
    var out = [], t = jdA;
    var idx = Math.floor(angleFn(t) / unit) % Math.round(360 / unit);
    while (t < jdB) {
      var end = nextBoundary(angleFn, unit, t, span);
      out.push({ index: idx, name: nameFn(idx), endJD: end, startJD: t });
      if (end >= jdB) break;
      t = end + 1e-6; idx = (idx + 1) % Math.round(360 / unit);
    }
    return out;
  }
  function tithiName(i) {   // i 0..29
    if (i === 14) return 'पूर्णिमा';
    if (i === 29) return 'अमावस्या';
    return TITHI[i % 15];
  }
  function karanaName(k) {  // k 0..59
    if (k === 0) return 'किंस्तुघ्न';
    if (k >= 57) return ['शकुनि', 'चतुष्पद', 'नाग'][k - 57];
    return KARANA_REP[(k - 1) % 7];
  }

  /* ---------- main ---------- */
  /**
   * opts = { y, m, d, lat, lon, tz, place }
   * returns all Panchang elements for the civil day (sunrise-to-sunrise basis).
   */
  function compute(o) {
    var y = o.y, m = o.m, d = o.d, lat = o.lat, lon = o.lon, tz = o.tz;
    var jdMid = jdFromLocal(y, m, d, 0, tz);
    var sunEv = riseSet('sun', jdMid, 1, lat, lon);
    var sr = sunEv.rises[0], ss = sunEv.sets[0];
    var next = addDays(y, m, d, 1), jdMid2 = jdFromLocal(next.y, next.m, next.d, 0, tz);
    var sr2 = riseSet('sun', jdMid2, 1, lat, lon).rises[0];
    if (sr == null || ss == null) { return { error: 'इस स्थान पर इस दिन सूर्योदय/सूर्यास्त की गणना संभव नहीं (ध्रुवीय क्षेत्र)।' }; }

    var wd = weekday(y, m, d);
    var dayLen = (ss - sr), nightLen = (sr2 - ss);
    var L = function (jd) { return localHours(jd, y, m, d, tz); };
    var seg = function (jdA, jdB) { return { start: L(jdA), end: L(jdB), startJD: jdA, endJD: jdB }; };

    // elements prevailing at sunrise, with transitions until next sunrise
    var tithis = segmentsOf(elong, 12, tithiName, sr, sr2, 1.8);
    var naks = segmentsOf(function (j) { return moonSid(j); }, 40 / 3, function (i) { return NAK[i]; }, sr, sr2, 1.8);
    var yogas = segmentsOf(sumSid, 40 / 3, function (i) { return YOGA[i]; }, sr, sr2, 1.8);
    var karanas = segmentsOf(elong, 6, karanaName, sr, sr2, 1.2);
    // pada of the nakshatra at sunrise
    var mAtSr = moonSid(sr);
    var pada = Math.floor((mAtSr - naks[0].index * (40 / 3)) / (10 / 3)) + 1;

    var t0 = tithis[0];
    var paksha = t0.index < 15 ? 'शुक्ल' : 'कृष्ण';
    var tithiNo = (t0.index % 15) + 1;
    var lm = lunarMonth(sr);
    var amanta = MASA[lm.idx];
    var purni = (t0.index >= 15) ? MASA[(lm.idx + 1) % 12] : amanta;     // Purnimanta (North India)
    var vs = (lm.idx >= 9 && m <= 6) ? y + 56 : y + 57;

    // Rahu kaal etc. (day divided in 8)
    var seg8 = dayLen / 8;
    function part(n) { return seg(sr + (n - 1) * seg8, sr + n * seg8); }
    var rahu = part(RAHU_SEG[wd]), yama = part(YAMA_SEG[wd]), gulika = part(GULIKA_SEG[wd]);
    // Abhijit: 8th of 15 muhurtas of day
    var mu = dayLen / 15;
    var abhijit = seg(sr + 7 * mu, sr + 8 * mu);
    var brahma = seg(sr - 96 / 1440, sr - 48 / 1440);
    var pratah = seg(sr - 48 / 1440, sr);   // "Pratah Sandhya"
    var godhuli = seg(ss - 24 / 1440, ss + 24 / 1440);
    var nishita = seg(ss + nightLen / 2 - 24 / 1440, ss + nightLen / 2 + 24 / 1440);

    // Choghadiya
    var chog = [], i, cd = dayLen / 8, cn = nightLen / 8;
    for (i = 0; i < 8; i++) {
      var nm = CHOG_CYCLE[(CHOG_DAY0[wd] + i) % 7];
      chog.push({ name: nm, night: false, good: CHOG_GOOD[nm] || 0, start: L(sr + i * cd), end: L(sr + (i + 1) * cd) });
    }
    for (i = 0; i < 8; i++) {
      var nn = CHOG_CYCLE[(CHOG_NIGHT0[wd] + i) % 7];
      chog.push({ name: nn, night: true, good: CHOG_GOOD[nn] || 0, start: L(ss + i * cn), end: L(ss + (i + 1) * cn) });
    }

    // Moon
    var ev = riseSet('moon', jdMid, 1.5, lat, lon);
    var mr = ev.rises.length ? ev.rises[0] : null;
    var ms = ev.sets.length ? ev.sets[0] : null;

    // Bhadra (Vishti karana) windows in the day
    var bhadra = karanas.filter(function (k) { return k.index !== 0 && k.index < 57 && (k.index - 1) % 7 === 6; })
      .map(function (k) { return { start: L(k.startJD), end: L(k.endJD) }; });

    // Planet signs at sunrise
    var sunRashi = Math.floor(sunSid(sr) / 30) % 12, moonRashi = Math.floor(mAtSr / 30) % 12;
    var moonRashiEnd = nextBoundary(moonSid, 30, sr, 4);

    // auspicious / inauspicious summary (computed rules only)
    var notes = [];
    if (YOGA_BAD[yogas[0].index]) notes.push({ good: false, text: 'आज का योग ' + yogas[0].name + ' सामान्यतः अशुभ माना जाता है।' });
    if (bhadra.length) notes.push({ good: false, text: 'भद्रा (विष्टि करण) काल में शुभ कार्य वर्जित माने जाते हैं।' });
    if ([8, 9, 17, 18, 26, 0].indexOf(naks[0].index) !== -1) notes.push({ good: false, text: 'गण्डमूल नक्षत्र (' + naks[0].name + ') — इसमें जन्म/आरंभ हेतु शांति का विधान है।' });
    if (wd === 3) notes.push({ good: false, text: 'बुधवार को अभिजित मुहूर्त कई परंपराओं में वर्जित है।' });
    if ([0, 1].indexOf(0) >= 0 && ([1, 2, 4, 6, 10, 12].indexOf(t0.index % 15) === -1)) { /* placeholder: no rule */ }
    var siddha = (wd === 0 && naks[0].index === 12) || (wd === 1 && naks[0].index === 21) || (wd === 2 && naks[0].index === 0) || (wd === 3 && naks[0].index === 16) || (wd === 4 && naks[0].index === 26) || (wd === 5 && naks[0].index === 6) || (wd === 6 && naks[0].index === 3);
    if (siddha) notes.push({ good: true, text: 'सर्वार्थ सिद्धि योग (वार-नक्षत्र संयोग) — शुभ कार्यों के लिए अनुकूल।' });
    if (t0.index % 15 === 10) notes.push({ good: true, text: 'एकादशी — व्रत एवं विष्णु-आराधना का दिन।' });
    if (t0.index === 14) notes.push({ good: true, text: 'पूर्णिमा — सत्यनारायण कथा, दान-स्नान हेतु शुभ।' });
    if (t0.index === 29) notes.push({ good: true, text: 'अमावस्या — पितृ-तर्पण, दान एवं स्नान का विधान।' });

    return {
      input: o,
      date: { y: y, m: m, d: d, weekday: wd, vara: VARA[wd], varaEn: VARA_EN[wd], varaLord: VARA_LORD[wd] },
      sunrise: L(sr), sunset: L(ss), nextSunrise: L(sr2),
      moonrise: mr == null ? null : L(mr), moonset: ms == null ? null : L(ms),
      dayLength: dayLen * 24, nightLength: nightLen * 24,
      tithi: { index: t0.index, no: tithiNo, name: t0.name, end: L(t0.endJD), all: tithis.map(function (s) { return { name: s.name, end: L(s.endJD), index: s.index }; }) },
      paksha: paksha,
      nakshatra: { index: naks[0].index, name: naks[0].name, pada: pada, end: L(naks[0].endJD), all: naks.map(function (s) { return { name: s.name, end: L(s.endJD), index: s.index }; }) },
      yoga: { index: yogas[0].index, name: yogas[0].name, bad: !!YOGA_BAD[yogas[0].index], end: L(yogas[0].endJD), all: yogas.map(function (s) { return { name: s.name, end: L(s.endJD), index: s.index }; }) },
      karana: { index: karanas[0].index, name: karanas[0].name, end: L(karanas[0].endJD), all: karanas.map(function (s) { return { name: s.name, end: L(s.endJD), index: s.index }; }) },
      masa: { amanta: amanta, purnimanta: purni, adhika: lm.adhika, amantaIdx: lm.idx, en: MASA_EN[lm.idx], note: lm.adhika ? 'अधिक मास' : '' },
      samvat: { vikram: vs, shaka: vs - 135 },
      sunRashi: Astro.RASHI[sunRashi], moonRashi: Astro.RASHI[moonRashi], moonRashiIdx: moonRashi, moonRashiEnd: L(moonRashiEnd),
      rahu: rahu, yamaganda: yama, gulika: gulika, abhijit: abhijit, brahma: brahma, pratahSandhya: pratah, godhuli: godhuli, nishita: nishita,
      bhadra: bhadra, choghadiya: chog, notes: notes
    };
  }

  global.Panchang = {
    compute: compute, fmtHM: fmtHM, addDays: addDays, weekday: weekday,
    moonTropical: moonTropical, sunTropical: sunTropical, moonSid: moonSid, sunSid: sunSid, elong: elong,
    lunarMonth: lunarMonth, newMoonNear: newMoonNear, riseSet: riseSet, jdFromLocal: jdFromLocal,
    TITHI: TITHI, YOGA: YOGA, VARA: VARA, MASA: MASA, tithiName: tithiName, karanaName: karanaName
  };
})(typeof window !== 'undefined' ? window : global);
