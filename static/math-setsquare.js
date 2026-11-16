// ========================================================
// DUAL SET SQUARE APPARATUS (45°-45°-90° & 30°-60°-90°)
// Exact Image-2 Join Pose + Clean "Join" Button
// True Trimmed Outer Perimeter Tracing + Uniform Line Closure
// ========================================================
(function (window) {
  "use strict";

  const PEN_CURSOR_URL = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%230284c7' stroke='%23ffffff' stroke-width='1.5' d='M3 21l3.75-.75L19.5 7.5a2.12 2.12 0 0 0-3-3L3.75 17.25 3 21z'/%3E%3Ccircle cx='3' cy='21' r='1.5' fill='%23ef4444'/%3E%3C/svg%3E") 3 21, crosshair`;

  function injectNeutralSetSquareStyles() {
    if (document.getElementById("setsquare-neutral-styles")) return;
    const style = document.createElement("style");
    style.id = "setsquare-neutral-styles";
    style.textContent = `
      .real-math-setsquare .setsquare-edge-draw-path,
      .real-math-setsquare .setsquare-edge-draw-path:hover,
      .real-math-setsquare .setsquare-edge-draw-path:active {
        stroke: transparent !important;
        background: transparent !important;
        outline: none !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  const SetSquareEngine = {
    overlayLayer: null,
    placementOverlay: null,
    wasDrawingModeBefore: false,
    isGlobalEventsBound: false,
    isWaitingForPlacement: false,

    pxPerCm: 20,
    outOffset: 2.5,

    instances: {
      sq45: null,
      sq3060: null
    },

    isCombinedLocked: false,

    activeInteraction: {
      instanceKey: null,
      mode: null,
      startX: 0,
      startY: 0,
      startAngleOffset: 0,
      initialSizeCm: 16,
      startDragClientX: 0
    },

drawSession: {
      isDrawing: false,
      instanceKey: null,
      activeTarget: null,
      activeSvg: null,
      activePolylineEl: null,
      startEdgeIdx: -1,
      activeEdgeIdx: -1,
      perimeterEdges: [],
      screenPoints: []
    },

    init: function () {
      injectNeutralSetSquareStyles();
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
      let pOverlay = document.getElementById("setSquarePlacementOverlay");
      if (!pOverlay) {
        pOverlay = document.createElement("div");
        pOverlay.id = "setSquarePlacementOverlay";
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
      const btn = document.querySelector('[data-math-tool="setsquare"]') || document.querySelector('[data-math-tool="set-square"]');
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
      this.closeAll();
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

      this.spawnInstance("sq45", clientX, clientY, 16, 0);
    },

    detectTargetAt: function (screenX, screenY) {
      const renderTarget = document.getElementById("renderTarget");
      if (renderTarget && renderTarget.style.display !== "none" && renderTarget.offsetWidth > 0) {
        const r = renderTarget.getBoundingClientRect();
        if (screenX >= r.left && screenX <= r.right && screenY >= r.top && screenY <= r.bottom) {
          let pdfLayer = renderTarget.querySelector(".pdf-setsquare-host-layer");
          if (!pdfLayer) {
            pdfLayer = document.createElement("div");
            pdfLayer.className = "pdf-setsquare-host-layer";
            pdfLayer.style.cssText = "position:absolute; inset:0; pointer-events:none; z-index:999; overflow:visible;";
            if (window.getComputedStyle(renderTarget).position === "static") {
              renderTarget.style.position = "relative";
            }
            renderTarget.appendChild(pdfLayer);
          }
          return { type: "pdf", container: pdfLayer };
        }
      }

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

      const wb = document.getElementById("whiteboardContainer") || 
                 document.getElementById("canvasWrapper") || 
                 document.querySelector(".canvas-container") || 
                 document.body;
      if (window.getComputedStyle(wb).position === "static") {
        wb.style.position = "relative";
      }
      return { type: "board", container: wb };
    },

    getDimensions: function (type, sizeCm) {
      const basePx = sizeCm * this.pxPerCm;
      if (type === "sq45") {
        return { widthPx: basePx, heightPx: basePx };
      } else {
        const hyp = basePx * Math.SQRT2;
        return {
          widthPx: Math.round(hyp * 0.5),
          heightPx: Math.round(hyp * (Math.sqrt(3) / 2))
        };
      }
    },

    getWorldVertices: function (inst, testX, testY, testAngle) {
      const x = testX !== undefined ? testX : inst.x;
      const y = testY !== undefined ? testY : inst.y;
      const ang = testAngle !== undefined ? testAngle : inst.angle;
      const { widthPx, heightPx } = this.getDimensions(inst.type, inst.sizeCm);
      const rad = (ang * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      return [
        { x: x, y: y },                                           // pA (90°)
        { x: x + widthPx * cos, y: y + widthPx * sin },           // pB (Top-Right: 45° or 60°)
        { x: x - heightPx * sin, y: y + heightPx * cos }          // pC (Bottom-Left: 45° or 30°)
      ];
    },

    getWorldEdgesWithOutwardNormals: function (inst, customX, customY, customAngle) {
      const [pA, pB, pC] = this.getWorldVertices(inst, customX, customY, customAngle);
      const centroid = {
        x: (pA.x + pB.x + pC.x) / 3,
        y: (pA.y + pB.y + pC.y) / 3
      };

      const buildEdge = (name, v1, v2) => {
        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        const len = Math.hypot(dx, dy) || 1;
        const dir = { x: dx / len, y: dy / len };
        let outN = { x: -dir.y, y: dir.x };

        const mid = { x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 };
        if ((mid.x - centroid.x) * outN.x + (mid.y - centroid.y) * outN.y < 0) {
          outN = { x: -outN.x, y: -outN.y };
        }

        return {
          owner: inst.type,
          name,
          p1: v1,
          p2: v2,
          dir,
          len,
          outN
        };
      };

      return [
        buildEdge("top", pA, pB),
        buildEdge("left", pA, pC),
        buildEdge("hyp", pB, pC)
      ];
    },

    // ========================================================
    // EXACT IMAGE-2 JOIN POSE (30° UP, 60° DOWN, SLIDING OFFSET)
    // ========================================================
    autoDockPerfectly: function () {
      const sq45 = this.instances.sq45;
      const sq3060 = this.instances.sq3060;
      if (!sq45 || !sq3060) return;

      sq3060.sizeCm = sq45.sizeCm;
      this.renderInstance("sq3060");

      const edges45 = this.getWorldEdgesWithOutwardNormals(sq45);
      const hyp45 = edges45.find(e => e.name === "hyp");

      // In sq3060: pB is 60° corner, pC is 30° corner.
      // Image-2 pose: 30° corner (pC) points UP-RIGHT along -hyp45.dir, and 60° corner (pB) points DOWN-LEFT along +hyp45.dir!
      // Therefore sq3060's hypotenuse (pB -> pC) must align with (-hyp45.dir).
      const { widthPx: w2, heightPx: h2 } = this.getDimensions("sq3060", sq3060.sizeCm);
      const localHypAngle = Math.atan2(h2 - 0, 0 - w2);
      const targetWorldHypAngle = Math.atan2(-hyp45.dir.y, -hyp45.dir.x);

      const requiredAngleDeg = ((targetWorldHypAngle - localHypAngle) * 180) / Math.PI;
      sq3060.angle = requiredAngleDeg;

      const rad = (requiredAngleDeg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      // Slide sq3060 slightly up-right along hyp45 so 30° extends cleanly above the 45° top edge (exact Image-2 look!)
      const slideShift = hyp45.len * 0.28;
      const targetPBx = hyp45.p2.x - hyp45.dir.x * slideShift;
      const targetPBy = hyp45.p2.y - hyp45.dir.y * slideShift;

      sq3060.x = targetPBx - w2 * cos;
      sq3060.y = targetPBy - w2 * sin;

      this.renderInstance("sq3060");
      this.setCombinedColorState(true);
    },

    // ========================================================
    // MAGNETIC SNAP + ANTI-OVERLAP BREAKER
    // ========================================================
    resolveCollisionAndSnap: function (movingInst, proposedX, proposedY) {
      const partnerKey = movingInst.type === "sq45" ? "sq3060" : "sq45";
      const staticInst = this.instances[partnerKey];

      if (!staticInst) {
        this.setCombinedColorState(false);
        return { x: proposedX, y: proposedY, angle: movingInst.angle };
      }

      let finalX = proposedX;
      let finalY = proposedY;
      let finalAngle = movingInst.angle;

      const movingEdges = this.getWorldEdgesWithOutwardNormals(movingInst, finalX, finalY, finalAngle);
      const staticEdges = this.getWorldEdgesWithOutwardNormals(staticInst, staticInst.x, staticInst.y, staticInst.angle);

      let snapped = false;

      for (let i = 0; i < movingEdges.length; i++) {
        const mEdge = movingEdges[i];
        for (let j = 0; j < staticEdges.length; j++) {
          const sEdge = staticEdges[j];

          const dotN = mEdge.outN.x * sEdge.outN.x + mEdge.outN.y * sEdge.outN.y;
          if (dotN < -0.975) {
            const vx = sEdge.p1.x - mEdge.p1.x;
            const vy = sEdge.p1.y - mEdge.p1.y;
            const perpGap = vx * mEdge.outN.x + vy * mEdge.outN.y;

            const projS1 = (sEdge.p1.x - mEdge.p1.x) * mEdge.dir.x + (sEdge.p1.y - mEdge.p1.y) * mEdge.dir.y;
            const projS2 = (sEdge.p2.x - mEdge.p1.x) * mEdge.dir.x + (sEdge.p2.y - mEdge.p1.y) * mEdge.dir.y;
            const overlapLen = Math.min(mEdge.len, Math.max(projS1, projS2)) - Math.max(0, Math.min(projS1, projS2));

            if (Math.abs(perpGap) <= 22 && overlapLen > 25) {
              const currentNormalAng = Math.atan2(mEdge.outN.y, mEdge.outN.x);
              const targetNormalAng = Math.atan2(-sEdge.outN.y, -sEdge.outN.x);
              let deltaDeg = ((targetNormalAng - currentNormalAng) * 180) / Math.PI;
              while (deltaDeg > 180) deltaDeg -= 360;
              while (deltaDeg < -180) deltaDeg += 360;

              finalAngle += deltaDeg;

              const lockedEdge = this.getWorldEdgesWithOutwardNormals(movingInst, finalX, finalY, finalAngle)[i];
              const exactGap = (sEdge.p1.x - lockedEdge.p1.x) * lockedEdge.outN.x + (sEdge.p1.y - lockedEdge.p1.y) * lockedEdge.outN.y;
              finalX += lockedEdge.outN.x * exactGap;
              finalY += lockedEdge.outN.y * exactGap;

              snapped = true;
              break;
            }
          }
        }
        if (snapped) break;
      }

      const pushed = this.pushOutSAT(movingInst, finalX, finalY, finalAngle, staticInst);
      finalX = pushed.x;
      finalY = pushed.y;

      const isValidDock = this.validatePureEdgeContact(movingInst, finalX, finalY, finalAngle, staticInst);
      this.setCombinedColorState(isValidDock);

      return { x: finalX, y: finalY, angle: finalAngle };
    },

    pushOutSAT: function (movingInst, testX, testY, testAngle, staticInst) {
      const polyA = this.getWorldVertices(movingInst, testX, testY, testAngle);
      const polyB = this.getWorldVertices(staticInst, staticInst.x, staticInst.y, staticInst.angle);
      const polygons = [polyA, polyB];

      let minOverlap = Infinity;
      let smallestAxis = null;

      for (let i = 0; i < polygons.length; i++) {
        const polygon = polygons[i];
        for (let i1 = 0; i1 < polygon.length; i1++) {
          const i2 = (i1 + 1) % polygon.length;
          const p1 = polygon[i1];
          const p2 = polygon[i2];

          const normal = { x: -(p2.y - p1.y), y: p2.x - p1.x };
          const len = Math.hypot(normal.x, normal.y) || 1;
          normal.x /= len;
          normal.y /= len;

          let minA = Infinity, maxA = -Infinity;
          for (let j = 0; j < polyA.length; j++) {
            const proj = polyA[j].x * normal.x + polyA[j].y * normal.y;
            if (proj < minA) minA = proj;
            if (proj > maxA) maxA = proj;
          }

          let minB = Infinity, maxB = -Infinity;
          for (let j = 0; j < polyB.length; j++) {
            const proj = polyB[j].x * normal.x + polyB[j].y * normal.y;
            if (proj < minB) minB = proj;
            if (proj > maxB) maxB = proj;
          }

          if (maxA <= minB + 0.5 || maxB <= minA + 0.5) {
            return { x: testX, y: testY };
          }

          const overlap = Math.min(maxA - minB, maxB - minA);
          if (overlap < minOverlap) {
            minOverlap = overlap;
            smallestAxis = normal;
          }
        }
      }

      if (smallestAxis && minOverlap > 0.5) {
        const centerA = {
          x: (polyA[0].x + polyA[1].x + polyA[2].x) / 3,
          y: (polyA[0].y + polyA[1].y + polyA[2].y) / 3
        };
        const centerB = {
          x: (polyB[0].x + polyB[1].x + polyB[2].x) / 3,
          y: (polyB[0].y + polyB[1].y + polyB[2].y) / 3
        };

        const sign = ((centerA.x - centerB.x) * smallestAxis.x + (centerA.y - centerB.y) * smallestAxis.y) < 0 ? -1 : 1;

        return {
          x: testX + smallestAxis.x * minOverlap * sign,
          y: testY + smallestAxis.y * minOverlap * sign
        };
      }

      return { x: testX, y: testY };
    },

    validatePureEdgeContact: function (instA, ax, ay, aAngle, instB) {
      if (!instA || !instB) return false;

      const polyA = this.getWorldVertices(instA, ax, ay, aAngle);
      const polyB = this.getWorldVertices(instB, instB.x, instB.y, instB.angle);
      const polygons = [polyA, polyB];
      let isSeparated = false;

      for (let i = 0; i < polygons.length; i++) {
        const polygon = polygons[i];
        for (let i1 = 0; i1 < polygon.length; i1++) {
          const i2 = (i1 + 1) % polygon.length;
          const normal = { x: -(polygon[i2].y - polygon[i1].y), y: polygon[i2].x - polygon[i1].x };
          let minA = Infinity, maxA = -Infinity;
          for (let p of polyA) { const pr = p.x * normal.x + p.y * normal.y; if (pr < minA) minA = pr; if (pr > maxA) maxA = pr; }
          let minB = Infinity, maxB = -Infinity;
          for (let p of polyB) { const pr = p.x * normal.x + p.y * normal.y; if (pr < minB) minB = pr; if (pr > maxB) maxB = pr; }
          if (maxA <= minB + 1.5 || maxB <= minA + 1.5) {
            isSeparated = true;
            break;
          }
        }
        if (isSeparated) break;
      }

      if (!isSeparated) return false;

      const edgesA = this.getWorldEdgesWithOutwardNormals(instA, ax, ay, aAngle);
      const edgesB = this.getWorldEdgesWithOutwardNormals(instB, instB.x, instB.y, instB.angle);

      for (let eA of edgesA) {
        for (let eB of edgesB) {
          const dotN = eA.outN.x * eB.outN.x + eA.outN.y * eB.outN.y;
          if (dotN < -0.996) {
            const perpGap = Math.abs((eB.p1.x - eA.p1.x) * eA.outN.x + (eB.p1.y - eA.p1.y) * eA.outN.y);
            if (perpGap <= 3.5) {
              const p1 = (eB.p1.x - eA.p1.x) * eA.dir.x + (eB.p1.y - eA.p1.y) * eA.dir.y;
              const p2 = (eB.p2.x - eA.p1.x) * eA.dir.x + (eB.p2.y - eA.p1.y) * eA.dir.y;
              const overlap = Math.min(eA.len, Math.max(p1, p2)) - Math.max(0, Math.min(p1, p2));
              if (overlap > 25) return true;
            }
          }
        }
      }
      return false;
    },

    setCombinedColorState: function (isCombined) {
      if (this.isCombinedLocked === isCombined) return;
      this.isCombinedLocked = isCombined;

      ["sq45", "sq3060"].forEach((key) => {
        const inst = this.instances[key];
        if (!inst || !inst.el) return;

        const isPrimary = key === "sq45";
        const body = inst.el.querySelector(`#sqDragBody_${key}`);
        const texts = inst.el.querySelectorAll(".sq-angle-label");

        if (isCombined) {
          if (body) {
            body.setAttribute("fill", "rgba(237, 233, 254, 0.72)");
            body.setAttribute("stroke", "#7c3aed");
            body.setAttribute("stroke-width", "2.2");
          }
          texts.forEach(t => t.setAttribute("fill", "#6d28d9"));
        } else {
          if (body) {
            body.setAttribute("fill", isPrimary ? "rgba(224, 242, 254, 0.58)" : "rgba(209, 250, 229, 0.58)");
            body.setAttribute("stroke", isPrimary ? "#0284c7" : "#059669");
            body.setAttribute("stroke-width", "1.8");
          }
          texts.forEach(t => t.setAttribute("fill", isPrimary ? "#0369a1" : "#047857"));
        }
      });
    },

    // ========================================================
    // TRUE TRIMMED OUTER PERIMETER BUILDER (EXCLUDES ALL INTERNAL SEAMS)
    // ========================================================
    buildActivePerimeterEdges: function () {
      const off = this.outOffset;
      const rawAll = [];

      const collect = (inst) => {
        if (!inst) return;
        const edges = this.getWorldEdgesWithOutwardNormals(inst);
        edges.forEach((e) => {
          rawAll.push({
            owner: e.owner,
            name: e.name,
            rawP1: e.p1,
            rawP2: e.p2,
            dir: e.dir,
            len: e.len,
            outN: e.outN
          });
        });
      };

      if (this.isCombinedLocked && this.instances.sq45 && this.instances.sq3060) {
        collect(this.instances.sq45);
        collect(this.instances.sq3060);

        const exposedSegments = [];

        // Trim away ANY portion of an edge that touches the partner's edge!
        for (let edge of rawAll) {
          let cutStart = 0;
          let cutEnd = edge.len;
          let hasOverlap = false;

          for (let other of rawAll) {
            if (other.owner === edge.owner) continue;
            const dotN = edge.outN.x * other.outN.x + edge.outN.y * other.outN.y;
            if (dotN < -0.98) {
              const perpDist = Math.abs((other.rawP1.x - edge.rawP1.x) * edge.outN.x + (other.rawP1.y - edge.rawP1.y) * edge.outN.y);
              if (perpDist <= 5) {
                const t1 = (other.rawP1.x - edge.rawP1.x) * edge.dir.x + (other.rawP1.y - edge.rawP1.y) * edge.dir.y;
                const t2 = (other.rawP2.x - edge.rawP1.x) * edge.dir.x + (other.rawP2.y - edge.rawP1.y) * edge.dir.y;
                const oMin = Math.max(0, Math.min(t1, t2));
                const oMax = Math.min(edge.len, Math.max(t1, t2));
                if (oMax > oMin + 2) {
                  hasOverlap = true;
                  cutStart = oMin;
                  cutEnd = oMax;
                }
              }
            }
          }

          const addExposedPiece = (tA, tB) => {
            if (tB - tA < 8) return; // Ignore tiny slivers
            const rp1 = { x: edge.rawP1.x + edge.dir.x * tA, y: edge.rawP1.y + edge.dir.y * tA };
            const rp2 = { x: edge.rawP1.x + edge.dir.x * tB, y: edge.rawP1.y + edge.dir.y * tB };
            exposedSegments.push({
              id: `${edge.owner}_${edge.name}_${Math.round(tA)}`,
              p1: { x: rp1.x + edge.outN.x * off, y: rp1.y + edge.outN.y * off },
              p2: { x: rp2.x + edge.outN.x * off, y: rp2.y + edge.outN.y * off },
              dir: edge.dir,
              len: tB - tA,
              outN: edge.outN
            });
          };

          if (!hasOverlap) {
            addExposedPiece(0, edge.len);
          } else {
            // Only keep the exposed parts sticking outside the joint!
            addExposedPiece(0, cutStart);
            addExposedPiece(cutEnd, edge.len);
          }
        }

        return exposedSegments;
      } else {
        const inst = this.instances[this.drawSession.instanceKey];
        collect(inst);
        return rawAll.map((e) => ({
          id: `${e.owner}_${e.name}`,
          p1: { x: e.rawP1.x + e.outN.x * off, y: e.rawP1.y + e.outN.y * off },
          p2: { x: e.rawP2.x + e.outN.x * off, y: e.rawP2.y + e.outN.y * off },
          dir: e.dir,
          len: e.len,
          outN: e.outN
        }));
      }
    },

    projectOnEdge: function (edge, pt) {
      const vx = pt.x - edge.p1.x;
      const vy = pt.y - edge.p1.y;
      const rawT = vx * edge.dir.x + vy * edge.dir.y;
      const clampedT = Math.max(0, Math.min(edge.len, rawT));
      const point = {
        x: edge.p1.x + clampedT * edge.dir.x,
        y: edge.p1.y + clampedT * edge.dir.y
      };
      return {
        point,
        t: clampedT,
        rawT,
        dist: Math.hypot(pt.x - point.x, pt.y - point.y)
      };
    },

    spawnInstance: function (type, x, y, sizeCm, angle) {
      this.closeInstance(type);

      const isPrimary = type === "sq45";
      const el = document.createElement("div");
      el.className = "real-math-setsquare";
      el.id = isPrimary ? "realMathSetSquare45" : "realMathSetSquare3060";
      el.style.cssText = `
        position: fixed !important;
        pointer-events: auto;
        user-select: none;
        touch-action: none;
        z-index: ${isPrimary ? 10000000 : 10000001};
        transform-origin: 0 0;
      `;

      const partnerControls = isPrimary
        ? `<div style="position:absolute; left:18px; top:34%; display:flex; flex-direction:column; gap:5px; z-index:55;">
             <button type="button" id="btnTogglePartnerSq" title="Open/Close 30°-60°-90° Set Square" style="cursor:pointer; background:#059669; color:#fff; border:1.5px solid #fff; border-radius:12px; padding:3px 8px; font-size:10px; font-weight:700; box-shadow:0 2px 6px rgba(0,0,0,0.25); white-space:nowrap; display:flex; align-items:center; gap:4px;">
               <i class="fa-solid fa-plus"></i> 30°/60°
             </button>
             <button type="button" id="btnAutoJoinSq" title="Join Set Squares" style="display:none; cursor:pointer; background:#7c3aed; color:#fff; border:1.5px solid #fff; border-radius:12px; padding:3px 10px; font-size:10px; font-weight:700; box-shadow:0 2px 6px rgba(0,0,0,0.25); white-space:nowrap; align-items:center; gap:4px;">
               <i class="fa-solid fa-magnet"></i> Join
             </button>
           </div>`
        : "";

      const borderColor = isPrimary ? "#0284c7" : "#059669";

      el.innerHTML = `
        <button type="button" class="setsquare-close-pin" id="sqClose_${type}" title="Close" style="position:absolute; z-index:50; cursor:pointer;">&times;</button>
        <div class="setsquare-rotate-dial" id="sqRotate_${type}" title="Rotate" style="position:absolute; z-index:50; cursor:grab; display:flex; align-items:center; justify-content:center; width:22px; height:22px; background:#fff; border:1.5px solid ${borderColor}; border-radius:50%; box-shadow:0 2px 6px rgba(0,0,0,0.2);"><i class="fa-solid fa-arrows-rotate" style="font-size:11px; color:${borderColor};"></i></div>
        <div class="setsquare-scale-pin" id="sqScale_${type}" title="Resize" style="position:absolute; z-index:50; cursor:nwse-resize; display:flex; align-items:center; justify-content:center; width:22px; height:22px; background:#fff; border:1.5px solid ${borderColor}; border-radius:50%; box-shadow:0 2px 6px rgba(0,0,0,0.2);"><i class="fa-solid fa-up-right-and-down-left-from-center" style="font-size:11px; color:${borderColor};"></i></div>
        ${partnerControls}
        <span class="setsquare-live-badge" id="sqBadge_${type}" style="display:none; position:absolute; font-size:11px; font-weight:bold; background:${borderColor}; color:#fff; padding:2px 7px; border-radius:4px; box-shadow:0 2px 6px rgba(0,0,0,0.3); z-index:60; pointer-events:none;">0.0 cm</span>
        <svg id="sqSvg_${type}" style="display:block; overflow:visible;"></svg>
      `;

      this.overlayLayer.appendChild(el);

      this.instances[type] = {
        type,
        el,
        x,
        y,
        sizeCm,
        angle
      };

      this.renderInstance(type);

      el.querySelector(`#sqClose_${type}`).onclick = (e) => {
        e.stopPropagation();
        this.closeInstance(type);
        if (type === "sq3060" && this.instances.sq45 && this.instances.sq45.el) {
          const btnPartner = this.instances.sq45.el.querySelector("#btnTogglePartnerSq");
          const btnJoin = this.instances.sq45.el.querySelector("#btnAutoJoinSq");
          if (btnPartner) {
            btnPartner.innerHTML = `<i class="fa-solid fa-plus"></i> 30°/60°`;
            btnPartner.style.background = "#059669";
          }
          if (btnJoin) btnJoin.style.display = "none";
        }
      };

      el.querySelector(`#sqRotate_${type}`).onmousedown = (e) => {
        const inst = this.instances[type];
        this.activeInteraction = {
          instanceKey: type,
          mode: "rotate",
          startAngleOffset: Math.atan2(e.clientY - inst.y, e.clientX - inst.x) - (inst.angle * Math.PI) / 180
        };
        e.stopPropagation();
        e.preventDefault();
      };

      el.querySelector(`#sqScale_${type}`).onmousedown = (e) => {
        const inst = this.instances[type];
        this.activeInteraction = {
          instanceKey: type,
          mode: "resize",
          initialSizeCm: inst.sizeCm,
          startDragClientX: e.clientX
        };
        document.body.style.cursor = "nwse-resize";
        e.stopPropagation();
        e.preventDefault();
      };

      if (isPrimary) {
        const btnPartner = el.querySelector("#btnTogglePartnerSq");
        const btnJoin = el.querySelector("#btnAutoJoinSq");

        if (btnPartner) {
          btnPartner.onclick = (e) => {
            e.stopPropagation();
            if (this.instances.sq3060) {
              this.closeInstance("sq3060");
              btnPartner.innerHTML = `<i class="fa-solid fa-plus"></i> 30°/60°`;
              btnPartner.style.background = "#059669";
              if (btnJoin) btnJoin.style.display = "none";
            } else {
              const primary = this.instances.sq45;
              const dims = this.getDimensions("sq45", primary.sizeCm);
              this.spawnInstance("sq3060", primary.x + dims.widthPx + 14, primary.y, primary.sizeCm, 0);
              btnPartner.innerHTML = `<i class="fa-solid fa-minus"></i> 30°/60°`;
              btnPartner.style.background = "#dc2626";
              if (btnJoin) btnJoin.style.display = "flex";
            }
          };
        }

        if (btnJoin) {
          btnJoin.onclick = (e) => {
            e.stopPropagation();
            this.autoDockPerfectly();
          };
        }
      }
    },

    renderInstance: function (type) {
      const inst = this.instances[type];
      if (!inst || !inst.el) return;

      const svg = inst.el.querySelector(`#sqSvg_${type}`);
      if (!svg) return;

      const isPrimary = type === "sq45";
      const { widthPx, heightPx } = this.getDimensions(type, inst.sizeCm);

      inst.el.style.width = widthPx + "px";
      inst.el.style.height = heightPx + "px";
      inst.el.style.left = inst.x + "px";
      inst.el.style.top = inst.y + "px";
      inst.el.style.transform = `rotate(${inst.angle}deg)`;

      svg.setAttribute("width", widthPx);
      svg.setAttribute("height", heightPx);
      svg.setAttribute("viewBox", `0 0 ${widthPx} ${heightPx}`);

      const pA = { x: 0, y: 0 };
      const pB = { x: widthPx, y: 0 };
      const pC = { x: 0, y: heightPx };

      const pad = isPrimary ? 42 : 36;
      const iA = { x: pad, y: pad };
      const iB = { x: Math.max(pad + 16, widthPx - pad * (isPrimary ? 2.4 : 1.7)), y: pad };
      const iC = { x: pad, y: Math.max(pad + 16, heightPx - pad * (isPrimary ? 2.4 : 2.9)) };

      let ticks = "";
      const maxCmX = Math.floor(widthPx / this.pxPerCm);
      const maxCmY = Math.floor(heightPx / this.pxPerCm);

      for (let cm = 0; cm <= maxCmX; cm++) {
        const d = cm * this.pxPerCm;
        if (d < widthPx - 32) {
          ticks += `<line x1="${d}" y1="0" x2="${d}" y2="9" stroke="#0f172a" stroke-width="1.2"/>`;
        }
        if (cm > 1 && cm < maxCmX - 1) {
          ticks += `<text x="${d - 3}" y="19" font-size="8" font-weight="700" fill="#0f172a" font-family="sans-serif">${cm}</text>`;
        }
        if (cm < maxCmX) {
          for (let mm = 1; mm < 10; mm++) {
            const md = d + mm * (this.pxPerCm / 10);
            if (md < widthPx - 32) {
              ticks += `<line x1="${md}" y1="0" x2="${md}" y2="${mm === 5 ? 6 : 4}" stroke="#475569" stroke-width="0.8"/>`;
            }
          }
        }
      }

      for (let cm = 0; cm <= maxCmY; cm++) {
        const d = cm * this.pxPerCm;
        if (d < heightPx - 38) {
          ticks += `<line x1="0" y1="${d}" x2="9" y2="${d}" stroke="#0f172a" stroke-width="1.2"/>`;
        }
        if (cm > 1 && cm < maxCmY - 2) {
          ticks += `<text x="12" y="${d + 3}" font-size="8" font-weight="700" fill="#0f172a" font-family="sans-serif">${cm}</text>`;
        }
        if (cm < maxCmY) {
          for (let mm = 1; mm < 10; mm++) {
            const md = d + mm * (this.pxPerCm / 10);
            if (md < heightPx - 38) {
              ticks += `<line x1="0" y1="${md}" x2="${mm === 5 ? 6 : 4}" y2="${md}" stroke="#475569" stroke-width="0.8"/>`;
            }
          }
        }
      }

      const hypLength = Math.hypot(pB.x - pC.x, pB.y - pC.y);
      const hypCmTotal = Math.floor(hypLength / this.pxPerCm);
      const hypDx = (pB.x - pC.x) / hypLength;
      const hypDy = (pB.y - pC.y) / hypLength;
      const hypAngleDeg = (Math.atan2(hypDy, hypDx) * 180) / Math.PI;

      const perpX = hypDy;
      const perpY = -hypDx;

      for (let cm = 0; cm <= hypCmTotal; cm++) {
        const d = cm * this.pxPerCm;
        if (d < 42 || d > hypLength - 42) continue;

        const px = pC.x + hypDx * d;
        const py = pC.y + hypDy * d;

        ticks += `<line x1="${px}" y1="${py}" x2="${px + perpX * 8}" y2="${py + perpY * 8}" stroke="#0f172a" stroke-width="1.2"/>`;

        const tx = px + perpX * 15;
        const ty = py + perpY * 15;
        ticks += `<text x="${tx}" y="${ty}" font-size="8" font-weight="700" fill="#0f172a" font-family="Arial, sans-serif" text-anchor="middle" dominant-baseline="middle" transform="rotate(${hypAngleDeg}, ${tx}, ${ty})">${cm}</text>`;

        for (let mm = 1; mm < 10; mm++) {
          const md = d + mm * (this.pxPerCm / 10);
          if (md >= hypLength - 42) break;
          const mpx = pC.x + hypDx * md;
          const mpy = pC.y + hypDy * md;
          const mLen = mm === 5 ? 5.5 : 3.5;
          ticks += `<line x1="${mpx}" y1="${mpy}" x2="${mpx + perpX * mLen}" y2="${mpy + perpY * mLen}" stroke="#475569" stroke-width="0.8"/>`;
        }
      }

      const bodyFill = this.isCombinedLocked
        ? "rgba(237, 233, 254, 0.72)"
        : isPrimary ? "rgba(224, 242, 254, 0.58)" : "rgba(209, 250, 229, 0.58)";
      const strokeCol = this.isCombinedLocked
        ? "#7c3aed"
        : isPrimary ? "#0284c7" : "#059669";
      const textCol = this.isCombinedLocked
        ? "#6d28d9"
        : isPrimary ? "#0369a1" : "#047857";

      const angleTopRight = isPrimary ? "45°" : "60°";
      const angleBotLeft = isPrimary ? "45°" : "30°";

      svg.innerHTML = `
        <defs>
          <filter id="sqShadow_${type}" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" flood-opacity="0.15" />
          </filter>
        </defs>

        <path class="setsquare-svg-body" id="sqDragBody_${type}"
          d="M ${pA.x} ${pA.y} L ${pB.x} ${pB.y} L ${pC.x} ${pC.y} Z M ${iA.x} ${iA.y} L ${iC.x} ${iC.y} L ${iB.x} ${iB.y} Z"
          fill="${bodyFill}"
          stroke="${strokeCol}"
          stroke-width="${this.isCombinedLocked ? "2.2" : "1.8"}"
          fill-rule="evenodd"
          filter="url(#sqShadow_${type})"
          style="cursor: move; transition: fill 0.18s ease, stroke 0.18s ease;"
          title="Drag body to move Set Square"
        />

        <g style="pointer-events:none;">${ticks}</g>

        <text class="sq-angle-label" x="${pA.x + 14}" y="${pA.y + 24}" font-size="11" font-weight="bold" fill="${textCol}" font-family="sans-serif">90°</text>
        <text class="sq-angle-label" x="${pB.x - 14}" y="${pB.y + 11}" font-size="11" font-weight="bold" fill="${textCol}" font-family="sans-serif" text-anchor="end" dominant-baseline="middle">${angleTopRight}</text>
        <text class="sq-angle-label" x="${pC.x + 8}" y="${pC.y - 30}" font-size="11" font-weight="bold" fill="${textCol}" font-family="sans-serif" text-anchor="start" dominant-baseline="middle">${angleBotLeft}</text>

        <!-- Invisible Edges with Realistic Pen Cursor -->
        <line id="sqEdgeTop_${type}" class="setsquare-edge-draw-path" x1="${pA.x}" y1="${pA.y}" x2="${pB.x}" y2="${pB.y}" stroke="transparent" stroke-width="18" style="cursor: ${PEN_CURSOR_URL};" />
        <line id="sqEdgeLeft_${type}" class="setsquare-edge-draw-path" x1="${pA.x}" y1="${pA.y}" x2="${pC.x}" y2="${pC.y}" stroke="transparent" stroke-width="18" style="cursor: ${PEN_CURSOR_URL};" />
        <line id="sqEdgeHyp_${type}" class="setsquare-edge-draw-path" x1="${pB.x}" y1="${pB.y}" x2="${pC.x}" y2="${pC.y}" stroke="transparent" stroke-width="18" style="cursor: ${PEN_CURSOR_URL};" />
      `;

      const closePin = inst.el.querySelector(`#sqClose_${type}`);
      const rotateDial = inst.el.querySelector(`#sqRotate_${type}`);
      const scalePin = inst.el.querySelector(`#sqScale_${type}`);

      if (closePin) { closePin.style.left = "18px"; closePin.style.top = "18px"; }
      if (rotateDial) { rotateDial.style.left = Math.round(widthPx * (isPrimary ? 0.25 : 0.34)) + "px"; rotateDial.style.top = "18px"; }
      if (scalePin) { scalePin.style.left = Math.round(widthPx * (isPrimary ? 0.42 : 0.56)) + "px"; scalePin.style.top = "18px"; }

      this.bindInstanceInteractions(type);
    },

    bindInstanceInteractions: function (type) {
      const inst = this.instances[type];
      if (!inst || !inst.el) return;

      const body = inst.el.querySelector(`#sqDragBody_${type}`);
      const edges = inst.el.querySelectorAll(".setsquare-edge-draw-path");

      if (body) {
        body.onmousedown = (e) => {
          if (this.instances.sq45 && this.instances.sq45.el) this.instances.sq45.el.style.zIndex = "10000000";
          if (this.instances.sq3060 && this.instances.sq3060.el) this.instances.sq3060.el.style.zIndex = "10000000";
          inst.el.style.zIndex = "10000002";

          this.activeInteraction = {
            instanceKey: type,
            mode: "move",
            startX: e.clientX - inst.x,
            startY: e.clientY - inst.y
          };
          e.stopPropagation();
          e.preventDefault();
        };
      }

      edges.forEach((edgeEl) => {
        edgeEl.onmousedown = (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.startUnifiedDrawing(type, e.clientX, e.clientY);
        };
      });
    },

