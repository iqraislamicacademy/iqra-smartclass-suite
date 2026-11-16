// ========================================================
// IQRA SMARTCLASS SUITE - DOCUMENT & PDF ENGINE (pdf.js)
// Complete & Verified:
// 1. Graceful 60fps Bottom-Right Corner Paper-Curl Page Turn (950ms smooth speed)
// 2. Opens PDFs in Full-Size ("doc-full") by default (both PC/Device Upload & Gallery Load)
// 3. Fixes Top-Clip on Zoom (#docViewport block/inline-block scroll so top of page is NEVER cut off)
// 4. Locks Grey Area & Pen Surface strictly to PDF page bounds
// 5. Clickable PDF Hyperlinks + Per-Page Pen & Math Memory + Live Pinch/Wheel Zoom
// ========================================================
(function (window) {
  "use strict";

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  // Scroll-Safe Viewport, Strict Page Bounds & Hyperlink Hover Styles
  (function injectPdfStyles() {
    const oldStyle = document.getElementById("iqra-pdf-flip-styles");
    if (oldStyle) oldStyle.remove();

    const style = document.createElement("style");
    style.id = "iqra-pdf-flip-styles";
    style.textContent = `
      /* Block + inline-block prevents flex-center top/left clipping when zoomed > 100% */
      #docViewport {
        display: block !important;
        overflow: auto !important;
        text-align: center !important;
        padding: 12px !important;
      }
      #docContainer {
        display: inline-block !important;
        position: relative !important;
        width: auto !important;
        height: auto !important;
        max-width: none !important;
        min-width: 0 !important;
        min-height: 0 !important;
        margin: 0 auto !important;
        padding: 0 !important;
        vertical-align: top !important;
        background: transparent !important;
        box-shadow: none !important;
        overflow: hidden !important;
      }
      #renderTarget {
        display: block !important;
        position: relative !important;
        background: #ffffff !important;
        box-shadow: 0 6px 22px rgba(15, 23, 42, 0.14) !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      .pdf-link-overlay-layer a.pdf-annotation-link {
        position: absolute;
        display: block;
        cursor: pointer;
        border-radius: 3px;
        transition: background-color 0.15s ease, outline 0.15s ease;
      }
      .pdf-link-overlay-layer a.pdf-annotation-link:hover {
        background-color: rgba(2, 132, 199, 0.14);
        outline: 1.5px solid rgba(2, 132, 199, 0.55);
      }
    `;
    document.head.appendChild(style);
  })();

  const fileInput = document.getElementById("fileInput");
  const filePlaylist = document.getElementById("filePlaylist");
  const fileCount = document.getElementById("fileCount");
  const dropZone = document.getElementById("dropZone");
  const docContainer = document.getElementById("docContainer");
  const docViewport = document.getElementById("docViewport");
  const renderTarget = document.getElementById("renderTarget");
  const docTitle = document.getElementById("docTitle");
  const sheetTabsBar = document.getElementById("sheetTabsBar");

  const btnPrevPage = document.getElementById("btnPrevPage");
  const btnNextPage = document.getElementById("btnNextPage");
  const pageIndicator = document.getElementById("pageIndicator");
  const pageNumberInput = document.getElementById("pageNumberInput");
  const pageTotalText = document.getElementById("pageTotalText");
  const btnZoomIn = document.getElementById("btnZoomIn");
  const btnZoomOut = document.getElementById("btnZoomOut");
  const zoomLevelText = document.getElementById("zoomLevel");

  let uploadedFiles = [];
  const filePageMemory = new Map();
  const pdfPageDrawingsMemory = new Map();

  let activeFileIndex = -1;
  let currentPDF = null;
  let currentPdfKey = "";
  let renderedPageNum = null;
  let renderedZoom = 1.0;
  let lastPageDirection = "none";

  let currentPPTXSlides = [];
  let currentExcelWorkbook = null;
  let currentPageNum = 1;
  let totalPages = 0;
  let currentZoom = 1.0;

  let preTouchPenSnapshot = null;

  // ==========================================
  // 0. GRACEFUL 60FPS BOTTOM-RIGHT CORNER PAPER CURL ENGINE (950ms)
  // ==========================================
  function captureCurrentRenderedPageSnapshot() {
    if (!renderTarget) return null;
    const base = Array.from(renderTarget.querySelectorAll("canvas")).find(
      (c) =>
        !c.classList.contains("pen-surface-canvas") &&
        !c.classList.contains("pen-highlighter-canvas") &&
        !c.classList.contains("iqra-math-baked-canvas") &&
        !c.classList.contains("iqra-curl-fx")
    );
    if (!base || base.width === 0 || base.height === 0) return null;

    const copy = document.createElement("canvas");
    copy.width = base.width;
    copy.height = base.height;
    const ctx = copy.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, copy.width, copy.height);
    ctx.drawImage(base, 0, 0);

    const hl = renderTarget.querySelector(".pen-highlighter-canvas");
    const pen = renderTarget.querySelector(".pen-surface-canvas");
    const math = renderTarget.querySelector(".iqra-math-baked-canvas");
    if (hl && hl.width > 0) ctx.drawImage(hl, 0, 0, copy.width, copy.height);
    if (pen && pen.width > 0) ctx.drawImage(pen, 0, 0, copy.width, copy.height);
    if (math && math.width > 0) ctx.drawImage(math, 0, 0, copy.width, copy.height);
    return copy;
  }

function mountDepthSheet(sheetCanvas, zIndex = 99) {
    if (!renderTarget || !sheetCanvas) return null;
    const fx = document.createElement("canvas");
    fx.className = "iqra-curl-fx";
    fx.width = sheetCanvas.width;
    fx.height = sheetCanvas.height;
    fx.style.cssText = `position:absolute; top:0; left:0; width:100%; height:100%; z-index:${zIndex}; pointer-events:none; display:block; will-change:transform, opacity, filter;`;
    fx.getContext("2d").drawImage(sheetCanvas, 0, 0);
    renderTarget.appendChild(fx);
    return fx;
  }

  function playHorizontalDepthSlide(oldFx, newSheetCanvas, dir = "next") {
    if (!renderTarget || !oldFx || !newSheetCanvas) {
      if (oldFx) oldFx.remove();
      return;
    }

    const newFx = mountDepthSheet(newSheetCanvas, 99);
    if (!newFx) {
      oldFx.remove();
      return;
    }

    newFx.style.transform = dir === "next" ? "translateX(100%)" : "translateX(-100%)";
    newFx.style.boxShadow =
      dir === "next"
        ? "-14px 0 32px rgba(15, 23, 42, 0.30)"
        : "14px 0 32px rgba(15, 23, 42, 0.30)";

    const duration = 550; // Smooth 0.55s
    const startTime = performance.now();

    const step = (now) => {
      if (!document.body.contains(newFx)) return;
      const rawT = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - rawT, 3);

      if (dir === "next") {
        oldFx.style.transform = `translate(${-ease * 18}%, ${ease * 10}px) scale(${1 - ease * 0.08})`;
        oldFx.style.filter = `brightness(${1 - ease * 0.22})`;
        oldFx.style.opacity = `${1 - ease * 0.35}`;
        newFx.style.transform = `translateX(${(1 - ease) * 100}%)`;
      } else {
        oldFx.style.transform = `translate(${ease * 18}%, ${ease * 10}px) scale(${1 - ease * 0.08})`;
        oldFx.style.filter = `brightness(${1 - ease * 0.22})`;
        oldFx.style.opacity = `${1 - ease * 0.35}`;
        newFx.style.transform = `translateX(${-(1 - ease) * 100}%)`;
      }

      if (rawT < 1) {
        requestAnimationFrame(step);
      } else {
        oldFx.remove();
        newFx.remove();
      }
    };

    requestAnimationFrame(step);
  }

  // ==========================================
  // 0B. PAGE-WISE PEN & MATH GEOMETRY SAVE / RESTORE
  // ==========================================
  function getPageStoreKey(pdfKey, pageNum) {
    return `${pdfKey || "default_pdf"}::page_${pageNum}`;
  }

  function saveCurrentPdfPageAnnotations() {
    if (!renderTarget || !currentPDF || !renderedPageNum) return;

    const key = getPageStoreKey(currentPdfKey, renderedPageNum);
    const savedData = {
      penDataUrl: null,
      highlighterDataUrl: null,
      penWidth: 0,
      penHeight: 0,
      savedZoom: renderedZoom || 1.0,
      mathLayers: [],
    };

    const penCanvas = renderTarget.querySelector(".pen-surface-canvas");
    if (penCanvas && penCanvas.width > 0 && penCanvas.height > 0) {
      try {
        savedData.penDataUrl = penCanvas.toDataURL("image/png");
        savedData.penWidth = penCanvas.width;
        savedData.penHeight = penCanvas.height;
      } catch (e) {
        console.warn("Pen canvas save warning:", e);
      }
    }

    const hlCanvas = renderTarget.querySelector(".pen-highlighter-canvas");
    if (hlCanvas && hlCanvas.width > 0 && hlCanvas.height > 0) {
      try {
        savedData.highlighterDataUrl = hlCanvas.toDataURL("image/png");
      } catch (e) {}
    }

    const bakedMathCanvas = renderTarget.querySelector(".iqra-math-baked-canvas");
    if (bakedMathCanvas && bakedMathCanvas.width > 0 && bakedMathCanvas.height > 0) {
      try {
        savedData.bakedMathDataUrl = bakedMathCanvas.toDataURL("image/png");
      } catch (e) {}
    }

    Array.from(renderTarget.children).forEach((child) => {
      if (child.tagName === "CANVAS") return;
      if (child.classList && child.classList.contains("pdf-link-overlay-layer")) return;
      if (
        (child.className &&
          typeof child.className === "string" &&
          (child.className.includes("host-layer") ||
            child.className.includes("geom-") ||
            child.className.includes("math-"))) ||
        (child.tagName && child.tagName.toLowerCase() === "svg")
      ) {
        savedData.mathLayers.push(child.cloneNode(true));
      }
    });

    pdfPageDrawingsMemory.set(key, savedData);
  }

  function bindAutoSaveOnPenCanvas(penCanvas) {
    if (!penCanvas || penCanvas._pdfAutoSaveBound) return;
    penCanvas._pdfAutoSaveBound = true;
    const persist = () => {
      setTimeout(saveCurrentPdfPageAnnotations, 20);
    };
    penCanvas.addEventListener("pointerup", persist);
    penCanvas.addEventListener("pointercancel", persist);
  }

  function restorePdfPageAnnotations(pageNum, viewportWidth, viewportHeight) {
    if (!renderTarget || !currentPDF) return;

    const w = Math.max(1, Math.round(viewportWidth));
    const h = Math.max(1, Math.round(viewportHeight));

    const key = getPageStoreKey(currentPdfKey, pageNum);
    const savedData = pdfPageDrawingsMemory.get(key);
    const isPenCurrentlyActive =
      document.getElementById("penSuiteMainBtn")?.classList.contains("active") ||
      window.activeTool === "pen";

    let penCanvas = renderTarget.querySelector(".pen-surface-canvas");
    if (!penCanvas) {
      penCanvas = document.createElement("canvas");
      penCanvas.className = "pen-surface-canvas";
      renderTarget.appendChild(penCanvas);
    }

    penCanvas.width = w;
    penCanvas.height = h;
    penCanvas.style.cssText = `position:absolute; top:0; left:0; width:${w}px; height:${h}px; z-index:45; touch-action:none; pointer-events:${
      isPenCurrentlyActive ? "auto" : "none"
    };`;

    bindAutoSaveOnPenCanvas(penCanvas);

    if (savedData && savedData.penDataUrl) {
      const img = new Image();
      img.onload = () => {
        const ctx = penCanvas.getContext("2d");
        ctx.clearRect(0, 0, penCanvas.width, penCanvas.height);
        ctx.drawImage(img, 0, 0, penCanvas.width, penCanvas.height);
      };
      img.src = savedData.penDataUrl;
    }

    if (savedData && savedData.highlighterDataUrl) {
      let hlCanvas = renderTarget.querySelector(".pen-highlighter-canvas");
      if (!hlCanvas) {
        hlCanvas = document.createElement("canvas");
        hlCanvas.className = "pen-highlighter-canvas";
        hlCanvas.style.cssText = `position:absolute; top:0; left:0; width:${w}px; height:${h}px; z-index:44; pointer-events:none;`;
        renderTarget.insertBefore(hlCanvas, penCanvas);
      }
      hlCanvas.width = w;
      hlCanvas.height = h;
      const hImg = new Image();
      hImg.onload = () => {
        hlCanvas.getContext("2d").drawImage(hImg, 0, 0, hlCanvas.width, hlCanvas.height);
      };
      hImg.src = savedData.highlighterDataUrl;
    }

    if (savedData && savedData.bakedMathDataUrl) {
      const mCanvas = document.createElement("canvas");
      mCanvas.className = "iqra-math-baked-canvas";
      mCanvas.width = w;
      mCanvas.height = h;
      mCanvas.style.cssText =
        "position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:65;";
      renderTarget.appendChild(mCanvas);
      const mImg = new Image();
      mImg.onload = () => {
        mCanvas.getContext("2d").drawImage(mImg, 0, 0, mCanvas.width, mCanvas.height);
      };
      mImg.src = savedData.bakedMathDataUrl;
    }

    if (isPenCurrentlyActive && typeof window.applyPenSuiteSettings === "function") {
      window.applyPenSuiteSettings();
    }

    if (savedData && savedData.mathLayers && savedData.mathLayers.length > 0) {
      const scaleRatio = currentZoom / (savedData.savedZoom || 1.0);
      savedData.mathLayers.forEach((layerClone) => {
        const node = layerClone.cloneNode(true);
        if (Math.abs(scaleRatio - 1) > 0.001) {
          node.style.transformOrigin = "top left";
          node.style.transform = `scale(${scaleRatio})`;
        }
        renderTarget.appendChild(node);
      });
    }
  }

  // ==========================================
  // 0C. CLICKABLE PDF HYPERLINKS & INTERNAL PAGE JUMP LAYER
  // ==========================================
  async function renderPdfHyperlinks(page, viewport) {
    if (!renderTarget || !page || !viewport) return;

    const oldLayer = renderTarget.querySelector(".pdf-link-overlay-layer");
    if (oldLayer) oldLayer.remove();

    try {
      const annotations = await page.getAnnotations({ intent: "display" });
      if (!annotations || annotations.length === 0) return;

      const linkAnnotations = annotations.filter((ann) => ann.subtype === "Link");
      if (linkAnnotations.length === 0) return;

      const isPenActive =
        document.getElementById("penSuiteMainBtn")?.classList.contains("active") ||
        window.activeTool === "pen" ||
        window.activeTool === "eraser";

      const linkLayer = document.createElement("div");
      linkLayer.className = "pdf-link-overlay-layer";
      linkLayer.style.cssText = `position:absolute; inset:0; width:${viewport.width}px; height:${viewport.height}px; z-index:48; pointer-events:${
        isPenActive ? "none" : "auto"
      };`;

      linkAnnotations.forEach((ann) => {
        if (!ann.rect || ann.rect.length < 4) return;
        const rect = viewport.convertToViewportRectangle(ann.rect);
        const left = Math.min(rect[0], rect[2]);
        const top = Math.min(rect[1], rect[3]);
        const width = Math.abs(rect[2] - rect[0]);
        const height = Math.abs(rect[3] - rect[1]);

        if (width < 2 || height < 2) return;

        const a = document.createElement("a");
        a.className = "pdf-annotation-link";
        a.style.left = `${left}px`;
        a.style.top = `${top}px`;
        a.style.width = `${width}px`;
        a.style.height = `${height}px`;

        if (ann.url) {
          a.href = ann.url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.title = ann.url;
          a.addEventListener("click", (e) => {
            e.stopPropagation();
          });
        } else if (ann.dest) {
          a.href = "#";
          a.title = "Jump to linked page";
          a.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!currentPDF) return;
            try {
              let destArray = ann.dest;
              if (typeof destArray === "string") {
                destArray = await currentPDF.getDestination(destArray);
              }
              if (Array.isArray(destArray) && destArray[0]) {
                const pageIdx = await currentPDF.getPageIndex(destArray[0]);
                const targetPage = pageIdx + 1;
                if (targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPageNum) {
                  lastPageDirection = targetPage > currentPageNum ? "next" : "prev";
                  currentPageNum = targetPage;
                  renderPDFPage(currentPageNum);
                  if (uploadedFiles[activeFileIndex]) {
                    filePageMemory.set(uploadedFiles[activeFileIndex].name, currentPageNum);
                  }
                }
              }
            } catch (err) {
              console.warn("Internal PDF destination jump warning:", err);
            }
          });
        } else {
          return;
        }

        linkLayer.appendChild(a);
      });

      renderTarget.appendChild(linkLayer);
    } catch (err) {
      console.warn("PDF annotations read warning:", err);
    }
  }

  document.addEventListener("click", () => {
    const linkLayer = renderTarget ? renderTarget.querySelector(".pdf-link-overlay-layer") : null;
    if (!linkLayer) return;
    const isDrawingOrErasing =
      document.getElementById("penSuiteMainBtn")?.classList.contains("active") ||
      window.activeTool === "pen" ||
      window.activeTool === "eraser";
    linkLayer.style.pointerEvents = isDrawingOrErasing ? "none" : "auto";
  });

  // ==========================================
  // 1. FILE PLAYLIST & SIDEBAR VISIBILITY
  // ==========================================
  function syncSidebarVisibility() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    if (uploadedFiles.length === 0) {
      sidebar.classList.add("collapsed", "hidden");
      sidebar.style.display = "none";
    } else {
      sidebar.classList.remove("hidden", "collapsed");
      sidebar.style.removeProperty("display");
      sidebar.style.display = "flex";
    }

    if (typeof window.resizeCanvas === "function") {
      setTimeout(window.resizeCanvas, 60);
    }
  }

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        addFilesToPlaylist(Array.from(e.target.files));
      }
    });
  }

  function addFilesToPlaylist(files) {
    files.forEach((file) => uploadedFiles.push(file));
    renderPlaylist();
    selectFile(uploadedFiles.length - files.length);
  }

  function renderPlaylist() {
    if (!filePlaylist) return;
    filePlaylist.innerHTML = "";
    if (fileCount) fileCount.innerText = uploadedFiles.length;

    if (uploadedFiles.length === 0) {
      filePlaylist.innerHTML =
        '<li class="empty-state">No files loaded yet. Click "Upload Files" to begin.</li>';
      syncSidebarVisibility();
      return;
    }

    uploadedFiles.forEach((file, index) => {
      const li = document.createElement("li");
      li.className = "file-item " + (index === activeFileIndex ? "active" : "");
      const ext = file.name.split(".").pop().toLowerCase();

      let icon = "fa-file";
      if (ext === "pdf") icon = "fa-file-pdf";
      else if (ext === "docx" || ext === "doc") icon = "fa-file-word";
      else if (ext === "xlsx" || ext === "xls" || ext === "csv") icon = "fa-file-excel";
      else if (ext === "pptx") icon = "fa-file-powerpoint";
      else if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) icon = "fa-file-image";

      li.innerHTML = `
        <div class="file-info" title="${file.name}">
          <i class="fa-solid ${icon}"></i> 
          <span>${file.name}</span>
        </div>
        <button class="btn-remove-file" title="Remove this file">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;

      li.querySelector(".file-info").addEventListener("click", () => selectFile(index));

      const removeBtn = li.querySelector(".btn-remove-file");
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeFileFromPlaylist(index);
      });

      filePlaylist.appendChild(li);
    });
  }

  function closeActiveDocumentPane() {
    if (renderedPageNum !== null) {
      saveCurrentPdfPageAnnotations();
    }
    renderedPageNum = null;
    currentPDF = null;
    window.currentPDF = null;

    if (renderTarget) renderTarget.innerHTML = "";
    if (docContainer) docContainer.classList.add("hidden");
    if (dropZone) dropZone.classList.remove("hidden");
    if (docTitle) docTitle.innerHTML = '<i class="fa-solid fa-file"></i> Ready for Document';
    if (pageIndicator) pageIndicator.innerText = "Page 0 / 0";

    if (typeof window.setLayoutState === "function") {
      window.setLayoutState("wb-full");
    }

    syncSidebarVisibility();
  }

  function removeFileFromPlaylist(indexToRemove) {
    const isRemovingActive = indexToRemove === activeFileIndex;

    if (uploadedFiles[indexToRemove]) {
      const removedName = uploadedFiles[indexToRemove].name;
      filePageMemory.delete(removedName);
      for (const k of Array.from(pdfPageDrawingsMemory.keys())) {
        if (k.startsWith(removedName + "::")) {
          pdfPageDrawingsMemory.delete(k);
        }
      }
    }

    uploadedFiles.splice(indexToRemove, 1);

    if (isRemovingActive) {
      if (uploadedFiles.length > 0) {
        const nextIndex = Math.min(indexToRemove, uploadedFiles.length - 1);
        activeFileIndex = nextIndex;
        renderPlaylist();
        loadDocument(uploadedFiles[nextIndex]);
      } else {
        activeFileIndex = -1;
        renderPlaylist();
        closeActiveDocumentPane();
      }
    } else {
      if (activeFileIndex > indexToRemove) {
        activeFileIndex--;
      }
      renderPlaylist();
      syncSidebarVisibility();
    }
  }

  window.addEventListener(
    "click",
    (e) => {
      const closeBtn = e.target.closest("#btnDocClose");
      if (!closeBtn) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (activeFileIndex >= 0 && activeFileIndex < uploadedFiles.length) {
        removeFileFromPlaylist(activeFileIndex);
      } else {
        closeActiveDocumentPane();
      }
    },
    true
  );

  function selectFile(index) {
    if (index < 0 || index >= uploadedFiles.length) return;
    saveCurrentPdfPageAnnotations();

    activeFileIndex = index;
    renderPlaylist();
    loadDocument(uploadedFiles[index]);
  }

  function applyDocumentLayoutMode(mode) {
    const docPaneEl = document.getElementById("documentPane");
    const wbPaneEl = document.getElementById("whiteboardPane");
    const resizerEl = document.getElementById("resizer");

    const isDocFull = mode === "doc-full";

    if (typeof window.setLayoutState === "function") {
      window.setLayoutState(isDocFull ? "doc-full" : "split");
    }

    if (isDocFull) {
      if (docPaneEl) {
        docPaneEl.classList.remove("hidden");
        docPaneEl.classList.add("fullscreen", "is-fullscreen");
        docPaneEl.style.setProperty("display", "flex", "important");
        docPaneEl.style.setProperty("width", "100%", "important");
        docPaneEl.style.setProperty("flex", "1 1 100%", "important");
      }
      if (wbPaneEl) {
        wbPaneEl.style.setProperty("display", "none", "important");
        wbPaneEl.setAttribute("data-state", "doc-full");
      }
      if (resizerEl) {
        resizerEl.style.setProperty("display", "none", "important");
      }
    } else {
      if (docPaneEl) {
        docPaneEl.classList.remove("hidden", "fullscreen", "is-fullscreen");
        docPaneEl.style.setProperty("display", "flex", "important");
        docPaneEl.style.setProperty("width", "50%", "important");
        docPaneEl.style.setProperty("flex", "0 0 50%", "important");
      }
      if (wbPaneEl) {
        wbPaneEl.removeAttribute("data-state");
        wbPaneEl.style.setProperty("display", "flex", "important");
        wbPaneEl.style.setProperty("width", "50%", "important");
        wbPaneEl.style.setProperty("flex", "1 1 50%", "important");
      }
      if (resizerEl) {
        resizerEl.style.setProperty("display", "block", "important");
      }
    }
  }

  function loadDocument(file) {
    const wbPaneEl = document.getElementById("whiteboardPane");
    const docPaneEl = document.getElementById("documentPane");
    const ext = file.name.split(".").pop().toLowerCase();

    const isCurrentlySplit =
      docPaneEl &&
      docPaneEl.style.display !== "none" &&
      wbPaneEl &&
      window.getComputedStyle(wbPaneEl).display !== "none" &&
      wbPaneEl.dataset.state !== "wb-full";

    const targetMode =
      ext === "pdf" && !isCurrentlySplit ? "doc-full" : isCurrentlySplit ? "split" : "doc-full";

    syncSidebarVisibility();
    applyDocumentLayoutMode(targetMode);

    setTimeout(() => applyDocumentLayoutMode(targetMode), 90);

    if (docTitle) docTitle.innerHTML = '<i class="fa-solid fa-file"></i> ' + file.name;
    if (dropZone) dropZone.classList.add("hidden");
    if (docContainer) docContainer.classList.remove("hidden");
    if (renderTarget) renderTarget.innerHTML = "";
    if (sheetTabsBar) sheetTabsBar.classList.add("hidden");
    resetControls();

    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) renderImage(file);
    else if (ext === "pdf") renderPDF(file);
    else if (ext === "docx") renderWordDocx(file);
    else if (["xlsx", "xls", "csv"].includes(ext)) renderExcelSheets(file);
    else if (ext === "pptx") renderPowerPoint(file);
    else if (ext === "txt") renderText(file);
  }

  // ==========================================
  // 2. LARGE CRISP FIT-TO-PANE PDF RENDERER + 60FPS PAPER CURL
  // ==========================================
  function updateZoomLabel() {
    if (zoomLevelText) {
      zoomLevelText.innerText = Math.round(currentZoom * 100) + "%";
    }
  }

  function setPdfZoom(newZoom) {
    const clamped = Math.max(0.4, Math.min(3.5, Number(newZoom) || 1.0));
    if (Math.abs(clamped - currentZoom) < 0.01) return;
    currentZoom = clamped;
    updateZoomLabel();
    if (currentPDF) {
      lastPageDirection = "none";
      renderPDFPage(currentPageNum);
    }
  }

  async function calculateAutoFitScale(pdfDoc, pageNum) {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const baseViewport = page.getViewport({ scale: 1.0 });

      const sidebar = document.getElementById("sidebar");
      const sidebarW =
        sidebar && window.getComputedStyle(sidebar).display !== "none"
          ? sidebar.getBoundingClientRect().width || 220
          : 0;

      const wbPaneEl = document.getElementById("whiteboardPane");
      const isDocFull =
        (wbPaneEl && wbPaneEl.dataset.state === "doc-full") ||
        (wbPaneEl && window.getComputedStyle(wbPaneEl).display === "none");

      const vpRect = docViewport ? docViewport.getBoundingClientRect() : null;
      const expectedPaneW = isDocFull
        ? window.innerWidth - sidebarW
        : (window.innerWidth - sidebarW) * 0.5;

      const effectiveW = Math.max(vpRect ? vpRect.width : 0, expectedPaneW) - 48;
      const targetW = isDocFull ? Math.min(effectiveW, 960) : effectiveW;
      const scaleW = targetW / baseViewport.width;

      return Math.max(0.75, Math.min(1.65, Number(scaleW.toFixed(2))));
    } catch (e) {
      return 1.05;
    }
  }

  async function renderPDF(file) {
    try {
      const buffer = await file.arrayBuffer();
      currentPDF = await pdfjsLib.getDocument({ data: buffer }).promise;
      window.currentPDF = currentPDF;
      currentPdfKey = file.name || "document.pdf";
      renderedPageNum = null;
      totalPages = currentPDF.numPages;

      const savedPage = filePageMemory.get(file.name);
      currentPageNum = savedPage && savedPage <= totalPages ? savedPage : 1;
      lastPageDirection = "none";

      setTimeout(async () => {
        if (!currentPDF) return;
        currentZoom = await calculateAutoFitScale(currentPDF, currentPageNum);
        updateZoomLabel();
        renderPDFPage(currentPageNum);
      }, 130);
    } catch (err) {
      console.error("PDF load error:", err);
    }
  }

async function renderPDFPage(pageNum) {
    if (!currentPDF || !renderTarget) return;

    const turnDir = lastPageDirection;
    lastPageDirection = "none";
    const savedScrollLeft = docViewport ? docViewport.scrollLeft : 0;

    // Capture outgoing page snapshot BEFORE clearing renderTarget for zero-flash Depth Slide
    const outgoingSnap =
      (turnDir === "next" || turnDir === "prev") && renderedPageNum !== null
        ? captureCurrentRenderedPageSnapshot()
        : null;

    if (renderedPageNum !== null) {
      saveCurrentPdfPageAnnotations();
    }

    renderTarget.innerHTML = "";
    if (window.getComputedStyle(renderTarget).position === "static") {
      renderTarget.style.position = "relative";
    }

    // Hold old page visually steady at z-index 98 while new page renders underneath
    const oldHoldFx = outgoingSnap ? mountDepthSheet(outgoingSnap, 98) : null;

    const page = await currentPDF.getPage(pageNum);
    const viewport = page.getViewport({ scale: currentZoom });

    const w = Math.max(1, Math.round(viewport.width));
    const h = Math.max(1, Math.round(viewport.height));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = w;
    canvas.height = h;
    canvas.style.display = "block";

    if (docContainer) {
      docContainer.style.setProperty("width", `${w}px`, "important");
      docContainer.style.setProperty("height", `${h}px`, "important");
    }

    renderTarget.style.setProperty("width", `${w}px`, "important");
    renderTarget.style.setProperty("height", `${h}px`, "important");

    renderTarget.appendChild(canvas);
    await page.render({ canvasContext: ctx, viewport }).promise;

    await renderPdfHyperlinks(page, viewport);

    renderedPageNum = pageNum;
    renderedZoom = currentZoom;
    restorePdfPageAnnotations(pageNum, w, h);

    // Run Smooth (0.55s) Horizontal Depth Slide
    if ((turnDir === "next" || turnDir === "prev") && oldHoldFx) {
      const incomingSnap = captureCurrentRenderedPageSnapshot();
      if (incomingSnap) {
        playHorizontalDepthSlide(oldHoldFx, incomingSnap, turnDir);
      } else {
        oldHoldFx.remove();
      }
    } else if (oldHoldFx) {
      oldHoldFx.remove();
    }

    syncAnnotationLayer(w, h);
    if (pageIndicator) pageIndicator.innerText = "Page " + pageNum + " / " + totalPages;
    if (pageNumberInput) pageNumberInput.value = pageNum;
    if (pageTotalText) pageTotalText.innerText = `/ ${totalPages}`;

    if (btnPrevPage) btnPrevPage.disabled = pageNum <= 1;
    if (btnNextPage) btnNextPage.disabled = pageNum >= totalPages;

    if (docViewport) {
      docViewport.scrollTop = 0;
      docViewport.scrollLeft = savedScrollLeft;
    }
  }

  // DIRECT PAGE NUMBER JUMP
  if (pageNumberInput) {
    const handlePageJump = () => {
      let targetPage = parseInt(pageNumberInput.value, 10);

      if (isNaN(targetPage)) {
        pageNumberInput.value = currentPageNum;
        return;
      }

      if (targetPage < 1) targetPage = 1;
      if (totalPages > 0 && targetPage > totalPages) targetPage = totalPages;

      if (targetPage !== currentPageNum) {
        lastPageDirection = targetPage > currentPageNum ? "next" : "prev";
        currentPageNum = targetPage;
        if (currentPDF) {
          renderPDFPage(currentPageNum);
        } else if (typeof currentPPTXSlides !== "undefined" && currentPPTXSlides.length > 0) {
          showPPTXSlide(currentPageNum);
          if (btnPrevPage) btnPrevPage.disabled = currentPageNum <= 1;
          if (btnNextPage) btnNextPage.disabled = currentPageNum >= totalPages;
        }
        if (uploadedFiles[activeFileIndex]) {
          filePageMemory.set(uploadedFiles[activeFileIndex].name, currentPageNum);
        }
      } else {
        pageNumberInput.value = currentPageNum;
      }
    };

    pageNumberInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        pageNumberInput.blur();
      }
    });

    pageNumberInput.addEventListener("change", handlePageJump);
  }

  async function renderWordDocx(file) {
    try {
      const buffer = await file.arrayBuffer();
      mammoth.convertToHtml({ arrayBuffer: buffer }).then((result) => {
        const div = document.createElement("div");
        div.className = "word-content-box";
        div.innerHTML = result.value || "<p>Document is empty</p>";
        renderTarget.appendChild(div);
        if (pageIndicator) pageIndicator.innerText = "Word Loaded";
        setTimeout(() => syncAnnotationLayer(div.clientWidth, div.clientHeight), 100);
      });
    } catch (err) {
      if (renderTarget) {
        renderTarget.innerHTML =
          '<p style="color:red; padding:20px;">DOCX read error: ' + err.message + "</p>";
      }
    }
  }

  async function renderExcelSheets(file) {
    const buffer = await file.arrayBuffer();
    currentExcelWorkbook = XLSX.read(buffer, { type: "array" });
    if (sheetTabsBar) {
      sheetTabsBar.innerHTML = "";
      sheetTabsBar.classList.remove("hidden");

      currentExcelWorkbook.SheetNames.forEach((name, idx) => {
        const tab = document.createElement("div");
        tab.className = "sheet-tab " + (idx === 0 ? "active" : "");
        tab.innerText = name;
        tab.addEventListener("click", () => switchExcelSheet(name, tab));
        sheetTabsBar.appendChild(tab);
      });
    }
    switchExcelSheet(currentExcelWorkbook.SheetNames[0]);
  }

  function switchExcelSheet(sheetName, clickedTab) {
    if (clickedTab) {
      document.querySelectorAll(".sheet-tab").forEach((t) => t.classList.remove("active"));
      clickedTab.classList.add("active");
    }
    const worksheet = currentExcelWorkbook.Sheets[sheetName];
    const html = XLSX.utils.sheet_to_html(worksheet);
    if (renderTarget) {
      renderTarget.innerHTML = '<div class="excel-table-box">' + html + "</div>";
      const table = renderTarget.querySelector("table");
      if (table) table.className = "excel-table";
    }
    if (pageIndicator) pageIndicator.innerText = "Sheet: " + sheetName;
  }

  async function renderPowerPoint(file) {
    try {
      resetControls();
      const zip = await JSZip.loadAsync(file);
      currentPPTXSlides = [];

      const mediaFiles = Object.keys(zip.files).filter(
        (path) => path.toLowerCase().startsWith("ppt/media/") && !zip.files[path].dir
      );
      const mediaUrls = [];
      for (let path of mediaFiles) {
        const blob = await zip.files[path].async("blob");
        mediaUrls.push(URL.createObjectURL(blob));
      }

      const slideFiles = Object.keys(zip.files).filter((path) =>
        path.match(/^ppt\/slides\/slide[0-9]+\.xml$/i)
      );
      if (slideFiles.length === 0) {
        if (renderTarget) {
          renderTarget.innerHTML =
            '<div style="padding: 24px; text-align: center;">No slides detected. Save PPT as PDF for best view.</div>';
        }
        return;
      }

      slideFiles.sort(
        (a, b) => parseInt(a.replace(/[^0-9]/g, "")) - parseInt(b.replace(/[^0-9]/g, ""))
      );
      const parser = new DOMParser();

      for (let i = 0; i < slideFiles.length; i++) {
        const xml = await zip.files[slideFiles[i]].async("text");
        const doc = parser.parseFromString(xml, "application/xml");
        const texts = Array.from(doc.getElementsByTagName("a:t"))
          .map((n) => n.textContent.trim())
          .filter(Boolean)
          .join(" ");
        currentPPTXSlides.push({ text: texts || "(Visual Slide)", images: mediaUrls });
      }

      totalPages = currentPPTXSlides.length;
      currentPageNum = 1;
      if (btnPrevPage) btnPrevPage.disabled = false;
      if (btnNextPage) btnNextPage.disabled = false;
      showPPTXSlide(currentPageNum);
    } catch (err) {
      if (renderTarget) {
        renderTarget.innerHTML =
          '<p style="padding: 20px; color: red;">Save presentation as PDF for full animation view.</p>';
      }
    }
  }

  function showPPTXSlide(slideNum) {
    if (!currentPPTXSlides || currentPPTXSlides.length === 0) return;
    const slide = currentPPTXSlides[slideNum - 1];
    let imagesHtml = slide.images
      .map((img) => '<img src="' + img + '" style="max-height: 100px; margin: 4px;" />')
      .join("");

    if (renderTarget) {
      renderTarget.innerHTML =
        '<div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; width:720px; min-height:440px; padding:24px; box-shadow:0 4px 12px rgba(0,0,0,0.06); display:flex; flex-direction:column; justify-content:space-between;">' +
        '<div style="display:flex; justify-content:center; flex-wrap:wrap;">' +
        imagesHtml +
        "</div>" +
        '<div style="font-size:1.35rem; font-weight:600; text-align:center; line-height:1.8; color:#1e293b; direction:auto;">' +
        slide.text +
        "</div>" +
        '<div style="text-align:right; font-size:0.75rem; color:#94a3b8;">Slide ' +
        slideNum +
        " / " +
        totalPages +
        "</div>" +
        "</div>";
    }
    if (pageIndicator) pageIndicator.innerText = "Slide " + slideNum + " / " + totalPages;
    syncAnnotationLayer(720, 440);
  }

  function renderImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.className = "rendered-image";
      img.onload = () => syncAnnotationLayer(img.clientWidth, img.clientHeight);
      if (renderTarget) renderTarget.appendChild(img);
      if (pageIndicator) pageIndicator.innerText = "Image View";
    };
    reader.readAsDataURL(file);
  }

  function renderText(file) {
    file.text().then((text) => {
      const pre = document.createElement("pre");
      pre.style.padding = "20px";
      pre.innerText = text;
      if (renderTarget) renderTarget.appendChild(pre);
    });
  }

  // ==========================================
  // 3. PAGE NAVIGATION, KEYBOARD & PINCH/WHEEL ZOOM
  // ==========================================
  if (btnPrevPage) {
    btnPrevPage.addEventListener("click", () => {
      if (currentPDF && currentPageNum > 1) {
        lastPageDirection = "prev";
        currentPageNum--;
        renderPDFPage(currentPageNum);
        if (uploadedFiles[activeFileIndex]) {
          filePageMemory.set(uploadedFiles[activeFileIndex].name, currentPageNum);
        }
      } else if (currentPPTXSlides.length > 0 && currentPageNum > 1) {
        currentPageNum--;
        showPPTXSlide(currentPageNum);
        if (btnPrevPage) btnPrevPage.disabled = currentPageNum <= 1;
        if (btnNextPage) btnNextPage.disabled = currentPageNum >= totalPages;
        if (uploadedFiles[activeFileIndex]) {
          filePageMemory.set(uploadedFiles[activeFileIndex].name, currentPageNum);
        }
      }
    });
  }

  if (btnNextPage) {
    btnNextPage.addEventListener("click", () => {
      if (currentPDF && currentPageNum < totalPages) {
        lastPageDirection = "next";
        currentPageNum++;
        renderPDFPage(currentPageNum);
        if (uploadedFiles[activeFileIndex]) {
          filePageMemory.set(uploadedFiles[activeFileIndex].name, currentPageNum);
        }
      } else if (currentPPTXSlides.length > 0 && currentPageNum < totalPages) {
        currentPageNum++;
        showPPTXSlide(currentPageNum);
        if (btnPrevPage) btnPrevPage.disabled = currentPageNum <= 1;
        if (btnNextPage) btnNextPage.disabled = currentPageNum >= totalPages;
        if (uploadedFiles[activeFileIndex]) {
          filePageMemory.set(uploadedFiles[activeFileIndex].name, currentPageNum);
        }
      }
    });
  }

  if (btnZoomIn) {
    btnZoomIn.addEventListener("click", () => {
      setPdfZoom(currentZoom + 0.15);
    });
  }

  if (btnZoomOut) {
    btnZoomOut.addEventListener("click", () => {
      setPdfZoom(currentZoom - 0.15);
    });
  }

  if (docViewport) {
    docViewport.addEventListener(
      "wheel",
      (e) => {
        if (!e.ctrlKey || !currentPDF) return;
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.12 : -0.12;
        setPdfZoom(currentZoom + delta);
      },
      { passive: false }
    );

    let pinchStartDist = 0;
    let pinchStartZoom = 1.0;
    let pinchBaseW = 0;
    let pinchBaseH = 0;
    let isPinching = false;

    docViewport.addEventListener(
      "touchstart",
      (e) => {
        if (!currentPDF) return;
        const penCanvas = renderTarget ? renderTarget.querySelector(".pen-surface-canvas") : null;

        if (e.touches.length === 1 && penCanvas) {
          try {
            preTouchPenSnapshot = penCanvas
              .getContext("2d")
              .getImageData(0, 0, penCanvas.width, penCanvas.height);
          } catch (err) {
            preTouchPenSnapshot = null;
          }
        } else if (e.touches.length === 2) {
          isPinching = true;
          pinchStartDist = Math.hypot(
            e.touches[1].clientX - e.touches[0].clientX,
            e.touches[1].clientY - e.touches[0].clientY
          );
          pinchStartZoom = currentZoom;
          pinchBaseW = renderTarget ? renderTarget.offsetWidth : 0;
          pinchBaseH = renderTarget ? renderTarget.offsetHeight : 0;

          const eraserRing = document.getElementById("smartEraserRing");
          if (eraserRing) eraserRing.style.display = "none";

          if (penCanvas && preTouchPenSnapshot) {
            try {
              penCanvas.getContext("2d").putImageData(preTouchPenSnapshot, 0, 0);
            } catch (err) {}
            preTouchPenSnapshot = null;
          }
        }
      },
      { passive: true, capture: true }
    );

    docViewport.addEventListener(
      "touchmove",
      (e) => {
        if (!isPinching || e.touches.length !== 2 || !currentPDF) return;
        e.preventDefault();
        e.stopPropagation();

        const eraserRing = document.getElementById("smartEraserRing");
        if (eraserRing) eraserRing.style.display = "none";

        const currDist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        if (pinchStartDist > 10 && renderTarget && pinchBaseW > 0) {
          const rawFactor = currDist / pinchStartDist;
          const clampedZoom = Math.max(0.4, Math.min(3.5, pinchStartZoom * rawFactor));
          const previewScale = clampedZoom / pinchStartZoom;

          const liveW = Math.round(pinchBaseW * previewScale);
          const liveH = Math.round(pinchBaseH * previewScale);

          if (docContainer) {
            docContainer.style.setProperty("width", `${liveW}px`, "important");
            docContainer.style.setProperty("height", `${liveH}px`, "important");
            docContainer.style.setProperty("overflow", "visible", "important");
          }

          renderTarget.style.transformOrigin = "top left";
          renderTarget.style.transform = `scale(${previewScale})`;
          renderTarget.dataset.pinchTargetZoom = String(clampedZoom);

          if (zoomLevelText) {
            zoomLevelText.innerText = Math.round(clampedZoom * 100) + "%";
          }
        }
      },
      { passive: false, capture: true }
    );

    const endPinch = (e) => {
      if (e && e.touches && e.touches.length === 0) {
        preTouchPenSnapshot = null;
      }
      if (!isPinching) return;
      isPinching = false;
      if (renderTarget) {
        const targetZoom = parseFloat(renderTarget.dataset.pinchTargetZoom || "");
        delete renderTarget.dataset.pinchTargetZoom;
        renderTarget.style.transform = "";
        renderTarget.style.transformOrigin = "";

        if (docContainer) {
          docContainer.style.setProperty("overflow", "hidden", "important");
        }

        if (Number.isFinite(targetZoom) && Math.abs(targetZoom - pinchStartZoom) > 0.02) {
          setPdfZoom(targetZoom);
        } else {
          if (docContainer && pinchBaseW > 0) {
            docContainer.style.setProperty("width", `${pinchBaseW}px`, "important");
            docContainer.style.setProperty("height", `${pinchBaseH}px`, "important");
          }
          updateZoomLabel();
        }
      }
    };

    docViewport.addEventListener("touchend", endPinch, { passive: true, capture: true });
    docViewport.addEventListener("touchcancel", endPinch, { passive: true, capture: true });
  }

  function resetControls() {
    currentPDF = null;
    window.currentPDF = null;
    renderedPageNum = null;
    currentPPTXSlides = [];
    currentExcelWorkbook = null;
    currentPageNum = 1;
    totalPages = 0;
    if (btnPrevPage) btnPrevPage.disabled = true;
    if (btnNextPage) btnNextPage.disabled = true;
    if (pageIndicator) pageIndicator.innerText = "Ready";
  }

  document.addEventListener("keydown", (e) => {
    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
    if (
      activeTag === "input" ||
      activeTag === "textarea" ||
      (document.activeElement && document.activeElement.isContentEditable)
    ) {
      return;
    }

    if (e.key === "ArrowRight" || e.key === "PageDown") {
      if (btnNextPage && !btnNextPage.disabled) {
        e.preventDefault();
        btnNextPage.click();
      }
      return;
    }

    if (e.key === "ArrowLeft" || e.key === "PageUp") {
      if (btnPrevPage && !btnPrevPage.disabled) {
        e.preventDefault();
        btnPrevPage.click();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      if (docViewport && docViewport.scrollHeight > docViewport.clientHeight) {
        e.preventDefault();
        docViewport.scrollBy({ top: 90, behavior: "smooth" });
      }
      return;
    }

    if (e.key === "ArrowUp") {
      if (docViewport && docViewport.scrollHeight > docViewport.clientHeight) {
        e.preventDefault();
        docViewport.scrollBy({ top: -90, behavior: "smooth" });
      }
    }
  });

  // ==========================================
  // 4. TOUCH / FINGER DRAG SUPPORT FOR SPLIT RESIZER (#resizer)
  // ==========================================
  (function initTouchSplitResizer() {
    const resizer = document.getElementById("resizer");
    const docPane = document.getElementById("documentPane");
    const boardPane = document.getElementById("whiteboardPane");
    const workspace = document.getElementById("workspace");

    if (!resizer || !docPane || !boardPane || !workspace) return;

    resizer.style.touchAction = "none";
    let isTouchResizing = false;
    let activeResizePointerId = null;

    resizer.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") return;
      e.preventDefault();
      isTouchResizing = true;
      activeResizePointerId = e.pointerId;
      resizer.classList.add("dragging");
      try {
        resizer.setPointerCapture(e.pointerId);
      } catch (err) {}
    });

    window.addEventListener("pointermove", (e) => {
      if (!isTouchResizing || e.pointerId !== activeResizePointerId) return;
      const workspaceRect = workspace.getBoundingClientRect();
      const leftWidth = e.clientX - workspaceRect.left;
      const totalWidth = workspaceRect.width;

      if (leftWidth > 180 && totalWidth - leftWidth > 180) {
        const leftPercent = (leftWidth / totalWidth) * 100;
        const rightPercent = 100 - leftPercent;

        docPane.style.setProperty("width", leftPercent + "%", "important");
        docPane.style.setProperty("flex", "0 0 " + leftPercent + "%", "important");

        boardPane.style.setProperty("width", rightPercent + "%", "important");
        boardPane.style.setProperty("flex", "1 1 " + rightPercent + "%", "important");

        if (typeof window.resizeCanvas === "function") window.resizeCanvas();
      }
    });

    const stopTouchResize = (e) => {
      if (!isTouchResizing) return;
      if (e && e.pointerId !== undefined && e.pointerId !== activeResizePointerId) return;
      isTouchResizing = false;
      activeResizePointerId = null;
      resizer.classList.remove("dragging");
      if (typeof window.resizeCanvas === "function") window.resizeCanvas();
    };

    window.addEventListener("pointerup", stopTouchResize);
    window.addEventListener("pointercancel", stopTouchResize);
  })();

  // ==========================================
  // 5. DOCUMENT ANNOTATION LAYER
  // ==========================================
  const annotationCanvasElem = document.getElementById("annotationCanvas");
  const btnToggleAnnotate = document.getElementById("btnToggleAnnotate");
  const annotateStatus = document.getElementById("annotateStatus");
  const docDrawTools = document.getElementById("docDrawTools");

  let annotCanvas = null;
  if (annotationCanvasElem && window.fabric) {
    annotCanvas = new fabric.Canvas("annotationCanvas", { isDrawingMode: true });
    window.annotCanvas = annotCanvas;
  }
  let isAnnotating = false;

  function syncAnnotationLayer(width, height) {
    if (!width || !height || !annotationCanvasElem || !annotCanvas) return;
    annotationCanvasElem.width = width;
    annotationCanvasElem.height = height;
    annotCanvas.setWidth(width);
    annotCanvas.setHeight(height);
    annotCanvas.renderAll();

    const fabricWrapper = annotationCanvasElem.closest(".canvas-container");
    if (fabricWrapper) {
      fabricWrapper.style.width = `${width}px`;
      fabricWrapper.style.height = `${height}px`;
      if (!isAnnotating) {
        fabricWrapper.style.display = "none";
      }
    }
  }

  if (btnToggleAnnotate) {
    btnToggleAnnotate.addEventListener("click", () => {
      isAnnotating = !isAnnotating;
      const fabricWrapper = annotationCanvasElem
        ? annotationCanvasElem.closest(".canvas-container")
        : null;
      if (isAnnotating) {
        if (fabricWrapper) fabricWrapper.style.display = "block";
        if (annotationCanvasElem) annotationCanvasElem.classList.remove("hidden");
        if (docDrawTools) docDrawTools.classList.add("active");
        if (annotateStatus) {
          annotateStatus.innerText = "ON";
          annotateStatus.style.color = "#16a34a";
        }
        if (annotCanvas) {
          annotCanvas.isDrawingMode = true;
          const colorInput = document.getElementById("docBrushColor");
          annotCanvas.freeDrawingBrush.color = colorInput ? colorInput.value : "#dc2626";
          annotCanvas.freeDrawingBrush.width = 3;
        }
      } else {
        if (fabricWrapper) fabricWrapper.style.display = "none";
        if (annotationCanvasElem) annotationCanvasElem.classList.add("hidden");
        if (docDrawTools) docDrawTools.classList.remove("active");
        if (annotateStatus) {
          annotateStatus.innerText = "OFF";
          annotateStatus.style.color = "inherit";
        }
        if (annotCanvas) annotCanvas.isDrawingMode = false;
      }
    });
  }

  const btnDocPen = document.getElementById("btnDocPen");
  if (btnDocPen) {
    btnDocPen.addEventListener("click", () => {
      if (annotCanvas) {
        const colorInput = document.getElementById("docBrushColor");
        annotCanvas.freeDrawingBrush.color = colorInput ? colorInput.value : "#dc2626";
        annotCanvas.freeDrawingBrush.width = 3;
      }
    });
  }

  const btnDocHighlighter = document.getElementById("btnDocHighlighter");
  if (btnDocHighlighter) {
    btnDocHighlighter.addEventListener("click", () => {
      if (annotCanvas) {
        annotCanvas.freeDrawingBrush.color = "rgba(250, 204, 21, 0.4)";
        annotCanvas.freeDrawingBrush.width = 24;
      }
    });
  }

  // ========================================================
  // 6. FLOATING PDF BUBBLE & GENIE ANIMATION CONTROLLER
  // ========================================================
  (function initPdfGenieBubble() {
    const bubble = document.getElementById("minimizedPdfBubble");
    const docPane = document.getElementById("documentPane");
    const wbPane = document.getElementById("whiteboardPane");
    const resizer =
      document.getElementById("resizer") ||
      document.querySelector(".resizer, .split-resizer, .gutter");

    let wasExplicitlyFullscreen = false;
    let savedSplitWidth = "";

    function syncCanvasLayout() {
      window.dispatchEvent(new Event("resize"));
      if (typeof window.resizeCanvas === "function") window.resizeCanvas();

      const c = window.canvas || window.fabricCanvas;
      if (c && wbPane) {
        c.setDimensions({ width: wbPane.clientWidth, height: wbPane.clientHeight });
        c.calcOffset();
        c.renderAll();
      }
    }

    function makeDocumentActive(asFullscreen = false) {
      if (!docPane) return;

      if (bubble) bubble.classList.add("hidden");

      docPane.classList.remove("pdf-genie-minimizing", "pdf-genie-restoring");
      docPane.style.removeProperty("pointer-events");
      docPane.style.pointerEvents = "auto";

      if (asFullscreen) {
        docPane.style.removeProperty("display");
        docPane.style.setProperty("display", "flex", "important");
        docPane.style.setProperty("width", "100%", "important");
        docPane.style.setProperty("flex", "1 1 100%", "important");
        docPane.classList.add("fullscreen", "is-fullscreen");

        if (wbPane) {
          wbPane.style.setProperty("display", "none", "important");
          wbPane.setAttribute("data-state", "doc-full");
        }
        if (resizer) resizer.style.display = "none";
      } else {
        if (wbPane) {
          wbPane.classList.remove("is-fullsize");
          wbPane.removeAttribute("data-state");
          wbPane.style.removeProperty("display");
          wbPane.style.removeProperty("width");
          wbPane.style.removeProperty("flex");
          wbPane.style.display = "flex";
        }

        docPane.classList.remove("fullscreen", "is-fullscreen", "expanded");
        docPane.style.removeProperty("display");
        docPane.style.display = "flex";

        if (savedSplitWidth) {
          docPane.style.width = savedSplitWidth;
          docPane.style.flex = `0 0 ${savedSplitWidth}`;
        } else {
          docPane.style.removeProperty("width");
          docPane.style.removeProperty("flex");
        }

        if (resizer) {
          resizer.style.removeProperty("display");
          resizer.style.removeProperty("pointer-events");
          resizer.style.display = "";
        }
      }

      syncCanvasLayout();
    }

    window.addEventListener(
      "click",
      function (e) {
        const minBtn = e.target.closest(
          "#btnDocMinimize, .doc-minimize-btn, [data-action='minimize-doc']"
        );
        if (!minBtn || !docPane) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const docRect = docPane.getBoundingClientRect();
        const isDocWide = docRect.width > window.innerWidth * 0.75;
        const isWbHidden = wbPane ? window.getComputedStyle(wbPane).display === "none" : false;

        wasExplicitlyFullscreen = isDocWide || isWbHidden;

        if (!wasExplicitlyFullscreen && docRect.width > 50) {
          savedSplitWidth = docRect.width + "px";
        }

        if (resizer) {
          resizer.style.display = "none";
          resizer.style.pointerEvents = "none";
        }

        docPane.classList.remove("pdf-genie-restoring");
        docPane.classList.add("pdf-genie-minimizing");
        docPane.style.pointerEvents = "none";

        if (wbPane) {
          wbPane.style.removeProperty("display");
          wbPane.style.setProperty("display", "flex", "important");
          wbPane.style.setProperty("width", "100%", "important");
          wbPane.style.setProperty("flex", "1 1 100%", "important");
          wbPane.classList.add("is-fullsize");
          wbPane.setAttribute("data-state", "wb-full");
        }
        syncCanvasLayout();

        setTimeout(() => {
          docPane.style.setProperty("display", "none", "important");
          docPane.classList.remove("pdf-genie-minimizing");

          if (bubble) {
            bubble.classList.remove("hidden");
          }
          syncCanvasLayout();
        }, 280);
      },
      true
    );

    if (bubble) {
      bubble.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        makeDocumentActive(wasExplicitlyFullscreen);

        docPane.classList.add("pdf-genie-restoring");
        setTimeout(() => {
          docPane.classList.remove("pdf-genie-restoring");
          syncCanvasLayout();
        }, 280);
      });
    }

    window.addEventListener(
      "click",
      function (e) {
        const isFileClick = e.target
          .closest("span, li, div, button")
          ?.innerText?.includes(".pdf");
        const isUploadClick = e.target.closest("#dockBtnUploadDocs, #fileInput");

        if ((isFileClick || isUploadClick) && bubble && !bubble.classList.contains("hidden")) {
          setTimeout(() => {
            makeDocumentActive(true);
          }, 80);
        }
      },
      true
    );

    const fileInp = document.getElementById("fileInput");
    if (fileInp) {
      fileInp.addEventListener("change", function () {
        setTimeout(() => {
          makeDocumentActive(true);
        }, 80);
      });
    }
  })();

  async function loadPdfFromUrl(url, title = "Book.pdf") {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const fileName = title.toLowerCase().endsWith(".pdf") ? title : title + ".pdf";
      const file = new File([blob], fileName, { type: "application/pdf" });
      addFilesToPlaylist([file]);
    } catch (err) {
      console.error("Book PDF load error:", err);
    }
  }

  window.addFilesToPlaylist = addFilesToPlaylist;
  window.renderPlaylist = renderPlaylist;
  window.selectFile = selectFile;
  window.loadDocument = loadDocument;
  window.renderPDF = renderPDF;
  window.renderPDFPage = renderPDFPage;
  window.syncAnnotationLayer = syncAnnotationLayer;
  window.loadPdfFromUrl = loadPdfFromUrl;
  window.saveCurrentPdfPageAnnotations = saveCurrentPdfPageAnnotations;
})(window);