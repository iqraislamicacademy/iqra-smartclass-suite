// ==========================================
// IQRA SMARTCLASS SUITE - CLEAN app.js (PART 1/3)
// Core Whiteboard, Cursor, Undo/Redo, Text, Shapes & Backgrounds
// ==========================================

// ========================================================
// 1. ADVANCED WHITEBOARD ENGINE
// ========================================================
const canvasWrapper = document.getElementById("canvasWrapper");
let currentBgColor = "#ffffff";

const fabricCanvas = new fabric.Canvas("whiteboardCanvas", {
  isDrawingMode: true,
  backgroundColor: "transparent",
  selection: true,
});

window.fabricCanvas = fabricCanvas;

function resizeCanvas() {
  const wrapper = document.getElementById("canvasWrapper");
  if (!wrapper || !fabricCanvas) return;

  const rect = wrapper.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height || window.innerHeight - 120;

  fabricCanvas.setDimensions({
    width: w,
    height: h,
  });

  fabricCanvas.calcOffset();
  fabricCanvas.renderAll();
}

window.resizeCanvas = resizeCanvas;
window.addEventListener("resize", resizeCanvas);
setTimeout(resizeCanvas, 200);

let activeTool = "pen";
const brushColor = document.getElementById("brushColor");
const brushSize = document.getElementById("brushSize");
const toolButtons = document.querySelectorAll(".tool-btn[data-tool]");
const textFormatBar = document.getElementById("textFormatBar");

fabricCanvas.freeDrawingBrush.width = 4;
if (brushColor) fabricCanvas.freeDrawingBrush.color = brushColor.value;

function updateCustomCursor() {
  const size = brushSize ? parseInt(brushSize.value, 10) : 4;
  const color = brushColor ? brushColor.value : "#1e293b";

  if (activeTool === "pen") {
    const dotSize = Math.max(size, 6);
    const canvas = document.createElement("canvas");
    canvas.width = dotSize + 4;
    canvas.height = dotSize + 4;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.arc((dotSize + 4) / 2, (dotSize + 4) / 2, dotSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();

    const cursorUrl = canvas.toDataURL();
    const center = Math.round((dotSize + 4) / 2);
    fabricCanvas.freeDrawingCursor = "url(" + cursorUrl + ") " + center + " " + center + ", crosshair";
  } else if (activeTool === "eraser") {
    fabricCanvas.freeDrawingCursor = "none";
    const circleSize = Math.max(size * 1.5, 14);
    const canvas = document.createElement("canvas");
    canvas.width = circleSize + 4;
    canvas.height = circleSize + 4;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.arc((circleSize + 4) / 2, (circleSize + 4) / 2, circleSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const cursorUrl = canvas.toDataURL();
    const center = Math.round((circleSize + 4) / 2);
    fabricCanvas.freeDrawingCursor = "url(" + cursorUrl + ") " + center + " " + center + ", auto";
    fabricCanvas.defaultCursor = "url(" + cursorUrl + ") " + center + " " + center + ", auto";
    fabricCanvas.hoverCursor = "url(" + cursorUrl + ") " + center + " " + center + ", auto";
  } else {
    fabricCanvas.freeDrawingCursor = "crosshair";
    fabricCanvas.defaultCursor = "default";
    fabricCanvas.hoverCursor = "move";
  }
}
updateCustomCursor();

let canvasHistory = [];
let historyIndex = -1;
let isUndoRedoAction = false;

function saveCanvasState() {
  if (isUndoRedoAction) return;
  const json = JSON.stringify(fabricCanvas.toJSON());
  if (historyIndex < canvasHistory.length - 1) {
    canvasHistory = canvasHistory.slice(0, historyIndex + 1);
  }
  canvasHistory.push(json);
  historyIndex++;
}
setTimeout(saveCanvasState, 300);

fabricCanvas.on("object:added", () => {
  if (!window.isDrawingShape) saveCanvasState();
});
fabricCanvas.on("object:modified", saveCanvasState);

const btnUndo = document.getElementById("btnUndo");
if (btnUndo) {
  btnUndo.addEventListener("click", () => {
    if (historyIndex > 0) {
      isUndoRedoAction = true;
      historyIndex--;
      fabricCanvas.loadFromJSON(canvasHistory[historyIndex], () => {
        fabricCanvas.renderAll();
        isUndoRedoAction = false;
      });
    }
  });
}

const btnRedo = document.getElementById("btnRedo");
if (btnRedo) {
  btnRedo.addEventListener("click", () => {
    if (historyIndex < canvasHistory.length - 1) {
      isUndoRedoAction = true;
      historyIndex++;
      fabricCanvas.loadFromJSON(canvasHistory[historyIndex], () => {
        fabricCanvas.renderAll();
        isUndoRedoAction = false;
      });
    }
  });
}

// ========================================================
// 2. GLOBAL TOOL BUTTON CLICK DELEGATION
// ========================================================
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".tool-btn[data-tool]");
  if (!btn) return;

  document.querySelectorAll(".tool-btn[data-tool]").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  activeTool = btn.getAttribute("data-tool");
  if (textFormatBar) textFormatBar.classList.add("hidden");

  if (activeTool === "pen") {
    if (typeof window.applyPenSuiteSettings === "function") {
      window.applyPenSuiteSettings();
    } else {
      fabricCanvas.isDrawingMode = true;
      fabricCanvas.selection = false;
      fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
      fabricCanvas.freeDrawingBrush.color = brushColor ? brushColor.value : "#1e293b";
      fabricCanvas.freeDrawingBrush.width = brushSize ? parseInt(brushSize.value, 10) : 4;
    }
  } else if (activeTool === "highlighter") {
    fabricCanvas.isDrawingMode = true;
    fabricCanvas.selection = false;
    fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
    fabricCanvas.freeDrawingBrush.color = "rgba(250, 204, 21, 0.4)";
    fabricCanvas.freeDrawingBrush.width = 24;
  } else if (activeTool === "eraser") {
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = false;
    fabricCanvas.skipTargetFind = true;
    fabricCanvas.defaultCursor = "none";
  } else if (activeTool === "text") {
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = true;
    if (textFormatBar) textFormatBar.classList.remove("hidden");
  } else {
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = true;
  }
  updateCustomCursor();
});

// ========================================================
// 3. TEXT & FONT FORMATTING CONTROLS
// ========================================================
fabricCanvas.on("mouse:down", (opt) => {
  if (activeTool === "text" && !opt.target) {
    const pointer = fabricCanvas.getPointer(opt.e);
    const fontElem = document.getElementById("fontFamilySelect");
    const sizeElem = document.getElementById("fontSizeInput");
    const selectedFont = fontElem ? fontElem.value : "Arial";
    const selectedSize = sizeElem ? parseInt(sizeElem.value, 10) : 32;

    const isRTL = selectedFont.includes("Urdu") || selectedFont.includes("Amiri");

    const text = new fabric.IText("", {
      left: pointer.x,
      top: pointer.y,
      fontFamily: selectedFont,
      fontSize: selectedSize,
      fill: brushColor ? brushColor.value : "#1e293b",
      direction: isRTL ? "rtl" : "ltr",
      textAlign: isRTL ? "right" : "left",
      cursorColor: brushColor ? brushColor.value : "#1e293b",
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    text.enterEditing();
    if (text.hiddenTextarea) text.hiddenTextarea.focus();
    if (textFormatBar) textFormatBar.classList.remove("hidden");

    text.on("editing:exited", () => {
      if (!text.text || text.text.trim() === "") {
        fabricCanvas.remove(text);
        fabricCanvas.renderAll();
      }
      saveCanvasState();
    });

    activeTool = "select";
    toolButtons.forEach((b) => b.classList.remove("active"));
    const selectBtn = document.querySelector('.tool-btn[data-tool="select"]');
    if (selectBtn) selectBtn.classList.add("active");
    updateCustomCursor();
  }
});

const customFontInput = document.getElementById("customFontInput");
const fontFamilySelect = document.getElementById("fontFamilySelect");

if (customFontInput) {
  customFontInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fontName = file.name.replace(/\.[^/.]+$/, "");
    const fontBuffer = await file.arrayBuffer();

    const fontFace = new FontFace(fontName, fontBuffer);
    await fontFace.load();
    document.fonts.add(fontFace);

    if (fontFamilySelect) {
      const newOption = document.createElement("option");
      newOption.value = fontName;
      newOption.innerText = "Installed: " + fontName;
      newOption.selected = true;
      fontFamilySelect.appendChild(newOption);
    }

    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj.type === "i-text") {
      activeObj.set("fontFamily", fontName);
      fabricCanvas.renderAll();
      saveCanvasState();
    }
  });
}

if (fontFamilySelect) {
  fontFamilySelect.addEventListener("change", (e) => {
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj.type === "i-text") {
      activeObj.set("fontFamily", e.target.value);
      if (e.target.value.includes("Urdu") || e.target.value.includes("Amiri")) {
        activeObj.set("direction", "rtl");
        activeObj.set("textAlign", "right");
      }
      fabricCanvas.renderAll();
      saveCanvasState();
    }
  });
}

const fontSizeInput = document.getElementById("fontSizeInput");
if (fontSizeInput) {
  fontSizeInput.addEventListener("input", (e) => {
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj.type === "i-text") {
      activeObj.set("fontSize", parseInt(e.target.value, 10) || 28);
      fabricCanvas.renderAll();
      saveCanvasState();
    }
  });
}

const btnBold = document.getElementById("btnTextBold");
if (btnBold) {
  btnBold.addEventListener("click", (e) => {
    e.stopPropagation();
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj.type === "i-text") {
      const isBold = activeObj.fontWeight === "bold";
      activeObj.set("fontWeight", isBold ? "normal" : "bold");
      fabricCanvas.renderAll();
      saveCanvasState();
      fabricCanvas.setActiveObject(activeObj);
    }
  });
}

