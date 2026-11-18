/* ============================================================================
   kform.js — shared birth-details form logic (janam-kundali.html, kundali.html)
   Expects inputs with ids: kName kDate kTime kPlace kState kCountry (+ optional kLat kLon kTzId)
   and <datalist id="cityList">. Needs jy-common.js (JY.CITIES, JY.tzOffset).
   Time zone comes from the IANA zone of the chosen city, evaluated AT THE BIRTH
   DATE, so DST / historic offsets are handled (e.g. London in summer = +1).
   ========================================================================== */
(function (global) {
  'use strict';
  function $(id) { return document.getElementById(id); }
  var KForm = {};

  KForm.bind = function () {
    JY.fillCityList($('cityList'));
    var pl = $('kPlace');
    function onPick() {
      var c = JY.findCity(pl.value);
      if (c) {
        if ($('kState')) $('kState').value = c.state || '';
        if ($('kCountry')) $('kCountry').value = c.country;
        if ($('kLat')) $('kLat').value = c.lat;
        if ($('kLon')) $('kLon').value = c.lon;
        if ($('kTzId')) $('kTzId').value = c.tz;
      }
    }
    if (pl) { pl.addEventListener('change', onPick); pl.addEventListener('blur', onPick); }
    var saved = JY.ls.get('jy_birth', null);
    if (saved) {
      if ($('kName') && saved.name && saved.name !== 'जातक') $('kName').value = saved.name;
      if ($('kDate')) $('kDate').value = saved.date || '';
      if ($('kTime')) $('kTime').value = saved.time || '';
      if (pl) { pl.value = saved.place || ''; onPick(); }
      if (saved.custom) { if ($('kLat')) $('kLat').value = saved.lat; if ($('kLon')) $('kLon').value = saved.lon; if ($('kTzId')) $('kTzId').value = saved.tzId || ''; }
    }
  };

  KForm.fillSample = function () {
    $('kName').value = 'उदाहरण जातक'; $('kDate').value = '1995-08-15'; $('kTime').value = '10:30';
    $('kPlace').value = 'Jaipur, Rajasthan, India'; $('kPlace').dispatchEvent(new Event('change'));
  };

  /** returns { ok:true, birth } or { ok:false, error } */
  KForm.read = function () {
    var name = ($('kName').value || '').trim() || 'जातक';
    var ds = $('kDate').value, ts = $('kTime').value;
    if (!ds || !ts) return { ok: false, error: 'कृपया जन्म तिथि और सटीक जन्म समय भरें।' };
    var dp = ds.split('-').map(Number), tp = ts.split(':').map(Number);
    if (dp[0] < 1800 || dp[0] > 2100) return { ok: false, error: 'जन्म वर्ष 1800 से 2100 के बीच होना चाहिए।' };
    var place = ($('kPlace').value || '').trim();
    var city = JY.findCity(place), lat, lon, tzId, custom = false;
    var latEl = $('kLat'), lonEl = $('kLon'), tzEl = $('kTzId');
    if (city) { lat = city.lat; lon = city.lon; tzId = city.tz; }
    else {
      lat = latEl && latEl.value !== '' ? parseFloat(latEl.value) : NaN;
      lon = lonEl && lonEl.value !== '' ? parseFloat(lonEl.value) : NaN;
      if (isNaN(lat) || isNaN(lon) || lat < -66 || lat > 66 || lon < -180 || lon > 180)
        return { ok: false, error: 'जन्म स्थान सूची से चुनें, या मान्य अक्षांश (−66 से 66) व देशांतर (−180 से 180) भरें।' };
      tzId = (tzEl && tzEl.value.trim()) || 'Asia/Kolkata'; custom = true;
    }
    var tz;
    if (/^[+-]?\d+(\.\d+)?$/.test(String(tzId))) tz = parseFloat(tzId);
    else {
      try { new Intl.DateTimeFormat('en', { timeZone: tzId }); } catch (e) { return { ok: false, error: 'समय क्षेत्र "' + tzId + '" मान्य नहीं (उदा. Asia/Kolkata या 5.5)।' }; }
      tz = JY.tzOffset(tzId, dp[0], dp[1], dp[2], tp[0], tp[1]);
    }
    var state = $('kState') ? $('kState').value.trim() : '', country = $('kCountry') ? $('kCountry').value.trim() : '';
    var label = city ? JY.cityLabel(city) : [place || 'Custom', state, country].filter(Boolean).join(', ');
    JY.ls.set('jy_birth', { name: name, date: ds, time: ts, place: place, lat: lat, lon: lon, tzId: tzId, custom: custom });
    return {
      ok: true,
      birth: { name: name, y: dp[0], m: dp[1], d: dp[2], hour: tp[0], minute: tp[1], tz: tz, tzId: tzId, lat: lat, lon: lon, place: label, state: state, country: country }
    };
  };
  KForm.tzLabel = function (tz) {
    var sg = tz < 0 ? '−' : '+', a = Math.abs(tz), h = Math.floor(a), m = Math.round((a - h) * 60);
    return 'UTC' + sg + h + ':' + (m < 10 ? '0' : '') + m;
  };
  global.KForm = KForm;
})(window);
