// ========================================================
// COMPASS APPARATUS (ZERO-JUMP FIXED SCREEN COORDINATE SYSTEM)
// Multi-Host Engine: Board, Image (.wb-image-item), PDF (#renderTarget)
// ========================================================
(function (window) {
  "use strict";

  const CompassEngine = {
    overlayLayer: null,
    compassEl: null,
    placementOverlay: null,
    wasDrawingModeBefore: false,
    isGlobalEventsBound: false,
    isWaitingForPlacement: false,

    pxPerCm: 20,

    state: {
      needleX: 380,
      needleY: 340,
      radiusPx: 100,
      legLength: 150,
      rotAngle: 0.3,
      isMoving: false,
      isAdjustingRadius: false,
      isScalingTool: false,
      isDrawingArc: false,
      startX: 0,
      startY: 0,
      startRadius: 100,
      startLegLength: 150,
      startDragX: 0,
      startDragY: 0,
      lastAngle: 0
    },

    activeTarget: null,
    activeSvgLayer: null,
    activePolylineEl: null,
    drawnPoints: [],

    init: function () {
      this.ensureApparatusLayer();
      this.ensurePlacementOverlay();
      this.bindToolbar();
      this.bindGlobalMovement();
    },

    ensureApparatusLayer: function () {
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
      let pOverlay = document.getElementById("compassPlacementOverlay");
      if (!pOverlay) {
        pOverlay = document.createElement("div");
        pOverlay.id = "compassPlacementOverlay";
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
      const btn = document.querySelector('[data-math-tool="compass"]');
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
      this.closeCompass();
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

      this.state.needleX = clientX;
      this.state.needleY = clientY;
      this.spawnCompass();
    },

    // 100% BULLETPROOF TARGET DETECTION
    detectTargetAt: function (screenX, screenY) {
      // 1. PDF Window Direct Bounding Check (#renderTarget)
      const renderTarget = document.getElementById("renderTarget");
      if (renderTarget && renderTarget.style.display !== "none" && renderTarget.offsetWidth > 0) {
        const r = renderTarget.getBoundingClientRect();
        if (screenX >= r.left && screenX <= r.right && screenY >= r.top && screenY <= r.bottom) {
          // PDF ke liye ek dedicated top-level annotation wrapper ensure karein
          let pdfLayer = renderTarget.querySelector(".pdf-compass-host-layer");
          if (!pdfLayer) {
            pdfLayer = document.createElement("div");
            pdfLayer.className = "pdf-compass-host-layer";
            pdfLayer.style.cssText = "position:absolute; inset:0; pointer-events:none; z-index:999; overflow:visible;";
            if (window.getComputedStyle(renderTarget).position === "static") {
              renderTarget.style.position = "relative";
            }
            renderTarget.appendChild(pdfLayer);
          }
          return { type: "pdf", container: pdfLayer, boundEl: renderTarget };
        }
      }

      // 2. Image Check (.wb-image-item)
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

      // 3. Fallback Whiteboard Canvas / Container
      const wb = document.getElementById("whiteboardContainer") || 
                 document.getElementById("canvasWrapper") || 
                 document.querySelector(".canvas-container") || 
                 document.body;
      return { type: "board", container: wb, boundEl: wb };
    },

    spawnCompass: function () {
      this.closeCompass();

      const compass = document.createElement("div");
      compass.className = "real-math-compass";
      compass.id = "realMathCompass";
      compass.style.cssText = "position:fixed; inset:0; width:100vw; height:100vh; pointer-events:none; overflow:visible;";

      compass.innerHTML = `
        <button type="button" class="compass-close-pin" id="compassCloseAction" title="Close Compass" style="position:fixed; pointer-events:auto; z-index:20; cursor:pointer;">&times;</button>
        <div class="compass-scale-pin" id="compassScalePin" title="Drag to Resize Compass Size" style="position:fixed; pointer-events:auto; z-index:20; cursor:nwse-resize;"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></div>
        <span class="compass-radius-badge" id="compassRadiusBadge" style="position:fixed; pointer-events:none; z-index:20;">5.0 cm</span>
        <svg id="compassSvgElement" style="position:fixed; top:0; left:0; width:100vw; height:100vh; overflow:visible; pointer-events:none;"></svg>
      `;

      this.overlayLayer.appendChild(compass);
      this.compassEl = compass;

      this.renderApparatus();

      compass.querySelector("#compassCloseAction").onclick = (e) => {
        e.stopPropagation();
        this.closeCompass();
      };

      compass.querySelector("#compassScalePin").onmousedown = (e) => {
        this.state.isScalingTool = true;
        this.state.startLegLength = this.state.legLength;
        this.state.startDragY = e.clientY;
        document.body.style.cursor = "nwse-resize";
        e.stopPropagation();
        e.preventDefault();
      };
    },

    renderApparatus: function () {
      if (!this.compassEl) return;
      const st = this.state;
      const svg = this.compassEl.querySelector("#compassSvgElement");
      if (!svg) return;

      const nX = st.needleX;
      const nY = st.needleY;
      const R = st.radiusPx;
      const L = st.legLength;

      const pX = nX + R * Math.cos(st.rotAngle);
      const pY = nY + R * Math.sin(st.rotAngle);

      const clampedR = Math.min(R, 2 * L - 10);
      const halfSpread = Math.asin(Math.min(1, (clampedR / 2) / L));
      const H = L * Math.cos(halfSpread);

      const midX = (nX + pX) / 2;
      const midY = (nY + pY) / 2;

      const dx = pX - nX;
      const dy = pY - nY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      let perpX = -dy / dist;
      let perpY = dx / dist;

      if (perpY > 0) {
        perpX = -perpX;
        perpY = -perpY;
      }

      const hX = midX + H * perpX;
      const hY = midY + H * perpY;

      const closePin = this.compassEl.querySelector("#compassCloseAction");
      const scalePin = this.compassEl.querySelector("#compassScalePin");
      const badge = this.compassEl.querySelector("#compassRadiusBadge");

      if (closePin) {
        closePin.style.left = (hX - 25) + "px";
        closePin.style.top = (hY - 25) + "px";
      }
      if (scalePin) {
        scalePin.style.left = (hX + 25) + "px";
        scalePin.style.top = (hY - 25) + "px";
      }
      if (badge) {
        badge.style.left = hX + "px";
        badge.style.top = (hY - 48) + "px";
        badge.textContent = `R: ${(R / this.pxPerCm).toFixed(1)} cm`;
      }

      const pencilLegAngle = (Math.atan2(pY - hY, pX - hX) * 180 / Math.PI) - 90;

      svg.innerHTML = `
        <defs>
          <linearGradient id="cmpMetal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#475569" />
            <stop offset="35%" stop-color="#f8fafc" />
            <stop offset="70%" stop-color="#cbd5e1" />
            <stop offset="100%" stop-color="#334155" />
          </linearGradient>

          <linearGradient id="cmpWood" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#d97706" />
            <stop offset="30%" stop-color="#fbbf24" />
            <stop offset="60%" stop-color="#fef08a" />
            <stop offset="85%" stop-color="#f59e0b" />
            <stop offset="100%" stop-color="#b45309" />
          </linearGradient>

          <linearGradient id="cmpCone" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#d4a373" />
            <stop offset="50%" stop-color="#faedcd" />
            <stop offset="100%" stop-color="#bc6c25" />
          </linearGradient>

          <linearGradient id="cmpBrass" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#854d0e" />
            <stop offset="50%" stop-color="#fde047" />
            <stop offset="100%" stop-color="#a16207" />
          </linearGradient>
        </defs>

        <line x1="${hX}" y1="${hY}" x2="${nX}" y2="${nY}" stroke="url(#cmpMetal)" stroke-width="8" stroke-linecap="round" />
        <circle cx="${nX}" cy="${nY}" r="6" fill="#ef4444" stroke="#ffffff" stroke-width="2" style="filter:drop-shadow(0 0 6px rgba(239,68,68,0.9));" />

        <line x1="${hX}" y1="${hY}" x2="${pX}" y2="${pY}" stroke="url(#cmpMetal)" stroke-width="8" stroke-linecap="round" />

        <g transform="translate(${pX}, ${pY}) rotate(${pencilLegAngle})">
          <rect x="-6" y="-85" width="12" height="70" rx="1" fill="url(#cmpWood)" stroke="#78350f" stroke-width="0.8" />
          <line x1="-2" y1="-85" x2="-2" y2="-15" stroke="#fef08a" stroke-width="0.8" opacity="0.9" />
          <line x1="2" y1="-85" x2="2" y2="-15" stroke="#b45309" stroke-width="0.8" opacity="0.9" />
          <rect x="-6" y="-95" width="12" height="10" fill="#94a3b8" stroke="#475569" stroke-width="0.6" />
          <line x1="-6" y1="-91" x2="6" y2="-91" stroke="#334155" stroke-width="0.8" />
          <path d="M -6 -95 Q 0 -103 6 -95 Z" fill="#f43f5e" />
          <polygon points="-6,-15 6,-15 0,0" fill="url(#cmpCone)" stroke="#a16207" stroke-width="0.5" />
          <polygon points="-2.5,-6 2.5,-6 0,0" fill="#0f172a" />
          <rect x="-9" y="-55" width="18" height="14" rx="2" fill="url(#cmpBrass)" stroke="#713f12" stroke-width="0.8" />
          <circle cx="11" cy="-48" r="4.5" fill="#ca8a04" stroke="#713f12" stroke-width="0.8" />
        </g>

        <g id="svgHingeGroup" style="pointer-events:auto; cursor:move;" title="Drag to Move Compass">
          <rect x="${hX - 4}" y="${hY - 24}" width="8" height="14" rx="2" fill="#334155" stroke="#0f172a" stroke-width="0.8" />
          <circle cx="${hX}" cy="${hY}" r="13" fill="#1e293b" stroke="#ffffff" stroke-width="2.5" />
          <circle cx="${hX}" cy="${hY}" r="5" fill="#94a3b8" />
        </g>

        <g id="svgSpreadKnob" transform="translate(${(hX + pX) / 2}, ${(hY + pY) / 2})" style="pointer-events:auto; cursor:ew-resize;" title="Drag to adjust Radius">
          <circle cx="0" cy="0" r="10" fill="#0284c7" stroke="#ffffff" stroke-width="2" />
          <path d="M -5 0 L 5 0 M -3 -3 L -5 0 L -3 3 M 3 -3 L 5 0 L 3 3" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
        </g>

        <circle id="svgPencilTipRing" cx="${pX}" cy="${pY}" r="14" fill="rgba(249, 115, 22, 0.4)" stroke="#ea580c" stroke-width="2.5" style="pointer-events:auto; cursor:crosshair;" title="Hold & Rotate to Draw Circle" />
      `;

      this.bindInteractions();
    },

    bindInteractions: function () {
      const hinge = this.compassEl.querySelector("#svgHingeGroup");
      const spread = this.compassEl.querySelector("#svgSpreadKnob");
      const tip = this.compassEl.querySelector("#svgPencilTipRing");

      if (hinge) {
        hinge.onmousedown = (e) => {
          this.state.isMoving = true;
          this.state.startX = e.clientX - this.state.needleX;
          this.state.startY = e.clientY - this.state.needleY;
          e.stopPropagation();
          e.preventDefault();
        };
      }

      if (spread) {
        spread.onmousedown = (e) => {
          this.state.isAdjustingRadius = true;
          this.state.startRadius = this.state.radiusPx;
          this.state.startDragX = e.clientX;
          document.body.style.cursor = "ew-resize";
          e.stopPropagation();
          e.preventDefault();
        };
      }

      if (tip) {
        tip.onmousedown = (e) => {
          this.state.isDrawingArc = true;

          const nX = this.state.needleX;
          const nY = this.state.needleY;

          // Target Detection
          this.activeTarget = this.detectTargetAt(nX, nY);
          const host = this.activeTarget.container;

          // SVG Layer Creation
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("class", "geom-compass-drawn-arc");
          svg.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:100; overflow:visible;";
          host.appendChild(svg);
          this.activeSvgLayer = svg;

          const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
          const strokeColor = document.getElementById("brushColor") ? document.getElementById("brushColor").value : "#0284c7";
          const strokeWidth = document.getElementById("brushSize") ? parseInt(document.getElementById("brushSize").value, 10) : 2.5;

          polyline.setAttribute("stroke", strokeColor);
          polyline.setAttribute("stroke-width", strokeWidth.toString());
          polyline.setAttribute("fill", "none");
          polyline.setAttribute("stroke-linecap", "round");
          polyline.setAttribute("stroke-linejoin", "round");
          svg.appendChild(polyline);
          this.activePolylineEl = polyline;

          const currentAngle = Math.atan2(e.clientY - nY, e.clientX - nX);
          this.state.rotAngle = currentAngle;
          this.state.lastAngle = currentAngle;

          const currentPencilX = nX + this.state.radiusPx * Math.cos(currentAngle);
          const currentPencilY = nY + this.state.radiusPx * Math.sin(currentAngle);

          // EXACT ZERO DRIFT
          const targetRect = this.activeTarget.boundEl.getBoundingClientRect();
          const localX = currentPencilX - targetRect.left;
          const localY = currentPencilY - targetRect.top;

          this.drawnPoints = [`${localX.toFixed(1)},${localY.toFixed(1)}`];
          polyline.setAttribute("points", this.drawnPoints.join(" "));

          e.stopPropagation();
          e.preventDefault();
        };
      }
    },

    closeCompass: function () {
      if (this.placementOverlay) {
        this.placementOverlay.style.display = "none";
      }
      this.isWaitingForPlacement = false;

      if (this.compassEl) {
        this.compassEl.remove();
        this.compassEl = null;
      }
      this.state.isMoving = false;
      this.state.isAdjustingRadius = false;
      this.state.isScalingTool = false;
      this.state.isDrawingArc = false;
      document.body.style.cursor = "default";

      const hasOtherTool = document.getElementById("realMathRuler") || document.getElementById("realMathProtractor");
      if (!hasOtherTool && window.fabricCanvas && this.wasDrawingModeBefore) {
        window.fabricCanvas.isDrawingMode = true;
      }
    },

    bindGlobalMovement: function () {
      if (this.isGlobalEventsBound) return;
      this.isGlobalEventsBound = true;

      window.addEventListener("mousemove", (e) => {
        if (!this.compassEl) return;
        const st = this.state;

        // 1. Move Tool
        if (st.isMoving) {
          st.needleX = e.clientX - st.startX;
          st.needleY = e.clientY - st.startY;
          this.renderApparatus();
        }
        // 2. Scale Size
        else if (st.isScalingTool) {
          const deltaY = st.startDragY - e.clientY;
          let newL = st.startLegLength + deltaY;
          newL = Math.max(100, Math.min(240, newL));
          st.legLength = newL;
          this.renderApparatus();
        }
        // 3. Adjust Radius Spread
        else if (st.isAdjustingRadius) {
          const deltaX = e.clientX - st.startDragX;
          let newR = st.startRadius + deltaX;
          newR = Math.max(25, Math.min(st.legLength * 1.9, newR));
          st.radiusPx = newR;
          this.renderApparatus();
        }
        // 4. Draw Circle Arc with 0px Exact Screen Mapping
        else if (st.isDrawingArc && this.activePolylineEl && this.activeTarget) {
          const nX = st.needleX;
          const nY = st.needleY;
          const targetRect = this.activeTarget.boundEl.getBoundingClientRect();

          const currentAngle = Math.atan2(e.clientY - nY, e.clientX - nX);

          let delta = currentAngle - st.lastAngle;
          while (delta < -Math.PI) delta += 2 * Math.PI;
          while (delta > Math.PI) delta -= 2 * Math.PI;

          const numSteps = Math.max(1, Math.ceil(Math.abs(delta) / 0.04));
          const stepAngle = delta / numSteps;

          for (let i = 1; i <= numSteps; i++) {
            const interAngle = st.lastAngle + stepAngle * i;
            const px = nX + st.radiusPx * Math.cos(interAngle);
            const py = nY + st.radiusPx * Math.sin(interAngle);

            const localX = px - targetRect.left;
            const localY = py - targetRect.top;
            this.drawnPoints.push(`${localX.toFixed(1)},${localY.toFixed(1)}`);
          }

          st.lastAngle = currentAngle;
          st.rotAngle = currentAngle;
          this.renderApparatus();

          this.activePolylineEl.setAttribute("points", this.drawnPoints.join(" "));
        }
      });

      window.addEventListener("mouseup", () => {
        if (this.state.isAdjustingRadius || this.state.isScalingTool) {
          document.body.style.cursor = "default";
        }
        if (this.state.isDrawingArc) {
          this.state.isDrawingArc = false;
          this.activePolylineEl = null;
          this.activeSvgLayer = null;
          this.activeTarget = null;
          this.drawnPoints = [];
        }
        this.state.isMoving = false;
        this.state.isAdjustingRadius = false;
        this.state.isScalingTool = false;
      });
    }
  };

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => CompassEngine.init(), 250);
  });

  window.CompassEngine = CompassEngine;
})(window);