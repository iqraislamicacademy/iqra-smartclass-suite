// ========================================================
// MATHEMATICAL PROTRACTOR WIDGET (ZERO-DRIFT MULTI-HOST)
// 100% True-Origin Snapping (Image, PDF, Board)
// Anti-Clash Dual Tracks (Slate Outer & Green Inner)
// ========================================================
(function (window) {
  "use strict";

  const ProtractorWidget = {
    domElement: null,
    placementOverlay: null,
    baseRadius: 195,
    scale: 1.0,
    
    // Dual Angles State
    angleRight: 45,
    angleLeft: 74,

    activeDraggingArm: null,
    isDraggingWidget: false,
    isResizing: false,
    is360Active: false,
    isWaitingForPlacement: false,

    init: function () {
      this.ensurePlacementOverlay();
      this.bindToolbar();
    },

    ensurePlacementOverlay: function () {
      let pOverlay = document.getElementById("protractorPlacementOverlay");
      if (!pOverlay) {
        pOverlay = document.createElement("div");
        pOverlay.id = "protractorPlacementOverlay";
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
      document.addEventListener("click", (e) => {
        const btn = e.target.closest('[data-math-tool="protractor"]');
        if (btn) {
          e.stopPropagation();
          const flyout = document.getElementById("mathFlyoutBox");
          if (flyout) flyout.classList.add("hidden");
          this.armPlacement();
        }
      });
    },

    armPlacement: function () {
      if (this.domElement) {
        this.destroy();
        return;
      }
      this.isWaitingForPlacement = true;
      if (this.placementOverlay) {
        this.placementOverlay.style.display = "block";
      }

      if (window.fabricCanvas) {
        window.fabricCanvas.isDrawingMode = false;
      }
    },

    handlePlacementClick: function (clientX, clientY) {
      this.isWaitingForPlacement = false;
      if (this.placementOverlay) {
        this.placementOverlay.style.display = "none";
      }

      const R = this.baseRadius;
      const width = R * 2 + 60;
      const cyOffset = R + 30;

      const posX = clientX - width / 2;
      const posY = clientY - cyOffset;

      this.createWidget(posX, posY);
    },

    detectTargetAt: function (screenX, screenY) {
      // 1. PDF Window Check
      const renderTarget = document.getElementById("renderTarget");
      if (renderTarget && renderTarget.style.display !== "none" && renderTarget.offsetWidth > 0) {
        const r = renderTarget.getBoundingClientRect();
        if (screenX >= r.left && screenX <= r.right && screenY >= r.top && screenY <= r.bottom) {
          let pdfLayer = renderTarget.querySelector(".pdf-protractor-host-layer");
          if (!pdfLayer) {
            pdfLayer = document.createElement("div");
            pdfLayer.className = "pdf-protractor-host-layer";
            pdfLayer.style.cssText = "position:absolute; inset:0; pointer-events:none; z-index:999; overflow:visible;";
            if (window.getComputedStyle(renderTarget).position === "static") {
              renderTarget.style.position = "relative";
            }
            renderTarget.appendChild(pdfLayer);
          }
          return { type: "pdf", container: pdfLayer };
        }
      }

      // 2. Image Check
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

      // 3. Fallback Whiteboard Canvas / Container
      const wb = document.getElementById("whiteboardContainer") || 
                 document.getElementById("canvasWrapper") || 
                 document.querySelector(".canvas-container") || 
                 document.body;
      if (window.getComputedStyle(wb).position === "static") {
        wb.style.position = "relative";
      }
      return { type: "board", container: wb };
    },

    createWidget: function (x, y) {
      const existing = document.getElementById("mathProtractorWidget");
      if (existing) existing.remove();

      const R = this.baseRadius;
      const width = R * 2 + 60;
      const height = R * 2 + 65;

      const wrapper = document.createElement("div");
      wrapper.id = "mathProtractorWidget";
      wrapper.style.cssText = `
        position: fixed !important;
        left: ${x}px;
        top: ${y}px;
        width: ${width}px;
        height: ${height}px;
        z-index: 9999999;
        user-select: none;
        touch-action: none;
        transform-origin: center center;
      `;

      wrapper.innerHTML = this.buildHTML(width, height);
      document.body.appendChild(wrapper);
      this.domElement = wrapper;

      this.bindEvents();
      this.updatePositions();
    },

    buildHTML: function (width, height) {
      const R = this.baseRadius;
      const cx = width / 2;
      const cy = R + 30;

      const outerNumR = R - 22;
      const dividerArcR = R - 36;
      const innerNumR = R - 50;
      const innerBorderR = R - 64;

      let topTicksSVG = "";
      let topOuterNumbersSVG = "";
      let topInnerNumbersSVG = "";

      for (let deg = 0; deg <= 180; deg++) {
        const rad = (deg * Math.PI) / 180;
        let tickLen = 5;
        let strokeW = 0.8;
        let color = "#64748b";

        if (deg % 10 === 0) {
          tickLen = 13;
          strokeW = 1.5;
          color = "#0f172a";

          const otx = cx + outerNumR * Math.cos(rad);
          const oty = cy - outerNumR * Math.sin(rad);
          topOuterNumbersSVG += `
            <text x="${otx}" y="${oty}" font-size="8" font-family="sans-serif" font-weight="700" fill="#1e293b" text-anchor="middle" dominant-baseline="middle">${deg}°</text>
          `;

          const innerDeg = 180 - deg;
          const itx = cx + innerNumR * Math.cos(rad);
          const ity = cy - innerNumR * Math.sin(rad);
          topInnerNumbersSVG += `
            <text x="${itx}" y="${ity}" font-size="8" font-family="sans-serif" font-weight="700" fill="#047857" text-anchor="middle" dominant-baseline="middle">${innerDeg}°</text>
          `;
        } else if (deg % 5 === 0) {
          tickLen = 8;
          strokeW = 1.1;
          color = "#334155";
        }

        const x1 = cx + R * Math.cos(rad);
        const y1 = cy - R * Math.sin(rad);
        const x2 = cx + (R - tickLen) * Math.cos(rad);
        const y2 = cy - (R - tickLen) * Math.sin(rad);

        topTicksSVG += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round" />`;
      }

      let botTicksSVG = "";
      let botOuterNumbersSVG = "";
      let botInnerNumbersSVG = "";

      for (let deg = 181; deg < 360; deg++) {
        const rad = (deg * Math.PI) / 180;
        let tickLen = 5;
        let strokeW = 0.8;
        let color = "#64748b";

        if (deg % 10 === 0) {
          tickLen = 13;
          strokeW = 1.5;
          color = "#0f172a";

          const otx = cx + outerNumR * Math.cos(rad);
          const oty = cy - outerNumR * Math.sin(rad);
          botOuterNumbersSVG += `
            <text x="${otx}" y="${oty}" font-size="8" font-family="sans-serif" font-weight="700" fill="#1e293b" text-anchor="middle" dominant-baseline="middle">${deg}°</text>
          `;

          const innerDeg = 540 - deg;
          const itx = cx + innerNumR * Math.cos(rad);
          const ity = cy - innerNumR * Math.sin(rad);
          botInnerNumbersSVG += `
            <text x="${itx}" y="${ity}" font-size="8" font-family="sans-serif" font-weight="700" fill="#047857" text-anchor="middle" dominant-baseline="middle">${innerDeg}°</text>
          `;
        } else if (deg % 5 === 0) {
          tickLen = 8;
          strokeW = 1.1;
          color = "#334155";
        }

        const x1 = cx + R * Math.cos(rad);
        const y1 = cy - R * Math.sin(rad);
        const x2 = cx + (R - tickLen) * Math.cos(rad);
        const y2 = cy - (R - tickLen) * Math.sin(rad);

        botTicksSVG += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round" />`;
      }

      const sectorRightD = this.getSectorPathRight(cx, cy, innerBorderR, this.angleRight);
      const sectorLeftD = this.getSectorPathLeft(cx, cy, innerBorderR, this.angleLeft);

      return `
        <div style="position: relative; width: 100%; height: 100%;">
          <svg id="protractorSVG" width="${width}" height="${height}" style="overflow:visible; filter: drop-shadow(0 14px 28px rgba(15,23,42,0.16)); cursor: move;">
            
            <!-- 360° LOWER REFLEX DIAL -->
            <g id="lowerProtractorDial" style="opacity: 0; transform: translateY(-15px); transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease; pointer-events: none;">
              <path d="M ${cx - R} ${cy} A ${R} ${R} 0 0 0 ${cx + R} ${cy} Z" 
                    fill="rgba(240, 249, 255, 0.88)" 
                    stroke="#38bdf8" 
                    stroke-width="1.8" />
              <path d="M ${cx - dividerArcR} ${cy} A ${dividerArcR} ${dividerArcR} 0 0 0 ${cx + dividerArcR} ${cy}" 
                    fill="none" stroke="rgba(2, 132, 199, 0.35)" stroke-width="1" stroke-dasharray="3,3" />
              <path d="M ${cx - innerBorderR} ${cy} A ${innerBorderR} ${innerBorderR} 0 0 0 ${cx + innerBorderR} ${cy}" 
                    fill="none" 
                    stroke="#38bdf8" 
                    stroke-width="1.6" />
              ${botTicksSVG}
              ${botOuterNumbersSVG}
              ${botInnerNumbersSVG}
            </g>

            <!-- TOP STANDARD DIAL -->
            <path d="M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy} Z" 
                  fill="rgba(240, 249, 255, 0.88)" 
                  stroke="#38bdf8" 
                  stroke-width="1.8" />

            <path d="M ${cx - dividerArcR} ${cy} A ${dividerArcR} ${dividerArcR} 0 0 1 ${cx + dividerArcR} ${cy}" 
                  fill="none" stroke="rgba(2, 132, 199, 0.35)" stroke-width="1" stroke-dasharray="3,3" />

            <path d="M ${cx - innerBorderR} ${cy} A ${innerBorderR} ${innerBorderR} 0 0 1 ${cx + innerBorderR} ${cy}" 
                  fill="none" stroke="#38bdf8" stroke-width="1.6" />

            <path id="angleSectorFillRight" d="${sectorRightD}" fill="rgba(2, 132, 199, 0.2)" stroke="none" />
            <path id="angleSectorFillLeft" d="${sectorLeftD}" fill="rgba(16, 185, 129, 0.2)" stroke="none" />

            ${topTicksSVG}
            ${topOuterNumbersSVG}
            ${topInnerNumbersSVG}

            <!-- Straight Baseline -->
            <line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="#0f172a" stroke-width="1.6" />

            <!-- 1. RIGHT ARM -->
            <line id="protractorArmRight" x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy}" stroke="#ea580c" stroke-width="2.6" stroke-linecap="round" />
            <circle id="armHandleRight" cx="${cx}" cy="${cy}" r="8" fill="#ea580c" stroke="#ffffff" stroke-width="2" style="cursor: grab;" title="Right Arm Drag" />

            <!-- 2. LEFT ARM -->
            <line id="protractorArmLeft" x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy}" stroke="#059669" stroke-width="2.6" stroke-linecap="round" />
            <circle id="armHandleLeft" cx="${cx}" cy="${cy}" r="8" fill="#059669" stroke="#ffffff" stroke-width="2" style="cursor: grab;" title="Left Arm Drag" />

            <!-- Center Origin Markaz -->
            <g id="centerOriginGroup">
              <line x1="${cx - 14}" y1="${cy}" x2="${cx + 14}" y2="${cy}" stroke="#0284c7" stroke-width="1.2" />
              <line x1="${cx}" y1="${cy - 14}" x2="${cx}" y2="${cy + 14}" stroke="#0284c7" stroke-width="1.2" />
              <circle cx="${cx}" cy="${cy}" r="8" fill="rgba(255, 255, 255, 0.45)" stroke="#0284c7" stroke-width="1.5" />
              <circle id="protractorCenterDot" cx="${cx}" cy="${cy}" r="2.2" fill="#ef4444" />
            </g>

            <!-- Close Button -->
            <g id="btnCloseProtractor" transform="translate(${cx - 11}, ${cy - R - 22})" style="cursor: pointer;" title="Close">
              <circle cx="11" cy="11" r="11" fill="#fee2e2" stroke="#fca5a5" stroke-width="1.4" />
              <line x1="8" y1="8" x2="14" y2="14" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" />
              <line x1="14" y1="8" x2="8" y2="14" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" />
            </g>

            <!-- Resize Gripper -->
            <g id="btnResizeProtractor" transform="translate(${cx + R - 2}, ${cy - 8})" style="cursor: se-resize;" title="Drag to Resize">
              <circle cx="9" cy="9" r="9" fill="#0f766e" stroke="#ffffff" stroke-width="1.5" />
              <path d="M 5 9 L 13 9" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round"/>
              <polyline points="7,7 5,9 7,11" stroke="#ffffff" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline points="11,7 13,9 11,11" stroke="#ffffff" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
          </svg>

          <!-- ORANGE RIGHT ARM ORBIT CLUSTER -->
          <div id="orbitClusterRight" style="position: absolute; pointer-events: auto; display: flex; flex-direction: column; align-items: center; gap: 3px; transform: translate(-50%, -50%); z-index: 20; transition: transform 0.05s linear;">
            <div id="badgeRight" style="background: rgba(255,255,255,0.96); border: 1.5px solid #ea580c; border-radius: 6px; padding: 1px 7px; font-size: 11px; font-weight: 800; color: #ea580c; box-shadow: 0 2px 6px rgba(0,0,0,0.12); white-space:nowrap;">
              R: ${this.angleRight}°
            </div>
            <button id="btnDrawRight" type="button" title="Draw Right Angle" style="background: #ea580c; color: #ffffff; border: none; border-radius: 14px; padding: 3px 8px; font-size: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 3px 8px rgba(234,88,12,0.4); white-space: nowrap;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              Draw R
            </button>
          </div>

          <!-- GREEN LEFT ARM ORBIT CLUSTER -->
          <div id="orbitClusterLeft" style="position: absolute; pointer-events: auto; display: flex; flex-direction: column; align-items: center; gap: 3px; transform: translate(-50%, -50%); z-index: 20; transition: transform 0.05s linear;">
            <div id="badgeLeft" style="background: rgba(255,255,255,0.96); border: 1.5px solid #059669; border-radius: 6px; padding: 1px 7px; font-size: 11px; font-weight: 800; color: #059669; box-shadow: 0 2px 6px rgba(0,0,0,0.12); white-space:nowrap;">
              L: ${this.angleLeft}°
            </div>
            <button id="btnDrawLeft" type="button" title="Draw Left Angle" style="background: #059669; color: #ffffff; border: none; border-radius: 14px; padding: 3px 8px; font-size: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 3px 8px rgba(5,150,105,0.4); white-space: nowrap;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              Draw L
            </button>
          </div>

          <!-- 360° TOGGLE BUTTON -->
          <button id="btnToggle360Dial" type="button" 
                  title="Open lower part to measure 180° to 360°"
                  style="position: absolute; left: 50%; transform: translateX(-50%); top: ${cy + 16}px; background: #ffffff; border: 1.5px solid #0284c7; border-radius: 20px; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #0284c7; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(2, 132, 199, 0.15); transition: all 0.2s ease; white-space: nowrap; z-index: 30;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m6 9 6 6 6-6"/>
            </svg>
            <span id="lbl360Btn">Expand 360° (Lower Part)</span>
          </button>
        </div>
      `;
    },

    getSectorPathRight: function (cx, cy, innerR, deg) {
      if (deg <= 0) return "";
      const rad = (deg * Math.PI) / 180;
      const xEnd = cx + innerR * Math.cos(rad);
      const yEnd = cy - innerR * Math.sin(rad);

      const largeArcFlag = deg > 180 ? 1 : 0;
      return `M ${cx} ${cy} L ${cx + innerR} ${cy} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${xEnd} ${yEnd} Z`;
    },

    getSectorPathLeft: function (cx, cy, innerR, deg) {
      if (deg <= 0) return "";
      const targetDeg = 180 - deg;
      const rad = (targetDeg * Math.PI) / 180;
      const xEnd = cx + innerR * Math.cos(rad);
      const yEnd = cy - innerR * Math.sin(rad);

      const largeArcFlag = deg > 180 ? 1 : 0;
      return `M ${cx} ${cy} L ${cx - innerR} ${cy} A ${innerR} ${innerR} 0 ${largeArcFlag} 1 ${xEnd} ${yEnd} Z`;
    },

    updatePositions: function () {
      if (!this.domElement) return;

      const R = this.baseRadius;
      const width = R * 2 + 60;
      const cx = width / 2;
      const cy = R + 30;
      const innerBorderR = R - 64;

      // 1. Right Arm Position & Orbit Cluster
      const radR = (this.angleRight * Math.PI) / 180;
      const armXR = cx + (R - 5) * Math.cos(radR);
      const armYR = cy - (R - 5) * Math.sin(radR);

      const armRight = this.domElement.querySelector("#protractorArmRight");
      const handleRight = this.domElement.querySelector("#armHandleRight");
      const sectorRight = this.domElement.querySelector("#angleSectorFillRight");
      const clusterRight = this.domElement.querySelector("#orbitClusterRight");
      const badgeRight = this.domElement.querySelector("#badgeRight");

      if (armRight) { armRight.setAttribute("x2", armXR); armRight.setAttribute("y2", armYR); }
      if (handleRight) { handleRight.setAttribute("cx", armXR); handleRight.setAttribute("cy", armYR); }
      if (sectorRight) sectorRight.setAttribute("d", this.getSectorPathRight(cx, cy, innerBorderR, this.angleRight));
      if (badgeRight) badgeRight.innerText = `R: ${this.angleRight}°`;

      if (clusterRight) {
        const orbitDistR = R * 0.48;
        const clXR = cx + orbitDistR * Math.cos(radR);
        const clYR = cy - orbitDistR * Math.sin(radR);
        clusterRight.style.left = `${clXR}px`;
        clusterRight.style.top = `${clYR}px`;
      }

      // 2. Left Arm Position & Orbit Cluster
      const actualDegL = 180 - this.angleLeft;
      const radL = (actualDegL * Math.PI) / 180;
      const armXL = cx + (R - 5) * Math.cos(radL);
      const armYL = cy - (R - 5) * Math.sin(radL);

      const armLeft = this.domElement.querySelector("#protractorArmLeft");
      const handleLeft = this.domElement.querySelector("#armHandleLeft");
      const sectorLeft = this.domElement.querySelector("#angleSectorFillLeft");
      const clusterLeft = this.domElement.querySelector("#orbitClusterLeft");
      const badgeLeft = this.domElement.querySelector("#badgeLeft");

      if (armLeft) { armLeft.setAttribute("x2", armXL); armLeft.setAttribute("y2", armYL); }
      if (handleLeft) { handleLeft.setAttribute("cx", armXL); handleLeft.setAttribute("cy", armYL); }
      if (sectorLeft) sectorLeft.setAttribute("d", this.getSectorPathLeft(cx, cy, innerBorderR, this.angleLeft));
      if (badgeLeft) badgeLeft.innerText = `L: ${this.angleLeft}°`;

      if (clusterLeft) {
        const orbitDistL = R * 0.48;
        const clXL = cx + orbitDistL * Math.cos(radL);
        const clYL = cy - orbitDistL * Math.sin(radL);
        clusterLeft.style.left = `${clXL}px`;
        clusterLeft.style.top = `${clYL}px`;
      }
    },

    bindEvents: function () {
      const widget = this.domElement;
      if (!widget) return;

      const svg = widget.querySelector("#protractorSVG");
      const handleRight = widget.querySelector("#armHandleRight");
      const handleLeft = widget.querySelector("#armHandleLeft");
      const btnClose = widget.querySelector("#btnCloseProtractor");
      const btnDrawRight = widget.querySelector("#btnDrawRight");
      const btnDrawLeft = widget.querySelector("#btnDrawLeft");
      const btnResize = widget.querySelector("#btnResizeProtractor");
      const btn360 = widget.querySelector("#btnToggle360Dial");
      const lowerDial = widget.querySelector("#lowerProtractorDial");
      const lbl360 = widget.querySelector("#lbl360Btn");

      btnClose.onclick = (e) => {
        e.stopPropagation();
        this.destroy();
      };

      // 360° Reflex Toggle
      btn360.onclick = (e) => {
        e.stopPropagation();
        this.is360Active = !this.is360Active;

        if (this.is360Active) {
          lowerDial.style.opacity = "1";
          lowerDial.style.transform = "translateY(0px)";
          lowerDial.style.pointerEvents = "auto";
          btn360.style.background = "#0284c7";
          btn360.style.color = "#ffffff";
          lbl360.innerText = "180° Half";
        } else {
          lowerDial.style.opacity = "0";
          lowerDial.style.transform = "translateY(-15px)";
          lowerDial.style.pointerEvents = "none";
          btn360.style.background = "#ffffff";
          btn360.style.color = "#0284c7";
          lbl360.innerText = "360° Dial";

          if (this.angleRight > 180) this.angleRight = 180;
          if (this.angleLeft > 180) this.angleLeft = 180;
          this.updatePositions();
        }
      };

      // Live Arm Orbit
      const onArmMove = (clientX, clientY) => {
        const centerDot = widget.querySelector("#protractorCenterDot") || widget.querySelector("#centerOriginGroup");
        const dotRect = centerDot.getBoundingClientRect();
        const cx = dotRect.left + dotRect.width / 2;
        const cy = dotRect.top + dotRect.height / 2;

        const dx = clientX - cx;
        const dy = cy - clientY;

        let deg = 0;

        if (!this.is360Active) {
          if (dy <= 0) {
            deg = dx < 0 ? 180 : 0;
          } else {
            let rad = Math.atan2(dy, dx);
            deg = Math.round((rad * 180) / Math.PI);
            if (deg < 0) deg = 0;
            if (deg > 180) deg = 180;
          }
        } else {
          let rad = Math.atan2(dy, dx);
          deg = Math.round((rad * 180) / Math.PI);
          if (deg < 0) deg += 360;
        }

        if (this.activeDraggingArm === "right") {
          this.angleRight = deg;
        } else if (this.activeDraggingArm === "left") {
          let lAngle = 180 - deg;
          if (lAngle < 0) lAngle += 360;
          this.angleLeft = lAngle;
        }
        this.updatePositions();
      };

      handleRight.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.activeDraggingArm = "right";
      });

      handleLeft.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.activeDraggingArm = "left";
      });

      // Resize
      let initialMouseDist = 0;
      let initialScale = 1.0;

      btnResize.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.isResizing = true;
        const centerDot = widget.querySelector("#protractorCenterDot") || widget.querySelector("#centerOriginGroup");
        const dotRect = centerDot.getBoundingClientRect();
        const centerPtX = dotRect.left + dotRect.width / 2;
        const centerPtY = dotRect.top + dotRect.height / 2;
        initialMouseDist = Math.hypot(e.clientX - centerPtX, e.clientY - centerPtY);
        initialScale = this.scale;
      });

      window.addEventListener("mousemove", (e) => {
        if (this.activeDraggingArm) {
          onArmMove(e.clientX, e.clientY);
        } else if (this.isResizing) {
          const centerDot = widget.querySelector("#protractorCenterDot") || widget.querySelector("#centerOriginGroup");
          const dotRect = centerDot.getBoundingClientRect();
          const centerPtX = dotRect.left + dotRect.width / 2;
          const centerPtY = dotRect.top + dotRect.height / 2;
          const currentDist = Math.hypot(e.clientX - centerPtX, e.clientY - centerPtY);

          let newScale = initialScale * (currentDist / (initialMouseDist || 1));
          if (newScale < 0.6) newScale = 0.6;
          if (newScale > 2.0) newScale = 2.0;

          this.scale = newScale;
          widget.style.transform = `scale(${this.scale})`;
        }
      });

      window.addEventListener("mouseup", () => {
        this.activeDraggingArm = null;
        this.isResizing = false;
      });

      // Move Whole Widget
      let startX, startY, origX, origY;
      widget.addEventListener("mousedown", (e) => {
        if (
          e.target.closest("#armHandleRight") ||
          e.target.closest("#armHandleLeft") ||
          e.target.closest("button") ||
          e.target.closest("#btnCloseProtractor") ||
          e.target.closest("#btnResizeProtractor")
        ) return;

        this.isDraggingWidget = true;
        startX = e.clientX;
        startY = e.clientY;
        origX = widget.offsetLeft;
        origY = widget.offsetTop;
      });

      window.addEventListener("mousemove", (e) => {
        if (this.isDraggingWidget) {
          widget.style.left = `${origX + (e.clientX - startX)}px`;
          widget.style.top = `${origY + (e.clientY - startY)}px`;
        }
      });

      window.addEventListener("mouseup", () => {
        this.isDraggingWidget = false;
      });

      if (btnDrawRight) {
        btnDrawRight.onclick = (e) => {
          e.stopPropagation();
          this.drawSingleAngle("right");
        };
      }

      if (btnDrawLeft) {
        btnDrawLeft.onclick = (e) => {
          e.stopPropagation();
          this.drawSingleAngle("left");
        };
      }
    },

    // 100% Zero-Offset Accurate Drawing Engine
    drawSingleAngle: function (side) {
      const widget = this.domElement;
      if (!widget) return;

      // 1. Get Exact True Physical Screen Coordinates of Red Markaz Dot
      const centerDot = widget.querySelector("#protractorCenterDot") || widget.querySelector("#centerOriginGroup");
      const dotRect = centerDot.getBoundingClientRect();
      const screenCenterX = dotRect.left + dotRect.width / 2;
      const screenCenterY = dotRect.top + dotRect.height / 2;

      // 2. Identify Target Layer
      const target = this.detectTargetAt(screenCenterX, screenCenterY);
      const host = target.container;

      // 3. Create Dedicated Permanent SVG Layer
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "geom-protractor-drawn-angle");
      svg.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:45; overflow:visible;";
      host.appendChild(svg);

      // 4. Zero-Drift Matrix Mapping: Direct SVG Screen Origin Subtraction
      const svgRect = svg.getBoundingClientRect();
      const originX = screenCenterX - svgRect.left;
      const originY = screenCenterY - svgRect.top;
      const armLen = 190 * this.scale;

      if (side === "right") {
        const degR = this.angleRight;
        const radR = (degR * Math.PI) / 180;

        // Base Line (Right side)
        this.appendSvgLine(svg, originX, originY, originX + armLen, originY, "#0f172a", 2.2);

        // Angled Line
        const rEndX = originX + armLen * Math.cos(radR);
        const rEndY = originY - armLen * Math.sin(radR);
        this.appendSvgLine(svg, originX, originY, rEndX, rEndY, "#ea580c", 2.2);

        // Arc (Orange)
        const arcR = 38 * this.scale;
        const ptsR = [];
        const stepsR = Math.max(12, Math.round(degR / 10));
        for (let i = 0; i <= stepsR; i++) {
          const a = (radR * i) / stepsR;
          ptsR.push(`${(originX + arcR * Math.cos(a)).toFixed(1)},${(originY - arcR * Math.sin(a)).toFixed(1)}`);
        }
        this.appendSvgPolyline(svg, ptsR.join(" "), "#ea580c", 1.8);

        // Label
        const lblDistR = arcR + 18;
        const lblXR = originX + lblDistR * Math.cos(radR / 2);
        const lblYR = originY - lblDistR * Math.sin(radR / 2);
        this.appendSvgText(svg, lblXR, lblYR, `${degR}°`, "#ea580c");
      }
      else if (side === "left") {
        const degL = this.angleLeft;
        const actualDegL = 180 - degL;
        const radL = (actualDegL * Math.PI) / 180;

        // Base Line (Left side)
        this.appendSvgLine(svg, originX, originY, originX - armLen, originY, "#0f172a", 2.2);

        // Angled Line (Left to Right)
        const lEndX = originX + armLen * Math.cos(radL);
        const lEndY = originY - armLen * Math.sin(radL);
        this.appendSvgLine(svg, originX, originY, lEndX, lEndY, "#059669", 2.2);

        // Arc (Green)
        const arcR = 38 * this.scale;
        const ptsL = [];
        const stepsL = Math.max(12, Math.round(degL / 10));
        for (let i = 0; i <= stepsL; i++) {
          const a = Math.PI - ((degL * Math.PI / 180) * i / stepsL);
          ptsL.push(`${(originX + arcR * Math.cos(a)).toFixed(1)},${(originY - arcR * Math.sin(a)).toFixed(1)}`);
        }
        this.appendSvgPolyline(svg, ptsL.join(" "), "#059669", 1.8);

        // Label
        const midRadL = ((180 - degL / 2) * Math.PI) / 180;
        const lblDistL = arcR + 18;
        const lblXL = originX + lblDistL * Math.cos(midRadL);
        const lblYL = originY - lblDistL * Math.sin(midRadL);
        this.appendSvgText(svg, lblXL, lblYL, `${degL}°`, "#059669");
      }
    },

    appendSvgLine: function (svg, x1, y1, x2, y2, color, w) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1.toFixed(1));
      line.setAttribute("y1", y1.toFixed(1));
      line.setAttribute("x2", x2.toFixed(1));
      line.setAttribute("y2", y2.toFixed(1));
      line.setAttribute("stroke", color);
      line.setAttribute("stroke-width", w.toString());
      line.setAttribute("stroke-linecap", "round");
      svg.appendChild(line);
    },

    appendSvgPolyline: function (svg, pointsStr, color, w) {
      const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      poly.setAttribute("points", pointsStr);
      poly.setAttribute("stroke", color);
      poly.setAttribute("stroke-width", w.toString());
      poly.setAttribute("fill", "none");
      poly.setAttribute("stroke-linecap", "round");
      svg.appendChild(poly);
    },

    appendSvgText: function (svg, x, y, text, color) {
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", x.toFixed(1));
      t.setAttribute("y", y.toFixed(1));
      t.setAttribute("fill", color);
      t.setAttribute("font-size", "13");
      t.setAttribute("font-weight", "bold");
      t.setAttribute("font-family", "Arial, sans-serif");
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("dominant-baseline", "middle");
      t.textContent = text;
      svg.appendChild(t);
    },

    destroy: function () {
      if (this.placementOverlay) {
        this.placementOverlay.style.display = "none";
      }
      this.isWaitingForPlacement = false;

      if (this.domElement) {
        this.domElement.remove();
        this.domElement = null;
      }
      this.activeDraggingArm = null;
      this.isDraggingWidget = false;
      this.isResizing = false;
    }
  };

  window.addEventListener("DOMContentLoaded", () => {
    ProtractorWidget.init();
  });

  window.ProtractorWidget = ProtractorWidget;
})(window);