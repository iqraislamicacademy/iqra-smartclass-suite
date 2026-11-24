// ========================================================
// IQRA SMARTCLASS SUITE - CINEMATIC WELCOME SPLASH SCREEN (welcome-splash.js)
// Clean Edition:
// 1. Synced with 2D Maps & Geography Explorer
// 2. Proper z-index above map modal & clean instant dismiss
// 3. Cooldown lock prevents accidental re-trigger spam
// ========================================================
(function (window) {
  "use strict";

  let splashTimer = null;
  let fadeOutTimer = null;
  let isSplashShowing = false;

  const toolState = {
    globe: { isOpen: false, lastShownAt: 0 },
    maps: { isOpen: false, lastShownAt: 0 },
    solar: { isOpen: false, lastShownAt: 0 },
  };

  const SPLASH_CONFIGS = {
    globe: {
      badge: "IQRA GEO-EARTH",
      title: "3D Real Satellite Globe Studio",
      subtitle: "Initializing Global Satellite Terrain, Continents & World Atlas...",
      accent: "#38bdf8",
      glow: "rgba(56, 189, 248, 0.38)",
      iconSvg: `
        <svg width="76" height="76" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="26" fill="url(#iqraGlobeSplashGrad)" stroke="#38bdf8" stroke-width="2"/>
          <ellipse cx="32" cy="32" rx="13" ry="26" stroke="#bae6fd" stroke-width="1.4" stroke-dasharray="3 2"/>
          <ellipse cx="32" cy="32" rx="26" ry="11" stroke="#bae6fd" stroke-width="1.4"/>
          <line x1="6" y1="32" x2="58" y2="32" stroke="#7dd3fc" stroke-width="1.2"/>
          <defs>
            <radialGradient id="iqraGlobeSplashGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stop-color="#38bdf8"/>
              <stop offset="55%" stop-color="#0284c7"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </radialGradient>
          </defs>
        </svg>
      `,
    },
    maps: {
badge: "IQRA MAPS",
      title: "Maps & Geography Explorer",
      subtitle: "Loading Political, Physical Terrain & Interactive Vector Layers...",
      accent: "#10b981",
      glow: "rgba(16, 185, 129, 0.38)",
      iconSvg: `
        <svg width="76" height="76" viewBox="0 0 64 64" fill="none">
          <polygon points="8,18 24,12 40,18 56,12 56,48 40,54 24,48 8,54" fill="rgba(16,185,129,0.18)" stroke="#10b981" stroke-width="2.2" stroke-linejoin="round"/>
          <line x1="24" y1="12" x2="24" y2="48" stroke="#34d399" stroke-width="1.5" stroke-dasharray="3 3"/>
          <line x1="40" y1="18" x2="40" y2="54" stroke="#34d399" stroke-width="1.5" stroke-dasharray="3 3"/>
          <path d="M32 18C27.6 18 24 21.6 24 26C24 32 32 41 32 41C32 41 40 32 40 26C40 21.6 36.4 18 32 18Z" fill="#fbbf24" stroke="#020617" stroke-width="1.5"/>
          <circle cx="32" cy="26" r="3" fill="#020617"/>
        </svg>
      `,
    },
    solar: {
      badge: "IQRA SPACE",
      title: "3D Space & Solar System Explorer",
      subtitle: "Calibrating Planetary Orbits, Moons & Deep-Space Astrophysics Engine...",
      accent: "#f59e0b",
      glow: "rgba(245, 158, 11, 0.42)",
      iconSvg: `
        <svg width="82" height="82" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" fill="url(#iqraSolarSplashHalo)"/>
          <ellipse cx="32" cy="32" rx="26" ry="9" transform="rotate(-18 32 32)" stroke="#fde68a" stroke-width="1.5" stroke-opacity="0.8"/>
          <circle cx="32" cy="32" r="11.5" fill="url(#iqraSolarSplashCore)"/>
          <circle cx="51" cy="26" r="2.6" fill="#38bdf8"/>
          <defs>
            <radialGradient id="iqraSolarSplashHalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fef08a" stop-opacity="0.9"/>
              <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#ea580c" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="iqraSolarSplashCore" cx="40%" cy="38%" r="60%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="45%" stop-color="#fbbf24"/>
              <stop offset="100%" stop-color="#d97706"/>
            </radialGradient>
          </defs>
        </svg>
      `,
    },
  };

  function isElementVisible(el) {
    if (!el || !document.body.contains(el)) return false;
    if (el.classList.contains("hidden") || el.hasAttribute("hidden")) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && parseFloat(style.opacity || "1") > 0.05;
  }

  function getExactModals() {
    return {
      globe: document.querySelector(".iqra-globe-modal"),
      maps: document.getElementById("iqraMaps3DModal") || document.querySelector(".iqra-maps-modal"),
      solar: document.getElementById("iqraSolar3DModal"),
    };
  }

  function injectSplashStyles() {
    if (document.getElementById("iqra-welcome-splash-styles")) return;
    const style = document.createElement("style");
    style.id = "iqra-welcome-splash-styles";
    style.textContent = `
      #iqraToolWelcomeSplash {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        background: radial-gradient(circle at center, #0f172a 0%, #020617 75%, #000000 100%);
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
        color: #f8fafc;
        opacity: 0;
        transition: opacity 0.25s ease;
        overflow: hidden;
      }
      #iqraToolWelcomeSplash.visible {
        display: flex;
        opacity: 1;
      }
      #iqraToolWelcomeSplash.fading-out {
        opacity: 0;
        pointer-events: none;
      }
      .iqra-splash-grid-bg {
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(56, 189, 248, 0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(56, 189, 248, 0.06) 1px, transparent 1px);
        background-size: 42px 42px;
        mask-image: radial-gradient(circle at center, black 35%, transparent 80%);
        pointer-events: none;
      }
      .iqra-splash-card {
        position: relative;
        z-index: 2;
        max-width: 480px;
        width: 90%;
        padding: 34px 28px;
        border-radius: 22px;
        background: rgba(15, 23, 42, 0.88);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(148, 163, 184, 0.25);
        text-align: center;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8);
        animation: iqraSplashPop 0.32s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes iqraSplashPop {
        from { transform: scale(0.94) translateY(10px); opacity: 0; }
        to { transform: scale(1) translateY(0); opacity: 1; }
      }
      .iqra-splash-icon-wrap {
        width: 96px;
        height: 96px;
        margin: 0 auto 14px auto;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: iqraSplashFloat 2.4s ease-in-out infinite;
      }
      @keyframes iqraSplashFloat {
        0%, 100% { transform: translateY(0px) scale(1); }
        50% { transform: translateY(-5px) scale(1.03); }
      }
      .iqra-splash-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 1.4px;
        margin-bottom: 10px;
        background: rgba(255, 255, 255, 0.08);
      }
      .iqra-splash-title {
        font-size: 22px;
        font-weight: 800;
        margin: 0 0 8px 0;
        letter-spacing: 0.3px;
        color: #ffffff;
      }
      .iqra-splash-sub {
        font-size: 13px;
        color: #94a3b8;
        line-height: 1.5;
        margin: 0 0 22px 0;
      }
      .iqra-splash-bar-track {
        width: 100%;
        height: 6px;
        background: rgba(30, 41, 59, 0.9);
        border-radius: 999px;
        overflow: hidden;
        margin-bottom: 18px;
      }
      .iqra-splash-bar-fill {
        height: 100%;
        width: 0%;
        border-radius: 999px;
      }
      .iqra-splash-skip-btn {
        background: rgba(30, 41, 59, 0.9);
        color: #e2e8f0;
        border: 1px solid rgba(148, 163, 184, 0.35);
        padding: 7px 18px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .iqra-splash-skip-btn:hover {
        background: #ffffff;
        color: #020617;
      }
      .iqra-splash-footer {
        position: absolute;
        bottom: 18px;
        font-size: 11px;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        color: #64748b;
        font-weight: 700;
      }
    `;
    document.head.appendChild(style);
  }

  function createSplashDOM() {
    if (document.getElementById("iqraToolWelcomeSplash")) return;
    injectSplashStyles();

    const el = document.createElement("div");
    el.id = "iqraToolWelcomeSplash";
    el.innerHTML = `
      <div class="iqra-splash-grid-bg"></div>
      <div class="iqra-splash-card" id="iqraSplashCard">
        <div class="iqra-splash-icon-wrap" id="iqraSplashIcon"></div>
        <div class="iqra-splash-badge" id="iqraSplashBadge">IQRA SMARTCLASS SUITE</div>
        <h2 class="iqra-splash-title" id="iqraSplashTitle">Welcome</h2>
        <p class="iqra-splash-sub" id="iqraSplashSub">Preparing interactive workspace...</p>
        <div class="iqra-splash-bar-track">
          <div class="iqra-splash-bar-fill" id="iqraSplashBarFill"></div>
        </div>
        <button class="iqra-splash-skip-btn" id="btnDismissSplashNow">Enter Workspace ➔</button>
      </div>
      <div class="iqra-splash-footer">IQRA SMARTCLASS SUITE • INTERACTIVE LEARNING ENGINE</div>
    `;
    document.body.appendChild(el);

    document.getElementById("btnDismissSplashNow")?.addEventListener("click", hideWelcomeSplash);
  }

  function hideWelcomeSplash() {
    if (splashTimer) {
      clearTimeout(splashTimer);
      splashTimer = null;
    }
    if (fadeOutTimer) {
      clearTimeout(fadeOutTimer);
      fadeOutTimer = null;
    }
    const el = document.getElementById("iqraToolWelcomeSplash");
    if (!el) return;
    el.classList.add("fading-out");
    fadeOutTimer = setTimeout(() => {
      el.classList.remove("visible", "fading-out");
      isSplashShowing = false;
    }, 240);
  }

  function showWelcomeSplash(typeKey) {
    const now = Date.now();
    if (toolState[typeKey] && now - toolState[typeKey].lastShownAt < 2500) {
      return;
    }
    if (toolState[typeKey]) toolState[typeKey].lastShownAt = now;

    if (splashTimer) clearTimeout(splashTimer);
    if (fadeOutTimer) clearTimeout(fadeOutTimer);

    createSplashDOM();
    const cfg = SPLASH_CONFIGS[typeKey] || SPLASH_CONFIGS.maps;
    const el = document.getElementById("iqraToolWelcomeSplash");
    const card = document.getElementById("iqraSplashCard");
    const iconEl = document.getElementById("iqraSplashIcon");
    const badgeEl = document.getElementById("iqraSplashBadge");
    const titleEl = document.getElementById("iqraSplashTitle");
    const subEl = document.getElementById("iqraSplashSub");
    const fillEl = document.getElementById("iqraSplashBarFill");

    if (!el) return;

    iconEl.innerHTML = cfg.iconSvg;
    iconEl.style.boxShadow = `0 0 36px ${cfg.glow}`;
    badgeEl.innerText = cfg.badge;
    badgeEl.style.color = cfg.accent;
    titleEl.innerText = cfg.title;
    subEl.innerText = cfg.subtitle;
    card.style.borderColor = cfg.accent;
    fillEl.style.transition = "none";
    fillEl.style.background = cfg.accent;
    fillEl.style.width = "0%";

    el.classList.remove("fading-out");
    el.classList.add("visible");
    isSplashShowing = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fillEl.style.transition = "width 1.3s cubic-bezier(0.22, 1, 0.36, 1)";
        fillEl.style.width = "100%";
      });
    });

    splashTimer = setTimeout(hideWelcomeSplash, 1500);
  }

  function syncModalStates() {
    const modals = getExactModals();
    (["globe", "maps", "solar"]).forEach((key) => {
      const currentlyOpen = isElementVisible(modals[key]);
      if (currentlyOpen && !toolState[key].isOpen) {
        showWelcomeSplash(key);
      }
      toolState[key].isOpen = currentlyOpen;
    });
  }

  const observer = new MutationObserver(() => {
    syncModalStates();
  });

  function startObserver() {
    if (!document.body) return;
    observer.observe(document.body, {
      childList: true,
      subtree: false,
      attributes: true,
      attributeFilter: ["class", "style", "hidden"],
    });
  }

  if (document.body) {
    startObserver();
  } else {
    window.addEventListener("DOMContentLoaded", startObserver);
  }

  document.addEventListener(
    "click",
    (e) => {
      if (!e.target || !e.target.closest) return;

      if (e.target.closest("#btnCloseMaps3D")) {
        setTimeout(() => {
          const modal = document.getElementById("iqraMaps3DModal");
          if (modal) {
            modal.classList.remove("open", "active");
            modal.style.display = "";
          }
          toolState.maps.isOpen = false;
        }, 50);
        return;
      }

      const mapsBtn = e.target.closest("#dockBtnMaps3D");
      if (!mapsBtn) return;

      const modal = document.getElementById("iqraMaps3DModal");
      const alreadyVisible = modal && isElementVisible(modal);
      if (!alreadyVisible) {
        showWelcomeSplash("maps");
      }
    },
    true
  );

  window.showIqraToolWelcomeSplash = showWelcomeSplash;
  window.hideIqraToolWelcomeSplash = hideWelcomeSplash;
})(window);