// ==========================================================================
// IQRA SMARTCLASS SUITE - POWERPOINT PRO IMAGE ENGINE (V3 FINAL)
// ==========================================================================
(function () {
  let activeSelectedImg = null;

  // 1. DYNAMIC STYLES (Light Blue Theme, Solid PPT Border, Blue Glow Animation)
  function injectEngineStyles() {
    if (document.getElementById("iqra-ppt-image-styles-v3")) return;
    const style = document.createElement("style");
    style.id = "iqra-ppt-image-styles-v3";
    style.textContent = `
      /* PowerPoint Solid Border Frame */
      .wb-image-item {
        position: absolute;
        user-select: none;
        touch-action: none;
        cursor: move;
        box-sizing: border-box;
      }
.wb-image-item.active-selected {
        outline: none !important;
        box-shadow: none !important;
        border: none !important;
      }
      .wb-image-item.active-selected .wb-img-inner-container {
        outline: none !important;
      }
      .wb-img-inner-container {
        position: relative;
        width: 100%;
        height: 100%;
      }
      .wb-img-inner-container img {
        width: 100%;
        height: 100%;
        display: block;
        pointer-events: none;
        object-fit: fill;
        transform-origin: center center;
        transition: filter 0.2s ease, opacity 0.2s ease;
      }

      /* PowerPoint Preset Styles */
      .wb-style-simple { border: none; }
      .wb-style-rounded { border-radius: 24px !important; }
      .wb-style-circle { border-radius: 50% !important; }
      .wb-style-shadow { box-shadow: 0 16px 32px rgba(15, 23, 42, 0.35) !important; }
      .wb-style-frame { border: 6px solid #ffffff !important; box-shadow: 0 8px 24px rgba(0,0,0,0.2) !important; }
      .wb-style-thick { border: 3px solid #0369a1 !important; }

      /* PowerPoint-Style 8 Round Handles */
      .wb-ppt-handle {
        position: absolute;
        width: 10px;
        height: 10px;
        background: #ffffff;
        border: 1.5px solid #0284c7;
        border-radius: 50%;
        box-shadow: 0 1px 4px rgba(0,0,0,0.25);
        z-index: 120;
        display: none;
      }
      .wb-image-item.active-selected .wb-ppt-handle { display: block; }
      .wb-h-tl { top: -6px; left: -6px; cursor: nwse-resize; }
      .wb-h-tr { top: -6px; right: -6px; cursor: nesw-resize; }
      .wb-h-bl { bottom: -6px; left: -6px; cursor: nesw-resize; }
      .wb-h-br { bottom: -6px; right: -6px; cursor: nwse-resize; }
      .wb-h-tc { top: -6px; left: calc(50% - 5px); cursor: ns-resize; }
      .wb-h-bc { bottom: -6px; left: calc(50% - 5px); cursor: ns-resize; }
      .wb-h-ml { top: calc(50% - 5px); left: -6px; cursor: ew-resize; }
      .wb-h-mr { top: calc(50% - 5px); right: -6px; cursor: ew-resize; }

/* Elevated Rotation Pin (Toolbar ke upar saaf nazar aane ke liye) */
      .wb-ppt-rot-line {
        position: absolute;
        top: -76px;
        left: 50%;
        width: 2px;
        height: 36px;
        background: #0284c7;
        transform: translateX(-50%);
        z-index: 2101;
        display: none;
      }
      .wb-ppt-rot-knob {
        position: absolute;
        top: -94px;
        left: 50%;
        width: 16px;
        height: 16px;
        background: #ffffff;
        border: 2.5px solid #0284c7;
        border-radius: 50%;
        transform: translateX(-50%);
        cursor: grab;
        z-index: 2102;
        display: none;
        box-shadow: 0 3px 8px rgba(0,0,0,0.35);
        transition: transform 0.15s ease;
      }
      .wb-ppt-rot-knob:hover {
        transform: translateX(-50%) scale(1.15);
      }
      .wb-image-item.active-selected .wb-ppt-rot-line,
      .wb-image-item.active-selected .wb-ppt-rot-knob { display: block; }

/* Adaptive Outline: Outer flat box ko completely clean rakhein */
      .wb-image-item.active-selected {
        outline: none !important;
        box-shadow: none !important;
        border: none !important;
      }
    /* Image Top se Muttasil & Scalable Toolbar (No Button Clipping) */
      .wb-img-toolbar {
        position: absolute;
        top: -6px;
        left: 50%;
        transform: translate(-50%, -100%);
        display: none;
        background: rgba(15, 23, 42, 0.94) !important;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1.5px solid rgba(255, 255, 255, 0.4) !important;
        border-radius: 8px;
        padding: 3px 6px;
        gap: 4px;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55), 0 0 10px rgba(56, 189, 248, 0.25) !important;
        z-index: 2000;
        align-items: center;
        white-space: nowrap;
        width: max-content !important; /* Button ko kabhi katne nahi dega */
        max-width: none !important;    /* 95% ki pabandi khatam */
        transform-origin: bottom center;
      }
      .wb-image-item.active-selected .wb-img-toolbar { display: flex; }
      /* Buttons with High Contrast White Icons */
      .wb-tb-btn {
        background: rgba(255, 255, 255, 0.12) !important;
        border: 1px solid rgba(255, 255, 255, 0.25) !important;
        color: #ffffff !important;
        padding: 5px 7px;
        border-radius: 6px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        transition: all 0.15s ease;
      }
      .wb-tb-btn:hover {
        background: #0284c7 !important;
        border-color: #38bdf8 !important;
        color: #ffffff !important;
        transform: translateY(-1px);
      }
      .wb-tb-icon { font-size: 13px; color: #ffffff !important; }
      .wb-tb-sep { width: 1px; height: 18px; background: rgba(255, 255, 255, 0.25) !important; margin: 0 2px; }

      /* Visual Dropdown Popups in Dark/Light */
      .wb-visual-popup {
        position: absolute;
        top: 38px;
        left: 0;
        background: #0f172a !important;
        border: 1.5px solid rgba(255, 255, 255, 0.3) !important;
        border-radius: 8px;
        padding: 8px;
        display: none;
        grid-template-columns: repeat(3, 42px);
        gap: 6px;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.7);
        z-index: 3000;
      }
      .wb-visual-popup.active { display: grid; }
      .wb-pop-item {
        width: 42px;
        height: 38px;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #1e293b !important;
        color: #f8fafc !important;
        font-size: 10px;
        transition: transform 0.1s ease, border-color 0.1s ease;
      }
      .wb-pop-item:hover {
        transform: scale(1.08);
        border-color: #38bdf8 !important;
        background: #0284c7 !important;
      }

      .preview-box { width: 22px; height: 16px; border: 1.5px solid #0284c7; background: #fff; margin-bottom: 2px; }
      .prev-round { border-radius: 6px; }
      .prev-circle { border-radius: 50%; width: 16px; height: 16px; }
      .prev-shadow { box-shadow: 2px 2px 4px rgba(2, 132, 199, 0.5); }
      .prev-frame { border: 2px solid #0284c7; background: #e0f2fe; }
      .prev-color { width: 18px; height: 18px; border-radius: 50%; margin-bottom: 2px; }

      /* Canva / PPT Crop Mode */
      .wb-crop-mask-active {
        outline: 2px dashed #0284c7 !important;
      }
      .wb-crop-bar {
        position: absolute;
        bottom: -40px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 6px;
        background: #0284c7;
        padding: 3px 8px;
        border-radius: 6px;
        color: #fff;
        font-size: 11px;
        z-index: 2500;
      }
      .wb-crop-bar button {
        background: #ffffff;
        color: #0284c7;
        border: none;
        border-radius: 4px;
        font-weight: 600;
        padding: 2px 6px;
        cursor: pointer;
      }

      /* Blue Light Glow Beam & Bubble */
      .wb-glow-transit {
        box-shadow: 0 0 35px 12px rgba(56, 189, 248, 0.85), inset 0 0 20px 4px rgba(2, 132, 199, 0.8) !important;
        border-radius: 50% !important;
        filter: brightness(1.6) contrast(1.2);
      }
      .wb-minimized-bubble {
        position: fixed;
        width: 46px;
        height: 46px;
        border-radius: 50%;
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 19px;
        cursor: pointer;
        box-shadow: 0 0 18px 4px rgba(56, 189, 248, 0.65), 0 8px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        border: 2px solid #ffffff;
        transition: transform 0.25s ease;
      }
      .wb-minimized-bubble:hover { transform: scale(1.12); }
    `;
    document.head.appendChild(style);
  }

  function getBoardContainer() {
    return document.getElementById("whiteboardContainer") || 
           document.getElementById("canvasWrapper") || 
           document.querySelector(".canvas-container") || 
           document.body;
  }

  // 2. CREATE IMAGE FUNCTION
  window.addImageToWhiteboard = function (imgSrc, x = 180, y = 140) {
    injectEngineStyles();
    const container = getBoardContainer();

    const wrapper = document.createElement("div");
    wrapper.className = "wb-image-item active-selected";
    wrapper.style.left = `${x}px`;
    wrapper.style.top = `${y}px`;
    wrapper.style.width = "320px";
    wrapper.style.height = "auto";
    wrapper.style.zIndex = "500";

      // Transform State
      wrapper.dataset.flipH = "1";
      wrapper.dataset.flipV = "1";
      wrapper.dataset.rotation = "0";

      wrapper.innerHTML = `
        <!-- Light Blue Toolbar -->
        <div class="wb-img-toolbar">
          <!-- 1. Styles -->
          <div style="position: relative;">
            <button type="button" class="wb-tb-btn wb-btn-pop" data-target="pop-styles" title="Picture Styles">
              <i class="fa-regular fa-image wb-tb-icon"></i>
              <i class="fa-solid fa-caret-down" style="font-size: 9px;"></i>
            </button>
            <div class="wb-visual-popup pop-styles">
              <div class="wb-pop-item" data-val="wb-style-simple" title="Simple"><div class="preview-box"></div></div>
              <div class="wb-pop-item" data-val="wb-style-rounded" title="Rounded"><div class="preview-box prev-round"></div></div>
              <div class="wb-pop-item" data-val="wb-style-circle" title="Oval / Circle"><div class="preview-box prev-circle"></div></div>
              <div class="wb-pop-item" data-val="wb-style-shadow" title="Shadow"><div class="preview-box prev-shadow"></div></div>
              <div class="wb-pop-item" data-val="wb-style-frame" title="Frame"><div class="preview-box prev-frame"></div></div>
              <div class="wb-pop-item" data-val="wb-style-thick" title="Thick Blue"><div class="preview-box" style="border: 2px solid #0369a1;"></div></div>
            </div>
          </div>

          <!-- 2. Colors Filter -->
          <div style="position: relative;">
            <button type="button" class="wb-tb-btn wb-btn-pop" data-target="pop-colors" title="Color Adjustment">
              <i class="fa-solid fa-palette wb-tb-icon"></i>
              <i class="fa-solid fa-caret-down" style="font-size: 9px;"></i>
            </button>
            <div class="wb-visual-popup pop-colors">
              <div class="wb-pop-item" data-val="none" title="Normal"><div class="prev-color" style="background: conic-gradient(red, yellow, green, blue);"></div></div>
              <div class="wb-pop-item" data-val="grayscale(100%)" title="B & W"><div class="prev-color" style="background: #94a3b8;"></div></div>
              <div class="wb-pop-item" data-val="invert(100%)" title="Invert"><div class="prev-color" style="background: #0f172a; border: 1px solid #fff;"></div></div>
              <div class="wb-pop-item" data-val="sepia(100%)" title="Sepia"><div class="prev-color" style="background: #d97706;"></div></div>
              <div class="wb-pop-item" data-val="hue-rotate(190deg)" title="Cold Blue"><div class="prev-color" style="background: #0284c7;"></div></div>
              <div class="wb-pop-item" data-val="contrast(160%) brightness(1.1)" title="Vivid"><div class="prev-color" style="background: #e11d48;"></div></div>
            </div>
          </div>
<!-- 3. PowerPoint Layer / Arrange -->
        <div style="position: relative;">
          <button type="button" class="wb-tb-btn wb-btn-pop" data-target="pop-order" title="Arrange / Layer Order">
            <i class="fa-solid fa-layer-group wb-tb-icon"></i>
            <i class="fa-solid fa-caret-down" style="font-size: 9px;"></i>
          </button>
          <div class="wb-visual-popup pop-order" style="display: none; position: absolute; top: calc(100% + 8px); left: 0; background: #ffffff !important; border: 1px solid #e2e8f0 !important; border-radius: 8px !important; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25) !important; width: 150px !important; padding: 6px !important; z-index: 9999999 !important; flex-direction: column !important; gap: 3px !important; box-sizing: border-box !important;">
            <div class="wb-layer-opt" data-act="front" style="display: flex !important; align-items: center !important; gap: 8px !important; padding: 7px 10px !important; cursor: pointer !important; border-radius: 6px !important; font-size: 12px !important; font-weight: 500 !important; color: #0f172a !important; background: transparent !important; user-select: none !important;">
              <i class="fa-solid fa-arrow-up" style="color: #0284c7 !important; width: 14px !important; font-size: 13px !important;"></i>
              <span style="color: #0f172a !important;">Bring to Front</span>
            </div>
            <div class="wb-layer-opt" data-act="forward" style="display: flex !important; align-items: center !important; gap: 8px !important; padding: 7px 10px !important; cursor: pointer !important; border-radius: 6px !important; font-size: 12px !important; font-weight: 500 !important; color: #0f172a !important; background: transparent !important; user-select: none !important;">
              <i class="fa-solid fa-chevron-up" style="color: #0284c7 !important; width: 14px !important; font-size: 13px !important;"></i>
              <span style="color: #0f172a !important;">Bring Forward</span>
            </div>
            <div class="wb-layer-opt" data-act="backward" style="display: flex !important; align-items: center !important; gap: 8px !important; padding: 7px 10px !important; cursor: pointer !important; border-radius: 6px !important; font-size: 12px !important; font-weight: 500 !important; color: #0f172a !important; background: transparent !important; user-select: none !important;">
              <i class="fa-solid fa-chevron-down" style="color: #64748b !important; width: 14px !important; font-size: 13px !important;"></i>
              <span style="color: #0f172a !important;">Send Backward</span>
            </div>
            <div class="wb-layer-opt" data-act="back" style="display: flex !important; align-items: center !important; gap: 8px !important; padding: 7px 10px !important; cursor: pointer !important; border-radius: 6px !important; font-size: 12px !important; font-weight: 500 !important; color: #0f172a !important; background: transparent !important; user-select: none !important;">
              <i class="fa-solid fa-arrow-down" style="color: #64748b !important; width: 14px !important; font-size: 13px !important;"></i>
              <span style="color: #0f172a !important;">Send to Back</span>
            </div>
          </div>
        </div>
        <!-- 3. Transparency -->
        <div style="position: relative;">
          <button type="button" class="wb-tb-btn wb-btn-pop" data-target="pop-opacity" title="Transparency">
            <i class="fa-solid fa-droplet wb-tb-icon"></i>
            <i class="fa-solid fa-caret-down" style="font-size: 9px;"></i>
          </button>
          <div class="wb-visual-popup pop-opacity">
            <div class="wb-pop-item" data-val="1">100%</div>
            <div class="wb-pop-item" data-val="0.75">75%</div>
            <div class="wb-pop-item" data-val="0.5">50%</div>
            <div class="wb-pop-item" data-val="0.25">25%</div>
          </div>
        </div>

        <!-- 4. Combined Flip (H & V) -->
        <div style="position: relative;">
          <button type="button" class="wb-tb-btn wb-btn-pop" data-target="pop-flip" title="Flip Image">
            <i class="fa-solid fa-arrows-left-right wb-tb-icon"></i>
            <i class="fa-solid fa-caret-down" style="font-size: 9px;"></i>
          </button>
          <div class="wb-visual-popup pop-flip" style="grid-template-columns: repeat(2, 48px);">
            <div class="wb-pop-item wb-btn-do-fliph" title="Flip Horizontal">Horiz</div>
            <div class="wb-pop-item wb-btn-do-flipv" title="Flip Vertical">Vert</div>
          </div>
        </div>

        <div class="wb-tb-sep"></div>

        <!-- Rotate, Crop, Duplicate, Minimize, Delete -->
        <button type="button" class="wb-tb-btn wb-btn-rotate" title="Rotate 90°"><i class="fa-solid fa-rotate-right wb-tb-icon"></i></button>
        <button type="button" class="wb-tb-btn wb-btn-crop" title="Crop Tool"><i class="fa-solid fa-crop-simple wb-tb-icon"></i></button>
        <button type="button" class="wb-tb-btn wb-btn-dup" title="Duplicate"><i class="fa-regular fa-copy wb-tb-icon"></i></button>
        <button type="button" class="wb-tb-btn wb-btn-min" title="Minimize"><i class="fa-solid fa-minus wb-tb-icon"></i></button>
        <button type="button" class="wb-tb-btn wb-btn-del" title="Delete" style="color: #ef4444;"><i class="fa-regular fa-trash-can wb-tb-icon"></i></button>
      </div>

      <!-- Rotation Line & Knob -->
      <div class="wb-ppt-rot-line"></div>
      <div class="wb-ppt-rot-knob" title="Drag to Rotate"></div>

      <!-- Core Image Holder -->
      <div class="wb-img-inner-container wb-style-simple">
        <img src="${imgSrc}" draggable="false" />
      </div>

      <!-- 8 Round Resize Handles -->
      <div class="wb-ppt-handle wb-h-tl" data-dir="tl"></div>
      <div class="wb-ppt-handle wb-h-tr" data-dir="tr"></div>
      <div class="wb-ppt-handle wb-h-bl" data-dir="bl"></div>
      <div class="wb-ppt-handle wb-h-br" data-dir="br"></div>
      <div class="wb-ppt-handle wb-h-tc" data-dir="tc"></div>
      <div class="wb-ppt-handle wb-h-bc" data-dir="bc"></div>
      <div class="wb-ppt-handle wb-h-ml" data-dir="ml"></div>
      <div class="wb-ppt-handle wb-h-mr" data-dir="mr"></div>
    `;

    container.appendChild(wrapper);
    selectImage(wrapper);
    attachSuiteEvents(wrapper);
  };

  // 3. SELECTION CONTROLLER
  function selectImage(el) {
    if (activeSelectedImg && activeSelectedImg !== el) {
      activeSelectedImg.classList.remove("active-selected");
      closePopups(activeSelectedImg);
    }
    activeSelectedImg = el;
    if (el) el.classList.add("active-selected");
  }

  function closePopups(scope) {
    const parent = scope || document;
    parent.querySelectorAll(".wb-visual-popup").forEach(p => p.classList.remove("active"));
  }

  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".wb-image-item") && !e.target.closest(".wb-minimized-bubble")) {
      selectImage(null);
      closePopups();
    }
  });

  // 4. ATTACH SUITE EVENTS
  function attachSuiteEvents(el) {
    const innerBox = el.querySelector(".wb-img-inner-container");
    const imgTag = el.querySelector("img");
    const rotKnob = el.querySelector(".wb-ppt-rot-knob");
    const rotBtn = el.querySelector(".wb-btn-rotate");
    const cropBtn = el.querySelector(".wb-btn-crop");
    const dupBtn = el.querySelector(".wb-btn-dup");
    const minBtn = el.querySelector(".wb-btn-min");
    const delBtn = el.querySelector(".wb-btn-del");

// Transforms: Image, Border aur Handles ka ek sath Live Rotation
    function applyTransforms() {
      const deg = parseFloat(el.dataset.rotation) || 0;
      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const fH = el.dataset.flipH || "1";
      const fV = el.dataset.flipV || "1";

      // 1. Image ko Center se Rotate aur Flip karein
      if (innerBox) {
        innerBox.style.transform = `rotate(${deg}deg) scale(${fH}, ${fV})`;
        innerBox.style.transformOrigin = "center center";
      }
      imgTag.style.transform = "none";

      // Box ka actual width aur height
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const cx = w / 2;
      const cy = h / 2;

      // 2. Base positions (Handles aur Rotation Pin)
      const basePoints = {
        "tl": { x: 0, y: 0 },
        "tr": { x: w, y: 0 },
        "bl": { x: 0, y: h },
        "br": { x: w, y: h },
        "tc": { x: cx, y: 0 },
        "bc": { x: cx, y: h },
        "ml": { x: 0, y: cy },
        "mr": { x: w, y: cy }
      };

      // 3. Har Handle ko Image ke Corners ke sath Orbit karana
      el.querySelectorAll(".wb-ppt-handle").forEach((handle) => {
        const dir = handle.getAttribute("data-dir");
        const pt = basePoints[dir];
        if (!pt) return;

        // Center ke relative point
        const dx = pt.x - cx;
        const dy = pt.y - cy;

        // Rotated point calculation (Trigonometry)
        const rx = cx + (dx * cos - dy * sin);
        const ry = cy + (dx * sin + dy * cos);

        // Position set karein (6px handle ka half size adjust karne ke liye)
        handle.style.left = `${rx - 6}px`;
        handle.style.top = `${ry - 6}px`;
        handle.style.right = "auto";
        handle.style.bottom = "auto";
      });

// 4. Rotation Knob aur Line (Image ke Top Edge se Baahar Upar ki taraf)
      const rotKnob = el.querySelector(".wb-ppt-rot-knob");
      const rotLine = el.querySelector(".wb-ppt-rot-line");

      const pinDist = 65; // Border se knob ki doori

      // Top Center Point (Image ka theek upar wala border)
      const tcDx = 0;
      const tcDy = -cy;
      const tcRx = cx + (tcDx * cos - tcDy * sin);
      const tcRy = cy + (tcDx * sin + tcDy * cos);

      // Pin Knob Point (Top Center se theek baahar ki taraf)
      const pinDx = 0;
      const pinDy = -cy - pinDist;
      const pinRx = cx + (pinDx * cos - pinDy * sin);
      const pinRy = cy + (pinDx * sin + pinDy * cos);

      // Knob ko baahar place karein
      if (rotKnob) {
        rotKnob.style.left = `${pinRx - 8}px`;
        rotKnob.style.top = `${pinRy - 8}px`;
        rotKnob.style.transform = "none";
      }

      // Line theek Knob se shuru hokar Image ke Border tak aayegi (Andar kabhi nahi ghusegi)
      if (rotLine) {
        rotLine.style.left = `${pinRx}px`;
        rotLine.style.top = `${pinRy + 8}px`; // Knob ke bottom se shuru
        rotLine.style.height = `${pinDist - 8}px`;
        rotLine.style.transformOrigin = "top center";
        rotLine.style.transform = `rotate(${deg}deg)`;
      }
    }
    // Popups Toggles
    el.querySelectorAll(".wb-btn-pop").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const targetClass = btn.dataset.target;
        const targetPopup = el.querySelector(`.${targetClass}`);
        const wasOpen = targetPopup.classList.contains("active");
        closePopups(el);
        if (!wasOpen) targetPopup.classList.add("active");
      });
    });