const btnItalic = document.getElementById("btnTextItalic");
if (btnItalic) {
  btnItalic.addEventListener("click", (e) => {
    e.stopPropagation();
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj.type === "i-text") {
      const isItalic = activeObj.fontStyle === "italic";
      activeObj.set("fontStyle", isItalic ? "normal" : "italic");
      fabricCanvas.renderAll();
      saveCanvasState();
      fabricCanvas.setActiveObject(activeObj);
    }
  });
}

const btnDirLTR = document.getElementById("btnDirLTR");
if (btnDirLTR) {
  btnDirLTR.addEventListener("click", (e) => {
    e.stopPropagation();
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj.type === "i-text") {
      activeObj.set("direction", "ltr");
      activeObj.set("textAlign", "left");
      fabricCanvas.renderAll();
      saveCanvasState();
      fabricCanvas.setActiveObject(activeObj);
    }
  });
}

const btnDirRTL = document.getElementById("btnDirRTL");
if (btnDirRTL) {
  btnDirRTL.addEventListener("click", (e) => {
    e.stopPropagation();
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj.type === "i-text") {
      activeObj.set("direction", "rtl");
      activeObj.set("textAlign", "right");
      fabricCanvas.renderAll();
      saveCanvasState();
      fabricCanvas.setActiveObject(activeObj);
    }
  });
}

const listStyleSelect = document.getElementById("listStyleSelect");
if (listStyleSelect) {
  listStyleSelect.addEventListener("change", (e) => {
    const style = e.target.value;
    if (!style) return;

    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj.type === "i-text") {
      let lines = activeObj.text.split("\n");
      const urduNumbers = ["\u06F1", "\u06F2", "\u06F3", "\u06F4", "\u06F5", "\u06F6", "\u06F7", "\u06F8", "\u06F9", "\u06F1\u06F0"];
      const abjad = ["\u0627", "\u0628", "\u062C", "\u062F", "\u0647", "\u0648", "\u0632", "\u062D", "\u0637", "\u06CC"];
      const roman = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];

      lines = lines.map((line, idx) => {
        const cleaned = line.replace(/^([0-9]+\.|\w\.|[\u06F1-\u06F9\u06F0]+\.|[\u0627-\u06CC]+\.|[\u2022\u27A4\u2714])\s*/, "");
        if (style === "1") return idx + 1 + ". " + cleaned;
        if (style === "A") return String.fromCharCode(65 + (idx % 26)) + ". " + cleaned;
        if (style === "i") return (roman[idx % roman.length] || idx + 1) + ". " + cleaned;
        if (style === "ur") return (urduNumbers[idx % urduNumbers.length] || idx + 1) + ". " + cleaned;
        if (style === "abjad") return (abjad[idx % abjad.length] || idx + 1) + ". " + cleaned;
        if (style === "bullet") return "\u2022 " + cleaned;
        if (style === "arrow") return "\u27A4 " + cleaned;
        if (style === "check") return "\u2714 " + cleaned;
        return line;
      });

      activeObj.set("text", lines.join("\n"));
      fabricCanvas.renderAll();
      saveCanvasState();
      listStyleSelect.value = "";
    }
  });
}

fabricCanvas.on("selection:created", (e) => {
  if (e.selected && e.selected[0].type === "i-text") {
    activeTool = "text";
    if (textFormatBar) textFormatBar.classList.remove("hidden");
  }
});

fabricCanvas.on("selection:updated", (e) => {
  if (e.selected && e.selected[0].type === "i-text") {
    activeTool = "text";
    if (textFormatBar) textFormatBar.classList.remove("hidden");
  }
});

fabricCanvas.on("selection:cleared", () => {
  setTimeout(() => {
    const isOverBar = textFormatBar && textFormatBar.matches(":hover");
    if (isOverBar) return;

    const activeObj = fabricCanvas.getActiveObject();
    if (!activeObj && textFormatBar) {
      textFormatBar.classList.add("hidden");
      if (activeTool === "text") activeTool = "pen";
    }
  }, 120);
});

if (textFormatBar) {
  textFormatBar.addEventListener("mousedown", (e) => {
    if (e.target.tagName !== "SELECT" && e.target.tagName !== "INPUT") {
      e.preventDefault();
    }
  });
}

// ========================================================
// 4. SHAPES ENGINE & CANVAS DRAWING
// ========================================================
let isDrawingShape = false;
let shapeOriginX = 0;
let shapeOriginY = 0;
let activeShape = null;

const SHAPE_TOOLS = ["line", "arrow", "rectangle", "circle", "triangle", "star"];

fabricCanvas.on("mouse:down", (o) => {
  if (!SHAPE_TOOLS.includes(activeTool)) return;

  fabricCanvas.selection = false;
  isDrawingShape = true;
  const pointer = fabricCanvas.getPointer(o.e);
  shapeOriginX = pointer.x;
  shapeOriginY = pointer.y;

  const strokeColor = brushColor ? brushColor.value : "#1e293b";
  const strokeWidth = brushSize ? parseInt(brushSize.value, 10) : 4;

  if (activeTool === "rectangle") {
    activeShape = new fabric.Rect({
      left: shapeOriginX,
      top: shapeOriginY,
      width: 0,
      height: 0,
      fill: "transparent",
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      selectable: false,
    });
  } else if (activeTool === "circle") {
    activeShape = new fabric.Ellipse({
      left: shapeOriginX,
      top: shapeOriginY,
      rx: 0,
      ry: 0,
      fill: "transparent",
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      selectable: false,
    });
  } else if (activeTool === "triangle") {
    activeShape = new fabric.Triangle({
      left: shapeOriginX,
      top: shapeOriginY,
      width: 0,
      height: 0,
      fill: "transparent",
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      selectable: false,
    });
  } else if (activeTool === "star") {
    activeShape = new fabric.Polygon(
      [
        { x: 50, y: 0 },
        { x: 61, y: 35 },
        { x: 98, y: 35 },
        { x: 68, y: 57 },
        { x: 79, y: 91 },
        { x: 50, y: 70 },
        { x: 21, y: 91 },
        { x: 32, y: 57 },
        { x: 2, y: 35 },
        { x: 39, y: 35 },
      ],
      {
        left: shapeOriginX,
        top: shapeOriginY,
        scaleX: 0,
        scaleY: 0,
        fill: "transparent",
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        strokeLineJoin: "round",
        selectable: false,
      }
    );
  } else if (activeTool === "line" || activeTool === "arrow") {
    activeShape = new fabric.Line([shapeOriginX, shapeOriginY, shapeOriginX, shapeOriginY], {
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      strokeLineCap: "round",
      selectable: false,
    });
  }

  if (activeShape) {
    fabricCanvas.add(activeShape);
  }
});

fabricCanvas.on("mouse:move", (o) => {
  if (!isDrawingShape || !activeShape) return;
  const pointer = fabricCanvas.getPointer(o.e);
  const isShiftPressed = o.e.shiftKey;

  if (activeTool === "rectangle") {
    let w = Math.abs(shapeOriginX - pointer.x);
    let h = Math.abs(shapeOriginY - pointer.y);
    if (isShiftPressed) {
      const side = Math.max(w, h);
      w = side;
      h = side;
    }
    activeShape.set({
      width: w,
      height: h,
      left: pointer.x < shapeOriginX ? shapeOriginX - w : shapeOriginX,
      top: pointer.y < shapeOriginY ? shapeOriginY - h : shapeOriginY,
    });
  } else if (activeTool === "circle") {
    let rx = Math.abs(shapeOriginX - pointer.x) / 2;
    let ry = Math.abs(shapeOriginY - pointer.y) / 2;
    if (isShiftPressed) {
      const r = Math.max(rx, ry);
      rx = r;
      ry = r;
    }
    activeShape.set({
      rx: rx,
      ry: ry,
      left: Math.min(shapeOriginX, pointer.x),
      top: Math.min(shapeOriginY, pointer.y),
    });
  } else if (activeTool === "triangle") {
    let w = Math.abs(shapeOriginX - pointer.x);
    let h = Math.abs(shapeOriginY - pointer.y);
    activeShape.set({
      width: w,
      height: h,
      left: Math.min(shapeOriginX, pointer.x),
      top: Math.min(shapeOriginY, pointer.y),
    });
  } else if (activeTool === "star") {
    let w = Math.abs(shapeOriginX - pointer.x);
    let h = Math.abs(shapeOriginY - pointer.y);
    activeShape.set({
      scaleX: w / 100,
      scaleY: h / 100,
      left: Math.min(shapeOriginX, pointer.x),
      top: Math.min(shapeOriginY, pointer.y),
    });
  } else if (activeTool === "line" || activeTool === "arrow") {
    let targetX = pointer.x;
    let targetY = pointer.y;
    if (isShiftPressed) {
      const dx = Math.abs(targetX - shapeOriginX);
      const dy = Math.abs(targetY - shapeOriginY);
      if (dx > dy) targetY = shapeOriginY;
      else targetX = shapeOriginX;
    }
    activeShape.set({ x2: targetX, y2: targetY });
  }

  fabricCanvas.renderAll();
});

