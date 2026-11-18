/* ============================================================================
   kundali.js — Premium handwritten-style Janam Kundali report (kundali.html)
   Calculation: Astro.compute (real astronomy).  Text: KContent (rule-driven).
   Honest labelling: the report says "स्वचालित गणना" unless a pandit's real
   handwritten kundali (scan/PDF) is attached in the approval panel.
   ========================================================================== */
(function () {
  'use strict';
  var KC = KContent;
  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var esc = KC.esc;

  var current = null;                       // last computed chart
  var astrologer = { name: '', phone: '', qualification: '', note: '' };
  var approval = null;                      // { pandit, fileName, mime, dataUrl, objectUrl, ts }

  /* =================== INIT =================== */
  document.addEventListener('DOMContentLoaded', function () {
    KC.injectStyle();
    KForm.bind();
    $('kundaliForm').addEventListener('submit', function (e) { e.preventDefault(); generate(); });
    $('sampleBtn').addEventListener('click', KForm.fillSample);
    $('advToggle').addEventListener('click', function () { $('advBox').classList.toggle('open'); });
    JY.launchBanner($('kLaunch'));
    wireAstroPanel();
  });

  function wireAstroPanel() {
    JY.store.get('astrologer', null).then(function (a) {
      if (a) { astrologer = Object.assign(astrologer, a); }
      $('asName').value = astrologer.name || ''; $('asPhone').value = astrologer.phone || '';
      $('asQual').value = astrologer.qualification || ''; $('asNote').value = astrologer.note || '';
      if (current) renderReport(current);
    });
    $('asSave').addEventListener('click', function () {
      astrologer = { name: $('asName').value.trim(), phone: $('asPhone').value.trim(), qualification: $('asQual').value.trim(), note: $('asNote').value.trim() };
      JY.store.set('astrologer', astrologer).then(function () {
        $('asStatus').textContent = JY.store.mode() === 'local' ? 'सहेजा (केवल इस ब्राउज़र में)' : 'सहेजा';
        if (current) renderReport(current);
      }).catch(function () { $('asStatus').textContent = 'सहेजने में त्रुटि — केवल admin सहेज सकता है।'; });
    });
    $('apAttach').addEventListener('click', function () {
      var f = $('apFile').files[0], nm = $('apName').value.trim();
      if (!nm) { $('apStatus').textContent = 'कृपया पंडित का नाम भरें।'; return; }
      if (!f) { $('apStatus').textContent = 'कृपया हस्तलिखित कुंडली की फ़ाइल चुनें।'; return; }
      if (f.size > 8 * 1024 * 1024) { $('apStatus').textContent = 'फ़ाइल 8MB से छोटी रखें।'; return; }
      var rd = new FileReader();
      rd.onload = function () {
        approval = { pandit: nm, fileName: f.name, mime: f.type, size: f.size, ts: Date.now(), dataUrl: f.type.indexOf('image/') === 0 ? rd.result : null, objectUrl: URL.createObjectURL(f) };
        var key = current ? 'report_approval_' + (current.birth.name + current.birth.y + pad(current.birth.m) + pad(current.birth.d)).replace(/\s+/g, '') : null;
        if (key) JY.store.set(key, { pandit: nm, fileName: f.name, mime: f.type, size: f.size, ts: approval.ts });   // metadata only; the file itself stays in this browser
        $('apStatus').textContent = 'संलग्न: ' + f.name + ' — रिपोर्ट पर सत्यापन मुहर लगी।';
        if (current) renderReport(current);
      };
      rd.readAsDataURL(f);
    });
    $('apRemove').addEventListener('click', function () {
      if (approval && approval.objectUrl) URL.revokeObjectURL(approval.objectUrl);
      approval = null; $('apStatus').textContent = 'संलग्नक हटाया गया।'; if (current) renderReport(current);
    });
  }

  /* =================== GENERATE =================== */
  function generate() {
    var err = $('kErr');
    if (!JY.can('kundali_handwritten')) {
      err.innerHTML = '<div class="jy-note warn">हस्तलिखित-शैली प्रीमियम कुंडली Premium सदस्यों के लिए है। <a href="premium.html" style="text-decoration:underline">Premium देखें</a></div>'; return;
    }
    var r = KForm.read();
    if (!r.ok) { err.innerHTML = '<div class="jy-note warn">' + esc(r.error) + '</div>'; return; }
    err.innerHTML = '';
    try { current = Astro.compute(r.birth); } catch (e) { err.innerHTML = '<div class="jy-note warn">गणना में त्रुटि: ' + esc(e.message) + '</div>'; return; }
    renderReport(current);
    var out = $('kundaliOutput'); out.style.display = 'block';
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('kActions').style.display = 'flex';
    $('astroPanel').style.display = 'block';
  }

  /* =================== PAGE BUILDERS =================== */
  function pageHead(t) { return '<div class="kundali-pagehead"><span>🕉️</span> ' + t + ' <span>🕉️</span></div>'; }
  function brow(k, v) { return '<tr><td class="bk">' + k + '</td><td class="bv">' + v + '</td></tr>'; }
  function page(inner, cls) { return '<div class="kundali-page ' + (cls || '') + '">' + inner + '</div>'; }
  function ch(d, k, style, size) { return KCharts.render(style || 'north', d.charts[k], { theme: 'ink', size: size || 310 }); }

  function coverPage(d) {
    var b = d.birth, dob = pad(b.d) + '/' + pad(b.m) + '/' + b.y, tob = pad(b.hour) + ':' + pad(b.minute);
    var stamp = approval
      ? '<div class="cover-stamp">✔ पंडित द्वारा सत्यापित — ' + esc(approval.pandit) + '</div>'
      : '<div class="cover-stamp auto">स्वचालित गणना · पंडित-सत्यापन लंबित</div>';
    var pandit = astrologer.name
      ? '<div class="cover-pandit"><div>ज्योतिषी / पंडित</div><b>' + esc(astrologer.name) + '</b>' + (astrologer.qualification ? '<br>' + esc(astrologer.qualification) : '') + (astrologer.phone ? '<br>फ़ोन: ' + esc(astrologer.phone) : '') + (astrologer.note ? '<br><i>' + esc(astrologer.note) + '</i>' : '') + '</div>'
      : '<div class="cover-pandit"><b>PanditSeva.in</b><br>पारंपरिक वैदिक ज्योतिष सेवा · फ़ोन: ' + JY.CONFIG.phone + '</div>';
    return page('<div class="cover-border"><div class="cover-om">🕉️</div><div class="cover-shlok">॥ श्री गणेशाय नमः ॥</div>'
      + '<h1 class="cover-title">जन्म कुंडली</h1><div class="cover-sub">एवं विस्तृत फलादेश</div>'
      + '<div class="cover-name">' + esc(b.name) + '</div>'
      + '<div class="cover-dob">' + dob + ' &nbsp;•&nbsp; ' + tob + ' &nbsp;•&nbsp; ' + esc(b.place) + '</div>'
      + '<div class="shloka">जपाकुसुमसंकाशं काश्यपेयं महाद्युतिम्।<br>तमोऽरिं सर्वपापघ्नं प्रणतोऽस्मि दिवाकरम्॥</div>'
      + stamp + pandit
      + '<div class="cover-foot" style="margin-top:16px">PanditSeva.in — पारंपरिक वैदिक ज्योतिष सेवा</div></div>', 'kundali-cover');
  }

  function birthPage(d) {
    var b = d.birth, P = d.planets;
    return page(pageHead('जन्म विवरण (Birth Details)')
      + '<div class="shloka">ॐ ब्रह्मा मुरारिस्त्रिपुरान्तकारी भानुः शशी भूमिसुतो बुधश्च।<br>गुरुश्च शुक्रः शनिराहुकेतवः कुर्वन्तु सर्वे मम सुप्रभातम्॥</div>'
      + '<table class="kundali-table birth-table">'
      + brow('पूर्ण नाम', esc(b.name)) + brow('जन्म तिथि', pad(b.d) + '/' + pad(b.m) + '/' + b.y) + brow('जन्म समय', pad(b.hour) + ':' + pad(b.minute) + ' (' + KForm.tzLabel(b.tz) + (b.tzId && isNaN(b.tzId) ? ', ' + esc(b.tzId) : '') + ')')
      + brow('जन्म स्थान', esc(b.place)) + brow('अक्षांश / देशांतर', b.lat.toFixed(4) + '° / ' + b.lon.toFixed(4) + '°')
      + brow('लग्न (Ascendant)', d.lagna.signHi + ' (' + d.lagna.dms + ')') + brow('लग्नेश', Astro.PL[d.lagnaLord].hi)
      + brow('चंद्र राशि', P.Moon.signHi) + brow('जन्म नक्षत्र', P.Moon.nakHi + ' — पाद ' + P.Moon.pada)
      + brow('सूर्य राशि (निरयन)', P.Sun.signHi) + brow('अयनांश (लाहिड़ी)', d.ayanamsa.toFixed(4) + '°') + '</table>'
      + '<p class="kundali-note" style="margin-top:14px">ग्रह-स्थिति निरयन (सिडेरियल) पद्धति, लाहिड़ी अयनांश, होल-साइन भाव और माध्य राहु-केतु के आधार पर गणना की गई है।</p>');
  }

  function chartPages(d) {
    var h = '';
    h += page(pageHead('जन्म कुंडली चक्र — लग्न एवं चंद्र') + '<div class="charts2">' + ch(d, 'D1') + ch(d, 'Moon') + '</div>'
      + '<p class="kundali-note" style="text-align:center">उत्तर भारतीय शैली — ऊपर का हीरा लग्न (भाव 1); अंक राशि-संख्या (1=मेष … 12=मीन)। लाल अक्षर + ‘व’ = वक्री। चंद्र कुंडली में चंद्र को लग्न मानकर भाव गिने जाते हैं।</p>');
    h += page(pageHead('नवांश (D-9) एवं दशमांश (D-10) चक्र') + '<div class="charts2">' + ch(d, 'D9') + ch(d, 'D10') + '</div>'
      + '<p class="kundali-note" style="text-align:center">नवांश (D-9) — विवाह, धर्म व ग्रह-बल का सूक्ष्म विचार। दशमांश (D-10) — करियर व कर्म-क्षेत्र का विचार।</p>');
    h += page(pageHead('दक्षिण भारतीय शैली') + '<div class="charts2">' + ch(d, 'D1', 'south') + ch(d, 'D9', 'south') + '</div>'
      + '<p class="kundali-note" style="text-align:center">दक्षिण भारतीय शैली में राशियाँ स्थिर रहती हैं; तिरछी रेखा व ‘ल’ वाला खाना लग्न है।</p>');
    return h;
  }

  function tablesPage(d) {
    var rows = '', bh = '', as = '';
    d.planetOrder.forEach(function (k) {
      var p = d.planets[k], st = [];
      if (p.retro) st.push('वक्री'); if (p.combust) st.push('अस्त');
      rows += '<tr><td>' + p.hi + '</td><td>' + p.signHi + '</td><td>' + p.dms + '</td><td>' + p.nakHi + ' (' + p.pada + ')</td><td>' + p.house + '</td><td>' + (p.dignity.code === 'node' ? '—' : p.dignity.hi) + '</td><td>' + (st.join(', ') || '—') + '</td><td>' + p.navSignHi + '</td></tr>';
    });
    d.houses.forEach(function (h) {
      bh += '<tr><td>' + h.house + '</td><td>' + h.signHi + '</td><td>' + d.planets[h.lordKey].hi + ' (' + h.lordHouse + ')</td><td>' + (h.planets.map(function (p) { return p.hi; }).join(', ') || '—') + '</td><td>' + (h.aspectedBy.map(function (k) { return d.planets[k].hi; }).join(', ') || '—') + '</td></tr>';
    });
    d.planetOrder.forEach(function (k) {
      var a = d.aspects.byPlanet[k];
      as += '<tr><td>' + d.planets[k].hi + (a.optional ? '*' : '') + '</td><td>' + a.houses.join(', ') + '</td><td>' + (a.planets.map(function (x) { return d.planets[x].hi; }).join(', ') || '—') + '</td></tr>';
    });
    return page(pageHead('ग्रह स्थिति (Planetary Positions)')
      + '<table class="kundali-table"><thead><tr><th>ग्रह</th><th>राशि</th><th>अंश</th><th>नक्षत्र (पाद)</th><th>भाव</th><th>बल</th><th>स्थिति</th><th>नवांश</th></tr></thead><tbody>' + rows + '</tbody></table>'
      + '<h3 class="kundali-h3" style="margin-top:20px">भाव तालिका</h3>'
      + '<table class="kundali-table"><thead><tr><th>भाव</th><th>राशि</th><th>भावेश (कहाँ)</th><th>स्थित ग्रह</th><th>दृष्टि</th></tr></thead><tbody>' + bh + '</tbody></table>')
      + page(pageHead('ग्रह-दृष्टि (Aspects)')
        + '<table class="kundali-table"><thead><tr><th>ग्रह</th><th>दृष्टि भाव</th><th>दृष्ट ग्रह</th></tr></thead><tbody>' + as + '</tbody></table>'
        + '<p class="kundali-note">सभी ग्रह 7वीं दृष्टि; मंगल 4/8, गुरु 5/9, शनि 3/10 की विशेष दृष्टि। *राहु-केतु की दृष्टि मतांतर से वैकल्पिक।</p>');
  }

  function explainPages(d) {
    var h = '';
    h += page(pageHead('लग्न, राशि एवं जीवन-क्षेत्र') + KC.lagnaHTML(d) + KC.areasHTML(d));
    ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'].forEach(function (k, i) {
      h += page(pageHead(Astro.PL[k].hi + ' — विस्तृत फलादेश') + (i === 0 ? '<p class="kundali-note">प्रत्येक ग्रह के फल उसकी राशि, भाव, बल, भावेश-स्थिति, दृष्टि और जीवन-क्षेत्रों के आधार पर लिखे गए हैं।</p>' : '') + KC.planetHTML(d, k));
    });
    h += page(pageHead('योग-विश्लेषण') + KC.yogaHTML(d));
    h += page(pageHead('दोष-विश्लेषण') + KC.doshaHTML(d));
    return h;
  }

  function dashaPages(d) {
    var dd = d.dasha, h = '';
    h += page(pageHead('विंशोत्तरी महादशा विश्लेषण') + KC.sec('महादशा एवं वर्तमान काल', '⏳', KC.dashaHTML(d)));
    var seq = dd.sequence, idx = dd.current ? seq.indexOf(dd.current) : 0, body = '';
    [idx, idx + 1].forEach(function (i) {
      if (!seq[i]) return;
      body += '<h3 class="kundali-h3">' + seq[i].lordHi + ' महादशा — अंतर्दशा</h3>' + KC.antarTableHTML(seq[i], d.nowJD);
    });
    if (dd.pratyantars) body += '<h3 class="kundali-h3">वर्तमान अंतर्दशा (' + dd.currentAntar.lordHi + ') के प्रत्यंतर</h3><table class="kx-table"><thead><tr><th>प्रत्यंतर</th><th>आरंभ</th><th>समाप्ति</th></tr></thead><tbody>'
      + dd.pratyantars.map(function (x) { var c = d.nowJD >= x.startJD && d.nowJD < x.endJD; return '<tr' + (c ? ' class="kx-cur"' : '') + '><td>' + x.lordHi + '</td><td>' + KC.fmtDate(Astro.jdToDate(x.startJD)) + '</td><td>' + KC.fmtDate(Astro.jdToDate(x.endJD)) + '</td></tr>'; }).join('') + '</tbody></table>';
    h += page(pageHead('अंतर्दशा तालिका') + body);
    return h;
  }

  function scanPage() {
    if (!approval) return '';
    var inner = pageHead('संलग्न — पंडित द्वारा तैयार हस्तलिखित कुंडली') + '<p class="kundali-note">पंडित: <b>' + esc(approval.pandit) + '</b> · फ़ाइल: ' + esc(approval.fileName) + '</p>';
    if (approval.dataUrl) inner += '<img class="scan-img" alt="हस्तलिखित कुंडली" src="' + approval.dataUrl + '">';
    else inner += '<p>यह फ़ाइल PDF है और इस पूर्वावलोकन में पन्ने के रूप में नहीं जुड़ सकती। <a href="' + approval.objectUrl + '" target="_blank" class="btn btn-outline btn-sm">फ़ाइल खोलें</a> (केवल इसी ब्राउज़र में)।</p>';
    return page(inner);
  }

  function endPage(d) {
    var b = d.birth;
    var status = approval
      ? '<p><b>सत्यापन स्थिति:</b> पंडित <b>' + esc(approval.pandit) + '</b> द्वारा तैयार हस्तलिखित कुंडली (' + esc(approval.fileName) + ') इस रिपोर्ट के साथ संलग्न की गई है।</p>'
      : '<p><b>सत्यापन स्थिति:</b> यह रिपोर्ट <b>स्वचालित गणना</b> है; किसी पंडित द्वारा व्यक्तिगत रूप से जाँची या हस्तलिखित नहीं है।</p>';
    return page('<h3 class="kundali-h3">⚠️ महत्वपूर्ण सूचना / Disclaimer</h3>' + status
      + '<p>' + KC.DISCLAIMER + '</p>'
      + '<p>महत्वपूर्ण निर्णयों (विवाह, स्वास्थ्य, धन) से पूर्व किसी अनुभवी पंडित/ज्योतिषी से परामर्श अवश्य करें।</p>'
      + '<div class="verify-cta"><b>🖋️ पंडित जी द्वारा व्यक्तिगत समीक्षित / हस्तलिखित कुंडली चाहिए?</b><p>अनुभवी ज्योतिषी से इस कुंडली की व्यक्तिगत समीक्षा करवाएँ।</p>'
      + '<a href="https://wa.me/' + JY.CONFIG.whatsapp + '?text=' + encodeURIComponent('मुझे पंडित जी द्वारा समीक्षित हस्तलिखित प्रीमियम कुंडली चाहिए — ' + b.name) + '" target="_blank" class="btn btn-green btn-sm"><i class="fab fa-whatsapp"></i> पंडित जी से बात करें</a> '
      + '<a href="tel:' + JY.CONFIG.phone + '" class="btn btn-primary btn-sm"><i class="fas fa-phone-alt"></i> ' + JY.CONFIG.phone + '</a></div>'
      + '<div class="shloka" style="margin-top:20px">सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः।<br>सर्वे भद्राणि पश्यन्तु मा कश्चिद्दुःखभाग्भवेत्॥</div>'
      + '<p class="kundali-gen">तैयार: PanditSeva.in वैदिक ज्योतिष इंजन · गोचर-आधारित अंश गणना-तिथि ' + KC.fmtDate(Astro.jdToDate(d.nowJD)) + ' के अनुसार</p>', 'kundali-disclaimer');
  }

  function renderReport(d) {
    $('kundaliOutput').innerHTML = coverPage(d) + birthPage(d) + chartPages(d) + tablesPage(d) + explainPages(d) + dashaPages(d)
      + page(pageHead('उपाय एवं मंत्र') + KC.remedyHTML(d)) + scanPage() + endPage(d);
  }

  /* =================== PDF / PRINT / SHARE =================== */
  function setProg(t) { var el = $('pdfProg'); el.style.display = t ? 'block' : 'none'; el.textContent = t || ''; }

  window.downloadKundaliPDF = async function () {
    if (!current) { alert('पहले कुंडली बनाएँ।'); return; }
    if (!JY.can('pdf_detailed')) { alert('विस्तृत PDF डाउनलोड Premium सुविधा है।'); location.href = 'premium.html'; return; }
    if (!window.jspdf || !window.html2canvas) { alert('PDF लाइब्रेरी लोड हो रही है — कृपया कुछ क्षण बाद पुनः प्रयास करें।'); return; }
    var btn = $('pdfBtn'), old = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> बन रहा है...'; btn.disabled = true;
    var stage = null;
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      // render pages in a fixed A4-width staging area so the PDF looks the same on phone and desktop
      stage = document.createElement('div');
      stage.style.cssText = 'position:fixed;left:-12000px;top:0;width:794px;background:#fdf6e3;pointer-events:none';
      stage.innerHTML = $('kundaliOutput').innerHTML;
      document.body.appendChild(stage);
      var pages = stage.querySelectorAll('.kundali-page'), jsPDF = window.jspdf.jsPDF, pdf = new jsPDF('p', 'mm', 'a4'), PW = 210, PH = 297, first = true;
      for (var i = 0; i < pages.length; i++) {
        setProg('पृष्ठ ' + (i + 1) + ' / ' + pages.length + ' तैयार हो रहा है…');
        var canvas = await html2canvas(pages[i], { scale: 1.6, backgroundColor: '#fdf6e3', useCORS: true, windowWidth: 794 });
        var pxPerMm = canvas.width / PW, sliceH = Math.floor(PH * pxPerMm);
        for (var y = 0; y < canvas.height; y += sliceH) {
          var h = Math.min(sliceH, canvas.height - y), c2 = document.createElement('canvas');
          c2.width = canvas.width; c2.height = h;
          c2.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
          if (!first) pdf.addPage(); first = false;
          pdf.setFillColor(253, 246, 227); pdf.rect(0, 0, PW, PH, 'F');
          pdf.addImage(c2.toDataURL('image/jpeg', 0.82), 'JPEG', 0, 0, PW, h / pxPerMm);
        }
        await new Promise(function (r) { setTimeout(r, 20); });
      }
      pdf.save('Kundali-' + (current.birth.name || 'janam').replace(/\s+/g, '_') + '.pdf');
    } catch (e) {
      alert('PDF बनाने में समस्या: ' + (e && e.message ? e.message : e));
    } finally {
      if (stage) stage.remove();
      setProg(''); btn.innerHTML = old; btn.disabled = false;
    }
  };

  window.printKundali = function () {
    if (!current) { alert('पहले कुंडली बनाएँ।'); return; }
    window.print();
  };

  window.shareKundali = async function () {
    if (!current) { alert('पहले कुंडली बनाएँ।'); return; }
    var b = current.birth;
    var txt = '🕉️ ' + b.name + ' की जन्म कुंडली — PanditSeva.in\nलग्न: ' + current.lagna.signHi + ', चंद्र राशि: ' + current.planets.Moon.signHi + ', नक्षत्र: ' + current.planets.Moon.nakHi
      + '\nविस्तृत प्रीमियम कुंडली हेतु: ' + location.origin + location.pathname;
    if (navigator.share) { try { await navigator.share({ title: 'जन्म कुंडली — PanditSeva.in', text: txt }); return; } catch (e) { } }
    window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
  };
})();
