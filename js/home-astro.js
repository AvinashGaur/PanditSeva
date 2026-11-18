/* Homepage: live "आज का पंचांग" strip (computed in-browser for Jaipur / the visitor's remembered city). */
(function () {
  'use strict';
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function render() {
    var box = document.getElementById('adToday');
    if (!box || !window.Panchang || !window.Astro) return;
    var city = (window.JY && JY.lastCity && JY.lastCity()) || { name: 'Jaipur', lat: 26.9124, lon: 75.7873, tz: 'Asia/Kolkata' };
    var t = new Date(), y = t.getFullYear(), m = t.getMonth() + 1, d = t.getDate();
    var tz = (window.JY && JY.cityTz) ? JY.cityTz(city, y, m, d, 12, 0) : 5.5;
    var p;
    try { p = Panchang.compute({ y: y, m: m, d: d, lat: city.lat, lon: city.lon, tz: tz }); } catch (e) { box.style.display = 'none'; return; }
    if (!p || p.error) { box.style.display = 'none'; return; }
    var f = Panchang.fmtHM;
    function pill(k, v, s) { return '<div class="ad-pill"><small>' + k + '</small><b>' + v + '</b>' + (s ? '<span>' + s + '</span>' : '') + '</div>'; }
    var masaTxt = (p.masa.adhika ? 'अधिक ' : '') + p.masa.purnimanta + ' · ' + p.paksha + ' पक्ष';
    document.getElementById('adTodayBody').innerHTML =
      pill('तिथि', p.tithi.name, 'तक ' + f(p.tithi.end)) +
      pill('नक्षत्र', p.nakshatra.name, 'तक ' + f(p.nakshatra.end)) +
      pill('योग', p.yoga.name, 'तक ' + f(p.yoga.end)) +
      pill('सूर्योदय / अस्त', f(p.sunrise) + ' / ' + f(p.sunset)) +
      pill('राहु काल', f(p.rahu.start) + ' – ' + f(p.rahu.end)) +
      pill('अभिजित मुहूर्त', f(p.abhijit.start) + ' – ' + f(p.abhijit.end));
    document.getElementById('adTodayTitle').innerHTML = 'आज का पंचांग — ' + p.date.vara + ', ' + pad(d) + '/' + pad(m) + '/' + y +
      '<small>' + masaTxt + ' · विक्रम संवत ' + p.samvat.vikram + ' · ' + city.name + '</small>';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
})();
