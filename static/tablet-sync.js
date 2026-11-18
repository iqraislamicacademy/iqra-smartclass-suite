/* ==========================================================================
   IQRA SMARTCLASS SUITE - FULL HD LOW-LATENCY MIRROR & UNIVERSAL PEN/UI SYNC
   ========================================================================== */
(function () {
  // Keep "" for GitHub / Render live site. For local Wi-Fi testing only, put your PC IP URL.
  const LOCAL_TEST_URL = "";

  let peer = null;
  let conn = null;
  let fastConn = null;
  let mediaCall = null;
  let pcScreenStream = null;
  let boardSyncTimer = null;
  let lastFrameHash = "";

  let activePointerTarget = null;
  let activeDownUiTarget = null;
  let activeRangeInput = null;
  let activeScrollContainer = null;
  let lastScrollClientY = 0;
  let activeIsUiControl = false;
  let activeIsDrawerHandle = false;
  let activeIsCanvasDraw = false;

  // Keep flyout menus unclipped, and scale ONLY when active screen-sharing shrinks viewport height
  function applyProportionalViewportFit() {
    const toolsList = document.getElementById("dockToolsList");
    if (toolsList) {
      toolsList.style.setProperty("overflow", "visible", "important");
    }

    const dock = document.getElementById("floatingDock");
    const flyoutIds = ["penSuiteFlyout", "shapesFlyoutBox", "mathFlyoutBox"];

    if (!pcScreenStream) {
      if (dock) {
        dock.style.zoom = "";
        dock.style.transformOrigin = "";
      }
      flyoutIds.forEach((id) => {
        const box = document.getElementById(id);
        if (box) {
          box.style.zoom = "";
          box.style.maxHeight = "";
          box.style.overflowY = "";
        }
      });
      return;
    }

    const vh = window.innerHeight;
    const scale = vh < 640 ? Number(Math.max(0.82, (vh - 20) / 640).toFixed(3)) : 1;

    if (dock) {
      dock.style.transformOrigin = "right center";
      dock.style.zoom = scale < 1 ? scale : "";
    }

    flyoutIds.forEach((id) => {
      const box = document.getElementById(id);
      if (!box) return;

      if (scale < 1) {
        box.style.zoom = scale;
        box.style.maxHeight = `${Math.floor((vh - 28) / scale)}px`;
        box.style.overflowY = "auto";
      } else {
        box.style.zoom = "";
        box.style.maxHeight = "";
        box.style.overflowY = "";
      }
    });
  }

  // Clean English Confirmation Modal before Disconnecting (Host only)
  function askDisconnectConfirmation(onConfirm) {
    const existing = document.getElementById("iqraDisconnectConfirmModal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "iqraDisconnectConfirmModal";
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(3px); z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="background: #ffffff; width: 320px; max-width: 90vw; border-radius: 16px; padding: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.25); text-align: center;">
        <div style="width: 44px; height: 44px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 18px;">
          <i class="fa-solid fa-power-off"></i>
        </div>
        <h4 style="margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #0f172a;">Disconnect Session?</h4>
        <p style="margin: 0 0 18px; font-size: 13px; color: #64748b; line-height: 1.45;">
          Do you want to stop syncing and disconnect the tablet?
        </p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button id="iqraCancelDisconnectBtn" type="button" style="flex: 1; padding: 9px 12px; border-radius: 10px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; font-size: 13px; font-weight: 600; cursor: pointer;">
            Cancel
          </button>
          <button id="iqraConfirmDisconnectBtn" type="button" style="flex: 1; padding: 9px 12px; border-radius: 10px; border: none; background: #dc2626; color: #ffffff; font-size: 13px; font-weight: 600; cursor: pointer;">
            Disconnect
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("iqraCancelDisconnectBtn").onclick = () => overlay.remove();
    document.getElementById("iqraConfirmDisconnectBtn").onclick = () => {
      overlay.remove();
      onConfirm();
    };
  }

  // Subtle Bottom-Left Disconnect Button (Host PC / Digital Board only)
  function toggleHostDisconnectButton(show) {
    let btn = document.getElementById("iqraCornerDisconnectBtn");
    if (!show) {
      if (btn) btn.remove();
      return;
    }
    if (btn) return;

    btn = document.createElement("button");
    btn.id = "iqraCornerDisconnectBtn";
    btn.type = "button";
    btn.title = "Disconnect Tablet Sync";
    btn.innerHTML = `<i class="fa-solid fa-power-off"></i> <span>Disconnect</span>`;

    btn.style.cssText = `
      position: fixed; bottom: 54px; left: 12px; z-index: 2147483646;
      background: rgba(15, 23, 42, 0.72); color: #f8fafc;
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 5px 10px; border-radius: 999px; font-size: 11px; font-weight: 600;
      font-family: system-ui, -apple-system, sans-serif;
      cursor: pointer; display: flex; align-items: center; gap: 5px;
      opacity: 0.22; transition: opacity 0.2s ease, background 0.2s ease;
    `;

    btn.onmouseenter = () => { btn.style.opacity = "0.95"; };
    btn.onmouseleave = () => { btn.style.opacity = "0.22"; };

    btn.onclick = (e) => {
      e.stopPropagation();
      btn.style.opacity = "0.95";
      askDisconnectConfirmation(() => {
        cleanupHostSession("🛑 Tablet Sync Disconnected");
      });
    };

    document.body.appendChild(btn);
  }

  // Cleanly terminate host session and notify tablet
  function cleanupHostSession(notifyMsg) {
    toggleHostDisconnectButton(false);

    if (boardSyncTimer) {
      clearInterval(boardSyncTimer);
      boardSyncTimer = null;
    }
    lastFrameHash = "";

    if (pcScreenStream) {
      pcScreenStream.getTracks().forEach((track) => track.stop());
      pcScreenStream = null;
    }
    if (mediaCall) {
      try { mediaCall.close(); } catch (e) {}
      mediaCall = null;
    }
    if (fastConn) {
      try { fastConn.close(); } catch (e) {}
      fastConn = null;
    }
    if (conn) {
      try {
        if (conn.open) conn.send({ type: "host-stopped" });
        conn.close();
      } catch (e) {}
      conn = null;
    }
    if (peer) {
      try { peer.destroy(); } catch (e) {}
      peer = null;
    }

    setTimeout(applyProportionalViewportFit, 100);
    if (notifyMsg) showToast(notifyMsg);
  }

  // QR Code + 6-Digit Room ID Modal (Host & Join)
  function createSyncModal() {
    if (document.getElementById("iqraTabletSyncModal")) return;

    const modal = document.createElement("div");
    modal.id = "iqraTabletSyncModal";
    modal.style.cssText = `
      display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px); z-index: 999999; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    modal.innerHTML = `
      <div style="background: #ffffff; width: 370px; max-width: 94vw; border-radius: 18px; padding: 22px; box-shadow: 0 20px 40px rgba(0,0,0,0.25); text-align: center; position: relative;">
        <button id="closeTabletSyncModal" type="button" style="position: absolute; top: 12px; right: 12px; width: 30px; height: 30px; border-radius: 50%; border: none; background: #f1f5f9; cursor: pointer; font-size: 16px; color: #475569;">✕</button>
        
        <div style="width: 44px; height: 44px; border-radius: 12px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; font-size: 20px;">
          <i class="fa-solid fa-tablet-screen-button"></i>
        </div>
        <h3 style="margin: 0 0 4px; font-size: 18px; color: #0f172a;">Tablet Mirror & Control</h3>
        <p style="margin: 0 0 12px; font-size: 12px; color: #64748b; line-height: 1.4;">
          Scan the QR code with your tablet camera OR enter the 6-digit Room ID on your tablet.
        </p>

        <div id="syncQrContainer" style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 12px; padding: 14px; margin-bottom: 10px; min-height: 215px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <span style="font-size: 13px; color: #0284c7;">Generating Connection ID...</span>
        </div>

        <div id="syncStatusBadge" style="display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #fef3c7; color: #b45309; margin-bottom: 14px;">
          ● Waiting for tablet to connect...
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: left;">
          <div style="font-size: 11.5px; font-weight: 700; color: #334155; margin-bottom: 6px;">
            Or connect this device as a Tablet (Enter 6-digit Code):
          </div>
          <div style="display: flex; gap: 8px;">
            <input id="joinRoomCodeInput" type="text" inputmode="numeric" maxlength="6" placeholder="e.g. 360579"
              style="flex: 1; padding: 8px 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 14px; font-weight: 700; letter-spacing: 2px; text-align: center; outline: none;" />
            <button id="joinRoomCodeBtn" type="button"
              style="background: #0284c7; color: #ffffff; border: none; padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer;">
              Connect
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById("closeTabletSyncModal").onclick = () => {
      modal.style.display = "none";
    };

    const joinBtn = document.getElementById("joinRoomCodeBtn");
    const joinInput = document.getElementById("joinRoomCodeInput");
    const handleJoinByCode = () => {
      const raw = (joinInput.value || "").trim().replace(/[^0-9]/g, "");
      if (raw.length < 4) {
        showToast("⚠️ Please enter the 6-digit Room ID shown on host screen.");
        return;
      }
      modal.style.display = "none";
      cleanupHostSession();
      connectToRoomId("iqra-" + raw);
    };

    joinBtn.onclick = handleJoinByCode;
    joinInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleJoinByCode();
    });
  }

  // HOST MODE (PC or Android Digital Board)
  function startHostSession() {
    createSyncModal();
    const modal = document.getElementById("iqraTabletSyncModal");
    const qrBox = document.getElementById("syncQrContainer");
    const badge = document.getElementById("syncStatusBadge");
    modal.style.display = "flex";

    cleanupHostSession();
    badge.style.background = "#fef3c7";
    badge.style.color = "#b45309";
    badge.textContent = "● Waiting for tablet to connect...";

    const codeNum = String(Math.floor(100000 + Math.random() * 900000));
    const shortId = "iqra-" + codeNum;
    peer = new Peer(shortId);

    peer.on("open", (id) => {
      let baseUrl = window.location.href.split("?")[0];
      if (baseUrl.includes("127.0.0.1") || baseUrl.includes("localhost")) {
        baseUrl = LOCAL_TEST_URL || "https://iqra-smartclass-suite.onrender.com/index.html";
      }
      const joinUrl = `${baseUrl}?syncRoom=${id}`;

      qrBox.innerHTML = `
        <div id="localQrCanvasBox" style="background:#ffffff; padding:16px; border-radius:12px; display:inline-block; margin-bottom:10px; border:2px solid #0f172a;"></div>
        <div style="font-size: 13px; color: #0f172a; margin-bottom: 8px;">
          Room ID: <b style="font-size: 18px; letter-spacing: 2px; color: #0284c7; background: #e0f2fe; padding: 2px 10px; border-radius: 6px;">${codeNum}</b>
        </div>
        <button id="copySyncJoinUrlBtn" type="button" style="background:#e2e8f0; color:#1e293b; border:none; padding:5px 12px; border-radius:8px; font-size:11.5px; font-weight:600; cursor:pointer;">
          📋 Copy Join Link
        </button>
      `;

      const renderLocalQr = () => {
        const target = document.getElementById("localQrCanvasBox");
        if (!target) return;
        target.innerHTML = "";
        new QRCode(target, {
          text: joinUrl,
          width: 210,
          height: 210,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.L
        });
      };

      if (window.QRCode) {
        renderLocalQr();
      } else {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
        s.onload = renderLocalQr;
        document.head.appendChild(s);
      }

      const copyBtn = document.getElementById("copySyncJoinUrlBtn");
      if (copyBtn) {
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(joinUrl).then(() => {
            copyBtn.textContent = "✅ Link Copied!";
            setTimeout(() => { copyBtn.textContent = "📋 Copy Join Link"; }, 2000);
          });
        };
      }
    });

    peer.on("connection", (connection) => {
      if (connection.label === "fast-pen") {
        fastConn = connection;
        fastConn.on("data", (data) => dispatchRemotePointerToPC(data));
        return;
      }

      conn = connection;
      badge.style.background = "#dcfce7";
      badge.style.color = "#15803d";
      badge.textContent = "● Tablet Connected! Please click 'Share' on PC...";

      conn.on("data", (data) => {
        if (data.type === "request-stream") {
          startHostBroadcast(connection.peer, modal);
        } else if (data.type === "remote-file-upload") {
          handleRemoteFileDropOnHost(data);
        } else {
          dispatchRemotePointerToPC(data);
        }
      });

      conn.on("close", () => {
        cleanupHostSession("⚠️ Tablet Disconnected");
      });
    });

    peer.on("error", (err) => {
      qrBox.innerHTML = `<span style="color:#dc2626; font-size:13px;">Connection Error: ${err.type}</span>`;
    });
  }

  // Receive image/PDF selected on Tablet and feed it into Host's file input
  function handleRemoteFileDropOnHost(data) {
    try {
      const byteString = atob(data.base64.split(",")[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: data.mimeType });
      const file = new File([blob], data.fileName, { type: data.mimeType });
      const dt = new DataTransfer();
      dt.items.add(file);

      const isPdf = data.mimeType === "application/pdf" || data.fileName.toLowerCase().endsWith(".pdf");
      const allFileInputs = [...document.querySelectorAll("input[type='file']")];
      let targetInput = allFileInputs.find((inp) =>
        isPdf
          ? ((inp.accept || "") + (inp.id || "")).toLowerCase().includes("pdf") || ((inp.id || "").toLowerCase().includes("doc"))
          : ((inp.accept || "") + (inp.id || "")).toLowerCase().includes("image")
      ) || allFileInputs[0];

      if (targetInput) {
        targetInput.files = dt.files;
        targetInput.dispatchEvent(new Event("change", { bubbles: true }));
        showToast(`✅ Loaded ${data.fileName} from Tablet!`);
      }
    } catch (e) {
      showToast("⚠️ Could not load file from Tablet.");
    }
  }

  // Boost WebRTC sender video bitrate to 6 Mbps immediately so Full HD sharpness appears from second 1
  function boostVideoBitrate(call) {
    try {
      const pc = call.peerConnection;
      if (!pc) return;
      const applyParams = () => {
        pc.getSenders().forEach((sender) => {
          if (sender.track && sender.track.kind === "video") {
            const params = sender.getParameters();
            if (!params.encodings || !params.encodings.length) {
              params.encodings = [{}];
            }
            params.encodings[0].maxBitrate = 6000000; // 6 Mbps Full HD crispness immediately
            params.encodings[0].maxFramerate = 30;
            params.degradationPreference = "maintain-resolution";
            sender.setParameters(params).catch(() => {});
          }
        });
      };
      applyParams();
      setTimeout(applyParams, 800);
    } catch (e) {}
  }

  // Hybrid Broadcast: Instant Full HD Video on PC, Live PDF + Whiteboard Canvas Sync on Android Digital Board
  async function startHostBroadcast(tabletPeerId, modal) {
    const canCaptureScreen =
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getDisplayMedia === "function" &&
      !/Android/i.test(navigator.userAgent);

    if (canCaptureScreen) {
      try {
        if (!pcScreenStream) {
          pcScreenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: "monitor",
              width: { ideal: 1920, max: 1920 },
              height: { ideal: 1080, max: 1080 },
              frameRate: { ideal: 30, max: 30 },
              cursor: "never"
            },
            audio: false
          });

          const videoTrack = pcScreenStream.getVideoTracks()[0];
          if (videoTrack) {
            if ("contentHint" in videoTrack) {
              try { videoTrack.contentHint = "detail"; } catch (e) {}
            }
            videoTrack.onended = () => {
              cleanupHostSession("🛑 Screen Sharing & Tablet Sync Stopped");
            };
          }
        }
        modal.style.display = "none";
        toggleHostDisconnectButton(true);
        setTimeout(applyProportionalViewportFit, 150);
        showToast("✅ Tablet Connected in Full HD! Press F11 on PC for Fullscreen.");

        mediaCall = peer.call(tabletPeerId, pcScreenStream, {
          sdpTransform: (sdp) =>
            sdp.replace(/a=fmtp:(\d+) (.*)/g, "a=fmtp:$1 $2;x-google-min-bitrate=3000;x-google-start-bitrate=5000;x-google-max-bitrate=8000")
        });
        boostVideoBitrate(mediaCall);
        return;
      } catch (err) {
        if (err && err.name === "NotAllowedError") {
          modal.style.display = "none";
          cleanupHostSession("⚠️ Screen Sharing Cancelled");
          return;
        }
      }
    }

    modal.style.display = "none";
    toggleHostDisconnectButton(true);
    startBoardAndPdfCanvasSync();
    showToast("✅ Board & PDF Sync Connected!");
  }

  function startBoardAndPdfCanvasSync() {
    if (boardSyncTimer) clearInterval(boardSyncTimer);

    const composite = document.createElement("canvas");
    const ctx = composite.getContext("2d");

    const sendFrame = () => {
      if (!conn || !conn.open) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (composite.width !== vw || composite.height !== vh) {
        composite.width = vw;
        composite.height = vh;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, vw, vh);

      const allCanvases = document.querySelectorAll("canvas");
      allCanvases.forEach((c) => {
        if (c.id === "wbSnipPreviewCanvas") return;
        const style = window.getComputedStyle(c);
        if (style.display === "none" || style.visibility === "hidden" || c.classList.contains("hidden")) return;
        const rect = c.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 50) {
          try {
            ctx.drawImage(c, rect.left, rect.top, rect.width, rect.height);
          } catch (e) {}
        }
      });

      const dataUrl = composite.toDataURL("image/webp", 0.78);
      const sig = dataUrl.length + ":" + dataUrl.slice(-64);
      if (sig !== lastFrameHash) {
        lastFrameHash = sig;
        try {
          conn.send({ type: "canvas-frame", image: dataUrl });
        } catch (e) {}
      }
    };

    sendFrame();
    boardSyncTimer = setInterval(sendFrame, 100);
  }

  // Deep hit-test: penetrates inside same-origin <iframe> (such as PDF Reader iframe)
  function deepElementFromPoint(x, y) {
    let el = document.elementFromPoint(x, y);
    let doc = document;
    let localX = x;
    let localY = y;

    while (el && el.tagName === "IFRAME") {
      try {
        const rect = el.getBoundingClientRect();
        const innerDoc = el.contentDocument;
        if (!innerDoc) break;
        localX = localX - rect.left;
        localY = localY - rect.top;
        const innerEl = innerDoc.elementFromPoint(localX, localY);
        if (!innerEl) break;
        el = innerEl;
        doc = innerDoc;
      } catch (e) {
        break;
      }
    }
    return { el, doc, localX, localY };
  }

  // Update <input type="range"> value proportionally from X coordinate
  function updateRangeSliderFromX(rangeEl, clientX) {
    if (!rangeEl || rangeEl.type !== "range") return;
    const rect = rangeEl.getBoundingClientRect();
    if (rect.width <= 0) return;

    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const min = parseFloat(rangeEl.min || "0");
    const max = parseFloat(rangeEl.max || "100");
    const step = parseFloat(rangeEl.step || "1") || 1;

    let rawVal = min + ratio * (max - min);
    rawVal = Math.round(rawVal / step) * step;
    rawVal = Math.max(min, Math.min(max, rawVal));

    rangeEl.value = rawVal;
    rangeEl.dispatchEvent(new Event("input", { bubbles: true }));
    rangeEl.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function openCustomSelectMenuOnHost(selectEl) {
    const existing = document.getElementById("iqraRemoteSelectOverlay");
    if (existing) existing.remove();

    const rect = selectEl.getBoundingClientRect();
    const menu = document.createElement("div");
    menu.id = "iqraRemoteSelectOverlay";
    menu.style.cssText = `
      position: fixed;
      top: ${Math.min(window.innerHeight - 240, rect.bottom + 6)}px;
      left: ${Math.max(10, Math.min(window.innerWidth - 230, rect.left))}px;
      width: ${Math.max(210, rect.width)}px;
      max-height: 230px; overflow-y: auto;
      background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px;
      box-shadow: 0 12px 30px rgba(0,0,0,0.22); z-index: 2147483647;
      padding: 6px; font-family: system-ui, sans-serif;
    `;

    [...selectEl.options].forEach((opt, idx) => {
      const item = document.createElement("button");
      item.type = "button";
      item.textContent = opt.textContent;
      const isSelected = idx === selectEl.selectedIndex;
      item.style.cssText = `
        display: block; width: 100%; text-align: left; padding: 8px 12px;
        border: none; border-radius: 8px; font-size: 13px; cursor: pointer;
        background: ${isSelected ? "#e0f2fe" : "transparent"};
        color: ${isSelected ? "#0369a1" : "#1e293b"};
        font-weight: ${isSelected ? "700" : "500"};
      `;
      item.onclick = (e) => {
        e.stopPropagation();
        selectEl.selectedIndex = idx;
        selectEl.value = opt.value;
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
        selectEl.dispatchEvent(new Event("input", { bubbles: true }));
        menu.remove();
      };
      menu.appendChild(item);
    });

    document.body.appendChild(menu);
  }

  function openCustomColorMenuOnHost(colorInputEl) {
    const existing = document.getElementById("iqraRemoteColorOverlay");
    if (existing) existing.remove();

    const rect = colorInputEl.getBoundingClientRect();
    const box = document.createElement("div");
    box.id = "iqraRemoteColorOverlay";
    box.style.cssText = `
      position: fixed;
      top: ${Math.min(window.innerHeight - 130, rect.bottom + 6)}px;
      left: ${Math.max(10, Math.min(window.innerWidth - 220, rect.left - 80))}px;
      width: 210px; background: #ffffff; border: 1.5px solid #cbd5e1;
      border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,0.22);
      z-index: 2147483647; padding: 10px; display: grid;
      grid-template-columns: repeat(5, 1fr); gap: 8px;
    `;

    const swatches = [
      "#94a3b8", "#0f172a", "#dc2626", "#2563eb", "#16a34a",
      "#d97706", "#7c3aed", "#db2777", "#0891b2", "#cbd5e1"
    ];

    swatches.forEach((hex) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.style.cssText = `
        width: 28px; height: 28px; border-radius: 50%; border: 2px solid #e2e8f0;
        background: ${hex}; cursor: pointer;
      `;
      btn.onclick = (e) => {
        e.stopPropagation();
        colorInputEl.value = hex;
        colorInputEl.dispatchEvent(new Event("input", { bubbles: true }));
        colorInputEl.dispatchEvent(new Event("change", { bubbles: true }));
        box.remove();
      };
      box.appendChild(btn);
    });

    document.body.appendChild(box);
  }

  // Find nearest scrollable ancestor (for Finger scrolling on PDF Viewer pages, Galleries, Maps Sidebar)
  function findScrollableAncestor(el, ownerDoc) {
    let curr = el;
    const win = (ownerDoc && ownerDoc.defaultView) || window;
    while (curr && curr !== ownerDoc.body && curr !== ownerDoc.documentElement) {
      const style = win.getComputedStyle(curr);
      const overflowY = style.overflowY;
      if ((overflowY === "auto" || overflowY === "scroll") && curr.scrollHeight > curr.clientHeight + 4) {
        return curr;
      }
      curr = curr.parentElement;
    }
    const rootScroller = ownerDoc.scrollingElement || ownerDoc.documentElement;
    if (rootScroller && rootScroller.scrollHeight > win.innerHeight + 10) {
      return rootScroller;
    }
    return null;
  }

  function isNearDrawerHandle(x, y) {
    const handle = document.getElementById("dockDrawerHandle");
    if (!handle) return null;
    const r = handle.getBoundingClientRect();
    if (x >= r.left - 24 && x <= r.right + 16 && y >= r.top - 24 && y <= r.bottom + 24) {
      return handle;
    }
    return null;
  }

  function activateDrawerHandleTap(handle, x, y) {
    const base = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      pointerId: 1,
      pointerType: "pen",
      isPrimary: true,
      button: 0,
      buttons: 1
    };
    handle.dispatchEvent(new PointerEvent("pointerdown", { ...base, clientX: x, clientY: y }));
    handle.dispatchEvent(new MouseEvent("mousedown", { ...base, clientX: x, clientY: y }));
    window.dispatchEvent(new PointerEvent("pointermove", { ...base, clientX: x - 45, clientY: y }));
    window.dispatchEvent(new MouseEvent("mousemove", { ...base, clientX: x - 45, clientY: y }));
    window.dispatchEvent(new PointerEvent("pointerup", { ...base, clientX: x - 45, clientY: y, buttons: 0 }));
    window.dispatchEvent(new MouseEvent("mouseup", { ...base, clientX: x - 45, clientY: y, buttons: 0 }));
    handle.click();
  }

  // Detect Minimized Floating Dock Pill in bottom-right corner (Image 1 fix)
  function findMinimizedDockPill(x, y) {
    const dock = document.getElementById("floatingDock");
    if (dock) {
      const r = dock.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.height <= 90 && x >= r.left - 16 && x <= r.right + 16 && y >= r.top - 16 && y <= r.bottom + 16) {
        return dock.querySelector("button, [role='button'], .dock-restore-btn, .dock-min-pill") || dock;
      }
    }
    // Check any fixed bottom-right pill element
    if (x >= window.innerWidth - 180 && y >= window.innerHeight - 110) {
      const el = document.elementFromPoint(x, y);
      if (el && el !== document.body && el.tagName !== "CANVAS") {
        const pill = el.closest("[id*='dock' i], [class*='dock' i], [id*='pill' i], [class*='pill' i], button") || el;
        return pill;
      }
    }
    return null;
  }

  // Universal UI Element Finder
  function findInteractiveUiElement(el, ownerDoc) {
    if (!el || el === ownerDoc.body || el === ownerDoc.documentElement) return null;
    if (el.tagName === "CANVAS") return null;

    const win = (ownerDoc && ownerDoc.defaultView) || window;

    const explicit = el.closest(
      "button, a, input, select, textarea, label, [role='button'], [onclick], [data-action], [data-book], [data-url], [data-pdf], .tool-btn, .toolkit-item, .dock-item, .pen-suite-trigger-btn, .pen-type-btn, .shape-option-btn, .math-tool-btn, .book-card, .gallery-card, .library-item, .modal-close, .close-btn, [id*='close' i], [class*='close' i], [title*='Close' i], [title*='Remove' i], g[onclick], g[class*='close' i], g[id*='close' i]"
    );
    if (explicit && explicit.tagName !== "CANVAS") return explicit;

    if (el instanceof win.SVGElement || el.ownerSVGElement) {
      let svgCurr = el;
      for (let i = 0; i < 5 && svgCurr && svgCurr !== ownerDoc.body; i++) {
        const style = win.getComputedStyle(svgCurr);
        if (
          style.cursor === "pointer" ||
          svgCurr.hasAttribute("onclick") ||
          /close|remove|delete|exit/i.test((svgCurr.id || "") + " " + (svgCurr.getAttribute("class") || ""))
        ) {
          return svgCurr;
        }
        svgCurr = svgCurr.parentElement;
      }
    }

    let curr = el;
    for (let i = 0; i < 6 && curr && curr !== ownerDoc.body; i++) {
      if (curr.tagName === "CANVAS") return null;
      const style = win.getComputedStyle(curr);
      if (style.cursor === "pointer") {
        return curr;
      }
      curr = curr.parentElement;
    }

    if (el.closest(".floating-dock, .dock-full-panel, .pen-suite-flyout, .shapes-flyout-box, .math-flyout-box, [id*='Modal' i], [class*='modal' i], [id*='Gallery' i], [class*='gallery' i], [id*='Overlay' i], [id*='pdf' i], [class*='pdf' i]")) {
      return el;
    }

    return null;
  }

  // Dispatch click on SVG or HTML element reliably
  function triggerUniversalClick(target, x, y, ownerDoc) {
    if (!target || target.tagName === "CANVAS") return;
    const win = (ownerDoc && ownerDoc.defaultView) || window;
    const opts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: win,
      clientX: x,
      clientY: y,
      button: 0
    };
    target.dispatchEvent(new MouseEvent("mouseenter", opts));
    target.dispatchEvent(new MouseEvent("mouseover", opts));
    target.dispatchEvent(new PointerEvent("pointerdown", { ...opts, pointerId: 1, pointerType: "pen", buttons: 1 }));
    target.dispatchEvent(new MouseEvent("mousedown", { ...opts, buttons: 1 }));
    target.dispatchEvent(new PointerEvent("pointerup", { ...opts, pointerId: 1, pointerType: "pen", buttons: 0 }));
    target.dispatchEvent(new MouseEvent("mouseup", { ...opts, buttons: 0 }));
    if (typeof target.click === "function") {
      target.click();
    } else {
      target.dispatchEvent(new MouseEvent("click", opts));
    }
  }

  // Execute remote Pen ("pen") vs Finger ("touch") and ALL UI interactions on Host
  function dispatchRemotePointerToPC(data) {
    if ((!conn || !conn.open) && (!fastConn || !fastConn.open)) return;

    const x = Math.max(0, Math.min(window.innerWidth - 1, data.nx * window.innerWidth));
    const y = Math.max(0, Math.min(window.innerHeight - 1, data.ny * window.innerHeight));

    const { el: hitEl, doc: ownerDoc, localX, localY } = deepElementFromPoint(x, y);
    if (!hitEl && !activePointerTarget && !activeRangeInput) return;

    const pType = data.pointerType || "pen";
    const pId = pType === "pen" ? 2 : 1;
    const win = (ownerDoc && ownerDoc.defaultView) || window;

    const eventInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: win,
      clientX: localX,
      clientY: localY,
      screenX: x,
      screenY: y,
      pointerId: pId,
      pointerType: pType,
      width: pType === "touch" ? 24 : 2,
      height: pType === "touch" ? 24 : 2,
      isPrimary: true,
      pressure: data.type === "up" ? 0 : (data.pressure || 0.5),
      button: 0,
      buttons: data.type === "up" ? 0 : 1
    };

    const drawerHandle = isNearDrawerHandle(x, y);
    const minDockPill = findMinimizedDockPill(x, y);
    const uiTarget = drawerHandle || minDockPill || findInteractiveUiElement(hitEl, ownerDoc);
    const rangeTarget =
      (hitEl && hitEl.tagName === "INPUT" && hitEl.type === "range")
        ? hitEl
        : (uiTarget && uiTarget.tagName === "INPUT" && uiTarget.type === "range" ? uiTarget : null);

    if (data.type === "down") {
      const selMenu = document.getElementById("iqraRemoteSelectOverlay");
      if (selMenu && hitEl && !selMenu.contains(hitEl)) selMenu.remove();
      const colMenu = document.getElementById("iqraRemoteColorOverlay");
      if (colMenu && hitEl && !colMenu.contains(hitEl)) colMenu.remove();

      activeIsDrawerHandle = Boolean(drawerHandle);
      activeRangeInput = rangeTarget;
      activeIsCanvasDraw = Boolean(hitEl && hitEl.tagName === "CANVAS" && !uiTarget && !rangeTarget);
      // Only use drag-scrolling if NOT drawing with pen on a canvas (allows Pen drawing over PDF!)
      activeScrollContainer = activeIsCanvasDraw ? null : findScrollableAncestor(hitEl, ownerDoc);
      lastScrollClientY = y;
      activeIsUiControl = Boolean(uiTarget || rangeTarget);
      activeDownUiTarget = uiTarget;
      activePointerTarget = rangeTarget || uiTarget || hitEl;

      if (activeRangeInput) {
        updateRangeSliderFromX(activeRangeInput, localX);
      }

      if (activePointerTarget) {
        activePointerTarget.dispatchEvent(new PointerEvent("pointerdown", eventInit));
        activePointerTarget.dispatchEvent(new MouseEvent("mousedown", eventInit));
      }
    } else if (data.type === "move") {
      if (activeRangeInput) {
        updateRangeSliderFromX(activeRangeInput, localX);
        return;
      }

      if (activeIsDrawerHandle && activePointerTarget) {
        activePointerTarget.dispatchEvent(new PointerEvent("pointermove", eventInit));
        activePointerTarget.dispatchEvent(new MouseEvent("mousemove", eventInit));
        window.dispatchEvent(new PointerEvent("pointermove", eventInit));
        window.dispatchEvent(new MouseEvent("mousemove", eventInit));
        return;
      }

      // Draw directly when gesture started on Whiteboard OR PDF annotationCanvas
      if (activeIsCanvasDraw) {
        const target = activePointerTarget || hitEl;
        if (target) {
          target.dispatchEvent(new PointerEvent("pointermove", eventInit));
          target.dispatchEvent(new MouseEvent("mousemove", eventInit));
        }
        return;
      }

      // Vertical drag-scrolling for non-canvas containers (PDF background, Galleries, Maps Sidebar)
      if (activeScrollContainer && (!activeIsUiControl || activeDownUiTarget === activeScrollContainer || !activeDownUiTarget)) {
        const dy = lastScrollClientY - y;
        if (Math.abs(dy) > 1) {
          activeScrollContainer.scrollTop += dy;
          lastScrollClientY = y;
        }
        return;
      }

      if (activeIsUiControl) return;

      const target = activePointerTarget || hitEl;
      if (target) {
        target.dispatchEvent(new PointerEvent("pointermove", eventInit));
        target.dispatchEvent(new MouseEvent("mousemove", eventInit));
      }
    } else if (data.type === "up") {
      const target = activePointerTarget || uiTarget || hitEl;

      if (activeRangeInput) {
        updateRangeSliderFromX(activeRangeInput, localX);
      } else if (activeIsDrawerHandle || drawerHandle) {
        const handle = drawerHandle || activePointerTarget;
        if (data.isTap) {
          activateDrawerHandleTap(handle, x, y);
        } else {
          window.dispatchEvent(new PointerEvent("pointerup", eventInit));
          window.dispatchEvent(new MouseEvent("mouseup", eventInit));
          handle.dispatchEvent(new PointerEvent("pointerup", eventInit));
          handle.dispatchEvent(new MouseEvent("mouseup", eventInit));
        }
      } else {
        if (target) {
          target.dispatchEvent(new PointerEvent("pointerup", eventInit));
          target.dispatchEvent(new MouseEvent("mouseup", eventInit));
        }

        const sameUiButton = activeDownUiTarget && uiTarget && (activeDownUiTarget === uiTarget || activeDownUiTarget.contains(uiTarget) || uiTarget.contains(activeDownUiTarget));
        if (data.isTap || sameUiButton) {
          const clickTarget = uiTarget || activeDownUiTarget;
          if (clickTarget && clickTarget.tagName !== "CANVAS") {
            const labelText = (clickTarget.textContent || "").replace(/\s+/g, " ").trim();
            const idText = clickTarget.id || "";

            if (clickTarget.tagName === "SELECT") {
              openCustomSelectMenuOnHost(clickTarget);
            } else if (clickTarget.tagName === "INPUT" && clickTarget.type === "color") {
              openCustomColorMenuOnHost(clickTarget);
            } else if (
              /insert\s*image|documents?\s*upload|upload\s*doc/i.test(labelText) ||
              /insertimage|uploaddoc|docupload/i.test(idText)
            ) {
              // Trigger file picker directly on Tablet so user can pick Image/PDF from Tablet
              if (conn && conn.open) {
                const isDoc = /doc|pdf/i.test(labelText + idText);
                conn.send({ type: "open-tablet-file-picker", accept: isDoc ? ".pdf,application/pdf" : "image/*" });
              }
            } else {
              triggerUniversalClick(clickTarget, localX, localY, ownerDoc);
            }
          }
        }
      }

      activePointerTarget = null;
      activeDownUiTarget = null;
      activeRangeInput = null;
      activeScrollContainer = null;
      activeIsUiControl = false;
      activeIsDrawerHandle = false;
      activeIsCanvasDraw = false;
    }
  }

  // Connect Client (Tablet) to a specific Room ID
  function connectToRoomId(roomId) {
    if (!roomId) return;
    showToast("🔄 Connecting to Host Board...");

    peer = new Peer();

    peer.on("open", () => {
      conn = peer.connect(roomId, { reliable: true });
      fastConn = peer.connect(roomId, { label: "fast-pen", reliable: false });

      conn.on("open", () => {
        buildTabletMirrorViewport();
        conn.send({ type: "request-stream" });
      });

      conn.on("data", (data) => {
        if (!data) return;
        if (data.type === "host-stopped") {
          showTabletDisconnectedScreen();
        } else if (data.type === "open-tablet-file-picker") {
          triggerTabletFilePicker(data.accept || "image/*");
        } else if (data.type === "canvas-frame" && data.image) {
          const imgEl = document.getElementById("pcMirrorCanvasImg");
          const vidEl = document.getElementById("pcMirrorVideo");
          if (imgEl) {
            imgEl.src = data.image;
            imgEl.style.display = "block";
          }
          if (vidEl) {
            vidEl.style.display = "none";
          }
        }
      });

      conn.on("close", () => {
        showTabletDisconnectedScreen();
      });
    });

    peer.on("error", () => {
      showToast("❌ Could not find Room ID. Check code and try again.");
    });

    peer.on("call", (call) => {
      call.answer();
      call.on("stream", (remoteStream) => {
        const videoEl = document.getElementById("pcMirrorVideo");
        const imgEl = document.getElementById("pcMirrorCanvasImg");
        if (imgEl) imgEl.style.display = "none";
        if (videoEl) {
          videoEl.style.display = "block";
          videoEl.srcObject = remoteStream;
          videoEl.play().catch(() => {});
        }
        remoteStream.getVideoTracks().forEach((track) => {
          track.onended = () => showTabletDisconnectedScreen();
        });
      });
    });
  }

  function triggerTabletFilePicker(acceptType) {
    let picker = document.getElementById("iqraTabletRemoteFilePicker");
    if (!picker) {
      picker = document.createElement("input");
      picker.id = "iqraTabletRemoteFilePicker";
      picker.type = "file";
      picker.style.display = "none";
      document.body.appendChild(picker);
    }
    picker.accept = acceptType;
    picker.value = "";
    picker.onchange = () => {
      const file = picker.files && picker.files[0];
      if (!file || !conn || !conn.open) return;
      showToast("📤 Sending file to Board...");
      const reader = new FileReader();
      reader.onload = () => {
        conn.send({
          type: "remote-file-upload",
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          base64: reader.result
        });
      };
      reader.readAsDataURL(file);
    };
    picker.click();
  }

  function checkAndJoinClientSession() {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("syncRoom");
    if (!roomId) return;
    connectToRoomId(roomId);
  }

  function showTabletDisconnectedScreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (fastConn) {
      try { fastConn.close(); } catch (e) {}
      fastConn = null;
    }
    if (conn) {
      try { conn.close(); } catch (e) {}
      conn = null;
    }
    document.body.innerHTML = `
      <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f172a; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 24px;">
        <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); color: #f87171; display: flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 16px;">
          <i class="fa-solid fa-plug-circle-xmark"></i>
        </div>
        <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700;">Session Ended</h2>
        <p style="margin: 0 0 22px; font-size: 14px; color: #94a3b8; max-width: 360px; line-height: 1.5;">
          Sync session has ended. To reconnect, open <b>Tablet Sync</b> on the host board and scan the QR code or enter the new Room ID.
        </p>
        <button onclick="window.location.href = window.location.pathname" style="background: #0284c7; color: #ffffff; border: none; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer;">
          Back to Board
        </button>
      </div>
    `;
  }

  function buildTabletMirrorViewport() {
    document.body.innerHTML = "";
    document.body.style.cssText = `
      margin: 0; padding: 0; overflow: hidden; background: #ffffff;
      touch-action: none; user-select: none; font-family: system-ui, sans-serif;
    `;

    const badge = document.createElement("div");
    badge.style.cssText = `
      position: fixed; top: 6px; left: 50%; transform: translateX(-50%);
      background: rgba(21, 128, 61, 0.75); color: #ffffff;
      padding: 2px 9px; border-radius: 12px; font-size: 10px;
      font-weight: 600; opacity: 0.4; z-index: 10000; pointer-events: none;
    `;
    badge.textContent = "🟢 Live";
    document.body.appendChild(badge);

    const fsBtn = document.createElement("button");
    fsBtn.textContent = "⛶ Fullscreen";
    fsBtn.style.cssText = `
      position: fixed; top: 6px; left: 8px;
      background: rgba(15, 23, 42, 0.75); color: #fff; border: 1px solid rgba(255,255,255,0.25);
      padding: 4px 9px; border-radius: 8px; font-size: 11px; font-weight: 600;
      z-index: 10001; cursor: pointer;
    `;
    fsBtn.onclick = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        fsBtn.style.opacity = "0.25";
      } else {
        document.exitFullscreen().catch(() => {});
        fsBtn.style.opacity = "1";
      }
    };
    document.body.appendChild(fsBtn);

    const video = document.createElement("video");
    video.id = "pcMirrorVideo";
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.cssText = `
      position: fixed; inset: 0; width: 100vw; height: 100vh;
      object-fit: fill; background: #ffffff; z-index: 1;
    `;
    document.body.appendChild(video);

    const canvasImg = document.createElement("img");
    canvasImg.id = "pcMirrorCanvasImg";
    canvasImg.alt = "Board Live Sync";
    canvasImg.style.cssText = `
      display: none; position: fixed; inset: 0; width: 100vw; height: 100vh;
      object-fit: fill; background: #ffffff; z-index: 2; pointer-events: none;
    `;
    document.body.appendChild(canvasImg);

    const touchLayer = document.createElement("div");
    touchLayer.style.cssText = `
      position: fixed; inset: 0; width: 100vw; height: 100vh;
      z-index: 5; cursor: crosshair; touch-action: none;
    `;
    document.body.appendChild(touchLayer);

    let isDown = false;
    let moved = false;
    let startX = 0, startY = 0;
    let pendingMovePayload = null;
    let moveRafScheduled = false;

    function getNorm(e) {
      return {
        nx: Math.max(0, Math.min(1, e.clientX / window.innerWidth)),
        ny: Math.max(0, Math.min(1, e.clientY / window.innerHeight))
      };
    }

    function flushMovePayload() {
      moveRafScheduled = false;
      if (!pendingMovePayload) return;
      const activeMoveChannel = (fastConn && fastConn.open) ? fastConn : conn;
      if (activeMoveChannel && activeMoveChannel.open) {
        activeMoveChannel.send(pendingMovePayload);
      }
      pendingMovePayload = null;
    }

    touchLayer.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      isDown = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      const { nx, ny } = getNorm(e);
      if (conn && conn.open) {
        conn.send({
          type: "down",
          nx,
          ny,
          pointerType: e.pointerType,
          pressure: e.pressure
        });
      }
    });

    touchLayer.addEventListener("pointermove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      if (Math.abs(e.clientX - startX) > 18 || Math.abs(e.clientY - startY) > 18) {
        moved = true;
      }
      const { nx, ny } = getNorm(e);
      pendingMovePayload = {
        type: "move",
        nx,
        ny,
        pointerType: e.pointerType,
        pressure: e.pressure
      };
      if (!moveRafScheduled) {
        moveRafScheduled = true;
        requestAnimationFrame(flushMovePayload);
      }
    });

    window.addEventListener("pointerup", (e) => {
      if (!isDown) return;
      isDown = false;
      pendingMovePayload = null;
      const { nx, ny } = getNorm(e);
      if (conn && conn.open) {
        conn.send({
          type: "up",
          nx,
          ny,
          pointerType: e.pointerType,
          isTap: !moved
        });
      }
    });
  }

  function showToast(msg) {
    let toast = document.getElementById("iqraSyncToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "iqraSyncToast";
      toast.style.cssText = `
        position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
        background: #0f172a; color: #ffffff; padding: 8px 16px; border-radius: 30px;
        font-size: 13px; font-weight: 500; z-index: 999999; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.display = "block";
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.display = "none";
    }, 4500);
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyProportionalViewportFit();
    window.addEventListener("resize", applyProportionalViewportFit);

    const syncBtn = document.getElementById("dockBtnTabletSync");
    if (syncBtn) {
      syncBtn.addEventListener("click", startHostSession);
    }
    checkAndJoinClientSession();
  });
})();