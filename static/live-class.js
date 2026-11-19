/* ==========================================================================
   IQRA ISLAMIC ACADEMY - LIVE CLASSROOM & BROADCAST SUITE
   (Full-Viewport Mode, Draggable Translucent Wall Handle, Real-Time Video
    Filters, 10 Live Voice Modulators, Host Moderation & Two-Way Chat)
   ========================================================================== */
(function () {
  const ACADEMY_NAME = "Iqra Islamic Academy";

  let classPeer = null;
  let activeRoomSlug = "iqra-live";
  let courseTitle = "Darse Nizami 1st Year";
  let teacherDisplayName = "Teacher";
  let teacherAvatarDataUrl = "";
  let isHostingActive = false;

  let rawMicStream = null;
  let rawCamStream = null;
  let processedVideoStream = null;
  let processedAudioStream = null;

  let localScreenStream = null;
  let canvasFallbackStream = null;
  let canvasBroadcastTimer = null;
  let videoFilterLoopId = null;

  let audioCtx = null;
  let audioDestNode = null;

  let selectedMicId = "";
  let selectedCamId = "";
  let selectedVideoFilter = "none";
  let selectedVoicePreset = "natural";

  let isMicMuted = false;
  let isCamOff = false;
  let isWallMinimized = false;
  let isFullSizePanel = false;
  let activeHostTab = "participants"; // "participants" | "chat"
  let isHostSidePanelOpen = true;
  let unreadMessages = 0;

  // peerId -> { conn, mediaCall, incomingStream, name, micOn, camOn, micLocked, camLocked }
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

  const VOICE_PRESETS = [
    { id: "natural", label: "1. Natural Voice (Original)" },
    { id: "deep-bass", label: "2. Deep Bass (Heavy Authority)" },
    { id: "crisp-lecture", label: "3. Crisp Lecture (Clear Vocal)" },
    { id: "warm-podcast", label: "4. Warm Radio / Podcast" },
    { id: "baritone", label: "5. Low Baritone (Deep Pitch)" },
    { id: "youthful", label: "6. Higher Pitch (Lighter Tone)" },
    { id: "bright-soft", label: "7. Soft Bright (High Tone)" },
    { id: "hall-echo", label: "8. Grand Hall / Masjid Reverb" },
    { id: "megaphone", label: "9. Classroom PA / Megaphone" },
    { id: "robotic", label: "10. Digital Modulator" }
  ];

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

  // Real-time Web Audio Voice Processor (10 Voice Presets)
  function buildProcessedAudioTrack(inputMicStream, presetId) {
    if (!inputMicStream || !inputMicStream.getAudioTracks().length) return null;

    if (audioCtx) {
      try { audioCtx.close(); } catch (e) {}
      audioCtx = null;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return inputMicStream.getAudioTracks()[0];

    audioCtx = new AudioContextClass();
    const source = audioCtx.createMediaStreamSource(inputMicStream);
    audioDestNode = audioCtx.createMediaStreamDestination();

    const lowShelf = audioCtx.createBiquadFilter();
    lowShelf.type = "lowshelf";
    lowShelf.frequency.value = 220;

    const midPeak = audioCtx.createBiquadFilter();
    midPeak.type = "peaking";
    midPeak.frequency.value = 1400;
    midPeak.Q.value = 1.2;

    const highShelf = audioCtx.createBiquadFilter();
    highShelf.type = "highshelf";
    highShelf.frequency.value = 3600;

    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.ratio.value = 4;

    // Default neutral gains
    lowShelf.gain.value = 0;
    midPeak.gain.value = 0;
    highShelf.gain.value = 0;

    let finalNode = compressor;

    if (presetId === "deep-bass") {
      lowShelf.gain.value = 14;
      midPeak.gain.value = -3;
      highShelf.gain.value = -4;
    } else if (presetId === "crisp-lecture") {
      lowShelf.gain.value = -4;
      midPeak.gain.value = 6;
      highShelf.gain.value = 9;
    } else if (presetId === "warm-podcast") {
      lowShelf.gain.value = 9;
      midPeak.gain.value = 2;
      highShelf.gain.value = 5;
    } else if (presetId === "baritone") {
      lowShelf.frequency.value = 300;
      lowShelf.gain.value = 18;
      midPeak.gain.value = -6;
      highShelf.gain.value = -9;
    } else if (presetId === "youthful") {
      lowShelf.gain.value = -14;
      midPeak.frequency.value = 2200;
      midPeak.gain.value = 9;
      highShelf.gain.value = 8;
    } else if (presetId === "bright-soft") {
      lowShelf.gain.value = -16;
      midPeak.frequency.value = 2600;
      midPeak.gain.value = 11;
      highShelf.gain.value = 12;
    } else if (presetId === "hall-echo") {
      const delay = audioCtx.createDelay();
      delay.delayTime.value = 0.16;
      const feedback = audioCtx.createGain();
      feedback.gain.value = 0.32;
      const wetGain = audioCtx.createGain();
      wetGain.gain.value = 0.45;

      compressor.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wetGain);
      wetGain.connect(audioDestNode);
    } else if (presetId === "megaphone") {
      const bandpass = audioCtx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.value = 1500;
      bandpass.Q.value = 1.8;
      compressor.connect(bandpass);
      finalNode = bandpass;
    } else if (presetId === "robotic") {
      const osc = audioCtx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = 48;
      const ringGain = audioCtx.createGain();
      ringGain.gain.value = 0.0;
      osc.connect(ringGain.gain);
      osc.start();
      compressor.connect(ringGain);
      finalNode = ringGain;
    }

    source.connect(lowShelf);
    lowShelf.connect(midPeak);
    midPeak.connect(highShelf);
    highShelf.connect(compressor);
    finalNode.connect(audioDestNode);

    const outTrack = audioDestNode.stream.getAudioTracks()[0];
    if (outTrack) outTrack.enabled = !isMicMuted;
    return outTrack;
  }

  // Real-time Filtered Video Stream (so students also see the selected Video Filter)
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

    const filteredStream = canvas.captureStream(24);
    filteredStream.getVideoTracks().forEach((t) => { t.enabled = !isCamOff; });
    return filteredStream;
  }

  // Build active broadcast stream (Screen/Board OR Filtered Camera + Processed Voice)
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
    } else if (processedVideoStream && processedVideoStream.active) {
      processedVideoStream.getVideoTracks().forEach((t) => combined.addTrack(t));
    }

    if (processedAudioStream && processedAudioStream.active) {
      processedAudioStream.getAudioTracks().forEach((t) => combined.addTrack(t));
    }

    return combined.getTracks().length > 0 ? combined : null;
  }

  // Universal Board Canvas Capture Stream (Works on EVERY Android Mobile & Tablet Browser)
  function createUniversalBoardCanvasStream() {
    if (canvasBroadcastTimer) clearInterval(canvasBroadcastTimer);

    const composite = document.createElement("canvas");
    composite.width = 1280;
    composite.height = 720;
    const ctx = composite.getContext("2d");

    const renderBoardFrame = () => {
      const vw = window.innerWidth || 1280;
      const vh = window.innerHeight || 720;
      if (composite.width !== vw || composite.height !== vh) {
        composite.width = vw;
        composite.height = vh;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, vw, vh);

      const canvases = document.querySelectorAll("canvas");
      canvases.forEach((c) => {
        if (c.id === "wbSnipPreviewCanvas") return;
        const st = window.getComputedStyle(c);
        if (st.display === "none" || st.visibility === "hidden" || c.classList.contains("hidden")) return;
        const r = c.getBoundingClientRect();
        if (r.width > 40 && r.height > 40) {
          try {
            ctx.drawImage(c, r.left, r.top, r.width, r.height);
          } catch (e) {}
        }
      });
    };

    renderBoardFrame();
    canvasBroadcastTimer = setInterval(renderBoardFrame, 65);
    return composite.captureStream(15);
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

  function renderHostParticipantsList() {
    const listEl = document.getElementById("iqraHostParticipantsList");
    if (!listEl) return;

    if (connectedStudents.size === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; color: #64748b; font-size: 12px; padding: 28px 12px;">
          <i class="fa-solid fa-users" style="font-size: 22px; margin-bottom: 8px; display: block; color: #334155;"></i>
          No students have joined yet. Share the invite link to begin.
        </div>
      `;
      return;
    }

    listEl.innerHTML = "";
    connectedStudents.forEach((student, pid) => {
      const card = document.createElement("div");
      card.style.cssText = `
        background: #1e293b; border: 1px solid #334155; border-radius: 12px;
        padding: 8px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 7px;
      `;

      const initials = getInitials(student.name);
      const bg = getAvatarColor(student.name);
      const hasLiveVideo = student.camOn && student.incomingStream && student.incomingStream.getVideoTracks().length > 0;

      card.innerHTML = `
        <div style="position: relative; width: 100%; height: 92px; border-radius: 9px; background: #0f172a; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          <video id="hostStudentVid_${pid}" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover; display: ${hasLiveVideo ? "block" : "none"};"></video>
          <div style="display: ${hasLiveVideo ? "none" : "flex"}; width: 46px; height: 46px; border-radius: 50%; background: ${bg}; color: #ffffff; font-size: 16px; font-weight: 800; letter-spacing: 1px; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            ${escapeHtml(initials)}
          </div>
          <div style="position: absolute; bottom: 5px; left: 6px; right: 6px; display: flex; align-items: center; justify-content: space-between; background: rgba(15,23,42,0.78); padding: 2px 7px; border-radius: 6px;">
            <span style="font-size: 11px; font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(student.name)}</span>
            <span style="font-size: 10px; color: ${student.micOn ? "#22c55e" : "#ef4444"};">
              <i class="fa-solid ${student.micOn ? "fa-microphone" : "fa-microphone-slash"}"></i>
            </span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px;">
          <button type="button" data-act="mute-mic" data-pid="${pid}" title="Mute Student Microphone" style="
            background: ${student.micOn ? "#334155" : "#475569"}; color: #f8fafc; border: none;
            border-radius: 6px; padding: 4px 2px; font-size: 10px; font-weight: 600; cursor: pointer;
          ">
            <i class="fa-solid fa-microphone-slash"></i> Mute
          </button>
          <button type="button" data-act="stop-cam" data-pid="${pid}" title="Turn Off Student Camera" style="
            background: ${student.camOn ? "#334155" : "#475569"}; color: #f8fafc; border: none;
            border-radius: 6px; padding: 4px 2px; font-size: 10px; font-weight: 600; cursor: pointer;
          ">
            <i class="fa-solid fa-video-slash"></i> Cam Off
          </button>
          <button type="button" data-act="toggle-lock" data-pid="${pid}" title="Disable / Enable Student Mic & Camera" style="
            background: ${(student.micLocked || student.camLocked) ? "#dc2626" : "#0f172a"};
            color: #f8fafc; border: 1px solid #334155;
            border-radius: 6px; padding: 4px 2px; font-size: 10px; font-weight: 700; cursor: pointer;
          ">
            <i class="fa-solid ${(student.micLocked || student.camLocked) ? "fa-lock" : "fa-lock-open"}"></i>
            ${(student.micLocked || student.camLocked) ? "Locked" : "Disable"}
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

        if (act === "mute-mic") {
          st.micOn = false;
          st.conn.send({ type: "host-control", action: "force-mute-mic" });
          showLiveToast(`Muted ${st.name}'s microphone.`);
        } else if (act === "stop-cam") {
          st.camOn = false;
          st.conn.send({ type: "host-control", action: "force-stop-cam" });
          showLiveToast(`Turned off ${st.name}'s camera.`);
        } else if (act === "toggle-lock") {
          const nextLock = !(st.micLocked || st.camLocked);
          st.micLocked = nextLock;
          st.camLocked = nextLock;
          if (nextLock) {
            st.micOn = false;
            st.camOn = false;
          }
          st.conn.send({
            type: "host-control",
            action: nextLock ? "lock-media" : "unlock-media"
          });
          showLiveToast(
            nextLock
              ? `Disabled microphone & camera permissions for ${st.name}.`
              : `Re-enabled microphone & camera permissions for ${st.name}.`
          );
        }
        renderHostParticipantsList();
        syncRosterToAllStudents();
      };
    });
  }

  // Acquire & Process Host Microphone (with 10 Voice Presets) and Camera (with Video Filters)
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
    }

    try {
      rawCamStream = await navigator.mediaDevices.getUserMedia({
        video: camId ? { deviceId: { exact: camId } } : true,
        audio: false
      });
    } catch (e) {
      rawCamStream = null;
    }

    if (rawMicStream) {
      const procAudioTrack = buildProcessedAudioTrack(rawMicStream, selectedVoicePreset);
      processedAudioStream = procAudioTrack ? new MediaStream([procAudioTrack]) : rawMicStream;
      processedAudioStream.getAudioTracks().forEach((t) => { t.enabled = !isMicMuted; });
    } else {
      processedAudioStream = null;
    }

    if (rawCamStream) {
      processedVideoStream = buildFilteredVideoStream(rawCamStream, selectedVideoFilter);
      if (processedVideoStream) {
        processedVideoStream.getVideoTracks().forEach((t) => { t.enabled = !isCamOff; });
      }
    } else {
      processedVideoStream = null;
    }

    refreshHostStagePreview();
    broadcastStreamToAllStudents();
    syncRosterToAllStudents();
  }

  function refreshHostStagePreview() {
    const preview = document.getElementById("iqraTeacherPreviewVideo");
    const placeholder = document.getElementById("iqraTeacherPlaceholder");
    if (!preview || !placeholder) return;

    const screenOrCanvas =
      (localScreenStream && localScreenStream.active)
        ? localScreenStream
        : (canvasFallbackStream && canvasFallbackStream.active)
          ? canvasFallbackStream
          : null;

    if (screenOrCanvas) {
      preview.srcObject = screenOrCanvas;
      preview.style.display = "block";
      placeholder.style.display = "none";
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
  }

  // Device, Video Filter, 10 Voice Filters & Profile Settings Modal
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

    const voicePresetOptions = VOICE_PRESETS.map(
      (v) => `<option value="${v.id}" ${v.id === selectedVoicePreset ? "selected" : ""}>${escapeHtml(v.label)}</option>`
    ).join("");

    modal.innerHTML = `
      <div style="background: #ffffff; width: 410px; max-width: 94vw; max-height: 90vh; overflow-y: auto; border-radius: 16px; padding: 20px; box-shadow: 0 20px 44px rgba(0,0,0,0.3); position: relative;">
        <button id="closeHostSettingsModal" type="button" style="position: absolute; top: 12px; right: 12px; width: 28px; height: 28px; border-radius: 50%; border: none; background: #f1f5f9; color: #475569; cursor: pointer;">✕</button>
        <h4 style="margin: 0 0 14px; font-size: 16px; font-weight: 800; color: #0f172a;">Studio Audio, Video & Filter Settings</h4>

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
            <i class="fa-solid fa-wand-magic-sparkles"></i> Live Video Filter
          </label>
          <select id="iqraVideoFilterSelect" style="width: 100%; padding: 8px 10px; border: 1.5px solid #bae6fd; background: #f0f9ff; border-radius: 9px; font-size: 12.5px; font-weight: 600; color: #0f172a;">
            ${videoFilterOptions}
          </select>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 11.5px; font-weight: 700; color: #16a34a; margin-bottom: 4px;">
            <i class="fa-solid fa-sliders"></i> Live Voice Audio Filter (10 Voices)
          </label>
          <select id="iqraVoicePresetSelect" style="width: 100%; padding: 8px 10px; border: 1.5px solid #bbf7d0; background: #f0fdf4; border-radius: 9px; font-size: 12.5px; font-weight: 600; color: #0f172a;">
            ${voicePresetOptions}
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
      selectedVoicePreset = document.getElementById("iqraVoicePresetSelect").value;
      modal.remove();

      const headerAvatar = document.getElementById("iqraHostHeaderAvatar");
      const stageAvatar = document.getElementById("iqraHostStageAvatar");
      if (teacherAvatarDataUrl) {
        if (headerAvatar) headerAvatar.src = teacherAvatarDataUrl;
        if (stageAvatar) {
          stageAvatar.innerHTML = `<img src="${teacherAvatarDataUrl}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
        }
      }

      await acquireHostMedia(selectedMicId, selectedCamId);
      showLiveToast("Video filter, voice preset & device settings applied.");
    };
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
    stopBoardSharingStreams();
    if (videoFilterLoopId) {
      cancelAnimationFrame(videoFilterLoopId);
      videoFilterLoopId = null;
    }
    if (audioCtx) {
      try { audioCtx.close(); } catch (e) {}
      audioCtx = null;
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
    isWallMinimized = false;
    isFullSizePanel = false;
    unreadMessages = 0;

    const panel = document.getElementById("iqraLiveClassPanel");
    if (panel) panel.remove();
    const wallTab = document.getElementById("iqraLeftWallRestoreTab");
    if (wallTab) wallTab.remove();
  }

  // Sleek, Semi-Transparent & Vertically Draggable Left-Wall Dock Handle
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

        // Allow vertical dragging along the left wall + click to expand
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

  // Step 1: Host Setup Lobby Modal
  function openHostLobbyModal() {
    if (isHostingActive) {
      toggleLeftWallMinimize(false);
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
      <div style="background: #ffffff; width: 410px; max-width: 94vw; border-radius: 18px; padding: 22px; box-shadow: 0 24px 48px rgba(0,0,0,0.28); position: relative;">
        <button id="closeLiveLobbyModal" type="button" style="position: absolute; top: 14px; right: 14px; width: 30px; height: 30px; border-radius: 50%; border: none; background: #f1f5f9; color: #475569; font-size: 15px; cursor: pointer;">✕</button>

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 19px;">
            <i class="fa-solid fa-mosque"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a;">${ACADEMY_NAME}</h3>
            <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">Configure Live Classroom & Start Hosting</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px;">Teacher Name</label>
            <input id="iqraHostNameInput" type="text" value="${escapeHtml(teacherDisplayName)}" placeholder="Teacher Name"
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 12.5px; color: #0f172a; outline: none;" />
          </div>
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px;">Profile Photo</label>
            <input id="iqraLobbyAvatarInput" type="file" accept="image/*" style="width: 100%; font-size: 11px; padding-top: 5px; color: #475569;" />
          </div>
        </div>

        <div style="margin-bottom: 10px;">
          <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px;">Course / Class Title (Shown to Students)</label>
          <input id="iqraCourseTitleInput" type="text" value="${escapeHtml(courseTitle)}" placeholder="e.g. Darse Nizami 1st Year"
            style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 13px; font-weight: 600; color: #0f172a; outline: none;" />
        </div>

        <div style="margin-bottom: 10px;">
          <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px;">Custom Room ID</label>
          <input id="iqraCustomRoomInput" type="text" value="${escapeHtml(activeRoomSlug)}" placeholder="e.g. iqra-darse-nizami"
            style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 12.5px; font-weight: 600; color: #0284c7; outline: none;" />
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 9px; margin-bottom: 15px;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">Student Invite Link</div>
          <div id="iqraInvitePreviewText" style="font-size: 11px; color: #0f172a; word-break: break-all; font-family: monospace;">
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
    const titleInput = document.getElementById("iqraCourseTitleInput");
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
      previewEl.textContent = buildPreviewUrl(sanitizeRoomSlug(roomInput.value));
    });

    document.getElementById("closeLiveLobbyModal").onclick = () => modal.remove();

    document.getElementById("btnCopyLobbyLink").onclick = () => {
      navigator.clipboard.writeText(buildPreviewUrl(sanitizeRoomSlug(roomInput.value))).then(() => {
        showLiveToast("Student invite link copied.");
      });
    };

    document.getElementById("btnStartHostingNow").onclick = () => {
      activeRoomSlug = sanitizeRoomSlug(roomInput.value);
      teacherDisplayName = (nameInput.value || "").trim() || "Teacher";
      courseTitle = (titleInput.value || "").trim() || "Live Session";
      modal.remove();
      launchTeacherBroadcastPanel();
    };
  }

  // Step 2: Active Teacher Studio Panel
  async function launchTeacherBroadcastPanel() {
    isHostingActive = true;
    const inviteLink = `${getBaseAppUrl()}?liveClass=${encodeURIComponent(activeRoomSlug)}`;
    const hostInitials = getInitials(teacherDisplayName);

    const container = document.createElement("div");
    container.id = "iqraLiveClassPanel";
    container.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 16px;
      width: 580px;
      height: 365px;
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
          <button id="btnCopyClassLink" type="button" title="Copy Student Invite Link" style="
            background: #0284c7; color: #fff; border: none; border-radius: 7px;
            padding: 4px 9px; font-size: 11px; font-weight: 600; cursor: pointer;
          ">Copy Link</button>

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

          <button id="btnCloseLiveClass" type="button" title="End Live Class" style="
            background: #dc2626; color: #fff; border: none; border-radius: 7px;
            width: 25px; height: 25px; font-size: 11px; cursor: pointer;
          ">✕</button>
        </div>
      </div>

      <!-- Main Stage + Right Participants/Chat Panel -->
      <div style="flex: 1; display: flex; overflow: hidden; background: #020617;">
        <!-- Teacher Broadcast Stage -->
        <div id="iqraLiveFrameWrap" style="position: relative; flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden;">
          <video id="iqraTeacherPreviewVideo" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: contain; display: none; background: #000;"></video>
          <div id="iqraTeacherPlaceholder" style="display: flex; flex-direction: column; align-items: center; text-align: center; color: #94a3b8; padding: 16px;">
            <div id="iqraHostStageAvatar" style="width: 64px; height: 64px; border-radius: 50%; background: #0284c7; color: #ffffff; font-size: 22px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; border: 2px solid #38bdf8; overflow: hidden;">
              ${teacherAvatarDataUrl ? `<img src="${teacherAvatarDataUrl}" style="width:100%;height:100%;object-fit:cover;" />` : escapeHtml(hostInitials)}
            </div>
            <div style="font-size: 13px; font-weight: 700; color: #f8fafc;">${escapeHtml(teacherDisplayName)}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 3px;">Click <b>Share Board</b> below to broadcast your screen</div>
          </div>
        </div>

        <!-- Right Panel: Students List & Messages -->
        <div id="iqraHostRightSidePanel" style="width: 235px; max-width: 48%; background: #0f172a; border-left: 1px solid #334155; display: flex; flex-direction: column;">
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
        <button id="btnToggleMic" type="button" style="background: #334155; color: #f8fafc; border: none; border-radius: 8px; padding: 5px 10px; font-size: 11.5px; font-weight: 600; cursor: pointer;">
          <i class="fa-solid fa-microphone"></i> Mic
        </button>
        <button id="btnToggleCam" type="button" style="background: #334155; color: #f8fafc; border: none; border-radius: 8px; padding: 5px 10px; font-size: 11.5px; font-weight: 600; cursor: pointer;">
          <i class="fa-solid fa-video"></i> Cam
        </button>
        <button id="btnShareBoardScreen" type="button" style="background: #16a34a; color: #ffffff; border: none; border-radius: 8px; padding: 5px 11px; font-size: 11.5px; font-weight: 700; cursor: pointer;">
          <i class="fa-solid fa-display"></i> Share Board
        </button>
        <button id="btnHostDeviceSettings" type="button" title="Audio, Video & Filter Settings" style="background: #334155; color: #f8fafc; border: none; border-radius: 8px; padding: 5px 9px; font-size: 11.5px; font-weight: 600; cursor: pointer;">
          <i class="fa-solid fa-gear"></i>
        </button>
      </div>
    `;

    document.body.appendChild(container);
    makeElementDraggable(container, document.getElementById("iqraLiveClassHeader"));
    renderHostParticipantsList();

    classPeer = new Peer(activeRoomSlug);

    classPeer.on("open", () => {
      appendChatMessage("System", `${ACADEMY_NAME} — "${courseTitle}" is live.`, false, true);
      showLiveToast(`Hosting started: ${courseTitle}`);
    });

    classPeer.on("error", (err) => {
      if (err && err.type === "unavailable-id") {
        showLiveToast("This Class ID is already active. Please choose another ID.");
        cleanupTeacherSession();
        openHostLobbyModal();
      }
    });

    classPeer.on("call", (incomingCall) => {
      incomingCall.answer();
      incomingCall.on("stream", (studentStream) => {
        const entry = connectedStudents.get(incomingCall.peer);
        if (entry) {
          entry.incomingStream = studentStream;
          renderHostParticipantsList();
        }
      });
    });

    classPeer.on("connection", (conn) => {
      conn.on("open", () => {
        connectedStudents.set(conn.peer, {
          conn,
          mediaCall: null,
          incomingStream: null,
          name: "Student",
          micOn: false,
          camOn: false,
          micLocked: false,
          camLocked: false
        });
        updateStudentCountBadge();
        renderHostParticipantsList();

        conn.send({
          type: "class-meta",
          academyName: ACADEMY_NAME,
          courseTitle,
          teacherName: teacherDisplayName,
          teacherAvatar: teacherAvatarDataUrl
        });
        conn.send({ type: "chat-history", history: chatHistory.slice(-30) });
        syncRosterToAllStudents();

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
          if (entry) {
            entry.name = sName;
            entry.micOn = Boolean(data.micOn);
            entry.camOn = Boolean(data.camOn);
          }
          renderHostParticipantsList();
          syncRosterToAllStudents();
          appendChatMessage("System", `${sName} joined the class.`, false, true);
          broadcastToAllStudents({ type: "system-msg", text: `${sName} joined the class.` });
          showLiveToast(`${sName} joined the live class.`);
        } else if (data.type === "student-media-state") {
          if (entry) {
            entry.micOn = Boolean(data.micOn);
            entry.camOn = Boolean(data.camOn);
            renderHostParticipantsList();
            syncRosterToAllStudents();
          }
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
        renderHostParticipantsList();
        syncRosterToAllStudents();
        appendChatMessage("System", `${leftName} left the class.`, false, true);
      });
    });

    await acquireHostMedia(selectedMicId, selectedCamId);

    document.getElementById("btnCopyClassLink").onclick = () => {
      navigator.clipboard.writeText(inviteLink).then(() => {
        showLiveToast("Student invite link copied.");
      });
    };

    document.getElementById("btnWallMinLiveClass").onclick = () => toggleLeftWallMinimize(true);

    // True Full-Viewport Edge-to-Edge Toggle (Image 1 Fix)
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
        container.style.height = "100vh";
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
        container.style.width = prev.width || "580px";
        container.style.height = prev.height || "365px";
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
      if (!processedAudioStream || !processedAudioStream.getAudioTracks().length) {
        showLiveToast("No microphone detected on this device.");
        return;
      }
      isMicMuted = !isMicMuted;
      processedAudioStream.getAudioTracks().forEach((t) => { t.enabled = !isMicMuted; });
      micBtn.innerHTML = isMicMuted
        ? `<i class="fa-solid fa-microphone-slash"></i> Muted`
        : `<i class="fa-solid fa-microphone"></i> Mic`;
      micBtn.style.background = isMicMuted ? "#dc2626" : "#334155";
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
      camBtn.innerHTML = isCamOff
        ? `<i class="fa-solid fa-video-slash"></i> Off`
        : `<i class="fa-solid fa-video"></i> Cam`;
      camBtn.style.background = isCamOff ? "#dc2626" : "#334155";
      refreshHostStagePreview();
      syncRosterToAllStudents();
    };

    const shareBtn = document.getElementById("btnShareBoardScreen");
    shareBtn.onclick = async () => {
      if (localScreenStream || canvasFallbackStream) {
        stopBoardSharingStreams();
        shareBtn.innerHTML = `<i class="fa-solid fa-display"></i> Share Board`;
        shareBtn.style.background = "#16a34a";
        refreshHostStagePreview();
        broadcastStreamToAllStudents();
        showLiveToast("Board sharing stopped.");
        return;
      }

      const canUseOsDisplayMedia =
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getDisplayMedia === "function" &&
        !/Android/i.test(navigator.userAgent);

      if (canUseOsDisplayMedia) {
        try {
          localScreenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: { ideal: 30, max: 30 } },
            audio: false
          });
          const track = localScreenStream.getVideoTracks()[0];
          if (track) {
            track.onended = () => {
              stopBoardSharingStreams();
              shareBtn.innerHTML = `<i class="fa-solid fa-display"></i> Share Board`;
              shareBtn.style.background = "#16a34a";
              refreshHostStagePreview();
              broadcastStreamToAllStudents();
            };
          }
          shareBtn.innerHTML = `<i class="fa-solid fa-stop"></i> Stop Share`;
          shareBtn.style.background = "#d97706";
          refreshHostStagePreview();
          broadcastStreamToAllStudents();
          showLiveToast("Broadcasting screen to students.");
          return;
        } catch (err) {
          if (err && err.name === "NotAllowedError") return;
        }
      }

      canvasFallbackStream = createUniversalBoardCanvasStream();
      shareBtn.innerHTML = `<i class="fa-solid fa-stop"></i> Stop Board`;
      shareBtn.style.background = "#d97706";
      refreshHostStagePreview();
      broadcastStreamToAllStudents();
      showLiveToast("Broadcasting whiteboard & PDF live.");
    };

    document.getElementById("btnHostDeviceSettings").onclick = openHostDeviceSettingsModal;

    document.getElementById("btnCloseLiveClass").onclick = () => {
      askEndClassConfirmation(() => {
        cleanupTeacherSession();
        showLiveToast("Live Class ended.");
      });
    };
  }

  // =========================================================================
  // STUDENT CLASSROOM VIEW
  // =========================================================================
  function joinStudentLiveClass(roomId) {
    document.body.innerHTML = `
      <div style="position: fixed; inset: 0; background: #020617; color: #f8fafc; display: flex; flex-direction: column; font-family: system-ui, -apple-system, sans-serif;">
        <!-- Join Name Overlay -->
        <div id="iqraStudentJoinGate" style="position: fixed; inset: 0; background: rgba(2, 6, 23, 0.94); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 20px;">
          <div style="background: #0f172a; border: 1px solid #1e293b; width: 350px; max-width: 92vw; border-radius: 16px; padding: 22px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.45);">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; display: flex; align-items: center; justify-content: center; font-size: 21px; margin: 0 auto 10px;">
              <i class="fa-solid fa-mosque"></i>
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #38bdf8; margin-bottom: 2px;">${ACADEMY_NAME}</div>
            <h3 style="margin: 0 0 6px; font-size: 18px; font-weight: 700;">Join Live Classroom</h3>
            <p style="margin: 0 0 14px; font-size: 12px; color: #94a3b8;">Room ID: <b>${escapeHtml(roomId)}</b></p>
            <input id="iqraStudentNameInput" type="text" placeholder="Enter your First & Last Name..." style="
              width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 10px;
              border: 1px solid #334155; background: #1e293b; color: #f8fafc;
              font-size: 13.5px; margin-bottom: 12px; outline: none;
            " />
            <button id="btnEnterStudentClass" type="button" style="
              width: 100%; padding: 10px; border-radius: 10px; border: none;
              background: #16a34a; color: #ffffff; font-size: 14px; font-weight: 700; cursor: pointer;
            ">Join Class</button>
          </div>
        </div>

        <!-- Top Navbar -->
        <div style="background: #0f172a; padding: 8px 14px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 9px; min-width: 0;">
            <span style="width: 9px; height: 9px; border-radius: 50%; background: #22c55e; flex-shrink: 0;"></span>
            <div style="min-width: 0;">
              <div id="iqraStudentHeaderAcademy" style="font-size: 13.5px; font-weight: 800; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${ACADEMY_NAME}
              </div>
              <div id="iqraStudentHeaderCourse" style="font-size: 11.5px; color: #38bdf8; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(roomId)}
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
            <button id="btnStudentToggleSidebar" type="button" title="Show/Hide Chat & Students Panel" style="position: relative; background: #1e293b; color: #f8fafc; border: 1px solid #334155; border-radius: 8px; padding: 6px 10px; font-size: 11.5px; font-weight: 600; cursor: pointer;">
              <i class="fa-solid fa-table-columns"></i> Panel
              <span id="iqraChatUnreadBadge" style="display: none; position: absolute; top: -5px; right: -5px; background: #ef4444; color: #fff; font-size: 9px; font-weight: 700; min-width: 15px; height: 15px; border-radius: 999px; align-items: center; justify-content: center; padding: 0 3px;">0</span>
            </button>
            <button id="btnStudentFullscreen" type="button" style="background: #1e293b; color: #f8fafc; border: 1px solid #334155; border-radius: 8px; padding: 6px 10px; font-size: 11.5px; font-weight: 600; cursor: pointer;">
              ⛶ Fullscreen
            </button>
          </div>
        </div>

        <!-- Main Classroom Area -->
        <div style="position: relative; flex: 1; display: flex; overflow: hidden;">
          <div style="position: relative; flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #000;">
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

            <div id="iqraStudentSelfPip" style="display: none; position: absolute; bottom: 14px; right: 14px; width: 120px; height: 84px; border-radius: 10px; overflow: hidden; border: 2px solid #38bdf8; background: #0f172a; box-shadow: 0 8px 20px rgba(0,0,0,0.5);">
              <video id="iqraStudentSelfVideo" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover;"></video>
            </div>
          </div>

          <!-- Collapsible Right Sidebar (Messages & Students List) -->
          <div id="iqraStudentRightSidebar" style="
            display: flex; width: 280px; max-width: 82vw; background: #0f172a;
            border-left: 1px solid #1e293b; flex-direction: column;
          ">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; background: #1e293b; padding-right: 6px;">
              <div style="display: flex; flex: 1;">
                <button id="tabStudentMessages" type="button" style="flex: 1; padding: 9px 6px; border: none; background: #0f172a; color: #38bdf8; font-size: 12px; font-weight: 700; cursor: pointer; border-bottom: 2px solid #38bdf8;">
                  Messages
                </button>
                <button id="tabStudentParticipants" type="button" style="flex: 1; padding: 9px 6px; border: none; background: transparent; color: #94a3b8; font-size: 12px; font-weight: 700; cursor: pointer;">
                  Students
                </button>
              </div>
              <button id="btnCloseStudentSidebar" type="button" title="Hide Panel for Full Screen Board" style="background: none; border: none; color: #94a3b8; font-size: 14px; padding: 6px 8px; cursor: pointer;">✕</button>
            </div>

            <div id="iqraStudentMessagesTab" style="display: flex; flex: 1; flex-direction: column; overflow: hidden;">
              <div id="iqraLiveChatMessages" style="flex: 1; overflow-y: auto; padding: 10px;"></div>
              <div style="padding: 8px; border-top: 1px solid #1e293b; display: flex; gap: 6px;">
                <input id="iqraStudentChatInput" type="text" placeholder="Type a message..." style="
                  flex: 1; min-width: 0; background: #1e293b; border: 1px solid #334155;
                  border-radius: 8px; padding: 7px 10px; font-size: 12.5px; color: #f8fafc; outline: none;
                " />
                <button id="btnSendStudentChat" type="button" style="
                  background: #0284c7; color: #ffffff; border: none; border-radius: 8px;
                  padding: 0 12px; font-size: 12.5px; font-weight: 600; cursor: pointer;
                ">Send</button>
              </div>
            </div>

            <div id="iqraStudentParticipantsTab" style="display: none; flex: 1; overflow-y: auto; padding: 10px;"></div>
          </div>
        </div>

        <!-- Bottom Student Control Bar -->
        <div style="background: #0f172a; padding: 8px 14px; display: flex; align-items: center; justify-content: center; gap: 10px; border-top: 1px solid #1e293b;">
          <button id="btnStudentMicToggle" type="button" style="background: #1e293b; color: #f8fafc; border: 1px solid #334155; border-radius: 10px; padding: 7px 14px; font-size: 12px; font-weight: 600; cursor: pointer;">
            <i class="fa-solid fa-microphone-slash"></i> Mic Off
          </button>
          <button id="btnStudentCamToggle" type="button" style="background: #1e293b; color: #f8fafc; border: 1px solid #334155; border-radius: 10px; padding: 7px 14px; font-size: 12px; font-weight: 600; cursor: pointer;">
            <i class="fa-solid fa-video-slash"></i> Cam Off
          </button>
          <button id="btnStudentRaiseHand" type="button" style="background: #f59e0b; color: #0f172a; border: none; border-radius: 10px; padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer;">
            ✋ Raise Hand
          </button>
        </div>
      </div>
    `;

    isHostSidePanelOpen = true;
    activeHostTab = "chat";

    let studentName = "Student";
    let studentPeer = null;
    let teacherConn = null;
    let studentLocalStream = null;
    let studentOutgoingCall = null;
    let studentMicOn = false;
    let studentCamOn = false;
    let hostLockedMedia = false;

    const sidebarEl = document.getElementById("iqraStudentRightSidebar");
    const msgTabEl = document.getElementById("iqraStudentMessagesTab");
    const partTabEl = document.getElementById("iqraStudentParticipantsTab");
    const tabMsgBtn = document.getElementById("tabStudentMessages");
    const tabPartBtn = document.getElementById("tabStudentParticipants");
    const micBtn = document.getElementById("btnStudentMicToggle");
    const camBtn = document.getElementById("btnStudentCamToggle");

    function updateStudentMediaButtonsUI() {
      if (hostLockedMedia) {
        micBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Mic Disabled`;
        micBtn.style.background = "#450a0a";
        micBtn.style.color = "#fca5a5";
        camBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Cam Disabled`;
        camBtn.style.background = "#450a0a";
        camBtn.style.color = "#fca5a5";
        return;
      }
      micBtn.style.color = "#f8fafc";
      micBtn.style.background = studentMicOn ? "#16a34a" : "#1e293b";
      micBtn.innerHTML = studentMicOn
        ? `<i class="fa-solid fa-microphone"></i> Mic On`
        : `<i class="fa-solid fa-microphone-slash"></i> Mic Off`;

      camBtn.style.color = "#f8fafc";
      camBtn.style.background = studentCamOn ? "#16a34a" : "#1e293b";
      camBtn.innerHTML = studentCamOn
        ? `<i class="fa-solid fa-video"></i> Cam On`
        : `<i class="fa-solid fa-video-slash"></i> Cam Off`;
    }

    function renderStudentRosterList(roster) {
      if (!partTabEl) return;
      partTabEl.innerHTML = "";
      (roster || []).forEach((person) => {
        const bg = getAvatarColor(person.name);
        const row = document.createElement("div");
        row.style.cssText = `
          display: flex; align-items: center; justify-content: space-between;
          background: #1e293b; border: 1px solid #334155; border-radius: 10px;
          padding: 8px 10px; margin-bottom: 7px;
        `;
        row.innerHTML = `
          <div style="display: flex; align-items: center; gap: 9px; min-width: 0;">
            <div style="width: 34px; height: 34px; border-radius: 50%; background: ${bg}; color: #fff; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden;">
              ${person.avatar ? `<img src="${person.avatar}" style="width:100%;height:100%;object-fit:cover;" />` : escapeHtml(person.initials || getInitials(person.name))}
            </div>
            <div style="min-width: 0;">
              <div style="font-size: 12.5px; font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(person.name)}</div>
              <div style="font-size: 10.5px; color: #94a3b8;">${person.isHost ? "Host" : "Participant"}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; font-size: 11px;">
            <span style="color: ${person.micOn ? "#22c55e" : "#64748b"};"><i class="fa-solid ${person.micOn ? "fa-microphone" : "fa-microphone-slash"}"></i></span>
            <span style="color: ${person.camOn ? "#22c55e" : "#64748b"};"><i class="fa-solid ${person.camOn ? "fa-video" : "fa-video-slash"}"></i></span>
          </div>
        `;
        partTabEl.appendChild(row);
      });
    }

    async function syncStudentMediaStream() {
      const pipBox = document.getElementById("iqraStudentSelfPip");
      const pipVid = document.getElementById("iqraStudentSelfVideo");

      if (!studentMicOn && !studentCamOn) {
        if (studentLocalStream) {
          studentLocalStream.getTracks().forEach((t) => t.stop());
          studentLocalStream = null;
        }
        if (studentOutgoingCall) {
          try { studentOutgoingCall.close(); } catch (e) {}
          studentOutgoingCall = null;
        }
        if (pipBox) pipBox.style.display = "none";
      } else {
        try {
          if (studentLocalStream) {
            studentLocalStream.getTracks().forEach((t) => t.stop());
          }
          studentLocalStream = await navigator.mediaDevices.getUserMedia({
            audio: studentMicOn,
            video: studentCamOn
          });
          if (studentCamOn && pipBox && pipVid) {
            pipVid.srcObject = studentLocalStream;
            pipBox.style.display = "block";
          } else if (pipBox) {
            pipBox.style.display = "none";
          }

          if (studentPeer && studentLocalStream) {
            if (studentOutgoingCall) {
              try { studentOutgoingCall.close(); } catch (e) {}
            }
            studentOutgoingCall = studentPeer.call(roomId, studentLocalStream);
          }
        } catch (err) {
          studentMicOn = false;
          studentCamOn = false;
          if (pipBox) pipBox.style.display = "none";
          showLiveToast("Unable to access microphone or camera on this device.");
        }
      }

      updateStudentMediaButtonsUI();
      if (teacherConn && teacherConn.open) {
        teacherConn.send({
          type: "student-media-state",
          micOn: studentMicOn,
          camOn: studentCamOn
        });
      }
    }

    const startStudentConnection = () => {
      studentPeer = new Peer();

      studentPeer.on("open", () => {
        teacherConn = studentPeer.connect(roomId, { reliable: true });

        teacherConn.on("open", () => {
          teacherConn.send({
            type: "student-hello",
            name: studentName,
            micOn: studentMicOn,
            camOn: studentCamOn
          });
          teacherConn.send({ type: "request-stream" });
        });

        teacherConn.on("data", (data) => {
          if (!data) return;
          if (data.type === "class-meta") {
            const acEl = document.getElementById("iqraStudentHeaderAcademy");
            const crEl = document.getElementById("iqraStudentHeaderCourse");
            if (acEl && data.academyName) acEl.textContent = data.academyName;
            if (crEl && data.courseTitle) crEl.textContent = data.courseTitle;
          } else if (data.type === "roster-update") {
            renderStudentRosterList(data.roster);
          } else if (data.type === "host-control") {
            if (data.action === "force-mute-mic") {
              studentMicOn = false;
              syncStudentMediaStream();
              showLiveToast("The host muted your microphone.");
            } else if (data.action === "force-stop-cam") {
              studentCamOn = false;
              syncStudentMediaStream();
              showLiveToast("The host turned off your camera.");
            } else if (data.action === "lock-media") {
              hostLockedMedia = true;
              studentMicOn = false;
              studentCamOn = false;
              syncStudentMediaStream();
              showLiveToast("The host disabled your microphone and camera.");
            } else if (data.action === "unlock-media") {
              hostLockedMedia = false;
              updateStudentMediaButtonsUI();
              showLiveToast("The host re-enabled your microphone and camera.");
            }
          } else if (data.type === "class-ended") {
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

    micBtn.onclick = async () => {
      if (hostLockedMedia) {
        showLiveToast("Your microphone is disabled by the host.");
        return;
      }
      studentMicOn = !studentMicOn;
      await syncStudentMediaStream();
    };

    camBtn.onclick = async () => {
      if (hostLockedMedia) {
        showLiveToast("Your camera is disabled by the host.");
        return;
      }
      studentCamOn = !studentCamOn;
      await syncStudentMediaStream();
    };

    tabMsgBtn.onclick = () => {
      activeHostTab = "chat";
      tabMsgBtn.style.background = "#0f172a";
      tabMsgBtn.style.color = "#38bdf8";
      tabMsgBtn.style.borderBottom = "2px solid #38bdf8";
      tabPartBtn.style.background = "transparent";
      tabPartBtn.style.color = "#94a3b8";
      tabPartBtn.style.borderBottom = "none";
      msgTabEl.style.display = "flex";
      partTabEl.style.display = "none";
      unreadMessages = 0;
      updateUnreadBadge();
    };

    tabPartBtn.onclick = () => {
      activeHostTab = "participants";
      tabPartBtn.style.background = "#0f172a";
      tabPartBtn.style.color = "#38bdf8";
      tabPartBtn.style.borderBottom = "2px solid #38bdf8";
      tabMsgBtn.style.background = "transparent";
      tabMsgBtn.style.color = "#94a3b8";
      tabMsgBtn.style.borderBottom = "none";
      msgTabEl.style.display = "none";
      partTabEl.style.display = "block";
    };

    const setStudentSidebarVisible = (visible) => {
      isHostSidePanelOpen = visible;
      sidebarEl.style.display = visible ? "flex" : "none";
      if (visible && activeHostTab === "chat") {
        unreadMessages = 0;
      }
      updateUnreadBadge();
    };

    document.getElementById("btnStudentToggleSidebar").onclick = () => setStudentSidebarVisible(!isHostSidePanelOpen);
    document.getElementById("btnCloseStudentSidebar").onclick = () => setStudentSidebarVisible(false);

    const studentChatInput = document.getElementById("iqraStudentChatInput");
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

    const params = new URLSearchParams(window.location.search);
    const joinRoom = params.get("liveClass");
    if (joinRoom) {
      joinStudentLiveClass(joinRoom);
    }
  });
})();