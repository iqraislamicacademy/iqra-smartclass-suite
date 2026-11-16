// ========================================================
// DIVIDER APPARATUS (PDF, IMAGE & BOARD READY)
// 2-Click Smart Placement, High Z-Index Overlay,
// Multi-Host Needle Point Marking (Image/PDF Sync)
// ========================================================
(function (window) {
  "use strict";

  const DividerEngine = {
    overlayLayer: null,
    placementOverlay: null,
    dividerEl: null,
    wasDrawingModeBefore: false,
    isGlobalEventsBound: false,
    isWaitingForPlacement: false,

    // Synced real screen scale (matches Length Measure Tool)
    pxPerCm: 37.8,

    state: {
      leftNeedleX: 380,
      leftNeedleY: 340,
      spreadPx: 189, // 5.0 cm at 37.8 px/cm
      legLength: 210,
      rotAngle: 0,
      isMoving: false,
      isAdjustingSpread: false,
      isScalingTool: false,
      isRotating: false,
      startX: 0,
      startY: 0,
      startSpread: 189,
      startLegLength: 210,
      startDragX: 0,
      startDragY: 0,
      startAngleOffset: 0
    },

    init: function () {
      this.ensureLayer();
      this.ensurePlacementOverlay();
      this.bindToolbar();
      this.bindGlobalMovement();
    },

    ensureLayer: function () {
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

    ensurePlacementOverlay: function () {
      let pOverlay = document.getElementById("dividerPlacementOverlay");
      if (!pOverlay) {
        pOverlay = document.createElement("div");
        pOverlay.id = "dividerPlacementOverlay";
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

    bindToolbar: function () {
      const btn = document.querySelector('[data-math-tool="divider"]');
      const flyout = document.getElementById("mathFlyoutBox");

      if (btn) {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (flyout) flyout.classList.add("hidden");
          this.armPlacement();
        });
      }
    },

    armPlacement: function () {
      this.closeDivider();
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

      // Red needle spawns directly at clicked point on PDF, Image, or Board
      this.state.leftNeedleX = clientX;
      this.state.leftNeedleY = clientY;
      this.state.rotAngle = 0;
      this.spawnDivider();
    },

    // Multi-Host Target Detector (PDF #renderTarget -> Image .wb-img-inner-container -> Board)
    detectTargetAt: function (screenX, screenY) {
      // 1. PDF Viewer Check
      const renderTarget = document.getElementById("renderTarget");
      if (renderTarget && renderTarget.style.display !== "none" && renderTarget.offsetWidth > 0) {
        const r = renderTarget.getBoundingClientRect();
        if (screenX >= r.left && screenX <= r.right && screenY >= r.top && screenY <= r.bottom) {
          let pdfLayer = renderTarget.querySelector(".pdf-divider-host-layer");
          if (!pdfLayer) {
            pdfLayer = document.createElement("div");
            pdfLayer.className = "pdf-divider-host-layer";
            pdfLayer.style.cssText = "position:absolute; inset:0; pointer-events:none; z-index:999; overflow:visible;";
            if (window.getComputedStyle(renderTarget).position === "static") {
              renderTarget.style.position = "relative";
            }
            renderTarget.appendChild(pdfLayer);
          }
          return { type: "pdf", container: pdfLayer };
        }
      }

      // 2. Image Item Check
      const images = Array.from(document.querySelectorAll(".wb-image-item"));
      for (let i = images.length - 1; i >= 0; i--) {
        const el = images[i];
        if (el.style.display === "none") continue;
        const r = el.getBoundingClientRect();
        if (screenX >= r.left && screenX <= r.right && screenY >= r.top && screenY <= r.bottom) {
          const inner = el.querySelector(".wb-img-inner-container") || el;
          if (window.getComputedStyle(inner).position === "static") {
            inner.style.position = "relative";
          }
          return { type: "image", container: inner };
        }
      }

      // 3. Fallback Whiteboard
      const wb = document.getElementById("whiteboardContainer") ||
                 document.getElementById("canvasWrapper") ||
                 document.querySelector(".canvas-container") ||
                 document.body;
      if (window.getComputedStyle(wb).position === "static") {
        wb.style.position = "relative";
      }
      return { type: "board", container: wb };
    },

    // Punch permanent pin-point marks onto PDF, Image, or Board at both needle tips
    punchNeedleMarks: function () {
      const st = this.state;
      const n1 = { x: st.leftNeedleX, y: st.leftNeedleY };
      const n2 = {
        x: st.leftNeedleX + st.spreadPx * Math.cos(st.rotAngle),
        y: st.leftNeedleY + st.spreadPx * Math.sin(st.rotAngle)
      };

      const strokeColor = document.getElementById("brushColor") ? document.getElementById("brushColor").value : "#0f172a";
      const distLabel = `${(st.spreadPx / this.pxPerCm).toFixed(1)} cm`;

      const target = this.detectTargetAt((n1.x + n2.x) / 2, (n1.y + n2.y) / 2);
      const host = target.container;

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "geom-divider-punched-marks");
      svg.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:45; overflow:visible;";
      host.appendChild(svg);

      const rect = svg.getBoundingClientRect();
      const p1 = { x: n1.x - rect.left, y: n1.y - rect.top };
      const p2 = { x: n2.x - rect.left, y: n2.y - rect.top };

      // Helper to draw clean geometric cross/dot mark at needle point
      const drawPinPoint = (pt) => {
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", pt.x.toFixed(1));
        dot.setAttribute("cy", pt.y.toFixed(1));
        dot.setAttribute("r", "3");
        dot.setAttribute("fill", strokeColor);
        svg.appendChild(dot);

        const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        ring.setAttribute("cx", pt.x.toFixed(1));
        ring.setAttribute("cy", pt.y.toFixed(1));
        ring.setAttribute("r", "6.5");
        ring.setAttribute("fill", "none");
        ring.setAttribute("stroke", strokeColor);
        ring.setAttribute("stroke-width", "1.2");
        svg.appendChild(ring);
      };

      drawPinPoint(p1);
      drawPinPoint(p2);

      // Subtle dashed span + measurement label
      const spanLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      spanLine.setAttribute("x1", p1.x.toFixed(1));
      spanLine.setAttribute("y1", p1.y.toFixed(1));
      spanLine.setAttribute("x2", p2.x.toFixed(1));
      spanLine.setAttribute("y2", p2.y.toFixed(1));
      spanLine.setAttribute("stroke", strokeColor);
      spanLine.setAttribute("stroke-width", "1.3");
      spanLine.setAttribute("stroke-dasharray", "4,4");
      spanLine.setAttribute("opacity", "0.75");
      svg.appendChild(spanLine);

      const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      txt.setAttribute("x", ((p1.x + p2.x) / 2).toFixed(1));
      txt.setAttribute("y", (((p1.y + p2.y) / 2) - 8).toFixed(1));
      txt.setAttribute("fill", strokeColor);
      txt.setAttribute("font-size", "11");
      txt.setAttribute("font-weight", "bold");
      txt.setAttribute("font-family", "sans-serif");
      txt.setAttribute("text-anchor", "middle");
      txt.textContent = distLabel;
      svg.appendChild(txt);
    },

    spawnDivider: function () {
      this.closeDivider();

      const divEl = document.createElement("div");
      divEl.className = "real-math-divider";
      divEl.id = "realMathDivider";
      divEl.style.cssText = "position:fixed !important; top:0; left:0; width:100vw; height:100vh; pointer-events:none; z-index:10000000;";

      divEl.innerHTML = `
        <button type="button" class="divider-close-pin" id="dividerCloseAction" title="Close Divider" style="position:absolute; pointer-events:auto; cursor:pointer; z-index:60;">&times;</button>
        <div class="divider-scale-pin" id="dividerScalePin" title="Drag to Resize Divider Legs" style="position:absolute; pointer-events:auto; cursor:nwse-resize; z-index:60;"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></div>
        <button type="button" id="dividerPunchMarkBtn" title="Mark Points on PDF / Image / Board" style="position:absolute; pointer-events:auto; cursor:pointer; z-index:60; background:#0284c7; color:#fff; border:1.5px solid #fff; border-radius:12px; padding:2px 9px; font-size:10px; font-weight:700; box-shadow:0 2px 6px rgba(0,0,0,0.25); transform:translate(-50%, -50%); white-space:nowrap;">
          <i class="fa-solid fa-thumbtack"></i> Mark
        </button>
        <span class="divider-distance-badge" id="dividerDistanceBadge" style="position:absolute; pointer-events:none; z-index:60;">5.0 cm</span>
        <svg id="dividerSvgElement" style="position:absolute; top:0; left:0; width:100%; height:100%; overflow:visible; pointer-events:none;"></svg>
      `;

      this.overlayLayer.appendChild(divEl);
      this.dividerEl = divEl;

      this.renderApparatus();

      // Close Action
      divEl.querySelector("#dividerCloseAction").onclick = (e) => {
        e.stopPropagation();
        this.closeDivider();
      };

      // Mark Points Action
      divEl.querySelector("#dividerPunchMarkBtn").onclick = (e) => {
        e.stopPropagation();
        this.punchNeedleMarks();
      };

      // Scale Action
      divEl.querySelector("#dividerScalePin").onmousedown = (e) => {
        this.state.isScalingTool = true;
        this.state.startLegLength = this.state.legLength;
        this.state.startDragY = e.clientY;
        document.body.style.cursor = "nwse-resize";
        e.stopPropagation();
        e.preventDefault();
      };
    },

    renderApparatus: function () {
      if (!this.dividerEl) return;
      const st = this.state;
      const svg = this.dividerEl.querySelector("#dividerSvgElement");
      if (!svg) return;

      const n1X = st.leftNeedleX;
      const n1Y = st.leftNeedleY;
      const S = st.spreadPx;
      const L = st.legLength;

      // Right needle position
      const n2X = n1X + S * Math.cos(st.rotAngle);
      const n2Y = n1Y + S * Math.sin(st.rotAngle);

      // Top Hinge Position
      const clampedS = Math.min(S, 2 * L - 10);
      const halfSpread = Math.asin(Math.min(1, (clampedS / 2) / L));
      const H = L * Math.cos(halfSpread);

      const midX = (n1X + n2X) / 2;
      const midY = (n1Y + n2Y) / 2;

      const dx = n2X - n1X;
      const dy = n2Y - n1Y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      let perpX = -dy / dist;
      let perpY = dx / dist;

      if (perpY > 0) {
        perpX = -perpX;
        perpY = -perpY;
      }

      const hX = midX + H * perpX;
      const hY = midY + H * perpY;

      const closePin = this.dividerEl.querySelector("#dividerCloseAction");
      const scalePin = this.dividerEl.querySelector("#dividerScalePin");
      const markBtn = this.dividerEl.querySelector("#dividerPunchMarkBtn");
      const badge = this.dividerEl.querySelector("#dividerDistanceBadge");

      if (closePin) {
        closePin.style.left = hX + "px";
        closePin.style.top = (hY - 38) + "px";
      }
      if (scalePin) {
        scalePin.style.left = ((hX + n1X) / 2) + "px";
        scalePin.style.top = ((hY + n1Y) / 2) + "px";
      }
      if (markBtn) {
        markBtn.style.left = midX + "px";
        markBtn.style.top = (midY + 46) + "px";
      }
      if (badge) {
        badge.style.left = midX + "px";
        badge.style.top = (midY + 22) + "px";
        badge.textContent = `${(S / this.pxPerCm).toFixed(1)} cm`;
      }

      svg.innerHTML = `
        <defs>
          <linearGradient id="divMetal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#475569" />
            <stop offset="35%" stop-color="#f8fafc" />
            <stop offset="70%" stop-color="#cbd5e1" />
            <stop offset="100%" stop-color="#334155" />
          </linearGradient>
        </defs>

        <!-- Distance Measurement Dotted Line -->
        <line x1="${n1X}" y1="${n1Y}" x2="${n2X}" y2="${n2Y}" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.8"/>

        <!-- Leg 1: Left Steel Needle Arm -->
        <line x1="${hX}" y1="${hY}" x2="${n1X}" y2="${n1Y}" stroke="url(#divMetal)" stroke-width="8" stroke-linecap="round" />
        <circle cx="${n1X}" cy="${n1Y}" r="6" fill="#ef4444" stroke="#ffffff" stroke-width="2" style="filter:drop-shadow(0 0 6px rgba(239,68,68,0.9));" />

        <!-- Leg 2: Right Steel Needle Arm -->
        <line x1="${hX}" y1="${hY}" x2="${n2X}" y2="${n2Y}" stroke="url(#divMetal)" stroke-width="8" stroke-linecap="round" />
        <circle cx="${n2X}" cy="${n2Y}" r="6" fill="#0284c7" stroke="#ffffff" stroke-width="2" style="filter:drop-shadow(0 0 6px rgba(2,132,199,0.9));" />

        <!-- Top Hinge Group (Move Entire Divider) -->
        <g id="divHingeGroup" class="divider-interactive-el" style="pointer-events:auto; cursor:move;" title="Drag to Move Divider">
          <rect x="${hX - 4}" y="${hY - 24}" width="8" height="14" rx="2" fill="#334155" stroke="#0f172a" stroke-width="0.8" />
          <circle cx="${hX}" cy="${hY}" r="13" fill="#1e293b" stroke="#ffffff" stroke-width="2.5" />
          <circle cx="${hX}" cy="${hY}" r="5" fill="#94a3b8" />
        </g>

        <!-- Rotate Ring at Head -->
        <circle id="divRotateRing" class="divider-interactive-el" style="pointer-events:auto; cursor:grab;" cx="${hX}" cy="${hY - 14}" r="9" fill="rgba(2, 132, 199, 0.25)" stroke="#0284c7" stroke-width="1.8" title="Hold & Rotate Divider" />

        <!-- Spread Knob (Midway on right leg to adjust distance) -->
        <g id="divSpreadKnob" class="divider-interactive-el" style="pointer-events:auto; cursor:ew-resize;" transform="translate(${(hX + n2X) / 2}, ${(hY + n2Y) / 2})" title="Drag to adjust Distance (Spread)">
          <circle cx="0" cy="0" r="11" fill="#0284c7" stroke="#ffffff" stroke-width="2" />
          <path d="M -5 0 L 5 0 M -3 -3 L -5 0 L -3 3 M 3 -3 L 5 0 L 3 3" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      `;

      this.bindInteractions();
    },

    bindInteractions: function () {
      const hinge = this.dividerEl.querySelector("#divHingeGroup");
      const spread = this.dividerEl.querySelector("#divSpreadKnob");
      const rotRing = this.dividerEl.querySelector("#divRotateRing");

      if (hinge) {
        hinge.onmousedown = (e) => {
          this.state.isMoving = true;
          this.state.startX = e.clientX - this.state.leftNeedleX;
          this.state.startY = e.clientY - this.state.leftNeedleY;
          e.stopPropagation();
          e.preventDefault();
        };
      }

      if (spread) {
        spread.onmousedown = (e) => {
          this.state.isAdjustingSpread = true;
          this.state.startSpread = this.state.spreadPx;
          this.state.startDragX = e.clientX;
          document.body.style.cursor = "ew-resize";
          e.stopPropagation();
          e.preventDefault();
        };
      }

      if (rotRing) {
        rotRing.onmousedown = (e) => {
          this.state.isRotating = true;
          const currentRad = Math.atan2(e.clientY - this.state.leftNeedleY, e.clientX - this.state.leftNeedleX);
          this.state.startAngleOffset = currentRad - this.state.rotAngle;
          e.stopPropagation();
          e.preventDefault();
        };
      }
    },

    closeDivider: function () {
      if (this.placementOverlay) {
        this.placementOverlay.style.display = "none";
      }
      this.isWaitingForPlacement = false;

      if (this.dividerEl) {
        this.dividerEl.remove();
        this.dividerEl = null;
      }
      this.state.isMoving = false;
      this.state.isAdjustingSpread = false;
      this.state.isScalingTool = false;
      this.state.isRotating = false;
      document.body.style.cursor = "default";

      const hasOtherTool = document.getElementById("realMathRuler") || document.getElementById("mathProtractorWidget") || document.getElementById("realMathCompass") || document.getElementById("realMathSetSquare45");
      if (!hasOtherTool && window.fabricCanvas && this.wasDrawingModeBefore) {
        window.fabricCanvas.isDrawingMode = true;
      }
    },

    bindGlobalMovement: function () {
      if (this.isGlobalEventsBound) return;
      this.isGlobalEventsBound = true;

      window.addEventListener("mousemove", (e) => {
        if (!this.dividerEl) return;
        const st = this.state;

        if (st.isMoving) {
          st.leftNeedleX = e.clientX - st.startX;
          st.leftNeedleY = e.clientY - st.startY;
          this.renderApparatus();
        }
        else if (st.isScalingTool) {
          const deltaY = st.startDragY - e.clientY;
          let newL = st.startLegLength + deltaY;
          newL = Math.max(100, Math.min(450, newL));
          st.legLength = newL;
          this.renderApparatus();
        }
        else if (st.isAdjustingSpread) {
          const deltaX = e.clientX - st.startDragX;
          let newS = st.startSpread + deltaX;
          newS = Math.max(20, Math.min(650, newS));
          st.spreadPx = newS;
          this.renderApparatus();
        }
        else if (st.isRotating) {
          const currentRad = Math.atan2(e.clientY - st.leftNeedleY, e.clientX - st.leftNeedleX);
          st.rotAngle = currentRad - st.startAngleOffset;
          this.renderApparatus();
        }
      });

      window.addEventListener("mouseup", () => {
        if (this.state.isAdjustingSpread || this.state.isScalingTool) {
          document.body.style.cursor = "default";
        }
        this.state.isMoving = false;
        this.state.isAdjustingSpread = false;
        this.state.isScalingTool = false;
        this.state.isRotating = false;
      });
    }
  };

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => DividerEngine.init(), 350);
  });

  window.DividerEngine = DividerEngine;
})(window);