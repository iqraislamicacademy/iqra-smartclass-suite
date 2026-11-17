/* ==========================================================================
   IQRA SMARTCLASS SUITE - FREE WIRELESS TABLET / MOBILE SYNC (WebRTC PeerJS)
   ========================================================================== */
(function () {
  let peer = null;
  let conn = null;
  let isHost = false;
  let isRemoteDrawing = false;
  let lastX = 0;
  let lastY = 0;

  // Main whiteboard canvas dhundhne ke liye
  function getMainCanvas() {
    return (
      document.getElementById("whiteboard") ||
      document.getElementById("drawingCanvas") ||
      document.getElementById("boardCanvas") ||
      document.querySelector("canvas")
    );
  }

  // Current active color & size nikalne ke liye
  function getActivePenStyle() {
    const colorTrigger = document.getElementById("colorTriggerBtn");
    const sizeSlider = document.getElementById("penSuiteSizeSlider");
    const isEraser = document.querySelector('[data-tool="eraser"].active');

    let color = "#1e293b";
    if (colorTrigger && colorTrigger.style.backgroundColor) {
      color = colorTrigger.style.backgroundColor;
    }
    const size = sizeSlider ? parseInt(sizeSlider.value, 10) || 4 : 4;

    return {
      color: isEraser ? "#ffffff" : color,
      size: isEraser ? Math.max(size * 4, 20) : size,
      isEraser: !!isEraser
    };
  }

  // QR Code Modal UI create karna (Host PC ke liye)
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
        <h3 style="margin: 0 0 6px; font-size: 18px; color: #0f172a;">Wireless Tablet / Mobile Sync</h3>
        <p style="margin: 0 0 14px; font-size: 13px; color: #64748b; line-height: 1.4;">
          Apne Tablet ya Mobile ke camera se QR scan karein—jo wahan likhenge wo seedha is screen par live dikhega.
        </p>

        <div id="syncQrContainer" style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 12px; padding: 14px; margin-bottom: 12px; min-height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <span style="font-size: 13px; color: #0284c7;">Connection ID ban rahi hai...</span>
        </div>

        <div id="syncStatusBadge" style="display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #fef3c7; color: #b45309;">
          ● Tablet ka intezar hai...
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("closeTabletSyncModal").onclick = () => {
      modal.style.display = "none";
    };
  }

  // Host Mode Shuru Karna (PC par)
  function startHostSession() {
    createSyncModal();
    const modal = document.getElementById("iqraTabletSyncModal");
    const qrBox = document.getElementById("syncQrContainer");
    const badge = document.getElementById("syncStatusBadge");
    modal.style.display = "flex";

    if (peer) return; // Pehle se active hai to dobara na banayein

    isHost = true;
    const shortId = "iqra-" + Math.floor(100000 + Math.random() * 900000);
    peer = new Peer(shortId);

peer.on("open", (id) => {
      let baseUrl = window.location.href.split("?")[0];
      if (baseUrl.includes("127.0.0.1") || baseUrl.includes("localhost")) {
        baseUrl = "https://iqra-smartclass-suite.onrender.com/index.html";
      }
      const joinUrl = `${baseUrl}?syncRoom=${id}`;
      const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(joinUrl)}`;

      qrBox.innerHTML = `
        <img src="${qrImgUrl}" alt="Scan QR" style="width: 170px; height: 170px; border-radius: 8px; display: block; margin-bottom: 8px;" />
        <div style="font-size: 11px; color: #475569; word-break: break-all;">Room ID: <b>${id}</b></div>
      `;
    });

    peer.on("connection", (connection) => {
      conn = connection;
      badge.style.background = "#dcfce7";
      badge.style.color = "#15803d";
      badge.textContent = "● Tablet Connected! Ab likhna shuru karein";

      // 1.5 second baad modal khud band ho jayega taaki board saaf dikhe
      setTimeout(() => {
        modal.style.display = "none";
        showToast("✅ Tablet Connect Ho Gaya! Live Drawing Active");
      }, 1500);

      conn.on("data", (data) => {
        handleIncomingStroke(data);
      });

      conn.on("close", () => {
        showToast("⚠️ Tablet Disconnect Ho Gaya");
      });
    });

    peer.on("error", (err) => {
      qrBox.innerHTML = `<span style="color:#dc2626; font-size:13px;">Internet / PeerJS error: ${err.type}</span>`;
    });
  }

// Client Mode (Jab Tablet/Mobile se QR scan karke khola jaye)
  function checkAndJoinClientSession() {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("syncRoom");
    if (!roomId) return;

    isHost = false;
    peer = new Peer();

    peer.on("open", () => {
      conn = peer.connect(roomId, { reliable: true });

      conn.on("open", () => {
        const badge = document.createElement("div");
        badge.style.cssText = `
          position: fixed; top: 8px; left: 50%; transform: translateX(-50%);
          background: rgba(21, 128, 61, 0.75); color: #ffffff;
          padding: 3px 10px; border-radius: 12px; font-size: 11px;
          font-weight: 600; opacity: 0.45; z-index: 999999;
          pointer-events: none; letter-spacing: 0.5px;
        `;
        badge.textContent = "🟢 PC";
        document.body.appendChild(badge);

        attachTabletSenderEvents();
      });

      conn.on("close", () => {
        showToast("⚠️ PC se connection toot gaya");
      });
    });

    peer.on("error", (err) => {
      showToast("❌ Connection Error: " + err.type);
    });
  }

  // Tablet ke touch/pen strokes ko percentage mein PC par bhejna
  function attachTabletSenderEvents() {
    const canvas = getMainCanvas();
    if (!canvas) return;

    let drawing = false;

    function getNormCoords(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        nx: (clientX - rect.left) / rect.width,
        ny: (clientY - rect.top) / rect.height
      };
    }

    canvas.addEventListener("pointerdown", (e) => {
      if (!conn || !conn.open) return;
      drawing = true;
      const { nx, ny } = getNormCoords(e);
      const style = getActivePenStyle();
      conn.send({ type: "start", nx, ny, ...style });
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!drawing || !conn || !conn.open) return;
      const { nx, ny } = getNormCoords(e);
      const style = getActivePenStyle();
      conn.send({ type: "move", nx, ny, ...style });
    });

    window.addEventListener("pointerup", () => {
      if (!drawing) return;
      drawing = false;
      if (conn && conn.open) conn.send({ type: "end" });
    });
  }

  // PC ke canvas par Tablet se aaye hue strokes draw karna
  function handleIncomingStroke(data) {
    const canvas = getMainCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const x = data.nx * canvas.width;
    const y = data.ny * canvas.height;

    if (data.type === "start") {
      isRemoteDrawing = true;
      lastX = x;
      lastY = y;
    } else if (data.type === "move" && isRemoteDrawing) {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = data.size || 4;

      if (data.isEraser) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = data.color || "#1e293b";
      }

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();

      lastX = x;
      lastY = y;
    } else if (data.type === "end") {
      isRemoteDrawing = false;
    }
  }

  // Chhota sa notification banner
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
    }, 3500);
  }

  // Button listener & Auto-join check
  document.addEventListener("DOMContentLoaded", () => {
    const syncBtn = document.getElementById("dockBtnTabletSync");
    if (syncBtn) {
      syncBtn.addEventListener("click", startHostSession);
    }
    checkAndJoinClientSession();
  });
})();