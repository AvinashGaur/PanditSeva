/* ============================================================================
   matching.js — Kundali Matching (विवाह गुण मिलान / Ashtakoot) for PanditSeva.in
   ----------------------------------------------------------------------------
   Part 1  ENGINE  (pure, node-testable; no DOM)   -> global `Matching`
   Part 2  UI      (only runs in a browser page with #mmForm)
   All scores are RULE-BASED from the Moon's sidereal (Lahiri) nakshatra, pada
   and rashi plus Mars/7th-house positions from Astro.compute(). Interpretation
   text is automated; the numeric score must never be the sole marriage decision.
   ========================================================================== */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  REFERENCE TABLES                                                   */
  /* ------------------------------------------------------------------ */
  var RASHI = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन'];
  var NAK = ['अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा', 'आर्द्रा', 'पुनर्वसु', 'पुष्य', 'आश्लेषा', 'मघा',
    'पूर्वा फाल्गुनी', 'उत्तरा फाल्गुनी', 'हस्त', 'चित्रा', 'स्वाति', 'विशाखा', 'अनुराधा', 'ज्येष्ठा', 'मूल',
    'पूर्वाषाढ़ा', 'उत्तराषाढ़ा', 'श्रवण', 'धनिष्ठा', 'शतभिषा', 'पूर्वा भाद्रपद', 'उत्तरा भाद्रपद', 'रेवती'];
  var SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  var PL_HI = { Sun: 'सूर्य', Moon: 'चंद्र', Mars: 'मंगल', Mercury: 'बुध', Jupiter: 'गुरु', Venus: 'शुक्र', Saturn: 'शनि', Rahu: 'राहु', Ketu: 'केतु' };

  // 1. Varna (by Moon rashi): 4 Brahmin, 3 Kshatriya, 2 Vaishya, 1 Shudra
  var VARNA_BY_SIGN = [3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4];
  var VARNA_NAME = { 4: 'ब्राह्मण', 3: 'क्षत्रिय', 2: 'वैश्य', 1: 'शूद्र' };

  // 2. Vashya groups: 0 Chatushpada, 1 Manav, 2 Jalchar, 3 Vanachar, 4 Keet
  var VASHYA_NAME = ['चतुष्पद', 'मानव', 'जलचर', 'वनचर', 'कीट'];
  // symmetric matrix (assumption documented in report notes)
  var VASHYA_M = [
    [2, 1, 1, 0.5, 1],
    [1, 2, 0.5, 0, 1],
    [1, 0.5, 2, 1, 1],
    [0.5, 0, 1, 2, 0],
    [1, 1, 1, 0, 2]
  ];
  function vashyaGroup(sign, deg) {
    switch (sign) {
      case 0: case 1: return 0;
      case 2: case 5: case 6: case 10: return 1;
      case 3: case 11: return 2;
      case 4: return 3;
      case 7: return 4;
      case 8: return deg < 15 ? 1 : 0;      // Dhanu: first half Manav, second half Chatushpada
      case 9: return deg < 15 ? 0 : 2;      // Makar: first half Chatushpada, second half Jalchar
    }
    return 0;
  }

  // 4. Yoni
  var YONI_NAME = ['अश्व', 'गज', 'मेष', 'सर्प', 'श्वान', 'मार्जार', 'मूषक', 'गौ', 'महिष', 'व्याघ्र', 'मृग', 'वानर', 'नकुल', 'सिंह'];
  var YONI_BY_NAK = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];
  var YONI_M = [
    [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
    [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
    [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
    [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
    [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
    [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
    [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
    [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
    [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
    [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 1, 2],
    [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
    [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
    [2, 2, 3, 0, 1, 2, 1, 2, 2, 1, 2, 3, 4, 2],
    [1, 0, 1, 2, 1, 1, 2, 1, 1, 2, 1, 2, 2, 4]
  ];

  // 5. Graha Maitri — natural friendship (row's view of column)
  var FRIEND = {
    Sun: { F: ['Moon', 'Mars', 'Jupiter'], N: ['Mercury'], E: ['Venus', 'Saturn'] },
    Moon: { F: ['Sun', 'Mercury'], N: ['Mars', 'Jupiter', 'Venus', 'Saturn'], E: [] },
    Mars: { F: ['Sun', 'Moon', 'Jupiter'], N: ['Venus', 'Saturn'], E: ['Mercury'] },
    Mercury: { F: ['Sun', 'Venus'], N: ['Mars', 'Jupiter', 'Saturn'], E: ['Moon'] },
    Jupiter: { F: ['Sun', 'Moon', 'Mars'], N: ['Saturn'], E: ['Mercury', 'Venus'] },
    Venus: { F: ['Mercury', 'Saturn'], N: ['Mars', 'Jupiter'], E: ['Sun', 'Moon'] },
    Saturn: { F: ['Mercury', 'Venus'], N: ['Jupiter'], E: ['Sun', 'Moon', 'Mars'] }
  };
  function rel(a, b) {
    if (a === b) return 'S';
    var t = FRIEND[a];
    if (!t) return 'N';
    if (t.F.indexOf(b) !== -1) return 'F';
    if (t.E.indexOf(b) !== -1) return 'E';
    return 'N';
  }

  // 6. Gana: 0 Deva, 1 Manushya, 2 Rakshasa
  var GANA_NAME = ['देव', 'मनुष्य', 'राक्षस'];
  var GANA_BY_NAK = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0];
  // [boy][girl]
  var GANA_M = [[6, 6, 1], [5, 6, 0], [0, 0, 6]];

  // 8. Nadi: 0 Adi (वात), 1 Madhya (पित्त), 2 Antya (कफ) — zig-zag pattern A M An An M A
  var NADI_NAME = ['आदि (वात)', 'मध्य (पित्त)', 'अन्त्य (कफ)'];
  var NADI_PATTERN = [0, 1, 2, 2, 1, 0];
  function nadiOf(nak) { return NADI_PATTERN[nak % 6]; }

  // Vedha nakshatra pairs (optional check)
  var VEDHA = [[0, 17], [1, 16], [2, 15], [3, 14], [5, 21], [6, 20], [7, 19], [8, 18], [9, 26], [10, 25], [11, 24], [12, 23], [13, 22]];

  var KOOTA_META = [
    { key: 'varna', name: 'वर्ण', max: 1, what: 'आध्यात्मिक/मानसिक विकास और अहं-सामंजस्य। यह दोनों के स्वभाव की मूल प्रवृत्ति का मिलान है।' },
    { key: 'vashya', name: 'वश्य', max: 2, what: 'आपसी आकर्षण, प्रभाव और नियंत्रण-संतुलन — एक-दूसरे को समझने व साथ चलने की क्षमता।' },
    { key: 'tara', name: 'तारा', max: 3, what: 'जन्म-नक्षत्रों के आधार पर भाग्य, स्वास्थ्य और दीर्घायु में परस्पर सहयोग।' },
    { key: 'yoni', name: 'योनि', max: 4, what: 'शारीरिक व स्वभावगत अनुकूलता, घनिष्ठता और दांपत्य सुख का संकेत।' },
    { key: 'maitri', name: 'ग्रह मैत्री', max: 5, what: 'मानसिक समानता, विचारों का मेल और आपसी स्नेह — चंद्र राशि-स्वामियों की मित्रता से।' },
    { key: 'gana', name: 'गण', max: 6, what: 'स्वभाव (देव/मनुष्य/राक्षस) का मेल — व्यवहार, सहनशीलता और टकराव की संभावना।' },
    { key: 'bhakoot', name: 'भकूट', max: 7, what: 'राशियों की परस्पर स्थिति — पारिवारिक सुख, आर्थिक उन्नति और भावनात्मक जुड़ाव।' },
    { key: 'nadi', name: 'नाड़ी', max: 8, what: 'स्वास्थ्य, संतान और आनुवंशिक/प्राण-ऊर्जा की अनुकूलता — सबसे अधिक अंक वाला कूट।' }
  ];

  /* ------------------------------------------------------------------ */
  /*  PROFILE from a computed chart (or raw test object)                 */
  /* ------------------------------------------------------------------ */
  function profile(chart) {
    if (chart && chart.planets && chart.planets.Moon) {
      var m = chart.planets.Moon;
      return { nak: m.nak, pada: m.pada, sign: m.sign, deg: m.degInSign };
    }
    return { nak: chart.nak, pada: chart.pada || 1, sign: chart.sign, deg: chart.deg || 0 };
  }

  function tarasOf(b, g) {
    var c1 = ((b.nak - g.nak + 27) % 27) + 1;   // girl -> boy
    var c2 = ((g.nak - b.nak + 27) % 27) + 1;   // boy -> girl
    var bad = { 3: 1, 5: 1, 7: 1 };
    return { c1: c1, c2: c2, r1: c1 % 9, r2: c2 % 9, bad1: !!bad[c1 % 9], bad2: !!bad[c2 % 9] };
  }
  var TARA_NAMES = { 1: 'जन्म', 2: 'संपत', 3: 'विपत', 4: 'क्षेम', 5: 'प्रत्यरि', 6: 'साधक', 7: 'वध', 8: 'मैत्र', 0: 'अतिमैत्र' };

  /* ------------------------------------------------------------------ */
  /*  ASHTAKOOT                                                          */
  /* ------------------------------------------------------------------ */
  function ashtakoot(bIn, gIn) {
    var b = profile(bIn), g = profile(gIn);
    var out = {}, detail = {};

    // Varna
    var vb = VARNA_BY_SIGN[b.sign], vg = VARNA_BY_SIGN[g.sign];
    out.varna = vb >= vg ? 1 : 0;
    detail.varna = 'वर: ' + VARNA_NAME[vb] + ', वधू: ' + VARNA_NAME[vg];

    // Vashya
    var ab = vashyaGroup(b.sign, b.deg), ag = vashyaGroup(g.sign, g.deg);
    out.vashya = VASHYA_M[ab][ag];
    detail.vashya = 'वर: ' + VASHYA_NAME[ab] + ', वधू: ' + VASHYA_NAME[ag];

    // Tara
    var t = tarasOf(b, g);
    out.tara = (!t.bad1 && !t.bad2) ? 3 : ((t.bad1 && t.bad2) ? 0 : 1.5);
    detail.tara = 'वधू→वर: ' + TARA_NAMES[t.r1] + ' तारा' + (t.bad1 ? ' (अशुभ)' : '') + ', वर→वधू: ' + TARA_NAMES[t.r2] + ' तारा' + (t.bad2 ? ' (अशुभ)' : '');

    // Yoni
    var yb = YONI_BY_NAK[b.nak], yg = YONI_BY_NAK[g.nak];
    out.yoni = YONI_M[yb][yg];
    detail.yoni = 'वर: ' + YONI_NAME[yb] + ', वधू: ' + YONI_NAME[yg];

    // Graha Maitri
    var lb = SIGN_LORD[b.sign], lg = SIGN_LORD[g.sign];
    var r1 = rel(lb, lg), r2 = rel(lg, lb), mscore;
    if (lb === lg) mscore = 5;
    else {
      var key = [r1, r2].sort().join('');
      mscore = { FF: 5, FN: 4, NN: 3, EF: 1, EN: 0.5, EE: 0 }[key];
    }
    out.maitri = mscore;
    detail.maitri = 'वर राशि-स्वामी: ' + PL_HI[lb] + ', वधू राशि-स्वामी: ' + PL_HI[lg] + (lb === lg ? ' (समान स्वामी)' : '');

    // Gana
    var gb = GANA_BY_NAK[b.nak], gg = GANA_BY_NAK[g.nak];
    out.gana = GANA_M[gb][gg];
    detail.gana = 'वर: ' + GANA_NAME[gb] + ', वधू: ' + GANA_NAME[gg];

    // Bhakoot
    var d = ((g.sign - b.sign + 12) % 12) + 1;   // boy rashi -> girl rashi
    var dRev = ((b.sign - g.sign + 12) % 12) + 1;
    var badB = ({ 2: 1, 12: 1, 5: 1, 9: 1, 6: 1, 8: 1 })[d] === 1;
    out.bhakoot = badB ? 0 : 7;
    detail.bhakoot = 'वर राशि ' + RASHI[b.sign] + ' → वधू राशि ' + RASHI[g.sign] + ': ' + d + '/' + dRev + ' संबंध';

    // Nadi
    var nb = nadiOf(b.nak), ng = nadiOf(g.nak);
    out.nadi = nb !== ng ? 8 : 0;
    detail.nadi = 'वर: ' + NADI_NAME[nb] + ', वधू: ' + NADI_NAME[ng];

    var total = 0, kootas = KOOTA_META.map(function (m) {
      total += out[m.key];
      return { key: m.key, name: m.name, max: m.max, got: out[m.key], detail: detail[m.key], what: m.what };
    });

    return {
      kootas: kootas, total: total, max: 36, byKey: out,
      info: { b: b, g: g, tara: t, bhakootDist: d, bhakootDistRev: dRev, lords: [lb, lg], nadi: [nb, ng], gana: [gb, gg], yoni: [yb, yg] }
    };
  }

  /* ------------------------------------------------------------------ */
  /*  DOSHAS: Nadi / Bhakoot / Gana with parihar (cancellation)          */
  /* ------------------------------------------------------------------ */
  function nadiDosha(bIn, gIn) {
    var b = profile(bIn), g = profile(gIn);
    var same = nadiOf(b.nak) === nadiOf(g.nak);
    var res = { present: same, cancelled: false, reasons: [] };
    if (!same) return res;
    if (b.sign === g.sign && b.nak !== g.nak) res.reasons.push('दोनों की चंद्र राशि एक ही है परंतु नक्षत्र भिन्न हैं');
    if (b.nak === g.nak && b.pada !== g.pada) res.reasons.push('नक्षत्र एक है परंतु चरण (पाद) भिन्न हैं');
    if (b.nak === g.nak && b.sign !== g.sign) res.reasons.push('नक्षत्र एक है परंतु राशियाँ भिन्न हैं');
    res.cancelled = res.reasons.length > 0;
    return res;
  }

  function bhakootDosha(bIn, gIn) {
    var b = profile(bIn), g = profile(gIn);
    var d = ((g.sign - b.sign + 12) % 12) + 1;
    var kind = ({ 2: 'द्वि-द्वादश (2/12)', 12: 'द्वि-द्वादश (2/12)', 5: 'नवम-पंचम (5/9)', 9: 'नवम-पंचम (5/9)', 6: 'षडाष्टक (6/8)', 8: 'षडाष्टक (6/8)' })[d] || null;
    var res = { present: !!kind, kind: kind, cancelled: false, reasons: [] };
    if (!kind) return res;
    var lb = SIGN_LORD[b.sign], lg = SIGN_LORD[g.sign];
    if (lb === lg) res.reasons.push('दोनों राशियों के स्वामी एक ही ग्रह (' + PL_HI[lb] + ') हैं');
    else if (rel(lb, lg) === 'F' && rel(lg, lb) === 'F') res.reasons.push('दोनों राशि-स्वामी (' + PL_HI[lb] + ', ' + PL_HI[lg] + ') परस्पर मित्र हैं');
    // 2/12 and 5/9 are classically softened when lords are friends; 6/8 only with same lord / mutual friendship
    res.cancelled = res.reasons.length > 0;
    return res;
  }

  function ganaDosha(bIn, gIn) {
    var b = profile(bIn), g = profile(gIn);
    var gb = GANA_BY_NAK[b.nak], gg = GANA_BY_NAK[g.nak];
    var sc = GANA_M[gb][gg];
    var res = { present: sc <= 1, score: sc, reasons: [], note: '' };
    if (gb === 2 && gg !== 2) res.note = 'वर राक्षस गण और वधू भिन्न गण — स्वभावगत टकराव की संभावना अधिक मानी जाती है।';
    else if (gg === 2 && gb !== 2) res.note = 'वधू राक्षस गण और वर भिन्न गण — दृष्टिकोण का अंतर रह सकता है; आपसी समझ आवश्यक।';
    else if (sc === 5) res.note = 'वर मनुष्य गण, वधू देव गण — सामान्यतः स्वीकार्य, कुछ मतभेद संभव।';
    else res.note = 'गण-मेल सामान्यतः अनुकूल है।';
    if (res.present && (b.sign === g.sign || SIGN_LORD[b.sign] === SIGN_LORD[g.sign])) { res.reasons.push('राशि/राशि-स्वामी की समानता से गण-दोष का प्रभाव कम माना जाता है'); }
    return res;
  }

  /* ------------------------------------------------------------------ */
  /*  MANGLIK                                                            */
  /* ------------------------------------------------------------------ */
  var MANGLIK_HOUSES = [1, 2, 4, 7, 8, 12];
  var MANGAL_SAFE_SIGN = { 2: [2, 5], 4: [0, 7], 7: [3, 9], 8: [8, 11], 12: [1, 6] };   // house -> signs where dosha is classically reduced
  function manglik(chart) {
    var P = chart.planets, mars = P.Mars, moon = P.Moon;
    var hL = mars.house;                                   // from Lagna
    var hM = ((mars.sign - moon.sign + 12) % 12) + 1;       // from Moon
    var fromL = MANGLIK_HOUSES.indexOf(hL) !== -1, fromM = MANGLIK_HOUSES.indexOf(hM) !== -1;
    var mit = [];
    if (fromL || fromM) {
      if ([0, 7, 9].indexOf(mars.sign) !== -1) mit.push('मंगल स्वराशि/उच्च राशि (' + RASHI[mars.sign] + ') में है');
      var jup = P.Jupiter, jd = ((mars.sign - jup.sign + 12) % 12) + 1;
      if (jd === 1) mit.push('मंगल के साथ गुरु की युति है');
      else if ([5, 7, 9].indexOf(jd) !== -1) mit.push('मंगल पर गुरु की दृष्टि है');
      if (fromL && MANGAL_SAFE_SIGN[hL] && MANGAL_SAFE_SIGN[hL].indexOf(mars.sign) !== -1) mit.push(hL + 'वें भाव में ' + RASHI[mars.sign] + ' राशि का मंगल शास्त्रानुसार दोष-शमन करता है');
      if (!fromL && fromM) mit.push('दोष केवल चंद्र से बन रहा है (हल्का / चंद्र-मांगलिक)');
    }
    return { manglik: fromL || fromM, fromLagna: fromL, fromMoon: fromM, houseLagna: hL, houseMoon: hM, marsSign: mars.sign, mitigations: mit, strong: fromL && mit.length === 0 };
  }
  function mangalCompat(mb, mg) {
    if (!mb.manglik && !mg.manglik) return { level: 'good', title: 'दोनों कुंडलियाँ मंगल दोष से मुक्त', text: 'वर और वधू दोनों की कुंडली में मंगल दोष नहीं बनता — मंगल की दृष्टि से मिलान अनुकूल है।' };
    if (mb.manglik && mg.manglik) return { level: 'good', title: 'दोनों मांगलिक — परस्पर परिहार', text: 'वर और वधू दोनों मांगलिक हैं। शास्त्रों में दोनों के मांगलिक होने पर दोष का परस्पर शमन माना गया है। फिर भी मंगल की डिग्री/भाव की प्रबलता का विचार योग्य ज्योतिषी से कराएँ।' };
    var who = mb.manglik ? 'वर' : 'वधू', m = mb.manglik ? mb : mg;
    if (m.mitigations.length) return { level: 'mid', title: who + ' मांगलिक — दोष आंशिक रूप से शमित', text: who + ' की कुंडली में मंगल दोष है, परंतु शमन के संकेत भी हैं (' + m.mitigations.join('; ') + '). दूसरा पक्ष मांगलिक नहीं है, इसलिए विवाह-पूर्व मंगल-शांति उपाय एवं विशेषज्ञ परामर्श उचित है।' };
    return { level: 'bad', title: who + ' मांगलिक, दूसरा पक्ष नहीं — मंगल दोष का असंतुलन', text: 'केवल ' + who + ' की कुंडली मांगलिक है और परिहार के स्पष्ट संकेत नहीं मिलते। परंपरा में इसे दांपत्य-सुख के लिए सावधानी का विषय माना जाता है। मंगल शांति पूजा आदि उपाय व पूर्ण कुंडली का परीक्षण आवश्यक है।' };
  }

  /* ------------------------------------------------------------------ */
  /*  PLANETARY COMPATIBILITY (rule-based)                               */
  /* ------------------------------------------------------------------ */
  function seventhInfo(chart) {
    var sign7 = (chart.lagnaSign + 6) % 12, lord = SIGN_LORD[sign7];
    var lordHouse = chart.planets[lord].house;
    var occupants = chart.houses[6].planets.map(function (p) { return p.key; });
    return { sign7: sign7, lord: lord, lordHouse: lordHouse, occupants: occupants };
  }
  function planetary(cb, cg, bIn, gIn) {
    var items = [];
    var b = profile(bIn || cb), g = profile(gIn || cg);
    function add(level, title, text) { items.push({ level: level, title: title, text: text }); }
    var good = [1, 4, 5, 7, 9, 10, 11], tough = [6, 8, 12];

    // Moon-sign distance
    var d = ((g.sign - b.sign + 12) % 12) + 1;
    var dtxt = { 1: ['good', 'दोनों की चंद्र राशि समान है — भावनात्मक समझ सहज, पर दोनों में समान कमज़ोरियाँ भी दिख सकती हैं।'], 7: ['good', 'चंद्र राशियाँ परस्पर सप्तम (समसप्तक) हैं — पूरक स्वभाव व आकर्षण का संकेत।'], 3: ['good', 'चंद्र राशियों में 3/11 का संबंध है — आपसी सहयोग व लाभकारी।'], 11: ['good', 'चंद्र राशियों में 3/11 का संबंध है — आपसी सहयोग व लाभकारी।'], 4: ['good', 'चंद्र राशियों में 4/10 का संबंध है — परिवार व कर्म दोनों में संतुलन।'], 10: ['good', 'चंद्र राशियों में 4/10 का संबंध है — परिवार व कर्म दोनों में संतुलन।'], 2: ['mid', 'चंद्र राशियों में 2/12 का संबंध है — आर्थिक/पारिवारिक विषयों में सजगता चाहिए।'], 12: ['mid', 'चंद्र राशियों में 2/12 का संबंध है — आर्थिक/पारिवारिक विषयों में सजगता चाहिए।'], 5: ['mid', 'चंद्र राशियों में 5/9 का संबंध है — संतान व भाग्य के विषय में विशेष विचार करें।'], 9: ['mid', 'चंद्र राशियों में 5/9 का संबंध है — संतान व भाग्य के विषय में विशेष विचार करें।'], 6: ['bad', 'चंद्र राशियों में 6/8 (षडाष्टक) का संबंध है — मन-मुटाव व स्वास्थ्य संबंधी सावधानी का संकेत।'], 8: ['bad', 'चंद्र राशियों में 6/8 (षडाष्टक) का संबंध है — मन-मुटाव व स्वास्थ्य संबंधी सावधानी का संकेत।'] }[d];
    add(dtxt[0], 'चंद्र राशि का परस्पर संबंध (' + d + ')', dtxt[1]);

    // 7th lord placement
    [['वर', cb], ['वधू', cg]].forEach(function (p) {
      var s = seventhInfo(p[1]);
      var lv = tough.indexOf(s.lordHouse) !== -1 ? 'bad' : (good.indexOf(s.lordHouse) !== -1 ? 'good' : 'mid');
      add(lv, p[0] + ' — सप्तम भाव स्वामी (' + PL_HI[s.lord] + ')', 'सप्तमेश ' + PL_HI[s.lord] + ' ' + s.lordHouse + 'वें भाव में है' + (lv === 'good' ? ' — दांपत्य के लिए सहायक स्थिति।' : (lv === 'bad' ? ' — (6/8/12) विवाह-सुख में बाधा/विलंब का संकेत; उपाय हितकर।' : ' — मिश्रित फल।')));
      var mal = s.occupants.filter(function (k) { return ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'].indexOf(k) !== -1; });
      var ben = s.occupants.filter(function (k) { return ['Jupiter', 'Venus', 'Mercury', 'Moon'].indexOf(k) !== -1; });
      if (mal.length) add('mid', p[0] + ' — सप्तम भाव में क्रूर ग्रह', 'सप्तम भाव में ' + mal.map(function (k) { return PL_HI[k]; }).join(', ') + ' स्थित हैं — जीवनसाथी के स्वभाव/संबंध में परिश्रम व धैर्य की आवश्यकता।');
      if (ben.length) add('good', p[0] + ' — सप्तम भाव में शुभ ग्रह', 'सप्तम भाव में ' + ben.map(function (k) { return PL_HI[k]; }).join(', ') + ' स्थित हैं — दांपत्य के लिए शुभ संकेत।');
    });

    // karakas: Venus (boy) and Jupiter (girl)
    var vh = cb.planets.Venus.house, jh = cg.planets.Jupiter.house;
    add(tough.indexOf(vh) !== -1 ? 'bad' : 'good', 'वर का शुक्र (दांपत्य-कारक)', 'शुक्र ' + vh + 'वें भाव में है' + (tough.indexOf(vh) !== -1 ? ' — दांपत्य सुख में सजगता चाहिए।' : ' — सामान्यतः अनुकूल।'));
    add(tough.indexOf(jh) !== -1 ? 'bad' : 'good', 'वधू का गुरु (पति-कारक)', 'गुरु ' + jh + 'वें भाव में है' + (tough.indexOf(jh) !== -1 ? ' — पति/वैवाहिक सुख हेतु सजगता चाहिए।' : ' — सामान्यतः अनुकूल।'));

    // Lagna lord friendship
    var ll1 = SIGN_LORD[cb.lagnaSign], ll2 = SIGN_LORD[cg.lagnaSign];
    var r1 = rel(ll1, ll2), r2 = rel(ll2, ll1);
    var llv = (ll1 === ll2 || (r1 === 'F' && r2 === 'F')) ? 'good' : ((r1 === 'E' && r2 === 'E') ? 'bad' : 'mid');
    add(llv, 'लग्नेशों का संबंध', 'वर लग्नेश ' + PL_HI[ll1] + ', वधू लग्नेश ' + PL_HI[ll2] + (ll1 === ll2 ? ' — समान लग्नेश, व्यक्तित्व में साम्य।' : ' — परस्पर ' + (llv === 'good' ? 'मित्रता' : (llv === 'bad' ? 'शत्रुता' : 'सम/मिश्र संबंध')) + '।'));

    // Vedha
    var vedha = VEDHA.some(function (p) { return (p[0] === b.nak && p[1] === g.nak) || (p[1] === b.nak && p[0] === g.nak); });
    add(vedha ? 'bad' : 'good', 'नक्षत्र वेध', vedha ? 'दोनों के जन्म नक्षत्र (' + NAK[b.nak] + ' – ' + NAK[g.nak] + ') वेध-युग्म हैं — परंपरा में यह अशुभ माना जाता है।' : 'नक्षत्रों में वेध दोष नहीं है।');

    // Sade Sati snapshot
    ['वर', 'वधू'].forEach(function (w, i) {
      var c = i ? cg : cb;
      if (c.doshas && c.doshas.sadeSati) add('mid', w + ' — साढ़े साती', w + ' पर वर्तमान में साढ़े साती (' + c.doshas.sadeSatiPhase + ') चल रही है — विवाह-मुहूर्त व निर्णय में विशेषज्ञ सलाह लें।');
    });
    return items;
  }

  /* ------------------------------------------------------------------ */
  /*  GRADES & REMEDIES                                                  */
  /* ------------------------------------------------------------------ */
  function grade(total) {
    if (total >= 33) return { level: 'good', label: 'उत्तम', text: 'गुण मिलान अत्यंत श्रेष्ठ है। परंपरा में 33 से अधिक अंक असाधारण अनुकूलता माने जाते हैं।' };
    if (total >= 25) return { level: 'good', label: 'अच्छा', text: 'गुण मिलान अच्छा है। विवाह के लिए सामान्यतः अनुकूल माना जाता है।' };
    if (total >= 18) return { level: 'mid', label: 'मध्यम', text: 'गुण मिलान मध्यम है। विवाह संभव माना जाता है, परंतु जिन कूटों में अंक कम हैं उन पर आपसी समझ व उपाय आवश्यक हैं।' };
    return { level: 'bad', label: 'कमज़ोर', text: 'गुण मिलान 18 से कम है — परंपरा में इसे कमज़ोर माना जाता है। पूर्ण कुंडली व दशा का विस्तृत परीक्षण विशेषज्ञ से अवश्य कराएँ।' };
  }

  function remedies(a, nd, bd, gd, mb, mg, mc) {
    var r = [];
    if (nd.present) r.push({ t: 'नाड़ी दोष' + (nd.cancelled ? ' (परिहार संभव)' : ''), items: ['महामृत्युंजय मंत्र का जप (सवा लाख) अथवा विद्वान ब्राह्मण से करवाना', 'नाड़ी दोष निवारण पूजा/शांति — विवाह से पूर्व', 'अन्न, वस्त्र, स्वर्ण या गौ-दान (यथाशक्ति) एवं गरीबों को भोजन', 'विवाह से पूर्व दोनों का स्वास्थ्य परीक्षण (परंपरा के साथ आधुनिक सावधानी)'] });
    if (bd.present) r.push({ t: 'भकूट दोष' + (bd.cancelled ? ' (परिहार संभव)' : ''), items: ['विष्णु सहस्रनाम/ श्री सूक्त का पाठ', 'दोनों राशि-स्वामी ग्रहों की शांति हेतु मंत्र-जप', 'परिवारिक विषयों में खुला संवाद; आर्थिक योजना साझा करें'] });
    if (gd.present) r.push({ t: 'गण दोष', items: ['गणेश आराधना व संकटनाशन स्तोत्र', 'दोनों परिवारों में पूर्व-परामर्श एवं स्वभाव-समझ की बैठकें'] });
    if (mc.level !== 'good' || mb.manglik || mg.manglik) r.push({ t: 'मंगल दोष', items: ['मंगलवार को हनुमान चालीसा/सुंदरकांड का पाठ', 'मंगल शांति पूजा / मंगलनाथ पूजा', 'परंपरा अनुसार कुंभ-विवाह या विष्णु-विवाह (विशेषज्ञ की सलाह से)', 'मूँगा आदि रत्न केवल योग्य ज्योतिषी की जाँच के बाद ही धारण करें'] });
    r.push({ t: 'सामान्य उपाय', items: ['विवाह पूर्व कुलदेवता/इष्टदेव का पूजन व आशीर्वाद', 'गौरी-शंकर पूजा, नित्य परस्पर आदर व संवाद', 'शुभ विवाह मुहूर्त का निर्धारण योग्य पंडित से कराएँ'] });
    return r;
  }

  /* ------------------------------------------------------------------ */
  /*  FULL ANALYSIS                                                      */
  /* ------------------------------------------------------------------ */
  function analyze(cb, cg) {
    var a = ashtakoot(cb, cg);
    var nd = nadiDosha(cb, cg), bd = bhakootDosha(cb, cg), gd = ganaDosha(cb, cg);
    var mb = manglik(cb), mg = manglik(cg), mc = mangalCompat(mb, mg);
    var pl = planetary(cb, cg);
    return { ashtakoot: a, nadi: nd, bhakoot: bd, gana: gd, manglikB: mb, manglikG: mg, mangal: mc, planetary: pl, grade: grade(a.total), remedies: remedies(a, nd, bd, gd, mb, mg, mc) };
  }

  /* per-koota Hindi explanation (outcome specific) */
  function kootaOutcome(k, a) {
    var full = k.got === k.max, zero = k.got === 0;
    var pos = '', ch = '';
    switch (k.key) {
      case 'varna': pos = full ? 'वर का वर्ण वधू के समान/उच्च है — अहं-सामंजस्य सहज।' : ''; ch = full ? '' : 'वर का वर्ण वधू से कम है — कार्य-दृष्टिकोण में अंतर आ सकता है, पर इसका प्रभाव सीमित माना जाता है।'; break;
      case 'vashya': pos = k.got >= 1.5 ? 'एक-दूसरे पर स्वाभाविक प्रभाव और आकर्षण अच्छा रहेगा।' : (k.got >= 1 ? 'आपसी वश्यता मध्यम है।' : ''); ch = k.got < 1 ? 'आपसी प्रभाव में कमी — एक पक्ष दूसरे को समझने में कठिनाई महसूस कर सकता है।' : ''; break;
      case 'tara': pos = k.got === 3 ? 'दोनों ओर शुभ तारा — भाग्य व स्वास्थ्य में सहयोग।' : (k.got ? 'एक ओर तारा शुभ है।' : ''); ch = k.got === 3 ? '' : (k.got ? 'एक ओर अशुभ तारा — स्वास्थ्य/भाग्य में उतार-चढ़ाव की संभावना।' : 'दोनों ओर अशुभ तारा — शांति-उपाय हितकर।'); break;
      case 'yoni': pos = k.got >= 3 ? 'शारीरिक/स्वभावगत अनुकूलता अच्छी है।' : (k.got >= 2 ? 'अनुकूलता सामान्य है।' : ''); ch = k.got === 0 ? 'वैर-योनि (शत्रु योनि) — स्वभाव में विरोधाभास का संकेत।' : (k.got < 2 ? 'अनुकूलता कम — परस्पर समझ से संतुलन संभव।' : ''); break;
      case 'maitri': pos = k.got >= 4 ? 'मानसिक तालमेल और विचारों का मेल बहुत अच्छा है।' : (k.got >= 3 ? 'मानसिक तालमेल ठीक-ठाक है।' : ''); ch = k.got < 3 ? 'विचारों/मानसिकता में अंतर — धैर्य और संवाद आवश्यक।' : ''; break;
      case 'gana': pos = k.got >= 5 ? 'स्वभाव का मेल अच्छा है।' : ''; ch = k.got < 5 ? (zero ? 'गण-भेद गंभीर माना जाता है — स्वभावगत टकराव की संभावना।' : 'स्वभावगत भिन्नता है; सहनशीलता चाहिए।') : ''; break;
      case 'bhakoot': pos = full ? 'राशियों का संबंध शुभ है — पारिवारिक सुख व आर्थिक उन्नति के योग।' : ''; ch = zero ? 'भकूट दोष (' + (a.info.bhakootDist) + ' का संबंध) — पारिवारिक/आर्थिक विषयों में सावधानी।' : ''; break;
      case 'nadi': pos = full ? 'नाड़ी भिन्न है — स्वास्थ्य व संतान के लिए श्रेष्ठ संकेत।' : ''; ch = zero ? 'नाड़ी दोष — स्वास्थ्य/संतान हेतु परंपरा में सावधानी; परिहार व उपाय देखें।' : ''; break;
    }
    return { pos: pos, ch: ch };
  }

  var API = {
    RASHI: RASHI, NAK: NAK, SIGN_LORD: SIGN_LORD, KOOTA_META: KOOTA_META,
    VASHYA_M: VASHYA_M, YONI_M: YONI_M, YONI_BY_NAK: YONI_BY_NAK, GANA_BY_NAK: GANA_BY_NAK, GANA_M: GANA_M, VARNA_BY_SIGN: VARNA_BY_SIGN,
    nadiOf: nadiOf, vashyaGroup: vashyaGroup, rel: rel, profile: profile,
    ashtakoot: ashtakoot, nadiDosha: nadiDosha, bhakootDosha: bhakootDosha, ganaDosha: ganaDosha,
    manglik: manglik, mangalCompat: mangalCompat, planetary: planetary, grade: grade, analyze: analyze, kootaOutcome: kootaOutcome, seventhInfo: seventhInfo, PL_HI: PL_HI
  };
  root.Matching = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  /* ================================================================== */
  /*  UI (browser only)                                                  */
  /* ================================================================== */
  if (typeof document === 'undefined') return;
  var M = API, esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var current = null;   // { people:[boy,girl], res, charts:[cb,cg] }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('mmForm');
    if (!form) return;
    var dl = document.getElementById('cityList');
    if (root.JY && JY.fillCityList) JY.fillCityList(dl);
    form.addEventListener('submit', function (e) { e.preventDefault(); generate(); });
    var s = document.getElementById('mmSample');
    if (s) s.addEventListener('click', fillSample);
    ['b', 'g'].forEach(function (p) {
      var t = document.getElementById(p + 'AdvToggle');
      if (t) t.addEventListener('click', function () { document.getElementById(p + 'Adv').classList.toggle('open'); });
    });
    var c = root.JY && JY.lastCity ? JY.lastCity() : null;
    if (c) { document.getElementById('bPlace').value = JY.cityLabel(c); document.getElementById('gPlace').value = JY.cityLabel(c); }
  });

  function fillSample() {
    var v = { bName: 'उदाहरण वर', bDate: '1995-08-15', bTime: '10:30', gName: 'उदाहरण वधू', gDate: '1997-03-22', gTime: '06:15' };
    Object.keys(v).forEach(function (k) { document.getElementById(k).value = v[k]; });
    document.getElementById('bPlace').value = 'Jaipur, Rajasthan, India';
    document.getElementById('gPlace').value = 'Jaipur, Rajasthan, India';
  }

  function readPerson(p, label) {
    var name = document.getElementById(p + 'Name').value.trim() || label;
    var ds = document.getElementById(p + 'Date').value, ts = document.getElementById(p + 'Time').value;
    if (!ds || !ts) throw new Error(label + ' की जन्म तिथि और समय भरें।');
    var dp = ds.split('-').map(Number), tp = ts.split(':').map(Number);
    var place = document.getElementById(p + 'Place').value.trim();
    var city = root.JY ? JY.findCity(place) : null;
    var lat, lon, tz, placeLabel;
    var la = document.getElementById(p + 'Lat').value, lo = document.getElementById(p + 'Lon').value, tzv = document.getElementById(p + 'Tz').value;
    if (la !== '' && lo !== '') {
      lat = parseFloat(la); lon = parseFloat(lo); tz = tzv !== '' ? parseFloat(tzv) : 5.5; placeLabel = place || (lat + ', ' + lon);
    } else if (city) {
      lat = city.lat; lon = city.lon; tz = JY.cityTz(city, dp[0], dp[1], dp[2], tp[0], tp[1]); placeLabel = JY.cityLabel(city);
    } else throw new Error(label + ' का जन्म स्थान सूची से चुनें, या "उन्नत" में अक्षांश/देशांतर/समय-क्षेत्र भरें।');
    return { name: name, y: dp[0], m: dp[1], d: dp[2], hour: tp[0], minute: tp[1], tz: tz, lat: lat, lon: lon, place: placeLabel };
  }

  function generate() {
    var boy, girl;
    try { boy = readPerson('b', 'वर'); girl = readPerson('g', 'वधू'); } catch (e) { JY.toast(e.message); alert(e.message); return; }
    var cb, cg;
    try { cb = Astro.compute(boy); cg = Astro.compute(girl); } catch (e) { alert('गणना में त्रुटि: ' + e.message); return; }
    var res = analyze(cb, cg);
    current = { people: [boy, girl], charts: [cb, cg], res: res };
    render();
    var out = document.getElementById('mmOut');
    out.style.display = 'block';
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('mmActions').style.display = 'flex';
  }

  /* ---------- rendering ---------- */
  function fmtD(p) { return pad(p.d) + '/' + pad(p.m) + '/' + p.y + ', ' + pad(p.hour) + ':' + pad(p.minute) + ' (UTC' + (p.tz >= 0 ? '+' : '') + p.tz + ')'; }
  function pageHead(t) { return '<div class="mm-pagehead"><span>🕉️</span> ' + t + ' <span>🕉️</span></div>'; }
  function chipFor(level, text) { return '<span class="mm-chip ' + level + '">' + text + '</span>'; }
  function fmtScore(n) { var h = Math.round(n * 2) / 2, w = Math.floor(h); return (h % 1) ? (w ? w : '') + '½' : String(w); }

  function personBox(role, p, c) {
    var m = c.planets.Moon;
    return '<div class="mm-person"><h4>' + role + ': ' + esc(p.name) + '</h4><table class="mm-kv">' +
      '<tr><td>जन्म</td><td>' + fmtD(p) + '</td></tr><tr><td>स्थान</td><td>' + esc(p.place) + '</td></tr>' +
      '<tr><td>लग्न</td><td>' + c.lagna.signHi + '</td></tr><tr><td>चंद्र राशि</td><td>' + m.signHi + '</td></tr>' +
      '<tr><td>नक्षत्र / पाद</td><td>' + m.nakHi + ' / ' + m.pada + '</td></tr></table></div>';
  }

  function summaryPage() {
    var r = current.res, a = r.ashtakoot, g = r.grade;
    var pct = Math.round(a.total / 36 * 100);
    var rows = a.kootas.map(function (k, i) {
      return '<tr><td>' + (i + 1) + '. ' + k.name + '</td><td class="c">' + k.max + '</td><td class="c"><b>' + fmtScore(k.got) + '</b></td><td>' + esc(k.detail) + '</td></tr>';
    }).join('');
    return '<div class="mm-page">' + pageHead('विवाह गुण मिलान — अष्टकूट') +
      '<div class="mm-cover"><div class="mm-names">' + esc(current.people[0].name) + ' <span>💍</span> ' + esc(current.people[1].name) + '</div><div class="mm-sub">PanditSeva.in — वैदिक कुंडली मिलान रिपोर्ट</div></div>' +
      '<div class="mm-two">' + personBox('वर', current.people[0], current.charts[0]) + personBox('वधू', current.people[1], current.charts[1]) + '</div>' +
      '<div class="mm-score"><div class="mm-ring" style="--p:' + pct + '"><div><b>' + fmtScore(a.total) + '</b><small>/ 36</small></div></div>' +
      '<div class="mm-scoretxt"><div class="mm-grade ' + g.level + '">' + g.label + '</div><p>' + g.text + '</p></div></div>' +
      '<div class="mm-scroll"><table class="mm-table"><thead><tr><th>कूट</th><th>अधिकतम</th><th>प्राप्त</th><th>विवरण</th></tr></thead><tbody>' + rows +
      '<tr class="tot"><td>कुल</td><td class="c">36</td><td class="c"><b>' + fmtScore(a.total) + '</b></td><td>' + pct + '%</td></tr></tbody></table></div>' +
      '<p class="mm-small">विधि: अष्टकूट गुण-मिलान, चंद्र नक्षत्र/राशि (निरयन, लाहिरी अयनांश) के आधार पर गणना।</p></div>';
  }

  function kootaPage() {
    var r = current.res, a = r.ashtakoot;
    var cards = a.kootas.map(function (k) {
      var o = M.kootaOutcome(k, a);
      var lv = k.got === k.max ? 'good' : (k.got === 0 ? 'bad' : 'mid');
      return '<div class="mm-koota"><div class="mm-kh"><b>' + k.name + '</b> ' + chipFor(lv, fmtScore(k.got) + ' / ' + k.max) + '</div>' +
        '<p class="mm-what">' + k.what + '</p><p class="mm-det">' + esc(k.detail) + '</p>' +
        (o.pos ? '<p class="mm-pos">✔ ' + o.pos + '</p>' : '') + (o.ch ? '<p class="mm-neg">⚠ ' + o.ch + '</p>' : '') + '</div>';
    }).join('');
    return '<div class="mm-page">' + pageHead('आठ कूटों का विस्तृत विश्लेषण') + '<div class="mm-kgrid">' + cards + '</div></div>';
  }

  function doshaLine(title, d, extra) {
    var st = !d.present ? chipFor('good', 'दोष नहीं') : (d.cancelled ? chipFor('mid', 'दोष है — परिहार संभव') : chipFor('bad', 'दोष है'));
    var rs = d.reasons && d.reasons.length ? '<ul>' + d.reasons.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : '';
    return '<div class="mm-dosha"><div class="mm-kh"><b>' + title + '</b> ' + st + '</div>' + (extra ? '<p>' + extra + '</p>' : '') + rs + '</div>';
  }
  function manglikLine(role, m) {
    var st = m.manglik ? chipFor(m.mitigations.length ? 'mid' : 'bad', 'मांगलिक') : chipFor('good', 'मांगलिक नहीं');
    return '<div class="mm-dosha"><div class="mm-kh"><b>' + role + '</b> ' + st + '</div><p>मंगल: लग्न से ' + m.houseLagna + 'वें भाव में' + (m.fromLagna ? ' (दोषकारक)' : '') + ', चंद्र से ' + m.houseMoon + 'वें भाव में' + (m.fromMoon ? ' (दोषकारक)' : '') + '।</p>' +
      (m.mitigations.length ? '<ul>' + m.mitigations.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : '') + '</div>';
  }

  function doshaPage() {
    var r = current.res;
    var nExtra = r.nadi.present ? 'दोनों की नाड़ी एक समान है (' + M.ashtakoot(current.charts[0], current.charts[1]).kootas[7].detail + ').' : 'नाड़ी भिन्न है।';
    var bExtra = r.bhakoot.present ? 'राशियों का संबंध: ' + r.bhakoot.kind + '.' : 'भकूट का संबंध शुभ है।';
    var pl = r.planetary.map(function (x) { return '<li class="' + x.level + '"><b>' + x.title + ':</b> ' + x.text + '</li>'; }).join('');
    return '<div class="mm-page">' + pageHead('दोष विश्लेषण एवं ग्रह-मैत्री') +
      '<h3 class="mm-h3">दोष एवं परिहार</h3>' + doshaLine('नाड़ी दोष', r.nadi, nExtra) + doshaLine('भकूट दोष', r.bhakoot, bExtra) + doshaLine('गण दोष', r.gana, r.gana.note) +
      '<h3 class="mm-h3">मांगलिक दोष</h3>' + manglikLine('वर', r.manglikB) + manglikLine('वधू', r.manglikG) +
      '<div class="mm-verdict ' + r.mangal.level + '"><b>' + r.mangal.title + '</b><p>' + r.mangal.text + '</p></div>' +
      '<h3 class="mm-h3">ग्रह-स्थिति आधारित अनुकूलता</h3><ul class="mm-pl">' + pl + '</ul></div>';
  }

  function finalPage() {
    var r = current.res, g = r.grade;
    var rem = r.remedies.map(function (x) { return '<div class="mm-rem"><b>' + x.t + '</b><ul>' + x.items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul></div>'; }).join('');
    var strong = [], weak = [];
    r.ashtakoot.kootas.forEach(function (k) { if (k.got === k.max) strong.push(k.name); else if (k.got <= k.max * 0.25) weak.push(k.name); });
    return '<div class="mm-page">' + pageHead('उपाय एवं निष्कर्ष') +
      '<h3 class="mm-h3">पारंपरिक उपाय</h3>' + rem +
      '<h3 class="mm-h3">समग्र निष्कर्ष</h3>' +
      '<div class="mm-verdict ' + g.level + '"><b>' + fmtScore(r.ashtakoot.total) + ' / 36 — ' + g.label + '</b><p>' + g.text + '</p>' +
      (strong.length ? '<p>✔ पूर्ण अंक वाले कूट: ' + strong.join(', ') + '</p>' : '') + (weak.length ? '<p>⚠ ध्यान देने योग्य कूट: ' + weak.join(', ') + '</p>' : '') + '</div>' +
      '<div class="mm-warn"><b>महत्वपूर्ण:</b> विवाह जैसा निर्णय केवल गुणांक (स्कोर) के आधार पर नहीं लिया जाना चाहिए। दोनों की पूर्ण जन्म कुंडली, ग्रह-बल, दशा-अंतर्दशा, नवांश, सप्तम भाव, आयु, स्वास्थ्य, स्वभाव और पारिवारिक पृष्ठभूमि का समग्र विचार आवश्यक है। कृपया किसी योग्य ज्योतिषी से पूर्ण कुंडली-परीक्षण अवश्य कराएँ।</div>' +
      '<p class="mm-small">यह रिपोर्ट स्वचालित गणना व नियम-आधारित व्याख्या है, किसी ज्योतिषी द्वारा व्यक्तिगत रूप से सत्यापित नहीं। वश्य व गण की तालिकाओं में विभिन्न परंपराओं में थोड़ा भेद मिलता है; यहाँ प्रचलित मानक तालिका प्रयुक्त है। विशेषज्ञ समीक्षा हेतु WhatsApp: 7737782519 — PanditSeva.in</p></div>';
  }

  function lockedCard() {
    return '<div class="mm-locked"><i class="fas fa-lock"></i><h3>पूर्ण रिपोर्ट Premium सदस्यों के लिए</h3><p>कूट-वार विस्तृत विश्लेषण, दोष-परिहार, ग्रह-अनुकूलता, उपाय और PDF — Premium में उपलब्ध।</p><a class="jy-btn gold" href="premium.html">Premium देखें</a></div>';
  }

  function render() {
    var out = document.getElementById('mmOut');
    var html = summaryPage();
    var full = !root.JY || JY.can('matching_full');
    if (full) html += kootaPage() + doshaPage() + finalPage();
    else html += lockedCard();
    out.innerHTML = html;
    var pdfBtn = document.getElementById('mmPdf');
    if (pdfBtn) pdfBtn.disabled = !full;
    var badge = document.getElementById('mmBadge');
    if (badge && root.JY) badge.innerHTML = JY.premiumBadge();
  }

  /* ---------- PDF / print / share ---------- */
  root.downloadMatchingPDF = function () {
    if (!current) { alert('पहले कुंडली मिलान करें।'); return; }
    if (!window.jspdf || !window.html2canvas) { alert('PDF लाइब्रेरी लोड हो रही है, कृपया पुनः प्रयास करें।'); return; }
    var btn = document.getElementById('mmPdf'), old = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> बन रहा है...'; btn.disabled = true;
    var pages = document.querySelectorAll('#mmOut .mm-page');
    var holder = document.createElement('div');
    holder.className = 'mm-offscreen'; document.body.appendChild(holder);
    var pdf = new window.jspdf.jsPDF('p', 'mm', 'a4'), pw = 210, ph = 297, m = 6, idx = 0, first = true;
    function done(err) {
      holder.remove(); btn.innerHTML = old; btn.disabled = false;
      if (err) alert('PDF बनाने में समस्या: ' + err.message);
    }
    function next() {
      if (idx >= pages.length) { pdf.save('Kundali-Milan-' + (current.people[0].name + '-' + current.people[1].name).replace(/\s+/g, '_') + '.pdf'); done(); return; }
      holder.innerHTML = ''; var clone = pages[idx].cloneNode(true); holder.appendChild(clone);
      html2canvas(clone, { scale: 2, backgroundColor: '#fdf6e3', useCORS: true }).then(function (canvas) {
        var iw = pw - 2 * m, scale = iw / canvas.width, pageHpx = Math.floor((ph - 2 * m) / scale);
        for (var y = 0; y < canvas.height; y += pageHpx) {
          var h = Math.min(pageHpx, canvas.height - y);
          var c2 = document.createElement('canvas'); c2.width = canvas.width; c2.height = h;
          c2.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
          if (!first) pdf.addPage(); first = false;
          pdf.addImage(c2.toDataURL('image/jpeg', 0.92), 'JPEG', m, m, iw, h * scale);
        }
        idx++; setTimeout(next, 30);
      }).catch(done);
    }
    next();
  };
  root.printMatching = function () { if (!current) { alert('पहले कुंडली मिलान करें।'); return; } window.print(); };
  root.shareMatching = async function () {
    if (!current) { alert('पहले कुंडली मिलान करें।'); return; }
    var a = current.res.ashtakoot;
    var txt = '🕉️ कुंडली मिलान — ' + current.people[0].name + ' & ' + current.people[1].name + '\nगुण: ' + fmtScore(a.total) + '/36 (' + current.res.grade.label + ')\n' +
      a.kootas.map(function (k) { return k.name + ' ' + fmtScore(k.got) + '/' + k.max; }).join(', ') + '\nसंपूर्ण रिपोर्ट: PanditSeva.in';
    if (navigator.share) { try { await navigator.share({ title: 'कुंडली मिलान — PanditSeva.in', text: txt }); return; } catch (e) { } }
    window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
  };
})(typeof window !== 'undefined' ? window : globalThis);
