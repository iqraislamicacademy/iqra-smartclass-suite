// ==========================================
// PEN SUITE & MULTI-SURFACE DRAWING ENGINE (pen.js)
// Part 1 of 3: Dock Color Flyout, Pen & Highlighter State, Helpers & Stabilizer
// ==========================================

// 1. DOCK COLOR FLYOUT & PRESET SWATCHES
const colorTriggerBtn = document.getElementById("colorTriggerBtn");
const colorFlyoutMenu = document.getElementById("colorFlyoutMenu");

if (colorTriggerBtn && colorFlyoutMenu) {
  colorTriggerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (colorFlyoutMenu.style.display === "flex") {
      colorFlyoutMenu.style.display = "none";
      return;
    }
    const rect = colorTriggerBtn.getBoundingClientRect();
    colorFlyoutMenu.style.display = "flex";
    colorFlyoutMenu.style.top = `${rect.top + rect.height / 2 - 18}px`;
    colorFlyoutMenu.style.right = `${window.innerWidth - rect.left + 12}px`;
  });

  document.addEventListener("click", (e) => {
    if (!colorFlyoutMenu.contains(e.target) && e.target !== colorTriggerBtn) {
      colorFlyoutMenu.style.display = "none";
    }
  });
}

function applySelectedColor(hexColor) {
  if (colorTriggerBtn) colorTriggerBtn.style.background = hexColor;
  if (typeof brushColor !== "undefined" && brushColor) brushColor.value = hexColor;

  if (
    typeof activeTool !== "undefined" &&
    activeTool === "pen" &&
    typeof fabricCanvas !== "undefined" &&
    fabricCanvas &&
    fabricCanvas.freeDrawingBrush &&
    !(window.IqraHighlighterState && window.IqraHighlighterState.isActiveMode)
  ) {
    fabricCanvas.freeDrawingBrush.color = hexColor;
  }

  if (typeof fabricCanvas !== "undefined" && fabricCanvas) {
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && !activeObj.isHighlighter) {
      if (activeObj.type === "i-text") activeObj.set("fill", hexColor);
      else if (activeObj.stroke) activeObj.set("stroke", hexColor);
      fabricCanvas.renderAll();
      if (typeof saveCanvasState === "function") saveCanvasState();
    }
  }

  if (typeof updateCustomCursor === "function") updateCustomCursor();
}

document.querySelectorAll(".color-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const selectedColor = btn.getAttribute("data-color");
    applySelectedColor(selectedColor);
    if (colorFlyoutMenu) colorFlyoutMenu.style.display = "none";
  });
});

if (typeof brushColor !== "undefined" && brushColor) {
  brushColor.addEventListener("input", (e) => {
    applySelectedColor(e.target.value);
  });
}

