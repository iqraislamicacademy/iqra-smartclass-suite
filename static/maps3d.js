// ========================================================
// IQRA SMARTCLASS SUITE - IQRA 2D MAPS & GEOGRAPHY EXPLORER (maps3d.js)
// Clean 2D Edition:
// 1. 3D Button & 3D Tilt/Extrusion Removed (Pure 2D Flat Stability)
// 2. Reliable 2D Center & Zoom Focus on State/Country Click
// 3. Left-Wall Vertical-Draggable Minimize Pill
// 4. Compact 7-Section (A-G) English Geography Encyclopedia Card
// ========================================================
(function (window) {
  "use strict";

  const MAPLIBRE_JS_URL = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
  const MAPLIBRE_CSS_URL = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

  const WORLD_GEOJSON_URL =
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";
  const INDIA_STATES_GEOJSON_URL =
    "https://raw.githubusercontent.com/geohacker/india/master/state/india_telengana.geojson";

  let mapInstance = null;
  let isMapModalOpen = false;
  let isMapWallMinimized = false;
  let isFullScreen = true;
  let showMapNames = true;
  let currentMapMode = "political"; // political | physical | blank

  let isMeasureModeActive = false;
  let isPenBoxOpen = false;
  let isMapPenDrawing = false;
  let mapPenTool = "pen"; // pen | eraser
  let mapPenColor = "#ef4444";
  let mapPenSize = 4;

  let measurePoints = [];
  let measureMarkers = [];
  let cachedIndiaGeoJson = null;
  let cachedWorldGeoJson = null;
  let allWorldCountriesList = [];
  let highlightedRegionName = "";
  let activeInfoSection = "A";
  let activeSidebarTab = "india";
  let currentDisplayedProfile = null;
  const liveCountryMetaCache = new Map();

  // ==========================================
  // 1. COMPREHENSIVE 7-SECTION (A-G) INDIA & WORLD ENCYCLOPEDIA (ENGLISH)
  // ==========================================
  const INDIA_STATES_DB = {
    "maharashtra": {
      name: "Maharashtra",
      center: [75.7139, 19.7515],
      zoom: 6.0,
      A: {
        "State Name": "Maharashtra",
        "Capital": "Mumbai (Summer) / Nagpur (Winter)",
        "Formation Date": "1 May 1960",
        "Total Area & Rank": "307,713 sq km (3rd Largest in India)",
        "Official Language": "Marathi",
        "State Symbols": "Animal: Indian Giant Squirrel | Bird: Yellow-footed Green Pigeon | Flower: Jarul | Tree: Mango"
      },
      B: {
        "Location in India": "Western & Central Peninsular India",
        "Coordinates": "15°35' N – 22°02' N Lat, 72°36' E – 80°54' E Lng",
        "Bordering States": "Gujarat, Madhya Pradesh, Chhattisgarh, Telangana, Karnataka, Goa, DNH",
        "International Border": "None",
        "Coastline": "720 km Konkan Coast along the Arabian Sea"
      },
      C: {
        "Mountain Ranges": "Sahyadri (Western Ghats), Satpura, Ajanta & Balaghat Ranges",
        "Plateaus & Plains": "Deccan Plateau, Vidarbha Plains, Konkan Coastal Plain",
        "Major Rivers": "Godavari, Krishna, Tapi, Bhima, Wardha, Wainganga",
        "Lakes & Waterfalls": "Lonar Crater Lake, Powai Lake, Thoseghar & Bhandardara Falls",
        "National Parks": "Tadoba-Andhari, Pench, Sanjay Gandhi NP, Melghat, Navegaon"
      },
      D: {
        "Climate Type": "Tropical Monsoon Climate",
        "Avg Temperature": "24°C – 32°C (Summer up to 44°C in Vidarbha; Winter 12°C – 22°C)",
        "Annual Rainfall": "400 mm to 6,000 mm (Heavy in Konkan; semi-arid in Marathwada)",
        "Wettest & Driest": "Wettest: Amboli (Sindhudurg) | Driest: Solapur & Ahmednagar"
      },
      E: {
        "Total Population": "~12.6 Crore (2nd most populous Indian state)",
        "Density & Sex Ratio": "365 persons/sq km | 929 females per 1,000 males",
        "Literacy Rate": "82.34%",
        "Largest City & Languages": "Mumbai (45.2% Urban) | Marathi, Hindi, Urdu, English"
      },
      F: {
        "Executive Head": "Governor of Maharashtra & Chief Minister (with Deputy CMs)",
        "Districts & Divisions": "36 Districts across 6 Administrative Divisions",
        "Legislature": "Vidhan Sabha: 288 seats | Vidhan Parishad: 78 seats",
        "Parliament": "Lok Sabha: 48 seats | Rajya Sabha: 19 seats",
        "High Court & Cities": "Bombay High Court (Benches: Nagpur, Aurangabad, Panaji) | Pune, Nagpur, Nashik"
      },
      G: {
        "Major Crops": "Sugarcane, Cotton, Soybean, Jowar, Bajra, Alphonso Mangoes, Oranges, Grapes",
        "Minerals": "Manganese, Coal, Iron Ore, Bauxite, Limestone (Vidarbha & Konkan)",
        "Industries & GDP": "Finance, IT, Automobiles, Pharma, Textiles | #1 State GSDP in India",
        "Tourism & Ports": "Ajanta & Ellora Caves, Gateway of India | JNPT Port, Samruddhi Expressway"
      }
    },
    "uttar pradesh": {
      name: "Uttar Pradesh",
      center: [80.9462, 26.8467],
      zoom: 6.1,
      A: {
        "State Name": "Uttar Pradesh",
        "Capital": "Lucknow",
        "Formation Date": "24 January 1950",
        "Total Area & Rank": "240,928 sq km (4th Largest in India)",
        "Official Languages": "Hindi & Urdu",
        "State Symbols": "Animal: Barasingha | Bird: Sarus Crane | Flower: Palash | Tree: Ashoka"
      },
      B: {
        "Location in India": "Northern India (Indo-Gangetic Plain)",
        "Coordinates": "23°52' N – 30°24' N Lat, 77°05' E – 84°38' E Lng",
        "Bordering States": "Uttarakhand, Himachal, Haryana, Delhi, Rajasthan, MP, Chhattisgarh, Jharkhand, Bihar",
        "International Border": "Shares northern international border with Nepal",
        "Coastline": "None (Landlocked)"
      },
      C: {
        "Mountain Ranges": "Shivalik Foothills (North) & Vindhya Range (South)",
        "Plateaus & Plains": "Ganga-Yamuna Doab Plains, Awadh, Purvanchal, Bundelkhand Plateau",
        "Major Rivers": "Ganga, Yamuna, Gomti, Ghaghara, Gandak, Betwa, Chambal, Son",
        "Lakes & Parks": "Suraha Tal, Keetham Lake | Dudhwa NP, Pilibhit Tiger Reserve"
      },
      D: {
        "Climate Type": "Humid Subtropical Monsoon Climate",
        "Avg Temperature": "25°C (Summer up to 46°C; Winter 3°C – 15°C)",
        "Annual Rainfall": "650 mm (West) to 1,200+ mm (Eastern Terai)",
        "Wettest & Driest": "Wettest: Gorakhpur | Driest: Mathura & Agra"
      },
      E: {
        "Total Population": "~24 Crore (#1 Most Populous State in India)",
        "Density & Sex Ratio": "829 persons/sq km | 912 females per 1,000 males",
        "Literacy Rate": "67.68%",
        "Largest City & Languages": "Kanpur / Lucknow (22.3% Urban) | Hindi, Urdu, Bhojpuri, Awadhi"
      },
      F: {
        "Executive Head": "Governor of Uttar Pradesh & Chief Minister",
        "Districts & Divisions": "75 Districts across 18 Administrative Divisions",
        "Legislature": "Vidhan Sabha: 403 seats | Vidhan Parishad: 100 seats",
        "Parliament": "Lok Sabha: 80 seats (Highest) | Rajya Sabha: 31 seats",
        "High Court & Cities": "Allahabad High Court (Bench: Lucknow) | Varanasi, Prayagraj, Agra, Noida"
      },
      G: {
        "Major Crops": "Wheat, Rice, Sugarcane (#1 Producer), Potatoes, Mangoes",
        "Minerals": "Limestone, Dolomite, Coal (Singrauli), Silica Sand",
        "Industries & GDP": "Sugar, Leather, Textiles, Electronics/IT (Noida), Brassware | 3rd Largest GSDP",
        "Tourism & Routes": "Taj Mahal, Varanasi, Ayodhya, Prayagraj | Yamuna & Purvanchal Expressways"
      }
    },
    "rajasthan": {
      name: "Rajasthan",
      center: [74.2179, 27.0238],
      zoom: 5.9,
      A: {
        "State Name": "Rajasthan",
        "Capital": "Jaipur (Pink City)",
        "Formation Date": "30 March 1949",
        "Total Area & Rank": "342,239 sq km (#1 Largest State in India)",
        "Official Language": "Hindi",
        "State Symbols": "Animal: Chinkara & Camel | Bird: Great Indian Bustard | Flower: Rohida | Tree: Khejri"
      },
      B: {
        "Location in India": "Northwestern India",
        "Coordinates": "23°03' N – 30°12' N Lat, 69°30' E – 78°17' E Lng",
        "Bordering States": "Punjab, Haryana, Uttar Pradesh, Madhya Pradesh, Gujarat",
        "International Border": "1,070 km border with Pakistan on the west",
        "Coastline": "None (Landlocked)"
      },
      C: {
        "Mountain Ranges": "Aravalli Range (Guru Shikhar 1,722 m)",
        "Deserts & Plateaus": "Thar Desert (Great Indian Desert) & Hadoti Plateau",
        "Major Rivers": "Chambal, Luni, Banas, Mahi, Sabarmati",
        "Lakes & Parks": "Sambhar Salt Lake, Pichola, Pushkar | Ranthambore, Sariska, Keoladeo NP"
      },
      D: {
        "Climate Type": "Arid & Semi-Arid Desert Climate",
        "Avg Temperature": "Summer 38°C – 49°C; Winter 4°C – 18°C",
        "Annual Rainfall": "100 mm (Jaisalmer) to 900 mm (Southeastern Hadoti)",
        "Wettest & Driest": "Wettest: Mount Abu | Driest: Jaisalmer"
      },
      E: {
        "Total Population": "~8.1 Crore",
        "Density & Sex Ratio": "200 persons/sq km | 928 females per 1,000 males",
        "Literacy Rate": "66.11%",
        "Largest City & Languages": "Jaipur (24.9% Urban) | Hindi, Rajasthani (Marwari, Mewari)"
      },
      F: {
        "Executive Head": "Governor of Rajasthan & Chief Minister",
        "Districts & Divisions": "50 Districts across 10 Administrative Divisions",
        "Legislature & Parliament": "Vidhan Sabha: 200 seats | Lok Sabha: 25 | Rajya Sabha: 10",
        "High Court & Cities": "Rajasthan High Court (Jodhpur, Bench: Jaipur) | Udaipur, Kota, Ajmer, Bikaner"
      },
      G: {
        "Major Crops": "Bajra, Mustard, Guar, Wheat, Cumin, Coriander",
        "Minerals": "Lead, Zinc, Silver, Copper (Khetri), Marble (Makrana), Crude Oil (Barmer)",
        "Industries & Tourism": "Solar Energy (#1), Marble, Cement, Textiles | Amber Fort, Hawa Mahal, Udaipur"
      }
    }
  };

  const INDIA_STATE_PRESETS = [
    { name: "Maharashtra", center: [75.7139, 19.7515], zoom: 6.0, capital: "Mumbai / Nagpur", region: "Western India", rivers: "Godavari, Krishna, Tapi", area: "307,713 sq km (3rd)", lang: "Marathi" },
    { name: "Uttar Pradesh", center: [80.9462, 26.8467], zoom: 6.1, capital: "Lucknow", region: "Northern India", rivers: "Ganga, Yamuna, Gomti", area: "240,928 sq km (4th)", lang: "Hindi, Urdu" },
    { name: "Rajasthan", center: [74.2179, 27.0238], zoom: 5.9, capital: "Jaipur", region: "Northwestern India", rivers: "Chambal, Luni", area: "342,239 sq km (1st)", lang: "Hindi" },
    { name: "Jammu and Kashmir", center: [74.7973, 33.7782], zoom: 6.7, capital: "Srinagar / Jammu", region: "Northern Himalayas", rivers: "Jhelum, Chenab", area: "42,241 sq km (UT)", lang: "Kashmiri, Dogri, Urdu, Hindi" },
    { name: "Ladakh", center: [77.5771, 34.1526], zoom: 6.4, capital: "Leh / Kargil", region: "Trans-Himalayas", rivers: "Indus, Shyok, Zanskar", area: "59,146 sq km (UT)", lang: "Ladakhi, Balti, Hindi" },
    { name: "Gujarat", center: [71.1924, 22.2587], zoom: 6.2, capital: "Gandhinagar", region: "Western India", rivers: "Narmada, Sabarmati, Tapi", area: "196,024 sq km (5th)", lang: "Gujarati" },
    { name: "Madhya Pradesh", center: [78.6569, 22.9734], zoom: 6.0, capital: "Bhopal", region: "Central India", rivers: "Narmada, Betwa, Son", area: "308,252 sq km (2nd)", lang: "Hindi" },
    { name: "Tamil Nadu", center: [78.6569, 11.1271], zoom: 6.2, capital: "Chennai", region: "Southern India", rivers: "Kaveri, Vaigai, Palar", area: "130,058 sq km (10th)", lang: "Tamil" },
    { name: "West Bengal", center: [87.855, 22.9868], zoom: 6.2, capital: "Kolkata", region: "Eastern India", rivers: "Hooghly, Teesta, Damodar", area: "88,752 sq km (13th)", lang: "Bengali" },
    { name: "Kerala", center: [76.2711, 10.8505], zoom: 6.6, capital: "Thiruvananthapuram", region: "Southwestern Coast", rivers: "Periyar, Bharathappuzha", area: "38,863 sq km (21st)", lang: "Malayalam" },
    { name: "Bihar", center: [85.3131, 25.0961], zoom: 6.5, capital: "Patna", region: "Eastern India", rivers: "Ganga, Kosi, Gandak", area: "94,163 sq km (12th)", lang: "Hindi, Urdu" },
    { name: "Karnataka", center: [75.7139, 15.3173], zoom: 6.1, capital: "Bengaluru", region: "Southern India", rivers: "Kaveri, Krishna, Tungabhadra", area: "191,791 sq km (6th)", lang: "Kannada" },
    { name: "Andhra Pradesh", center: [79.74, 15.9129], zoom: 6.1, capital: "Amaravati", region: "Southeastern Coast", rivers: "Godavari, Krishna, Penna", area: "162,975 sq km (7th)", lang: "Telugu" },
    { name: "Telangana", center: [79.0193, 18.1124], zoom: 6.4, capital: "Hyderabad", region: "Deccan Plateau", rivers: "Godavari, Krishna, Musi", area: "112,077 sq km (11th)", lang: "Telugu, Urdu" },
    { name: "Odisha", center: [85.0985, 20.9517], zoom: 6.2, capital: "Bhubaneswar", region: "Eastern Coast", rivers: "Mahanadi, Brahmani", area: "155,707 sq km (8th)", lang: "Odia" },
    { name: "Assam", center: [92.9376, 26.2006], zoom: 6.5, capital: "Dispur", region: "Northeast India", rivers: "Brahmaputra, Barak", area: "78,438 sq km (16th)", lang: "Assamese" },
    { name: "Punjab", center: [75.3412, 31.1471], zoom: 6.8, capital: "Chandigarh", region: "Northwestern India", rivers: "Sutlej, Beas, Ravi", area: "50,362 sq km (19th)", lang: "Punjabi" },
    { name: "Haryana", center: [76.0856, 29.0588], zoom: 6.9, capital: "Chandigarh", region: "Northern India", rivers: "Yamuna, Ghaggar", area: "44,212 sq km (20th)", lang: "Hindi" },
    { name: "Himachal Pradesh", center: [77.1734, 31.1048], zoom: 6.8, capital: "Shimla / Dharamshala", region: "Western Himalayas", rivers: "Beas, Sutlej, Chenab", area: "55,673 sq km (17th)", lang: "Hindi" },
    { name: "Uttarakhand", center: [79.0193, 30.0668], zoom: 6.8, capital: "Dehradun / Gairsain", region: "Central Himalayas", rivers: "Ganga, Yamuna, Alaknanda", area: "53,483 sq km (18th)", lang: "Hindi, Sanskrit" },
    { name: "Jharkhand", center: [85.2799, 23.6102], zoom: 6.5, capital: "Ranchi", region: "Eastern Plateau", rivers: "Damodar, Subarnarekha", area: "79,716 sq km (15th)", lang: "Hindi" },
    { name: "Chhattisgarh", center: [81.8661, 21.2787], zoom: 6.3, capital: "Raipur", region: "Central India", rivers: "Mahanadi, Indravati", area: "135,192 sq km (9th)", lang: "Hindi, Chhattisgarhi" },
    { name: "Goa", center: [74.124, 15.2993], zoom: 8.5, capital: "Panaji", region: "Western Konkan Coast", rivers: "Mandovi, Zuari", area: "3,702 sq km (28th)", lang: "Konkani" },
    { name: "Delhi", center: [77.1025, 28.7041], zoom: 9.2, capital: "New Delhi", region: "Northern India (NCT)", rivers: "Yamuna", area: "1,484 sq km (UT)", lang: "Hindi, English, Urdu, Punjabi" },
    { name: "Arunachal Pradesh", center: [94.7278, 28.218], zoom: 6.6, capital: "Itanagar", region: "Northeast India", rivers: "Siang, Lohit, Subansiri", area: "83,743 sq km (14th)", lang: "English" },
    { name: "Manipur", center: [93.9063, 24.6637], zoom: 7.4, capital: "Imphal", region: "Northeast India", rivers: "Imphal, Barak", area: "22,327 sq km (23rd)", lang: "Meitei (Manipuri)" },
    { name: "Meghalaya", center: [91.3662, 25.467], zoom: 7.5, capital: "Shillong", region: "Northeast India", rivers: "Umiam, Simsang", area: "22,429 sq km (22nd)", lang: "English" },
    { name: "Mizoram", center: [92.9376, 23.1645], zoom: 7.4, capital: "Aizawl", region: "Northeast India", rivers: "Tlawng, Chhimtuipui", area: "21,081 sq km (24th)", lang: "Mizo, English" },
    { name: "Nagaland", center: [94.5624, 26.1584], zoom: 7.5, capital: "Kohima", region: "Northeast India", rivers: "Dhansiri, Doyang", area: "16,579 sq km (25th)", lang: "English" },
    { name: "Tripura", center: [91.9882, 23.9408], zoom: 7.8, capital: "Agartala", region: "Northeast India", rivers: "Gumti, Manu", area: "10,491 sq km (26th)", lang: "Bengali, Kokborok" },
    { name: "Sikkim", center: [88.5122, 27.533], zoom: 8.2, capital: "Gangtok", region: "Eastern Himalayas", rivers: "Teesta, Rangeet", area: "7,096 sq km (27th)", lang: "Nepali, Sikkimese, English" }
  ];

  function buildFullIndiaStateProfile(stateName) {
    const key = String(stateName || "").trim().toLowerCase();
    if (INDIA_STATES_DB[key]) return INDIA_STATES_DB[key];

    const preset = INDIA_STATE_PRESETS.find((s) => s.name.toLowerCase() === key) || {
      name: stateName,
      center: [78.9629, 22.5937],
      zoom: 6.2,
      capital: "State Capital",
      region: "India",
      rivers: "Major Regional Rivers",
      area: "Indian State / UT",
      lang: "Regional Language & Hindi/English"
    };

    return {
      name: preset.name,
      center: preset.center,
      zoom: preset.zoom,
      A: {
        "State Name": preset.name,
        "Capital": preset.capital,
        "Total Area & Rank": preset.area,
        "Official Language": preset.lang,
        "Status": "State / Union Territory of India"
      },
      B: {
        "Geographical Zone": preset.region,
        "Coordinates": `${preset.center[1].toFixed(2)}° N Lat, ${preset.center[0].toFixed(2)}° E Lng`,
        "Country": "India (South Asia)"
      },
      C: {
        "Major Rivers": preset.rivers,
        "Physiography": `${preset.region} — regional hills, plains, river valleys & forests`
      },
      D: {
        "Climate Type": "Indian Monsoon Climate",
        "Seasons": "Summer, Southwest Monsoon, Post-Monsoon & Winter"
      },
      E: {
        "Major Languages": preset.lang,
        "Population Profile": "Multilingual & diverse population of India"
      },
      F: {
        "Executive Head": "Governor & Chief Minister",
        "Legislature & Judiciary": "Vidhan Sabha, Lok Sabha, Rajya Sabha & State High Court"
      },
      G: {
        "Economy & Transport": "Agriculture, Manufacturing, Services, Tourism & National Highways/Railways"
      }
    };
  }

  const COUNTRY_ENCYCLOPEDIA_DB = {
    "india": {
      name: "India",
      center: [78.9629, 22.5937],
      zoom: 4.2,
      A: {
        "Full Official Name": "Republic of India (Bharat)",
        "Capital & Largest City": "Capital: New Delhi | Largest City: Mumbai",
        "Official Languages": "Hindi & English (22 Scheduled Languages)",
        "Currency & Nationality": "Indian Rupee (INR ₹) | Indian",
        "Independence Day": "15 August 1947",
        "National Symbols": "Animal: Tiger | Bird: Peacock | Flower: Lotus | Tree: Banyan"
      },
      B: {
        "Continent": "Asia (South Asia)",
        "Boundaries": "North: China, Nepal, Bhutan | West: Pakistan, Arabian Sea | East: Bangladesh, Myanmar, Bay of Bengal | South: Indian Ocean",
        "Coordinates": "8°4' N – 37°6' N Lat, 68°7' E – 97°25' E Lng",
        "Area & World Rank": "3,287,263 sq km (#7 Largest in World) | 7,516 km Coastline"
      },
      C: {
        "Mountains": "Himalayas (Kangchenjunga 8,586 m), Karakoram, Aravalli, Vindhya, Satpura, Western & Eastern Ghats",
        "Plains & Plateaus": "Indo-Gangetic Plain, Deccan Plateau, Thar Desert",
        "Rivers & Islands": "Ganga, Brahmaputra, Indus, Godavari, Krishna | Andaman & Nicobar, Lakshadweep"
      },
      D: {
        "Climate & Rainfall": "Tropical Monsoon | Avg 24°C – 30°C | ~1,100 mm rainfall",
        "Extremes": "Wettest: Mawsynram | Hottest: Phalodi | Coldest: Dras"
      },
      E: {
        "Population & Density": "~1.44 Billion (#1 in World) | ~481 persons/sq km",
        "Major Cities & Literacy": "Mumbai, Delhi, Bengaluru, Hyderabad, Chennai | Literacy: ~77.7%"
      },
      F: {
        "Government & Leaders": "Federal Parliamentary Republic | President & Prime Minister",
        "Parliament & Divisions": "Sansad (Lok Sabha & Rajya Sabha) | 28 States & 8 Union Territories"
      },
      G: {
        "Crops & Minerals": "Rice, Wheat, Sugarcane, Cotton, Tea | Coal, Iron Ore, Manganese, Bauxite",
        "Industries & Ports": "IT, Pharma, Textiles, Automobiles | JNPT Mumbai, Mundra, Chennai, Kolkata"
      }
    }
  };

  function buildGenericCountryProfile(countryName, enriched = {}) {
    const clean = String(countryName || "Country").trim();
    const key = clean.toLowerCase();
    if (COUNTRY_ENCYCLOPEDIA_DB[key]) return COUNTRY_ENCYCLOPEDIA_DB[key];

    return {
      name: clean,
      A: {
        "Official Name": enriched.officialName || clean,
        "Capital City": enriched.capital || "National Capital",
        "Official Languages": enriched.languages || "Regional & Official Languages",
        "Currency & Nationality": `${enriched.currencies || "National Currency"} | ${clean} Citizen`
      },
      B: {
        "Continent & Region": enriched.region || "World Region",
        "Coordinates": enriched.latlng ? `${enriched.latlng[0]}° Lat, ${enriched.latlng[1]}° Lng` : "Global Coordinates",
        "Total Area": enriched.area || "Global Territory",
        "Borders & Coast": enriched.borders || "International / Maritime Borders"
      },
      C: {
        "Physical Geography": `Mountain ranges, plains, river basins & coastal features of ${clean}`,
        "Terrain View": "Switch to Physical Terrain mode to view elevation & relief"
      },
      D: {
        "Climate System": `Regional climate zone of ${enriched.region || clean}`,
        "Seasons": "Distinct seasonal temperature & precipitation cycle"
      },
      E: {
        "Total Population": enriched.population || "Global Population Data",
        "Languages": enriched.languages || "Regional Languages"
      },
      F: {
        "Political Status": "Sovereign Nation / Territory",
        "Capital & Timezone": `Capital: ${enriched.capital || "National Capital"} | ${enriched.timezones || "Local Time"}`
      },
      G: {
        "Economic Profile": `Agriculture, industry, trade, natural resources & tourism in ${clean}`,
        "Currency": enriched.currencies || "National Currency"
      }
    };
  }

  function ensureMapLibreLoaded() {
    return new Promise((resolve, reject) => {
      if (window.maplibregl) {
        resolve(window.maplibregl);
        return;
      }
      if (!document.getElementById("iqra-maplibre-css")) {
        const link = document.createElement("link");
        link.id = "iqra-maplibre-css";
        link.rel = "stylesheet";
        link.href = MAPLIBRE_CSS_URL;
        document.head.appendChild(link);
      }
      const existingScript = document.getElementById("iqra-maplibre-js");
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.maplibregl));
        return;
      }
      const script = document.createElement("script");
      script.id = "iqra-maplibre-js";
      script.src = MAPLIBRE_JS_URL;
      script.onload = () => resolve(window.maplibregl);
      script.onerror = () => reject(new Error("Failed to load MapLibre GL JS"));
      document.head.appendChild(script);
    });
  }

  function injectMapsStudioStyles() {
    if (document.getElementById("iqra-maps3d-styles")) return;
    const style = document.createElement("style");
    style.id = "iqra-maps3d-styles";
    style.textContent = `
      #iqraMaps3DModal {
        position: fixed;
        inset: 0;
        z-index: 2147483640;
        background: #0f172a;
        display: none;
        flex-direction: column;
        overflow: hidden;
        font-family: system-ui, -apple-system, sans-serif;
        color: #f8fafc;
        transition: transform 0.25s ease, opacity 0.25s ease, inset 0.2s ease;
      }
      #iqraMaps3DModal.windowed {
        inset: 28px 60px;
        border: 1px solid #334155;
        border-radius: 16px;
      }
      #iqraMaps3DModal.open {
        display: flex;
      }
      #iqraMaps3DModal.wall-minimized {
        transform: translateX(-115%);
        opacity: 0;
        pointer-events: none;
      }
      #iqraMaps3DModal .maps3d-header {
        height: 48px;
        background: linear-gradient(90deg, #0f172a 0%, #1e293b 100%);
        border-bottom: 1px solid #334155;
        padding: 0 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        flex-shrink: 0;
        z-index: 40;
      }
      #iqraMaps3DModal .maps3d-title {
        display: flex;
        align-items: center;
        gap: 7px;
        font-weight: 800;
        font-size: 13.5px;
        color: #38bdf8;
        white-space: nowrap;
      }
      #iqraMaps3DModal .iqra-brand-pill {
        background: linear-gradient(135deg, #0284c7, #2563eb);
        color: #ffffff;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.5px;
        padding: 2px 6px;
        border-radius: 5px;
        text-transform: uppercase;
      }
      #iqraMaps3DModal .maps3d-modes {
        display: flex;
        gap: 3px;
        background: #020617;
        padding: 3px;
        border-radius: 9px;
        border: 1px solid #1e293b;
      }
      #iqraMaps3DModal .maps3d-mode-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      }
      #iqraMaps3DModal .maps3d-mode-btn.active {
        background: #0284c7;
        color: #ffffff;
      }
      #iqraMaps3DModal .maps3d-header-actions {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      #iqraMaps3DModal .maps3d-action-btn {
        background: #1e293b;
        color: #e2e8f0;
        border: 1px solid #334155;
        padding: 4px 8px;
        border-radius: 7px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      }
      #iqraMaps3DModal .maps3d-action-btn:hover {
        background: #334155;
      }
      #iqraMaps3DModal .maps3d-action-btn.primary {
        background: #10b981;
        border-color: #059669;
        color: #ffffff;
      }
      #iqraMaps3DModal .maps3d-action-btn.active-tool {
        background: #f59e0b;
        border-color: #d97706;
        color: #0f172a;
      }
      #iqraMaps3DModal .maps3d-action-btn.active-blue {
        background: #0284c7;
        border-color: #38bdf8;
        color: #ffffff;
      }
      #iqraMaps3DModal .maps3d-body {
        flex: 1;
        display: flex;
        position: relative;
        overflow: hidden;
      }
      #iqraMaps3DModal .maps3d-sidebar {
        width: 245px;
        background: #0f172a;
        border-right: 1px solid #334155;
        display: flex;
        flex-direction: column;
        z-index: 25;
        flex-shrink: 0;
      }
      #iqraMaps3DModal .maps3d-tabs {
        display: flex;
        border-bottom: 1px solid #334155;
      }
      #iqraMaps3DModal .maps3d-tab {
        flex: 1;
        padding: 8px 5px;
        background: transparent;
        border: none;
        color: #94a3b8;
        font-weight: 700;
        font-size: 11px;
        cursor: pointer;
        border-bottom: 2px solid transparent;
      }
      #iqraMaps3DModal .maps3d-tab.active {
        color: #38bdf8;
        border-bottom-color: #38bdf8;
        background: rgba(56, 189, 248, 0.08);
      }
      #iqraMaps3DModal .maps3d-search-box {
        padding: 7px;
        border-bottom: 1px solid #1e293b;
      }
      #iqraMaps3DModal .maps3d-search-box input {
        width: 100%;
        padding: 6px 9px;
        border-radius: 7px;
        border: 1px solid #334155;
        background: #020617;
        color: #f8fafc;
        font-size: 11.5px;
        outline: none;
        box-sizing: border-box;
      }
      #iqraMaps3DModal .maps3d-list {
        flex: 1;
        overflow-y: auto;
        padding: 7px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      #iqraMaps3DModal .maps3d-item {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 7px;
        padding: 6px 9px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11.5px;
      }
      #iqraMaps3DModal .maps3d-item:hover {
        border-color: #38bdf8;
        background: #263349;
      }
      #iqraMaps3DModal .maps3d-item small {
        color: #94a3b8;
        font-size: 10px;
      }
      #iqraMapStage {
        flex: 1;
        position: relative;
        overflow: hidden;
        background: #bae6fd;
      }
      #iqraMapCanvas {
        width: 100%;
        height: 100%;
        position: relative;
        z-index: 1;
      }
      #iqraMapAnnotateCanvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        z-index: 20;
        pointer-events: none;
        touch-action: none;
      }
      #iqraMapAnnotateCanvas.drawing-active {
        pointer-events: auto !important;
        cursor: crosshair;
      }
      #iqraMaps3DModal .maps3d-pen-box {
        position: absolute;
        top: 10px;
        right: 12px;
        z-index: 50;
        background: #0f172a;
        border: 1.5px solid #38bdf8;
        border-radius: 11px;
        padding: 9px 11px;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.65);
        display: none;
        flex-direction: column;
        gap: 7px;
        width: 210px;
      }
      #iqraMaps3DModal .maps3d-pen-box.open {
        display: flex !important;
      }
      #iqraMaps3DModal .maps3d-color-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 5px;
      }
      #iqraMaps3DModal .maps3d-swatch {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
      }
      #iqraMaps3DModal .maps3d-swatch.active {
        border-color: #ffffff;
        transform: scale(1.14);
      }
      .iqra-dist-badge {
        background: #0f172a;
        color: #34d399;
        font-weight: 800;
        font-size: 11.5px;
        padding: 3px 9px;
        border-radius: 999px;
        border: 1.5px solid #10b981;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
        white-space: nowrap;
      }
      #iqraMaps3DModal .maps3d-info-card {
        position: absolute;
        top: 10px;
        right: 10px;
        bottom: 42px;
        width: 276px;
        max-width: calc(100% - 20px);
        background: rgba(15, 23, 42, 0.96);
        backdrop-filter: blur(10px);
        border: 1px solid #334155;
        border-left: 2.5px solid #38bdf8;
        border-radius: 12px;
        padding: 10px 11px;
        z-index: 35;
        box-shadow: -8px 10px 28px rgba(0, 0, 0, 0.55);
        display: none;
        flex-direction: column;
        overflow: hidden;
      }
      #iqraMaps3DModal .maps3d-info-card.visible {
        display: flex;
      }
      #iqraMaps3DModal .info-sec-tabs {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 3px;
        margin-bottom: 8px;
        padding-bottom: 7px;
        border-bottom: 1px solid #1e293b;
        flex-shrink: 0;
      }
      #iqraMaps3DModal .info-sec-btn {
        background: #1e293b;
        color: #94a3b8;
        border: 1px solid #334155;
        border-radius: 5px;
        padding: 3px 4px;
        font-size: 9.5px;
        font-weight: 700;
        cursor: pointer;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #iqraMaps3DModal .info-sec-btn.active {
        background: #0284c7;
        color: #ffffff;
        border-color: #38bdf8;
      }
      #iqraMaps3DModal .info-sec-body {
        flex: 1;
        overflow-y: auto;
        font-size: 11px;
        color: #e2e8f0;
        line-height: 1.42;
        padding-right: 3px;
      }
      #iqraMaps3DModal .info-kv-row {
        background: rgba(30, 41, 59, 0.65);
        border: 1px solid #1e293b;
        border-radius: 7px;
        padding: 6px 8px;
        margin-bottom: 6px;
      }
      #iqraMaps3DModal .info-kv-row strong {
        color: #38bdf8;
        display: block;
        font-size: 9.5px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-bottom: 2px;
      }
      #iqraMaps3DModal .info-kv-row div {
        color: #f1f5f9;
        font-size: 11px;
        word-break: break-word;
      }
      #iqraMaps3DModal .maps3d-camera-bar {
        position: absolute;
        bottom: 10px;
        left: 10px;
        z-index: 30;
        background: rgba(15, 23, 42, 0.88);
        border: 1px solid #334155;
        border-radius: 999px;
        padding: 3px 6px;
        display: flex;
        gap: 4px;
        align-items: center;
      }
      #iqraMaps3DModal .maps3d-cam-btn {
        background: #1e293b;
        color: #e2e8f0;
        border: 1px solid #475569;
        padding: 2px 7px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
      }
      #iqraMaps3DModal .maps3d-cam-btn:hover,
      #iqraMaps3DModal .maps3d-cam-btn.active {
        border-color: #38bdf8;
        color: #38bdf8;
      }
    `;
    document.head.appendChild(style);
  }

  function createMapsModalDOM() {
    if (document.getElementById("iqraMaps3DModal")) return;
    injectMapsStudioStyles();

    const modal = document.createElement("div");
    modal.id = "iqraMaps3DModal";
    modal.innerHTML = `
      <div class="maps3d-header">
        <div class="maps3d-title">
          <i class="fa-solid fa-map-location-dot"></i>
          <span class="iqra-brand-pill">IQRA</span>
          <span>2D Maps & Geography Explorer</span>
        </div>

        <div class="maps3d-modes">
          <button class="maps3d-mode-btn active" data-mode="political">Political</button>
          <button class="maps3d-mode-btn" data-mode="physical">Physical Terrain</button>
          <button class="maps3d-mode-btn" data-mode="blank">Blank Test</button>
        </div>

        <div class="maps3d-header-actions">
          <button id="btnToggleShowNames" class="maps3d-action-btn active-blue" title="Show or Hide Country & State Names">
            <i class="fa-solid fa-font"></i> <span>Show Names</span>
          </button>
          <button id="btnMapPenBoxToggle" class="maps3d-action-btn" title="Open Pen, Colors & Eraser Box">
            <i class="fa-solid fa-pen"></i> Pen Box
          </button>
          <button id="btnMapMeasureTool" class="maps3d-action-btn" title="Click 2 locations to measure distance in km">
            <i class="fa-solid fa-ruler"></i> Distance
          </button>
          <button id="btnMapClearPins" class="maps3d-action-btn" title="Clear distance & drawings">
            <i class="fa-solid fa-trash-can"></i> Clear
          </button>
          <button id="btnMapToBoard" class="maps3d-action-btn primary" title="Send Map as Image to Whiteboard">
            <i class="fa-solid fa-image"></i> Send to Board
          </button>
          <button id="btnMapFullScreenToggle" class="maps3d-action-btn" title="Toggle Full-Screen / Windowed">
            <i class="fa-solid fa-compress"></i>
          </button>
          <button id="btnMapWallMinimize" class="maps3d-action-btn" title="Minimize Map to Left Side Pill">
            <i class="fa-solid fa-angles-left"></i>
          </button>
          <button id="btnCloseMaps3D" class="maps3d-action-btn" style="background:#dc2626;border-color:#b91c1c;color:#fff;" title="Close Iqra Maps">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div class="maps3d-body">
        <div class="maps3d-sidebar">
          <div class="maps3d-tabs">
            <button class="maps3d-tab active" data-tab="india">🇮🇳 India & States</button>
            <button class="maps3d-tab" data-tab="world">🌍 All Countries</button>
          </div>
          <div class="maps3d-search-box">
            <input type="text" id="maps3dSearchInput" placeholder="Search state, country or capital..." />
          </div>
          <div class="maps3d-list" id="maps3dPresetList"></div>
        </div>

        <div id="iqraMapStage">
          <div id="iqraMapCanvas"></div>
          <canvas id="iqraMapAnnotateCanvas"></canvas>

          <div class="maps3d-pen-box" id="maps3dPenBox">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;font-weight:700;color:#38bdf8;">
              <span>Iqra Map Pen & Eraser</span>
              <button id="btnClosePenBox" style="background:none;border:none;color:#94a3b8;cursor:pointer;">✕</button>
            </div>
            <div class="maps3d-color-row">
              <button class="maps3d-swatch active" data-color="#ef4444" style="background:#ef4444;" title="Red"></button>
              <button class="maps3d-swatch" data-color="#2563eb" style="background:#2563eb;" title="Blue"></button>
              <button class="maps3d-swatch" data-color="#16a34a" style="background:#16a34a;" title="Green"></button>
              <button class="maps3d-swatch" data-color="#facc15" style="background:#facc15;" title="Yellow"></button>
              <button class="maps3d-swatch" data-color="#0f172a" style="background:#0f172a;border-color:#475569;" title="Black"></button>
            </div>
            <div style="display:flex;gap:5px;">
              <button id="btnMapPenSelect" class="maps3d-cam-btn active" style="flex:1;">✏️ Pen</button>
              <button id="btnMapEraserSelect" class="maps3d-cam-btn" style="flex:1;">🧽 Eraser</button>
              <button id="btnMapClearInk" class="maps3d-cam-btn" style="color:#f87171;">Clear</button>
            </div>
          </div>

          <div class="maps3d-camera-bar">
            <button class="maps3d-cam-btn" id="btnCamIndiaReset">🇮🇳 India</button>
            <button class="maps3d-cam-btn" id="btnCamWorldReset">🌍 World</button>
          </div>

          <div class="maps3d-info-card" id="maps3dInfoCard">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-shrink:0;">
              <div style="min-width:0;">
                <div id="infoCardTitle" style="color:#f8fafc;font-weight:800;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">India</div>
                <div id="infoCardBadge" style="font-size:9.5px;color:#38bdf8;font-weight:600;">Geography Encyclopedia</div>
              </div>
              <button id="btnCloseInfoCard" style="background:#1e293b;border:1px solid #334155;border-radius:6px;color:#94a3b8;cursor:pointer;font-size:11px;padding:2px 6px;">✕</button>
            </div>
            <div class="info-sec-tabs" id="infoSecTabs">
              <button class="info-sec-btn active" data-sec="A">A.General</button>
              <button class="info-sec-btn" data-sec="B">B.Location</button>
              <button class="info-sec-btn" data-sec="C">C.Physical</button>
              <button class="info-sec-btn" data-sec="D">D.Climate</button>
              <button class="info-sec-btn" data-sec="E">E.People</button>
              <button class="info-sec-btn" data-sec="F">F.Political</button>
              <button class="info-sec-btn" data-sec="G">G.Economy</button>
            </div>
            <div class="info-sec-body" id="infoCardMeta"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    initMapAnnotationCanvas();
    bindMapsModalEvents();
  }
  function toggleMapLeftWallMinimize(minimize) {
    const modal = document.getElementById("iqraMaps3DModal");
    if (!modal) return;
    isMapWallMinimized = minimize;

    let wallTab = document.getElementById("iqraMapWallRestoreTab");
    if (minimize) {
      modal.classList.add("wall-minimized");

      if (!wallTab) {
        wallTab = document.createElement("div");
        wallTab.id = "iqraMapWallRestoreTab";
        wallTab.title = "Drag vertically or click to expand Iqra Maps";
        wallTab.innerHTML = `
          <i class="fa-solid fa-earth-asia" style="font-size: 10px; color: #38bdf8;"></i>
          <i class="fa-solid fa-chevron-right" style="font-size: 9px;"></i>
        `;
        wallTab.style.cssText = `
          position: fixed; left: 0; top: 34%;
          z-index: 2147483645;
          width: 18px; height: 56px;
          background: rgba(15, 23, 42, 0.85); color: #f8fafc;
          border: 1px solid rgba(56, 189, 248, 0.65); border-left: none;
          border-radius: 0 10px 10px 0;
          box-shadow: 2px 4px 12px rgba(0,0,0,0.28);
          cursor: pointer; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 5px;
          opacity: 0.45;
          transform: translateX(-4px);
          transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease;
          user-select: none; touch-action: none;
        `;

        wallTab.onmouseenter = () => {
          wallTab.style.opacity = "1";
          wallTab.style.transform = "translateX(0)";
          wallTab.style.background = "#0f172a";
        };
        wallTab.onmouseleave = () => {
          wallTab.style.opacity = "0.45";
          wallTab.style.transform = "translateX(-4px)";
          wallTab.style.background = "rgba(15, 23, 42, 0.85)";
        };

        let dragging = false, movedVertically = false, startY = 0, startTop = 0;
        wallTab.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          dragging = true;
          movedVertically = false;
          startY = e.clientY;
          startTop = wallTab.getBoundingClientRect().top;
          wallTab.style.opacity = "1";
          wallTab.style.transform = "translateX(0)";
          try { wallTab.setPointerCapture(e.pointerId); } catch (err) {}
        });

        wallTab.addEventListener("pointermove", (e) => {
          if (!dragging) return;
          const dy = e.clientY - startY;
          if (Math.abs(dy) > 6) movedVertically = true;
          const nextTop = Math.max(12, Math.min(window.innerHeight - 68, startTop + dy));
          wallTab.style.top = `${nextTop}px`;
        });

        wallTab.addEventListener("pointerup", (e) => {
          if (!dragging) return;
          dragging = false;
          try { wallTab.releasePointerCapture(e.pointerId); } catch (err) {}
          if (!movedVertically) {
            toggleMapLeftWallMinimize(false);
          } else {
            wallTab.style.opacity = "0.45";
            wallTab.style.transform = "translateX(-4px)";
          }
        });

        document.body.appendChild(wallTab);
      }
      wallTab.style.display = "flex";
    } else {
      modal.classList.remove("wall-minimized");
      if (wallTab) wallTab.style.display = "none";
      setTimeout(() => {
        mapInstance?.resize();
        syncMapInkCanvasSize();
      }, 120);
    }
  }

  function syncMapInkCanvasSize() {
    const stage = document.getElementById("iqraMapStage");
    const canvas = document.getElementById("iqraMapAnnotateCanvas");
    if (!stage || !canvas) return;

    const rect = stage.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (canvas.width === w && canvas.height === h) return;

    const oldData = canvas.width > 0 && canvas.height > 0 ? canvas.toDataURL() : null;
    canvas.width = w;
    canvas.height = h;
    if (oldData) {
      const img = new Image();
      img.onload = () => canvas.getContext("2d").drawImage(img, 0, 0);
      img.src = oldData;
    }
  }

  function initMapAnnotationCanvas() {
    const canvas = document.getElementById("iqraMapAnnotateCanvas");
    if (!canvas) return;

    window.addEventListener("resize", syncMapInkCanvasSize);
    setTimeout(syncMapInkCanvasSize, 120);

    const ctx = canvas.getContext("2d");
    let isStrokeActive = false;

    canvas.addEventListener("pointerdown", (e) => {
      if (!isMapPenDrawing) return;
      syncMapInkCanvasSize();
      isStrokeActive = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (mapPenTool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = 24;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = mapPenColor;
        ctx.lineWidth = mapPenSize;
      }
      ctx.lineTo(x + 0.1, y + 0.1);
      ctx.stroke();
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!isStrokeActive || !isMapPenDrawing) return;
      const rect = canvas.getBoundingClientRect();
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.stroke();
    });

    const stopStroke = (e) => {
      if (!isStrokeActive) return;
      isStrokeActive = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    };
    canvas.addEventListener("pointerup", stopStroke);
    canvas.addEventListener("pointercancel", stopStroke);
  }

  function computeFeatureBoundsAndCenter(feature) {
    let minLng = Infinity,
      maxLng = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity;

    const walk = (coords) => {
      if (!Array.isArray(coords) || coords.length === 0) return;
      if (typeof coords[0] === "number" && typeof coords[1] === "number") {
        const lng = coords[0];
        const lat = coords[1];
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      } else {
        for (let i = 0; i < coords.length; i++) {
          walk(coords[i]);
        }
      }
    };

    if (feature && feature.geometry && feature.geometry.coordinates) {
      walk(feature.geometry.coordinates);
    }

    if (!Number.isFinite(minLng) || !Number.isFinite(maxLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
      return { center: [20, 20] };
    }

    if (maxLng - minLng > 200) {
      const cLat = Math.max(-70, Math.min(70, (minLat + maxLat) / 2));
      return { center: [95, cLat] };
    }

    const cLng = Math.max(-175, Math.min(175, (minLng + maxLng) / 2));
    const cLat = Math.max(-78, Math.min(78, (minLat + maxLat) / 2));
    return { center: [cLng, cLat] };
  }

  function renderInfoCardSection(secKey) {
    activeInfoSection = secKey || "A";
    const meta = document.getElementById("infoCardMeta");
    const tabsWrap = document.getElementById("infoSecTabs");
    if (!meta || !currentDisplayedProfile) return;

    if (tabsWrap) {
      tabsWrap.querySelectorAll(".info-sec-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.sec === activeInfoSection);
      });
    }

    const secObj = currentDisplayedProfile[activeInfoSection] || currentDisplayedProfile.A || {};
    const entries = Object.entries(secObj);
    if (entries.length === 0) {
      meta.innerHTML = `<div style="color:#94a3b8;">No additional details for this section.</div>`;
      return;
    }

    meta.innerHTML = entries
      .map(
        ([k, v]) => `
        <div class="info-kv-row">
          <strong>${k}</strong>
          <div>${v}</div>
        </div>
      `
      )
      .join("");
  }

  function showInfoCard(profileObj, badgeLabel = "Geography Encyclopedia") {
    const card = document.getElementById("maps3dInfoCard");
    const title = document.getElementById("infoCardTitle");
    const badge = document.getElementById("infoCardBadge");
    if (!card || !title) return;

    currentDisplayedProfile = profileObj;
    title.innerText = profileObj.name || "Location";
    if (badge) badge.innerText = badgeLabel;
    card.classList.add("visible");
    renderInfoCardSection(activeInfoSection || "A");
  }

  async function enrichCountryProfileLive(countryName) {
    const key = String(countryName || "").trim().toLowerCase();
    if (!key || COUNTRY_ENCYCLOPEDIA_DB[key]) return;
    if (liveCountryMetaCache.has(key)) {
      if (highlightedRegionName.toLowerCase() === key) {
        showInfoCard(liveCountryMetaCache.get(key), "Country Profile (A–G)");
      }
    }
  }

  async function ensureWorldCountriesLoaded() {
    if (allWorldCountriesList.length > 0) return;
    try {
      const res = await fetch(WORLD_GEOJSON_URL);
      cachedWorldGeoJson = await res.json();
      const validFeatures = (cachedWorldGeoJson.features || []).filter(
        (f) => f && f.geometry && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length > 0
      );

      allWorldCountriesList = validFeatures
        .map((f, idx) => {
          const name = String((f.properties && f.properties.name) || "Country").trim();
          f.properties = f.properties || {};
          f.properties._colorIdx = idx % 7;
          const geomInfo = computeFeatureBoundsAndCenter(f);
          f.properties._center = geomInfo.center;
          const preset = COUNTRY_ENCYCLOPEDIA_DB[name.toLowerCase()];
          return {
            name,
            center: (preset && preset.center) || geomInfo.center,
            zoom: (preset && preset.zoom) || 4.4,
            capital: preset && preset.A ? preset.A["Capital & Largest City"] || preset.A["Capital City"] : ""
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.warn("World countries load warning:", err);
    }
  }

  async function renderPresetList(filterText = "") {
    const listEl = document.getElementById("maps3dPresetList");
    if (!listEl) return;

    if (activeSidebarTab === "world" && allWorldCountriesList.length === 0) {
      listEl.innerHTML =
        '<div style="padding:12px;color:#94a3b8;font-size:11.5px;">Loading all world countries...</div>';
      await ensureWorldCountriesLoaded();
    }

    listEl.innerHTML = "";
    const query = String(filterText || "").trim().toLowerCase();
    const sourceData =
      activeSidebarTab === "india" ? INDIA_STATE_PRESETS : allWorldCountriesList;

    const filtered = sourceData.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.capital && item.capital.toLowerCase().includes(query)) ||
        (item.region && item.region.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
      listEl.innerHTML =
        '<div style="padding:12px;color:#94a3b8;font-size:11.5px;">No matching location found.</div>';
      return;
    }

    filtered.forEach((item) => {
      const div = document.createElement("div");
      div.className = "maps3d-item";
      const subText = item.capital
        ? `Capital: ${item.capital}`
        : item.region
          ? item.region
          : "Click to center & view profile";

      div.innerHTML = `
        <div style="min-width:0;padding-right:6px;">
          <div style="font-weight:600;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
          <small style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${subText}</small>
        </div>
        <i class="fa-solid fa-location-arrow" style="color:#38bdf8;font-size:10.5px;flex-shrink:0;"></i>
      `;
      div.addEventListener("click", () => {
        const isWorld = activeSidebarTab === "world";
        flyToLocation(item, isWorld);
      });
      listEl.appendChild(div);
    });
  }

  function flyToLocation(item, isCountry = false) {
    if (!mapInstance || !item) return;
    highlightedRegionName = item.name;
    const key = String(item.name || "").trim().toLowerCase();

    let targetCenter =
      Array.isArray(item.center) &&
      Number.isFinite(item.center[0]) &&
      Number.isFinite(item.center[1])
        ? item.center
        : null;

    if (!targetCenter) {
      const sourceGeo = isCountry ? cachedWorldGeoJson : cachedIndiaGeoJson;
      if (sourceGeo && Array.isArray(sourceGeo.features)) {
        const f = sourceGeo.features.find((feat) => {
          const propName = isCountry
            ? feat.properties && feat.properties.name
            : feat.properties && (feat.properties.NAME_1 || feat.properties.st_nm);
          return propName && String(propName).trim().toLowerCase() === key;
        });
        if (f && Array.isArray(f.properties && f.properties._center)) {
          targetCenter = f.properties._center;
        }
      }
    }

    if (
      !Array.isArray(targetCenter) ||
      !Number.isFinite(targetCenter[0]) ||
      !Number.isFinite(targetCenter[1])
    ) {
      targetCenter = isCountry ? [20, 20] : [78.9629, 22.5937];
    }

    const safeLng = Math.max(-170, Math.min(170, targetCenter[0]));
    const safeLat = Math.max(-75, Math.min(75, targetCenter[1]));
    const safeZoom = Number.isFinite(item.zoom) ? item.zoom : isCountry ? 4.4 : 6.0;

    applyModeAndLayerStyling();

    try {
      mapInstance.stop();
      mapInstance.easeTo({
        center: [safeLng, safeLat],
        zoom: safeZoom,
        pitch: 0,
        bearing: 0,
        duration: 650,
        essential: true
      });
    } catch (err) {
      try {
        mapInstance.jumpTo({
          center: [safeLng, safeLat],
          zoom: safeZoom,
          pitch: 0,
          bearing: 0
        });
      } catch (e2) {}
    }

    if (isCountry) {
      const profile = buildGenericCountryProfile(item.name);
      showInfoCard(profile, "Country Profile (A–G)");
    } else {
      const stateProfile = buildFullIndiaStateProfile(item.name);
      showInfoCard(stateProfile, "Indian State Profile (A–G)");
    }
  }
  function getInitialMapStyle() {
    return {
      version: 8,
      glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      sources: {
        "iqra-terrain-tiles": {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}"
          ],
          tileSize: 256,
          crossOrigin: "anonymous"
        }
      },
      layers: [
        {
          id: "iqra-ocean-bg",
          type: "background",
          paint: {
            "background-color": "#bae6fd"
          }
        },
        {
          id: "iqra-terrain-layer",
          type: "raster",
          source: "iqra-terrain-tiles",
          layout: {
            visibility: "none"
          },
          minzoom: 0,
          maxzoom: 19
        }
      ]
    };
  }

  function buildLabelPointsGeoJson(geoJson, propKey) {
    if (!geoJson || !geoJson.features) return { type: "FeatureCollection", features: [] };
    return {
      type: "FeatureCollection",
      features: geoJson.features.map((f) => {
        const label = (f.properties && (f.properties[propKey] || f.properties.name)) || "";
        const center = (f.properties && f.properties._center) || computeFeatureBoundsAndCenter(f).center;
        return {
          type: "Feature",
          properties: { label },
          geometry: { type: "Point", coordinates: center }
        };
      })
    };
  }

  async function addVectorBoundariesLayers() {
    if (!mapInstance) return;
    try {
      if (!cachedIndiaGeoJson) {
        const res = await fetch(INDIA_STATES_GEOJSON_URL);
        cachedIndiaGeoJson = await res.json();
        (cachedIndiaGeoJson.features || []).forEach((f, idx) => {
          f.properties = f.properties || {};
          f.properties._colorIdx = idx % 7;
          const geomInfo = computeFeatureBoundsAndCenter(f);
          f.properties._center = geomInfo.center;
        });
      }
      await ensureWorldCountriesLoaded();

      if (cachedWorldGeoJson && !mapInstance.getSource("world-countries-src")) {
        mapInstance.addSource("world-countries-src", {
          type: "geojson",
          data: cachedWorldGeoJson
        });
        mapInstance.addSource("world-labels-src", {
          type: "geojson",
          data: buildLabelPointsGeoJson(cachedWorldGeoJson, "name")
        });

        mapInstance.addLayer({
          id: "world-countries-fill",
          type: "fill",
          source: "world-countries-src",
          filter: ["!=", ["downcase", ["get", "name"]], "india"],
          paint: {
            "fill-color": "#38bdf8",
            "fill-opacity": 1
          }
        });

        mapInstance.addLayer({
          id: "world-countries-borders",
          type: "line",
          source: "world-countries-src",
          paint: {
            "line-color": "#1e293b",
            "line-width": 1.2
          }
        });

        mapInstance.addLayer({
          id: "world-countries-labels",
          type: "symbol",
          source: "world-labels-src",
          layout: {
            "text-field": ["get", "label"],
            "text-size": 11,
            "text-allow-overlap": false
          },
          paint: {
            "text-color": "#0f172a",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.6
          }
        });
      }

      if (!mapInstance.getSource("india-states-src")) {
        mapInstance.addSource("india-states-src", {
          type: "geojson",
          data: cachedIndiaGeoJson
        });
        mapInstance.addSource("india-labels-src", {
          type: "geojson",
          data: buildLabelPointsGeoJson(cachedIndiaGeoJson, "NAME_1")
        });
      }

      if (!mapInstance.getLayer("india-states-fill")) {
        mapInstance.addLayer({
          id: "india-states-fill",
          type: "fill",
          source: "india-states-src",
          paint: {
            "fill-color": "#0284c7",
            "fill-opacity": 1
          }
        });
      }

      if (!mapInstance.getLayer("india-states-borders")) {
        mapInstance.addLayer({
          id: "india-states-borders",
          type: "line",
          source: "india-states-src",
          paint: {
            "line-color": "#0f172a",
            "line-width": 1.4
          }
        });
      }

      if (!mapInstance.getLayer("india-states-labels")) {
        mapInstance.addLayer({
          id: "india-states-labels",
          type: "symbol",
          source: "india-labels-src",
          minzoom: 3.6,
          layout: {
            "text-field": ["get", "label"],
            "text-size": 11.5,
            "text-allow-overlap": false
          },
          paint: {
            "text-color": "#0f172a",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.6
          }
        });
      }

      applyModeAndLayerStyling();

      mapInstance.on("click", "india-states-fill", (e) => {
        if (isMeasureModeActive || isMapPenDrawing) return;
        const feature = e.features && e.features[0];
        if (!feature || !feature.properties) return;
        const stateName = feature.properties.NAME_1 || feature.properties.st_nm || "Indian State";
        flyToLocation({ name: stateName }, false);
      });

      mapInstance.on("click", "world-countries-fill", (e) => {
        if (isMeasureModeActive || isMapPenDrawing) return;
        const feature = e.features && e.features[0];
        if (!feature || !feature.properties) return;
        const countryName = feature.properties.name || "Country";
        flyToLocation({ name: countryName }, true);
      });
    } catch (err) {
      console.warn("Boundaries layer warning:", err);
    }
  }

  function applyModeAndLayerStyling() {
    if (!mapInstance) return;

    const multiColorExpr = [
      "match",
      ["get", "_colorIdx"],
      0, "#fbbf24",
      1, "#34d399",
      2, "#60a5fa",
      3, "#f472b6",
      4, "#a78bfa",
      5, "#2dd4bf",
      "#fb923c"
    ];

    const isPhysical = currentMapMode === "physical";
    const isBlank = currentMapMode === "blank";

    if (mapInstance.getLayer("iqra-ocean-bg")) {
      mapInstance.setLayoutProperty("iqra-ocean-bg", "visibility", isPhysical ? "none" : "visible");
      mapInstance.setPaintProperty("iqra-ocean-bg", "background-color", isBlank ? "#f1f5f9" : "#bae6fd");
    }
    if (mapInstance.getLayer("iqra-terrain-layer")) {
      mapInstance.setLayoutProperty("iqra-terrain-layer", "visibility", isPhysical ? "visible" : "none");
    }

    if (mapInstance.getLayer("world-countries-fill")) {
      mapInstance.setLayoutProperty("world-countries-fill", "visibility", isPhysical ? "none" : "visible");
      if (!isPhysical) {
        mapInstance.setPaintProperty("world-countries-fill", "fill-color", isBlank ? "#e2e8f0" : multiColorExpr);
        mapInstance.setPaintProperty("world-countries-fill", "fill-opacity", 1);
      }
    }

    if (mapInstance.getLayer("india-states-fill")) {
      mapInstance.setLayoutProperty("india-states-fill", "visibility", isPhysical ? "none" : "visible");
      if (!isPhysical) {
        mapInstance.setPaintProperty("india-states-fill", "fill-color", isBlank ? "#cbd5e1" : multiColorExpr);
        mapInstance.setPaintProperty("india-states-fill", "fill-opacity", 1);
      }
    }

    const labelVisibility = showMapNames ? "visible" : "none";
    if (mapInstance.getLayer("world-countries-labels")) {
      mapInstance.setLayoutProperty("world-countries-labels", "visibility", labelVisibility);
    }
    if (mapInstance.getLayer("india-states-labels")) {
      mapInstance.setLayoutProperty("india-states-labels", "visibility", labelVisibility);
    }
  }

  async function initMapLibreInstance() {
    const maplibregl = await ensureMapLibreLoaded();
    const container = document.getElementById("iqraMapCanvas");
    if (!container) return;

    if (mapInstance) {
      mapInstance.resize();
      syncMapInkCanvasSize();
      return;
    }

    mapInstance = new maplibregl.Map({
      container: "iqraMapCanvas",
      style: getInitialMapStyle(),
      center: [78.9629, 22.5937],
      zoom: 4.2,
      minZoom: 1.8,
      maxZoom: 14,
      maxPitch: 0,
      pitchWithRotate: false,
      dragRotate: false,
      renderWorldCopies: false,
      pitch: 0,
      bearing: 0,
      preserveDrawingBuffer: true
    });

    mapInstance.addControl(
      new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }),
      "bottom-right"
    );

    mapInstance.on("load", () => {
      addVectorBoundariesLayers();
      syncMapInkCanvasSize();
    });

    mapInstance.on("click", (e) => {
      if (isMapPenDrawing || !isMeasureModeActive) return;
      const { lng, lat } = e.lngLat;

      if (measurePoints.length >= 2) {
        clearDistanceMeasurement();
      }
      measurePoints.push([lng, lat]);

      const dotEl = document.createElement("div");
      dotEl.style.cssText =
        "width:13px;height:13px;border-radius:50%;background:#10b981;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.4);";
      const marker = new maplibregl.Marker({ element: dotEl })
        .setLngLat([lng, lat])
        .addTo(mapInstance);
      measureMarkers.push(marker);

      if (measurePoints.length === 2) {
        const km = haversineDistanceKm(measurePoints[0], measurePoints[1]);
        drawDistanceLine(measurePoints[0], measurePoints[1], km);
      }
    });
  }

  function haversineDistanceKm(c1, c2) {
    const R = 6371;
    const dLat = ((c2[1] - c1[1]) * Math.PI) / 180;
    const dLon = ((c2[0] - c1[0]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((c1[1] * Math.PI) / 180) *
        Math.cos((c2[1] * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  function drawDistanceLine(p1, p2, km) {
    if (!mapInstance) return;
    const lineGeoJson = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [p1, p2] }
    };

    if (mapInstance.getSource("iqra-measure-src")) {
      mapInstance.getSource("iqra-measure-src").setData(lineGeoJson);
    } else {
      mapInstance.addSource("iqra-measure-src", { type: "geojson", data: lineGeoJson });
      mapInstance.addLayer({
        id: "iqra-measure-line",
        type: "line",
        source: "iqra-measure-src",
        paint: { "line-color": "#10b981", "line-width": 4 }
      });
    }

    const midLng = (p1[0] + p2[0]) / 2;
    const midLat = (p1[1] + p2[1]) / 2;
    const badgeEl = document.createElement("div");
    badgeEl.className = "iqra-dist-badge";
    badgeEl.innerText = `📏 ${km.toLocaleString()} km`;

    const distMarker = new window.maplibregl.Marker({ element: badgeEl })
      .setLngLat([midLng, midLat])
      .addTo(mapInstance);
    measureMarkers.push(distMarker);
  }

  function clearDistanceMeasurement() {
    measureMarkers.forEach((m) => m.remove());
    measureMarkers = [];
    measurePoints = [];
    if (mapInstance && mapInstance.getSource("iqra-measure-src")) {
      mapInstance.getSource("iqra-measure-src").setData({
        type: "FeatureCollection",
        features: []
      });
    }
  }

  function sendMapSnapshotToWhiteboard() {
    if (!mapInstance) return;

    mapInstance.triggerRepaint();
    mapInstance.once("render", () => {
      const glCanvas = mapInstance.getCanvas();
      const inkCanvas = document.getElementById("iqraMapAnnotateCanvas");
      if (!glCanvas) return;

      const merged = document.createElement("canvas");
      merged.width = glCanvas.width;
      merged.height = glCanvas.height;
      const ctx = merged.getContext("2d");

      ctx.drawImage(glCanvas, 0, 0);
      if (inkCanvas && inkCanvas.width > 0) {
        ctx.drawImage(inkCanvas, 0, 0, merged.width, merged.height);
      }

      const scaleX = merged.width / glCanvas.clientWidth;
      const scaleY = merged.height / glCanvas.clientHeight;
      measureMarkers.forEach((m) => {
        const pt = mapInstance.project(m.getLngLat());
        const el = m.getElement();
        const text = el ? el.innerText.trim() : "";
        if (text) {
          ctx.save();
          ctx.font = `bold ${Math.round(13 * scaleX)}px sans-serif`;
          const tw = ctx.measureText(text).width + 16 * scaleX;
          const th = 24 * scaleY;
          const bx = pt.x * scaleX - tw / 2;
          const by = pt.y * scaleY - th - 6 * scaleY;
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(bx, by, tw, th);
          ctx.fillStyle = "#34d399";
          ctx.fillText(text, bx + 8 * scaleX, by + 16 * scaleY);
          ctx.restore();
        }
      });

      const dataUrl = merged.toDataURL("image/png");
      closeMaps3DExplorer();

      const selectToolBtn = document.getElementById("selectToolBtn") || document.querySelector("[data-tool='select']");
      if (selectToolBtn) selectToolBtn.click();

      if (typeof window.addImageToWhiteboard === "function") {
        window.addImageToWhiteboard(dataUrl, 160, 110);
      }
    });
  }

  function bindMapsModalEvents() {
    document.getElementById("btnCloseMaps3D")?.addEventListener("click", closeMaps3DExplorer);
    document.getElementById("btnMapWallMinimize")?.addEventListener("click", () => toggleMapLeftWallMinimize(true));
    document.getElementById("btnCloseInfoCard")?.addEventListener("click", () => {
      document.getElementById("maps3dInfoCard")?.classList.remove("visible");
    });

    document.getElementById("infoSecTabs")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".info-sec-btn");
      if (!btn) return;
      renderInfoCardSection(btn.dataset.sec);
    });

    const showNamesBtn = document.getElementById("btnToggleShowNames");
    showNamesBtn?.addEventListener("click", () => {
      showMapNames = !showMapNames;
      showNamesBtn.classList.toggle("active-blue", showMapNames);
      showNamesBtn.innerHTML = showMapNames
        ? '<i class="fa-solid fa-font"></i> <span>Show Names</span>'
        : '<i class="fa-solid fa-eye-slash"></i> <span>Names Hidden</span>';
      applyModeAndLayerStyling();
    });

    const fsBtn = document.getElementById("btnMapFullScreenToggle");
    fsBtn?.addEventListener("click", () => {
      const modal = document.getElementById("iqraMaps3DModal");
      if (!modal) return;
      isFullScreen = !isFullScreen;
      modal.classList.toggle("windowed", !isFullScreen);
      fsBtn.innerHTML = isFullScreen
        ? '<i class="fa-solid fa-compress"></i>'
        : '<i class="fa-solid fa-expand"></i>';
      setTimeout(() => {
        mapInstance?.resize();
        syncMapInkCanvasSize();
      }, 220);
    });

    document.querySelectorAll("#iqraMaps3DModal .maps3d-mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#iqraMaps3DModal .maps3d-mode-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentMapMode = btn.dataset.mode;

        if (currentMapMode === "blank") {
          showMapNames = false;
          showNamesBtn?.classList.remove("active-blue");
          if (showNamesBtn) {
            showNamesBtn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> <span>Names Hidden</span>';
          }
        } else {
          showMapNames = true;
          showNamesBtn?.classList.add("active-blue");
          if (showNamesBtn) {
            showNamesBtn.innerHTML = '<i class="fa-solid fa-font"></i> <span>Show Names</span>';
          }
        }

        applyModeAndLayerStyling();
      });
    });

    const penBoxBtn = document.getElementById("btnMapPenBoxToggle");
    const penBox = document.getElementById("maps3dPenBox");
    const inkCanvas = document.getElementById("iqraMapAnnotateCanvas");

    penBoxBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      isPenBoxOpen = !isPenBoxOpen;
      isMapPenDrawing = isPenBoxOpen;
      syncMapInkCanvasSize();

      if (penBox) {
        penBox.classList.toggle("open", isPenBoxOpen);
        penBox.style.display = isPenBoxOpen ? "flex" : "none";
      }
      penBoxBtn.classList.toggle("active-tool", isPenBoxOpen);
      inkCanvas?.classList.toggle("drawing-active", isMapPenDrawing);

      if (isMapPenDrawing) {
        isMeasureModeActive = false;
        document.getElementById("btnMapMeasureTool")?.classList.remove("active-tool");
      }
    });

    document.getElementById("btnClosePenBox")?.addEventListener("click", () => {
      isPenBoxOpen = false;
      isMapPenDrawing = false;
      if (penBox) {
        penBox.classList.remove("open");
        penBox.style.display = "none";
      }
      penBoxBtn?.classList.remove("active-tool");
      inkCanvas?.classList.remove("drawing-active");
    });

    document.querySelectorAll("#iqraMaps3DModal .maps3d-swatch").forEach((sw) => {
      sw.addEventListener("click", () => {
        document.querySelectorAll("#iqraMaps3DModal .maps3d-swatch").forEach((s) => s.classList.remove("active"));
        sw.classList.add("active");
        mapPenColor = sw.dataset.color;
        mapPenTool = "pen";
        isMapPenDrawing = true;
        syncMapInkCanvasSize();
        inkCanvas?.classList.add("drawing-active");
        document.getElementById("btnMapPenSelect")?.classList.add("active");
        document.getElementById("btnMapEraserSelect")?.classList.remove("active");
      });
    });

    document.getElementById("btnMapPenSelect")?.addEventListener("click", () => {
      mapPenTool = "pen";
      isMapPenDrawing = true;
      syncMapInkCanvasSize();
      inkCanvas?.classList.add("drawing-active");
      document.getElementById("btnMapPenSelect")?.classList.add("active");
      document.getElementById("btnMapEraserSelect")?.classList.remove("active");
    });

    document.getElementById("btnMapEraserSelect")?.addEventListener("click", () => {
      mapPenTool = "eraser";
      isMapPenDrawing = true;
      syncMapInkCanvasSize();
      inkCanvas?.classList.add("drawing-active");
      document.getElementById("btnMapEraserSelect")?.classList.add("active");
      document.getElementById("btnMapPenSelect")?.classList.remove("active");
    });

    document.getElementById("btnMapClearInk")?.addEventListener("click", () => {
      if (inkCanvas) {
        inkCanvas.getContext("2d").clearRect(0, 0, inkCanvas.width, inkCanvas.height);
      }
    });

    document.querySelectorAll("#iqraMaps3DModal .maps3d-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll("#iqraMaps3DModal .maps3d-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        activeSidebarTab = tab.dataset.tab;
        const searchInp = document.getElementById("maps3dSearchInput");
        if (searchInp) searchInp.value = "";
        renderPresetList("");
      });
    });

    document.getElementById("maps3dSearchInput")?.addEventListener("input", (e) => {
      renderPresetList(e.target.value);
    });

    const measureBtn = document.getElementById("btnMapMeasureTool");
    measureBtn?.addEventListener("click", () => {
      isMeasureModeActive = !isMeasureModeActive;
      isMapPenDrawing = false;
      isPenBoxOpen = false;
      if (penBox) {
        penBox.classList.remove("open");
        penBox.style.display = "none";
      }
      inkCanvas?.classList.remove("drawing-active");
      clearDistanceMeasurement();
      measureBtn.classList.toggle("active-tool", isMeasureModeActive);
      penBoxBtn?.classList.remove("active-tool");
    });

    document.getElementById("btnMapClearPins")?.addEventListener("click", () => {
      clearDistanceMeasurement();
      highlightedRegionName = "";
      applyModeAndLayerStyling();
      if (inkCanvas) {
        inkCanvas.getContext("2d").clearRect(0, 0, inkCanvas.width, inkCanvas.height);
      }
    });

    document.getElementById("btnMapToBoard")?.addEventListener("click", sendMapSnapshotToWhiteboard);

    document.getElementById("btnCamIndiaReset")?.addEventListener("click", () => {
      flyToLocation(
        {
          name: "India",
          center: [78.9629, 22.5937],
          zoom: 4.2
        },
        true
      );
    });
    document.getElementById("btnCamWorldReset")?.addEventListener("click", () => {
      highlightedRegionName = "";
      applyModeAndLayerStyling();
      mapInstance?.stop();
      mapInstance?.easeTo({
        center: [25, 20],
        zoom: 1.9,
        pitch: 0,
        bearing: 0,
        duration: 700,
        essential: true
      });
    });
  }

  async function openMaps3DExplorer() {
    createMapsModalDOM();
    const modal = document.getElementById("iqraMaps3DModal");
    if (!modal) return;

    modal.classList.add("open");
    modal.classList.remove("wall-minimized");
    isMapModalOpen = true;
    isMapWallMinimized = false;
    const wallTab = document.getElementById("iqraMapWallRestoreTab");
    if (wallTab) wallTab.style.display = "none";

    renderPresetList("");
    await initMapLibreInstance();
    setTimeout(() => {
      mapInstance?.resize();
      syncMapInkCanvasSize();
    }, 100);
  }

  function closeMaps3DExplorer() {
    const modal = document.getElementById("iqraMaps3DModal");
    if (modal) {
      modal.classList.remove("open");
      modal.classList.remove("wall-minimized");
    }
    const wallTab = document.getElementById("iqraMapWallRestoreTab");
    if (wallTab) wallTab.style.display = "none";
    isMapModalOpen = false;
    isMapWallMinimized = false;
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#dockBtnMaps3D");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (isMapWallMinimized) {
      toggleMapLeftWallMinimize(false);
    } else if (isMapModalOpen) {
      closeMaps3DExplorer();
    } else {
      openMaps3DExplorer();
    }
  });

  window.openMaps3DExplorer = openMaps3DExplorer;
  window.closeMaps3DExplorer = closeMaps3DExplorer;
})(window);