/* Homepage: live "आज का पंचांग" + "आज का राशिफल" (all computed in-browser, nothing hard-coded). */
(function () {
  'use strict';
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stars(n) { return '<span class="ts-st">' + new Array(n + 1).join('★') + '<i>' + new Array(6 - n).join('★') + '</i></span>'; }
  function render() {
    var body = document.getElementById('adTodayBody');
    if (!body || !window.Panchang || !window.Astro) return;
    var city = (window.JY && JY.lastCity && JY.lastCity()) || { name: 'Jaipur', lat: 26.9124, lon: 75.7873, tz: 'Asia/Kolkata' };
    var t = new Date(), y = t.getFullYear(), m = t.getMonth() + 1, d = t.getDate();
    var tzh = (window.JY && JY.cityTz) ? JY.cityTz(city, y, m, d, 12, 0) : 5.5;
    var p;
    try { p = Panchang.compute({ y: y, m: m, d: d, lat: city.lat, lon: city.lon, tz: tzh }); } catch (e) { return; }
    if (!p || p.error) return;
    var f = Panchang.fmtHM;
    function pill(k, v, s) { return '<div class="ad-pill"><small>' + k + '</small><b>' + v + '</b>' + (s ? '<span>' + s + '</span>' : '') + '</div>'; }
    body.innerHTML =
      pill('तिथि', p.paksha + ' ' + p.tithi.name, 'तक ' + f(p.tithi.end)) +
      pill('नक्षत्र', p.nakshatra.name, 'तक ' + f(p.nakshatra.end)) +
      pill('योग', p.yoga.name, 'तक ' + f(p.yoga.end)) +
      pill('करण', p.karana.name, 'तक ' + f(p.karana.end)) +
      pill('सूर्योदय / अस्त', f(p.sunrise) + ' / ' + f(p.sunset)) +
      pill('राहु काल', f(p.rahu.start) + ' – ' + f(p.rahu.end)) +
      pill('अभिजित मुहूर्त', f(p.abhijit.start) + ' – ' + f(p.abhijit.end)) +
      pill('चंद्र राशि', p.moonRashi, 'सूर्य राशि ' + p.sunRashi);
    var masaTxt = (p.masa.adhika ? 'अधिक ' : '') + p.masa.purnimanta + ' · ' + p.paksha + ' पक्ष';
    document.getElementById('adTodayTitle').innerHTML = 'आज का पंचांग — ' + p.date.vara + ', ' + pad(d) + '/' + pad(m) + '/' + y +
      '<small>' + masaTxt + ' · विक्रम संवत ' + p.samvat.vikram + ' · ' + city.name + '</small>';

    // Rashifal (transit-based, from gochar.js)
    var grid = document.getElementById('tsRashiGrid');
    if (!grid || !window.Gochar) return;
    var iso = y + '-' + pad(m) + '-' + pad(d);
    var gc = { name: city.name, lat: city.lat, lon: city.lon, tz: tzh };
    try {
      var day = Gochar.dayLevel({ y: y, m: m, d: d }, gc, p);
      if (day && !day.error) document.getElementById('tsDaySummary').textContent = day.summary + ' ' + (day.context || '');
      document.getElementById('tsRashiDate').textContent = p.date.vara + ', ' + pad(d) + '/' + pad(m) + '/' + y;
      var h = '';
      Gochar.RASHI.forEach(function (rs, i) {
        var r = Gochar.daily({ y: y, m: m, d: d }, i, { city: gc, panchang: p });
        if (r.error) return;
        h += '<a href="rashi.html?r=' + rs.slug + '&p=day&d=' + iso + '"><span class="ts-rg" style="background:' + rs.color + '">' + rs.glyph + '</span><span><b>' + rs.hi + '</b>' + stars(r.stars.general) + '</span></a>';
      });
      grid.innerHTML = h;
    } catch (e) { var box = document.querySelector('.ts-rashi'); if (box) box.style.display = 'none'; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
})();
