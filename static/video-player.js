// ==========================================================================
// WHITEBOARD VIDEO GALLERY & FLOATING PLAYER MODULE (DUAL SEARCH HEADER)
// ==========================================================================
(function () {
  // 1. Injected Modal & Player Styles
  if (!document.getElementById("wb-video-gallery-styles")) {
    const style = document.createElement("style");
    style.id = "wb-video-gallery-styles";
    style.textContent = `
/* --- Gallery Modal Styles --- */
      .wb-video-modal-backdrop {
        position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(4px); z-index: 100000;
        display: none; align-items: center; justify-content: center;
      }
      .wb-video-modal-box {
        width: 940px; max-width: 95vw; height: 600px; max-height: 90vh;
        background: #ffffff; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.35);
        display: flex; flex-direction: column; overflow: hidden;
        border: 1px solid #cbd5e1; font-family: inherit;
      }
      .wb-vmodal-header {
        background: #0284c7; color: #ffffff; padding: 10px 16px;
        display: flex; align-items: center; gap: 12px; justify-content: space-between;
        flex-shrink: 0;
      }
      .wb-vmodal-title-left {
        display: flex; align-items: center; gap: 10px; flex-shrink: 0;
      }
      .wb-vmodal-title-left h3 {
        margin: 0; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 6px;
      }
      .wb-vcount-badge {
        background: rgba(255, 255, 255, 0.22); color: #ffffff;
        font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.35); white-space: nowrap;
      }

      /* Header Dual Search Wrapper */
      .wb-vheader-searches {
        display: flex; align-items: center; gap: 10px; flex: 1; max-width: 580px; justify-content: flex-end;
      }
      .wb-vinput-box {
        position: relative; display: flex; align-items: center; flex: 1;
      }
      .wb-vinput-box i.input-icon {
        position: absolute; left: 10px; font-size: 12px; color: #94a3b8; pointer-events: none;
      }
      .wb-vheader-input {
        width: 100%; height: 32px; background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 20px;
        padding: 0 12px 0 28px; font-size: 12px; color: #ffffff; outline: none;
        transition: all 0.2s;
      }
      .wb-vheader-input::placeholder { color: #e0f2fe; opacity: 0.85; }
      .wb-vheader-input:focus {
        background: #ffffff; color: #0f172a; border-color: #ffffff;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
      }
      .wb-vheader-input:focus::placeholder { color: #94a3b8; }
      .wb-vheader-input:focus + i.input-icon { color: #0284c7; }

      .wb-vpaste-btn {
        position: absolute; right: 3px; height: 26px; background: #0284c7;
        color: #ffffff; border: 1px solid #ffffff; border-radius: 15px;
        padding: 0 10px; font-size: 11px; font-weight: 600; cursor: pointer;
        display: flex; align-items: center; gap: 4px; transition: 0.2s;
      }
      .wb-vpaste-btn:hover { background: #0369a1; }

      .wb-vmodal-close {
        background: rgba(255,255,255,0.2); border: none; color: #fff;
        width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
        font-size: 14px; display: flex; align-items: center; justify-content: center;
        transition: 0.2s; flex-shrink: 0;
      }
      .wb-vmodal-close:hover { background: #ef4444; }

      /* Category Filter Toolbar */
      .wb-vmodal-toolbar {
        padding: 10px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
        display: flex; gap: 8px; align-items: center; flex-shrink: 0;
      }
      .wb-vtab-btn {
        background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 20px;
        padding: 5px 16px; font-size: 12px; font-weight: 500; color: #334155;
        cursor: pointer; transition: 0.2s;
      }
      .wb-vtab-btn.active, .wb-vtab-btn:hover {
        background: #0284c7; color: #ffffff; border-color: #0284c7;
      }

      /* Modal Body with Working Scroll & Non-Squeezing Grid */
      .wb-vmodal-body {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 20px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        grid-auto-rows: max-content;
        align-content: start;
        gap: 20px;
        background: #f1f5f9;
      }

      /* Card Item: Fixed Natural Flow */
      .wb-vcard {
        background: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid #e2e8f0;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
        height: auto;
        box-shadow: 0 2px 6px rgba(0,0,0,0.05);
      }
      .wb-vcard:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.12);
        border-color: #0284c7;
      }
      .wb-vcard-thumb {
        position: relative;
        width: 100%;
        padding-top: 56.25%;
        background: #000;
        flex-shrink: 0;
      }
      .wb-vcard-thumb img {
        position: absolute; top:0; left:0; width:100%; height:100%; object-fit: cover;
      }
      .wb-vcard-thumb .play-icon-overlay {
        position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.25); color: #fff; font-size: 28px; transition: 0.2s;
      }
      .wb-vcard:hover .play-icon-overlay { background: rgba(2, 132, 199, 0.4); }

      /* Title & Category Info Box (Never squished) */
      .wb-vcard-info {
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: #ffffff;
        min-height: 80px;
        justify-content: space-between;
      }
      .wb-vcard-title {
        font-size: 13.5px;
        font-weight: 600;
        color: #1e293b;
        line-height: 1.45;
        margin: 0;
        word-break: break-word;
      }
      .wb-vcard-category {
        font-size: 11px;
        font-weight: 600;
        color: #0284c7;
        background: #e0f2fe;
        align-self: flex-start;
        padding: 3px 10px;
        border-radius: 6px;
      }

      /* --- Floating Video Window --- */
      .wb-video-window {
        position: fixed; top: 80px; left: 80px; width: 520px; height: 340px;
        background: #0f172a; border: 1.5px solid #38bdf8; border-radius: 12px;
        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6); z-index: 100002;
        display: none; flex-direction: column; overflow: hidden;
        resize: both; min-width: 320px; min-height: 220px;
      }
      .wb-video-header {
        background: #1e293b; color: #f8fafc; padding: 8px 12px; font-size: 13px;
        font-weight: 600; display: flex; align-items: center; justify-content: space-between;
        cursor: move; user-select: none; border-bottom: 1px solid rgba(56, 189, 248, 0.2);
        gap: 10px;
      }
      .wb-video-title-wrap {
        display: flex; align-items: center; gap: 6px; overflow: hidden; flex: 1;
      }
      .wb-video-title-wrap span {
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .wb-video-close-btn {
        background: rgba(239, 68, 68, 0.2) !important;
        border: 1px solid #ef4444 !important;
        color: #ffffff !important;
        font-size: 14px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        width: 26px; height: 26px; min-width: 26px; border-radius: 6px;
        transition: all 0.2s; position: relative; z-index: 20;
      }
      .wb-video-close-btn:hover { background: #ef4444 !important; }
      .wb-video-body { flex: 1; width: 100%; height: 100%; background: #000000; }
      .wb-video-body iframe { width: 100%; height: 100%; border: none; display: block; }
    `;
    document.head.appendChild(style);
  }

// 2. Videos Database
  const videosData = [
    // Tajweed Category
    { id: "bw1KsgCWNDI", title: "Reciting Quran | Quran Class 02 | Learn Quran | Learn Tajweed | Iqra Islamic Academy", category: "Tajweed" },
    { id: "8ZdeBlH-o_s", title: "Reciting Quran | Quran Class 01 | Learn Quran | Learn Tajweed | Iqra Islamic Academy", category: "Tajweed" },
    { id: "-ie131Ok_Y8", title: "Learn Quran & Tajweed Class 03", category: "Tajweed" },
    { id: "uwz6iwNIEic", title: "Learn Quran & Tajweed Class 04", category: "Tajweed" },
    { id: "z_9pJAv1Utw", title: "Learn Quran & Tajweed Class 05", category: "Tajweed" },
    { id: "MlF3ZaNE2eM", title: "Learn Quran & Tajweed Class 06", category: "Tajweed" },

    // Mufti Qasim Category
    { id: "x1XRv1mHqDY", title: "Koe Bhi Zuban Seekhne Ka Behtareen Tareeqa | The Best Way to Learn Any Language | Mufti Qasim Attari", category: "Mufti Qasim" },
    { id: "1NuyCJmO6u0", title: "Nazar-e-Bad Ki Khas Alamat Aur Ilaj - Mufti Qasim Attari", category: "Mufti Qasim" },
    { id: "ObgHHxRPuwE", title: "Imam Kisai Aur Aik Sharbat Farosh - Mufti Qasim Attari", category: "Mufti Qasim" },
    { id: "44c041lZ338", title: "Dimagh Par Jadoo? Wazifa Aur Ilaj - Mufti Qasim Attari", category: "Mufti Qasim" },
    { id: "1a63o5MwjpU", title: "Bari Barkat Wala Chhota Sa Amal | Alhamdulillah Kehne Ki Fazilat | Mufti Qasim Attari", category: "Mufti Qasim" },
    { id: "YaPJI060xik", title: "Rah-e-Ilm Ke Musafir | Episode 07 | Mufti Qasim Attari", category: "Mufti Qasim" },
    { id: "unG6j0HXQb4", title: "Behtreen Insan Kesay Banain | Episode 12 | Behtreen Logon Ki Khususiyaat | Mufti Qasim Attari", category: "Mufti Qasim" },

    // Namaz Category
    { id: "0BJGy-8ChuY", title: "Female ki Namaz for kids", category: "Namaz" },
    { id: "flzX2XGwrdA", title: "Male ki Namaz for kids", category: "Namaz" },

    // Mukhtalif Videos For Kids Category
    { id: "HkWDYhfEUY4", title: "Kids Educational Video 01", category: "Mukhtalif Videos For Kids" },
    { id: "KRVzJ3h7Z7A", title: "Kids Educational Video 02", category: "Mukhtalif Videos For Kids" },
    { id: "Xyd4edqVSfw", title: "Kids Educational Video 03", category: "Mukhtalif Videos For Kids" },
    { id: "Q_wagTKtDVY", title: "Kids Educational Video 04", category: "Mukhtalif Videos For Kids" },
    { id: "13p_3nkzM4c", title: "Kids Educational Video 05", category: "Mukhtalif Videos For Kids" },
    { id: "tbq5CJd9cb8", title: "Kids Educational Video 06", category: "Mukhtalif Videos For Kids" },
    { id: "R7zw2DYZElU", title: "Kids Educational Video 07", category: "Mukhtalif Videos For Kids" },
    { id: "pLGDbetoqck", title: "Kids Educational Video 08", category: "Mukhtalif Videos For Kids" },
    { id: "7vqEGdsWYc8", title: "Kids Educational Video 09", category: "Mukhtalif Videos For Kids" },
    { id: "FSwy85bAJE0", title: "Kids Educational Video 10", category: "Mukhtalif Videos For Kids" },
    { id: "qOpnxydn6w8", title: "Iftaar Ki Dua - Ramazaan 2026 - Cartoon - FGN Channel", category: "Mukhtalif Videos For Kids" },
    { id: "s8zE4Ee-Xuo", title: "Program Hamaari Salaamati - Promo | Sayed Salman Attari", category: "Mukhtalif Videos For Kids" },

    // Achhi Achhi Baatein Category
    { id: "pmR-pU1dFQ8", title: "Monsoon Safety Tips: Barish Ke Mausam Mein Rakhein In Baaton Ka Khayal! 🌧️", category: "Achhi Achhi Baatein" },
    { id: "ziG3oyAYpIQ", title: "Kya Yeh Choti Si Galti Aapko Gunahgar Bana Rahi Hai? - Kya Aap Bhi Masjid Mein Yeh Galti Karte Hain?", category: "Achhi Achhi Baatein" },
    { id: "lEgV6YqTF8s", title: "5 Hazar Se 50 Lakh Tak Ka Safar | Sabaq Aamoz Kahani | Dawateislami", category: "Achhi Achhi Baatein" },
    { id: "4pAsXkA-6ew", title: "Jhoota Insaan | Short Story | Dawat-e-Islami India", category: "Achhi Achhi Baatein" },
    { id: "P_bRkgrGyFM", title: "Doctor Ki Fees | Short Story | Dawat-e-Islami India", category: "Achhi Achhi Baatein" }
  ];
  // 3. Helper: Extract YouTube ID from Any URL
  function extractYouTubeId(urlOrId) {
    if (!urlOrId) return "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = urlOrId.trim().match(regExp);
    return (match && match[2].length === 11) ? match[2] : urlOrId.trim();
  }

  // 4. Create DOM Elements
  const modalBackdrop = document.createElement("div");
  modalBackdrop.className = "wb-video-modal-backdrop";
  modalBackdrop.innerHTML = `
    <div class="wb-video-modal-box">
      <!-- Modal Header with Title, Count Badge, and Dual Search Bars -->
      <div class="wb-vmodal-header">
        <div class="wb-vmodal-title-left">
          <h3><i class="fa-solid fa-circle-play" style="color: #ef4444;"></i> Iqra-Video Gallery</h3>
          <span class="wb-vcount-badge" id="wbVCountBadge">${videosData.length} Videos</span>
        </div>

        <div class="wb-vheader-searches">
          <!-- 1. Search in Gallery -->
          <div class="wb-vinput-box">
            <i class="fa-solid fa-magnifying-glass input-icon"></i>
            <input type="text" class="wb-vheader-input" id="vSearchInput" placeholder="Gallery me talash karein...">
          </div>

          <!-- 2. Direct YouTube Link Input -->
          <div class="wb-vinput-box">
            <i class="fa-brands fa-youtube input-icon"></i>
            <input type="text" class="wb-vheader-input" id="vDirectUrlInput" placeholder="YouTube URL paste karein..." style="padding-right: 65px;">
            <button type="button" class="wb-vpaste-btn" id="btnPlayDirectUrl"><i class="fa-solid fa-play"></i> Play</button>
          </div>
        </div>

        <button class="wb-vmodal-close" id="closeVModalBtn" title="Close Gallery"><i class="fa-solid fa-xmark"></i></button>
      </div>

<!-- Category Filter Tabs -->
      <div class="wb-vmodal-toolbar">
        <button class="wb-vtab-btn active" data-cat="all">All Videos</button>
        <button class="wb-vtab-btn" data-cat="Tajweed">Tajweed</button>
        <button class="wb-vtab-btn" data-cat="Mufti Qasim">Mufti Qasim</button>
        <button class="wb-vtab-btn" data-cat="Namaz">Namaz</button>
        <button class="wb-vtab-btn" data-cat="Mukhtalif Videos For Kids">Mukhtalif Videos For Kids</button>
        <button class="wb-vtab-btn" data-cat="Achhi Achhi Baatein">Achhi Achhi Baatein</button>
      </div>

      <!-- Gallery Cards Grid -->
      <div class="wb-vmodal-body" id="vCardsContainer"></div>
    </div>
  `;
  document.body.appendChild(modalBackdrop);

  // Floating Player Window
  const playerWin = document.createElement("div");
  playerWin.className = "wb-video-window";
  playerWin.innerHTML = `
    <div class="wb-video-header" id="wbVideoHeader">
      <div class="wb-video-title-wrap">
        <i class="fa-brands fa-youtube" style="color: #ef4444;"></i>
        <span id="wbVideoTitleText">Video Player</span>
        <a id="wbVideoExternalLink" href="#" target="_blank" style="margin-left:8px; color:#38bdf8; font-size:11px; text-decoration:underline;" title="Open on YouTube">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Open
        </a>
      </div>
      <button type="button" class="wb-video-close-btn" id="wbVideoCloseBtn" title="Close Video">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div class="wb-video-body">
      <iframe id="wbVideoIframe" src="" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
    </div>
  `;
  document.body.appendChild(playerWin);

  const vCardsContainer = modalBackdrop.querySelector("#vCardsContainer");
  const vSearchInput = modalBackdrop.querySelector("#vSearchInput");
  const vDirectUrlInput = modalBackdrop.querySelector("#vDirectUrlInput");
  const btnPlayDirectUrl = modalBackdrop.querySelector("#btnPlayDirectUrl");
  const wbVCountBadge = modalBackdrop.querySelector("#wbVCountBadge");
  const tabButtons = modalBackdrop.querySelectorAll(".wb-vtab-btn");
  const closeVModalBtn = modalBackdrop.querySelector("#closeVModalBtn");

  const iframe = playerWin.querySelector("#wbVideoIframe");
  const titleText = playerWin.querySelector("#wbVideoTitleText");
  const extLink = playerWin.querySelector("#wbVideoExternalLink");
  const closePlayerBtn = playerWin.querySelector("#wbVideoCloseBtn");
  const header = playerWin.querySelector("#wbVideoHeader");

  let activeCategory = "all";

  // 5. Render Gallery Cards & Update Taadad
  function renderVideos() {
    const query = vSearchInput.value.toLowerCase().trim();
    vCardsContainer.innerHTML = "";

    const filtered = videosData.filter(v => {
      const matchCat = (activeCategory === "all" || v.category === activeCategory);
      const matchQuery = v.title.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });

    // Badge taadad update karein
    wbVCountBadge.textContent = `${filtered.length} / ${videosData.length} Videos`;

    if (filtered.length === 0) {
      vCardsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px;">Koi video nahi mili.</div>`;
      return;
    }

    filtered.forEach(v => {
      const card = document.createElement("div");
      card.className = "wb-vcard";
      const thumbUrl = `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`;

      card.innerHTML = `
        <div class="wb-vcard-thumb">
          <img src="${thumbUrl}" alt="${v.title}" loading="lazy">
          <div class="play-icon-overlay"><i class="fa-solid fa-play"></i></div>
        </div>
        <div class="wb-vcard-info">
          <div class="wb-vcard-title" title="${v.title}">${v.title}</div>
          <span class="wb-vcard-category">${v.category}</span>
        </div>
      `;

      card.addEventListener("click", () => {
        modalBackdrop.style.display = "none";
        window.playWhiteboardVideo(v.id, v.title);
      });

      vCardsContainer.appendChild(card);
    });
  }

  // 6. Direct URL Play Handler
  function handleDirectUrlPlay() {
    const val = vDirectUrlInput.value.trim();
    if (!val) return;
    const vidId = extractYouTubeId(val);
    if (vidId) {
      modalBackdrop.style.display = "none";
      window.playWhiteboardVideo(vidId, "Custom YouTube Video");
      vDirectUrlInput.value = "";
    } else {
      alert("Barah-e-karam sahi YouTube URL ya Video ID paste karein.");
    }
  }

  btnPlayDirectUrl.addEventListener("click", handleDirectUrlPlay);
  vDirectUrlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleDirectUrlPlay();
  });

  // Category filter
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.getAttribute("data-cat");
      renderVideos();
    });
  });

  vSearchInput.addEventListener("input", renderVideos);
  closeVModalBtn.addEventListener("click", () => {
    modalBackdrop.style.display = "none";
  });

  // Open Modal
  window.openVideoGallery = function () {
    renderVideos();
    modalBackdrop.style.display = "flex";
  };

  // 7. Floating Player Logic
  window.playWhiteboardVideo = function (videoId, title = "Educational Video") {
    titleText.textContent = title;
    extLink.href = `https://www.youtube.com/watch?v=${videoId}`;

    const currentOrigin = window.location.origin || "http://localhost";
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(currentOrigin)}`;
    playerWin.style.display = "flex";
  };

  window.closeWhiteboardVideo = function (e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    iframe.src = "";
    playerWin.style.display = "none";
  };

  // Close Button Handlers
  closePlayerBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
  closePlayerBtn.addEventListener("mousedown", (e) => e.stopPropagation());
  closePlayerBtn.addEventListener("click", window.closeWhiteboardVideo);

  // Dragging logic for player header
  let isDragging = false;
  let offsetX = 0, offsetY = 0;

  header.addEventListener("pointerdown", (e) => {
    if (e.target.closest("#wbVideoCloseBtn") || e.target.closest("a")) return;
    isDragging = true;
    offsetX = e.clientX - playerWin.offsetLeft;
    offsetY = e.clientY - playerWin.offsetTop;
    header.setPointerCapture(e.pointerId);
  });

  header.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const x = Math.max(10, Math.min(window.innerWidth - playerWin.offsetWidth - 10, e.clientX - offsetX));
    const y = Math.max(10, Math.min(window.innerHeight - playerWin.offsetHeight - 10, e.clientY - offsetY));
    playerWin.style.left = `${x}px`;
    playerWin.style.top = `${y}px`;
  });

  header.addEventListener("pointerup", (e) => {
    isDragging = false;
    try {
      header.releasePointerCapture(e.pointerId);
    } catch (err) {}
  });

  // 8. Connect Drawer Button
  const videoBtn = document.getElementById("dockBtnVideoGallery");
  if (videoBtn) {
    videoBtn.addEventListener("click", window.openVideoGallery);
  }
})();