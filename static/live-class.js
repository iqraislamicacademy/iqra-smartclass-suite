/* ==========================================================================
   IQRA ISLAMIC ACADEMY - HOST STUDIO & LIVE BROADCAST CONTROLLER
   (Secure class.html Links, 12 Age/Gender Voice Filters, Video Shapes & Filters,
    Spotlight Stage Control, Separate Audio/Video Locks, Kick & Dual Exit)
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
  let selectedVideoShape = "rounded";
  let selectedVoicePreset = "natural";
  let spotlightTargetId = "host"; // "host" or student peerId

  let isMicMuted = false;
  let isCamOff = false;
  let isWallMinimized = false;
  let isFullSizePanel = false;
  let activeHostTab = "participants";
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

  const VIDEO_SHAPES = [
    { id: "rounded", label: "Rounded Square" },
    { id: "circle", label: "Circle (Round)" },
    { id: "heart", label: "Heart Shape" },
    { id: "hexagon", label: "Hexagon Frame" },
    { id: "oval", label: "Soft Oval" },
    { id: "rect", label: "Full Rectangle" }
  ];

  // Exact 12 Age & Gender Voice Filters + Natural Default
  const VOICE_PRESETS = [
    { id: "natural", label: "0. Natural Voice (Original)" },
    { id: "baby-6", label: "1. 6 Year Baby" },
    { id: "boy-10", label: "2. 10 Year Boy" },
    { id: "boy-15", label: "3. 15 Year Boy" },
    { id: "boy-22", label: "4. 22 Year Boy" },
    { id: "man-50", label: "5. 50 Year Old Man" },
    { id: "man-60", label: "6. 60 Year Old Man" },
    { id: "fbaby-6", label: "7. 6 Year Female Baby" },
    { id: "girl-10", label: "8. 10 Year Girl" },
    { id: "girl-15", label: "9. 15 Year Girl" },
    { id: "girl-22", label: "10. 22 Year Girl" },
    { id: "woman-50", label: "11. 50 Year Old Woman" },
    { id: "woman-60", label: "12. 60 Year Old Woman" }
  ];

  // Build clean student classroom URL without index.html (points to lightweight class.html)
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

  function getShapeCssStyle(shapeId) {
    if (shapeId === "circle") {
      return "border-radius: 50%; aspect-ratio: 1 / 1; max-width: 85%; max-height: 85%;";
    }
    if (shapeId === "heart") {
      return "aspect-ratio: 1 / 1; max-width: 86%; max-height: 86%; clip-path: polygon(50% 92%, 12% 58%, 4% 35%, 14% 14%, 32% 8%, 50% 22%, 68% 8%, 86% 14%, 96% 35%, 88% 58%);";
    }
    if (shapeId === "hexagon") {
      return "aspect-ratio: 1 / 1; max-width: 86%; max-height: 86%; clip-path: polygon(25% 5%, 75% 5%, 98% 50%, 75% 95%, 25% 95%, 2% 50%);";
    }
    if (shapeId === "oval") {
      return "border-radius: 50%; width: 88%; height: 86%;";
    }
    if (shapeId === "rect") {
      return "border-radius: 0px; width: 100%; height: 100%;";
    }
    return "border-radius: 16px; width: 100%; height: 100%;";
  }

  function applyShapeToHostStage() {
    const box = document.getElementById("iqraHostStageFrame");
    if (!box) return;
    box.style.cssText = `
      overflow: hidden; display: flex; align-items: center; justify-content: center;
      background: #000000; position: relative; transition: all 0.25s ease;
      ${getShapeCssStyle(selectedVideoShape)}
    `;
  }

  // Real-time Web Audio Pitch & Formant Processor for the 12 Age & Gender Voices
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

    // Formant & EQ sculpting filters
    const highpass = audioCtx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 60;

    const formant1 = audioCtx.createBiquadFilter();
    formant1.type = "peaking";
    formant1.frequency.value = 1000;
    formant1.Q.value = 1.4;
    formant1.gain.value = 0;

    const formant2 = audioCtx.createBiquadFilter();
    formant2.type = "peaking";
    formant2.frequency.value = 2600;
    formant2.Q.value = 1.5;
    formant2.gain.value = 0;

    const lowShelf = audioCtx.createBiquadFilter();
    lowShelf.type = "lowshelf";
    lowShelf.frequency.value = 240;
    lowShelf.gain.value = 0;

    const highShelf = audioCtx.createBiquadFilter();
    highShelf.type = "highshelf";
    highShelf.frequency.value = 3800;
    highShelf.gain.value = 0;

    // Granular real-time pitch shifter via ScriptProcessor for true pitch ratio change
    let pitchFactor = 1.0;

    const presets = {
      "natural": { pitch: 1.0, hp: 60, low: 0, f1Freq: 1000, f1Gain: 0, f2Freq: 2600, f2Gain: 0, high: 0 },
      "baby-6": { pitch: 1.52, hp: 220, low: -18, f1Freq: 1650, f1Gain: 9, f2Freq: 3400, f2Gain: 12, high: 10 },
      "boy-10": { pitch: 1.32, hp: 160, low: -12, f1Freq: 1400, f1Gain: 7, f2Freq: 3000, f2Gain: 8, high: 6 },
      "boy-15": { pitch: 1.12, hp: 110, low: -4, f1Freq: 1150, f1Gain: 4, f2Freq: 2700, f2Gain: 5, high: 4 },
      "boy-22": { pitch: 0.96, hp: 75, low: 6, f1Freq: 950, f1Gain: 3, f2Freq: 2400, f2Gain: 4, high: 3 },
      "man-50": { pitch: 0.85, hp: 65, low: 12, f1Freq: 800, f1Gain: 4, f2Freq: 2100, f2Gain: -3, high: -4 },
      "man-60": { pitch: 0.78, hp: 60, low: 15, f1Freq: 720, f1Gain: 5, f2Freq: 1900, f2Gain: -6, high: -7 },
      "fbaby-6": { pitch: 1.62, hp: 240, low: -20, f1Freq: 1800, f1Gain: 11, f2Freq: 3600, f2Gain: 14, high: 12 },
      "girl-10": { pitch: 1.42, hp: 185, low: -15, f1Freq: 1550, f1Gain: 9, f2Freq: 3300, f2Gain: 11, high: 9 },
      "girl-15": { pitch: 1.28, hp: 160, low: -12, f1Freq: 1420, f1Gain: 8, f2Freq: 3100, f2Gain: 10, high: 8 },
      "girl-22": { pitch: 1.22, hp: 145, low: -10, f1Freq: 1350, f1Gain: 7, f2Freq: 2950, f2Gain: 9, high: 8 },
      "woman-50": { pitch: 1.10, hp: 120, low: -5, f1Freq: 1200, f1Gain: 5, f2Freq: 2650, f2Gain: 4, high: 3 },
      "woman-60": { pitch: 1.03, hp: 110, low: -2, f1Freq: 1100, f1Gain: 4, f2Freq: 2400, f2Gain: 1, high: -2 }
    };

    const cfg = presets[presetId] || presets.natural;
    pitchFactor = cfg.pitch;
    highpass.frequency.value = cfg.hp;
    lowShelf.gain.value = cfg.low;
    formant1.frequency.value = cfg.f1Freq;
    formant1.gain.value = cfg.f1Gain;
    formant2.frequency.value = cfg.f2Freq;
    formant2.gain.value = cfg.f2Gain;
    highShelf.gain.value = cfg.high;

    source.connect(highpass);
    highpass.connect(lowShelf);
    lowShelf.connect(formant1);
    formant1.connect(formant2);
    formant2.connect(highShelf);

    if (Math.abs(pitchFactor - 1.0) > 0.01 && typeof audioCtx.createScriptProcessor === "function") {
      const bufSize = 2048;
      const ringSize = bufSize * 4;
      const ring = new Float32Array(ringSize);
      let writePos = 0;
      let readPos = 0;

      const shifter = audioCtx.createScriptProcessor(bufSize, 1, 1);
      shifter.onaudioprocess = (e) => {
        const inp = e.inputBuffer.getChannelData(0);
        const out = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < inp.length; i++) {
          ring[writePos] = inp[i];
          writePos = (writePos + 1) % ringSize;
        }
        for (let i = 0; i < out.length; i++) {
          const idx0 = Math.floor(readPos) % ringSize;
          const idx1 = (idx0 + 1) % ringSize;
          const frac = readPos - Math.floor(readPos);
          out[i] = ring[idx0] * (1 - frac) + ring[idx1] * frac;
          readPos += pitchFactor;
          if (readPos >= ringSize) readPos -= ringSize;
        }
      };
      highShelf.connect(shifter);
      shifter.connect(audioDestNode);
    } else {
      highShelf.connect(audioDestNode);
    }

    const outTrack = audioDestNode.stream.getAudioTracks()[0];
    if (outTrack) outTrack.enabled = !isMicMuted;
    return outTrack;
  }

  // Real-time Filtered Video Stream
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

  // Build active broadcast stream (Spotlight Student OR Board Share OR Host Camera + Processed Audio)
  function getActiveBroadcastStream() {
    const combined = new MediaStream();

    if (spotlightTargetId !== "host") {
      const spotStudent = connectedStudents.get(spotlightTargetId);
      if (spotStudent && spotStudent.incomingStream) {
        spotStudent.incomingStream.getVideoTracks().forEach((t) => combined.addTrack(t));
      }
    } else {
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
    }

    if (processedAudioStream && processedAudioStream.active) {
      processedAudioStream.getAudioTracks().forEach((t) => combined.addTrack(t));
    }

    return combined.getTracks().length > 0 ? combined : null;
  }

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

  // Render Host Students List with Spotlight Pin, Separate Mic/Cam Locks, Mute, Cam Off & Kick
  function renderHostParticipantsList() {
    const listEl = document.getElementById("iqraHostParticipantsList");
    if (!listEl) return;

    listEl.innerHTML = "";

    // Spotlight Return Banner if a student is currently pinned to main stage
    if (spotlightTargetId !== "host") {
      const banner = document.createElement("div");
      banner.style.cssText = `
        background: #0c4a6e; border: 1px solid #0284c7; border-radius: 10px;
        padding: 7px 9px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;
      `;
      banner.innerHTML = `
        <span style="font-size: 11px; font-weight: 700; color: #e0f2fe;">Student on Main Stage</span>
        <button id="btnResetHostSpotlight" type="button" style="background: #0284c7; color: #fff; border: none; border-radius: 6px; padding: 3px 8px; font-size: 10.5px; font-weight: 700; cursor: pointer;">
          Show Host
        </button>
      `;
      listEl.appendChild(banner);
      document.getElementById("btnResetHostSpotlight").onclick = () => {
        spotlightTargetId = "host";
        refreshHostStagePreview();
        broadcastStreamToAllStudents();
        renderHostParticipantsList();
      };
    }

    if (connectedStudents.size === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align: center; color: #64748b; font-size: 12px; padding: 26px 12px;";
      empty.innerHTML = `
        <i class="fa-solid fa-users" style="font-size: 22px; margin-bottom: 8px; display: block; color: #334155;"></i>
        No students have joined yet. Share the classroom link to begin.
      `;
      listEl.appendChild(empty);
      return;
    }

    connectedStudents.forEach((student, pid) => {
      const card = document.createElement("div");
      const isSpotlighted = spotlightTargetId === pid;
      card.style.cssText = `
        background: #1e293b; border: 1.5px solid ${isSpotlighted ? "#38bdf8" : "#334155"}; border-radius: 12px;
        padding: 8px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 6px;
      `;

      const initials = getInitials(student.name);
      const bg = getAvatarColor(student.name);
      const hasLiveVideo = student.camOn && student.incomingStream && student.incomingStream.getVideoTracks().length > 0;

      card.innerHTML = `
        <div style="position: relative; width: 100%; height: 90px; border-radius: 9px; background: #0f172a; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          <video id="hostStudentVid_${pid}" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover; display: ${hasLiveVideo ? "block" : "none"};"></video>
          <div style="display: ${hasLiveVideo ? "none" : "flex"}; width: 44px; height: 44px; border-radius: 50%; background: ${bg}; color: #ffffff; font-size: 15px; font-weight: 800; align-items: center; justify-content: center;">
            ${escapeHtml(initials)}
          </div>
          <div style="position: absolute; bottom: 4px; left: 6px; right: 6px; display: flex; align-items: center; justify-content: space-between; background: rgba(15,23,42,0.82); padding: 2px 7px; border-radius: 6px;">
            <span style="font-size: 11px; font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(student.name)}</span>
            <span style="font-size: 10px; color: ${student.micOn ? "#22c55e" : "#ef4444"};">
              <i class="fa-solid ${student.micOn ? "fa-microphone" : "fa-microphone-slash"}"></i>
            </span>
          </div>
        </div>

        <!-- Row 1: Pin to Front Stage + Remove Student -->
        <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 4px;">
          <button type="button" data-act="spotlight" data-pid="${pid}" style="
            background: ${isSpotlighted ? "#0284c7" : "#334155"}; color: #f8fafc; border: none;
            border-radius: 6px; padding: 4px 4px; font-size: 10px; font-weight: 700; cursor: pointer;
          ">
            <i class="fa-solid fa-thumbtack"></i> ${isSpotlighted ? "On Stage" : "Pin Front"}
          </button>
          <button type="button" data-act="kick-student" data-pid="${pid}" style="
            background: #7f1d1d; color: #fecaca; border: none;
            border-radius: 6px; padding: 4px 4px; font-size: 10px; font-weight: 700; cursor: pointer;
          ">
            <i class="fa-solid fa-user-xmark"></i> Remove
          </button>
        </div>

        <!-- Row 2: Separate Audio Disable & Video Disable Controls -->
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
          spotlightTargetId = spotlightTargetId === pid ? "host" : pid;
          refreshHostStagePreview();
          broadcastStreamToAllStudents();
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
            connectedStudents.delete(pid);
            if (spotlightTargetId === pid) spotlightTargetId = "host";
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

    applyShapeToHostStage();

    // If Host pinned a student to front Main Stage
    if (spotlightTargetId !== "host") {
      const spotStudent = connectedStudents.get(spotlightTargetId);
      if (spotStudent && spotStudent.incomingStream) {
        preview.srcObject = spotStudent.incomingStream;
        preview.style.display = "block";
        placeholder.style.display = "none";
        return;
      }
    }

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

  // Settings Modal: Mic, Camera, Video Filter, Video Frame Shape, 12 Age/Gender Voice Filters & Profile Photo
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

    const videoShapeOptions = VIDEO_SHAPES.map(
      (s) => `<option value="${s.id}" ${s.id === selectedVideoShape ? "selected" : ""}>${escapeHtml(s.label)}</option>`
    ).join("");

    const voicePresetOptions = VOICE_PRESETS.map(
      (v) => `<option value="${v.id}" ${v.id === selectedVoicePreset ? "selected" : ""}>${escapeHtml(v.label)}</option>`
    ).join("");

    modal.innerHTML = `
      <div style="background: #ffffff; width: 420px; max-width: 94vw; max-height: 90vh; overflow-y: auto; border-radius: 16px; padding: 20px; box-shadow: 0 20px 44px rgba(0,0,0,0.3); position: relative;">
        <button id="closeHostSettingsModal" type="button" style="position: absolute; top: 12px; right: 12px; width: 28px; height: 28px; border-radius: 50%; border: none; background: #f1f5f9; color: #475569; cursor: pointer;">✕</button>
        <h4 style="margin: 0 0 14px; font-size: 16px; font-weight: 800; color: #0f172a;">Studio Audio, Video, Shape & Voice Settings</h4>

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

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: #0284c7; margin-bottom: 4px;">Live Video Filter</label>
            <select id="iqraVideoFilterSelect" style="width: 100%; padding: 8px; border: 1.5px solid #bae6fd; background: #f0f9ff; border-radius: 9px; font-size: 12px; font-weight: 600; color: #0f172a;">
              ${videoFilterOptions}
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: #7c3aed; margin-bottom: 4px;">Video Frame Shape</label>
            <select id="iqraVideoShapeSelect" style="width: 100%; padding: 8px; border: 1.5px solid #ddd6fe; background: #f5f3ff; border-radius: 9px; font-size: 12px; font-weight: 600; color: #0f172a;">
              ${videoShapeOptions}
            </select>
          </div>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 11.5px; font-weight: 700; color: #16a34a; margin-bottom: 4px;">
            <i class="fa-solid fa-sliders"></i> Live Voice Audio Filter (12 Voices)
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
      selectedVideoShape = document.getElementById("iqraVideoShapeSelect").value;
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

      broadcastToAllStudents({ type: "video-shape", shape: selectedVideoShape });
      await acquireHostMedia(selectedMicId, selectedCamId);
      showLiveToast("Studio video shape, voice filter & device settings applied.");
    };
  }

  // Dual Host Exit Modal: Option 1 (Leave Class Only) vs Option 2 (End Class for All)
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
          student.conn.send({ type: endForAll ? "class-ended" : "host-left-temp" });
          if (endForAll) student.conn.close();
        }
        if (student.mediaCall) student.mediaCall.close();
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
    spotlightTargetId = "host";
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

  // Step 1: Host Lobby Modal (Permanent Link or Generate New Link on Host's Choice)
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

    modal.innerHTML = `
      <div style="background: #ffffff; width: 420px; max-width: 94vw; border-radius: 18px; padding: 22px; box-shadow: 0 24px 48px rgba(0,0,0,0.28); position: relative;">
        <button id="closeLiveLobbyModal" type="button" style="position: absolute; top: 14px; right: 14px; width: 30px; height: 30px; border-radius: 50%; border: none; background: #f1f5f9; color: #475569; font-size: 15px; cursor: pointer;">✕</button>

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 19px;">
            <i class="fa-solid fa-mosque"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a;">${ACADEMY_NAME}</h3>
            <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">Configure Classroom & Start Hosting</p>
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
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <label style="font-size: 11px; font-weight: 700; color: #334155;">Classroom Link ID (Keep same or generate new)</label>
            <button id="btnGenerateNewRoomSlug" type="button" style="background: #e0f2fe; color: #0369a1; border: none; border-radius: 6px; padding: 2px 8px; font-size: 10.5px; font-weight: 700; cursor: pointer;">
              New Link ID
            </button>
          </div>
          <input id="iqraCustomRoomInput" type="text" value="${escapeHtml(activeRoomSlug)}" placeholder="e.g. iqra-darse-nizami"
            style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 12.5px; font-weight: 600; color: #0284c7; outline: none;" />
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 9px; margin-bottom: 15px;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">Student Invite Link (Secure Classroom Only)</div>
          <div id="iqraInvitePreviewText" style="font-size: 11px; color: #0f172a; word-break: break-all; font-family: monospace;">
            ${escapeHtml(getStudentClassUrl(activeRoomSlug))}
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
      previewEl.textContent = getStudentClassUrl(sanitizeRoomSlug(roomInput.value));
    });

    document.getElementById("btnGenerateNewRoomSlug").onclick = () => {
      const rand = Math.floor(1000 + Math.random() * 9000);
      roomInput.value = `iqra-class-${rand}`;
      previewEl.textContent = getStudentClassUrl(roomInput.value);
    };

    document.getElementById("closeLiveLobbyModal").onclick = () => modal.remove();

    document.getElementById("btnCopyLobbyLink").onclick = () => {
      navigator.clipboard.writeText(getStudentClassUrl(sanitizeRoomSlug(roomInput.value))).then(() => {
        showLiveToast("Student classroom link copied.");
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
    const inviteLink = getStudentClassUrl(activeRoomSlug);
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
          <button id="btnCopyClassLink" type="button" title="Copy Student Classroom Link" style="
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

          <button id="btnCloseLiveClass" type="button" title="Leave or End Live Class" style="
            background: #dc2626; color: #fff; border: none; border-radius: 7px;
            width: 25px; height: 25px; font-size: 11px; cursor: pointer;
          ">✕</button>
        </div>
      </div>

      <!-- Main Stage + Right Participants/Chat Panel -->
      <div style="flex: 1; display: flex; overflow: hidden; background: #020617;">
        <div id="iqraLiveFrameWrap" style="position: relative; flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 8px;">
          <div id="iqraHostStageFrame" style="width: 100%; height: 100%; border-radius: 16px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #000000; position: relative;">
            <video id="iqraTeacherPreviewVideo" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: contain; display: none; background: #000;"></video>
            <div id="iqraTeacherPlaceholder" style="display: flex; flex-direction: column; align-items: center; text-align: center; color: #94a3b8; padding: 16px;">
              <div id="iqraHostStageAvatar" style="width: 64px; height: 64px; border-radius: 50%; background: #0284c7; color: #ffffff; font-size: 22px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; border: 2px solid #38bdf8; overflow: hidden;">
                ${teacherAvatarDataUrl ? `<img src="${teacherAvatarDataUrl}" style="width:100%;height:100%;object-fit:cover;" />` : escapeHtml(hostInitials)}
              </div>
              <div style="font-size: 13px; font-weight: 700; color: #f8fafc;">${escapeHtml(teacherDisplayName)}</div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 3px;">Click <b>Share Board</b> below to broadcast your screen</div>
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
        <button id="btnToggleMic" type="button" style="background: #334155; color: #f8fafc; border: none; border-radius: 8px; padding: 5px 10px; font-size: 11.5px; font-weight: 600; cursor: pointer;">
          <i class="fa-solid fa-microphone"></i> Mic
        </button>
        <button id="btnToggleCam" type="button" style="background: #334155; color: #f8fafc; border: none; border-radius: 8px; padding: 5px 10px; font-size: 11.5px; font-weight: 600; cursor: pointer;">
          <i class="fa-solid fa-video"></i> Cam
        </button>
        <button id="btnShareBoardScreen" type="button" style="background: #16a34a; color: #ffffff; border: none; border-radius: 8px; padding: 5px 11px; font-size: 11.5px; font-weight: 700; cursor: pointer;">
          <i class="fa-solid fa-display"></i> Share Board
        </button>
        <button id="btnHostDeviceSettings" type="button" title="Audio, Video, Shape & Voice Settings" style="background: #334155; color: #f8fafc; border: none; border-radius: 8px; padding: 5px 9px; font-size: 11.5px; font-weight: 600; cursor: pointer;">
          <i class="fa-solid fa-gear"></i>
        </button>
      </div>
    `;

    document.body.appendChild(container);
    makeElementDraggable(container, document.getElementById("iqraLiveClassHeader"));
    renderHostParticipantsList();

    if (!classPeer || classPeer.destroyed) {
      classPeer = new Peer(activeRoomSlug);

      classPeer.on("open", () => {
        appendChatMessage("System", `${ACADEMY_NAME} — "${courseTitle}" is live.`, false, true);
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
        incomingCall.answer();
        incomingCall.on("stream", (studentStream) => {
          const entry = connectedStudents.get(incomingCall.peer);
          if (entry) {
            entry.incomingStream = studentStream;
            renderHostParticipantsList();
            if (spotlightTargetId === incomingCall.peer) {
              refreshHostStagePreview();
              broadcastStreamToAllStudents();
            }
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
            teacherAvatar: teacherAvatarDataUrl,
            videoShape: selectedVideoShape
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
          if (spotlightTargetId === conn.peer) spotlightTargetId = "host";
          updateStudentCountBadge();
          renderHostParticipantsList();
          syncRosterToAllStudents();
          refreshHostStagePreview();
          appendChatMessage("System", `${leftName} left the class.`, false, true);
        });
      });
    } else {
      // Host rejoined existing open room
      updateStudentCountBadge();
      renderHostParticipantsList();
      broadcastToAllStudents({
        type: "class-meta",
        academyName: ACADEMY_NAME,
        courseTitle,
        teacherName: teacherDisplayName,
        teacherAvatar: teacherAvatarDataUrl,
        videoShape: selectedVideoShape
      });
    }

    await acquireHostMedia(selectedMicId, selectedCamId);

    document.getElementById("btnCopyClassLink").onclick = () => {
      navigator.clipboard.writeText(inviteLink).then(() => {
        showLiveToast("Student classroom link copied.");
      });
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