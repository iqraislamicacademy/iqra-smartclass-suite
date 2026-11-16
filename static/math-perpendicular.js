// ========================================================
// GEOMETRIC CONSTRUCTION: PERPENDICULAR LINE (90° ALTITUDE)
// Multi-Host SVG Engine (PDF, Image & Board Ready)
// Textbook Labels: A, B, M (Foot), P (Endpoint) & PM ⊥ AB
// ========================================================
(function (window) {
  "use strict";

  const PerpendicularEngine = {
    isActive: false,
    mode: "idle", // "detecting" | "waiting_altitude" | "drawing_base_p2"
    isExistingLineSelected: false,
    baseA: null,
    baseB: null,
    highlightedEl: null,
    highlightedOrigStroke: null,
    clickOverlay: null,
    previewSvg: null,
    activeHost: null,
    activeSvg: null,
    guideToast: null,

    pencilCursor:
      "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%230284c7\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z\"/><path d=\"m15 5 4 4\"/></svg>') 2 22, crosshair",

    init: function () {
      this.ensureOverlay();
      this.bindToolbar();
    },

    ensureOverlay: function () {
      let overlay = document.getElementById("perpendicularOverlay");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "perpendicularOverlay";
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

        overlay.addEventListener("pointermove", (e) => {
          if (!this.isActive) return;
          this.handleScreenMove(e.clientX, e.clientY);
        });
      }
      this.clickOverlay = overlay;
    },

    bindToolbar: function () {
      const targetSelector =
        '#btnGeomPerpendicular, [data-math-tool="perpendicular"], [data-math-tool="perpendicular_line"], [data-geom-tool="perpendicular"]';

      const attachListener = () => {
        const btn = document.querySelector(targetSelector);
        const flyout =
          document.getElementById("mathFlyoutBox") ||
          document.querySelector(".math-instruments-panel");

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
          const flyout =
            document.getElementById("mathFlyoutBox") ||
            document.querySelector(".math-instruments-panel");
          if (flyout) flyout.classList.add("hidden");
          this.startConstruction();
        }
      });
    },

    detectTargetAt: function (screenX, screenY) {
      // 1. PDF Viewer (#renderTarget)
      const renderTarget = document.getElementById("renderTarget");
      if (renderTarget && renderTarget.style.display !== "none" && renderTarget.offsetWidth > 0) {
        const r = renderTarget.getBoundingClientRect();
        if (screenX >= r.left && screenX <= r.right && screenY >= r.top && screenY <= r.bottom) {
          let pdfLayer = renderTarget.querySelector(".pdf-perp-host-layer");
          if (!pdfLayer) {
            pdfLayer = document.createElement("div");
            pdfLayer.className = "pdf-perp-host-layer";
            pdfLayer.style.cssText = "position:absolute; inset:0; pointer-events:none; z-index:999; overflow:visible;";
            if (window.getComputedStyle(renderTarget).position === "static") {
              renderTarget.style.position = "relative";
            }
            renderTarget.appendChild(pdfLayer);
          }
          return { type: "pdf", container: pdfLayer };
        }
      }

      // 2. Uploaded Image (.wb-image-item)
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
      const wb =
        document.getElementById("whiteboardContainer") ||
        document.getElementById("canvasWrapper") ||
        document.querySelector(".canvas-container") ||
        document.body;
      if (window.getComputedStyle(wb).position === "static") {
        wb.style.position = "relative";
      }
      return { type: "board", container: wb };
    },

    createSvgEl: function (tag, attrs) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      for (const [k, v] of Object.entries(attrs || {})) {
        el.setAttribute(k, v);
      }
      return el;
    },

    startConstruction: function () {
      this.reset();
      this.isActive = true;
      this.mode = "detecting";
      this.isExistingLineSelected = false;

      if (window.fabricCanvas) {
        window.fabricCanvas.selection = false;
        window.fabricCanvas.isDrawingMode = false;
      }

      if (this.clickOverlay) {
        this.clickOverlay.style.cursor = this.pencilCursor;
        this.clickOverlay.style.display = "block";
      }

      this.showToast("Step 1: Click any existing Line (or click Point A to draw base line)", 1);
    },

    // Find nearest SVG line or Fabric line near screen coordinates
    findNearestLineOnScreen: function (screenX, screenY, maxDist = 22) {
      const clickPt = { x: screenX, y: screenY };
      let best = null;
      let bestDist = maxDist;

      // A. Search all SVG <line> elements across board, images, and PDF
      const svgLines = Array.from(document.querySelectorAll("svg line"));
      for (const line of svgLines) {
        if (line.closest("#mathApparatusLayer") || line.closest("#perpendicularPreviewSvg")) continue;
        const svg = line.ownerSVGElement;
        if (!svg) continue;
        const rect = svg.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const x1 = parseFloat(line.getAttribute("x1"));
        const y1 = parseFloat(line.getAttribute("y1"));
        const x2 = parseFloat(line.getAttribute("x2"));
        const y2 = parseFloat(line.getAttribute("y2"));
        if ([x1, y1, x2, y2].some(isNaN)) continue;

        const a = { x: rect.left + x1, y: rect.top + y1 };
        const b = { x: rect.left + x2, y: rect.top + y2 };
        if (Math.hypot(b.x - a.x, b.y - a.y) < 10) continue;

        const foot = this.getFootOfPerpendicular(clickPt, a, b, true);
        const d = Math.hypot(clickPt.x - foot.x, clickPt.y - foot.y);
        if (d < bestDist) {
          bestDist = d;
          best = { a, b, el: line, isSvg: true };
        }
      }

      // B. Search Fabric.js lines if present
      if (window.fabricCanvas) {
        const cRect = window.fabricCanvas.upperCanvasEl
          ? window.fabricCanvas.upperCanvasEl.getBoundingClientRect()
          : { left: 0, top: 0 };
        const objs = window.fabricCanvas.getObjects();
        for (const obj of objs) {
          if (obj.type === "line") {
            const m = obj.calcTransformMatrix ? obj.calcTransformMatrix() : [1, 0, 0, 1, 0, 0];
            const p1 = fabric.util.transformPoint({ x: obj.x1 || 0, y: obj.y1 || 0 }, m);
            const p2 = fabric.util.transformPoint({ x: obj.x2 || 0, y: obj.y2 || 0 }, m);
            const a = { x: cRect.left + p1.x, y: cRect.top + p1.y };
            const b = { x: cRect.left + p2.x, y: cRect.top + p2.y };

            const foot = this.getFootOfPerpendicular(clickPt, a, b, true);
            const d = Math.hypot(clickPt.x - foot.x, clickPt.y - foot.y);
            if (d < bestDist) {
              bestDist = d;
              best = { a, b, el: obj, isSvg: false };
            }
          }
        }
      }

      return best;
    },

    getFootOfPerpendicular: function (p, a, b, clampSegment = false) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return { x: a.x, y: a.y };

      let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
      if (clampSegment) {
        t = Math.max(0, Math.min(1, t));
      }
      return {
        x: a.x + t * dx,
        y: a.y + t * dy
      };
    },

    getSquarePoints: function (foot, p, a, b, size = 14) {
      const vBase = { x: b.x - a.x, y: b.y - a.y };
      const baseLen = Math.hypot(vBase.x, vBase.y);
      if (baseLen === 0) return null;

      const vPerp = { x: p.x - foot.x, y: p.y - foot.y };
      const perpLen = Math.hypot(vPerp.x, vPerp.y);
      if (perpLen < 4) return null;

      const uBase = { x: vBase.x / baseLen, y: vBase.y / baseLen };
      const uPerp = { x: vPerp.x / perpLen, y: vPerp.y / perpLen };

      const pt1 = { x: foot.x + uBase.x * size, y: foot.y + uBase.y * size };
      const pt2 = {
        x: foot.x + uBase.x * size + uPerp.x * size,
        y: foot.y + uBase.y * size + uPerp.y * size
      };
      const pt3 = { x: foot.x + uPerp.x * size, y: foot.y + uPerp.y * size };

      return [pt1, pt2, pt3];
    },

    initHostSvg: function (screenX, screenY) {
      const target = this.detectTargetAt(screenX, screenY);
      this.activeHost = target.container;

      const svg = this.createSvgEl("svg", {
        class: "geom-perpendicular-svg"
      });
      svg.style.cssText =
        "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:48; overflow:visible;";
      this.activeHost.appendChild(svg);
      this.activeSvg = svg;
    },

    addPointLabel: function (localX, localY, text, offsetX, offsetY, color = "#0f172a") {
      if (!this.activeSvg) return;
      const lbl = this.createSvgEl("text", {
        x: (localX + offsetX).toFixed(1),
        y: (localY + offsetY).toFixed(1),
        "font-size": "13",
        "font-weight": "bold",
        "font-family": "Arial, sans-serif",
        fill: color,
        "text-anchor": "middle"
      });
      lbl.textContent = text;
      this.activeSvg.appendChild(lbl);
    },

    handleScreenClick: function (clientX, clientY) {
      const pt = { x: Math.round(clientX), y: Math.round(clientY) };

      // MODE 1: Detecting an existing line OR starting a custom base line
      if (this.mode === "detecting") {
        const hitLine = this.findNearestLineOnScreen(pt.x, pt.y, 24);

        if (hitLine) {
          // Existing line selected!
          this.isExistingLineSelected = true;
          this.baseA = hitLine.a;
          this.baseB = hitLine.b;
          this.highlightLine(hitLine);

          const midX = (hitLine.a.x + hitLine.b.x) / 2;
          const midY = (hitLine.a.y + hitLine.b.y) / 2;
          this.initHostSvg(midX, midY);

          const rect = this.activeSvg.getBoundingClientRect();
          this.addPointLabel(hitLine.a.x - rect.left, hitLine.a.y - rect.top, "A", -14, 4);
          this.addPointLabel(hitLine.b.x - rect.left, hitLine.b.y - rect.top, "B", 14, 4);

          this.mode = "waiting_altitude";
          this.showToast("Step 2/2: Click to place the 90° Altitude endpoint (P)", 2);
        } else {
          // No existing line here -> Start custom base line AB
          this.isExistingLineSelected = false;
          this.baseA = pt;
          this.initHostSvg(pt.x, pt.y);

          const rect = this.activeSvg.getBoundingClientRect();
          const aLocalX = pt.x - rect.left;
          const aLocalY = pt.y - rect.top;

          const dotA = this.createSvgEl("circle", {
            cx: aLocalX.toFixed(1),
            cy: aLocalY.toFixed(1),
            r: "4",
            fill: "#0284c7"
          });
          this.activeSvg.appendChild(dotA);
          this.addPointLabel(aLocalX, aLocalY, "A", -14, 4);

          this.mode = "drawing_base_p2";
          this.showToast("Step 2/3: Click Point B to finish Base Line AB", 2);
        }
        return;
      }

      // MODE 2: Finishing custom base line AB
      if (this.mode === "drawing_base_p2") {
        this.baseB = pt;
        this.clearPreview();

        const rect = this.activeSvg.getBoundingClientRect();
        const strokeColor = document.getElementById("brushColor")
          ? document.getElementById("brushColor").value
          : "#0f172a";

        const aLocalX = this.baseA.x - rect.left;
        const aLocalY = this.baseA.y - rect.top;
        const bLocalX = this.baseB.x - rect.left;
        const bLocalY = this.baseB.y - rect.top;

        const baseLine = this.createSvgEl("line", {
          x1: aLocalX.toFixed(1),
          y1: aLocalY.toFixed(1),
          x2: bLocalX.toFixed(1),
          y2: bLocalY.toFixed(1),
          stroke: strokeColor,
          "stroke-width": "2.2",
          "stroke-linecap": "round"
        });
        const dotB = this.createSvgEl("circle", {
          cx: bLocalX.toFixed(1),
          cy: bLocalY.toFixed(1),
          r: "4",
          fill: "#0284c7"
        });

        this.activeSvg.appendChild(baseLine);
        this.activeSvg.appendChild(dotB);
        this.addPointLabel(bLocalX, bLocalY, "B", 14, 4);

        this.mode = "waiting_altitude";
        this.showToast("Step 3/3: Click to place the 90° Altitude endpoint (P)", 3);
        return;
      }

      // MODE 3: Finalizing the 90° Perpendicular Altitude
      if (this.mode === "waiting_altitude") {
        this.finalizePerpendicular(pt);
      }
    },

    handleScreenMove: function (clientX, clientY) {
      const pt = { x: Math.round(clientX), y: Math.round(clientY) };

      if (this.mode === "drawing_base_p2" && this.baseA) {
        this.renderPreview([
          this.createSvgEl("line", {
            x1: this.baseA.x,
            y1: this.baseA.y,
            x2: pt.x,
            y2: pt.y,
            stroke: "#0284c7",
            "stroke-width": "2",
            "stroke-dasharray": "5,4"
          })
        ]);
        return;
      }

      if (this.mode === "waiting_altitude" && this.baseA && this.baseB) {
        const foot = this.getFootOfPerpendicular(pt, this.baseA, this.baseB, false);
        const els = [
          this.createSvgEl("line", {
            x1: foot.x.toFixed(1),
            y1: foot.y.toFixed(1),
            x2: pt.x,
            y2: pt.y,
            stroke: "#0284c7",
            "stroke-width": "2",
            "stroke-dasharray": "4,4"
          }),
          this.createSvgEl("circle", {
            cx: foot.x.toFixed(1),
            cy: foot.y.toFixed(1),
            r: "4",
            fill: "#0284c7"
          }),
          this.createSvgEl("circle", {
            cx: pt.x,
            cy: pt.y,
            r: "4",
            fill: "#ef4444"
          })
        ];

        const sq = this.getSquarePoints(foot, pt, this.baseA, this.baseB, 14);
        if (sq) {
          els.push(
            this.createSvgEl("polyline", {
              points: `${sq[0].x.toFixed(1)},${sq[0].y.toFixed(1)} ${sq[1].x.toFixed(1)},${sq[1].y.toFixed(1)} ${sq[2].x.toFixed(1)},${sq[2].y.toFixed(1)}`,
              fill: "none",
              stroke: "#0284c7",
              "stroke-width": "1.6"
            })
          );
        }

        this.renderPreview(els);
      }
    },

    finalizePerpendicular: function (pt) {
      if (!this.activeSvg || !this.baseA || !this.baseB) return;

      const foot = this.getFootOfPerpendicular(pt, this.baseA, this.baseB, false);
      const sq = this.getSquarePoints(foot, pt, this.baseA, this.baseB, 14);
      const rect = this.activeSvg.getBoundingClientRect();

      const strokeColor = document.getElementById("brushColor")
        ? document.getElementById("brushColor").value
        : "#0f172a";

      const fLocal = { x: foot.x - rect.left, y: foot.y - rect.top };
      const pLocal = { x: pt.x - rect.left, y: pt.y - rect.top };

      // 1. T-Shape Altitude Line (Foot M to Endpoint P)
      const perpLine = this.createSvgEl("line", {
        x1: fLocal.x.toFixed(1),
        y1: fLocal.y.toFixed(1),
        x2: pLocal.x.toFixed(1),
        y2: pLocal.y.toFixed(1),
        stroke: strokeColor,
        "stroke-width": "2.2",
        "stroke-linecap": "round"
      });
      this.activeSvg.appendChild(perpLine);

      // 2. Endpoint P & Foot M Dots
      const footDot = this.createSvgEl("circle", {
        cx: fLocal.x.toFixed(1),
        cy: fLocal.y.toFixed(1),
        r: "3.5",
        fill: "#0284c7"
      });
      const endDot = this.createSvgEl("circle", {
        cx: pLocal.x.toFixed(1),
        cy: pLocal.y.toFixed(1),
        r: "3.5",
        fill: "#0284c7"
      });
      this.activeSvg.appendChild(footDot);
      this.activeSvg.appendChild(endDot);

      // 3. Labels M (Foot) & P (Endpoint) + PM ⊥ AB
      const isAbove = pLocal.y <= fLocal.y;
      this.addPointLabel(fLocal.x, fLocal.y, "M", 0, isAbove ? 18 : -10, "#0f172a");
      this.addPointLabel(pLocal.x, pLocal.y, "P", 0, isAbove ? -10 : 18, "#0f172a");

      const notation = this.createSvgEl("text", {
        x: (pLocal.x + 14).toFixed(1),
        y: (pLocal.y + 4).toFixed(1),
        "font-size": "12",
        "font-weight": "bold",
        "font-family": "Arial, sans-serif",
        fill: "#0284c7"
      });
      notation.textContent = "PM ⊥ AB";
      this.activeSvg.appendChild(notation);

      // 4. 90-Degree Right-Angle Square Marker
      if (sq) {
        const s0 = { x: sq[0].x - rect.left, y: sq[0].y - rect.top };
        const s1 = { x: sq[1].x - rect.left, y: sq[1].y - rect.top };
        const s2 = { x: sq[2].x - rect.left, y: sq[2].y - rect.top };

        const marker = this.createSvgEl("polyline", {
          points: `${s0.x.toFixed(1)},${s0.y.toFixed(1)} ${s1.x.toFixed(1)},${s1.y.toFixed(1)} ${s2.x.toFixed(1)},${s2.y.toFixed(1)}`,
          fill: "none",
          stroke: "#0284c7",
          "stroke-width": "1.8",
          "stroke-linejoin": "round"
        });
        this.activeSvg.appendChild(marker);

        // 90° crisp label opposite the square corner
        const lbl = this.createSvgEl("text", {
          x: (s1.x + (s1.x - fLocal.x) * 0.7).toFixed(1),
          y: (s1.y + (s1.y - fLocal.y) * 0.7 + 4).toFixed(1),
          "font-size": "11",
          "font-weight": "bold",
          "font-family": "Arial, sans-serif",
          fill: "#0284c7",
          "text-anchor": "middle"
        });
        lbl.textContent = "90°";
        this.activeSvg.appendChild(lbl);
      }

      this.showToast("90° Perpendicular (PM ⊥ AB) created!", 0, true);
      this.reset();
    },

    highlightLine: function (hitLine) {
      this.unhighlightLine();
      this.highlightedEl = hitLine;
      if (hitLine.isSvg && hitLine.el) {
        this.highlightedOrigStroke = hitLine.el.getAttribute("stroke") || "#0f172a";
        hitLine.el.setAttribute("stroke", "#0284c7");
      } else if (!hitLine.isSvg && hitLine.el && window.fabricCanvas) {
        this.highlightedOrigStroke = hitLine.el.stroke || "#0f172a";
        hitLine.el.set({ stroke: "#0284c7" });
        window.fabricCanvas.requestRenderAll();
      }
    },

    unhighlightLine: function () {
      if (!this.highlightedEl) return;
      const h = this.highlightedEl;
      if (h.isSvg && h.el) {
        h.el.setAttribute("stroke", this.highlightedOrigStroke || "#0f172a");
      } else if (!h.isSvg && h.el && window.fabricCanvas) {
        h.el.set({ stroke: this.highlightedOrigStroke || "#0f172a" });
        window.fabricCanvas.requestRenderAll();
      }
      this.highlightedEl = null;
      this.highlightedOrigStroke = null;
    },

    renderPreview: function (elements) {
      if (!this.previewSvg) {
        const svg = this.createSvgEl("svg", { id: "perpendicularPreviewSvg" });
        svg.style.cssText =
          "position:fixed; inset:0; width:100vw; height:100vh; pointer-events:none; z-index:99999998; overflow:visible;";
        document.body.appendChild(svg);
        this.previewSvg = svg;
      }
      this.previewSvg.innerHTML = "";
      elements.forEach((el) => this.previewSvg.appendChild(el));
    },

    clearPreview: function () {
      if (this.previewSvg) {
        this.previewSvg.innerHTML = "";
      }
    },

    reset: function () {
      this.clearPreview();
      this.unhighlightLine();
      this.baseA = null;
      this.baseB = null;
      this.mode = "idle";
      this.isActive = false;

      if (this.clickOverlay) {
        this.clickOverlay.style.display = "none";
      }

      if (window.fabricCanvas) {
        window.fabricCanvas.defaultCursor = "default";
        window.fabricCanvas.hoverCursor = "move";
        window.fabricCanvas.selection = true;
      }
    },

    showToast: function (msg, step = 1, isSuccess = false) {
      let toast = document.getElementById("mathPerpToast");
      if (!toast) {
        toast = document.createElement("div");
        toast.id = "mathPerpToast";
        toast.style.cssText =
          "position:fixed; top:18px; left:50%; transform:translateX(-50%); background:#0f172a; color:#f8fafc; padding:6px 16px; border-radius:9999px; font-family:Arial,sans-serif; font-size:13px; font-weight:500; box-shadow:0 4px 14px rgba(0,0,0,0.25); z-index:100000000; pointer-events:auto; display:inline-flex; align-items:center; gap:10px;";
        document.body.appendChild(toast);
      }

      const badge =
        step > 0
          ? `<span style="background:#2563eb;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;">Step ${step}</span>`
          : `<span style="background:#10b981;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;">Done</span>`;

      toast.innerHTML = `${badge}<span>${msg}</span><button type="button" id="perpToastCloseBtn" style="background:none;border:none;color:#94a3b8;font-size:16px;cursor:pointer;line-height:1;">&times;</button>`;
      toast.style.display = "inline-flex";

      toast.querySelector("#perpToastCloseBtn").onclick = () => {
        this.reset();
        toast.style.display = "none";
      };

      if (isSuccess) {
        setTimeout(() => {
          if (toast) toast.style.display = "none";
        }, 2500);
      }
    }
  };

  window.PerpendicularEngine = PerpendicularEngine;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => PerpendicularEngine.init());
  } else {
    PerpendicularEngine.init();
  }
})(window);