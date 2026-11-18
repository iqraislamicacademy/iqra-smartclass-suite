/* ==========================================================================
   IQRA SMARTCLASS SUITE - FREE LIVE ONLINE VIDEO CLASS & SCREEN SHARE
   (Powered by Jitsi Meet Open WebRTC Engine - Zero Server Cost)
   ========================================================================== */
(function () {
  let activeRoomName = null;
  let isMinimized = false;

  // Live Render URL nikalne ke liye (chahe local 127.0.0.1 se kholein ya Render se)
  function getBaseAppUrl() {
    let baseUrl = window.location.href.split("?")[0];
    if (baseUrl.includes("127.0.0.1") || baseUrl.includes("localhost")) {
      baseUrl = "https://iqra-smartclass-suite.onrender.com/index.html";
    }
    return baseUrl;
  }

  // Floating Video Call Window Banana
  function openLiveClassWindow(roomName, isStudent) {
    activeRoomName = roomName;

    let container = document.getElementById("iqraLiveClassPanel");
    if (container) {
      container.style.display = "flex";
      return;
    }

    const inviteLink = `${getBaseAppUrl()}?liveClass=${encodeURIComponent(roomName)}`;

    container = document.createElement("div");
    container.id = "iqraLiveClassPanel";
    container.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 16px;
      width: ${isStudent ? "420px" : "340px"};
      height: ${isStudent ? "320px" : "270px"};
      max-width: 92vw;
      max-height: 75vh;
      background: #0f172a;
      border: 2px solid #16a34a;
      border-radius: 14px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
      z-index: 999990;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: system-ui, -apple-system, sans-serif;
      resize: both;
    `;

    // Jitsi Free Room URL (Screen Share, Mic, Cam, Chat enabled)
   const jitsiUrl = `https://meet.ffmuc.net/${encodeURIComponent(roomName)}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&interfaceConfig.SHOW_JITSI_WATERMARK=false`;

    container.innerHTML = `
      <!-- Top Drag Header -->
      <div id="iqraLiveClassHeader" style="
        background: #1e293b; color: #ffffff; padding: 7px 10px;
        display: flex; align-items: center; justify-content: space-between;
        cursor: move; user-select: none; border-bottom: 1px solid #334155;
      ">
        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e; display: inline-block;"></span>
          <span>${isStudent ? "Live Class (Student)" : "Iqra Live Class"}</span>
        </div>

        <div style="display: flex; align-items: center; gap: 5px;">
          <button id="btnCopyClassLink" title="Copy Student Invite Link" style="
            background: #16a34a; color: #fff; border: none; border-radius: 6px;
            padding: 3px 8px; font-size: 11px; font-weight: 600; cursor: pointer;
          ">📋 Copy Link</button>

          <button id="btnMinLiveClass" title="Minimize / Expand" style="
            background: #334155; color: #fff; border: none; border-radius: 6px;
            width: 22px; height: 22px; font-size: 12px; cursor: pointer;
          ">—</button>

          <button id="btnCloseLiveClass" title="End / Close Class" style="
            background: #dc2626; color: #fff; border: none; border-radius: 6px;
            width: 22px; height: 22px; font-size: 12px; cursor: pointer;
          ">✕</button>
        </div>
      </div>

      <!-- Helper Strip for Teacher -->
      ${
        !isStudent
          ? `<div id="iqraLiveHelperBar" style="background: #0f172a; color: #94a3b8; font-size: 10.5px; padding: 4px 10px; border-bottom: 1px solid #1e293b; text-align: center;">
               💡 Padhane ke liye neeche <b>Share Screen</b> icon dabayein aur apna Board select karein
             </div>`
          : ""
      }

      <!-- Video & Screen Share Frame -->
      <div id="iqraLiveFrameWrap" style="flex: 1; width: 100%; height: 100%; background: #000;">
        <iframe
          src="${jitsiUrl}"
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          style="width: 100%; height: 100%; border: none;"
        ></iframe>
      </div>
    `;

    document.body.appendChild(container);

    // 1. Copy Student Link Button
    document.getElementById("btnCopyClassLink").addEventListener("click", () => {
      navigator.clipboard.writeText(inviteLink).then(() => {
        showLiveToast("✅ Student Link Copied! WhatsApp par bhej dein");
      });
    });

    // 2. Minimize / Maximize Toggle (Taaki board par likhte waqt jagah bache)
    const minBtn = document.getElementById("btnMinLiveClass");
    const frameWrap = document.getElementById("iqraLiveFrameWrap");
    const helperBar = document.getElementById("iqraLiveHelperBar");

    minBtn.addEventListener("click", () => {
      isMinimized = !isMinimized;
      if (isMinimized) {
        container.dataset.prevHeight = container.style.height;
        frameWrap.style.display = "none";
        if (helperBar) helperBar.style.display = "none";
        container.style.height = "38px";
        container.style.resize = "none";
        minBtn.textContent = "▢";
      } else {
        frameWrap.style.display = "block";
        if (helperBar) helperBar.style.display = "block";
        container.style.height = container.dataset.prevHeight || "270px";
        container.style.resize = "both";
        minBtn.textContent = "—";
      }
    });

    // 3. Close / End Class
    document.getElementById("btnCloseLiveClass").addEventListener("click", () => {
      if (confirm("Kya aap Live Class band karna chahte hain?")) {
        container.remove();
        activeRoomName = null;
      }
    });

    // 4. Draggable Window Logic (Screen par kahin bhi move karne ke liye)
    makeElementDraggable(container, document.getElementById("iqraLiveClassHeader"));
  }

  // Draggable Helper
  function makeElementDraggable(el, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      if (e.target.tagName === "BUTTON") return;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      el.style.top = el.offsetTop - pos2 + "px";
      el.style.left = el.offsetLeft - pos1 + "px";
      el.style.bottom = "auto";
      el.style.right = "auto";
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  // Notification Toast
  function showLiveToast(msg) {
    let toast = document.getElementById("iqraLiveClassToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "iqraLiveClassToast";
      toast.style.cssText = `
        position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
        background: #15803d; color: #ffffff; padding: 8px 16px; border-radius: 30px;
        font-size: 13px; font-weight: 600; z-index: 999999; box-shadow: 0 4px 12px rgba(0,0,0,0.25);
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

  // Button Click & Student URL Auto-Join
  document.addEventListener("DOMContentLoaded", () => {
    const liveBtn = document.getElementById("dockBtnLiveClass");
    if (liveBtn) {
      liveBtn.addEventListener("click", () => {
        const room = activeRoomName || "IqraSmartClass-" + Math.floor(1000 + Math.random() * 9000);
        openLiveClassWindow(room, false);
      });
    }

    // Agar Student link se aaya hai (?liveClass=...) to sidha class join karayein
    const params = new URLSearchParams(window.location.search);
    const joinRoom = params.get("liveClass");
    if (joinRoom) {
      openLiveClassWindow(joinRoom, true);
    }
  });
})();