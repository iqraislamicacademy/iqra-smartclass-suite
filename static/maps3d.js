// ========================================================
// IQRA SMARTCLASS SUITE - IQRA 2D/3D MAPS & GEOGRAPHY EXPLORER (maps3d.js)
// Complete & Verified:
// 1. Iqra Branding ("Iqra Maps & Geography Explorer")
// 2. 3 Distinct Modes: Political (Vibrant Colors), Physical Terrain, Blank Test (No Satellite)
// 3. Dedicated "Show Names" Toggle Button (Labels ON/OFF anytime)
// 4. Working Box-Style Pen (5 Colors + Eraser) that stays visible in both 2D & 3D
// 5. Crisp Image Export to Whiteboard (auto-switches board to Select mode as clean image)
// 6. Accurate Distance Ruler (km) + Full-Screen Toggle + All Countries & Indian States
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
  let isFullScreen = true;
  let is3DMode = true;
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

  const INDIA_STATE_PRESETS = [
    { name: "Maharashtra", center: [75.7139, 19.7515], zoom: 6.0, capital: "Mumbai (Winter: Nagpur)", rivers: "Godavari, Krishna, Tapi", info: "2nd most populous state; Deccan Plateau & Western Ghats." },
    { name: "Uttar Pradesh", center: [80.9462, 26.8467], zoom: 6.1, capital: "Lucknow", rivers: "Ganga, Yamuna, Gomti", info: "Heart of the Indo-Gangetic Plain; most populous Indian state." },
    { name: "Rajasthan", center: [74.2179, 27.0238], zoom: 5.9, capital: "Jaipur", rivers: "Chambal, Luni", info: "Largest Indian state by area; home to the Thar Desert & Aravalli Range." },
    { name: "Jammu and Kashmir", center: [74.7973, 33.7782], zoom: 6.7, capital: "Srinagar / Jammu", rivers: "Jhelum, Chenab", info: "Northernmost Himalayan region famous for Kashmir Valley & Dal Lake." },
    { name: "Ladakh", center: [77.5771, 34.1526], zoom: 6.4, capital: "Leh", rivers: "Indus, Shyok, Zanskar", info: "High-altitude cold desert between Karakoram and Great Himalayas." },
    { name: "Gujarat", center: [71.1924, 22.2587], zoom: 6.2, capital: "Gandhinagar", rivers: "Narmada, Sabarmati, Tapi", info: "Longest coastline in India; Rann of Kutch & Gir Forest." },
    { name: "Madhya Pradesh", center: [78.6569, 22.9734], zoom: 6.0, capital: "Bhopal", rivers: "Narmada, Betwa, Son", info: "Central India ('Heart of India'); Vindhya and Satpura ranges." },
    { name: "Tamil Nadu", center: [78.6569, 11.1271], zoom: 6.2, capital: "Chennai", rivers: "Kaveri, Vaigai", info: "Southernmost mainland state along the Coromandel Coast." },
    { name: "West Bengal", center: [87.855, 22.9868], zoom: 6.2, capital: "Kolkata", rivers: "Hooghly, Teesta", info: "Stretches from Darjeeling Himalayas to Sundarbans Delta." },
    { name: "Kerala", center: [76.2711, 10.8505], zoom: 6.6, capital: "Thiruvananthapuram", rivers: "Periyar, Bharathappuzha", info: "Malabar Coast state known for Western Ghats & backwaters." },
    { name: "Bihar", center: [85.3131, 25.0961], zoom: 6.5, capital: "Patna", rivers: "Ganga, Kosi, Gandak", info: "Historic seat of Magadha, Nalanda, and Bodh Gaya." },
    { name: "Karnataka", center: [75.7139, 15.3173], zoom: 6.1, capital: "Bengaluru", rivers: "Kaveri, Tungabhadra", info: "Deccan plateau & coastal region; Silicon Valley of India." },
    { name: "Andhra Pradesh", center: [79.74, 15.9129], zoom: 6.1, capital: "Amaravati", rivers: "Godavari, Krishna", info: "Southeastern coastal state along the Bay of Bengal." },
    { name: "Telangana", center: [79.0193, 18.1124], zoom: 6.4, capital: "Hyderabad", rivers: "Godavari, Krishna", info: "Deccan Plateau state formed in 2014." },
    { name: "Odisha", center: [85.0985, 20.9517], zoom: 6.2, capital: "Bhubaneswar", rivers: "Mahanadi, Brahmani", info: "Eastern coastal state home to Chilika Lake & Konark." },
    { name: "Assam", center: [92.9376, 26.2006], zoom: 6.5, capital: "Dispur", rivers: "Brahmaputra, Barak", info: "Gateway to Northeast India; famous for tea & Kaziranga." },
    { name: "Punjab", center: [75.3412, 31.1471], zoom: 6.8, capital: "Chandigarh", rivers: "Sutlej, Beas, Ravi", info: "Land of Five Rivers in northwestern India." },
    { name: "Haryana", center: [76.0856, 29.0588], zoom: 6.9, capital: "Chandigarh", rivers: "Yamuna, Ghaggar", info: "Surrounds New Delhi on three sides; historic Kurukshetra." },
    { name: "Himachal Pradesh", center: [77.1734, 31.1048], zoom: 6.8, capital: "Shimla", rivers: "Beas, Sutlej, Chenab", info: "Western Himalayan state known for valleys and hill stations." },
    { name: "Uttarakhand", center: [79.0193, 30.0668], zoom: 6.8, capital: "Dehradun", rivers: "Ganga, Yamuna, Alaknanda", info: "Origin of the Ganga and Yamuna in the Himalayas." },
    { name: "Jharkhand", center: [85.2799, 23.6102], zoom: 6.5, capital: "Ranchi", rivers: "Damodar, Subarnarekha", info: "Mineral-rich Chota Nagpur Plateau state." },
    { name: "Chhattisgarh", center: [81.8661, 21.2787], zoom: 6.3, capital: "Raipur", rivers: "Mahanadi, Indravati", info: "Forested central Indian state." },
    { name: "Goa", center: [74.124, 15.2993], zoom: 8.5, capital: "Panaji", rivers: "Mandovi, Zuari", info: "Smallest Indian state by area along the Konkan coast." },
    { name: "Delhi", center: [77.1025, 28.7041], zoom: 9.2, capital: "New Delhi", rivers: "Yamuna", info: "National Capital Territory of India." },
  ];

  // ==========================================
  // 1. LOAD MAPLIBRE GL JS
  // ==========================================
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
        z-index: 99990;
        background: #0f172a;
        display: none;
        flex-direction: column;
        overflow: hidden;
        font-family: system-ui, -apple-system, sans-serif;
        color: #f8fafc;
        transition: inset 0.2s ease, border-radius 0.2s ease;
      }
      #iqraMaps3DModal.windowed {
        inset: 28px 60px;
        border: 1px solid #334155;
        border-radius: 16px;
      }
      #iqraMaps3DModal.open {
        display: flex;
      }
      .maps3d-header {
        height: 52px;
        background: linear-gradient(90deg, #0f172a 0%, #1e293b 100%);
        border-bottom: 1px solid #334155;
        padding: 0 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-shrink: 0;
        z-index: 40;
      }
      .maps3d-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 800;
        font-size: 14.5px;
        color: #38bdf8;
        white-space: nowrap;
      }
      .iqra-brand-pill {
        background: linear-gradient(135deg, #0284c7, #2563eb);
        color: #ffffff;
        font-size: 10.5px;
        font-weight: 800;
        letter-spacing: 0.5px;
        padding: 2px 7px;
        border-radius: 6px;
        text-transform: uppercase;
      }
      .maps3d-modes {
        display: flex;
        gap: 4px;
        background: #020617;
        padding: 3px;
        border-radius: 10px;
        border: 1px solid #1e293b;
      }
      .maps3d-mode-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        padding: 5px 11px;
        border-radius: 7px;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      }
      .maps3d-mode-btn.active {
        background: #0284c7;
        color: #ffffff;
      }
      .maps3d-header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .maps3d-action-btn {
        background: #1e293b;
        color: #e2e8f0;
        border: 1px solid #334155;
        padding: 5px 10px;
        border-radius: 8px;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        white-space: nowrap;
      }
      .maps3d-action-btn:hover {
        background: #334155;
      }
      .maps3d-action-btn.primary {
        background: #10b981;
        border-color: #059669;
        color: #ffffff;
      }
      .maps3d-action-btn.active-tool {
        background: #f59e0b;
        border-color: #d97706;
        color: #0f172a;
      }
      .maps3d-action-btn.active-blue {
        background: #0284c7;
        border-color: #38bdf8;
        color: #ffffff;
      }
      .maps3d-body {
        flex: 1;
        display: flex;
        position: relative;
        overflow: hidden;
      }
      .maps3d-sidebar {
        width: 255px;
        background: rgba(15, 23, 42, 0.97);
        border-right: 1px solid #334155;
        display: flex;
        flex-direction: column;
        z-index: 25;
        flex-shrink: 0;
      }
      .maps3d-tabs {
        display: flex;
        border-bottom: 1px solid #334155;
      }
      .maps3d-tab {
        flex: 1;
        padding: 9px 6px;
        background: transparent;
        border: none;
        color: #94a3b8;
        font-weight: 700;
        font-size: 11.5px;
        cursor: pointer;
        border-bottom: 2px solid transparent;
      }
      .maps3d-tab.active {
        color: #38bdf8;
        border-bottom-color: #38bdf8;
        background: rgba(56, 189, 248, 0.08);
      }
      .maps3d-search-box {
        padding: 8px;
        border-bottom: 1px solid #1e293b;
      }
      .maps3d-search-box input {
        width: 100%;
        padding: 7px 10px;
        border-radius: 8px;
        border: 1px solid #334155;
        background: #020617;
        color: #f8fafc;
        font-size: 12px;
        outline: none;
        box-sizing: border-box;
      }
      .maps3d-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .maps3d-item {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 7px 10px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
      }
      .maps3d-item:hover {
        border-color: #38bdf8;
        background: #263349;
      }
      .maps3d-item small {
        color: #94a3b8;
        font-size: 10.5px;
      }
      #iqraMapStage {
        flex: 1;
        position: relative;
        overflow: hidden;
        background: #e0f2fe;
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
      /* Box-Style Pen + Colors + Eraser Popover (Always visible on top) */
      .maps3d-pen-box {
        position: absolute;
        top: 12px;
        right: 16px;
        z-index: 50;
        background: #0f172a;
        border: 1.5px solid #38bdf8;
        border-radius: 12px;
        padding: 10px 12px;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.65);
        display: none;
        flex-direction: column;
        gap: 8px;
        width: 220px;
      }
      .maps3d-pen-box.open {
        display: flex !important;
      }
      .maps3d-color-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
      }
      .maps3d-swatch {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
      }
      .maps3d-swatch.active {
        border-color: #ffffff;
        transform: scale(1.15);
      }
      .iqra-dist-badge {
        background: #0f172a;
        color: #34d399;
        font-weight: 800;
        font-size: 12.5px;
        padding: 4px 10px;
        border-radius: 999px;
        border: 1.5px solid #10b981;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
        white-space: nowrap;
      }
      .maps3d-info-card {
        position: absolute;
        bottom: 16px;
        right: 16px;
        width: 280px;
        background: rgba(15, 23, 42, 0.94);
        backdrop-filter: blur(8px);
        border: 1px solid #38bdf8;
        border-radius: 12px;
        padding: 10px 14px;
        z-index: 30;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
        display: none;
      }
      .maps3d-info-card.visible {
        display: block;
      }
      .maps3d-camera-bar {
        position: absolute;
        bottom: 16px;
        left: 16px;
        z-index: 30;
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid #334155;
        border-radius: 999px;
        padding: 5px 12px;
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .maps3d-cam-btn {
        background: #1e293b;
        color: #e2e8f0;
        border: 1px solid #475569;
        padding: 4px 10px;
        border-radius: 14px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
      }
      .maps3d-cam-btn:hover,
      .maps3d-cam-btn.active {
        border-color: #38bdf8;
        color: #38bdf8;
      }
    `;
    document.head.appendChild(style);
  }

  // ==========================================
  // 2. BUILD IQRA MAPS STUDIO UI
  // ==========================================
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
          <span>Maps & Geography Explorer</span>
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
          <button id="btnToggle2D3D" class="maps3d-action-btn active-tool" title="Switch between 2D Flat Map and 3D Tilted Map">
            <i class="fa-solid fa-cube"></i> <span>3D View</span>
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
            <input type="text" id="maps3dSearchInput" placeholder="Search state or country..." />
          </div>
          <div class="maps3d-list" id="maps3dPresetList"></div>
        </div>

        <div id="iqraMapStage">
          <div id="iqraMapCanvas"></div>
          <canvas id="iqraMapAnnotateCanvas"></canvas>

          <!-- Box-Style Pen + Colors + Eraser -->
          <div class="maps3d-pen-box" id="maps3dPenBox">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:700;color:#38bdf8;">
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
            <div style="display:flex;gap:6px;">
              <button id="btnMapPenSelect" class="maps3d-cam-btn active" style="flex:1;">✏️ Pen</button>
              <button id="btnMapEraserSelect" class="maps3d-cam-btn" style="flex:1;">🧽 Eraser</button>
              <button id="btnMapClearInk" class="maps3d-cam-btn" style="color:#f87171;">Clear</button>
            </div>
          </div>

          <div class="maps3d-camera-bar">
            <button class="maps3d-cam-btn" id="btnCamIndiaReset">🇮🇳 India</button>
            <button class="maps3d-cam-btn" id="btnCamWorldReset">🌍 World</button>
            <button class="maps3d-cam-btn" id="btnCamRotateLeft">↺ Rotate</button>
          </div>

          <div class="maps3d-info-card" id="maps3dInfoCard">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <strong id="infoCardTitle" style="color:#38bdf8;font-size:14px;">India</strong>
              <button id="btnCloseInfoCard" style="background:none;border:none;color:#94a3b8;cursor:pointer;">✕</button>
            </div>
            <div id="infoCardMeta" style="font-size:12px;color:#cbd5e1;line-height:1.45;"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    initMapAnnotationCanvas();
    bindMapsModalEvents();
  }

  // ==========================================
  // 3. RELIABLE PEN & ERASER ENGINE ON MAP
  // ==========================================
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
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {}

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
      // Draw dot immediately for single taps
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
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) {}
    };
    canvas.addEventListener("pointerup", stopStroke);
    canvas.addEventListener("pointercancel", stopStroke);
  }

  // ==========================================
  // 4. ALL WORLD COUNTRIES & INDIA STATES
  // ==========================================
  let activeSidebarTab = "india";

  function computeFeatureCenter(feature) {
    let minLng = 180,
      maxLng = -180,
      minLat = 90,
      maxLat = -90;
    const walk = (coords) => {
      if (typeof coords[0] === "number") {
        if (coords[0] < minLng) minLng = coords[0];
        if (coords[0] > maxLng) maxLng = coords[0];
        if (coords[1] < minLat) minLat = coords[1];
        if (coords[1] > maxLat) maxLat = coords[1];
      } else {
        coords.forEach(walk);
      }
    };
    if (feature.geometry && feature.geometry.coordinates) {
      walk(feature.geometry.coordinates);
    }
    return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
  }

  async function ensureWorldCountriesLoaded() {
    if (allWorldCountriesList.length > 0) return;
    try {
      const res = await fetch(WORLD_GEOJSON_URL);
      cachedWorldGeoJson = await res.json();
      allWorldCountriesList = (cachedWorldGeoJson.features || [])
        .map((f, idx) => {
          const name = (f.properties && f.properties.name) || "Country";
          f.properties = f.properties || {};
          f.properties._colorIdx = idx % 7;
          f.properties._center = computeFeatureCenter(f);
          return {
            name,
            center: f.properties._center,
            zoom: name === "Russia" || name === "Canada" || name === "United States" ? 3.2 : 4.5,
            info: "Click 'Show Names', '2D/3D View', or use Pen Box to teach.",
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
        '<div style="padding:12px;color:#94a3b8;font-size:12px;">Loading all world countries...</div>';
      await ensureWorldCountriesLoaded();
    }

    listEl.innerHTML = "";
    const query = filterText.trim().toLowerCase();
    const sourceData =
      activeSidebarTab === "india" ? INDIA_STATE_PRESETS : allWorldCountriesList;

    const filtered = sourceData.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.capital && item.capital.toLowerCase().includes(query))
    );

    filtered.forEach((item) => {
      const div = document.createElement("div");
      div.className = "maps3d-item";
      div.innerHTML = `
        <div>
          <div style="font-weight:600;color:#f8fafc;">${item.name}</div>
          ${item.capital ? `<small>Capital: ${item.capital}</small>` : `<small>Country</small>`}
        </div>
        <i class="fa-solid fa-location-arrow" style="color:#38bdf8;font-size:11px;"></i>
      `;
      div.addEventListener("click", () => {
        flyToLocation(item);
      });
      listEl.appendChild(div);
    });
  }

  function showInfoCard(item) {
    const card = document.getElementById("maps3dInfoCard");
    const title = document.getElementById("infoCardTitle");
    const meta = document.getElementById("infoCardMeta");
    if (!card || !title || !meta) return;

    title.innerText = item.name;
    meta.innerHTML = `
      ${item.capital ? `<div><strong>Capital:</strong> ${item.capital}</div>` : ""}
      ${item.rivers ? `<div><strong>Major Rivers:</strong> ${item.rivers}</div>` : ""}
      <div style="margin-top:4px;color:#94a3b8;">${item.info || ""}</div>
    `;
    card.classList.add("visible");
  }

  function flyToLocation(item) {
    if (!mapInstance) return;
    highlightedRegionName = item.name;
    mapInstance.flyTo({
      center: item.center,
      zoom: item.zoom || 5.2,
      pitch: is3DMode ? 48 : 0,
      bearing: 0,
      speed: 1.2,
      essential: true,
    });
    showInfoCard(item);
    applyModeAndLayerStyling();
  }

  // ==========================================
  // 5. DISTINCT POLITICAL, PHYSICAL TERRAIN & BLANK TEST STYLES
  // ==========================================
  function getBaseRasterStyle(mode) {
    // Distinct base maps for each mode (No Satellite, Zero Watermarks)
    let tileUrl =
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
    if (mode === "physical") {
      tileUrl =
        "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}";
    } else if (mode === "blank") {
      tileUrl =
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
    }

    return {
      version: 8,
      glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      sources: {
        "iqra-free-tiles": {
          type: "raster",
          tiles: [tileUrl],
          tileSize: 256,
          crossOrigin: "anonymous",
        },
      },
      layers: [
        {
          id: "iqra-base-layer",
          type: "raster",
          source: "iqra-free-tiles",
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    };
  }

  function buildLabelPointsGeoJson(geoJson, propKey) {
    if (!geoJson || !geoJson.features) return { type: "FeatureCollection", features: [] };
    return {
      type: "FeatureCollection",
      features: geoJson.features.map((f) => {
        const label = (f.properties && (f.properties[propKey] || f.properties.name)) || "";
        const center = (f.properties && f.properties._center) || computeFeatureCenter(f);
        return {
          type: "Feature",
          properties: { label },
          geometry: { type: "Point", coordinates: center },
        };
      }),
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
          f.properties._center = computeFeatureCenter(f);
        });
      }
      await ensureWorldCountriesLoaded();

      if (cachedWorldGeoJson && !mapInstance.getSource("world-countries-src")) {
        mapInstance.addSource("world-countries-src", {
          type: "geojson",
          data: cachedWorldGeoJson,
        });
        mapInstance.addSource("world-labels-src", {
          type: "geojson",
          data: buildLabelPointsGeoJson(cachedWorldGeoJson, "name"),
        });

        mapInstance.addLayer({
          id: "world-countries-fill",
          type: "fill-extrusion",
          source: "world-countries-src",
          paint: {
            "fill-extrusion-color": "#38bdf8",
            "fill-extrusion-height": 1000,
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.65,
          },
        });
        mapInstance.addLayer({
          id: "world-countries-borders",
          type: "line",
          source: "world-countries-src",
          paint: {
            "line-color": "#1e293b",
            "line-width": 1.2,
          },
        });
        mapInstance.addLayer({
          id: "world-countries-labels",
          type: "symbol",
          source: "world-labels-src",
          layout: {
            "text-field": ["get", "label"],
            "text-size": 11,
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#0f172a",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.5,
          },
        });
      }

      if (!mapInstance.getSource("india-states-src")) {
        mapInstance.addSource("india-states-src", {
          type: "geojson",
          data: cachedIndiaGeoJson,
        });
        mapInstance.addSource("india-labels-src", {
          type: "geojson",
          data: buildLabelPointsGeoJson(cachedIndiaGeoJson, "NAME_1"),
        });
      }

      if (!mapInstance.getLayer("india-states-3d-fill")) {
        mapInstance.addLayer({
          id: "india-states-3d-fill",
          type: "fill-extrusion",
          source: "india-states-src",
          paint: {
            "fill-extrusion-color": "#0284c7",
            "fill-extrusion-height": is3DMode ? 6000 : 0,
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.85,
          },
        });
      }

      if (!mapInstance.getLayer("india-states-borders")) {
        mapInstance.addLayer({
          id: "india-states-borders",
          type: "line",
          source: "india-states-src",
          paint: {
            "line-color": "#0f172a",
            "line-width": 1.6,
          },
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
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#0f172a",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.6,
          },
        });
      }

      applyModeAndLayerStyling();

      mapInstance.on("click", "india-states-3d-fill", (e) => {
        if (isMeasureModeActive || isMapPenDrawing) return;
        const feature = e.features && e.features[0];
        if (!feature || !feature.properties) return;
        const stateName = feature.properties.NAME_1 || feature.properties.st_nm || "Indian State";
        highlightedRegionName = stateName;
        applyModeAndLayerStyling();

        const matched = INDIA_STATE_PRESETS.find(
          (s) => s.name.toLowerCase() === stateName.toLowerCase()
        );
        showInfoCard(
          matched || {
            name: stateName,
            capital: "India State / UT",
            info: "Use Show Names, 2D/3D toggle, or Pen Box to teach.",
          }
        );
      });
    } catch (err) {
      console.warn("Boundaries layer warning:", err);
    }
  }

  function applyModeAndLayerStyling() {
    if (!mapInstance) return;
    const target = highlightedRegionName.toLowerCase();

    // Vibrant multi-color palette for Political mode
    const multiColorExpr = [
      "match",
      ["get", "_colorIdx"],
      0, "#f59e0b",
      1, "#10b981",
      2, "#3b82f6",
      3, "#ec4899",
      4, "#8b5cf6",
      5, "#14b8a6",
      "#f97316",
    ];

    if (mapInstance.getLayer("world-countries-fill")) {
      if (currentMapMode === "political") {
        mapInstance.setPaintProperty("world-countries-fill", "fill-extrusion-color", [
          "case",
          ["==", ["downcase", ["get", "name"]], target],
          "#ef4444",
          multiColorExpr,
        ]);
        mapInstance.setPaintProperty("world-countries-fill", "fill-extrusion-opacity", 0.52);
      } else if (currentMapMode === "physical") {
        // Transparent overlay so physical terrain relief shows clearly underneath
        mapInstance.setPaintProperty("world-countries-fill", "fill-extrusion-color", [
          "case",
          ["==", ["downcase", ["get", "name"]], target],
          "rgba(245, 158, 11, 0.45)",
          "rgba(255, 255, 255, 0.02)",
        ]);
        mapInstance.setPaintProperty("world-countries-fill", "fill-extrusion-opacity", 0.35);
      } else {
        // Blank Test mode: clean neutral outline map
        mapInstance.setPaintProperty("world-countries-fill", "fill-extrusion-color", [
          "case",
          ["==", ["downcase", ["get", "name"]], target],
          "#f59e0b",
          "#e2e8f0",
        ]);
        mapInstance.setPaintProperty("world-countries-fill", "fill-extrusion-opacity", 0.85);
      }

      mapInstance.setPaintProperty("world-countries-fill", "fill-extrusion-height", [
        "case",
        ["==", ["downcase", ["get", "name"]], target],
        is3DMode ? 65000 : 0,
        1000,
      ]);
    }

    if (mapInstance.getLayer("india-states-3d-fill")) {
      if (currentMapMode === "political") {
        mapInstance.setPaintProperty("india-states-3d-fill", "fill-extrusion-color", [
          "case",
          ["==", ["downcase", ["get", "NAME_1"]], target],
          "#ef4444",
          multiColorExpr,
        ]);
        mapInstance.setPaintProperty("india-states-3d-fill", "fill-extrusion-opacity", 0.78);
      } else if (currentMapMode === "physical") {
        mapInstance.setPaintProperty("india-states-3d-fill", "fill-extrusion-color", [
          "case",
          ["==", ["downcase", ["get", "NAME_1"]], target],
          "rgba(245, 158, 11, 0.5)",
          "rgba(14, 165, 233, 0.14)",
        ]);
        mapInstance.setPaintProperty("india-states-3d-fill", "fill-extrusion-opacity", 0.5);
      } else {
        // Blank Test mode
        mapInstance.setPaintProperty("india-states-3d-fill", "fill-extrusion-color", [
          "case",
          ["==", ["downcase", ["get", "NAME_1"]], target],
          "#f59e0b",
          "#cbd5e1",
        ]);
        mapInstance.setPaintProperty("india-states-3d-fill", "fill-extrusion-opacity", 0.9);
      }

      mapInstance.setPaintProperty("india-states-3d-fill", "fill-extrusion-height", [
        "case",
        ["==", ["downcase", ["get", "NAME_1"]], target],
        is3DMode ? 75000 : 0,
        is3DMode ? 5000 : 0,
      ]);
    }

    // Show / Hide Names toggle (automatically hides names in Blank Test unless toggled ON)
    const labelVisibility = showMapNames && currentMapMode !== "blank" ? "visible" : "none";
    if (mapInstance.getLayer("world-countries-labels")) {
      mapInstance.setLayoutProperty("world-countries-labels", "visibility", labelVisibility);
    }
    if (mapInstance.getLayer("india-states-labels")) {
      mapInstance.setLayoutProperty("india-states-labels", "visibility", labelVisibility);
    }
  }

  // ==========================================
  // 6. INITIALIZE MAP + ACCURATE DISTANCE RULER
  // ==========================================
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
      style: getBaseRasterStyle(currentMapMode),
      center: [78.9629, 22.5937],
      zoom: 4.2,
      pitch: is3DMode ? 48 : 0,
      bearing: 0,
      preserveDrawingBuffer: true,
    });

    mapInstance.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
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
        "width:14px;height:14px;border-radius:50%;background:#10b981;border:2.5px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.4);";
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
      geometry: { type: "LineString", coordinates: [p1, p2] },
    };

    if (mapInstance.getSource("iqra-measure-src")) {
      mapInstance.getSource("iqra-measure-src").setData(lineGeoJson);
    } else {
      mapInstance.addSource("iqra-measure-src", { type: "geojson", data: lineGeoJson });
      mapInstance.addLayer({
        id: "iqra-measure-line",
        type: "line",
        source: "iqra-measure-src",
        paint: { "line-color": "#10b981", "line-width": 4 },
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
        features: [],
      });
    }
  }

  // ==========================================
  // 7. SEND CLEAN IMAGE TO WHITEBOARD (AUTO-SELECT MODE, NO STRAY PEN STROKE)
  // ==========================================
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

      // Switch main whiteboard to Select tool first so stray mouse movement never draws a stroke
      const selectToolBtn = document.getElementById("selectToolBtn") || document.querySelector("[data-tool='select']");
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
            borderColor: "#0284c7",
            cornerColor: "#0284c7",
          });
          wbCanvas.add(img);
          wbCanvas.setActiveObject(img);
          wbCanvas.renderAll();
        });
      }
    });
  }

  // ==========================================
  // 8. UI EVENTS & CONTROLS
  // ==========================================
  function bindMapsModalEvents() {
    document.getElementById("btnCloseMaps3D")?.addEventListener("click", closeMaps3DExplorer);
    document.getElementById("btnCloseInfoCard")?.addEventListener("click", () => {
      document.getElementById("maps3dInfoCard")?.classList.remove("visible");
    });

    // Show Names Toggle
    const showNamesBtn = document.getElementById("btnToggleShowNames");
    showNamesBtn?.addEventListener("click", () => {
      showMapNames = !showMapNames;
      showNamesBtn.classList.toggle("active-blue", showMapNames);
      showNamesBtn.innerHTML = showMapNames
        ? '<i class="fa-solid fa-font"></i> <span>Show Names</span>'
        : '<i class="fa-solid fa-eye-slash"></i> <span>Names Hidden</span>';

      if (mapInstance) {
        const vis = showMapNames ? "visible" : "none";
        if (mapInstance.getLayer("world-countries-labels")) {
          mapInstance.setLayoutProperty("world-countries-labels", "visibility", vis);
        }
        if (mapInstance.getLayer("india-states-labels")) {
          mapInstance.setLayoutProperty("india-states-labels", "visibility", vis);
        }
      }
    });

    // Full-Screen / Windowed Toggle
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

    // 2D Flat vs 3D Tilted View Switch (keeps Pen Box intact!)
    const toggle2D3DBtn = document.getElementById("btnToggle2D3D");
    toggle2D3DBtn?.addEventListener("click", () => {
      is3DMode = !is3DMode;
      toggle2D3DBtn.innerHTML = is3DMode
        ? '<i class="fa-solid fa-cube"></i> <span>3D View</span>'
        : '<i class="fa-solid fa-map"></i> <span>2D Flat</span>';
      toggle2D3DBtn.classList.toggle("active-tool", is3DMode);

      if (mapInstance) {
        mapInstance.easeTo({
          pitch: is3DMode ? 48 : 0,
          bearing: 0,
          duration: 500,
        });
        applyModeAndLayerStyling();
      }
    });

    // Map Modes (Political, Physical Terrain, Blank Test)
    document.querySelectorAll(".maps3d-mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".maps3d-mode-btn").forEach((b) => b.classList.remove("active"));
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

        if (mapInstance) {
          mapInstance.setStyle(getBaseRasterStyle(currentMapMode));
          mapInstance.once("styledata", () => {
            addVectorBoundariesLayers();
          });
        }
      });
    });

    // Box-Style Pen + Colors + Eraser Controls
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

    document.querySelectorAll(".maps3d-swatch").forEach((sw) => {
      sw.addEventListener("click", () => {
        document.querySelectorAll(".maps3d-swatch").forEach((s) => s.classList.remove("active"));
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

    // Sidebar Tabs (India vs All Countries)
    document.querySelectorAll(".maps3d-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".maps3d-tab").forEach((t) => t.classList.remove("active"));
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

    // Distance Ruler Toggle
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

    // Clear Distance & Ink
    document.getElementById("btnMapClearPins")?.addEventListener("click", () => {
      clearDistanceMeasurement();
      highlightedRegionName = "";
      applyModeAndLayerStyling();
      if (inkCanvas) {
        inkCanvas.getContext("2d").clearRect(0, 0, inkCanvas.width, inkCanvas.height);
      }
    });

    // Send Snapshot as Image to Whiteboard
    document.getElementById("btnMapToBoard")?.addEventListener("click", sendMapSnapshotToWhiteboard);

    // Camera quick controls
    document.getElementById("btnCamIndiaReset")?.addEventListener("click", () => {
      flyToLocation({
        name: "India",
        center: [78.9629, 22.5937],
        zoom: 4.2,
        capital: "New Delhi",
        info: "7th largest country by area; 28 States & 8 Union Territories.",
      });
    });
    document.getElementById("btnCamWorldReset")?.addEventListener("click", () => {
      highlightedRegionName = "";
      applyModeAndLayerStyling();
      mapInstance?.flyTo({
        center: [35, 22],
        zoom: 1.8,
        pitch: is3DMode ? 30 : 0,
        bearing: 0,
        duration: 900,
      });
    });
    document.getElementById("btnCamRotateLeft")?.addEventListener("click", () => {
      if (!mapInstance) return;
      mapInstance.easeTo({ bearing: mapInstance.getBearing() + 45, duration: 500 });
    });
  }

  async function openMaps3DExplorer() {
    createMapsModalDOM();
    const modal = document.getElementById("iqraMaps3DModal");
    if (!modal) return;

    modal.classList.add("open");
    isMapModalOpen = true;
    renderPresetList("");
    await initMapLibreInstance();
    setTimeout(() => {
      mapInstance?.resize();
      syncMapInkCanvasSize();
    }, 100);
  }

  function closeMaps3DExplorer() {
    const modal = document.getElementById("iqraMaps3DModal");
    if (modal) modal.classList.remove("open");
    isMapModalOpen = false;
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#dockBtnMaps3D");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (isMapModalOpen) {
      closeMaps3DExplorer();
    } else {
      openMaps3DExplorer();
    }
  });

  window.openMaps3DExplorer = openMaps3DExplorer;
  window.closeMaps3DExplorer = closeMaps3DExplorer;
})(window);