fabricCanvas.on("mouse:up", () => {
  if (!isDrawingShape || !activeShape) return;

  const strokeColor = brushColor ? brushColor.value : "#1e293b";
  const strokeWidth = brushSize ? parseInt(brushSize.value, 10) : 4;

  if (activeTool === "arrow") {
    const x1 = activeShape.x1;
    const y1 = activeShape.y1;
    const x2 = activeShape.x2;
    const y2 = activeShape.y2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);

    const headLength = Math.max(strokeWidth * 4.5, 20);
    const arrowAngle = Math.PI / 6;

    const leftX = x2 - headLength * Math.cos(angle - arrowAngle);
    const leftY = y2 - headLength * Math.sin(angle - arrowAngle);
    const rightX = x2 - headLength * Math.cos(angle + arrowAngle);
    const rightY = y2 - headLength * Math.sin(angle + arrowAngle);

    const arrowPathData = `M ${x1} ${y1} L ${x2} ${y2} M ${leftX} ${leftY} L ${x2} ${y2} L ${rightX} ${rightY} Z`;

    const arrowObject = new fabric.Path(arrowPathData, {
      stroke: strokeColor,
      fill: strokeColor,
      strokeWidth: strokeWidth,
      strokeLineCap: "round",
      strokeLineJoin: "round",
      selectable: false,
    });

    fabricCanvas.remove(activeShape);
    fabricCanvas.add(arrowObject);
  } else {
    activeShape.set({ selectable: true });
    activeShape.setCoords();
  }

  fabricCanvas.discardActiveObject();
  fabricCanvas.renderAll();

  isDrawingShape = false;
  activeShape = null;

  if (typeof saveCanvasState === "function") saveCanvasState();

  activeTool = "select";
  fabricCanvas.selection = true;

  if (typeof toolButtons !== "undefined") {
    toolButtons.forEach((b) => b.classList.remove("active"));
  }
  const selectBtn = document.querySelector('.tool-btn[data-tool="select"]');
  if (selectBtn) selectBtn.classList.add("active");

  fabricCanvas.isDrawingMode = false;
  if (typeof updateCustomCursor === "function") updateCustomCursor();
});

// ==========================================
// 5. BACKGROUND SYSTEM (ERASER & UNDO SAFE)
// ==========================================
const btnBgSettings = document.getElementById("btnBgSettings");
const bgSettingsPanel = document.getElementById("bgSettingsPanel");
const boardBgSelect = document.getElementById("boardBgSelect");
const bgPatternColor = document.getElementById("bgPatternColor");

if (btnBgSettings && bgSettingsPanel) {
  btnBgSettings.addEventListener("click", (e) => {
    e.stopPropagation();
    bgSettingsPanel.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!bgSettingsPanel.contains(e.target) && e.target !== btnBgSettings) {
      bgSettingsPanel.classList.add("hidden");
    }
  });
}

function updateBoardBackground() {
  if (typeof fabricCanvas === "undefined" || !fabricCanvas) return;

  const bgType = boardBgSelect ? boardBgSelect.value : "white";
  const lineColor = bgPatternColor ? bgPatternColor.value : "#94a3b8";
  const container = document.getElementById("canvasWrapper") || (fabricCanvas && fabricCanvas.wrapperEl);

  if (!container) return;

  fabricCanvas.backgroundColor = null;
  fabricCanvas.clearContext(fabricCanvas.contextContainer);

  if (bgType === "white") {
    container.style.backgroundImage = "none";
    container.style.backgroundColor = "#ffffff";
    fabricCanvas.requestRenderAll();
    return;
  }
  if (bgType === "green") {
    container.style.backgroundImage = "none";
    container.style.backgroundColor = "#0f5132";
    fabricCanvas.requestRenderAll();
    return;
  }
  if (bgType === "dark") {
    container.style.backgroundImage = "none";
    container.style.backgroundColor = "#0f172a";
    fabricCanvas.requestRenderAll();
    return;
  }
  if (bgType === "vintage-paper") {
    container.style.backgroundImage = "none";
    container.style.backgroundColor = "#fcf6e8";
    fabricCanvas.requestRenderAll();
    return;
  }

  const patternCanvas = document.createElement("canvas");
  const pctx = patternCanvas.getContext("2d");

  if (bgType === "grid-small") {
    patternCanvas.width = 30;
    patternCanvas.height = 30;
    pctx.fillStyle = "#ffffff";
    pctx.fillRect(0, 0, 30, 30);
    pctx.strokeStyle = lineColor;
    pctx.lineWidth = 1;
    pctx.strokeRect(0, 0, 30, 30);
  } else if (bgType === "grid-large") {
    patternCanvas.width = 50;
    patternCanvas.height = 50;
    pctx.fillStyle = "#ffffff";
    pctx.fillRect(0, 0, 50, 50);
    pctx.strokeStyle = lineColor;
    pctx.lineWidth = 1.2;
    pctx.strokeRect(0, 0, 50, 50);
  } else if (bgType === "dotted") {
    patternCanvas.width = 30;
    patternCanvas.height = 30;
    pctx.fillStyle = "#ffffff";
    pctx.fillRect(0, 0, 30, 30);
    pctx.fillStyle = lineColor;
    pctx.beginPath();
    pctx.arc(15, 15, 1.8, 0, Math.PI * 2);
    pctx.fill();
  } else if (bgType === "ruled-normal") {
    patternCanvas.width = 100;
    patternCanvas.height = 32;
    pctx.fillStyle = "#ffffff";
    pctx.fillRect(0, 0, 100, 32);
    pctx.strokeStyle = lineColor;
    pctx.lineWidth = 1;
    pctx.beginPath();
    pctx.moveTo(0, 31);
    pctx.lineTo(100, 31);
    pctx.stroke();
  } else if (bgType === "ruled-wide") {
    patternCanvas.width = 100;
    patternCanvas.height = 50;
    pctx.fillStyle = "#ffffff";
    pctx.fillRect(0, 0, 100, 50);
    pctx.strokeStyle = lineColor;
    pctx.lineWidth = 1.2;
    pctx.beginPath();
    pctx.moveTo(0, 49);
    pctx.lineTo(100, 49);
    pctx.stroke();
  } else if (bgType === "doubleline-wide") {
    patternCanvas.width = 100;
    patternCanvas.height = 70;
    pctx.fillStyle = "#ffffff";
    pctx.fillRect(0, 0, 100, 70);
    pctx.strokeStyle = lineColor;
    pctx.lineWidth = 1.2;
    pctx.beginPath();
    pctx.moveTo(0, 20);
    pctx.lineTo(100, 20);
    pctx.moveTo(0, 60);
    pctx.lineTo(100, 60);
    pctx.stroke();
  } else if (bgType === "fourline-standard") {
    patternCanvas.width = 100;
    patternCanvas.height = 72;
    pctx.fillStyle = "#ffffff";
    pctx.fillRect(0, 0, 100, 72);
    pctx.strokeStyle = lineColor;
    pctx.lineWidth = 1;
    [18, 36, 54, 71].forEach((y) => {
      pctx.beginPath();
      pctx.moveTo(0, y);
      pctx.lineTo(100, y);
      pctx.stroke();
    });
  } else if (bgType === "fourline-colored") {
    patternCanvas.width = 100;
    patternCanvas.height = 72;
    pctx.fillStyle = "#ffffff";
    pctx.fillRect(0, 0, 100, 72);
    pctx.lineWidth = 1.2;

    pctx.strokeStyle = "#dc2626";
    pctx.beginPath();
    pctx.moveTo(0, 18);
    pctx.lineTo(100, 18);
    pctx.stroke();

    pctx.strokeStyle = lineColor;
    pctx.beginPath();
    pctx.moveTo(0, 36);
    pctx.lineTo(100, 36);
    pctx.moveTo(0, 54);
    pctx.lineTo(100, 54);
    pctx.stroke();

    pctx.strokeStyle = "#dc2626";
    pctx.beginPath();
    pctx.moveTo(0, 71);
    pctx.lineTo(100, 71);
    pctx.stroke();
  } else if (bgType === "board-wooden") {
    patternCanvas.width = 40;
    patternCanvas.height = 40;
    pctx.fillStyle = "#1e3a1e";
    pctx.fillRect(0, 0, 40, 40);
    pctx.strokeStyle = "rgba(255,255,255,0.08)";
    pctx.lineWidth = 1;
    pctx.strokeRect(0, 0, 40, 40);
  }

  container.style.backgroundColor = "transparent";
  container.style.backgroundImage = "url(" + patternCanvas.toDataURL() + ")";
  container.style.backgroundRepeat = "repeat";

  fabricCanvas.requestRenderAll();
}

if (boardBgSelect) boardBgSelect.addEventListener("change", updateBoardBackground);
if (bgPatternColor) bgPatternColor.addEventListener("input", updateBoardBackground);

const btnClearBoard = document.getElementById("btnClearBoard");
if (btnClearBoard) {
  btnClearBoard.addEventListener("click", () => {
    fabricCanvas.clear();
    fabricCanvas.setBackgroundColor(currentBgColor, fabricCanvas.renderAll.bind(fabricCanvas));
    saveCanvasState();
  });
}

const btnNewBoard = document.getElementById("btnNewBoard");
if (btnNewBoard) {
  btnNewBoard.addEventListener("click", () => {
    fabricCanvas.clear();
    if (boardBgSelect) boardBgSelect.value = "white";
    currentBgColor = "#ffffff";
    fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
    saveCanvasState();
  });
}

const btnExportBoard = document.getElementById("btnExportBoard");
if (btnExportBoard) {
  btnExportBoard.addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = fabricCanvas.toDataURL({ format: "png" });
    a.download = "Iqra-SmartClass-Notes.png";
    a.click();
  });
}

const boardToolbarWrapper = document.getElementById("boardToolbarWrapper");
const toolbarToggleTab = document.getElementById("toolbarToggleTab");
const toolbarChevron = document.getElementById("toolbarChevron");

if (toolbarToggleTab && boardToolbarWrapper) {
  toolbarToggleTab.addEventListener("click", () => {
    boardToolbarWrapper.classList.toggle("collapsed");
    if (toolbarChevron) {
      toolbarChevron.className = boardToolbarWrapper.classList.contains("collapsed")
        ? "fa-solid fa-chevron-down"
        : "fa-solid fa-chevron-up";
    }
  });
}

// ==========================================
// IQRA SMARTCLASS SUITE - CLEAN app.js (PART 2/3)
// Symbols Modal, Multi-Lingual Virtual Keyboard, Suggestions & Shortcuts
// ==========================================

// ========================================================
// 6. SYMBOLS MODAL (ISLAMIC, ACADEMIC, EMOJIS & ICONS)
// ========================================================
const symbolsModal = document.getElementById("symbolsModal");
const btnOpenSymbols = document.getElementById("btnOpenSymbols");
const btnCloseSymbols = document.getElementById("btnCloseSymbols");
const symbolsGrid = document.getElementById("symbolsGrid");
const symTabButtons = document.querySelectorAll(".sym-tab-btn");

