// ==========================================================================
// IQRA SMARTCLASS SUITE - PRECISION MULTI-LAYER SMART ERASER (eraser.js)
// Fixed:
// 1. Active Pen Mode ON -> Stylus writes 100% freely on Whiteboard, PDF & Image;
//    Finger touch auto-erases cleanly
// 2. Active Pen Mode OFF -> Finger & Stylus write normally; Toolbar Eraser erases
// 3. Default Eraser Size: 95px + Partial (Default) / Stroke Toggle
// ==========================================================================
(function (window) {
  "use strict";

  // Preserve partial clipPaths across Undo/Redo
  if (window.fabric && fabric.Object && !fabric.Object.prototype._iqraClipPatched) {
    fabric.Object.prototype._iqraClipPatched = true;
    const origToObject = fabric.Object.prototype.toObject;
    fabric.Object.prototype.toObject = function (propertiesToInclude) {
      return origToObject.call(
        this,
        (propertiesToInclude || []).concat([
          "clipPath",
          "inverted",
          "perPixelTargetFind",
          "_eraserClipD",
          "objectCaching",
        ])
      );
    };
  }

  // ==========================================================================
  // 1. SIZE & VISUAL CURSOR CONTROLLER (Default: 95px, Range: 1px - 150px)
  // ==========================================================================
  const EraserSizeController = {
    MIN_SIZE: 1,
    MAX_SIZE: 150,
    diameterPx: 95,
    ringEl: null,

    getDiameter() {
      return this.diameterPx;
    },

    getRadius() {
      return this.diameterPx / 2;
    },

    setSize(newDiameter) {
      const clamped = Math.max(
        this.MIN_SIZE,
        Math.min(this.MAX_SIZE, Math.round(Number(newDiameter) || 95))
      );
      this.diameterPx = clamped;
      this.updateRingDimensions();
      const label = document.getElementById("lblEraserVal");
      if (label) label.textContent = `${clamped}px`;
      const slider = document.getElementById("eraserSizeRange");
      if (slider && Number(slider.value) !== clamped) slider.value = String(clamped);
      return clamped;
    },

    ensureRing() {
      if (this.ringEl && document.body.contains(this.ringEl)) return this.ringEl;
      const ring = document.createElement("div");
      ring.id = "smartEraserRing";
      ring.style.cssText = `
        position: fixed;
        width: ${this.diameterPx}px;
        height: ${this.diameterPx}px;
        border: 2px solid #ef4444;
        background: rgba(239, 68, 68, 0.16);
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.85);
        border-radius: 50%;
        pointer-events: none;
        z-index: 99999999;
        transform: translate(-50%, -50%);
        display: none;
        box-sizing: border-box;
      `;
      document.body.appendChild(ring);
      this.ringEl = ring;
      return ring;
    },

    updateRingDimensions() {
      if (!this.ringEl) return;
      const d = Math.max(4, this.diameterPx);
      this.ringEl.style.width = `${d}px`;
      this.ringEl.style.height = `${d}px`;
    },

    showAt(clientX, clientY) {
      const ring = this.ensureRing();
      this.updateRingDimensions();
      ring.style.left = `${clientX}px`;
      ring.style.top = `${clientY}px`;
      ring.style.display = "block";
    },

    hide() {
      if (this.ringEl) {
        this.ringEl.style.display = "none";
      }
    },
  };

  // ==========================================================================
  // 2. LAYER-AWARE NON-DESTRUCTIVE PARTIAL & STROKE ERASING ENGINE
  // ==========================================================================
  const LayerErasingEngine = {
    mode: "partial", // "partial" (Default) | "stroke"
    lastBoardPt: null,
    lastSurfacePts: new WeakMap(),
    lastMathScreenPt: null,
    bakedMathSignatures: new Set(),
    renderQueued: false,

    cachedBoardTargets: [],
    cachedSurfaceCanvases: [],
    cachedMathNodes: [],

    resetGestureCaches() {
      this.lastBoardPt = null;
      this.lastSurfacePts = new WeakMap();
      this.lastMathScreenPt = null;
      this.cachedBoardTargets = [];
      this.cachedSurfaceCanvases = [];
      this.cachedMathNodes = [];
    },

    getFabricCanvas() {
      return window.fabricCanvas || (window.board && window.board.canvas) || null;
    },

isProtectedFabricObject(obj) {
      const allowHighlighterErase = Boolean(SmartEraserSystem && SmartEraserSystem.isToolbarEraserSelected);
      return Boolean(
        !obj ||
          obj.isBackground ||
          (obj.isHighlighter && !allowHighlighterErase) ||
          obj.id === "boardBackground" ||
          obj.id === "gridLayer" ||
          obj.id === "pageBackgroundDoc"
      );
    },

    screenToBoardPoint(fc, clientX, clientY) {
      const el = fc.upperCanvasEl || fc.lowerCanvasEl;
      const rect = el.getBoundingClientRect();
      const vpt = fc.viewportTransform || [1, 0, 0, 1, 0, 0];
      const scaleX = rect.width > 0 ? fc.width / rect.width : 1;
      const scaleY = rect.height > 0 ? fc.height / rect.height : 1;

      const canvasX = (clientX - rect.left) * scaleX;
      const canvasY = (clientY - rect.top) * scaleY;

      const invVpt = fabric.util.invertTransform(vpt);
      const pt = fabric.util.transformPoint(new fabric.Point(canvasX, canvasY), invVpt);
      return { x: pt.x, y: pt.y };
    },

    interpolate(p1, p2, step) {
      if (!p2 || !Number.isFinite(p2.x) || !Number.isFinite(p2.y)) return [];
      if (!p1 || !Number.isFinite(p1.x) || !Number.isFinite(p1.y)) return [{ x: p2.x, y: p2.y }];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (!Number.isFinite(dist) || dist <= step) return [{ x: p2.x, y: p2.y }];
      const count = Math.min(60, Math.ceil(dist / step));
      const list = [];
      for (let i = 1; i <= count; i++) {
        const t = i / count;
        list.push({
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t,
        });
      }
      return list;
    },

    prepareGestureCaches() {
      this.cachedBoardTargets = [];
      const fc = this.getFabricCanvas();
      if (fc) {
        if (typeof fc.calcOffset === "function") fc.calcOffset();
        const objs = fc.getObjects();
        for (let i = objs.length - 1; i >= 0; i--) {
          const obj = objs[i];
          if (this.isProtectedFabricObject(obj)) continue;
          if (obj.type === "group" && !obj.isEraserClipGroup) {
            const children = obj.getObjects();
            for (let c = children.length - 1; c >= 0; c--) {
              if (!this.isProtectedFabricObject(children[c])) {
                this.cachedBoardTargets.push(this.buildFabricEntry(children[c], obj));
              }
            }
          } else {
            this.cachedBoardTargets.push(this.buildFabricEntry(obj, null));
          }
        }
      }

this.cachedSurfaceCanvases = [];
      const surfaceSelector =
        SmartEraserSystem && SmartEraserSystem.isToolbarEraserSelected
          ? ".pen-surface-canvas, .pen-highlighter-canvas, .iqra-math-baked-canvas"
          : ".pen-surface-canvas, .iqra-math-baked-canvas";

      document.querySelectorAll(surfaceSelector).forEach((canvas) => {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          this.cachedSurfaceCanvases.push({
            canvas,
            rect,
            scaleX: canvas.width / rect.width,
            scaleY: canvas.height / rect.height,
          });
        }
      });

      this.cachedMathNodes = [];
      const mathSelectors =
        ".geom-measure-svg-layer, .geom-ruler-drawn-line, .geom-protractor-drawn-angle, .geom-compass-drawn-arc, .geom-setsquare-drawn-polyline, .geom-divider-punched-marks, .geom-angle-bisector-svg, .geom-parallel-construction-svg, .geom-perpendicular-svg, [class*='host-layer'] svg";
      document.querySelectorAll(mathSelectors).forEach((svg) => {
        if (svg.closest("#mathApparatusLayer")) return;
        svg.querySelectorAll("path, line, circle, ellipse, polyline, polygon, rect, text, tspan").forEach((el) => {
          if (el.closest("defs, mask") || el.getAttribute("data-iqra-baked") === "1") return;
          const b = el.getBoundingClientRect();
          if (b.width === 0 && b.height === 0) return;
          this.cachedMathNodes.push({
            el,
            bounds: b,
            tag: el.tagName.toLowerCase(),
            processed: false,
          });
        });
      });
    },

    buildFabricEntry(obj, parentGroup) {
      if (typeof obj.setCoords === "function") obj.setCoords();
      const bounds = obj.getBoundingRect(true, true);
      const matrix = obj.calcTransformMatrix();
      const invMatrix = fabric.util.invertTransform(matrix);
      const scaleAvg = ((obj.scaleX || 1) + (obj.scaleY || 1)) / 2 || 1;
      const worldVertices = this.extractObjectWorldPoints(obj, matrix);

      return {
        obj,
        parentGroup,
        bounds,
        invMatrix,
        scaleAvg,
        worldVertices,
        erasedVertexFlags: obj._iqraErasedVertexFlags || null,
        removed: false,
      };
    },

    extractObjectWorldPoints(obj, matrix) {
      const pts = [];
      if (obj.type === "path" && Array.isArray(obj.path)) {
        const ox = obj.pathOffset ? obj.pathOffset.x : 0;
        const oy = obj.pathOffset ? obj.pathOffset.y : 0;
        for (let i = 0; i < obj.path.length; i++) {
          const cmd = obj.path[i];
          const len = cmd.length;
          if (len >= 3) {
            const lx = cmd[len - 2] - ox;
            const ly = cmd[len - 1] - oy;
            if (Number.isFinite(lx) && Number.isFinite(ly)) {
              const wp = fabric.util.transformPoint(new fabric.Point(lx, ly), matrix);
              pts.push({ x: wp.x, y: wp.y });
            }
          }
        }
      } else if (obj.type === "line") {
        const p1 = fabric.util.transformPoint(new fabric.Point(obj.x1 || 0, obj.y1 || 0), matrix);
        const p2 = fabric.util.transformPoint(new fabric.Point(obj.x2 || 0, obj.y2 || 0), matrix);
        pts.push({ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y });
      }
      return pts;
    },

    scheduleBoardRender() {
      const fc = this.getFabricCanvas();
      if (!fc || this.renderQueued) return;
      this.renderQueued = true;
      requestAnimationFrame(() => {
        this.renderQueued = false;
        fc.requestRenderAll();
      });
    },

    distToSegment(p, a, b) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
      let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    },

    doesEraserTouchEntryInk(entry, centerPt, boardRadius) {
      const obj = entry.obj;
      const isFilledRibbon = obj.type === "path" && obj.fill && obj.fill !== "transparent" && obj.fill !== "none";
      const baseThickness = isFilledRibbon ? Math.max(obj.strokeWidth || 4, 14) : (obj.strokeWidth || 4);
      const strokePad = (baseThickness * entry.scaleAvg) / 2;
      const hitThreshold = boardRadius + strokePad;

      const verts = entry.worldVertices;
      if (verts && verts.length > 0) {
        if (verts.length === 1) {
          return Math.hypot(centerPt.x - verts[0].x, centerPt.y - verts[0].y) <= hitThreshold;
        }
        for (let i = 0; i < verts.length - 1; i++) {
          if (this.distToSegment(centerPt, verts[i], verts[i + 1]) <= hitThreshold) {
            return true;
          }
        }
        return false;
      }

      if (typeof obj.containsPoint === "function") {
        if (obj.containsPoint(centerPt)) return true;
        const r = hitThreshold * 0.9;
        const probes = [
          { x: r, y: 0 },
          { x: -r, y: 0 },
          { x: 0, y: r },
          { x: 0, y: -r },
          { x: r * 0.7, y: r * 0.7 },
          { x: -r * 0.7, y: r * 0.7 },
          { x: r * 0.7, y: -r * 0.7 },
          { x: -r * 0.7, y: -r * 0.7 },
        ];
        for (let i = 0; i < probes.length; i++) {
          if (obj.containsPoint({ x: centerPt.x + probes[i].x, y: centerPt.y + probes[i].y })) {
            return true;
          }
        }
        return false;
      }

      return true;
    },

    eraseOnWhiteboard(clientX, clientY, screenRadius) {
      const fc = this.getFabricCanvas();
      if (!fc || !fc.upperCanvasEl) return false;

      const cRect = fc.upperCanvasEl.getBoundingClientRect();
      if (
        clientX < cRect.left - screenRadius ||
        clientX > cRect.right + screenRadius ||
        clientY < cRect.top - screenRadius ||
        clientY > cRect.bottom + screenRadius
      ) {
        return false;
      }

      const zoom = fc.getZoom() || 1;
      const boardPt = this.screenToBoardPoint(fc, clientX, clientY);
      const boardRadius = screenRadius / zoom;

      const interpPts = this.interpolate(this.lastBoardPt, boardPt, Math.max(1.2, boardRadius * 0.22));
      this.lastBoardPt = { x: boardPt.x, y: boardPt.y };
      if (interpPts.length === 0) return false;

      const firstPt = interpPts[0];
      const segMinX = Math.min(boardPt.x, firstPt.x) - boardRadius - 12;
      const segMaxX = Math.max(boardPt.x, firstPt.x) + boardRadius + 12;
      const segMinY = Math.min(boardPt.y, firstPt.y) - boardRadius - 12;
      const segMaxY = Math.max(boardPt.y, firstPt.y) + boardRadius + 12;

      let modified = false;

      for (let i = 0; i < this.cachedBoardTargets.length; i++) {
        const entry = this.cachedBoardTargets[i];
        if (entry.removed) continue;

        const b = entry.bounds;
        if (b.left > segMaxX || b.left + b.width < segMinX || b.top > segMaxY || b.top + b.height < segMinY) {
          continue;
        }

        const hitPts = interpPts.filter((p) => {
          const nearX = Math.max(b.left, Math.min(p.x, b.left + b.width));
          const nearY = Math.max(b.top, Math.min(p.y, b.top + b.height));
          if (Math.hypot(p.x - nearX, p.y - nearY) > boardRadius + 12) return false;
          return this.doesEraserTouchEntryInk(entry, p, boardRadius);
        });

        if (hitPts.length === 0) continue;

        const obj = entry.obj;

        if (this.mode === "stroke") {
          if (entry.parentGroup) {
            entry.parentGroup.removeWithUpdate(obj);
            if (entry.parentGroup.getObjects().length === 0) {
              fc.remove(entry.parentGroup);
            }
          } else {
            fc.remove(obj);
          }
          entry.removed = true;
          modified = true;
          continue;
        }

        if (!obj._eraserClipD) {
          obj._eraserClipD = "M -15000 -15000 L -15000 -15000 M 15000 15000 L 15000 15000";
        }

        const effectiveRadius = boardRadius + 2 / zoom;
        const localRadius = effectiveRadius / entry.scaleAvg;
        const rStr = localRadius.toFixed(2);
        const dStr = (localRadius * 2).toFixed(2);
        let dAppend = "";

        for (let h = 0; h < hitPts.length; h++) {
          const localPt = fabric.util.transformPoint(new fabric.Point(hitPts[h].x, hitPts[h].y), entry.invMatrix);
          const lx = (localPt.x - localRadius).toFixed(2);
          const ly = localPt.y.toFixed(2);
          dAppend += ` M ${lx} ${ly} a ${rStr} ${rStr} 0 1 1 ${dStr} 0 a ${rStr} ${rStr} 0 1 1 -${dStr} 0 Z`;
        }

        obj._eraserClipD += dAppend;

        const clipPathObj = new fabric.Path(obj._eraserClipD, {
          left: 0,
          top: 0,
          originX: "center",
          originY: "center",
          fillRule: "nonzero",
          absolutePositioned: false,
          inverted: true,
          objectCaching: false,
        });
        clipPathObj.dirty = true;

        obj.clipPath = clipPathObj;
        obj.objectCaching = false;
        obj.perPixelTargetFind = true;
        obj.dirty = true;
        if (entry.parentGroup) {
          entry.parentGroup.objectCaching = false;
          entry.parentGroup.dirty = true;
        }
        modified = true;

        if (entry.worldVertices && entry.worldVertices.length > 0) {
          if (!entry.erasedVertexFlags) {
            entry.erasedVertexFlags = new Uint8Array(entry.worldVertices.length);
            obj._iqraErasedVertexFlags = entry.erasedVertexFlags;
          }
          let remainingCount = 0;
          for (let v = 0; v < entry.worldVertices.length; v++) {
            if (entry.erasedVertexFlags[v]) continue;
            const wp = entry.worldVertices[v];
            let isCutNow = false;
            for (let h = 0; h < hitPts.length; h++) {
              if (Math.hypot(wp.x - hitPts[h].x, wp.y - hitPts[h].y) <= effectiveRadius + 2) {
                isCutNow = true;
                break;
              }
            }
            if (isCutNow) {
              entry.erasedVertexFlags[v] = 1;
            } else {
              remainingCount++;
            }
          }

          if (remainingCount === 0) {
            if (entry.parentGroup) {
              entry.parentGroup.removeWithUpdate(obj);
              if (entry.parentGroup.getObjects().length === 0) fc.remove(entry.parentGroup);
            } else {
              fc.remove(obj);
            }
            entry.removed = true;
          }
        }
      }

      if (modified) {
        this.scheduleBoardRender();
      }
      return modified;
    },

    getSvgElementSignature(el) {
      if (!el || !el.tagName) return "";
      const tag = el.tagName.toLowerCase();
      if (tag === "path") return `path:${el.getAttribute("d") || ""}`;
      if (tag === "line") {
        return `line:${el.getAttribute("x1")},${el.getAttribute("y1")},${el.getAttribute("x2")},${el.getAttribute("y2")}`;
      }
      if (tag === "circle") {
        return `circle:${el.getAttribute("cx")},${el.getAttribute("cy")},${el.getAttribute("r")}`;
      }
      if (tag === "polyline" || tag === "polygon") {
        return `${tag}:${el.getAttribute("points") || ""}`;
      }
      if (tag === "text" || tag === "tspan") {
        return `text:${el.getAttribute("x")},${el.getAttribute("y")}:${el.textContent}`;
      }
      return "";
    },

    bakeMathSvgToCanvas(svgEl) {
      const svgRoot = svgEl.ownerSVGElement || svgEl.closest("svg");
      if (!svgRoot) return null;

      const paneContainer =
        svgRoot.closest("#renderTarget, #documentPane, #whiteboardPane, .wb-image-item") ||
        svgRoot.parentElement ||
        document.body;

      if (window.getComputedStyle(paneContainer).position === "static") {
        paneContainer.style.position = "relative";
      }

      let mathCanvas = paneContainer.querySelector(":scope > .iqra-math-baked-canvas");
      const parentRect = paneContainer.getBoundingClientRect();

      if (!mathCanvas) {
        mathCanvas = document.createElement("canvas");
        mathCanvas.className = "iqra-math-baked-canvas";
        mathCanvas.width = Math.max(1, Math.round(parentRect.width));
        mathCanvas.height = Math.max(1, Math.round(parentRect.height));
        mathCanvas.style.cssText =
          "position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:65;";
        paneContainer.appendChild(mathCanvas);
      }

      const ctx = mathCanvas.getContext("2d");
      const svgRect = svgRoot.getBoundingClientRect();
      const offsetX = svgRect.left - parentRect.left;
      const offsetY = svgRect.top - parentRect.top;

      svgRoot.querySelectorAll("path, line, circle, ellipse, polyline, polygon, rect, text").forEach((el) => {
        if (el.getAttribute("data-iqra-baked") === "1" || el.closest("defs, mask")) return;

        const sig = this.getSvgElementSignature(el);
        if (sig) this.bakedMathSignatures.add(sig);

        const cs = window.getComputedStyle(el);
        const stroke = cs.stroke && cs.stroke !== "none" ? cs.stroke : el.getAttribute("stroke") || "#1e293b";
        const fill = cs.fill && cs.fill !== "none" ? cs.fill : el.getAttribute("fill") || "none";
        const strokeWidth = parseFloat(cs.strokeWidth || el.getAttribute("stroke-width") || "2");

        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.strokeStyle = stroke;
        ctx.fillStyle = fill;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const tag = el.tagName.toLowerCase();
        if (tag === "line") {
          ctx.beginPath();
          ctx.moveTo(parseFloat(el.getAttribute("x1") || 0), parseFloat(el.getAttribute("y1") || 0));
          ctx.lineTo(parseFloat(el.getAttribute("x2") || 0), parseFloat(el.getAttribute("y2") || 0));
          ctx.stroke();
        } else if (tag === "circle") {
          ctx.beginPath();
          ctx.arc(
            parseFloat(el.getAttribute("cx") || 0),
            parseFloat(el.getAttribute("cy") || 0),
            parseFloat(el.getAttribute("r") || 0),
            0,
            Math.PI * 2
          );
          if (fill !== "none") ctx.fill();
          if (stroke !== "none") ctx.stroke();
        } else if (tag === "path") {
          const d = el.getAttribute("d");
          if (d) {
            const p2d = new Path2D(d);
            if (fill !== "none") ctx.fill(p2d);
            if (stroke !== "none") ctx.stroke(p2d);
          }
        } else if (tag === "polyline" || tag === "polygon") {
          const rawPts = (el.getAttribute("points") || "").trim().split(/[\s,]+/);
          if (rawPts.length >= 4) {
            ctx.beginPath();
            ctx.moveTo(parseFloat(rawPts[0]), parseFloat(rawPts[1]));
            for (let k = 2; k < rawPts.length; k += 2) {
              ctx.lineTo(parseFloat(rawPts[k]), parseFloat(rawPts[k + 1]));
            }
            if (tag === "polygon") ctx.closePath();
            if (fill !== "none") ctx.fill();
            if (stroke !== "none") ctx.stroke();
          }
        } else if (tag === "rect") {
          const rx = parseFloat(el.getAttribute("x") || 0);
          const ry = parseFloat(el.getAttribute("y") || 0);
          const rw = parseFloat(el.getAttribute("width") || 0);
          const rh = parseFloat(el.getAttribute("height") || 0);
          if (fill !== "none") ctx.fillRect(rx, ry, rw, rh);
          if (stroke !== "none") ctx.strokeRect(rx, ry, rw, rh);
        } else if (tag === "text") {
          ctx.font = `${cs.fontWeight || "bold"} ${cs.fontSize || "13px"} ${cs.fontFamily || "Arial, sans-serif"}`;
          ctx.fillStyle = fill !== "none" ? fill : "#0f172a";
          ctx.fillText(
            el.textContent || "",
            parseFloat(el.getAttribute("x") || 0),
            parseFloat(el.getAttribute("y") || 0)
          );
        }

        ctx.restore();

        el.setAttribute("data-iqra-baked", "1");
        el.style.setProperty("display", "none", "important");
        el.style.setProperty("opacity", "0", "important");
      });

      return mathCanvas;
    },

    eraseOnOverlaysAndMath(clientX, clientY, screenRadius) {
      let modified = false;

      if (this.cachedMathNodes.length > 0) {
        const curPt = { x: clientX, y: clientY };
        const interpPts = this.interpolate(this.lastMathScreenPt, curPt, Math.max(4, screenRadius * 0.4));
        this.lastMathScreenPt = curPt;

        for (let i = 0; i < this.cachedMathNodes.length; i++) {
          const item = this.cachedMathNodes[i];
          if (item.processed) continue;
          const b = item.bounds;

          const hit = interpPts.some((p) => {
            const nearX = Math.max(b.left, Math.min(p.x, b.right));
            const nearY = Math.max(b.top, Math.min(p.y, b.bottom));
            return Math.hypot(p.x - nearX, p.y - nearY) <= screenRadius;
          });

          if (hit) {
            if (this.mode === "stroke") {
              const svgRoot = item.el.ownerSVGElement || item.el.closest("svg");
              if (svgRoot) {
                svgRoot.querySelectorAll("path, line, circle, ellipse, polyline, polygon, rect, text, tspan").forEach((node) => {
                  const sig = this.getSvgElementSignature(node);
                  if (sig) this.bakedMathSignatures.add(sig);
                  node.setAttribute("data-iqra-baked", "1");
                  node.style.setProperty("display", "none", "important");
                  node.style.setProperty("opacity", "0", "important");
                });
              }
            } else {
              const bakedCanvas = this.bakeMathSvgToCanvas(item.el);
              if (bakedCanvas && !this.cachedSurfaceCanvases.some((c) => c.canvas === bakedCanvas)) {
                const rect = bakedCanvas.getBoundingClientRect();
                this.cachedSurfaceCanvases.push({
                  canvas: bakedCanvas,
                  rect,
                  scaleX: bakedCanvas.width / rect.width,
                  scaleY: bakedCanvas.height / rect.height,
                });
              }
            }
            item.processed = true;
            modified = true;
          }
        }
      }

      for (let i = 0; i < this.cachedSurfaceCanvases.length; i++) {
        const entry = this.cachedSurfaceCanvases[i];
        const rect = entry.rect;
        if (
          clientX < rect.left - screenRadius ||
          clientX > rect.right + screenRadius ||
          clientY < rect.top - screenRadius ||
          clientY > rect.bottom + screenRadius
        ) {
          continue;
        }

        const x = (clientX - rect.left) * entry.scaleX;
        const y = (clientY - rect.top) * entry.scaleY;
        const r = screenRadius * ((entry.scaleX + entry.scaleY) / 2);
        const prevPt = this.lastSurfacePts.get(entry.canvas);

        const ctx = entry.canvas.getContext("2d");
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = r * 2;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        if (prevPt) {
          ctx.beginPath();
          ctx.moveTo(prevPt.x, prevPt.y);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        ctx.restore();

        this.lastSurfacePts.set(entry.canvas, { x, y });
        modified = true;
      }

      return modified;
    },

    eraseAtPoint(clientX, clientY) {
      if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return false;
      const radius = EraserSizeController.getRadius();
      const didBoard = this.eraseOnWhiteboard(clientX, clientY, radius);
      const didOverlay = this.eraseOnOverlaysAndMath(clientX, clientY, radius);
      return didBoard || didOverlay;
    },
  };

  // ==========================================================================
  // 3. OPTION 2 CONTROLLER: ACTIVE PEN MODE (DOCK BUTTON #btnToggleActivePenMode)
  // ==========================================================================
  const SmartEraserSystem = {
    isToolbarEraserSelected: false,
    fingerEraserEnabled: true, // Default ON ("Active Pen" Mode ON)
    activePointerId: null,
    isGestureActive: false,
    gestureModifiedAnything: false,
    wasDrawingModeBeforeFingerErase: false,
    wasSelectionBeforeFingerErase: false,
    topBarPanel: null,
    savedDocViewportTouchAction: "",

    init() {
      this.buildControlBarUI();
      this.bindToolbarControls();
      this.bindDockActivePenButton();
      this.bindPointerPipeline();
      this.installMathReappearObserver();
    },

    setMode(newMode) {
      const m = newMode === "stroke" ? "stroke" : "partial";
      LayerErasingEngine.mode = m;

      const btnPartial = document.getElementById("btnModePartial");
      const btnStroke = document.getElementById("btnModeStroke");
      if (btnPartial && btnStroke) {
        if (m === "partial") {
          btnPartial.style.background = "#ef4444";
          btnPartial.style.borderColor = "#ef4444";
          btnPartial.style.color = "#ffffff";

          btnStroke.style.background = "#1e293b";
          btnStroke.style.borderColor = "#475569";
          btnStroke.style.color = "#cbd5e1";
        } else {
          btnStroke.style.background = "#ef4444";
          btnStroke.style.borderColor = "#ef4444";
          btnStroke.style.color = "#ffffff";

          btnPartial.style.background = "#1e293b";
          btnPartial.style.borderColor = "#475569";
          btnPartial.style.color = "#cbd5e1";
        }
      }
    },

    isAnyDrawingToolActive() {
      const penBtn = document.getElementById("penSuiteMainBtn");
      const isPenActive = penBtn ? penBtn.classList.contains("active") : false;
      const tool = window.activeTool || "";
      const drawingTools = ["pen", "highlighter", "line", "arrow", "rectangle", "circle", "triangle", "star"];
      const isGeomActive = Boolean(
        (window.AngleBisectorEngine && window.AngleBisectorEngine.isActive) ||
          (window.ParallelLineEngine && window.ParallelLineEngine.isActive) ||
          (window.PerpendicularEngine && window.PerpendicularEngine.isActive)
      );
      return isPenActive || drawingTools.includes(tool) || isGeomActive;
    },

    isUiControlTarget(target) {
      if (!target || !target.closest) return true;
      return Boolean(
        target.closest(
          "#floatingDock, #dockDrawerPanel, #eraserTopPanel, #penSuiteFlyout, #shapesFlyoutBox, #mathFlyoutBox, #bgSettingsPanel, #textFormatBar, #virtualKeyboard, #symbolsModal, .top-bar, .pane-header, .doc-footer, .wb-img-toolbar, .wb-ppt-handle, .wb-ppt-rot-knob, .math-instrument, .real-math-ruler, .real-math-protractor, .real-math-compass, .real-math-setsquare, .real-math-divider, button, input, select"
        )
      );
    },

    isDrawableWorkspaceTarget(target) {
      if (!target || !target.closest) return false;
      return Boolean(
        target.closest(
          "#whiteboardPane, #canvasWrapper, .upper-canvas, #documentPane, #docViewport, #renderTarget, .wb-image-item, .pen-surface-canvas"
        )
      );
    },

    lockDocumentScroll(lock) {
      const docViewport = document.getElementById("docViewport");
      const renderTarget = document.getElementById("renderTarget");
      if (docViewport) {
        if (lock) {
          this.savedDocViewportTouchAction = docViewport.style.touchAction || "";
          docViewport.style.touchAction = "none";
          docViewport.style.overflow = "hidden";
        } else {
          docViewport.style.touchAction = this.savedDocViewportTouchAction;
          docViewport.style.overflow = "";
        }
      }
      if (renderTarget) {
        renderTarget.style.touchAction = lock ? "none" : "";
      }
    },

    setFingerEraserEnabled(enabled) {
      this.fingerEraserEnabled = Boolean(enabled);
      const dockBtn = document.getElementById("btnToggleActivePenMode");
      const statusDot = document.getElementById("activePenStatusDot");
      if (dockBtn) {
        if (this.fingerEraserEnabled) {
          dockBtn.classList.add("active");
          dockBtn.title = "Active Pen: ON (Stylus writes, Finger erases)";
          dockBtn.style.background = "#ecfdf5";
          dockBtn.style.borderColor = "#10b981";
          dockBtn.style.color = "#059669";
          if (statusDot) statusDot.style.background = "#10b981";
        } else {
          dockBtn.classList.remove("active");
          dockBtn.title = "Active Pen: OFF (Finger & Passive Pen write normally)";
          dockBtn.style.background = "";
          dockBtn.style.borderColor = "";
          dockBtn.style.color = "";
          if (statusDot) statusDot.style.background = "#94a3b8";
        }
      }
    },

    bindDockActivePenButton() {
      const syncBtn = () => {
        const dockBtn = document.getElementById("btnToggleActivePenMode");
        if (!dockBtn) return;
        this.setFingerEraserEnabled(this.fingerEraserEnabled);
        if (!dockBtn._iqraActivePenBound) {
          dockBtn._iqraActivePenBound = true;
          dockBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.setFingerEraserEnabled(!this.fingerEraserEnabled);
          });
        }
      };

      syncBtn();
      setTimeout(syncBtn, 500);
    },

    activateToolbarEraser() {
      this.isToolbarEraserSelected = true;
      window.activeTool = "eraser";

      const penBtn = document.getElementById("penSuiteMainBtn");
      if (penBtn) penBtn.classList.remove("active");
      if (typeof window.deactivatePenSuite === "function") {
        window.deactivatePenSuite();
      }

      const fc = LayerErasingEngine.getFabricCanvas();
      if (fc) {
        fc._isCurrentlyDrawing = false;
        fc.isDrawingMode = false;
        fc.selection = false;
        fc.skipTargetFind = true;
        fc.discardActiveObject();
        fc.defaultCursor = "none";
        fc.hoverCursor = "none";
      }

      this.lockDocumentScroll(true);

      if (this.topBarPanel) {
        this.topBarPanel.style.display = "inline-flex";
      }
    },

    deactivateToolbarEraser() {
      if (!this.isToolbarEraserSelected) return;
      this.isToolbarEraserSelected = false;
      EraserSizeController.hide();
      this.lockDocumentScroll(false);

      if (this.topBarPanel) {
        this.topBarPanel.style.display = "none";
      }

      const fc = LayerErasingEngine.getFabricCanvas();
      if (fc) {
        fc.skipTargetFind = false;
        fc.selection = true;
        fc.defaultCursor = "default";
        fc.hoverCursor = "move";
      }
    },

    buildControlBarUI() {
      if (document.getElementById("eraserTopPanel")) return;

      const panel = document.createElement("div");
      panel.id = "eraserTopPanel";
      panel.style.cssText = `
        position: fixed;
        top: 14px;
        left: 50%;
        transform: translateX(-50%);
        display: none;
        flex-direction: row;
        align-items: center;
        gap: 10px;
        background: #0f172a;
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.22);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.45);
        padding: 7px 16px;
        border-radius: 9999px;
        z-index: 100000000;
        font-family: Arial, sans-serif;
        user-select: none;
        white-space: nowrap;
      `;

      panel.innerHTML = `
        <span style="font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase;">Size:</span>
        <span id="lblEraserVal" style="font-size:12px; font-weight:bold; color:#38bdf8; min-width:38px;">${EraserSizeController.getDiameter()}px</span>
        <input type="range" id="eraserSizeRange" min="1" max="150" value="${EraserSizeController.getDiameter()}" style="width:110px; cursor:pointer; accent-color:#ef4444;" />
        <div style="height:16px; width:1px; background:rgba(255,255,255,0.2);"></div>
        <div style="display:flex; gap:5px;">
          <button type="button" id="btnModePartial" style="padding:4px 11px; font-size:11px; font-weight:bold; border:1px solid #ef4444; background:#ef4444; color:#ffffff; border-radius:20px; cursor:pointer;">Partial</button>
          <button type="button" id="btnModeStroke" style="padding:4px 11px; font-size:11px; font-weight:bold; border:1px solid #475569; background:#1e293b; color:#cbd5e1; border-radius:20px; cursor:pointer;">Stroke</button>
        </div>
        <button type="button" id="btnCloseEraserBar" title="Close Eraser Bar" style="background:none; border:none; color:#94a3b8; font-size:20px; font-weight:bold; cursor:pointer; line-height:1; padding:0 4px; margin-left:2px;">&times;</button>
      `;

      document.body.appendChild(panel);
      this.topBarPanel = panel;

      panel.querySelector("#eraserSizeRange").addEventListener("input", (e) => {
        EraserSizeController.setSize(e.target.value);
      });

      panel.querySelector("#btnModePartial").addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setMode("partial");
      });

      panel.querySelector("#btnModeStroke").addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setMode("stroke");
      });

      panel.querySelector("#btnCloseEraserBar").addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.deactivateToolbarEraser();
      });
    },

    bindToolbarControls() {
      document.addEventListener(
        "click",
        (e) => {
          const eraserBtn = e.target.closest('[data-tool="eraser"]');
          if (eraserBtn) {
            e.stopPropagation();
            this.activateToolbarEraser();
            return;
          }

          if (this.topBarPanel && this.topBarPanel.contains(e.target)) return;
          if (e.target.closest("#btnToggleActivePenMode")) return;

          const otherTool = e.target.closest(".tool-btn[data-tool], #penSuiteMainBtn");
          if (otherTool && otherTool.getAttribute("data-tool") !== "eraser") {
            this.deactivateToolbarEraser();
          }
        },
        true
      );
    },

    bindPointerPipeline() {
      window.addEventListener(
        "pointermove",
        (e) => {
          if (this.isToolbarEraserSelected && !this.isGestureActive) {
            if (this.isDrawableWorkspaceTarget(e.target) && !this.isUiControlTarget(e.target)) {
              EraserSizeController.showAt(e.clientX, e.clientY);
            } else {
              EraserSizeController.hide();
            }
          }
        },
        { passive: true }
      );

      window.addEventListener(
        "pointerdown",
        (e) => {
          if (this.isGestureActive || this.activePointerId !== null) return;
          if (e.pointerType === "mouse" && e.button !== 0) return;
          if (this.isUiControlTarget(e.target) || !this.isDrawableWorkspaceTarget(e.target)) return;

          // Active Stylus (pointerType === "pen") is NEVER intercepted when drawing tools are active
          const isTouch = e.pointerType === "touch";

          let shouldErase = false;
          if (this.isToolbarEraserSelected) {
            shouldErase = true;
          } else if (isTouch && this.fingerEraserEnabled && this.isAnyDrawingToolActive()) {
            shouldErase = true;
          }

          if (!shouldErase) return;

          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          if (this.topBarPanel && this.topBarPanel.style.display !== "none") {
            this.topBarPanel.style.display = "none";
          }

          this.isGestureActive = true;
          this.activePointerId = e.pointerId;
          this.gestureModifiedAnything = false;

          if (!this.isToolbarEraserSelected) {
            this.lockDocumentScroll(true);
          }

          const fc = LayerErasingEngine.getFabricCanvas();
          if (fc) {
            this.wasDrawingModeBeforeFingerErase = fc.isDrawingMode;
            this.wasSelectionBeforeFingerErase = fc.selection;
            fc._isCurrentlyDrawing = false;
            fc.isDrawingMode = false;
            fc.selection = false;
            fc.skipTargetFind = true;
            fc.discardActiveObject();
          }

          LayerErasingEngine.resetGestureCaches();
          LayerErasingEngine.prepareGestureCaches();

          EraserSizeController.showAt(e.clientX, e.clientY);
          if (LayerErasingEngine.eraseAtPoint(e.clientX, e.clientY)) {
            this.gestureModifiedAnything = true;
          }
        },
        { passive: false, capture: true }
      );

      window.addEventListener(
        "pointermove",
        (e) => {
          if (!this.isGestureActive || e.pointerId !== this.activePointerId) return;
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          EraserSizeController.showAt(e.clientX, e.clientY);
          if (LayerErasingEngine.eraseAtPoint(e.clientX, e.clientY)) {
            this.gestureModifiedAnything = true;
          }
        },
        { passive: false, capture: true }
      );

      const finishGesture = (e) => {
        if (!this.isGestureActive) return;
        if (e && e.pointerId !== undefined && e.pointerId !== this.activePointerId) return;

        this.isGestureActive = false;
        this.activePointerId = null;

        if (!this.isToolbarEraserSelected) {
          EraserSizeController.hide();
          this.lockDocumentScroll(false);
        }

        const fc = LayerErasingEngine.getFabricCanvas();
        if (fc && !this.isToolbarEraserSelected) {
          fc.isDrawingMode = Boolean(this.wasDrawingModeBeforeFingerErase);
          fc.selection = Boolean(this.wasSelectionBeforeFingerErase);
          fc.skipTargetFind = false;
        }

        if (this.gestureModifiedAnything) {
          if (typeof window.saveCanvasState === "function") {
            window.saveCanvasState();
          }
          if (typeof window.saveCurrentPdfPageAnnotations === "function") {
            window.saveCurrentPdfPageAnnotations();
          }
        }

        LayerErasingEngine.resetGestureCaches();
      };

      window.addEventListener("pointerup", finishGesture, true);
      window.addEventListener("pointercancel", finishGesture, true);
    },

    installMathReappearObserver() {
      const observer = new MutationObserver(() => {
        if (LayerErasingEngine.bakedMathSignatures.size === 0) return;
        document
          .querySelectorAll(
            ".geom-measure-svg-layer *, .geom-ruler-drawn-line *, .geom-protractor-drawn-angle *, .geom-compass-drawn-arc *, .geom-setsquare-drawn-polyline *, .geom-divider-punched-marks *, .geom-angle-bisector-svg *, .geom-parallel-construction-svg *, .geom-perpendicular-svg *"
          )
          .forEach((el) => {
            if (el.getAttribute("data-iqra-baked") === "1") return;
            const sig = LayerErasingEngine.getSvgElementSignature(el);
            if (sig && LayerErasingEngine.bakedMathSignatures.has(sig)) {
              el.setAttribute("data-iqra-baked", "1");
              el.style.setProperty("display", "none", "important");
              el.style.setProperty("opacity", "0", "important");
            }
          });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    },
  };

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => SmartEraserSystem.init(), 300);
  });

  window.IqraSmartEraser = {
    setSize: (px) => EraserSizeController.setSize(px),
    getSize: () => EraserSizeController.getDiameter(),
    setMode: (mode) => SmartEraserSystem.setMode(mode),
    getMode: () => LayerErasingEngine.mode,
    setFingerEraser: (enabled) => SmartEraserSystem.setFingerEraserEnabled(enabled),
    isFingerEraserOn: () => SmartEraserSystem.fingerEraserEnabled,
    activate: () => SmartEraserSystem.activateToolbarEraser(),
    deactivate: () => SmartEraserSystem.deactivateToolbarEraser(),
  };
  window.SmartEraserEngine = SmartEraserSystem;
})(window);