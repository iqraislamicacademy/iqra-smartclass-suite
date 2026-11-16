// ========================================================
// IQRA SMARTCLASS SUITE - IQRA 3D SPACE EXPLORER (solar3d.js)
// Upgrade v4.0:
// 1. Removed "Core Cutaway" from Top Header (Now inside each Planet/Star Inspector Card!)
// 2. Clicking Sun or any Planet opens a dedicated Solo 3D Inspection Stage in center + full Right Card
// 3. Inside Right Card: "View Internal Core" button toggles authentic 3D cutaway & layer composition
// 4. Realistic Solar Corona SVG Emblem before IQRA badge
// 5. Built-in Ambient Deep-Space Audio Synthesizer with Header On/Off Toggle
// ========================================================
(function (window) {
  "use strict";

  const THREE_JS_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

  let isSolarModalOpen = false;
  let isFullScreen = true;
  let isLeftDrawerOpen = true;
  let showLabels = true;
  let showOrbits = true;
  let currentSolarMode = "orbit"; // orbit | solo_body | moons | compare | galaxies
  let isSoloCoreOpen = false;

  let scene, camera, renderer, animFrameId;
  let solarSystemRoot, galaxyRoot, soloStageRoot;
  let soloSurfaceMesh, soloAtmoMesh, soloRingMesh, soloGlowSprite, soloCoreGroup;
  let sunGlowSprite, asteroidInstancedMesh, auGridGroup, starFieldPoints;
  let planetEntries = [];
  let galaxyEntries = [];
  let selectedPlanetKey = null;
  let selectedMoonKey = "luna";
  let selectedGalaxyKey = "milkyway";

  // Camera spherical orbit state
  let camTarget = { x: 0, y: 0, z: 0 };
  let camGoalTarget = { x: 0, y: 0, z: 0 };
  let camSpherical = { radius: 86, theta: 0.65, phi: 0.92 };
  let camGoalSpherical = { radius: 86, theta: 0.65, phi: 0.92 };
  let isDraggingOrbit = false;
  let prevPointer = { x: 0, y: 0 };

  // Time & Speed Controller
  let simDate = new Date();
  let isTimePaused = false;
  let isRealTimeMode = false;
  const SPEED_STEPS = [0.1, 0.5, 1, 2, 5, 15, 40];
  let speedStepIndex = 2;
  let timeSpeedDaysPerSec = SPEED_STEPS[speedStepIndex];

  // Laser Pointer state
  let isLaserActive = false;
  let laserTrail = [];

  // Ambient Space Sound (Web Audio API)
  let spaceAudioCtx = null;
  let spaceMasterGain = null;
  let isSpaceSoundOn = false;

  // ==========================================
  // 1. SCIENTIFIC PLANETARY & INTERNAL CORE DATABASE
  // ==========================================
  const SOLAR_BODIES = [
    {
      key: "sun",
      name: "Sun",
      category: "G-Type Main-Sequence Star",
      radius: 6.0,
      distance: 0,
      orbitPeriodDays: 1,
      rotSpeed: 0.0022,
      tilt: 7.25,
      dotColor: "#fbbf24",
      diameter: "1,392,700 km (109× Earth)",
      distFromSun: "0 AU (Center of Solar System)",
      dayLength: "25.4 Earth days (Equator)",
      yearLength: "230 Million years (Galactic orbit)",
      temp: "5,500 °C (Surface) / 15M °C (Core)",
      moonsCount: "8 Planets",
      majorMoons: [],
      layers: [
        { name: "Photosphere", depth: "500 km thick • 5,500 °C", color: "#facc15" },
        { name: "Convective Zone", depth: "200,000 km • Plasma currents", color: "#f97316" },
        { name: "Radiative Zone", depth: "300,000 km • 2M–7M °C", color: "#dc2626" },
        { name: "Solar Core", depth: "Radius 150,000 km • 15,000,000 °C (Fusion)", color: "#ffffff" },
      ],
      facts: "Contains 99.86% of the Solar System's mass; sustained by hydrogen-to-helium nuclear fusion in its core.",
    },
    {
      key: "mercury",
      name: "Mercury",
      category: "Terrestrial Planet",
      radius: 1.0,
      distance: 11.5,
      orbitPeriodDays: 88,
      rotSpeed: 0.0035,
      tilt: 0.03,
      dotColor: "#a8a29e",
      diameter: "4,879 km",
      distFromSun: "0.39 AU (57.9 Million km)",
      dayLength: "58.6 Earth days",
      yearLength: "88 Earth days",
      temp: "-180 °C to 430 °C",
      moonsCount: "0 Moons",
      majorMoons: [],
      layers: [
        { name: "Silicate Crust", depth: "35 km thick • Cratered rock", color: "#78716c" },
        { name: "Rocky Silicate Mantle", depth: "400 km thick", color: "#b45309" },
        { name: "Massive Iron Core", depth: "Radius 2,020 km (85% of planet radius)", color: "#fde047" },
      ],
      facts: "Smallest innermost planet with ancient impact basins like Caloris Basin and an oversized metallic iron core.",
    },
    {
      key: "venus",
      name: "Venus",
      category: "Terrestrial Planet",
      radius: 1.5,
      distance: 16.5,
      orbitPeriodDays: 225,
      rotSpeed: -0.002,
      tilt: 177.3,
      dotColor: "#e7c27d",
      diameter: "12,104 km",
      distFromSun: "0.72 AU (108.2 Million km)",
      dayLength: "243 Earth days (Retrograde)",
      yearLength: "225 Earth days",
      temp: "465 °C (Hottest Planet)",
      moonsCount: "0 Moons",
      majorMoons: [],
      layers: [
        { name: "Basaltic Crust", depth: "20–50 km • Volcanic plains", color: "#d97706" },
        { name: "Silicate Mantle", depth: "3,000 km thick • Hot rock", color: "#ea580c" },
        { name: "Iron-Nickel Core", depth: "Radius ~3,000 km", color: "#fef08a" },
      ],
      facts: "Dense CO₂ atmosphere creates a runaway greenhouse effect; spins backward from east to west.",
    },
    {
      key: "earth",
      name: "Earth",
      category: "Terrestrial Planet",
      radius: 1.7,
      distance: 22.5,
      orbitPeriodDays: 365.25,
      rotSpeed: 0.011,
      tilt: 23.44,
      dotColor: "#3b82f6",
      diameter: "12,742 km",
      distFromSun: "1.00 AU (149.6 Million km)",
      dayLength: "23 hrs 56 mins",
      yearLength: "365.25 days",
      temp: "15 °C (Average)",
      moonsCount: "1 Moon",
      majorMoons: [{ name: "Moon (Luna)", dist: 3.0, size: 0.42, speed: 0.025, color: "#d6d3d1" }],
      layers: [
        { name: "Crust", depth: "5–70 km • Oceanic & Continental plates", color: "#2563eb" },
        { name: "Mantle", depth: "2,890 km • Semi-solid silicate magma", color: "#ea580c" },
        { name: "Outer Core", depth: "2,260 km • Liquid iron & nickel (4,500 °C)", color: "#facc15" },
        { name: "Inner Core", depth: "Radius 1,220 km • Solid iron-nickel (5,200 °C)", color: "#ffffff" },
      ],
      facts: "71% covered by liquid oceans; protected by a magnetosphere generated by its liquid outer core.",
    },
    {
      key: "mars",
      name: "Mars",
      category: "Terrestrial Planet",
      radius: 1.3,
      distance: 28.5,
      orbitPeriodDays: 687,
      rotSpeed: 0.0105,
      tilt: 25.19,
      dotColor: "#c2410c",
      diameter: "6,779 km",
      distFromSun: "1.52 AU (227.9 Million km)",
      dayLength: "24 hrs 37 mins",
      yearLength: "687 Earth days",
      temp: "-63 °C (Average)",
      moonsCount: "2 Moons",
      majorMoons: [
        { name: "Phobos", dist: 2.1, size: 0.16, speed: 0.045, color: "#a8a29e" },
        { name: "Deimos", dist: 2.7, size: 0.12, speed: 0.028, color: "#d6d3d1" },
      ],
      layers: [
        { name: "Iron-Oxide Crust", depth: "24–72 km • Basaltic rock", color: "#b91c1c" },
        { name: "Silicate Mantle", depth: "1,500 km • Dormant rock", color: "#ea580c" },
        { name: "Iron-Nickel-Sulfur Core", depth: "Radius 1,830 km • Liquid core", color: "#fde047" },
      ],
      facts: "Iron-oxide dust gives its reddish color; hosts Olympus Mons (tallest planetary volcano).",
    },
    {
      key: "jupiter",
      name: "Jupiter",
      category: "Gas Giant",
      radius: 3.55,
      distance: 41.0,
      orbitPeriodDays: 4333,
      rotSpeed: 0.022,
      tilt: 3.13,
      dotColor: "#d6a87c",
      diameter: "139,820 km (11× Earth)",
      distFromSun: "5.20 AU (778.5 Million km)",
      dayLength: "9 hrs 55 mins (Fastest spin)",
      yearLength: "11.86 Earth years",
      temp: "-110 °C",
      moonsCount: "95 Moons",
      majorMoons: [
        { name: "Ganymede", dist: 5.8, size: 0.36, speed: 0.022, color: "#cbd5e1" },
        { name: "Europa", dist: 4.8, size: 0.26, speed: 0.032, color: "#f8fafc" },
        { name: "Io", dist: 4.2, size: 0.28, speed: 0.042, color: "#fde047" },
        { name: "Callisto", dist: 6.7, size: 0.32, speed: 0.015, color: "#94a3b8" },
      ],
      layers: [
        { name: "Molecular Hydrogen Envelope", depth: "21,000 km • Gas & liquid H₂", color: "#fdba74" },
        { name: "Liquid Metallic Hydrogen", depth: "40,000 km • Conductive fluid", color: "#38bdf8" },
        { name: "Dense Rock & Ice Core", depth: "Up to 20,000 °C • High pressure", color: "#fef08a" },
      ],
      facts: "More than twice as massive as all other planets combined; famed for the Great Red Spot anticyclone.",
    },
    {
      key: "saturn",
      name: "Saturn",
      category: "Gas Giant",
      radius: 2.95,
      distance: 53.5,
      orbitPeriodDays: 10759,
      rotSpeed: 0.019,
      tilt: 26.73,
      dotColor: "#e5d09c",
      hasRings: true,
      diameter: "116,460 km (9.1× Earth)",
      distFromSun: "9.58 AU (1.43 Billion km)",
      dayLength: "10 hrs 33 mins",
      yearLength: "29.45 Earth years",
      temp: "-140 °C",
      moonsCount: "146 Moons",
      majorMoons: [
        { name: "Titan", dist: 7.8, size: 0.36, speed: 0.02, color: "#f59e0b" },
        { name: "Enceladus", dist: 7.0, size: 0.18, speed: 0.035, color: "#f8fafc" },
        { name: "Rhea", dist: 8.5, size: 0.22, speed: 0.016, color: "#cbd5e1" },
      ],
      layers: [
        { name: "Hydrogen-Helium Atmosphere", depth: "30,000 km • Gas & liquid", color: "#fde047" },
        { name: "Metallic Hydrogen Layer", depth: "15,000 km • High pressure", color: "#60a5fa" },
        { name: "Rocky-Ice Core", depth: "11,700 °C • Iron & silicate core", color: "#ffffff" },
      ],
      facts: "Encircled by bright ice-and-rock rings spanning 282,000 km across; least dense planet.",
    },
    {
      key: "uranus",
      name: "Uranus",
      category: "Ice Giant",
      radius: 2.15,
      distance: 64.5,
      orbitPeriodDays: 30687,
      rotSpeed: -0.014,
      tilt: 97.77,
      dotColor: "#7dd3fc",
      diameter: "50,724 km (4× Earth)",
      distFromSun: "19.2 AU (2.87 Billion km)",
      dayLength: "17 hrs 14 mins",
      yearLength: "84 Earth years",
      temp: "-195 °C",
      moonsCount: "28 Moons",
      majorMoons: [
        { name: "Titania", dist: 3.8, size: 0.24, speed: 0.024, color: "#cbd5e1" },
        { name: "Oberon", dist: 4.5, size: 0.22, speed: 0.018, color: "#94a3b8" },
      ],
      layers: [
        { name: "H₂-He-Methane Atmosphere", depth: "5,000 km • Cyan methane haze", color: "#22d3ee" },
        { name: "Hot Dense Ice Mantle", depth: "15,000 km • Water, ammonia & methane", color: "#2563eb" },
        { name: "Silicate-Iron Core", depth: "5,000 °C • Small rocky center", color: "#fde047" },
      ],
      facts: "Rotates on its side at a 98° axial tilt, causing extreme 42-year-long polar seasons.",
    },
    {
      key: "neptune",
      name: "Neptune",
      category: "Ice Giant",
      radius: 2.1,
      distance: 74.5,
      orbitPeriodDays: 60190,
      rotSpeed: 0.015,
      tilt: 28.32,
      dotColor: "#2563eb",
      diameter: "49,244 km (3.9× Earth)",
      distFromSun: "30.1 AU (4.50 Billion km)",
      dayLength: "16 hrs 6 mins",
      yearLength: "164.8 Earth years",
      temp: "-200 °C",
      moonsCount: "16 Moons",
      majorMoons: [{ name: "Triton", dist: 3.9, size: 0.28, speed: -0.025, color: "#e2e8f0" }],
      layers: [
        { name: "Methane-Rich Atmosphere", depth: "5,000 km • Supersonic winds", color: "#3b82f6" },
        { name: "Water-Ammonia Ice Mantle", depth: "14,000 km • Superionic fluid", color: "#1e40af" },
        { name: "Rocky Iron-Silicate Core", depth: "5,400 °C • Earth-mass core", color: "#fde047" },
      ],
      facts: "Outermost major planet with supersonic methane winds reaching 2,100 km/h.",
    },
  ];

  // ==========================================
  // 2. DEDICATED MOONS DATABASE
  // ==========================================
  const MOONS_DATABASE = [
    {
      key: "luna",
      name: "Moon (Luna)",
      parent: "Earth",
      diameter: "3,474 km (0.27× Earth)",
      distance: "384,400 km from Earth",
      orbitalPeriod: "27.3 Earth days (Tidally Locked)",
      temp: "-173 °C to 127 °C",
      color1: "#cbd5e1",
      color2: "#64748b",
      style: "cratered",
      facts: "Earth's only natural satellite and the 5th largest moon in the Solar System. Stabilizes Earth's axial tilt and creates ocean tides.",
    },
    {
      key: "phobos",
      name: "Phobos",
      parent: "Mars",
      diameter: "22.2 km",
      distance: "9,376 km from Mars",
      orbitalPeriod: "7 hrs 39 mins",
      temp: "-40 °C (Average)",
      color1: "#a8a29e",
      color2: "#57534e",
      style: "rocky",
      facts: "Larger of Mars's two moons; orbits so close to Mars that it rises in the west and sets in the east twice a Martian day.",
    },
    {
      key: "deimos",
      name: "Deimos",
      parent: "Mars",
      diameter: "12.6 km",
      distance: "23,463 km from Mars",
      orbitalPeriod: "30.3 hours",
      temp: "-40 °C (Average)",
      color1: "#d6d3d1",
      color2: "#78716c",
      style: "rocky",
      facts: "Smaller, outer moon of Mars with a smoother regolith-covered surface; likely a captured asteroid.",
    },
    {
      key: "ganymede",
      name: "Ganymede",
      parent: "Jupiter",
      diameter: "5,268 km (Largest Moon)",
      distance: "1,070,400 km from Jupiter",
      orbitalPeriod: "7.15 Earth days",
      temp: "-163 °C",
      color1: "#94a3b8",
      color2: "#475569",
      style: "icy_cratered",
      facts: "Largest moon in the entire Solar System—larger than the planet Mercury—and the only moon known to generate its own magnetic field.",
    },
    {
      key: "europa",
      name: "Europa",
      parent: "Jupiter",
      diameter: "3,121 km",
      distance: "671,100 km from Jupiter",
      orbitalPeriod: "3.55 Earth days",
      temp: "-171 °C",
      color1: "#f8fafc",
      color2: "#cbd5e1",
      style: "icy_streaks",
      facts: "Covered by a smooth shell of water ice crisscrossed by reddish fractures; hides a vast liquid saltwater ocean beneath.",
    },
    {
      key: "io",
      name: "Io",
      parent: "Jupiter",
      diameter: "3,643 km",
      distance: "421,800 km from Jupiter",
      orbitalPeriod: "1.77 Earth days",
      temp: "-130 °C (Surface) / 1,600 °C (Lava)",
      color1: "#fde047",
      color2: "#ea580c",
      style: "volcanic",
      facts: "Most geologically active body in the Solar System with over 400 active volcanoes fueled by Jupiter's intense tidal heating.",
    },
    {
      key: "callisto",
      name: "Callisto",
      parent: "Jupiter",
      diameter: "4,820 km",
      distance: "1,882,700 km from Jupiter",
      orbitalPeriod: "16.69 Earth days",
      temp: "-139 °C",
      color1: "#78716c",
      color2: "#44403c",
      style: "cratered",
      facts: "Third-largest moon in the Solar System with the oldest, most heavily cratered surface known.",
    },
    {
      key: "titan",
      name: "Titan",
      parent: "Saturn",
      diameter: "5,149 km (2nd Largest)",
      distance: "1,221,870 km from Saturn",
      orbitalPeriod: "15.95 Earth days",
      temp: "-179 °C",
      color1: "#f59e0b",
      color2: "#b45309",
      style: "hazy",
      facts: "Only moon in the Solar System with a dense nitrogen-rich atmosphere and stable liquid hydrocarbon (methane/ethane) lakes on its surface.",
    },
    {
      key: "enceladus",
      name: "Enceladus",
      parent: "Saturn",
      diameter: "504 km",
      distance: "238,020 km from Saturn",
      orbitalPeriod: "1.37 Earth days",
      temp: "-198 °C",
      color1: "#ffffff",
      color2: "#e2e8f0",
      style: "icy_streaks",
      facts: "Reflects nearly 100% of sunlight; south-polar geysers erupt water vapor and ice grains that feed Saturn's E Ring.",
    },
    {
      key: "titania",
      name: "Titania",
      parent: "Uranus",
      diameter: "1,578 km",
      distance: "435,910 km from Uranus",
      orbitalPeriod: "8.71 Earth days",
      temp: "-203 °C",
      color1: "#cbd5e1",
      color2: "#64748b",
      style: "icy_cratered",
      facts: "Largest moon of Uranus, composed of roughly equal amounts of ice and rock with massive fault valleys.",
    },
    {
      key: "triton",
      name: "Triton",
      parent: "Neptune",
      diameter: "2,706 km",
      distance: "354,759 km from Neptune",
      orbitalPeriod: "5.88 Earth days (Retrograde)",
      temp: "-235 °C (Coldest Measured)",
      color1: "#e2e8f0",
      color2: "#93c5fd",
      style: "icy_streaks",
      facts: "Only large moon orbiting in the opposite direction of its planet's rotation; features active nitrogen-gas geysers.",
    },
  ];

  // ==========================================
  // 3. GALAXIES DATABASE
  // ==========================================
  const GALAXIES_DATA = [
    {
      key: "milkyway",
      name: "Milky Way Galaxy",
      type: "Barred Spiral Galaxy (SBbc)",
      diameter: "105,700 Light-Years",
      stars: "100 – 400 Billion Stars",
      distance: "Home Galaxy (Sun is 26,000 ly from center)",
      coreColor: "#fde047",
      armColor: "#38bdf8",
      arms: 4,
      spinSpeed: 0.0018,
      facts: "Our home galaxy; the Solar System resides in the Orion-Cygnus Arm and orbits the galactic center every 230 million years.",
    },
    {
      key: "andromeda",
      name: "Andromeda Galaxy (M31)",
      type: "Spiral Galaxy (SA(s)b)",
      diameter: "220,000 Light-Years",
      stars: "~1 Trillion Stars",
      distance: "2.537 Million Light-Years from Earth",
      coreColor: "#fef08a",
      armColor: "#818cf8",
      arms: 2,
      spinSpeed: 0.0014,
      facts: "Nearest major galaxy to the Milky Way; visible to the naked eye on dark nights and approaching us at 110 km/s.",
    },
    {
      key: "whirlpool",
      name: "Whirlpool Galaxy (M51)",
      type: "Grand-Design Spiral Galaxy",
      diameter: "76,000 Light-Years",
      stars: "~100 Billion Stars",
      distance: "31 Million Light-Years (Canes Venatici)",
      coreColor: "#fbbf24",
      armColor: "#ec4899",
      arms: 2,
      spinSpeed: 0.0022,
      facts: "Classic grand-design spiral galaxy interacting with its smaller companion galaxy NGC 5195.",
    },
    {
      key: "sombrero",
      name: "Sombrero Galaxy (M104)",
      type: "Lenticular / Unbarred Spiral",
      diameter: "50,000 Light-Years",
      stars: "~100 Billion Stars",
      distance: "29.3 Million Light-Years (Virgo)",
      coreColor: "#ffffff",
      armColor: "#f59e0b",
      arms: 6,
      spinSpeed: 0.0016,
      facts: "Famous for its brilliant white core, large central bulge, and prominent dark dust lane resembling a wide-brimmed hat.",
    },
  ];

  // ==========================================
  // 4. AMBIENT SPACE SOUND SYNTHESIZER (WEB AUDIO API)
  // ==========================================
  function toggleSpaceAudio() {
    const btn = document.getElementById("btnSolarSpaceSound");
    if (!isSpaceSoundOn) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!spaceAudioCtx) {
          spaceAudioCtx = new AudioCtx();
          spaceMasterGain = spaceAudioCtx.createGain();
          spaceMasterGain.gain.setValueAtTime(0.001, spaceAudioCtx.currentTime);
          spaceMasterGain.connect(spaceAudioCtx.destination);

          // Deep cosmic harmonic oscillators (55Hz A1, 82.4Hz E2, 110Hz A2 + gentle filter)
          const filter = spaceAudioCtx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(220, spaceAudioCtx.currentTime);
          filter.connect(spaceMasterGain);

          [55, 82.41, 110, 164.81].forEach((freq, i) => {
            const osc = spaceAudioCtx.createOscillator();
            const g = spaceAudioCtx.createGain();
            osc.type = i % 2 === 0 ? "sine" : "triangle";
            osc.frequency.setValueAtTime(freq, spaceAudioCtx.currentTime);
            g.gain.setValueAtTime(0.18 / (i + 1), spaceAudioCtx.currentTime);
            osc.connect(g);
            g.connect(filter);
            osc.start();
          });
        }
        if (spaceAudioCtx.state === "suspended") spaceAudioCtx.resume();
        spaceMasterGain.gain.exponentialRampToValueAtTime(0.28, spaceAudioCtx.currentTime + 0.8);
        isSpaceSoundOn = true;
      } catch (err) {
        console.warn("Space audio blocked:", err);
      }
    } else {
      if (spaceMasterGain && spaceAudioCtx) {
        spaceMasterGain.gain.exponentialRampToValueAtTime(0.0001, spaceAudioCtx.currentTime + 0.4);
      }
      isSpaceSoundOn = false;
    }

    if (btn) {
      btn.classList.toggle("active-blue", isSpaceSoundOn);
      btn.innerHTML = isSpaceSoundOn
        ? '<i class="fa-solid fa-volume-high"></i> <span>Space Audio</span>'
        : '<i class="fa-solid fa-volume-xmark"></i> <span>Space Audio</span>';
    }
  }

  // ==========================================
  // 5. LOAD THREE.JS & TEXTURE GENERATORS
  // ==========================================
  function ensureThreeJsLoaded() {
    return new Promise((resolve, reject) => {
      if (window.THREE) {
        resolve(window.THREE);
        return;
      }
      const existing = document.getElementById("iqra-threejs-lib");
      if (existing) {
        existing.addEventListener("load", () => resolve(window.THREE));
        return;
      }
      const script = document.createElement("script");
      script.id = "iqra-threejs-lib";
      script.src = THREE_JS_URL;
      script.onload = () => resolve(window.THREE);
      script.onerror = () => reject(new Error("Failed to load Three.js"));
      document.head.appendChild(script);
    });
  }

  function hash2D(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return n - Math.floor(n);
  }

  function smoothNoise(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = hash2D(ix, iy);
    const b = hash2D(ix + 1, iy);
    const c = hash2D(ix, iy + 1);
    const d = hash2D(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  function fbm(x, y, octaves = 4) {
    let val = 0;
    let amp = 0.5;
    let freq = 1;
    for (let i = 0; i < octaves; i++) {
      val += amp * smoothNoise(x * freq, y * freq);
      freq *= 2.02;
      amp *= 0.5;
    }
    return val;
  }

  function createSoftRadialGlowTexture(THREE, innerHex, outerHex) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createRadialGradient(128, 128, 6, 128, 128, 125);
    grad.addColorStop(0, innerHex);
    grad.addColorStop(0.35, outerHex);
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  function createPhotorealisticPlanetMaps(THREE, body) {
    const w = 512;
    const h = 256;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    const bumpCanvas = document.createElement("canvas");
    bumpCanvas.width = w;
    bumpCanvas.height = h;
    const bCtx = bumpCanvas.getContext("2d");
    const bData = bCtx.createImageData(w, h);

    for (let y = 0; y < h; y++) {
      const v = y / h;
      const lat = Math.abs(v - 0.5) * 2;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const idx = (y * w + x) * 4;

        const nx = u * 8;
        const ny = v * 4;
        const n1 = fbm(nx, ny, 5);
        const n2 = fbm(nx * 2.4 + 5.2, ny * 2.4 + 1.3, 4);

        let r = 128, g = 128, b = 128, bump = 128;

        if (body.key === "sun") {
          const gran = fbm(nx * 4.5, ny * 4.5, 4);
          const cell = Math.pow(gran, 1.3);
          r = Math.min(255, 220 + cell * 35);
          g = Math.min(255, 110 + cell * 135);
          b = Math.min(255, 15 + cell * 95);
        } else if (body.key === "mercury") {
          const base = 105 + n1 * 55 + (n2 - 0.5) * 35;
          r = base + 4; g = base; b = base - 5;
          bump = 90 + n2 * 90;
        } else if (body.key === "venus") {
          const swirl = fbm(nx + n2 * 1.4, ny * 2.2, 4);
          r = 195 + swirl * 48; g = 152 + swirl * 42; b = 85 + swirl * 35;
          bump = 120 + swirl * 16;
        } else if (body.key === "earth") {
          const continent = fbm(nx * 1.15 + 1.4, ny * 1.35 + 0.7, 5);
          const clouds = fbm(nx * 2.1 + n2 * 1.2, ny * 2.3, 4);
          if (lat > 0.87 + (n1 - 0.5) * 0.08) {
            r = 242; g = 247; b = 252; bump = 140;
          } else if (continent > 0.51) {
            const elev = (continent - 0.51) * 4.5;
            r = 38 + elev * 115 + n2 * 25;
            g = 95 + elev * 65 + n2 * 20;
            b = 45 + elev * 40;
            bump = 135 + elev * 95;
          } else {
            const depth = continent / 0.51;
            r = 12 + depth * 28; g = 45 + depth * 75; b = 115 + depth * 75;
            bump = 115;
          }
          if (clouds > 0.56) {
            const cAlpha = Math.min(0.85, (clouds - 0.56) * 2.6);
            r = r * (1 - cAlpha) + 252 * cAlpha;
            g = g * (1 - cAlpha) + 254 * cAlpha;
            b = b * (1 - cAlpha) + 255 * cAlpha;
          }
        } else if (body.key === "mars") {
          if (lat > 0.9) {
            r = 240; g = 242; b = 245; bump = 145;
          } else {
            const rust = fbm(nx * 1.5, ny * 1.5, 5);
            r = 145 + rust * 75; g = 62 + rust * 45; b = 38 + rust * 25;
            bump = 85 + n2 * 95;
          }
        } else if (body.key === "jupiter") {
          const turb = fbm(nx * 1.8, ny * 3.5, 4) * 0.14;
          const bandWave = Math.sin((v + turb) * Math.PI * 11);
          const belt = (bandWave + 1) * 0.5;
          r = 155 + belt * 82 + (n2 - 0.5) * 18;
          g = 108 + belt * 92 + (n2 - 0.5) * 15;
          b = 76 + belt * 96 + (n2 - 0.5) * 14;
          const dx = (u - 0.62) * 2.2;
          const dy = (v - 0.64) * 4.5;
          if (dx * dx + dy * dy < 0.028) {
            r = 192; g = 78; b = 46;
          }
        } else if (body.key === "saturn") {
          const band = (Math.sin(v * Math.PI * 14 + n1 * 0.6) + 1) * 0.5;
          r = 188 + band * 48; g = 165 + band * 46; b = 115 + band * 42;
        } else if (body.key === "uranus") {
          const haze = (Math.sin(v * Math.PI * 6) + 1) * 0.5;
          r = 105 + haze * 35; g = 188 + haze * 32; b = 205 + haze * 28;
        } else if (body.key === "neptune") {
          const streak = fbm(nx * 1.2, ny * 4.0, 4);
          r = 28 + streak * 35; g = 72 + streak * 65; b = 178 + streak * 62;
        }

        data[idx] = Math.max(0, Math.min(255, r));
        data[idx + 1] = Math.max(0, Math.min(255, g));
        data[idx + 2] = Math.max(0, Math.min(255, b));
        data[idx + 3] = 255;

        bData.data[idx] = bump;
        bData.data[idx + 1] = bump;
        bData.data[idx + 2] = bump;
        bData.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    bCtx.putImageData(bData, 0, 0);

    const mapTex = new THREE.CanvasTexture(canvas);
    const bumpTex = new THREE.CanvasTexture(bumpCanvas);
    mapTex.needsUpdate = true;
    bumpTex.needsUpdate = true;
    return { mapTex, bumpTex };
  }

  function createSoloMoonMaps(THREE, moon) {
    const w = 512;
    const h = 256;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    const bumpCanvas = document.createElement("canvas");
    bumpCanvas.width = w;
    bumpCanvas.height = h;
    const bCtx = bumpCanvas.getContext("2d");
    const bData = bCtx.createImageData(w, h);

    const c1 = new THREE.Color(moon.color1);
    const c2 = new THREE.Color(moon.color2);

    for (let y = 0; y < h; y++) {
      const v = y / h;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const idx = (y * w + x) * 4;
        const n1 = fbm(u * 9, v * 4.5, 5);
        const n2 = fbm(u * 22 + 3.1, v * 11 + 1.7, 4);

        let mix = n1;
        let bump = 100 + n2 * 95;

        if (moon.style === "icy_streaks") {
          const streak = Math.abs(Math.sin((u * 8 + n1 * 1.6) * Math.PI));
          mix = n1 * 0.6 + streak * 0.4;
          bump = 115 + streak * 45;
        } else if (moon.style === "volcanic") {
          mix = Math.pow(n2, 1.4);
          bump = 90 + n2 * 110;
        } else if (moon.style === "hazy") {
          mix = (Math.sin(v * Math.PI * 8 + n1 * 0.5) + 1) * 0.5;
          bump = 128;
        }

        const col = c2.clone().lerp(c1, Math.max(0, Math.min(1, mix)));
        data[idx] = Math.round(col.r * 255);
        data[idx + 1] = Math.round(col.g * 255);
        data[idx + 2] = Math.round(col.b * 255);
        data[idx + 3] = 255;

        bData.data[idx] = bump;
        bData.data[idx + 1] = bump;
        bData.data[idx + 2] = bump;
        bData.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    bCtx.putImageData(bData, 0, 0);

    const mapTex = new THREE.CanvasTexture(canvas);
    const bumpTex = new THREE.CanvasTexture(bumpCanvas);
    mapTex.needsUpdate = true;
    bumpTex.needsUpdate = true;
    return { mapTex, bumpTex };
  }

  function createRealisticSaturnRingTexture(THREE) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");

    for (let x = 0; x < 1024; x++) {
      const t = x / 1024;
      let alpha = 0;
      let shade = 215;

      if (t < 0.16) {
        alpha = t * 1.6;
        shade = 155;
      } else if (t < 0.56) {
        const ringlet = Math.sin(t * 260) * 0.08 + Math.sin(t * 95) * 0.06;
        alpha = 0.78 + ringlet;
        shade = 228 + ringlet * 45;
      } else if (t < 0.62) {
        alpha = 0.06;
        shade = 40;
      } else if (t < 0.91) {
        if (t > 0.835 && t < 0.85) {
          alpha = 0.12;
        } else {
          const ringlet = Math.sin(t * 310) * 0.06;
          alpha = 0.58 + ringlet;
          shade = 205;
        }
      } else if (t > 0.94 && t < 0.965) {
        alpha = 0.42;
        shade = 220;
      }

      ctx.fillStyle = `rgba(${shade}, ${Math.round(shade * 0.92)}, ${Math.round(shade * 0.78)}, ${Math.max(0, Math.min(1, alpha))})`;
      ctx.fillRect(x, 0, 1, 32);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  function populateSoloCoreLayers(THREE, body) {
    while (soloCoreGroup.children.length > 0) {
      soloCoreGroup.remove(soloCoreGroup.children[0]);
    }
    const layers = body.layers || [
      { name: "Outer Layer", color: body.dotColor },
      { name: "Inner Core", color: "#fde047" },
    ];
    const total = layers.length;
    const baseRadius = 5.6;

    layers.forEach((layer, idx) => {
      const frac = 1 - idx * (0.72 / total);
      const r = baseRadius * frac;
      // 3/4 sphere shell so interior concentric layers are clearly visible
      const geom = new THREE.SphereGeometry(r, 48, 32, 0, Math.PI * 1.5);
      const mat = new THREE.MeshStandardMaterial({
        color: layer.color,
        emissive: idx === total - 1 ? layer.color : "#000000",
        emissiveIntensity: idx === total - 1 ? 0.55 : 0.1,
        roughness: 0.42,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geom, mat);
      soloCoreGroup.add(mesh);
    });
  }

  // ==========================================
  // 6. SCI-FI HUD & MODAL STYLES
  // ==========================================
  function injectSolarStyles() {
    if (document.getElementById("iqra-solar3d-styles")) return;
    const style = document.createElement("style");
    style.id = "iqra-solar3d-styles";
    style.textContent = `
      #iqraSolar3DModal {
        position: fixed;
        inset: 0;
        z-index: 99992;
        background: #020617;
        display: none;
        flex-direction: column;
        overflow: hidden;
        font-family: system-ui, -apple-system, sans-serif;
        color: #f8fafc;
        transition: inset 0.2s ease;
      }
      #iqraSolar3DModal.windowed {
        inset: 26px 56px;
        border: 1px solid #38bdf8;
        border-radius: 16px;
      }
      #iqraSolar3DModal.open {
        display: flex;
      }
      .solar-header {
        height: 52px;
        background: linear-gradient(90deg, #020617 0%, #0f172a 50%, #020617 100%);
        border-bottom: 1px solid rgba(56, 189, 248, 0.35);
        padding: 0 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        z-index: 40;
        flex-shrink: 0;
      }
      .solar-title {
        display: flex;
        align-items: center;
        gap: 7px;
        font-weight: 800;
        font-size: 13.5px;
        color: #fbbf24;
        white-space: nowrap;
      }
      .iqra-solar-badge {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #020617;
        font-size: 10px;
        font-weight: 900;
        padding: 2px 6px;
        border-radius: 6px;
        letter-spacing: 0.6px;
      }
      .solar-modes {
        display: flex;
        gap: 3px;
        background: rgba(15, 23, 42, 0.92);
        padding: 3px;
        border-radius: 10px;
        border: 1px solid #334155;
      }
      .solar-mode-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        padding: 5px 10px;
        border-radius: 7px;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
      }
      .solar-mode-btn.active {
        background: #0284c7;
        color: #ffffff;
      }
      .solar-actions {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .solar-btn {
        background: #0f172a;
        color: #e2e8f0;
        border: 1px solid #334155;
        padding: 5px 9px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        white-space: nowrap;
      }
      .solar-btn:hover {
        border-color: #38bdf8;
      }
      .solar-btn.active-blue {
        background: #0284c7;
        border-color: #38bdf8;
        color: #ffffff;
      }
      .solar-btn.active-amber {
        background: #f59e0b;
        border-color: #fbbf24;
        color: #020617;
        font-weight: 800;
      }
      .solar-btn.active-laser {
        background: #dc2626;
        border-color: #f87171;
        color: #ffffff;
        box-shadow: 0 0 12px rgba(239, 68, 68, 0.65);
      }
      .solar-btn.primary {
        background: #10b981;
        border-color: #059669;
        color: #ffffff;
      }
      .solar-stage {
        flex: 1;
        position: relative;
        overflow: hidden;
      }
      #iqraSolarWebGLCanvas {
        width: 100%;
        height: 100%;
        display: block;
        cursor: grab;
      }
      #iqraSolarWebGLCanvas:active {
        cursor: grabbing;
      }
      .solar-stage.laser-mode #iqraSolarWebGLCanvas {
        cursor: none !important;
      }
      #iqraSolarLaserCanvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        z-index: 28;
        pointer-events: none;
      }
      #iqraSolarLabelsLayer {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 10;
        overflow: hidden;
      }
      .solar-planet-tag {
        position: absolute;
        transform: translate(-50%, -140%);
        color: #f1f5f9;
        font-size: 10.5px;
        font-weight: 800;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.95);
        padding: 2px 7px;
        border-radius: 4px;
        background: rgba(2, 6, 23, 0.65);
        border: 1px solid rgba(56, 189, 248, 0.35);
        white-space: nowrap;
      }
      .solar-left-dock {
        position: absolute;
        top: 52px;
        left: 14px;
        max-height: calc(100% - 125px);
        width: 185px;
        background: rgba(15, 23, 42, 0.88);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(56, 189, 248, 0.38);
        border-radius: 14px;
        padding: 8px;
        z-index: 26;
        display: flex;
        flex-direction: column;
        gap: 4px;
        overflow-y: auto;
        transition: transform 0.25s ease, opacity 0.2s ease;
      }
      .solar-left-dock.collapsed {
        transform: translateX(-220px);
        opacity: 0;
        pointer-events: none;
      }
      .solar-drawer-toggle-btn {
        position: absolute;
        top: 14px;
        left: 14px;
        z-index: 27;
        background: rgba(15, 23, 42, 0.92);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.5);
        padding: 6px 12px;
        border-radius: 10px;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
      }
      .solar-body-btn {
        background: rgba(30, 41, 59, 0.72);
        border: 1px solid rgba(71, 85, 105, 0.6);
        color: #f8fafc;
        padding: 7px 10px;
        border-radius: 9px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        text-align: left;
      }
      .solar-body-btn:hover,
      .solar-body-btn.active {
        border-color: #38bdf8;
        background: rgba(2, 132, 199, 0.35);
        color: #38bdf8;
      }
      .solar-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .solar-right-card {
        position: absolute;
        top: 14px;
        right: 14px;
        width: 310px;
        max-height: calc(100% - 88px);
        overflow-y: auto;
        background: rgba(15, 23, 42, 0.9);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(56, 189, 248, 0.45);
        border-radius: 14px;
        padding: 12px 14px;
        z-index: 25;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
      }
      .solar-stat-row {
        display: flex;
        justify-content: space-between;
        font-size: 11.5px;
        padding: 4px 0;
        border-bottom: 1px solid rgba(51, 65, 85, 0.6);
      }
      .solar-stat-row span:first-child {
        color: #94a3b8;
      }
      .solar-stat-row span:last-child {
        color: #f8fafc;
        font-weight: 600;
        text-align: right;
      }
      .moon-item-box {
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(56, 189, 248, 0.25);
        border-radius: 8px;
        padding: 6px 8px;
        margin-top: 5px;
        font-size: 11px;
        cursor: pointer;
      }
      .moon-item-box:hover {
        border-color: #fbbf24;
      }
      .solar-bottom-bar {
        position: absolute;
        bottom: 14px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 30;
        background: rgba(15, 23, 42, 0.92);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(56, 189, 248, 0.45);
        border-radius: 999px;
        padding: 6px 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.65);
      }
      .solar-date-readout {
        font-family: monospace;
        font-size: 12.5px;
        font-weight: 800;
        color: #38bdf8;
        min-width: 100px;
        text-align: center;
      }
      .solar-step-btn {
        background: #1e293b;
        color: #f8fafc;
        border: 1px solid #475569;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        font-weight: 800;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .solar-step-btn:hover {
        border-color: #38bdf8;
        color: #38bdf8;
      }
    `;
    document.head.appendChild(style);
  }

  // ==========================================
  // 7. BUILD IQRA SPACE EXPLORER DOM
  // ==========================================
  function createSolarModalDOM() {
    if (document.getElementById("iqraSolar3DModal")) return;
    injectSolarStyles();

    const modal = document.createElement("div");
    modal.id = "iqraSolar3DModal";
    modal.innerHTML = `
      <div class="solar-header">
        <div class="solar-title">
          <!-- Realistic Solar Photosphere & Corona Emblem -->
          <svg width="24" height="24" viewBox="0 0 32 32" style="flex-shrink:0;">
            <defs>
              <radialGradient id="iqraRealSunGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="35%" stop-color="#fde047"/>
                <stop offset="68%" stop-color="#f97316"/>
                <stop offset="100%" stop-color="rgba(234,88,12,0)"/>
              </radialGradient>
            </defs>
            <circle cx="16" cy="16" r="15" fill="url(#iqraRealSunGrad)"/>
            <circle cx="16" cy="16" r="8.5" fill="#fbbf24"/>
          </svg>
          <span class="iqra-solar-badge">IQRA</span>
          <span>3D Space Explorer</span>
        </div>

        <div class="solar-modes">
          <button class="solar-mode-btn active" data-mode="orbit">🪐 Solar System</button>
          <button class="solar-mode-btn" data-mode="moons">🌙 Moons</button>
          <button class="solar-mode-btn" data-mode="compare">📏 Size Compare</button>
          <button class="solar-mode-btn" data-mode="galaxies">🌌 Galaxies</button>
        </div>

        <div class="solar-actions">
          <button id="btnSolarShowNames" class="solar-btn active-blue" title="Show or Hide Names">
            <i class="fa-solid fa-font"></i> <span>Names</span>
          </button>
          <button id="btnSolarShowOrbits" class="solar-btn active-blue" title="Show or Hide Orbits & Grid">
            <i class="fa-solid fa-circle-notch"></i> <span>Orbits</span>
          </button>
          <button id="btnSolarLaserToggle" class="solar-btn" title="Laser Light Pointer">
            <i class="fa-solid fa-wand-magic-sparkles"></i> <span>Laser</span>
          </button>
          <button id="btnSolarSpaceSound" class="solar-btn" title="Toggle Ambient Space Sound">
            <i class="fa-solid fa-volume-xmark"></i> <span>Space Audio</span>
          </button>
          <button id="btnSolarToBoard" class="solar-btn primary" title="Send Image to Whiteboard">
            <i class="fa-solid fa-image"></i> Send to Board
          </button>
          <button id="btnSolarFullScreen" class="solar-btn" title="Toggle Full-Screen">
            <i class="fa-solid fa-compress"></i>
          </button>
          <button id="btnCloseSolar3D" class="solar-btn" style="background:#dc2626;border-color:#b91c1c;color:#fff;">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div class="solar-stage" id="iqraSolarStage">
        <canvas id="iqraSolarWebGLCanvas"></canvas>
        <div id="iqraSolarLabelsLayer"></div>
        <canvas id="iqraSolarLaserCanvas"></canvas>

        <button class="solar-drawer-toggle-btn" id="btnToggleLeftDrawer" title="Show / Hide Objects Menu">
          <i class="fa-solid fa-xmark"></i> <span>Hide Objects</span>
        </button>

        <div class="solar-left-dock" id="solarLeftDock"></div>

        <div class="solar-right-card" id="solarRightCard">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div>
              <div id="solarCardCategory" style="font-size:10px;color:#38bdf8;font-weight:800;text-transform:uppercase;">SOLAR SYSTEM</div>
              <strong id="solarCardTitle" style="font-size:16px;color:#fbbf24;">Overview</strong>
            </div>
            <button id="btnSolarResetOverview" class="solar-btn" style="padding:3px 8px;font-size:11px;">🪐 Solar System</button>
          </div>
          <div id="solarCardBody" style="font-size:12px;color:#cbd5e1;line-height:1.45;">
            Select any star, planet, moon, or galaxy from the Objects menu to inspect it in high-detail 3D.
          </div>
          <!-- Internal Core Toggle Button inside Right Card -->
          <div id="solarCoreActionWrap" style="margin-top:10px;display:none;">
            <button id="btnToggleBodyInternalCore" class="solar-btn" style="width:100%;justify-content:center;padding:7px 10px;border-color:#f59e0b;color:#fbbf24;">
              <i class="fa-solid fa-layer-group"></i> <span>View Internal Core</span>
            </button>
          </div>
          <div id="solarCoreLegend" style="margin-top:8px;display:none;"></div>
          <div id="solarMoonsSection" style="margin-top:8px;display:none;"></div>
        </div>

        <div class="solar-bottom-bar">
          <button id="btnSolarPlayPause" class="solar-btn active-blue" style="border-radius:999px;padding:5px 10px;" title="Pause / Resume">
            <i class="fa-solid fa-pause"></i>
          </button>
          <div class="solar-date-readout" id="solarDateDisplay">15 NOV 2026</div>
          <button id="btnSolarRealRotation" class="solar-btn" style="border-radius:999px;font-size:11px;" title="Sync to Real-Time Astronomical Rotation Speed">
            <i class="fa-solid fa-clock"></i> Real Rotation Time
          </button>
          <div style="display:flex;align-items:center;gap:6px;border-left:1px solid #334155;padding-left:10px;">
            <button class="solar-step-btn" id="btnSpeedDecrease" title="Decrease Orbit Speed">−</button>
            <span id="solarSpeedLabel" style="font-size:11.5px;font-weight:700;color:#e2e8f0;min-width:78px;text-align:center;">1 day / s</span>
            <button class="solar-step-btn" id="btnSpeedIncrease" title="Increase Orbit Speed">+</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    buildLeftObjectButtons();
    initSolarLaserPointer();
    bindSolarModalEvents();
  }

  function buildLeftObjectButtons() {
    const dock = document.getElementById("solarLeftDock");
    if (!dock) return;
    dock.innerHTML = "";

    if (currentSolarMode === "moons") {
      MOONS_DATABASE.forEach((m) => {
        const btn = document.createElement("button");
        btn.className = "solar-body-btn";
        btn.dataset.key = m.key;
        btn.innerHTML = `
          <span style="display:flex;align-items:center;gap:8px;">
            <span class="solar-dot" style="background:${m.color1};box-shadow:0 0 8px ${m.color1};"></span>
            <div>
              <div>${m.name.split(" ")[0]}</div>
              <div style="font-size:9.5px;color:#94a3b8;font-weight:500;">${m.parent}</div>
            </div>
          </span>
          <i class="fa-solid fa-chevron-right" style="font-size:10px;opacity:0.6;"></i>
        `;
        btn.addEventListener("click", () => focusOnSoloMoon(m.key));
        dock.appendChild(btn);
      });
      return;
    }

    if (currentSolarMode === "galaxies") {
      GALAXIES_DATA.forEach((g) => {
        const btn = document.createElement("button");
        btn.className = "solar-body-btn";
        btn.dataset.key = g.key;
        btn.innerHTML = `
          <span style="display:flex;align-items:center;gap:8px;">
            <span class="solar-dot" style="background:${g.armColor};box-shadow:0 0 8px ${g.armColor};"></span>
            <span>${g.name.replace(" Galaxy", "")}</span>
          </span>
          <i class="fa-solid fa-chevron-right" style="font-size:10px;opacity:0.6;"></i>
        `;
        btn.addEventListener("click", () => focusOnGalaxy(g.key));
        dock.appendChild(btn);
      });
      return;
    }

    SOLAR_BODIES.forEach((b) => {
      const btn = document.createElement("button");
      btn.className = "solar-body-btn";
      btn.dataset.key = b.key;
      btn.innerHTML = `
        <span style="display:flex;align-items:center;gap:8px;">
          <span class="solar-dot" style="background:${b.dotColor};box-shadow:0 0 8px ${b.dotColor};"></span>
          <span>${b.name}</span>
        </span>
        <i class="fa-solid fa-chevron-right" style="font-size:10px;opacity:0.6;"></i>
      `;
      btn.addEventListener("click", () => openSoloCelestialBody(b.key));
      dock.appendChild(btn);
    });
  }

  // ==========================================
  // 8. BUILD 3D SOLAR SYSTEM, SOLO STAGE & GALAXIES
  // ==========================================
  async function initSolarThreeScene() {
    const THREE = await ensureThreeJsLoaded();
    const canvas = document.getElementById("iqraSolarWebGLCanvas");
    const stage = document.getElementById("iqraSolarStage");
    if (!canvas || !stage) return;

    if (renderer) {
      resizeSolarRenderer();
      return;
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color("#020617");

    camera = new THREE.PerspectiveCamera(
      45,
      stage.clientWidth / Math.max(1, stage.clientHeight),
      0.1,
      1500
    );

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(stage.clientWidth, stage.clientHeight);

    const ambient = new THREE.AmbientLight(0x334155, 0.58);
    scene.add(ambient);

    const sunLight = new THREE.PointLight(0xfffbeb, 2.8, 500);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // Directional light for Solo Planet & Solo Moon Inspection Stage
    const soloLight = new THREE.DirectionalLight(0xffffff, 1.45);
    soloLight.position.set(28, 18, 32);
    scene.add(soloLight);

    // Deep Space Starfield
    const starGeom = new THREE.BufferGeometry();
    const starPositions = new Float32Array(3500 * 3);
    for (let i = 0; i < 3500 * 3; i++) {
      starPositions[i] = (Math.random() - 0.5) * 900;
    }
    starGeom.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starFieldPoints = new THREE.Points(
      starGeom,
      new THREE.PointsMaterial({ color: 0xf1f5f9, size: 0.65, transparent: true, opacity: 0.85 })
    );
    scene.add(starFieldPoints);

    solarSystemRoot = new THREE.Group();
    scene.add(solarSystemRoot);

    auGridGroup = new THREE.Group();
    const gridHelper = new THREE.PolarGridHelper(80, 16, 8, 64, 0x0ea5e9, 0x1e293b);
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.2;
    auGridGroup.add(gridHelper);
    solarSystemRoot.add(auGridGroup);

    // Real 3D Faceted Rocky Asteroid Belt
    const rockGeom = new THREE.DodecahedronGeometry(0.18, 0);
    const rPos = rockGeom.attributes.position;
    for (let i = 0; i < rPos.count; i++) {
      const scaleJitter = 0.75 + hash2D(i, 3.1) * 0.55;
      rPos.setXYZ(i, rPos.getX(i) * scaleJitter, rPos.getY(i) * scaleJitter * 0.75, rPos.getZ(i) * scaleJitter);
    }
    rockGeom.computeVertexNormals();

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x8c8279,
      roughness: 0.9,
      metalness: 0.15,
    });
    const astCount = 850;
    asteroidInstancedMesh = new THREE.InstancedMesh(rockGeom, rockMat, astCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < astCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 32.5 + Math.random() * 4.5;
      dummy.position.set(
        Math.cos(ang) * dist,
        (Math.random() - 0.5) * 1.3,
        Math.sin(ang) * dist
      );
      dummy.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      const s = 0.45 + Math.random() * 1.15;
      dummy.scale.set(s, s * 0.8, s * 1.1);
      dummy.updateMatrix();
      asteroidInstancedMesh.setMatrixAt(i, dummy.matrix);
    }
    solarSystemRoot.add(asteroidInstancedMesh);

    const labelsLayer = document.getElementById("iqraSolarLabelsLayer");
    labelsLayer.innerHTML = "";
    planetEntries = [];

    const saturnRingTex = createRealisticSaturnRingTexture(THREE);

    SOLAR_BODIES.forEach((body, idx) => {
      const group = new THREE.Group();
      const { mapTex, bumpTex } = createPhotorealisticPlanetMaps(THREE, body);

      const geom = new THREE.SphereGeometry(body.radius, 56, 40);
      const mat =
        body.key === "sun"
          ? new THREE.MeshBasicMaterial({ map: mapTex })
          : new THREE.MeshStandardMaterial({
              map: mapTex,
              bumpMap: bumpTex,
              bumpScale: body.key === "mercury" || body.key === "mars" ? 0.09 : 0.045,
              roughness: 0.74,
              metalness: 0.05,
            });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.rotation.z = (body.tilt * Math.PI) / 180;
      group.add(mesh);

      if (["earth", "venus", "jupiter", "uranus", "neptune"].includes(body.key)) {
        const atmoColor =
          body.key === "earth"
            ? 0x38bdf8
            : body.key === "venus"
            ? 0xfde68a
            : body.key === "uranus"
            ? 0x67e8f9
            : body.key === "neptune"
            ? 0x3b82f6
            : 0xfed7aa;
        const atmoMesh = new THREE.Mesh(
          new THREE.SphereGeometry(body.radius * 1.03, 36, 24),
          new THREE.MeshBasicMaterial({
            color: atmoColor,
            transparent: true,
            opacity: 0.14,
            side: THREE.BackSide,
          })
        );
        group.add(atmoMesh);
      }

      if (body.key === "sun") {
        sunGlowSprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: createSoftRadialGlowTexture(THREE, "rgba(254, 243, 199, 0.92)", "rgba(251, 146, 60, 0.36)"),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        sunGlowSprite.scale.set(25, 25, 1);
        group.add(sunGlowSprite);
      }

      if (body.hasRings) {
        const innerR = body.radius * 1.32;
        const outerR = body.radius * 2.45;
        const ringGeom = new THREE.RingGeometry(innerR, outerR, 128);
        const pos = ringGeom.attributes.position;
        const uv = ringGeom.attributes.uv;
        const v3 = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v3.fromBufferAttribute(pos, i);
          const u = (v3.length() - innerR) / (outerR - innerR);
          uv.setXY(i, u, 0.5);
        }
        const ringMesh = new THREE.Mesh(
          ringGeom,
          new THREE.MeshBasicMaterial({
            map: saturnRingTex,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.94,
          })
        );
        ringMesh.rotation.x = Math.PI / 2.25;
        group.add(ringMesh);
      }

      const moonPivots = [];
      (body.majorMoons || []).forEach((m, mIdx) => {
        const pivot = new THREE.Group();
        pivot.rotation.y = mIdx * 1.4;
        const moonMesh = new THREE.Mesh(
          new THREE.DodecahedronGeometry(m.size, 2),
          new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.85 })
        );
        moonMesh.position.set(m.dist, (mIdx % 2 === 0 ? 1 : -1) * 0.15, 0);
        pivot.add(moonMesh);
        group.add(pivot);
        moonPivots.push({ pivot, speed: m.speed });
      });

      let orbitLine = null;
      if (body.distance > 0) {
        const pts = [];
        for (let i = 0; i <= 128; i++) {
          const theta = (i / 128) * Math.PI * 2;
          pts.push(
            new THREE.Vector3(Math.cos(theta) * body.distance, 0, Math.sin(theta) * body.distance)
          );
        }
        orbitLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.3 })
        );
        solarSystemRoot.add(orbitLine);
      }

      solarSystemRoot.add(group);

      const labelEl = document.createElement("div");
      labelEl.className = "solar-planet-tag";
      labelEl.innerText = body.name;
      labelsLayer.appendChild(labelEl);

      planetEntries.push({
        data: body,
        index: idx,
        group,
        mesh,
        mapTex,
        bumpTex,
        moonPivots,
        orbitLine,
        labelEl,
        angle: idx * 0.85,
      });
    });

    // Build Dedicated Solo 3D Inspection Stage (used when clicking any Star, Planet, or Moon!)
    soloStageRoot = new THREE.Group();
    soloStageRoot.visible = false;
    scene.add(soloStageRoot);

    soloSurfaceMesh = new THREE.Mesh(
      new THREE.SphereGeometry(5.6, 64, 48),
      new THREE.MeshStandardMaterial({ roughness: 0.74, metalness: 0.05 })
    );
    soloStageRoot.add(soloSurfaceMesh);

    soloAtmoMesh = new THREE.Mesh(
      new THREE.SphereGeometry(5.82, 48, 36),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.16,
        side: THREE.BackSide,
      })
    );
    soloStageRoot.add(soloAtmoMesh);

    // Solo Saturn Ring
    const sInner = 5.6 * 1.32;
    const sOuter = 5.6 * 2.45;
    const sRingGeom = new THREE.RingGeometry(sInner, sOuter, 128);
    const sPos = sRingGeom.attributes.position;
    const sUv = sRingGeom.attributes.uv;
    const sV3 = new THREE.Vector3();
    for (let i = 0; i < sPos.count; i++) {
      sV3.fromBufferAttribute(sPos, i);
      sUv.setXY(i, (sV3.length() - sInner) / (sOuter - sInner), 0.5);
    }
    soloRingMesh = new THREE.Mesh(
      sRingGeom,
      new THREE.MeshBasicMaterial({
        map: saturnRingTex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.94,
      })
    );
    soloRingMesh.rotation.x = Math.PI / 2.25;
    soloRingMesh.visible = false;
    soloStageRoot.add(soloRingMesh);

    // Solo Sun Glow
    soloGlowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createSoftRadialGlowTexture(THREE, "rgba(254, 243, 199, 0.92)", "rgba(251, 146, 60, 0.36)"),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    soloGlowSprite.scale.set(24, 24, 1);
    soloGlowSprite.visible = false;
    soloStageRoot.add(soloGlowSprite);

    // Solo Internal Core Cutaway Group
    soloCoreGroup = new THREE.Group();
    soloCoreGroup.visible = false;
    soloStageRoot.add(soloCoreGroup);

    build3DGalaxiesScene(THREE);

    bindCameraMouseAndTouch(canvas);
    window.addEventListener("resize", resizeSolarRenderer);
    startSolarRenderLoop();
  }

  function build3DGalaxiesScene(THREE) {
    galaxyRoot = new THREE.Group();
    galaxyRoot.visible = false;
    scene.add(galaxyRoot);

    GALAXIES_DATA.forEach((g) => {
      const gGroup = new THREE.Group();
      const count = 11000;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      const coreCol = new THREE.Color(g.coreColor);
      const armCol = new THREE.Color(g.armColor);

      for (let i = 0; i < count; i++) {
        const radius = Math.pow(Math.random(), 1.75) * 42;
        const spinAngle = radius * 0.28;
        const branchAngle = ((i % g.arms) / g.arms) * Math.PI * 2;

        const randomX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * (1.1 + radius * 0.14);
        const randomY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * (2.0 / (1 + radius * 0.08));
        const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * (1.1 + radius * 0.14);

        positions[i * 3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
        positions[i * 3 + 1] = randomY;
        positions[i * 3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

        const mixedColor = coreCol.clone().lerp(armCol, Math.min(1, radius / 35));
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.45,
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      gGroup.add(new THREE.Points(geom, mat));

      const bulgeSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createSoftRadialGlowTexture(THREE, "rgba(255, 251, 235, 0.95)", "rgba(253, 224, 71, 0.28)"),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      bulgeSprite.scale.set(18, 18, 1);
      gGroup.add(bulgeSprite);

      if (g.key === "milkyway") {
        const sunMarker = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 16, 12),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        );
        sunMarker.position.set(22, 0.4, 8);
        gGroup.add(sunMarker);
      }

      gGroup.visible = g.key === selectedGalaxyKey;
      galaxyRoot.add(gGroup);
      galaxyEntries.push({ data: g, group: gGroup });
    });
  }

  function resizeSolarRenderer() {
    if (!renderer || !camera) return;
    const stage = document.getElementById("iqraSolarStage");
    if (!stage || stage.clientWidth <= 0) return;
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    syncSolarLaserCanvasSize();
  }

  function bindCameraMouseAndTouch(canvas) {
    canvas.addEventListener("pointerdown", (e) => {
      isDraggingOrbit = true;
      prevPointer = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("pointermove", (e) => {
      if (!isDraggingOrbit) return;
      const dx = e.clientX - prevPointer.x;
      const dy = e.clientY - prevPointer.y;
      prevPointer = { x: e.clientX, y: e.clientY };

      camGoalSpherical.theta -= dx * 0.0065;
      camGoalSpherical.phi = Math.max(
        0.15,
        Math.min(Math.PI - 0.15, camGoalSpherical.phi - dy * 0.0065)
      );
    });

    window.addEventListener("pointerup", () => {
      isDraggingOrbit = false;
    });

    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        camGoalSpherical.radius = Math.max(
          7,
          Math.min(185, camGoalSpherical.radius + e.deltaY * 0.045)
        );
      },
      { passive: false }
    );
  }

  // ==========================================
  // 9. OPEN SOLO 3D STAR / PLANET + INTERNAL CORE TOGGLE
  // ==========================================
  function openSoloCelestialBody(key) {
    selectedPlanetKey = key;
    currentSolarMode = "solo_body";
    isSoloCoreOpen = false;

    document.querySelectorAll(".solar-mode-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".solar-body-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.key === key);
    });

    const entry = planetEntries.find((p) => p.data.key === key);
    if (!entry || !window.THREE) return;
    const b = entry.data;

    // Hide Solar System orbit view & show dedicated Solo 3D Stage in center
    if (solarSystemRoot) solarSystemRoot.visible = false;
    if (galaxyRoot) galaxyRoot.visible = false;
    if (soloStageRoot) soloStageRoot.visible = true;
    planetEntries.forEach((p) => (p.labelEl.style.display = "none"));

    // Configure Solo 3D Mesh
    soloSurfaceMesh.visible = true;
    soloCoreGroup.visible = false;
    soloSurfaceMesh.rotation.z = (b.tilt * Math.PI) / 180;

    if (b.key === "sun") {
      soloSurfaceMesh.material = new window.THREE.MeshBasicMaterial({ map: entry.mapTex });
      soloGlowSprite.visible = true;
      soloAtmoMesh.visible = false;
      soloRingMesh.visible = false;
    } else {
      soloSurfaceMesh.material = new window.THREE.MeshStandardMaterial({
        map: entry.mapTex,
        bumpMap: entry.bumpTex,
        bumpScale: b.key === "mercury" || b.key === "mars" ? 0.14 : 0.06,
        roughness: 0.72,
        metalness: 0.05,
      });
      soloGlowSprite.visible = false;
      soloRingMesh.visible = Boolean(b.hasRings);

      const hasAtmo = ["earth", "venus", "jupiter", "uranus", "neptune"].includes(b.key);
      soloAtmoMesh.visible = hasAtmo;
      if (hasAtmo) {
        soloAtmoMesh.material.color.setHex(
          b.key === "earth"
            ? 0x38bdf8
            : b.key === "venus"
            ? 0xfde68a
            : b.key === "uranus"
            ? 0x67e8f9
            : b.key === "neptune"
            ? 0x3b82f6
            : 0xfed7aa
        );
      }
    }

    populateSoloCoreLayers(window.THREE, b);

    // Populate Right Info Card + Internal Core Button
    document.getElementById("solarCardCategory").innerText = b.category;
    document.getElementById("solarCardTitle").innerText = b.name;
    document.getElementById("solarCardBody").innerHTML = `
      <div class="solar-stat-row"><span>Diameter:</span><span>${b.diameter}</span></div>
      <div class="solar-stat-row"><span>Distance:</span><span>${b.distFromSun}</span></div>
      <div class="solar-stat-row"><span>Day Length:</span><span>${b.dayLength}</span></div>
      <div class="solar-stat-row"><span>Year Length:</span><span>${b.yearLength}</span></div>
      <div class="solar-stat-row"><span>Temperature:</span><span>${b.temp}</span></div>
      <div class="solar-stat-row"><span>Satellites:</span><span>${b.moonsCount}</span></div>
      <div style="margin-top:6px;color:#94a3b8;font-size:11.5px;">${b.facts}</div>
    `;

    const coreWrap = document.getElementById("solarCoreActionWrap");
    const coreBtn = document.getElementById("btnToggleBodyInternalCore");
    const coreLegend = document.getElementById("solarCoreLegend");
    if (coreWrap && coreBtn && coreLegend) {
      coreWrap.style.display = "block";
      coreBtn.classList.remove("active-amber");
      coreBtn.innerHTML = '<i class="fa-solid fa-layer-group"></i> <span>View Internal Core</span>';
      coreLegend.style.display = "none";
      coreLegend.innerHTML =
        `<div style="font-size:11px;font-weight:800;color:#fbbf24;margin-bottom:4px;">Internal Structure & Layers:</div>` +
        (b.layers || [])
          .map(
            (l) =>
              `<div style="background:rgba(30,41,59,0.75);border-left:3px solid ${l.color};padding:5px 8px;border-radius:6px;margin-bottom:4px;font-size:11px;">
                <strong style="color:#f8fafc;">${l.name}</strong>
                <div style="color:#94a3b8;font-size:10.5px;">${l.depth || ""}</div>
              </div>`
          )
          .join("");
    }

    const moonsEl = document.getElementById("solarMoonsSection");
    if (moonsEl) {
      if (b.majorMoons && b.majorMoons.length > 0) {
        moonsEl.style.display = "block";
        moonsEl.innerHTML =
          `<div style="font-size:11px;font-weight:800;color:#38bdf8;margin-bottom:4px;">🌙 Major Moons (Click to inspect):</div>` +
          b.majorMoons
            .map((m) => {
              const moonObj = MOONS_DATABASE.find((md) =>
                md.name.toLowerCase().startsWith(m.name.split(" ")[0].toLowerCase())
              );
              return `<div class="moon-item-box" data-moon-key="${moonObj ? moonObj.key : "luna"}">
                <strong style="color:#38bdf8;">${m.name}</strong>
                <div style="color:#cbd5e1;margin-top:2px;">${moonObj ? moonObj.facts : ""}</div>
              </div>`;
            })
            .join("");

        moonsEl.querySelectorAll(".moon-item-box").forEach((box) => {
          box.addEventListener("click", () => {
            const mk = box.dataset.moonKey;
            document.querySelectorAll(".solar-mode-btn").forEach((btn) => {
              btn.classList.toggle("active", btn.dataset.mode === "moons");
            });
            selectedMoonKey = mk;
            applySolarTeachingMode("moons");
          });
        });
      } else {
        moonsEl.style.display = "none";
      }
    }

    camGoalTarget = { x: 0, y: 0, z: 0 };
    camGoalSpherical = { radius: b.hasRings ? 24 : 18, theta: 0.55, phi: 1.2 };
  }

  function toggleSoloInternalCore() {
    if (currentSolarMode !== "solo_body") return;
    isSoloCoreOpen = !isSoloCoreOpen;

    soloSurfaceMesh.visible = !isSoloCoreOpen;
    soloAtmoMesh.visible = !isSoloCoreOpen && ["earth", "venus", "jupiter", "uranus", "neptune"].includes(selectedPlanetKey);
    soloCoreGroup.visible = isSoloCoreOpen;

    const coreBtn = document.getElementById("btnToggleBodyInternalCore");
    const coreLegend = document.getElementById("solarCoreLegend");
    if (coreBtn) {
      coreBtn.classList.toggle("active-amber", isSoloCoreOpen);
      coreBtn.innerHTML = isSoloCoreOpen
        ? '<i class="fa-solid fa-globe"></i> <span>Show Outer Surface</span>'
        : '<i class="fa-solid fa-layer-group"></i> <span>View Internal Core</span>';
    }
    if (coreLegend) {
      coreLegend.style.display = isSoloCoreOpen ? "block" : "none";
    }
  }

  function focusOnSoloMoon(key) {
    selectedMoonKey = key;
    document.querySelectorAll(".solar-body-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.key === key);
    });

    const moon = MOONS_DATABASE.find((m) => m.key === key) || MOONS_DATABASE[0];
    if (!moon) return;

    if (window.THREE && soloSurfaceMesh) {
      const { mapTex, bumpTex } = createSoloMoonMaps(window.THREE, moon);
      soloSurfaceMesh.visible = true;
      soloCoreGroup.visible = false;
      soloAtmoMesh.visible = false;
      soloRingMesh.visible = false;
      soloGlowSprite.visible = false;
      soloSurfaceMesh.rotation.set(0, 0, 0);
      soloSurfaceMesh.material = new window.THREE.MeshStandardMaterial({
        map: mapTex,
        bumpMap: bumpTex,
        bumpScale: 0.14,
        roughness: 0.82,
        metalness: 0.05,
      });
    }

    document.getElementById("solarCardCategory").innerText = `NATURAL SATELLITE OF ${moon.parent.toUpperCase()}`;
    document.getElementById("solarCardTitle").innerText = moon.name;
    document.getElementById("solarCardBody").innerHTML = `
      <div class="solar-stat-row"><span>Parent Planet:</span><span>${moon.parent}</span></div>
      <div class="solar-stat-row"><span>Diameter:</span><span>${moon.diameter}</span></div>
      <div class="solar-stat-row"><span>Orbital Distance:</span><span>${moon.distance}</span></div>
      <div class="solar-stat-row"><span>Orbital Period:</span><span>${moon.orbitalPeriod}</span></div>
      <div class="solar-stat-row"><span>Temperature:</span><span>${moon.temp}</span></div>
      <div style="margin-top:6px;color:#94a3b8;font-size:11.5px;">${moon.facts}</div>
    `;
    document.getElementById("solarCoreActionWrap").style.display = "none";
    document.getElementById("solarCoreLegend").style.display = "none";
    document.getElementById("solarMoonsSection").style.display = "none";

    camGoalTarget = { x: 0, y: 0, z: 0 };
    camGoalSpherical = { radius: 18, theta: 0.5, phi: 1.25 };
  }

  function focusOnGalaxy(key) {
    selectedGalaxyKey = key;
    document.querySelectorAll(".solar-body-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.key === key);
    });

    galaxyEntries.forEach((ge) => {
      ge.group.visible = ge.data.key === key;
    });

    const g = GALAXIES_DATA.find((item) => item.key === key);
    if (!g) return;

    document.getElementById("solarCardCategory").innerText = g.type;
    document.getElementById("solarCardTitle").innerText = g.name;
    document.getElementById("solarCardBody").innerHTML = `
      <div class="solar-stat-row"><span>Diameter:</span><span>${g.diameter}</span></div>
      <div class="solar-stat-row"><span>Star Count:</span><span>${g.stars}</span></div>
      <div class="solar-stat-row"><span>Location:</span><span>${g.distance}</span></div>
      <div style="margin-top:6px;color:#94a3b8;font-size:11.5px;">${g.facts}</div>
      ${
        g.key === "milkyway"
          ? `<div style="margin-top:6px;padding:5px 8px;background:rgba(56,189,248,0.15);border:1px solid #38bdf8;border-radius:6px;font-size:11px;color:#38bdf8;">🔵 Blue dot marks our Solar System's position in the Orion Arm.</div>`
          : ""
      }
    `;
    document.getElementById("solarCoreActionWrap").style.display = "none";
    document.getElementById("solarCoreLegend").style.display = "none";
    document.getElementById("solarMoonsSection").style.display = "none";

    camGoalTarget = { x: 0, y: 0, z: 0 };
    camGoalSpherical = { radius: 64, theta: 0.5, phi: 0.78 };
  }

  function applySolarTeachingMode(mode) {
    currentSolarMode = mode;
    buildLeftObjectButtons();

    const isGalaxyMode = mode === "galaxies";
    const isSoloStageMode = mode === "moons" || mode === "solo_body";

    if (solarSystemRoot) solarSystemRoot.visible = !isGalaxyMode && !isSoloStageMode;
    if (galaxyRoot) galaxyRoot.visible = isGalaxyMode;
    if (soloStageRoot) soloStageRoot.visible = isSoloStageMode;

    if (isGalaxyMode || mode === "moons") {
      planetEntries.forEach((p) => (p.labelEl.style.display = "none"));
      if (isGalaxyMode) focusOnGalaxy(selectedGalaxyKey);
      if (mode === "moons") focusOnSoloMoon(selectedMoonKey);
      return;
    }

    planetEntries.forEach((p, idx) => {
      if (p.orbitLine) {
        p.orbitLine.visible = showOrbits && mode === "orbit";
      }
      if (mode === "compare") {
        const compareX = -32 + idx * 8.5;
        p.group.position.set(compareX, 0, 0);
      } else {
        p.group.position.set(
          Math.cos(p.angle) * p.data.distance,
          0,
          Math.sin(p.angle) * p.data.distance
        );
      }
    });

    if (auGridGroup) auGridGroup.visible = showOrbits && mode === "orbit";
    if (asteroidInstancedMesh) asteroidInstancedMesh.visible = mode === "orbit";

    if (mode === "compare") {
      selectedPlanetKey = null;
      document.getElementById("solarCoreActionWrap").style.display = "none";
      document.getElementById("solarCoreLegend").style.display = "none";
      document.getElementById("solarMoonsSection").style.display = "none";
      camGoalTarget = { x: 2, y: 0, z: 0 };
      camGoalSpherical = { radius: 68, theta: 0, phi: 1.48 };
    } else {
      camGoalTarget = { x: 0, y: 0, z: 0 };
      camGoalSpherical = { radius: 86, theta: 0.65, phi: 0.92 };
    }
  }

  // ==========================================
  // 10. RENDER LOOP
  // ==========================================
  let lastFrameTime = performance.now();

  function startSolarRenderLoop() {
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    const tick = (now) => {
      animFrameId = requestAnimationFrame(tick);
      if (!isSolarModalOpen || !renderer || !scene || !camera) return;

      const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      if (currentSolarMode === "galaxies") {
        galaxyEntries.forEach((ge) => {
          if (ge.group.visible && !isTimePaused) {
            ge.group.rotation.y += ge.data.spinSpeed;
          }
        });
      } else if (currentSolarMode === "moons" || currentSolarMode === "solo_body") {
        if (!isTimePaused) {
          if (soloSurfaceMesh) soloSurfaceMesh.rotation.y += 0.004;
          if (soloCoreGroup) soloCoreGroup.rotation.y += 0.003;
        }
      } else {
        if (!isTimePaused && currentSolarMode !== "compare") {
          const deltaDays = isRealTimeMode ? dt / 86400 : timeSpeedDaysPerSec * dt;
          simDate = isRealTimeMode ? new Date() : new Date(simDate.getTime() + deltaDays * 86400000);

          const dateEl = document.getElementById("solarDateDisplay");
          if (dateEl) {
            const d = String(simDate.getUTCDate()).padStart(2, "0");
            const m = months[simDate.getUTCMonth()];
            const y = simDate.getUTCFullYear();
            dateEl.innerText = `${d} ${m} ${y}`;
          }

          planetEntries.forEach((p) => {
            if (p.data.distance > 0) {
              p.angle += ((Math.PI * 2) / p.data.orbitPeriodDays) * deltaDays;
              p.group.position.set(
                Math.cos(p.angle) * p.data.distance,
                0,
                Math.sin(p.angle) * p.data.distance
              );
            }
          });
        }

        const spinFactor = isRealTimeMode ? 0.05 : Math.max(0.3, Math.min(2.2, timeSpeedDaysPerSec * 0.4));
        planetEntries.forEach((p) => {
          p.mesh.rotation.y += p.data.rotSpeed * spinFactor;
          p.moonPivots.forEach((mp) => {
            mp.pivot.rotation.y += mp.speed * spinFactor;
          });
        });
        if (asteroidInstancedMesh) asteroidInstancedMesh.rotation.y += 0.00025;
      }

      camTarget.x += (camGoalTarget.x - camTarget.x) * 0.1;
      camTarget.y += (camGoalTarget.y - camTarget.y) * 0.1;
      camTarget.z += (camGoalTarget.z - camTarget.z) * 0.1;

      camSpherical.radius += (camGoalSpherical.radius - camSpherical.radius) * 0.1;
      camSpherical.theta += (camGoalSpherical.theta - camSpherical.theta) * 0.12;
      camSpherical.phi += (camGoalSpherical.phi - camSpherical.phi) * 0.12;

      camera.position.set(
        camTarget.x + camSpherical.radius * Math.sin(camSpherical.phi) * Math.sin(camSpherical.theta),
        camTarget.y + camSpherical.radius * Math.cos(camSpherical.phi),
        camTarget.z + camSpherical.radius * Math.sin(camSpherical.phi) * Math.cos(camSpherical.theta)
      );
      camera.lookAt(camTarget.x, camTarget.y, camTarget.z);

      renderer.render(scene, camera);
      renderLaserPointerOverlay(now);

      const stage = document.getElementById("iqraSolarStage");
      if (stage && (currentSolarMode === "orbit" || currentSolarMode === "compare")) {
        const w = stage.clientWidth;
        const h = stage.clientHeight;
        planetEntries.forEach((p) => {
          if (!showLabels) {
            p.labelEl.style.display = "none";
            return;
          }
          const proj = p.group.position.clone();
          proj.y += p.data.radius + 0.7;
          proj.project(camera);

          if (proj.z > 1) {
            p.labelEl.style.display = "none";
          } else {
            p.labelEl.style.display = "block";
            p.labelEl.style.left = `${(proj.x * 0.5 + 0.5) * w}px`;
            p.labelEl.style.top = `${(-proj.y * 0.5 + 0.5) * h}px`;
          }
        });
      }
    };

    animFrameId = requestAnimationFrame(tick);
  }

  // ==========================================
  // 11. LASER POINTER & SNAPSHOT TO WHITEBOARD
  // ==========================================
  function syncSolarLaserCanvasSize() {
    const stage = document.getElementById("iqraSolarStage");
    const canvas = document.getElementById("iqraSolarLaserCanvas");
    if (!stage || !canvas) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
    }
  }

  function initSolarLaserPointer() {
    const stage = document.getElementById("iqraSolarStage");
    if (!stage) return;
    setTimeout(syncSolarLaserCanvasSize, 120);

    stage.addEventListener("pointermove", (e) => {
      if (!isLaserActive) return;
      const rect = stage.getBoundingClientRect();
      laserTrail.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        t: performance.now(),
      });
      if (laserTrail.length > 26) laserTrail.shift();
    });
  }

  function renderLaserPointerOverlay(now) {
    const canvas = document.getElementById("iqraSolarLaserCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isLaserActive || laserTrail.length === 0) return;

    laserTrail = laserTrail.filter((pt) => now - pt.t < 420);
    if (laserTrail.length === 0) return;

    for (let i = 1; i < laserTrail.length; i++) {
      const p0 = laserTrail[i - 1];
      const p1 = laserTrail[i];
      const alpha = (i / laserTrail.length) * 0.85;
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.lineWidth = (i / laserTrail.length) * 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    const tip = laserTrail[laserTrail.length - 1];
    const grad = ctx.createRadialGradient(tip.x, tip.y, 1, tip.x, tip.y, 22);
    grad.addColorStop(0, "rgba(255, 255, 255, 1)");
    grad.addColorStop(0.25, "rgba(239, 68, 68, 0.95)");
    grad.addColorStop(0.65, "rgba(239, 68, 68, 0.25)");
    grad.addColorStop(1, "rgba(239, 68, 68, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  function sendSolarSnapshotToWhiteboard() {
    if (!renderer || !scene || !camera) return;
    renderer.render(scene, camera);

    const glCanvas = renderer.domElement;
    const stage = document.getElementById("iqraSolarStage");

    const merged = document.createElement("canvas");
    merged.width = glCanvas.width;
    merged.height = glCanvas.height;
    const ctx = merged.getContext("2d");

    ctx.drawImage(glCanvas, 0, 0);

    if (showLabels && stage && (currentSolarMode === "orbit" || currentSolarMode === "compare")) {
      const scaleX = merged.width / stage.clientWidth;
      const scaleY = merged.height / stage.clientHeight;
      ctx.font = `bold ${Math.round(12 * scaleX)}px sans-serif`;
      planetEntries.forEach((p) => {
        if (p.labelEl.style.display === "none") return;
        const lx = parseFloat(p.labelEl.style.left) * scaleX;
        const ly = parseFloat(p.labelEl.style.top) * scaleY - 12 * scaleY;
        const text = p.labelEl.innerText;
        const tw = ctx.measureText(text).width + 12 * scaleX;
        ctx.fillStyle = "rgba(2, 6, 23, 0.78)";
        ctx.fillRect(lx - tw / 2, ly - 14 * scaleY, tw, 18 * scaleY);
        ctx.fillStyle = "#e0f2fe";
        ctx.fillText(text, lx - tw / 2 + 6 * scaleX, ly);
      });
    }

    const dataUrl = merged.toDataURL("image/png");
    closeSolar3DExplorer();

    const selectToolBtn =
      document.getElementById("selectToolBtn") || document.querySelector("[data-tool='select']");
    if (selectToolBtn) selectToolBtn.click();

    const wbCanvas = window.canvas || window.fabricCanvas;
    if (wbCanvas && window.fabric) {
      wbCanvas.isDrawingMode = false;
      window.fabric.Image.fromURL(dataUrl, (img) => {
        const maxW = wbCanvas.getWidth() * 0.72;
        const scale = Math.min(1, maxW / img.width);
        img.set({
          left: (wbCanvas.getWidth() - img.width * scale) / 2,
          top: (wbCanvas.getHeight() - img.height * scale) / 2,
          scaleX: scale,
          scaleY: scale,
          selectable: true,
          evented: true,
          cornerStyle: "circle",
          borderColor: "#d97706",
          cornerColor: "#d97706",
        });
        wbCanvas.add(img);
        wbCanvas.setActiveObject(img);
        wbCanvas.renderAll();
      });
    }
  }

  // ==========================================
  // 12. UI EVENTS & CONTROLS
  // ==========================================
  function returnToSolarSystemOverview() {
    selectedPlanetKey = null;
    isSoloCoreOpen = false;
    document.querySelectorAll(".solar-mode-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.mode === "orbit");
    });
    applySolarTeachingMode("orbit");
    document.querySelectorAll(".solar-body-btn").forEach((b) => b.classList.remove("active"));
    document.getElementById("solarCardCategory").innerText = "SOLAR SYSTEM";
    document.getElementById("solarCardTitle").innerText = "Overview";
    document.getElementById("solarCardBody").innerHTML =
      "Select any star, planet, moon, or galaxy from the Objects menu to inspect it in high-detail 3D.";
    document.getElementById("solarCoreActionWrap").style.display = "none";
    document.getElementById("solarCoreLegend").style.display = "none";
    document.getElementById("solarMoonsSection").style.display = "none";
  }

  function bindSolarModalEvents() {
    document.getElementById("btnCloseSolar3D")?.addEventListener("click", closeSolar3DExplorer);
    document.getElementById("btnToggleBodyInternalCore")?.addEventListener("click", toggleSoloInternalCore);
    document.getElementById("btnSolarSpaceSound")?.addEventListener("click", toggleSpaceAudio);

    const toggleDrawerBtn = document.getElementById("btnToggleLeftDrawer");
    const leftDock = document.getElementById("solarLeftDock");
    toggleDrawerBtn?.addEventListener("click", () => {
      isLeftDrawerOpen = !isLeftDrawerOpen;
      leftDock?.classList.toggle("collapsed", !isLeftDrawerOpen);
      toggleDrawerBtn.innerHTML = isLeftDrawerOpen
        ? '<i class="fa-solid fa-xmark"></i> <span>Hide Objects</span>'
        : '<i class="fa-solid fa-bars"></i> <span>Objects</span>';
    });

    const fsBtn = document.getElementById("btnSolarFullScreen");
    fsBtn?.addEventListener("click", () => {
      const modal = document.getElementById("iqraSolar3DModal");
      if (!modal) return;
      isFullScreen = !isFullScreen;
      modal.classList.toggle("windowed", !isFullScreen);
      fsBtn.innerHTML = isFullScreen
        ? '<i class="fa-solid fa-compress"></i>'
        : '<i class="fa-solid fa-expand"></i>';
      setTimeout(resizeSolarRenderer, 220);
    });

    document.querySelectorAll(".solar-mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;
        if (mode === "orbit") {
          returnToSolarSystemOverview();
          return;
        }
        document.querySelectorAll(".solar-mode-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        applySolarTeachingMode(mode);
      });
    });

    const namesBtn = document.getElementById("btnSolarShowNames");
    namesBtn?.addEventListener("click", () => {
      showLabels = !showLabels;
      namesBtn.classList.toggle("active-blue", showLabels);
    });

    const orbitsBtn = document.getElementById("btnSolarShowOrbits");
    orbitsBtn?.addEventListener("click", () => {
      showOrbits = !showOrbits;
      orbitsBtn.classList.toggle("active-blue", showOrbits);
      planetEntries.forEach((p) => {
        if (p.orbitLine) p.orbitLine.visible = showOrbits && currentSolarMode === "orbit";
      });
      if (auGridGroup) auGridGroup.visible = showOrbits && currentSolarMode === "orbit";
    });

    const laserBtn = document.getElementById("btnSolarLaserToggle");
    const stage = document.getElementById("iqraSolarStage");
    laserBtn?.addEventListener("click", () => {
      isLaserActive = !isLaserActive;
      laserTrail = [];
      laserBtn.classList.toggle("active-laser", isLaserActive);
      stage?.classList.toggle("laser-mode", isLaserActive);
      syncSolarLaserCanvasSize();
    });

    document.getElementById("btnSolarResetOverview")?.addEventListener("click", returnToSolarSystemOverview);

    const playPauseBtn = document.getElementById("btnSolarPlayPause");
    const realRotBtn = document.getElementById("btnSolarRealRotation");
    const speedLabel = document.getElementById("solarSpeedLabel");

    const updateSpeedDisplay = () => {
      if (!speedLabel) return;
      if (isRealTimeMode) {
        speedLabel.innerText = "Real-Time";
      } else {
        const spd = SPEED_STEPS[speedStepIndex];
        speedLabel.innerText = spd < 1 ? `${spd} day/s` : `${spd} day${spd > 1 ? "s" : ""}/s`;
      }
      realRotBtn?.classList.toggle("active-blue", isRealTimeMode);
    };

    playPauseBtn?.addEventListener("click", () => {
      isTimePaused = !isTimePaused;
      playPauseBtn.innerHTML = isTimePaused
        ? '<i class="fa-solid fa-play"></i>'
        : '<i class="fa-solid fa-pause"></i>';
    });

    realRotBtn?.addEventListener("click", () => {
      isRealTimeMode = !isRealTimeMode;
      isTimePaused = false;
      if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      updateSpeedDisplay();
    });

    document.getElementById("btnSpeedDecrease")?.addEventListener("click", () => {
      isRealTimeMode = false;
      speedStepIndex = Math.max(0, speedStepIndex - 1);
      timeSpeedDaysPerSec = SPEED_STEPS[speedStepIndex];
      updateSpeedDisplay();
    });

    document.getElementById("btnSpeedIncrease")?.addEventListener("click", () => {
      isRealTimeMode = false;
      speedStepIndex = Math.min(SPEED_STEPS.length - 1, speedStepIndex + 1);
      timeSpeedDaysPerSec = SPEED_STEPS[speedStepIndex];
      updateSpeedDisplay();
    });

    document.getElementById("btnSolarToBoard")?.addEventListener("click", sendSolarSnapshotToWhiteboard);
  }

  async function openSolar3DExplorer() {
    createSolarModalDOM();
    const modal = document.getElementById("iqraSolar3DModal");
    if (!modal) return;
    modal.classList.add("open");
    isSolarModalOpen = true;
    await initSolarThreeScene();
    setTimeout(resizeSolarRenderer, 80);
  }

  function closeSolar3DExplorer() {
    const modal = document.getElementById("iqraSolar3DModal");
    if (modal) modal.classList.remove("open");
    isSolarModalOpen = false;
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#dockBtnSolar3D");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (isSolarModalOpen) {
      closeSolar3DExplorer();
    } else {
      openSolar3DExplorer();
    }
  });

  window.openSolar3DExplorer = openSolar3DExplorer;
  window.closeSolar3DExplorer = closeSolar3DExplorer;
})(window);