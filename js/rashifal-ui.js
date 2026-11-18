/* ============================================================================
   rashifal-ui.js — UI for faladesh.html, rashifal.html, rashi.html
   Page is chosen by <body data-jy-page="faladesh|rashifal|rashi">.
   All content comes from Gochar (gochar.js): real transit calculations.
   Admin overrides (pandit's own words) are read through JY.store:
     faladesh_override_YYYY-MM-DD                    -> {text}
     rashifal_override_YYYY-MM-DD_<rashiIdx>          -> {text}   (daily)
     rashifal_override_<week|month|year>_YYYY-MM-DD_<rashiIdx>   (period start date)
   ========================================================================== */
(function () {
  'use strict';
  var G = window.Gochar, JY = window.JY;
  var PERIODS = [['day', 'दैनिक'], ['week', 'साप्ताहिक'], ['month', 'मासिक'], ['year', 'वार्षिक']];
  var DISCLAIMER = '<div class="jy-disclaimer"><b>गणना-आधारित स्वचालित फलादेश:</b> ग्रहों की वास्तविक (निरयन/लाहिरी) स्थिति और गोचर-फल के शास्त्रीय नियमों (शुभ भाव व वेध) से गणना की गई है; भाषा टेम्पलेट-आधारित है। यह राशि-स्तर का सामान्य फल है — आपकी व्यक्तिगत जन्म-कुंडली (दशा, लग्न, नक्षत्र) से भिन्न हो सकता है। शुभ रंग/अंक/दिशा पारंपरिक मान्यता पर आधारित हैं। चिकित्सा, कानूनी या आर्थिक निर्णय केवल इसके आधार पर न लें।</div>';

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return JY.esc(s); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(o) { return o.y + '-' + pad(o.m) + '-' + pad(o.d); }
  function parseISO(s) { var p = (s || '').split('-'); if (p.length !== 3) return null; var o = { y: +p[0], m: +p[1], d: +p[2] }; return (o.y && o.m && o.d) ? o : null; }
  function todayObj() { var t = new Date(); return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }; }
  function addDays(o, n) { return Panchang.addDays(o.y, o.m, o.d, n); }
  function shift(o, period, dir) {
    if (period === 'day') return addDays(o, dir);
    if (period === 'week') return addDays(o, 7 * dir);
    if (period === 'month') { var m = o.m + dir, y = o.y; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } return { y: y, m: m, d: 1 }; }
    return { y: o.y + dir, m: 1, d: 1 };
  }
  function stars(n) { return '<span class="rf-stars" role="img" aria-label="5 में से ' + n + ' सितारे">' + new Array(n + 1).join('★') + '<i>' + new Array(6 - n).join('★') + '</i></span>'; }
  function levelWord(n) { return ['कठिन', 'सतर्कता', 'सामान्य', 'अनुकूल', 'अति शुभ'][n - 1]; }
  function levelCls(n) { return n >= 4 ? 'good' : (n <= 2 ? 'bad' : 'mid'); }
  function cityObj(c) { return { name: c.name, lat: c.lat, lon: c.lon, tz: c.tz }; }
  function getCity() {
    var c = JY.lastCity(), d = todayObj();
    return { name: c.name, lat: c.lat, lon: c.lon, tz: JY.cityTz(c, d.y, d.m, d.d, 12, 0), _c: c };
  }
  function cityFor(c, dt) { return { name: c.name, lat: c.lat, lon: c.lon, tz: JY.cityTz(c, dt.y, dt.m, dt.d, 12, 0) }; }
  function myRashi() { var v = JY.ls.get('jy_my_rashi', null); return (v === null || v === '' || isNaN(+v)) ? null : +v; }
  function setMyRashi(v) { JY.ls.set('jy_my_rashi', v === null ? '' : +v); }
  function badge(rsh) { return '<span class="rf-glyph" style="background:' + rsh.color + '">' + rsh.glyph + '</span>'; }
  function periodLabel(period) { return { day: 'आज का', week: 'इस सप्ताह का', month: 'इस माह का', year: 'इस वर्ष का' }[period]; }
  function ovKey(period, rep, r, dateObj) {
    if (period === 'day') return 'rashifal_override_' + iso(dateObj) + '_' + r;
    return 'rashifal_override_' + period + '_' + iso(rep.range.from) + '_' + r;
  }
  function overrideHTML(o) {
    if (!o || !o.text) return '';
    return '<div class="rf-ovr"><b><i class="fas fa-om"></i> पंडित जी की टिप्पणी</b><p>' + esc(o.text).replace(/\n/g, '<br>') + '</p></div>';
  }
  function lockCard() {
    return '<div class="jy-card cream rf-lock"><i class="fas fa-lock"></i><h3>विस्तृत फल — प्रीमियम</h3><p>साप्ताहिक, मासिक और वार्षिक विस्तृत राशिफल प्रीमियम सदस्यों के लिए है।</p><a class="jy-btn gold" href="premium.html"><i class="fas fa-crown"></i> प्रीमियम देखें</a></div>';
  }
  function canDetail(period) { return period === 'day' || JY.can('rashifal_detail'); }

  /* ---------- shared renderers ---------- */
  function sectionCard(sec, big) {
    var pts = (sec.points || []).filter(function (p) { return !p.headline; }).map(function (p) {
      return '<span class="jy-chip ' + (p.good ? 'good' : (p.vedha ? 'mid' : 'bad')) + '" title="गोचर">' + G.PNAME[p.planet] + ' · ' + G.bhava(p.house) + (p.vedha ? ' · वेध' : '') + '</span>';
    }).join(' ');
    return '<div class="jy-card rf-sec' + (big ? ' big' : '') + '"><div class="rf-sec-h"><h3><i class="fas ' + sec.icon + '"></i> ' + sec.title + '</h3><div class="rf-sec-s">' + stars(sec.stars) + ' <span class="jy-chip ' + levelCls(sec.stars) + '">' + levelWord(sec.stars) + '</span></div></div>' +
      '<p class="rf-para">' + esc(sec.paragraph) + '</p>' + (pts ? '<div class="rf-pts">' + pts + '</div>' : '') + '</div>';
  }
  function luckyHTML(l) {
    if (!l) return '';
    var html = '<div class="jy-kv rf-lucky">' +
      '<div class="it"><small><i class="fas fa-palette"></i> शुभ रंग</small><b>' + esc(l.color) + '</b><span>' + esc(l.source) + '</span></div>' +
      '<div class="it"><small><i class="fas fa-hashtag"></i> शुभ अंक</small><b>' + l.number + '</b><span>' + esc(l.source) + '</span></div>' +
      '<div class="it"><small><i class="fas fa-compass"></i> शुभ दिशा</small><b>' + esc(l.direction) + '</b><span>' + esc(l.source) + '</span></div></div>';
    if (l.rashiLord) html += '<p class="jy-hint" style="margin-top:8px">राशि-स्वामी ' + esc(l.rashiLordHi) + ' के अनुसार: रंग ' + esc(l.rashiColor) + ', अंक ' + l.rashiNumber + ', दिशा ' + esc(l.rashiDirection) + '। ' + esc(l.note) + '</p>';
    else html += '<p class="jy-hint" style="margin-top:8px">' + esc(l.note) + '</p>';
    return html;
  }
  function remedyHTML(rep) {
    var up = (rep.upaya || []).map(function (u) { return '<li>' + esc(u.text) + '</li>'; }).join('');
    var mt = (rep.mantra || []).map(function (u) { return '<li><b>' + G.PNAME[u.planet] + ':</b> ' + esc(u.text) + '</li>'; }).join('');
    return '<div class="jy-grid jy-g2"><div class="jy-card cream"><h3><i class="fas fa-hands-praying"></i> उपाय</h3><ul class="rf-list">' + up + '</ul></div>' +
      '<div class="jy-card cream"><h3><i class="fas fa-om"></i> मंत्र</h3><ul class="rf-list">' + mt + '</ul></div></div>';
  }
  function eventsHTML(ev, title) {
    if (!ev || !ev.length) return '';
    return '<div class="jy-card"><h3><i class="fas fa-satellite"></i> ' + (title || 'ग्रह-गोचर की प्रमुख घटनाएँ') + '</h3><ul class="rf-list">' + ev.map(function (e) { return '<li>' + esc(e.text) + '</li>'; }).join('') + '</ul></div>';
  }
  function barRow(label, n) { return '<div class="rf-bar"><span class="l">' + label + '</span><span class="b"><i class="s' + n + '" style="width:' + (n * 20) + '%"></i></span><span class="n">' + n + '</span></div>'; }
  function extrasHTML(rep) {
    var h = '';
    if (rep.period === 'week') {
      h += '<div class="jy-card"><h3><i class="fas fa-calendar-week"></i> दिन-वार चंद्र-गोचर</h3><div class="jy-scroll"><table class="jy-table"><thead><tr><th>तारीख़</th><th>वार</th><th>चंद्र राशि</th><th>चंद्र (आपसे)</th><th>दिन का स्तर</th></tr></thead><tbody>' +
        rep.days.map(function (d) { return '<tr><td>' + d.date.d + ' ' + G.MONTH_HI[d.date.m - 1] + '</td><td>' + d.vara + '</td><td>' + d.moonRashi + '</td><td>' + G.bhava(d.moonHouse) + ' <span class="jy-chip ' + (d.moonGood ? 'good' : 'bad') + '">' + (d.moonGood ? 'शुभ' : 'अशुभ') + '</span></td><td>' + stars(d.stars) + '</td></tr>'; }).join('') +
        '</tbody></table></div><p class="jy-hint">चंद्र-गोचर में चंद्रमा जन्म-राशि से 1, 3, 6, 7, 10, 11वें भाव में शुभ माना जाता है।</p></div>';
    }
    if (rep.period === 'month') {
      h += '<div class="jy-card"><h3><i class="fas fa-chart-simple"></i> माह के चरण</h3>' + rep.weekParts.map(function (p) { return barRow(p.from + '–' + p.to + ' तारीख़', p.stars); }).join('') + '</div>';
    }
    if (rep.period === 'year') {
      h += '<div class="jy-card"><h3><i class="fas fa-chart-simple"></i> माह-वार सामान्य स्तर</h3>' + rep.monthStars.map(function (p) { return barRow(p.name, p.stars); }).join('') + '</div>';
      h += '<div class="jy-card"><h3><i class="fas fa-planet-ringed"></i> मंद-गति ग्रहों की स्थिति</h3><ul class="rf-list">' + rep.slow.map(function (s) { return '<li>' + esc(s.text) + '</li>'; }).join('') + '</ul></div>';
    }
    if (rep.events && rep.events.length) h += eventsHTML(rep.events);
    return h;
  }
  function areaBars(rep) {
    return '<div class="jy-card cream"><h3><i class="fas fa-chart-bar"></i> क्षेत्र-वार स्तर</h3><div class="rf-bars">' +
      G.AREAS.map(function (a) { return barRow(G.AREA_HI[a], rep.stars[a]); }).join('') + '</div></div>';
  }
  function fillCity(inputId, listId, onChange) {
    var inp = $(inputId), dl = $(listId);
    if (!inp) return;
    JY.fillCityList(dl);
    inp.value = JY.cityLabel(JY.lastCity());
    inp.addEventListener('change', function () {
      var c = JY.findCity(inp.value);
      if (!c) { JY.toast('सूची से शहर चुनें'); inp.value = JY.cityLabel(JY.lastCity()); return; }
      JY.saveCity(c); onChange();
    });
  }
  function rashiSelect(el, withAll, current) {
    var h = withAll ? '<option value="">— सभी (सामान्य दिन) —</option>' : '';
    G.RASHI.forEach(function (r, i) { h += '<option value="' + i + '"' + (current === i ? ' selected' : '') + '>' + r.glyph + ' ' + r.hi + ' (' + r.en + ')</option>'; });
    el.innerHTML = h;
  }

  /* ---------- injected CSS ---------- */
  function injectCSS() {
    var css = '' +
      '.rf-stars{color:#e0a003;letter-spacing:2px;font-size:1rem;white-space:nowrap}.rf-stars i{font-style:normal;color:#e8dcc0}' +
      '.rf-glyph{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:50%;color:#fff;font-size:1.6rem;flex:none;box-shadow:0 3px 10px rgba(0,0,0,.18)}' +
      '.rf-glyph.lg{width:84px;height:84px;font-size:3rem}' +
      '.rf-ctl{display:flex;flex-wrap:wrap;gap:12px;align-items:end}.rf-ctl .jy-field{flex:1 1 200px}' +
      '.rf-nav{display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
      '.rf-chips{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0}' +
      '.rf-sec .rf-sec-h{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}.rf-sec h3{margin:0}.rf-sec h3 i{color:var(--primary);margin-right:6px}' +
      '.rf-para{line-height:1.95;font-size:1rem;color:var(--ink)}.rf-sec.big .rf-para{font-size:1.05rem}' +
      '.rf-pts{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px}' +
      '.rf-list{padding-left:18px;list-style:disc;line-height:1.85}.rf-list li{margin-bottom:4px}' +
      '.rf-ovr{background:#fff3d6;border:1px solid #e9c46a;border-left:5px solid var(--maroon);border-radius:10px;padding:12px 16px;margin-bottom:14px}.rf-ovr p{margin-top:4px;line-height:1.8}' +
      '.rf-lock{text-align:center}.rf-lock i.fa-lock{font-size:2rem;color:var(--maroon);margin-bottom:8px}.rf-lock p{margin:8px 0 14px;color:var(--text-muted)}' +
      '.rf-bar{display:grid;grid-template-columns:130px 1fr 24px;gap:10px;align-items:center;margin:7px 0;font-size:.88rem}.rf-bar .b{height:10px;background:#efe3c3;border-radius:6px;overflow:hidden;display:block}.rf-bar .b i{display:block;height:100%;border-radius:6px;background:#e0a003}.rf-bar .b i.s1,.rf-bar .b i.s2{background:#c0392b}.rf-bar .b i.s4,.rf-bar .b i.s5{background:#2f9e5b}.rf-bar .n{font-weight:700;color:var(--maroon)}' +
      '.rf-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}' +
      '.rf-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}@media(max-width:900px){.rf-cards{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.rf-cards{grid-template-columns:1fr}.rf-bar{grid-template-columns:100px 1fr 20px}}' +
      '.rf-card{background:#fff;border:1px solid var(--line);border-radius:var(--radius-lg);padding:18px;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:10px;transition:var(--transition)}.rf-card:hover{box-shadow:var(--shadow-md);transform:translateY(-2px)}.rf-card.mine{border-color:var(--primary);box-shadow:0 0 0 2px rgba(232,93,4,.25)}' +
      '.rf-card-h{display:flex;gap:12px;align-items:center}.rf-card-h h3{margin:0;color:var(--maroon);font-size:1.15rem}.rf-card-h small{color:var(--text-muted);display:block;font-size:.76rem}' +
      '.rf-card p.sum{font-size:.92rem;line-height:1.75;color:var(--ink)}' +
      '.rf-card .lk{display:flex;gap:6px;flex-wrap:wrap}' +
      '.rf-mini{display:grid;grid-template-columns:1fr auto;gap:2px 10px;font-size:.84rem;border-top:1px dashed var(--line);padding-top:8px}.rf-mini .t{color:var(--ink)}' +
      '.rf-card .more{display:none}.rf-card.open .more{display:block}' +
      '.rf-card-f{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto}' +
      '.rf-all{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.rf-all a{display:flex;gap:10px;align-items:center;background:var(--cream);border:1px solid var(--line);border-radius:12px;padding:8px 10px}.rf-all a:hover{background:#fff3d6}.rf-all b{display:block;color:var(--maroon);font-size:.9rem}' +
      '.rf-prof dt{font-weight:700;color:var(--maroon);margin-top:10px}.rf-prof dd{line-height:1.85;margin:2px 0 0}' +
      '.rf-hero-r{display:flex;gap:18px;align-items:center;justify-content:center;flex-wrap:wrap}' +
      '.rf-ctx{background:var(--cream);border:1px solid var(--line);border-radius:12px;padding:12px 16px;line-height:1.85;font-size:.95rem}' +
      '.rf-sticky-note{font-size:.8rem;color:var(--text-muted);margin-top:8px}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  }

  /* ======================================================================
     PAGE: faladesh
     ====================================================================== */
  function initFaladesh() {
    var date = parseISO(new URLSearchParams(location.search).get('d')) || todayObj();
    var dEl = $('fdDate'), rEl = $('fdRashi'), out = $('fdOut'), seq = 0;
    dEl.value = iso(date);
    rashiSelect(rEl, true, myRashi());
    fillCity('fdCity', 'fdCityList', render);
    $('fdPrev').onclick = function () { date = addDays(date, -1); dEl.value = iso(date); render(); };
    $('fdNext').onclick = function () { date = addDays(date, 1); dEl.value = iso(date); render(); };
    $('fdToday').onclick = function () { date = todayObj(); dEl.value = iso(date); render(); };
    dEl.onchange = function () { var o = parseISO(dEl.value); if (o) { date = o; render(); } };
    rEl.onchange = function () { setMyRashi(rEl.value === '' ? null : +rEl.value); render(); };

    function render() {
      var my = rEl.value === '' ? null : +rEl.value, c = JY.lastCity(), city = cityFor(c, date), me = ++seq;
      var pc = G.panchangDay(date, city);
      if (pc.error) { out.innerHTML = '<div class="jy-note warn">' + esc(pc.error) + '</div>'; return; }
      var dl = G.dayLevel(date, city, pc);
      var rep = my === null ? dl : G.daily(date, my, { city: city, panchang: pc });
      var html = '';
      html += '<div class="jy-card" style="margin-top:18px"><div class="jy-row" style="justify-content:space-between"><div><h2 class="hi" style="margin:0">' + pc.date.vara + ', ' + date.d + ' ' + G.MONTH_HI[date.m - 1] + ' ' + date.y + '</h2><div class="jy-hint">' + esc(c.name) + ' के पंचांग-आधारित · सूर्योदय ' + Panchang.fmtHM(pc.sunrise) + '</div></div>' +
        '<div>' + (my === null ? '<span class="jy-chip mid">सामान्य दिन-फल</span>' : '<span class="jy-chip good">' + badgeTxt(my) + ' राशि के लिए</span>') + '</div></div>' +
        '<div class="rf-chips"><span class="jy-chip">' + pc.paksha + ' ' + pc.tithi.name + '</span><span class="jy-chip">' + pc.nakshatra.name + '</span><span class="jy-chip ' + (pc.yoga.bad ? 'bad' : 'good') + '">' + pc.yoga.name + ' योग</span><span class="jy-chip">' + pc.karana.name + '</span><span class="jy-chip">चंद्र: ' + pc.moonRashi + '</span><span class="jy-chip">दिन का स्तर ' + stars(dl.stars) + '</span></div>' +
        '<div class="rf-ctx" style="margin-top:14px">' + esc(rep.context || dl.context) + '</div>' +
        '<div id="fdOvr"></div></div>';
      html += '<div class="jy-sec" style="padding-top:20px"><div class="jy-grid">';
      if (my !== null) {
        html += sectionCard(dl.sections.general, false).replace('सामान्य फल', 'दिन का सामान्य चरित्र (पंचांग-आधारित)');
        html += sectionCard(rep.sections.general, true).replace('सामान्य फल', 'आपकी राशि का सामान्य फल (गोचर-आधारित)');
        ['career', 'finance', 'family', 'health', 'education', 'love'].forEach(function (a) { html += sectionCard(rep.sections[a], false); });
      } else {
        html += sectionCard(dl.sections.general, true);
        ['career', 'finance', 'family', 'health', 'education'].forEach(function (a) { html += sectionCard(dl.sections[a], false); });
        html += '<div class="jy-note info"><i class="fas fa-user"></i> अपनी <b>राशि</b> ऊपर से चुनें — आपको चंद्र व अन्य ग्रहों के गोचर के आधार पर व्यक्तिगत (राशि-अनुसार) फलादेश मिलेगा।</div>';
      }
      html += '<div class="jy-card cream"><h3><i class="fas fa-palette"></i> आज के शुभ रंग, अंक व दिशा</h3>' + luckyHTML(rep.lucky) + '</div>';
      html += remedyHTML(rep);
      html += '<div class="jy-card"><h3><i class="fas fa-th"></i> सभी 12 राशियों का आज का स्तर</h3><div class="rf-all" id="fdAll"></div></div>';
      html += '</div>' + DISCLAIMER + '</div>';
      out.innerHTML = html;
      var all = '';
      G.RASHI.forEach(function (rs, i) {
        var d = G.daily(date, i, { city: city, panchang: pc });
        all += '<a href="rashi.html?r=' + rs.slug + '&p=day&d=' + iso(date) + '">' + badge(rs) + '<span><b>' + rs.hi + '</b>' + stars(d.stars.general) + '</span></a>';
      });
      $('fdAll').innerHTML = all;
      // admin overrides (pandit's own comments)
      var keys = [JY.store.get('faladesh_override_' + iso(date), null)];
      if (my !== null) keys.push(JY.store.get('rashifal_override_' + iso(date) + '_' + my, null));
      Promise.all(keys).then(function (vals) {
        if (me !== seq) return;
        var h = vals.map(overrideHTML).join('');
        var el = $('fdOvr'); if (el && h) el.innerHTML = '<div style="margin-top:14px">' + h + '</div>';
      });
    }
    function badgeTxt(i) { return G.RASHI[i].glyph + ' ' + G.RASHI[i].hi; }
    render();
  }

  /* ======================================================================
     PAGE: rashifal (12-card grid)
     ====================================================================== */
  function initRashifal() {
    var qp = new URLSearchParams(location.search);
    var state = { period: ['day', 'week', 'month', 'year'].indexOf(qp.get('p')) >= 0 ? qp.get('p') : 'day', date: parseISO(qp.get('d')) || todayObj() };
    var tabs = $('rfTabs'), grid = $('rfGrid'), dEl = $('rfDate'), lab = $('rfLabel'), seq = 0;
    tabs.innerHTML = PERIODS.map(function (p) { return '<button type="button" class="jy-tab" data-p="' + p[0] + '">' + p[1] + (p[0] === 'day' ? '' : ' ' + JY.premiumBadge()) + '</button>'; }).join('');
    tabs.addEventListener('click', function (e) { var b = e.target.closest('.jy-tab'); if (!b) return; state.period = b.getAttribute('data-p'); render(); });
    dEl.value = iso(state.date);
    dEl.onchange = function () { var o = parseISO(dEl.value); if (o) { state.date = o; render(); } };
    $('rfPrev').onclick = function () { state.date = shift(state.date, state.period, -1); dEl.value = iso(state.date); render(); };
    $('rfNext').onclick = function () { state.date = shift(state.date, state.period, 1); dEl.value = iso(state.date); render(); };
    $('rfToday').onclick = function () { state.date = todayObj(); dEl.value = iso(state.date); render(); };
    fillCity('rfCity', 'rfCityList', render);

    function render() {
      var me = ++seq, mine = myRashi(), p = state.period;
      Array.prototype.forEach.call(tabs.children, function (b) { b.classList.toggle('on', b.getAttribute('data-p') === p); });
      if (!canDetail(p)) { grid.innerHTML = lockCard(); lab.textContent = ''; return; }
      var c = JY.lastCity(), city = cityFor(c, state.date), pc = p === 'day' ? G.panchangDay(state.date, city) : null;
      if (pc && pc.error) { grid.innerHTML = '<div class="jy-note warn">' + esc(pc.error) + '</div>'; return; }
      var html = '', reps = [];
      G.RASHI.forEach(function (rs, i) {
        var rep = G.report(p, state.date, i, { city: city, panchang: pc });
        reps.push(rep);
        if (i === 0) lab.textContent = p === 'day' ? (pc.date.vara + ', ' + state.date.d + ' ' + G.MONTH_HI[state.date.m - 1] + ' ' + state.date.y) : rep.label;
        var s = rep.stars, L = rep.lucky;
        html += '<article class="rf-card' + (mine === i ? ' mine' : '') + '" id="rc' + i + '"><div class="rf-card-h">' + badge(rs) + '<div><h3>' + rs.hi + (mine === i ? ' <span class="jy-chip good">मेरी राशि</span>' : '') + '</h3><small>' + rs.en + ' · स्वामी ' + rs.lordHi + '</small></div><div style="margin-left:auto;text-align:right">' + stars(s.general) + '<small style="display:block;color:var(--text-muted)">' + levelWord(s.general) + '</small></div></div>' +
          '<div class="ovr"></div><p class="sum">' + esc(rep.summary) + '</p>' +
          '<div class="lk"><span class="jy-chip"><i class="fas fa-palette"></i> ' + esc(L.color) + '</span><span class="jy-chip"><i class="fas fa-hashtag"></i> ' + L.number + '</span><span class="jy-chip"><i class="fas fa-compass"></i> ' + esc(L.direction) + '</span></div>' +
          '<div class="more">' + ['career', 'finance', 'love', 'family', 'health', 'education'].map(function (a) { return '<div class="rf-mini"><span class="t">' + G.AREA_HI[a] + '</span>' + stars(s[a]) + '</div>'; }).join('') + '<div class="rf-mini" style="grid-template-columns:1fr"><span class="t"><b>उपाय:</b> ' + esc(rep.upaya[0].text) + '</span></div></div>' +
          '<div class="rf-card-f"><button type="button" class="jy-btn ghost sm tg" data-i="' + i + '">सार देखें</button><a class="jy-btn sm" href="rashi.html?r=' + rs.slug + '&p=' + p + '&d=' + iso(state.date) + '">पूरा फल पढ़ें</a></div></article>';
      });
      grid.innerHTML = html + '<p class="rf-sticky-note" style="grid-column:1/-1">' + (p === 'day' ? 'दैनिक फल ' + esc(c.name) + ' के सूर्योदय के समय की ग्रह-स्थिति पर आधारित है। ' : '') + 'सितारे: 1 = कठिन, 3 = सामान्य, 5 = अति शुभ।</p>' + DISCLAIMER;
      // overrides
      reps.forEach(function (rep, i) {
        JY.store.get(ovKey(p, rep, i, state.date), null).then(function (o) {
          if (me !== seq) return; var h = overrideHTML(o); if (!h) return;
          var el = document.querySelector('#rc' + i + ' .ovr'); if (el) el.innerHTML = h;
        });
      });
    }
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('.tg'); if (!b) return;
      var card = $('rc' + b.getAttribute('data-i')); card.classList.toggle('open'); b.textContent = card.classList.contains('open') ? 'सार छिपाएँ' : 'सार देखें';
    });
    render();
  }

  /* ======================================================================
     PAGE: rashi (detail)
     ====================================================================== */
  function initRashi() {
    var qp = new URLSearchParams(location.search);
    var r = G.rashiIndex(qp.get('r'));
    if (r === null) r = myRashi();
    if (r === null) r = 0;
    var state = { period: ['day', 'week', 'month', 'year'].indexOf(qp.get('p')) >= 0 ? qp.get('p') : 'day', date: parseISO(qp.get('d')) || todayObj() };
    var rs = G.RASHI[r], seq = 0;
    document.title = rs.hi + ' राशिफल — दैनिक, साप्ताहिक, मासिक, वार्षिक | PanditSeva.in';
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', rs.hi + ' राशि (' + rs.en + ') का गोचर-आधारित दैनिक, साप्ताहिक, मासिक व वार्षिक राशिफल: करियर, धन, प्रेम-विवाह, परिवार, स्वास्थ्य, शुभ अंक-रंग, उपाय व मंत्र।');
    $('rsHero').innerHTML = '<div class="rf-hero-r">' + '<span class="rf-glyph lg" style="background:' + rs.color + '">' + rs.glyph + '</span><div style="text-align:left"><h1 style="margin:0">' + rs.hi + ' राशिफल</h1><p style="margin:6px 0 0;opacity:.9">' + rs.en + ' · स्वामी ' + rs.lordHi + ' · तत्व ' + rs.tatva + ' · ' + rs.guna + ' राशि</p></div></div>';
    // profile
    $('rsProfile').innerHTML = '<h2 class="hi" style="margin-bottom:6px">' + rs.hi + ' राशि का परिचय <span class="jy-chip">पारंपरिक</span></h2><dl class="rf-prof">' +
      '<dt>स्वभाव एवं विशेषताएँ</dt><dd>' + esc(rs.traits) + '</dd>' +
      '<dt>राशि-स्वामी / तत्व / गुण</dt><dd>' + rs.lordHi + ' · ' + rs.tatva + ' तत्व · ' + rs.guna + ' स्वभाव</dd>' +
      '<dt>नक्षत्र</dt><dd>' + esc(rs.naks) + '</dd>' +
      '<dt>नामाक्षर</dt><dd>' + esc(rs.letters) + '</dd>' +
      '<dt>अंग / रत्न / इष्ट</dt><dd>' + esc(rs.body) + ' · ' + esc(rs.gem) + ' (धारण से पूर्व ज्योतिषी से परामर्श करें) · ' + esc(rs.deity) + '</dd>' +
      '<dt>कार्यक्षेत्र</dt><dd>' + esc(rs.career) + '</dd><dt>धन-स्वभाव</dt><dd>' + esc(rs.finance) + '</dd>' +
      '<dt>प्रेम एवं विवाह</dt><dd>' + esc(rs.love) + '</dd><dt>परिवार</dt><dd>' + esc(rs.family) + '</dd><dt>स्वास्थ्य प्रवृत्ति</dt><dd>' + esc(rs.health) + '</dd></dl>' +
      '<p class="jy-hint">' + esc(rs.dates) + ' (तिथियाँ वर्ष अनुसार 1 दिन आगे-पीछे हो सकती हैं)।</p>';
    // other rashi nav
    $('rsOthers').innerHTML = G.RASHI.map(function (x, i) { return '<a href="rashi.html?r=' + x.slug + '&p=' + state.period + '" class="rf-all-item' + (i === r ? ' on' : '') + '" style="display:inline-flex;align-items:center;gap:6px;margin:3px;padding:6px 12px;border-radius:50px;border:1.5px solid ' + (i === r ? 'var(--maroon)' : 'var(--line)') + ';background:' + (i === r ? 'var(--maroon)' : '#fff') + ';color:' + (i === r ? '#fff' : 'var(--maroon)') + ';font-size:.85rem">' + x.glyph + ' ' + x.hi + '</a>'; }).join('');
    $('rsPrevR').href = 'rashi.html?r=' + G.RASHI[(r + 11) % 12].slug; $('rsNextR').href = 'rashi.html?r=' + G.RASHI[(r + 1) % 12].slug;
    $('rsPrevR').innerHTML = '<i class="fas fa-chevron-left"></i> ' + G.RASHI[(r + 11) % 12].hi; $('rsNextR').innerHTML = G.RASHI[(r + 1) % 12].hi + ' <i class="fas fa-chevron-right"></i>';

    var tabs = $('rsTabs'), dEl = $('rsDate'), out = $('rsOut');
    tabs.innerHTML = PERIODS.map(function (p) { return '<button type="button" class="jy-tab" data-p="' + p[0] + '">' + p[1] + (p[0] === 'day' ? '' : ' ' + JY.premiumBadge()) + '</button>'; }).join('');
    tabs.addEventListener('click', function (e) { var b = e.target.closest('.jy-tab'); if (!b) return; state.period = b.getAttribute('data-p'); render(); });
    dEl.value = iso(state.date);
    dEl.onchange = function () { var o = parseISO(dEl.value); if (o) { state.date = o; render(); } };
    $('rsPrev').onclick = function () { state.date = shift(state.date, state.period, -1); dEl.value = iso(state.date); render(); };
    $('rsNext').onclick = function () { state.date = shift(state.date, state.period, 1); dEl.value = iso(state.date); render(); };
    $('rsToday').onclick = function () { state.date = todayObj(); dEl.value = iso(state.date); render(); };
    fillCity('rsCity', 'rsCityList', render);
    $('rsMine').onclick = function () { setMyRashi(r); JY.toast(rs.hi + ' को "मेरी राशि" के रूप में सहेजा गया'); };

    function render() {
      var me = ++seq, p = state.period;
      Array.prototype.forEach.call(tabs.children, function (b) { b.classList.toggle('on', b.getAttribute('data-p') === p); });
      if (!canDetail(p)) { out.innerHTML = lockCard(); return; }
      var c = JY.lastCity(), city = cityFor(c, state.date);
      var rep = G.report(p, state.date, r, { city: city });
      if (rep.error) { out.innerHTML = '<div class="jy-note warn">' + esc(rep.error) + '</div>'; return; }
      var title = p === 'day' ? (rep.panchang.date.vara + ', ' + state.date.d + ' ' + G.MONTH_HI[state.date.m - 1] + ' ' + state.date.y) : rep.label;
      var html = '<div class="jy-card" style="margin-top:18px"><div class="jy-row" style="justify-content:space-between"><div><h2 class="hi" style="margin:0">' + rs.hi + ' — ' + periodLabel(p) + ' राशिफल</h2><div class="jy-hint">' + esc(title) + '</div></div><div style="text-align:right">' + stars(rep.stars.general) + '<div><span class="jy-chip ' + levelCls(rep.stars.general) + '">' + levelWord(rep.stars.general) + '</span></div></div></div>' +
        '<p class="rf-para" style="margin-top:12px">' + esc(rep.summary) + '</p>' + (rep.context ? '<div class="rf-ctx" style="margin-top:10px">' + esc(rep.context) + '</div>' : '') + (rep.sade ? '<div class="jy-note" style="margin-top:10px">' + esc(rep.sade.txt) + '</div>' : '') + '<div id="rsOvr" style="margin-top:12px"></div></div>';
      html += '<div class="jy-sec" style="padding-top:18px"><div class="jy-grid">' + areaBars(rep);
      G.AREAS.forEach(function (a) { html += sectionCard(rep.sections[a], a === 'general'); });
      html += '<div class="jy-card cream"><h3><i class="fas fa-palette"></i> शुभ रंग, अंक व दिशा</h3>' + luckyHTML(rep.lucky) + '</div>';
      html += remedyHTML(rep) + extrasHTML(rep) + '</div>' + DISCLAIMER + '</div>';
      out.innerHTML = html;
      JY.store.get(ovKey(p, rep, r, state.date), null).then(function (o) { if (me !== seq) return; var el = $('rsOvr'); if (el) el.innerHTML = overrideHTML(o); });
      history.replaceState(null, '', 'rashi.html?r=' + rs.slug + '&p=' + p + '&d=' + iso(state.date));
    }
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!G || !window.Panchang || !JY) { console.error('gochar/panchang/jy-common not loaded'); return; }
    injectCSS();
    var page = document.body.getAttribute('data-jy-page');
    if (page === 'faladesh') initFaladesh();
    else if (page === 'rashifal') initRashifal();
    else if (page === 'rashi') initRashi();
  });
})();