const symbolSets = {
  islamic: [
    "\uFDFA", // ﷺ
    "\uFDFD", // ﷽
    "\uFDFB", // ﷻ
    "\u0611", // ؑ
    "\u0612", // ؒ
    "\u0613", // ؓ
    "عَلَيْهِ ٱلسَّلَامُ",
    "عَلَيْهِمَا ٱلسَّلَامُ",
    "عَلَيْهِمُ ٱلسَّلَامُ",
    "رَضِيَ ٱللَّٰهُ عَنْهُ",
    "رَحِمَهُ ٱللَّٰهُ",
    "\uFD3E", // ﴾
    "\uFD3F", // ﴿
    "\u06D6", "\u06D7", "\u06D8", "\u06D9", "\u06DA", "\u06DB", "\u06DC", "\u06DD", "\u06DE", "\u06DF", "\u06E0"
  ],
  academic: [
    "÷", "×", "±", "≠", "≤", "≥", "≈", "√", "∞", "π", "°",
    "∑", "∫", "∆", "µ", "θ", "α", "β", "λ", "Ω", "‰", "½", "¼", "¾", "²", "³"
  ],
  emojis: [
    "😀", "😃", "😄", "😊", "🙂", "🤔", "💡", "📖", "📚", "✏️",
    "📝", "✍️", "📌", "📍", "❤️", "⭐", "🌟", "✨", "🔥", "👍",
    "👏", "🤲", "🕌", "🌙", "☀️", "✅", "❌", "⚠️", "❓", "❗"
  ],
  icons: [
    "➔", "➜", "➤", "➡", "⬅", "⬆", "⬇", "↔", "↕", "🔄",
    "•", "▪", "■", "◆", "▲", "▼", "★", "☆", "✓", "✔",
    "✕", "✖", "♠", "♣", "♥", "♦", "🎯", "🏷️", "📎", "✂️"
  ]
};

let currentSymTab = "islamic";

function renderSymbolsGrid() {
  if (!symbolsGrid) return;
  symbolsGrid.innerHTML = "";
  symbolSets[currentSymTab].forEach((sym) => {
    const btn = document.createElement("button");
    btn.className = "sym-item-btn";
    btn.innerText = sym;
    btn.addEventListener("click", () => {
      insertTextCharacter(sym);
      if (symbolsModal) symbolsModal.classList.add("hidden");
    });
    symbolsGrid.appendChild(btn);
  });
}

if (btnOpenSymbols) {
  btnOpenSymbols.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (symbolsModal) {
      symbolsModal.classList.remove("hidden");
      renderSymbolsGrid();

      const activeObj = typeof fabricCanvas !== "undefined" && fabricCanvas.getActiveObject();
      if (activeObj && activeObj.type === "i-text") {
        fabricCanvas.setActiveObject(activeObj);
      }
    }
  });
}

if (btnCloseSymbols) {
  btnCloseSymbols.addEventListener("click", () => {
    if (symbolsModal) symbolsModal.classList.add("hidden");
  });
}

symTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    symTabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentSymTab = btn.getAttribute("data-tab");
    renderSymbolsGrid();
  });
});

// ========================================================
// 7. VIRTUAL KEYBOARD (EN / URDU / HINDI) & SUGGESTIONS
// ========================================================
const virtualKeyboard = document.getElementById("virtualKeyboard");
const btnToggleKeyboard = document.getElementById("btnToggleKeyboard");
const btnCloseKeyboard = document.getElementById("btnCloseKeyboard");
const keyboardKeys = document.getElementById("keyboardKeys");
const kbLangButtons = document.querySelectorAll(".kb-lang-btn");

let currentKBLang = "en";
let isShiftOn = false;
let isCapsOn = false;

const layouts = {
  en: {
    normal: [
      ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
      ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
      ["Caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
      ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift"],
      ["Space"]
    ],
    shift: [
      ["~", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_", "+", "Backspace"],
      ["Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "{", "}", "|"],
      ["Caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ":", "\"", "Enter"],
      ["Shift", "Z", "X", "C", "V", "B", "N", "M", "<", ">", "?", "Shift"],
      ["Space"]
    ]
  },
  ur: {
    normal: [
      ["۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹", "۰", "-", "=", "Backspace"],
      ["Tab", "ق", "و", "ع", "ر", "ت", "ے", "ء", "ی", "ہ", "پ", "]", "[", "Enter"],
      ["Caps", "ا", "س", "د", "ف", "گ", "ح", "ج", "ک", "ل", "م", "ن"],
      ["Shift", "ز", "ط", "چ", "ش", "ب", "ن", "م", "،", "۔", "؟", "Shift"],
      ["Space"]
    ],
    shift: [
      ["!", "@", "#", "$", "%", "^", "&", "*", ")", "(", "_", "+", "Backspace"],
      ["Tab", "ض", "ص", "ث", "ڑ", "ٹ", "ۓ", "ئ", "ي", "ۃ", "ُ", "}", "{", "Enter"],
      ["Caps", "آ", "ص", "ڈ", "ف", "غ", "خ", "ج", "ک", "ل", "ں", "ن"],
      ["Shift", "ژ", "ظ", "ث", "ذ", "ھ", "پھ", "تھ", "ٹsound", "َ", "ِ", "Shift"],
      ["Space"]
    ]
  },
  hi: {
    normal: [
      ["१", "२", "३", "४", "५", "६", "७", "८", "९", "०", "-", "=", "Backspace"],
      ["Tab", "क", "ख", "ग", "घ", "च", "छ", "ज", "झ", "ट", "ठ", "ड", "ढ", "Enter"],
      ["Caps", "त", "थ", "द", "ध", "न", "प", "फ", "ब", "भ", "म", "य", "र"],
      ["Shift", "ल", "व", "श", "ष", "स", "ह", "ा", "ि", "ी", "ु", "ू", "Shift"],
      ["Space"]
    ],
    shift: [
      ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_", "+", "Backspace"],
      ["Tab", "ऋ", "ॠ", "ऍ", "ऑ", "ऐ", "औ", "अ", "आ", "इ", "ई", "उ", "ऊ", "Enter"],
      ["Caps", "ं", "ः", "ँ", "्", "़", "।", "॥", "०", "१", "२", "३", "४"],
      ["Shift", "ज्ञ", "त्र", "क्ष", "श्र", "दृ", "कृ", "ृ", "े", "ै", "ो", "Shift"],
      ["Space"]
    ]
  }
};

function renderKeyboard() {
  const kbKeysEl = document.getElementById("keyboardKeys");
  if (!kbKeysEl) return;
  kbKeysEl.innerHTML = "";

  const langData = layouts[currentKBLang];
  if (!langData) return;

  let layout = [];
  if (langData.normal) {
    layout = isShiftOn ? langData.shift : langData.normal;
  } else if (Array.isArray(langData)) {
    layout = langData;
  }

  layout.forEach((row) => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "kb-row";

    row.forEach((key) => {
      const keyBtn = document.createElement("button");
      keyBtn.className = "kb-key";

      if (["Backspace", "Enter", "Caps", "Tab"].includes(key)) keyBtn.classList.add("wide");
      if (key === "Shift") {
        keyBtn.classList.add("wide");
        if (isShiftOn) keyBtn.classList.add("active-toggle");
      }
      if (key === "Caps" && isCapsOn) keyBtn.classList.add("active-toggle");
      if (key === "Space") keyBtn.classList.add("space");

      let displayChar = key;
      if (currentKBLang === "en" && key.length === 1) {
        displayChar = isCapsOn || isShiftOn ? key.toUpperCase() : key.toLowerCase();
      }

      keyBtn.innerText = displayChar;

      keyBtn.onmousedown = (e) => {
        e.preventDefault();
        handleVirtualKeyPress(key);
      };

      rowDiv.appendChild(keyBtn);
    });
    kbKeysEl.appendChild(rowDiv);
  });
}

let currentTypingWord = "";

function handleVirtualKeyPress(key) {
  let activeObj = fabricCanvas.getActiveObject();
  let isEditing = activeObj && activeObj.type === "i-text" && activeObj.isEditing;

  if (!isEditing) {
    const fontElem = document.getElementById("fontFamilySelect");
    const selectedFont = fontElem ? fontElem.value : "Arial";
    const isRTL = currentKBLang === "ur";

    activeObj = new fabric.IText("", {
      left: 100,
      top: 150,
      fontFamily:
        currentKBLang === "ur"
          ? "'Noto Nastaliq Urdu', serif"
          : currentKBLang === "hi"
          ? "'Noto Sans Devanagari', sans-serif"
          : selectedFont,
      fontSize: 34,
      fill: brushColor ? brushColor.value : "#1e293b",
      direction: isRTL ? "rtl" : "ltr",
      textAlign: isRTL ? "right" : "left",
    });
    fabricCanvas.add(activeObj);
    fabricCanvas.setActiveObject(activeObj);
    activeObj.enterEditing();
  }

  if (key === "Backspace") {
    let str = activeObj.text || "";
    if (str.length > 0) {
      activeObj.set("text", str.slice(0, -1));
    }
    currentTypingWord = currentTypingWord.slice(0, -1);
    updateWordSuggestions();
  } else if (key === "Enter") {
    activeObj.set("text", (activeObj.text || "") + "\n");
    currentTypingWord = "";
    updateWordSuggestions();
  } else if (key === "Space") {
    activeObj.set("text", (activeObj.text || "") + " ");
    currentTypingWord = "";
    updateWordSuggestions();
  } else if (key === "Tab") {
    activeObj.set("text", (activeObj.text || "") + "   ");
  } else if (key === "Caps") {
    isCapsOn = !isCapsOn;
    renderKeyboard();
    return;
  } else if (key === "Shift") {
    isShiftOn = !isShiftOn;
    renderKeyboard();
    return;
  } else {
    let char = key;
    if (currentKBLang === "en") {
      char = isCapsOn || isShiftOn ? key.toUpperCase() : key.toLowerCase();
    }
    activeObj.set("text", (activeObj.text || "") + char);

    currentTypingWord += char;
    updateWordSuggestions();

    if (isShiftOn) {
      isShiftOn = false;
      renderKeyboard();
    }
  }

  const textLen = (activeObj.text || "").length;
  activeObj.initDimensions();
  activeObj.setSelectionStart(textLen);
  activeObj.setSelectionEnd(textLen);
  if (typeof activeObj.updateSelection === "function") {
    activeObj.updateSelection();
  }

  fabricCanvas.renderAll();
  saveCanvasState();
}

function insertTextCharacter(char) {
  let activeObj = fabricCanvas.getActiveObject();
  let isEditing = activeObj && activeObj.type === "i-text" && activeObj.isEditing;

  if (!isEditing) {
    const fontElem = document.getElementById("fontFamilySelect");
    const selectedFont = fontElem ? fontElem.value : "Arial";
    const isRTL = currentKBLang === "ur";

    activeObj = new fabric.IText("", {
      left: 100,
      top: 150,
      fontFamily:
        currentKBLang === "ur"
          ? "'Noto Nastaliq Urdu', serif"
          : currentKBLang === "hi"
          ? "'Noto Sans Devanagari', sans-serif"
          : selectedFont,
      fontSize: 34,
      fill: brushColor ? brushColor.value : "#1e293b",
      direction: isRTL ? "rtl" : "ltr",
      textAlign: isRTL ? "right" : "left",
    });
    fabricCanvas.add(activeObj);
    fabricCanvas.setActiveObject(activeObj);
    activeObj.enterEditing();
  }

  activeObj.insertChars(char, null, activeObj.selectionStart, activeObj.selectionEnd);

  if (activeObj.hiddenTextarea) {
    activeObj.hiddenTextarea.value = activeObj.text;
    activeObj.hiddenTextarea.selectionStart = activeObj.selectionStart;
    activeObj.hiddenTextarea.selectionEnd = activeObj.selectionEnd;
    activeObj.hiddenTextarea.focus();
  }

  fabricCanvas.renderAll();
  saveCanvasState();
}

// Keyboard Toggle & Language Buttons
document.addEventListener("click", function (e) {
  const toggleBtn = e.target.closest("#btnToggleKeyboard");
  const closeBtn = e.target.closest("#btnCloseKeyboard");
  const kb = document.getElementById("virtualKeyboard");

  if (toggleBtn && kb) {
    e.preventDefault();
    if (kb.classList.contains("hidden")) {
      kb.classList.remove("hidden");
      renderKeyboard();
    } else {
      kb.classList.add("hidden");
    }
  }

  if (closeBtn && kb) {
    e.preventDefault();
    kb.classList.add("hidden");
  }
});

kbLangButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    kbLangButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentKBLang = btn.getAttribute("data-lang");
    renderKeyboard();

    if (fontFamilySelect) {
      if (currentKBLang === "ur") fontFamilySelect.value = "'Noto Nastaliq Urdu', serif";
      else if (currentKBLang === "hi") fontFamilySelect.value = "'Noto Sans Devanagari', sans-serif";
      else fontFamilySelect.value = "Arial";
    }
  });
});

