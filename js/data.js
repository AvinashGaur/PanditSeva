const PHONE = "7737782519";
const WHATSAPP_NUM = "917737782519";

const pandits = [
  {
    id: 1,
    name: "Pt. Rajesh Sharma",
    img: "https://randomuser.me/api/portraits/men/32.jpg",
    specializations: ["Griha Pravesh", "Vastu Shanti", "Satyanarayan Pooja"],
    experience: 15,
    rating: 4.9,
    reviews: 1243,
    pricePerMin: 30,
    languages: ["Hindi", "Sanskrit", "Rajasthani"],
    status: "online",
    about: "Expert in Griha Pravesh and Vastu rituals with 15 years of experience in Jaipur. Proficient in all Vedic traditions.",
    poojasDone: 3200
  },
  {
    id: 2,
    name: "Pt. Suresh Mishra",
    img: "https://randomuser.me/api/portraits/men/45.jpg",
    specializations: ["Havan", "Rudrabhishek", "Yagya"],
    experience: 10,
    rating: 4.8,
    reviews: 876,
    pricePerMin: 20,
    languages: ["Hindi", "Sanskrit"],
    status: "online",
    about: "Specialist in fire rituals and Havan ceremonies. Trained at Kashi Vidyapeeth.",
    poojasDone: 2100
  },
  {
    id: 3,
    name: "Pt. Amit Tripathi",
    img: "https://randomuser.me/api/portraits/men/67.jpg",
    specializations: ["Vivah Pooja", "Naamkaran", "Mundan"],
    experience: 12,
    rating: 4.7,
    reviews: 654,
    pricePerMin: 25,
    languages: ["Hindi", "Sanskrit", "English"],
    status: "busy",
    about: "Renowned for conducting traditional Vedic marriages and sanskar ceremonies across Jaipur.",
    poojasDone: 1800
  },
  {
    id: 4,
    name: "Pt. Deepak Vyas",
    img: "https://randomuser.me/api/portraits/men/12.jpg",
    specializations: ["Rudrabhishek", "Paath", "Jaap"],
    experience: 8,
    rating: 4.6,
    reviews: 432,
    pricePerMin: 15,
    languages: ["Hindi", "Sanskrit"],
    status: "online",
    about: "Dedicated to spiritual recitations and Shiva worship rituals. Available 7 days a week.",
    poojasDone: 980
  },
  {
    id: 5,
    name: "Pt. Mohan Shastri",
    img: "https://randomuser.me/api/portraits/men/78.jpg",
    specializations: ["Kaal Sarp Dosh", "Pitra Dosh", "Navgrah Pooja"],
    experience: 20,
    rating: 5.0,
    reviews: 2100,
    pricePerMin: 40,
    languages: ["Hindi", "Sanskrit", "Rajasthani"],
    status: "offline",
    about: "Senior jyotishi and pooja acharya with 20 years experience. Expert in dosh nivaran poojas.",
    poojasDone: 5600
  },
  {
    id: 6,
    name: "Pt. Vikram Pandey",
    img: "https://randomuser.me/api/portraits/men/56.jpg",
    specializations: ["Satyanarayan Pooja", "Ganesh Pooja", "Navgrah"],
    experience: 6,
    rating: 4.5,
    reviews: 312,
    pricePerMin: 12,
    languages: ["Hindi", "Sanskrit"],
    status: "online",
    about: "Young and dedicated pandit available for all common household poojas at affordable rates.",
    poojasDone: 700
  },
  {
    id: 7,
    name: "Pt. Ramesh Tiwari",
    img: "https://randomuser.me/api/portraits/men/23.jpg",
    specializations: ["Naamkaran", "Mundan", "Annaprashan"],
    experience: 9,
    rating: 4.8,
    reviews: 521,
    pricePerMin: 18,
    languages: ["Hindi", "Sanskrit", "Rajasthani"],
    status: "online",
    about: "Specialist in 16 Sanskars and child-related ceremonies. Very patient and family-friendly.",
    poojasDone: 1300
  },
  {
    id: 8,
    name: "Pt. Girish Joshi",
    img: "https://randomuser.me/api/portraits/men/34.jpg",
    specializations: ["Vastu Shanti", "Office Pooja", "Bhoomi Pujan"],
    experience: 18,
    rating: 4.9,
    reviews: 1680,
    pricePerMin: 35,
    languages: ["Hindi", "Sanskrit", "English"],
    status: "online",
    about: "Expert Vastu consultant and pandit. Trusted by top builders and corporate clients in Jaipur.",
    poojasDone: 4200
  }
];

const services = [
  { icon: "🏠", name: "Griha Pravesh", desc: "Auspicious home entry ritual", price: "₹5,100 onwards" },
  { icon: "🔱", name: "Satyanarayan Pooja", desc: "Lord Vishnu blessings", price: "₹2,100 onwards" },
  { icon: "🔥", name: "Havan & Yagya", desc: "Sacred fire ritual", price: "₹5,100 onwards" },
  { icon: "💒", name: "Vivah Pooja", desc: "Vedic wedding ceremony", price: "₹11,000 onwards" },
  { icon: "🕉️", name: "Rudrabhishek", desc: "Shiva abhishek ritual", price: "₹3,100 onwards" },
  { icon: "🏗️", name: "Vastu Shanti", desc: "Positive energy ritual", price: "₹5,100 onwards" },
  { icon: "👶", name: "Naamkaran", desc: "Baby naming ceremony", price: "₹3,100 onwards" },
  { icon: "🌿", name: "Navgrah Pooja", desc: "Nine planet worship", price: "₹4,100 onwards" }
];

