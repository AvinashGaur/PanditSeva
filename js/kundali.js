/* ============================================================================
   kundali.js — Premium Janam Kundali UI, rendering & detailed Hindi phaladesh
   Uses Astro.compute() (astro.js) — all output is based on REAL calculated
   planetary positions. Interpretation text is AUTOMATED (template + computed
   positions), clearly marked as such.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Indian cities (lat, lon East, tz 5.5) ---------- */
  var CITIES = [
    ['Jaipur', 26.9124, 75.7873], ['Delhi', 28.6139, 77.2090], ['Mumbai', 19.0760, 72.8777],
    ['Kolkata', 22.5726, 88.3639], ['Chennai', 13.0827, 80.2707], ['Bengaluru', 12.9716, 77.5946],
    ['Hyderabad', 17.3850, 78.4867], ['Ahmedabad', 23.0225, 72.5714], ['Pune', 18.5204, 73.8567],
    ['Lucknow', 26.8467, 80.9462], ['Kanpur', 26.4499, 80.3319], ['Nagpur', 21.1458, 79.0882],
    ['Indore', 22.7196, 75.8577], ['Bhopal', 23.2599, 77.4126], ['Patna', 25.5941, 85.1376],
    ['Varanasi', 25.3176, 82.9739], ['Agra', 27.1767, 78.0081], ['Jodhpur', 26.2389, 73.0243],
    ['Udaipur', 24.5854, 73.7125], ['Kota', 25.2138, 75.8648], ['Ajmer', 26.4499, 74.6399],
    ['Bikaner', 28.0229, 73.3119], ['Alwar', 27.5530, 76.6346], ['Bharatpur', 27.2152, 77.5030],
    ['Sikar', 27.6094, 75.1399], ['Surat', 21.1702, 72.8311], ['Vadodara', 22.3072, 73.1812],
    ['Rajkot', 22.3039, 70.8022], ['Chandigarh', 30.7333, 76.7794], ['Ludhiana', 30.9010, 75.8573],
    ['Amritsar', 31.6340, 74.8723], ['Jalandhar', 31.3260, 75.5762], ['Dehradun', 30.3165, 78.0322],
    ['Haridwar', 29.9457, 78.1642], ['Meerut', 28.9845, 77.7064], ['Ghaziabad', 28.6692, 77.4538],
    ['Noida', 28.5355, 77.3910], ['Gurugram', 28.4595, 77.0266], ['Faridabad', 28.4089, 77.3178],
    ['Prayagraj', 25.4358, 81.8463], ['Gorakhpur', 26.7606, 83.3732], ['Bareilly', 28.3670, 79.4304],
    ['Aligarh', 27.8974, 78.0880], ['Moradabad', 28.8386, 78.7733], ['Jhansi', 25.4484, 78.5685],
    ['Gwalior', 26.2183, 78.1828], ['Jabalpur', 23.1815, 79.9864], ['Raipur', 21.2514, 81.6296],
    ['Ranchi', 23.3441, 85.3096], ['Jamshedpur', 22.8046, 86.2029], ['Dhanbad', 23.7957, 86.4304],
    ['Bhubaneswar', 20.2961, 85.8245], ['Cuttack', 20.4625, 85.8830], ['Guwahati', 26.1445, 91.7362],
    ['Siliguri', 26.7271, 88.3953], ['Asansol', 23.6889, 86.9661], ['Durgapur', 23.5204, 87.3119],
    ['Thiruvananthapuram', 8.5241, 76.9366], ['Kochi', 9.9312, 76.2673], ['Kozhikode', 11.2588, 75.7804],
    ['Coimbatore', 11.0168, 76.9558], ['Madurai', 9.9252, 78.1198], ['Tiruchirappalli', 10.7905, 78.7047],
    ['Visakhapatnam', 17.6868, 83.2185], ['Vijayawada', 16.5062, 80.6480], ['Guntur', 16.3067, 80.4365],
    ['Mysuru', 12.2958, 76.6394], ['Mangaluru', 12.9141, 74.8560], ['Hubli', 15.3647, 75.1240],
    ['Nashik', 19.9975, 73.7898], ['Aurangabad', 19.8762, 75.3433], ['Solapur', 17.6599, 75.9064],
    ['Srinagar', 34.0837, 74.7973], ['Jammu', 32.7266, 74.8570], ['Shimla', 31.1048, 77.1734],
    ['Ambala', 30.3782, 76.7767], ['Hisar', 29.1492, 75.7217], ['Rohtak', 28.8955, 76.6066],
    ['Panipat', 29.3909, 76.9635], ['Mathura', 27.4924, 77.6737], ['Rewari', 28.1970, 76.6170]
  ];

  /* ---------- Hindi interpretation content banks ---------- */
  var LAGNA_DESC = [
    'मेष लग्न वालों में नेतृत्व क्षमता, साहस और आत्मविश्वास प्रबल होता है। आप स्पष्टवादी, ऊर्जावान और पहल करने वाले व्यक्ति हैं। जल्दबाज़ी और क्रोध पर नियंत्रण आवश्यक है।',
    'वृषभ लग्न वाले स्थिर, धैर्यवान और व्यावहारिक होते हैं। सुख-सुविधा, कला और भोजन में रुचि रहती है। निर्णय सोच-समझकर लेते हैं, परंतु हठी स्वभाव रहता है।',
    'मिथुन लग्न वाले बुद्धिमान, वाक्पटु और जिज्ञासु होते हैं। संवाद, लेखन और व्यापार में निपुणता रहती है। मन चंचल रहता है, एकाग्रता बढ़ाना लाभकारी है।',
    'कर्क लग्न वाले भावुक, मातृ-स्नेही और कल्पनाशील होते हैं। परिवार और घर से गहरा लगाव रहता है। मन की संवेदनशीलता के कारण उतार-चढ़ाव आते हैं।',
    'सिंह लग्न वाले आत्मसम्मानी, तेजस्वी और नेतृत्वप्रिय होते हैं। मान-प्रतिष्ठा और अधिकार प्रिय है। उदारता के साथ अहंकार से बचना श्रेयस्कर है।',
    'कन्या लग्न वाले विश्लेषणात्मक, परिश्रमी और व्यवस्थित होते हैं। बारीकियों पर ध्यान और सेवा-भाव प्रबल है। अत्यधिक आलोचना व चिंता से बचें।',
    'तुला लग्न वाले संतुलित, न्यायप्रिय और सौंदर्यप्रेमी होते हैं। संबंध निभाने और कूटनीति में कुशल हैं। निर्णय में दुविधा रहती है।',
    'वृश्चिक लग्न वाले गूढ़, दृढ़-इच्छाशक्ति वाले और रहस्यमय होते हैं। गहराई से सोचते हैं और लक्ष्य के प्रति समर्पित रहते हैं। प्रतिशोध-भाव से बचें।',
    'धनु लग्न वाले आशावादी, धर्मपरायण और स्वतंत्र विचारों वाले होते हैं। उच्च शिक्षा, यात्रा और दर्शन में रुचि रहती है। स्पष्टवादिता कभी कठोर लग सकती है।',
    'मकर लग्न वाले अनुशासित, महत्वाकांक्षी और कर्मठ होते हैं। धीरे-धीरे पर स्थायी सफलता पाते हैं। गंभीरता के साथ लचीलापन लाभकारी है।',
    'कुम्भ लग्न वाले मौलिक विचारक, मानवतावादी और स्वतंत्रचेता होते हैं। नवीनता और समाज-सेवा में रुचि रहती है। भावनाओं को व्यक्त करना सीखें।',
    'मीन लग्न वाले करुणामय, आध्यात्मिक और कल्पनाशील होते हैं। सेवा, कला और भक्ति में रुचि रहती है। व्यावहारिकता और स्पष्ट सीमाएँ आवश्यक हैं।'
  ];
  var MOON_DESC = [
    'चंद्रमा मेष राशि में — मन में उत्साह, तेज़ी और स्वतंत्रता की चाह। शीघ्र निर्णय लेते हैं।',
    'चंद्रमा वृषभ राशि में (उच्च का चंद्र) — मन शांत, स्थिर और सुखप्रिय। यह शुभ स्थिति मानी जाती है।',
    'चंद्रमा मिथुन राशि में — मन जिज्ञासु, वाचाल और बहुआयामी। कई विषयों में रुचि।',
    'चंद्रमा कर्क राशि में (स्वराशि) — भावनात्मक रूप से समृद्ध, मातृ-स्नेही और संवेदनशील मन।',
    'चंद्रमा सिंह राशि में — आत्मविश्वासी, गर्वीला और नेतृत्वप्रिय मन। मान की अपेक्षा रहती है।',
    'चंद्रमा कन्या राशि में — विश्लेषक, व्यवस्थित परंतु चिंतनशील मन। पूर्णता की चाह।',
    'चंद्रमा तुला राशि में — संतुलन व सौंदर्यप्रिय मन, संबंधों में सामंजस्य खोजता है।',
    'चंद्रमा वृश्चिक राशि में (नीच का चंद्र) — गहन, तीव्र भावनाएँ; मन में उथल-पुथल संभव। धैर्य आवश्यक।',
    'चंद्रमा धनु राशि में — आशावादी, स्वतंत्र और धर्म-प्रवृत्त मन। यात्रा व ज्ञान की चाह।',
    'चंद्रमा मकर राशि में — गंभीर, व्यावहारिक और लक्ष्य-केंद्रित मन। भावनाएँ नियंत्रित।',
    'चंद्रमा कुम्भ राशि में — मौलिक, मानवतावादी और स्वतंत्र विचारों वाला मन।',
    'चंद्रमा मीन राशि में — करुणामय, कल्पनाशील और आध्यात्मिक मन। अत्यधिक भावुकता संभव।'
  ];
  var NAK_NATURE = [
    'तीव्र, कर्मठ और नेतृत्व-प्रिय', 'संयमी, रचनात्मक व दृढ़', 'तेजस्वी, स्पष्टवादी व नेता',
    'आकर्षक, कलाप्रिय व स्थिर', 'कोमल, जिज्ञासु व चंचल', 'तीक्ष्ण-बुद्धि, परिवर्तनशील',
    'उदार, आशावादी व विद्वान', 'पोषक, धार्मिक व शुभ', 'रहस्यमय, गहन व सतर्क',
    'राजसी, स्वाभिमानी व प्रतिष्ठित', 'रचनात्मक, सुखप्रिय व मित्रवत', 'परिश्रमी, सेवाभावी व व्यवस्थित',
    'कुशल, चतुर व हस्तकला-प्रवीण', 'कलात्मक, आकर्षक व तेजस्वी', 'विनम्र, स्वतंत्र व व्यवहार-कुशल',
    'महत्वाकांक्षी, दृढ़ व लक्ष्य-केंद्रित', 'मित्रवत, संतुलित व भक्त', 'साहसी, नेता व दृढ़-संकल्पी',
    'खोजी, दार्शनिक व मूल तक जाने वाला', 'ऊर्जावान, महत्वाकांक्षी व मिलनसार', 'स्थायी-विजयी, नैतिक व नेता',
    'श्रवणशील, विद्वान व यशस्वी', 'उदार, संगीतप्रिय व धनार्जक', 'स्वतंत्र, चिंतक व उपचारक',
    'गंभीर, आध्यात्मिक व विचारशील', 'शांत, ज्ञानी व परोपकारी', 'पोषक, करुणामय व समृद्ध'
  ];
  var GRAHA_SIGNIF = {
    Sun: 'आत्मा, पिता, मान-सम्मान, पद-प्रतिष्ठा व स्वास्थ्य', Moon: 'मन, माता, भावनाएँ, मानसिक शांति व जनता',
    Mars: 'साहस, ऊर्जा, भाई, भूमि-संपत्ति व पराक्रम', Mercury: 'बुद्धि, वाणी, व्यापार, शिक्षा व संवाद',
    Jupiter: 'ज्ञान, धर्म, गुरु, संतान, धन व भाग्य', Venus: 'प्रेम, विवाह, सुख-सुविधा, कला व वैभव',
    Saturn: 'कर्म, अनुशासन, परिश्रम, आयु व न्याय', Rahu: 'महत्वाकांक्षा, विदेश, तकनीक व अचानक परिवर्तन',
    Ketu: 'वैराग्य, आध्यात्म, मोक्ष व रहस्यमय विद्याएँ'
  };
  var HOUSE_MEANING = [
    'व्यक्तित्व, शरीर, स्वभाव व जीवन की दिशा', 'धन, परिवार, वाणी व संचित संपत्ति',
    'पराक्रम, छोटे भाई-बहन, साहस व संवाद', 'माता, सुख, घर, वाहन व भूमि',
    'संतान, बुद्धि, शिक्षा, प्रेम व पूर्व-पुण्य', 'रोग, शत्रु, ऋण, सेवा व प्रतिस्पर्धा',
    'विवाह, जीवनसाथी, साझेदारी व व्यापार', 'आयु, गुप्त विद्या, आकस्मिक घटनाएँ व परिवर्तन',
    'भाग्य, धर्म, गुरु, उच्च शिक्षा व लंबी यात्रा', 'करियर, कर्म, पद, प्रतिष्ठा व पिता',
    'लाभ, आय, इच्छापूर्ति व मित्र', 'व्यय, विदेश, मोक्ष, एकांत व हानि'
  ];
  var DASHA_EFFECT = {
    Sun: 'आत्मविश्वास, पद-प्रतिष्ठा और अधिकार में वृद्धि का काल। पिता व सरकारी कार्यों से संबंध। स्वास्थ्य का ध्यान रखें।',
    Moon: 'मानसिक शांति, माता-सुख, जनसंपर्क और भावनात्मक विषयों का काल। मन की स्थिरता पर फल निर्भर।',
    Mars: 'ऊर्जा, साहस, भूमि-संपत्ति और प्रतिस्पर्धा का काल। क्रोध व जल्दबाज़ी पर नियंत्रण आवश्यक।',
    Mercury: 'बुद्धि, शिक्षा, व्यापार, लेखन और संवाद में सफलता का काल। निर्णय-क्षमता प्रबल रहती है।',
    Jupiter: 'ज्ञान, धर्म, धन, संतान और भाग्य-वृद्धि का शुभ काल। गुरुजनों का आशीर्वाद मिलता है।',
    Venus: 'सुख-सुविधा, विवाह, प्रेम, कला और वैभव का काल। जीवन में आकर्षण व समृद्धि बढ़ती है।',
    Saturn: 'कठिन परिश्रम, अनुशासन और धैर्य की परीक्षा का काल। मेहनत का स्थायी फल मिलता है, धीरे पर पक्का।',
    Rahu: 'महत्वाकांक्षा, अचानक परिवर्तन, विदेश-योग और भौतिक उन्नति का काल। भ्रम व अति से बचें।',
    Ketu: 'आध्यात्मिक झुकाव, वैराग्य, आंतरिक खोज और कर्म-फल का काल। मोक्ष व साधना की ओर रुझान।'
  };
  var MANTRAS = {
    Sun: 'ॐ सूर्याय नमः (रविवार, 7000 जप) / आदित्य हृदय स्तोत्र',
    Moon: 'ॐ चन्द्राय नमः (सोमवार, 11000 जप) / शिव आराधना',
    Mars: 'ॐ अं अंगारकाय नमः (मंगलवार, 10000 जप) / हनुमान चालीसा',
    Mercury: 'ॐ बुं बुधाय नमः (बुधवार, 9000 जप) / विष्णु सहस्रनाम',
    Jupiter: 'ॐ बृं बृहस्पतये नमः (गुरुवार, 19000 जप) / गुरु स्तोत्र',
    Venus: 'ॐ शुं शुक्राय नमः (शुक्रवार, 16000 जप) / श्री सूक्त',
    Saturn: 'ॐ शं शनैश्चराय नमः (शनिवार, 23000 जप) / शनि चालीसा / हनुमान पूजा',
    Rahu: 'ॐ रां राहवे नमः (18000 जप) / दुर्गा सप्तशती',
    Ketu: 'ॐ कें केतवे नमः (17000 जप) / गणेश आराधना'
  };
  var REMEDY = {
    Sun: 'रविवार को गुड़-गेहूँ दान, तांबे का पात्र, सूर्य को जल अर्पण।',
    Moon: 'सोमवार को श्वेत वस्त्र व चावल दान, शिव को जल, मोती धारण (परामर्श से)।',
    Mars: 'मंगलवार को मसूर दाल/लाल वस्त्र दान, हनुमान जी की सेवा, भूमि-सेवा।',
    Mercury: 'बुधवार को हरी मूँग/हरा वस्त्र दान, गाय को हरा चारा, कन्या-सेवा।',
    Jupiter: 'गुरुवार को पीली वस्तु/चने की दाल दान, केले के वृक्ष की पूजा, गुरु-सेवा।',
    Venus: 'शुक्रवार को श्वेत मिष्ठान्न/वस्त्र दान, गाय की सेवा, स्वच्छता व सौंदर्य-दान।',
    Saturn: 'शनिवार को तेल/काले तिल/लोहा दान, पीपल को जल, मजदूरों व वृद्धों की सेवा।',
    Rahu: 'नारियल/जौ दान, सरस्वती-दुर्गा पूजा, कुष्ठ-रोगियों व सफाई-कर्मियों की सेवा।',
    Ketu: 'कुत्ते को भोजन, गणेश पूजा, ध्यान-साधना, दो रंग का कंबल दान।'
  };

  /* =================== STATE =================== */
  var current = null; // last computed data

  /* =================== INIT =================== */
  document.addEventListener('DOMContentLoaded', function () {
    var dl = document.getElementById('cityList');
    if (dl) {
      CITIES.forEach(function (c) {
        var o = document.createElement('option');
        o.value = c[0] + ', India';
        dl.appendChild(o);
      });
    }
    var form = document.getElementById('kundaliForm');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); generate(); });

    // sample fill helper
    var sample = document.getElementById('sampleBtn');
    if (sample) sample.addEventListener('click', fillSample);
  });

  function fillSample() {
    document.getElementById('kName').value = 'उदाहरण जातक';
    document.getElementById('kDate').value = '1995-08-15';
    document.getElementById('kTime').value = '10:30';
    document.getElementById('kPlace').value = 'Jaipur, India';
  }

  function findCity(txt) {
    if (!txt) return null;
    var key = txt.split(',')[0].trim().toLowerCase();
    for (var i = 0; i < CITIES.length; i++) {
      if (CITIES[i][0].toLowerCase() === key) return CITIES[i];
    }
    return null;
  }

  /* =================== GENERATE =================== */
  function generate() {
    var name = document.getElementById('kName').value.trim() || 'जातक';
    var dateStr = document.getElementById('kDate').value;
    var timeStr = document.getElementById('kTime').value;
    var placeStr = document.getElementById('kPlace').value.trim();
    var latEl = document.getElementById('kLat');
    var lonEl = document.getElementById('kLon');

    if (!dateStr || !timeStr) { alert('कृपया जन्म तिथि और सटीक जन्म समय भरें।'); return; }

    var city = findCity(placeStr);
    var lat, lon;
    if (city) { lat = city[1]; lon = city[2]; }
    else if (latEl && latEl.value && lonEl && lonEl.value) { lat = parseFloat(latEl.value); lon = parseFloat(lonEl.value); }
    else {
      alert('जन्म स्थान सूची में से चुनें, या अक्षांश/देशांतर (Latitude/Longitude) भरें। (डिफ़ॉल्ट: जयपुर)');
      lat = 26.9124; lon = 75.7873; placeStr = placeStr || 'Jaipur, India';
    }

    var dp = dateStr.split('-');
    var tp = timeStr.split(':');
    var birth = {
      name: name,
      y: parseInt(dp[0]), m: parseInt(dp[1]), d: parseInt(dp[2]),
      hour: parseInt(tp[0]), minute: parseInt(tp[1]),
      tz: 5.5, lat: lat, lon: lon,
      place: placeStr || (city ? city[0] + ', India' : 'भारत')
    };

    try {
      current = Astro.compute(birth);
    } catch (err) {
      alert('गणना में त्रुटि: ' + err.message); return;
    }
    renderReport(current);
    var out = document.getElementById('kundaliOutput');
    out.style.display = 'block';
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('kActions').style.display = 'flex';
  }

  /* =================== CHART (North Indian diamond) =================== */
  var HOUSE_POS = [
    null,
    [160, 82], [80, 38], [38, 82], [80, 160], [38, 238], [80, 282],
    [160, 238], [240, 282], [282, 238], [240, 160], [282, 82], [240, 38]
  ];

  function drawChart(title, houseSignFn, planetsByHouse) {
    // houseSignFn(h) -> sign index (0..11) displayed in house h
    var svg = [];
    svg.push('<div class="kundali-chart-wrap"><div class="kundali-chart-title">' + title + '</div>');
    svg.push('<svg viewBox="0 0 320 320" class="kundali-chart">');
    // border + diagonals + diamond
    svg.push('<rect x="10" y="10" width="300" height="300" class="kc-line" fill="none"/>');
    svg.push('<line x1="10" y1="10" x2="310" y2="310" class="kc-line"/>');
    svg.push('<line x1="310" y1="10" x2="10" y2="310" class="kc-line"/>');
    svg.push('<polygon points="160,10 310,160 160,310 10,160" class="kc-line" fill="none"/>');
    for (var h = 1; h <= 12; h++) {
      var pos = HOUSE_POS[h];
      var sign = houseSignFn(h);
      svg.push('<text x="' + pos[0] + '" y="' + (pos[1] - 14) + '" class="kc-sign">' + (sign + 1) + '</text>');
      var pls = planetsByHouse[h] || [];
      var line = pls.map(function (p) { return p.ab + (p.retro ? '℞' : ''); }).join(' ');
      if (line) {
        // wrap if long
        var parts = pls.map(function (p) { return p.ab + (p.retro ? '℞' : ''); });
        var row1 = parts.slice(0, 3).join(' ');
        var row2 = parts.slice(3).join(' ');
        svg.push('<text x="' + pos[0] + '" y="' + (pos[1] + 4) + '" class="kc-planet">' + row1 + '</text>');
        if (row2) svg.push('<text x="' + pos[0] + '" y="' + (pos[1] + 20) + '" class="kc-planet">' + row2 + '</text>');
      }
    }
    svg.push('</svg></div>');
    return svg.join('');
  }

  function lagnaChart(d) {
    var byHouse = {};
    for (var h = 1; h <= 12; h++) byHouse[h] = [];
    d.planetOrder.forEach(function (k) { byHouse[d.planets[k].house].push(d.planets[k]); });
    return drawChart('लग्न कुंडली (D-1)', function (h) { return (d.lagnaSign + h - 1) % 12; }, byHouse);
  }

  function navamsaChart(d) {
    var lagNav = d.lagna.navSign;
    var byHouse = {};
    for (var h = 1; h <= 12; h++) byHouse[h] = [];
    d.planetOrder.forEach(function (k) {
      var p = d.planets[k];
      var nh = ((p.navSign - lagNav + 12) % 12) + 1;
      byHouse[nh].push({ ab: p.ab, retro: false });
    });
    return drawChart('नवांश कुंडली (D-9)', function (h) { return (lagNav + h - 1) % 12; }, byHouse);
  }

  /* =================== TABLES =================== */
  function planetTable(d) {
    var rows = '';
    d.planetOrder.forEach(function (k) {
      var p = d.planets[k];
      rows += '<tr><td>' + p.hi + (p.retro ? ' (वक्री)' : '') + '</td><td>' + p.signHi + '</td><td>' + p.dms + '</td>'
        + '<td>' + p.nakHi + '</td><td>' + p.pada + '</td><td>' + p.house + '</td></tr>';
    });
    return '<table class="kundali-table"><thead><tr><th>ग्रह</th><th>राशि</th><th>अंश</th><th>नक्षत्र</th><th>पाद</th><th>भाव</th></tr></thead><tbody>'
      + rows + '</tbody></table>';
  }

  function bhavaTable(d) {
    var rows = '';
    d.houses.forEach(function (h) {
      var pls = h.planets.map(function (p) { return p.hi; }).join(', ') || '—';
      rows += '<tr><td>' + h.house + '</td><td>' + h.signHi + '</td><td>' + h.lord + '</td><td>' + pls + '</td></tr>';
    });
    return '<table class="kundali-table"><thead><tr><th>भाव</th><th>राशि</th><th>भावेश</th><th>स्थित ग्रह</th></tr></thead><tbody>'
      + rows + '</tbody></table>';
  }

  /* =================== PHALADESH (interpretation) =================== */
  function sectionsHTML(d) {
    var P = d.planets;
    var s = [];

    // 1. Lagna & Rashi
    s.push(block('१. जन्म लग्न एवं राशि विश्लेषण', '🕉️',
      '<p><b>लग्न:</b> ' + d.lagna.signHi + ' — ' + LAGNA_DESC[d.lagnaSign] + '</p>'
      + '<p><b>चंद्र राशि (राशि):</b> ' + P.Moon.signHi + ' — ' + MOON_DESC[P.Moon.sign] + '</p>'
      + '<p><b>जन्म नक्षत्र:</b> ' + P.Moon.nakHi + ' (पाद ' + P.Moon.pada + ') — स्वभाव: ' + NAK_NATURE[P.Moon.nak] + '।</p>'
      + '<p><b>लग्नेश:</b> ' + d.ref.RASHI_LORD[d.lagnaSign] + ' — यह ग्रह आपके जीवन की दिशा तय करता है।</p>'));

    // 2. Each planet detailed
    var gp = '';
    d.planetOrder.forEach(function (k) {
      var p = P[k];
      gp += '<p><b>' + p.hi + '</b> — ' + p.signHi + ' राशि, ' + p.house + 'वें भाव में' + (p.retro ? ' (वक्री)' : '') + '। '
        + 'कारक: ' + GRAHA_SIGNIF[k] + '। '
        + 'यह ' + p.house + 'वें भाव (' + HOUSE_MEANING[p.house - 1] + ') को प्रभावित करता है।</p>';
    });
    s.push(block('२. प्रत्येक ग्रह का विस्तृत फल', '🪐', gp));

    // 3. Bhava phaladesh
    var bh = '';
    d.houses.forEach(function (h) {
      var pls = h.planets.map(function (p) { return p.hi; }).join(', ');
      bh += '<p><b>' + h.house + 'वाँ भाव</b> (' + h.signHi + ', भावेश ' + h.lord + '): ' + HOUSE_MEANING[h.house - 1] + '। '
        + (pls ? 'इस भाव में <b>' + pls + '</b> स्थित है, जो इन विषयों को प्रबलता देता है।' : 'इस भाव में कोई ग्रह नहीं — फल भावेश की स्थिति से देखें।') + '</p>';
    });
    s.push(block('३. द्वादश भाव फलादेश', '🏛️', bh));

    // 4. Shubh/Ashubh
    var exalt = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
    var debil = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
    var sa = '';
    ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].forEach(function (k) {
      var p = P[k], st;
      if (p.sign === exalt[k]) st = '<b style="color:#157347">उच्च (बलवान / शुभ)</b>';
      else if (p.sign === debil[k]) st = '<b style="color:#b02a37">नीच (निर्बल — उपाय लाभकारी)</b>';
      else st = 'सामान्य स्थिति';
      sa += '<p>' + p.hi + ' — ' + st + ' (' + p.signHi + ' राशि में)।</p>';
    });
    s.push(block('४. ग्रहों की शुभ एवं अशुभ स्थिति', '⚖️', sa));

    // 5. Life areas
    s.push(block('५. शिक्षा एवं करियर', '🎓',
      lifeArea(d, [10, 5], 'दशम भाव (कर्म/करियर) एवं पंचम भाव (शिक्षा/बुद्धि)',
        'बुध एवं गुरु की स्थिति शिक्षा में सफलता दर्शाती है। दशम भाव के ग्रह व भावेश आपके कार्यक्षेत्र की दिशा बताते हैं।')));

    s.push(block('६. नौकरी एवं व्यवसाय', '💼',
      lifeArea(d, [10, 6, 7], 'दशम (कर्म), षष्ठ (नौकरी/सेवा) एवं सप्तम (साझेदारी/व्यापार) भाव',
        'सूर्य-शनि प्रबल हों तो नौकरी/प्रशासन अनुकूल; बुध-शुक्र प्रबल हों तो व्यापार/कला अनुकूल रहता है।')));

    s.push(block('७. धन एवं संपत्ति', '💰',
      lifeArea(d, [2, 11], 'द्वितीय (संचित धन) एवं एकादश (आय/लाभ) भाव',
        'गुरु व शुक्र धन के कारक हैं। एकादश भाव प्रबल होने पर आय के अनेक स्रोत बनते हैं।')));

    s.push(block('८. विवाह एवं दांपत्य जीवन', '💑',
      lifeArea(d, [7], 'सप्तम भाव (जीवनसाथी/विवाह)',
        'शुक्र (पुरुष हेतु) व गुरु (स्त्री हेतु) जीवनसाथी के कारक हैं। '
        + (d.doshas.manglik ? '<b style="color:#b02a37">मंगल दोष की स्थिति है — विवाह-मिलान आवश्यक।</b>' : 'मंगल दोष नहीं है, यह शुभ संकेत है।'))));

    s.push(block('९. संतान योग', '👶',
      lifeArea(d, [5], 'पंचम भाव (संतान)',
        'गुरु संतान का प्रमुख कारक है। पंचम भाव व गुरु की शुभ स्थिति संतान-सुख दर्शाती है।')));

    s.push(block('१०. परिवार एवं सामाजिक जीवन', '👪',
      lifeArea(d, [2, 4, 11], 'द्वितीय (कुटुंब), चतुर्थ (माता/सुख) एवं एकादश (मित्र/समाज) भाव',
        'चंद्र व शुक्र की स्थिति पारिवारिक सौहार्द दर्शाती है।')));

    s.push(block('११. स्वास्थ्य संबंधी ज्योतिषीय संकेत', '🩺',
      lifeArea(d, [1, 6, 8], 'लग्न (शरीर), षष्ठ (रोग) एवं अष्टम (आयु) भाव',
        'लग्न व लग्नेश बलवान हों तो उत्तम स्वास्थ्य। षष्ठ भाव के पाप-ग्रह विशेष सावधानी का संकेत देते हैं।')));

    s.push(block('१२. भाग्य एवं आध्यात्मिक जीवन', '🙏',
      lifeArea(d, [9, 12], 'नवम (भाग्य/धर्म) एवं द्वादश (मोक्ष/आध्यात्म) भाव',
        'गुरु व केतु आध्यात्म के कारक हैं। नवम भाव प्रबल होने पर भाग्योदय प्रबल रहता है।')));

    return s.join('');
  }

  function lifeArea(d, houses, label, note) {
    var html = '<p><b>विचारणीय भाव:</b> ' + label + '।</p>';
    houses.forEach(function (hn) {
      var h = d.houses[hn - 1];
      var pls = h.planets.map(function (p) { return p.hi + (p.retro ? '(व)' : ''); }).join(', ');
      html += '<p>• ' + hn + 'वाँ भाव — राशि ' + h.signHi + ', भावेश ' + h.lord + '। '
        + (pls ? 'स्थित ग्रह: <b>' + pls + '</b>।' : 'कोई ग्रह नहीं।') + '</p>';
    });
    html += '<p class="kundali-note">' + note + '</p>';
    return html;
  }

  function block(title, icon, body) {
    return '<div class="kundali-section"><h3 class="kundali-h3">' + icon + ' ' + title + '</h3>' + body + '</div>';
  }

  /* =================== DASHA =================== */
  function dashaHTML(d) {
    var dd = d.dasha;
    var rows = '';
    dd.sequence.slice(0, 9).forEach(function (m) {
      var sd = Astro.jdToDate(m.startJD), ed = Astro.jdToDate(m.endJD);
      var isCur = dd.current && dd.current.lord === m.lord && dd.current.startJD === m.startJD;
      rows += '<tr' + (isCur ? ' class="kundali-current"' : '') + '><td>' + m.lordHi + ' महादशा</td><td>' + m.years + ' वर्ष</td>'
        + '<td>' + fmtDate(sd) + '</td><td>' + fmtDate(ed) + '</td></tr>';
    });
    var curTxt = '';
    if (dd.current) {
      curTxt = '<p><b>वर्तमान महादशा:</b> ' + dd.current.lordHi + '। ' + DASHA_EFFECT[dd.current.lord] + '</p>';
      if (dd.currentAntar)
        curTxt += '<p><b>वर्तमान अंतर्दशा:</b> ' + dd.currentAntar.lordHi + ' (' + dd.current.lordHi + ' महादशा के अंतर्गत)। '
          + 'इस काल में ' + dd.currentAntar.lordHi + ' के कारक विषय सक्रिय रहेंगे।</p>';
    }
    return block('१३. विंशोत्तरी महादशा एवं अंतर्दशा विश्लेषण', '⏳',
      '<p>जन्म के समय <b>' + dd.startLordHi + '</b> की महादशा चल रही थी (शेष ≈ ' + dd.balanceYears.toFixed(1) + ' वर्ष)।</p>'
      + curTxt
      + '<table class="kundali-table"><thead><tr><th>महादशा</th><th>अवधि</th><th>आरंभ</th><th>समाप्ति</th></tr></thead><tbody>'
      + rows + '</tbody></table>');
  }

  /* =================== YOGAS & DOSHAS =================== */
  function doshaHTML(d) {
    var ds = d.doshas;
    var html = '';
    html += dchip('मांगलिक दोष', ds.manglik,
      ds.manglik ? ('मंगल ' + ds.marsHouse + 'वें भाव में — मांगलिक दोष उपस्थित। विवाह से पूर्व कुंडली-मिलान व उपाय आवश्यक।')
        : 'मंगल अशुभ भाव में नहीं — मांगलिक दोष नहीं है।');
    html += dchip('काल सर्प दोष', ds.kaalSarp,
      ds.kaalSarp ? 'सभी ग्रह राहु-केतु के मध्य — काल सर्प दोष उपस्थित। नाग-पंचमी पूजा व उपाय लाभकारी।'
        : 'सभी ग्रह राहु-केतु के एक ओर नहीं — काल सर्प दोष नहीं है।');
    html += dchip('साढ़े साती', ds.sadeSati,
      ds.sadeSati ? ('वर्तमान में शनि गोचर ' + ds.transitSaturnSign + ' में — साढ़े साती चल रही है (' + ds.sadeSatiPhase + ')। धैर्य व शनि-उपाय करें।')
        : ('वर्तमान में शनि गोचर ' + ds.transitSaturnSign + ' में — साढ़े साती सक्रिय नहीं है।'));

    var yogaTxt = d.yogas.length
      ? '<p><b>प्रमुख योग:</b> ' + d.yogas.join(', ') + '।</p>'
        + '<p class="kundali-note">गजकेसरी व बुधादित्य जैसे योग बुद्धि, यश व समृद्धि दायक माने जाते हैं; केमद्रुम योग में चंद्र-बल बढ़ाने के उपाय लाभकारी हैं।</p>'
      : '<p>कुंडली में उपरोक्त में से कोई प्रमुख योग विशेष रूप से नहीं बन रहा।</p>';

    return block('१४. प्रमुख योग एवं दोष की व्याख्या', '🧿', html + yogaTxt);
  }

  function dchip(name, present, text) {
    return '<div class="dosha-row"><span class="dosha-badge ' + (present ? 'dosha-yes' : 'dosha-no') + '">'
      + name + ': ' + (present ? 'है' : 'नहीं') + '</span> <span class="dosha-text">' + text + '</span></div>';
  }

  /* =================== REMEDIES =================== */
  function remedyHTML(d) {
    // weak planets: debilitated or in dusthana (6,8,12) + current dasha lord + dosha planets
    var weak = {};
    var debil = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
    ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].forEach(function (k) {
      var p = d.planets[k];
      if (p.sign === debil[k] || [6, 8, 12].indexOf(p.house) !== -1) weak[k] = true;
    });
    if (d.dasha.current) weak[d.dasha.current.lord] = true;
    if (d.doshas.manglik) weak.Mars = true;
    if (d.doshas.sadeSati) weak.Saturn = true;
    if (d.doshas.kaalSarp) { weak.Rahu = true; weak.Ketu = true; }

    var keys = Object.keys(weak);
    if (!keys.length) keys = [d.lagna ? d.ref.RASHI_LORD : 'Jupiter'];

    var html = '<p>आपकी कुंडली की गणना के आधार पर इन ग्रहों को बल देना विशेष लाभकारी रहेगा:</p>';
    keys.forEach(function (k) {
      html += '<div class="remedy-card"><b>' + Astro.PL[k].hi + '</b>'
        + '<div>📿 मंत्र: ' + MANTRAS[k] + '</div>'
        + '<div>🪔 उपाय: ' + REMEDY[k] + '</div></div>';
    });
    html += '<p class="kundali-note">सर्वसामान्य उपाय: नित्य इष्ट-देव स्मरण, माता-पिता व गुरुजनों का आदर, दान-पुण्य एवं सदाचरण सभी दोषों को शांत करते हैं।</p>';
    return block('१५. पारंपरिक ज्योतिषीय उपाय एवं मंत्र', '🪔', html);
  }

  /* =================== REPORT ASSEMBLY =================== */
  function renderReport(d) {
    var b = d.birth;
    var dob = b.d + '/' + b.m + '/' + b.y;
    var tob = pad(b.hour) + ':' + pad(b.minute);
    var out = document.getElementById('kundaliOutput');

    var html = '';

    // Cover page
    html += '<div class="kundali-page kundali-cover">'
      + '<div class="cover-border">'
      + '<div class="cover-om">🕉️</div>'
      + '<div class="cover-shlok">॥ श्री गणेशाय नमः ॥</div>'
      + '<h1 class="cover-title">जन्म कुंडली</h1>'
      + '<div class="cover-sub">एवं विस्तृत फलादेश</div>'
      + '<div class="cover-name">' + esc(b.name) + '</div>'
      + '<div class="cover-dob">' + dob + ' &nbsp;•&nbsp; ' + tob + ' &nbsp;•&nbsp; ' + esc(b.place) + '</div>'
      + '<div class="cover-shlok2">यथा ग्रहास्तथा फलम्</div>'
      + '<div class="cover-foot">PanditSeva.in — पारंपरिक वैदिक ज्योतिष सेवा</div>'
      + '</div></div>';

    // Birth details
    html += '<div class="kundali-page">'
      + pageHead('जन्म विवरण (Birth Details)')
      + '<table class="kundali-table birth-table">'
      + brow('पूर्ण नाम', esc(b.name))
      + brow('जन्म तिथि', dob)
      + brow('जन्म समय', tob + ' (IST +5:30)')
      + brow('जन्म स्थान', esc(b.place))
      + brow('अक्षांश / देशांतर', b.lat.toFixed(4) + '° N, ' + b.lon.toFixed(4) + '° E')
      + brow('लग्न (Ascendant)', d.lagna.signHi + ' (' + d.lagna.dms + ')')
      + brow('चंद्र राशि', d.planets.Moon.signHi)
      + brow('जन्म नक्षत्र', d.planets.Moon.nakHi + ' — पाद ' + d.planets.Moon.pada)
      + brow('अयनांश (Lahiri)', d.ayanamsa.toFixed(4) + '°')
      + '</table></div>';

    // Charts
    html += '<div class="kundali-page">'
      + pageHead('जन्म कुंडली चक्र')
      + '<div class="kundali-charts">' + lagnaChart(d) + navamsaChart(d) + '</div>'
      + '<p class="kundali-note" style="text-align:center">उत्तर भारतीय शैली — अंक राशि संख्या दर्शाते हैं (1=मेष … 12=मीन)। ℞ = वक्री ग्रह।</p>'
      + '</div>';

    // Planetary positions
    html += '<div class="kundali-page">'
      + pageHead('ग्रह स्थिति (Planetary Positions)')
      + planetTable(d)
      + '<h3 class="kundali-h3" style="margin-top:24px">भाव तालिका</h3>'
      + bhavaTable(d)
      + '</div>';

    // Phaladesh
    html += '<div class="kundali-page">'
      + pageHead('कुंडली का विस्तृत फलादेश')
      + sectionsHTML(d)
      + '</div>';

    // Dasha
    html += '<div class="kundali-page">' + pageHead('महादशा विश्लेषण') + dashaHTML(d) + '</div>';

    // Yogas & Doshas
    html += '<div class="kundali-page">' + pageHead('योग एवं दोष') + doshaHTML(d) + '</div>';

    // Remedies
    html += '<div class="kundali-page">' + pageHead('उपाय एवं मंत्र') + remedyHTML(d) + '</div>';

    // Disclaimer
    html += '<div class="kundali-page kundali-disclaimer">'
      + '<h3 class="kundali-h3">⚠️ महत्वपूर्ण सूचना / Disclaimer</h3>'
      + '<p>यह रिपोर्ट <b>स्वचालित खगोलीय गणना</b> (Lahiri अयनांश सहित सिद्ध ज्योतिषीय एल्गोरिद्म) पर आधारित है। '
      + 'ग्रह-स्थितियाँ वास्तविक गणना से निकाली गई हैं — कोई मनगढ़ंत (fabricated) आँकड़ा नहीं है। '
      + 'फलादेश स्वचालित व्याख्या (automated interpretation) है।</p>'
      + '<p>यह किसी <b>योग्य ज्योतिषी द्वारा व्यक्तिगत रूप से जाँची या हस्तलिखित</b> रिपोर्ट का स्थान नहीं लेती। '
      + 'महत्वपूर्ण निर्णयों (विवाह, स्वास्थ्य, धन) से पूर्व किसी अनुभवी पंडित/ज्योतिषी से परामर्श अवश्य करें।</p>'
      + '<div class="verify-cta">'
      + '<b>🖋️ पंडित जी द्वारा व्यक्तिगत समीक्षित / हस्तलिखित प्रीमियम कुंडली चाहिए?</b>'
      + '<p>अनुभवी ज्योतिषी से इस कुंडली की व्यक्तिगत समीक्षा करवाएँ।</p>'
      + '<a href="https://wa.me/917737782519?text=' + encodeURIComponent('मुझे पंडित जी द्वारा समीक्षित हस्तलिखित प्रीमियम कुंडली चाहिए — ' + b.name) + '" target="_blank" class="btn btn-green btn-sm"><i class="fab fa-whatsapp"></i> पंडित जी से बात करें</a> '
      + '<a href="tel:7737782519" class="btn btn-primary btn-sm"><i class="fas fa-phone-alt"></i> 77377 82519</a>'
      + '</div>'
      + '<p class="kundali-gen">तैयार: PanditSeva.in वैदिक ज्योतिष इंजन · गणना तिथि गोचर आधारित</p>'
      + '</div>';

    out.innerHTML = html;
  }

  /* helpers */
  function pageHead(t) { return '<div class="kundali-pagehead"><span>🕉️</span> ' + t + ' <span>🕉️</span></div>'; }
  function brow(k, v) { return '<tr><td class="bk">' + k + '</td><td class="bv">' + v + '</td></tr>'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDate(o) { return pad(o.d) + '/' + pad(o.m) + '/' + o.y; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* =================== PDF / PRINT / SHARE =================== */
  window.downloadKundaliPDF = function () {
    if (!current) { alert('पहले कुंडली बनाएँ।'); return; }
    var node = document.getElementById('kundaliOutput');
    if (!window.jspdf || !window.html2canvas) { alert('PDF लाइब्रेरी लोड हो रही है, कृपया पुनः प्रयास करें।'); return; }
    var btn = document.getElementById('pdfBtn');
    var old = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> बन रहा है...'; btn.disabled = true;

    var pages = node.querySelectorAll('.kundali-page');
    var jsPDF = window.jspdf.jsPDF;
    var pdf = new jsPDF('p', 'mm', 'a4');
    var pw = 210, ph = 297;
    var idx = 0;

    function nextPage() {
      if (idx >= pages.length) {
        pdf.save('Kundali-' + (current.birth.name || 'janam').replace(/\s+/g, '_') + '.pdf');
        btn.innerHTML = old; btn.disabled = false;
        return;
      }
      html2canvas(pages[idx], { scale: 2, backgroundColor: '#fdf6e3', useCORS: true }).then(function (canvas) {
        var img = canvas.toDataURL('image/jpeg', 0.92);
        var iw = pw - 10;
        var ih = canvas.height * iw / canvas.width;
        if (idx > 0) pdf.addPage();
        if (ih <= ph - 10) {
          pdf.addImage(img, 'JPEG', 5, 5, iw, ih);
        } else {
          // scale to fit height
          ih = ph - 10; iw = canvas.width * ih / canvas.height;
          pdf.addImage(img, 'JPEG', (pw - iw) / 2, 5, iw, ih);
        }
        idx++;
        setTimeout(nextPage, 30);
      }).catch(function (e) {
        btn.innerHTML = old; btn.disabled = false;
        alert('PDF बनाने में समस्या: ' + e.message);
      });
    }
    nextPage();
  };

  window.printKundali = function () {
    if (!current) { alert('पहले कुंडली बनाएँ।'); return; }
    window.print();
  };

  window.shareKundali = async function () {
    if (!current) { alert('पहले कुंडली बनाएँ।'); return; }
    var b = current.birth;
    var txt = '🕉️ ' + b.name + ' की जन्म कुंडली — PanditSeva.in\nलग्न: ' + current.lagna.signHi
      + ', चंद्र राशि: ' + current.planets.Moon.signHi + ', नक्षत्र: ' + current.planets.Moon.nakHi
      + '\nविस्तृत प्रीमियम कुंडली हेतु: https://panditseva.in';
    if (navigator.share) {
      try { await navigator.share({ title: 'जन्म कुंडली — PanditSeva.in', text: txt }); return; } catch (e) { }
    }
    window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
  };

})();
