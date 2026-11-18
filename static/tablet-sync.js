/* ==========================================================================
   IQRA SMARTCLASS SUITE - FULL SCREEN MIRROR & ACTIVE PEN / TOUCH SYNC
   ========================================================================== */
(function () {
  // Set to "" before pushing to GitHub / Render production
 const LOCAL_TEST_URL = "";

  let peer = null;
  let conn = null;
  let mediaCall = null;
  let pcScreenStream = null;
  let activePointerTarget = null;
  let activeIsUiControl = false;
  let activeIsDrawerHandle = false;

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

  // Clean English Confirmation Modal before Disconnecting (Host PC only)
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
          Do you want to stop screen sharing and disconnect the tablet?
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

  // Subtle Bottom-Left Disconnect Button (Host PC only)
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
        cleanupHostSession("🛑 Screen Sharing & Tablet Sync Disconnected");
      });
    };

    document.body.appendChild(btn);
  }

  // Cleanly terminate host session and notify tablet
  function cleanupHostSession(notifyMsg) {
    toggleHostDisconnectButton(false);

    if (pcScreenStream) {
      pcScreenStream.getTracks().forEach((track) => track.stop());
      pcScreenStream = null;
    }
    if (mediaCall) {
      try { mediaCall.close(); } catch (e) {}
      mediaCall = null;
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

  // QR Code Modal (Host PC)
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
      <div style="background: #ffffff; width: 350px; max-width: 92vw; border-radius: 18px; padding: 22px; box-shadow: 0 20px 40px rgba(0,0,0,0.25); text-align: center; position: relative;">
        <button id="closeTabletSyncModal" style="position: absolute; top: 12px; right: 12px; width: 30px; height: 30px; border-radius: 50%; border: none; background: #f1f5f9; cursor: pointer; font-size: 16px; color: #475569;">✕</button>
        
        <div style="width: 46px; height: 46px; border-radius: 12px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; font-size: 20px;">
          <i class="fa-solid fa-tablet-screen-button"></i>
        </div>
        <h3 style="margin: 0 0 6px; font-size: 18px; color: #0f172a;">Tablet Mirror & Control</h3>
        <p style="margin: 0 0 14px; font-size: 12.5px; color: #64748b; line-height: 1.4;">
          Scan this QR code with your tablet camera to mirror your PC screen and control it wirelessly with your stylus or touch.
        </p>

        <div id="syncQrContainer" style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 12px; padding: 14px; margin-bottom: 12px; min-height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <span style="font-size: 13px; color: #0284c7;">Generating Connection ID...</span>
        </div>

        <div id="syncStatusBadge" style="display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #fef3c7; color: #b45309;">
          ● Waiting for tablet to scan...
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById("closeTabletSyncModal").onclick = () => {
      modal.style.display = "none";
    };
  }

  // HOST MODE (PC)
  function startHostSession() {
    createSyncModal();
    const modal = document.getElementById("iqraTabletSyncModal");
    const qrBox = document.getElementById("syncQrContainer");
    const badge = document.getElementById("syncStatusBadge");
    modal.style.display = "flex";

    cleanupHostSession();
    badge.style.background = "#fef3c7";
    badge.style.color = "#b45309";
    badge.textContent = "● Waiting for tablet to scan...";

    const shortId = "iqra-" + Math.floor(100000 + Math.random() * 900000);
    peer = new Peer(shortId);

    peer.on("open", (id) => {
      let baseUrl = window.location.href.split("?")[0];
      if (baseUrl.includes("127.0.0.1") || baseUrl.includes("localhost")) {
        baseUrl = LOCAL_TEST_URL || "https://iqra-smartclass-suite.onrender.com/index.html";
      }
      const joinUrl = `${baseUrl}?syncRoom=${id}`;
      const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(joinUrl)}`;

      qrBox.innerHTML = `
        <img src="${qrImgUrl}" alt="Scan QR" style="width: 170px; height: 170px; border-radius: 8px; display: block; margin-bottom: 8px;" />
        <div style="font-size: 11px; color: #475569;">Room ID: <b>${id}</b></div>
      `;
    });

    peer.on("connection", (connection) => {
      conn = connection;
      badge.style.background = "#dcfce7";
      badge.style.color = "#15803d";
      badge.textContent = "● Tablet Connected! Please allow screen sharing...";

      conn.on("data", (data) => {
        if (data.type === "request-stream") {
          startPcScreenShareToTablet(connection.peer, modal);
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

  // Capture PC screen and stream to Tablet
  async function startPcScreenShareToTablet(tabletPeerId, modal) {
    try {
      if (!pcScreenStream) {
        pcScreenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "monitor",
            frameRate: 30,
            cursor: "never"
          },
          audio: false
        });

        const videoTrack = pcScreenStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            cleanupHostSession("🛑 Screen Sharing & Tablet Sync Stopped");
          };
        }
      }
      modal.style.display = "none";
      toggleHostDisconnectButton(true);
      setTimeout(applyProportionalViewportFit, 150);
      showToast("✅ Tablet Connected! Press F11 on PC for Fullscreen.");

      mediaCall = peer.call(tabletPeerId, pcScreenStream);
    } catch (err) {
      modal.style.display = "none";
      cleanupHostSession("⚠️ Screen Sharing Cancelled");
    }
  }

  // Check if coordinate hits #dockDrawerHandle (with generous touch/pen padding)
  function isNearDrawerHandle(x, y) {
    const handle = document.getElementById("dockDrawerHandle");
    if (!handle) return null;
    const r = handle.getBoundingClientRect();
    if (x >= r.left - 24 && x <= r.right + 16 && y >= r.top - 24 && y <= r.bottom + 24) {
      return handle;
    }
    return null;
  }

  // Simulate a clean pull + click on #dockDrawerHandle when tapped with Pen
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

  // Execute remote Pen ("pen") vs Finger ("touch") and UI clicks on PC
  function dispatchRemotePointerToPC(data) {
    if (!conn || !conn.open) return;

    const x = Math.max(0, Math.min(window.innerWidth - 1, data.nx * window.innerWidth));
    const y = Math.max(0, Math.min(window.innerHeight - 1, data.ny * window.innerHeight));

    const hitEl = document.elementFromPoint(x, y);
    if (!hitEl && !activePointerTarget) return;

    const pType = data.pointerType || "pen";
    const pId = pType === "pen" ? 2 : 1;

    const eventInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: x,
      clientY: y,
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
    const uiControl =
      drawerHandle ||
      (hitEl && hitEl.closest("button, a, input, select, label, [role='button'], .tool-btn, .pen-suite-trigger-btn, .pen-type-btn, .shape-option-btn, .math-tool-btn, .floating-dock, .pen-suite-flyout, .shapes-flyout-box, .math-flyout-box, #iqraCornerDisconnectBtn"));

    if (data.type === "down") {
      activeIsDrawerHandle = Boolean(drawerHandle);
      activeIsUiControl = Boolean(uiControl);
      activePointerTarget = drawerHandle || hitEl;

      if (activePointerTarget) {
        activePointerTarget.dispatchEvent(new PointerEvent("pointerdown", eventInit));
        activePointerTarget.dispatchEvent(new MouseEvent("mousedown", eventInit));
      }
    } else if (data.type === "move") {
      // Allow drag-pulling #dockDrawerHandle, but prevent canvas drawing when gesture started on dock buttons
      if (activeIsDrawerHandle && activePointerTarget) {
        activePointerTarget.dispatchEvent(new PointerEvent("pointermove", eventInit));
        activePointerTarget.dispatchEvent(new MouseEvent("mousemove", eventInit));
        window.dispatchEvent(new PointerEvent("pointermove", eventInit));
        window.dispatchEvent(new MouseEvent("mousemove", eventInit));
        return;
      }
      if (activeIsUiControl) return;

      const target = activePointerTarget || hitEl;
      if (target) {
        target.dispatchEvent(new PointerEvent("pointermove", eventInit));
        target.dispatchEvent(new MouseEvent("mousemove", eventInit));
      }
    } else if (data.type === "up") {
      const target = activePointerTarget || drawerHandle || hitEl;

      if (activeIsDrawerHandle || drawerHandle) {
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

        if (data.isTap || activeIsUiControl) {
          const clickTarget =
            hitEl && hitEl.closest("button, a, input, select, label, [role='button'], .tool-btn, .pen-suite-trigger-btn, .pen-type-btn, .shape-option-btn, .math-tool-btn");

          if (clickTarget && clickTarget.tagName !== "CANVAS") {
            clickTarget.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true, clientX: x, clientY: y }));
            clickTarget.click();
          }
        }
      }

      activePointerTarget = null;
      activeIsUiControl = false;
      activeIsDrawerHandle = false;
    }
  }

  // CLIENT MODE (Tablet)
  function checkAndJoinClientSession() {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("syncRoom");
    if (!roomId) return;

    peer = new Peer();

    peer.on("open", () => {
      conn = peer.connect(roomId, { reliable: true });

      conn.on("open", () => {
        buildTabletMirrorViewport();
        conn.send({ type: "request-stream" });
      });

      conn.on("data", (data) => {
        if (data && data.type === "host-stopped") {
          showTabletDisconnectedScreen();
        }
      });

      conn.on("close", () => {
        showTabletDisconnectedScreen();
      });
    });

    peer.on("call", (call) => {
      call.answer();
      call.on("stream", (remoteStream) => {
        const videoEl = document.getElementById("pcMirrorVideo");
        if (videoEl) {
          videoEl.srcObject = remoteStream;
          videoEl.play().catch(() => {});
        }
        remoteStream.getVideoTracks().forEach((track) => {
          track.onended = () => showTabletDisconnectedScreen();
        });
      });
    });
  }

  // Clean English Disconnected Screen on Tablet
  function showTabletDisconnectedScreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
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
          Screen sharing has ended. To reconnect, open <b>Tablet Sync</b> on the PC and scan the new QR code.
        </p>
        <button onclick="window.close()" style="background: #1e293b; color: #e2e8f0; border: 1px solid #334155; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer;">
          Close Window
        </button>
      </div>
    `;
  }

  // Tablet Mirror Viewport UI (No disconnect button on tablet)
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

    const touchLayer = document.createElement("div");
    touchLayer.style.cssText = `
      position: fixed; inset: 0; width: 100vw; height: 100vh;
      z-index: 5; cursor: crosshair; touch-action: none;
    `;
    document.body.appendChild(touchLayer);

    let isDown = false;
    let moved = false;
    let startX = 0, startY = 0;

    function getNorm(e) {
      return {
        nx: Math.max(0, Math.min(1, e.clientX / window.innerWidth)),
        ny: Math.max(0, Math.min(1, e.clientY / window.innerHeight))
      };
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
      if (Math.abs(e.clientX - startX) > 14 || Math.abs(e.clientY - startY) > 14) {
        moved = true;
      }
      const { nx, ny } = getNorm(e);
      if (conn && conn.open) {
        conn.send({
          type: "move",
          nx,
          ny,
          pointerType: e.pointerType,
          pressure: e.pressure
        });
      }
    });

    window.addEventListener("pointerup", (e) => {
      if (!isDown) return;
      isDown = false;
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