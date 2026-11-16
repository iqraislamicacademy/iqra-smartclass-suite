// ========================================================
// MATHEMATICAL RULER - DUAL METRIC ENGINE (CM TOP / INCH BOTTOM)
// 2-Click Placement, Realistic Pen Cursor, 100% Filled 56px Body
// ========================================================
(function (window) {
  "use strict";

  // Dedicated Crisp Teaching Pen Cursor (Inline SVG URI)
  const PEN_CURSOR_URL = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%230284c7' stroke='%23ffffff' stroke-width='1.5' d='M3 21l3.75-.75L19.5 7.5a2.12 2.12 0 0 0-3-3L3.75 17.25 3 21z'/%3E%3Ccircle cx='3' cy='21' r='1.5' fill='%23ef4444'/%3E%3C/svg%3E") 3 21, crosshair`;

  // Inject CSS: Transparent Edges & No Blue Hover Highlighting
  function injectNeutralEdgeStyles() {
    if (document.getElementById("ruler-neutral-edge-styles")) return;
    const style = document.createElement("style");
    style.id = "ruler-neutral-edge-styles";
    style.textContent = `
      .real-math-ruler .ruler-draw-pencil-edge,
      .real-math-ruler .ruler-draw-pencil-edge:hover,
      .real-math-ruler .ruler-draw-pencil-edge:active,
      .real-math-ruler .ruler-top-edge,
      .real-math-ruler .ruler-top-edge:hover,
      .real-math-ruler .ruler-bottom-edge,
      .real-math-ruler .ruler-bottom-edge:hover {
        background: transparent !important;
        background-color: transparent !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  const RulerEngine = {
    overlayLayer: null,
    rulerEl: null,
    placementOverlay: null,
    wasDrawingModeBefore: false,
    rulerHeight: 56,
    isGlobalEventsBound: false,
    isWaitingForPlacement: false,

    getDefaultState: function () {
      return {
        x: 180,
        y: 200,
        angle: 0,
        lengthCm: 25,
        pxPerCm: 20,
        isMoving: false,
        isRotating: false,
        isResizing: false,
        startX: 0,
        startY: 0,
        startAngleOffset: 0,
        initialLengthCm: 25,
        resizeStartClientX: 0,
        resizeStartClientY: 0
      };
    },

    rulerState: null,

    // Live Edge Drawing Session
    drawSession: {
      isDrawing: false,
      activeTarget: null,
      activeSvg: null,
      activeLineEl: null,
      startScreenX: 0,
      startScreenY: 0,
      startDist: 0,
      isBottomEdge: false
    },

    init: function () {
      injectNeutralEdgeStyles();
      this.rulerState = this.getDefaultState();
      this.setupApparatusLayer();
      this.setupPlacementOverlay();
      this.setupMenu();
      this.bindGlobalMovementEvents();
    },

    setupApparatusLayer: function () {
      let layer = document.getElementById("mathApparatusLayer");
      if (!layer) {
        layer = document.createElement("div");
        layer.id = "mathApparatusLayer";
        layer.className = "math-apparatus-layer";
        document.body.appendChild(layer);
      }
      layer.style.cssText = "position:fixed !important; top:0 !important; left:0 !important; width:100vw !important; height:100vh !important; pointer-events:none !important; z-index:9999999 !important; overflow:visible !important;";
      this.overlayLayer = layer;
    },

    setupPlacementOverlay: function () {
      let pOverlay = document.getElementById("rulerPlacementOverlay");
      if (!pOverlay) {
        pOverlay = document.createElement("div");
        pOverlay.id = "rulerPlacementOverlay";
        pOverlay.style.cssText = "position:fixed !important; inset:0 !important; width:100vw !important; height:100vh !important; z-index:99999999 !important; display:none; cursor:crosshair; touch-action:none;";
        document.body.appendChild(pOverlay);

        pOverlay.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.handlePlacementClick(e.clientX, e.clientY);
        });
      }
      this.placementOverlay = pOverlay;
    },

    setupMenu: function () {
      const masterBtn = document.getElementById("mathMasterBtn");
      const flyout = document.getElementById("mathFlyoutBox");
      const closeBtn = document.getElementById("mathCloseBtn");

      if (masterBtn && flyout) {
        masterBtn.onclick = (e) => {
          e.stopPropagation();
          const isHidden = flyout.classList.contains("hidden");
          const shapesFlyout = document.getElementById("shapesFlyoutBox");
          if (shapesFlyout) shapesFlyout.classList.add("hidden");

          flyout.classList.toggle("hidden");
          masterBtn.classList.toggle("active", !isHidden);
        };

        if (closeBtn) {
          closeBtn.onclick = () => {
            flyout.classList.add("hidden");
            masterBtn.classList.remove("active");
          };
        }

        document.addEventListener("click", (e) => {
          if (!flyout.contains(e.target) && !masterBtn.contains(e.target)) {
            flyout.classList.add("hidden");
          }
        });
      }

      const rulerBtn = document.querySelector('[data-math-tool="ruler"]');
      if (rulerBtn) {
        rulerBtn.onclick = (e) => {
          e.stopPropagation();
          if (flyout) flyout.classList.add("hidden");
          this.armPlacement();
        };
      }
    },

    armPlacement: function () {
      this.closeRuler();
      this.isWaitingForPlacement = true;
      if (this.placementOverlay) {
        this.placementOverlay.style.display = "block";
      }

      if (window.fabricCanvas) {
        this.wasDrawingModeBefore = window.fabricCanvas.isDrawingMode;
        window.fabricCanvas.isDrawingMode = false;
      }
    },

    handlePlacementClick: function (clientX, clientY) {
      this.isWaitingForPlacement = false;
      if (this.placementOverlay) {
        this.placementOverlay.style.display = "none";
      }

      const totalWidth = this.rulerState.lengthCm * this.rulerState.pxPerCm;
      this.rulerState.x = clientX - (totalWidth * 0.2);
      this.rulerState.y = clientY - (this.rulerHeight / 2);
      this.spawnRuler();
    },

    detectTargetAt: function (screenX, screenY) {
      const renderTarget = document.getElementById("renderTarget");
      if (renderTarget && renderTarget.style.display !== "none" && renderTarget.offsetWidth > 0) {
        const r = renderTarget.getBoundingClientRect();
        if (screenX >= r.left && screenX <= r.right && screenY >= r.top && screenY <= r.bottom) {
          let pdfLayer = renderTarget.querySelector(".pdf-ruler-host-layer");
          if (!pdfLayer) {
            pdfLayer = document.createElement("div");
            pdfLayer.className = "pdf-ruler-host-layer";
            pdfLayer.style.cssText = "position:absolute; inset:0; pointer-events:none; z-index:999; overflow:visible;";
            if (window.getComputedStyle(renderTarget).position === "static") {
              renderTarget.style.position = "relative";
            }
            renderTarget.appendChild(pdfLayer);
          }
          return { type: "pdf", container: pdfLayer, boundEl: renderTarget };
        }
      }

      const images = Array.from(document.querySelectorAll(".wb-image-item"));
      for (let i = images.length - 1; i >= 0; i--) {
        const el = images[i];
        if (el.style.display === "none") continue;
        const r = el.getBoundingClientRect();
        if (screenX >= r.left && screenX <= r.right && screenY >= r.top && screenY <= r.bottom) {
          const inner = el.querySelector(".wb-img-inner-container") || el;
          return { type: "image", container: inner, boundEl: inner };
        }
      }

      const wb = document.getElementById("whiteboardContainer") || 
                 document.getElementById("canvasWrapper") || 
                 document.querySelector(".canvas-container") || 
                 document.body;
      return { type: "board", container: wb, boundEl: wb };
    },

    // 100% HEIGHT 56px SVG: CM on Top, INCHES on Bottom (No blank strip!)
    renderTicksSvg: function (lengthCm, pxPerCm) {
      const totalWidth = lengthCm * pxPerCm;
      const h = this.rulerHeight; // 56px

      let ticks = `<svg style="width:100%; height:${h}px; pointer-events:none;" viewBox="0 0 ${totalWidth} ${h}">`;

      // --- 1. TOP EDGE: CENTIMETERS & MILLIMETERS ---
      for (let cm = 0; cm <= lengthCm; cm++) {
        const posX = cm * pxPerCm;
        // Major cm line (downwards from top edge 0 to 11px)
        ticks += `<line x1="${posX}" y1="0" x2="${posX}" y2="11" stroke="#0f172a" stroke-width="1.2"/>`;
        // CM Numbers
        ticks += `<text x="${posX + 2}" y="22" font-size="9" font-weight="700" fill="#0f172a" font-family="sans-serif">${cm}</text>`;

        if (cm < lengthCm) {
          for (let mm = 1; mm < 10; mm++) {
            const mmX = posX + (mm * (pxPerCm / 10));
            ticks += `<line x1="${mmX}" y1="0" x2="${mmX}" y2="${mm === 5 ? 8 : 4.5}" stroke="#475569" stroke-width="0.8"/>`;
          }
        }
      }

      // Middle Dividing Line (Thin & Elegant)
      ticks += `<line x1="0" y1="28" x2="${totalWidth}" y2="28" stroke="rgba(2, 132, 199, 0.25)" stroke-width="1" stroke-dasharray="4,4"/>`;

      // --- 2. BOTTOM EDGE: INCHES (Upwards from bottom edge 56px) ---
      const pxPerInch = pxPerCm * 2.54; // 1 inch = 2.54 cm (~50.8px)
      const maxInches = Math.floor(totalWidth / pxPerInch);

      for (let inch = 0; inch <= maxInches; inch++) {
        const posX = inch * pxPerInch;
        // Major Inch Line (from bottom 56px up to 43px)
        ticks += `<line x1="${posX}" y1="${h}" x2="${posX}" y2="${h - 13}" stroke="#0f172a" stroke-width="1.3"/>`;
        // Inch Numbers
        ticks += `<text x="${posX + 2}" y="${h - 16}" font-size="9" font-weight="700" fill="#0369a1" font-family="sans-serif">${inch}</text>`;

        if (inch < maxInches) {
          // Half-inch (1/2)
          const halfX = posX + (pxPerInch / 2);
          ticks += `<line x1="${halfX}" y1="${h}" x2="${halfX}" y2="${h - 9}" stroke="#475569" stroke-width="0.9"/>`;

          // Quarter-inches (1/4 & 3/4)
          ticks += `<line x1="${posX + pxPerInch * 0.25}" y1="${h}" x2="${posX + pxPerInch * 0.25}" y2="${h - 6}" stroke="#64748b" stroke-width="0.8"/>`;
          ticks += `<line x1="${posX + pxPerInch * 0.75}" y1="${h}" x2="${posX + pxPerInch * 0.75}" y2="${h - 6}" stroke="#64748b" stroke-width="0.8"/>`;
        }
      }

      // Labels: "cm" on Top Left, "inch" on Bottom Left
      ticks += `<text x="4" y="27" font-size="7.5" font-weight="bold" fill="#64748b" font-family="sans-serif">cm</text>`;
      ticks += `<text x="4" y="${h - 5}" font-size="7.5" font-weight="bold" fill="#0284c7" font-family="sans-serif">inch</text>`;

      ticks += `</svg>`;
      return ticks;
    },

    spawnRuler: function () {
      this.closeRuler();

      if (!this.rulerState.lengthCm || this.rulerState.lengthCm < 10) {
        this.rulerState.lengthCm = 25;
      }

      const st = this.rulerState;
      const totalWidth = st.lengthCm * st.pxPerCm;

      const ruler = document.createElement("div");
      ruler.className = "real-math-ruler";
      ruler.id = "realMathRuler";
      ruler.style.cssText = `
        position: fixed !important;
        width: ${totalWidth}px;
        height: ${this.rulerHeight}px;
        left: ${st.x}px;
        top: ${st.y}px;
        transform: rotate(${st.angle}deg);
        transform-origin: 0 0;
        pointer-events: auto;
        user-select: none;
        touch-action: none;
        z-index: 10000000;
        background: rgba(255, 255, 255, 0.92) !important;
        border: 1.5px solid #0284c7 !important;
        border-radius: 4px !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18) !important;
        overflow: visible !important;
        box-sizing: border-box !important;
      `;

      const edgeStyle = `position:absolute; left:0; width:100%; height:12px; cursor:${PEN_CURSOR_URL}; z-index:40; background:transparent !important; background-color:transparent !important; border:none !important; outline:none !important; box-shadow:none !important;`;

      ruler.innerHTML = `
        <button type="button" class="ruler-floating-close-pin" id="rulerCloseAction" title="Close Scale" style="position:absolute; top:-26px; left:-6px; cursor:pointer; z-index:50;">&times;</button>
        <div class="ruler-draw-pencil-edge ruler-top-edge" id="rulerTopEdge" data-edge="top" title="Draw Along Top Edge (CM)" style="top:-6px; ${edgeStyle}"></div>
        
        <div class="ruler-center-body" id="rulerCenterBody" style="position:relative; width:100%; height:100%; cursor:move; overflow:hidden;">
          <div id="rulerTicksContainer" style="width:100%; height:100%;">
            ${this.renderTicksSvg(st.lengthCm, st.pxPerCm)}
          </div>
          <span class="ruler-live-badge" id="rulerLiveBadge" style="display:none; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:11px; font-weight:bold; background:#0284c7; color:#fff; padding:2px 8px; border-radius:4px; box-shadow:0 2px 6px rgba(0,0,0,0.3); z-index:45;">0.0 cm</span>
        </div>

        <div class="ruler-draw-pencil-edge ruler-bottom-edge" id="rulerBottomEdge" data-edge="bottom" title="Draw Along Bottom Edge (INCH)" style="bottom:-6px; ${edgeStyle}"></div>
        <div class="ruler-right-gripper" id="rulerResizeGripper" title="Drag to Resize Length" style="position:absolute; right:-6px; top:0; width:12px; height:100%; cursor:ew-resize; z-index:40; background:transparent !important; border:none !important;"></div>
        <div class="ruler-rotate-dial" id="rulerRotateDial" title="Rotate Scale" style="position:absolute; right:-28px; top:50%; transform:translateY(-50%); width:22px; height:22px; cursor:grab; z-index:40; display:flex; align-items:center; justify-content:center; background:#ffffff; border:1.5px solid #0284c7; border-radius:50%; box-shadow:0 2px 6px rgba(0,0,0,0.2);">
          <i class="fa-solid fa-arrows-rotate" style="font-size:11px; color:#0284c7;"></i>
        </div>
      `;

      this.overlayLayer.appendChild(ruler);
      this.rulerEl = ruler;

      this.bindRulerSpecificElements(ruler);
    },

    closeRuler: function () {
      if (this.placementOverlay) {
        this.placementOverlay.style.display = "none";
      }
      this.isWaitingForPlacement = false;

      if (this.rulerEl) {
        this.rulerEl.remove();
        this.rulerEl = null;
      }
      if (this.rulerState) {
        this.rulerState.isMoving = false;
        this.rulerState.isRotating = false;
        this.rulerState.isResizing = false;
      }
      this.drawSession.isDrawing = false;
      this.drawSession.activeLineEl = null;
      this.drawSession.activeSvg = null;
      this.drawSession.activeTarget = null;
      document.body.style.cursor = "default";

      const hasOtherTool = document.getElementById("realMathProtractor") || document.getElementById("realMathCompass");
      if (!hasOtherTool && window.fabricCanvas && this.wasDrawingModeBefore) {
        window.fabricCanvas.isDrawingMode = true;
      }
    },

    bindRulerSpecificElements: function (ruler) {
      const st = this.rulerState;

      ruler.querySelector("#rulerCloseAction").onclick = (e) => {
        e.stopPropagation();
        this.closeRuler();
      };

      ruler.querySelector("#rulerCenterBody").onmousedown = (e) => {
        st.isMoving = true;
        st.startX = e.clientX - st.x;
        st.startY = e.clientY - st.y;
        e.preventDefault();
      };

      ruler.querySelector("#rulerRotateDial").onmousedown = (e) => {
        st.isRotating = true;
        const currentRad = Math.atan2(e.clientY - st.y, e.clientX - st.x);
        st.startAngleOffset = currentRad - (st.angle * Math.PI) / 180;
        e.stopPropagation();
        e.preventDefault();
      };

      ruler.querySelector("#rulerResizeGripper").onmousedown = (e) => {
        st.isResizing = true;
        st.initialLengthCm = st.lengthCm;
        st.resizeStartClientX = e.clientX;
        st.resizeStartClientY = e.clientY;
        document.body.style.cursor = "ew-resize";
        e.stopPropagation();
        e.preventDefault();
      };

      const topEdge = ruler.querySelector("#rulerTopEdge");
      const bottomEdge = ruler.querySelector("#rulerBottomEdge");

      topEdge.onmousedown = (e) => this.startEdgeDrawing(e, false);
      bottomEdge.onmousedown = (e) => this.startEdgeDrawing(e, true);
    },

    startEdgeDrawing: function (e, isBottom) {
      const st = this.rulerState;
      const ds = this.drawSession;
      const ruler = this.rulerEl;
      if (!ruler) return;

      const rad = (st.angle * Math.PI) / 180;
      const edgeOffsetY = isBottom ? this.rulerHeight : 0;

      const edgeBaseX = st.x - edgeOffsetY * Math.sin(rad);
      const edgeBaseY = st.y + edgeOffsetY * Math.cos(rad);

      const vx = e.clientX - edgeBaseX;
      const vy = e.clientY - edgeBaseY;

      const totalWidth = st.lengthCm * st.pxPerCm;
      let startDist = vx * Math.cos(rad) + vy * Math.sin(rad);
      startDist = Math.max(0, Math.min(totalWidth, startDist));

      const snapStartX = edgeBaseX + startDist * Math.cos(rad);
      const snapStartY = edgeBaseY + startDist * Math.sin(rad);

      ds.activeTarget = this.detectTargetAt(snapStartX, snapStartY);
      const host = ds.activeTarget.container;

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "geom-ruler-drawn-line");
      svg.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:45; overflow:visible;";
      host.appendChild(svg);
      ds.activeSvg = svg;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      const strokeColor = document.getElementById("brushColor") ? document.getElementById("brushColor").value : "#1e293b";
      const strokeWidth = document.getElementById("brushSize") ? parseInt(document.getElementById("brushSize").value, 10) : 2.5;

      const targetRect = ds.activeTarget.boundEl.getBoundingClientRect();
      const localX1 = snapStartX - targetRect.left;
      const localY1 = snapStartY - targetRect.top;

      line.setAttribute("x1", localX1.toFixed(1));
      line.setAttribute("y1", localY1.toFixed(1));
      line.setAttribute("x2", localX1.toFixed(1));
      line.setAttribute("y2", localY1.toFixed(1));
      line.setAttribute("stroke", strokeColor);
      line.setAttribute("stroke-width", strokeWidth.toString());
      line.setAttribute("stroke-linecap", "round");
      svg.appendChild(line);

      ds.isDrawing = true;
      ds.activeLineEl = line;
      ds.startScreenX = snapStartX;
      ds.startScreenY = snapStartY;
      ds.startDist = startDist;
      ds.isBottomEdge = isBottom;

      document.body.style.cursor = PEN_CURSOR_URL;

      const badge = ruler.querySelector("#rulerLiveBadge");
      if (badge) {
        badge.style.display = "inline-block";
        badge.textContent = isBottom ? "0.0 in" : "0.0 cm";
      }

      e.stopPropagation();
      e.preventDefault();
    },

    bindGlobalMovementEvents: function () {
      if (this.isGlobalEventsBound) return;
      this.isGlobalEventsBound = true;

      window.addEventListener("mousemove", (e) => {
        if (!this.rulerEl || !this.rulerState) return;
        const st = this.rulerState;
        const ruler = this.rulerEl;
        const ds = this.drawSession;

        if (st.isMoving) {
          st.x = e.clientX - st.startX;
          st.y = e.clientY - st.startY;
          ruler.style.left = st.x + "px";
          ruler.style.top = st.y + "px";
        }
        else if (st.isRotating) {
          const currentRad = Math.atan2(e.clientY - st.y, e.clientX - st.x);
          st.angle = ((currentRad - st.startAngleOffset) * 180) / Math.PI;
          ruler.style.transform = `rotate(${st.angle}deg)`;
        }
        else if (st.isResizing) {
          const rad = (st.angle * Math.PI) / 180;
          const dx = e.clientX - st.resizeStartClientX;
          const dy = e.clientY - st.resizeStartClientY;
          const projectedDelta = dx * Math.cos(rad) + dy * Math.sin(rad);
          const deltaCm = Math.round(projectedDelta / st.pxPerCm);

          let newLengthCm = st.initialLengthCm + deltaCm;
          newLengthCm = Math.max(10, Math.min(50, newLengthCm));

          if (newLengthCm !== st.lengthCm) {
            st.lengthCm = newLengthCm;
            const newTotalWidth = st.lengthCm * st.pxPerCm;
            ruler.style.width = newTotalWidth + "px";

            const ticksBox = ruler.querySelector("#rulerTicksContainer");
            if (ticksBox) {
              ticksBox.innerHTML = this.renderTicksSvg(st.lengthCm, st.pxPerCm);
            }
          }
        }
        else if (ds.isDrawing && ds.activeLineEl && ds.activeTarget) {
          const badge = ruler.querySelector("#rulerLiveBadge");
          const rad = (st.angle * Math.PI) / 180;
          const edgeOffsetY = ds.isBottomEdge ? this.rulerHeight : 0;

          const edgeBaseX = st.x - edgeOffsetY * Math.sin(rad);
          const edgeBaseY = st.y + edgeOffsetY * Math.cos(rad);

          const vx = e.clientX - edgeBaseX;
          const vy = e.clientY - edgeBaseY;

          const totalWidth = st.lengthCm * st.pxPerCm;
          let currentDist = vx * Math.cos(rad) + vy * Math.sin(rad);
          currentDist = Math.max(0, Math.min(totalWidth, currentDist));

          const snapEndX = edgeBaseX + currentDist * Math.cos(rad);
          const snapEndY = edgeBaseY + currentDist * Math.sin(rad);

          const targetRect = ds.activeTarget.boundEl.getBoundingClientRect();
          const localX2 = snapEndX - targetRect.left;
          const localY2 = snapEndY - targetRect.top;

          ds.activeLineEl.setAttribute("x2", localX2.toFixed(1));
          ds.activeLineEl.setAttribute("y2", localY2.toFixed(1));

          if (badge) {
            const drawnLengthPx = Math.abs(currentDist - ds.startDist);
            if (ds.isBottomEdge) {
              const pxPerInch = st.pxPerCm * 2.54;
              const drawnInch = (drawnLengthPx / pxPerInch).toFixed(1);
              badge.textContent = `${drawnInch} in`;
            } else {
              const drawnCm = (drawnLengthPx / st.pxPerCm).toFixed(1);
              badge.textContent = `${drawnCm} cm`;
            }
          }
        }
      });

      window.addEventListener("mouseup", () => {
        if (this.rulerState) {
          if (this.rulerState.isResizing) {
            document.body.style.cursor = "default";
          }
          this.rulerState.isMoving = false;
          this.rulerState.isRotating = false;
          this.rulerState.isResizing = false;
        }

        const ds = this.drawSession;
        if (ds.isDrawing) {
          ds.isDrawing = false;
          ds.activeLineEl = null;
          ds.activeSvg = null;
          ds.activeTarget = null;
          document.body.style.cursor = "default";

          if (this.rulerEl) {
            const badge = this.rulerEl.querySelector("#rulerLiveBadge");
            if (badge) badge.style.display = "none";
          }
        }
      });
    }
  };

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => RulerEngine.init(), 150);
  });

  window.RulerEngine = RulerEngine;
})(window);