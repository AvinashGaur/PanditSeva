/* ============================================================================
   janam-kundali.js — UI for janam-kundali.html
   Calculation = Astro.compute (real astronomy). Text = KContent (rule-driven).
   ========================================================================== */
(function () {
  'use strict';
  var KC = KContent, cur = null, chartStyle = 'north';
  function $(id) { return document.getElementById(id); }
  var TABS = [
    { id: 'charts', hi: 'कुंडली चक्र', feat: 'kundali_detailed', free: true },
    { id: 'planets', hi: 'ग्रह स्थिति', feat: 'kundali_detailed' },
    { id: 'houses', hi: '12 भाव', feat: 'kundali_detailed' },
    { id: 'aspects', hi: 'दृष्टि', feat: 'kundali_detailed' },
    { id: 'doshas', hi: 'योग-दोष', feat: 'kundali_detailed' },
    { id: 'dasha', hi: 'महादशा-अंतर्दशा', feat: 'dasha_analysis' },
    { id: 'explain', hi: 'विस्तृत व्याख्या', feat: 'kundali_explain' }
  ];

  document.addEventListener('DOMContentLoaded', function () {
    KC.injectStyle();
    KForm.bind();
    $('jkForm').addEventListener('submit', function (e) { e.preventDefault(); generate(); });
    $('sampleBtn').addEventListener('click', KForm.fillSample);
    $('advT').addEventListener('click', function (e) {
      e.preventDefault();
      Array.prototype.forEach.call(document.querySelectorAll('[data-adv]'), function (x) { x.style.display = x.style.display === 'none' ? '' : 'none'; });
    });
    JY.launchBanner($('jkLaunch'));
  });

  function generate() {
    var r = KForm.read();
    var err = $('jkErr');
    if (!r.ok) { err.innerHTML = '<div class="jy-note warn">' + KC.esc(r.error) + '</div>'; return; }
    err.innerHTML = '';
    try { cur = Astro.compute(r.birth); } catch (e) { err.innerHTML = '<div class="jy-note warn">गणना में त्रुटि: ' + KC.esc(e.message) + '</div>'; return; }
    render(cur);
    var out = $('jkOut'); out.style.display = 'block';
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function lock(feat) {
    return '<div class="jy-card jk-lock"><i class="fas fa-lock"></i><h3>प्रीमियम सुविधा</h3><p style="color:var(--text-muted);margin:8px 0 16px">यह भाग Premium सदस्यों के लिए है।</p><a class="jy-btn gold" href="premium.html">Premium देखें</a></div>';
  }
  function pane(id, html, feat) { return '<div class="jk-pane" id="pane-' + id + '">' + (feat && !JY.can(feat) ? lock(feat) : html) + '</div>'; }

  function render(d) {
    var b = d.birth, P = d.planets;
    $('jkSummary').innerHTML = [
      ['जातक', KC.esc(b.name)], ['लग्न', d.lagna.signHi], ['चंद्र राशि', P.Moon.signHi], ['जन्म नक्षत्र', P.Moon.nakHi + ' · पाद ' + P.Moon.pada],
      ['समय क्षेत्र', KForm.tzLabel(b.tz)], ['अयनांश (लाहिड़ी)', d.ayanamsa.toFixed(3) + '°']
    ].map(function (x) { return '<div class="it"><small>' + x[0] + '</small><b>' + x[1] + '</b></div>'; }).join('');
    $('jkTabs').innerHTML = TABS.map(function (t, i) {
      return '<button class="jy-tab' + (i === 0 ? ' on' : '') + '" data-t="' + t.id + '">' + t.hi + (!t.free && !JY.CONFIG.enforcePremium && t.feat !== 'kundali_detailed' ? ' ' + JY.premiumBadge() : '') + '</button>';
    }).join('');
    $('jkPanes').innerHTML =
      pane('charts', chartsHTML(d)) + pane('planets', planetsHTML(d), 'kundali_detailed') + pane('houses', housesHTML(d), 'kundali_detailed') +
      pane('aspects', aspectsHTML(d), 'kundali_detailed') + pane('doshas', KC.doshaHTML(d) + KC.yogaHTML(d), 'kundali_detailed') +
      pane('dasha', dashaPane(d), 'dasha_analysis') + pane('explain', explainPane(d), 'kundali_explain');
    $('jkDisc').innerHTML = '<b>गणना बनाम व्याख्या:</b> ' + KC.DISCLAIMER;
    $('waLink').href = 'https://wa.me/917737782519?text=' + encodeURIComponent('मुझे अपनी जन्म कुंडली का परामर्श चाहिए — ' + b.name);
    show('charts');
    Array.prototype.forEach.call($('jkTabs').querySelectorAll('.jy-tab'), function (btn) { btn.addEventListener('click', function () { show(btn.getAttribute('data-t')); }); });
    wireChartToggle();
  }
  function show(id) {
    Array.prototype.forEach.call(document.querySelectorAll('.jk-pane'), function (p) { p.classList.toggle('on', p.id === 'pane-' + id); });
    Array.prototype.forEach.call($('jkTabs').querySelectorAll('.jy-tab'), function (t) { t.classList.toggle('on', t.getAttribute('data-t') === id); });
  }

  /* ---- charts ---- */
  function chartGrid(d) {
    return ['D1', 'Moon', 'D9', 'D10'].map(function (k) { return '<div>' + KCharts.render(chartStyle, d.charts[k], { theme: 'clean' }) + '</div>'; }).join('');
  }
  function chartsHTML(d) {
    return '<div class="jy-card"><div class="jy-row" style="justify-content:space-between;margin-bottom:16px"><h3 style="margin:0">कुंडली चक्र</h3>' +
      '<div class="jy-tabs" style="margin:0"><button class="jy-tab on" data-cs="north">उत्तर भारतीय</button><button class="jy-tab" data-cs="south">दक्षिण भारतीय</button></div></div>' +
      '<div class="jk-charts" id="chartGrid">' + chartGrid(d) + '</div>' +
      '<p class="jk-legend">उत्तर भारतीय: ऊपर का हीरा = लग्न (भाव 1), अंक = राशि संख्या (1=मेष … 12=मीन)। दक्षिण भारतीय: राशियाँ स्थिर, तिरछी रेखा/‘ल’ = लग्न। लाल अक्षर + छोटा ‘व’ = वक्री।</p>' +
      '<p class="jk-legend">D-1 लग्न · चंद्र कुंडली (चंद्र को लग्न मानकर) · D-9 नवांश (विवाह/धर्म) · D-10 दशमांश (करियर)</p></div>';
  }
  function wireChartToggle() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cs]'), function (b) {
      b.addEventListener('click', function () {
        chartStyle = b.getAttribute('data-cs');
        Array.prototype.forEach.call(document.querySelectorAll('[data-cs]'), function (x) { x.classList.toggle('on', x === b); });
        $('chartGrid').innerHTML = chartGrid(cur);
      });
    });
  }

  /* ---- tables ---- */
  function planetsHTML(d) {
    var rows = '<tr><td><b>लग्न</b></td><td>' + d.lagna.signHi + '</td><td>' + d.lagna.dms + '</td><td>' + d.lagna.nakHi + ' (' + d.lagna.pada + ')</td><td>1</td><td>—</td><td>—</td><td>—</td><td>' + d.lagna.navSignHi + '</td><td>' + d.lagna.d10SignHi + '</td></tr>';
    d.planetOrder.forEach(function (k) {
      var p = d.planets[k], st = [];
      if (p.retro) st.push('वक्री'); if (p.combust) st.push('अस्त');
      var cls = p.dignity.code === 'exalted' || p.dignity.code === 'own' || p.dignity.code === 'moolatrikona' ? 'good' : (p.dignity.code === 'debilitated' || p.dignity.code === 'enemy' ? 'bad' : '');
      rows += '<tr><td><b>' + p.hi + '</b></td><td>' + p.signHi + '</td><td>' + p.dms + '</td><td>' + p.nakHi + ' (' + p.pada + ')</td><td>' + p.house + '</td><td>' + p.houseFromMoon + '</td>' +
        '<td>' + (p.dignity.code === 'node' ? '—' : '<span class="jy-chip ' + cls + '">' + p.dignity.hi + '</span>') + '</td><td>' + (st.join(', ') || '—') + '</td><td>' + p.navSignHi + '</td><td>' + p.d10SignHi + '</td></tr>';
    });
    return '<div class="jy-card"><h3>ग्रह स्थिति (निरयन · लाहिड़ी)</h3><div class="jy-scroll"><table class="jy-table"><thead><tr><th>ग्रह</th><th>राशि</th><th>अंश</th><th>नक्षत्र (पाद)</th><th>भाव</th><th>चंद्र से</th><th>बल</th><th>स्थिति</th><th>नवांश</th><th>दशमांश</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="jy-hint" style="margin-top:8px">बल = स्वराशि/उच्च/मित्र/सम/शत्रु/नीच (नैसर्गिक मैत्री के आधार पर)। अस्त = सूर्य के निकट। राहु-केतु: माध्य नोड।</p></div>';
  }
  function housesHTML(d) {
    var rows = '';
    d.houses.forEach(function (h) {
      var pls = h.planets.map(function (p) { return p.hi + (p.retro ? '(व)' : ''); }).join(', ') || '—';
      var asp = h.aspectedBy.map(function (k) { return d.planets[k].hi; }).join(', ') || '—';
      rows += '<tr><td><b>' + h.house + '</b></td><td>' + h.signHi + '</td><td>' + d.planets[h.lordKey].hi + '</td><td>' + h.lordHouse + 'वें भाव, ' + h.lordSignHi + '</td><td>' + pls + '</td><td>' + asp + '</td><td class="wrap">' + KC.HOUSE_MEANING[h.house - 1] + '</td></tr>';
    });
    return '<div class="jy-card"><h3>12 भाव (होल-साइन)</h3><div class="jy-scroll"><table class="jy-table"><thead><tr><th>भाव</th><th>राशि</th><th>भावेश</th><th>भावेश कहाँ</th><th>स्थित ग्रह</th><th>दृष्टि डालने वाले</th><th>कारकत्व</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }
  function aspectsHTML(d) {
    var rows = '', rows2 = '';
    d.planetOrder.forEach(function (k) {
      var a = d.aspects.byPlanet[k];
      rows += '<tr><td><b>' + d.planets[k].hi + '</b>' + (a.optional ? ' *' : '') + '</td><td>' + d.planets[k].house + '</td><td>' + a.houses.join(', ') + '</td><td>' + (a.planets.map(function (x) { return d.planets[x].hi; }).join(', ') || '—') + '</td></tr>';
    });
    for (var h = 1; h <= 12; h++) {
      var by = d.aspects.byHouse[h].map(function (k) { return d.planets[k].hi; }), nb = (d.aspects.nodeByHouse[h] || []).map(function (k) { return d.planets[k].hi + '*'; });
      rows2 += '<tr><td><b>' + h + '</b></td><td>' + by.concat(nb).join(', ') + '</td></tr>';
    }
    return '<div class="jy-grid jy-g2"><div class="jy-card"><h3>ग्रह-दृष्टि</h3><div class="jy-scroll"><table class="jy-table"><thead><tr><th>ग्रह</th><th>भाव में</th><th>दृष्टि भाव</th><th>दृष्ट ग्रह</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
      '<div class="jy-card"><h3>भाव पर दृष्टि</h3><div class="jy-scroll"><table class="jy-table"><thead><tr><th>भाव</th><th>दृष्टि डालने वाले ग्रह</th></tr></thead><tbody>' + rows2 + '</tbody></table></div></div></div>' +
      '<p class="jk-legend">नियम: सभी ग्रह 7वीं दृष्टि; मंगल 4/8, गुरु 5/9, शनि 3/10 की विशेष दृष्टि। * राहु-केतु की 5/9/7 दृष्टि मतांतर से वैकल्पिक।</p>';
  }
  function dashaPane(d) {
    var dd = d.dasha, html = '<div class="jy-card">' + '<h3>विंशोत्तरी दशा विश्लेषण</h3>' + KC.dashaHTML(d) + '</div>';
    html += '<div class="jy-card" style="margin-top:16px"><h3>अंतर्दशा तालिका</h3>';
    dd.sequence.slice(0, 9).forEach(function (m) {
      var isCur = dd.current && dd.current.lord === m.lord && dd.current.startJD === m.startJD;
      html += '<details class="jk-md"' + (isCur ? ' open' : '') + '><summary>' + m.lordHi + ' महादशा (' + KC.fmtDate(Astro.jdToDate(m.startJD)) + ' – ' + KC.fmtDate(Astro.jdToDate(m.endJD)) + ')' + (isCur ? ' ← वर्तमान' : '') + '</summary><div class="in">' + KC.antarTableHTML(m, d.nowJD);
      if (isCur && dd.pratyantars) {
        html += '<h4 style="margin:12px 0 6px;color:var(--maroon)">वर्तमान अंतर्दशा (' + dd.currentAntar.lordHi + ') के प्रत्यंतर</h4><table class="kx-table"><thead><tr><th>प्रत्यंतर</th><th>आरंभ</th><th>समाप्ति</th></tr></thead><tbody>' +
          dd.pratyantars.map(function (x) { var c = d.nowJD >= x.startJD && d.nowJD < x.endJD; return '<tr' + (c ? ' class="kx-cur"' : '') + '><td>' + x.lordHi + '</td><td>' + KC.fmtDate(Astro.jdToDate(x.startJD)) + '</td><td>' + KC.fmtDate(Astro.jdToDate(x.endJD)) + '</td></tr>'; }).join('') + '</tbody></table>';
      }
      html += '</div></details>';
    });
    return html + '</div>';
  }
  function explainPane(d) {
    return '<div class="jy-note info" style="margin-bottom:14px"><i class="fas fa-info-circle"></i> नीचे की व्याख्या आपकी कुंडली की <b>गणना की हुई स्थितियों</b> पर पारंपरिक नियमों से बनी स्वचालित व्याख्या है — किसी ज्योतिषी का व्यक्तिगत फलादेश नहीं।</div>' +
      KC.lagnaHTML(d) + KC.areasHTML(d) + KC.sec('प्रत्येक ग्रह का विस्तृत फल', '🪐', KC.planetsHTML(d)) + KC.yogaHTML(d) + KC.doshaHTML(d) +
      KC.sec('दशा-फल', '⏳', KC.dashaHTML(d)) + KC.remedyHTML(d);
  }
})();