// ========================================================
// 8. LIVE WORD SUGGESTIONS & FOCUS SYNC ENGINE
// ========================================================
window.updateWordSuggestions = function () {
  const sugBar = document.getElementById("kbSuggestions") || document.querySelector(".kbSuggestions");
  if (!sugBar) return;

  const activeObj = typeof fabricCanvas !== "undefined" && fabricCanvas ? fabricCanvas.getActiveObject() : null;
  if (!activeObj || !activeObj.isType("i-text") || !activeObj.isEditing) {
    sugBar.innerHTML = "";
    return;
  }

  const text = activeObj.text || "";
  const cursorPos = activeObj.selectionStart || text.length;
  const leftText = text.slice(0, cursorPos);
  const words = leftText.split(/\s+/);
  const currentWord = words[words.length - 1] || "";

  if (!currentWord.trim()) {
    sugBar.innerHTML = "";
    return;
  }

  const lang = typeof currentKBLang !== "undefined" ? currentKBLang : "en";
  const dictObj = window.localDictionary || {};
  const currentList = dictObj[lang] || [];

  const query = lang === "en" ? currentWord.toLowerCase() : currentWord;
  const matches = currentList
    .filter((w) => {
      const target = lang === "en" ? w.toLowerCase() : w;
      return target.startsWith(query);
    })
    .slice(0, 6);

  sugBar.innerHTML = "";

  matches.forEach((word) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "sug-chip";
    chip.innerText = word;
    chip.style.margin = "2px 4px";
    chip.style.cursor = "pointer";

    chip.onmousedown = (e) => {
      e.preventDefault();
      applyWordSuggestion(currentWord, word);
    };

    sugBar.appendChild(chip);
  });
};

const updateWordSuggestions = window.updateWordSuggestions;

window.applyWordSuggestion = function (oldWord, newWord) {
  const activeObj = fabricCanvas.getActiveObject();
  if (!activeObj) return;

  const end = activeObj.selectionStart;
  const start = end - oldWord.length;

  activeObj.removeChars(start, end);
  activeObj.insertChars(newWord + " ", null, start, start);

  const newPos = start + newWord.length + 1;
  activeObj.selectionStart = newPos;
  activeObj.selectionEnd = newPos;

  if (activeObj.hiddenTextarea) {
    activeObj.hiddenTextarea.value = activeObj.text;
    activeObj.hiddenTextarea.selectionStart = newPos;
    activeObj.hiddenTextarea.selectionEnd = newPos;
    activeObj.hiddenTextarea.focus();
  }

  fabricCanvas.requestRenderAll();
  const sugBar = document.getElementById("kbSuggestions") || document.querySelector(".kbSuggestions");
  if (sugBar) sugBar.innerHTML = "";
};

if (typeof fabricCanvas !== "undefined" && fabricCanvas) {
  fabricCanvas.off("text:changed", window.updateWordSuggestions);
  fabricCanvas.on("text:changed", window.updateWordSuggestions);
}

// Global Focus Lock & Hidden Textarea Sync
document.addEventListener(
  "mousedown",
  function (e) {
    if (
      e.target.closest("#virtualKeyboard button") ||
      e.target.closest(".kb-key") ||
      e.target.closest(".sug-chip")
    ) {
      e.preventDefault();

      if (typeof fabricCanvas !== "undefined" && fabricCanvas) {
        const activeObj = fabricCanvas.getActiveObject();
        if (activeObj && activeObj.isType("i-text")) {
          if (!activeObj.isEditing) {
            activeObj.enterEditing();
          }

          if (activeObj.hiddenTextarea) {
            const currentText = activeObj.text || "";
            activeObj.hiddenTextarea.value = currentText;
            activeObj.hiddenTextarea.focus();

            activeObj.selectionStart = currentText.length;
            activeObj.selectionEnd = currentText.length;
            activeObj.hiddenTextarea.selectionStart = currentText.length;
            activeObj.hiddenTextarea.selectionEnd = currentText.length;
          }
        }
      }
    }
  },
  true
);

document.addEventListener("mouseup", function (e) {
  if (e.target.closest("#virtualKeyboard button") || e.target.closest(".kb-key")) {
    if (typeof fabricCanvas !== "undefined" && fabricCanvas) {
      const activeObj = fabricCanvas.getActiveObject();
      if (activeObj && activeObj.isType("i-text") && activeObj.hiddenTextarea) {
        const currentText = activeObj.text || "";
        activeObj.hiddenTextarea.value = currentText;
        activeObj.hiddenTextarea.selectionStart = currentText.length;
        activeObj.hiddenTextarea.selectionEnd = currentText.length;
      }
    }

    if (typeof window.updateWordSuggestions === "function") window.updateWordSuggestions();
  }
});

// Draggable Virtual Keyboard
(function initKBDroppable() {
  const vk = document.getElementById("virtualKeyboard");
  if (!vk) return;

  const dragHandle = vk.querySelector(".kb-drag-handle") || document.getElementById("keyboardHeader");
  if (!dragHandle) return;

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  dragHandle.addEventListener("mousedown", (e) => {
    isDragging = true;
    const rect = vk.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    vk.style.position = "fixed";
    vk.style.left = `${rect.left}px`;
    vk.style.top = `${rect.top}px`;
    vk.style.bottom = "auto";
    vk.style.transform = "none";
    vk.classList.add("is-dragged");
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    let newX = e.clientX - offsetX;
    let newY = e.clientY - offsetY;

    newX = Math.max(0, Math.min(window.innerWidth - vk.offsetWidth, newX));
    newY = Math.max(0, Math.min(window.innerHeight - vk.offsetHeight, newY));

    vk.style.left = `${newX}px`;
    vk.style.top = `${newY}px`;
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });
})();

// ========================================================
// 9. PHYSICAL KEYBOARD SHORTCUTS (UNDO, REDO, COPY, PASTE, DELETE)
// ========================================================
window.addEventListener("keydown", function (e) {
  if (typeof fabricCanvas === "undefined" || !fabricCanvas) return;

  const activeObj = fabricCanvas.getActiveObject();
  const isEditingText = activeObj && activeObj.isEditing;

  if ((e.key === "Delete" || e.key === "Backspace") && !isEditingText && activeObj) {
    e.preventDefault();
    fabricCanvas.remove(activeObj);
    fabricCanvas.discardActiveObject();
    fabricCanvas.requestRenderAll();
    if (typeof saveCanvasState === "function") saveCanvasState();
    return;
  }

  if (e.ctrlKey) {
    const key = e.key.toLowerCase();

    if (key === "z") {
      e.preventDefault();
      const undoBtn = document.getElementById("btnUndo") || document.querySelector("[title*='Undo']");
      if (undoBtn) undoBtn.click();
      return;
    }

    if (key === "y") {
      e.preventDefault();
      const redoBtn = document.getElementById("btnRedo") || document.querySelector("[title*='Redo']");
      if (redoBtn) redoBtn.click();
      return;
    }

    if (key === "c" && activeObj && !isEditingText) {
      activeObj.clone(function (cloned) {
        window._clipboard = cloned;
      });
      return;
    }

    if (key === "v" && !isEditingText) {
      if (!window._clipboard) return;
      window._clipboard.clone(function (clonedObj) {
        fabricCanvas.discardActiveObject();
        clonedObj.set({
          left: clonedObj.left + 20,
          top: clonedObj.top + 20,
          evented: true,
        });
        if (clonedObj.type === "activeSelection") {
          clonedObj.canvas = fabricCanvas;
          clonedObj.forEachObject(function (obj) {
            fabricCanvas.add(obj);
          });
          clonedObj.setCoords();
        } else {
          fabricCanvas.add(clonedObj);
        }
        window._clipboard.top += 20;
        window._clipboard.left += 20;
        fabricCanvas.setActiveObject(clonedObj);
        fabricCanvas.requestRenderAll();
        if (typeof saveCanvasState === "function") saveCanvasState();
      });
      return;
    }
  }
});

