/* ==========================================================================
   IQRA SMARTCLASS SUITE - PROFESSIONAL LIVE CLASSROOM & BROADCAST ENGINE
   (Custom Room Links, Host Lobby, Screen/Camera Broadcast & Live Two-Way Chat)
   ========================================================================== */
(function () {
  let classPeer = null;
  let activeRoomSlug = "iqra-live";
  let teacherDisplayName = "Teacher";
  let isHostingActive = false;

  let localCameraStream = null;
  let localScreenStream = null;
  let isMicMuted = false;
  let isCamOff = false;
  let isMinimized = false;
  let isChatOpen = false;
  let unreadMessages = 0;

  const connectedStudents = new Map(); // peerId -> { conn, mediaCall, name }
  const chatHistory = [];

  function getBaseAppUrl() {
    let baseUrl = window.location.href.split("?")[0];
    if (baseUrl.includes("127.0.0.1") || baseUrl.includes("localhost")) {
      baseUrl = "https://iqra-smartclass-suite.onrender.com/index.html";
    }
    return baseUrl;
  }

  function sanitizeRoomSlug(raw) {
    const cleaned = (raw || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!cleaned) return "iqra-live";
    return cleaned.startsWith("iqra") ? cleaned : `iqra-${cleaned}`;
  }

  function getActiveBroadcastStream() {
    if (localScreenStream && localScreenStream.active) {
      const combined = new MediaStream();
      localScreenStream.getVideoTracks().forEach((t) => combined.addTrack(t));
      if (localCameraStream) {
        localCameraStream.getAudioTracks().forEach((t) => combined.addTrack(t));
      }
      return combined;
    }
    return localCameraStream;
  }

  function updateStudentCountBadge() {
    const badge = document.getElementById("iqraStudentCountBadge");
    if (badge) {
      const count = connectedStudents.size;
      badge.textContent = `${count} ${count === 1 ? "Student" : "Students"}`;
    }
  }

  function updateUnreadBadge() {
    const badge = document.getElementById("iqraChatUnreadBadge");
    if (!badge) return;
    if (unreadMessages > 0 && !isChatOpen) {
      badge.style.display = "inline-flex";
      badge.textContent = unreadMessages > 9 ? "9+" : String(unreadMessages);
    } else {
      badge.style.display = "none";
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function appendChatMessage(sender, text, isSelf, isSystem) {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    chatHistory.push({ sender, text, isSelf, isSystem, time });

    const list = document.getElementById("iqraLiveChatMessages");
    if (list) {
      const item = document.createElement("div");
      if (isSystem) {
        item.style.cssText = `
          text-align: center; font-size: 11px; color: #94a3b8;
          margin: 6px 0; padding: 3px 8px;
        `;
        item.textContent = text;
      } else {
        item.style.cssText = `
          display: flex; flex-direction: column;
          align-items: ${isSelf ? "flex-end" : "flex-start"};
          margin-bottom: 8px;
        `;
        item.innerHTML = `
          <div style="font-size: 10px; color: #94a3b8; margin-bottom: 2px; padding: 0 4px;">
            ${escapeHtml(sender)} • ${time}
          </div>
          <div style="
            max-width: 84%; padding: 7px 10px; border-radius: 11px; font-size: 12px; line-height: 1.4;
            word-break: break-word;
            background: ${isSelf ? "#0284c7" : "#1e293b"};
            color: #f8fafc;
            border: 1px solid ${isSelf ? "#0369a1" : "#334155"};
          ">${escapeHtml(text)}</div>
        `;
      }
      list.appendChild(item);
      list.scrollTop = list.scrollHeight;
    }

    if (!isSelf && !isChatOpen) {
      unreadMessages += 1;
      updateUnreadBadge();
    }
  }

  function broadcastToAllStudents(payload) {
    connectedStudents.forEach((student) => {
      try {
        if (student.conn && student.conn.open) {
          student.conn.send(payload);
        }
      } catch (e) {}
    });
  }

  function broadcastStreamToAllStudents() {
    const stream = getActiveBroadcastStream();
    if (!stream || !classPeer) return;

    connectedStudents.forEach((student, studentPeerId) => {
      try {
        if (student.mediaCall) student.mediaCall.close();
        student.mediaCall = classPeer.call(studentPeerId, stream);
      } catch (e) {}
    });
  }

  function askEndClassConfirmation(onConfirm) {
    const existing = document.getElementById("iqraEndClassConfirmModal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "iqraEndClassConfirmModal";
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(3px); z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="background: #ffffff; width: 320px; max-width: 90vw; border-radius: 16px; padding: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.25); text-align: center;">
        <div style="width: 44px; height: 44px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 18px;">
          <i class="fa-solid fa-video-slash"></i>
        </div>
        <h4 style="margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #0f172a;">End Live Class?</h4>
        <p style="margin: 0 0 18px; font-size: 13px; color: #64748b; line-height: 1.45;">
          This will close the classroom and disconnect all connected students.
        </p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button id="iqraCancelEndClassBtn" type="button" style="flex: 1; padding: 9px 12px; border-radius: 10px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; font-size: 13px; font-weight: 600; cursor: pointer;">
            Cancel
          </button>
          <button id="iqraConfirmEndClassBtn" type="button" style="flex: 1; padding: 9px 12px; border-radius: 10px; border: none; background: #dc2626; color: #ffffff; font-size: 13px; font-weight: 600; cursor: pointer;">
            End Class
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById("iqraCancelEndClassBtn").onclick = () => overlay.remove();
    document.getElementById("iqraConfirmEndClassBtn").onclick = () => {
      overlay.remove();
      onConfirm();
    };
  }

  function cleanupTeacherSession() {
    if (localScreenStream) {
      localScreenStream.getTracks().forEach((t) => t.stop());
      localScreenStream = null;
    }
    if (localCameraStream) {
      localCameraStream.getTracks().forEach((t) => t.stop());
      localCameraStream = null;
    }
    connectedStudents.forEach((student) => {
      try {
        if (student.conn && student.conn.open) {
          student.conn.send({ type: "class-ended" });
          student.conn.close();
        }
        if (student.mediaCall) student.mediaCall.close();
      } catch (e) {}
    });
    connectedStudents.clear();
    chatHistory.length = 0;

    if (classPeer) {
      try { classPeer.destroy(); } catch (e) {}
      classPeer = null;
    }
    isHostingActive = false;
    isMicMuted = false;
    isCamOff = false;
    isMinimized = false;
    isChatOpen = false;
    unreadMessages = 0;

    const panel = document.getElementById("iqraLiveClassPanel");
    if (panel) panel.remove();
  }

  // Step 1: Host Setup Lobby Modal (Custom Iqra Link + Start Hosting Button)
  function openHostLobbyModal() {
    if (isHostingActive) {
      const panel = document.getElementById("iqraLiveClassPanel");
      if (panel) panel.style.display = "flex";
      return;
    }

    const existing = document.getElementById("iqraLiveLobbyModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "iqraLiveLobbyModal";
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px); z-index: 999995;
      display: flex; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    const buildPreviewUrl = (slug) => `${getBaseAppUrl()}?liveClass=${encodeURIComponent(slug)}`;

    modal.innerHTML = `
      <div style="background: #ffffff; width: 390px; max-width: 94vw; border-radius: 18px; padding: 22px; box-shadow: 0 24px 48px rgba(0,0,0,0.28); position: relative;">
        <button id="closeLiveLobbyModal" type="button" style="position: absolute; top: 14px; right: 14px; width: 30px; height: 30px; border-radius: 50%; border: none; background: #f1f5f9; color: #475569; font-size: 15px; cursor: pointer;">✕</button>

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
          <div style="width: 42px; height: 42px; border-radius: 12px; background: #dcfce7; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 18px;">
            <i class="fa-solid fa-tower-broadcast"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 17px; font-weight: 700; color: #0f172a;">Iqra Live Classroom</h3>
            <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">Set your custom class link and start hosting</p>
          </div>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 11.5px; font-weight: 700; color: #334155; margin-bottom: 4px;">Teacher Name</label>
          <input id="iqraHostNameInput" type="text" value="${escapeHtml(teacherDisplayName)}" placeholder="e.g. Ustad Imran"
            style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13px; color: #0f172a; outline: none;" />
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 11.5px; font-weight: 700; color: #334155; margin-bottom: 4px;">Custom Class ID (Iqra Link)</label>
          <input id="iqraCustomRoomInput" type="text" value="${escapeHtml(activeRoomSlug)}" placeholder="e.g. iqra-arabic-class"
            style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 600; color: #0284c7; outline: none;" />
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; margin-bottom: 16px;">
          <div style="font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px;">Student Invite Link Preview</div>
          <div id="iqraInvitePreviewText" style="font-size: 11.5px; color: #0f172a; word-break: break-all; font-family: monospace;">
            ${escapeHtml(buildPreviewUrl(activeRoomSlug))}
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <button id="btnCopyLobbyLink" type="button" style="flex: 1; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1; background: #ffffff; color: #1e293b; font-size: 13px; font-weight: 600; cursor: pointer;">
            Copy Link
          </button>
          <button id="btnStartHostingNow" type="button" style="flex: 1.4; padding: 10px 14px; border-radius: 10px; border: none; background: #16a34a; color: #ffffff; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <i class="fa-solid fa-play"></i> Start Hosting
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const roomInput = document.getElementById("iqraCustomRoomInput");
    const nameInput = document.getElementById("iqraHostNameInput");
    const previewEl = document.getElementById("iqraInvitePreviewText");

    roomInput.addEventListener("input", () => {
      const slug = sanitizeRoomSlug(roomInput.value);
      previewEl.textContent = buildPreviewUrl(slug);
    });

    document.getElementById("closeLiveLobbyModal").onclick = () => modal.remove();

    document.getElementById("btnCopyLobbyLink").onclick = () => {
      const slug = sanitizeRoomSlug(roomInput.value);
      navigator.clipboard.writeText(buildPreviewUrl(slug)).then(() => {
        showLiveToast("Class invite link copied.");
      });
    };

    document.getElementById("btnStartHostingNow").onclick = () => {
      activeRoomSlug = sanitizeRoomSlug(roomInput.value);
      teacherDisplayName = (nameInput.value || "").trim() || "Teacher";
      modal.remove();
      launchTeacherBroadcastPanel();
    };
  }

  // Step 2: Active Teacher Classroom Floating Panel (Broadcast + Two-Way Chat)
  async function launchTeacherBroadcastPanel() {
    isHostingActive = true;
    const inviteLink = `${getBaseAppUrl()}?liveClass=${encodeURIComponent(activeRoomSlug)}`;

    const container = document.createElement("div");
    container.id = "iqraLiveClassPanel";
    container.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 16px;
      width: 370px;
      height: 310px;
      max-width: 94vw;
      max-height: 80vh;
      background: #0f172a;
      border: 1.5px solid #1e293b;
      border-radius: 16px;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.42);
      z-index: 999990;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: system-ui, -apple-system, sans-serif;
      resize: both;
    `;

    container.innerHTML = `
      <!-- Header -->
      <div id="iqraLiveClassHeader" style="
        background: #1e293b; color: #f8fafc; padding: 8px 10px;
        display: flex; align-items: center; justify-content: space-between;
        cursor: move; user-select: none; border-bottom: 1px solid #334155;
      ">
        <div style="display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e;"></span>
          <span>${escapeHtml(activeRoomSlug)}</span>
          <span id="iqraStudentCountBadge" style="background: #0f172a; color: #38bdf8; border: 1px solid #334155; padding: 1px 7px; border-radius: 999px; font-size: 10.5px; font-weight: 600;">
            0 Students
          </span>
        </div>

        <div style="display: flex; align-items: center; gap: 5px;">
          <button id="btnCopyClassLink" type="button" title="Copy Student Invite Link" style="
            background: #0284c7; color: #fff; border: none; border-radius: 6px;
            padding: 3px 8px; font-size: 11px; font-weight: 600; cursor: pointer;
          ">Copy Link</button>

          <button id="btnMinLiveClass" type="button" title="Minimize / Expand" style="
            background: #334155; color: #fff; border: none; border-radius: 6px;
            width: 22px; height: 22px; font-size: 12px; cursor: pointer;
          ">—</button>

          <button id="btnCloseLiveClass" type="button" title="End Live Class" style="
            background: #dc2626; color: #fff; border: none; border-radius: 6px;
            width: 22px; height: 22px; font-size: 12px; cursor: pointer;
          ">✕</button>
        </div>
      </div>

      <!-- Main Body (Video Stage + Slide-over Chat) -->
      <div id="iqraLiveMainBody" style="position: relative; flex: 1; display: flex; overflow: hidden; background: #020617;">
        <!-- Stage -->
        <div id="iqraLiveFrameWrap" style="position: relative; flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden;">
          <video id="iqraTeacherPreviewVideo" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; display: none;"></video>
          <div id="iqraTeacherPlaceholder" style="text-align: center; color: #64748b; padding: 16px;">
            <i class="fa-solid fa-chalkboard-user" style="font-size: 28px; color: #38bdf8; margin-bottom: 8px; display: block;"></i>
            <div style="font-size: 12.5px; font-weight: 700; color: #e2e8f0;">Hosting Live</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 3px;">Click <b>Share Board</b> below to stream your screen</div>
          </div>
        </div>

        <!-- Two-Way Chat Drawer -->
        <div id="iqraLiveChatDrawer" style="
          display: none; width: 215px; max-width: 65%; background: #0f172a;
          border-left: 1px solid #334155; flex-direction: column;
        ">
          <div style="padding: 6px 10px; font-size: 11px; font-weight: 700; color: #cbd5e1; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center;">
            <span>Class Chat</span>
            <button id="btnCloseChatDrawer" type="button" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 12px;">✕</button>
          </div>
          <div id="iqraLiveChatMessages" style="flex: 1; overflow-y: auto; padding: 8px;"></div>
          <div style="padding: 6px; border-top: 1px solid #1e293b; display: flex; gap: 4px;">
            <input id="iqraTeacherChatInput" type="text" placeholder="Message class..." style="
              flex: 1; min-width: 0; background: #1e293b; border: 1px solid #334155;
              border-radius: 7px; padding: 5px 8px; font-size: 11.5px; color: #f8fafc; outline: none;
            " />
            <button id="btnSendTeacherChat" type="button" style="
              background: #0284c7; color: #fff; border: none; border-radius: 7px;
              padding: 0 9px; font-size: 11.5px; font-weight: 600; cursor: pointer;
            ">Send</button>
          </div>
        </div>
      </div>

      <!-- Controls Bar -->
      <div id="iqraLiveControlsBar" style="background: #1e293b; padding: 7px 8px; display: flex; align-items: center; justify-content: center; gap: 6px; border-top: 1px solid #334155;">
        <button id="btnToggleMic" type="button" style="background: #334155; color: #f8fafc; border: none; border-radius: 8px; padding: 5px 9px; font-size: 11px; font-weight: 600; cursor: pointer;">
          <i class="fa-solid fa-microphone"></i> Mic
        </button>
        <button id="btnToggleCam" type="button" style="background: #334155; color: #f8fafc; border: none; border-radius: 8px; padding: 5px 9px; font-size: 11px; font-weight: 600; cursor: pointer;">
          <i class="fa-solid fa-video"></i> Cam
        </button>
        <button id="btnShareBoardScreen" type="button" style="background: #16a34a; color: #ffffff; border: none; border-radius: 8px; padding: 5px 10px; font-size: 11px; font-weight: 600; cursor: pointer;">
          <i class="fa-solid fa-display"></i> Share Board
        </button>
        <button id="btnToggleLiveChat" type="button" style="position: relative; background: #334155; color: #f8fafc; border: none; border-radius: 8px; padding: 5px 9px; font-size: 11px; font-weight: 600; cursor: pointer;">
          <i class="fa-solid fa-comment-dots"></i> Chat
          <span id="iqraChatUnreadBadge" style="display: none; position: absolute; top: -5px; right: -5px; background: #ef4444; color: #fff; font-size: 9px; font-weight: 700; min-width: 15px; height: 15px; border-radius: 999px; align-items: center; justify-content: center; padding: 0 3px;">0</span>
        </button>
      </div>
    `;

    document.body.appendChild(container);
    makeElementDraggable(container, document.getElementById("iqraLiveClassHeader"));

    // Initialize PeerJS Room with Custom Slug
    classPeer = new Peer(activeRoomSlug);

    classPeer.on("open", () => {
      appendChatMessage("System", `Classroom "${activeRoomSlug}" is live.`, false, true);
      showLiveToast(`Hosting started: ${activeRoomSlug}`);
    });

    classPeer.on("error", (err) => {
      if (err && err.type === "unavailable-id") {
        showLiveToast("This Class ID is already active. Please choose another name.");
        cleanupTeacherSession();
        openHostLobbyModal();
      }
    });

    classPeer.on("connection", (conn) => {
      conn.on("open", () => {
        connectedStudents.set(conn.peer, { conn, mediaCall: null, name: "Student" });
        updateStudentCountBadge();

        // Send recent chat history to newly joined student
        conn.send({ type: "chat-history", history: chatHistory.slice(-25) });

        const stream = getActiveBroadcastStream();
        if (stream) {
          const call = classPeer.call(conn.peer, stream);
          const entry = connectedStudents.get(conn.peer);
          if (entry) entry.mediaCall = call;
        }
      });

      conn.on("data", (data) => {
        if (!data) return;
        const entry = connectedStudents.get(conn.peer);

        if (data.type === "student-hello") {
          const sName = (data.name || "Student").trim();
          if (entry) entry.name = sName;
          appendChatMessage("System", `${sName} joined the class.`, false, true);
          broadcastToAllStudents({ type: "system-msg", text: `${sName} joined the class.` });
          showLiveToast(`${sName} joined the live class.`);
        } else if (data.type === "chat-message") {
          const sender = (entry && entry.name) || data.sender || "Student";
          appendChatMessage(sender, data.text, false, false);
          broadcastToAllStudents({ type: "chat-message", sender, text: data.text });
        } else if (data.type === "raise-hand") {
          const sender = (entry && entry.name) || data.studentName || "Student";
          appendChatMessage("System", `✋ ${sender} raised their hand.`, false, true);
          showLiveToast(`✋ ${sender} raised their hand!`);
        } else if (data.type === "request-stream") {
          const stream = getActiveBroadcastStream();
          if (stream && entry) {
            entry.mediaCall = classPeer.call(conn.peer, stream);
          }
        }
      });

      conn.on("close", () => {
        const entry = connectedStudents.get(conn.peer);
        const leftName = (entry && entry.name) || "Student";
        connectedStudents.delete(conn.peer);
        updateStudentCountBadge();
        appendChatMessage("System", `${leftName} left the class.`, false, true);
      });
    });

    // Acquire Mic + Camera gracefully
    try {
      localCameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const preview = document.getElementById("iqraTeacherPreviewVideo");
      const placeholder = document.getElementById("iqraTeacherPlaceholder");
      if (preview) {
        preview.srcObject = localCameraStream;
        preview.style.display = "block";
      }
      if (placeholder) placeholder.style.display = "none";
    } catch (e) {
      try {
        localCameraStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (err) {}
    }

    // Copy Link
    document.getElementById("btnCopyClassLink").onclick = () => {
      navigator.clipboard.writeText(inviteLink).then(() => {
        showLiveToast("Student invite link copied.");
      });
    };

    // Mic Toggle
    const micBtn = document.getElementById("btnToggleMic");
    micBtn.onclick = () => {
      if (!localCameraStream || !localCameraStream.getAudioTracks().length) {
        showLiveToast("No microphone detected.");
        return;
      }
      isMicMuted = !isMicMuted;
      localCameraStream.getAudioTracks().forEach((t) => { t.enabled = !isMicMuted; });
      micBtn.innerHTML = isMicMuted
        ? `<i class="fa-solid fa-microphone-slash"></i> Muted`
        : `<i class="fa-solid fa-microphone"></i> Mic`;
      micBtn.style.background = isMicMuted ? "#dc2626" : "#334155";
    };

    // Camera Toggle
    const camBtn = document.getElementById("btnToggleCam");
    camBtn.onclick = () => {
      if (!localCameraStream || !localCameraStream.getVideoTracks().length) {
        showLiveToast("No camera detected.");
        return;
      }
      isCamOff = !isCamOff;
      localCameraStream.getVideoTracks().forEach((t) => { t.enabled = !isCamOff; });
      camBtn.innerHTML = isCamOff
        ? `<i class="fa-solid fa-video-slash"></i> Off`
        : `<i class="fa-solid fa-video"></i> Cam`;
      camBtn.style.background = isCamOff ? "#dc2626" : "#334155";
    };

    // Share Board Screen
    const shareBtn = document.getElementById("btnShareBoardScreen");
    shareBtn.onclick = async () => {
      if (localScreenStream) {
        localScreenStream.getTracks().forEach((t) => t.stop());
        localScreenStream = null;
        shareBtn.innerHTML = `<i class="fa-solid fa-display"></i> Share Board`;
        shareBtn.style.background = "#16a34a";

        const preview = document.getElementById("iqraTeacherPreviewVideo");
        if (preview && localCameraStream && localCameraStream.getVideoTracks().length) {
          preview.srcObject = localCameraStream;
        }
        broadcastStreamToAllStudents();
        showLiveToast("Board sharing stopped.");
        return;
      }

      try {
        localScreenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30, max: 30 } },
          audio: false
        });

        const screenTrack = localScreenStream.getVideoTracks()[0];
        if (screenTrack) {
          screenTrack.onended = () => {
            localScreenStream = null;
            shareBtn.innerHTML = `<i class="fa-solid fa-display"></i> Share Board`;
            shareBtn.style.background = "#16a34a";
            broadcastStreamToAllStudents();
          };
        }

        const preview = document.getElementById("iqraTeacherPreviewVideo");
        const placeholder = document.getElementById("iqraTeacherPlaceholder");
        if (preview) {
          preview.srcObject = localScreenStream;
          preview.style.display = "block";
        }
        if (placeholder) placeholder.style.display = "none";

        shareBtn.innerHTML = `<i class="fa-solid fa-stop"></i> Stop Share`;
        shareBtn.style.background = "#d97706";
        broadcastStreamToAllStudents();
        showLiveToast("Broadcasting board to students.");
      } catch (err) {
        if (err && err.name !== "NotAllowedError") {
          showLiveToast("Screen sharing is unavailable on this browser.");
        }
      }
    };

    // Chat Drawer Toggle & Send
    const chatDrawer = document.getElementById("iqraLiveChatDrawer");
    const toggleChatBtn = document.getElementById("btnToggleLiveChat");
    const chatInput = document.getElementById("iqraTeacherChatInput");

    const setChatDrawerState = (open) => {
      isChatOpen = open;
      chatDrawer.style.display = open ? "flex" : "none";
      toggleChatBtn.style.background = open ? "#0284c7" : "#334155";
      if (open) {
        unreadMessages = 0;
        updateUnreadBadge();
        if (parseInt(container.style.width, 10) < 460) {
          container.style.width = "480px";
        }
        chatInput.focus();
      }
    };

    toggleChatBtn.onclick = () => setChatDrawerState(!isChatOpen);
    document.getElementById("btnCloseChatDrawer").onclick = () => setChatDrawerState(false);

    const sendTeacherChat = () => {
      const txt = (chatInput.value || "").trim();
      if (!txt) return;
      chatInput.value = "";
      appendChatMessage(teacherDisplayName, txt, true, false);
      broadcastToAllStudents({ type: "chat-message", sender: teacherDisplayName, text: txt });
    };

    document.getElementById("btnSendTeacherChat").onclick = sendTeacherChat;
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendTeacherChat();
    });

    // Minimize / Maximize
    const minBtn = document.getElementById("btnMinLiveClass");
    const mainBody = document.getElementById("iqraLiveMainBody");
    const controlsBar = document.getElementById("iqraLiveControlsBar");

    minBtn.onclick = () => {
      isMinimized = !isMinimized;
      if (isMinimized) {
        container.dataset.prevHeight = container.style.height;
        mainBody.style.display = "none";
        controlsBar.style.display = "none";
        container.style.height = "38px";
        container.style.resize = "none";
        minBtn.textContent = "▢";
      } else {
        mainBody.style.display = "flex";
        controlsBar.style.display = "flex";
        container.style.height = container.dataset.prevHeight || "310px";
        container.style.resize = "both";
        minBtn.textContent = "—";
      }
    };

    // End Class
    document.getElementById("btnCloseLiveClass").onclick = () => {
      askEndClassConfirmation(() => {
        cleanupTeacherSession();
        showLiveToast("Live Class ended.");
      });
    };
  }

  // Student Classroom View (Join Name Prompt + Live Stream + Two-Way Chat + Raise Hand)
  function joinStudentLiveClass(roomId) {
    document.body.innerHTML = `
      <div style="position: fixed; inset: 0; background: #020617; color: #f8fafc; display: flex; flex-direction: column; font-family: system-ui, -apple-system, sans-serif;">
        <!-- Join Name Overlay -->
        <div id="iqraStudentJoinGate" style="position: fixed; inset: 0; background: rgba(2, 6, 23, 0.92); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 20px;">
          <div style="background: #0f172a; border: 1px solid #1e293b; width: 340px; max-width: 92vw; border-radius: 16px; padding: 22px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
            <div style="width: 46px; height: 46px; border-radius: 12px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; display: flex; align-items: center; justify-content: center; font-size: 20px; margin: 0 auto 12px;">
              <i class="fa-solid fa-graduation-cap"></i>
            </div>
            <h3 style="margin: 0 0 4px; font-size: 18px; font-weight: 700;">Join Live Class</h3>
            <p style="margin: 0 0 14px; font-size: 12.5px; color: #94a3b8;">Classroom: <b style="color: #38bdf8;">${escapeHtml(roomId)}</b></p>
            <input id="iqraStudentNameInput" type="text" placeholder="Enter your full name..." style="
              width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 10px;
              border: 1px solid #334155; background: #1e293b; color: #f8fafc;
              font-size: 13.5px; margin-bottom: 12px; outline: none;
            " />
            <button id="btnEnterStudentClass" type="button" style="
              width: 100%; padding: 10px; border-radius: 10px; border: none;
              background: #16a34a; color: #ffffff; font-size: 14px; font-weight: 700; cursor: pointer;
            ">Enter Classroom</button>
          </div>
        </div>

        <!-- Top Navbar -->
        <div style="background: #0f172a; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700;">
            <span style="width: 9px; height: 9px; border-radius: 50%; background: #22c55e;"></span>
            <span>${escapeHtml(roomId)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button id="btnStudentRaiseHand" type="button" style="background: #f59e0b; color: #0f172a; border: none; border-radius: 8px; padding: 6px 11px; font-size: 12px; font-weight: 700; cursor: pointer;">
              ✋ Raise Hand
            </button>
            <button id="btnStudentToggleChat" type="button" style="position: relative; background: #0284c7; color: #ffffff; border: none; border-radius: 8px; padding: 6px 11px; font-size: 12px; font-weight: 600; cursor: pointer;">
              💬 Chat
              <span id="iqraChatUnreadBadge" style="display: none; position: absolute; top: -5px; right: -5px; background: #ef4444; color: #fff; font-size: 9px; font-weight: 700; min-width: 15px; height: 15px; border-radius: 999px; align-items: center; justify-content: center; padding: 0 3px;">0</span>
            </button>
            <button id="btnStudentFullscreen" type="button" style="background: #1e293b; color: #f8fafc; border: 1px solid #334155; border-radius: 8px; padding: 6px 11px; font-size: 12px; font-weight: 600; cursor: pointer;">
              ⛶ Fullscreen
            </button>
          </div>
        </div>

        <!-- Main Classroom Area -->
        <div style="position: relative; flex: 1; display: flex; overflow: hidden;">
          <div style="position: relative; flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            <video id="iqraStudentStreamVideo" autoplay playsinline style="width: 100%; height: 100%; object-fit: contain; display: none;"></video>
            <div id="iqraStudentWaitingState" style="text-align: center; padding: 24px; max-width: 380px;">
              <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(56, 189, 248, 0.12); color: #38bdf8; display: flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 14px;">
                <i class="fa-solid fa-chalkboard-user"></i>
              </div>
              <h3 style="margin: 0 0 6px; font-size: 18px; font-weight: 700;">Connected to Classroom</h3>
              <p id="iqraStudentStatusText" style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                Waiting for the teacher to start sharing the board or camera...
              </p>
            </div>
          </div>

          <!-- Student Chat Sidebar -->
          <div id="iqraStudentChatPanel" style="
            display: flex; width: 290px; max-width: 82vw; background: #0f172a;
            border-left: 1px solid #1e293b; flex-direction: column;
          ">
            <div style="padding: 10px 12px; font-size: 12.5px; font-weight: 700; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center;">
              <span>Live Class Chat</span>
              <button id="btnCloseStudentChat" type="button" style="background: none; border: none; color: #94a3b8; font-size: 14px; cursor: pointer;">✕</button>
            </div>
            <div id="iqraLiveChatMessages" style="flex: 1; overflow-y: auto; padding: 10px;"></div>
            <div style="padding: 8px; border-top: 1px solid #1e293b; display: flex; gap: 6px;">
              <input id="iqraStudentChatInput" type="text" placeholder="Ask a question..." style="
                flex: 1; min-width: 0; background: #1e293b; border: 1px solid #334155;
                border-radius: 8px; padding: 7px 10px; font-size: 12.5px; color: #f8fafc; outline: none;
              " />
              <button id="btnSendStudentChat" type="button" style="
                background: #0284c7; color: #ffffff; border: none; border-radius: 8px;
                padding: 0 12px; font-size: 12.5px; font-weight: 600; cursor: pointer;
              ">Send</button>
            </div>
          </div>
        </div>
      </div>
    `;

    isChatOpen = true;
    let studentName = "Student";
    let studentPeer = null;
    let teacherConn = null;

    const startStudentConnection = () => {
      studentPeer = new Peer();

      studentPeer.on("open", () => {
        teacherConn = studentPeer.connect(roomId, { reliable: true });

        teacherConn.on("open", () => {
          teacherConn.send({ type: "student-hello", name: studentName });
          teacherConn.send({ type: "request-stream" });
        });

        teacherConn.on("data", (data) => {
          if (!data) return;
          if (data.type === "class-ended") {
            const statusEl = document.getElementById("iqraStudentStatusText");
            const videoEl = document.getElementById("iqraStudentStreamVideo");
            const waitEl = document.getElementById("iqraStudentWaitingState");
            if (videoEl) videoEl.style.display = "none";
            if (waitEl) waitEl.style.display = "block";
            if (statusEl) statusEl.textContent = "The teacher has ended this live session.";
          } else if (data.type === "chat-history" && Array.isArray(data.history)) {
            data.history.forEach((m) => appendChatMessage(m.sender, m.text, false, m.isSystem));
          } else if (data.type === "chat-message") {
            if (data.sender !== studentName) {
              appendChatMessage(data.sender, data.text, false, false);
            }
          } else if (data.type === "system-msg") {
            appendChatMessage("System", data.text, false, true);
          }
        });

        teacherConn.on("close", () => {
          const statusEl = document.getElementById("iqraStudentStatusText");
          if (statusEl) statusEl.textContent = "Disconnected from classroom.";
        });
      });

      studentPeer.on("call", (call) => {
        call.answer();
        call.on("stream", (remoteStream) => {
          const videoEl = document.getElementById("iqraStudentStreamVideo");
          const waitEl = document.getElementById("iqraStudentWaitingState");
          if (waitEl) waitEl.style.display = "none";
          if (videoEl) {
            videoEl.style.display = "block";
            videoEl.srcObject = remoteStream;
            videoEl.play().catch(() => {});
          }
        });
      });
    };

    const nameInput = document.getElementById("iqraStudentNameInput");
    const enterBtn = document.getElementById("btnEnterStudentClass");
    const submitJoin = () => {
      studentName = (nameInput.value || "").trim() || "Student";
      document.getElementById("iqraStudentJoinGate").style.display = "none";
      startStudentConnection();
    };
    enterBtn.onclick = submitJoin;
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitJoin();
    });

    // Student Chat Controls
    const chatPanel = document.getElementById("iqraStudentChatPanel");
    const studentChatInput = document.getElementById("iqraStudentChatInput");

    document.getElementById("btnStudentToggleChat").onclick = () => {
      isChatOpen = !isChatOpen;
      chatPanel.style.display = isChatOpen ? "flex" : "none";
      if (isChatOpen) {
        unreadMessages = 0;
        updateUnreadBadge();
      }
    };
    document.getElementById("btnCloseStudentChat").onclick = () => {
      isChatOpen = false;
      chatPanel.style.display = "none";
    };

    const sendStudentMsg = () => {
      const txt = (studentChatInput.value || "").trim();
      if (!txt || !teacherConn || !teacherConn.open) return;
      studentChatInput.value = "";
      appendChatMessage(studentName, txt, true, false);
      teacherConn.send({ type: "chat-message", sender: studentName, text: txt });
    };

    document.getElementById("btnSendStudentChat").onclick = sendStudentMsg;
    studentChatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendStudentMsg();
    });

    document.getElementById("btnStudentRaiseHand").onclick = () => {
      if (teacherConn && teacherConn.open) {
        teacherConn.send({ type: "raise-hand", studentName });
        showLiveToast("Hand raised! The teacher has been notified.");
      }
    };

    document.getElementById("btnStudentFullscreen").onclick = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    };
  }

  function makeElementDraggable(el, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      if (e.target.tagName === "BUTTON" || e.target.closest("button")) return;
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

  function showLiveToast(msg) {
    let toast = document.getElementById("iqraLiveClassToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "iqraLiveClassToast";
      toast.style.cssText = `
        position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
        background: #0f172a; color: #ffffff; padding: 8px 16px; border-radius: 30px;
        font-size: 13px; font-weight: 600; z-index: 999999; box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        font-family: system-ui, -apple-system, sans-serif;
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

  document.addEventListener("DOMContentLoaded", () => {
    const liveBtn = document.getElementById("dockBtnLiveClass");
    if (liveBtn) {
      liveBtn.addEventListener("click", openHostLobbyModal);
    }

    const params = new URLSearchParams(window.location.search);
    const joinRoom = params.get("liveClass");
    if (joinRoom) {
      joinStudentLiveClass(joinRoom);
    }
  });
})();