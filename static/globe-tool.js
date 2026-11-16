// ==========================================================================
// IQRA SMARTCLASS SUITE - 3D REAL SATELLITE GLOBE STUDIO (V10 MASTER COMPLETE)
// ==========================================================================
(function () {
  let globeModal = null;
  let map = null;
  let isRotating = false;
  let isFullscreen = true;
  let showLabels = true;
  let showGrid = false;
  let showDrawer = false;
  let measureActive = false;
  let showDayNight = false;
  let showClimate = false;
  let showCurrents = false;
  let showVolcanoes = false;
  let measureMarkers = [];
  let volcanoMarkers = [];
  let currentProvider = "google";
  let currentTheme = "satellite";
  let rotateInterval = null;
  let searchDebounceTimer = null;

  // 1. DYNAMIC STYLES
  function injectGlobeStyles() {
    if (document.getElementById("iqra-globe-engine-styles")) return;
    const style = document.createElement("style");
    style.id = "iqra-globe-engine-styles";
    style.textContent = `
      .iqra-globe-modal {
        position: fixed;
        top: 35px;
        left: 50px;
        width: 930px;
        height: 620px;
        min-width: 440px;
        min-height: 380px;
        background: #020617;
        border: 2px solid #0284c7;
        border-radius: 12px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.95), 0 0 25px rgba(2, 132, 199, 0.4);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        user-select: none;
        resize: both;
        box-sizing: border-box;
      }
      .iqra-globe-modal.is-fullscreen {
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
        border-radius: 0 !important;
        border: none !important;
        resize: none !important;
        margin: 0 !important;
      }
      .iqra-globe-header {
        background: #0f172a;
        border-bottom: 1.5px solid #1e293b;
        padding: 7px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        cursor: move;
        z-index: 20;
      }
      .iqra-globe-header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .iqra-brand-badge {
        display: flex;
        align-items: center;
        gap: 7px;
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(2, 132, 199, 0.25) 100%);
        border: 1.5px solid #f59e0b;
        padding: 4px 11px;
        border-radius: 20px;
        color: #fbbf24;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.6px;
        box-shadow: 0 0 12px rgba(245, 158, 11, 0.35);
        pointer-events: none;
        text-shadow: 0 1px 3px rgba(0,0,0,0.8);
      }
      .iqra-brand-badge i {
        color: #38bdf8;
        font-size: 13px;
        filter: drop-shadow(0 0 4px #38bdf8);
      }
      .iqra-theme-select {
        background: #1e293b;
        border: 1px solid #0284c7;
        color: #e2e8f0;
        padding: 3px 6px;
        border-radius: 5px;
        font-size: 11px;
        outline: none;
        cursor: pointer;
      }
      .iqra-globe-search-wrapper {
        position: relative;
        flex: 1;
        max-width: 220px;
      }
      .iqra-globe-search-box {
        display: flex;
        align-items: center;
        gap: 4px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 6px;
        padding: 2px 6px;
      }
      .iqra-globe-search-box input {
        background: transparent;
        border: none;
        outline: none;
        color: #ffffff;
        font-size: 11px;
        width: 100%;
      }
      .iqra-globe-search-box button {
        background: #0284c7;
        border: none;
        color: #fff;
        padding: 3px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
      }
      .iqra-search-dropdown {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        width: 100%;
        background: #0f172a;
        border: 1px solid #0284c7;
        border-radius: 6px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.9);
        z-index: 100;
        max-height: 220px;
        overflow-y: auto;
        display: none;
      }
      .iqra-search-item {
        padding: 7px 10px;
        font-size: 11px;
        color: #e2e8f0;
        cursor: pointer;
        border-bottom: 1px solid #1e293b;
        display: flex;
        flex-direction: column;
        line-height: 1.3;
      }
      .iqra-search-item:hover {
        background: #0284c7;
        color: #ffffff;
      }
      .iqra-search-item .subtext {
        font-size: 9px;
        color: #94a3b8;
      }
      .iqra-globe-header-right {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .iqra-globe-tool-btn {
        background: #1e293b;
        border: 1px solid #334155;
        color: #cbd5e1;
        cursor: pointer;
        font-size: 11px;
        padding: 4px 7px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: all 0.15s;
      }
      .iqra-globe-tool-btn:hover {
        color: #38bdf8;
        border-color: #0284c7;
        background: #334155;
      }
      .iqra-globe-tool-btn.active {
        background: #0284c7;
        color: #ffffff;
        border-color: #38bdf8;
      }
      .iqra-globe-close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 15px;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .iqra-globe-close-btn:hover {
        color: #ef4444;
      }
      .iqra-globe-viewport {
        flex: 1;
        width: 100%;
        height: 100%;
        position: relative;
        background: #020617;
      }
      .iqra-globe-viewport.crosshair-mode {
        cursor: crosshair !important;
      }
      .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right {
        display: none !important;
      }

/* 1. MapLibre Canvas ko neeche lock kiya */
      #globe3DContainer .maplibregl-canvas-container,
      #globe3DContainer .maplibregl-canvas {
        z-index: 1 !important;
      }

      /* 2. Geo Drawer Panel (Exact Size & Alignment) */
      .iqra-geo-drawer {
        position: absolute;
        top: 12px;
        left: 14px;
        width: 265px;
        max-height: calc(100% - 24px);
        overflow-y: auto;
        background: rgba(15, 23, 42, 0.95);
        border: 1.5px solid #0284c7;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 15px rgba(2, 132, 199, 0.3);
        backdrop-filter: blur(8px);
        z-index: 2000 !important;
        display: none;
        flex-direction: column;
        padding: 10px;
        gap: 6px;
        box-sizing: border-box;
      }
      .iqra-geo-drawer.open {
        display: flex !important;
      }

      /* Header */
      .iqra-drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #334155;
        padding-bottom: 6px;
        color: #38bdf8;
        font-weight: 700;
        font-size: 12px;
      }

      /* Drawer Rows & Text Alignment */
      .iqra-drawer-row {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 6px 10px !important;
        background: #1e293b !important;
        border-radius: 6px !important;
        font-size: 11px !important;
        color: #e2e8f0 !important;
        box-sizing: border-box !important;
      }
      .iqra-drawer-row .label-group {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        color: #e2e8f0 !important;
      }
      .iqra-drawer-row .label-group span {
        display: inline-block !important;
        font-size: 11px !important;
        color: #e2e8f0 !important;
      }

      /* Switches Clean & Working */
      .iqra-switch {
        position: relative;
        display: inline-block;
        width: 34px !important;
        min-width: 34px !important;
        height: 18px !important;
        margin: 0;
        cursor: pointer;
      }
      .iqra-switch input {
        opacity: 0;
        position: absolute;
        top: 0;
        left: 0;
        width: 100% !important;
        height: 100% !important;
        margin: 0;
        z-index: 5;
        cursor: pointer;
      }
      .iqra-slider {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: #475569;
        transition: .2s;
        border-radius: 18px;
        pointer-events: none;
      }
      .iqra-slider:before {
        position: absolute;
        content: "";
        height: 12px;
        width: 12px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: .2s;
        border-radius: 50%;
      }
      input:checked + .iqra-slider { background-color: #0284c7; }
      input:checked + .iqra-slider:before { transform: translateX(16px); }

      /* N. Pole & S. Pole Buttons */
      .iqra-geo-drawer button {
        cursor: pointer !important;
      }
      /* MEASUREMENT FLOATING BADGE */
      .iqra-measure-badge {
        position: absolute;
        bottom: 65px;
        left: 14px;
        background: rgba(15, 23, 42, 0.95);
        border: 2px solid #facc15;
        border-radius: 8px;
        padding: 10px 14px;
        color: #fff;
        font-size: 11px;
        z-index: 40;
        display: none;
        flex-direction: column;
        gap: 4px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.7);
      }
      .iqra-globe-status {
        position: absolute;
        bottom: 12px;
        left: 14px;
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid rgba(56, 189, 248, 0.35);
        padding: 3px 10px;
        border-radius: 5px;
        color: #38bdf8;
        font-size: 10px;
        z-index: 10;
        pointer-events: none;
      }
.iqra-point-marker {
        width: 24px !important;
        height: 24px !important;
        border-radius: 50% !important;
        background: #facc15 !important;
        color: #000000 !important;
        font-weight: 900 !important;
        font-size: 13px !important;
        line-height: 20px !important;
        text-align: center !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 2px solid #ffffff !important;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.9), 0 0 6px #facc15 !important;
        z-index: 9999 !important;
        pointer-events: none !important;
        user-select: none !important;
      }
.iqra-volcano-marker {
        display: block !important;
        z-index: 1500 !important;
        pointer-events: auto !important;
        transform-origin: center center;
        cursor: pointer;
        font-size: 18px;
        filter: drop-shadow(0 0 6px #ef4444);
        transition: transform 0.2s;
        user-select: none;
      }
      .iqra-volcano-marker:hover {
        transform: scale(1.3);
      }
    `;
    document.head.appendChild(style);
  }

  // 2. GEOGRAPHICAL DATA SOURCES
  function createGraticuleGeoJSON() {
    const features = [];
    
    // Parallels (Latitudes) - 1 degree dense step taaki line globe ki satah par chipki rahe
    for (let lat = -80; lat <= 80; lat += 20) {
      const coords = [];
      for (let lng = -180; lng <= 180; lng += 1) {
        coords.push([lng, lat]);
      }
      features.push({ 
        type: 'Feature', 
        geometry: { type: 'LineString', coordinates: coords } 
      });
    }

    // Meridians (Longitudes) - 1 degree dense step (North to South Pole)
    for (let lng = -180; lng < 180; lng += 20) {
      const coords = [];
      for (let lat = -85; lat <= 85; lat += 1) {
        coords.push([lng, lat]);
      }
      features.push({ 
        type: 'Feature', 
        geometry: { type: 'LineString', coordinates: coords } 
      });
    }

    return { type: 'FeatureCollection', features };
  }

  // Climate Zones & Major Parallels (Dense Rings for 3D Globe curvature)
  function getClimateZonesGeoJSON() {
    function makeRing(minLat, maxLat) {
      const topEdge = [];
      const bottomEdge = [];
      for (let lng = -180; lng <= 180; lng += 2) {
        topEdge.push([lng, maxLat]);
        bottomEdge.push([lng, minLat]);
      }
      return [topEdge.concat(bottomEdge.reverse()).concat([topEdge[0]])];
    }

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { zone: 'torrid', color: 'rgba(239, 68, 68, 0.22)' },
          geometry: { type: 'Polygon', coordinates: makeRing(-23.5, 23.5) }
        },
        {
          type: 'Feature',
          properties: { zone: 'north-temperate', color: 'rgba(34, 197, 94, 0.2)' },
          geometry: { type: 'Polygon', coordinates: makeRing(23.5, 66.5) }
        },
        {
          type: 'Feature',
          properties: { zone: 'south-temperate', color: 'rgba(34, 197, 94, 0.2)' },
          geometry: { type: 'Polygon', coordinates: makeRing(-66.5, -23.5) }
        },
        {
          type: 'Feature',
          properties: { zone: 'north-frigid', color: 'rgba(56, 189, 248, 0.28)' },
          geometry: { type: 'Polygon', coordinates: makeRing(66.5, 85) }
        },
        {
          type: 'Feature',
          properties: { zone: 'south-frigid', color: 'rgba(56, 189, 248, 0.28)' },
          geometry: { type: 'Polygon', coordinates: makeRing(-85, -66.5) }
        }
      ]
    };
  }