// ==========================================
// IQRA SMARTCLASS SUITE - CLEAN app.js (PART 3/3)
// Pane Resizer, AI OCR, Layout Controller, 3-Stage Dock, Web Store & Shapes Flyout
// ==========================================

// ========================================================
// 10. RESIZER & FULLSCREEN CONTROLLER
// ========================================================
const resizer = document.getElementById("resizer");
const docPane = document.getElementById("documentPane");
const boardPane = document.getElementById("whiteboardPane");
const workspace = document.getElementById("workspace");
let isDragging = false;

if (resizer) {
  resizer.addEventListener("mousedown", (e) => {
    e.preventDefault();
    isDragging = true;
    resizer.classList.add("dragging");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  });
}

document.addEventListener("mousemove", (e) => {
  if (!isDragging || !workspace || !docPane || !boardPane) return;

  const workspaceRect = workspace.getBoundingClientRect();
  const leftWidth = e.clientX - workspaceRect.left;
  const totalWidth = workspaceRect.width;

  if (leftWidth > 200 && totalWidth - leftWidth > 200) {
    const leftPercent = (leftWidth / totalWidth) * 100;
    const rightPercent = 100 - leftPercent;

    docPane.style.setProperty("width", leftPercent + "%", "important");
    docPane.style.setProperty("flex", "0 0 " + leftPercent + "%", "important");

    boardPane.style.setProperty("width", rightPercent + "%", "important");
    boardPane.style.setProperty("flex", "1 1 " + rightPercent + "%", "important");

    if (typeof resizeCanvas === "function") resizeCanvas();
  }
});

document.addEventListener("mouseup", () => {
  if (isDragging) {
    isDragging = false;
    if (resizer) resizer.classList.remove("dragging");
    document.body.style.cursor = "default";
    document.body.style.removeProperty("user-select");
    if (typeof resizeCanvas === "function") resizeCanvas();
  }
});

const btnFullScreen = document.getElementById("btnFullScreen");
if (btnFullScreen) {
  btnFullScreen.addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  });
}

const btnDocMaximize = document.getElementById("btnDocMaximize");
if (btnDocMaximize) {
  btnDocMaximize.addEventListener("click", () => {
    if (typeof window.setLayoutState === "function") {
      window.setLayoutState("doc-full");
    }
  });
}

const btnBoardMaximize = document.getElementById("btnBoardMaximize");
if (btnBoardMaximize) {
  btnBoardMaximize.addEventListener("click", () => {
    if (typeof window.setLayoutState === "function") {
      window.setLayoutState("wb-full");
    }
  });
}

// ========================================================
// 11. GEMINI VISION AI HANDWRITING ENGINE
// ========================================================
window.convertHandwritingToText = async function () {
  if (typeof fabricCanvas === "undefined" || !fabricCanvas) {
    alert("Whiteboard canvas nahi mila!");
    return;
  }

  const langDropdown = document.getElementById("hwLangSelect");
  const apiLang = langDropdown ? langDropdown.value : "en";
  const isUrdu = apiLang === "ur";

  const activeObj = fabricCanvas.getActiveObject();
  let targetPaths = [];

  if (activeObj) {
    if (activeObj.type === "path") {
      targetPaths = [activeObj];
    } else if (activeObj.type === "activeSelection" || activeObj.type === "group") {
      targetPaths = activeObj.getObjects().filter((o) => o.type === "path");
    }
  }

  if (targetPaths.length === 0) {
    targetPaths = fabricCanvas.getObjects().filter((o) => o.type === "path");
  }

  if (targetPaths.length === 0) {
    alert("Whiteboard par pehle pen se kuch likhein!");
    return;
  }

  const btn = document.getElementById("btnHwToText");
  const origIcon = btn ? btn.innerHTML : "";
  if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-amber-500"></i>';

  try {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    targetPaths.forEach((p) => {
      const b = p.getBoundingRect(true);
      minX = Math.min(minX, b.left);
      minY = Math.min(minY, b.top);
      maxX = Math.max(maxX, b.left + b.width);
      maxY = Math.max(maxY, b.top + b.height);
    });

    const pad = 30;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = maxX - minX + pad * 2;
    const cropH = maxY - minY + pad * 2;

    const base64DataUrl = fabricCanvas.toDataURL({
      left: cropX,
      top: cropY,
      width: cropW,
      height: cropH,
      format: "png",
      multiplier: 2,
    });

    const base64Image = base64DataUrl.split(",")[1];

    const res = await fetch("/api/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: base64Image,
        lang: apiLang,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.detail) {
      alert("Error: " + (data.detail || "Server error"));
      return;
    }

    let recognizedText = (data.text || "").trim();

    if (!recognizedText) {
      alert("AI ko text samajh nahi aaya! Kripya thoda saaf likhein.");
      return;
    }

    targetPaths.forEach((p) => fabricCanvas.remove(p));
    fabricCanvas.discardActiveObject();

    const textBox = new fabric.IText(recognizedText, {
      left: isUrdu ? maxX : minX,
      top: minY,
      fontSize: 34,
      fill: "#111827",
      fontFamily: isUrdu
        ? "'Noto Nastaliq Urdu', Arial, sans-serif"
        : apiLang === "hi"
        ? "'Noto Sans Devanagari', Arial, sans-serif"
        : "Arial, sans-serif",
      originX: isUrdu ? "right" : "left",
      direction: isUrdu ? "rtl" : "ltr",
      textAlign: isUrdu ? "right" : "left",
      cornerColor: "#2563eb",
      cornerSize: 10,
      transparentCorners: false,
      editable: true,
    });

    fabricCanvas.add(textBox);
    fabricCanvas.setActiveObject(textBox);
    fabricCanvas.renderAll();

    if (typeof saveCanvasState === "function") saveCanvasState();
  } catch (err) {
    console.error("AI OCR Error:", err);
    alert("Connection error! Internet ya server check karein.");
  } finally {
    if (btn) btn.innerHTML = origIcon;
  }
};