const poojas = [
  { icon: "🏠", name: "Griha Pravesh Pooja", desc: "Complete home entry ritual with all samagri included", price: "₹5,100", from: "Starting from", duration: "2-3 hrs" },
  { icon: "🔱", name: "Satyanarayan Pooja", desc: "Lord Vishnu pooja for prosperity and happiness", price: "₹2,100", from: "Starting from", duration: "1.5 hrs" },
  { icon: "🔥", name: "Havan & Yagya", desc: "Fire ritual to purify home and remove negative energy", price: "₹5,100", from: "Starting from", duration: "2-4 hrs" },
  { icon: "🕉️", name: "Rudrabhishek", desc: "Sacred Shiva abhishek with vedic mantras", price: "₹3,100", from: "Starting from", duration: "2 hrs" },
  { icon: "🏗️", name: "Vastu Shanti Pooja", desc: "Correct Vastu dosh and invite positive energy", price: "₹5,100", from: "Starting from", duration: "3 hrs" },
  { icon: "💒", name: "Vivah Pooja", desc: "Complete Vedic wedding ceremony with all rituals", price: "₹11,000", from: "Starting from", duration: "4-6 hrs" },
  { icon: "👶", name: "Naamkaran Sanskar", desc: "Baby naming ceremony with all vedic traditions", price: "₹3,100", from: "Starting from", duration: "1.5 hrs" },
  { icon: "🌿", name: "Navgrah Pooja", desc: "Nine planet worship for overall well-being", price: "₹4,100", from: "Starting from", duration: "2-3 hrs" }
];

const testimonials = [
  {
    name: "Priya Agarwal",
    location: "Vaishali Nagar, Jaipur",
    img: "https://randomuser.me/api/portraits/women/44.jpg",
    rating: 5,
    text: "Pt. Rajesh Sharma conducted our Griha Pravesh beautifully. He was punctual, knew every ritual perfectly, and even explained the meaning of each step. Highly recommended!",
    service: "Griha Pravesh"
  },
  {
    name: "Rakesh Gupta",
    location: "Mansarovar, Jaipur",
    img: "https://randomuser.me/api/portraits/men/58.jpg",
    rating: 5,
    text: "Booked for Satyanarayan Pooja last month. The panditji arrived on time, brought all samagri, and the pooja was conducted exactly as per tradition. Will use again.",
    service: "Satyanarayan Pooja"
  },
  {
    name: "Sunita Sharma",
    location: "C-Scheme, Jaipur",
    img: "https://randomuser.me/api/portraits/women/22.jpg",
    rating: 5,
    text: "Amazing service! My son's Naamkaran ceremony was conducted so professionally. The online chat feature helped me confirm all arrangements before the day. 10/10.",
    service: "Naamkaran Sanskar"
  }
];

const faqs = [
  { q: "How do I book a pandit in Jaipur?", a: "Simply browse pandits on our platform, select your preferred pandit, choose the pooja type and date, fill in your address, and confirm your booking. You can also call us directly at 7737782519 for instant booking." },
  { q: "Do pandits bring pooja samagri?", a: "Yes! All our pandits bring the required pooja samagri (materials). You don't need to arrange anything separately. The cost of samagri is included in the pooja price quoted." },
  { q: "Are all pandits verified?", a: "Absolutely. Every pandit on PanditSeva.in goes through a thorough verification process — identity check, qualification verification, and a test ceremony evaluation before being listed on our platform." },
  { q: "What areas in Jaipur do you cover?", a: "We cover all areas of Jaipur including Vaishali Nagar, Mansarovar, Malviya Nagar, C-Scheme, Bani Park, Jagatpura, Pratap Nagar, Raja Park, Tonk Road, Ajmer Road, and all surrounding areas." },
  { q: "Can I talk to the pandit before booking?", a: "Yes! You can use our live chat or call feature to speak directly with the pandit before booking. This helps you understand their style, ask questions, and build confidence before confirming." },
  { q: "What is the per-minute charge for online consultation?", a: "Each pandit sets their own per-minute rate, starting from ₹12/min. You can see the rate on each pandit's profile. The first 3 minutes are free for new users." }
];

const chatReplies = [
  "Pranam 🙏 I am available for your pooja. Please tell me the date and time.",
  "Ji haan, I cover all areas of Jaipur. What is your location?",
  "For Griha Pravesh, the auspicious time (muhurat) should be fixed first. Can you share your address?",
  "The samagri for this pooja will cost approximately ₹800-1200 extra. I will bring everything.",
  "Yes, I am available on that date. Please confirm and I will be there on time.",
  "Jai Shri Ram 🙏 I have conducted over 500 Griha Pravesh ceremonies in Jaipur.",
  "For this pooja, the duration will be approximately 2-3 hours.",
  "Please share your birth details for muhurat calculation."
];