// ========================================================
    // UNIFIED PERIMETER DRAWING START
    // ========================================================
    startUnifiedDrawing: function (instanceKey, clientX, clientY) {
      const ds = this.drawSession;
      const inst = this.instances[instanceKey];
      if (!inst) return;

      ds.instanceKey = instanceKey;
      ds.perimeterEdges = this.buildActivePerimeterEdges();
      if (!ds.perimeterEdges.length) return;

      const clickPt = { x: clientX, y: clientY };
      let bestIdx = 0;
      let bestDist = Infinity;
      let bestProj = null;

      for (let i = 0; i < ds.perimeterEdges.length; i++) {
        const pr = this.projectOnEdge(ds.perimeterEdges[i], clickPt);
        if (pr.dist < bestDist) {
          bestDist = pr.dist;
          bestIdx = i;
          bestProj = pr;
        }
      }

      ds.startEdgeIdx = bestIdx;
      ds.activeEdgeIdx = bestIdx;
      const startWorld = bestProj.point;
      ds.screenPoints = [startWorld, { ...startWorld }];

      ds.activeTarget = this.detectTargetAt(startWorld.x, startWorld.y);
      const host = ds.activeTarget.container;

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "geom-setsquare-drawn-polyline");
      svg.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:45; overflow:visible;";
      host.appendChild(svg);
      ds.activeSvg = svg;

      const strokeColor = document.getElementById("brushColor") ? document.getElementById("brushColor").value : "#0f172a";
      const strokeWidth = document.getElementById("brushSize") ? parseInt(document.getElementById("brushSize").value, 10) : 2.5;

      const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      polyline.setAttribute("stroke", strokeColor);
      polyline.setAttribute("stroke-width", strokeWidth.toString());
      polyline.setAttribute("stroke-linecap", "round");
      polyline.setAttribute("stroke-linejoin", "round");
      polyline.setAttribute("fill", "none");
      svg.appendChild(polyline);
      ds.activePolylineEl = polyline;

      const svgRect = svg.getBoundingClientRect();
      const localPts = ds.screenPoints.map(p => `${(p.x - svgRect.left).toFixed(1)},${(p.y - svgRect.top).toFixed(1)}`);
      polyline.setAttribute("points", localPts.join(" "));

      ds.isDrawing = true;
      document.body.style.cursor = PEN_CURSOR_URL;

      const badge = inst.el.querySelector(`#sqBadge_${inst.type}`);
      if (badge) {
        badge.style.display = "inline-block";
        badge.style.left = (startWorld.x - inst.x) + "px";
        badge.style.top = (startWorld.y - inst.y - 18) + "px";
        badge.textContent = "0.0 cm";
      }
    },

    closeInstance: function (type) {
      const inst = this.instances[type];
      if (inst && inst.el) {
        inst.el.remove();
      }
      this.instances[type] = null;
      this.setCombinedColorState(false);

      if (type === "sq45" && this.instances.sq3060) {
        this.closeInstance("sq3060");
      }

      if (!this.instances.sq45 && !this.instances.sq3060) {
        const hasOtherTool = document.getElementById("realMathRuler") || document.getElementById("mathProtractorWidget") || document.getElementById("realMathCompass");
        if (!hasOtherTool && window.fabricCanvas && this.wasDrawingModeBefore) {
          window.fabricCanvas.isDrawingMode = true;
        }
      }
    },

    closeAll: function () {
      if (this.placementOverlay) {
        this.placementOverlay.style.display = "none";
      }
      this.isWaitingForPlacement = false;
      this.closeInstance("sq3060");
      this.closeInstance("sq45");
    },

    bindGlobalMovement: function () {
      if (this.isGlobalEventsBound) return;
      this.isGlobalEventsBound = true;

      window.addEventListener("mousemove", (e) => {
        const act = this.activeInteraction;
        const ds = this.drawSession;

        // 1. Apparatus Manipulation
        if (act.instanceKey && this.instances[act.instanceKey]) {
          const inst = this.instances[act.instanceKey];

          if (act.mode === "move") {
            const proposedX = e.clientX - act.startX;
            const proposedY = e.clientY - act.startY;

            const resolved = this.resolveCollisionAndSnap(inst, proposedX, proposedY);
            inst.x = resolved.x;
            inst.y = resolved.y;
            inst.angle = resolved.angle;

            inst.el.style.left = inst.x + "px";
            inst.el.style.top = inst.y + "px";
            inst.el.style.transform = `rotate(${inst.angle}deg)`;
          } 
          else if (act.mode === "rotate") {
            const currentRad = Math.atan2(e.clientY - inst.y, e.clientX - inst.x);
            let newAngle = ((currentRad - act.startAngleOffset) * 180) / Math.PI;

            const partnerKey = act.instanceKey === "sq45" ? "sq3060" : "sq45";
            const partnerInst = this.instances[partnerKey];
            if (partnerInst) {
              const myEdges = this.getWorldEdgesWithOutwardNormals(inst, inst.x, inst.y, newAngle);
              const pEdges = this.getWorldEdgesWithOutwardNormals(partnerInst, partnerInst.x, partnerInst.y, partnerInst.angle);

              for (let me of myEdges) {
                for (let pe of pEdges) {
                  const dotN = me.outN.x * pe.outN.x + me.outN.y * pe.outN.y;
                  if (dotN < -0.985) {
                    const curAng = Math.atan2(me.outN.y, me.outN.x);
                    const tgtAng = Math.atan2(-pe.outN.y, -pe.outN.x);
                    let diff = ((tgtAng - curAng) * 180) / Math.PI;
                    while (diff > 180) diff -= 360;
                    while (diff < -180) diff += 360;
                    newAngle += diff;
                    break;
                  }
                }
              }
            }

            inst.angle = newAngle;
            inst.el.style.transform = `rotate(${inst.angle}deg)`;

            if (partnerInst) {
              const pushed = this.pushOutSAT(inst, inst.x, inst.y, inst.angle, partnerInst);
              inst.x = pushed.x;
              inst.y = pushed.y;
              inst.el.style.left = inst.x + "px";
              inst.el.style.top = inst.y + "px";

              const isValidDock = this.validatePureEdgeContact(inst, inst.x, inst.y, inst.angle, partnerInst);
              this.setCombinedColorState(isValidDock);
            }
          } 
          else if (act.mode === "resize") {
            const dx = e.clientX - act.startDragClientX;
            const deltaCm = Math.round(dx / this.pxPerCm);
            let newSize = act.initialSizeCm + deltaCm;
            newSize = Math.max(10, Math.min(26, newSize));

            if (newSize !== inst.sizeCm) {
              inst.sizeCm = newSize;
              this.renderInstance(act.instanceKey);

              const partnerKey = act.instanceKey === "sq45" ? "sq3060" : "sq45";
              if (this.instances[partnerKey]) {
                this.instances[partnerKey].sizeCm = newSize;
                this.renderInstance(partnerKey);
              }
            }
          }
        }

       // 2. Unified Trimmed Perimeter Tracing + Exact Same-Edge Return Lock
        if (ds.isDrawing && ds.activePolylineEl && ds.activeSvg && ds.activeEdgeIdx >= 0) {
          const curEdge = ds.perimeterEdges[ds.activeEdgeIdx];
          const mousePt = { x: e.clientX, y: e.clientY };
          const proj = this.projectOnEdge(curEdge, mousePt);

          if (proj.rawT < -2 || proj.rawT > curEdge.len + 2) {
            const exitCorner = proj.rawT < 0 ? curEdge.p1 : curEdge.p2;

            let bestNextIdx = -1;
            let bestScore = -Infinity;

            for (let i = 0; i < ds.perimeterEdges.length; i++) {
              if (i === ds.activeEdgeIdx) continue;
              const cand = ds.perimeterEdges[i];

              const d1 = Math.hypot(cand.p1.x - exitCorner.x, cand.p1.y - exitCorner.y);
              const d2 = Math.hypot(cand.p2.x - exitCorner.x, cand.p2.y - exitCorner.y);
              const cornerGap = Math.min(d1, d2);

              if (cornerGap <= 28) {
                const cProj = this.projectOnEdge(cand, mousePt);
                if (cProj.t > 2 && cProj.t < cand.len - 2) {
                  const score = -cProj.dist - cornerGap * 0.4;
                  if (score > bestScore) {
                    bestScore = score;
                    bestNextIdx = i;
                  }
                }
              }
            }

            if (bestNextIdx >= 0) {
              const nextEdge = ds.perimeterEdges[bestNextIdx];
              const isStraight = Math.abs(curEdge.dir.x * nextEdge.dir.x + curEdge.dir.y * nextEdge.dir.y) > 0.99;

              if (!isStraight) {
                // Avoid duplicate consecutive corner point
                const prevPt = ds.screenPoints[ds.screenPoints.length - 2];
                if (!prevPt || Math.hypot(prevPt.x - exitCorner.x, prevPt.y - exitCorner.y) > 2) {
                  ds.screenPoints[ds.screenPoints.length - 1] = { ...exitCorner };
                  ds.screenPoints.push({ ...exitCorner });
                }
              }

              ds.activeEdgeIdx = bestNextIdx;
              const nextProj = this.projectOnEdge(nextEdge, mousePt);
              ds.screenPoints[ds.screenPoints.length - 1] = nextProj.point;
            } else {
              ds.screenPoints[ds.screenPoints.length - 1] = proj.point;
            }
          } else {
            ds.screenPoints[ds.screenPoints.length - 1] = proj.point;
          }

          // SAME-EDGE RETURN LOCK: Prevents over-shooting past start point on the starting edge!
          if (ds.screenPoints.length >= 4 && ds.activeEdgeIdx === ds.startEdgeIdx) {
            const firstPt = ds.screenPoints[0];
            const prevCorner = ds.screenPoints[ds.screenPoints.length - 2];
            const currentPt = ds.screenPoints[ds.screenPoints.length - 1];

            const distToStart = Math.hypot(currentPt.x - firstPt.x, currentPt.y - firstPt.y);
            const distCornerToStart = Math.hypot(prevCorner.x - firstPt.x, prevCorner.y - firstPt.y);
            const distCornerToCurr = Math.hypot(prevCorner.x - currentPt.x, prevCorner.y - currentPt.y);

            // If within 22px of start OR dragged past start point along the edge -> lock to exact start!
            if (distToStart <= 22 || distCornerToCurr >= distCornerToStart) {
              ds.screenPoints[ds.screenPoints.length - 1] = { x: firstPt.x, y: firstPt.y };
            }
          }

          // Update SVG Polyline
          const svgRect = ds.activeSvg.getBoundingClientRect();
          const localPts = ds.screenPoints.map(p => `${(p.x - svgRect.left).toFixed(1)},${(p.y - svgRect.top).toFixed(1)}`);
          ds.activePolylineEl.setAttribute("points", localPts.join(" "));

          // Update Live Badge
          const inst = this.instances[ds.instanceKey];
          if (inst && inst.el) {
            const badge = inst.el.querySelector(`#sqBadge_${inst.type}`);
            if (badge) {
              const lastPt = ds.screenPoints[ds.screenPoints.length - 1];
              badge.style.left = (lastPt.x - inst.x) + "px";
              badge.style.top = (lastPt.y - inst.y - 18) + "px";

              let totalDistPx = 0;
              for (let i = 1; i < ds.screenPoints.length; i++) {
                totalDistPx += Math.hypot(ds.screenPoints[i].x - ds.screenPoints[i - 1].x, ds.screenPoints[i].y - ds.screenPoints[i - 1].y);
              }
              badge.textContent = `${(totalDistPx / this.pxPerCm).toFixed(1)} cm`;
            }
          }
        }
      });

      window.addEventListener("mouseup", () => {
        if (this.activeInteraction.mode === "resize") {
          document.body.style.cursor = "default";
        }
        this.activeInteraction = { instanceKey: null, mode: null };

        if (this.drawSession.isDrawing) {
          // Convert closed loop to seamless <polygon> and strip mid-edge start vertex!
          if (this.drawSession.screenPoints.length >= 4 && this.drawSession.activeSvg && this.drawSession.activePolylineEl) {
            const pts = this.drawSession.screenPoints;
            const first = pts[0];
            const last = pts[pts.length - 1];

            if (Math.hypot(last.x - first.x, last.y - first.y) <= 22) {
              const svg = this.drawSession.activeSvg;
              const poly = this.drawSession.activePolylineEl;
              const svgRect = svg.getBoundingClientRect();

              // Filter out duplicate points
              let cleanPts = [];
              for (let i = 0; i < pts.length - 1; i++) {
                const prev = cleanPts[cleanPts.length - 1];
                if (!prev || Math.hypot(pts[i].x - prev.x, pts[i].y - prev.y) > 2) {
                  cleanPts.push(pts[i]);
                }
              }

              // Remove mid-edge collinear start vertex so the edge is a single pure straight line
              if (cleanPts.length >= 4) {
                const prev = cleanPts[cleanPts.length - 1];
                const curr = cleanPts[0];
                const next = cleanPts[1];

                const v1x = curr.x - prev.x, v1y = curr.y - prev.y;
                const v2x = next.x - curr.x, v2y = next.y - curr.y;
                const l1 = Math.hypot(v1x, v1y) || 1;
                const l2 = Math.hypot(v2x, v2y) || 1;

                const dot = (v1x * v2x + v1y * v2y) / (l1 * l2);
                if (dot > 0.995) {
                  cleanPts = cleanPts.slice(1);
                }
              }

              const closedStr = cleanPts
                .map(p => `${(p.x - svgRect.left).toFixed(1)},${(p.y - svgRect.top).toFixed(1)}`)
                .join(" ");

              const polygonEl = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
              polygonEl.setAttribute("points", closedStr);
              polygonEl.setAttribute("stroke", poly.getAttribute("stroke"));
              polygonEl.setAttribute("stroke-width", poly.getAttribute("stroke-width"));
              polygonEl.setAttribute("stroke-linejoin", "round");
              polygonEl.setAttribute("fill", "none");

              poly.remove();
              svg.appendChild(polygonEl);
            }
          }

          if (this.drawSession.instanceKey && this.instances[this.drawSession.instanceKey]) {
            const inst = this.instances[this.drawSession.instanceKey];
            const badge = inst.el.querySelector(`#sqBadge_${inst.type}`);
            if (badge) badge.style.display = "none";
          }
          this.drawSession.isDrawing = false;
          this.drawSession.instanceKey = null;
          this.drawSession.startEdgeIdx = -1;
          this.drawSession.activeEdgeIdx = -1;
          this.drawSession.perimeterEdges = [];
          this.drawSession.activePolylineEl = null;
          this.drawSession.activeSvg = null;
          this.drawSession.activeTarget = null;
          this.drawSession.screenPoints = [];
          document.body.style.cursor = "default";
        }
      });
    }
  };

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => SetSquareEngine.init(), 300);
  });

  window.SetSquareEngine = SetSquareEngine;
})(window);