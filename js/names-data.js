/* ============================================================================
   names-data.js — Hindu / Sanskrit baby-name dataset + 108-pada naamakshar table
   PanditSeva.in

   * SYLLABLES  : standard Nakshatra-pada -> naam-akshar table (27 x 4 = 108)
   * RAW        : names grouped by their starting syllable. One line per name:
                  hindi|English|b/g/u|मीनिंग (हिंदी)|meaning (English)|origin[|f]
                  b = boy, g = girl, u = unisex.
                  A trailing |f marks a "sound-family" name: the name does not start
                  with the exact syllable but with its short/long vowel twin or the
                  nearest sound (e.g. चु -> चू, ट -> त). The UI labels these clearly.
   * Rashi of a pada = floor(padaNumber / 9) (9 padas per rashi) — standard rule.
   * Syllables that have no genuine Sanskrit/Hindu names (ङ, ञ, ण, थ, ढा, चो, वो, डो, खू, खो)
     are left EMPTY on purpose rather than inventing doubtful names.
   Exposes global `JYNames`.
   ========================================================================== */
(function (g) {
  'use strict';

  var NAK = ['अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा', 'आर्द्रा', 'पुनर्वसु', 'पुष्य', 'आश्लेषा',
    'मघा', 'पूर्वा फाल्गुनी', 'उत्तरा फाल्गुनी', 'हस्त', 'चित्रा', 'स्वाति', 'विशाखा', 'अनुराधा', 'ज्येष्ठा',
    'मूल', 'पूर्वाषाढ़ा', 'उत्तराषाढ़ा', 'श्रवण', 'धनिष्ठा', 'शतभिषा', 'पूर्वा भाद्रपद', 'उत्तरा भाद्रपद', 'रेवती'];
  var NAK_EN = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
    'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
    'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
  var RASHI = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'];
  var RASHI_EN = ['Aries (Mesha)', 'Taurus (Vrishabha)', 'Gemini (Mithuna)', 'Cancer (Karka)', 'Leo (Simha)', 'Virgo (Kanya)', 'Libra (Tula)', 'Scorpio (Vrishchika)', 'Sagittarius (Dhanu)', 'Capricorn (Makara)', 'Aquarius (Kumbha)', 'Pisces (Meena)'];
  var RASHI_LORD = ['मंगल', 'शुक्र', 'बुध', 'चंद्र', 'सूर्य', 'बुध', 'शुक्र', 'मंगल', 'गुरु', 'शनि', 'शनि', 'गुरु'];

  /* index = nakshatra, 4 syllables = padas 1..4 */
  var SYLLABLES = [
    ['चु', 'चे', 'चो', 'ला'], ['ली', 'लू', 'ले', 'लो'], ['अ', 'ई', 'उ', 'ए'], ['ओ', 'वा', 'वी', 'वू'],
    ['वे', 'वो', 'का', 'की'], ['कू', 'घ', 'ङ', 'छ'], ['के', 'को', 'हा', 'ही'], ['हू', 'हे', 'हो', 'डा'],
    ['डी', 'डू', 'डे', 'डो'], ['मा', 'मी', 'मू', 'मे'], ['मो', 'टा', 'टी', 'टू'], ['टे', 'टो', 'पा', 'पी'],
    ['पू', 'ष', 'ण', 'ठ'], ['पे', 'पो', 'रा', 'री'], ['रू', 'रे', 'रो', 'ता'], ['ती', 'तू', 'ते', 'तो'],
    ['ना', 'नी', 'नू', 'ने'], ['नो', 'या', 'यी', 'यू'], ['ये', 'यो', 'भा', 'भी'], ['भू', 'धा', 'फा', 'ढा'],
    ['भे', 'भो', 'जा', 'जी'], ['खी', 'खू', 'खे', 'खो'], ['गा', 'गी', 'गू', 'गे'], ['गो', 'सा', 'सी', 'सू'],
    ['से', 'सो', 'दा', 'दी'], ['दू', 'थ', 'झ', 'ञ'], ['दे', 'दो', 'चा', 'ची']
  ];

  /* acceptable prefixes for sound-family (|f) names of a syllable */
  var FAMILY = {
    'चु': ['चू', 'चु'], 'चे': ['चे', 'चै'], 'लू': ['लू', 'लु', 'ल'], 'ई': ['ई', 'इ'], 'ए': ['ए', 'ऐ'], 'वू': ['वू', 'वु', 'वृ'],
    'को': ['को', 'कौ'], 'कू': ['कू', 'कु'], 'हू': ['हू', 'हु', 'हृ'], 'हो': ['हो', 'ह'], 'डा': ['डा', 'दा'], 'डी': ['डी', 'दी'],
    'डू': ['डू', 'दू', 'दु'], 'डे': ['डे', 'दे'], 'मू': ['मू', 'मु'], 'टा': ['टा', 'ता'], 'टी': ['टी', 'ती'], 'टू': ['टू', 'तू', 'तु'],
    'टे': ['टे', 'ते'], 'टो': ['टो', 'तो'], 'पू': ['पू', 'पु'], 'पे': ['पे', 'प्रे'], 'पो': ['पो', 'पौ'], 'रू': ['रू', 'रु'],
    'तू': ['तू', 'तु'], 'नो': ['नो', 'न'], 'यी': ['यी', 'य'], 'यू': ['यू', 'यु'], 'ये': ['ये', 'य'], 'ढा': ['ढा', 'धा'],
    'फा': ['फा', 'फ'], 'भे': ['भे', 'भै'], 'खी': ['खी', 'ख'], 'खे': ['खे', 'ख', 'क्ष'], 'गू': ['गू', 'गु'], 'गे': ['गे', 'ग'],
    'दू': ['दू', 'दु'], 'दो': ['दो', 'द'], 'ची': ['ची', 'चि']
  };

  var RAW = {
    /* ───────── 1 अश्विनी ───────── */
    'चु': [
      'चूड़ामणि|Chudamani|b|सिर पर धारण किया जाने वाला रत्न|Crest jewel|संस्कृत चूडा + मणि|f'
    ],
    'चे': [
      'चेतन|Chetan|b|चेतना, जीवंत मन|Consciousness, alive mind|संस्कृत चित्',
      'चेतना|Chetna|g|जागरूकता, सजगता|Awareness|संस्कृत चित्',
      'चेतक|Chetak|b|तेज़ और बुद्धिमान (महाराणा प्रताप के अश्व का नाम)|Swift and intelligent|संस्कृत चेतक',
      'चेतस|Chetas|b|मन, हृदय|Mind, heart|संस्कृत चेतस्',
      'चेतांश|Chetansh|b|चेतना का अंश|A part of consciousness|संस्कृत चेतना + अंश',
      'चेतिका|Chetika|g|चेतना से युक्त|Full of awareness|संस्कृत चेत',
      'चैतन्य|Chaitanya|b|जीवंत चेतना, आत्मा|Pure consciousness|संस्कृत चैतन्य|f',
      'चैतन्या|Chaitanya|g|चेतना से भरी|Full of consciousness|संस्कृत चैतन्य|f',
      'चैताली|Chaitali|g|चैत्र मास में जन्मी|Born in the month of Chaitra|संस्कृत चैत्र|f'
    ],
    'चो': [],
    'ला': [
      'लावण्य|Lavanya|b|सुंदरता, आकर्षण|Grace, charm|संस्कृत लावण्य',
      'लावण्या|Lavanya|g|सौंदर्य, कांति|Beauty, grace|संस्कृत लावण्य',
      'लालिमा|Lalima|g|उषा की लाली|Rosy glow of dawn|संस्कृत लालिमन्',
      'लालित्य|Lalitya|b|सौम्य सुंदरता|Elegance|संस्कृत ललित',
      'लाजवंती|Lajwanti|g|लज्जाशील, विनम्र|Modest, shy|संस्कृत लज्जा'
    ],
    /* ───────── 2 भरणी ───────── */
    'ली': [
      'लीला|Leela|g|ईश्वर की दिव्य क्रीड़ा|Divine play|संस्कृत लीला',
      'लीलाधर|Leeladhar|b|लीला करने वाले (श्रीकृष्ण)|One who performs divine play (Krishna)|संस्कृत लीला + धर',
      'लीलावती|Leelavati|g|सुंदर और लीलामयी|Graceful, playful|संस्कृत लीलावती',
      'लीना|Leena|g|तल्लीन, भक्ति में लीन|Absorbed, devoted|संस्कृत ली (लीन)',
      'लीलेश|Leelesh|b|लीला के स्वामी|Lord of divine play|संस्कृत लीला + ईश',
      'लीलांश|Leelansh|b|लीला का अंश|Part of divine play|संस्कृत लीला + अंश'
    ],
    'लू': [
      'लुम्बिनी|Lumbini|g|बुद्ध की जन्मस्थली, सुंदर उपवन|Garden where Buddha was born|पालि/संस्कृत लुम्बिनी|f',
      'लव|Lav|b|श्रीराम के पुत्र|Son of Lord Rama|संस्कृत लव|f',
      'लता|Lata|g|बेल, कोमल लता|Creeper, tender vine|संस्कृत लता|f',
      'लक्ष्य|Lakshya|b|उद्देश्य, निशाना|Aim, goal|संस्कृत लक्ष्य|f',
      'लक्ष्मी|Lakshmi|g|धन व सौभाग्य की देवी|Goddess of wealth and fortune|संस्कृत लक्ष्मी|f'
    ],
    'ले': [
      'लेखा|Lekha|g|लिखावट, रेखा|Writing, line|संस्कृत लेखा',
      'लेखराज|Lekhraj|b|लेखन का राजा|King of writing|संस्कृत लेख + राज',
      'लेखिनी|Lekhini|g|कलम|Pen|संस्कृत लेखनी',
      'लेखन|Lekhan|b|लेखन, साहित्य-सृजन|Writing, composition|संस्कृत लिख्'
    ],
    'लो': [
      'लोकेश|Lokesh|b|संसार के स्वामी|Lord of the world|संस्कृत लोक + ईश',
      'लोकेन्द्र|Lokendra|b|संसार के राजा|King of the world|संस्कृत लोक + इन्द्र',
      'लोचन|Lochan|b|नेत्र, आँख|Eye|संस्कृत लोचन',
      'लोचना|Lochana|g|सुंदर नेत्रों वाली|One with beautiful eyes|संस्कृत लोचन',
      'लोपामुद्रा|Lopamudra|g|महर्षि अगस्त्य की पत्नी|Wife of Sage Agastya|वैदिक',
      'लोकनाथ|Loknath|b|लोक के नाथ|Lord of the people|संस्कृत लोक + नाथ',
      'लोहित|Lohit|b|लाल रंग; ब्रह्मपुत्र का नाम|Red; also a river|संस्कृत लोहित'
    ],
    /* ───────── 3 कृत्तिका ───────── */
    'अ': [
      'अर्जुन|Arjun|b|उज्ज्वल, श्वेत; पांडव वीर|Bright, clear; Pandava hero|संस्कृत अर्जुन',
      'अर्णव|Arnav|b|समुद्र|Ocean|संस्कृत अर्णव',
      'अनिल|Anil|b|वायु, पवन|Wind|संस्कृत अनिल',
      'अनन्या|Ananya|g|अद्वितीय, जिसके समान कोई नहीं|Unique|संस्कृत अन् + अन्य',
      'अदिति|Aditi|g|असीम; देवताओं की माता|Boundless; mother of gods|वैदिक अदिति',
      'अंजलि|Anjali|g|अर्पण की मुद्रा, दोनों हथेलियों की अंजुरी|Offering with folded hands|संस्कृत अञ्जलि',
      'अभिषेक|Abhishek|b|पवित्र स्नान, राज्याभिषेक|Sacred anointing|संस्कृत अभिषेक',
      'अमित|Amit|b|असीम, अपार|Limitless|संस्कृत अमित',
      'अर्पिता|Arpita|g|समर्पित|Offered, dedicated|संस्कृत अर्पित',
      'अरुण|Arun|b|उषा की लालिमा; सूर्य के सारथी|Dawn-red; charioteer of the Sun|संस्कृत अरुण',
      'अक्षय|Akshay|b|अविनाशी|Imperishable|संस्कृत अक्षय',
      'अंकित|Ankit|b|चिह्नित, अंकित|Marked, inscribed|संस्कृत अङ्कित',
      'अनुराग|Anurag|b|प्रेम, स्नेह|Love, affection|संस्कृत अनुराग',
      'अपर्णा|Aparna|g|देवी पार्वती का नाम|Name of Goddess Parvati|संस्कृत अपर्णा',
      'अमृता|Amrita|g|अमरता, अमृत|Immortal nectar|संस्कृत अमृत',
      'अलका|Alka|g|कुबेर की नगरी; सुंदर केश|Kubera\'s city; lock of hair|संस्कृत अलका',
      'अनामिका|Anamika|g|अनाम, तीसरी उँगली|Nameless; ring finger|संस्कृत अनामिका',
      'अर्चना|Archana|g|पूजा, आराधना|Worship|संस्कृत अर्चना',
      'अनुपम|Anupam|u|अतुलनीय|Incomparable|संस्कृत अनुपम',
      'अभय|Abhay|u|निडर|Fearless|संस्कृत अभय',
      'अंश|Ansh|b|हिस्सा, भाग|Part, portion|संस्कृत अंश',
      'अवनि|Avani|g|पृथ्वी|Earth|संस्कृत अवनि',
      'अवनीश|Avanish|b|पृथ्वी के स्वामी|Lord of the earth|संस्कृत अवनि + ईश',
      'अक्षरा|Akshara|g|अविनाशी; वर्ण|Imperishable; letter|संस्कृत अक्षर',
      'अरिहंत|Arihant|b|शत्रुओं को जीतने वाला|Conqueror of enemies|संस्कृत अरि + हन्',
      'अगस्त्य|Agastya|b|एक महान वैदिक ऋषि|A great Vedic sage|वैदिक अगस्त्य',
      'अनघ|Anagh|b|निष्पाप|Sinless|संस्कृत अनघ',
      'अनघा|Anagha|g|निष्पाप, पवित्र|Sinless, pure|संस्कृत अनघा',
      'अनिरुद्ध|Aniruddh|b|जिसे कोई रोक न सके|Unstoppable|संस्कृत अनिरुद्ध',
      'अश्विन|Ashwin|b|अश्विनी कुमार; एक मास|Ashwini twin gods; a month|संस्कृत अश्विन्',
      'अथर्व|Atharv|b|चौथा वेद|The fourth Veda|संस्कृत अथर्वन्',
      'अद्वैत|Advait|u|अद्वितीय, अभेद|Non-dual, unique|संस्कृत अद्वैत',
      'अर्चित|Archit|b|पूजित|Worshipped|संस्कृत अर्चित',
      'अवंतिका|Avantika|g|उज्जैन नगरी का प्राचीन नाम|Ancient name of Ujjain|संस्कृत अवन्तिका',
      'अमला|Amala|g|निर्मल, शुद्ध|Pure, spotless|संस्कृत अमला',
      'अनंत|Anant|b|अंतहीन, अनंत|Infinite|संस्कृत अनन्त',
      'अभिनव|Abhinav|b|नया, नवीन|New, fresh|संस्कृत अभिनव',
      'अक्षत|Akshat|b|अखंडित; पूजा के चावल|Unbroken|संस्कृत अक्षत',
      'अपूर्व|Apoorv|b|अनोखा, अद्भुत|Unprecedented, wonderful|संस्कृत अपूर्व',
      'अंबिका|Ambika|g|माता; देवी दुर्गा|Mother; Goddess Durga|संस्कृत अम्बिका',
      'अरविंद|Arvind|b|कमल|Lotus|संस्कृत अरविन्द',
      'अरुणिमा|Arunima|g|उषा की लालिमा|Glow of dawn|संस्कृत अरुण',
      'अशोक|Ashok|b|शोकरहित|Without sorrow|संस्कृत अशोक',
      'अभिलाषा|Abhilasha|g|इच्छा, कामना|Desire, wish|संस्कृत अभिलाषा',
      'अजय|Ajay|b|अपराजित|Unconquered|संस्कृत अजय',
      'अमर|Amar|b|अमर, कभी न मरने वाला|Immortal|संस्कृत अमर',
      'अभिजीत|Abhijeet|b|विजयी; एक शुभ नक्षत्र/मुहूर्त|Victorious|संस्कृत अभिजित्',
      'अनीश|Anish|b|जिससे श्रेष्ठ कोई नहीं|Without a superior|संस्कृत अनीश',
      'अभिराम|Abhiram|b|मनोहर, सुंदर|Pleasing, beautiful|संस्कृत अभिराम',
      'अतुल|Atul|b|अतुलनीय|Matchless|संस्कृत अतुल',
      'अनुज|Anuj|b|छोटा भाई|Younger brother|संस्कृत अनुज',
      'अनुजा|Anuja|g|छोटी बहन|Younger sister|संस्कृत अनुजा',
      'अश्विनी|Ashwini|g|पहला नक्षत्र; अश्व-शक्ति वाली|First nakshatra|संस्कृत अश्विनी',
      'अर्पण|Arpan|b|समर्पण|Offering|संस्कृत अर्पण',
      'अपराजिता|Aparajita|g|कभी न हारने वाली|Undefeated|संस्कृत अपराजिता',
      'अविनाश|Avinash|b|अविनाशी|Indestructible|संस्कृत अविनाश',
      'अवधेश|Avadhesh|b|अवध (अयोध्या) के राजा|King of Avadh (Rama)|संस्कृत अवध + ईश',
      'अमूल्य|Amulya|u|अनमोल|Priceless|संस्कृत अमूल्य',
      'अलंकार|Alankar|b|आभूषण, सजावट|Ornament|संस्कृत अलङ्कार',
      'अलंकृता|Alankrita|g|सुसज्जित|Adorned|संस्कृत अलङ्कृत',
      'अद्रि|Adri|b|पर्वत|Mountain|संस्कृत अद्रि',
      'अम्बर|Ambar|b|आकाश|Sky|संस्कृत अम्बर',
      'अम्बुज|Ambuj|b|कमल (जल में जन्मा)|Lotus|संस्कृत अम्बु + ज',
      'अम्बुजा|Ambuja|g|कमल|Lotus|संस्कृत अम्बुज'
    ],
    'ई': [
      'ईश|Ish|u|स्वामी, ईश्वर|Lord|संस्कृत ईश',
      'ईशान|Ishan|b|उत्तर-पूर्व दिशा के स्वामी; शिव|Lord of the north-east; Shiva|संस्कृत ईशान',
      'ईशा|Isha|g|देवी, स्वामिनी|Goddess, mistress|संस्कृत ईशा',
      'ईशिता|Ishita|g|श्रेष्ठता, प्रभुत्व|Supremacy|संस्कृत ईशित्व',
      'ईश्वर|Ishwar|b|परमात्मा|God|संस्कृत ईश्वर',
      'ईश्वरी|Ishwari|g|देवी|Goddess|संस्कृत ईश्वरी',
      'ईक्षा|Iksha|g|दृष्टि, दूरदर्शिता|Vision|संस्कृत ईक्षा',
      'ईप्सा|Ipsa|g|इच्छा|Desire|संस्कृत ईप्सा',
      'ईहा|Iha|g|चेष्टा, प्रयास|Effort|संस्कृत ईहा',
      'ईशानी|Ishani|g|देवी पार्वती|Goddess Parvati|संस्कृत ईशानी',
      'इंद्र|Indra|b|देवताओं के राजा|King of the gods|संस्कृत इन्द्र|f',
      'इंदु|Indu|u|चंद्रमा|Moon|संस्कृत इन्दु|f',
      'इंदिरा|Indira|g|देवी लक्ष्मी|Goddess Lakshmi|संस्कृत इन्दिरा|f',
      'इला|Ila|g|पृथ्वी, वाणी|Earth, speech|संस्कृत इला|f',
      'इरा|Ira|g|पृथ्वी, वाणी, जल|Earth, speech|संस्कृत इरा|f',
      'इच्छा|Ichha|g|कामना|Wish|संस्कृत इच्छा|f',
      'इंदीवर|Indivar|b|नीला कमल|Blue lotus|संस्कृत इन्दीवर|f',
      'इन्द्रजीत|Indrajeet|b|इंद्र को जीतने वाला|Conqueror of Indra|संस्कृत इन्द्र + जित्|f',
      'इरावती|Irawati|g|पृथ्वी; एक नदी|Earth; a river|संस्कृत इरावती|f'
    ],
    'उ': [
      'उदय|Uday|b|उगना, उन्नति|Rise, prosperity|संस्कृत उदय',
      'उमा|Uma|g|देवी पार्वती|Goddess Parvati|संस्कृत उमा',
      'उर्वशी|Urvashi|g|स्वर्ग की अप्सरा|Celestial nymph|संस्कृत उर्वशी',
      'उषा|Usha|g|भोर, प्रभात|Dawn|संस्कृत उषस्',
      'उत्कर्ष|Utkarsh|b|उन्नति, उत्थान|Progress, excellence|संस्कृत उत्कर्ष',
      'उत्तम|Uttam|b|श्रेष्ठ|Best, excellent|संस्कृत उत्तम',
      'उन्नति|Unnati|g|प्रगति|Progress|संस्कृत उन्नति',
      'उज्ज्वल|Ujjwal|b|चमकीला, उजला|Bright, radiant|संस्कृत उज्ज्वल',
      'उज्ज्वला|Ujjwala|g|चमकदार, प्रकाशमान|Radiant|संस्कृत उज्ज्वला',
      'उपासना|Upasana|g|आराधना, भक्ति|Worship|संस्कृत उपासना',
      'उदित|Udit|b|उदय हुआ, उन्नत|Risen, ascended|संस्कृत उदित',
      'उमेश|Umesh|b|उमा के स्वामी (शिव)|Lord of Uma (Shiva)|संस्कृत उमा + ईश',
      'उत्सव|Utsav|b|पर्व, आनंदोत्सव|Festival, celebration|संस्कृत उत्सव',
      'उर्मिला|Urmila|g|लक्ष्मण की पत्नी; लहर|Wife of Lakshmana; wave|संस्कृत ऊर्मि',
      'उर्वी|Urvi|g|पृथ्वी|Earth|संस्कृत उर्वी',
      'उदयन|Udayan|b|उदित होने वाला; प्राचीन वत्स-नरेश|Rising; ancient king|संस्कृत उदयन',
      'उपेंद्र|Upendra|b|इंद्र के छोटे भाई (विष्णु)|Younger brother of Indra (Vishnu)|संस्कृत उपेन्द्र',
      'उद्धव|Uddhav|b|श्रीकृष्ण के मित्र व भक्त|Friend and devotee of Krishna|संस्कृत उद्धव',
      'उत्पल|Utpal|u|नीलकमल|Blue lotus|संस्कृत उत्पल',
      'उन्मेष|Unmesh|b|खिलना, जागरण|Blossoming, awakening|संस्कृत उन्मेष'
    ],
    'ए': [
      'एकांश|Ekansh|b|संपूर्ण का एक भाग|One part of the whole|संस्कृत एक + अंश',
      'एकता|Ekta|g|एकता, मेल|Unity|संस्कृत एकता',
      'एकलव्य|Eklavya|b|महाभारत का समर्पित शिष्य|Devoted disciple of the Mahabharata|महाभारत',
      'एकनाथ|Eknath|b|संत एकनाथ|Saint Eknath|संस्कृत एक + नाथ',
      'एषा|Esha|g|इच्छा, कामना|Wish, desire|संस्कृत एषा',
      'एषणा|Eshana|g|इच्छा, खोज|Desire, quest|संस्कृत एषणा',
      'एकांशी|Ekanshi|g|एक अंश|A single part|संस्कृत एक + अंश',
      'ऐश्वर्या|Aishwarya|g|वैभव, समृद्धि|Prosperity, opulence|संस्कृत ऐश्वर्य|f',
      'ऐश्वर्य|Aishwarya|b|वैभव, प्रभुत्व|Opulence, sovereignty|संस्कृत ऐश्वर्य|f',
      'ऐरावत|Airavat|b|इंद्र का श्वेत हाथी|White elephant of Indra|पौराणिक|f'
    ],
    /* ───────── 4 रोहिणी ───────── */
    'ओ': [
      'ओम|Om|b|पवित्र प्रणव ध्वनि|The sacred syllable|संस्कृत ॐ',
      'ओजस|Ojas|b|तेज, जीवन-शक्ति|Vigour, vitality|संस्कृत ओजस्',
      'ओजस्वी|Ojasvi|u|तेजस्वी, ओजपूर्ण|Radiant, energetic|संस्कृत ओजस्विन्',
      'ओजस्विनी|Ojasvini|g|तेजस्विनी|Radiant, energetic woman|संस्कृत ओजस्विनी',
      'ओंकार|Omkar|b|ॐ का स्वर|The sound Om|संस्कृत ओङ्कार',
      'ओमांश|Omansh|b|ॐ का अंश|Part of Om|संस्कृत ॐ + अंश',
      'ओंकारेश्वर|Omkareshwar|b|ओंकार के ईश्वर; एक ज्योतिर्लिंग|Lord of Om; a Jyotirlinga|संस्कृत ओङ्कारेश्वर'
    ],
    'वा': [
      'वासुदेव|Vasudev|b|वसुदेव के पुत्र (कृष्ण)|Son of Vasudeva (Krishna)|संस्कृत वासुदेव',
      'वामन|Vaman|b|विष्णु का वामन अवतार|Dwarf avatar of Vishnu|संस्कृत वामन',
      'वाणी|Vani|g|वाक्, सरस्वती|Speech, Saraswati|संस्कृत वाणी',
      'वामा|Vama|g|सुंदर स्त्री; देवी पार्वती|Beautiful woman; Parvati|संस्कृत वामा',
      'वासवी|Vasavi|g|इंद्र (वासव) से संबंधित; देवी|Related to Indra (Vasava); a goddess|संस्कृत वासवी',
      'वाग्देवी|Vagdevi|g|वाणी की देवी, सरस्वती|Goddess of speech, Saraswati|संस्कृत वाक् + देवी',
      'वाल्मीकि|Valmiki|b|रामायण के रचयिता|Author of the Ramayana|वैदिक/पौराणिक',
      'वायु|Vayu|b|पवन देव|God of wind|संस्कृत वायु',
      'वारुणी|Varuni|g|वरुण की शक्ति, जल की देवी|Shakti of Varuna|संस्कृत वारुणी',
      'वासु|Vasu|b|धन; एक देवगण|Wealth; a class of gods|संस्कृत वसु',
      'वासव|Vasav|b|इंद्र|Indra|संस्कृत वासव',
      'वासुकी|Vasuki|b|नागराज|King of serpents|पौराणिक वासुकि',
      'वाराही|Varahi|g|वराह रूप की शक्ति देवी|Goddess Varahi|संस्कृत वाराही',
      'वात्सल्य|Vatsalya|u|ममता, स्नेह|Tender affection|संस्कृत वात्सल्य',
      'वाचस्पति|Vachaspati|b|वाणी के स्वामी (बृहस्पति)|Lord of speech|संस्कृत वाचस्पति',
      'वामिका|Vamika|g|देवी दुर्गा का नाम|Name of Goddess Durga|संस्कृत वामा',
      'वाग्भट|Vagbhata|b|प्राचीन आयुर्वेदाचार्य|Ancient Ayurvedic scholar|संस्कृत वाग्भट',
      'वारिज|Varij|b|कमल (जल में जन्मा)|Lotus|संस्कृत वारि + ज',
      'वारिजा|Varija|g|कमल|Lotus|संस्कृत वारिज',
      'वारिधि|Varidhi|b|समुद्र|Ocean|संस्कृत वारि + धि',
      'वासंती|Vasanti|g|वसंत ऋतु की|Of the spring|संस्कृत वसन्त',
      'वागीश|Vagish|b|वाणी के स्वामी|Lord of speech|संस्कृत वाक् + ईश'
    ],
    'वी': [
      'वीर|Veer|b|बहादुर, योद्धा|Brave, warrior|संस्कृत वीर',
      'वीरेंद्र|Virendra|b|वीरों के राजा|King of heroes|संस्कृत वीर + इन्द्र',
      'वीणा|Veena|g|सरस्वती का वाद्य|Saraswati\'s instrument|संस्कृत वीणा',
      'वीरा|Veera|g|बहादुर स्त्री|Brave woman|संस्कृत वीरा',
      'वीरेश|Viresh|b|वीरों के स्वामी|Lord of the brave|संस्कृत वीर + ईश',
      'वीरभद्र|Veerbhadra|b|शिव के वीर गण|Heroic attendant of Shiva|संस्कृत वीरभद्र',
      'वीरेन|Viren|b|वीर, बहादुर|Brave|संस्कृत वीर',
      'वीरांश|Viraansh|b|वीर का अंश|Part of a hero|संस्कृत वीर + अंश'
    ],
    'वू': [
      'वृंदा|Vrinda|g|तुलसी; राधा का एक नाम|Holy basil; a name of Radha|संस्कृत वृन्दा|f',
      'वृषभ|Vrishabh|b|बैल, श्रेष्ठ|Bull; excellent|संस्कृत वृषभ|f',
      'वृष्टि|Vrishti|g|वर्षा|Rain|संस्कृत वृष्टि|f',
      'वृषांक|Vrishank|b|शिव का चिह्न वृषभ|Shiva, who bears the bull emblem|संस्कृत वृष + अङ्क|f',
      'वृषाली|Vrushali|g|कर्ण की पत्नी का नाम|Name of Karna\'s wife|महाभारत|f'
    ],
    /* ───────── 5 मृगशिरा ───────── */
    'वे': [
      'वेदांत|Vedant|b|वेदों का अंतिम ज्ञान|Culmination of the Vedas|संस्कृत वेद + अन्त',
      'वेद|Ved|b|ज्ञान, पवित्र ग्रंथ|Knowledge, sacred scripture|संस्कृत विद्',
      'वेदिका|Vedika|g|यज्ञ-वेदी|Sacrificial altar|संस्कृत वेदिका',
      'वेदिता|Vedita|g|ज्ञानवान, विदुषी|Knowing, learned|संस्कृत विद्',
      'वेदांश|Vedansh|b|वेद का अंश|Part of the Vedas|संस्कृत वेद + अंश',
      'वेदव्यास|Vedvyas|b|वेदों का विभाजन करने वाले ऋषि|Sage who compiled the Vedas|महाभारत',
      'वेणु|Venu|b|बाँसुरी|Flute|संस्कृत वेणु',
      'वेणी|Veni|g|चोटी; धारा का संगम|Braid; confluence|संस्कृत वेणी',
      'वेदवती|Vedavati|g|रामायण की तपस्विनी|Ascetic woman of the Ramayana|रामायण',
      'वेंकट|Venkat|b|तिरुपति के भगवान वेंकटेश|Lord Venkateshwara of Tirupati|तेलुगु/संस्कृत वेङ्कट',
      'वेंकटेश|Venkatesh|b|भगवान वेंकटेश्वर|Lord Venkateshwara|संस्कृत वेङ्कट + ईश',
      'वेदार्थ|Vedarth|b|वेदों का अर्थ|Meaning of the Vedas|संस्कृत वेद + अर्थ',
      'वेदा|Veda|g|ज्ञान|Knowledge|संस्कृत वेद',
      'वेदप्रकाश|Vedprakash|b|वेदों का प्रकाश|Light of the Vedas|संस्कृत वेद + प्रकाश',
      'वेंकटरमण|Venkataraman|b|भगवान वेंकटेश्वर|Lord Venkateshwara|संस्कृत वेङ्कट + रमण'
    ],
    'वो': [],
    'का': [
      'कान्त|Kant|b|प्रिय, सुंदर|Beloved, handsome|संस्कृत कान्त',
      'कान्ता|Kanta|g|प्रिया, सुंदर स्त्री|Beloved woman|संस्कृत कान्ता',
      'काव्य|Kavya|b|कविता, काव्य|Poetry|संस्कृत काव्य',
      'काव्या|Kavya|g|कविता, कवि की रचना|Poem|संस्कृत काव्य',
      'कार्तिक|Kartik|b|कार्तिक मास; कार्तिकेय|Month of Kartik; Kartikeya|संस्कृत कार्तिक',
      'कार्तिकेय|Kartikeya|b|शिव-पुत्र, देवसेनापति|Son of Shiva, general of the gods|संस्कृत कार्तिकेय',
      'काश्यप|Kashyap|b|ऋषि कश्यप के वंशज|Descendant of Sage Kashyapa|वैदिक',
      'कामना|Kamna|g|इच्छा|Wish|संस्कृत कामना',
      'कादम्बरी|Kadambari|g|सरस्वती; बाणभट्ट की कथा|Saraswati; Banabhatta\'s tale|संस्कृत कादम्बरी',
      'कावेरी|Kaveri|g|दक्षिण भारत की पवित्र नदी|Sacred river of South India|संस्कृत कावेरी',
      'कामेश|Kamesh|b|कामदेव; इच्छा के स्वामी|Lord of desire (Kamadeva)|संस्कृत काम + ईश',
      'कामाक्षी|Kamakshi|g|देवी पार्वती (कांचीपुरम)|Goddess Parvati of Kanchipuram|संस्कृत कामाक्षी',
      'काशी|Kashi|g|पवित्र नगरी (वाराणसी)|Holy city Varanasi|संस्कृत काशी',
      'कांचन|Kanchan|u|सोना|Gold|संस्कृत काञ्चन',
      'कान्हा|Kanha|b|श्रीकृष्ण|Lord Krishna|संस्कृत कृष्ण (कन्हैया)',
      'कामिनी|Kamini|g|सुंदर स्त्री|Beautiful woman|संस्कृत कामिनी',
      'कालिका|Kalika|g|देवी काली का रूप|Form of Goddess Kali|संस्कृत कालिका',
      'काली|Kali|g|देवी काली|Goddess Kali|संस्कृत काली',
      'कालिदास|Kalidas|b|महाकवि कालिदास|The great poet Kalidasa|संस्कृत काली + दास',
      'कारुण्य|Karunya|u|करुणा, दया|Compassion|संस्कृत कारुण्य',
      'कांचना|Kanchana|g|सोने जैसी|Golden|संस्कृत काञ्चना',
      'कान्ति|Kanti|g|चमक, आभा|Radiance|संस्कृत कान्ति',
      'कामदेव|Kamdev|b|प्रेम के देवता|God of love|संस्कृत कामदेव',
      'कामेश्वरी|Kameshwari|g|देवी ललिता|Goddess Lalita|संस्कृत कामेश्वरी',
      'कानन|Kanan|u|वन, उपवन|Forest, grove|संस्कृत कानन',
      'काव्यांश|Kavyansh|b|काव्य का अंश|Part of a poem|संस्कृत काव्य + अंश',
      'कालिन्दी|Kalindi|g|यमुना नदी|River Yamuna|संस्कृत कालिन्दी',
      'काशीनाथ|Kashinath|b|काशी के स्वामी (शिव)|Lord of Kashi (Shiva)|संस्कृत काशी + नाथ'
    ],
    'की': [
      'कीर्ति|Kirti|u|यश, प्रसिद्धि|Fame, glory|संस्कृत कीर्ति',
      'कीर्तिमान|Kirtiman|b|यशस्वी|Famous|संस्कृत कीर्ति + मान्',
      'कीर्तिदा|Kirtida|g|यश देने वाली|Giver of fame|संस्कृत कीर्ति + दा',
      'कीर्तिवर्धन|Kirtivardhan|b|यश बढ़ाने वाला|Increaser of fame|संस्कृत कीर्ति + वर्धन',
      'कीर्तिश|Kirtish|b|यश के स्वामी|Lord of fame|संस्कृत कीर्ति + ईश',
      'कीर्तिलता|Kirtilata|g|यश की बेल|Vine of fame|संस्कृत कीर्ति + लता',
      'कीर्तिराज|Kirtiraj|b|यश के राजा|King of fame|संस्कृत कीर्ति + राज',
      'कीर्तन|Kirtan|b|भगवान का गुणगान|Devotional praise|संस्कृत कीर्तन'
    ],
    /* ───────── 6 आर्द्रा ───────── */
    'कू': [
      'कुमार|Kumar|b|बालक; कार्तिकेय|Youth; Kartikeya|संस्कृत कुमार|f',
      'कुमारी|Kumari|g|कन्या|Maiden|संस्कृत कुमारी|f',
      'कुशल|Kushal|b|निपुण|Skilled|संस्कृत कुशल|f',
      'कुंदन|Kundan|b|शुद्ध सोना|Pure gold|संस्कृत कुन्दन|f',
      'कुंती|Kunti|g|पांडवों की माता|Mother of the Pandavas|महाभारत|f',
      'कुमुद|Kumud|u|श्वेत कमल|White water lily|संस्कृत कुमुद|f',
      'कुमुदिनी|Kumudini|g|कुमुद का पौधा, चाँदनी में खिलने वाली|Night-blooming lily|संस्कृत कुमुदिनी|f',
      'कुबेर|Kuber|b|धन के देवता|God of wealth|संस्कृत कुबेर|f',
      'कुश|Kush|b|श्रीराम के पुत्र|Son of Lord Rama|संस्कृत कुश|f',
      'कुसुम|Kusum|g|फूल|Flower|संस्कृत कुसुम|f',
      'कुशाग्र|Kushagra|b|तीक्ष्ण बुद्धि वाला|Sharp-minded|संस्कृत कुश + अग्र|f',
      'कुहू|Kuhu|g|कोयल की कूक|Call of the cuckoo|संस्कृत कुहू|f',
      'कुणाल|Kunal|b|कमल; अशोक के पुत्र|Lotus; son of Ashoka|संस्कृत कुणाल|f',
      'कुमकुम|Kumkum|g|सिंदूर, मंगल तिलक|Vermilion|संस्कृत कुङ्कुम|f',
      'कुंजबिहारी|Kunjbihari|b|कुंजों में विहार करने वाले (कृष्ण)|Krishna who roams in groves|संस्कृत कुञ्ज + विहारी|f',
      'कुलदीप|Kuldeep|b|कुल का दीपक|Lamp of the family|संस्कृत कुल + दीप|f',
      'कुलभूषण|Kulbhushan|b|कुल का आभूषण|Ornament of the family|संस्कृत कुल + भूषण|f',
      'कुशीलव|Kushilav|b|कुश और लव (राम-पुत्र); गायक|Kusha-Lava; bard|संस्कृत कुशीलव|f'
    ],
    'घ': [
      'घनश्याम|Ghanshyam|b|बादल जैसे श्यामवर्ण वाले (कृष्ण)|Dark as a rain-cloud (Krishna)|संस्कृत घन + श्याम',
      'घनानंद|Ghananand|b|रीतिकाल के प्रसिद्ध कवि|A renowned poet|संस्कृत घन + आनन्द',
      'घृष्णेश्वर|Ghrishneshwar|b|एक ज्योतिर्लिंग|A Jyotirlinga|संस्कृत घृष्णेश्वर',
      'घटोत्कच|Ghatotkach|b|भीमसेन के पुत्र|Son of Bhima|महाभारत'
    ],
    'ङ': [],
    'छ': [
      'छवि|Chhavi|g|आभा, सुंदर रूप|Radiance, image|संस्कृत छवि',
      'छाया|Chhaya|g|सूर्य की पत्नी; परछाईं|Wife of Surya; shade|संस्कृत छाया',
      'छत्रपति|Chhatrapati|b|छत्रधारी राजा|Sovereign king|संस्कृत छत्र + पति',
      'छत्रसाल|Chhatrasal|b|वीर बुंदेला राजा|Valiant Bundela king|हिंदी/ऐतिहासिक'
    ],
    /* ───────── 7 पुनर्वसु ───────── */
    'के': [
      'केशव|Keshav|b|श्रीकृष्ण, सुंदर केशों वाले|Krishna, the long-haired|संस्कृत केशव',
      'केतन|Ketan|b|घर; ध्वज|Home; banner|संस्कृत केतन',
      'केतकी|Ketaki|g|एक सुगंधित पुष्प|A fragrant flower|संस्कृत केतकी',
      'केदार|Kedar|b|शिव; खेत|Shiva; field|संस्कृत केदार',
      'केदारनाथ|Kedarnath|b|हिमालय के पूज्य शिव-धाम|Revered Shiva shrine in the Himalayas|संस्कृत केदार + नाथ',
      'केसरी|Kesari|u|सिंह; हनुमान के पिता|Lion; father of Hanuman|संस्कृत केसरिन्',
      'केसर|Kesar|g|केसर (सुगंधित पुष्प-तंतु)|Saffron|संस्कृत केसर',
      'केयूर|Keyur|b|बाजूबंद|Armlet|संस्कृत केयूर',
      'केशिनी|Keshini|g|सुंदर बालों वाली|Beautiful-haired|संस्कृत केशिनी',
      'केवल|Keval|b|अकेला, शुद्ध|Sole, pure|संस्कृत केवल'
    ],
    'को': [
      'कोमल|Komal|g|कोमल, सुकुमार|Tender, soft|संस्कृत कोमल',
      'कोकिला|Kokila|g|कोयल|Cuckoo|संस्कृत कोकिल',
      'कोविद|Kovid|b|विद्वान, पंडित|Learned, scholar|संस्कृत कोविद',
      'कौशल्या|Kaushalya|g|श्रीराम की माता|Mother of Lord Rama|रामायण|f',
      'कौशिक|Kaushik|b|विश्वामित्र (कुशिक वंशज)|Descendant of Kushika (Vishwamitra)|संस्कृत कौशिक|f',
      'कौस्तुभ|Kaustubh|b|विष्णु का दिव्य मणि|Divine gem of Vishnu|संस्कृत कौस्तुभ|f',
      'कौमुदी|Kaumudi|g|चाँदनी|Moonlight|संस्कृत कौमुदी|f',
      'कौशल|Kaushal|b|निपुणता|Skill|संस्कृत कौशल|f',
      'कौशिकी|Kaushiki|g|देवी पार्वती का रूप|A form of Parvati|संस्कृत कौशिकी|f'
    ],
    'हा': [
      'हार्दिक|Hardik|b|हृदय से जुड़ा, आत्मीय|Heartfelt, cordial|संस्कृत हार्दिक',
      'हासिनी|Hasini|g|हँसमुख|Smiling, cheerful|संस्कृत हासिनी',
      'हाटकेश|Hatakesh|b|स्वर्ण के स्वामी (शिव)|Lord of gold (Shiva)|संस्कृत हाटक + ईश',
      'हारीत|Harit|b|एक वैदिक ऋषि|A Vedic sage|संस्कृत हारीत'
    ],
    'ही': [
      'हीरा|Heera|g|हीरा, रत्न|Diamond|संस्कृत हीर',
      'हीरक|Heerak|b|हीरा|Diamond|संस्कृत हीरक',
      'हीरेंद्र|Hirendra|b|हीरों के राजा|King of diamonds|संस्कृत हीर + इन्द्र',
      'हीरल|Heeral|g|हीरे जैसी|Diamond-like|संस्कृत हीर',
      'हीर|Heer|g|हीरा|Diamond|संस्कृत हीर',
      'हीरेन|Hiren|b|हीरा|Diamond|संस्कृत हीर'
    ],
    /* ───────── 8 पुष्य ───────── */
    'हू': [
      'हृदय|Hriday|u|हृदय, दिल|Heart|संस्कृत हृदय|f',
      'हृदयेश|Hridayesh|b|हृदय के स्वामी|Lord of the heart|संस्कृत हृदय + ईश|f',
      'हृषिकेश|Hrishikesh|b|इंद्रियों के स्वामी (विष्णु)|Lord of the senses (Vishnu)|संस्कृत हृषीकेश|f',
      'हृषित|Hrishit|b|प्रसन्न, हर्षित|Joyful|संस्कृत हृष्|f',
      'हृदया|Hridaya|g|हृदय|Heart|संस्कृत हृदय|f',
      'हुताशन|Hutashan|b|अग्नि|Fire|संस्कृत हुत + अशन|f'
    ],
    'हे': [
      'हेमंत|Hemant|b|शीत ऋतु|Early winter|संस्कृत हेमन्त',
      'हेमा|Hema|g|स्वर्ण|Gold|संस्कृत हेमा',
      'हेमलता|Hemlata|g|सोने की बेल|Golden creeper|संस्कृत हेम + लता',
      'हेमचंद्र|Hemchandra|b|आचार्य हेमचंद्र|Acharya Hemachandra|संस्कृत हेम + चन्द्र',
      'हेमांगी|Hemangi|g|स्वर्ण-देह वाली|Golden-bodied|संस्कृत हेम + अङ्ग',
      'हेरंब|Heramb|b|गणेश|Ganesha|संस्कृत हेरम्ब',
      'हेम|Hem|u|स्वर्ण|Gold|संस्कृत हेम',
      'हेमांग|Hemang|b|सोने जैसे अंगों वाला|Golden-limbed|संस्कृत हेम + अङ्ग'
    ],
    'हो': [
      'हर्ष|Harsh|b|आनंद, प्रसन्नता|Joy|संस्कृत हर्ष|f',
      'हर्षिता|Harshita|g|प्रसन्न|Joyful|संस्कृत हर्षित|f',
      'हरिणी|Harini|g|हिरणी|Doe|संस्कृत हरिणी|f',
      'हंसराज|Hansraj|b|हंसों के राजा|King of swans|संस्कृत हंस + राज|f',
      'हर्षिल|Harshil|b|आनंद देने वाला|Giver of joy|संस्कृत हर्ष|f',
      'हरीश|Harish|b|हरि (विष्णु) के ईश|Lord Hari (Vishnu)|संस्कृत हरि + ईश|f',
      'हरिप्रिया|Haripriya|g|हरि की प्रिया|Beloved of Hari|संस्कृत हरि + प्रिया|f',
      'हरिदास|Haridas|b|हरि के भक्त|Devotee of Hari|संस्कृत हरि + दास|f'
    ],
    'डा': [
      'दामोदर|Damodar|b|कृष्ण (उदर पर रस्सी बँधी)|Krishna|संस्कृत दाम + उदर|f',
      'दामिनी|Damini|g|बिजली|Lightning|संस्कृत दामिनी|f',
      'दाक्षायणी|Dakshayani|g|दक्ष की पुत्री सती|Sati, daughter of Daksha|संस्कृत दाक्षायणी|f'
    ],
    /* ───────── 9 आश्लेषा ───────── */
    'डी': [
      'दीपक|Deepak|b|दीपक, प्रकाश|Lamp, light|संस्कृत दीपक|f',
      'दीपिका|Deepika|g|छोटा दीया|Little lamp|संस्कृत दीपिका|f',
      'दीप्ति|Deepti|g|चमक, प्रकाश|Brilliance|संस्कृत दीप्ति|f',
      'दीक्षा|Diksha|g|संकल्प; गुरु-दीक्षा|Initiation|संस्कृत दीक्षा|f',
      'दीपांशु|Deepanshu|b|दीपक की किरण|Ray of a lamp|संस्कृत दीप + अंशु|f',
      'दीपेश|Deepesh|b|दीपों के स्वामी|Lord of lights|संस्कृत दीप + ईश|f'
    ],
    'डू': [
      'दुर्गा|Durga|g|अजेय देवी|Invincible goddess|संस्कृत दुर्गा|f',
      'दुर्गेश|Durgesh|b|दुर्गा के स्वामी|Lord of Durga|संस्कृत दुर्ग + ईश|f',
      'दुष्यंत|Dushyant|b|शकुंतला के पति राजा|King, husband of Shakuntala|महाभारत|f',
      'दुर्वासा|Durvasa|b|महर्षि दुर्वासा|Sage Durvasa|पौराणिक|f'
    ],
    'डे': [
      'देव|Dev|b|देवता, दिव्य|God, divine|संस्कृत देव|f',
      'देवी|Devi|g|देवी|Goddess|संस्कृत देवी|f',
      'देवांश|Devansh|b|दिव्य अंश|Divine part|संस्कृत देव + अंश|f',
      'देविका|Devika|g|छोटी देवी|Little goddess|संस्कृत देविका|f',
      'देवेश|Devesh|b|देवों के स्वामी|Lord of gods|संस्कृत देव + ईश|f'
    ],
    'डो': [],
    /* ───────── 10 मघा ───────── */
    'मा': [
      'माधव|Madhav|b|श्रीकृष्ण; मधु वंश के|Krishna|संस्कृत माधव',
      'माधवी|Madhavi|g|वसंत की लता|Spring creeper|संस्कृत माधवी',
      'माया|Maya|g|लक्ष्मी; भ्रम|Lakshmi; illusion|संस्कृत माया',
      'मानव|Manav|b|मनुष्य|Human|संस्कृत मानव',
      'मानसी|Manasi|g|मन से उपजी|Born of the mind|संस्कृत मानसी',
      'माणिक्य|Manikya|b|माणिक रत्न|Ruby|संस्कृत माणिक्य',
      'मानस|Manas|b|मन|Mind|संस्कृत मानस',
      'मालती|Malti|g|चमेली जैसी सुगंधित लता|Fragrant jasmine-like creeper|संस्कृत मालती',
      'माला|Mala|g|हार|Garland|संस्कृत माला',
      'मालिनी|Malini|g|माला धारण करने वाली|Garland-wearer|संस्कृत मालिनी',
      'माधुरी|Madhuri|g|मधुरता|Sweetness|संस्कृत माधुरी',
      'मानवी|Manavi|g|मानव-कन्या|Daughter of man|संस्कृत मानवी',
      'मानिनी|Manini|g|स्वाभिमानी स्त्री|Self-respecting woman|संस्कृत मानिनी',
      'मार्कण्डेय|Markandeya|b|चिरंजीवी ऋषि|Immortal sage|पौराणिक',
      'मारुति|Maruti|b|हनुमान, पवन-पुत्र|Hanuman, son of the wind|संस्कृत मारुति',
      'मान्या|Manya|g|सम्माननीय|Respected|संस्कृत मान्या',
      'मांडवी|Mandavi|g|भरत की पत्नी|Wife of Bharata|रामायण',
      'मालविका|Malavika|g|कालिदास की नायिका|Heroine of Kalidasa\'s play|संस्कृत मालविका',
      'माणिक|Manik|b|माणिक रत्न|Ruby|संस्कृत माणिक',
      'मानवेंद्र|Manvendra|b|मनुष्यों के राजा|King of men|संस्कृत मानव + इन्द्र',
      'मातंगी|Matangi|g|दशमहाविद्या की देवी|A Mahavidya goddess|संस्कृत मातङ्गी',
      'मान्यता|Manyata|g|आदर, मान्यता|Esteem, acceptance|संस्कृत मान्यता'
    ],
    'मी': [
      'मीरा|Meera|g|कृष्ण-भक्त संत|Krishna devotee-saint|संस्कृत/राजस्थानी',
      'मीना|Meena|g|मछली|Fish|संस्कृत मीन',
      'मीनाक्षी|Meenakshi|g|मछली जैसी आँखों वाली (देवी)|Fish-eyed goddess|संस्कृत मीन + अक्षि',
      'मीत|Meet|u|मित्र|Friend|संस्कृत मित्र',
      'मीमांसा|Mimansa|g|विचार; एक दर्शन|Inquiry; a philosophy|संस्कृत मीमांसा'
    ],
    'मू': [
      'मुकुंद|Mukund|b|श्रीकृष्ण, मोक्ष देने वाले|Krishna, giver of liberation|संस्कृत मुकुन्द|f',
      'मुरली|Murli|u|बाँसुरी|Flute|संस्कृत मुरली|f',
      'मुरारी|Murari|b|कृष्ण (मुर दैत्य के शत्रु)|Krishna|संस्कृत मुरारि|f',
      'मुक्ता|Mukta|g|मोती|Pearl|संस्कृत मुक्ता|f',
      'मुक्ति|Mukti|g|मोक्ष|Liberation|संस्कृत मुक्ति|f',
      'मुदित|Mudit|b|प्रसन्न|Joyful|संस्कृत मुदित|f',
      'मुदिता|Mudita|g|आनंदित|Delighted|संस्कृत मुदिता|f',
      'मुग्धा|Mugdha|g|मोहित, भोली|Enchanted, innocent|संस्कृत मुग्धा|f',
      'मुकुल|Mukul|u|कली|Bud|संस्कृत मुकुल|f'
    ],
    'मे': [
      'मेघ|Megh|b|बादल|Cloud|संस्कृत मेघ',
      'मेघा|Megha|g|बादल|Cloud|संस्कृत मेघ',
      'मेघना|Meghna|g|बादलों की गर्जना; एक नदी|Thunder of clouds; a river|संस्कृत मेघ',
      'मेघनाद|Meghnad|b|बादल-सी गर्जना (रावण-पुत्र)|Thunder-voiced|रामायण',
      'मेधा|Medha|g|बुद्धि, धारणा-शक्ति|Intellect|संस्कृत मेधा',
      'मेनका|Menaka|g|स्वर्ग की अप्सरा|Celestial nymph|संस्कृत मेनका',
      'मेरु|Meru|b|पौराणिक स्वर्ण पर्वत|Mythical golden mountain|संस्कृत मेरु',
      'मेघांश|Meghansh|b|बादल का अंश|Part of a cloud|संस्कृत मेघ + अंश',
      'मेधांश|Medhansh|b|बुद्धि का अंश|Part of intellect|संस्कृत मेधा + अंश',
      'मेखला|Mekhala|g|करधनी|Girdle, waist-chain|संस्कृत मेखला',
      'मेघराज|Meghraj|b|बादलों के राजा (इंद्र)|King of clouds|संस्कृत मेघ + राज'
    ],
    /* ───────── 11 पूर्वा फाल्गुनी ───────── */
    'मो': [
      'मोहन|Mohan|b|मोहने वाला (कृष्ण)|Enchanting one (Krishna)|संस्कृत मोहन',
      'मोहिनी|Mohini|g|मोहने वाली (विष्णु का रूप)|Enchantress|संस्कृत मोहिनी',
      'मोक्ष|Moksh|u|मुक्ति|Liberation|संस्कृत मोक्ष',
      'मोक्षिता|Mokshita|g|मुक्त|Liberated|संस्कृत मोक्ष',
      'मोक्षदा|Mokshada|g|मोक्ष देने वाली|Giver of liberation|संस्कृत मोक्ष + दा',
      'मोहित|Mohit|b|मोहित|Enchanted|संस्कृत मोहित',
      'मोहिता|Mohita|g|मोहित|Enchanted|संस्कृत मोहित',
      'मोद|Mod|b|आनंद|Joy|संस्कृत मोद',
      'मोहनीश|Mohnish|b|मोहन का ईश|Lord of enchantment|संस्कृत मोहन + ईश',
      'मोक्षित|Mokshit|b|मुक्त|Liberated|संस्कृत मोक्ष',
      'मोहनलाल|Mohanlal|b|प्रिय मोहन|Beloved Mohan|संस्कृत मोहन + लाल',
      'मोहनदास|Mohandas|b|मोहन (कृष्ण) का सेवक|Servant of Mohan (Krishna)|संस्कृत मोहन + दास'
    ],
    'टा': [
      'तारा|Tara|g|तारा|Star|संस्कृत तारा|f',
      'तारक|Tarak|b|तारने वाला; तारा|Saviour; star|संस्कृत तारक|f',
      'तारिका|Tarika|g|छोटा तारा|Little star|संस्कृत तारिका|f',
      'तारेश|Taresh|b|तारों के स्वामी (चंद्र)|Lord of stars (Moon)|संस्कृत तारा + ईश|f'
    ],
    'टी': [
      'टीका|Tika|g|तिलक, शुभ चिह्न|Auspicious mark|संस्कृत टीका',
      'टीकम|Tikam|b|त्रिविक्रम (विष्णु/कृष्ण) का राजस्थानी-गुजराती रूप|Regional form of Trivikrama (Vishnu)|संस्कृत त्रिविक्रम',
      'तीर्थ|Tirth|b|पवित्र स्थान|Holy place|संस्कृत तीर्थ|f',
      'तीर्था|Tirtha|g|पवित्र|Sacred|संस्कृत तीर्थ|f',
      'तीस्ता|Teesta|g|हिमालय की नदी|Himalayan river|संस्कृत त्रिस्रोता|f',
      'तीर्थेश|Tirthesh|b|तीर्थों के स्वामी|Lord of holy places|संस्कृत तीर्थ + ईश|f'
    ],
    'टू': [
      'तुषार|Tushar|b|हिम, ओस|Snow, frost|संस्कृत तुषार|f',
      'तुलसी|Tulsi|g|पवित्र तुलसी|Holy basil|संस्कृत तुलसी|f',
      'तुहिन|Tuhin|b|हिम|Snow|संस्कृत तुहिन|f',
      'तुलिका|Tulika|g|चित्रकार की कूची|Paintbrush|संस्कृत तूलिका|f'
    ],
    /* ───────── 12 उत्तरा फाल्गुनी ───────── */
    'टे': [
      'तेजस|Tejas|b|तेज, कांति|Radiance|संस्कृत तेजस्|f',
      'तेजस्वी|Tejasvi|u|तेजवान|Radiant|संस्कृत तेजस्विन्|f',
      'तेजल|Tejal|g|तेज से भरी|Radiant|संस्कृत तेज|f',
      'तेजांश|Tejansh|b|तेज का अंश|Part of radiance|संस्कृत तेज + अंश|f'
    ],
    'टो': [
      'तोष|Tosh|b|संतोष|Contentment|संस्कृत तोष|f',
      'तोषित|Toshit|b|संतुष्ट|Satisfied|संस्कृत तोषित|f',
      'तोषिणी|Toshini|g|संतोष देने वाली|Giver of contentment|संस्कृत तोषिणी|f'
    ],
    'पा': [
      'पार्थ|Parth|b|अर्जुन, पृथा के पुत्र|Arjuna, son of Pritha|संस्कृत पार्थ',
      'पार्वती|Parvati|g|पर्वतराज की पुत्री|Daughter of the mountain king|संस्कृत पार्वती',
      'पाखी|Pakhi|g|पक्षी|Bird|संस्कृत पक्षी (पाखी)',
      'पावन|Paavan|b|पवित्र|Pure|संस्कृत पावन',
      'पावनी|Pavani|g|पवित्र करने वाली|Purifier|संस्कृत पावनी',
      'पारस|Paras|u|स्पर्श-मणि (लोहे को सोना बनाने वाला)|Philosopher\'s stone|संस्कृत पारस',
      'पारुल|Parul|g|एक सुगंधित पुष्प|A fragrant flower|संस्कृत पारुल',
      'पार्थिव|Parthiv|b|पृथ्वी से संबंधित; राजा|Earthly; king|संस्कृत पार्थिव',
      'पारिजात|Parijat|u|स्वर्ग का पुष्प, हरसिंगार|Celestial coral jasmine|संस्कृत पारिजात',
      'पाणिनि|Panini|b|महान वैयाकरण|Great grammarian|संस्कृत पाणिनि',
      'पावक|Pavak|b|अग्नि|Fire|संस्कृत पावक',
      'पारमिता|Paramita|g|पूर्णता, श्रेष्ठता|Perfection|संस्कृत पारमिता'
    ],
    'पी': [
      'पीयूष|Piyush|b|अमृत|Nectar|संस्कृत पीयूष',
      'पीतांबर|Pitambar|b|पीले वस्त्र वाले (विष्णु)|Wearer of yellow robes (Vishnu)|संस्कृत पीताम्बर',
      'पीहू|Peehu|g|मोर की मधुर पुकार|Peacock\'s call|हिंदी पीहू'
    ],
    /* ───────── 13 हस्त ───────── */
    'पू': [
      'पूजा|Pooja|g|आराधना, पूजन|Worship|संस्कृत पूजा',
      'पूनम|Poonam|g|पूर्णिमा|Full-moon night|संस्कृत पूर्णिमा',
      'पूर्णिमा|Purnima|g|पूर्ण चंद्र की तिथि|Full-moon day|संस्कृत पूर्णिमा',
      'पूर्णा|Purna|g|पूर्ण, संपूर्ण|Complete|संस्कृत पूर्णा',
      'पूर्वा|Purva|g|पूर्व दिशा; एक नक्षत्र|East; a nakshatra|संस्कृत पूर्वा',
      'पूर्वी|Purvi|g|पूर्व की; एक राग|Eastern; a raga|संस्कृत पूर्वी',
      'पूजित|Poojit|b|पूजा गया|Worshipped|संस्कृत पूजित',
      'पूषण|Pushan|b|पोषण करने वाले सूर्य देव|Nourishing Sun god|वैदिक पूषन्',
      'पूजन|Poojan|b|पूजा|Worship|संस्कृत पूजन',
      'पुष्कर|Pushkar|b|कमल; पवित्र तीर्थ|Lotus; holy lake|संस्कृत पुष्कर|f',
      'पुष्पा|Pushpa|g|फूल|Flower|संस्कृत पुष्प|f',
      'पुनीत|Punit|b|पवित्र|Pure|संस्कृत पुनीत|f',
      'पुनीता|Punita|g|पवित्र|Pure|संस्कृत पुनीता|f',
      'पुरु|Puru|b|प्राचीन चंद्रवंशी राजा|Ancient Chandravanshi king|वैदिक पुरु|f',
      'पुरुषोत्तम|Purushottam|b|श्रेष्ठ पुरुष (राम/विष्णु)|Supreme being|संस्कृत पुरुषोत्तम|f',
      'पुलकित|Pulkit|b|रोमांचित, प्रसन्न|Thrilled, delighted|संस्कृत पुलकित|f',
      'पुष्पेंद्र|Pushpendra|b|पुष्पों के राजा|King of flowers|संस्कृत पुष्प + इन्द्र|f'
    ],
    'ष': [
      'षण्मुख|Shanmukh|b|छह मुख वाले (कार्तिकेय)|Six-faced (Kartikeya)|संस्कृत षट् + मुख',
      'षडानन|Shadanan|b|छह मुखों वाले (कार्तिकेय)|Six-faced (Kartikeya)|संस्कृत षट् + आनन',
      'षोडशी|Shodashi|g|देवी त्रिपुरसुंदरी|Goddess Tripura Sundari|संस्कृत षोडशी'
    ],
    'ण': [],
    'ठ': [
      'ठाकुर|Thakur|b|स्वामी, प्रभु|Lord, master|संस्कृत ठक्कुर',
      'ठाकुरदास|Thakurdas|b|प्रभु का दास|Servant of the Lord|संस्कृत ठाकुर + दास'
    ],
    /* ───────── 14 चित्रा ───────── */
    'पे': [
      'पेरुमल|Perumal|b|भगवान विष्णु का तमिल नाम|Tamil name of Vishnu|तमिल पेरुमाळ',
      'प्रेम|Prem|b|प्रेम, स्नेह|Love|संस्कृत प्रेम|f',
      'प्रेमा|Prema|g|प्रेम|Love|संस्कृत प्रेमा|f',
      'प्रेरणा|Prerna|g|प्रेरणा|Inspiration|संस्कृत प्रेरणा|f',
      'प्रेक्षा|Preksha|g|दृष्टि, चिंतन|Vision, contemplation|संस्कृत प्रेक्षा|f',
      'प्रेरित|Prerit|b|प्रेरणा पाया हुआ|Inspired|संस्कृत प्रेरित|f'
    ],
    'पो': [
      'पौलोमी|Paulomi|g|इंद्राणी (शची)|Indrani (Shachi)|संस्कृत पौलोमी|f',
      'पौर्णमी|Paurnami|g|पूर्णिमा की|Of the full moon|संस्कृत पौर्णमी|f',
      'पौरव|Paurav|b|राजा पुरु के वंशज|Descendant of King Puru|संस्कृत पौरव|f',
      'पौलस्त्य|Paulastya|b|पुलस्त्य ऋषि के वंशज|Descendant of Sage Pulastya|संस्कृत पौलस्त्य|f'
    ],
    'रा': [
      'राम|Ram|b|आनंद देने वाले|Pleasing; Lord Rama|संस्कृत राम',
      'राधा|Radha|g|श्रीकृष्ण की प्रिया|Beloved of Krishna|संस्कृत राधा',
      'राज|Raj|b|राजा, शासक|King, ruler|संस्कृत राज',
      'राजेश|Rajesh|b|राजाओं के स्वामी|Lord of kings|संस्कृत राज + ईश',
      'राहुल|Rahul|b|सक्षम; बुद्ध के पुत्र|Capable; son of Buddha|संस्कृत राहुल',
      'राधिका|Radhika|g|राधा का स्नेहपूर्ण नाम|Another name of Radha|संस्कृत राधिका',
      'राघव|Raghav|b|रघुकुल में जन्मे (राम)|Of the Raghu dynasty (Rama)|संस्कृत राघव',
      'राकेश|Rakesh|b|चंद्रमा, पूर्णिमा के स्वामी|Moon|संस्कृत राका + ईश',
      'रागिनी|Ragini|g|संगीत की रागिनी|A melody|संस्कृत रागिणी',
      'राजीव|Rajiv|b|कमल|Lotus|संस्कृत राजीव',
      'रानी|Rani|g|राज्ञी|Queen|संस्कृत राज्ञी',
      'राशि|Rashi|g|ढेर, राशि-चक्र|Zodiac sign; heap|संस्कृत राशि',
      'राजन|Rajan|b|राजा|King|संस्कृत राजन्',
      'राजेंद्र|Rajendra|b|राजाओं के राजा|King of kings|संस्कृत राज + इन्द्र',
      'राका|Raka|g|पूर्णिमा की रात|Full-moon night|संस्कृत राका',
      'रामा|Rama|g|लक्ष्मी; सुंदर स्त्री|Lakshmi; charming woman|संस्कृत रमा',
      'राजश्री|Rajshri|g|राजसी शोभा|Royal splendour|संस्कृत राज + श्री',
      'राजकुमार|Rajkumar|b|राजपुत्र|Prince|संस्कृत राज + कुमार',
      'रात्रि|Ratri|g|रात|Night|संस्कृत रात्रि',
      'राधेश्याम|Radheshyam|b|राधा और श्याम (कृष्ण)|Radha and Shyam|संस्कृत राधा + श्याम',
      'रामचंद्र|Ramchandra|b|चंद्रमा जैसे राम|Rama, moon-like|संस्कृत राम + चन्द्र',
      'राजदीप|Rajdeep|b|राजसी दीपक|Royal lamp|संस्कृत राज + दीप',
      'राजलक्ष्मी|Rajlakshmi|g|राजसी लक्ष्मी|Royal Lakshmi|संस्कृत राज + लक्ष्मी',
      'राघवेंद्र|Raghavendra|b|रघुवंशियों के स्वामी|Lord of the Raghus|संस्कृत राघव + इन्द्र',
      'रामेश्वर|Rameshwar|b|राम के ईश्वर (शिव)|Lord of Rama (Shiva)|संस्कृत राम + ईश्वर',
      'रामकृष्ण|Ramkrishna|b|राम और कृष्ण|Rama and Krishna|संस्कृत राम + कृष्ण',
      'राजेश्वरी|Rajeshwari|g|राजराजेश्वरी देवी|Goddess Rajarajeshwari|संस्कृत राज + ईश्वरी',
      'रामानुज|Ramanuj|b|राम के छोटे भाई; आचार्य|Rama\'s younger brother; Acharya|संस्कृत राम + अनुज',
      'रामदास|Ramdas|b|राम के सेवक|Servant of Rama|संस्कृत राम + दास'
    ],
    'री': [
      'रीति|Riti|g|परंपरा, चलन|Tradition, custom|संस्कृत रीति',
      'रीतिका|Ritika|g|प्रवाह, धारा|Flow, stream|संस्कृत रीति',
      'रीवा|Reeva|g|नर्मदा नदी का नाम|Another name of the Narmada|संस्कृत रेवा'
    ],
    /* ───────── 15 स्वाति ───────── */
    'रू': [
      'रूपा|Roopa|g|सुंदरता, रूप|Beauty, form|संस्कृत रूप',
      'रूपेश|Roopesh|b|रूप के स्वामी|Lord of beauty|संस्कृत रूप + ईश',
      'रूपाली|Roopali|g|सुंदर|Beautiful|संस्कृत रूप',
      'रूपिका|Roopika|g|सुंदर रूप वाली|Of beautiful form|संस्कृत रूप',
      'रूपक|Roopak|b|उपमा; एक ताल|Metaphor; a rhythmic cycle|संस्कृत रूपक',
      'रूपल|Roopal|g|चाँदी जैसी|Silvery|संस्कृत रूप्य',
      'रूपांशी|Roopanshi|g|रूप का अंश|Part of beauty|संस्कृत रूप + अंश',
      'रूपेंद्र|Roopendra|b|रूपवानों के राजा|Lord of beauty|संस्कृत रूप + इन्द्र',
      'रुद्र|Rudra|b|शिव का रौद्र रूप|Fierce form of Shiva|संस्कृत रुद्र|f',
      'रुद्राक्ष|Rudraksh|b|शिव का नेत्र; पवित्र माला-बीज|Eye of Shiva; sacred bead|संस्कृत रुद्र + अक्ष|f',
      'रुक्मिणी|Rukmini|g|श्रीकृष्ण की पटरानी|Chief queen of Krishna|संस्कृत रुक्मिणी|f',
      'रुचि|Ruchi|g|रुचि, स्वाद, चमक|Taste, interest, lustre|संस्कृत रुचि|f',
      'रुचिका|Ruchika|g|सुंदर, प्रकाशमान|Charming, bright|संस्कृत रुचिका|f',
      'रुचिर|Ruchir|u|मनोहर|Charming|संस्कृत रुचिर|f'
    ],
    'रे': [
      'रेवा|Reva|g|नर्मदा नदी|River Narmada|संस्कृत रेवा',
      'रेवती|Revati|g|बलराम की पत्नी; एक नक्षत्र|Balarama\'s wife; a nakshatra|संस्कृत रेवती',
      'रेवंत|Revant|b|सूर्य-पुत्र, घुड़सवार|Son of the Sun, rider|संस्कृत रेवन्त',
      'रेणु|Renu|g|धूलकण, पराग|Pollen, fine dust|संस्कृत रेणु',
      'रेणुका|Renuka|g|परशुराम की माता|Mother of Parashurama|संस्कृत रेणुका',
      'रेखा|Rekha|g|लकीर, रेखा|Line|संस्कृत रेखा',
      'रेवत|Revat|b|एक प्राचीन राजा/पर्वत|An ancient king; a mountain|संस्कृत रेवत',
      'रेयांश|Reyansh|b|प्रकाश की किरण|Ray of light|संस्कृत रे + अंश'
    ],
    'रो': [
      'रोहन|Rohan|b|ऊपर उठने वाला|Ascending|संस्कृत रोहण',
      'रोहित|Rohit|b|लाल रंग|Red|संस्कृत रोहित',
      'रोहिणी|Rohini|g|चंद्र की प्रिय पत्नी; एक नक्षत्र|Moon\'s beloved; a nakshatra|संस्कृत रोहिणी',
      'रोचना|Rochana|g|दीप्तिमान|Radiant|संस्कृत रोचना',
      'रोहिताश्व|Rohitashva|b|राजा हरिश्चंद्र के पुत्र|Son of King Harishchandra|पौराणिक'
    ],
    'ता': [
      'तारा|Tara|g|तारा|Star|संस्कृत तारा',
      'तारक|Tarak|b|तारने वाला|Saviour|संस्कृत तारक',
      'तारिणी|Tarini|g|तारने वाली (दुर्गा)|Saviour (Durga)|संस्कृत तारिणी',
      'तारकेश|Tarakesh|b|तारों के स्वामी|Lord of stars|संस्कृत तारक + ईश',
      'तारिका|Tarika|g|छोटा तारा|Little star|संस्कृत तारिका',
      'तारेश|Taresh|b|तारों के स्वामी|Lord of stars|संस्कृत तारा + ईश',
      'तान्वी|Tanvi|g|कोमल देह वाली|Delicate|संस्कृत तन्वी',
      'ताराचंद|Tarachand|b|तारा और चंद्र|Star and moon|संस्कृत तारा + चन्द्र',
      'तारुण्य|Tarunya|b|यौवन|Youth|संस्कृत तारुण्य',
      'तापस|Tapas|b|तपस्वी|Ascetic|संस्कृत तापस',
      'तापसी|Tapasi|g|तपस्विनी|Woman ascetic|संस्कृत तापसी',
      'तारकनाथ|Taraknath|b|तारने वाले नाथ (शिव)|Lord who saves (Shiva)|संस्कृत तारक + नाथ'
    ],
    /* ───────── 16 विशाखा ───────── */
    'ती': [
      'तीर्थ|Tirth|b|पवित्र स्थान|Holy place|संस्कृत तीर्थ',
      'तीर्थंकर|Tirthankar|b|जैन धर्म के उपदेशक|Jain teacher-saint|संस्कृत तीर्थङ्कर',
      'तीर्था|Tirtha|g|पवित्र|Sacred|संस्कृत तीर्थ',
      'तीर्थराज|Tirthraj|b|तीर्थों के राजा (प्रयाग)|King of holy places (Prayag)|संस्कृत तीर्थ + राज',
      'तीर्थेश|Tirthesh|b|तीर्थों के स्वामी|Lord of holy places|संस्कृत तीर्थ + ईश',
      'तीरथ|Tirath|b|तीर्थ|Pilgrimage|संस्कृत तीर्थ',
      'तीस्ता|Teesta|g|हिमालय की नदी|Himalayan river|संस्कृत त्रिस्रोता',
      'तीव्र|Teevra|b|प्रबल, तेज़|Intense, swift|संस्कृत तीव्र'
    ],
    'तू': [
      'तुलसी|Tulsi|g|पवित्र तुलसी|Holy basil|संस्कृत तुलसी|f',
      'तुषार|Tushar|b|हिम, ओस|Snow, frost|संस्कृत तुषार|f',
      'तुषारिका|Tusharika|g|हिमकण|Snowflake|संस्कृत तुषार|f',
      'तुलिका|Tulika|g|चित्रकार की कूची|Paintbrush|संस्कृत तूलिका|f',
      'तुहिन|Tuhin|b|हिम|Snow|संस्कृत तुहिन|f',
      'तुहिना|Tuhina|g|हिम, ओस|Snow, dew|संस्कृत तुहिना|f',
      'तुंगनाथ|Tungnath|b|ऊँचाई के स्वामी (शिव)|Lord of the heights (Shiva)|संस्कृत तुङ्ग + नाथ|f',
      'तुषित|Tushit|b|संतुष्ट|Satisfied|संस्कृत तुषित|f',
      'तुर्वसु|Turvasu|b|राजा ययाति के पुत्र|Son of King Yayati|वैदिक तुर्वसु|f'
    ],
    'ते': [
      'तेजस|Tejas|b|तेज, कांति|Radiance|संस्कृत तेजस्',
      'तेजस्वी|Tejasvi|u|तेजवान|Radiant|संस्कृत तेजस्विन्',
      'तेजस्विनी|Tejasvini|g|तेजवान स्त्री|Radiant woman|संस्कृत तेजस्विनी',
      'तेजल|Tejal|g|तेज से भरी|Radiant|संस्कृत तेज',
      'तेजेश|Tejesh|b|तेज के स्वामी|Lord of radiance|संस्कृत तेज + ईश',
      'तेजेंद्र|Tejendra|b|तेज के राजा|King of radiance|संस्कृत तेज + इन्द्र',
      'तेजांश|Tejansh|b|तेज का अंश|Part of radiance|संस्कृत तेज + अंश',
      'तेजराज|Tejraj|b|तेज के राजा|King of radiance|संस्कृत तेज + राज'
    ],
    'तो': [
      'तोष|Tosh|b|संतोष|Contentment|संस्कृत तोष',
      'तोषित|Toshit|b|संतुष्ट|Satisfied|संस्कृत तोषित',
      'तोषिणी|Toshini|g|संतोष देने वाली|Giver of contentment|संस्कृत तोषिणी',
      'तोषण|Toshan|b|प्रसन्न करने वाला|One who pleases|संस्कृत तोषण'
    ],
    /* ───────── 17 अनुराधा ───────── */
    'ना': [
      'नारायण|Narayan|b|भगवान विष्णु|Lord Vishnu|संस्कृत नारायण',
      'नारायणी|Narayani|g|देवी लक्ष्मी / दुर्गा|Goddess Lakshmi / Durga|संस्कृत नारायणी',
      'नाद|Naad|u|दिव्य ध्वनि|Sacred sound|संस्कृत नाद',
      'नादिनी|Nadini|g|मधुर ध्वनि करने वाली|Melodious one|संस्कृत नादिनी',
      'नागेश|Nagesh|b|नागों के स्वामी (शिव)|Lord of serpents (Shiva)|संस्कृत नाग + ईश',
      'नागराज|Nagraj|b|नागों के राजा|King of serpents|संस्कृत नाग + राज',
      'नानक|Nanak|b|सिखों के प्रथम गुरु|First Sikh Guru|पंजाबी/संस्कृत',
      'नारद|Narad|b|देवर्षि नारद|Divine sage Narada|पौराणिक',
      'नायक|Nayak|b|नेता, नायक|Leader, hero|संस्कृत नायक',
      'नाचिकेत|Nachiket|b|कठोपनिषद का जिज्ञासु बालक|Seeker boy of the Katha Upanishad|संस्कृत नाचिकेत',
      'नामदेव|Namdev|b|संत नामदेव|Saint Namdev|संस्कृत नाम + देव',
      'नायिका|Nayika|g|नायिका, नेत्री|Heroine|संस्कृत नायिका',
      'नागार्जुन|Nagarjun|b|महान बौद्ध दार्शनिक|Great Buddhist philosopher|संस्कृत नागार्जुन'
    ],
    'नी': [
      'नीरज|Neeraj|b|कमल|Lotus|संस्कृत नीरज',
      'नीरजा|Neerja|g|कमल जैसी|Lotus-like|संस्कृत नीरजा',
      'नीलम|Neelam|g|नीलम रत्न|Sapphire|संस्कृत नीलम',
      'नीलिमा|Neelima|g|नीलापन|Blueness|संस्कृत नीलिमा',
      'नीरव|Neerav|b|शांत, निःशब्द|Silent, calm|संस्कृत नीरव',
      'नीलेश|Neelesh|b|नील के स्वामी|Lord of blue|संस्कृत नील + ईश',
      'नीलकंठ|Neelkanth|b|नीले कंठ वाले (शिव)|Blue-throated (Shiva)|संस्कृत नीलकण्ठ',
      'नीता|Neeta|g|मार्गदर्शित, नीतिवान|Guided, righteous|संस्कृत नीता',
      'नीति|Neeti|g|नीति, सदाचार|Ethics|संस्कृत नीति',
      'नीतीश|Neetish|b|नीति के स्वामी|Lord of ethics|संस्कृत नीति + ईश',
      'नीरा|Neera|g|जल|Water|संस्कृत नीर',
      'नीहारिका|Neeharika|g|तारों का समूह; ओस|Nebula; mist|संस्कृत नीहार',
      'नीहार|Neehar|b|ओस, कुहासा|Dew, mist|संस्कृत नीहार',
      'नीलाक्षी|Neelakshi|g|नीली आँखों वाली|Blue-eyed|संस्कृत नील + अक्षि',
      'नीलांजना|Neelanjana|g|नीला काजल|Blue collyrium|संस्कृत नीलाञ्जना',
      'नीलांबर|Neelambar|b|नीला आकाश|Blue sky|संस्कृत नील + अम्बर',
      'नीलांश|Neelansh|b|नीले का अंश|Part of blue|संस्कृत नील + अंश'
    ],
    'नू': [
      'नूपुर|Nupur|g|पायल|Anklet|संस्कृत नूपुर',
      'नूतन|Nutan|u|नया, नवीन|New|संस्कृत नूतन'
    ],
    'ने': [
      'नेहा|Neha|g|स्नेह, प्रेम|Affection|संस्कृत स्नेह',
      'नेत्र|Netra|b|आँख|Eye|संस्कृत नेत्र',
      'नेत्रा|Netra|g|आँख; मार्गदर्शक|Eye; guide|संस्कृत नेत्र',
      'नेमि|Nemi|b|पहिये की परिधि; तीर्थंकर|Rim of a wheel; a Tirthankar|संस्कृत नेमि',
      'नेमीनाथ|Neminath|b|बाईसवें जैन तीर्थंकर|22nd Jain Tirthankar|संस्कृत नेमि + नाथ',
      'नेहल|Nehal|g|स्नेहमयी|Affectionate|संस्कृत स्नेह'
    ],
    /* ───────── 18 ज्येष्ठा ───────── */
    'नो': [
      'नंदन|Nandan|b|आनंद देने वाला; पुत्र|Delighter; son|संस्कृत नन्दन|f',
      'नंदिनी|Nandini|g|आनंद देने वाली; पुत्री|Delighter; daughter|संस्कृत नन्दिनी|f',
      'नमन|Naman|b|प्रणाम|Salutation|संस्कृत नमन|f',
      'नमिता|Namita|g|विनम्र|Humble|संस्कृत नमिता|f',
      'नवीन|Naveen|b|नया|New|संस्कृत नवीन|f',
      'नव्या|Navya|g|नवीन, सुंदर|New, graceful|संस्कृत नव्य|f'
    ],
    'या': [
      'यामिनी|Yamini|g|रात्रि|Night|संस्कृत यामिनी',
      'यादव|Yadav|b|यदुवंशी|Of the Yadu dynasty|संस्कृत यादव',
      'यादवी|Yadavi|g|यदुवंश की कन्या|Daughter of the Yadus|संस्कृत यादवी',
      'याज्ञवल्क्य|Yajnavalkya|b|वैदिक महर्षि|Great Vedic sage|वैदिक',
      'यामी|Yami|g|यमराज की बहन; यमुना|Sister of Yama; Yamuna|वैदिक यमी',
      'याज्ञिक|Yagnik|b|यज्ञ करने वाला|Performer of yajna|संस्कृत याज्ञिक',
      'यादवेंद्र|Yadavendra|b|यादवों के राजा|King of the Yadavas|संस्कृत यादव + इन्द्र'
    ],
    'यी': [
      'यश|Yash|b|कीर्ति, सफलता|Fame, success|संस्कृत यशस्|f',
      'यशस्वी|Yashasvi|u|यशवान|Famous|संस्कृत यशस्विन्|f',
      'यशस्विनी|Yashasvini|g|यशवान स्त्री|Famous woman|संस्कृत यशस्विनी|f',
      'यशवंत|Yashwant|b|यशवान|Glorious|संस्कृत यशवन्त|f',
      'यशिका|Yashika|g|यश से युक्त|Full of fame|संस्कृत यशस्|f',
      'यशोदा|Yashoda|g|कृष्ण की पालक माता|Foster mother of Krishna|संस्कृत यशोदा|f',
      'यशोधरा|Yashodhara|g|बुद्ध की पत्नी|Wife of the Buddha|संस्कृत यशोधरा|f',
      'यज्ञ|Yagya|b|यज्ञ|Sacred ritual|संस्कृत यज्ञ|f'
    ],
    'यू': [
      'यूथिका|Yoothika|g|जूही का फूल|Jasmine flower|संस्कृत यूथिका',
      'युवराज|Yuvraj|b|राजकुमार|Crown prince|संस्कृत युवराज|f',
      'युक्ति|Yukti|g|उपाय, बुद्धिमानी|Skill, strategy|संस्कृत युक्ति|f',
      'युग|Yug|b|काल-खंड|Era|संस्कृत युग|f',
      'युधिष्ठिर|Yudhishthir|b|युद्ध में स्थिर|Steadfast in battle|महाभारत|f',
      'युयुत्सु|Yuyutsu|b|योद्धा, युद्ध की इच्छा वाला|Warrior|महाभारत|f',
      'युक्ता|Yukta|g|जुड़ी हुई, योगयुक्त|United, endowed|संस्कृत युक्ता|f'
    ],
    /* ───────── 19 मूल ───────── */
    'ये': [
      'यमुना|Yamuna|g|पवित्र नदी|Sacred river|संस्कृत यमुना|f',
      'यतीश|Yatish|b|संन्यासियों के स्वामी|Lord of ascetics|संस्कृत यति + ईश|f',
      'यतिन|Yatin|b|संयमी|Self-controlled|संस्कृत यतिन्|f',
      'यशराज|Yashraj|b|यश के राजा|King of glory|संस्कृत यश + राज|f',
      'यतीन्द्र|Yatindra|b|संयमियों के राजा|Chief of the self-controlled|संस्कृत यति + इन्द्र|f'
    ],
    'यो': [
      'योगेश|Yogesh|b|योग के स्वामी|Lord of yoga|संस्कृत योग + ईश',
      'योगिता|Yogita|g|योग-युक्त|One who practises yoga|संस्कृत योगिता',
      'योगेंद्र|Yogendra|b|योगियों के राजा|Chief of yogis|संस्कृत योग + इन्द्र',
      'योगिनी|Yogini|g|योग साधिका|Woman yogi|संस्कृत योगिनी',
      'योगेश्वर|Yogeshwar|b|योग के ईश्वर (कृष्ण)|Lord of yoga (Krishna)|संस्कृत योग + ईश्वर',
      'योगराज|Yograj|b|योगियों के राजा|King of yoga|संस्कृत योग + राज',
      'योगमाया|Yogmaya|g|देवी योगमाया|Goddess Yogamaya|संस्कृत योगमाया'
    ],
    'भा': [
      'भावना|Bhavna|g|भाव, विचार|Feeling, sentiment|संस्कृत भावना',
      'भारत|Bharat|b|भरत वंश; हमारा देश|Dynasty of Bharata; India|संस्कृत भारत',
      'भारती|Bharati|g|सरस्वती|Saraswati|संस्कृत भारती',
      'भावेश|Bhavesh|b|भावों के स्वामी|Lord of emotions|संस्कृत भाव + ईश',
      'भानु|Bhanu|b|सूर्य|Sun|संस्कृत भानु',
      'भास्कर|Bhaskar|b|सूर्य, प्रकाश देने वाला|Sun, light-maker|संस्कृत भास्कर',
      'भाविका|Bhavika|g|भावपूर्ण, भक्तिमती|Devoted, sentimental|संस्कृत भाविका',
      'भाविन|Bhavin|b|भावुक, भावयुक्त|Sentimental|संस्कृत भाविन्',
      'भानवी|Bhanvi|g|सूर्य की किरण|Ray of the Sun|संस्कृत भानु',
      'भाग्यश्री|Bhagyashree|g|सौभाग्य की देवी|Fortune and grace|संस्कृत भाग्य + श्री',
      'भामिनी|Bhamini|g|तेजस्वी स्त्री|Radiant woman|संस्कृत भामिनी',
      'भार्गव|Bhargav|b|भृगु ऋषि के वंशज|Descendant of Sage Bhrigu|संस्कृत भार्गव',
      'भाव्या|Bhavya|g|भव्य, शुभ|Grand, auspicious|संस्कृत भव्य',
      'भास्वर|Bhaswar|b|चमकीला|Shining|संस्कृत भास्वर',
      'भानुप्रिया|Bhanupriya|g|सूर्य को प्रिय|Beloved of the Sun|संस्कृत भानु + प्रिया',
      'भागीरथ|Bhagirath|b|गंगा को धरती पर लाने वाले राजा|King who brought Ganga to earth|पौराणिक',
      'भागीरथी|Bhagirathi|g|गंगा नदी|River Ganga|संस्कृत भागीरथी',
      'भानुमती|Bhanumati|g|तेजस्विनी|Radiant woman|संस्कृत भानुमती',
      'भारद्वाज|Bhardwaj|b|महर्षि भरद्वाज के वंशज|Descendant of Sage Bharadvaja|वैदिक'
    ],
    'भी': [
      'भीम|Bheem|b|विशाल, शक्तिशाली; पांडव|Mighty; a Pandava|संस्कृत भीम',
      'भीष्म|Bhishma|b|कठोर प्रतिज्ञा वाले|One of terrible vow|संस्कृत भीष्म',
      'भीमा|Bheema|g|एक नदी; देवी|A river; a goddess|संस्कृत भीमा',
      'भीमसेन|Bhimsen|b|पांडव भीम|Bhima the Pandava|संस्कृत भीमसेन',
      'भीमराव|Bhimrao|b|भीम जैसा बलशाली|Mighty like Bhima|संस्कृत भीम + राव',
      'भीमाशंकर|Bhimashankar|b|एक ज्योतिर्लिंग|A Jyotirlinga|संस्कृत भीमाशङ्कर'
    ],
    /* ───────── 20 पूर्वाषाढ़ा ───────── */
    'भू': [
      'भूमि|Bhoomi|g|पृथ्वी|Earth|संस्कृत भूमि',
      'भूमिका|Bhoomika|g|भूमि; भूमिका|Earth; role|संस्कृत भूमिका',
      'भूपेंद्र|Bhupendra|b|पृथ्वी के राजा|King of the earth|संस्कृत भू + इन्द्र',
      'भूपेश|Bhupesh|b|पृथ्वी के स्वामी|Lord of the earth|संस्कृत भू + ईश',
      'भूषण|Bhushan|b|आभूषण|Ornament|संस्कृत भूषण',
      'भूमिजा|Bhoomija|g|भूमि से जन्मी (सीता)|Born of earth (Sita)|संस्कृत भूमिजा',
      'भूतेश|Bhootesh|b|भूतों के स्वामी (शिव)|Lord of beings (Shiva)|संस्कृत भूत + ईश',
      'भूदेव|Bhudev|b|पृथ्वी के देवता|God of the earth|संस्कृत भू + देव',
      'भूपति|Bhupati|b|राजा|King|संस्कृत भू + पति',
      'भूषित|Bhushit|b|सुसज्जित|Adorned|संस्कृत भूषित',
      'भूपाल|Bhupal|b|पृथ्वी के पालक|Protector of the earth|संस्कृत भू + पाल'
    ],
    'धा': [
      'धारा|Dhara|g|प्रवाह; पृथ्वी|Stream; earth|संस्कृत धारा',
      'धारणा|Dharna|g|विचार, धारण करना|Concept; holding|संस्कृत धारणा',
      'धात्री|Dhatri|g|माता, पृथ्वी|Mother, earth|संस्कृत धात्री',
      'धारिणी|Dharini|g|धारण करने वाली|One who bears|संस्कृत धारिणी'
    ],
    'फा': [
      'फाल्गुनी|Falguni|g|फाल्गुन मास में जन्मी|Born in Phalguna|संस्कृत फाल्गुनी',
      'फाल्गुन|Falgun|b|फाल्गुन मास|Month of Phalguna|संस्कृत फाल्गुन',
      'फणीश|Phanish|b|शेषनाग (फणियों के स्वामी)|Lord of serpents|संस्कृत फणी + ईश|f',
      'फणींद्र|Phanindra|b|नागराज|King of serpents|संस्कृत फणी + इन्द्र|f'
    ],
    'ढा': [
      'धारा|Dhara|g|प्रवाह; पृथ्वी|Stream; earth|संस्कृत धारा|f',
      'धारणा|Dharna|g|विचार, धारण करना|Concept; holding|संस्कृत धारणा|f',
      'धात्री|Dhatri|g|माता, पृथ्वी|Mother, earth|संस्कृत धात्री|f'
    ],
    /* ───────── 21 उत्तराषाढ़ा ───────── */
    'भे': [
      'भैरव|Bhairav|b|शिव का रौद्र रूप|Fierce form of Shiva|संस्कृत भैरव|f',
      'भैरवी|Bhairavi|g|देवी; एक राग|Goddess; a raga|संस्कृत भैरवी|f'
    ],
    'भो': [
      'भोला|Bhola|b|सरल हृदय (शिव)|Innocent one (Shiva)|संस्कृत/हिंदी भोला',
      'भोलेनाथ|Bholenath|b|भोले शिव|Innocent Lord Shiva|हिंदी भोला + नाथ',
      'भोज|Bhoj|b|राजा भोज|King Bhoja|संस्कृत भोज',
      'भोजराज|Bhojraj|b|राजा भोज|King Bhoja|संस्कृत भोज + राज'
    ],
    'जा': [
      'जानकी|Janaki|g|राजा जनक की पुत्री (सीता)|Daughter of Janaka (Sita)|संस्कृत जानकी',
      'जाह्नवी|Jahnavi|g|गंगा नदी|River Ganga|संस्कृत जाह्नवी',
      'जाग्रति|Jagrati|g|जागरूकता|Awakening|संस्कृत जाग्रति',
      'जागृत|Jagrit|b|जागा हुआ|Awakened|संस्कृत जागृत',
      'जातवेद|Jatved|b|अग्नि|Fire (Agni)|वैदिक जातवेदस्'
    ],
    'जी': [
      'जीवन|Jeevan|u|जीवन|Life|संस्कृत जीवन',
      'जीविका|Jeevika|g|जीविका, जीवन-आधार|Livelihood|संस्कृत जीविका',
      'जीत|Jeet|u|विजय|Victory|हिंदी/संस्कृत जित्',
      'जीतेंद्र|Jitendra|b|इंद्रियों को जीतने वाला|Conqueror of the senses|संस्कृत जित + इन्द्र',
      'जीतेश|Jitesh|b|विजय के स्वामी|Lord of victory|संस्कृत जित + ईश',
      'जीवांश|Jeevansh|b|जीवन का अंश|Part of life|संस्कृत जीव + अंश',
      'जीविता|Jeevita|g|जीवंत|Alive|संस्कृत जीवित',
      'जीमूत|Jeemoot|b|बादल|Cloud|संस्कृत जीमूत'
    ],
    /* ───────── 22 श्रवण ───────── */
    'खी': [
      'खगेश|Khagesh|b|पक्षियों के राजा (गरुड़)|Lord of birds (Garuda)|संस्कृत खग + ईश|f',
      'खगेंद्र|Khagendra|b|पक्षियों के राजा|King of birds|संस्कृत खग + इन्द्र|f'
    ],
    'खू': [],
    'खे': [
      'क्षेम|Kshem|b|कल्याण, सुरक्षा|Welfare, safety|संस्कृत क्षेम|f',
      'क्षेमा|Kshema|g|कल्याणकारी|Auspicious|संस्कृत क्षेमा|f',
      'खेमराज|Khemraj|b|कल्याण के राजा|King of welfare|संस्कृत क्षेम + राज|f',
      'क्षितिज|Kshitij|b|आकाश की सीमा|Horizon|संस्कृत क्षितिज|f',
      'क्षमा|Kshama|g|क्षमा, धैर्य|Forgiveness|संस्कृत क्षमा|f',
      'क्षिप्रा|Kshipra|g|उज्जैन की नदी|River of Ujjain|संस्कृत क्षिप्रा|f'
    ],
    'खो': [],
    /* ───────── 23 धनिष्ठा ───────── */
    'गा': [
      'गार्गी|Gargi|g|वैदिक विदुषी ऋषिका|Vedic woman scholar|वैदिक गार्गी',
      'गायत्री|Gayatri|g|वेदमाता; पवित्र मंत्र|Mother of Vedas; sacred mantra|संस्कृत गायत्री',
      'गांधारी|Gandhari|g|धृतराष्ट्र की पत्नी|Wife of Dhritarashtra|महाभारत',
      'गाथा|Gatha|g|कथा, श्लोक|Verse, saga|संस्कृत गाथा',
      'गार्ग्य|Gargya|b|गर्ग ऋषि के वंशज|Descendant of Sage Garga|वैदिक',
      'गांगेय|Gangeya|b|गंगा-पुत्र (भीष्म)|Son of Ganga (Bhishma)|संस्कृत गाङ्गेय'
    ],
    'गी': [
      'गीता|Geeta|g|भगवद्गीता|The Bhagavad Gita|संस्कृत गीता',
      'गीतिका|Geetika|g|छोटा गीत|Short song|संस्कृत गीतिका',
      'गीतांजलि|Geetanjali|g|गीतों की भेंट|Offering of songs|संस्कृत गीत + अञ्जलि',
      'गीत|Geet|u|गीत|Song|संस्कृत गीत',
      'गीतेश|Geetesh|b|गीत के स्वामी|Lord of songs|संस्कृत गीत + ईश',
      'गीतांश|Geetansh|b|गीता का अंश|Part of the Gita|संस्कृत गीता + अंश'
    ],
    'गू': [
      'गुंजन|Gunjan|u|भँवरे की गुनगुन|Hum of bees|संस्कृत गुञ्जन|f',
      'गुंजा|Gunja|g|गुंजा (रत्ती) का बीज; मधुर ध्वनि|Red-black seed; hum|संस्कृत गुञ्जा|f',
      'गुणवंत|Gunwant|b|गुणी|Virtuous|संस्कृत गुणवन्त|f',
      'गुणाकर|Gunakar|b|गुणों की खान|Mine of virtues|संस्कृत गुण + आकर|f',
      'गुरुदेव|Gurudev|b|गुरु और देव|Divine teacher|संस्कृत गुरु + देव|f',
      'गुणवती|Gunvati|g|गुणों वाली|Virtuous woman|संस्कृत गुणवती|f'
    ],
    'गे': [
      'गगन|Gagan|b|आकाश|Sky|संस्कृत गगन|f',
      'गणेश|Ganesh|b|विघ्नहर्ता गणपति|Lord Ganesha|संस्कृत गणेश|f',
      'गजानन|Gajanan|b|गज के मुख वाले (गणेश)|Elephant-faced (Ganesha)|संस्कृत गज + आनन|f',
      'गरिमा|Garima|g|गौरव, महिमा|Dignity, grandeur|संस्कृत गरिमा|f',
      'गजेंद्र|Gajendra|b|हाथियों के राजा|King of elephants|संस्कृत गज + इन्द्र|f'
    ],
    /* ───────── 24 शतभिषा ───────── */
    'गो': [
      'गोपाल|Gopal|b|गायों के पालक (कृष्ण)|Protector of cows (Krishna)|संस्कृत गोपाल',
      'गोविंद|Govind|b|श्रीकृष्ण|Krishna|संस्कृत गोविन्द',
      'गोपी|Gopi|g|कृष्ण की सखी|Krishna\'s companion|संस्कृत गोपी',
      'गोपिका|Gopika|g|कृष्ण की सखी|Krishna\'s companion|संस्कृत गोपिका',
      'गोकुल|Gokul|b|कृष्ण का बाल्यस्थान|Krishna\'s childhood home|संस्कृत गोकुल',
      'गोपेश|Gopesh|b|गोपों के स्वामी (कृष्ण)|Lord of cowherds|संस्कृत गोप + ईश',
      'गोदावरी|Godavari|g|दक्षिण की पवित्र नदी|Sacred river of the south|संस्कृत गोदावरी',
      'गोमती|Gomti|g|एक पवित्र नदी|A sacred river|संस्कृत गोमती',
      'गोरक्ष|Gorakh|b|गुरु गोरखनाथ|Guru Gorakhnath|संस्कृत गोरक्ष',
      'गोवर्धन|Govardhan|b|कृष्ण द्वारा उठाया गया पर्वत|Mountain lifted by Krishna|संस्कृत गोवर्धन',
      'गोपीनाथ|Gopinath|b|गोपियों के नाथ (कृष्ण)|Lord of the gopis|संस्कृत गोपी + नाथ',
      'गोपालकृष्ण|Gopalkrishna|b|गोपाल कृष्ण|Gopal Krishna|संस्कृत गोपाल + कृष्ण',
      'गोपीचंद|Gopichand|b|गोपियों का चंद्रमा|Moon of the gopis|संस्कृत गोपी + चन्द्र',
      'गोदा|Goda|g|गोदावरी; आंडाल का नाम|Godavari; name of Andal|संस्कृत गोदा'
    ],
    'सा': [
      'सागर|Sagar|b|समुद्र|Ocean|संस्कृत सागर',
      'साक्षी|Sakshi|g|साक्षी, गवाह|Witness|संस्कृत साक्षी',
      'सारिका|Sarika|g|मैना पक्षी|Myna bird|संस्कृत सारिका',
      'सावित्री|Savitri|g|सत्यवान की पत्नी|Wife of Satyavan|संस्कृत सावित्री',
      'सारांश|Saransh|b|निचोड़, सार|Essence|संस्कृत सार + अंश',
      'सात्विक|Satvik|b|सत्वगुणी|Pure, virtuous|संस्कृत सात्त्विक',
      'सात्विका|Satvika|g|सात्विक स्वभाव वाली|Pure-natured|संस्कृत सात्त्विका',
      'सान्वी|Sanvi|g|देवी लक्ष्मी का एक नाम|A name of Lakshmi|संस्कृत सान्वी',
      'साधना|Sadhana|g|तप, अभ्यास|Spiritual practice|संस्कृत साधना',
      'सारथी|Sarthi|b|रथ-चालक|Charioteer|संस्कृत सारथि',
      'सार्थक|Sarthak|b|अर्थपूर्ण|Meaningful|संस्कृत सार्थक',
      'सायली|Sayali|g|एक सुगंधित पुष्प|A fragrant flower|मराठी सायली',
      'सात्यकि|Satyaki|b|यदुवंशी योद्धा|Yadava warrior|महाभारत',
      'सागरिका|Sagarika|g|सागर की लहर|Wave of the sea|संस्कृत सागरिका',
      'सारंग|Sarang|b|मोर, हिरण, धनुष|Peacock, deer, bow|संस्कृत सारङ्ग',
      'सारंगी|Sarangi|g|एक वाद्य; हिरणी|A string instrument; doe|संस्कृत सारङ्गी',
      'सारस्वत|Saraswat|b|सरस्वती-भक्त|Devotee of Saraswati|संस्कृत सारस्वत'
    ],
    'सी': [
      'सीता|Sita|g|जनक पुत्री, राम की पत्नी|Daughter of Janaka, wife of Rama|संस्कृत सीता',
      'सीमा|Seema|g|सीमा|Boundary|संस्कृत सीमा',
      'सीमंत|Seemant|b|माँग; सीमा|Parting line; boundary|संस्कृत सीमन्त',
      'सीमंतिनी|Seemantini|g|सौभाग्यवती स्त्री|Married woman|संस्कृत सीमन्तिनी',
      'सीतांशु|Sitanshu|b|चंद्रमा (शीतल किरणों वाला)|Moon|संस्कृत सित + अंशु',
      'सीताराम|Sitaram|b|सीता और राम|Sita and Rama|संस्कृत सीता + राम',
      'सीताकांत|Sitakant|b|सीता के प्रिय (राम)|Beloved of Sita (Rama)|संस्कृत सीता + कान्त'
    ],
    'सू': [
      'सूर्य|Surya|b|सूर्य देव|Sun god|संस्कृत सूर्य',
      'सूरज|Suraj|b|सूर्य|Sun|हिंदी/संस्कृत सूर्य',
      'सूर्यांश|Suryansh|b|सूर्य का अंश|Part of the Sun|संस्कृत सूर्य + अंश',
      'सूर्यकांत|Suryakant|b|सूर्यकांत मणि|Sun-stone|संस्कृत सूर्य + कान्त',
      'सूरदास|Surdas|b|संत-कवि सूरदास|Saint-poet Surdas|हिंदी सूरदास',
      'सूर्यप्रकाश|Suryaprakash|b|सूर्य का प्रकाश|Sunlight|संस्कृत सूर्य + प्रकाश',
      'सूक्ति|Sukti|g|सुभाषित, सुंदर कथन|Wise saying|संस्कृत सूक्ति',
      'सूर्यभान|Suryabhan|b|सूर्य की किरण|Sun\'s ray|संस्कृत सूर्य + भानु'
    ],
    /* ───────── 25 पूर्वा भाद्रपद ───────── */
    'से': [
      'सेतु|Setu|b|पुल|Bridge|संस्कृत सेतु',
      'सेवंती|Sevanti|g|सफेद गुलाब / गुलदाउदी|White rose / chrysanthemum|संस्कृत सेवन्ती',
      'सेनजित|Senjit|b|सेना जीतने वाला|Conqueror of armies|संस्कृत सेना + जित्',
      'सेतुमाधव|Setumadhav|b|रामेश्वरम के भगवान विष्णु|Vishnu of Rameswaram|संस्कृत सेतु + माधव'
    ],
    'सो': [
      'सोम|Som|b|चंद्रमा|Moon|संस्कृत सोम',
      'सोमनाथ|Somnath|b|चंद्र के स्वामी; ज्योतिर्लिंग|Lord of the Moon; a Jyotirlinga|संस्कृत सोम + नाथ',
      'सोमेश|Somesh|b|चंद्र/शिव|Moon / Shiva|संस्कृत सोम + ईश',
      'सोनल|Sonal|g|सुनहरी|Golden|हिंदी/गुजराती सोना',
      'सोनाली|Sonali|g|सुनहरी|Golden|हिंदी सोना',
      'सोहम|Soham|b|"मैं वही हूँ" — आत्मबोध|"I am That"|संस्कृत सः + अहम्',
      'सोहन|Sohan|b|सुंदर, मनोहर|Charming|हिंदी/संस्कृत शोभन',
      'सोमदत्त|Somdutt|b|चंद्र का दिया|Gift of the Moon|संस्कृत सोम + दत्त',
      'सोमांश|Somansh|b|चंद्र का अंश|Part of the Moon|संस्कृत सोम + अंश'
    ],
    'दा': [
      'दामिनी|Damini|g|बिजली|Lightning|संस्कृत दामिनी',
      'दामोदर|Damodar|b|कृष्ण (उदर पर रस्सी बँधी)|Krishna|संस्कृत दाम + उदर',
      'दाक्षायणी|Dakshayani|g|दक्ष की पुत्री सती|Sati, daughter of Daksha|संस्कृत दाक्षायणी',
      'दाशरथि|Dasharathi|b|दशरथ के पुत्र (राम)|Son of Dasharatha (Rama)|संस्कृत दाशरथि'
    ],
    'दी': [
      'दीपक|Deepak|b|दीपक, प्रकाश|Lamp, light|संस्कृत दीपक',
      'दीपिका|Deepika|g|छोटा दीया|Little lamp|संस्कृत दीपिका',
      'दीप्ति|Deepti|g|चमक, प्रकाश|Brilliance|संस्कृत दीप्ति',
      'दीक्षा|Diksha|g|संकल्प; गुरु-दीक्षा|Initiation|संस्कृत दीक्षा',
      'दीपांशु|Deepanshu|b|दीपक की किरण|Ray of a lamp|संस्कृत दीप + अंशु',
      'दीपेश|Deepesh|b|दीपों के स्वामी|Lord of lights|संस्कृत दीप + ईश',
      'दीपाली|Deepali|g|दीपों की पंक्ति|Row of lamps|संस्कृत दीपाली',
      'दीनानाथ|Deenanath|b|दीनों के नाथ|Lord of the humble|संस्कृत दीन + नाथ',
      'दीनदयाल|Deendayal|b|दीनों पर दया करने वाला|Merciful to the poor|संस्कृत दीन + दयाल',
      'दीपांकर|Deepankar|b|दीपक बनाने वाला; बुद्ध|Lamp-maker; a Buddha|संस्कृत दीपङ्कर',
      'दीपशिखा|Deepshikha|g|दीपक की लौ|Flame of a lamp|संस्कृत दीप + शिखा',
      'दीपा|Deepa|g|दीपक|Lamp|संस्कृत दीप',
      'दीप|Deep|u|दीपक|Lamp|संस्कृत दीप',
      'दीक्षित|Dikshit|b|दीक्षा प्राप्त|Initiated|संस्कृत दीक्षित'
    ],
    /* ───────── 26 उत्तरा भाद्रपद ───────── */
    'दू': [
      'दूर्वा|Doorva|g|पवित्र दूब घास|Sacred Durva grass|संस्कृत दूर्वा',
      'दुर्गा|Durga|g|अजेय देवी|Invincible goddess|संस्कृत दुर्गा|f',
      'दुर्गेश|Durgesh|b|दुर्गा के स्वामी|Lord of Durga|संस्कृत दुर्ग + ईश|f',
      'दुष्यंत|Dushyant|b|शकुंतला के पति राजा|King, husband of Shakuntala|महाभारत|f',
      'दुर्वासा|Durvasa|b|महर्षि दुर्वासा|Sage Durvasa|पौराणिक|f'
    ],
    'थ': [],
    'झ': [
      'झरना|Jharna|g|जल-स्रोत, निर्झर|Waterfall, spring|हिंदी झरना',
      'झेलम|Jhelum|g|कश्मीर की नदी|River of Kashmir|संस्कृत वितस्ता (झेलम)'
    ],
    'ञ': [],
    /* ───────── 27 रेवती ───────── */
    'दे': [
      'देव|Dev|b|देवता, दिव्य|God, divine|संस्कृत देव',
      'देवी|Devi|g|देवी|Goddess|संस्कृत देवी',
      'देवांश|Devansh|b|दिव्य अंश|Divine part|संस्कृत देव + अंश',
      'देविका|Devika|g|छोटी देवी|Little goddess|संस्कृत देविका',
      'देवेश|Devesh|b|देवों के स्वामी|Lord of gods|संस्कृत देव + ईश',
      'देवदत्त|Devdutt|b|देवताओं का दिया|Gift of the gods|संस्कृत देव + दत्त',
      'देवेंद्र|Devendra|b|देवताओं के राजा|King of gods|संस्कृत देव + इन्द्र',
      'देवांगी|Devangi|g|दिव्य अंगों वाली|Divine-limbed|संस्कृत देव + अङ्ग',
      'देवयानी|Devyani|g|शुक्राचार्य की पुत्री|Daughter of Shukracharya|महाभारत',
      'देवकी|Devaki|g|श्रीकृष्ण की माता|Mother of Krishna|संस्कृत देवकी',
      'देवराज|Devraj|b|देवों के राजा|King of gods|संस्कृत देव + राज',
      'देवव्रत|Devavrat|b|भीष्म का मूल नाम|Original name of Bhishma|महाभारत',
      'देवसेना|Devasena|g|कार्तिकेय की पत्नी|Wife of Kartikeya|पौराणिक',
      'देवर्षि|Devarshi|b|देवों में ऋषि|Divine sage|संस्कृत देव + ऋषि',
      'देवाशीष|Devashish|b|देवताओं का आशीर्वाद|Blessing of the gods|संस्कृत देव + आशिष्',
      'देवदास|Devdas|b|देव का दास|Servant of God|संस्कृत देव + दास'
    ],
    'दो': [
      'दर्शन|Darshan|b|दर्शन, दृष्टि|Sight, philosophy|संस्कृत दर्शन|f',
      'दर्शना|Darshana|g|दर्शनीय|Worth seeing|संस्कृत दर्शना|f',
      'दक्ष|Daksh|b|कुशल|Skilled|संस्कृत दक्ष|f',
      'दक्षा|Daksha|g|कुशल स्त्री|Skilled woman|संस्कृत दक्षा|f',
      'दक्षिता|Dakshita|g|कुशलता से युक्त|Full of skill|संस्कृत दक्ष|f',
      'दक्षिणा|Dakshina|g|दान; दक्षिण दिशा|Offering; south|संस्कृत दक्षिणा|f'
    ],
    'चा': [
      'चारु|Charu|u|सुंदर|Beautiful|संस्कृत चारु',
      'चारुलता|Charulata|g|सुंदर लता|Beautiful creeper|संस्कृत चारु + लता',
      'चारुदत्त|Charudutt|b|सुंदरता का वरदान|Gift of beauty|संस्कृत चारु + दत्त',
      'चारुहास|Charuhas|b|मोहक हँसी वाला|Of charming smile|संस्कृत चारु + हास',
      'चाणक्य|Chanakya|b|महान राजनीतिज्ञ आचार्य|Great statesman-teacher|संस्कृत चाणक्य',
      'चातक|Chatak|b|वर्षा-जल का प्यासा पक्षी|Rain-bird|संस्कृत चातक',
      'चारुशीला|Charusheela|g|सुंदर स्वभाव वाली|Of beautiful nature|संस्कृत चारु + शील',
      'चामुंडा|Chamunda|g|देवी चामुंडा|Goddess Chamunda|संस्कृत चामुण्डा',
      'चाँदनी|Chandni|g|चंद्रमा का प्रकाश|Moonlight|हिंदी चाँदनी',
      'चारुनेत्र|Charunetra|b|सुंदर नेत्रों वाला|Beautiful-eyed|संस्कृत चारु + नेत्र',
      'चारुमती|Charumati|g|सुंदर मन वाली|Beautiful-minded|संस्कृत चारु + मति'
    ],
    'ची': [
      'चित्रा|Chitra|g|चित्र; एक नक्षत्र|Picture; a nakshatra|संस्कृत चित्रा|f',
      'चिंतन|Chintan|b|विचार, मनन|Contemplation|संस्कृत चिन्तन|f',
      'चिन्मय|Chinmay|b|ज्ञानमय, चेतनामय|Full of consciousness|संस्कृत चिन्मय|f',
      'चिन्मयी|Chinmayi|g|चेतनामयी|Full of consciousness|संस्कृत चिन्मयी|f',
      'चिरंजीव|Chiranjeev|b|दीर्घायु|Long-lived|संस्कृत चिरञ्जीव|f',
      'चित्रांगदा|Chitrangada|g|अर्जुन की पत्नी|Wife of Arjuna|महाभारत|f',
      'चिंतामणि|Chintamani|b|इच्छा पूरी करने वाला रत्न|Wish-fulfilling gem|संस्कृत चिन्तामणि|f',
      'चिदानंद|Chidanand|b|चेतना का आनंद|Bliss of consciousness|संस्कृत चित् + आनन्द|f',
      'चित्रलेखा|Chitralekha|g|उषा की सखी|Friend of Usha|संस्कृत चित्रलेखा|f',
      'चित्रांश|Chitransh|b|चित्र का अंश|Part of a picture|संस्कृत चित्र + अंश|f'
    ]
  };

  /* ---------- build records ---------- */
  var GEN = { b: 'boy', g: 'girl', u: 'unisex' };
  var SYL_INFO = {};            // syllable -> { nak, pada, rashi }
  SYLLABLES.forEach(function (row, n) {
    row.forEach(function (s, p) {
      var abs = n * 4 + p;
      SYL_INFO[s] = { nak: n, pada: p + 1, rashi: Math.floor(abs / 9) };
    });
  });

  var NAMES = [];
  Object.keys(RAW).forEach(function (syl) {
    var info = SYL_INFO[syl];
    RAW[syl].forEach(function (line) {
      var f = line.split('|');
      NAMES.push({
        hi: f[0], en: f[1], gender: GEN[f[2]], mHi: f[3], mEn: f[4], origin: f[5],
        fam: f[6] === 'f',
        syllable: syl, nak: info.nak, nakHi: NAK[info.nak], nakEn: NAK_EN[info.nak], pada: info.pada,
        rashi: info.rashi, rashiHi: RASHI[info.rashi]
      });
    });
  });

  g.JYNames = {
    NAK: NAK, NAK_EN: NAK_EN, RASHI: RASHI, RASHI_EN: RASHI_EN, RASHI_LORD: RASHI_LORD,
    SYLLABLES: SYLLABLES, SYL_INFO: SYL_INFO, FAMILY: FAMILY, RAW: RAW, NAMES: NAMES,
    syllablesOf: function (nak) { return SYLLABLES[nak]; }
  };
})(typeof window !== 'undefined' ? window : global);
