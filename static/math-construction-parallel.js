// ========================================================
// GEOMETRIC CONCEPT: PARALLEL LINES & TRANSVERSAL (8 ANGLES)
// Multi-Host SVG Engine (PDF, Image & Board Ready)
// Dynamic Title Placement (Left/Right Auto-Shift) + Clean Math
// ========================================================
(function (window) {
  "use strict";

  const ParallelLineEngine = {
    isActive: false,
    points: [], // [A, B, T1, T2] in screen coordinates
    guideDots: [],
    guideToast: null,
    clickOverlay: null,
    activeHost: null,
    activeSvg: null,

    pencilCursor: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%230284c7\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z\"/><path d=\"m15 5 4 4\"/></svg>') 2 22, crosshair",

    init: function () {
      this.ensureClickOverlay();
      this.bindToolbar();
    },

    ensureClickOverlay: function () {
      let overlay = document.getElementById("parallelConstructionOverlay");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "parallelConstructionOverlay";
        overlay.style.cssText = `
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 99999999 !important;
          display: none;
          touch-action: none;
          background: transparent;
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener("pointerdown", (e) => {
          if (!this.isActive) return;
          e.stopPropagation();
          e.preventDefault();
          this.handleScreenClick(e.clientX, e.clientY);
        });
      }
      this.clickOverlay = overlay;
    },

    detectTargetAt: function (screenX, screenY) {
      // 1. PDF Viewer Check (#renderTarget)
      const renderTarget = document.getElementById("renderTarget");
      if (renderTarget && renderTarget.style.display !== "none" && renderTarget.offsetWidth > 0) {
        const r = renderTarget.getBoundingClientRect();
        if (screenX >= r.left && screenX <= r.right && screenY >= r.top && screenY <= r.bottom) {
          let pdfLayer = renderTarget.querySelector(".pdf-parallel-host-layer");
          if (!pdfLayer) {
            pdfLayer = document.createElement("div");
            pdfLayer.className = "pdf-parallel-host-layer";
            pdfLayer.style.cssText = "position:absolute; inset:0; pointer-events:none; z-index:999; overflow:visible;";
            if (window.getComputedStyle(renderTarget).position === "static") {
              renderTarget.style.position = "relative";
            }
            renderTarget.appendChild(pdfLayer);
          }
          return { type: "pdf", container: pdfLayer };
        }
      }

      // 2. Uploaded Image Check (.wb-image-item)
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

      // 3. Whiteboard Fallback
      const wb = document.getElementById("whiteboardContainer") ||
                 document.getElementById("canvasWrapper") ||
                 document.querySelector(".canvas-container") ||
                 document.body;
      if (window.getComputedStyle(wb).position === "static") {
        wb.style.position = "relative";
      }
      return { type: "board", container: wb };
    },

    bindToolbar: function () {
      const targetSelector = '#btnGeomParallel, [data-math-tool="parallel_line"], [data-geom-tool="parallel"], [data-math-tool="parallel"]';

      const attachListener = () => {
        const btn = document.querySelector(targetSelector);
        const flyout = document.getElementById("mathFlyoutBox") || document.querySelector(".math-instruments-panel");

        if (btn) {
          btn.onclick = (e) => {
            e.stopPropagation();
            if (flyout) flyout.classList.add("hidden");
            this.startConstruction();
          };
        }
      };

      attachListener();

      document.addEventListener("click", (e) => {
        const btn = e.target.closest(targetSelector);
        if (btn) {
          e.stopPropagation();
          const flyout = document.getElementById("mathFlyoutBox") || document.querySelector(".math-instruments-panel");
          if (flyout) flyout.classList.add("hidden");
          this.startConstruction();
        }
      });
    },

    startConstruction: function () {
      this.reset();
      this.isActive = true;

      if (window.fabricCanvas) {
        window.fabricCanvas.selection = false;
        window.fabricCanvas.isDrawingMode = false;
      }

      if (this.clickOverlay) {
        this.clickOverlay.style.cursor = this.pencilCursor;
        this.clickOverlay.style.display = "block";
      }

      this.showToast("Step 1/3: Click to place Point A of Line AB", 1);
    },

    createSvgEl: function (tag, attrs) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      for (const [k, v] of Object.entries(attrs || {})) {
        el.setAttribute(k, v);
      }
      return el;
    },

    toLocalPt: function (screenPt) {
      if (!this.activeSvg) return screenPt;
      const rect = this.activeSvg.getBoundingClientRect();
      return {
        x: Math.round(screenPt.x - rect.left),
        y: Math.round(screenPt.y - rect.top)
      };
    },

    handleScreenClick: function (clientX, clientY) {
      if (!this.isActive) return;

      // First click locks the target host (PDF, Image, or Board) so the entire construction stays together!
      if (this.points.length === 0) {
        const target = this.detectTargetAt(clientX, clientY);
        this.activeHost = target.container;

        const svg = this.createSvgEl("svg", {
          class: "geom-parallel-construction-svg"
        });
        svg.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:48; overflow:visible;";
        this.activeHost.appendChild(svg);
        this.activeSvg = svg;
      }

      const localPt = this.toLocalPt({ x: clientX, y: clientY });
      this.points.push(localPt);

      if (this.points.length === 1) {
        this.markPoint(localPt);
        this.showToast("Step 1/3: Click Point B (Draws Line AB and slides Line CD)", 1);
      } else if (this.points.length === 2) {
        this.markPoint(localPt);
        this.drawABAndAnimateCD();
      } else if (this.points.length === 3) {
        this.markPoint(localPt);
        this.showToast("Step 3/3: Click Transversal END point (Crosses both lines)", 3);
      } else if (this.points.length === 4) {
        this.markPoint(localPt);
        this.executeTransversalMath();
      }
    },

    markPoint: function (pt) {
      if (!this.activeSvg) return;
      const dot = this.createSvgEl("circle", {
        cx: pt.x,
        cy: pt.y,
        r: "4.5",
        fill: "#ef4444"
      });
      this.guideDots.push(dot);
      this.activeSvg.appendChild(dot);
    },

    drawABAndAnimateCD: function () {
      if (!this.activeSvg) return;

      const A = this.points[0];
      const B = this.points[1];

      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const len = Math.hypot(dx, dy) || 1;
      const ext = 50;

      const x1 = A.x - (dx / len) * ext;
      const y1 = A.y - (dy / len) * ext;
      const x2 = B.x + (dx / len) * ext;
      const y2 = B.y + (dy / len) * ext;

      // 1. Line AB
      const groupAB = this.buildArrowedLineGroup(x1, y1, x2, y2, "#ef4444", "A", "B", A, B);
      this.activeSvg.appendChild(groupAB);

      // 2. Line CD Animated Group
      const targetOffsetY = 135;
      const groupCD = this.buildArrowedLineGroup(x1, y1, x2, y2, "#ef4444", "C", "D", A, B);
      this.activeSvg.appendChild(groupCD);

      const startTime = performance.now();
      const duration = 600;

      const animateSlide = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // EaseOutQuad
        const ease = 1 - (1 - progress) * (1 - progress);
        const currentOffset = targetOffsetY * ease;

        groupCD.setAttribute("transform", `translate(0, ${currentOffset.toFixed(1)})`);

        if (progress < 1) {
          requestAnimationFrame(animateSlide);
        } else {
          this.showToast("Step 2/3: Click Transversal STARTING point (t)", 2);
        }
      };

      requestAnimationFrame(animateSlide);
    },

    buildArrowedLineGroup: function (x1, y1, x2, y2, color, lblL, lblR, ptL, ptR) {
      const g = this.createSvgEl("g");

      const line = this.createSvgEl("line", {
        x1: x1.toFixed(1),
        y1: y1.toFixed(1),
        x2: x2.toFixed(1),
        y2: y2.toFixed(1),
        stroke: color,
        "stroke-width": "2.2",
        "stroke-linecap": "round"
      });

      const ang = Math.atan2(y2 - y1, x2 - x1);
      const arrL = this.buildArrowHead(x1, y1, ang, true, color);
      const arrR = this.buildArrowHead(x2, y2, ang, false, color);

      const tL = this.createSvgEl("text", {
        x: ptL.x,
        y: ptL.y + 22,
        "font-size": "13",
        "font-weight": "bold",
        "font-family": "Arial, sans-serif",
        fill: color
      });
      tL.textContent = lblL;

      const tR = this.createSvgEl("text", {
        x: ptR.x,
        y: ptR.y + 22,
        "font-size": "13",
        "font-weight": "bold",
        "font-family": "Arial, sans-serif",
        fill: color
      });
      tR.textContent = lblR;

      g.appendChild(line);
      g.appendChild(arrL);
      g.appendChild(arrR);
      g.appendChild(tL);
      g.appendChild(tR);

      return g;
    },

    buildArrowHead: function (x, y, angle, isStart, color) {
      const arrowLength = 12;
      const spread = 0.45;
      const baseAngle = isStart ? angle : angle + Math.PI;

      const p1x = (x + arrowLength * Math.cos(baseAngle - spread)).toFixed(1);
      const p1y = (y + arrowLength * Math.sin(baseAngle - spread)).toFixed(1);
      const p2x = x.toFixed(1);
      const p2y = y.toFixed(1);
      const p3x = (x + arrowLength * Math.cos(baseAngle + spread)).toFixed(1);
      const p3y = (y + arrowLength * Math.sin(baseAngle + spread)).toFixed(1);

      return this.createSvgEl("polyline", {
        points: `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}`,
        stroke: color,
        "stroke-width": "2.2",
        fill: "none",
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      });
    },

    executeTransversalMath: function () {
      if (!this.activeSvg) return;

      const A = this.points[0];
      const B = this.points[1];
      const targetOffsetY = 135;
      const C = { x: A.x, y: A.y + targetOffsetY };
      const D = { x: B.x, y: B.y + targetOffsetY };

      const T1 = this.points[2];
      const T2 = this.points[3];

      // Remove temporary click guide dots
      this.guideDots.forEach(dot => dot.remove());
      this.guideDots = [];

      // Transversal Vector & Coordinates
      const tDx = T2.x - T1.x;
      const tDy = T2.y - T1.y;
      const tLen = Math.hypot(tDx, tDy) || 1;
      const tAng = Math.atan2(tDy, tDx);

      const tExt = 50;
      const tStartX = T1.x - (tDx / tLen) * tExt;
      const tStartY = T1.y - (tDy / tLen) * tExt;
      const tEndX = T2.x + (tDx / tLen) * tExt;
      const tEndY = T2.y + (tDy / tLen) * tExt;

      const tLine = this.createSvgEl("line", {
        x1: tStartX.toFixed(1),
        y1: tStartY.toFixed(1),
        x2: tEndX.toFixed(1),
        y2: tEndY.toFixed(1),
        stroke: "#0284c7",
        "stroke-width": "2.4",
        "stroke-linecap": "round"
      });

      const arrT1 = this.buildArrowHead(tStartX, tStartY, tAng, true, "#0284c7");
      const arrT2 = this.buildArrowHead(tEndX, tEndY, tAng, false, "#0284c7");

      // Label t placement
      const labelT = this.createSvgEl("text", {
        x: (tStartX + 14).toFixed(1),
        y: (tStartY + 4).toFixed(1),
        "font-size": "18",
        "font-weight": "bold",
        "font-family": "serif",
        "font-style": "italic",
        fill: "#0284c7"
      });
      labelT.textContent = "t";

      this.activeSvg.appendChild(tLine);
      this.activeSvg.appendChild(arrT1);
      this.activeSvg.appendChild(arrT2);
      this.activeSvg.appendChild(labelT);

      // Math Intersections
      const int1 = this.lineIntersection(A, B, T1, T2);
      const int2 = this.lineIntersection(C, D, T1, T2);

      // Angle Calculations
      const angBase = Math.atan2(B.y - A.y, B.x - A.x);
      let diff = tAng - angBase;
      while (diff < 0) diff += Math.PI;
      while (diff >= Math.PI) diff -= Math.PI;

      let acuteRad = diff;
      if (acuteRad > Math.PI / 2) acuteRad = Math.PI - acuteRad;

      let acuteDeg = Math.round((acuteRad * 180) / Math.PI);
      if (acuteDeg < 10) acuteDeg = 25;
      let obtuseDeg = 180 - acuteDeg;

      // Draw 8 Angles with Adaptive Placement
      if (int1) this.render8AnglesStrict(int1, angBase, tAng, acuteDeg, obtuseDeg, 1);
      if (int2) this.render8AnglesStrict(int2, angBase, tAng, acuteDeg, obtuseDeg, 5);

      // SMART DYNAMIC TITLE PLACEMENT
      let rayUp = tAng;
      if (Math.sin(rayUp) > 0) rayUp += Math.PI;
      const isLeaningRight = Math.cos(rayUp) > 0;

      const titleX = isLeaningRight
        ? Math.min(A.x, C.x) - 10
        : Math.max(B.x, D.x) - 260;

      const titleY = Math.min(A.y, C.y) - 48;

      const banner = this.createSvgEl("text", {
        x: titleX.toFixed(1),
        y: titleY.toFixed(1),
        "font-size": "14.5",
        "font-family": "Arial, sans-serif",
        "font-style": "italic",
        "font-weight": "bold",
        fill: "#dc2626"
      });
      banner.textContent = "Here Line AB ∥ Line CD (Transversal: t)";
      this.activeSvg.appendChild(banner);

      // Hide overlay immediately so teacher can interact normally right away
      if (this.clickOverlay) {
        this.clickOverlay.style.display = "none";
      }
      this.isActive = false;

      this.showToast(`Geometry Complete! Angles: ${acuteDeg}° & ${obtuseDeg}°`, 0, true);
      setTimeout(() => this.deactivate(), 3000);
    },

    lineIntersection: function (p1, p2, p3, p4) {
      const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
      if (Math.abs(denom) < 0.0001) return null;

      const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
      return {
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y)
      };
    },

    render8AnglesStrict: function (center, angBase, tAng, acuteDeg, obtuseDeg, baseIdx) {
      const rayRight = angBase;
      const rayLeft = angBase + Math.PI;

      let rayUp = tAng;
      if (Math.sin(rayUp) > 0) rayUp += Math.PI;
      const rayDown = rayUp + Math.PI;

      const isLeaningRight = Math.cos(rayUp) > 0;

      const colorObtuse = "#059669"; // Emerald Green
      const colorAcute = "#2563eb";  // Royal Blue

      const rObtuse = 28;
      const rAcute = 34;

      if (isLeaningRight) {
        this.drawDirectArc(center, rObtuse, rayLeft, rayUp, colorObtuse);
        this.placeTextOnBisector(`∠${baseIdx}`, `${obtuseDeg}°`, center, rayLeft, rayUp, 54, colorObtuse);

        this.drawDirectArc(center, rAcute, rayUp, rayRight, colorAcute);
        this.placeTextOnBisector(`∠${baseIdx + 1}`, `${acuteDeg}°`, center, rayUp, rayRight, 54, colorAcute);

        this.drawDirectArc(center, rAcute, rayDown, rayLeft, colorAcute);
        this.placeTextOnBisector(`∠${baseIdx + 2}`, `${acuteDeg}°`, center, rayDown, rayLeft, 54, colorAcute);

        this.drawDirectArc(center, rObtuse, rayRight, rayDown, colorObtuse);
        this.placeTextOnBisector(`∠${baseIdx + 3}`, `${obtuseDeg}°`, center, rayRight, rayDown, 54, colorObtuse);
      } else {
        this.drawDirectArc(center, rAcute, rayLeft, rayUp, colorAcute);
        this.placeTextOnBisector(`∠${baseIdx}`, `${acuteDeg}°`, center, rayLeft, rayUp, 54, colorAcute);

        this.drawDirectArc(center, rObtuse, rayUp, rayRight, colorObtuse);
        this.placeTextOnBisector(`∠${baseIdx + 1}`, `${obtuseDeg}°`, center, rayUp, rayRight, 54, colorObtuse);

        this.drawDirectArc(center, rObtuse, rayDown, rayLeft, colorObtuse);
        this.placeTextOnBisector(`∠${baseIdx + 2}`, `${obtuseDeg}°`, center, rayDown, rayLeft, 54, colorObtuse);

        this.drawDirectArc(center, rAcute, rayRight, rayDown, colorAcute);
        this.placeTextOnBisector(`∠${baseIdx + 3}`, `${acuteDeg}°`, center, rayRight, rayDown, 54, colorAcute);
      }
    },

    drawDirectArc: function (center, radius, ang1, ang2, strokeColor) {
      if (!this.activeSvg) return;

      let diff = ang2 - ang1;
      while (diff <= -Math.PI) diff += 2 * Math.PI;
      while (diff > Math.PI) diff -= 2 * Math.PI;

      const steps = 18;
      const pts = [];

      for (let i = 0; i <= steps; i++) {
        const a = ang1 + (diff * i) / steps;
        const px = (center.x + radius * Math.cos(a)).toFixed(1);
        const py = (center.y + radius * Math.sin(a)).toFixed(1);
        pts.push(`${px},${py}`);
      }

      const arc = this.createSvgEl("polyline", {
        points: pts.join(" "),
        stroke: strokeColor,
        "stroke-width": "2",
        fill: "none",
        "stroke-linecap": "butt"
      });

      this.activeSvg.appendChild(arc);
    },

    placeTextOnBisector: function (angleNo, degStr, center, ang1, ang2, dist, textColor) {
      if (!this.activeSvg) return;

      let diff = ang2 - ang1;
      while (diff <= -Math.PI) diff += 2 * Math.PI;
      while (diff > Math.PI) diff -= 2 * Math.PI;

      const midAngle = ang1 + diff / 2;
      const lx = center.x + dist * Math.cos(midAngle);
      const ly = center.y + dist * Math.sin(midAngle);

      const txt = this.createSvgEl("text", {
        x: lx.toFixed(1),
        y: (ly - 5).toFixed(1),
        "font-size": "11",
        "font-weight": "bold",
        "font-family": "Arial, sans-serif",
        "text-anchor": "middle",
        fill: textColor
      });

      const tspan1 = this.createSvgEl("tspan", { x: lx.toFixed(1), dy: "0" });
      tspan1.textContent = angleNo;

      const tspan2 = this.createSvgEl("tspan", { x: lx.toFixed(1), dy: "12" });
      tspan2.textContent = `(${degStr})`;

      txt.appendChild(tspan1);
      txt.appendChild(tspan2);
      this.activeSvg.appendChild(txt);
    },

    showToast: function (msg, stepNum, isSuccess = false) {
      if (!this.guideToast) {
        this.guideToast = document.createElement("div");
        this.guideToast.id = "parallelGuideTopBar";
        this.guideToast.style.cssText = `
          position: fixed !important;
          top: 18px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          background: #0f172a !important;
          color: #ffffff !important;
          padding: 6px 16px !important;
          border-radius: 9999px !important;
          font-size: 13px !important;
          font-family: Arial, sans-serif !important;
          z-index: 100000000 !important;
          display: inline-flex !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: 10px !important;
          box-shadow: 0 4px 14px rgba(0,0,0,0.25) !important;
          width: auto !important;
          max-width: 90vw !important;
          height: auto !important;
          pointer-events: auto !important;
        `;
        document.body.appendChild(this.guideToast);
      }

      const stepBadge =
        stepNum > 0
          ? `<span style="background:#2563eb;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;white-space:nowrap;">Step ${stepNum}</span>`
          : `<span style="background:#10b981;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;white-space:nowrap;">Done</span>`;

      this.guideToast.innerHTML = `
        ${stepBadge}
        <span style="white-space:nowrap;font-weight:500;">${msg}</span>
        <button type="button" class="cancel-btn" title="Cancel" style="background:none;border:none;color:#94a3b8;font-size:16px;cursor:pointer;margin-left:6px;line-height:1;display:flex;align-items:center;">&times;</button>
      `;

      this.guideToast.querySelector(".cancel-btn").onclick = () => {
        this.deactivate();
      };
    },

    deactivate: function () {
      this.isActive = false;
      this.points = [];

      if (this.clickOverlay) {
        this.clickOverlay.style.display = "none";
      }

      this.guideDots.forEach(dot => dot.remove());
      this.guideDots = [];

      if (this.guideToast) {
        this.guideToast.remove();
        this.guideToast = null;
      }

      if (window.fabricCanvas) {
        window.fabricCanvas.defaultCursor = "default";
        window.fabricCanvas.hoverCursor = "move";
        window.fabricCanvas.selection = true;
      }
    },

    reset: function () {
      this.deactivate();
    }
  };

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => ParallelLineEngine.init(), 360);
  });

  window.ParallelLineEngine = ParallelLineEngine;
})(window);