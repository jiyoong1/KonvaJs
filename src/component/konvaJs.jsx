// KonvaCanvas.jsx
import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line, Text, Image, Rect, Circle, Arrow, RegularPolygon } from "react-konva";
import { useAuth } from "./auth/authContext";
import { exportProjectPPTX, exportProjectPPTXImage, exportToSvg } from "../assets/script/export";
import { io } from "socket.io-client";
import { debounce, removeTemp } from "../assets/script/public";

export default function KonvaCanvas({ height, view = false, drawId = null, edit = false }) {
  // Define useRef
  const containerRef = useRef(null);
  const socketRef = useRef(null);
  const historyRef = useRef([]);
  const redoStack = useRef([]);
  const textBoxRef = useRef(null);
  const projectNameRef = useRef(null);
  const exportProjectRef = useRef(null);
  const startPointRef = useRef(null);
  // Define UseStart
  const [width, setWidth] = useState(800);
  const [lines, setLines] = useState([]);
  const [texts, setTexts] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [images, setImages] = useState([]);
  const [tool, setTool] = useState("round");
  const [color, setColor] = useState("#000000");
  const [fillColor, setFillColor] = useState("#ffffff");
  const [gradientTo, setGradientTo] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(4);
  const [fontSize, setFontSize] = useState(20);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const [selectedImgIndex, setSelectedImgIndex] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeAnchor, setResizeAnchor] = useState(null);
  const [textBoxMode, setTextBoxMode] = useState(false);
  const [textboxX, setTextBoxX] = useState(false);
  const [textboxY, setTextBoxY] = useState(false);
  const [saveProjectMode, setSaveProjectMode] = useState(false);
  const [exportProjectMode, setExportProjectMode] = useState(false);
  const [successSaveStatus, setSuccessSaveStatus] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedShapeIndex, setSelectedShapeIndex] = useState(null);
  const [drawingShape, setDrawingShape] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [showRoomPopup, setShowRoomPopup] = useState(false);
  const [joinRoomInput, setJoinRoomInput] = useState("");
  const [isGradient, setIsGradient] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [tempId, setTempId] = useState("drawingTempSave");
  const [maxPage, setMaxPage] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (drawId) {
      setTempId(`drawingTempSave_${user.id}_${drawId}`);
    }
  }, [view, drawId, edit]);

  // Socket.io for real-time collaboration
  // ========================= START ===========================================
  useEffect(() => {
    if (!roomId) return; // only connect after roomId is set

    socketRef.current = io("http://localhost:4000");
    socketRef.current.emit("joinRoom", roomId);

    socketRef.current.on("updateCanvas", (data) => {
      if (data.lines) setLines(data.lines);
      if (data.shapes) setShapes(data.shapes);
      if (data.texts) setTexts(data.texts);
      if (data.images) setImages(data.images);
    });

    return () => socketRef.current.disconnect();
  }, [roomId]);
  const broadcastUpdate = (update) => {
    if (!socketRef.current || !roomId) return;
    socketRef.current.emit("updateCanvas", { roomId, ...update });
  };
  const generateRoomId = () => {
    const id = Math.random().toString(36).substring(2, 8); // 6-char random
    setRoomId(id);
    setShowRoomPopup(true);
  };
  const joinRoom = () => {
    if (!joinRoomInput) return alert("Please enter room ID");
    setRoomId(joinRoomInput);
    setShowRoomPopup(false);
  };
  // ========================= END ===========================================

  // Dynamic width use State
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      setWidth(~~containerRef.current.offsetWidth - 40);
    };
    updateWidth();
    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const saveHistory = () => {
    const snapshot = {
      lines: JSON.parse(JSON.stringify(lines)),
      texts: JSON.parse(JSON.stringify(texts)),
      shapes: JSON.parse(JSON.stringify(shapes)),
      images: [...images],
    };
    historyRef.current.push(snapshot);
    if (historyRef.current.length > 50) historyRef.current.shift();
    redoStack.current = [];

    if (socketRef.current && roomId) {
      broadcastUpdate(snapshot); // send snapshot to room
    }
  };
  const debouncedSaveHistory = debounce(saveHistory, 500);
  // =========================
  // Undo / Redo
  const handleUndo = () => {
    if (historyRef.current.length === 0) return;
    const last = historyRef.current.pop();
    redoStack.current.push({
      lines: JSON.parse(JSON.stringify(lines)),
      texts: JSON.parse(JSON.stringify(texts)),
      shapes: JSON.parse(JSON.stringify(shapes)),
      images: [...images],
    });
    setLines(last.lines);
    setTexts(last.texts);
    setShapes(last.shapes);
    setImages(last.images);
  };
  const handleRedo = () => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop();
    historyRef.current.push({
      lines: JSON.parse(JSON.stringify(lines)),
      texts: JSON.parse(JSON.stringify(texts)),
      shapes: JSON.parse(JSON.stringify(shapes)),
      images: [...images],
    });
    setLines(next.lines);
    setTexts(next.texts);
    setShapes(next.shapes);
    setImages(next.images);
  };
  const textSave = () => {
    const textValue = textBoxRef.current.querySelector("input").value;
    if (!textValue) {
      textBoxRef.current.style.display = "none";
      return;
    }
    if (selectedShapeIndex !== null) {
      const newShapes = [...shapes];
      newShapes[selectedShapeIndex].text = textValue;
      setShapes(newShapes);
      setSelectedShapeIndex(null);
    } else {
      const newText = {
        text: textValue,
        x: textboxX,
        y: textboxY,
        fontSize,
        fontFamily,
        color,
      };
      setTexts([...texts, newText]);
    }
    saveHistory();
    textBoxRef.current.style.display = "none";
    textBoxRef.current.querySelector("input").value = "";
    setTextBoxMode(false);
  };
  // Mouse Event control
  //============================ START =========================
  const handleMouseDown = (e) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    if (!point) return;
    // Shapes
    if (tool === "select") return;
    if (["circle", "rect", "triangle", "arrow"].includes(tool)) {
      const startX = point.x / zoom - pan.x / zoom;
      const startY = point.y / zoom - pan.y / zoom;
      let baseShape = {
        id: Date.now(),
        type: tool,
        x: startX,
        y: startY,
        points: [0, 0, 0, 0],
        width: 1,
        height: 1,
        radius: 1,
        rotation: 0,
        fill: tool == "arrow" ? "#ffffff" : fillColor,
        stroke: color,
        strokeWidth: brushSize,
        text: "",
        fontSize: 16,
        fontFamily: "Arial",
        zIndex: shapes.length,
      };
      if (isGradient) {
        baseShape.gradientFrom = fillColor;
        baseShape.gradientTo = gradientTo;
      }
      setDrawingShape(baseShape);
      startPointRef.current = { x: baseShape.x, y: baseShape.y };
      return;
    }

    if (tool === "text") {
      setTextBoxMode(true);
      setTextBoxX(point.x / zoom - pan.x / zoom);
      setTextBoxY(point.y / zoom - pan.y / zoom - 10);
      if (!textBoxRef.current) return;
      textBoxRef.current.style.left = `${point.x + 20}px`;
      textBoxRef.current.style.top = `${point.y + 160}px`;
      textBoxRef.current.style.display = "block";
      textBoxRef.current.focus();
      return;
    } else if (tool === "edit-image") {
      return;
    }
    setTextBoxMode(false);
    setIsDrawing(true);
    const lineProps = {
      tool,
      points: [point.x / zoom - pan.x / zoom, point.y / zoom - pan.y / zoom],
      color: tool === "eraser" ? "white" : color,
      size: brushSize,
      lineCap: tool === "square" ? "butt" : "round",
      dash: tool === "dotted" ? [brushSize * 2, brushSize * 2] : [],
    };
    setCurrentLine(lineProps);
  };
  const handleMouseMove = (e) => {
    if (drawingShape) {
      const stage = e.target.getStage();
      const point = stage.getPointerPosition();
      if (!point) return;

      const sx = startPointRef.current.x;
      const sy = startPointRef.current.y;
      const cx = point.x / zoom - pan.x / zoom;
      const cy = point.y / zoom - pan.y / zoom;

      let updated = { ...drawingShape };

      if (drawingShape.type === "circle") {
        const dx = cx - sx;
        const dy = cy - sy;
        updated.radius = Math.sqrt(dx * dx + dy * dy);
      }

      if (drawingShape.type === "rect" || drawingShape.type === "triangle") {
        updated.width = Math.abs(cx - sx);
        updated.height = Math.abs(cy - sy);
        updated.x = Math.min(sx, cx);
        updated.y = Math.min(sy, cy);
      }

      if (drawingShape.type === "arrow") {
        const sx = startPointRef.current.x;
        const sy = startPointRef.current.y;
        const cx = point.x / zoom - pan.x / zoom;
        const cy = point.y / zoom - pan.y / zoom;

        updated.x = sx;
        updated.y = sy;
        updated.points = [0, 0, cx - sx, cy - sy]; // relative to (x,y)
      }
      // if (drawingShape.type === "arrow") {
      //   updated.points = [sx, sy, cx, cy];
      // }

      setDrawingShape(updated);
      return;
    }

    if (!isDrawing || !currentLine) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    if (!point) return;
    const newPoints = [...currentLine.points, point.x / zoom - pan.x / zoom, point.y / zoom - pan.y / zoom];
    setCurrentLine({ ...currentLine, points: newPoints });
  };
  const handleMouseUp = () => {
    if (drawingShape) {
      setShapes([...shapes, drawingShape]);
      saveHistory();
      setDrawingShape(null);
      startPointRef.current = null;
      return;
    }

    if (!isDrawing || !currentLine) return;
    setLines([...lines, currentLine]);
    setCurrentLine(null);
    setIsDrawing(false);
    saveHistory();
  };
  const handlePanStart = (e) => {
    if (!tool.includes("view")) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const handlePanMove = (e) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  };
  const handlePanEnd = () => {
    setIsPanning(false);
    // Auto save snapshot to localStorage
    const snapshot = [
      {
        page: currentPage,
        drawing: {
          lines,
          texts,
          shapes,
          images: images
            .map((img) => {
              let src = img.src;

              if (!src || src.startsWith("blob:")) {
                if (img.imgObj) {
                  const canvas = document.createElement("canvas");
                  canvas.width = img.width;
                  canvas.height = img.height;
                  const ctx = canvas.getContext("2d");
                  ctx.drawImage(img.imgObj, 0, 0, img.width, img.height);
                  src = canvas.toDataURL("image/png");
                } else {
                  console.warn("Skipping image: no src or imgObj", img);
                  return null;
                }
              }

              return {
                ...img,
                imgObj: undefined,
                src,
              };
            })
            .filter(Boolean),
          pan,
          zoom,
        },
      },
    ];
    // Load existing temp data (object keyed by userId)
    const tempData = JSON.parse(localStorage.getItem(tempId) || "{}");

    // Ensure current user has an array
    if (!tempData[user.id]) {
      tempData[user.id] = [];
    }

    // Filter out the current page for this user
    const existing = tempData[user.id].filter((s) => s.page !== currentPage);

    // Merge filtered old pages with new snapshots
    tempData[user.id] = [...existing, ...snapshot];

    // Save back to localStorage
    localStorage.setItem(tempId, JSON.stringify(tempData));
    debouncedSaveHistory();
  };
  //============================ END =========================
  // Zoom
  const handleZoom = (factor) => {
    setZoom((z) => Math.max(0.5, Math.min(3, z + factor)));
  };
  const handleImageUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.src = e.target.result; // Base64
      img.onload = () => {
        const newImg = {
          imgObj: img,
          src: e.target.result, // ✅ persistent Base64
          x: 0,
          y: 0,
          width: img.width * 0.3,
          height: img.height * 0.3,
          rotation: 0,
        };
        setImages([...images, newImg]);
        saveHistory();
      };
    };
    reader.readAsDataURL(file);
  };
  const saveProject = async () => {
    if (lines.length === 0 && texts.length === 0 && images.length === 0 && shapes.length === 0) {
      const errMsg = document.getElementById("errormsg");
      if (errMsg) {
        errMsg.style.display = "block";
        setTimeout(() => {
          errMsg.style.display = "none";
        }, 4000);
      }
      setSaveProjectMode(false);
      return;
    }
    if (projectNameRef.current.querySelector("input").value === "") {
      const errMsg = document.getElementById("errormsg");
      if (errMsg) {
        errMsg.textContent = "Project name cannot be empty";
        errMsg.style.display = "block";
        setTimeout(() => {
          errMsg.style.display = "none";
        }, 4000);
      }
      return;
    }
    const tempData = JSON.parse(localStorage.getItem(tempId) || "[]");

    // Ensure current user has an array
    if (!tempData[user.id]) {
      tempData[user.id] = [];
    }
    // Get current project info
    const projectName = projectNameRef.current.querySelector("input").value.trim();
    setProjectName(projectName);
    const newProject = {
      name: projectName,
      date: new Date().toISOString(),
      drawing: tempData[user.id],
    };

    // Load existing projects by user
    const allProjects = JSON.parse(localStorage.getItem("drawingProjects") || "{}");

    // Initialize array for this user if not exist
    if (!allProjects[user.id]) {
      allProjects[user.id] = [];
    }

    // Add new project for this user
    allProjects[user.id].push(newProject);

    // Save back to localStorage
    localStorage.setItem("drawingProjects", JSON.stringify(allProjects));

    setSuccessMsg("Drawing successfully saved");
    // clearProject(); // Optionally clear after save
    setSuccessSaveStatus(true);
    setTimeout(() => {
      setSuccessSaveStatus(false);
    }, 3000);
    setSaveProjectMode(false);
  };
  const exportProject = async () => {
    const errMsgEl = exportProjectRef.current?.querySelector("#errormsgExport");
    if (lines.length === 0 && texts.length === 0 && images.length === 0 && shapes.length === 0) {
      if (errMsgEl) {
        errMsgEl.style.display = "block";
        setTimeout(() => {
          errMsgEl.style.display = "none";
        }, 4000);
      }
      return;
    }

    const projectName = exportProjectRef.current.querySelector("input").value.trim();
    if (!projectName) {
      if (errMsgEl) {
        errMsgEl.textContent = "Project name cannot be empty";
        errMsgEl.style.display = "block";
        setTimeout(() => {
          errMsgEl.style.display = "none";
        }, 4000);
      }
      return;
    }

    const tempData = JSON.parse(localStorage.getItem(tempId) || "[]");
    const saved = tempData[user.id];

    if (!saved || saved.length === 0) return;

    if (exportProjectRef.current.querySelector("select").value === "svg") {
      exportToSvg(saved, projectName, width, height);
    } else {
      const exportMode = import.meta.env.VITE_EXPORT_PPTX;
      if (exportMode == 1) {
        exportProjectPPTXImage(saved, projectName, width, height);
      } else {
        exportProjectPPTX(saved, projectName);
      }
    }

    setSuccessMsg("Drawing successfully exported");
    setSuccessSaveStatus(true);
    setTimeout(() => {
      setSuccessSaveStatus(false);
    }, 3000);
    setExportProjectMode(false);
  };
  const clearProject = () => {
    setLines([]);
    setTexts([]);
    setImages([]);
    setShapes([]);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    historyRef.current = [];
    redoStack.current = [];
  };
  const handlePageUpdate = (direction) => {
    if (direction === "n") {
      if (currentPage < maxPage) setCurrentPage((p) => p + 1);
    } else if (direction === "p" && currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  };
  // Restore snapshot from localStorage
  useEffect(() => {
    clearProject();
    const saved = localStorage.getItem(view || edit ? "drawingProjects" : tempId);
    if (saved) {
      try {
        const existing = JSON.parse(saved);
        if (!existing[user.id]) {
          return;
        }
        const data = view || edit ? existing[user.id][drawId]?.drawing : existing[user.id];
        if (edit) {
          setProjectName(existing[user.id][drawId]?.name);
        }
        if (view) {
          setMaxPage(existing[user.id][drawId]?.drawing.length || 1);
        }
        const snapshot = data?.find((s) => s.page === currentPage)?.drawing;
        if (!snapshot) return;
        if (snapshot.lines) setLines(snapshot.lines);
        if (snapshot.texts) setTexts(snapshot.texts);
        if (snapshot.shapes) setShapes(snapshot.shapes);
        if (snapshot.images && snapshot.images.length > 0) {
          // Wait for all images to load
          Promise.all(
            snapshot.images.map(
              (img) =>
                new Promise((resolve) => {
                  const imageEl = new window.Image();
                  imageEl.src = img.src; // Base64
                  imageEl.onload = () => resolve({ ...img, imgObj: imageEl });
                })
            )
          ).then((restoredImages) => setImages(restoredImages));
        }
        if (snapshot.pan) setPan(snapshot.pan);
        if (snapshot.zoom) setZoom(snapshot.zoom);
      } catch (err) {
        console.error("Failed to restore drawing snapshot:", err);
      }
    }
  }, [currentPage]);
  // Set keyboard event to Undo and Redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && key === "z") {
        e.preventDefault();
        handleUndo();
      }
      // Redo: Ctrl+Y or Cmd+Shift+Z (Mac often uses Cmd+Shift+Z for redo)
      else if ((e.ctrlKey || e.metaKey) && (key === "y" || (e.shiftKey && key === "z"))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center w-full relative"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files && files[0]) {
          handleImageUpload(files[0]);
        }
      }}
    >
      {edit && (
        <button
          onClick={() => {
            removeTemp(user.id, drawId);
            window.location.href = "/";
          }}
          className="absolute shadow-md top-2 right-2 w-[35px] h-[35px] hover:bg-gray-100 bg-white rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 hover:shadow-lg transition text-2xl font-bold z-10"
        >
          ×
        </button>
      )}
      {projectName && (
        <div
          className="absolute top-[-60px] left-1/2 -translate-x-1/2 
                  bg-white/80 backdrop-blur-md 
                  px-6 py-2 rounded-2xl 
                  shadow-lg border border-gray-200 
                  text-xl font-semibold text-gray-800 
                  select-none pointer-events-none"
        >
          Project Name : {projectName}
        </div>
      )}
      {textBoxMode && (
        <div
          ref={textBoxRef}
          className="rounded-[5px] shadow-2xl absolute border border-solid border-[gray] bg-white z-10"
          style={{ display: "none" }}
        >
          <input
            type="text"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                textSave(); // <-- call your function here
              }
            }}
          />
        </div>
      )}
      {saveProjectMode && (
        <div className="fixed top-0 left-0 min-h-screen min-w-screen bg-[#3e3e3ef7] flex justify-center items-center z-20">
          <div ref={projectNameRef} className="bg-white p-6 rounded shadow-lg w-96 relative">
            <p
              id="errormsg"
              className="border border-solid border-red-600 bg-red-300 text-center mb-[10px] text-red-600 px-[10px] py-[5px] rounded-[7px] shadow-2xl hidden"
            >
              {" "}
              Empty project cannot save
            </p>
            <h2 className="text-xl font-bold mb-4">Save Project</h2>
            <input
              type="text"
              placeholder="Project Name"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setSaveProjectMode(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition">
                Cancel
              </button>
              <button
                onClick={() => {
                  saveProject();
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {exportProjectMode && (
        <div className="fixed top-0 left-0 min-h-screen min-w-screen bg-[#3e3e3ef7] flex justify-center items-center z-20">
          <div ref={exportProjectRef} className="bg-white p-6 rounded shadow-lg w-120 relative">
            <p
              id="errormsgExport"
              className="border border-solid border-red-600 bg-red-300 text-center mb-[10px] text-red-600 px-[10px] py-[5px] rounded-[7px] shadow-2xl hidden"
            >
              {" "}
              Empty project cannot Export
            </p>
            <h2 className="text-xl font-bold mb-4">Export Project</h2>
            <div className="grid grid-cols-[1fr_100px] gap-[10px] mb-4 ">
              <input
                type="text"
                placeholder="Project Name"
                className="w-full border border-gray-300 rounded px-3 py-[10px] focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <select className="w-full h-[46px] border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="svg">SVG</option>
                <option value="pptx">PPTX</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setExportProjectMode(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition">
                Cancel
              </button>
              <button
                onClick={() => {
                  exportProject();
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
      {successSaveStatus && (
        <div className="absolute top-[80px] -translate-x-1/2: border border-solid border-green-300 bg-green-100 text-green-600 px-3 py-2 rounded shadow z-20">
          {successMsg}
        </div>
      )}
      {!view && (
        <div className="flex flex-wrap gap-3 mb-4 items-center bg-gray-100 p-3 rounded shadow">
          {/* Tool selection */}
          <select
            value={tool}
            onChange={(e) => setTool(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="round">Round Brush</option>
            <option value="square">Square Brush</option>
            <option value="dotted">Dotted Brush</option>
            <option value="eraser">Eraser</option>
            <option value="text">Text Tool</option>
            <option value="rect">Rectangle</option>
            <option value="circle">Circle</option>
            <option value="triangle">Triangle</option>
            <option value="arrow">Arrow</option>
            <option value="edit-image">Edit Image</option>
            <option value="select">Select</option>
          </select>
          <div className="relative group ml-2">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 p-0 border rounded cursor-pointer" />
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
              Stroke Color
            </span>
          </div>
          {["rect", "circle", "triangle"].includes(tool) && (
            <React.Fragment>
              <label className="flex items-center space-x-2 ml-2 cursor-pointer">
                <span>Gradient</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={isGradient} onChange={(e) => setIsGradient(e.target.checked)} />
                  <div className={`w-10 h-5 rounded-full transition ${isGradient ? "bg-green-500" : "bg-gray-400"}`}></div>
                  <div
                    className={`dot absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition ${isGradient ? "translate-x-5" : ""}`}
                  ></div>
                </div>
              </label>
              <div className="relative group ml-2">
                <input
                  type="color"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="w-10 h-10 p-0 border rounded cursor-pointer"
                />
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
                  {isGradient ? `Gradient From` : `Fill Color`}
                </span>
              </div>
              {isGradient && (
                <div className="relative group ml-2">
                  <input
                    type="color"
                    value={gradientTo}
                    onChange={(e) => setGradientTo(e.target.value)}
                    className="w-10 h-10 p-0 border rounded cursor-pointer"
                  />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    Gradient To
                  </span>
                </div>
              )}
            </React.Fragment>
          )}

          <input type="range" min="1" max="30" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-24" />
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="Arial">Arial</option>
            <option value="Courier New">Courier</option>
            <option value="Times New Roman">Times</option>
          </select>
          <input
            type="number"
            min="8"
            max="72"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-16 border border-gray-300 rounded px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button onClick={() => handleUndo()} className="px-3 py-1 bg-white border border-gray-300 rounded shadow hover:bg-gray-200 transition">
            Undo
          </button>
          <button onClick={() => handleRedo()} className="px-3 py-1 bg-white border border-gray-300 rounded shadow hover:bg-gray-200 transition">
            Redo
          </button>
          <button onClick={() => handleZoom(0.1)} className="px-3 py-1 bg-white border border-gray-300 rounded shadow hover:bg-gray-200 transition">
            Zoom In
          </button>
          <button onClick={() => handleZoom(-0.1)} className="px-3 py-1 bg-white border border-gray-300 rounded shadow hover:bg-gray-200 transition">
            Zoom Out
          </button>
          <span className="text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
          <label className="px-3 py-1 bg-white border border-gray-300 rounded shadow cursor-pointer hover:bg-gray-200 transition">
            Upload Image
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0])} />
          </label>

          <button
            className="px-3 py-1 bg-white border border-gray-300 rounded shadow hover:bg-gray-200 transition"
            onClick={() => {
              if (selectedShapeIndex === null) return;
              if (selectedShapeIndex < shapes.length - 1) {
                const newShapes = [...shapes];
                const temp = newShapes[selectedShapeIndex];
                newShapes[selectedShapeIndex] = newShapes[selectedShapeIndex + 1];
                newShapes[selectedShapeIndex + 1] = temp;
                setShapes(newShapes);
                setSelectedShapeIndex(selectedShapeIndex + 1);
                saveHistory();
              }
            }}
          >
            Bring Forward
          </button>
          <button
            className="px-3 py-1 bg-white border border-gray-300 rounded shadow hover:bg-gray-200 transition"
            onClick={() => {
              if (selectedShapeIndex === null) return;
              if (selectedShapeIndex > 0) {
                const newShapes = [...shapes];
                const temp = newShapes[selectedShapeIndex];
                newShapes[selectedShapeIndex] = newShapes[selectedShapeIndex - 1];
                newShapes[selectedShapeIndex - 1] = temp;
                setShapes(newShapes);
                setSelectedShapeIndex(selectedShapeIndex - 1);
                saveHistory();
              }
            }}
          >
            Send Backward
          </button>
          <button
            onClick={() => setSaveProjectMode(true)}
            className="px-3 py-1 bg-white border border-gray-300 rounded shadow hover:bg-gray-200 transition"
          >
            Save
          </button>
          <button
            onClick={() => setExportProjectMode(true)}
            className="px-3 py-1 bg-white border border-gray-300 rounded shadow hover:bg-gray-200 transition"
          >
            Export
          </button>
          <button onClick={clearProject} className="px-3 py-1 bg-white border border-gray-300 rounded shadow hover:bg-gray-200 transition">
            Clear All
          </button>
          <button onClick={generateRoomId} className="px-3 py-1 bg-green-500 text-white rounded shadow hover:bg-green-600 transition">
            Start Collaboration
          </button>

          {showRoomPopup && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 border border-solid border-gray-400 bg-white p-6 rounded shadow-lg z-50">
              <p>Share this Room ID with your collaborator:</p>
              <p className="font-bold text-xl">{roomId}</p>
              <button onClick={() => setShowRoomPopup(false)} className="mt-4 px-3 py-1 bg-gray-300 rounded hover:bg-gray-400">
                Close
              </button>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Enter Room ID"
              value={joinRoomInput}
              onChange={(e) => setJoinRoomInput(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1"
            />
            <button onClick={joinRoom} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
              Join Room
            </button>
          </div>
        </div>
      )}
      <div
        style={{ border: "1px solid #ccc", width: width, height: height, overflow: "hidden" }}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
      >
        <Stage
          width={width}
          height={height}
          scaleX={zoom}
          scaleY={zoom}
          x={pan.x}
          y={pan.y}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer>
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.color}
                strokeWidth={line.size}
                lineCap={line.lineCap}
                lineJoin="round"
                dash={line.dash}
              />
            ))}
            {currentLine && (
              <Line
                points={currentLine.points}
                stroke={currentLine.color}
                strokeWidth={currentLine.size}
                lineCap={currentLine.lineCap}
                lineJoin="round"
                dash={currentLine.dash}
              />
            )}
            {texts.map((txt, i) => (
              <Text key={i} x={txt.x} y={txt.y} text={txt.text} fontSize={txt.fontSize} fontFamily={txt.fontFamily} fill={txt.color} />
            ))}
            {images.map((img, i) => (
              <React.Fragment key={i}>
                <Image
                  image={img.imgObj}
                  x={img.x}
                  y={img.y}
                  width={img.width}
                  height={img.height}
                  rotation={img.rotation}
                  onClick={() => {
                    if (tool === "edit-image") setSelectedImgIndex(i);
                  }}
                  draggable={tool === "edit-image" && selectedImgIndex === i}
                  onDragEnd={(e) => {
                    if (tool === "edit-image" && selectedImgIndex === i) {
                      const { x, y } = e.target.position();
                      const newImages = [...images];
                      newImages[i] = { ...newImages[i], x, y };
                      setImages(newImages);
                      saveHistory();
                    }
                  }}
                />
                {/* Show resize handles if selected */}
                {tool === "edit-image" && selectedImgIndex === i && (
                  <>
                    {/* Rotation handle (circle above image) */}
                    <Rect
                      x={img.x + img.width / 2 - 8}
                      y={img.y - 32}
                      width={16}
                      height={16}
                      fill="orange"
                      cornerRadius={8}
                      draggable
                      cursor="grab" // default
                      onMouseEnter={(e) => (e.target.getStage().container().style.cursor = "alias")} // "alias" looks like rotate
                      onMouseLeave={(e) => (e.target.getStage().container().style.cursor = "default")}
                      onDragMove={(e) => {
                        const { x, y } = e.target.position();
                        // Calculate angle from image center to handle
                        const centerX = img.x + img.width / 2;
                        const centerY = img.y + img.height / 2;
                        const angle = (Math.atan2(y + 8 - centerY, x + 8 - centerX) * 180) / Math.PI + 90;
                        const newImages = [...images];
                        newImages[i] = { ...newImages[i], rotation: angle };
                        setImages(newImages);
                      }}
                      onDragEnd={() => {
                        saveHistory();
                      }}
                    />
                    {/* Bottom-right resize handle (existing) */}
                    <Rect
                      x={img.x + img.width - 8}
                      y={img.y + img.height - 8}
                      width={16}
                      height={16}
                      fill="blue"
                      draggable
                      cursor="grab" // default
                      onMouseEnter={(e) => (e.target.getStage().container().style.cursor = "nwse-resize")}
                      onMouseLeave={(e) => (e.target.getStage().container().style.cursor = "default")}
                      onMouseDown={() => {
                        setIsResizing(true);
                        setResizeAnchor("br");
                      }}
                      onDragMove={(e) => {
                        if (isResizing && resizeAnchor === "br") {
                          const { x, y } = e.target.position();
                          const newWidth = Math.max(10, x - img.x + 8);
                          const newHeight = Math.max(10, y - img.y + 8);
                          const newImages = [...images];
                          newImages[i] = { ...newImages[i], width: newWidth, height: newHeight };
                          setImages(newImages);
                        }
                      }}
                      onDragEnd={() => {
                        setIsResizing(false);
                        setResizeAnchor(null);
                        saveHistory();
                      }}
                    />
                  </>
                )}
              </React.Fragment>
            ))}
            {drawingShape && drawingShape.type === "circle" && (
              <Circle
                x={drawingShape.x}
                y={drawingShape.y}
                radius={drawingShape.radius}
                stroke={drawingShape.stroke}
                strokeWidth={drawingShape.strokeWidth}
                fill={!drawingShape.gradientFrom ? drawingShape.fill : null}
                fillLinearGradientStartPoint={drawingShape.gradientFrom ? { x: -drawingShape.radius, y: 0 } : null}
                fillLinearGradientEndPoint={drawingShape.gradientFrom ? { x: drawingShape.radius, y: 0 } : null}
                fillLinearGradientColorStops={drawingShape.gradientFrom ? [0, drawingShape.gradientFrom, 1, drawingShape.gradientTo] : null}
              />
            )}

            {drawingShape && drawingShape.type === "rect" && (
              <Rect
                x={drawingShape.x}
                y={drawingShape.y}
                width={drawingShape.width}
                height={drawingShape.height}
                stroke={drawingShape.stroke}
                strokeWidth={drawingShape.strokeWidth}
                fill={!drawingShape.gradientFrom ? drawingShape.fill : null}
                fillLinearGradientStartPoint={drawingShape.gradientFrom ? { x: 0, y: 0 } : null}
                fillLinearGradientEndPoint={drawingShape.gradientFrom ? { x: drawingShape.width, y: 0 } : null}
                fillLinearGradientColorStops={drawingShape.gradientFrom ? [0, drawingShape.gradientFrom, 1, drawingShape.gradientTo] : null}
              />
            )}

            {drawingShape && drawingShape.type === "triangle" && (
              <RegularPolygon
                x={drawingShape.x}
                y={drawingShape.y}
                sides={3}
                radius={Math.max(drawingShape.width, drawingShape.height) / 2}
                stroke={drawingShape.stroke}
                strokeWidth={drawingShape.strokeWidth}
                rotation={drawingShape.rotation}
                fill={!drawingShape.gradientFrom ? drawingShape.fill : null}
                fillLinearGradientStartPoint={drawingShape.gradientFrom ? { x: -drawingShape.width / 2, y: 0 } : null}
                fillLinearGradientEndPoint={drawingShape.gradientFrom ? { x: drawingShape.width / 2, y: 0 } : null}
                fillLinearGradientColorStops={drawingShape.gradientFrom ? [0, drawingShape.gradientFrom, 1, drawingShape.gradientTo] : null}
              />
            )}

            {drawingShape && drawingShape.type === "arrow" && (
              <Arrow
                x={drawingShape.x}
                y={drawingShape.y}
                points={drawingShape.points}
                fill={drawingShape.fill}
                stroke={drawingShape.stroke}
                strokeWidth={drawingShape.strokeWidth}
              />
            )}

            {shapes.map((shape, i) => {
              const commonProps = {
                x: shape.x,
                y: shape.y,
                rotation: shape.rotation,
                draggable: !drawingShape,
                onDragEnd: (e) => {
                  const newShapes = [...shapes];
                  newShapes[i] = { ...newShapes[i], x: e.target.x(), y: e.target.y() };
                  setShapes(newShapes);
                  saveHistory();
                },
                onClick: () => setSelectedShapeIndex(i),
              };

              switch (shape.type) {
                case "rect":
                  return (
                    <React.Fragment key={i + shape.id}>
                      <Rect
                        {...commonProps}
                        width={shape.width}
                        height={shape.height}
                        stroke={shape.stroke}
                        strokeWidth={shape.strokeWidth}
                        fill={!shape.gradientFrom ? shape.fill : null}
                        fillLinearGradientStartPoint={shape.gradientFrom ? { x: 0, y: 0 } : null}
                        fillLinearGradientEndPoint={shape.gradientFrom ? { x: shape.width, y: 0 } : null}
                        fillLinearGradientColorStops={shape.gradientFrom ? [0, shape.gradientFrom, 1, shape.gradientTo] : null}
                      />
                      {shape.text && <Text x={shape.x} y={shape.y} text={shape.text} fontSize={shape.fontSize} fontFamily={shape.fontFamily} />}
                    </React.Fragment>
                  );
                case "circle":
                  return (
                    <React.Fragment key={i + shape.id}>
                      <Circle
                        key={i + shape.id}
                        {...commonProps}
                        radius={shape.radius}
                        stroke={shape.stroke}
                        strokeWidth={shape.strokeWidth}
                        fill={!shape.gradientFrom ? shape.fill : null}
                        fillLinearGradientStartPoint={shape.gradientFrom ? { x: -shape.radius, y: 0 } : null}
                        fillLinearGradientEndPoint={shape.gradientFrom ? { x: shape.radius, y: 0 } : null}
                        fillLinearGradientColorStops={shape.gradientFrom ? [0, shape.gradientFrom, 1, shape.gradientTo] : null}
                      />
                      {shape.text && (
                        <Text
                          x={shape.x - shape.radius / 2}
                          y={shape.y - shape.radius / 2}
                          text={shape.text}
                          fontSize={shape.fontSize}
                          fontFamily={shape.fontFamily}
                        />
                      )}
                    </React.Fragment>
                  );
                case "triangle":
                  return (
                    <RegularPolygon
                      key={i + shape.id}
                      {...commonProps}
                      x={shape.x}
                      y={shape.y}
                      sides={3}
                      radius={Math.max(shape.width, shape.height) / 2}
                      stroke={shape.stroke}
                      strokeWidth={shape.strokeWidth}
                      rotation={shape.rotation}
                      fill={!shape.gradientFrom ? shape.fill : null}
                      fillLinearGradientStartPoint={shape.gradientFrom ? { x: -shape.width / 2, y: 0 } : null}
                      fillLinearGradientEndPoint={shape.gradientFrom ? { x: shape.width / 2, y: 0 } : null}
                      fillLinearGradientColorStops={shape.gradientFrom ? [0, shape.gradientFrom, 1, shape.gradientTo] : null}
                    />
                  );
                case "arrow":
                  return (
                    <Arrow
                      key={i + shape.id}
                      {...commonProps}
                      points={shape.points}
                      fill={shape.fill}
                      stroke={shape.stroke}
                      strokeWidth={shape.strokeWidth}
                    />
                  );
                default:
                  return null;
              }
            })}
          </Layer>
        </Stage>
      </div>
      <div className="flex justify-center items-center py-[20px] gap-4">
        <button
          onClick={() => handlePageUpdate("p")}
          className={`${
            currentPage == 1 ? `cursor-not-allowed ` : ` hover:bg-gray-200 transition`
          } w-[130px] flex justify-center items-center py-1 bg-white border border-gray-300 rounded shadow `}
        >
          {`<< Previous`}
        </button>
        <p className="border border-solid border-gray-300 rounded px-3 py-1">{currentPage}</p>
        <button
          onClick={() => handlePageUpdate("n")}
          className="w-[130px] flex justify-center items-center py-1 bg-white border border-gray-300 rounded shadow hover:bg-gray-200 transition"
        >
          {`Next >>`}
        </button>
      </div>
    </div>
  );
}
