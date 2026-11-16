// ==========================================================================
// WHITEBOARD SNIPPING TOOL (PROFESSIONAL LIGHTBOX FREEZE ENGINE)
// ==========================================================================
(function () {
  // 1. Injected Button & Hover Styles (Dock button styling untouched)
  if (!document.getElementById("wb-snipping-tool-styles")) {
    const toolStyle = document.createElement("style");
    toolStyle.id = "wb-snipping-tool-styles";
    toolStyle.textContent = `
      #btnSnippingTool {
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1.5px solid #cbd5e1;
        border-radius: 10px;
        background: #ffffff;
        color: #1e293b;
        cursor: pointer;
        transition: all 0.2s ease;
        margin: 4px auto;
      }
      #btnSnippingTool i {
        font-size: 15px;
      }
      #btnSnippingTool:hover {
        border-color: #38bdf8;
        background-color: #f0f9ff;
        color: #0284c7;
        box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.2);
      }
      #btnSnippingTool.active-snip {
        border-color: #0284c7;
        background-color: #e0f2fe;
        color: #0284c7;
      }
    `;
    document.head.appendChild(toolStyle);
  }

  // 2. Lightbox Container & Elements
  let isSelecting = false;
  let isSnipping = false;
  let startX = 0, startY = 0;
  let snipRect = { left: 0, top: 0, width: 0, height: 0 };
  let capturedCanvas = null;

  // Full-Screen Lightbox Backdrop
  const lightboxModal = document.createElement("div");
  lightboxModal.id = "wbSnipLightbox";
  lightboxModal.style.cssText = `
    position: fixed; inset: 0; z-index: 999999;
    background: #000000; display: none;
    align-items: center; justify-content: center;
    user-select: none; touch-action: none; overflow: hidden;
  `;

  // Canvas to show Frozen Captured Frame
  const previewCanvas = document.createElement("canvas");
  previewCanvas.id = "wbSnipPreviewCanvas";
  previewCanvas.style.cssText = `
    position: absolute; cursor: crosshair;
  `;
  lightboxModal.appendChild(previewCanvas);

  // Marquee Selection Box
  const selBox = document.createElement("div");
  selBox.id = "wbSnipBox";
  selBox.style.cssText = `
    position: absolute; border: 2px dashed #38bdf8;
    background: rgba(56, 189, 248, 0.15);
    display: none; pointer-events: none;
    box-shadow: 0 0 0 99999px rgba(0, 0, 0, 0.55);
  `;
  lightboxModal.appendChild(selBox);

  // Top Helper Bar
  const helperBar = document.createElement("div");
  helperBar.style.cssText = `
    position: absolute; top: 15px; left: 50%; transform: translateX(-50%);
    background: rgba(15, 23, 42, 0.85); color: #f8fafc;
    border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 20px;
    padding: 6px 18px; font-size: 13px; font-weight: 500;
    pointer-events: none; z-index: 1000001; backdrop-filter: blur(8px);
  `;
  helperBar.innerHTML = `<i class="fa-solid fa-crop-simple" style="color:#38bdf8; margin-right:6px;"></i> Drag mouse to snip the exact area`;
  lightboxModal.appendChild(helperBar);

  // Bottom Action Bar
  const snipActionBar = document.createElement("div");
  snipActionBar.id = "wbSnipActionBar";
  snipActionBar.style.cssText = `
    position: absolute; display: none; gap: 8px;
    background: #0f172a; border: 1.5px solid #38bdf8;
    padding: 6px 12px; border-radius: 8px; z-index: 1000002;
    box-shadow: 0 10px 25px rgba(0,0,0,0.75);
    pointer-events: auto; align-items: center;
  `;
  snipActionBar.innerHTML = `
    <button type="button" id="btnSnipInsert" style="background:#0284c7; color:#fff; border:none; border-radius:5px; padding:6px 12px; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:5px;">
      <i class="fa-solid fa-plus"></i> Board par Layein
    </button>
    <button type="button" id="btnSnipDownload" style="background:#10b981; color:#fff; border:none; border-radius:5px; padding:6px 12px; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:5px;">
      <i class="fa-solid fa-download"></i> Download
    </button>
    <button type="button" id="btnSnipCancel" style="background:#334155; color:#cbd5e1; border:none; border-radius:5px; padding:6px 10px; font-size:12px; cursor:pointer;">
      Cancel
    </button>
  `;
  lightboxModal.appendChild(snipActionBar);
  document.body.appendChild(lightboxModal);

// 3. Activation with Freeze Preview & Auto-Return Focus
  window.activateSnippingTool = async function () {
    if (isSnipping) {
      window.deactivateSnippingTool();
      return;
    }

    try {
      // Focus change rokte hue display media call karein
      const displayMediaOptions = {
        video: { displaySurface: "monitor" },
        audio: false,
        selfBrowserSurface: "include",
        systemAudio: "exclude"
      };

      // Agar browser support kare to doosre tab par switch hone se rokein
      const controller = new CaptureController ? new CaptureController() : null;
      if (controller && typeof controller.setFocusBehavior === "function") {
        controller.setFocusBehavior("no-focus-change");
        displayMediaOptions.controller = controller;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

      // Frame grab karne ke liye video element
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      // Frame freeze delay
      await new Promise((r) => setTimeout(r, 200));

      capturedCanvas = document.createElement("canvas");
      capturedCanvas.width = video.videoWidth;
      capturedCanvas.height = video.videoHeight;
      const ctx = capturedCanvas.getContext("2d", { alpha: false });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

      // Capture hote hi background stream foran stop karein
      stream.getTracks().forEach((track) => track.stop());

      // Auto Focus: Whiteboard tab par foran wapas aayein
      window.focus();

      // Preview Canvas par wahi frame fit karein
      previewCanvas.width = window.innerWidth;
      previewCanvas.height = window.innerHeight;
      const pCtx = previewCanvas.getContext("2d");
      pCtx.drawImage(capturedCanvas, 0, 0, previewCanvas.width, previewCanvas.height);

      // Lightbox open karein
      isSnipping = true;
      lightboxModal.style.display = "flex";
      selBox.style.display = "none";
      snipActionBar.style.display = "none";

      const btn = document.getElementById("btnSnippingTool");
      if (btn) btn.classList.add("active-snip");
    } catch (err) {
      console.warn("Screen capture permission cancelled:", err);
      window.deactivateSnippingTool();
    }
  };

  window.deactivateSnippingTool = function () {
    isSnipping = false;
    isSelecting = false;
    lightboxModal.style.display = "none";
    selBox.style.display = "none";
    snipActionBar.style.display = "none";
    capturedCanvas = null;

    const btn = document.getElementById("btnSnippingTool");
    if (btn) btn.classList.remove("active-snip");
  };

  // 4. Marquee Selection on Frozen Lightbox
  lightboxModal.addEventListener("pointerdown", (e) => {
    if (e.target.closest("#wbSnipActionBar")) return;
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;

    selBox.style.left = `${startX}px`;
    selBox.style.top = `${startY}px`;
    selBox.style.width = "0px";
    selBox.style.height = "0px";
    selBox.style.display = "block";
    snipActionBar.style.display = "none";
  });

  window.addEventListener("pointermove", (e) => {
    if (!isSelecting) return;
    const currX = e.clientX;
    const currY = e.clientY;

    const left = Math.min(startX, currX);
    const top = Math.min(startY, currY);
    const width = Math.abs(currX - startX);
    const height = Math.abs(currY - startY);

    selBox.style.left = `${left}px`;
    selBox.style.top = `${top}px`;
    selBox.style.width = `${width}px`;
    selBox.style.height = `${height}px`;

    snipRect = { left, top, width, height };
  });

  window.addEventListener("pointerup", () => {
    if (!isSelecting) return;
    isSelecting = false;

    if (snipRect.width > 20 && snipRect.height > 20) {
      let barTop = snipRect.top + snipRect.height + 12;
      if (barTop + 50 > window.innerHeight) {
        barTop = snipRect.top - 50;
      }
      snipActionBar.style.left = `${Math.max(10, snipRect.left)}px`;
      snipActionBar.style.top = `${Math.max(10, barTop)}px`;
      snipActionBar.style.display = "flex";
    } else {
      selBox.style.display = "none";
    }
  });

  // 5. HD Area Extraction
  function getCroppedImageDataUrl() {
    if (!capturedCanvas) return null;

    const scaleX = capturedCanvas.width / window.innerWidth;
    const scaleY = capturedCanvas.height / window.innerHeight;

    const cropX = Math.round(snipRect.left * scaleX);
    const cropY = Math.round(snipRect.top * scaleY);
    const cropW = Math.round(snipRect.width * scaleX);
    const cropH = Math.round(snipRect.height * scaleY);

    const outCanvas = document.createElement("canvas");
    outCanvas.width = cropW;
    outCanvas.height = cropH;
    const outCtx = outCanvas.getContext("2d");

    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = "high";

    outCtx.drawImage(
      capturedCanvas,
      cropX, cropY, cropW, cropH,
      0, 0, cropW, cropH
    );

    return outCanvas.toDataURL("image/png", 1.0);
  }

  // Action 1: Whiteboard par Layein
  snipActionBar.querySelector("#btnSnipInsert").addEventListener("click", (e) => {
    e.stopPropagation();
    const dataUrl = getCroppedImageDataUrl();
    if (dataUrl && typeof window.addImageToWhiteboard === "function") {
      window.addImageToWhiteboard(dataUrl);
    }
    window.deactivateSnippingTool();
  });

  // Action 2: Download
  snipActionBar.querySelector("#btnSnipDownload").addEventListener("click", (e) => {
    e.stopPropagation();
    const dataUrl = getCroppedImageDataUrl();
    if (dataUrl) {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = `${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
      const fileName = `whiteboard-snip-${dateStr}_${timeStr}.png`;

      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    window.deactivateSnippingTool();
  });

  // Action 3: Cancel
  snipActionBar.querySelector("#btnSnipCancel").addEventListener("click", (e) => {
    e.stopPropagation();
    window.deactivateSnippingTool();
  });
})();