// ========================================================
// 12. CONSOLIDATED MASTER PANE & LAYOUT CONTROLLER
// ========================================================
(() => {
  const docPaneEl = document.getElementById("documentPane");
  const resizerEl = document.getElementById("resizer");
  const wbPaneEl = document.getElementById("whiteboardPane");
  const sidebar = document.getElementById("sidebar");
  const appContainer = document.querySelector(".app-container");

  if (!docPaneEl || !resizerEl || !wbPaneEl) return;

  function syncCanvas() {
    setTimeout(() => {
      if (typeof window.resizeCanvas === "function") {
        window.resizeCanvas();
      }
    }, 150);
  }

  function setLayoutState(state) {
    if (!docPaneEl || !wbPaneEl || !resizerEl) return;

    if (state === "wb-full") {
      docPaneEl.style.setProperty("display", "none", "important");
      resizerEl.style.setProperty("display", "none", "important");
      wbPaneEl.style.setProperty("display", "flex", "important");
      wbPaneEl.style.setProperty("width", "100%", "important");
      wbPaneEl.style.setProperty("flex", "1 1 100%", "important");
      wbPaneEl.dataset.state = "wb-full";
      if (appContainer) appContainer.classList.add("wb-fullscreen");
    } else if (state === "doc-full") {
      wbPaneEl.style.setProperty("display", "none", "important");
      resizerEl.style.setProperty("display", "none", "important");
      docPaneEl.style.setProperty("display", "flex", "important");
      docPaneEl.style.setProperty("width", "100%", "important");
      docPaneEl.style.setProperty("flex", "1 1 100%", "important");
      wbPaneEl.dataset.state = "doc-full";
      if (appContainer) appContainer.classList.remove("wb-fullscreen");
    } else {
      docPaneEl.style.setProperty("display", "flex", "important");
      docPaneEl.style.setProperty("width", "50%", "important");
      docPaneEl.style.setProperty("flex", "0 0 50%", "important");

      resizerEl.style.setProperty("display", "block", "important");

      wbPaneEl.style.setProperty("display", "flex", "important");
      wbPaneEl.style.setProperty("width", "50%", "important");
      wbPaneEl.style.setProperty("flex", "1 1 50%", "important");
      wbPaneEl.dataset.state = "split";
      if (appContainer) appContainer.classList.remove("wb-fullscreen");
    }

    syncCanvas();
  }

  window.setLayoutState = setLayoutState;

  const btnMin = document.querySelector('[title="Minimize to Whiteboard"]');
  const btnMax = document.querySelector('[title="Maximize Pane"]');
  const btnClose = document.querySelector('[title="Close Document"]');

  if (btnMin) {
    btnMin.onclick = (e) => {
      e.stopPropagation();
      setLayoutState("wb-full");
    };
  }

  if (btnMax) {
    btnMax.onclick = (e) => {
      e.stopPropagation();
      const isMax = wbPaneEl.dataset.state === "doc-full";
      setLayoutState(isMax ? "split" : "doc-full");
    };
  }

  if (btnClose) {
    btnClose.onclick = (e) => {
      e.stopPropagation();
      setLayoutState("wb-full");
    };
  }

  const dockBtnUploadDocs = document.getElementById("dockBtnUploadDocs");
  const fileInputEl = document.getElementById("fileInput");

  if (dockBtnUploadDocs) {
    dockBtnUploadDocs.addEventListener("click", () => {
      if (fileInputEl) fileInputEl.value = "";
    });
  }

  if (fileInputEl) {
    fileInputEl.addEventListener("change", () => {
      if (fileInputEl.files && fileInputEl.files.length > 0) {
        setLayoutState("split");
        docPaneEl.classList.remove("hidden");
        docPaneEl.style.setProperty("display", "flex", "important");
      }
    });
  }

  window.addEventListener(
    "click",
    function (e) {
      const btn = e.target.closest("#btnToggleSidebar");
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (sidebar) {
        const isHidden = sidebar.style.display === "none" || sidebar.classList.contains("collapsed");
        if (isHidden) {
          sidebar.classList.remove("collapsed", "hidden");
          sidebar.style.removeProperty("display");
          sidebar.style.display = "flex";
        } else {
          sidebar.classList.add("collapsed");
          sidebar.style.display = "none";
        }
      }

      if (typeof window.resizeCanvas === "function") {
        setTimeout(window.resizeCanvas, 50);
      }
    },
    true
  );

  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest("#btnToggleFullBoard, .wb-expand-btn");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();

      if (wbPaneEl.dataset.state === "wb-full") {
        setLayoutState("split");
      } else {
        setLayoutState("wb-full");
      }
    },
    true
  );

  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest("#btnDocMaximize, #btnMaximizeDoc, .btn-doc-max");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();

      if (wbPaneEl.dataset.state === "doc-full") {
        setLayoutState("split");
      } else {
        setLayoutState("doc-full");
      }
    },
    true
  );

  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest("#btnDocClose");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();

      const renderTargetEl = document.getElementById("renderTarget");
      if (renderTargetEl) renderTargetEl.innerHTML = "";

      const docContainerEl = document.getElementById("docContainer");
      if (docContainerEl) docContainerEl.classList.add("hidden");

      const dropZoneEl = document.getElementById("dropZone");
      if (dropZoneEl) dropZoneEl.classList.remove("hidden");

      const titleEl = document.getElementById("docTitle");
      if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-file"></i> Ready for Document';

      setLayoutState("wb-full");
    },
    true
  );

  document.addEventListener(
    "click",
    (e) => {
      const handle = e.target.closest("#btnToggleDocHeader");
      if (!handle) return;
      e.preventDefault();
      e.stopPropagation();

      const docHeader = document.querySelector("#documentPane .pane-header");
      const icon = handle.querySelector("i");
      if (!docHeader) return;

      docHeader.classList.toggle("collapsed");
      const isCollapsed = docHeader.classList.contains("collapsed");

      if (icon) {
        icon.className = isCollapsed ? "fa-solid fa-chevron-down" : "fa-solid fa-chevron-up";
      }

      if (typeof window.resizeCanvas === "function") {
        setTimeout(window.resizeCanvas, 200);
      }
    },
    true
  );

  document.addEventListener(
    "click",
    (e) => {
      const handle = e.target.closest("#btnToggleTopBar");
      if (!handle) return;
      e.preventDefault();
      e.stopPropagation();

      const topBar = document.querySelector(".top-bar");
      const icon = handle.querySelector("i");
      if (!topBar) return;

      topBar.classList.toggle("collapsed");
      handle.classList.toggle("collapsed");
      const isCollapsed = topBar.classList.contains("collapsed");

      if (icon) {
        icon.className = isCollapsed ? "fa-solid fa-chevron-down" : "fa-solid fa-chevron-up";
      }

      syncCanvas();
    },
    true
  );

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      setLayoutState("wb-full");
    }, 200);
  });

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(() => {
      setLayoutState("wb-full");
    }, 250);
  }
})();

