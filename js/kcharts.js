/* ============================================================================
   kcharts.js — Kundali chart renderers (North Indian diamond + South Indian grid)
   Input chart = { title, lagnaSign, signs: [12 x [{ab, retro}]] } as built by
   Astro.compute(...).charts.{D1,Moon,D9,D10}.
   Output = self-contained inline SVG string (presentation attributes only, so it
   survives html2canvas / print / serialisation).
   KCharts.north(chart, opts) / KCharts.south(chart, opts) / KCharts.render(style, chart, opts)
   opts.theme: 'clean' (maroon, default) | 'ink' (red/black handwritten look)
   ========================================================================== */
(function (global) {
  'use strict';
  var RASHI_SHORT = ['मेष', 'वृष', 'मिथु', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चि', 'धनु', 'मकर', 'कुंभ', 'मीन'];
  var THEMES = {
    clean: { line: '#7A1F12', sign: '#b8742b', planet: '#2b2118', retro: '#b91c1c', bg: '#fffaf0', font: "'Noto Serif Devanagari','Tiro Devanagari Hindi',serif", lagna: '#c4400a', title: '#7A1F12' },
    ink: { line: '#9c1f0e', sign: '#b8742b', planet: '#111111', retro: '#9c1f0e', bg: '#fffaf0', font: "'Kalam','Noto Serif Devanagari',cursive", lagna: '#9c1f0e', title: '#9c1f0e' }
  };
  // house centres in a 320x320 North Indian chart
  var HPOS = [null, [160, 86], [80, 42], [40, 84], [80, 160], [40, 236], [80, 278], [160, 236], [240, 278], [280, 236], [240, 160], [280, 84], [240, 42]];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function planetRows(pls, cx, cy, th, perRow, fs, bigCell) {
    var out = '', rows = [], i;
    for (i = 0; i < pls.length; i += perRow) rows.push(pls.slice(i, i + perRow));
    var lh = fs + 3, y0 = cy - ((rows.length - 1) * lh) / 2 + fs * 0.35;
    rows.forEach(function (r, ri) {
      out += '<text x="' + cx + '" y="' + (y0 + ri * lh).toFixed(1) + '" text-anchor="middle" font-size="' + fs + '" font-weight="700" font-family="' + th.font + '" fill="' + th.planet + '">';
      r.forEach(function (p, pi) {
        out += (pi ? ' ' : '') + (p.retro
          ? '<tspan fill="' + th.retro + '">' + esc(p.ab) + '</tspan><tspan fill="' + th.retro + '" font-size="' + Math.max(7, fs - 6) + '" dy="-' + Math.round(fs / 2.4) + '">व</tspan><tspan dy="' + Math.round(fs / 2.4) + '"></tspan>'
          : '<tspan>' + esc(p.ab) + '</tspan>');
      });
      out += '</text>';
    });
    return out;
  }

  function wrap(inner, chart, o, th) {
    var size = o.size || 320;
    var t = (o.showTitle === false) ? '' : '<div style="font-family:' + th.font + ';font-weight:700;color:' + th.title + ';font-size:1.05rem;margin-bottom:6px;text-align:center">' + esc(chart.title) + '</div>';
    return '<div class="kchart" style="text-align:center;margin:0 auto;max-width:' + size + 'px;width:100%">' + t +
      '<svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(chart.title) + '" style="width:100%;height:auto;display:block;background:' + th.bg + ';border:1px solid ' + th.sign + ';border-radius:4px">' + inner + '</svg></div>';
  }

  function north(chart, o) {
    o = o || {}; var th = THEMES[o.theme] || THEMES.clean, s = '', h;
    s += '<rect x="8" y="8" width="304" height="304" fill="none" stroke="' + th.line + '" stroke-width="1.8"/>';
    s += '<line x1="8" y1="8" x2="312" y2="312" stroke="' + th.line + '" stroke-width="1.5"/>';
    s += '<line x1="312" y1="8" x2="8" y2="312" stroke="' + th.line + '" stroke-width="1.5"/>';
    s += '<polygon points="160,8 312,160 160,312 8,160" fill="none" stroke="' + th.line + '" stroke-width="1.5"/>';
    for (h = 1; h <= 12; h++) {
      var sign = (chart.lagnaSign + h - 1) % 12, pos = HPOS[h], pls = chart.signs[sign] || [];
      var big = (h === 1 || h === 4 || h === 7 || h === 10);
      // sign number near the inner corner of each house
      var sx = pos[0], sy = pos[1] - (big ? 30 : 18);
      if (h === 1) { sx = 160; sy = 118; } else if (h === 4) { sx = 118; sy = 160; } else if (h === 7) { sx = 160; sy = 205; } else if (h === 10) { sx = 202; sy = 160; }
      else if (h === 2) { sx = 80; sy = 64; } else if (h === 3) { sx = 62; sy = 84; } else if (h === 5) { sx = 62; sy = 236; } else if (h === 6) { sx = 80; sy = 260; }
      else if (h === 8) { sx = 240; sy = 260; } else if (h === 9) { sx = 258; sy = 236; } else if (h === 11) { sx = 258; sy = 84; } else if (h === 12) { sx = 240; sy = 64; }
      s += '<text x="' + sx + '" y="' + (sy + 3) + '" text-anchor="middle" font-size="10" font-weight="700" font-family="' + th.font + '" fill="' + th.sign + '">' + (sign + 1) + '</text>';
      if (pls.length) {
        var fs = pls.length > 6 ? 10 : (pls.length > 3 ? 12 : 14);
        s += planetRows(pls, pos[0], pos[1] + (big ? 6 : 8), th, big ? 4 : 3, fs, big);
      }
    }
    s += '<text x="160" y="22" text-anchor="middle" font-size="9" font-family="' + th.font + '" fill="' + th.lagna + '" font-weight="700">ल</text>';
    return wrap(s, chart, o, th);
  }

  // South Indian: signs fixed in cells. Row-major grid positions (col,row)
  var SOUTH = { 11: [0, 0], 0: [1, 0], 1: [2, 0], 2: [3, 0], 3: [3, 1], 4: [3, 2], 5: [3, 3], 6: [2, 3], 7: [1, 3], 8: [0, 3], 9: [0, 2], 10: [0, 1] };
  function south(chart, o) {
    o = o || {}; var th = THEMES[o.theme] || THEMES.clean, s = '', sg, c = 76, x0 = 8, y0 = 8;
    s += '<rect x="' + x0 + '" y="' + y0 + '" width="' + (c * 4) + '" height="' + (c * 4) + '" fill="none" stroke="' + th.line + '" stroke-width="1.8"/>';
    for (var i = 1; i < 4; i++) {
      s += '<line x1="' + (x0 + i * c) + '" y1="' + y0 + '" x2="' + (x0 + i * c) + '" y2="' + (y0 + 4 * c) + '" stroke="' + th.line + '" stroke-width="1.4"/>';
      s += '<line x1="' + x0 + '" y1="' + (y0 + i * c) + '" x2="' + (x0 + 4 * c) + '" y2="' + (y0 + i * c) + '" stroke="' + th.line + '" stroke-width="1.4"/>';
    }
    // clear the 2x2 centre so it reads as the classic layout
    s += '<rect x="' + (x0 + c + 1) + '" y="' + (y0 + c + 1) + '" width="' + (2 * c - 2) + '" height="' + (2 * c - 2) + '" fill="' + th.bg + '" stroke="none"/>';
    s += '<text x="160" y="150" text-anchor="middle" font-size="12" font-weight="700" font-family="' + th.font + '" fill="' + th.title + '">' + esc(chart.title.replace(/\s*\(.*\)/, '')) + '</text>';
    s += '<text x="160" y="170" text-anchor="middle" font-size="9" font-family="' + th.font + '" fill="' + th.sign + '">दक्षिण भारतीय शैली</text>';
    for (sg = 0; sg < 12; sg++) {
      var p = SOUTH[sg], cx = x0 + p[0] * c, cy = y0 + p[1] * c;
      s += '<text x="' + (cx + 4) + '" y="' + (cy + c - 5) + '" font-size="8" font-family="' + th.font + '" fill="' + th.sign + '">' + RASHI_SHORT[sg] + '</text>';
      if (sg === chart.lagnaSign) {
        s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + 20) + '" y2="' + (cy + 20) + '" stroke="' + th.lagna + '" stroke-width="1.6"/>';
        s += '<text x="' + (cx + c - 9) + '" y="' + (cy + 12) + '" text-anchor="middle" font-size="10" font-weight="700" font-family="' + th.font + '" fill="' + th.lagna + '">ल</text>';
      }
      var pls = chart.signs[sg] || [];
      if (pls.length) s += planetRows(pls, cx + c / 2, cy + c / 2 + 6, th, 3, pls.length > 6 ? 10 : (pls.length > 3 ? 12 : 14), true);
    }
    return wrap(s, chart, o, th);
  }

  global.KCharts = {
    north: north, south: south,
    render: function (style, chart, o) { return style === 'south' ? south(chart, o) : north(chart, o); },
    RASHI_SHORT: RASHI_SHORT
  };
})(window);
