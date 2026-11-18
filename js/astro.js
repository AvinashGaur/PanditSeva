/* ============================================================================
   astro.js — Vedic (Sidereal / Lahiri) Astronomy Engine for PanditSeva.in
   ----------------------------------------------------------------------------
   Purpose: compute REAL planetary positions from birth date/time/place.
   NO fabricated data. All positions are calculated using standard astronomical
   algorithms (Paul Schlyter's orbital-element method + Meeus-derived formulae),
   then converted to sidereal using the Lahiri ayanamsa.

   Accuracy note: suitable for Rashi / Nakshatra / Dasha / Dosha level astrology
   (typical error ~1-3 arc-minutes). It is an AUTOMATED calculation, not a
   substitute for a qualified Jyotishi's personally verified chart.

   Exposes a global `Astro` object with Astro.compute(birth).
   ========================================================================== */
(function (global) {
  'use strict';

  // ---- trig helpers (degrees) ----
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  function sind(x) { return Math.sin(x * D2R); }
  function cosd(x) { return Math.cos(x * D2R); }
  function tand(x) { return Math.tan(x * D2R); }
  function asind(x) { return Math.asin(x) * R2D; }
  function atan2d(y, x) { return Math.atan2(y, x) * R2D; }
  function rev(x) { return x - Math.floor(x / 360) * 360; } // 0..360

  // ---- reference data (Hindi) ----
  var RASHI = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन'];
  var RASHI_EN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  var RASHI_LORD = ['मंगल', 'शुक्र', 'बुध', 'चंद्र', 'सूर्य', 'बुध', 'शुक्र', 'मंगल', 'गुरु', 'शनि', 'शनि', 'गुरु'];

  var NAK = ['अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा', 'आर्द्रा', 'पुनर्वसु', 'पुष्य', 'आश्लेषा',
    'मघा', 'पूर्वा फाल्गुनी', 'उत्तरा फाल्गुनी', 'हस्त', 'चित्रा', 'स्वाति', 'विशाखा', 'अनुराधा', 'ज्येष्ठा',
    'मूल', 'पूर्वाषाढ़ा', 'उत्तराषाढ़ा', 'श्रवण', 'धनिष्ठा', 'शतभिषा', 'पूर्वा भाद्रपद', 'उत्तरा भाद्रपद', 'रेवती'];

  // Planet names / abbreviations (chart)
  var PL = {
    Sun: { hi: 'सूर्य', ab: 'सू', en: 'Sun' },
    Moon: { hi: 'चंद्र', ab: 'चं', en: 'Moon' },
    Mars: { hi: 'मंगल', ab: 'मं', en: 'Mars' },
    Mercury: { hi: 'बुध', ab: 'बु', en: 'Mercury' },
    Jupiter: { hi: 'गुरु', ab: 'गु', en: 'Jupiter' },
    Venus: { hi: 'शुक्र', ab: 'शु', en: 'Venus' },
    Saturn: { hi: 'शनि', ab: 'श', en: 'Saturn' },
    Rahu: { hi: 'राहु', ab: 'रा', en: 'Rahu' },
    Ketu: { hi: 'केतु', ab: 'के', en: 'Ketu' },
    Lagna: { hi: 'लग्न', ab: 'ल', en: 'Ascendant' }
  };
  var PLANET_ORDER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

  // Vimshottari dasha
  var DASHA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  var DASHA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };

  // ---- Julian Day from calendar (UT) ----
  // y,m,d integers; utHours = decimal hours in UT
  function julianDay(y, m, d, utHours) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4); // Gregorian
    var jd0 = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
    return jd0 + utHours / 24;
  }

  // ---- Lahiri ayanamsa (degrees) ----
  // ~23.853° at J2000, precession 50.2388475"/yr
  function lahiriAyanamsa(jd) {
    var years = (jd - 2451545.0) / 365.25;
    return 23.853 + years * (50.2388475 / 3600);
  }

  // Solve Kepler: returns eccentric anomaly E (deg)
  function kepler(M, e) {
    M = rev(M);
    var E = M + R2D * e * sind(M) * (1 + e * cosd(M));
    for (var i = 0; i < 8; i++) {
      var dE = (E - R2D * e * sind(E) - M) / (1 - e * cosd(E));
      E -= dE;
      if (Math.abs(dE) < 1e-7) break;
    }
    return E;
  }

  // Heliocentric -> returns {lon, r, xh, yh, zh} geocentric-ecliptic rectangular pending sun add
  function helio(el) {
    var E = kepler(el.M, el.e);
    var xv = el.a * (cosd(E) - el.e);
    var yv = el.a * Math.sqrt(1 - el.e * el.e) * sind(E);
    var v = atan2d(yv, xv);
    var r = Math.sqrt(xv * xv + yv * yv);
    var vw = v + el.w;
    var xh = r * (cosd(el.N) * cosd(vw) - sind(el.N) * sind(vw) * cosd(el.i));
    var yh = r * (sind(el.N) * cosd(vw) + cosd(el.N) * sind(vw) * cosd(el.i));
    var zh = r * (sind(vw) * sind(el.i));
    return { v: v, r: r, xh: xh, yh: yh, zh: zh };
  }

  // Compute all geocentric tropical ecliptic longitudes
  function tropicalLongitudes(jd) {
    var d = jd - 2451543.5; // Schlyter epoch (2000 Jan 0.0)

    // Sun
    var ws = 282.9404 + 4.70935e-5 * d;
    var es = 0.016709 - 1.151e-9 * d;
    var Ms = rev(356.0470 + 0.9856002585 * d);
    var Es = kepler(Ms, es);
    var xvs = cosd(Es) - es;
    var yvs = Math.sqrt(1 - es * es) * sind(Es);
    var vs = atan2d(yvs, xvs);
    var rs = Math.sqrt(xvs * xvs + yvs * yvs);
    var lonsun = rev(vs + ws);
    var xs = rs * cosd(lonsun);
    var ys = rs * sind(lonsun);

    var out = {};
    out.Sun = rev(lonsun);

    // Moon
    var moonEl = {
      N: 125.1228 - 0.0529538083 * d, i: 5.1454,
      w: 318.0634 + 0.1643573223 * d, a: 60.2666,
      e: 0.054900, M: 115.3654 + 13.0649929509 * d
    };
    var mh = helio(moonEl);
    var moonLon = atan2d(mh.yh, mh.xh); // geocentric already
    // Moon perturbations
    var Lm = rev(moonEl.N + moonEl.w + moonEl.M);
    var Ls = rev(ws + Ms);
    var Dm = rev(Lm - Ls);
    var F = rev(Lm - moonEl.N);
    var Mm = rev(moonEl.M);
    var pert =
      -1.274 * sind(Mm - 2 * Dm)
      + 0.658 * sind(2 * Dm)
      - 0.186 * sind(Ms)
      - 0.059 * sind(2 * Mm - 2 * Dm)
      - 0.057 * sind(Mm - 2 * Dm + Ms)
      + 0.053 * sind(Mm + 2 * Dm)
      + 0.046 * sind(2 * Dm - Ms)
      + 0.041 * sind(Mm - Ms)
      - 0.035 * sind(Dm)
      - 0.031 * sind(Mm + Ms)
      - 0.015 * sind(2 * F - 2 * Dm)
      + 0.011 * sind(Mm - 4 * Dm);
    out.Moon = rev(moonLon + pert);

    // Planets
    var planets = {
      Mercury: { N: 48.3313 + 3.24587e-5 * d, i: 7.0047 + 5.00e-8 * d, w: 29.1241 + 1.01444e-5 * d, a: 0.387098, e: 0.205635 + 5.59e-10 * d, M: 168.6562 + 4.0923344368 * d },
      Venus: { N: 76.6799 + 2.46590e-5 * d, i: 3.3946 + 2.75e-8 * d, w: 54.8910 + 1.38374e-5 * d, a: 0.723330, e: 0.006773 - 1.302e-9 * d, M: 48.0052 + 1.6021302244 * d },
      Mars: { N: 49.5574 + 2.11081e-5 * d, i: 1.8497 - 1.78e-8 * d, w: 286.5016 + 2.92961e-5 * d, a: 1.523688, e: 0.093405 + 2.516e-9 * d, M: 18.6021 + 0.5240207766 * d },
      Jupiter: { N: 100.4542 + 2.76854e-5 * d, i: 1.3030 - 1.557e-7 * d, w: 273.8777 + 1.64505e-5 * d, a: 5.20256, e: 0.048498 + 4.469e-9 * d, M: 19.8950 + 0.0830853001 * d },
      Saturn: { N: 113.6634 + 2.38980e-5 * d, i: 2.4886 - 1.081e-7 * d, w: 339.3939 + 2.97661e-5 * d, a: 9.55475, e: 0.055546 - 9.499e-9 * d, M: 316.9670 + 0.0334442282 * d }
    };
    var Mj = rev(planets.Jupiter.M), Msa = rev(planets.Saturn.M);
    for (var name in planets) {
      var h = helio(planets[name]);
      var xg = h.xh + xs, yg = h.yh + ys;
      var lon = rev(atan2d(yg, xg));
      // major perturbations for Jupiter & Saturn
      if (name === 'Jupiter') {
        lon += (-0.332 * sind(2 * Mj - 5 * Msa - 67.6)
          - 0.056 * sind(2 * Mj - 2 * Msa + 21)
          + 0.042 * sind(3 * Mj - 5 * Msa + 21)
          - 0.036 * sind(Mj - 2 * Msa)
          + 0.022 * cosd(Mj - Msa)
          + 0.023 * sind(2 * Mj - 3 * Msa + 52)
          - 0.016 * sind(Mj - 5 * Msa - 69));
      } else if (name === 'Saturn') {
        lon += (0.812 * sind(2 * Mj - 5 * Msa - 67.6)
          - 0.229 * cosd(2 * Mj - 4 * Msa - 2)
          + 0.119 * sind(Mj - 2 * Msa - 3)
          + 0.046 * sind(2 * Mj - 6 * Msa - 69)
          + 0.014 * sind(Mj - 3 * Msa + 32));
      }
      out[name] = rev(lon);
    }

    // Rahu / Ketu (mean lunar node)
    var T = (jd - 2451545.0) / 36525;
    var omega = rev(125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000);
    out.Rahu = rev(omega);
    out.Ketu = rev(omega + 180);

    return out;
  }

  // Ascendant (tropical) from JD(UT), geographic lat & lon(east +)
  function ascendantTropical(jd, lat, lonEast) {
    var T = (jd - 2451545.0) / 36525;
    var gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
      + 0.000387933 * T * T - (T * T * T) / 38710000;
    gmst = rev(gmst);
    var lst = rev(gmst + lonEast);          // local sidereal time (deg) = RAMC
    var eps = 23.4392911 - 0.0130042 * T - 1.64e-7 * T * T; // obliquity
    var ramc = lst;
    var asc = atan2d(cosd(ramc), -(sind(ramc) * cosd(eps) + tand(lat) * sind(eps)));
    return rev(asc);
  }

  // Build per-planet descriptor from a sidereal longitude
  function describe(key, sidLon, lagnaSign) {
    var sign = Math.floor(sidLon / 30) % 12;
    var degInSign = sidLon - sign * 30;
    var nakIndex = Math.floor(sidLon / (40 / 3)) % 27; // 13°20' = 40/3
    var posInNak = sidLon - nakIndex * (40 / 3);
    var pada = Math.floor(posInNak / (10 / 3)) + 1; // each pada 3°20'
    var navSign = Math.floor(sidLon / (10 / 3)) % 12; // continuous navamsa
    var house = ((sign - lagnaSign + 12) % 12) + 1;
    return {
      key: key,
      hi: PL[key] ? PL[key].hi : key,
      ab: PL[key] ? PL[key].ab : key,
      en: PL[key] ? PL[key].en : key,
      lon: sidLon,
      sign: sign,
      signHi: RASHI[sign],
      signEn: RASHI_EN[sign],
      degInSign: degInSign,
      dms: toDMS(degInSign),
      nak: nakIndex,
      nakHi: NAK[nakIndex],
      pada: pada,
      navSign: navSign,
      navSignHi: RASHI[navSign],
      house: house
    };
  }

  function toDMS(deg) {
    var d = Math.floor(deg);
    var mf = (deg - d) * 60;
    var m = Math.floor(mf);
    var s = Math.round((mf - m) * 60);
    if (s === 60) { s = 0; m++; }
    if (m === 60) { m = 0; d++; }
    return d + '° ' + m + "' " + s + '"';
  }

  // ---- Vimshottari Dasha ----
  function buildDasha(moonSidLon, birthJD, nowJD) {
    var nakIndex = Math.floor(moonSidLon / (40 / 3)) % 27;
    var posInNak = moonSidLon - nakIndex * (40 / 3);
    var frac = posInNak / (40 / 3);                 // fraction traversed
    var lordIdx = nakIndex % 9;
    var startLord = DASHA_ORDER[lordIdx];
    var balance = (1 - frac) * DASHA_YEARS[startLord]; // years remaining of first dasha

    var YEAR_DAYS = 365.2425;
    var seq = [];
    var cursorJD = birthJD - frac * DASHA_YEARS[startLord] * YEAR_DAYS; // start of first maha
    for (var n = 0; n < 11; n++) {
      var lord = DASHA_ORDER[(lordIdx + n) % 9];
      var years = DASHA_YEARS[lord];
      var startJD = cursorJD;
      var endJD = startJD + years * YEAR_DAYS;
      // Antardashas
      var antars = [];
      var aCursor = startJD;
      for (var k = 0; k < 9; k++) {
        var aLord = DASHA_ORDER[(DASHA_ORDER.indexOf(lord) + k) % 9];
        var aYears = years * DASHA_YEARS[aLord] / 120;
        antars.push({ lord: aLord, lordHi: PL[aLord].hi, startJD: aCursor, endJD: aCursor + aYears * YEAR_DAYS });
        aCursor += aYears * YEAR_DAYS;
      }
      seq.push({ lord: lord, lordHi: PL[lord].hi, years: years, startJD: startJD, endJD: endJD, antars: antars });
      cursorJD = endJD;
    }

    // find current maha & antar
    var current = null, currentAntar = null;
    for (var i = 0; i < seq.length; i++) {
      if (nowJD >= seq[i].startJD && nowJD < seq[i].endJD) {
        current = seq[i];
        for (var j = 0; j < seq[i].antars.length; j++) {
          if (nowJD >= seq[i].antars[j].startJD && nowJD < seq[i].antars[j].endJD) {
            currentAntar = seq[i].antars[j]; break;
          }
        }
        break;
      }
    }
    return {
      startLord: startLord, startLordHi: PL[startLord].hi,
      balanceYears: balance, sequence: seq,
      current: current, currentAntar: currentAntar
    };
  }

  function jdToDate(jd) {
    var z = Math.floor(jd + 0.5);
    var f = jd + 0.5 - z;
    var A = z;
    if (z >= 2299161) {
      var alpha = Math.floor((z - 1867216.25) / 36524.25);
      A = z + 1 + alpha - Math.floor(alpha / 4);
    }
    var B = A + 1524;
    var C = Math.floor((B - 122.1) / 365.25);
    var D = Math.floor(365.25 * C);
    var E = Math.floor((B - D) / 30.6001);
    var day = B - D - Math.floor(30.6001 * E) + f;
    var month = (E < 14) ? E - 1 : E - 13;
    var year = (month > 2) ? C - 4716 : C - 4715;
    return { y: year, m: month, d: Math.floor(day) };
  }

  // ---- Main ----
  // birth = { name, y, m, d, hour, minute, tz (hours, e.g. 5.5), lat, lon, place }
  function compute(birth) {
    var utHours = (birth.hour + birth.minute / 60) - birth.tz;
    var jd = julianDay(birth.y, birth.m, birth.d, utHours);
    var ayan = lahiriAyanamsa(jd);

    var trop = tropicalLongitudes(jd);
    var ascTrop = ascendantTropical(jd, birth.lat, birth.lon);
    var ascSid = rev(ascTrop - ayan);
    var lagnaSign = Math.floor(ascSid / 30) % 12;

    var planets = {};
    PLANET_ORDER.forEach(function (k) {
      var sid = rev(trop[k] - ayan);
      planets[k] = describe(k, sid, lagnaSign);
    });
    var lagna = describe('Lagna', ascSid, lagnaSign);

    // retrograde flag (compare with position 1 day later; Rahu/Ketu always retro)
    var jd2 = jd + 1;
    var trop2 = tropicalLongitudes(jd2);
    PLANET_ORDER.forEach(function (k) {
      if (k === 'Rahu' || k === 'Ketu') { planets[k].retro = true; return; }
      if (k === 'Sun' || k === 'Moon') { planets[k].retro = false; return; }
      var diff = rev(trop2[k] - trop[k]);
      planets[k].retro = (diff > 180); // moving backward
    });

    // houses: which planets sit in each sign/house (whole-sign)
    var houses = [];
    for (var h = 1; h <= 12; h++) {
      var signIdx = (lagnaSign + h - 1) % 12;
      houses.push({ house: h, sign: signIdx, signHi: RASHI[signIdx], signEn: RASHI_EN[signIdx], lord: RASHI_LORD[signIdx], planets: [] });
    }
    PLANET_ORDER.forEach(function (k) {
      houses[planets[k].house - 1].planets.push(planets[k]);
    });

    // Dasha
    var nowJD = birth.nowJD || julianDay(
      (new Date()).getUTCFullYear(),
      (new Date()).getUTCMonth() + 1,
      (new Date()).getUTCDate(),
      (new Date()).getUTCHours() + (new Date()).getUTCMinutes() / 60
    );
    var dasha = buildDasha(planets.Moon.lon, jd, nowJD);

    // ---- Doshas ----
    // Manglik: Mars in house 1,2,4,7,8,12 from Lagna (also check from Moon)
    var marsHouse = planets.Mars.house;
    var manglikHouses = [1, 2, 4, 7, 8, 12];
    var moonSign = planets.Moon.sign;
    var marsHouseFromMoon = ((planets.Mars.sign - moonSign + 12) % 12) + 1;
    var manglik = manglikHouses.indexOf(marsHouse) !== -1;
    var manglikFromMoon = manglikHouses.indexOf(marsHouseFromMoon) !== -1;

    // Kaal Sarp: all 7 planets between Rahu and Ketu
    var rahuLon = planets.Rahu.lon;
    var allBetween1 = true, allBetween2 = true;
    ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].forEach(function (k) {
      var rel = rev(planets[k].lon - rahuLon);
      if (!(rel > 0 && rel < 180)) allBetween1 = false;
      if (!(rel > 180 && rel < 360)) allBetween2 = false;
    });
    var kaalSarp = allBetween1 || allBetween2;

    // Sade Sati: current transit Saturn sign vs natal Moon sign
    var transitSatSid = rev(trop[ 'Saturn' ]); // natal... need current
    var curTrop = tropicalLongitudes(nowJD);
    var curSatSign = Math.floor(rev(curTrop.Saturn - lahiriAyanamsa(nowJD)) / 30) % 12;
    var diffSat = ((curSatSign - moonSign) + 12) % 12;
    var sadeSati = (diffSat === 11 || diffSat === 0 || diffSat === 1);
    var sadeSatiPhase = diffSat === 11 ? 'पहला चरण (12वें भाव में शनि)'
      : diffSat === 0 ? 'दूसरा / शिखर चरण (चंद्र राशि में शनि)'
        : diffSat === 1 ? 'तीसरा चरण (2रे भाव में शनि)' : null;

    // ---- Yogas (common) ----
    var yogas = [];
    // Gajakesari: Jupiter in kendra (1,4,7,10) from Moon
    var jupFromMoon = ((planets.Jupiter.sign - moonSign + 12) % 12) + 1;
    if ([1, 4, 7, 10].indexOf(jupFromMoon) !== -1) yogas.push('गजकेसरी योग');
    // Budh-Aditya: Sun + Mercury same sign
    if (planets.Sun.sign === planets.Mercury.sign) yogas.push('बुधादित्य योग');
    // Chandra-Mangal: Moon + Mars same sign
    if (planets.Moon.sign === planets.Mars.sign) yogas.push('चंद्र-मंगल योग');
    // Chandra in kendra from Lagna gives Kemadruma relief check (simplified)
    // Kemadruma: no planet 2nd/12th from Moon (excl Sun/nodes)
    var kema = true;
    ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].forEach(function (k) {
      var rel = ((planets[k].sign - moonSign + 12) % 12);
      if (rel === 1 || rel === 11) kema = false;
    });
    if (kema) yogas.push('केमद्रुम योग (चंद्र निर्बल)');

    return {
      birth: birth,
      nowJD: nowJD,
      jd: jd,
      ayanamsa: ayan,
      lagna: lagna,
      lagnaSign: lagnaSign,
      planets: planets,
      planetOrder: PLANET_ORDER,
      houses: houses,
      dasha: dasha,
      doshas: {
        manglik: manglik, manglikFromMoon: manglikFromMoon, marsHouse: marsHouse,
        kaalSarp: kaalSarp,
        sadeSati: sadeSati, sadeSatiPhase: sadeSatiPhase, transitSaturnSign: RASHI[curSatSign]
      },
      yogas: yogas,
      ref: { RASHI: RASHI, RASHI_EN: RASHI_EN, RASHI_LORD: RASHI_LORD, NAK: NAK, PL: PL }
    };
  }

  /* ==========================================================================
     ENRICHMENT (fork D): dignity, combustion, aspects, divisional charts (D10),
     Chandra chart, extended yogas, Manglik/KaalSarp/SadeSati detail, pratyantar.
     All derived by rule from the computed positions above — nothing invented.
     Simplifications (stated in the UI): natural (naisargika) friendship only,
     whole-sign houses, mean lunar node, graha-drishti by house count.
     ========================================================================== */
  var LORD_KEY = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  var EXALT = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  var OWN = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
  var MOOLA = { Sun: [4, 0, 20], Moon: [1, 3, 30], Mars: [0, 0, 12], Mercury: [5, 16, 20], Jupiter: [8, 0, 10], Venus: [6, 0, 15], Saturn: [10, 0, 20] };
  var FRIENDS = {
    Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'], Mars: ['Sun', 'Moon', 'Jupiter'],
    Mercury: ['Sun', 'Venus'], Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mercury', 'Venus']
  };
  var ENEMIES = {
    Sun: ['Venus', 'Saturn'], Moon: [], Mars: ['Mercury'], Mercury: ['Moon'],
    Jupiter: ['Mercury', 'Venus'], Venus: ['Sun', 'Moon'], Saturn: ['Sun', 'Moon', 'Mars']
  };
  var COMBUST_ORB = { Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 15 };
  var SEVEN = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  var ASPECT_N = { Sun: [7], Moon: [7], Mars: [4, 7, 8], Mercury: [7], Jupiter: [5, 7, 9], Venus: [7], Saturn: [3, 7, 10], Rahu: [5, 7, 9], Ketu: [5, 7, 9] };
  var DIGNITY_HI = { exalted: 'उच्च', moolatrikona: 'मूलत्रिकोण', own: 'स्वराशि', friend: 'मित्र राशि', neutral: 'सम राशि', enemy: 'शत्रु राशि', debilitated: 'नीच', node: '—' };
  var KS_TYPE = ['अनंत', 'कुलिक', 'वासुकी', 'शंखपाल', 'पद्म', 'महापद्म', 'तक्षक', 'कर्कोटक', 'शंखचूड़', 'घातक', 'विषधर', 'शेषनाग'];

  function signHouseFrom(fromSign, sign) { return ((sign - fromSign + 12) % 12) + 1; }
  function aspectHouses(house, key) {
    return (ASPECT_N[key] || [7]).map(function (n) { return ((house + n - 2) % 12) + 1; });
  }
  function dignityOf(key, sign, degInSign) {
    if (key === 'Rahu' || key === 'Ketu') return { code: 'node', hi: DIGNITY_HI.node };
    var code;
    if (EXALT[key] === sign) code = 'exalted';
    else if ((EXALT[key] + 6) % 12 === sign) code = 'debilitated';
    else {
      var mt = MOOLA[key];
      if (mt[0] === sign && degInSign >= mt[1] && degInSign < mt[2]) code = 'moolatrikona';
      else if (OWN[key].indexOf(sign) !== -1) code = 'own';
      else {
        var lord = LORD_KEY[sign];
        code = FRIENDS[key].indexOf(lord) !== -1 ? 'friend' : (ENEMIES[key].indexOf(lord) !== -1 ? 'enemy' : 'neutral');
      }
    }
    return { code: code, hi: DIGNITY_HI[code] };
  }
  function angDiff(a, b) { var x = Math.abs(rev(a) - rev(b)); return x > 180 ? 360 - x : x; }

  // ---- intervals where predicate(jd) holds, scanning [a,b] ----
  function intervalsWhere(pred, a, b, step, gapMerge) {
    var out = [], inside = false, st = 0, prev = a, t;
    function refine(lo, hi, wantTrue) {   // lo/hi have different pred values
      for (var i = 0; i < 24; i++) { var m = (lo + hi) / 2; if (pred(m) === wantTrue) hi = m; else lo = m; }
      return (lo + hi) / 2;
    }
    var pv = pred(a);
    if (pv) { inside = true; st = a; }
    for (t = a + step; t <= b + step; t += step) {
      var tt = Math.min(t, b), v = pred(tt);
      if (v && !inside) { st = refine(prev, tt, true); inside = true; }
      else if (!v && inside) { out.push([st, refine(prev, tt, false)]); inside = false; }
      prev = tt; if (tt >= b) break;
    }
    if (inside) out.push([st, b]);
    // merge intervals separated by short retrograde gaps
    var merged = [];
    out.forEach(function (iv) {
      var last = merged[merged.length - 1];
      if (last && iv[0] - last[1] < gapMerge) last[1] = iv[1]; else merged.push([iv[0], iv[1]]);
    });
    return merged;
  }
  function satSign(jd) { return Math.floor(rev(tropicalLongitudes(jd).Saturn - lahiriAyanamsa(jd)) / 30) % 12; }

  function dayToObj(jd) { return jdToDate(jd); }

  function enrich(d, birth) {
    var P = d.planets, lagnaSign = d.lagnaSign, moonSign = P.Moon.sign, k, i, j;
    var lagnaDeg = d.lagna.degInSign;

    /* houses: lord key, where the lord sits */
    d.houses.forEach(function (h) {
      h.lordKey = LORD_KEY[h.sign];
      h.lordHouse = P[h.lordKey].house;
      h.lordSignHi = P[h.lordKey].signHi;
      h.aspectedBy = [];
    });
    d.lagnaLord = LORD_KEY[lagnaSign];
    d.houseLord = function (n) { return LORD_KEY[(lagnaSign + n - 1) % 12]; };

    /* per-planet extras */
    d.planetOrder.forEach(function (key) {
      var p = P[key];
      p.houseFromMoon = signHouseFrom(moonSign, p.sign);
      var part = Math.floor(p.degInSign / 3);
      p.d10Sign = (p.sign % 2 === 0) ? (p.sign + part) % 12 : (p.sign + 8 + part) % 12;
      p.d10SignHi = RASHI[p.d10Sign];
      p.navSignHi = RASHI[p.navSign];
      p.dignity = dignityOf(key, p.sign, p.degInSign);
      p.lordOf = [];
      p.combust = false;
      if (COMBUST_ORB[key] != null) {
        var orb = COMBUST_ORB[key];
        if (key === 'Mercury' && p.retro) orb = 12;
        if (key === 'Venus' && p.retro) orb = 8;
        p.combustOrb = orb;
        p.combust = angDiff(p.lon, P.Sun.lon) < orb;
      }
      p.sunDistance = key === 'Sun' ? 0 : angDiff(p.lon, P.Sun.lon);
    });
    d.houses.forEach(function (h) { if (P[h.lordKey]) P[h.lordKey].lordOf.push(h.house); });
    var D10Lag = (d.lagna.sign % 2 === 0) ? (d.lagna.sign + Math.floor(lagnaDeg / 3)) % 12 : (d.lagna.sign + 8 + Math.floor(lagnaDeg / 3)) % 12;
    d.lagna.d10Sign = D10Lag; d.lagna.d10SignHi = RASHI[D10Lag];

    /* aspects (graha drishti) */
    var byPlanet = {}, byHouse = {}, nodeAspects = {};
    for (i = 1; i <= 12; i++) byHouse[i] = [];
    d.planetOrder.forEach(function (key) {
      var p = P[key], hs = aspectHouses(p.house, key);
      var inHouses = [];
      hs.forEach(function (hn) {
        d.planetOrder.forEach(function (o) { if (o !== key && P[o].house === hn) inHouses.push(o); });
      });
      byPlanet[key] = { houses: hs, planets: inHouses, optional: (key === 'Rahu' || key === 'Ketu') };
      hs.forEach(function (hn) {
        if (key === 'Rahu' || key === 'Ketu') { (nodeAspects[hn] = nodeAspects[hn] || []).push(key); }
        else { byHouse[hn].push(key); d.houses[hn - 1].aspectedBy.push(key); }
      });
    });
    // planets aspecting each planet
    d.planetOrder.forEach(function (key) {
      P[key].aspectedBy = SEVEN.filter(function (o) { return o !== key && aspectHouses(P[o].house, o).indexOf(P[key].house) !== -1; });
    });
    d.aspects = { byPlanet: byPlanet, byHouse: byHouse, nodeByHouse: nodeAspects };

    /* strength score (rule-based tone for text) */
    var BENEFIC = { Moon: 1, Mercury: 1, Jupiter: 1, Venus: 1 };
    SEVEN.concat(['Rahu', 'Ketu']).forEach(function (key) {
      var p = P[key], sc = 0;
      var dg = p.dignity.code;
      sc += { exalted: 2, moolatrikona: 2, own: 2, friend: 1, neutral: 0, enemy: -1, debilitated: -2, node: 0 }[dg];
      if ([1, 4, 7, 10, 5, 9].indexOf(p.house) !== -1) sc += 1;
      if ([6, 8, 12].indexOf(p.house) !== -1) sc += BENEFIC[key] ? -1 : 0;     // natural malefics do well in 6/8/12 is debatable; keep neutral
      if ([3, 6, 10, 11].indexOf(p.house) !== -1 && !BENEFIC[key] && key !== 'Rahu' && key !== 'Ketu') sc += 1;  // upachaya for malefics
      if ([6, 8, 12].indexOf(p.house) !== -1 && BENEFIC[key]) sc -= 0;
      if (p.combust) sc -= 1;
      p.score = sc;
      p.tone = sc >= 2 ? 'strong' : (sc <= -1 ? 'weak' : 'moderate');
    });

    /* divisional / Chandra charts: {title, lagnaSign, signs[12] -> [{key,ab,retro}]} */
    function mk(title, lagSign, signOf, withRetro) {
      var signs = []; for (i = 0; i < 12; i++) signs.push([]);
      d.planetOrder.forEach(function (key) { signs[signOf(P[key])].push({ key: key, ab: P[key].ab, retro: withRetro ? !!P[key].retro : false }); });
      return { title: title, lagnaSign: lagSign, signs: signs };
    }
    d.charts = {
      D1: mk('लग्न कुंडली (D-1)', lagnaSign, function (p) { return p.sign; }, true),
      Moon: mk('चंद्र कुंडली', moonSign, function (p) { return p.sign; }, true),
      D9: mk('नवांश कुंडली (D-9)', d.lagna.navSign, function (p) { return p.navSign; }, false),
      D10: mk('दशमांश कुंडली (D-10)', D10Lag, function (p) { return p.d10Sign; }, false)
    };

    /* connection between two planets (sambandha) */
    function connection(a, b) {
      if (a === b) return null;
      var pa = P[a], pb = P[b];
      if (pa.sign === pb.sign) return 'युति';
      if (LORD_KEY[pa.sign] === b && LORD_KEY[pb.sign] === a) return 'परिवर्तन';
      var ab = aspectHouses(pa.house, a).indexOf(pb.house) !== -1;
      var ba = aspectHouses(pb.house, b).indexOf(pa.house) !== -1;
      if (ab && ba) return 'परस्पर दृष्टि';
      return null;
    }
    d.connection = connection;
    var HL = d.houseLord;

    /* ---- yogas (rule based) ---- */
    var yl = [], names = [];
    function addY(id, name, kind, detail) { yl.push({ id: id, name: name, kind: kind, detail: detail || '' }); names.push(name); }
    var jupFromMoon = P.Jupiter.houseFromMoon;
    if ([1, 4, 7, 10].indexOf(jupFromMoon) !== -1) addY('gajakesari', 'गजकेसरी योग', 'shubh', 'गुरु चंद्र से ' + jupFromMoon + 'वें (केंद्र) भाव में है।');
    if (P.Sun.sign === P.Mercury.sign) addY('budhaditya', 'बुधादित्य योग', 'shubh', 'सूर्य-बुध ' + P.Sun.signHi + ' राशि में एक साथ' + (P.Mercury.combust ? ' (बुध अस्त होने से फल मंद)' : '') + '।');
    if (P.Moon.sign === P.Mars.sign) addY('chandramangal', 'चंद्र-मंगल योग', 'mishra', 'चंद्र-मंगल ' + P.Moon.signHi + ' राशि में युति।');
    var PM = { Mars: ['ruchaka', 'रुचक योग'], Mercury: ['bhadra', 'भद्र योग'], Jupiter: ['hamsa', 'हंस योग'], Venus: ['malavya', 'मालव्य योग'], Saturn: ['shasha', 'शश योग'] };
    Object.keys(PM).forEach(function (key) {
      var p = P[key], strong = (p.dignity.code === 'exalted' || p.dignity.code === 'own' || p.dignity.code === 'moolatrikona');
      if (strong && [1, 4, 7, 10].indexOf(p.house) !== -1)
        addY(PM[key][0], PM[key][1] + ' (पंच-महापुरुष)', 'shubh', Astro.PL[key].hi + ' ' + p.dignity.hi + ' होकर ' + p.house + 'वें (केंद्र) भाव में।');
    });
    // Dhana yoga: lords of 1,2,5,9,11 linked (at least one of 2/11)
    var dpairs = [[2, 11], [2, 5], [2, 9], [11, 5], [11, 9], [1, 2], [1, 11]], seenD = {};
    dpairs.forEach(function (pr) {
      var a = HL(pr[0]), b = HL(pr[1]); if (a === b) return;
      var c = connection(a, b); var kk = [a, b].sort().join('-');
      if (c && !seenD[kk]) { seenD[kk] = 1; addY('dhana-' + pr.join('_'), 'धन योग (' + pr[0] + 'वें व ' + pr[1] + 'वें भाव के स्वामी)', 'shubh', Astro.PL[a].hi + ' और ' + Astro.PL[b].hi + ' में ' + c + '।'); }
    });
    // Raj yoga: kendra lord + trikona lord
    var seenR = {};
    [[4, 5], [4, 9], [7, 5], [7, 9], [10, 5], [10, 9], [1, 5], [1, 9]].forEach(function (pr) {
      var kn = pr[0], tn = pr[1];
      var a = HL(kn), b = HL(tn); if (a === b) return;
      var c = connection(a, b), kk = [a, b].sort().join('-');
      if (c && !seenR[kk]) { seenR[kk] = 1; addY('raj-' + kn + '_' + tn, 'राज योग (' + kn + 'वें व ' + tn + 'वें भाव के स्वामी)', 'shubh', Astro.PL[a].hi + ' और ' + Astro.PL[b].hi + ' में ' + c + '।'); }
    });
    SEVEN.forEach(function (key) {
      var lo = P[key].lordOf;
      var kendra = lo.filter(function (h) { return h === 4 || h === 7 || h === 10; }), tri = lo.filter(function (h) { return h === 5 || h === 9; });
      if (kendra.length && tri.length) addY('yogakaraka-' + key, 'योगकारक ग्रह: ' + Astro.PL[key].hi, 'shubh', Astro.PL[key].hi + ' केंद्र (' + kendra.join(',') + ') व त्रिकोण (' + tri.join(',') + ') दोनों का स्वामी है।');
    });
    // Viparita raja yoga
    [[6, 'हर्ष'], [8, 'सरल'], [12, 'विमल']].forEach(function (x) {
      var lk = HL(x[0]);
      if ([6, 8, 12].indexOf(P[lk].house) !== -1 && P[lk].lordOf.every(function (h) { return [6, 8, 12].indexOf(h) !== -1; }))
        addY('vipareeta-' + x[0], 'विपरीत राज योग (' + x[1] + ')', 'shubh', x[0] + 'वें भाव के स्वामी ' + Astro.PL[lk].hi + ' ' + P[lk].house + 'वें (त्रिक) भाव में।');
    });
    // Neecha bhanga
    SEVEN.forEach(function (key) {
      var p = P[key]; if (p.dignity.code !== 'debilitated') return;
      var disp = LORD_KEY[p.sign], exl = LORD_KEY[EXALT[key]], why = [];
      [[disp, 'नीच-राशि स्वामी'], [exl, 'उच्च-राशि स्वामी']].forEach(function (x) {
        var q = P[x[0]], kl = [1, 4, 7, 10].indexOf(q.house) !== -1, km = [1, 4, 7, 10].indexOf(q.houseFromMoon) !== -1;
        if (kl || km) why.push(x[1] + ' ' + Astro.PL[x[0]].hi + (kl ? ' लग्न से केंद्र में' : ' चंद्र से केंद्र में'));
      });
      p.neechaBhanga = why.length > 0;
      if (why.length) addY('neechabhanga-' + key, 'नीचभंग राज योग: ' + Astro.PL[key].hi, 'shubh', why.join('; ') + ' — नीचता भंग।');
    });
    // Kemadruma (none in 2nd/12th from Moon nor with Moon, excluding Sun & nodes)
    var kema = true;
    ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].forEach(function (key) {
      var r = (P[key].sign - moonSign + 12) % 12; if (r === 1 || r === 11 || r === 0) kema = false;
    });
    if (kema) {
      var cancel = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Sun'].some(function (key) { return [4, 7, 10].indexOf(P[key].houseFromMoon) !== -1; }) || [1, 4, 7, 10].indexOf(P.Moon.house) !== -1;
      d.kemadruma = { formed: true, cancelled: cancel };
      if (!cancel) addY('kemadruma', 'केमद्रुम योग (चंद्र निर्बल)', 'ashubh', 'चंद्र से 2रे/12वें भाव में कोई ग्रह नहीं और चंद्र पर केंद्र-सहायता भी नहीं।');
      else addY('kemadruma-bhang', 'केमद्रुम भंग', 'shubh', 'चंद्र के आसपास ग्रह न होने पर भी केंद्र में ग्रह/चंद्र होने से केमद्रुम का दोष भंग।');
    } else d.kemadruma = { formed: false, cancelled: false };
    d.yogaList = yl;
    d.yogas = names;

    /* ---- Manglik detail ---- */
    var MH = [1, 2, 4, 7, 8, 12];
    var mFromLagna = MH.indexOf(P.Mars.house) !== -1, mFromMoon = MH.indexOf(P.Mars.houseFromMoon) !== -1;
    var venusHouseFromMars = signHouseFrom(P.Venus.sign, P.Mars.sign);
    var mFromVenus = MH.indexOf(venusHouseFromMars) !== -1;
    var cancels = [];
    var mSign = P.Mars.sign;
    if (mSign === 0 || mSign === 7 || mSign === 9) cancels.push('मंगल स्वराशि/उच्च राशि (' + P.Mars.signHi + ') में है');
    var CANC_SIGNS = { 1: [0], 2: [2, 5], 4: [0, 7], 7: [9, 3], 8: [3, 11, 10], 12: [1, 6] };
    if (CANC_SIGNS[P.Mars.house] && CANC_SIGNS[P.Mars.house].indexOf(mSign) !== -1) cancels.push('मंगल ' + P.Mars.house + 'वें भाव में ' + P.Mars.signHi + ' राशि में — शास्त्रोक्त परिहार');
    if (P.Jupiter.sign === mSign) cancels.push('गुरु की मंगल के साथ युति');
    else if (aspectHouses(P.Jupiter.house, 'Jupiter').indexOf(P.Mars.house) !== -1) cancels.push('मंगल पर गुरु की दृष्टि');
    if (P.Moon.sign === mSign) cancels.push('चंद्र की मंगल के साथ युति');
    if (P.Saturn.sign === mSign) cancels.push('शनि की मंगल के साथ युति (शनि मंगल को संतुलित करता है)');
    var levelN = (mFromLagna ? 1 : 0) + (mFromMoon ? 1 : 0) + (mFromVenus ? 1 : 0);
    var m = d.doshas;
    m.manglikFromVenus = mFromVenus;
    m.manglikDetail = {
      fromLagna: mFromLagna, fromMoon: mFromMoon, fromVenus: mFromVenus, sources: levelN,
      level: levelN === 0 ? 'none' : (levelN === 1 ? 'low' : (levelN === 2 ? 'medium' : 'high')),
      cancellations: cancels,
      effective: levelN > 0 && cancels.length === 0,
      house: P.Mars.house, houseFromMoon: P.Mars.houseFromMoon
    };

    /* ---- Kaal Sarp type ---- */
    var ksType = null;
    if (m.kaalSarp) ksType = { name: KS_TYPE[P.Rahu.house - 1] + ' काल सर्प योग', rahuHouse: P.Rahu.house };
    m.kaalSarpType = ksType;
    // partial (7 planets between nodes except one outside)
    var outside = 0; SEVEN.forEach(function (key) { var rel = rev(P[key].lon - P.Rahu.lon); if (!(rel > 0 && rel < 180)) outside++; });
    m.kaalSarpPartial = !m.kaalSarp && (outside === 1 || outside === 6);

    /* ---- Sade Sati / Dhaiya with dates ---- */
    var nowJD = d.nowJD;
    var diffNow = ((satSign(nowJD) - moonSign) + 12) % 12;
    var a0 = nowJD - 34 * 365.25, b0 = nowJD + 34 * 365.25;
    var ssPred = function (jd) { var df = ((satSign(jd) - moonSign) + 12) % 12; return df === 11 || df === 0 || df === 1; };
    var dhPred = function (jd) { var df = ((satSign(jd) - moonSign) + 12) % 12; return df === 3 || df === 7; };
    var ssI = intervalsWhere(ssPred, a0, b0, 12, 400), dhI = intervalsWhere(dhPred, a0, b0, 12, 400);
    function fmtIv(iv) { return { startJD: iv[0], endJD: iv[1], start: dayToObj(iv[0]), end: dayToObj(iv[1]) }; }
    var curSS = null, nextSS = null;
    ssI.forEach(function (iv) { if (nowJD >= iv[0] && nowJD <= iv[1]) curSS = fmtIv(iv); else if (iv[0] > nowJD && !nextSS) nextSS = fmtIv(iv); });
    var curDh = null, nextDh = null;
    dhI.forEach(function (iv) { if (nowJD >= iv[0] && nowJD <= iv[1]) curDh = fmtIv(iv); else if (iv[0] > nowJD && !nextDh) nextDh = fmtIv(iv); });
    m.sadeSatiDetail = {
      active: diffNow === 11 || diffNow === 0 || diffNow === 1,
      current: curSS, next: nextSS,
      dhaiyaActive: diffNow === 3 || diffNow === 7,
      dhaiyaKind: diffNow === 3 ? 'कंटक शनि (चंद्र से चतुर्थ)' : (diffNow === 7 ? 'अष्टम शनि (चंद्र से अष्टम)' : null),
      dhaiyaCurrent: curDh, dhaiyaNext: nextDh,
      transitSaturnSignIdx: satSign(nowJD)
    };
    if (curSS) {   // phases inside the active period
      var phases = [];
      [[11, 'पहला चरण'], [0, 'दूसरा चरण'], [1, 'तीसरा चरण']].forEach(function (ph) {
        var iv = intervalsWhere(function (jd) { return ((satSign(jd) - moonSign + 12) % 12) === ph[0]; }, curSS.startJD - 5, curSS.endJD + 5, 10, 400);
        iv.forEach(function (x) { phases.push({ phase: ph[1], signHi: RASHI[(moonSign + ph[0]) % 12], startJD: x[0], endJD: x[1], start: dayToObj(x[0]), end: dayToObj(x[1]) }); });
      });
      phases.sort(function (a, b) { return a.startJD - b.startJD; });
      m.sadeSatiDetail.phases = phases;
    }

    /* ---- Pratyantar of the running antardasha ---- */
    var dd = d.dasha;
    if (dd.current && dd.currentAntar) {
      var an = dd.currentAntar, span = an.endJD - an.startJD, cur = an.startJD, pr = [];
      for (k = 0; k < 9; k++) {
        var pl = DASHA_ORDER[(DASHA_ORDER.indexOf(an.lord) + k) % 9];
        var len = span * DASHA_YEARS[pl] / 120;
        pr.push({ lord: pl, lordHi: PL[pl].hi, startJD: cur, endJD: cur + len });
        cur += len;
      }
      dd.pratyantars = pr;
      dd.currentPratyantar = pr.filter(function (x) { return nowJD >= x.startJD && nowJD < x.endJD; })[0] || null;
    }
    return d;
  }

  var _computeBase = compute;
  function computeFull(birth) { return enrich(_computeBase(birth), birth); }

  global.Astro = {
    compute: computeFull,
    computeBase: _computeBase,
    jdToDate: jdToDate,
    toDMS: toDMS,
    // low-level helpers (used by panchang-engine.js, matching, rashifal)
    julianDay: julianDay,
    lahiriAyanamsa: lahiriAyanamsa,
    tropicalLongitudes: tropicalLongitudes,
    ascendantTropical: ascendantTropical,
    describe: describe,
    buildDasha: buildDasha,
    rev: rev,
    dignityOf: dignityOf, aspectHouses: aspectHouses, FRIENDS: FRIENDS, ENEMIES: ENEMIES, KS_TYPE: KS_TYPE, LORD_KEY: LORD_KEY, EXALT: EXALT, OWN: OWN, DIGNITY_HI: DIGNITY_HI,
    RASHI: RASHI, RASHI_EN: RASHI_EN, RASHI_LORD: RASHI_LORD, NAK: NAK, PL: PL,
    PLANET_ORDER: PLANET_ORDER, DASHA_ORDER: DASHA_ORDER, DASHA_YEARS: DASHA_YEARS
  };

})(window);
