// ========================================================
// GEOMETRIC CONSTRUCTION: CLEAN ANGLE BISECTOR (ULTRA CRISP)
// Textbook Order: 1. Point A -> 2. Vertex B -> 3. Point C
// Multi-Host SVG Engine (PDF, Image & Board Ready)
// ========================================================
(function (window) {
  "use strict";

  const AngleBisectorEngine = {
    isActive: false,
    points: [], // [Arm A, Vertex B, Arm C] in local host coordinates
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
      let overlay = document.getElementById("angleBisectorOverlay");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "angleBisectorOverlay";
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
          let pdfLayer = renderTarget.querySelector(".pdf-angle-host-layer");
          if (!pdfLayer) {
            pdfLayer = document.createElement("div");
            pdfLayer.className = "pdf-angle-host-layer";
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
      const targetSelector = '#btnGeomAngle, [data-math-tool="angle_measure"], [data-geom-tool="angle"], [data-math-tool="angle"]';

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

      this.showToast("Step 1/3: Click to place Point A (First Ray)", 1);
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

      // Lock host on first click (Point A) so the entire angle bisector stays bound to PDF, Image, or Board
      if (this.points.length === 0) {
        const target = this.detectTargetAt(clientX, clientY);
        this.activeHost = target.container;

        const svg = this.createSvgEl("svg", {
          class: "geom-angle-bisector-svg"
        });
        svg.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:48; overflow:visible;";
        this.activeHost.appendChild(svg);
        this.activeSvg = svg;
      }

      const pt = this.toLocalPt({ x: clientX, y: clientY });
      this.points.push(pt);

      if (this.points.length === 1) {
        // Step 1: Point A (First Arm Endpoint)
        this.renderSharpLabel(pt, "Point A", -20, -14);
        this.showToast("Step 2/3: Click to place Vertex (Point B)", 2);
      } else if (this.points.length === 2) {
        // Step 2: Vertex B (Corner) -> Draw Arm BA
        const A = this.points[0];
        const B = pt;
        const dirBA = Math.atan2(A.y - B.y, A.x - B.x);
        const labelOffsetX = Math.cos(dirBA) >= 0 ? -75 : 12;

        this.renderSharpLabel(B, "B (Vertex)", labelOffsetX, 18);
        this.drawArm(B, A);
        this.showToast("Step 3/3: Click to place Point C (Second Ray)", 3);
      } else if (this.points.length === 3) {
        // Step 3: Point C (Second Arm Endpoint) -> Draw Arm BC & Bisect
        const B = this.points[1];
        const C = pt;
        const ang = Math.atan2(C.y - B.y, C.x - B.x);
        const normalAng = ang + Math.PI / 2;
        const offsetX = Math.round(22 * Math.cos(normalAng)) - 15;
        const offsetY = Math.round(22 * Math.sin(normalAng)) + 6;

        this.renderSharpLabel(C, "Point C", offsetX, offsetY);
        this.drawArm(B, C);
        this.executeBisector();
      }
    },

    renderSharpLabel: function (pt, textStr, offsetX, offsetY) {
      if (!this.activeSvg) return;

      const dot = this.createSvgEl("circle", {
        cx: pt.x,
        cy: pt.y,
        r: "4.5",
        fill: "#dc2626",
        stroke: "#ffffff",
        "stroke-width": "1.5"
      });

      const label = this.createSvgEl("text", {
        x: pt.x + offsetX,
        y: pt.y + offsetY,
        "font-size": "13",
        "font-weight": "bold",
        fill: "#0f172a",
        "font-family": "Arial, sans-serif"
      });
      label.textContent = textStr;

      this.activeSvg.appendChild(dot);
      this.activeSvg.appendChild(label);
    },

    drawArm: function (pFrom, pTo) {
      if (!this.activeSvg) return;

      const dx = pTo.x - pFrom.x;
      const dy = pTo.y - pFrom.y;
      const len = Math.hypot(dx, dy) || 1;

      const extLen = Math.max(len + 40, 190);
      const extX = pFrom.x + (dx / len) * extLen;
      const extY = pFrom.y + (dy / len) * extLen;

      const line = this.createSvgEl("line", {
        x1: pFrom.x.toFixed(1),
        y1: pFrom.y.toFixed(1),
        x2: extX.toFixed(1),
        y2: extY.toFixed(1),
        stroke: "#1e293b",
        "stroke-width": "2",
        "stroke-linecap": "round"
      });

      this.activeSvg.appendChild(line);
    },

    executeBisector: function () {
      if (!this.activeSvg) return;

      const A = this.points[0]; // Arm 1 (Point A)
      const B = this.points[1]; // Vertex (Point B)
      const C = this.points[2]; // Arm 2 (Point C)

      const angA = Math.atan2(A.y - B.y, A.x - B.x);
      const angC = Math.atan2(C.y - B.y, C.x - B.x);

      let diff = angC - angA;
      while (diff <= -Math.PI) diff += 2 * Math.PI;
      while (diff > Math.PI) diff -= 2 * Math.PI;

      const bisectorAng = angA + diff / 2;

      const totalDeg = Math.round(Math.abs((diff * 180) / Math.PI));
      const halfDeg = (totalDeg / 2).toFixed(1);

      // 1. Base arc (Blue)
      const R1 = 70;
      this.drawArcSpan(B, R1, angA, angA + diff, "#0284c7");

      const P = { x: B.x + R1 * Math.cos(angA), y: B.y + R1 * Math.sin(angA) };
      const Q = { x: B.x + R1 * Math.cos(angC), y: B.y + R1 * Math.sin(angC) };

      // 2. Crossing Arcs (Amber / Orange)
      const bisectDist = 180;
      const M = {
        x: B.x + bisectDist * Math.cos(bisectorAng),
        y: B.y + bisectDist * Math.sin(bisectorAng)
      };

      const R2 = Math.hypot(M.x - P.x, M.y - P.y);
      const angPM = Math.atan2(M.y - P.y, M.x - P.x);
      const angQM = Math.atan2(M.y - Q.y, M.x - Q.x);

      this.drawCrossingArc(P, R2, angPM, "#d97706");
      this.drawCrossingArc(Q, R2, angQM, "#d97706");

      // 3. Bisector Ray (Red Dashed)
      const rayLen = bisectDist + 60;
      const endPt = {
        x: B.x + rayLen * Math.cos(bisectorAng),
        y: B.y + rayLen * Math.sin(bisectorAng)
      };

      const bisectorRay = this.createSvgEl("line", {
        x1: B.x.toFixed(1),
        y1: B.y.toFixed(1),
        x2: endPt.x.toFixed(1),
        y2: endPt.y.toFixed(1),
        stroke: "#dc2626",
        "stroke-width": "2",
        "stroke-dasharray": "6,4",
        "stroke-linecap": "round"
      });

      // 4. Sharp & Crisp Text
      const textAnchor = Math.cos(bisectorAng) >= 0 ? "start" : "end";
      const textOffsetX = Math.cos(bisectorAng) >= 0 ? 14 : -14;

      const readingText = this.createSvgEl("text", {
        x: (endPt.x + textOffsetX).toFixed(1),
        y: (endPt.y + 4).toFixed(1),
        "font-size": "13",
        "font-weight": "bold",
        "text-anchor": textAnchor,
        fill: "#b91c1c",
        "font-family": "Arial, sans-serif"
      });
      readingText.textContent = `Bisector: ${halfDeg}° | ${halfDeg}°  (Total: ${totalDeg}°)`;

      this.activeSvg.appendChild(bisectorRay);
      this.activeSvg.appendChild(readingText);

      // Hide overlay immediately so teacher can interact normally right away
      if (this.clickOverlay) {
        this.clickOverlay.style.display = "none";
      }
      this.isActive = false;

      this.showToast(`Bisection Complete: ${totalDeg}° ➔ ${halfDeg}° + ${halfDeg}°`, 0, true);
      setTimeout(() => this.deactivate(), 2500);
    },

    drawArcSpan: function (center, radius, startAngle, endAngle, color) {
      if (!this.activeSvg) return;

      let diff = endAngle - startAngle;
      const steps = 30;
      const pts = [];

      for (let i = 0; i <= steps; i++) {
        const ang = startAngle + (diff * i) / steps;
        const px = (center.x + radius * Math.cos(ang)).toFixed(1);
        const py = (center.y + radius * Math.sin(ang)).toFixed(1);
        pts.push(`${px},${py}`);
      }

      const arc = this.createSvgEl("polyline", {
        points: pts.join(" "),
        stroke: color,
        "stroke-width": "1.8",
        fill: "none",
        "stroke-linecap": "round"
      });

      this.activeSvg.appendChild(arc);
    },

    drawCrossingArc: function (pivot, radius, targetAngle, color) {
      if (!this.activeSvg) return;

      const span = 0.45;
      const steps = 14;
      const pts = [];

      for (let i = 0; i <= steps; i++) {
        const ang = targetAngle - span / 2 + (span * i) / steps;
        const px = (pivot.x + radius * Math.cos(ang)).toFixed(1);
        const py = (pivot.y + radius * Math.sin(ang)).toFixed(1);
        pts.push(`${px},${py}`);
      }

      const arc = this.createSvgEl("polyline", {
        points: pts.join(" "),
        stroke: color,
        "stroke-width": "2",
        fill: "none",
        "stroke-linecap": "round"
      });

      this.activeSvg.appendChild(arc);
    },

    showToast: function (msg, stepNum, isSuccess = false) {
      if (!this.guideToast) {
        this.guideToast = document.createElement("div");
        this.guideToast.id = "angleBisectorTopBar";
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
    setTimeout(() => AngleBisectorEngine.init(), 350);
  });

  window.AngleBisectorEngine = AngleBisectorEngine;
})(window);