// Styles Apply
    el.querySelectorAll(".pop-styles .wb-pop-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const val = item.dataset.val;
        innerBox.className = `wb-img-inner-container ${val}`;

        // Circle aur Rounded ke liye image tag par border-radius aur overflow enforce karein
        if (val === "wb-style-circle") {
          innerBox.style.overflow = "hidden";
          imgTag.style.borderRadius = "50%";
        } else if (val === "wb-style-rounded") {
          innerBox.style.overflow = "hidden";
          imgTag.style.borderRadius = "24px";
        } else {
          innerBox.style.overflow = "visible";
          imgTag.style.borderRadius = "0px";
        }

        closePopups(el);
      });
    });

    // Colors Filter Apply
    el.querySelectorAll(".pop-colors .wb-pop-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        imgTag.style.filter = item.dataset.val;
        closePopups(el);
      });
    });

    // Transparency Apply
    el.querySelectorAll(".pop-opacity .wb-pop-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        imgTag.style.opacity = item.dataset.val;
        closePopups(el);
      });
    });

    // Flip Controls
    el.querySelector(".wb-btn-do-fliph")?.addEventListener("click", (e) => {
      e.stopPropagation();
      el.dataset.flipH = el.dataset.flipH === "1" ? "-1" : "1";
      applyTransforms();
      closePopups(el);
    });

    el.querySelector(".wb-btn-do-flipv")?.addEventListener("click", (e) => {
      e.stopPropagation();
      el.dataset.flipV = el.dataset.flipV === "1" ? "-1" : "1";
      applyTransforms();
      closePopups(el);
    });

    // Rotate 90 Deg Step
    rotBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      let r = (parseInt(el.dataset.rotation, 10) || 0) + 90;
      el.dataset.rotation = r % 360;
      applyTransforms();
    });

    // Fluid Rotate Pin Drag
    rotKnob.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      function onRotateMove(ev) {
        const rad = Math.atan2(ev.clientY - cy, ev.clientX - cx);
        let deg = Math.round(rad * (180 / Math.PI)) + 90;
        if (deg < 0) deg += 360;
        el.dataset.rotation = deg;
        applyTransforms();
      }
      function onRotateEnd() {
        document.removeEventListener("pointermove", onRotateMove);
        document.removeEventListener("pointerup", onRotateEnd);
      }
      document.addEventListener("pointermove", onRotateMove);
      document.addEventListener("pointerup", onRotateEnd);
    });

    // 8-Side Resize Engine
    el.querySelectorAll(".wb-ppt-handle").forEach(handle => {
      handle.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        const dir = handle.dataset.dir;
        let startX = e.clientX;
        let startY = e.clientY;
        let startW = el.offsetWidth;
        let startH = el.offsetHeight;
        let startL = el.offsetLeft;
        let startT = el.offsetTop;

       function onResize(ev) {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;

          if (dir.includes("r")) el.style.width = `${Math.max(60, startW + dx)}px`;
          if (dir.includes("b")) el.style.height = `${Math.max(60, startH + dy)}px`;
          if (dir.includes("l")) {
            const nw = Math.max(60, startW - dx);
            el.style.width = `${nw}px`;
            el.style.left = `${startL + (startW - nw)}px`;
          }
          if (dir.includes("t")) {
            const nh = Math.max(60, startH - dy);
            el.style.height = `${nh}px`;
            el.style.top = `${startT + (startH - nh)}px`;
          }

          // Toolbar scaling code
          const currentW = parseFloat(el.style.width) || 300;
          const tb = el.querySelector(".wb-img-toolbar");
          if (tb) {
            const scaleFactor = Math.min(1.15, Math.max(0.65, currentW / 320));
            tb.style.transform = `translate(-50%, -100%) scale(${scaleFactor})`;
          }
        }

        function onResizeEnd() {
          document.removeEventListener("pointermove", onResize);
          document.removeEventListener("pointerup", onResizeEnd);
        }
        document.addEventListener("pointermove", onResize);
        document.addEventListener("pointerup", onResizeEnd);
      });
    });

    // Real Interactive Slicing Crop Engine (PowerPoint / Canva Style)
    cropBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (el.querySelector(".wb-crop-box-overlay")) return;

      closePopups(el);

      // Crop Area Box Container
      const cropOverlay = document.createElement("div");
      cropOverlay.className = "wb-crop-box-overlay";
      cropOverlay.style.cssText = "position: absolute; inset: 0; outline: 9999px solid rgba(15, 23, 42, 0.65); z-index: 2400; border: 2px dashed #38bdf8; cursor: crosshair;";

      // Crop Action Bar
      const cropBar = document.createElement("div");
      cropBar.className = "wb-crop-bar";
      cropBar.style.cssText = "position: absolute; bottom: -44px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; background: #0f172a; border: 1px solid #38bdf8; padding: 4px 10px; border-radius: 8px; color: #fff; font-size: 11px; z-index: 2600; box-shadow: 0 8px 20px rgba(0,0,0,0.5);";
      cropBar.innerHTML = `
        <span style="display:flex; align-items:center; gap:4px;"><i class="fa-solid fa-crop-simple" style="color:#38bdf8;"></i> Drag Area</span>
        <button type="button" class="btn-crop-apply" style="background:#0284c7; color:#fff; border:none; border-radius:4px; padding:3px 8px; cursor:pointer; font-weight:600;">Apply</button>
        <button type="button" class="btn-crop-close" style="background:#334155; color:#cbd5e1; border:none; border-radius:4px; padding:3px 8px; cursor:pointer;">Cancel</button>
      `;

      el.appendChild(cropOverlay);
      el.appendChild(cropBar);

      // Crop coordinates tracker
      let cropStartX = 0, cropStartY = 0;
      let cropRect = { left: 0, top: 0, width: el.offsetWidth, height: el.offsetHeight };
      let isDrawingCrop = false;

      // Selection box inside overlay
      const selBox = document.createElement("div");
      selBox.style.cssText = "position: absolute; inset: 0; border: 2px solid #ffffff; background: rgba(56, 189, 248, 0.15);";
      cropOverlay.appendChild(selBox);

      cropOverlay.addEventListener("pointerdown", (pe) => {
        pe.stopPropagation();
        isDrawingCrop = true;
        const rect = el.getBoundingClientRect();
        cropStartX = pe.clientX - rect.left;
        cropStartY = pe.clientY - rect.top;

        selBox.style.left = `${cropStartX}px`;
        selBox.style.top = `${cropStartY}px`;
        selBox.style.width = "0px";
        selBox.style.height = "0px";
      });

      window.addEventListener("pointermove", onCropDrag);
      window.addEventListener("pointerup", onCropRelease);

      function onCropDrag(pe) {
        if (!isDrawingCrop) return;
        const rect = el.getBoundingClientRect();
        const currentX = Math.max(0, Math.min(el.offsetWidth, pe.clientX - rect.left));
        const currentY = Math.max(0, Math.min(el.offsetHeight, pe.clientY - rect.top));

        const left = Math.min(cropStartX, currentX);
        const top = Math.min(cropStartY, currentY);
        const width = Math.abs(currentX - cropStartX);
        const height = Math.abs(currentY - cropStartY);

        selBox.style.left = `${left}px`;
        selBox.style.top = `${top}px`;
        selBox.style.width = `${width}px`;
        selBox.style.height = `${height}px`;

        cropRect = { left, top, width, height };
      }

      function onCropRelease() {
        isDrawingCrop = false;
      }

      function cleanCropListeners() {
        window.removeEventListener("pointermove", onCropDrag);
        window.removeEventListener("pointerup", onCropRelease);
        cropOverlay.remove();
        cropBar.remove();
      }

      // Apply Actual Canvas Crop
      cropBar.querySelector(".btn-crop-apply").addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (cropRect.width < 20 || cropRect.height < 20) {
          cleanCropListeners();
          return;
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const rawImg = new Image();
        rawImg.crossOrigin = "anonymous";
        rawImg.onload = () => {
          // Scale calculate karein natural image size vs container size
          const scaleX = rawImg.naturalWidth / el.offsetWidth;
          const scaleY = rawImg.naturalHeight / el.offsetHeight;

          const sourceX = cropRect.left * scaleX;
          const sourceY = cropRect.top * scaleY;
          const sourceW = cropRect.width * scaleX;
          const sourceH = cropRect.height * scaleY;

          canvas.width = sourceW;
          canvas.height = sourceH;
          ctx.drawImage(rawImg, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);

          // Update Image Source & Container Dimensions
          imgTag.src = canvas.toDataURL();
          el.style.left = `${el.offsetLeft + cropRect.left}px`;
          el.style.top = `${el.offsetTop + cropRect.top}px`;
          el.style.width = `${cropRect.width}px`;
          el.style.height = `${cropRect.height}px`;

          cleanCropListeners();
        };
        rawImg.src = imgTag.src;
      });

      // Cancel Crop
      cropBar.querySelector(".btn-crop-close").addEventListener("click", (ev) => {
        ev.stopPropagation();
        cleanCropListeners();
      });
    });
    // Drag to Move
    el.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".wb-img-toolbar") || e.target.closest(".wb-ppt-handle") || e.target === rotKnob || e.target.closest(".wb-crop-bar")) return;
      selectImage(el);
      closePopups(el);

      let startX = e.clientX;
      let startY = e.clientY;
      let initL = el.offsetLeft;
      let initT = el.offsetTop;

      function onMove(ev) {
        el.style.left = `${initL + (ev.clientX - startX)}px`;
        el.style.top = `${initT + (ev.clientY - startY)}px`;
      }
      function onMoveEnd() {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onMoveEnd);
      }
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onMoveEnd);
    });

    

    // Duplicate
    dupBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.addImageToWhiteboard(imgTag.src, el.offsetLeft + 30, el.offsetTop + 30);
    });