// ========================================================
// 13. 3-STAGE SMART TEACHING DOCK & SLIDING DRAWER
// ========================================================
(function initFloatingDock() {
  function setup() {
    const dock = document.getElementById("floatingDock");
    const shutter = document.getElementById("shutterWrapper");
    const handleTab = document.getElementById("dockHandleTab");
    const peekStrip = document.getElementById("dockPeekStrip");
    const btnExpand = document.getElementById("btnDockExpand");
    const btnMinimize = document.getElementById("btnDockMinimize");
    const btnClose = document.getElementById("btnDockClose");

    if (!dock || !shutter) return;

    const BASE_HEIGHT = 28;
    const MAX_HEIGHT = 72;

    function applyPeekProgress(progress) {
      if (peekStrip) {
        peekStrip.style.opacity = progress;
        peekStrip.style.transform = `translateY(${Math.round((1 - progress) * 8)}px) scale(${0.9 + progress * 0.1})`;
        peekStrip.style.pointerEvents = progress > 0.8 ? "auto" : "none";
      }
    }

    function setDockState(state) {
      dock.className = `floating-dock ${state}`;
      if (state === "state-handle") {
        shutter.style.height = `${BASE_HEIGHT}px`;
        applyPeekProgress(0);
      } else if (state === "state-peek") {
        shutter.style.height = `${MAX_HEIGHT}px`;
        applyPeekProgress(1);
      }
    }

    let tapTimestamps = [];

    window.addEventListener(
      "pointerdown",
      function (e) {
        const splash = document.getElementById("splashScreen");
        if (splash || (e.target && e.target.closest && e.target.closest("#splashScreen"))) {
          tapTimestamps = [];
          return;
        }

        if (e.button !== 0 && e.pointerType === "mouse") return;
        if (e.target && e.target.closest && e.target.closest("#floatingDock")) return;
        if (dock.classList.contains("state-full") || dock.classList.contains("state-peek")) return;

        const now = Date.now();
        if (tapTimestamps.length > 0 && now - tapTimestamps[tapTimestamps.length - 1] < 150) {
          return;
        }

        tapTimestamps.push(now);
        tapTimestamps = tapTimestamps.filter((t) => now - t <= 1200);

        if (tapTimestamps.length >= 3) {
          tapTimestamps = [];
          setDockState("state-handle");
        }
      },
      true
    );

    let startY = 0;
    let isDockDragging = false;
    let startHeight = BASE_HEIGHT;
    let currentHeight = BASE_HEIGHT;

    if (handleTab) {
      handleTab.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      handleTab.addEventListener("pointerdown", (e) => {
        isDockDragging = true;
        startY = e.clientY;
        startHeight =
          shutter.getBoundingClientRect().height ||
          (dock.classList.contains("state-peek") ? MAX_HEIGHT : BASE_HEIGHT);
        currentHeight = startHeight;
        shutter.classList.add("is-dragging");
        handleTab.setPointerCapture(e.pointerId);
      });

      handleTab.addEventListener("pointermove", (e) => {
        if (!isDockDragging) return;
        const deltaY = startY - e.clientY;
        let newHeight = startHeight + deltaY;
        if (newHeight > MAX_HEIGHT) {
          newHeight = MAX_HEIGHT + (newHeight - MAX_HEIGHT) * 0.25;
        }
        currentHeight = Math.max(BASE_HEIGHT, newHeight);
        shutter.style.height = `${currentHeight}px`;

        const progress = Math.max(
          0,
          Math.min(1, (currentHeight - BASE_HEIGHT) / (MAX_HEIGHT - BASE_HEIGHT))
        );
        applyPeekProgress(progress);
      });

      function finishDrag(e) {
        if (!isDockDragging) return;
        isDockDragging = false;
        shutter.classList.remove("is-dragging");
        try {
          handleTab.releasePointerCapture(e.pointerId);
        } catch (err) {}

        const finalH = parseFloat(shutter.style.height) || BASE_HEIGHT;
        if (finalH >= 50) {
          setDockState("state-peek");
        } else {
          setDockState("state-handle");
        }
      }

      handleTab.addEventListener("pointerup", finishDrag);
      handleTab.addEventListener("pointercancel", finishDrag);
    }

    if (btnExpand) {
      btnExpand.addEventListener("click", (e) => {
        e.stopPropagation();
        setDockState("state-full");
      });
    }

    if (btnMinimize) {
      btnMinimize.addEventListener("click", (e) => {
        e.stopPropagation();
        const fullPanel = dock.querySelector(".dock-full-panel");
        if (fullPanel) {
          fullPanel.classList.add("is-closing");
          setTimeout(() => {
            fullPanel.classList.remove("is-closing");
            setDockState("state-handle");
          }, 200);
        } else {
          setDockState("state-handle");
        }
      });
    }

    if (btnClose) {
      btnClose.addEventListener("click", (e) => {
        e.stopPropagation();
        setDockState("state-hidden");
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();

(function initDockDrawer() {
  const drawerHandle = document.getElementById("dockDrawerHandle");
  const drawerPanel = document.getElementById("dockDrawerPanel");

  if (!drawerHandle || !drawerPanel) return;

  const MAX_WIDTH = 140;
  let isDrawerDragging = false;
  let startX = 0;
  let currentWidth = 0;
  let isOpen = false;

  function renderDrawer(wPx) {
    const clamped = Math.max(0, Math.min(MAX_WIDTH, wPx));
    const progress = clamped / MAX_WIDTH;

    drawerPanel.style.setProperty("width", `${clamped}px`, "important");
    drawerPanel.style.setProperty("opacity", progress > 0.05 ? "1" : "0", "important");
    drawerPanel.style.setProperty("padding", clamped > 20 ? "10px 8px" : "10px 0px", "important");
    drawerPanel.style.setProperty("pointer-events", clamped > 60 ? "auto" : "none", "important");

    drawerHandle.style.setProperty("transform", `translate(-${clamped}px, -50%)`, "important");
  }

  drawerHandle.addEventListener("pointerdown", (e) => {
    isDrawerDragging = true;
    startX = e.clientX;
    isOpen = drawerPanel.classList.contains("open");
    currentWidth = isOpen ? MAX_WIDTH : 0;

    drawerPanel.classList.add("is-dragging");
    drawerHandle.classList.add("is-dragging");

    try {
      drawerHandle.setPointerCapture(e.pointerId);
    } catch (err) {}
  });

  drawerHandle.addEventListener("pointermove", (e) => {
    if (!isDrawerDragging) return;
    const pullDistance = startX - e.clientX;
    currentWidth = !isOpen ? pullDistance : MAX_WIDTH - -pullDistance;
    renderDrawer(currentWidth);
  });

  function finishDrag(e) {
    if (!isDrawerDragging) return;
    isDrawerDragging = false;

    drawerPanel.classList.remove("is-dragging");
    drawerHandle.classList.remove("is-dragging");

    drawerPanel.style.removeProperty("width");
    drawerPanel.style.removeProperty("opacity");
    drawerPanel.style.removeProperty("padding");
    drawerPanel.style.removeProperty("pointer-events");
    drawerHandle.style.removeProperty("transform");

    try {
      drawerHandle.releasePointerCapture(e.pointerId);
    } catch (err) {}

    if (currentWidth >= 45) {
      drawerPanel.classList.add("open");
      drawerHandle.classList.add("open");
      isOpen = true;
    } else {
      drawerPanel.classList.remove("open");
      drawerHandle.classList.remove("open");
      isOpen = false;
    }
  }

  drawerHandle.addEventListener("pointerup", finishDrag);
  drawerHandle.addEventListener("pointercancel", finishDrag);

  document.addEventListener("pointerdown", (e) => {
    if (!drawerPanel.classList.contains("open")) return;
    const insidePanel = drawerPanel.contains(e.target);
    const insideHandle = drawerHandle.contains(e.target);

    if (!insidePanel && !insideHandle) {
      drawerPanel.classList.remove("open");
      drawerHandle.classList.remove("open");
      isOpen = false;
    }
  });
})();

(function initContextualTextBar() {
  const textBar = document.getElementById("textFormatBar");
  const collapseBtn = document.getElementById("btnCollapseTextBar");

  if (!textBar) return;
  textBar.classList.add("hidden");

  document.addEventListener("click", (e) => {
    const toolBtn = e.target.closest(".tool-btn");
    if (toolBtn) {
      const toolType = toolBtn.getAttribute("data-tool");
      if (toolType === "text") {
        textBar.classList.remove("hidden");
      } else {
        textBar.classList.add("hidden");
      }
      return;
    }

    const isTextInput =
      e.target.tagName === "TEXTAREA" ||
      e.target.tagName === "INPUT" ||
      e.target.isContentEditable ||
      e.target.closest(".canvas-text-box");

    if (isTextInput && !e.target.closest("#textFormatBar")) {
      textBar.classList.remove("hidden");
    }
  });

  if (collapseBtn) {
    collapseBtn.addEventListener("click", () => {
      textBar.classList.add("hidden");
    });
  }
})();

// ========================================================
// 14. ISLAMIC WEB STORE & SHAPES FLYOUT MENU
// ========================================================
const WEBSITES_DATABASE = [
  { title: "Sunnah.com", category: "Hadith", url: "https://sunnah.com/", icon: "fa-book-open-reader", bg: "linear-gradient(135deg, #059669, #10b981)" },
  { title: "Al-Mufti (Fatwa Search)", category: "Fatwa", url: "https://www.al-mufti.net/2021/06/Salatuttasbih-jamaat-se-padhna-kaisa.html", icon: "fa-scale-balanced", bg: "linear-gradient(135deg, #d97706, #f59e0b)" },
  { title: "Dawat-e-Islami Portal", category: "Academy", url: "https://www.dawateislami.net/", icon: "fa-mosque", bg: "linear-gradient(135deg, #0284c7, #38bdf8)" },
  { title: "Al-Quran Kareem", category: "Quran", url: "https://www.dawateislami.net/quran", icon: "fa-book-quran", bg: "linear-gradient(135deg, #15803d, #22c55e)" },
  { title: "Tafseer Sirat-ul-Jinaan", category: "Quran", url: "https://www.dawateislami.net/quran/surah-al-fatihah/ayat-1/translation-1/tafseer", icon: "fa-scroll", bg: "linear-gradient(135deg, #4f46e5, #6366f1)" },
  { title: "Image To Text (OCR)", category: "Tools", url: "https://www.imagetotext.io/", icon: "fa-file-lines", bg: "linear-gradient(135deg, #475569, #64748b)" },
  { title: "Iqra Islamic Academy", category: "Academy", url: "https://sites.google.com/view/iqraislamicacademy/home", icon: "fa-graduation-cap", bg: "linear-gradient(135deg, #0f766e, #14b8a6)" },
  { title: "Quran Search (Tafsir.app)", category: "Quran", url: "https://tafsir.app/", icon: "fa-magnifying-glass-chart", bg: "linear-gradient(135deg, #7c3aed, #8b5cf6)" },
  { title: "Hadith Search (Hadeeth.com)", category: "Hadith", url: "https://hadeeth.com/", icon: "fa-feather-pointed", bg: "linear-gradient(135deg, #b91c1c, #ef4444)" }
];

let selectedWebCategory = "All";
let webSearchQuery = "";

const webIntegrationModal = document.getElementById("webIntegrationModal");
const webGalleryOverlay = document.getElementById("webGalleryOverlay");
const closeWebGalleryBtn = document.getElementById("closeWebGalleryBtn");
const webIntegrationGrid = document.getElementById("webIntegrationGrid");
const webGalleryCategories = document.getElementById("webGalleryCategories");
const webPortalSearchInput = document.getElementById("webPortalSearchInput");
const customWebUrlInput = document.getElementById("customWebUrlInput");
const btnLoadCustomUrl = document.getElementById("btnLoadCustomUrl");
const dockBtnWebIntegration = document.getElementById("dockBtnWebIntegration");

function renderWebCards() {
  if (!webIntegrationGrid) return;
  webIntegrationGrid.innerHTML = "";

  const filtered = WEBSITES_DATABASE.filter((site) => {
    const matchCategory = selectedWebCategory === "All" || site.category === selectedWebCategory;
    const matchSearch =
      site.title.toLowerCase().includes(webSearchQuery.toLowerCase()) ||
      site.category.toLowerCase().includes(webSearchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  if (filtered.length === 0) {
    webIntegrationGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 20px;">Koi portal nahi mila!</div>`;
    return;
  }

  filtered.forEach((site) => {
    const item = document.createElement("div");
    item.className = "web-circle-item";
    item.innerHTML = `
      <div class="web-circle-icon" style="background: ${site.bg};">
        <i class="fa-solid ${site.icon}"></i>
      </div>
      <div class="web-circle-title">${site.title}</div>
      <span class="web-circle-badge">${site.category}</span>
    `;

    item.addEventListener("click", () => {
      window.open(site.url, "_blank");
      closeWebGallery();
    });

    webIntegrationGrid.appendChild(item);
  });
}

function openWebGallery() {
  if (webIntegrationModal) {
    webIntegrationModal.classList.remove("hidden");
    if (webPortalSearchInput) webPortalSearchInput.value = "";
    webSearchQuery = "";
    renderWebCards();
  }
}

function closeWebGallery() {
  if (webIntegrationModal) {
    webIntegrationModal.classList.add("hidden");
  }
}

if (webPortalSearchInput) {
  webPortalSearchInput.addEventListener("input", (e) => {
    webSearchQuery = e.target.value.trim();
    renderWebCards();
  });
}

if (webGalleryCategories) {
  webGalleryCategories.addEventListener("click", (e) => {
    const tab = e.target.closest(".category-tab");
    if (!tab) return;

    webGalleryCategories.querySelectorAll(".category-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    selectedWebCategory = tab.dataset.cat || "All";
    renderWebCards();
  });
}

if (dockBtnWebIntegration) dockBtnWebIntegration.addEventListener("click", openWebGallery);
if (closeWebGalleryBtn) closeWebGalleryBtn.addEventListener("click", closeWebGallery);
if (webGalleryOverlay) webGalleryOverlay.addEventListener("click", closeWebGallery);

if (btnLoadCustomUrl && customWebUrlInput) {
  btnLoadCustomUrl.addEventListener("click", () => {
    let url = customWebUrlInput.value.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    window.open(url, "_blank");
    closeWebGallery();
    customWebUrlInput.value = "";
  });
}

function initShapesFlyoutMenu() {
  const masterBtn = document.getElementById("shapesMasterBtn");
  const flyoutBox = document.getElementById("shapesFlyoutBox");
  const wrapper = document.getElementById("shapesToolWrapper");

  if (!masterBtn || !flyoutBox) return;

  const newMasterBtn = masterBtn.cloneNode(true);
  masterBtn.parentNode.replaceChild(newMasterBtn, masterBtn);

  newMasterBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();

    const bgPanel = document.getElementById("bgSettingsPanel");
    if (bgPanel && !bgPanel.classList.contains("hidden")) {
      bgPanel.classList.add("hidden");
    }

    flyoutBox.classList.toggle("hidden");
  });

  flyoutBox.querySelectorAll(".shape-option-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const selectedShape = this.getAttribute("data-tool");

      flyoutBox.querySelectorAll(".shape-option-btn").forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      newMasterBtn.classList.add("active");

      if (typeof activeTool !== "undefined") activeTool = selectedShape;
      if (typeof fabricCanvas !== "undefined" && fabricCanvas) {
        fabricCanvas.isDrawingMode = false;
      }

      flyoutBox.classList.add("hidden");
    });
  });

  document.addEventListener("click", function (e) {
    if (flyoutBox && !flyoutBox.classList.contains("hidden")) {
      if (wrapper && !wrapper.contains(e.target)) {
        flyoutBox.classList.add("hidden");
      }
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initShapesFlyoutMenu);
} else {
  initShapesFlyoutMenu();
}