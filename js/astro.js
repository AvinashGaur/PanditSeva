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
    var nowJD = julianDay(
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

  global.Astro = {
    compute: compute,
    jdToDate: jdToDate,
    toDMS: toDMS,
    RASHI: RASHI, RASHI_EN: RASHI_EN, NAK: NAK, PL: PL
  };

})(window);