// SMART TRACKER MINIMIZE (Sateek Alignment & Draggable Bubble)
    minBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      const pdfDockBtn = document.querySelector("#dockBtnPdfMin, .pdf-min-bubble, [title*='PDF']");
      
      let targetX = 140;
      let targetY = window.innerHeight - 56;
      let btnWidth = 48;
      let btnHeight = 48;
      let targetTop = null;

      if (pdfDockBtn) {
        const pRect = pdfDockBtn.getBoundingClientRect();
        btnWidth = pRect.width;
        btnHeight = pRect.height;
        // Right side me 22px ka wazeh gap
        targetX = pRect.right + 22;
        // Sateek top align (PDF ke theek barabar)
        targetTop = pRect.top;
        targetY = pRect.top + (pRect.height / 2);
      }

      const imgRect = el.getBoundingClientRect();
      const curCenterX = imgRect.left + imgRect.width / 2;
      const curCenterY = imgRect.top + imgRect.height / 2;
      const moveX = (targetX + btnWidth / 2) - curCenterX;
      const moveY = targetY - curCenterY;

      // Blue Glowing Light Effect
      el.classList.add("wb-glow-transit");
      el.style.transition = "transform 0.45s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.4s ease, filter 0.45s ease";
      el.style.transform = `translate(${moveX}px, ${moveY}px) scale(0.06)`;
      el.style.opacity = "0.2";

      setTimeout(() => {
        el.style.display = "none";
        el.classList.remove("wb-glow-transit");

        // Circular Dock Bubble
        const bubble = document.createElement("div");
        bubble.className = "wb-minimized-bubble";
        bubble.title = "Restore Image (Drag to Move)";
        bubble.style.width = `${btnWidth}px`;
        bubble.style.height = `${btnHeight}px`;
        bubble.style.left = `${targetX}px`;
        // BUBBLE KO UPAR UTHANE KE LIYE YEH KAREIN:
        bubble.style.top = targetTop !== null ? `${targetTop - 6}px` : `${window.innerHeight - 76}px`;
        bubble.style.bottom = "auto";
        bubble.style.cursor = "grab";
        bubble.innerHTML = `<i class="fa-solid fa-image"></i>`;
        document.body.appendChild(bubble);

        // --- DRAG YA CLICK CONTROLLER (Mouse & Touch Enabled) ---
        let isDragging = false;
        let hasMoved = false;
        let startX = 0, startY = 0;
        let initLeft = 0, initTop = 0;

        bubble.addEventListener("pointerdown", (pe) => {
          pe.stopPropagation();
          isDragging = true;
          hasMoved = false;
          startX = pe.clientX;
          startY = pe.clientY;
          initLeft = bubble.offsetLeft;
          initTop = bubble.offsetTop;
          bubble.style.cursor = "grabbing";
          bubble.setPointerCapture(pe.pointerId);
        });

        bubble.addEventListener("pointermove", (pe) => {
          if (!isDragging) return;
          const dx = pe.clientX - startX;
          const dy = pe.clientY - startY;
          if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
            hasMoved = true;
          }
          bubble.style.left = `${initLeft + dx}px`;
          bubble.style.top = `${initTop + dy}px`;
        });

        bubble.addEventListener("pointerup", (pe) => {
          if (!isDragging) return;
          isDragging = false;
          bubble.style.cursor = "grab";
          try { bubble.releasePointerCapture(pe.pointerId); } catch(err) {}

          // Agar drag nahi kiya gaya balki sirf click hua hai, tab restore karo
          if (!hasMoved) {
            restoreImage();
          }
        });

        // Restore Action Logic
        function restoreImage() {
          const finalRect = bubble.getBoundingClientRect();
          const restoreCenterX = finalRect.left + finalRect.width / 2;
          const restoreCenterY = finalRect.top + finalRect.height / 2;
          const rMoveX = restoreCenterX - curCenterX;
          const rMoveY = restoreCenterY - curCenterY;

          bubble.remove();
          el.style.display = "block";
          el.classList.add("wb-glow-transit");
          el.style.transform = `translate(${rMoveX}px, ${rMoveY}px) scale(0.06)`;
          el.style.opacity = "0.2";

          requestAnimationFrame(() => {
            el.style.transition = "transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.35s ease, filter 0.45s ease";
            el.style.transform = "translate(0px, 0px) scale(1)";
            el.style.opacity = "1";

            setTimeout(() => {
              el.classList.remove("wb-glow-transit");
              el.style.transition = "";
              selectImage(el);
            }, 450);
          });
        }
      }, 420);
    });
    // Delete
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      el.remove();
      activeSelectedImg = null;
    });
  
