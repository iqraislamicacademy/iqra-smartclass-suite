// ==========================================================================
// IQRA GEOMETRIC MEASUREMENT ENGINE (DOM ATTACHMENT ARCHITECTURE)
// ==========================================================================
(function () {
  let activeTool = null; // 'length' | 'midpoint' | null
  let isDrawing = false;
  let startX = 0, startY = 0;
  let activePreviewSvg = null;

  let midpointFirstPoint = null;
  let midpointPreviewSvg = null;

  const PIXELS_PER_CM = 37.8;

  // Interceptor Overlay (Screen capture layer)
  let geomOverlay = document.getElementById("wbGeomInteractionModeLayer");
  if (!geomOverlay) {
    geomOverlay = document.createElement("div");
    geomOverlay.id = "wbGeomInteractionModeLayer";
    geomOverlay.style.cssText = "position:fixed; inset:0; z-index:9999999; display:none; cursor:crosshair; touch-action:none;";
    document.body.appendChild(geomOverlay);
  }

  window.activateGeomTool = function (toolName) {
    if (activeTool === toolName) {
      window.deactivateGeomTool();
      return;
    }
    activeTool = toolName;
    resetState();
    geomOverlay.style.display = "block";

    document.querySelectorAll("[data-geom-tool]").forEach(btn => {
      if (btn.dataset.geomTool === toolName) {
        btn.style.borderColor = "#0284c7";
        btn.style.boxShadow = "0 0 0 2px rgba(2, 132, 199, 0.35)";
      } else {
        btn.style.borderColor = "";
        btn.style.boxShadow = "";
      }
    });
  };

  window.deactivateGeomTool = function () {
    activeTool = null;
    resetState();
    geomOverlay.style.display = "none";
    document.querySelectorAll("[data-geom-tool]").forEach(btn => {
      btn.style.background = "";
      btn.style.borderColor = "";
      btn.style.boxShadow = "";
    });
  };

  function resetState() {
    isDrawing = false;
    midpointFirstPoint = null;
    if (midpointPreviewSvg) {
      midpointPreviewSvg.remove();
      midpointPreviewSvg = null;
    }
    if (activePreviewSvg) {
      activePreviewSvg.remove();
      activePreviewSvg = null;
    }
  }

  // 1. Target Detection: PDF Window (#renderTarget)
  function checkPdfWindow(x, y) {
    const renderTarget = document.getElementById("renderTarget");
    if (renderTarget) {
      const r = renderTarget.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return renderTarget;
      }
    }
    return null;
  }

  // 2. Target Detection: Image Element (.wb-image-item)
  function checkImageItem(clientX, clientY) {
    const images = Array.from(document.querySelectorAll(".wb-image-item"));
    for (let i = images.length - 1; i >= 0; i--) {
      const el = images[i];
      if (el.style.display === "none") continue;
      const rect = el.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return el;
      }
    }
    return null;
  }

  // Whiteboard Canvas Container
  function getBoardContainer() {
    return document.getElementById("whiteboardContainer") || 
           document.getElementById("canvasWrapper") || 
           document.querySelector(".canvas-container") || 
           document.body;
  }

  // Live Screen Drag Preview SVG
  function createDragPreviewSvg() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.cssText = "position:fixed; inset:0; width:100vw; height:100vh; pointer-events:none; z-index:99999999;";
    document.body.appendChild(svg);
    return svg;
  }

  // Destination Embedded SVG
  function createPermanentSvg(parentContainer) {
    if (window.getComputedStyle(parentContainer).position === "static") {
      parentContainer.style.position = "relative";
    }
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "geom-measure-svg-layer");
    svg.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:50; overflow:visible;";
    parentContainer.appendChild(svg);
    return svg;
  }

  // =========================================================================
  // CORE COMMITTER (STITCH DIRECTLY INTO IMAGE OR BOARD)
  // =========================================================================
  function commitMeasurement(ptA, ptB, isMidpoint) {
    // Check karein start point ya end point image par hai ya nahi
    const imgEl = checkImageItem(ptA.clientX, ptA.clientY) || checkImageItem(ptB.clientX, ptB.clientY);
    const pdfEl = checkPdfWindow(ptA.clientX, ptA.clientY);

    let hostElement;
    let originRect;

    if (imgEl) {
      // Image ke inner container mein inject karenge taaki drag hone par sath chale!
      hostElement = imgEl.querySelector(".wb-img-inner-container") || imgEl;
      originRect = hostElement.getBoundingClientRect();
    } else if (pdfEl) {
      hostElement = pdfEl;
      originRect = pdfEl.getBoundingClientRect();
    } else {
      hostElement = getBoardContainer();
      originRect = hostElement.getBoundingClientRect();
    }

    // Relative Coordinates Host Element ke mutabiq
    const x1 = ptA.clientX - originRect.left;
    const y1 = ptA.clientY - originRect.top;
    const x2 = ptB.clientX - originRect.left;
    const y2 = ptB.clientY - originRect.top;

    const distPx = Math.hypot(ptB.clientX - ptA.clientX, ptB.clientY - ptA.clientY);
    const distCm = (distPx / PIXELS_PER_CM).toFixed(1);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    const svg = createPermanentSvg(hostElement);

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", "#0284c7");
    line.setAttribute("stroke-width", isMidpoint ? "2" : "3");
    if (isMidpoint) line.setAttribute("stroke-dasharray", "4,4");
    line.setAttribute("stroke-linecap", "round");
    svg.appendChild(line);

    appendCircle(svg, x1, y1, 5, "#0284c7");
    appendCircle(svg, x2, y2, 5, "#0284c7");

    if (isMidpoint) {
      appendLabel(svg, x1 - 16, y1 + 5, "A", "#0284c7");
      appendLabel(svg, x2 + 8, y2 + 5, "B", "#0284c7");
      appendCircle(svg, midX, midY, 6, "#ef4444");
      appendLabel(svg, midX - 6, midY - 14, "M", "#ef4444");
      appendBadge(svg, midX, midY + 16, `${distCm} cm`, "#0284c7");
    } else {
      appendBadge(svg, midX, midY - 12, `${distCm} cm`, "#0284c7");
    }
  }

  // 1. POINTER DOWN
  geomOverlay.addEventListener("pointerdown", (e) => {
    if (!activeTool) return;

    const clickX = e.clientX;
    const clickY = e.clientY;

    // --- MIDPOINT TOOL ---
    if (activeTool === "midpoint") {
      if (!midpointFirstPoint) {
        midpointFirstPoint = { clientX: clickX, clientY: clickY };
        midpointPreviewSvg = createDragPreviewSvg();
        appendCircle(midpointPreviewSvg, clickX, clickY, 5, "#0284c7");
        appendLabel(midpointPreviewSvg, clickX - 16, clickY + 5, "A", "#0284c7");
      } else {
        const ptA = midpointFirstPoint;
        const ptB = { clientX: clickX, clientY: clickY };

        if (midpointPreviewSvg) {
          midpointPreviewSvg.remove();
          midpointPreviewSvg = null;
        }

        commitMeasurement(ptA, ptB, true);
        midpointFirstPoint = null;
        window.deactivateGeomTool();
      }
      return;
    }

    // --- LENGTH TOOL ---
    if (activeTool === "length") {
      isDrawing = true;
      startX = clickX;
      startY = clickY;
      activePreviewSvg = createDragPreviewSvg();
    }
  });

  // 2. POINTER MOVE
  geomOverlay.addEventListener("pointermove", (e) => {
    if (activeTool === "length" && isDrawing && activePreviewSvg) {
      const distPx = Math.hypot(e.clientX - startX, e.clientY - startY);
      const distCm = (distPx / PIXELS_PER_CM).toFixed(1);
      const midX = (startX + e.clientX) / 2;
      const midY = (startY + e.clientY) / 2;

      activePreviewSvg.innerHTML = "";

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", startX);
      line.setAttribute("y1", startY);
      line.setAttribute("x2", e.clientX);
      line.setAttribute("y2", e.clientY);
      line.setAttribute("stroke", "#0284c7");
      line.setAttribute("stroke-width", "3");
      line.setAttribute("stroke-linecap", "round");
      activePreviewSvg.appendChild(line);

      appendCircle(activePreviewSvg, startX, startY, 5, "#0284c7");
      appendCircle(activePreviewSvg, e.clientX, e.clientY, 5, "#0284c7");
      appendBadge(activePreviewSvg, midX, midY - 12, `${distCm} cm`, "#0284c7");
      return;
    }

    if (activeTool === "midpoint" && midpointFirstPoint && midpointPreviewSvg) {
      const p1X = midpointFirstPoint.clientX;
      const p1Y = midpointFirstPoint.clientY;
      const p2X = e.clientX;
      const p2Y = e.clientY;

      const distPx = Math.hypot(p2X - p1X, p2Y - p1Y);
      const distCm = (distPx / PIXELS_PER_CM).toFixed(1);

      midpointPreviewSvg.innerHTML = "";

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", p1X);
      line.setAttribute("y1", p1Y);
      line.setAttribute("x2", p2X);
      line.setAttribute("y2", p2Y);
      line.setAttribute("stroke", "#0284c7");
      line.setAttribute("stroke-width", "1.5");
      line.setAttribute("stroke-dasharray", "3,3");
      midpointPreviewSvg.appendChild(line);

      appendCircle(midpointPreviewSvg, p1X, p1Y, 5, "#0284c7");
      appendLabel(midpointPreviewSvg, p1X - 16, p1Y + 5, "A", "#0284c7");

      const midX = (p1X + p2X) / 2;
      const midY = (p1Y + p2Y) / 2;
      appendCircle(midpointPreviewSvg, midX, midY, 5, "rgba(239, 68, 68, 0.6)");
      appendBadge(midpointPreviewSvg, midX, midY + 16, `${distCm} cm`, "#0284c7");
    }
  });

  // 3. POINTER UP
  geomOverlay.addEventListener("pointerup", (e) => {
    if (activeTool === "length" && isDrawing) {
      isDrawing = false;
      const ptA = { clientX: startX, clientY: startY };
      const ptB = { clientX: e.clientX, clientY: e.clientY };

      if (activePreviewSvg) {
        activePreviewSvg.remove();
        activePreviewSvg = null;
      }

      commitMeasurement(ptA, ptB, false);
      window.deactivateGeomTool();
    }
  });

  function appendCircle(svg, cx, cy, r, fill) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", cx);
    c.setAttribute("cy", cy);
    c.setAttribute("r", r);
    c.setAttribute("fill", fill);
    svg.appendChild(c);
  }

  function appendLabel(svg, x, y, text, color) {
    const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    lbl.setAttribute("x", x);
    lbl.setAttribute("y", y);
    lbl.setAttribute("fill", color);
    lbl.setAttribute("font-size", "14");
    lbl.setAttribute("font-weight", "bold");
    lbl.setAttribute("font-family", "sans-serif");
    lbl.textContent = text;
    svg.appendChild(lbl);
  }

  function appendBadge(svg, x, y, text, color) {
    const badge = document.createElementNS("http://www.w3.org/2000/svg", "text");
    badge.setAttribute("x", x);
    badge.setAttribute("y", y);
    badge.setAttribute("fill", color);
    badge.setAttribute("font-size", "12");
    badge.setAttribute("font-weight", "bold");
    badge.setAttribute("text-anchor", "middle");
    badge.setAttribute("font-family", "sans-serif");
    badge.textContent = text;
    svg.appendChild(badge);
  }
})();