// 2. PEN SUITE & DEDICATED HIGHLIGHTER ENGINE (WHITEBOARD + IMAGE + PDF)
(function initPenSuiteEngine() {
  const penWrapper = document.getElementById("penSuiteWrapper");
  const mainBtn = document.getElementById("penSuiteMainBtn");
  const flyout = document.getElementById("penSuiteFlyout");
  const sizeSlider = document.getElementById("penSuiteSizeSlider");
  const sizeDisplay = document.getElementById("penSuiteSizeDisplay");
  const customColorInput = document.getElementById("penSuiteCustomColorInput");
  const colorIndicator = document.getElementById("penSuiteColorIndicator");
  const previewLine = document.getElementById("penSuiteLivePreview");
  const colorDots = document.querySelectorAll(".pen-color-dot");

  if (!penWrapper || !mainBtn || !flyout) return;

  // Inject 3 Zero-Lag Fast Pens into the existing Pen Style grid
  (function injectFastPenButtons() {
    const firstPenBtn = flyout.querySelector(".pen-type-btn");
    if (!firstPenBtn || !firstPenBtn.parentElement) return;
    const gridContainer = firstPenBtn.parentElement;

    const fastPens = [
      { type: "fast-normal", icon: "fa-bolt", label: "Fast Normal" },
      { type: "fast-en", icon: "fa-pen-nib", label: "Fast English" },
      { type: "fast-ur", icon: "fa-feather-pointed", label: "Fast Urdu" },
    ];

    fastPens.forEach((fp) => {
      if (gridContainer.querySelector(`[data-pen-type="${fp.type}"]`)) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = firstPenBtn.className.replace(/\bactive\b/g, "").trim();
      btn.setAttribute("data-pen-type", fp.type);
      btn.innerHTML = `<i class="fa-solid ${fp.icon}"></i> ${fp.label}`;
      gridContainer.appendChild(btn);
    });
  })();

  const typeButtons = flyout.querySelectorAll(".pen-type-btn");

  const PenState = {
    type: "normal",
    color: "#1e293b",
    size: 4,
    isActive: false,
  };

  // Separate Highlighter State (independent color, thickness size & adjustable transparency)
  const HighlighterState = {
    color: "#facc15",
    size: 18,
    opacity: 0.25,
    isActiveMode: false,
  };
  window.IqraHighlighterState = HighlighterState;

  let hlControlsEl = null;
  let hlSizeSlider = null;
  let hlSizeDisplay = null;
  let hlOpacitySlider = null;
  let hlOpacityDisplay = null;
  let hlCustomColorInput = null;

  function isFastPenType(t) {
    return t === "fast-normal" || t === "fast-en" || t === "fast-ur";
  }

  function isHighlighterSelected() {
    return PenState.type === "highlighter";
  }

  const activeTouchPointers = new Set();
  window.addEventListener(
    "pointerdown",
    (e) => {
      if (e.pointerType === "touch") activeTouchPointers.add(e.pointerId);
    },
    true
  );
  const removeTouchPointer = (e) => {
    if (e.pointerType === "touch") activeTouchPointers.delete(e.pointerId);
  };
  window.addEventListener("pointerup", removeTouchPointer, true);
  window.addEventListener("pointercancel", removeTouchPointer, true);

  mainBtn.classList.remove("active");
  if (typeof fabricCanvas !== "undefined" && fabricCanvas) {
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = true;
    fabricCanvas.defaultCursor = "default";
    fabricCanvas.hoverCursor = "move";
  }

  function hexToRgba(hex, alpha) {
    const clean = (hex || "#facc15").replace("#", "");
    let r = 250,
      g = 204,
      b = 21;
    if (clean.length === 6) {
      r = parseInt(clean.substring(0, 2), 16);
      g = parseInt(clean.substring(2, 4), 16);
      b = parseInt(clean.substring(4, 6), 16);
    } else if (clean.length === 3) {
      r = parseInt(clean[0] + clean[0], 16);
      g = parseInt(clean[1] + clean[1], 16);
      b = parseInt(clean[2] + clean[2], 16);
    }
    const safeAlpha = Math.max(0.05, Math.min(0.95, Number(alpha) || 0.25));
    return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
  }

  function getActiveToolColor() {
    return isHighlighterSelected() ? HighlighterState.color : PenState.color;
  }

  function getActiveToolSize() {
    return isHighlighterSelected() ? HighlighterState.size : PenState.size;
  }

  function getCursorDataUrl() {
    const curColor = encodeURIComponent(getActiveToolColor());
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="4" fill="${curColor}" stroke="%23ffffff" stroke-width="1.5"/></svg>`;
  }

  function syncHighlighterUiValues() {
    if (!hlControlsEl) return;
    const isHl = isHighlighterSelected();
    hlControlsEl.style.display = isHl ? "flex" : "none";

    if (hlSizeSlider) hlSizeSlider.value = String(HighlighterState.size);
    if (hlSizeDisplay) hlSizeDisplay.textContent = `${HighlighterState.size}px`;

    const pct = Math.round(HighlighterState.opacity * 100);
    if (hlOpacitySlider) hlOpacitySlider.value = String(pct);
    if (hlOpacityDisplay) hlOpacityDisplay.textContent = `${pct}%`;

    if (hlCustomColorInput) hlCustomColorInput.value = HighlighterState.color;

    hlControlsEl.querySelectorAll(".iqra-hl-swatch").forEach((sw) => {
      const swColor = (sw.getAttribute("data-hl-color") || "").toLowerCase();
      const isSelected = swColor === HighlighterState.color.toLowerCase();
      sw.classList.toggle("active", isSelected);
      sw.style.setProperty("background-color", sw.getAttribute("data-hl-color"), "important");
      sw.style.boxShadow = isSelected
        ? `0 0 0 2px #ffffff, 0 0 0 4px ${swColor}`
        : "0 1px 3px rgba(15, 23, 42, 0.25)";
      sw.style.transform = isSelected ? "scale(1.1)" : "scale(1)";
    });
  }

  // Build Highlighter color palette, thickness & transparency controls
  function buildHighlighterControlsUi() {
    if (hlControlsEl) return;

    const palette = [
      { color: "#facc15", label: "Yellow" },
      { color: "#4ade80", label: "Green" },
      { color: "#f472b6", label: "Pink" },
      { color: "#38bdf8", label: "Sky Blue" },
      { color: "#fb923c", label: "Orange" },
      { color: "#c084fc", label: "Purple" },
    ];

    if (!document.getElementById("iqraHighlighterPanelStyle")) {
      const swatchRules = palette
        .map(
          (p, idx) => `
          #iqraHighlighterControlsBox .iqra-hl-swatch[data-swatch-idx="${idx}"] {
            background-color: ${p.color} !important;
          }
        `
        )
        .join("\n");

      const styleTag = document.createElement("style");
      styleTag.id = "iqraHighlighterPanelStyle";
      styleTag.textContent = `
        #iqraHighlighterControlsBox .iqra-hl-swatch {
          width: 22px;
          height: 22px;
          min-width: 22px;
          min-height: 22px;
          border-radius: 999px;
          border: 2px solid #ffffff;
          padding: 0;
          margin: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.14s ease, box-shadow 0.14s ease;
          appearance: none;
          -webkit-appearance: none;
        }
        #iqraHighlighterControlsBox .iqra-hl-swatch:hover {
          transform: scale(1.12);
        }
        ${swatchRules}
      `;
      document.head.appendChild(styleTag);
    }

    hlControlsEl = document.createElement("div");
    hlControlsEl.id = "iqraHighlighterControlsBox";
    hlControlsEl.style.cssText =
      "display:none; flex-direction:column; gap:8px; margin-top:8px; padding:9px 10px; border-radius:10px; background:#f8fafc; border:1px solid #cbd5e1; color:#0f172a; font-size:11.5px;";

    const swatchesHtml = palette
      .map(
        (p, idx) =>
          `<button type="button" class="iqra-hl-swatch" data-swatch-idx="${idx}" data-hl-color="${p.color}" title="${p.label}"></button>`
      )
      .join("");

    hlControlsEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;font-weight:700;color:#0f172a;font-size:11.5px;">
        <i class="fa-solid fa-highlighter" style="color:#eab308;"></i>
        <span>Highlighter</span>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 0;">
        <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;">${swatchesHtml}</div>
        <input type="color" id="iqraHlCustomColor" value="#facc15" title="Custom Color" style="width:24px;height:24px;border:1px solid #cbd5e1;border-radius:999px;background:transparent;cursor:pointer;padding:0;overflow:hidden;" />
      </div>

      <div style="display:flex;flex-direction:column;gap:3px;">
        <div style="display:flex;justify-content:space-between;font-size:10.5px;color:#475569;">
          <span>Size</span>
          <strong id="iqraHlSizeVal" style="color:#0f172a;">18px</strong>
        </div>
        <input type="range" id="iqraHlSizeSlider" min="6" max="48" value="18" step="1" style="width:100%;accent-color:#eab308;cursor:pointer;margin:0;" />
      </div>

      <div style="display:flex;flex-direction:column;gap:3px;">
        <div style="display:flex;justify-content:space-between;font-size:10.5px;color:#475569;">
          <span>Transparency</span>
          <strong id="iqraHlOpacityVal" style="color:#0f172a;">25%</strong>
        </div>
        <input type="range" id="iqraHlOpacitySlider" min="10" max="70" value="25" step="1" style="width:100%;accent-color:#0284c7;cursor:pointer;margin:0;" />
      </div>
    `;

    flyout.appendChild(hlControlsEl);

    hlSizeSlider = hlControlsEl.querySelector("#iqraHlSizeSlider");
    hlSizeDisplay = hlControlsEl.querySelector("#iqraHlSizeVal");
    hlOpacitySlider = hlControlsEl.querySelector("#iqraHlOpacitySlider");
    hlOpacityDisplay = hlControlsEl.querySelector("#iqraHlOpacityVal");
    hlCustomColorInput = hlControlsEl.querySelector("#iqraHlCustomColor");

    hlControlsEl.querySelectorAll(".iqra-hl-swatch").forEach((sw) => {
      sw.addEventListener("click", (e) => {
        e.stopPropagation();
        HighlighterState.color = sw.getAttribute("data-hl-color") || "#facc15";
        syncHighlighterUiValues();
        updatePenPreview();
        window.applyPenSuiteSettings();
      });
    });

    hlCustomColorInput?.addEventListener("input", (e) => {
      e.stopPropagation();
      HighlighterState.color = e.target.value;
      syncHighlighterUiValues();
      updatePenPreview();
      window.applyPenSuiteSettings();
    });

    const stopHlSliderPropagation = (e) => e.stopPropagation();

    hlSizeSlider?.addEventListener("input", (e) => {
      const v = parseInt(e.target.value, 10);
      if (isNaN(v)) return;
      HighlighterState.size = v;
      syncHighlighterUiValues();
      updatePenPreview();
      if (
        typeof fabricCanvas !== "undefined" &&
        fabricCanvas &&
        fabricCanvas.freeDrawingBrush &&
        isHighlighterSelected()
      ) {
        fabricCanvas.freeDrawingBrush.width = HighlighterState.size;
      }
    });

    hlOpacitySlider?.addEventListener("input", (e) => {
      const pct = parseInt(e.target.value, 10);
      if (isNaN(pct)) return;
      HighlighterState.opacity = Math.max(0.1, Math.min(0.7, pct / 100));
      syncHighlighterUiValues();
      updatePenPreview();
      if (
        typeof fabricCanvas !== "undefined" &&
        fabricCanvas &&
        fabricCanvas.freeDrawingBrush &&
        isHighlighterSelected()
      ) {
        fabricCanvas.freeDrawingBrush.color = hexToRgba(
          HighlighterState.color,
          HighlighterState.opacity
        );
      }
    });

    [hlSizeSlider, hlOpacitySlider].forEach((sl) => {
      if (!sl) return;
      sl.addEventListener("mousedown", stopHlSliderPropagation);
      sl.addEventListener("touchstart", stopHlSliderPropagation, { passive: true });
      sl.addEventListener("pointerdown", stopHlSliderPropagation);
    });

    syncHighlighterUiValues();
  }

  function updatePenPreview() {
    buildHighlighterControlsUi();
    const isHl = isHighlighterSelected();
    HighlighterState.isActiveMode = isHl;
    syncHighlighterUiValues();

    const activeColor = getActiveToolColor();
    const activeSize = getActiveToolSize();

    if (colorIndicator) colorIndicator.style.backgroundColor = activeColor;
    if (sizeDisplay) sizeDisplay.textContent = activeSize + "px";
    if (sizeSlider) sizeSlider.value = String(activeSize);

    if (previewLine) {
      previewLine.style.backgroundColor = activeColor;
      previewLine.style.height = isHl
        ? Math.min(Math.max(activeSize, 8), 24) + "px"
        : Math.min(Math.max(activeSize, 2), 20) + "px";
      previewLine.style.opacity = isHl ? String(HighlighterState.opacity) : "1";
    }

    if (PenState.isActive && typeof fabricCanvas !== "undefined" && fabricCanvas) {
      const svgCursor = getCursorDataUrl();
      fabricCanvas.freeDrawingCursor = `url('${svgCursor}') 8 8, crosshair`;
      if (fabricCanvas.upperCanvasEl) {
        fabricCanvas.upperCanvasEl.style.cursor = `url('${svgCursor}') 8 8, crosshair`;
      }
    }

    document.querySelectorAll(".pen-surface-canvas").forEach((c) => {
      c.style.cursor = PenState.isActive ? `url('${getCursorDataUrl()}') 8 8, crosshair` : "default";
    });
  }

  // ========================================================
  // REAL-TIME TREMOR STABILIZER & BEZIER CURVE ENGINE
  // ========================================================
  class LiveStrokeStabilizer {
    constructor(alpha1 = 0.3, alpha2 = 0.38, minStep = 1.6) {
      this.alpha1 = alpha1;
      this.alpha2 = alpha2;
      this.minStep = minStep;
      this.s1 = null;
      this.s2 = null;
      this.points = [];
    }

    reset(pt) {
      this.s1 = { x: pt.x, y: pt.y };
      this.s2 = { x: pt.x, y: pt.y };
      this.points = [{ x: pt.x, y: pt.y }];
      return this.points[0];
    }

    push(rawPt) {
      if (!this.s1 || !this.s2) return this.reset(rawPt);
      const lastAccepted = this.points[this.points.length - 1];
      const rawDist = Math.hypot(rawPt.x - lastAccepted.x, rawPt.y - lastAccepted.y);
      if (rawDist < this.minStep) return null;

      const speedBoost = Math.min(0.28, rawDist * 0.012);
      const a1 = Math.min(0.75, this.alpha1 + speedBoost);
      const a2 = Math.min(0.82, this.alpha2 + speedBoost);

      this.s1 = {
        x: this.s1.x + (rawPt.x - this.s1.x) * a1,
        y: this.s1.y + (rawPt.y - this.s1.y) * a1,
      };
      this.s2 = {
        x: this.s2.x + (this.s1.x - this.s2.x) * a2,
        y: this.s2.y + (this.s1.y - this.s2.y) * a2,
      };

      const pt = { x: this.s2.x, y: this.s2.y };
      this.points.push(pt);
      return pt;
    }

    finish() {
      return this.getUltraSmoothPoints();
    }

    getUltraSmoothPoints() {
      const pts = this.points;
      if (pts.length < 3) return pts;

      let cur = pts;
      for (let pass = 0; pass < 3; pass++) {
        const next = [cur[0]];
        for (let i = 1; i < cur.length - 1; i++) {
          next.push({
            x: cur[i - 1].x * 0.25 + cur[i].x * 0.5 + cur[i + 1].x * 0.25,
            y: cur[i - 1].y * 0.25 + cur[i].y * 0.5 + cur[i + 1].y * 0.25,
          });
        }
        next.push(cur[cur.length - 1]);
        cur = next;
      }

      const curvePts = [cur[0]];
      for (let i = 1; i < cur.length - 1; i++) {
        const p0 =
          i === 1
            ? cur[0]
            : { x: (cur[i - 1].x + cur[i].x) / 2, y: (cur[i - 1].y + cur[i].y) / 2 };
        const p1 = cur[i];
        const p2 = { x: (cur[i].x + cur[i + 1].x) / 2, y: (cur[i].y + cur[i + 1].y) / 2 };
        const segLen = Math.hypot(p2.x - p0.x, p2.y - p0.y);
        const steps = Math.max(2, Math.min(12, Math.ceil(segLen / 1.5)));
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const mt = 1 - t;
          curvePts.push({
            x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
            y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
          });
        }
      }
      curvePts.push(cur[cur.length - 1]);
      return curvePts;
    }
  }

  function drawQuadraticCurveOnCtx(ctx, pts) {
    if (!pts || pts.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 1) {
      ctx.lineTo(pts[0].x + 0.1, pts[0].y + 0.1);
    } else if (pts.length === 2) {
      ctx.lineTo(pts[1].x, pts[1].y);
    } else {
      for (let i = 1; i < pts.length - 1; i++) {
        const midX = (pts[i].x + pts[i + 1].x) / 2;
        const midY = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
    }
    ctx.stroke();
  }

  function buildSvgQuadraticPath(pts) {
    if (!pts || pts.length < 2) return "";
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} `;
    if (pts.length === 2) {
      d += `L ${pts[1].x.toFixed(2)} ${pts[1].y.toFixed(2)}`;
      return d;
    }
    for (let i = 1; i < pts.length - 1; i++) {
      const midX = ((pts[i].x + pts[i + 1].x) / 2).toFixed(2);
      const midY = ((pts[i].y + pts[i + 1].y) / 2).toFixed(2);
      d += `Q ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)} ${midX} ${midY} `;
    }
    const last = pts[pts.length - 1];
    d += `L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
    return d;
  }

  function getExactBoardPointer(canvas, e) {
    if (typeof canvas.calcOffset === "function") canvas.calcOffset();
    if (
      e &&
      Number.isFinite(e.clientX) &&
      Number.isFinite(e.clientY) &&
      !(e.clientX === 0 && e.clientY === 0) &&
      canvas.upperCanvasEl
    ) {
      const rect = canvas.upperCanvasEl.getBoundingClientRect();
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
      const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;
      const invVpt = fabric.util.invertTransform(vpt);
      const pt = fabric.util.transformPoint(new fabric.Point(cx, cy), invVpt);
      return { x: pt.x, y: pt.y };
    }
    return canvas.getPointer(e);
  }
  // ========================================================
  // WHITEBOARD BRUSHES (5 STABILIZED + 3 ZERO-LAG FAST PENS + INDEPENDENT HIGHLIGHTER)
  // ========================================================
  function createFastNormalBrush(canvas) {
    const brush = new fabric.BaseBrush();
    brush.canvas = canvas;
    brush.points = [];

    brush.onMouseDown = function (pointer, options) {
      const p = getExactBoardPointer(this.canvas, options ? options.e : pointer);
      this.points = [{ x: p.x, y: p.y }];
      this.canvas.clearContext(this.canvas.contextTop);
    };

    brush.onMouseMove = function (pointer, options) {
      if (this.points.length === 0) return;
      const p = getExactBoardPointer(this.canvas, options ? options.e : pointer);
      const prev = this.points[this.points.length - 1];
      if (Math.hypot(p.x - prev.x, p.y - prev.y) < 0.7) return;

      this.points.push({ x: p.x, y: p.y });

      const ctx = this.canvas.contextTop;
      const vpt = this.canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      ctx.save();
      ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.restore();
    };

    brush.onMouseUp = function () {
      this.canvas.clearContext(this.canvas.contextTop);
      if (this.points.length < 2) {
        this.points = [];
        return;
      }

      const d = buildSvgQuadraticPath(this.points);
      const pathObj = new fabric.Path(d, {
        fill: null,
        stroke: this.color,
        strokeWidth: this.width,
        strokeLineCap: "round",
        strokeLineJoin: "round",
        selectable: false,
        evented: false,
        objectCaching: false,
      });

      this.canvas.add(pathObj);
      this.canvas.renderAll();
      this.points = [];
    };

    return brush;
  }

  function createFastRibbonBrush(canvas, angleDeg) {
    const brush = new fabric.BaseBrush();
    brush.canvas = canvas;
    brush.points = [];
    brush.angleRad = (angleDeg * Math.PI) / 180;

    brush.onMouseDown = function (pointer, options) {
      const p = getExactBoardPointer(this.canvas, options ? options.e : pointer);
      this.points = [{ x: p.x, y: p.y }];
      this.canvas.clearContext(this.canvas.contextTop);
    };

    brush.onMouseMove = function (pointer, options) {
      if (this.points.length === 0) return;
      const p = getExactBoardPointer(this.canvas, options ? options.e : pointer);
      const p1 = this.points[this.points.length - 1];
      if (Math.hypot(p.x - p1.x, p.y - p1.y) < 0.7) return;

      const p2 = { x: p.x, y: p.y };
      this.points.push(p2);

      const halfW = this.width / 2;
      const dx = Math.cos(this.angleRad) * halfW;
      const dy = Math.sin(this.angleRad) * halfW;

      const ctx = this.canvas.contextTop;
      const vpt = this.canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      ctx.save();
      ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
      ctx.fillStyle = this.color;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(p1.x - dx, p1.y - dy);
      ctx.lineTo(p1.x + dx, p1.y + dy);
      ctx.lineTo(p2.x + dx, p2.y + dy);
      ctx.lineTo(p2.x - dx, p2.y - dy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    brush.onMouseUp = function () {
      this.canvas.clearContext(this.canvas.contextTop);
      const pts = this.points;
      if (!pts || pts.length < 2) {
        this.points = [];
        return;
      }

      const halfW = this.width / 2;
      const dx = Math.cos(this.angleRad) * halfW;
      const dy = Math.sin(this.angleRad) * halfW;

      let d = "";
      for (let i = 1; i < pts.length; i++) {
        const p1 = pts[i - 1];
        const p2 = pts[i];
        d +=
          `M ${p1.x - dx} ${p1.y - dy} ` +
          `L ${p1.x + dx} ${p1.y + dy} ` +
          `L ${p2.x + dx} ${p2.y + dy} ` +
          `L ${p2.x - dx} ${p2.y - dy} Z `;
      }

      const pathObj = new fabric.Path(d, {
        fill: this.color,
        stroke: this.color,
        strokeWidth: 0.5,
        strokeLineJoin: "round",
        strokeLineCap: "round",
        selectable: false,
        evented: false,
        objectCaching: false,
      });

      this.canvas.add(pathObj);
      this.canvas.renderAll();
      this.points = [];
    };

    return brush;
  }

  function createSmoothPenBrush(canvas, widthMultiplier = 1.0) {
    const brush = new fabric.BaseBrush();
    brush.canvas = canvas;
    brush.stabilizer = new LiveStrokeStabilizer(0.3, 0.38, 1.6);
    brush.widthMultiplier = widthMultiplier;

    brush.onMouseDown = function (pointer, options) {
      const p = getExactBoardPointer(this.canvas, options ? options.e : pointer);
      this.stabilizer.reset(p);
      this.canvas.clearContext(this.canvas.contextTop);
    };

    brush.onMouseMove = function (pointer, options) {
      if (this.stabilizer.points.length === 0) return;
      const p = getExactBoardPointer(this.canvas, options ? options.e : pointer);
      const added = this.stabilizer.push(p);
      if (!added) return;

      const ctx = this.canvas.contextTop;
      this.canvas.clearContext(ctx);
      const pts = this.stabilizer.getUltraSmoothPoints();

      ctx.save();
      const vpt = this.canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.width * this.widthMultiplier;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawQuadraticCurveOnCtx(ctx, pts);
      ctx.restore();
    };

    brush.onMouseUp = function () {
      this.canvas.clearContext(this.canvas.contextTop);
      const pts = this.stabilizer.finish();

      if (!pts || pts.length < 2) {
        this.stabilizer.points = [];
        return;
      }

      const d = buildSvgQuadraticPath(pts);
      const pathObj = new fabric.Path(d, {
        fill: null,
        stroke: this.color,
        strokeWidth: this.width * this.widthMultiplier,
        strokeLineCap: "round",
        strokeLineJoin: "round",
        selectable: false,
        evented: false,
        objectCaching: false,
      });

      this.canvas.add(pathObj);
      this.canvas.renderAll();
      this.stabilizer.points = [];
    };

    return brush;
  }

  function createRibbonBrush(canvas, angleDeg) {
    const brush = new fabric.BaseBrush();
    brush.canvas = canvas;
    brush.stabilizer = new LiveStrokeStabilizer(0.3, 0.38, 1.5);
    brush.angleRad = (angleDeg * Math.PI) / 180;

    brush.onMouseDown = function (pointer, options) {
      const p = getExactBoardPointer(this.canvas, options ? options.e : pointer);
      this.stabilizer.reset(p);
      this.canvas.clearContext(this.canvas.contextTop);
    };

    brush.onMouseMove = function (pointer, options) {
      if (this.stabilizer.points.length === 0) return;
      const p = getExactBoardPointer(this.canvas, options ? options.e : pointer);
      const added = this.stabilizer.push(p);
      if (!added) return;

      const ctx = this.canvas.contextTop;
      this.canvas.clearContext(ctx);

      const pts = this.stabilizer.getUltraSmoothPoints();
      if (pts.length < 2) return;

      const halfW = this.width / 2;
      const dx = Math.cos(this.angleRad) * halfW;
      const dy = Math.sin(this.angleRad) * halfW;

      ctx.save();
      const vpt = this.canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
      ctx.fillStyle = this.color;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 0.6;

      for (let i = 1; i < pts.length; i++) {
        const p1 = pts[i - 1];
        const p2 = pts[i];

        ctx.beginPath();
        ctx.moveTo(p1.x - dx, p1.y - dy);
        ctx.lineTo(p1.x + dx, p1.y + dy);
        ctx.lineTo(p2.x + dx, p2.y + dy);
        ctx.lineTo(p2.x - dx, p2.y - dy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    };

    brush.onMouseUp = function () {
      this.canvas.clearContext(this.canvas.contextTop);
      const pts = this.stabilizer.finish();

      if (!pts || pts.length < 2) {
        this.stabilizer.points = [];
        return;
      }

      const halfW = this.width / 2;
      const dx = Math.cos(this.angleRad) * halfW;
      const dy = Math.sin(this.angleRad) * halfW;

      let d = "";
      for (let i = 1; i < pts.length; i++) {
        const p1 = pts[i - 1];
        const p2 = pts[i];
        d +=
          `M ${p1.x - dx} ${p1.y - dy} ` +
          `L ${p1.x + dx} ${p1.y + dy} ` +
          `L ${p2.x + dx} ${p2.y + dy} ` +
          `L ${p2.x - dx} ${p2.y - dy} Z `;
      }

      const pathObj = new fabric.Path(d, {
        fill: this.color,
        stroke: this.color,
        strokeWidth: 0.6,
        strokeLineJoin: "round",
        strokeLineCap: "round",
        selectable: false,
        evented: false,
        objectCaching: false,
      });

      this.canvas.add(pathObj);
      this.canvas.renderAll();
      this.stabilizer.points = [];
    };

    return brush;
  }

  function createStraightHighlighterBrush(canvas) {
    const brush = new fabric.BaseBrush();
    brush.canvas = canvas;
    brush.startPt = null;
    brush.endPt = null;

    brush.onMouseDown = function (pointer, options) {
      const p = getExactBoardPointer(this.canvas, options ? options.e : pointer);
      this.startPt = { x: p.x, y: p.y };
      this.endPt = { x: p.x, y: p.y };
      this.canvas.clearContext(this.canvas.contextTop);
    };

    brush.onMouseMove = function (pointer, options) {
      if (!this.startPt) return;
      const p = getExactBoardPointer(this.canvas, options ? options.e : pointer);
      this.endPt = { x: p.x, y: p.y };

      const dx = this.endPt.x - this.startPt.x;
      const dy = this.endPt.y - this.startPt.y;
      if (Math.abs(dy) < Math.abs(dx) * 0.08) this.endPt.y = this.startPt.y;
      else if (Math.abs(dx) < Math.abs(dy) * 0.08) this.endPt.x = this.startPt.x;

      const strokeColor = hexToRgba(HighlighterState.color, HighlighterState.opacity);
      const strokeWidth = Math.max(6, HighlighterState.size);

      const ctx = this.canvas.contextTop;
      this.canvas.clearContext(ctx);
      ctx.save();
      const vpt = this.canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "butt";
      ctx.beginPath();
      ctx.moveTo(this.startPt.x, this.startPt.y);
      ctx.lineTo(this.endPt.x, this.endPt.y);
      ctx.stroke();
      ctx.restore();
    };

    brush.onMouseUp = function () {
      this.canvas.clearContext(this.canvas.contextTop);
      if (!this.startPt || !this.endPt) return;

      const dist = Math.hypot(this.endPt.x - this.startPt.x, this.endPt.y - this.startPt.y);
      if (dist > 3) {
        const strokeColor = hexToRgba(HighlighterState.color, HighlighterState.opacity);
        const strokeWidth = Math.max(6, HighlighterState.size);

        const lineObj = new fabric.Line(
          [this.startPt.x, this.startPt.y, this.endPt.x, this.endPt.y],
          {
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            strokeLineCap: "butt",
            selectable: false,
            evented: false,
            objectCaching: false,
            isHighlighter: true,
          }
        );
        this.canvas.add(lineObj);
        this.canvas.renderAll();
      }
      this.startPt = null;
      this.endPt = null;
    };

    return brush;
  }

  // ========================================================
  // MULTI-SURFACE DRAWING LAYER (IMAGE + PDF OVERLAYS)
  // ========================================================
  function getOrCreateHighlighterLayer(penCanvas) {
    const parent = penCanvas.parentElement;
    if (!parent) return penCanvas;
    let hlCanvas = parent.querySelector(".pen-highlighter-canvas");
    if (!hlCanvas) {
      hlCanvas = document.createElement("canvas");
      hlCanvas.className = "pen-highlighter-canvas";
      hlCanvas.width = penCanvas.width;
      hlCanvas.height = penCanvas.height;
      hlCanvas.style.cssText = `position:absolute; top:0; left:0; width:${penCanvas.width}px; height:${penCanvas.height}px; z-index:44; pointer-events:none;`;
      parent.insertBefore(hlCanvas, penCanvas);
    } else if (hlCanvas.width !== penCanvas.width || hlCanvas.height !== penCanvas.height) {
      const tmp = document.createElement("canvas");
      tmp.width = hlCanvas.width;
      tmp.height = hlCanvas.height;
      tmp.getContext("2d").drawImage(hlCanvas, 0, 0);
      hlCanvas.width = penCanvas.width;
      hlCanvas.height = penCanvas.height;
      hlCanvas.style.width = `${penCanvas.width}px`;
      hlCanvas.style.height = `${penCanvas.height}px`;
      hlCanvas.getContext("2d").drawImage(tmp, 0, 0, hlCanvas.width, hlCanvas.height);
    }
    return hlCanvas;
  }

  // ========================================================
  // SURFACE UNDO / REDO HISTORY MANAGER (PDF & UPLOADED IMAGES)
  // ========================================================
  const SurfaceHistory = {
    stacks: new WeakMap(),
    lastInteractedPenCanvas: null,

    getStack(penCanvas) {
      if (!this.stacks.has(penCanvas)) {
        this.stacks.set(penCanvas, { undo: [], redo: [] });
      }
      return this.stacks.get(penCanvas);
    },

    capturePair(penCanvas) {
      if (!penCanvas || penCanvas.width === 0 || penCanvas.height === 0) return null;
      const parent = penCanvas.parentElement;
      const hlCanvas = parent ? parent.querySelector(".pen-highlighter-canvas") : null;
      try {
        return {
          penData: penCanvas.getContext("2d").getImageData(0, 0, penCanvas.width, penCanvas.height),
          hlData:
            hlCanvas && hlCanvas.width > 0 && hlCanvas.height > 0
              ? hlCanvas.getContext("2d").getImageData(0, 0, hlCanvas.width, hlCanvas.height)
              : null,
        };
      } catch (e) {
        return null;
      }
    },

    restorePair(penCanvas, state) {
      if (!penCanvas || !state) return;
      const parent = penCanvas.parentElement;
      const hlCanvas = parent ? parent.querySelector(".pen-highlighter-canvas") : null;
      if (state.penData) {
        penCanvas.getContext("2d").putImageData(state.penData, 0, 0);
      }
      if (hlCanvas && state.hlData) {
        hlCanvas.getContext("2d").putImageData(state.hlData, 0, 0);
      } else if (hlCanvas && !state.hlData) {
        hlCanvas.getContext("2d").clearRect(0, 0, hlCanvas.width, hlCanvas.height);
      }
      if (typeof window.saveCurrentPdfPageAnnotations === "function") {
        window.saveCurrentPdfPageAnnotations();
      }
    },

    pushBeforeStroke(penCanvas) {
      const snap = this.capturePair(penCanvas);
      if (!snap) return;
      const st = this.getStack(penCanvas);
      st.undo.push(snap);
      if (st.undo.length > 35) st.undo.shift();
      st.redo = [];
      this.lastInteractedPenCanvas = penCanvas;
    },

    getActiveSurfaceCanvas() {
      const docPane = document.getElementById("documentPane");
      const renderTarget = document.getElementById("renderTarget");
      if (docPane && window.getComputedStyle(docPane).display !== "none" && renderTarget) {
        const pdfSurface = renderTarget.querySelector(".pen-surface-canvas");
        if (pdfSurface) return pdfSurface;
      }
      if (this.lastInteractedPenCanvas && document.body.contains(this.lastInteractedPenCanvas)) {
        return this.lastInteractedPenCanvas;
      }
      return null;
    },

    undo() {
      const penCanvas = this.getActiveSurfaceCanvas();
      if (!penCanvas) return false;
      const st = this.getStack(penCanvas);
      if (st.undo.length === 0) return false;

      const currentSnap = this.capturePair(penCanvas);
      if (currentSnap) st.redo.push(currentSnap);

      const prevSnap = st.undo.pop();
      this.restorePair(penCanvas, prevSnap);
      return true;
    },

    redo() {
      const penCanvas = this.getActiveSurfaceCanvas();
      if (!penCanvas) return false;
      const st = this.getStack(penCanvas);
      if (st.redo.length === 0) return false;

      const currentSnap = this.capturePair(penCanvas);
      if (currentSnap) st.undo.push(currentSnap);

      const nextSnap = st.redo.pop();
      this.restorePair(penCanvas, nextSnap);
      return true;
    },
  };

  window.IqraSurfaceHistory = SurfaceHistory;

  window.addEventListener(
    "click",
    (e) => {
      const undoBtn = e.target.closest("#btnUndo, [data-action='undo']");
      if (undoBtn) {
        if (SurfaceHistory.undo()) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
        return;
      }

      const redoBtn = e.target.closest("#btnRedo, [data-action='redo']");
      if (redoBtn) {
        if (SurfaceHistory.redo()) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      }
    },
    true
  );

  window.addEventListener(
    "keydown",
    (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
      if (activeTag === "input" || activeTag === "textarea") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (SurfaceHistory.undo()) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        if (SurfaceHistory.redo()) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      }
    },
    true
  );
  function bindSurfaceDrawing(canvas) {
    if (canvas._penSurfaceBound) return;
    canvas._penSurfaceBound = true;

    let drawing = false;
    let activePointerId = null;
    const stabilizer = new LiveStrokeStabilizer(0.3, 0.38, 1.5);
    let baseSnapshot = null;
    let targetDrawCanvas = canvas;
    let lastFastPt = null;

    function restoreBaseSnapshot(ctx, cnv) {
      if (baseSnapshot) {
        ctx.putImageData(baseSnapshot, 0, 0);
      } else {
        ctx.clearRect(0, 0, cnv.width, cnv.height);
      }
    }

    canvas.addEventListener("pointerdown", (e) => {
      if (!PenState.isActive) return;

      const isActivePenModeOn = Boolean(
        window.SmartEraserEngine && window.SmartEraserEngine.fingerEraserEnabled
      );
      if (e.pointerType === "touch" && isActivePenModeOn) return;

      if (e.pointerType === "touch" && activeTouchPointers.size >= 2) {
        if (drawing) {
          if (!isFastPenType(PenState.type)) {
            restoreBaseSnapshot(targetDrawCanvas.getContext("2d"), targetDrawCanvas);
          }
          drawing = false;
          activePointerId = null;
          baseSnapshot = null;
          lastFastPt = null;
        }
        return;
      }

      if (drawing) return;

      e.stopPropagation();
      e.preventDefault();
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {}

      const rect = canvas.getBoundingClientRect();
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        (canvas.width !== Math.round(rect.width) || canvas.height !== Math.round(rect.height))
      ) {
        const temp = document.createElement("canvas");
        temp.width = canvas.width;
        temp.height = canvas.height;
        temp.getContext("2d").drawImage(canvas, 0, 0);
        canvas.width = Math.round(rect.width);
        canvas.height = Math.round(rect.height);
        canvas.getContext("2d").drawImage(temp, 0, 0, canvas.width, canvas.height);
      }

      if (PenState.type === "highlighter") {
        targetDrawCanvas = getOrCreateHighlighterLayer(canvas);
      } else {
        targetDrawCanvas = canvas;
      }
      SurfaceHistory.pushBeforeStroke(canvas);

      const startPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      if (isFastPenType(PenState.type)) {
        baseSnapshot = null;
        lastFastPt = startPt;
      } else {
        const ctx = targetDrawCanvas.getContext("2d");
        try {
          baseSnapshot = ctx.getImageData(0, 0, targetDrawCanvas.width, targetDrawCanvas.height);
        } catch (err) {
          baseSnapshot = null;
        }
        stabilizer.reset(startPt);
      }

      drawing = true;
      activePointerId = e.pointerId;
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!drawing || !PenState.isActive || e.pointerId !== activePointerId) return;

      if (e.pointerType === "touch" && activeTouchPointers.size >= 2) {
        if (!isFastPenType(PenState.type)) {
          restoreBaseSnapshot(targetDrawCanvas.getContext("2d"), targetDrawCanvas);
        }
        drawing = false;
        activePointerId = null;
        baseSnapshot = null;
        lastFastPt = null;
        return;
      }

      e.stopPropagation();
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const rawPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const ctx = targetDrawCanvas.getContext("2d");
      const exactSize = PenState.size;

      // FAST PENS: Direct Incremental Drawing (Zero-Lag on Android & Digital Boards)
      if (isFastPenType(PenState.type) && lastFastPt) {
        if (Math.hypot(rawPt.x - lastFastPt.x, rawPt.y - lastFastPt.y) < 0.6) return;
        ctx.save();
        if (PenState.type === "fast-en" || PenState.type === "fast-ur") {
          const angleDeg = PenState.type === "fast-en" ? 45 : -25;
          const angleRad = (angleDeg * Math.PI) / 180;
          const width = PenState.type === "fast-en" ? exactSize * 1.8 : exactSize * 2.2;
          const halfW = width / 2;
          const dx = Math.cos(angleRad) * halfW;
          const dy = Math.sin(angleRad) * halfW;

          ctx.fillStyle = PenState.color;
          ctx.strokeStyle = PenState.color;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(lastFastPt.x - dx, lastFastPt.y - dy);
          ctx.lineTo(lastFastPt.x + dx, lastFastPt.y + dy);
          ctx.lineTo(rawPt.x + dx, rawPt.y + dy);
          ctx.lineTo(rawPt.x - dx, rawPt.y - dy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.strokeStyle = PenState.color;
          ctx.lineWidth = exactSize;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(lastFastPt.x, lastFastPt.y);
          ctx.lineTo(rawPt.x, rawPt.y);
          ctx.stroke();
        }
        ctx.restore();
        lastFastPt = rawPt;
        return;
      }

      // STABILIZED PENS & INDEPENDENT HIGHLIGHTER
      const added = stabilizer.push(rawPt);
      if (!added && PenState.type !== "highlighter") return;

      restoreBaseSnapshot(ctx, targetDrawCanvas);
      ctx.save();

      if (PenState.type === "calligraphy-en" || PenState.type === "calligraphy-ur") {
        const angleDeg = PenState.type === "calligraphy-en" ? 45 : -25;
        const angleRad = (angleDeg * Math.PI) / 180;
        const width = PenState.type === "calligraphy-en" ? exactSize * 1.8 : exactSize * 2.2;
        const halfW = width / 2;
        const dx = Math.cos(angleRad) * halfW;
        const dy = Math.sin(angleRad) * halfW;

        const smoothedPts = stabilizer.getUltraSmoothPoints();
        ctx.fillStyle = PenState.color;
        ctx.strokeStyle = PenState.color;
        ctx.lineWidth = 0.6;

        for (let i = 1; i < smoothedPts.length; i++) {
          const p1 = smoothedPts[i - 1];
          const p2 = smoothedPts[i];
          ctx.beginPath();
          ctx.moveTo(p1.x - dx, p1.y - dy);
          ctx.lineTo(p1.x + dx, p1.y + dy);
          ctx.lineTo(p2.x + dx, p2.y + dy);
          ctx.lineTo(p2.x - dx, p2.y - dy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else if (PenState.type === "highlighter") {
        const start = stabilizer.points[0];
        let endX = rawPt.x;
        let endY = rawPt.y;
        const dx = endX - start.x;
        const dy = endY - start.y;
        if (Math.abs(dy) < Math.abs(dx) * 0.08) endY = start.y;
        else if (Math.abs(dx) < Math.abs(dy) * 0.08) endX = start.x;

        ctx.strokeStyle = hexToRgba(HighlighterState.color, HighlighterState.opacity);
        ctx.lineWidth = Math.max(6, HighlighterState.size);
        ctx.lineCap = "butt";
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      } else {
        ctx.strokeStyle = PenState.color;
        ctx.lineWidth = PenState.type === "brush" ? exactSize * 1.8 : exactSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        drawQuadraticCurveOnCtx(ctx, stabilizer.getUltraSmoothPoints());
      }

      ctx.restore();
    });

    const stopDrawing = (e) => {
      if (!drawing) return;
      if (e && e.pointerId !== undefined && e.pointerId !== activePointerId) return;
      drawing = false;
      activePointerId = null;
      stabilizer.points = [];
      baseSnapshot = null;
      lastFastPt = null;
      if (typeof window.saveCurrentPdfPageAnnotations === "function") {
        setTimeout(window.saveCurrentPdfPageAnnotations, 15);
      }
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) {}
    };

    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointercancel", stopDrawing);
  }

  let syncSurfaceScheduled = false;

  function syncSurfaceOverlays(enablePen) {
    const cursorCss = enablePen ? `url('${getCursorDataUrl()}') 8 8, crosshair` : "default";

    document.querySelectorAll(".wb-image-item").forEach((item) => {
      const inner = item.querySelector(".wb-img-inner-container") || item;
      if (window.getComputedStyle(inner).position === "static") {
        inner.style.position = "relative";
      }

      let canvas = inner.querySelector(".pen-surface-canvas");
      if (!canvas && enablePen) {
        canvas = document.createElement("canvas");
        canvas.className = "pen-surface-canvas";
        canvas.width = Math.max(inner.clientWidth, 1);
        canvas.height = Math.max(inner.clientHeight, 1);
        canvas.style.cssText =
          "position:absolute; inset:0; width:100%; height:100%; z-index:45; touch-action:none;";
        inner.appendChild(canvas);
      }

      if (canvas) {
        bindSurfaceDrawing(canvas);
        canvas.style.pointerEvents = enablePen ? "auto" : "none";
        canvas.style.cursor = cursorCss;
      }
    });

    const renderTarget = document.getElementById("renderTarget");
    if (renderTarget) {
      if (window.getComputedStyle(renderTarget).position === "static") {
        renderTarget.style.position = "relative";
      }

      const basePdfPageCanvas = Array.from(renderTarget.querySelectorAll("canvas")).find(
        (c) =>
          !c.classList.contains("pen-surface-canvas") &&
          !c.classList.contains("pen-highlighter-canvas") &&
          !c.classList.contains("iqra-math-baked-canvas")
      );

      const targetW =
        basePdfPageCanvas && basePdfPageCanvas.width > 1
          ? basePdfPageCanvas.width
          : Math.max(renderTarget.scrollWidth || renderTarget.clientWidth, 1);
      const targetH =
        basePdfPageCanvas && basePdfPageCanvas.height > 1
          ? basePdfPageCanvas.height
          : Math.max(renderTarget.scrollHeight || renderTarget.clientHeight, 1);

      let pdfCanvas = renderTarget.querySelector(".pen-surface-canvas");
      if (!pdfCanvas && enablePen) {
        pdfCanvas = document.createElement("canvas");
        pdfCanvas.className = "pen-surface-canvas";
        pdfCanvas.width = targetW;
        pdfCanvas.height = targetH;
        pdfCanvas.style.cssText = `position:absolute; top:0; left:0; width:${targetW}px; height:${targetH}px; z-index:95; touch-action:none;`;
        renderTarget.appendChild(pdfCanvas);
      } else if (pdfCanvas) {
        if (
          enablePen &&
          targetW > 1 &&
          targetH > 1 &&
          (pdfCanvas.width <= 1 || pdfCanvas.height <= 1)
        ) {
          pdfCanvas.width = targetW;
          pdfCanvas.height = targetH;
        }
        if (targetW > 1 && targetH > 1) {
          pdfCanvas.style.width = `${targetW}px`;
          pdfCanvas.style.height = `${targetH}px`;
        }
        pdfCanvas.style.zIndex = "95";
      }

      if (pdfCanvas) {
        bindSurfaceDrawing(pdfCanvas);
        pdfCanvas.style.pointerEvents = enablePen ? "auto" : "none";
        pdfCanvas.style.cursor = cursorCss;
      }

      const pdfHlCanvas = renderTarget.querySelector(".pen-highlighter-canvas");
      if (pdfHlCanvas && targetW > 1 && targetH > 1) {
        pdfHlCanvas.style.width = `${targetW}px`;
        pdfHlCanvas.style.height = `${targetH}px`;
        pdfHlCanvas.style.zIndex = "94";
      }

      const linkLayer = renderTarget.querySelector(".pdf-link-overlay-layer");
      if (linkLayer) {
        linkLayer.style.pointerEvents = enablePen ? "none" : "auto";
      }
    }
  }

  const surfaceObserver = new MutationObserver((mutations) => {
    if (!PenState.isActive || syncSurfaceScheduled) return;
    const isSelfOverlayMutation = mutations.every((m) =>
      Array.from(m.addedNodes).concat(Array.from(m.removedNodes)).every(
        (n) =>
          n.nodeType === 1 &&
          (n.classList?.contains("pen-surface-canvas") ||
            n.classList?.contains("pen-highlighter-canvas"))
      )
    );
    if (isSelfOverlayMutation) return;

    syncSurfaceScheduled = true;
    requestAnimationFrame(() => {
      syncSurfaceScheduled = false;
      if (PenState.isActive) {
        syncSurfaceOverlays(true);
      }
    });
  });
  surfaceObserver.observe(document.body, { childList: true, subtree: true });

  window.applyPenSuiteSettings = function () {
    PenState.isActive = true;
    if (typeof window !== "undefined") window.activeTool = "pen";
    const isHl = isHighlighterSelected();
    HighlighterState.isActiveMode = isHl;

    if (typeof fabricCanvas !== "undefined" && fabricCanvas) {
      if (typeof fabricCanvas.calcOffset === "function") fabricCanvas.calcOffset();
      fabricCanvas.isDrawingMode = true;
      fabricCanvas.selection = false;

      if (fabricCanvas.upperCanvasEl) {
        fabricCanvas.upperCanvasEl.style.opacity = "1";
        fabricCanvas.upperCanvasEl.style.pointerEvents = "auto";
      }

      const exactSize = PenState.size;

      if (PenState.type === "normal") {
        const smoothPen = createSmoothPenBrush(fabricCanvas, 1.0);
        smoothPen.color = PenState.color;
        smoothPen.width = exactSize;
        fabricCanvas.freeDrawingBrush = smoothPen;
      } else if (PenState.type === "calligraphy-en") {
        fabricCanvas.freeDrawingBrush = createRibbonBrush(fabricCanvas, 45);
        fabricCanvas.freeDrawingBrush.color = PenState.color;
        fabricCanvas.freeDrawingBrush.width = exactSize * 1.8;
      } else if (PenState.type === "calligraphy-ur") {
        fabricCanvas.freeDrawingBrush = createRibbonBrush(fabricCanvas, -25);
        fabricCanvas.freeDrawingBrush.color = PenState.color;
        fabricCanvas.freeDrawingBrush.width = exactSize * 2.2;
      } else if (PenState.type === "brush") {
        const smoothBrush = createSmoothPenBrush(fabricCanvas, 1.8);
        smoothBrush.color = PenState.color;
        smoothBrush.width = exactSize;
        fabricCanvas.freeDrawingBrush = smoothBrush;
      } else if (PenState.type === "highlighter") {
        const hlBrush = createStraightHighlighterBrush(fabricCanvas);
        hlBrush.color = hexToRgba(HighlighterState.color, HighlighterState.opacity);
        hlBrush.width = Math.max(6, HighlighterState.size);
        fabricCanvas.freeDrawingBrush = hlBrush;
      } else if (PenState.type === "fast-normal") {
        const fastNormal = createFastNormalBrush(fabricCanvas);
        fastNormal.color = PenState.color;
        fastNormal.width = exactSize;
        fabricCanvas.freeDrawingBrush = fastNormal;
      } else if (PenState.type === "fast-en") {
        fabricCanvas.freeDrawingBrush = createFastRibbonBrush(fabricCanvas, 45);
        fabricCanvas.freeDrawingBrush.color = PenState.color;
        fabricCanvas.freeDrawingBrush.width = exactSize * 1.8;
      } else if (PenState.type === "fast-ur") {
        fabricCanvas.freeDrawingBrush = createFastRibbonBrush(fabricCanvas, -25);
        fabricCanvas.freeDrawingBrush.color = PenState.color;
        fabricCanvas.freeDrawingBrush.width = exactSize * 2.2;
      }
    }

    syncSurfaceOverlays(true);
    updatePenPreview();
  };

  window.deactivatePenSuite = function () {
    PenState.isActive = false;
    HighlighterState.isActiveMode = false;
    mainBtn.classList.remove("active");
    if (flyout) flyout.style.display = "none";
    syncSurfaceOverlays(false);
  };

  mainBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (typeof activeTool !== "undefined") activeTool = "pen";

    document.querySelectorAll(".tool-btn[data-tool]").forEach((b) => b.classList.remove("active"));
    const isClosed = flyout.style.display === "none" || flyout.style.display === "";
    flyout.style.display = isClosed ? "flex" : "none";
    mainBtn.classList.add("active");

    window.applyPenSuiteSettings();
  });

  flyout.addEventListener("click", (e) => e.stopPropagation());

  const closePenFlyout = () => {
    if (flyout && flyout.style.display !== "none") {
      flyout.style.display = "none";
    }
  };

  if (typeof fabricCanvas !== "undefined" && fabricCanvas) {
    fabricCanvas.on("mouse:down", closePenFlyout);
    if (fabricCanvas.upperCanvasEl) {
      fabricCanvas.upperCanvasEl.addEventListener("pointerdown", closePenFlyout, { passive: true });
      fabricCanvas.upperCanvasEl.addEventListener("touchstart", closePenFlyout, { passive: true });
    }
  }

  window.addEventListener(
    "pointerdown",
    (e) => {
      if (flyout && flyout.style.display !== "none") {
        if (!penWrapper.contains(e.target)) {
          closePenFlyout();
        }
      }
    },
    true
  );

  document.addEventListener("click", (e) => {
    const otherTool = e.target.closest(".tool-btn[data-tool]");
    if (otherTool && otherTool.getAttribute("data-tool") !== "pen") {
      window.deactivatePenSuite();
    }
  });

  typeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      typeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      PenState.type = btn.getAttribute("data-pen-type");
      updatePenPreview();
      window.applyPenSuiteSettings();
    });
  });

  if (sizeSlider) {
    const applySizeChange = function (newVal) {
      const val = parseInt(newVal, 10);
      if (isNaN(val)) return;

      if (isHighlighterSelected()) {
        HighlighterState.size = Math.max(6, Math.min(48, val));
        if (hlSizeSlider) hlSizeSlider.value = String(HighlighterState.size);
        if (hlSizeDisplay) hlSizeDisplay.textContent = `${HighlighterState.size}px`;
        updatePenPreview();
        if (typeof fabricCanvas !== "undefined" && fabricCanvas && fabricCanvas.freeDrawingBrush) {
          fabricCanvas.freeDrawingBrush.width = Math.max(6, HighlighterState.size);
        }
        return;
      }

      PenState.size = val;
      updatePenPreview();

      if (typeof fabricCanvas !== "undefined" && fabricCanvas && fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.width =
          PenState.type.startsWith("calligraphy") ||
          PenState.type === "fast-en" ||
          PenState.type === "fast-ur"
            ? val * 1.8
            : val;
      }
    };

    sizeSlider.addEventListener("input", function () {
      applySizeChange(this.value);
    });
    sizeSlider.addEventListener("change", function () {
      applySizeChange(this.value);
    });

    const stopSliderInterference = function (e) {
      e.stopPropagation();
    };
    sizeSlider.addEventListener("mousedown", stopSliderInterference);
    sizeSlider.addEventListener("mousemove", stopSliderInterference);
    sizeSlider.addEventListener("touchstart", stopSliderInterference, { passive: true });
    sizeSlider.addEventListener("touchmove", stopSliderInterference, { passive: true });
    sizeSlider.addEventListener("pointerdown", stopSliderInterference);
  }

  colorDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      colorDots.forEach((d) => d.classList.remove("active"));
      dot.classList.add("active");
      const chosenColor = dot.getAttribute("data-color");

      if (isHighlighterSelected()) {
        HighlighterState.color = chosenColor;
        syncHighlighterUiValues();
        updatePenPreview();
        window.applyPenSuiteSettings();
        return;
      }

      PenState.color = chosenColor;
      if (customColorInput) customColorInput.value = PenState.color;
      updatePenPreview();
      window.applyPenSuiteSettings();
    });
  });

  if (customColorInput) {
    customColorInput.addEventListener("input", (e) => {
      if (isHighlighterSelected()) {
        HighlighterState.color = e.target.value;
        syncHighlighterUiValues();
        updatePenPreview();
        window.applyPenSuiteSettings();
        return;
      }

      colorDots.forEach((d) => d.classList.remove("active"));
      PenState.color = e.target.value;
      updatePenPreview();
      window.applyPenSuiteSettings();
    });
  }

  updatePenPreview();
})();

// 3. DYNAMIC COLOR SYNC: UPDATE DOCK COLOR CIRCLE ON SELECTION
document.addEventListener("DOMContentLoaded", () => {
  const triggerBtn = document.getElementById("colorTriggerBtn");
  if (!triggerBtn) return;

  const updateTriggerColor = (color) => {
    if (!color) return;
    if (window.IqraHighlighterState && window.IqraHighlighterState.isActiveMode) return;
    triggerBtn.style.setProperty("background-color", color, "important");
  };

  document.querySelectorAll('#colorFlyoutMenu .color-btn, [id*="color"] [data-color]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const selectedColor =
        e.currentTarget.getAttribute("data-color") || e.currentTarget.style.backgroundColor;
      updateTriggerColor(selectedColor);
    });
  });

  const customColorInput = document.getElementById("brushColor");
  if (customColorInput) {
    customColorInput.addEventListener("input", (e) => updateTriggerColor(e.target.value));
    customColorInput.addEventListener("change", (e) => updateTriggerColor(e.target.value));
  }
});

// 4. ANTI-STICK SAFETY GUARD (Prevents Fabric Pen from Ever Getting Stuck)
(function installPenAntiStickGuard() {
  let isPointerPressed = false;

  window.addEventListener(
    "pointerdown",
    () => {
      isPointerPressed = true;
    },
    true
  );

  const forceReleaseIfStuck = () => {
    isPointerPressed = false;
    if (typeof fabricCanvas !== "undefined" && fabricCanvas && fabricCanvas._isCurrentlyDrawing) {
      fabricCanvas._isCurrentlyDrawing = false;
      if (
        fabricCanvas.freeDrawingBrush &&
        typeof fabricCanvas.freeDrawingBrush.onMouseUp === "function"
      ) {
        try {
          fabricCanvas.freeDrawingBrush.onMouseUp();
        } catch (err) {}
      }
      fabricCanvas.clearContext(fabricCanvas.contextTop);
    }
  };

  window.addEventListener("pointerup", forceReleaseIfStuck, true);
  window.addEventListener("pointercancel", forceReleaseIfStuck, true);
  window.addEventListener("blur", forceReleaseIfStuck);

  window.addEventListener(
    "pointermove",
    (e) => {
      if (
        !isPointerPressed &&
        e.buttons === 0 &&
        typeof fabricCanvas !== "undefined" &&
        fabricCanvas &&
        fabricCanvas._isCurrentlyDrawing
      ) {
        forceReleaseIfStuck();
      }
    },
    true
  );
})();