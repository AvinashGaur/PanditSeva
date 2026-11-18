/* ============================================================================
   jy-common.js — shared Jyotish layer for PanditSeva.in
   - JY.CITIES / JY.findCity / JY.tzOffset (IANA time zones => DST handled)
   - JY.layout(): injects the common header (with ज्योतिष सेवा menu) + footer
   - JY.CONFIG: backend / payment settings (NO secrets here, ever)
   - JY.store: Supabase REST when configured, else this-browser-only localStorage
   - JY.access: Free vs Premium gate (soft gate until a backend is connected)
   ========================================================================== */
(function (global) {
  'use strict';
  var JY = global.JY = global.JY || {};

  /* ---------------- CONFIG (public values only) ---------------- */
  // Fill these after creating a Supabase project (see backend/README.md).
  // The anon key is public by design; the service-role key must NEVER be put here.
  JY.CONFIG = {
    supabaseUrl: '',          // e.g. https://xxxx.supabase.co
    supabaseAnonKey: '',      // public anon key
    razorpayKeyId: '',        // public key id only (rzp_live_xxx); secret lives in the backend
    paymentEndpoint: '',      // Supabase Edge Function URL that creates a Razorpay order
    enforcePremium: false,    // false = launch mode: premium features open, shown with a badge.
                              // Set true only AFTER backend auth + payment verification are live.
    whatsapp: '917737782519',
    phone: '7737782519'
  };
  JY.backendReady = function () { return !!(JY.CONFIG.supabaseUrl && JY.CONFIG.supabaseAnonKey); };

  /* ---------------- CITIES: [name, state, country, lat, lonEast, IANA tz] ---------------- */
  JY.CITIES = [
    ["Jaipur", "Rajasthan", "India", 26.9124, 75.7873, "Asia/Kolkata"],
    ["Delhi", "Delhi", "India", 28.6139, 77.209, "Asia/Kolkata"],
    ["Mumbai", "Maharashtra", "India", 19.076, 72.8777, "Asia/Kolkata"],
    ["Kolkata", "West Bengal", "India", 22.5726, 88.3639, "Asia/Kolkata"],
    ["Chennai", "Tamil Nadu", "India", 13.0827, 80.2707, "Asia/Kolkata"],
    ["Bengaluru", "Karnataka", "India", 12.9716, 77.5946, "Asia/Kolkata"],
    ["Hyderabad", "Telangana", "India", 17.385, 78.4867, "Asia/Kolkata"],
    ["Ahmedabad", "Gujarat", "India", 23.0225, 72.5714, "Asia/Kolkata"],
    ["Pune", "Maharashtra", "India", 18.5204, 73.8567, "Asia/Kolkata"],
    ["Lucknow", "Uttar Pradesh", "India", 26.8467, 80.9462, "Asia/Kolkata"],
    ["Kanpur", "Uttar Pradesh", "India", 26.4499, 80.3319, "Asia/Kolkata"],
    ["Nagpur", "Maharashtra", "India", 21.1458, 79.0882, "Asia/Kolkata"],
    ["Indore", "Madhya Pradesh", "India", 22.7196, 75.8577, "Asia/Kolkata"],
    ["Bhopal", "Madhya Pradesh", "India", 23.2599, 77.4126, "Asia/Kolkata"],
    ["Patna", "Bihar", "India", 25.5941, 85.1376, "Asia/Kolkata"],
    ["Varanasi", "Uttar Pradesh", "India", 25.3176, 82.9739, "Asia/Kolkata"],
    ["Agra", "Uttar Pradesh", "India", 27.1767, 78.0081, "Asia/Kolkata"],
    ["Jodhpur", "Rajasthan", "India", 26.2389, 73.0243, "Asia/Kolkata"],
    ["Udaipur", "Rajasthan", "India", 24.5854, 73.7125, "Asia/Kolkata"],
    ["Kota", "Rajasthan", "India", 25.2138, 75.8648, "Asia/Kolkata"],
    ["Ajmer", "Rajasthan", "India", 26.4499, 74.6399, "Asia/Kolkata"],
    ["Bikaner", "Rajasthan", "India", 28.0229, 73.3119, "Asia/Kolkata"],
    ["Alwar", "Rajasthan", "India", 27.553, 76.6346, "Asia/Kolkata"],
    ["Bharatpur", "Rajasthan", "India", 27.2152, 77.503, "Asia/Kolkata"],
    ["Sikar", "Rajasthan", "India", 27.6094, 75.1399, "Asia/Kolkata"],
    ["Surat", "Gujarat", "India", 21.1702, 72.8311, "Asia/Kolkata"],
    ["Vadodara", "Gujarat", "India", 22.3072, 73.1812, "Asia/Kolkata"],
    ["Rajkot", "Gujarat", "India", 22.3039, 70.8022, "Asia/Kolkata"],
    ["Chandigarh", "Chandigarh", "India", 30.7333, 76.7794, "Asia/Kolkata"],
    ["Ludhiana", "Punjab", "India", 30.901, 75.8573, "Asia/Kolkata"],
    ["Amritsar", "Punjab", "India", 31.634, 74.8723, "Asia/Kolkata"],
    ["Jalandhar", "Punjab", "India", 31.326, 75.5762, "Asia/Kolkata"],
    ["Dehradun", "Uttarakhand", "India", 30.3165, 78.0322, "Asia/Kolkata"],
    ["Haridwar", "Uttarakhand", "India", 29.9457, 78.1642, "Asia/Kolkata"],
    ["Meerut", "Uttar Pradesh", "India", 28.9845, 77.7064, "Asia/Kolkata"],
    ["Ghaziabad", "Uttar Pradesh", "India", 28.6692, 77.4538, "Asia/Kolkata"],
    ["Noida", "Uttar Pradesh", "India", 28.5355, 77.391, "Asia/Kolkata"],
    ["Gurugram", "Haryana", "India", 28.4595, 77.0266, "Asia/Kolkata"],
    ["Faridabad", "Haryana", "India", 28.4089, 77.3178, "Asia/Kolkata"],
    ["Prayagraj", "Uttar Pradesh", "India", 25.4358, 81.8463, "Asia/Kolkata"],
    ["Gorakhpur", "Uttar Pradesh", "India", 26.7606, 83.3732, "Asia/Kolkata"],
    ["Bareilly", "Uttar Pradesh", "India", 28.367, 79.4304, "Asia/Kolkata"],
    ["Aligarh", "Uttar Pradesh", "India", 27.8974, 78.088, "Asia/Kolkata"],
    ["Moradabad", "Uttar Pradesh", "India", 28.8386, 78.7733, "Asia/Kolkata"],
    ["Jhansi", "Uttar Pradesh", "India", 25.4484, 78.5685, "Asia/Kolkata"],
    ["Gwalior", "Madhya Pradesh", "India", 26.2183, 78.1828, "Asia/Kolkata"],
    ["Jabalpur", "Madhya Pradesh", "India", 23.1815, 79.9864, "Asia/Kolkata"],
    ["Raipur", "Chhattisgarh", "India", 21.2514, 81.6296, "Asia/Kolkata"],
    ["Ranchi", "Jharkhand", "India", 23.3441, 85.3096, "Asia/Kolkata"],
    ["Jamshedpur", "Jharkhand", "India", 22.8046, 86.2029, "Asia/Kolkata"],
    ["Dhanbad", "Jharkhand", "India", 23.7957, 86.4304, "Asia/Kolkata"],
    ["Bhubaneswar", "Odisha", "India", 20.2961, 85.8245, "Asia/Kolkata"],
    ["Cuttack", "Odisha", "India", 20.4625, 85.883, "Asia/Kolkata"],
    ["Guwahati", "Assam", "India", 26.1445, 91.7362, "Asia/Kolkata"],
    ["Siliguri", "West Bengal", "India", 26.7271, 88.3953, "Asia/Kolkata"],
    ["Asansol", "West Bengal", "India", 23.6889, 86.9661, "Asia/Kolkata"],
    ["Durgapur", "West Bengal", "India", 23.5204, 87.3119, "Asia/Kolkata"],
    ["Thiruvananthapuram", "Kerala", "India", 8.5241, 76.9366, "Asia/Kolkata"],
    ["Kochi", "Kerala", "India", 9.9312, 76.2673, "Asia/Kolkata"],
    ["Kozhikode", "Kerala", "India", 11.2588, 75.7804, "Asia/Kolkata"],
    ["Coimbatore", "Tamil Nadu", "India", 11.0168, 76.9558, "Asia/Kolkata"],
    ["Madurai", "Tamil Nadu", "India", 9.9252, 78.1198, "Asia/Kolkata"],
    ["Tiruchirappalli", "Tamil Nadu", "India", 10.7905, 78.7047, "Asia/Kolkata"],
    ["Visakhapatnam", "Andhra Pradesh", "India", 17.6868, 83.2185, "Asia/Kolkata"],
    ["Vijayawada", "Andhra Pradesh", "India", 16.5062, 80.648, "Asia/Kolkata"],
    ["Guntur", "Andhra Pradesh", "India", 16.3067, 80.4365, "Asia/Kolkata"],
    ["Mysuru", "Karnataka", "India", 12.2958, 76.6394, "Asia/Kolkata"],
    ["Mangaluru", "Karnataka", "India", 12.9141, 74.856, "Asia/Kolkata"],
    ["Hubli", "Karnataka", "India", 15.3647, 75.124, "Asia/Kolkata"],
    ["Nashik", "Maharashtra", "India", 19.9975, 73.7898, "Asia/Kolkata"],
    ["Aurangabad", "Maharashtra", "India", 19.8762, 75.3433, "Asia/Kolkata"],
    ["Solapur", "Maharashtra", "India", 17.6599, 75.9064, "Asia/Kolkata"],
    ["Srinagar", "Jammu & Kashmir", "India", 34.0837, 74.7973, "Asia/Kolkata"],
    ["Jammu", "Jammu & Kashmir", "India", 32.7266, 74.857, "Asia/Kolkata"],
    ["Shimla", "Himachal Pradesh", "India", 31.1048, 77.1734, "Asia/Kolkata"],
    ["Ambala", "Haryana", "India", 30.3782, 76.7767, "Asia/Kolkata"],
    ["Hisar", "Haryana", "India", 29.1492, 75.7217, "Asia/Kolkata"],
    ["Rohtak", "Haryana", "India", 28.8955, 76.6066, "Asia/Kolkata"],
    ["Panipat", "Haryana", "India", 29.3909, 76.9635, "Asia/Kolkata"],
    ["Mathura", "Uttar Pradesh", "India", 27.4924, 77.6737, "Asia/Kolkata"],
    ["Rewari", "Haryana", "India", 28.197, 76.617, "Asia/Kolkata"],
    ["Bhilwara", "Rajasthan", "India", 25.3407, 74.6313, "Asia/Kolkata"],
    ["Pali", "Rajasthan", "India", 25.7711, 73.3234, "Asia/Kolkata"],
    ["Jhunjhunu", "Rajasthan", "India", 28.1289, 75.3995, "Asia/Kolkata"],
    ["Sri Ganganagar", "Rajasthan", "India", 29.9094, 73.88, "Asia/Kolkata"],
    ["Tonk", "Rajasthan", "India", 26.1663, 75.7885, "Asia/Kolkata"],
    ["Dausa", "Rajasthan", "India", 26.8938, 76.3374, "Asia/Kolkata"],
    ["Pushkar", "Rajasthan", "India", 26.4897, 74.5511, "Asia/Kolkata"],
    ["Jaisalmer", "Rajasthan", "India", 26.9157, 70.9083, "Asia/Kolkata"],
    ["Chittorgarh", "Rajasthan", "India", 24.8887, 74.6269, "Asia/Kolkata"],
    ["Barmer", "Rajasthan", "India", 25.7532, 71.4181, "Asia/Kolkata"],
    ["Ujjain", "Madhya Pradesh", "India", 23.1765, 75.7885, "Asia/Kolkata"],
    ["Rewa", "Madhya Pradesh", "India", 24.5362, 81.3037, "Asia/Kolkata"],
    ["Sagar", "Madhya Pradesh", "India", 23.8388, 78.7378, "Asia/Kolkata"],
    ["Ayodhya", "Uttar Pradesh", "India", 26.7922, 82.1998, "Asia/Kolkata"],
    ["Vrindavan", "Uttar Pradesh", "India", 27.5806, 77.6974, "Asia/Kolkata"],
    ["Saharanpur", "Uttar Pradesh", "India", 29.968, 77.551, "Asia/Kolkata"],
    ["Firozabad", "Uttar Pradesh", "India", 27.1591, 78.3957, "Asia/Kolkata"],
    ["Muzaffarnagar", "Uttar Pradesh", "India", 29.4727, 77.7085, "Asia/Kolkata"],
    ["Rishikesh", "Uttarakhand", "India", 30.0869, 78.2676, "Asia/Kolkata"],
    ["Haldwani", "Uttarakhand", "India", 29.2183, 79.513, "Asia/Kolkata"],
    ["Karnal", "Haryana", "India", 29.6857, 76.9905, "Asia/Kolkata"],
    ["Sonipat", "Haryana", "India", 28.9931, 77.0151, "Asia/Kolkata"],
    ["Kurukshetra", "Haryana", "India", 29.9695, 76.8783, "Asia/Kolkata"],
    ["Patiala", "Punjab", "India", 30.3398, 76.3869, "Asia/Kolkata"],
    ["Bathinda", "Punjab", "India", 30.211, 74.9455, "Asia/Kolkata"],
    ["Gaya", "Bihar", "India", 24.7914, 85.0002, "Asia/Kolkata"],
    ["Bhagalpur", "Bihar", "India", 25.2425, 86.9842, "Asia/Kolkata"],
    ["Muzaffarpur", "Bihar", "India", 26.1209, 85.3647, "Asia/Kolkata"],
    ["Darbhanga", "Bihar", "India", 26.1542, 85.8918, "Asia/Kolkata"],
    ["Bilaspur", "Chhattisgarh", "India", 22.0797, 82.1409, "Asia/Kolkata"],
    ["Bhilai", "Chhattisgarh", "India", 21.209, 81.4285, "Asia/Kolkata"],
    ["Howrah", "West Bengal", "India", 22.5958, 88.2636, "Asia/Kolkata"],
    ["Hooghly", "West Bengal", "India", 22.9, 88.39, "Asia/Kolkata"],
    ["Burdwan", "West Bengal", "India", 23.2324, 87.8615, "Asia/Kolkata"],
    ["Puri", "Odisha", "India", 19.8135, 85.8312, "Asia/Kolkata"],
    ["Rourkela", "Odisha", "India", 22.2604, 84.8536, "Asia/Kolkata"],
    ["Imphal", "Manipur", "India", 24.817, 93.9368, "Asia/Kolkata"],
    ["Shillong", "Meghalaya", "India", 25.5788, 91.8933, "Asia/Kolkata"],
    ["Agartala", "Tripura", "India", 23.8315, 91.2868, "Asia/Kolkata"],
    ["Aizawl", "Mizoram", "India", 23.7271, 92.7176, "Asia/Kolkata"],
    ["Gangtok", "Sikkim", "India", 27.3389, 88.6065, "Asia/Kolkata"],
    ["Dibrugarh", "Assam", "India", 27.4728, 94.912, "Asia/Kolkata"],
    ["Itanagar", "Arunachal Pradesh", "India", 27.0844, 93.6053, "Asia/Kolkata"],
    ["Kohima", "Nagaland", "India", 25.6751, 94.1086, "Asia/Kolkata"],
    ["Panaji", "Goa", "India", 15.4909, 73.8278, "Asia/Kolkata"],
    ["Margao", "Goa", "India", 15.2832, 73.9862, "Asia/Kolkata"],
    ["Thane", "Maharashtra", "India", 19.2183, 72.9781, "Asia/Kolkata"],
    ["Kolhapur", "Maharashtra", "India", 16.705, 74.2433, "Asia/Kolkata"],
    ["Amravati", "Maharashtra", "India", 20.9374, 77.7796, "Asia/Kolkata"],
    ["Nanded", "Maharashtra", "India", 19.1383, 77.321, "Asia/Kolkata"],
    ["Pandharpur", "Maharashtra", "India", 17.6792, 75.327, "Asia/Kolkata"],
    ["Jamnagar", "Gujarat", "India", 22.4707, 70.0577, "Asia/Kolkata"],
    ["Bhavnagar", "Gujarat", "India", 21.7645, 72.1519, "Asia/Kolkata"],
    ["Gandhinagar", "Gujarat", "India", 23.2156, 72.6369, "Asia/Kolkata"],
    ["Dwarka", "Gujarat", "India", 22.2394, 68.9678, "Asia/Kolkata"],
    ["Somnath", "Gujarat", "India", 20.888, 70.4013, "Asia/Kolkata"],
    ["Warangal", "Telangana", "India", 17.9689, 79.5941, "Asia/Kolkata"],
    ["Nellore", "Andhra Pradesh", "India", 14.4426, 79.9865, "Asia/Kolkata"],
    ["Tirupati", "Andhra Pradesh", "India", 13.6288, 79.4192, "Asia/Kolkata"],
    ["Rajahmundry", "Andhra Pradesh", "India", 17.0005, 81.804, "Asia/Kolkata"],
    ["Belagavi", "Karnataka", "India", 15.8497, 74.4977, "Asia/Kolkata"],
    ["Kalaburagi", "Karnataka", "India", 17.3297, 76.8343, "Asia/Kolkata"],
    ["Salem", "Tamil Nadu", "India", 11.6643, 78.146, "Asia/Kolkata"],
    ["Tirunelveli", "Tamil Nadu", "India", 8.7139, 77.7567, "Asia/Kolkata"],
    ["Rameswaram", "Tamil Nadu", "India", 9.2876, 79.3129, "Asia/Kolkata"],
    ["Thrissur", "Kerala", "India", 10.5276, 76.2144, "Asia/Kolkata"],
    ["Kannur", "Kerala", "India", 11.8745, 75.3704, "Asia/Kolkata"],
    ["Puducherry", "Puducherry", "India", 11.9416, 79.8083, "Asia/Kolkata"],
    ["Leh", "Ladakh", "India", 34.1526, 77.5771, "Asia/Kolkata"],
    ["Pathankot", "Punjab", "India", 32.2643, 75.6421, "Asia/Kolkata"],
    ["Dharamshala", "Himachal Pradesh", "India", 32.219, 76.3234, "Asia/Kolkata"],
    ["Kullu", "Himachal Pradesh", "India", 31.9592, 77.1089, "Asia/Kolkata"],
    ["Kathmandu", "", "Nepal", 27.7172, 85.324, "Asia/Kathmandu"],
    ["Colombo", "", "Sri Lanka", 6.9271, 79.8612, "Asia/Colombo"],
    ["Dhaka", "", "Bangladesh", 23.8103, 90.4125, "Asia/Dhaka"],
    ["Karachi", "", "Pakistan", 24.8607, 67.0011, "Asia/Karachi"],
    ["Lahore", "", "Pakistan", 31.5204, 74.3587, "Asia/Karachi"],
    ["Dubai", "", "UAE", 25.2048, 55.2708, "Asia/Dubai"],
    ["Abu Dhabi", "", "UAE", 24.4539, 54.3773, "Asia/Dubai"],
    ["Doha", "", "Qatar", 25.2854, 51.531, "Asia/Qatar"],
    ["Muscat", "", "Oman", 23.588, 58.3829, "Asia/Muscat"],
    ["Riyadh", "", "Saudi Arabia", 24.7136, 46.6753, "Asia/Riyadh"],
    ["Kuwait City", "", "Kuwait", 29.3759, 47.9774, "Asia/Kuwait"],
    ["Singapore", "", "Singapore", 1.3521, 103.8198, "Asia/Singapore"],
    ["Kuala Lumpur", "", "Malaysia", 3.139, 101.6869, "Asia/Kuala_Lumpur"],
    ["Bangkok", "", "Thailand", 13.7563, 100.5018, "Asia/Bangkok"],
    ["Hong Kong", "", "Hong Kong", 22.3193, 114.1694, "Asia/Hong_Kong"],
    ["Tokyo", "", "Japan", 35.6762, 139.6503, "Asia/Tokyo"],
    ["Sydney", "", "Australia", -33.8688, 151.2093, "Australia/Sydney"],
    ["Melbourne", "", "Australia", -37.8136, 144.9631, "Australia/Melbourne"],
    ["Auckland", "", "New Zealand", -36.8485, 174.7633, "Pacific/Auckland"],
    ["London", "", "United Kingdom", 51.5074, -0.1278, "Europe/London"],
    ["Leicester", "", "United Kingdom", 52.6369, -1.1398, "Europe/London"],
    ["Paris", "", "France", 48.8566, 2.3522, "Europe/Paris"],
    ["Berlin", "", "Germany", 52.52, 13.405, "Europe/Berlin"],
    ["Amsterdam", "", "Netherlands", 52.3676, 4.9041, "Europe/Amsterdam"],
    ["Nairobi", "", "Kenya", -1.2921, 36.8219, "Africa/Nairobi"],
    ["Johannesburg", "", "South Africa", -26.2041, 28.0473, "Africa/Johannesburg"],
    ["Port Louis", "", "Mauritius", -20.1609, 57.5012, "Indian/Mauritius"],
    ["New York", "New York", "USA", 40.7128, -74.006, "America/New_York"],
    ["Chicago", "Illinois", "USA", 41.8781, -87.6298, "America/Chicago"],
    ["Houston", "Texas", "USA", 29.7604, -95.3698, "America/Chicago"],
    ["Los Angeles", "California", "USA", 34.0522, -118.2437, "America/Los_Angeles"],
    ["San Francisco", "California", "USA", 37.7749, -122.4194, "America/Los_Angeles"],
    ["Edison", "New Jersey", "USA", 40.5187, -74.4121, "America/New_York"],
    ["Toronto", "Ontario", "Canada", 43.6532, -79.3832, "America/Toronto"],
    ["Vancouver", "British Columbia", "Canada", 49.2827, -123.1207, "America/Vancouver"]
  ].map(function (r) { return { name: r[0], state: r[1], country: r[2], lat: r[3], lon: r[4], tz: r[5] }; });

  JY.cityLabel = function (c) { return c.name + (c.state ? ', ' + c.state : '') + ', ' + c.country; };
  /** find by exact label or by first comma-part name */
  JY.findCity = function (txt) {
    if (!txt) return null;
    var t = String(txt).trim().toLowerCase(), i, c;
    for (i = 0; i < JY.CITIES.length; i++) { c = JY.CITIES[i]; if (JY.cityLabel(c).toLowerCase() === t) return c; }
    var first = t.split(',')[0].trim();
    for (i = 0; i < JY.CITIES.length; i++) { if (JY.CITIES[i].name.toLowerCase() === first) return JY.CITIES[i]; }
    return null;
  };
  /** fill a <datalist> with all cities */
  JY.fillCityList = function (dl) {
    if (!dl) return;
    JY.CITIES.forEach(function (c) { var o = document.createElement('option'); o.value = JY.cityLabel(c); dl.appendChild(o); });
  };

  /** UTC offset (hours) of IANA zone at a given local wall-clock time. Handles DST / historic offsets. */
  JY.tzOffset = function (tz, y, m, d, hh, mm) {
    try {
      var guess = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
      var fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
      function offAt(utcMs) {
        var p = {}; fmt.formatToParts(new Date(utcMs)).forEach(function (x) { p[x.type] = parseInt(x.value, 10); });
        return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - utcMs) / 3600000;
      }
      var o1 = offAt(guess - 5.5 * 3600000);     // first estimate
      var o2 = offAt(guess - o1 * 3600000);      // refine once (DST edges)
      return o2;
    } catch (e) { return 5.5; }
  };
  /** convenient: offset for a city object on a date/time */
  JY.cityTz = function (city, y, m, d, hh, mm) { return JY.tzOffset(city.tz, y, m, d, hh, mm); };

  /* ---------------- small helpers ---------------- */
  var DEV = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  JY.dev = function (n) { return String(n).replace(/\d/g, function (c) { return DEV[+c]; }); };
  JY.pad = function (n) { return (n < 10 ? '0' : '') + n; };
  JY.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  JY.todayISO = function () { var t = new Date(); return t.getFullYear() + '-' + JY.pad(t.getMonth() + 1) + '-' + JY.pad(t.getDate()); };
  JY.ls = {
    get: function (k, dflt) { try { var v = localStorage.getItem(k); return v == null ? dflt : JSON.parse(v); } catch (e) { return dflt; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  /** remembered city (shared across all tools) */
  JY.lastCity = function () { return JY.findCity(JY.ls.get('jy_city', 'Jaipur')) || JY.findCity('Jaipur'); };
  JY.saveCity = function (c) { JY.ls.set('jy_city', JY.cityLabel(c)); };
  JY.toast = function (msg) {
    var t = document.createElement('div'); t.className = 'jy-toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10); setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, 2600);
  };

  /* ---------------- NAVIGATION (single source of truth) ---------------- */
  JY.MENU = [
    ['panchang.html', 'दैनिक पंचांग', 'fa-calendar-day'],
    ['faladesh.html', 'दैनिक फलादेश', 'fa-sun'],
    ['rashifal.html', 'राशिफल', 'fa-star'],
    ['baby-names.html', 'जन्म नाम सुझाव', 'fa-baby'],
    ['janam-kundali.html', 'जन्म कुंडली', 'fa-circle-nodes'],
    ['kundali.html', 'प्रीमियम कुंडली', 'fa-scroll'],
    ['kundali-matching.html', 'कुंडली मिलान', 'fa-heart']
  ];
  JY.menuHTML = function (active) {
    return JY.MENU.map(function (m) { return '<a href="' + m[0] + '"' + (active === m[0] ? ' class="active"' : '') + '><i class="fas ' + m[2] + '"></i> ' + m[1] + '</a>'; }).join('');
  };

  JY.layout = function (active) {
    var h = document.getElementById('jy-header');
    if (h) {
      h.outerHTML = '<header class="header" id="mainHeader"><div class="container"><div class="header-inner">' +
        '<a href="index.html" class="logo"><div class="logo-icon">🕉️</div><span class="logo-text">PanditSeva<span class="logo-dot">.in</span></span></a>' +
        '<nav class="nav">' +
        '<a href="index.html#services">Services</a><a href="pandits.html">Pandits</a>' +
        '<div class="nav-dd' + (active && active !== 'x' ? ' has-active' : '') + '"><button class="nav-dd-btn" type="button">ज्योतिष सेवा <i class="fas fa-chevron-down"></i></button><div class="nav-dd-menu">' + JY.menuHTML(active) + '</div></div>' +
        '<a href="booking.html">Book Pooja</a></nav>' +
        '<div class="header-actions"><a href="tel:' + JY.CONFIG.phone + '" class="header-phone"><i class="fas fa-phone-alt"></i> ' + JY.CONFIG.phone.slice(0, 5) + ' ' + JY.CONFIG.phone.slice(5) + '</a>' +
        '<a href="chat.html" class="btn btn-primary btn-sm"><i class="fas fa-comments"></i> Talk to Pandit</a>' +
        '<button class="hamburger" id="hamburger" aria-label="Menu"><span></span><span></span><span></span></button></div></div></div></header>' +
        '<div class="mobile-menu" id="mobileMenu"><a href="index.html#services">Services</a><a href="pandits.html">Browse Pandits</a>' +
        '<div class="mm-title">ज्योतिष सेवा</div>' + JY.menuHTML(active) +
        '<a href="booking.html">Book a Pooja</a><a href="chat.html">Chat with Pandit</a></div>';
      JY.wireHeader();
    }
    var f = document.getElementById('jy-footer');
    if (f) {
      f.outerHTML = '<footer class="footer"><div class="container"><div class="footer-grid">' +
        '<div class="footer-brand"><div class="logo"><div class="logo-icon">🕉️</div><span class="logo-text">PanditSeva<span style="color:var(--primary)">.in</span></span></div>' +
        '<p>Jaipur\'s trusted platform for booking verified pandits, now with Vedic Jyotish — Panchang, Rashifal, Kundali and Kundali Milan.</p>' +
        '<div class="footer-socials"><a href="https://wa.me/' + JY.CONFIG.whatsapp + '" class="social-btn"><i class="fab fa-whatsapp"></i></a></div></div>' +
        '<div class="footer-col"><h5>ज्योतिष सेवा</h5><ul>' + JY.MENU.map(function (m) { return '<li><a href="' + m[0] + '">' + m[1] + '</a></li>'; }).join('') + '</ul></div>' +
        '<div class="footer-col"><h5>Quick Links</h5><ul><li><a href="pandits.html">Browse Pandits</a></li><li><a href="chat.html">Talk to Pandit</a></li><li><a href="booking.html">Book a Pooja</a></li><li><a href="premium.html">Premium Membership</a></li></ul></div>' +
        '<div class="footer-col"><h5>Contact</h5><ul><li><a href="tel:' + JY.CONFIG.phone + '">' + JY.CONFIG.phone + '</a></li><li><a href="https://wa.me/' + JY.CONFIG.whatsapp + '">WhatsApp</a></li></ul></div>' +
        '</div><div class="footer-bottom"><p>© PanditSeva.in — ज्योतिषीय गणनाएँ स्वचालित हैं; महत्वपूर्ण निर्णयों से पूर्व योग्य ज्योतिषी से परामर्श लें।</p></div></div></footer>';
    }
  };
  JY.wireHeader = function (dropdownOnly) {
    var hb = document.getElementById('hamburger'), mm = document.getElementById('mobileMenu');
    if (!dropdownOnly && hb && mm) hb.addEventListener('click', function () { mm.classList.toggle('open'); hb.classList.toggle('open'); });
    var dd = document.querySelector('.nav-dd'), btn = document.querySelector('.nav-dd-btn');
    if (dd && btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); dd.classList.toggle('open'); });
      document.addEventListener('click', function () { dd.classList.remove('open'); });
    }
    window.addEventListener('scroll', function () { var hd = document.getElementById('mainHeader'); if (hd) hd.classList.toggle('scrolled', window.scrollY > 10); });
  };

  /* ---------------- STORE: Supabase REST or local-only ---------------- */
  // Collections used: content (key/value JSON for admin-managed text), pricing, reports, users.
  JY.store = {
    mode: function () { return JY.backendReady() ? 'supabase' : 'local'; },
    _hdr: function () {
      var tok = JY.ls.get('jy_sb_token', null);
      return { apikey: JY.CONFIG.supabaseAnonKey, Authorization: 'Bearer ' + (tok || JY.CONFIG.supabaseAnonKey), 'Content-Type': 'application/json' };
    },
    /** read one JSON doc: table `jy_content`, column key/value */
    get: function (key, dflt) {
      if (!JY.backendReady()) return Promise.resolve(JY.ls.get('jy_c_' + key, dflt));
      return fetch(JY.CONFIG.supabaseUrl + '/rest/v1/jy_content?key=eq.' + encodeURIComponent(key) + '&select=value', { headers: JY.store._hdr() })
        .then(function (r) { return r.json(); }).then(function (rows) { return rows && rows[0] ? rows[0].value : dflt; }).catch(function () { return dflt; });
    },
    /** write one JSON doc (admin only — RLS on the server enforces this; the browser check is just UX) */
    set: function (key, value) {
      if (!JY.backendReady()) { JY.ls.set('jy_c_' + key, value); return Promise.resolve(true); }
      var h = JY.store._hdr(); h.Prefer = 'resolution=merge-duplicates';
      return fetch(JY.CONFIG.supabaseUrl + '/rest/v1/jy_content', { method: 'POST', headers: h, body: JSON.stringify({ key: key, value: value }) })
        .then(function (r) { if (!r.ok) throw new Error('save failed ' + r.status); return true; });
    }
  };

  /* ---------------- PRICING (defaults; admin overrides via store key "pricing") ---------------- */
  JY.DEFAULT_PRICING = { currency: 'INR', premiumKundali: 499, kundaliMatching: 299, detailedPdf: 199, membershipMonthly: 199, membershipYearly: 1499 };
  JY.getPricing = function () { return JY.store.get('pricing', JY.DEFAULT_PRICING).then(function (p) { return Object.assign({}, JY.DEFAULT_PRICING, p || {}); }); };

  /* ---------------- ACCESS (Free vs Premium) ---------------- */
  // Client-side gating is UX only (anyone can bypass it). Real enforcement needs backend
  // auth + verified payments, which is why enforcePremium defaults to false.
  JY.FREE_FEATURES = ['panchang', 'faladesh_basic', 'rashifal_basic', 'babynames_limited'];
  JY.PREMIUM_FEATURES = ['kundali_detailed', 'kundali_explain', 'kundali_handwritten', 'matching_full', 'pdf_detailed', 'dasha_analysis', 'personal_report'];
  JY.isPremium = function () { var m = JY.ls.get('jy_membership', null); return !!(m && m.active && (!m.until || m.until > Date.now())); };
  JY.can = function (feature) {
    if (JY.FREE_FEATURES.indexOf(feature) !== -1) return true;
    if (!JY.CONFIG.enforcePremium) return true;
    return JY.isPremium();
  };
  /** small "PREMIUM" ribbon text for headings */
  JY.premiumBadge = function () { return '<span class="jy-prem-badge"><i class="fas fa-crown"></i> Premium</span>'; };

  /** Dismissible banner shown only on premium pages while payments are not live */
  JY.launchBanner = function (el) {
    if (!el || JY.CONFIG.enforcePremium) return;
    el.innerHTML = '<div class="jy-note"><i class="fas fa-gift"></i> लॉन्च ऑफ़र: प्रीमियम सुविधाएँ अभी सभी के लिए खुली हैं। भुगतान चालू होने पर ये Premium सदस्यों के लिए होंगी।</div>';
  };

  document.addEventListener('DOMContentLoaded', function () {
    var a = document.body.getAttribute('data-jy-active');
    if (document.getElementById('jy-header') || document.getElementById('jy-footer')) JY.layout(a);
    else JY.wireHeader(true);   // legacy pages keep their own header/hamburger; only the dropdown is wired
  });
})(window);
