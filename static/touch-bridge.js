// ========================================================
// UNIVERSAL TOUCH-TO-MOUSE & RIGHT-CLICK GUARD (touch-bridge.js)
// Scoped strictly to Math/Geometry & Science Apparatus (Zero Pen/Eraser Conflict)
// ========================================================
(function () {
  "use strict";

  // 1. Long-Press Right-Click (Inspect/Context Menu) Block on Board, PDF & Instruments
  document.addEventListener(
    "contextmenu",
    function (e) {
      if (
        e.target.closest(
          "#whiteboardPane, #documentPane, #mathApparatusLayer, .math-instrument, .math-tool, [id*='ruler'], [id*='protractor'], [id*='compass'], [id*='setsquare'], [id*='divider'], canvas, svg"
        )
      ) {
        e.preventDefault();
      }
    },
    { capture: true }
  );

  // 2. Touch-to-Mouse Dispatcher ONLY for Math/Geometry Instruments
  let activeTouchId = null;

  function dispatchSyntheticMouse(type, touch, target) {
    if (!target) return;
    const mouseEvent = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      detail: 1,
      screenX: touch.screenX,
      screenY: touch.screenY,
      clientX: touch.clientX,
      clientY: touch.clientY,
      button: 0,
      buttons: type === "mouseup" ? 0 : 1,
    });
    target.dispatchEvent(mouseEvent);
  }

  function isInstrumentTarget(el) {
    if (!el || !el.closest) return false;
    // Sirf Math/Geometry instruments par chalega — .upper-canvas ya #renderTarget par NAHI!
    return Boolean(
      el.closest(
        "#mathApparatusLayer, .math-instrument, .math-tool, [id*='ruler'], [id*='protractor'], [id*='compass'], [id*='setsquare'], [id*='divider']"
      )
    );
  }

  document.addEventListener(
    "touchstart",
    function (e) {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY) || e.target;

      if (!isInstrumentTarget(target)) return;

      activeTouchId = touch.identifier;
      if (e.cancelable) e.preventDefault();

      dispatchSyntheticMouse("mouseover", touch, target);
      dispatchSyntheticMouse("mousemove", touch, target);
      dispatchSyntheticMouse("mousedown", touch, target);
    },
    { passive: false, capture: true }
  );

  document.addEventListener(
    "touchmove",
    function (e) {
      if (activeTouchId === null) return;
      const touch = Array.from(e.touches).find((t) => t.identifier === activeTouchId);
      if (!touch) return;

      const target = document.elementFromPoint(touch.clientX, touch.clientY) || e.target;
      if (e.cancelable) e.preventDefault();

      dispatchSyntheticMouse("mousemove", touch, target);
    },
    { passive: false, capture: true }
  );

  function handleTouchEnd(e) {
    if (activeTouchId === null) return;
    const touch = Array.from(e.changedTouches).find((t) => t.identifier === activeTouchId);
    if (!touch) return;

    const target = document.elementFromPoint(touch.clientX, touch.clientY) || e.target;
    dispatchSyntheticMouse("mouseup", touch, target);
    dispatchSyntheticMouse("click", touch, target);

    activeTouchId = null;
  }

  document.addEventListener("touchend", handleTouchEnd, { passive: false, capture: true });
  document.addEventListener("touchcancel", handleTouchEnd, { passive: false, capture: true });

  // 3. Auto-Apply touch-action: none on Existing & Future Tools
  function enforceTouchAction(root = document) {
    const selectors =
      "#mathApparatusLayer, .math-instrument, .math-tool, [id*='ruler'], [id*='protractor'], [id*='compass'], [id*='setsquare'], [id*='divider'], .upper-canvas";
    root.querySelectorAll(selectors).forEach((el) => {
      el.style.touchAction = "none";
      el.style.userSelect = "none";
      el.style.webkitUserSelect = "none";
    });
  }

  enforceTouchAction();

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          enforceTouchAction(node.parentElement || document);
        }
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();