// Major Parallels Lines with Text Points
  function getMajorParallelsGeoJSON() {
    function makeLine(lat) {
      const coords = [];
      for (let lng = -180; lng <= 180; lng += 5) coords.push([lng, lat]);
      return coords;
    }
    return {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { name: 'Arctic Circle (66.5° N)' }, geometry: { type: 'LineString', coordinates: makeLine(66.5) } },
        { type: 'Feature', properties: { name: 'Tropic of Cancer (23.5° N)' }, geometry: { type: 'LineString', coordinates: makeLine(23.5) } },
        { type: 'Feature', properties: { name: 'Equator (0°)' }, geometry: { type: 'LineString', coordinates: makeLine(0) } },
        { type: 'Feature', properties: { name: 'Tropic of Capricorn (23.5° S)' }, geometry: { type: 'LineString', coordinates: makeLine(-23.5) } },
        { type: 'Feature', properties: { name: 'Antarctic Circle (66.5° S)' }, geometry: { type: 'LineString', coordinates: makeLine(-66.5) } },
        // Text labels show karne ke liye points:
        { type: 'Feature', properties: { labelText: 'Arctic Circle 66.5°N' }, geometry: { type: 'Point', coordinates: [0, 66.5] } },
        { type: 'Feature', properties: { labelText: 'Tropic of Cancer 23.5°N' }, geometry: { type: 'Point', coordinates: [78, 23.5] } },
        { type: 'Feature', properties: { labelText: 'Equator 0°' }, geometry: { type: 'Point', coordinates: [70, 0] } },
        { type: 'Feature', properties: { labelText: 'Tropic of Capricorn 23.5°S' }, geometry: { type: 'Point', coordinates: [130, -23.5] } },
        { type: 'Feature', properties: { labelText: 'Antarctic Circle 66.5°S' }, geometry: { type: 'Point', coordinates: [0, -66.5] } }
      ]
    };
  }
  // Major Ocean Currents (Warm Red, Cold Blue)
  function getOceanCurrentsGeoJSON() {
    return {
      type: 'FeatureCollection',
      features: [
        // Warm Currents (Red)
        { type: 'Feature', properties: { type: 'warm', name: 'Gulf Stream (Warm)' }, geometry: { type: 'LineString', coordinates: [[-80, 25], [-75, 32], [-65, 38], [-45, 45], [-20, 52]] } },
        { type: 'Feature', properties: { type: 'warm', name: 'Kuroshio Current (Warm)' }, geometry: { type: 'LineString', coordinates: [[125, 20], [130, 26], [138, 33], [148, 38]] } },
        { type: 'Feature', properties: { type: 'warm', name: 'North Equatorial Current (Warm)' }, geometry: { type: 'LineString', coordinates: [[-130, 12], [-160, 12], [170, 12], [140, 12]] } },
        { type: 'Feature', properties: { type: 'warm', name: 'Brazil Current (Warm)' }, geometry: { type: 'LineString', coordinates: [[-38, -10], [-42, -22], [-50, -35]] } },
        { type: 'Feature', properties: { type: 'warm', name: 'Agulhas Current (Warm)' }, geometry: { type: 'LineString', coordinates: [[45, -15], [38, -25], [30, -35]] } },

        // Cold Currents (Blue)
        { type: 'Feature', properties: { type: 'cold', name: 'California Current (Cold)' }, geometry: { type: 'LineString', coordinates: [[-125, 48], [-125, 35], [-118, 24]] } },
        { type: 'Feature', properties: { type: 'cold', name: 'Peru / Humboldt Current (Cold)' }, geometry: { type: 'LineString', coordinates: [[-75, -45], [-75, -28], [-80, -10]] } },
        { type: 'Feature', properties: { type: 'cold', name: 'Canary Current (Cold)' }, geometry: { type: 'LineString', coordinates: [[-12, 36], [-18, 26], [-22, 14]] } },
        { type: 'Feature', properties: { type: 'cold', name: 'Benguela Current (Cold)' }, geometry: { type: 'LineString', coordinates: [[15, -34], [10, -22], [5, -12]] } },
        { type: 'Feature', properties: { type: 'cold', name: 'Oyashio Current (Cold)' }, geometry: { type: 'LineString', coordinates: [[160, 55], [150, 48], [144, 40]] } }
      ]
    };
  }

  // Active Famous Volcanoes & Historic Quakes
  const famousVolcanoes = [
    { name: "Mount Fuji", loc: "Japan", coords: [138.7274, 35.3606], type: "Stratovolcano (Active)", note: "Japan's highest peak on Pacific Plate convergence." },
    { name: "Krakatoa", loc: "Indonesia", coords: [105.423, -6.102], type: "Caldera (Very Active)", note: "Historic 1883 eruption felt around the world." },
    { name: "Mount Vesuvius", loc: "Italy", coords: [14.4289, 40.8218], type: "Somma-stratovolcano", note: "Destroyed Pompeii in 79 AD. African-Eurasian boundary." },
    { name: "Mauna Loa", loc: "Hawaii, USA", coords: [-155.6028, 19.4721], type: "Shield Volcano", note: "Earth's largest active subaerial volcano." },
    { name: "Popocatépetl", loc: "Mexico", coords: [-98.6278, 19.0224], type: "Stratovolcano (Active)", note: "Part of the Trans-Mexican Volcanic Belt." },
    { name: "Mount Etna", loc: "Sicily, Italy", coords: [14.9955, 37.751], type: "Stratovolcano", note: "Europe's highest active volcano." },
    { name: "Barren Island", loc: "Andaman, India", coords: [93.8583, 12.2783], type: "Active Volcano", note: "Only confirmed active volcano in South Asia." }
  ];

  // Fixed Sateek Day & Night Shadow Calculation
  function getDayNightTerminatorGeoJSON() {
    const now = new Date();
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    const sunLng = (12 - utcHours) * 15;
    const nightCenterLng = sunLng > 0 ? sunLng - 180 : sunLng + 180;
    const coords = [];

    for (let lat = 85; lat >= -85; lat -= 5) {
      coords.push([nightCenterLng - 90, lat]);
    }
    for (let lat = -85; lat <= 85; lat += 5) {
      coords.push([nightCenterLng + 90, lat]);
    }
    coords.push(coords[0]);

    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coords] }
      }]
    };
  }

  function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  // 3. MAP ENGINE INITIALIZATION
  function initMapLibreGlobe(container) {
    if (typeof maplibregl === "undefined") {
      container.innerHTML = `<div style="color:#ef4444;padding:20px;text-align:center;">MapLibre engine load nahi hua.</div>`;
      return;
    }

    map = new maplibregl.Map({
      container: container,
      style: {
        version: 8,
        sources: {
          'google-sat-hd': {
            type: 'raster',
            tiles: [
              'https://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}&scale=2',
              'https://mt1.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}&scale=2',
              'https://mt2.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}&scale=2'
            ],
            tileSize: 256,
            maxzoom: 21
          },
          'esri-sat-hd': {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            maxzoom: 20
          },
          'terrain-layer-source': {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            maxzoom: 13
          },
          'night-layer-source': {
            type: 'raster',
            tiles: ['https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg'],
            tileSize: 256,
            maxzoom: 8
          },
          'streets-layer-source': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            maxzoom: 19
          },
          'google-labels': {
            type: 'raster',
            tiles: [
              'https://mt0.google.com/vt/lyrs=h&hl=en&x={x}&y={y}&z={z}&scale=2',
              'https://mt1.google.com/vt/lyrs=h&hl=en&x={x}&y={y}&z={z}&scale=2'
            ],
            tileSize: 256,
            maxzoom: 21
          },
'latlong-grid': { 
            type: 'geojson', 
            data: createGraticuleGeoJSON(),
            tolerance: 0,
            buffer: 512,
            maxzoom: 24
          },
          'fault-lines': { 
            type: 'geojson', 
            data: 'https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json' 
          },
          'climate-zones': { type: 'geojson', data: getClimateZonesGeoJSON() },
          'major-parallels': { type: 'geojson', data: getMajorParallelsGeoJSON() },
          'ocean-currents': { type: 'geojson', data: getOceanCurrentsGeoJSON() },
          'day-night-layer': { type: 'geojson', data: getDayNightTerminatorGeoJSON() },
          'measure-line': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }
        },
        layers: [
          { id: 'google-sat-layer', type: 'raster', source: 'google-sat-hd', layout: { visibility: 'visible' } },
          { id: 'esri-sat-layer', type: 'raster', source: 'esri-sat-hd', layout: { visibility: 'none' } },
          { id: 'terrain-layer', type: 'raster', source: 'terrain-layer-source', layout: { visibility: 'none' } },
          { id: 'night-layer', type: 'raster', source: 'night-layer-source', layout: { visibility: 'none' } },
          { id: 'streets-layer', type: 'raster', source: 'streets-layer-source', layout: { visibility: 'none' } },

          // Day & Night Shadow Layer
          {
            id: 'day-night-fill',
            type: 'fill',
            source: 'day-night-layer',
            layout: { visibility: 'none' },
            paint: { 'fill-color': '#020617', 'fill-opacity': 0.65 }
          },

          // Climate Zones
          {
            id: 'climate-fill',
            type: 'fill',
            source: 'climate-zones',
            layout: { visibility: 'none' },
            paint: { 'fill-color': ['get', 'color'] }
          },
          {
            id: 'climate-outline',
            type: 'line',
            source: 'climate-zones',
            layout: { visibility: 'none' },
            paint: { 'line-color': '#ffffff', 'line-width': 1.5, 'line-dasharray': [3, 2], 'line-opacity': 0.7 }
          },

          // Major Parallels (Equator, Tropics) Lines
          {
            id: 'major-parallels-line',
            type: 'line',
            source: 'major-parallels',
            layout: { visibility: 'none' },
            paint: {
              'line-color': '#facc15',
              'line-width': 2,
              'line-dasharray': [4, 3]
            }
          },
          // Parallels Text Labels Layer
          {
            id: 'major-parallels-labels',
            type: 'symbol',
            source: 'major-parallels',
            filter: ['has', 'labelText'],
            layout: {
              'visibility': 'none',
              'text-field': ['get', 'labelText'],
              'text-size': 12,
              'text-offset': [0, -0.8],
              'text-anchor': 'bottom'
            },
            paint: {
              'text-color': '#facc15',
              'text-halo-color': '#020617',
              'text-halo-width': 2
            }
          },

          // Ocean Currents (Warm Red, Cold Blue)
          {
            id: 'currents-warm-line',
            type: 'line',
            source: 'ocean-currents',
            filter: ['==', ['get', 'type'], 'warm'],
            layout: { visibility: 'none' },
            paint: { 'line-color': '#ef4444', 'line-width': 3, 'line-opacity': 0.85 }
          },
          {
            id: 'currents-cold-line',
            type: 'line',
            source: 'ocean-currents',
            filter: ['==', ['get', 'type'], 'cold'],
            layout: { visibility: 'none' },
            paint: { 'line-color': '#06b6d4', 'line-width': 3, 'line-opacity': 0.85 }
          },

          // Lat/Long Graticule Grid
          {
            id: 'grid-layer',
            type: 'line',
            source: 'latlong-grid',
            layout: { visibility: 'none' },
            paint: { 'line-color': '#38bdf8', 'line-width': 1.2, 'line-dasharray': [2, 2], 'line-opacity': 0.8 }
          },

          // Tectonic Fault Lines (Accurate USGS)
          {
            id: 'faults-layer',
            type: 'line',
            source: 'fault-lines',
            layout: { visibility: 'none' },
            paint: { 'line-color': '#ef4444', 'line-width': 2.2, 'line-opacity': 0.9 }
          },

          // Distance Measurement Line
          {
            id: 'measure-line-layer',
            type: 'line',
            source: 'measure-line',
            layout: { visibility: 'visible' },
            paint: { 'line-color': '#facc15', 'line-width': 3, 'line-dasharray': [2, 2] }
          },

          // Labels
          { id: 'labels-layer', type: 'raster', source: 'google-labels', layout: { visibility: 'visible' } }
        ]
      },
      center: [79.0882, 21.1458],
      zoom: 1.8,
      pitch: 0,
      bearing: 0,
      maxZoom: 20,
      attributionControl: false,
      renderWorldCopies: false,
      trackResize: true,
      fadeDuration: 0
    });

    map.on('style.load', () => {
      if (map.setProjection) map.setProjection({ type: 'globe' });
    });

    // DISTANCE MEASURE CLICK LOGIC
    let points = [];
    map.on('click', (e) => {
      if (!measureActive) return;

      // Agar pehle se do points lage hain, to agle click par puraana saaf karke fresh start karein
      if (points.length >= 2) {
        clearMeasure();
      }

      const coord = [e.lngLat.lng, e.lngLat.lat];
      points.push(coord);

      // Pin Marker create karein
      const pin = document.createElement('div');
      pin.className = 'iqra-point-marker';
      const pointText = points.length === 1 ? 'A' : 'B';
      pin.innerHTML = `<span style="color:#000000;font-weight:900;font-size:12px;line-height:1;display:block;">${pointText}</span>`;
      
      const marker = new maplibregl.Marker({ element: pin })
        .setLngLat(coord)
        .addTo(map);
      measureMarkers.push(marker);

      // Jab 2 points (A aur B) complete ho jayein
      if (points.length === 2) {
        const [p1, p2] = points;
        const dist = Math.round(calculateDistanceKm(p1[1], p1[0], p2[1], p2[0]));
        const flightTime = (dist / 800).toFixed(1);
        // Map par line draw karein
        if (map.getSource('measure-line')) {
          map.getSource('measure-line').setData({
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: [p1, p2] }
            }]
          });
        }

        // Calculation Badge screen par dikhayein
        const badge = document.getElementById("iqraMeasureBadge");
        if (badge) {
          badge.style.display = "flex";
          badge.style.zIndex = "2500";
          badge.innerHTML = `
            <div><i class="fa-solid fa-route" style="color:#facc15;"></i> <strong>Straight Distance:</strong> ${dist.toLocaleString()} km</div>
            <div style="color:#cbd5e1;font-size:10px;"><i class="fa-solid fa-plane"></i> Est. Flight Time: ~${flightTime} hours (at 800 km/h)</div>
            <button type="button" id="btnResetMeasure" style="background:#ef4444;border:none;color:#fff;padding:4px 8px;border-radius:4px;cursor:pointer;margin-top:5px;font-size:10px;font-weight:600;">Clear Points</button>
          `;
          badge.querySelector("#btnResetMeasure").addEventListener("click", (ev) => {
            ev.stopPropagation();
            clearMeasure();
          });
        }
      }
    });

    function clearMeasure() {
      points = [];
      if (measureMarkers && measureMarkers.length) {
        measureMarkers.forEach(m => m.remove());
        measureMarkers = [];
      }
      if (map && map.getSource('measure-line')) {
        map.getSource('measure-line').setData({ type: 'FeatureCollection', features: [] });
      }
      const badge = document.getElementById("iqraMeasureBadge");
      if (badge) badge.style.display = "none";
    }

    function rotateStep() {
      if (!isRotating || !map) return;
      const center = map.getCenter();
      center.lng += 0.3;
      map.easeTo({ center, duration: 80, easing: (n) => n });
    }
    rotateInterval = setInterval(rotateStep, 80);

    map.on('mousedown', () => { isRotating = false; updateRotateBtnText(); });
    map.on('touchstart', () => { isRotating = false; updateRotateBtnText(); });

    const resizeObserver = new ResizeObserver(() => { if (map) map.resize(); });
    resizeObserver.observe(container);
  }

  function updateRotateBtnText() {
    const rotBtn = document.getElementById("btnToggleRotate");
    if (!rotBtn) return;
    rotBtn.innerHTML = isRotating ? `<i class="fa-solid fa-pause"></i> Pause` : `<i class="fa-solid fa-play"></i> Rotate`;
    rotBtn.classList.toggle("active", isRotating);
  }

  // 4. AUTOCOMPLETE GEOGRAPHICAL SEARCH
  async function fetchSearchSuggestions(query) {
    const dropdown = document.getElementById("globeSearchDropdown");
    if (!query || query.trim().length < 2) {
      if (dropdown) dropdown.style.display = "none";
      return;
    }

    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6`;
      const res = await fetch(url);
      const data = await res.json();

      if (!dropdown) return;
      dropdown.innerHTML = "";

      if (!data.features || data.features.length === 0) {
        dropdown.style.display = "none";
        return;
      }

      data.features.forEach(feat => {
        const p = feat.properties;
        const name = p.name || query;
        const details = [p.district, p.city, p.state, p.country].filter(Boolean).join(", ");
        const coords = feat.geometry.coordinates;

        const item = document.createElement("div");
        item.className = "iqra-search-item";
        item.innerHTML = `<strong>${name}</strong><span class="subtext">${details || 'Location'}</span>`;

        item.addEventListener("click", () => {
          dropdown.style.display = "none";
          document.getElementById("globeSearchInput").value = name;
          goToCoordinates(coords[1], coords[0], name, details);
        });

        dropdown.appendChild(item);
      });

      dropdown.style.display = "block";
    } catch (err) {
      if (dropdown) dropdown.style.display = "none";
    }
  }

  function goToCoordinates(lat, lng, name, details) {
    const statusEl = document.getElementById("globeStatusText");
    isRotating = false;
    updateRotateBtnText();

    if (map) {
      map.flyTo({
        center: [lng, lat],
        zoom: 17.5,
        pitch: 0,
        bearing: 0,
        duration: 3000,
        essential: true
      });

      const existingMarker = document.getElementById("iqra-search-marker");
      if (existingMarker) existingMarker.remove();

      const el = document.createElement('div');
      el.id = "iqra-search-marker";
      el.style.width = '18px';
      el.style.height = '18px';
      el.style.backgroundColor = '#ef4444';
      el.style.border = '2px solid #ffffff';
      el.style.borderRadius = '50%';
      el.style.boxShadow = '0 0 12px #ef4444';

      new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    }

    if (statusEl) statusEl.textContent = `Target: ${name} (${details || ''})`;
  }

  // 5. WINDOW CONTROLS & EXPANDED GEO TOOLS DRAWER
  function createGlobeModal() {
    injectGlobeStyles();

    const modal = document.createElement("div");
    modal.className = "iqra-globe-modal is-fullscreen";
    modal.innerHTML = `
      <div class="iqra-globe-header" id="globeHeader">
        <div class="iqra-globe-header-left">
          <div class="iqra-brand-badge">
            <i class="fa-solid fa-earth-americas"></i>
            <span>IQRA 3D Earth Studio</span>
          </div>

          <select class="iqra-theme-select" id="selectThemeMode" title="Switch View Mode">
            <option value="satellite">🛰️ Satellite (HD)</option>
            <option value="terrain">🏔️ Physical Terrain</option>
            <option value="night">🌃 Night Lights</option>
            <option value="streets">🗺️ Political / Streets</option>
          </select>

          <button type="button" class="iqra-globe-tool-btn" id="btnToggleGeoDrawer" style="background:#0284c7;color:#fff;font-weight:600;">
            <i class="fa-solid fa-screwdriver-wrench"></i> Geo Tools
          </button>
        </div>

        <div class="iqra-globe-search-wrapper">
          <div class="iqra-globe-search-box">
            <input type="text" id="globeSearchInput" placeholder="Search village, city, place..." autocomplete="off" />
            <button type="button" id="btnGlobeSearch">Go</button>
          </div>
          <div class="iqra-search-dropdown" id="globeSearchDropdown"></div>
        </div>

        <div class="iqra-globe-header-right">
          <button type="button" class="iqra-globe-tool-btn" id="btnToggleProvider" title="Switch Satellite Source">
            <i class="fa-solid fa-satellite"></i> HD: Google
          </button>

          <button type="button" class="iqra-globe-tool-btn" id="btnToggleRotate" title="Auto Rotate">
            <i class="fa-solid fa-play"></i> Rotate
          </button>

          <button type="button" class="iqra-globe-tool-btn" id="btnToggleFullscreen" title="Restore / Fullscreen">
            <i class="fa-solid fa-compress"></i>
          </button>

          <button type="button" class="iqra-globe-close-btn" id="btnCloseGlobe" title="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div class="iqra-globe-viewport" id="globe3DContainer">
        <!-- COMPLETE PEDAGOGICAL GEO TOOLS DRAWER -->
        <div class="iqra-geo-drawer" id="iqraGeoDrawer">
          <div class="iqra-drawer-header">
            <span><i class="fa-solid fa-compass-drafting"></i> Classroom Geo Tools</span>
            <span style="font-size:10px;color:#94a3b8;cursor:pointer;" id="btnCloseDrawer"><i class="fa-solid fa-xmark"></i></span>
          </div>

          <!-- Tool 1: Distance Measurement -->
          <div class="iqra-drawer-row">
            <div class="label-group">
              <i class="fa-solid fa-ruler" style="color:#facc15;"></i>
              <span>Distance Measure</span>
            </div>
            <label class="iqra-switch">
              <input type="checkbox" id="switchMeasure">
              <span class="iqra-slider"></span>
            </label>
          </div>

          <!-- Tool 2: Day & Night Sun Terminator -->
          <div class="iqra-drawer-row">
            <div class="label-group">
              <i class="fa-solid fa-circle-half-stroke" style="color:#e2e8f0;"></i>
              <span>Day & Night Line</span>
            </div>
            <label class="iqra-switch">
              <input type="checkbox" id="switchDayNight">
              <span class="iqra-slider"></span>
            </label>
          </div>

          <!-- Tool 3: Climate Zones -->
          <div class="iqra-drawer-row">
            <div class="label-group">
              <i class="fa-solid fa-temperature-three-quarters" style="color:#f97316;"></i>
              <span>Climate Zones</span>
            </div>
            <label class="iqra-switch">
              <input type="checkbox" id="switchClimate">
              <span class="iqra-slider"></span>
            </label>
          </div>

          <!-- Tool 4: Named Latitude Parallels (NEW) -->
          <div class="iqra-drawer-row">
            <div class="label-group">
              <i class="fa-solid fa-grip-lines" style="color:#facc15;"></i>
              <span>Named Parallels</span>
            </div>
            <label class="iqra-switch">
              <input type="checkbox" id="switchParallels">
              <span class="iqra-slider"></span>
            </label>
          </div>

          <!-- Tool 5: Ocean Currents (NEW) -->
          <div class="iqra-drawer-row">
            <div class="label-group">
              <i class="fa-solid fa-water" style="color:#06b6d4;"></i>
              <span>Ocean Currents</span>
            </div>
            <label class="iqra-switch">
              <input type="checkbox" id="switchCurrents">
              <span class="iqra-slider"></span>
            </label>
          </div>

          <!-- Tool 6: Volcanoes & Hotspots (NEW) -->
          <div class="iqra-drawer-row">
            <div class="label-group">
              <i class="fa-solid fa-volcano" style="color:#ef4444;"></i>
              <span>Active Volcanoes</span>
            </div>
            <label class="iqra-switch">
              <input type="checkbox" id="switchVolcanoes">
              <span class="iqra-slider"></span>
            </label>
          </div>

          <!-- Tool 7: Tectonic Fault Lines -->
          <div class="iqra-drawer-row">
            <div class="label-group">
              <i class="fa-solid fa-shield-halved" style="color:#f43f5e;"></i>
              <span>Tectonic Plates</span>
            </div>
            <label class="iqra-switch">
              <input type="checkbox" id="switchFaults">
              <span class="iqra-slider"></span>
            </label>
          </div>

          <!-- Tool 8: Lat / Long Graticule -->
          <div class="iqra-drawer-row">
            <div class="label-group">
              <i class="fa-solid fa-table-cells" style="color:#38bdf8;"></i>
              <span>Lat/Long Grid</span>
            </div>
            <label class="iqra-switch">
              <input type="checkbox" id="switchGrid">
              <span class="iqra-slider"></span>
            </label>
          </div>

          <!-- Tool 9: Names & Labels (Quiz Mode) -->
          <div class="iqra-drawer-row">
            <div class="label-group">
              <i class="fa-solid fa-font" style="color:#a855f7;"></i>
              <span>Show Names</span>
            </div>
            <label class="iqra-switch">
              <input type="checkbox" id="switchLabels" checked>
              <span class="iqra-slider"></span>
            </label>
          </div>

          <!-- Poles Navigation -->
          <div style="display:flex;gap:6px;margin-top:2px;">
            <button type="button" class="iqra-globe-tool-btn" id="btnNorthPole" style="flex:1;justify-content:center;">
              <i class="fa-solid fa-arrow-up"></i> N. Pole
            </button>
            <button type="button" class="iqra-globe-tool-btn" id="btnSouthPole" style="flex:1;justify-content:center;">
              <i class="fa-solid fa-arrow-down"></i> S. Pole
            </button>
          </div>
        </div>

        <!-- Measurement Calculation Result Box -->
        <div class="iqra-measure-badge" id="iqraMeasureBadge"></div>

        <div class="iqra-globe-status" id="globeStatusText">HD Satellite View Active</div>
      </div>
    `;
    

    document.body.appendChild(modal);

    const container = modal.querySelector("#globe3DContainer");
    setTimeout(() => initMapLibreGlobe(container), 150);

    // Live Search
    const searchInput = modal.querySelector("#globeSearchInput");
    const dropdown = modal.querySelector("#globeSearchDropdown");

    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => fetchSearchSuggestions(e.target.value), 250);
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".iqra-globe-search-wrapper")) dropdown.style.display = "none";
    });

    modal.querySelector("#btnGlobeSearch").addEventListener("click", () => {
      const first = dropdown.querySelector(".iqra-search-item");
      if (first) first.click();
    });

    // Theme Mode Selector
    modal.querySelector("#selectThemeMode").addEventListener("change", (e) => {
      if (!map) return;
      currentTheme = e.target.value;

      const themeLayers = ['google-sat-layer', 'esri-sat-layer', 'terrain-layer', 'night-layer', 'streets-layer'];
      themeLayers.forEach(l => map.setLayoutProperty(l, 'visibility', 'none'));

      if (currentTheme === "satellite") {
        map.setLayoutProperty(currentProvider === 'google' ? 'google-sat-layer' : 'esri-sat-layer', 'visibility', 'visible');
        document.getElementById("globeStatusText").textContent = "Switched to Satellite HD Mode";
      } else if (currentTheme === "terrain") {
        map.setLayoutProperty('terrain-layer', 'visibility', 'visible');
        document.getElementById("globeStatusText").textContent = "Switched to Physical Terrain Mode";
      } else if (currentTheme === "night") {
        map.setLayoutProperty('night-layer', 'visibility', 'visible');
        document.getElementById("globeStatusText").textContent = "Switched to Earth at Night Mode";
      } else if (currentTheme === "streets") {
        map.setLayoutProperty('streets-layer', 'visibility', 'visible');
        document.getElementById("globeStatusText").textContent = "Switched to Political / Street Map Mode";
      }
    });

    // Provider Toggle
    const providerBtn = modal.querySelector("#btnToggleProvider");
    providerBtn.addEventListener("click", () => {
      if (!map) return;
      if (currentTheme !== "satellite") {
        modal.querySelector("#selectThemeMode").value = "satellite";
        currentTheme = "satellite";
        const themeLayers = ['terrain-layer', 'night-layer', 'streets-layer'];
        themeLayers.forEach(l => map.setLayoutProperty(l, 'visibility', 'none'));
      }

      if (currentProvider === "google") {
        currentProvider = "esri";
        map.setLayoutProperty('google-sat-layer', 'visibility', 'none');
        map.setLayoutProperty('esri-sat-layer', 'visibility', 'visible');
        providerBtn.innerHTML = `<i class="fa-solid fa-satellite"></i> HD: Esri`;
        document.getElementById("globeStatusText").textContent = "Switched to Esri Clarity Aerial";
      } else {
        currentProvider = "google";
        map.setLayoutProperty('esri-sat-layer', 'visibility', 'none');
        map.setLayoutProperty('google-sat-layer', 'visibility', 'visible');
        providerBtn.innerHTML = `<i class="fa-solid fa-satellite"></i> HD: Google`;
        document.getElementById("globeStatusText").textContent = "Switched to Google Retina HD";
      }
    });

    // Geo Tools Drawer Toggle
    const drawerEl = modal.querySelector("#iqraGeoDrawer");
    const drawerBtn = modal.querySelector("#btnToggleGeoDrawer");
    drawerBtn.addEventListener("click", () => {
      showDrawer = !showDrawer;
      drawerEl.classList.toggle("open", showDrawer);
    });
    modal.querySelector("#btnCloseDrawer").addEventListener("click", () => {
      showDrawer = false;
      drawerEl.classList.remove("open");
    });

    // Switch: Distance Measure
    modal.querySelector("#switchMeasure").addEventListener("change", (e) => {
      measureActive = e.target.checked;
      container.classList.toggle("crosshair-mode", measureActive);

      if (!measureActive) {
        measureMarkers.forEach(m => m.remove());
        measureMarkers = [];
        if (map && map.getSource('measure-line')) {
          map.getSource('measure-line').setData({ type: 'FeatureCollection', features: [] });
        }
        const badge = document.getElementById("iqraMeasureBadge");
        if (badge) badge.style.display = "none";
        document.getElementById("globeStatusText").textContent = "Measurement turned off";
      } else {
        document.getElementById("globeStatusText").textContent = "Measurement Active: Click Point A and Point B on Earth to calculate straight distance";
      }
    });

    // Switch: Day & Night Terminator
    modal.querySelector("#switchDayNight").addEventListener("change", (e) => {
      if (!map) return;
      showDayNight = e.target.checked;
      map.setLayoutProperty('day-night-fill', 'visibility', showDayNight ? 'visible' : 'none');
      document.getElementById("globeStatusText").textContent = showDayNight 
        ? "Day & Night Line: ON (Shadow indicates nighttime side of Earth)" 
        : "Day & Night Simulation: OFF";
    });

    // Switch: Climate Zones
    modal.querySelector("#switchClimate").addEventListener("change", (e) => {
      if (!map) return;
      showClimate = e.target.checked;
      map.setLayoutProperty('climate-fill', 'visibility', showClimate ? 'visible' : 'none');
      map.setLayoutProperty('climate-outline', 'visibility', showClimate ? 'visible' : 'none');
      document.getElementById("globeStatusText").textContent = showClimate 
        ? "Climate Zones: ON (Red: Torrid, Green: Temperate, Blue: Frigid)" 
        : "Climate Zones: OFF";
    });

// Switch: Named Parallels (Lines + Labels)
    modal.querySelector("#switchParallels").addEventListener("change", (e) => {
      if (!map) return;
      const on = e.target.checked;
      map.setLayoutProperty('major-parallels-line', 'visibility', on ? 'visible' : 'none');
      map.setLayoutProperty('major-parallels-labels', 'visibility', on ? 'visible' : 'none');
      document.getElementById("globeStatusText").textContent = on 
        ? "Named Parallels: ON (Equator 0°, Tropic of Cancer 23.5°N, Tropic of Capricorn 23.5°S)" 
        : "Named Parallels: OFF";
    });
    // Switch: Ocean Currents (NEW)
    modal.querySelector("#switchCurrents").addEventListener("change", (e) => {
      if (!map) return;
      showCurrents = e.target.checked;
      map.setLayoutProperty('currents-warm-line', 'visibility', showCurrents ? 'visible' : 'none');
      map.setLayoutProperty('currents-cold-line', 'visibility', showCurrents ? 'visible' : 'none');
      document.getElementById("globeStatusText").textContent = showCurrents 
        ? "Ocean Currents: ON (Red: Warm Currents, Cyan: Cold Currents)" 
        : "Ocean Currents: OFF";
    });

   // Switch: Active Volcanoes (NEW)
    modal.querySelector("#switchVolcanoes").addEventListener("change", (e) => {
      if (!map) return;
      showVolcanoes = e.target.checked;
      if (showVolcanoes) {
        famousVolcanoes.forEach(v => {
          const el = document.createElement('div');
          el.className = 'iqra-volcano-marker';
          el.innerHTML = '🌋';
          el.title = `${v.name} (${v.loc})`;

          // Ensure proper styling for 3D globe front visibility
          el.style.fontSize = '18px';
          el.style.cursor = 'pointer';
          el.style.userSelect = 'none';
          el.style.filter = 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.8))';

          const popup = new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(`
            <div style="background:#0f172a;color:#fff;padding:6px 9px;border:1px solid #ef4444;border-radius:6px;font-size:11px;">
              <strong style="color:#f87171;">${v.name}</strong> (${v.loc})<br>
              <span style="font-size:9.5px;color:#cbd5e1;">${v.type}</span><br>
              <span style="font-size:9px;color:#94a3b8;">${v.note}</span>
            </div>
          `);

          // Jo tamara data ma [lat, lng] hoy to swap karo:
          // const finalCoords = (v.coords[0] < -90 || v.coords[0] > 90) ? v.coords : [v.coords[1], v.coords[0]];
          const finalCoords = v.coords;

          const marker = new maplibregl.Marker({ 
            element: el,
            anchor: 'center',
            rotationAlignment: 'map',
            pitchAlignment: 'map'
          })
            .setLngLat(finalCoords)
            .setPopup(popup)
            .addTo(map);

          volcanoMarkers.push(marker);
        });
        document.getElementById("globeStatusText").textContent = "Active Volcanoes: ON (Tap on any volcano icon to read details)";
      } else {
        volcanoMarkers.forEach(m => m.remove());
        volcanoMarkers = [];
        document.getElementById("globeStatusText").textContent = "Volcano Markers: OFF";
      }
    });
    // Switch: Tectonic Plates
    modal.querySelector("#switchFaults").addEventListener("change", (e) => {
      if (!map) return;
      const on = e.target.checked;
      map.setLayoutProperty('faults-layer', 'visibility', on ? 'visible' : 'none');
      document.getElementById("globeStatusText").textContent = on ? "Tectonic Plate Boundaries: ON (USGS PB2002)" : "Tectonic Plates: OFF";
    });

    // Switch: Lat/Long Grid
    modal.querySelector("#switchGrid").addEventListener("change", (e) => {
      if (!map) return;
      const on = e.target.checked;
      map.setLayoutProperty('grid-layer', 'visibility', on ? 'visible' : 'none');
      document.getElementById("globeStatusText").textContent = on ? "Latitude & Longitude Grid: ON" : "Grid: OFF";
    });

    // Switch: Labels (Quiz Mode)
    modal.querySelector("#switchLabels").addEventListener("change", (e) => {
      if (!map) return;
      const on = e.target.checked;
      map.setLayoutProperty('labels-layer', 'visibility', on ? 'visible' : 'none');
      document.getElementById("globeStatusText").textContent = on ? "Names & Streets: ON" : "Names: OFF (Blind Map Quiz Mode)";
    });

    // Poles
    modal.querySelector("#btnNorthPole").addEventListener("click", () => {
      if (!map) return;
      isRotating = false;
      updateRotateBtnText();
      map.flyTo({ center: [0, 88], zoom: 2.2, pitch: 0, bearing: 0, duration: 2000 });
      document.getElementById("globeStatusText").textContent = "North Pole (Arctic View)";
    });

    modal.querySelector("#btnSouthPole").addEventListener("click", () => {
      if (!map) return;
      isRotating = false;
      updateRotateBtnText();
      map.flyTo({ center: [0, -88], zoom: 2.2, pitch: 0, bearing: 0, duration: 2000 });
      document.getElementById("globeStatusText").textContent = "South Pole (Antarctica View)";
    });

    // Auto Rotate
    const rotBtn = modal.querySelector("#btnToggleRotate");
    rotBtn.addEventListener("click", () => {
      isRotating = !isRotating;
      updateRotateBtnText();
    });

    // Fullscreen / Restore Toggle
    const fsBtn = modal.querySelector("#btnToggleFullscreen");
    fsBtn.addEventListener("click", () => {
      isFullscreen = !isFullscreen;
      modal.classList.toggle("is-fullscreen", isFullscreen);
      fsBtn.innerHTML = isFullscreen ? `<i class="fa-solid fa-compress"></i>` : `<i class="fa-solid fa-expand"></i>`;
      setTimeout(() => { if (map) map.resize(); }, 200);
    });

    // Close
    modal.querySelector("#btnCloseGlobe").addEventListener("click", () => {
      modal.style.display = "none";
      isRotating = false;
      updateRotateBtnText();
    });

    // Header Drag
    const header = modal.querySelector("#globeHeader");
    let isDragging = false, startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    header.addEventListener("pointerdown", (e) => {
      if (isFullscreen) return;
      if (e.target.closest("input") || e.target.closest("select") || e.target.closest("button") || e.target.closest(".iqra-search-dropdown")) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = modal.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      header.setPointerCapture(e.pointerId);
    });

    header.addEventListener("pointermove", (e) => {
      if (!isDragging || isFullscreen) return;
      modal.style.left = `${initialLeft + (e.clientX - startX)}px`;
      modal.style.top = `${initialTop + (e.clientY - startY)}px`;
    });

    header.addEventListener("pointerup", (e) => {
      isDragging = false;
    });

    return modal;
  }

  // 6. ATTACH TO SIDEBAR BUTTON
  function initGlobeTrigger() {
    const btn = document.getElementById("btnOpenGlobe");
    if (!btn) {
      setTimeout(initGlobeTrigger, 200);
      return;
    }

    btn.addEventListener("click", () => {
      if (!globeModal) {
        globeModal = createGlobeModal();
      } else {
        const isHidden = globeModal.style.display === "none";
        globeModal.style.display = isHidden ? "flex" : "none";
        if (isHidden) {
          if (!isFullscreen) {
            isFullscreen = true;
            globeModal.classList.add("is-fullscreen");
            const fsBtn = globeModal.querySelector("#btnToggleFullscreen");
            if (fsBtn) fsBtn.innerHTML = `<i class="fa-solid fa-compress"></i>`;
          }
          if (map) setTimeout(() => map.resize(), 100);
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGlobeTrigger);
  } else {
    initGlobeTrigger();
  }
})();