// --- GLOBAL SEQUENCED POWERPOINT LAYER CONTROLLER ---
    (() => {
      const targetEl = (typeof el !== "undefined") ? el : ((typeof wrapper !== "undefined") ? wrapper : null);
      if (!targetEl) return;

      const orderBtn = targetEl.querySelector('.wb-tb-btn[data-target="pop-order"]');
      const orderPopup = targetEl.querySelector(".pop-order");
      if (!orderBtn || !orderPopup) return;

      // 1. Popup Toggle
      orderBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = orderPopup.style.display === "flex";
        orderPopup.style.display = isOpen ? "none" : "flex";
      });

      // Helper: Saari images ko screen par unke current stack ke hisab se re-normalize karna
      function getOrderedWhiteboardImages() {
        const board = targetEl.parentElement || document.body;
        const all = Array.from(board.querySelectorAll(".wb-image-item, .wb-img-wrapper, [class*='image-item']"));
        
        // Unko unke maujooda z-index ke hisab se sort karein
        all.sort((a, b) => {
          const zA = parseInt(a.style.zIndex || window.getComputedStyle(a).zIndex, 10) || 500;
          const zB = parseInt(b.style.zIndex || window.getComputedStyle(b).zIndex, 10) || 500;
          return zA - zB;
        });

        // Sabhi ko saaf aur alag z-index assign karein (100, 110, 120, ...)
        all.forEach((item, index) => {
          item.style.zIndex = (100 + (index * 10)).toString();
        });

        return all;
      }

      // 2. Button Actions
      orderPopup.querySelectorAll(".wb-layer-opt").forEach((opt) => {
        opt.addEventListener("mouseenter", () => {
          opt.style.backgroundColor = "#f1f5f9";
          const span = opt.querySelector("span");
          if (span) span.style.color = "#0284c7";
        });
        opt.addEventListener("mouseleave", () => {
          opt.style.backgroundColor = "transparent";
          const span = opt.querySelector("span");
          if (span) span.style.color = "#0f172a";
        });

        opt.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const act = opt.getAttribute("data-act");
          const sortedList = getOrderedWhiteboardImages();
          const myIndex = sortedList.indexOf(targetEl);

          if (myIndex === -1) return;

          if (act === "front") {
            // Target ko list ke bilkul aakhri element se bhi upar ka z-index dena
            const topMostZ = parseInt(sortedList[sortedList.length - 1].style.zIndex, 10) || 500;
            targetEl.style.zIndex = (topMostZ + 15).toString();
          } else if (act === "back") {
            // Target ko sabse kam z-index dena
            const bottomMostZ = parseInt(sortedList[0].style.zIndex, 10) || 100;
            targetEl.style.zIndex = Math.max(10, bottomMostZ - 15).toString();
          } else if (act === "forward") {
            // Agle wale ke sath swap karna
            if (myIndex < sortedList.length - 1) {
              const nextEl = sortedList[myIndex + 1];
              const myZ = targetEl.style.zIndex;
              targetEl.style.zIndex = nextEl.style.zIndex;
              nextEl.style.zIndex = myZ;
            }
          } else if (act === "backward") {
            // Pichhle wale ke sath swap karna
            if (myIndex > 0) {
              const prevEl = sortedList[myIndex - 1];
              const myZ = targetEl.style.zIndex;
              targetEl.style.zIndex = prevEl.style.zIndex;
              prevEl.style.zIndex = myZ;
            }
          }

          orderPopup.style.display = "none";
        });
      });

      // 3. Screen par click par popup close
      document.addEventListener("click", () => {
        orderPopup.style.display = "none";
      });
    })();
    }

  // Keyboard Shortcuts (Delete & Backspace)
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Delete" || e.key === "Backspace") && activeSelectedImg) {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
      activeSelectedImg.remove();
      activeSelectedImg = null;
    }
  });

  // Multiple Files Upload Listener
  document.addEventListener("change", (e) => {
    if (e.target && e.target.id === "boardImageFileInput") {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          window.addImageToWhiteboard(ev.target.result, 180 + (index * 30), 140 + (index * 30));
        };
        reader.readAsDataURL(file);
      });
      e.target.value = "";
    }
  });

  // Drag & Drop Multiple Images
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
      files.forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = (ev) => window.addImageToWhiteboard(ev.target.result, e.clientX + (idx * 25), e.clientY + (idx * 25));
        reader.readAsDataURL(file);
      });
    }
  });

  // Clipboard Paste (Ctrl + V)
  window.addEventListener("paste", (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData)?.items || [];
    for (let item of items) {
      if (item.type.indexOf("image") !== -1) {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (ev) => window.addImageToWhiteboard(ev.target.result);
        reader.readAsDataURL(blob);
        break;
      }
    }
  });
})();
