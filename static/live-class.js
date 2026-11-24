/* ==========================================================================
   IQRA ISLAMIC ACADEMY - HOST STUDIO & LIVE BROADCAST CONTROLLER
   (Original Left-Wall Minimize Tab + Password Gate + YouTube-Style Share Modal
    with Editable English Invitation Message & Custom Link ID)
   ========================================================================== */
(function () {
  const ACADEMY_NAME = "Iqra Islamic Academy";

  let classPeer = null;
  let activeRoomSlug = "iqra-live";
  let classPassword = "";
  let classScheduleTime = "Today at 8:00 PM IST";
  let courseTitle = "Darse Nizami 1st Year";
  let teacherDisplayName = "Teacher";
  let teacherAvatarDataUrl = "";
  let isHostingActive = false;

  let rawMicStream = null;
  let rawCamStream = null;
  let processedVideoStream = null;
  let mixedAudioStream = null;

  let localScreenStream = null;
  let canvasFallbackStream = null;
  let canvasBroadcastTimer = null;
  let videoFilterLoopId = null;

  let audioMixCtx = null;
  let wakeLockSentinel = null;

  let selectedMicId = "";
  let selectedCamId = "";
  let selectedVideoFilter = "none";
  let hostStageTargetId = "auto";
  let activeSpeakingStudentId = null;

  let isMicMuted = false;
  let isCamOff = false;
  let isWallMinimized = false;
  let isFullSizePanel = false;
  let isHostRoundBubbleMinimized = false;
  let activeHostTab = "participants";
  let isHostSidePanelOpen = true;
  let unreadMessages = 0;

  // peerId -> { conn, mediaCall, roundCamCall, incomingStream, name, micOn, camOn, micLocked, camLocked }
  const connectedStudents = new Map();
  const chatHistory = [];

  const VIDEO_FILTERS = [
    { id: "none", label: "Normal (Original)", css: "none" },
    { id: "bright", label: "Bright & Clear", css: "brightness(1.16) contrast(1.06) saturate(1.08)" },
    { id: "studio", label: "Warm Studio", css: "brightness(1.1) contrast(1.08) sepia(0.16) saturate(1.18)" },
    { id: "cool", label: "Cool Daylight", css: "brightness(1.08) contrast(1.08) hue-rotate(-8deg) saturate(1.05)" },
    { id: "crisp", label: "High Contrast Crisp", css: "brightness(1.05) contrast(1.24) saturate(1.1)" },
    { id: "soft", label: "Soft Smooth Glow", css: "brightness(1.14) contrast(0.95) saturate(1.05)" },
    { id: "bw", label: "Black & White Classic", css: "grayscale(1) contrast(1.18)" }
  ];

  // Keep device screen awake while Live Class is active
  async function enableHostWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        wakeLockSentinel = await navigator.wakeLock.request("screen");
      }
    } catch (e) {}
  }

  function releaseHostWakeLock() {
    if (wakeLockSentinel) {
      try { wakeLockSentinel.release(); } catch (e) {}
      wakeLockSentinel = null;
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isHostingActive) {
      enableHostWakeLock();
    }
  });

  function getStudentClassUrl(slug) {
    const loc = window.location;
    if (loc.hostname === "127.0.0.1" || loc.hostname === "localhost") {
      const baseDir = loc.href.substring(0, loc.href.lastIndexOf("/") + 1);
      return `${baseDir}class.html?room=${encodeURIComponent(slug)}`;
    }
    return `${loc.origin}/class.html?room=${encodeURIComponent(slug)}`;
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

  function generateRandomPassword() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

function buildDefaultEnglishInvite(roomSlug, passValue, timeText) {
    const link = getStudentClassUrl(roomSlug);
    const lines = [
      `Salam Dear Students !`,
      ``,
      `You are requested to join the online class using the invitation link provided below.`,
      ``,
      `Please click on the link to join the class and make sure to join on time. Kindly keep the link safe for future use and do not share it with anyone outside the class.`,
      ``,
      `Your regular attendance and active participation are highly appreciated.`,
      ``,
      `Class / Subject: ${courseTitle}`,
      `Teacher: ${teacherDisplayName}`,
      `Schedule: ${timeText || classScheduleTime}`,
      ``,
      `Class Invitation Link:`,
      `${link}`
    ];
    if (passValue) {
      lines.push(`Classroom Password: ${passValue}`);
    }
    lines.push(``, `Thank you!`);
    return lines.join("\n");
  }

  // YouTube-Style Share Modal with Editable English Invitation & Custom Link ID
  function openYouTubeStyleShareModal(roomSlug, passValue) {
    const existing = document.getElementById("iqraYtShareModal");
    if (existing) existing.remove();

    let currentSlug = sanitizeRoomSlug(roomSlug);
    let currentLink = getStudentClassUrl(currentSlug);
    const initialInvite = buildDefaultEnglishInvite(currentSlug, passValue, classScheduleTime);

    const overlay = document.createElement("div");
    overlay.id = "iqraYtShareModal";
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px); z-index: 999998;
      display: flex; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, sans-serif; padding: 14px;
    `;

    overlay.innerHTML = `
      <div style="background: #ffffff; width: 460px; max-width: 96vw; max-height: 92vh; overflow-y: auto; border-radius: 18px; padding: 20px; box-shadow: 0 24px 48px rgba(0,0,0,0.3); position: relative;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">Share Classroom Invitation</h4>
          <button id="btnCloseYtShare" type="button" style="width: 30px; height: 30px; border-radius: 50%; border: none; background: #f1f5f9; color: #475569; font-size: 15px; cursor: pointer;">✕</button>
        </div>

        <!-- Customize Classroom Link ID -->
        <div style="margin-bottom: 10px;">
          <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 3px;">Customize Classroom Link ID</label>
          <div style="display: flex; align-items: center; gap: 6px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 9px; padding: 5px 9px;">
            <span style="font-size: 11px; color: #64748b;">?room=</span>
            <input id="ytShareCustomSlugInput" type="text" value="${escapeHtml(currentSlug)}" style="flex: 1; min-width: 0; border: none; background: transparent; font-size: 12.5px; font-weight: 700; color: #0284c7; outline: none;" />
          </div>
        </div>

        <!-- Editable English Invitation Message -->
        <div style="margin-bottom: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <label style="font-size: 11px; font-weight: 700; color: #334155;">Invitation Message (Editable)</label>
            <button id="btnResetInviteMsg" type="button" style="background: transparent; border: none; color: #0284c7; font-size: 11px; font-weight: 700; cursor: pointer; padding: 0;">
              <i class="fa-solid fa-rotate-left"></i> Reset Text
            </button>
          </div>
          <textarea id="ytShareInviteTextarea" rows="7" style="
            width: 100%; box-sizing: border-box; padding: 9px 11px;
            border: 1.5px solid #cbd5e1; border-radius: 11px;
            font-size: 12px; line-height: 1.45; color: #0f172a;
            background: #f8fafc; resize: vertical; outline: none;
          ">${escapeHtml(initialInvite)}</textarea>
        </div>

        <!-- YouTube-Style Horizontal Social Media Icons -->
        <div id="ytSocialIconsRow" style="display: flex; align-items: flex-start; gap: 12px; overflow-x: auto; padding: 4px 2px 12px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0;"></div>

        <!-- Bottom Copy Link & Copy Full Invite Bar -->
        <div style="display: flex; align-items: center; gap: 6px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 6px 8px 6px 10px;">
          <input id="ytShareLinkField" type="text" readonly value="${escapeHtml(currentLink)}" style="
            flex: 1; min-width: 0; border: none; background: transparent;
            font-size: 11.5px; color: #0f172a; font-family: monospace; outline: none;
          " />
          <button id="btnCopyLinkOnly" type="button" style="
            background: #e2e8f0; color: #0f172a; border: none; border-radius: 18px;
            padding: 6px 11px; font-size: 11.5px; font-weight: 700; cursor: pointer; flex-shrink: 0;
          ">Copy Link</button>
          <button id="btnCopyYtShareLink" type="button" style="
            background: #0284c7; color: #ffffff; border: none; border-radius: 18px;
            padding: 6px 13px; font-size: 11.5px; font-weight: 700; cursor: pointer; flex-shrink: 0;
          ">Copy Invite</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const slugInput = document.getElementById("ytShareCustomSlugInput");
    const inviteTextarea = document.getElementById("ytShareInviteTextarea");
    const linkField = document.getElementById("ytShareLinkField");
    const socialRow = document.getElementById("ytSocialIconsRow");

    function renderSocialIcons() {
      const msgText = inviteTextarea.value;
      const encodedFullText = encodeURIComponent(msgText);
      const encodedUrl = encodeURIComponent(currentLink);
      const encodedSubject = encodeURIComponent(`${ACADEMY_NAME}: ${courseTitle} — Live Class Invitation`);

      const socials = [
        { label: "WhatsApp", bg: "#25D366", icon: "fa-brands fa-whatsapp", href: `https://api.whatsapp.com/send?text=${encodedFullText}` },
        { label: "Telegram", bg: "#0088cc", icon: "fa-brands fa-telegram", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedFullText}` },
        { label: "Facebook", bg: "#1877F2", icon: "fa-brands fa-facebook-f", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
        { label: "X", bg: "#0f172a", icon: "fa-brands fa-x-twitter", href: `https://twitter.com/intent/tweet?text=${encodedFullText}` },
        { label: "Email", bg: "#ea580c", icon: "fa-solid fa-envelope", href: `mailto:?subject=${encodedSubject}&body=${encodedFullText}` },
        { label: "Messages", bg: "#16a34a", icon: "fa-solid fa-comment-sms", href: `sms:?body=${encodedFullText}` }
      ];

      const nativeHtml =
        typeof navigator.share === "function"
          ? `<button id="btnNativeDeviceShare" type="button" style="display: flex; flex-direction: column; align-items: center; gap: 6px; background: transparent; border: none; padding: 0; min-width: 62px; cursor: pointer;">
              <div style="width: 48px; height: 48px; border-radius: 50%; background: #0284c7; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 19px; box-shadow: 0 4px 12px rgba(2,132,199,0.28);">
                <i class="fa-solid fa-share-nodes"></i>
              </div>
              <span style="font-size: 11px; font-weight: 600; color: #334155;">More Apps</span>
            </button>`
          : "";

      socialRow.innerHTML =
        nativeHtml +
        socials
          .map(
            (s) => `
            <a href="${s.href}" target="_blank" rel="noopener noreferrer" style="display: flex; flex-direction: column; align-items: center; gap: 6px; text-decoration: none; color: #1e293b; min-width: 62px; cursor: pointer;">
              <div style="width: 48px; height: 48px; border-radius: 50%; background: ${s.bg}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.16);">
                <i class="${s.icon}"></i>
              </div>
              <span style="font-size: 11px; font-weight: 600; color: #334155;">${s.label}</span>
            </a>
          `
          )
          .join("");

      const nativeBtn = document.getElementById("btnNativeDeviceShare");
      if (nativeBtn) {
        nativeBtn.onclick = async () => {
          try {
            await navigator.share({
              title: `${ACADEMY_NAME} — ${courseTitle}`,
              text: inviteTextarea.value,
              url: currentLink
            });
          } catch (err) {}
        };
      }
    }

    renderSocialIcons();

    slugInput.addEventListener("input", () => {
      const oldLink = currentLink;
      const oldSlug = currentSlug;
      currentSlug = sanitizeRoomSlug(slugInput.value);
      currentLink = getStudentClassUrl(currentSlug);
      linkField.value = currentLink;

      const lobbyRoomInput = document.getElementById("iqraCustomRoomInput");
      if (lobbyRoomInput) lobbyRoomInput.value = currentSlug;
      const lobbyPreview = document.getElementById("iqraInvitePreviewText");
      if (lobbyPreview) lobbyPreview.textContent = currentLink;

      inviteTextarea.value = inviteTextarea.value
        .replace(oldLink, currentLink)
        .replace(`Classroom ID: ${oldSlug}`, `Classroom ID: ${currentSlug}`);
      renderSocialIcons();
    });

    inviteTextarea.addEventListener("input", renderSocialIcons);

    document.getElementById("btnResetInviteMsg").onclick = () => {
      inviteTextarea.value = buildDefaultEnglishInvite(currentSlug, passValue, classScheduleTime);
      renderSocialIcons();
    };

    document.getElementById("btnCloseYtShare").onclick = () => overlay.remove();
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };

    document.getElementById("btnCopyLinkOnly").onclick = () => {
      navigator.clipboard.writeText(currentLink).then(() => {
        showLiveToast("Student classroom link copied.");
      });
    };

    document.getElementById("btnCopyYtShareLink").onclick = () => {
      navigator.clipboard.writeText(inviteTextarea.value).then(() => {
        const btn = document.getElementById("btnCopyYtShareLink");
        if (btn) {
          btn.textContent = "Copied!";
          btn.style.background = "#16a34a";
        }
        showLiveToast("Full English invitation copied.");
      });
    };
  }
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getInitials(fullName) {
    const parts = String(fullName || "Student")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return "ST";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function getAvatarColor(name) {
    const palette = ["#0284c7", "#16a34a", "#7c3aed", "#d97706", "#db2777", "#0891b2", "#4f46e5"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  }

  // Mix Microphone + System/Tab Video Audio into one clean natural stream
  function rebuildMixedAudioStream() {
    if (audioMixCtx) {
      try { audioMixCtx.close(); } catch (e) {}
      audioMixCtx = null;
    }

    const hasMic = rawMicStream && rawMicStream.getAudioTracks().length > 0;
    const hasSysAudio = localScreenStream && localScreenStream.getAudioTracks().length > 0;

    if (!hasMic && !hasSysAudio) {
      mixedAudioStream = null;
      return;
    }

    if (hasMic && !hasSysAudio) {
      mixedAudioStream = rawMicStream;
      mixedAudioStream.getAudioTracks().forEach((t) => { t.enabled = !isMicMuted; });
      return;
    }

    if (!hasMic && hasSysAudio) {
      mixedAudioStream = new MediaStream(localScreenStream.getAudioTracks());
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioMixCtx = new AudioContextClass();
      const dest = audioMixCtx.createMediaStreamDestination();

      const micSrc = audioMixCtx.createMediaStreamSource(rawMicStream);
      micSrc.connect(dest);

      const sysSrc = audioMixCtx.createMediaStreamSource(new MediaStream(localScreenStream.getAudioTracks()));
      sysSrc.connect(dest);

      mixedAudioStream = dest.stream;
    } catch (e) {
      mixedAudioStream = rawMicStream;
    }
  }

  function buildFilteredVideoStream(inputCamStream, filterId) {
    if (videoFilterLoopId) {
      cancelAnimationFrame(videoFilterLoopId);
      videoFilterLoopId = null;
    }
    if (!inputCamStream || !inputCamStream.getVideoTracks().length) return null;

    const filterObj = VIDEO_FILTERS.find((f) => f.id === filterId) || VIDEO_FILTERS[0];
    if (filterObj.css === "none") {
      const direct = new MediaStream(inputCamStream.getVideoTracks());
      direct.getVideoTracks().forEach((t) => { t.enabled = !isCamOff; });
      return direct;
    }

    const hiddenVid = document.createElement("video");
    hiddenVid.srcObject = inputCamStream;
    hiddenVid.muted = true;
    hiddenVid.playsInline = true;
    hiddenVid.play().catch(() => {});

    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");

    const drawFilteredFrame = () => {
      if (hiddenVid.videoWidth && hiddenVid.videoHeight) {
        if (canvas.width !== hiddenVid.videoWidth || canvas.height !== hiddenVid.videoHeight) {
          canvas.width = hiddenVid.videoWidth;
          canvas.height = hiddenVid.videoHeight;
        }
        ctx.filter = filterObj.css;
        ctx.drawImage(hiddenVid, 0, 0, canvas.width, canvas.height);
      }
      videoFilterLoopId = requestAnimationFrame(drawFilteredFrame);
    };
    drawFilteredFrame();

    const filteredStream = canvas.captureStream(20);
    filteredStream.getVideoTracks().forEach((t) => { t.enabled = !isCamOff; });
    return filteredStream;
  }

  function isScreenSharingActive() {
    return Boolean((localScreenStream && localScreenStream.active) || (canvasFallbackStream && canvasFallbackStream.active));
  }

  function getActiveBroadcastStream() {
    const combined = new MediaStream();

    const boardStream =
      (localScreenStream && localScreenStream.active)
        ? localScreenStream
        : (canvasFallbackStream && canvasFallbackStream.active)
          ? canvasFallbackStream
          : null;

    if (boardStream) {
      boardStream.getVideoTracks().forEach((t) => combined.addTrack(t));
    } else if (!isCamOff && processedVideoStream && processedVideoStream.active) {
      processedVideoStream.getVideoTracks().forEach((t) => combined.addTrack(t));
    }

    if (mixedAudioStream && mixedAudioStream.active) {
      mixedAudioStream.getAudioTracks().forEach((t) => combined.addTrack(t));
    }

    return combined.getTracks().length > 0 ? combined : null;
  }

  // Low-Lag Mobile/Tablet Fallback Stream (800px cap, 8 FPS so mobile CPU never lags)
  function createLowLagBoardCanvasStream() {
    if (canvasBroadcastTimer) clearInterval(canvasBroadcastTimer);

    const composite = document.createElement("canvas");
    const ctx = composite.getContext("2d", { alpha: false });

    const renderBoardFrame = () => {
      const vw = window.innerWidth || 1280;
      const vh = window.innerHeight || 720;
      const maxW = 800;
      const scale = vw > maxW ? maxW / vw : 1;
      const targetW = Math.round(vw * scale);
      const targetH = Math.round(vh * scale);

      if (composite.width !== targetW || composite.height !== targetH) {
        composite.width = targetW;
        composite.height = targetH;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetW, targetH);

      document.querySelectorAll("canvas").forEach((c) => {
        if (c.id === "wbSnipPreviewCanvas") return;
        const st = window.getComputedStyle(c);
        if (st.display === "none" || st.visibility === "hidden" || c.classList.contains("hidden")) return;
        const r = c.getBoundingClientRect();
        if (r.width > 40 && r.height > 40) {
          try {
            ctx.drawImage(c, r.left * scale, r.top * scale, r.width * scale, r.height * scale);
          } catch (e) {}
        }
      });
    };

    renderBoardFrame();
    canvasBroadcastTimer = setInterval(renderBoardFrame, 125);
    return composite.captureStream(8);
  }

  function stopBoardSharingStreams() {
    if (canvasBroadcastTimer) {
      clearInterval(canvasBroadcastTimer);
      canvasBroadcastTimer = null;
    }
    if (canvasFallbackStream) {
      canvasFallbackStream.getTracks().forEach((t) => t.stop());
      canvasFallbackStream = null;
    }
    if (localScreenStream) {
      localScreenStream.getTracks().forEach((t) => t.stop());
      localScreenStream = null;
    }
    rebuildMixedAudioStream();
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
    const chatVisible = isHostSidePanelOpen && activeHostTab === "chat";
    if (unreadMessages > 0 && !chatVisible) {
      badge.style.display = "inline-flex";
      badge.textContent = unreadMessages > 9 ? "9+" : String(unreadMessages);
    } else {
      badge.style.display = "none";
    }
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
            max-width: 86%; padding: 7px 10px; border-radius: 11px; font-size: 12px; line-height: 1.4;
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

    const chatVisible = isHostSidePanelOpen && activeHostTab === "chat";
    if (!isSelf && !chatVisible) {
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

  function syncRosterToAllStudents() {
    const roster = [
      {
        id: "host",
        name: `${teacherDisplayName} (Host)`,
        initials: getInitials(teacherDisplayName),
        avatar: teacherAvatarDataUrl,
        micOn: !isMicMuted,
        camOn: !isCamOff,
        isHost: true
      }
    ];
    connectedStudents.forEach((s, pid) => {
      roster.push({
        id: pid,
        name: s.name,
        initials: getInitials(s.name),
        avatar: "",
        micOn: Boolean(s.micOn),
        camOn: Boolean(s.camOn),
        isHost: false
      });
    });
    broadcastToAllStudents({ type: "roster-update", roster });
  }

  function applyMobileBitrateCap(call, maxBps) {
    try {
      const pc = call && call.peerConnection;
      if (!pc) return;
      setTimeout(() => {
        pc.getSenders().forEach((sender) => {
          if (sender.track && sender.track.kind === "video") {
            const p = sender.getParameters();
            if (!p.encodings || !p.encodings.length) p.encodings = [{}];
            p.encodings[0].maxBitrate = maxBps;
            sender.setParameters(p).catch(() => {});
          }
        });
      }, 600);
    } catch (e) {}
  }

  function broadcastStreamToAllStudents() {
    const stream = getActiveBroadcastStream();
    const sharing = isScreenSharingActive();
    const hasActiveVideo = Boolean(stream && stream.getVideoTracks().length > 0);
    const isMobileHost = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    broadcastToAllStudents({
      type: "host-stage-state",
      hasActiveVideo,
      teacherName: teacherDisplayName
    });

    if (!classPeer) return;

    connectedStudents.forEach((student, studentPeerId) => {
      try {
        if (student.mediaCall) student.mediaCall.close();
        if (stream) {
          student.mediaCall = classPeer.call(studentPeerId, stream, {
            metadata: { streamRole: sharing ? "screen-share" : "host-cam" }
          });
          if (isMobileHost) applyMobileBitrateCap(student.mediaCall, 1200000);
        }
      } catch (e) {}

      try {
        if (student.roundCamCall) {
          student.roundCamCall.close();
          student.roundCamCall = null;
        }
        if (sharing && !isCamOff && processedVideoStream && processedVideoStream.getVideoTracks().length > 0) {
          student.roundCamCall = classPeer.call(studentPeerId, processedVideoStream, {
            metadata: { streamRole: "host-round-cam" }
          });
          if (isMobileHost) applyMobileBitrateCap(student.roundCamCall, 350000);
        }
      } catch (e) {}
    });
  }

  function updateHostRoundStudentBubble() {
    const bubble = document.getElementById("iqraHostRoundStudentBubble");
    const vid = document.getElementById("iqraHostRoundStudentVid");
    const initialsEl = document.getElementById("iqraHostRoundStudentInitials");
    const labelEl = document.getElementById("iqraHostRoundStudentName");
    if (!bubble) return;

    if (connectedStudents.size === 0) {
      bubble.style.display = "none";
      return;
    }

    let targetStudent = null;
    if (activeSpeakingStudentId && connectedStudents.has(activeSpeakingStudentId)) {
      targetStudent = connectedStudents.get(activeSpeakingStudentId);
    } else if (hostStageTargetId !== "auto" && hostStageTargetId !== "host" && connectedStudents.has(hostStageTargetId)) {
      targetStudent = connectedStudents.get(hostStageTargetId);
    } else {
      targetStudent = connectedStudents.values().next().value;
    }

    if (!targetStudent) {
      bubble.style.display = "none";
      return;
    }

    bubble.style.display = "flex";
    const hasLiveTrack = Boolean(
      targetStudent.incomingStream &&
      targetStudent.incomingStream.getVideoTracks().some((t) => t.readyState === "live" && t.enabled)
    );
    const showVideo = Boolean(targetStudent.camOn && hasLiveTrack);

    if (isHostRoundBubbleMinimized) {
      bubble.style.width = "40px";
      bubble.style.height = "40px";
      if (vid) vid.style.display = "none";
      if (initialsEl) {
        initialsEl.style.display = "flex";
        initialsEl.style.fontSize = "12px";
        initialsEl.style.background = getAvatarColor(targetStudent.name);
        initialsEl.textContent = getInitials(targetStudent.name);
      }
      if (labelEl) labelEl.style.display = "none";
    } else {
      bubble.style.width = "108px";
      bubble.style.height = "108px";
      if (labelEl) {
        labelEl.style.display = "block";
        labelEl.textContent = targetStudent.name;
      }
      if (showVideo && vid) {
        if (vid.srcObject !== targetStudent.incomingStream) {
          vid.srcObject = targetStudent.incomingStream;
        }
        vid.style.display = "block";
        vid.play().catch(() => {});
        if (initialsEl) initialsEl.style.display = "none";
      } else {
        if (vid) vid.style.display = "none";
        if (initialsEl) {
          initialsEl.style.display = "flex";
          initialsEl.style.fontSize = "22px";
          initialsEl.style.background = getAvatarColor(targetStudent.name);
          initialsEl.textContent = getInitials(targetStudent.name);
        }
      }
    }
  }

  function resolveHostFrontTarget() {
    if (hostStageTargetId === "host") return { mode: "host" };

    if (hostStageTargetId !== "auto" && connectedStudents.has(hostStageTargetId)) {
      return { mode: "student", pid: hostStageTargetId, student: connectedStudents.get(hostStageTargetId) };
    }

    if (connectedStudents.size > 0) {
      const firstEntry = connectedStudents.entries().next().value;
      return { mode: "student", pid: firstEntry[0], student: firstEntry[1] };
    }

    return { mode: "host" };
  }

  function refreshHostStagePreview() {
    const preview = document.getElementById("iqraTeacherPreviewVideo");
    const placeholder = document.getElementById("iqraTeacherPlaceholder");
    if (!preview || !placeholder) return;

    updateHostRoundStudentBubble();

    if (isScreenSharingActive()) {
      if (localScreenStream && localScreenStream.active) {
        preview.srcObject = localScreenStream;
        preview.style.display = "block";
        placeholder.style.display = "none";
      } else {
        preview.style.display = "none";
        placeholder.style.display = "flex";
        placeholder.innerHTML = `
          <div style="width: 54px; height: 54px; border-radius: 50%; background: rgba(22, 163, 74, 0.16); color: #22c55e; font-size: 22px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
            <i class="fa-solid fa-display"></i>
          </div>
          <div style="font-size: 13.5px; font-weight: 700; color: #f8fafc;">Sharing Screen Live</div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 3px;">Students are viewing your screen</div>
        `;
      }
      return;
    }

    const front = resolveHostFrontTarget();

    if (front.mode === "student" && front.student) {
      const st = front.student;
      const hasStudentVideo = st.camOn && st.incomingStream && st.incomingStream.getVideoTracks().length > 0;
      if (hasStudentVideo) {
        preview.srcObject = st.incomingStream;
        preview.style.display = "block";
        placeholder.style.display = "none";
      } else {
        preview.style.display = "none";
        placeholder.style.display = "flex";
        const bg = getAvatarColor(st.name);
        placeholder.innerHTML = `
          <div style="width: 72px; height: 72px; border-radius: 50%; background: ${bg}; color: #ffffff; font-size: 24px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; box-shadow: 0 6px 18px rgba(0,0,0,0.35);">
            ${escapeHtml(getInitials(st.name))}
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #f8fafc;">${escapeHtml(st.name)}</div>
          <div style="font-size: 11.5px; color: #94a3b8; margin-top: 3px;">
            ${st.micOn ? "Microphone Active" : "Camera & Microphone Off"}
          </div>
        `;
      }
      return;
    }

    if (!isCamOff && processedVideoStream && processedVideoStream.getVideoTracks().length > 0) {
      preview.srcObject = processedVideoStream;
      preview.style.display = "block";
      placeholder.style.display = "none";
      return;
    }

    preview.style.display = "none";
    placeholder.style.display = "flex";
    const hostInitials = getInitials(teacherDisplayName);
    placeholder.innerHTML = `
      <div id="iqraHostStageAvatar" style="width: 64px; height: 64px; border-radius: 50%; background: #0284c7; color: #ffffff; font-size: 22px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; border: 2px solid #38bdf8; overflow: hidden;">
        ${teacherAvatarDataUrl ? `<img src="${teacherAvatarDataUrl}" style="width:100%;height:100%;object-fit:cover;" />` : escapeHtml(hostInitials)}
      </div>
      <div style="font-size: 13px; font-weight: 700; color: #f8fafc;">${escapeHtml(teacherDisplayName)}</div>
      <div style="font-size: 11px; color: #94a3b8; margin-top: 3px;">Click <b>Share Screen</b> below to broadcast your screen</div>
    `;
  }
  function renderHostParticipantsList() {
    const listEl = document.getElementById("iqraHostParticipantsList");
    if (!listEl) return;

    listEl.innerHTML = "";
    const front = resolveHostFrontTarget();

    const hostSelfCard = document.createElement("div");
    const isHostFront = front.mode === "host";
    hostSelfCard.style.cssText = `
      background: #1e293b; border: 1.5px solid ${isHostFront ? "#38bdf8" : "#334155"}; border-radius: 11px;
      padding: 7px 9px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 6px;
    `;
    hostSelfCard.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
        <div style="width: 30px; height: 30px; border-radius: 50%; background: #0284c7; color: #fff; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden;">
          ${teacherAvatarDataUrl ? `<img src="${teacherAvatarDataUrl}" style="width:100%;height:100%;object-fit:cover;" />` : escapeHtml(getInitials(teacherDisplayName))}
        </div>
        <div style="min-width: 0;">
          <div style="font-size: 11.5px; font-weight: 700; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(teacherDisplayName)} (You)</div>
          <div style="font-size: 10px; color: #94a3b8;">Host Broadcast</div>
        </div>
      </div>
      <button id="btnFocusHostSelfStage" type="button" style="
        background: ${isHostFront ? "#0284c7" : "#334155"}; color: #fff; border: none;
        border-radius: 6px; padding: 4px 7px; font-size: 10px; font-weight: 700; cursor: pointer; flex-shrink: 0;
      ">
        ${isHostFront ? "In Front" : "My View"}
      </button>
    `;
    listEl.appendChild(hostSelfCard);

    document.getElementById("btnFocusHostSelfStage").onclick = () => {
      hostStageTargetId = "host";
      refreshHostStagePreview();
      renderHostParticipantsList();
    };

    if (connectedStudents.size === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align: center; color: #64748b; font-size: 12px; padding: 22px 10px;";
      empty.innerHTML = `
        <i class="fa-solid fa-users" style="font-size: 20px; margin-bottom: 6px; display: block; color: #334155;"></i>
        No students have joined yet. Share the classroom invite to begin.
      `;
      listEl.appendChild(empty);
      return;
    }

    connectedStudents.forEach((student, pid) => {
      const card = document.createElement("div");
      const isFront = front.mode === "student" && front.pid === pid;
      card.style.cssText = `
        background: #1e293b; border: 1.5px solid ${isFront ? "#38bdf8" : "#334155"}; border-radius: 12px;
        padding: 8px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 6px;
      `;

      const initials = getInitials(student.name);
      const bg = getAvatarColor(student.name);
      const hasLiveVideo = student.camOn && student.incomingStream && student.incomingStream.getVideoTracks().length > 0;

      card.innerHTML = `
        <div style="position: relative; width: 100%; height: 88px; border-radius: 9px; background: #0f172a; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          <video id="hostStudentVid_${pid}" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover; display: ${hasLiveVideo ? "block" : "none"};"></video>
          <div style="display: ${hasLiveVideo ? "none" : "flex"}; width: 42px; height: 42px; border-radius: 50%; background: ${bg}; color: #ffffff; font-size: 15px; font-weight: 800; align-items: center; justify-content: center;">
            ${escapeHtml(initials)}
          </div>
          <div style="position: absolute; bottom: 4px; left: 6px; right: 6px; display: flex; align-items: center; justify-content: space-between; background: rgba(15,23,42,0.82); padding: 2px 7px; border-radius: 6px;">
            <span style="font-size: 11px; font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(student.name)}</span>
            <span style="font-size: 10px; color: ${student.micOn ? "#22c55e" : "#ef4444"};">
              <i class="fa-solid ${student.micOn ? "fa-microphone" : "fa-microphone-slash"}"></i>
            </span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 4px;">
          <button type="button" data-act="spotlight" data-pid="${pid}" style="
            background: ${isFront ? "#0284c7" : "#334155"}; color: #f8fafc; border: none;
            border-radius: 6px; padding: 4px 4px; font-size: 10px; font-weight: 700; cursor: pointer;
          ">
            <i class="fa-solid fa-thumbtack"></i> ${isFront ? "In Front" : "Pin Front"}
          </button>
          <button type="button" data-act="kick-student" data-pid="${pid}" style="
            background: #7f1d1d; color: #fecaca; border: none;
            border-radius: 6px; padding: 4px 4px; font-size: 10px; font-weight: 700; cursor: pointer;
          ">
            <i class="fa-solid fa-user-xmark"></i> Remove
          </button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
          <button type="button" data-act="toggle-lock-mic" data-pid="${pid}" title="Disable / Enable Student Microphone" style="
            background: ${student.micLocked ? "#dc2626" : "#0f172a"};
            color: #f8fafc; border: 1px solid #334155;
            border-radius: 6px; padding: 4px 3px; font-size: 10px; font-weight: 600; cursor: pointer;
          ">
            <i class="fa-solid ${student.micLocked ? "fa-microphone-slash" : "fa-microphone"}"></i>
            ${student.micLocked ? "Mic Locked" : "Disable Mic"}
          </button>
          <button type="button" data-act="toggle-lock-cam" data-pid="${pid}" title="Disable / Enable Student Camera" style="
            background: ${student.camLocked ? "#dc2626" : "#0f172a"};
            color: #f8fafc; border: 1px solid #334155;
            border-radius: 6px; padding: 4px 3px; font-size: 10px; font-weight: 600; cursor: pointer;
          ">
            <i class="fa-solid ${student.camLocked ? "fa-video-slash" : "fa-video"}"></i>
            ${student.camLocked ? "Cam Locked" : "Disable Cam"}
          </button>
        </div>
      `;

      listEl.appendChild(card);

      if (student.incomingStream) {
        const vid = document.getElementById(`hostStudentVid_${pid}`);
        if (vid) {
          vid.srcObject = student.incomingStream;
          vid.play().catch(() => {});
        }
      }
    });

    listEl.querySelectorAll("button[data-act]").forEach((btn) => {
      btn.onclick = () => {
        const pid = btn.getAttribute("data-pid");
        const act = btn.getAttribute("data-act");
        const st = connectedStudents.get(pid);
        if (!st || !st.conn || !st.conn.open) return;

        if (act === "spotlight") {
          hostStageTargetId = pid;
          activeSpeakingStudentId = pid;
          refreshHostStagePreview();
        } else if (act === "toggle-lock-mic") {
          st.micLocked = !st.micLocked;
          if (st.micLocked) st.micOn = false;
          st.conn.send({
            type: "host-control",
            action: st.micLocked ? "lock-mic" : "unlock-mic"
          });
          showLiveToast(st.micLocked ? `Disabled microphone for ${st.name}.` : `Re-enabled microphone for ${st.name}.`);
        } else if (act === "toggle-lock-cam") {
          st.camLocked = !st.camLocked;
          if (st.camLocked) st.camOn = false;
          st.conn.send({
            type: "host-control",
            action: st.camLocked ? "lock-cam" : "unlock-cam"
          });
          showLiveToast(st.camLocked ? `Disabled camera for ${st.name}.` : `Re-enabled camera for ${st.name}.`);
        } else if (act === "kick-student") {
          st.conn.send({ type: "host-control", action: "kicked" });
          setTimeout(() => {
            try { st.conn.close(); } catch (e) {}
            if (st.mediaCall) { try { st.mediaCall.close(); } catch (e) {} }
            if (st.roundCamCall) { try { st.roundCamCall.close(); } catch (e) {} }
            connectedStudents.delete(pid);
            if (hostStageTargetId === pid) hostStageTargetId = "auto";
            if (activeSpeakingStudentId === pid) activeSpeakingStudentId = null;
            updateStudentCountBadge();
            renderHostParticipantsList();
            syncRosterToAllStudents();
            refreshHostStagePreview();
          }, 150);
          showLiveToast(`Removed ${st.name} from the classroom.`);
          return;
        }
        renderHostParticipantsList();
        syncRosterToAllStudents();
      };
    });
  }

  function updateHostMediaButtonColors() {
    const micBtn = document.getElementById("btnToggleMic");
    const camBtn = document.getElementById("btnToggleCam");
    const hasMic = Boolean(rawMicStream && rawMicStream.getAudioTracks().length > 0);
    const hasCam = Boolean(rawCamStream && rawCamStream.getVideoTracks().length > 0);

    if (micBtn) {
      const active = hasMic && !isMicMuted;
      micBtn.style.background = active ? "#16a34a" : "#dc2626";
      micBtn.innerHTML = active
        ? `<i class="fa-solid fa-microphone"></i> Mic On`
        : `<i class="fa-solid fa-microphone-slash"></i> Mic Off`;
    }
    if (camBtn) {
      const active = hasCam && !isCamOff;
      camBtn.style.background = active ? "#16a34a" : "#dc2626";
      camBtn.innerHTML = active
        ? `<i class="fa-solid fa-video"></i> Cam On`
        : `<i class="fa-solid fa-video-slash"></i> Cam Off`;
    }
  }

  async function acquireHostMedia(micId, camId) {
    if (rawMicStream) {
      rawMicStream.getTracks().forEach((t) => t.stop());
      rawMicStream = null;
    }
    if (rawCamStream) {
      rawCamStream.getTracks().forEach((t) => t.stop());
      rawCamStream = null;
    }

    try {
      rawMicStream = await navigator.mediaDevices.getUserMedia({
        audio: micId ? { deviceId: { exact: micId } } : true,
        video: false
      });
    } catch (e) {
      rawMicStream = null;
      isMicMuted = true;
    }

    try {
      rawCamStream = await navigator.mediaDevices.getUserMedia({
        video: camId ? { deviceId: { exact: camId } } : true,
        audio: false
      });
    } catch (e) {
      rawCamStream = null;
      isCamOff = true;
    }

    rebuildMixedAudioStream();

    if (rawCamStream) {
      processedVideoStream = buildFilteredVideoStream(rawCamStream, selectedVideoFilter);
      if (processedVideoStream) {
        processedVideoStream.getVideoTracks().forEach((t) => { t.enabled = !isCamOff; });
      }
    } else {
      processedVideoStream = null;
    }

    updateHostMediaButtonColors();
    refreshHostStagePreview();
    broadcastStreamToAllStudents();
    syncRosterToAllStudents();
  }

  async function openHostDeviceSettingsModal() {
    const existing = document.getElementById("iqraLiveSettingsModal");
    if (existing) existing.remove();

    let devices = [];
    try {
      devices = await navigator.mediaDevices.enumerateDevices();
    } catch (e) {}

    const mics = devices.filter((d) => d.kind === "audioinput");
    const cams = devices.filter((d) => d.kind === "videoinput");

    const modal = document.createElement("div");
    modal.id = "iqraLiveSettingsModal";
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px); z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    const micOptions = mics.length
      ? mics.map((m, i) => `<option value="${escapeHtml(m.deviceId)}" ${m.deviceId === selectedMicId ? "selected" : ""}>${escapeHtml(m.label || `Microphone ${i + 1}`)}</option>`).join("")
      : `<option value="">Default Microphone</option>`;

    const camOptions = cams.length
      ? cams.map((c, i) => `<option value="${escapeHtml(c.deviceId)}" ${c.deviceId === selectedCamId ? "selected" : ""}>${escapeHtml(c.label || `Camera ${i + 1}`)}</option>`).join("")
      : `<option value="">Default Camera</option>`;

    const videoFilterOptions = VIDEO_FILTERS.map(
      (f) => `<option value="${f.id}" ${f.id === selectedVideoFilter ? "selected" : ""}>${escapeHtml(f.label)}</option>`
    ).join("");

    modal.innerHTML = `
      <div style="background: #ffffff; width: 400px; max-width: 94vw; max-height: 90vh; overflow-y: auto; border-radius: 16px; padding: 20px; box-shadow: 0 20px 44px rgba(0,0,0,0.3); position: relative;">
        <button id="closeHostSettingsModal" type="button" style="position: absolute; top: 12px; right: 12px; width: 28px; height: 28px; border-radius: 50%; border: none; background: #f1f5f9; color: #475569; cursor: pointer;">✕</button>
        <h4 style="margin: 0 0 14px; font-size: 16px; font-weight: 800; color: #0f172a;">Audio, Video & Profile Settings</h4>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px;">Microphone Device</label>
            <select id="iqraMicSelect" style="width: 100%; padding: 8px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 12px; color: #0f172a;">
              ${micOptions}
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px;">Camera Device</label>
            <select id="iqraCamSelect" style="width: 100%; padding: 8px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 12px; color: #0f172a;">
              ${camOptions}
            </select>
          </div>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 11.5px; font-weight: 700; color: #0284c7; margin-bottom: 4px;">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Camera Video Filter
          </label>
          <select id="iqraVideoFilterSelect" style="width: 100%; padding: 8px 10px; border: 1.5px solid #bae6fd; background: #f0f9ff; border-radius: 9px; font-size: 12.5px; font-weight: 600; color: #0f172a;">
            ${videoFilterOptions}
          </select>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px;">Teacher Profile Photo</label>
          <input id="iqraSettingsAvatarInput" type="file" accept="image/*" style="width: 100%; font-size: 12px; color: #475569;" />
        </div>

        <button id="btnApplyHostSettings" type="button" style="width: 100%; padding: 10px; border-radius: 10px; border: none; background: #0284c7; color: #ffffff; font-size: 13px; font-weight: 700; cursor: pointer;">
          Apply Settings
        </button>
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById("closeHostSettingsModal").onclick = () => modal.remove();

    const avatarInput = document.getElementById("iqraSettingsAvatarInput");
    avatarInput.onchange = () => {
      const file = avatarInput.files && avatarInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        teacherAvatarDataUrl = reader.result;
      };
      reader.readAsDataURL(file);
    };

    document.getElementById("btnApplyHostSettings").onclick = async () => {
      selectedMicId = document.getElementById("iqraMicSelect").value;
      selectedCamId = document.getElementById("iqraCamSelect").value;
      selectedVideoFilter = document.getElementById("iqraVideoFilterSelect").value;
      modal.remove();

      const headerAvatar = document.getElementById("iqraHostHeaderAvatar");
      if (teacherAvatarDataUrl && headerAvatar) {
        headerAvatar.src = teacherAvatarDataUrl;
      }

      await acquireHostMedia(selectedMicId, selectedCamId);
      renderHostParticipantsList();
      showLiveToast("Audio, video & profile settings applied.");
    };
  }

  function askHostExitOptions(onLeaveOnly, onEndForAll) {
    const existing = document.getElementById("iqraHostExitModal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "iqraHostExitModal";
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.58);
      backdrop-filter: blur(3px); z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="background: #ffffff; width: 350px; max-width: 92vw; border-radius: 16px; padding: 20px; box-shadow: 0 20px 44px rgba(0,0,0,0.28); text-align: center;">
        <div style="width: 44px; height: 44px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; font-size: 18px;">
          <i class="fa-solid fa-right-from-bracket"></i>
        </div>
        <h4 style="margin: 0 0 6px; font-size: 16px; font-weight: 800; color: #0f172a;">Disconnect Classroom</h4>
        <p style="margin: 0 0 16px; font-size: 12.5px; color: #64748b; line-height: 1.45;">
          Choose whether you want to leave temporarily or close the class for everyone.
        </p>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button id="btnHostLeaveOnly" type="button" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #0284c7; background: #f0f9ff; color: #0369a1; font-size: 13px; font-weight: 700; cursor: pointer;">
            Leave Class Only (Keep Students Connected)
          </button>
          <button id="btnHostEndForAll" type="button" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: none; background: #dc2626; color: #ffffff; font-size: 13px; font-weight: 700; cursor: pointer;">
            End Class for All (Remove Everyone)
          </button>
          <button id="btnCancelHostExit" type="button" style="width: 100%; padding: 8px 12px; border-radius: 10px; border: 1px solid #cbd5e1; background: #f8fafc; color: #475569; font-size: 12.5px; font-weight: 600; cursor: pointer;">
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById("btnCancelHostExit").onclick = () => overlay.remove();
    document.getElementById("btnHostLeaveOnly").onclick = () => {
      overlay.remove();
      onLeaveOnly();
    };
    document.getElementById("btnHostEndForAll").onclick = () => {
      overlay.remove();
      onEndForAll();
    };
  }

  function cleanupTeacherSession(endForAll) {
    releaseHostWakeLock();
    stopBoardSharingStreams();
    if (videoFilterLoopId) {
      cancelAnimationFrame(videoFilterLoopId);
      videoFilterLoopId = null;
    }
    if (audioMixCtx) {
      try { audioMixCtx.close(); } catch (e) {}
      audioMixCtx = null;
    }
    if (rawMicStream) {
      rawMicStream.getTracks().forEach((t) => t.stop());
      rawMicStream = null;
    }
    if (rawCamStream) {
      rawCamStream.getTracks().forEach((t) => t.stop());
      rawCamStream = null;
    }

    connectedStudents.forEach((student) => {
      try {
        if (student.conn && student.conn.open) {
          student.conn.send({ type: endForAll ? "class-ended" : "host-left-temp" });
          if (endForAll) student.conn.close();
        }
        if (student.mediaCall) student.mediaCall.close();
        if (student.roundCamCall) student.roundCamCall.close();
      } catch (e) {}
    });

    if (endForAll) {
      connectedStudents.clear();
      chatHistory.length = 0;
      if (classPeer) {
        try { classPeer.destroy(); } catch (e) {}
        classPeer = null;
      }
    }

    isHostingActive = false;
    isMicMuted = false;
    isCamOff = false;
    isWallMinimized = false;
    isFullSizePanel = false;
    hostStageTargetId = "auto";
    activeSpeakingStudentId = null;
    unreadMessages = 0;

    const panel = document.getElementById("iqraLiveClassPanel");
    if (panel) panel.remove();
    const wallTab = document.getElementById("iqraLeftWallRestoreTab");
    if (wallTab) wallTab.remove();
  }

  // Original Left-Wall Vertical-Draggable Minimize Pill (Image 4)
  function toggleLeftWallMinimize(minimize) {
    const panel = document.getElementById("iqraLiveClassPanel");
    if (!panel) return;
    isWallMinimized = minimize;

    let wallTab = document.getElementById("iqraLeftWallRestoreTab");
    if (minimize) {
      panel.style.transform = "translateX(-115%)";
      panel.style.opacity = "0";
      panel.style.pointerEvents = "none";

      if (!wallTab) {
        wallTab = document.createElement("div");
        wallTab.id = "iqraLeftWallRestoreTab";
        wallTab.title = "Drag vertically or click to expand Live Class";
        wallTab.innerHTML = `
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #22c55e;"></span>
          <i class="fa-solid fa-chevron-right" style="font-size: 10px;"></i>
        `;
        wallTab.style.cssText = `
          position: fixed; left: 0; top: 46%;
          z-index: 999992;
          width: 18px; height: 56px;
          background: rgba(15, 23, 42, 0.78); color: #f8fafc;
          border: 1px solid rgba(56, 189, 248, 0.55); border-left: none;
          border-radius: 0 10px 10px 0;
          box-shadow: 2px 4px 12px rgba(0,0,0,0.22);
          cursor: pointer; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 6px;
          opacity: 0.28;
          transform: translateX(-5px);
          transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease;
          user-select: none; touch-action: none;
        `;

        wallTab.onmouseenter = () => {
          wallTab.style.opacity = "1";
          wallTab.style.transform = "translateX(0)";
          wallTab.style.background = "#0f172a";
        };
        wallTab.onmouseleave = () => {
          wallTab.style.opacity = "0.28";
          wallTab.style.transform = "translateX(-5px)";
          wallTab.style.background = "rgba(15, 23, 42, 0.78)";
        };

        let dragging = false;
        let movedVertically = false;
        let startY = 0;
        let startTop = 0;

        wallTab.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          dragging = true;
          movedVertically = false;
          startY = e.clientY;
          startTop = wallTab.getBoundingClientRect().top;
          wallTab.style.opacity = "1";
          wallTab.style.transform = "translateX(0)";
          wallTab.setPointerCapture(e.pointerId);
        });

        wallTab.addEventListener("pointermove", (e) => {
          if (!dragging) return;
          const dy = e.clientY - startY;
          if (Math.abs(dy) > 6) movedVertically = true;
          const nextTop = Math.max(12, Math.min(window.innerHeight - 68, startTop + dy));
          wallTab.style.top = `${nextTop}px`;
        });

        wallTab.addEventListener("pointerup", (e) => {
          if (!dragging) return;
          dragging = false;
          try { wallTab.releasePointerCapture(e.pointerId); } catch (err) {}
          if (!movedVertically) {
            toggleLeftWallMinimize(false);
          } else {
            wallTab.style.opacity = "0.28";
            wallTab.style.transform = "translateX(-5px)";
          }
        });

        document.body.appendChild(wallTab);
      }
      wallTab.style.display = "flex";
    } else {
      panel.style.transform = "translateX(0)";
      panel.style.opacity = "1";
      panel.style.pointerEvents = "auto";
      if (wallTab) wallTab.style.display = "none";
    }
  }

  function openHostLobbyModal() {
    if (isHostingActive) {
      toggleLeftWallMinimize(false);
      return;
    }

    const existing = document.getElementById("iqraLiveLobbyModal");
    if (existing) existing.remove();

    const defaultPass = classPassword || generateRandomPassword();

    const modal = document.createElement("div");
    modal.id = "iqraLiveLobbyModal";
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px); z-index: 999995;
      display: flex; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    modal.innerHTML = `
      <div style="background: #ffffff; width: 440px; max-width: 95vw; max-height: 94vh; overflow-y: auto; border-radius: 18px; padding: 20px; box-shadow: 0 24px 48px rgba(0,0,0,0.28); position: relative;">
        <button id="closeLiveLobbyModal" type="button" style="position: absolute; top: 14px; right: 14px; width: 30px; height: 30px; border-radius: 50%; border: none; background: #f1f5f9; color: #475569; font-size: 15px; cursor: pointer;">✕</button>

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
          <div style="width: 42px; height: 42px; border-radius: 12px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 18px;">
            <i class="fa-solid fa-mosque"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 16.5px; font-weight: 800; color: #0f172a;">${ACADEMY_NAME}</h3>
            <p style="margin: 2px 0 0; font-size: 11.5px; color: #64748b;">Configure Password-Protected Classroom & Invite</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 9px;">
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 3px;">Teacher Name</label>
            <input id="iqraHostNameInput" type="text" value="${escapeHtml(teacherDisplayName)}" placeholder="Teacher Name"
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 12.5px; color: #0f172a; outline: none;" />
          </div>
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 3px;">Profile Photo</label>
            <input id="iqraLobbyAvatarInput" type="file" accept="image/*" style="width: 100%; font-size: 11px; padding-top: 5px; color: #475569;" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 9px;">
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 3px;">Course / Class Title</label>
            <input id="iqraCourseTitleInput" type="text" value="${escapeHtml(courseTitle)}" placeholder="e.g. Darse Nizami 1st Year"
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 12.5px; font-weight: 600; color: #0f172a; outline: none;" />
          </div>
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 3px;">Class Schedule / Time</label>
            <input id="iqraClassTimeInput" type="text" value="${escapeHtml(classScheduleTime)}" placeholder="e.g. Today at 8:00 PM IST"
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 12.5px; color: #0f172a; outline: none;" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 9px; margin-bottom: 9px;">
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
              <label style="font-size: 11px; font-weight: 700; color: #334155;">Customize Link ID</label>
              <button id="btnGenerateNewRoomSlug" type="button" style="background: #e0f2fe; color: #0369a1; border: none; border-radius: 6px; padding: 1px 7px; font-size: 10px; font-weight: 700; cursor: pointer;">
                New ID
              </button>
            </div>
            <input id="iqraCustomRoomInput" type="text" value="${escapeHtml(activeRoomSlug)}" placeholder="e.g. iqra-darse-nizami"
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 12.5px; font-weight: 600; color: #0284c7; outline: none;" />
          </div>

          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 3px;">
              <i class="fa-solid fa-lock" style="color: #0284c7;"></i> Class Password
            </label>
            <div style="display: flex; gap: 4px;">
              <input id="iqraClassPassInput" type="text" value="${escapeHtml(defaultPass)}" placeholder="Password"
                style="width: 100%; box-sizing: border-box; padding: 8px 8px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 12.5px; font-weight: 700; color: #0f172a; outline: none;" />
              <button id="btnRegenClassPass" type="button" title="Generate Password" style="padding: 0 8px; border: 1px solid #cbd5e1; background: #f1f5f9; border-radius: 9px; color: #334155; cursor: pointer;">
                <i class="fa-solid fa-rotate"></i>
              </button>
            </div>
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 10px; margin-bottom: 14px;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px;">Custom Student Invite Link</div>
          <div id="iqraInvitePreviewText" style="font-size: 11px; color: #0f172a; word-break: break-all; font-family: monospace;">
            ${escapeHtml(getStudentClassUrl(activeRoomSlug))}
          </div>
        </div>

        <div style="display: flex; gap: 9px;">
          <button id="btnShareLobbyInvite" type="button" style="flex: 1; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #0284c7; background: #eff6ff; color: #0369a1; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <i class="fa-solid fa-share-nodes"></i> Share & Edit
          </button>
          <button id="btnStartHostingNow" type="button" style="flex: 1.4; padding: 10px 14px; border-radius: 10px; border: none; background: #16a34a; color: #ffffff; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <i class="fa-solid fa-play"></i> Start Hosting
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const roomInput = document.getElementById("iqraCustomRoomInput");
    const passInput = document.getElementById("iqraClassPassInput");
    const nameInput = document.getElementById("iqraHostNameInput");
    const titleInput = document.getElementById("iqraCourseTitleInput");
    const timeInput = document.getElementById("iqraClassTimeInput");
    const previewEl = document.getElementById("iqraInvitePreviewText");
    const avatarInput = document.getElementById("iqraLobbyAvatarInput");

    avatarInput.onchange = () => {
      const file = avatarInput.files && avatarInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        teacherAvatarDataUrl = reader.result;
      };
      reader.readAsDataURL(file);
    };

    roomInput.addEventListener("input", () => {
      previewEl.textContent = getStudentClassUrl(sanitizeRoomSlug(roomInput.value));
    });

    document.getElementById("btnGenerateNewRoomSlug").onclick = () => {
      const rand = Math.floor(1000 + Math.random() * 9000);
      roomInput.value = `iqra-class-${rand}`;
      previewEl.textContent = getStudentClassUrl(roomInput.value);
    };

    document.getElementById("btnRegenClassPass").onclick = () => {
      passInput.value = generateRandomPassword();
    };

    document.getElementById("closeLiveLobbyModal").onclick = () => modal.remove();

    document.getElementById("btnShareLobbyInvite").onclick = () => {
      const slug = sanitizeRoomSlug(roomInput.value);
      const passVal = String(passInput.value || "").trim();
      teacherDisplayName = (nameInput.value || "").trim() || "Teacher";
      courseTitle = (titleInput.value || "").trim() || "Live Session";
      classScheduleTime = (timeInput.value || "").trim() || "Today at 8:00 PM IST";
      openYouTubeStyleShareModal(slug, passVal);
    };

    document.getElementById("btnStartHostingNow").onclick = () => {
      const passVal = String(passInput.value || "").trim();
      if (!passVal) {
        showLiveToast("Please enter a Class Password so unauthorized users cannot join.");
        passInput.focus();
        return;
      }
      activeRoomSlug = sanitizeRoomSlug(roomInput.value);
      classPassword = passVal;
      teacherDisplayName = (nameInput.value || "").trim() || "Teacher";
      courseTitle = (titleInput.value || "").trim() || "Live Session";
      classScheduleTime = (timeInput.value || "").trim() || "Today at 8:00 PM IST";
      modal.remove();
      launchTeacherBroadcastPanel();
    };
  }

  async function launchTeacherBroadcastPanel() {
    isHostingActive = true;
    enableHostWakeLock();

    const hostInitials = getInitials(teacherDisplayName);

    const container = document.createElement("div");
    container.id = "iqraLiveClassPanel";
    container.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 16px;
      width: 600px;
      height: 380px;
      max-width: 100vw;
      max-height: 100vh;
      background: #0f172a;
      border: 1.5px solid #334155;
      border-radius: 16px;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.48);
      z-index: 999990;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: system-ui, -apple-system, sans-serif;
      transition: transform 0.25s ease, opacity 0.25s ease;
      resize: both;
    `;

    container.innerHTML = `
      <!-- Top Branded Header -->
      <div id="iqraLiveClassHeader" style="
        background: #1e293b; color: #f8fafc; padding: 8px 12px;
        display: flex; align-items: center; justify-content: space-between;
        cursor: move; user-select: none; border-bottom: 1px solid #334155; gap: 8px;
      ">
        <div style="display: flex; align-items: center; gap: 9px; min-width: 0;">
          <div style="width: 30px; height: 30px; border-radius: 50%; background: #0284c7; color: #fff; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; border: 1.5px solid #38bdf8;">
            ${teacherAvatarDataUrl ? `<img id="iqraHostHeaderAvatar" src="${teacherAvatarDataUrl}" style="width:100%;height:100%;object-fit:cover;" />` : escapeHtml(hostInitials)}
          </div>
          <div style="min-width: 0;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: #22c55e; flex-shrink: 0;"></span>
              <span style="font-size: 12.5px; font-weight: 800; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ACADEMY_NAME}</span>
              <span id="iqraStudentCountBadge" style="background: #0f172a; color: #38bdf8; border: 1px solid #334155; padding: 1px 7px; border-radius: 999px; font-size: 10px; font-weight: 700; flex-shrink: 0;">
                0 Students
              </span>
            </div>
            <div style="font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHtml(courseTitle)}
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 5px; flex-shrink: 0;">
          <button id="btnShareClassFromHeader" type="button" title="Share Classroom Invitation" style="
            background: #0284c7; color: #fff; border: none; border-radius: 7px;
            padding: 4px 9px; font-size: 11px; font-weight: 600; cursor: pointer;
            display: inline-flex; align-items: center; gap: 4px;
          "><i class="fa-solid fa-share-nodes"></i> Share</button>

          <button id="btnToggleHostSidePanel" type="button" title="Show/Hide Students & Messages" style="
            background: #334155; color: #fff; border: none; border-radius: 7px;
            width: 25px; height: 25px; font-size: 11px; cursor: pointer;
          "><i class="fa-solid fa-table-columns"></i></button>

          <button id="btnFullSizeLiveClass" type="button" title="Full Screen / Restore" style="
            background: #334155; color: #fff; border: none; border-radius: 7px;
            width: 25px; height: 25px; font-size: 11px; cursor: pointer;
          "><i class="fa-solid fa-expand"></i></button>

          <button id="btnWallMinLiveClass" type="button" title="Minimize to Left Wall" style="
            background: #334155; color: #fff; border: none; border-radius: 7px;
            width: 25px; height: 25px; font-size: 11px; cursor: pointer;
          "><i class="fa-solid fa-angles-left"></i></button>

          <button id="btnCloseLiveClass" type="button" title="Leave or End Live Class" style="
            background: #dc2626; color: #fff; border: none; border-radius: 7px;
            width: 25px; height: 25px; font-size: 11px; cursor: pointer;
          ">✕</button>
        </div>
      </div>

      <!-- Main Stage + Right Participants/Chat Panel -->
      <div style="flex: 1; display: flex; overflow: hidden; background: #020617;">
        <div id="iqraLiveFrameWrap" style="position: relative; flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 0;">
          <div style="width: 100%; height: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #000000; position: relative;">
            <video id="iqraTeacherPreviewVideo" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: contain; display: none; background: #000;"></video>
            <div id="iqraTeacherPlaceholder" style="display: flex; flex-direction: column; align-items: center; text-align: center; color: #94a3b8; padding: 16px;"></div>

            <!-- Movable & Minimizable Round Student Bubble -->
            <div id="iqraHostRoundStudentBubble" style="
              display: none; position: absolute; bottom: 12px; right: 12px;
              width: 108px; height: 108px; border-radius: 50%;
              border: 2.5px solid #22c55e; background: #0f172a;
              box-shadow: 0 8px 24px rgba(0,0,0,0.6);
              overflow: hidden; z-index: 35; cursor: grab; touch-action: none;
              align-items: center; justify-content: center; flex-direction: column;
            ">
              <video id="iqraHostRoundStudentVid" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover; display: none;"></video>
              <div id="iqraHostRoundStudentInitials" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 22px; background: #0284c7;">ST</div>
              <div id="iqraHostRoundStudentName" style="position: absolute; bottom: 8px; left: 8px; right: 8px; text-align: center; font-size: 9.5px; font-weight: 700; color: #fff; background: rgba(15,23,42,0.78); border-radius: 6px; padding: 1px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Student</div>
              <button id="btnMinHostRoundBubble" type="button" title="Minimize / Expand Student Bubble" style="
                position: absolute; top: 4px; right: 4px; width: 18px; height: 18px;
                border-radius: 50%; border: none; background: rgba(15,23,42,0.85);
                color: #f8fafc; font-size: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center;
              ">—</button>
            </div>
          </div>
        </div>

        <!-- Right Panel: Students List & Messages -->
        <div id="iqraHostRightSidePanel" style="width: 245px; max-width: 50%; background: #0f172a; border-left: 1px solid #334155; display: flex; flex-direction: column;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #334155; background: #1e293b;">
            <button id="tabHostParticipants" type="button" style="padding: 7px 6px; border: none; background: #0f172a; color: #38bdf8; font-size: 11px; font-weight: 700; cursor: pointer; border-bottom: 2px solid #38bdf8;">
              Students
            </button>
            <button id="tabHostChat" type="button" style="position: relative; padding: 7px 6px; border: none; background: transparent; color: #94a3b8; font-size: 11px; font-weight: 700; cursor: pointer;">
              Messages
              <span id="iqraChatUnreadBadge" style="display: none; margin-left: 4px; background: #ef4444; color: #fff; font-size: 9px; font-weight: 700; min-width: 14px; height: 14px; border-radius: 999px; align-items: center; justify-content: center; padding: 0 3px;">0</span>
            </button>
          </div>

          <div id="iqraHostParticipantsList" style="flex: 1; overflow-y: auto; padding: 8px;"></div>

          <div id="iqraHostChatTabWrap" style="display: none; flex: 1; flex-direction: column; overflow: hidden;">
            <div id="iqraLiveChatMessages" style="flex: 1; overflow-y: auto; padding: 8px;"></div>
            <div style="padding: 6px; border-top: 1px solid #1e293b; display: flex; gap: 4px;">
              <input id="iqraTeacherChatInput" type="text" placeholder="Message students..." style="
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
      </div>

      <!-- Bottom Controls Bar -->
      <div style="background: #1e293b; padding: 7px 10px; display: flex; align-items: center; justify-content: center; gap: 7px; border-top: 1px solid #334155;">
        <button id="btnToggleMic" type="button" style="background: #dc2626; color: #ffffff; border: none; border-radius: 8px; padding: 5px 10px; font-size: 11.5px; font-weight: 700; cursor: pointer;">
          <i class="fa-solid fa-microphone-slash"></i> Mic Off
        </button>
        <button id="btnToggleCam" type="button" style="background: #dc2626; color: #ffffff; border: none; border-radius: 8px; padding: 5px 10px; font-size: 11.5px; font-weight: 700; cursor: pointer;">
          <i class="fa-solid fa-video-slash"></i> Cam Off
        </button>
        <button id="btnShareBoardScreen" type="button" style="background: #0284c7; color: #ffffff; border: none; border-radius: 8px; padding: 5px 11px; font-size: 11.5px; font-weight: 700; cursor: pointer;">
          <i class="fa-solid fa-display"></i> Share Screen
        </button>
        <button id="btnHostDeviceSettings" type="button" title="Audio, Video & Profile Settings" style="background: #334155; color: #f8fafc; border: none; border-radius: 8px; padding: 5px 9px; font-size: 11.5px; font-weight: 600; cursor: pointer;">
          <i class="fa-solid fa-gear"></i>
        </button>
      </div>
    `;

    document.body.appendChild(container);
    makeElementDraggable(container, document.getElementById("iqraLiveClassHeader"));
    initHostRoundBubbleDragAndMin();
    renderHostParticipantsList();
    refreshHostStagePreview();

    if (!classPeer || classPeer.destroyed) {
      classPeer = new Peer(activeRoomSlug);

      classPeer.on("open", () => {
        appendChatMessage("System", `${ACADEMY_NAME} — "${courseTitle}" is live (Password Protected).`, false, true);
        showLiveToast(`Hosting started: ${courseTitle}`);
      });

      classPeer.on("error", (err) => {
        if (err && err.type === "unavailable-id") {
          showLiveToast("This Class ID is already active. Please choose another ID.");
          cleanupTeacherSession(true);
          openHostLobbyModal();
        }
      });

      classPeer.on("call", (incomingCall) => {
        // Reject media call if peer has not passed password gate
        if (!connectedStudents.has(incomingCall.peer)) {
          try { incomingCall.close(); } catch (e) {}
          return;
        }
        incomingCall.answer();
        incomingCall.on("stream", (studentStream) => {
          const entry = connectedStudents.get(incomingCall.peer);
          if (entry) {
            entry.incomingStream = studentStream;
            renderHostParticipantsList();
            refreshHostStagePreview();
          }
        });
      });

      classPeer.on("connection", (conn) => {
        conn.on("data", (data) => {
          if (!data) return;

          // Password verification gate before allowing entry
          if (data.type === "student-hello") {
            const incomingPass = String(data.password || "").trim();
            if (classPassword && incomingPass !== classPassword) {
              try {
                conn.send({
                  type: "auth-rejected",
                  reason: "Wrong classroom password. Access denied by teacher."
                });
              } catch (e) {}
              setTimeout(() => {
                try { conn.close(); } catch (e) {}
              }, 250);
              return;
            }

            try {
              conn.send({ type: "auth-accepted" });
            } catch (e) {}

            const sName = (data.name || "Student").trim();
            connectedStudents.set(conn.peer, {
              conn,
              mediaCall: null,
              roundCamCall: null,
              incomingStream: null,
              name: sName,
              micOn: Boolean(data.micOn),
              camOn: Boolean(data.camOn),
              micLocked: false,
              camLocked: false
            });

            updateStudentCountBadge();
            renderHostParticipantsList();
            refreshHostStagePreview();
            syncRosterToAllStudents();

            conn.send({
              type: "class-meta",
              academyName: ACADEMY_NAME,
              courseTitle,
              teacherName: teacherDisplayName,
              teacherAvatar: teacherAvatarDataUrl
            });
            conn.send({ type: "chat-history", history: chatHistory.slice(-30) });

            const stream = getActiveBroadcastStream();
            const sharing = isScreenSharingActive();
            const hasActiveVideo = Boolean(stream && stream.getVideoTracks().length > 0);
            conn.send({ type: "host-stage-state", hasActiveVideo, teacherName: teacherDisplayName });

            if (stream) {
              const call = classPeer.call(conn.peer, stream, {
                metadata: { streamRole: sharing ? "screen-share" : "host-cam" }
              });
              const entry = connectedStudents.get(conn.peer);
              if (entry) entry.mediaCall = call;
            }
            if (sharing && !isCamOff && processedVideoStream && processedVideoStream.getVideoTracks().length > 0) {
              const rCall = classPeer.call(conn.peer, processedVideoStream, {
                metadata: { streamRole: "host-round-cam" }
              });
              const entry = connectedStudents.get(conn.peer);
              if (entry) entry.roundCamCall = rCall;
            }

            appendChatMessage("System", `${sName} joined the class.`, false, true);
            broadcastToAllStudents({ type: "system-msg", text: `${sName} joined the class.` });
            showLiveToast(`${sName} joined the live class.`);
            return;
          }

          const entry = connectedStudents.get(conn.peer);
          if (!entry) return;

          if (data.type === "student-media-state") {
            entry.micOn = Boolean(data.micOn);
            entry.camOn = Boolean(data.camOn);
            renderHostParticipantsList();
            refreshHostStagePreview();
            syncRosterToAllStudents();
          } else if (data.type === "student-speaking") {
            if (data.speaking) {
              activeSpeakingStudentId = conn.peer;
              updateHostRoundStudentBubble();
            }
          } else if (data.type === "chat-message") {
            const sender = entry.name || data.sender || "Student";
            appendChatMessage(sender, data.text, false, false);
            broadcastToAllStudents({ type: "chat-message", sender, text: data.text });
          } else if (data.type === "raise-hand") {
            const sender = entry.name || data.studentName || "Student";
            appendChatMessage("System", `✋ ${sender} raised their hand.`, false, true);
            showLiveToast(`✋ ${sender} raised their hand!`);
          } else if (data.type === "request-stream") {
            broadcastStreamToAllStudents();
          }
        });

        conn.on("close", () => {
          const entry = connectedStudents.get(conn.peer);
          if (!entry) return;
          const leftName = entry.name || "Student";
          connectedStudents.delete(conn.peer);
          if (hostStageTargetId === conn.peer) hostStageTargetId = "auto";
          if (activeSpeakingStudentId === conn.peer) activeSpeakingStudentId = null;
          updateStudentCountBadge();
          renderHostParticipantsList();
          syncRosterToAllStudents();
          refreshHostStagePreview();
          appendChatMessage("System", `${leftName} left the class.`, false, true);
        });
      });
    } else {
      updateStudentCountBadge();
      renderHostParticipantsList();
      refreshHostStagePreview();
      broadcastToAllStudents({
        type: "class-meta",
        academyName: ACADEMY_NAME,
        courseTitle,
        teacherName: teacherDisplayName,
        teacherAvatar: teacherAvatarDataUrl
      });
    }

    await acquireHostMedia(selectedMicId, selectedCamId);

    document.getElementById("btnShareClassFromHeader").onclick = () => {
      openYouTubeStyleShareModal(activeRoomSlug, classPassword);
    };

    document.getElementById("btnWallMinLiveClass").onclick = () => toggleLeftWallMinimize(true);

    const fullBtn = document.getElementById("btnFullSizeLiveClass");
    fullBtn.onclick = () => {
      isFullSizePanel = !isFullSizePanel;
      if (isFullSizePanel) {
        container.dataset.prevRect = JSON.stringify({
          top: container.style.top,
          left: container.style.left,
          bottom: container.style.bottom,
          width: container.style.width,
          height: container.style.height
        });
        container.style.top = "0px";
        container.style.left = "0px";
        container.style.right = "0px";
        container.style.bottom = "0px";
        container.style.width = "100vw";
        container.style.height = "100dvh";
        container.style.borderRadius = "0px";
        container.style.border = "none";
        container.style.resize = "none";
        fullBtn.innerHTML = `<i class="fa-solid fa-compress"></i>`;
      } else {
        const prev = JSON.parse(container.dataset.prevRect || "{}");
        container.style.top = prev.top || "auto";
        container.style.left = prev.left || "16px";
        container.style.right = "auto";
        container.style.bottom = prev.bottom || "16px";
        container.style.width = prev.width || "600px";
        container.style.height = prev.height || "380px";
        container.style.borderRadius = "16px";
        container.style.border = "1.5px solid #334155";
        container.style.resize = "both";
        fullBtn.innerHTML = `<i class="fa-solid fa-expand"></i>`;
      }
    };

    const rightPanel = document.getElementById("iqraHostRightSidePanel");
    document.getElementById("btnToggleHostSidePanel").onclick = () => {
      isHostSidePanelOpen = !isHostSidePanelOpen;
      rightPanel.style.display = isHostSidePanelOpen ? "flex" : "none";
      updateUnreadBadge();
    };

    const tabParticipants = document.getElementById("tabHostParticipants");
    const tabChat = document.getElementById("tabHostChat");
    const listParticipants = document.getElementById("iqraHostParticipantsList");
    const wrapChat = document.getElementById("iqraHostChatTabWrap");

    tabParticipants.onclick = () => {
      activeHostTab = "participants";
      tabParticipants.style.background = "#0f172a";
      tabParticipants.style.color = "#38bdf8";
      tabParticipants.style.borderBottom = "2px solid #38bdf8";
      tabChat.style.background = "transparent";
      tabChat.style.color = "#94a3b8";
      tabChat.style.borderBottom = "none";
      listParticipants.style.display = "block";
      wrapChat.style.display = "none";
    };

    tabChat.onclick = () => {
      activeHostTab = "chat";
      tabChat.style.background = "#0f172a";
      tabChat.style.color = "#38bdf8";
      tabChat.style.borderBottom = "2px solid #38bdf8";
      tabParticipants.style.background = "transparent";
      tabParticipants.style.color = "#94a3b8";
      tabParticipants.style.borderBottom = "none";
      listParticipants.style.display = "none";
      wrapChat.style.display = "flex";
      unreadMessages = 0;
      updateUnreadBadge();
    };

    const chatInput = document.getElementById("iqraTeacherChatInput");
    const sendTeacherMsg = () => {
      const txt = (chatInput.value || "").trim();
      if (!txt) return;
      chatInput.value = "";
      appendChatMessage(teacherDisplayName, txt, true, false);
      broadcastToAllStudents({ type: "chat-message", sender: teacherDisplayName, text: txt });
    };
    document.getElementById("btnSendTeacherChat").onclick = sendTeacherMsg;
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendTeacherMsg();
    });

    const micBtn = document.getElementById("btnToggleMic");
    micBtn.onclick = () => {
      if (!rawMicStream || !rawMicStream.getAudioTracks().length) {
        showLiveToast("No microphone detected on this device.");
        return;
      }
      isMicMuted = !isMicMuted;
      rawMicStream.getAudioTracks().forEach((t) => { t.enabled = !isMicMuted; });
      if (mixedAudioStream) {
        mixedAudioStream.getAudioTracks().forEach((t) => { t.enabled = !isMicMuted; });
      }
      updateHostMediaButtonColors();
      syncRosterToAllStudents();
    };

    const camBtn = document.getElementById("btnToggleCam");
    camBtn.onclick = () => {
      if (!processedVideoStream || !processedVideoStream.getVideoTracks().length) {
        showLiveToast("No camera detected on this device.");
        return;
      }
      isCamOff = !isCamOff;
      processedVideoStream.getVideoTracks().forEach((t) => { t.enabled = !isCamOff; });
      updateHostMediaButtonColors();
      refreshHostStagePreview();
      broadcastStreamToAllStudents();
      syncRosterToAllStudents();
    };

    const shareBtn = document.getElementById("btnShareBoardScreen");
    shareBtn.onclick = async () => {
      if (isScreenSharingActive()) {
        stopBoardSharingStreams();
        shareBtn.innerHTML = `<i class="fa-solid fa-display"></i> Share Screen`;
        shareBtn.style.background = "#0284c7";
        refreshHostStagePreview();
        broadcastStreamToAllStudents();
        showLiveToast("Screen sharing stopped.");
        return;
      }

      if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === "function") {
        let captured = false;
        try {
          localScreenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          });
          captured = true;
        } catch (err1) {
          if (err1 && err1.name === "NotAllowedError") return;
          try {
            localScreenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            captured = true;
          } catch (err2) {
            if (err2 && err2.name === "NotAllowedError") return;
          }
        }

        if (captured && localScreenStream) {
          const track = localScreenStream.getVideoTracks()[0];
          if (track) {
            track.onended = () => {
              stopBoardSharingStreams();
              shareBtn.innerHTML = `<i class="fa-solid fa-display"></i> Share Screen`;
              shareBtn.style.background = "#0284c7";
              refreshHostStagePreview();
              broadcastStreamToAllStudents();
            };
          }
          rebuildMixedAudioStream();
          shareBtn.innerHTML = `<i class="fa-solid fa-stop"></i> Stop Share`;
          shareBtn.style.background = "#16a34a";
          refreshHostStagePreview();
          broadcastStreamToAllStudents();
          showLiveToast("Entire screen sharing active.");
          return;
        }
      }

      canvasFallbackStream = createLowLagBoardCanvasStream();
      shareBtn.innerHTML = `<i class="fa-solid fa-stop"></i> Stop Share`;
      shareBtn.style.background = "#16a34a";
      refreshHostStagePreview();
      broadcastStreamToAllStudents();
      showLiveToast("Broadcasting whiteboard & PDF live.");
    };

    document.getElementById("btnHostDeviceSettings").onclick = openHostDeviceSettingsModal;

    document.getElementById("btnCloseLiveClass").onclick = () => {
      askHostExitOptions(
        () => {
          cleanupTeacherSession(false);
          showLiveToast("You left the classroom. Students remain connected.");
        },
        () => {
          cleanupTeacherSession(true);
          showLiveToast("Live Class ended for all participants.");
        }
      );
    };
  }

  function initHostRoundBubbleDragAndMin() {
    const bubble = document.getElementById("iqraHostRoundStudentBubble");
    const minBtn = document.getElementById("btnMinHostRoundBubble");
    if (!bubble || !minBtn) return;

    minBtn.onclick = (e) => {
      e.stopPropagation();
      isHostRoundBubbleMinimized = !isHostRoundBubbleMinimized;
      minBtn.textContent = isHostRoundBubbleMinimized ? "+" : "—";
      updateHostRoundStudentBubble();
    };

    let dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
    bubble.addEventListener("pointerdown", (e) => {
      if (e.target === minBtn) return;
      e.preventDefault();
      dragging = true;
      bubble.style.cursor = "grabbing";
      const rect = bubble.getBoundingClientRect();
      const parentRect = bubble.parentElement.getBoundingClientRect();
      origLeft = rect.left - parentRect.left;
      origTop = rect.top - parentRect.top;
      startX = e.clientX;
      startY = e.clientY;
      bubble.style.right = "auto";
      bubble.style.bottom = "auto";
      bubble.style.left = `${origLeft}px`;
      bubble.style.top = `${origTop}px`;
      try { bubble.setPointerCapture(e.pointerId); } catch (err) {}
    });

    bubble.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const parentRect = bubble.parentElement.getBoundingClientRect();
      const maxLeft = Math.max(0, parentRect.width - bubble.offsetWidth);
      const maxTop = Math.max(0, parentRect.height - bubble.offsetHeight);
      bubble.style.left = `${Math.max(0, Math.min(maxLeft, origLeft + (e.clientX - startX)))}px`;
      bubble.style.top = `${Math.max(0, Math.min(maxTop, origTop + (e.clientY - startY)))}px`;
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      bubble.style.cursor = "grab";
      try { bubble.releasePointerCapture(e.pointerId); } catch (err) {}
    };
    bubble.addEventListener("pointerup", endDrag);
    bubble.addEventListener("pointercancel", endDrag);
  }

  function makeElementDraggable(el, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      if (isFullSizePanel) return;
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
  });
})();
// ========================================================
// IQRA SMARTCLASS SUITE - LIVE CLASS AUDIO ENGINE (Part 1 of 3)
// Speaker / Headphone Mode Detection, Output Routing & Gain Control
// ========================================================
(function (window) {
  "use strict";

  const AUDIO_PREFS_STORAGE_KEY = "iqra_live_audio_prefs_v1";

  const state = {
    mode: "speaker",          // "speaker" | "headphone"
    volumePercent: 100,       // 0 to 150
    muted: false,
    lastNonZeroVolume: 100,
    audioCtx: null,
    mediaGraphMap: new WeakMap(),
    devices: {
      speakers: [],
      headphones: [],
      hasExternalHeadset: false,
    },
  };

  function loadSavedAudioPrefs() {
    try {
      const raw = localStorage.getItem(AUDIO_PREFS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.mode === "speaker" || parsed.mode === "headphone") {
        state.mode = parsed.mode;
      }
      if (typeof parsed.volumePercent === "number") {
        state.volumePercent = Math.max(0, Math.min(150, Math.round(parsed.volumePercent)));
        if (state.volumePercent > 0) state.lastNonZeroVolume = state.volumePercent;
      }
      if (typeof parsed.muted === "boolean") {
        state.muted = parsed.muted;
      }
    } catch (_) {}
  }

  function saveAudioPrefs() {
    try {
      localStorage.setItem(
        AUDIO_PREFS_STORAGE_KEY,
        JSON.stringify({
          mode: state.mode,
          volumePercent: state.volumePercent,
          muted: state.muted,
        })
      );
    } catch (_) {}
  }

  function ensureAudioContext() {
    if (state.audioCtx) {
      if (state.audioCtx.state === "suspended") {
        state.audioCtx.resume().catch(() => {});
      }
      return state.audioCtx;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    try {
      state.audioCtx = new AudioCtx();
      if (state.audioCtx.state === "suspended") {
        state.audioCtx.resume().catch(() => {});
      }
      return state.audioCtx;
    } catch (_) {
      return null;
    }
  }

  function classifyAudioOutputs(deviceList) {
    const speakers = [];
    const headphones = [];
    let hasExternalHeadset = false;

    const headsetKeywords = [
      "headphone", "headset", "earphone", "earbud", "airpod",
      "buds", "bluetooth", "handsfree", "hands-free", "wired", "usb", "tws"
    ];
    const speakerKeywords = [
      "speaker", "loudspeaker", "hands-free speaker", "built-in", "default"
    ];

    (deviceList || []).forEach((dev) => {
      if (!dev || dev.kind !== "audiooutput") return;
      const label = (dev.label || "").toLowerCase();

      const isHeadset = headsetKeywords.some((kw) => label.includes(kw));
      const isSpeaker = speakerKeywords.some((kw) => label.includes(kw));

      if (isHeadset) {
        headphones.push(dev);
        hasExternalHeadset = true;
      } else if (isSpeaker || dev.deviceId === "default" || dev.deviceId === "communications") {
        speakers.push(dev);
      } else {
        speakers.push(dev);
      }
    });

    state.devices = { speakers, headphones, hasExternalHeadset };
    return state.devices;
  }

  async function refreshAudioOutputDevices() {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== "function") {
      return state.devices;
    }
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      return classifyAudioOutputs(allDevices);
    } catch (_) {
      return state.devices;
    }
  }

  function pickTargetDeviceId(targetMode) {
    const { speakers, headphones, hasExternalHeadset } = state.devices;

    if (targetMode === "headphone") {
      if (headphones.length > 0) return headphones[0].deviceId;
      return hasExternalHeadset ? "default" : "";
    }

    // Speaker mode: prefer explicit loudspeaker / default output
    const loud = speakers.find((d) => (d.label || "").toLowerCase().includes("speaker"));
    if (loud) return loud.deviceId;
    const def = speakers.find((d) => d.deviceId === "default");
    if (def) return def.deviceId;
    return speakers[0] ? speakers[0].deviceId : "";
  }

  function getEffectiveGainValue() {
    if (state.muted || state.volumePercent <= 0) return 0;
    // 100% -> 1.0 gain; up to 150% -> 1.5x clean boost via compressor/gain
    return state.volumePercent / 100;
  }

  function attachGainNodeToMediaElement(el) {
    if (!el || state.mediaGraphMap.has(el)) return state.mediaGraphMap.get(el) || null;
    const ctx = ensureAudioContext();
    if (!ctx) return null;

    try {
      const source = ctx.createMediaElementSource(el);
      const gainNode = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 18;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.15;

      gainNode.gain.value = getEffectiveGainValue();

      source.connect(gainNode);
      gainNode.connect(compressor);
      compressor.connect(ctx.destination);

      const bundle = { source, gainNode, compressor };
      state.mediaGraphMap.set(el, bundle);
      return bundle;
    } catch (_) {
      return null;
    }
  }

  async function applyAudioRoutingAndVolumeToElement(el) {
    if (!el) return;

    const gainVal = getEffectiveGainValue();
    // Standard element volume capped at 1.0; >100% boost handled via Web Audio GainNode
    el.muted = state.muted || state.volumePercent <= 0;
    el.volume = Math.max(0, Math.min(1, gainVal));

    if (typeof el.play === "function" && el.srcObject) {
      const bundle = attachGainNodeToMediaElement(el);
      if (bundle && bundle.gainNode && state.audioCtx) {
        bundle.gainNode.gain.setTargetAtTime(gainVal, state.audioCtx.currentTime, 0.02);
      }
    }

    const deviceId = pickTargetDeviceId(state.mode);
    if (deviceId && typeof el.setSinkId === "function") {
      try {
        await el.setSinkId(deviceId);
      } catch (_) {}
    }
  }

  async function applyAudioSettingsToAllMedia() {
    await refreshAudioOutputDevices();
    const elements = Array.from(document.querySelectorAll("audio, video"));
    await Promise.all(elements.map((el) => applyAudioRoutingAndVolumeToElement(el)));

    if (typeof window.onIqraAudioStateChanged === "function") {
      window.onIqraAudioStateChanged({
        mode: state.mode,
        volumePercent: state.volumePercent,
        muted: state.muted,
        devices: state.devices,
      });
    }
  }

  loadSavedAudioPrefs();

  window.IqraLiveAudioEngine = {
    getState: () => ({ ...state, devices: { ...state.devices } }),
    setMode: async (newMode) => {
      if (newMode !== "speaker" && newMode !== "headphone") return;
      state.mode = newMode;
      ensureAudioContext();
      saveAudioPrefs();
      await applyAudioSettingsToAllMedia();
    },
    setVolume: async (vol) => {
      const clamped = Math.max(0, Math.min(150, Math.round(Number(vol) || 0)));
      state.volumePercent = clamped;
      if (clamped > 0) {
        state.muted = false;
        state.lastNonZeroVolume = clamped;
      } else {
        state.muted = true;
      }
      ensureAudioContext();
      saveAudioPrefs();
      await applyAudioSettingsToAllMedia();
    },
    toggleMute: async () => {
      if (state.muted || state.volumePercent === 0) {
        state.muted = false;
        state.volumePercent = state.lastNonZeroVolume > 0 ? state.lastNonZeroVolume : 100;
      } else {
        state.lastNonZeroVolume = state.volumePercent;
        state.muted = true;
      }
      ensureAudioContext();
      saveAudioPrefs();
      await applyAudioSettingsToAllMedia();
    },
    refreshDevices: refreshAudioOutputDevices,
    applyToElement: applyAudioRoutingAndVolumeToElement,
    applyAll: applyAudioSettingsToAllMedia,
  };
})(window);
// ========================================================
// IQRA SMARTCLASS SUITE - LIVE CLASS AUDIO UI BINDINGS (Part 2 of 3)
// Connects Top Bar Speaker/Headphone Buttons & Volume Slider to Engine
// ========================================================
(function (window, document) {
  "use strict";

  function getUiElements() {
    return {
      bar: document.getElementById("iqraLiveAudioBar"),
      btnSpeaker: document.getElementById("btnAudioSpeakerMode"),
      btnHeadphone: document.getElementById("btnAudioHeadphoneMode"),
      btnMute: document.getElementById("btnAudioMuteToggle"),
      volIcon: document.getElementById("iqraAudioVolumeIcon"),
      volSlider: document.getElementById("iqraLiveVolumeSlider"),
      volText: document.getElementById("iqraLiveVolumeValue"),
      statusBadge: document.getElementById("iqraAudioDeviceStatus"),
    };
  }

  function updateVolumeIcon(iconEl, volPercent, muted) {
    if (!iconEl) return;
    iconEl.classList.remove("fa-volume-xmark", "fa-volume-off", "fa-volume-low", "fa-volume-high");
    if (muted || volPercent <= 0) {
      iconEl.classList.add("fa-volume-xmark");
    } else if (volPercent < 40) {
      iconEl.classList.add("fa-volume-low");
    } else {
      iconEl.classList.add("fa-volume-high");
    }
  }

  function syncAudioBarUi(snapshot) {
    const engine = window.IqraLiveAudioEngine;
    const st = snapshot || (engine ? engine.getState() : null);
    if (!st) return;

    const ui = getUiElements();
    const isSpeaker = st.mode === "speaker";

    if (ui.btnSpeaker) ui.btnSpeaker.classList.toggle("active", isSpeaker);
    if (ui.btnHeadphone) ui.btnHeadphone.classList.toggle("active", !isSpeaker);

    const displayVol = st.muted ? 0 : st.volumePercent;
    if (ui.volSlider) ui.volSlider.value = String(displayVol);
    if (ui.volText) ui.volText.textContent = `${displayVol}%`;
    updateVolumeIcon(ui.volIcon, displayVol, st.muted);

    if (ui.statusBadge) {
      if (st.muted || displayVol === 0) {
        ui.statusBadge.textContent = "Muted";
      } else if (isSpeaker) {
        ui.statusBadge.textContent = "Speaker Active";
      } else {
        const hasHeadset = st.devices && st.devices.hasExternalHeadset;
        ui.statusBadge.textContent = hasHeadset ? "Headphone Active" : "Headphone / Earpiece";
      }
    }
  }

  function bindAudioBarEvents() {
    const engine = window.IqraLiveAudioEngine;
    if (!engine) return;

    const ui = getUiElements();

    ui.btnSpeaker?.addEventListener("click", async () => {
      await engine.setMode("speaker");
      syncAudioBarUi(engine.getState());
    });

    ui.btnHeadphone?.addEventListener("click", async () => {
      await engine.setMode("headphone");
      syncAudioBarUi(engine.getState());
    });

    ui.btnMute?.addEventListener("click", async () => {
      await engine.toggleMute();
      syncAudioBarUi(engine.getState());
    });

    ui.volSlider?.addEventListener("input", async (e) => {
      const nextVal = Number(e.target.value);
      if (ui.volText) ui.volText.textContent = `${nextVal}%`;
      updateVolumeIcon(ui.volIcon, nextVal, nextVal === 0);
      await engine.setVolume(nextVal);
    });

    window.onIqraAudioStateChanged = (snap) => {
      syncAudioBarUi(snap);
    };

    syncAudioBarUi(engine.getState());
    engine.applyAll().then(() => syncAudioBarUi(engine.getState()));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindAudioBarEvents);
  } else {
    bindAudioBarEvents();
  }

  window.syncIqraLiveAudioBarUi = syncAudioBarUi;
})(window, document);
// ========================================================
// IQRA SMARTCLASS SUITE - LIVE CLASS STREAM WATCHER (Part 3 of 3)
// Watches New Audio/Video Elements, Headset Plug/Unplug & Touch Unlock
// ========================================================
(function (window, document) {
  "use strict";

  function attachToElementWhenReady(el) {
    const engine = window.IqraLiveAudioEngine;
    if (!engine || !el) return;
    if (el.tagName !== "AUDIO" && el.tagName !== "VIDEO") return;

    engine.applyToElement(el);

    if (!el._iqraAudioBound) {
      el._iqraAudioBound = true;
      el.addEventListener("loadedmetadata", () => engine.applyToElement(el));
      el.addEventListener("canplay", () => engine.applyToElement(el));
      el.addEventListener("play", () => engine.applyToElement(el));
    }
  }

  function scanExistingMediaElements() {
    document.querySelectorAll("audio, video").forEach((el) => {
      attachToElementWhenReady(el);
    });
  }

  function watchDomForNewMedia() {
    if (!document.body || typeof MutationObserver === "undefined") return;

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!node || node.nodeType !== 1) continue;
          if (node.tagName === "AUDIO" || node.tagName === "VIDEO") {
            attachToElementWhenReady(node);
          } else if (typeof node.querySelectorAll === "function") {
            node.querySelectorAll("audio, video").forEach((child) => {
              attachToElementWhenReady(child);
            });
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function watchDeviceChanges() {
    const engine = window.IqraLiveAudioEngine;
    if (!engine || !navigator.mediaDevices) return;

    if (typeof navigator.mediaDevices.addEventListener === "function") {
      navigator.mediaDevices.addEventListener("devicechange", () => {
        engine.applyAll();
      });
    } else if ("ondevicechange" in navigator.mediaDevices) {
      navigator.mediaDevices.ondevicechange = () => {
        engine.applyAll();
      };
    }
  }

  function bindFirstUserGestureUnlock() {
    const unlock = () => {
      const engine = window.IqraLiveAudioEngine;
      if (engine) {
        engine.applyAll();
      }
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("touchstart", unlock, true);
      document.removeEventListener("keydown", unlock, true);
    };

    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("touchstart", unlock, true);
    document.addEventListener("keydown", unlock, true);
  }

  function initLiveAudioWatcher() {
    scanExistingMediaElements();
    watchDomForNewMedia();
    watchDeviceChanges();
    bindFirstUserGestureUnlock();

    window.IqraAttachLiveAudioElement = attachToElementWhenReady;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLiveAudioWatcher);
  } else {
    initLiveAudioWatcher();
  }
})(window, document);