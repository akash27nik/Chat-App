// MediaEditor.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { RxCross2 } from "react-icons/rx";
import { BsArrowCounterclockwise, BsArrowClockwise } from "react-icons/bs";
import { AiOutlineCheck, AiOutlineUndo, AiOutlineZoomIn, AiOutlineZoomOut } from "react-icons/ai";
import { FiSmile, FiCrop, FiRotateCw, FiRotateCcw, FiRefreshCcw } from "react-icons/fi";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";

import EmojiPicker from "emoji-picker-react";

/**
 * Professional full-screen editor:
 * - Resizable crop (Cropper.js)
 * - Rotate left/right
 * - Zoom (buttons)
 * - Stickers: draggable, scalable, rotatable, removable
 * - Fullscreen emoji picker
 * - Save composes stickers onto cropped canvas and returns a File
 *
 * Props:
 *  - file: File (image/* or video/*)
 *  - onCancel(): void
 *  - onSave({ file: File }): void
 */
export default function MediaEditor({ file, onCancel, onSave }) {
  const isImage = file?.type?.startsWith("image");
  const [ready, setReady] = useState(false);

  // Cropper state
  const cropperRef = useRef(null);
  const [aspect, setAspect] = useState(1); // default 1:1 like WhatsApp status
  const [showGrid, setShowGrid] = useState(true);

  // Rotation (applies to cropper)
  // We trigger cropper.rotate() via buttons rather than maintaining a separate angle here.
  // However we keep a local rotation counter for UI state.
  const [rotationDeg, setRotationDeg] = useState(0);

  // Stickers
  const stageRef = useRef(null);
  const [stickers, setStickers] = useState([]); // [{ id, emoji, xN, yN, scale, rotate }]
  const [activeStickerId, setActiveStickerId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [history, setHistory] = useState([]); // for undo

  // Zoom helpers (zoom handled by cropper directly)
  const zoomBy = (delta = 0.1) => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    cropper.zoom(delta);
  };

  // Add current state to history (for undo)
  const pushHistory = () => {
    setHistory((h) => [
      ...h,
      {
        stickers: JSON.parse(JSON.stringify(stickers)),
        rotationDeg,
        aspect,
      },
    ]);
  };

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setStickers(prev.stickers);
      setRotationDeg(prev.rotationDeg);
      setAspect(prev.aspect);
      // cropper visual reset for rotation/aspect
      const cropper = cropperRef.current?.cropper;
      if (cropper) {
        cropper.reset();
        cropper.setAspectRatio(prev.aspect || NaN);
        cropper.rotateTo(prev.rotationDeg || 0);
      }
      return h.slice(0, -1);
    });
  };

  const resetAll = () => {
    pushHistory();
    setStickers([]);
    setActiveStickerId(null);
    setRotationDeg(0);
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.reset();
      cropper.setAspectRatio(1);
      cropper.rotateTo(0);
      setAspect(1);
      setShowGrid(true);
    }
  };

  // Add emoji sticker at center
  const addEmoji = (emojiData) => {
    setShowEmojiPicker(false);
    if (!stageRef.current) return;
    pushHistory();

    // Place in center normalized to stage
    const rect = stageRef.current.getBoundingClientRect();
    const xN = 0.5;
    const yN = 0.5;
    const id = `stk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setStickers((s) => [
      ...s,
      { id, emoji: emojiData.emoji, xN, yN, scale: 1, rotate: 0 },
    ]);
    setActiveStickerId(id);
  };

  // Helper: clamp
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // Pointer dragging of stickers
  const onStickerPointerDown = (e, id) => {
    e.stopPropagation();
    setActiveStickerId(id);
    const sticker = stickers.find((s) => s.id === id);
    if (!sticker) return;

    const stageRect = stageRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;

    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      // convert dx/dy px → normalized by stage width/height
      const xN = clamp(sticker.xN + dx / stageRect.width, 0.01, 0.99);
      const yN = clamp(sticker.yN + dy / stageRect.height, 0.01, 0.99);
      setStickers((list) =>
        list.map((s) => (s.id === id ? { ...s, xN, yN } : s))
      );
    };

    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
    };

    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  // Resize/Rotate controls per sticker (sliders)
  const onStickerScale = (id, val) => {
    setStickers((list) =>
      list.map((s) => (s.id === id ? { ...s, scale: Number(val) } : s))
    );
  };
  const onStickerRotate = (id, val) => {
    setStickers((list) =>
      list.map((s) => (s.id === id ? { ...s, rotate: Number(val) } : s))
    );
  };
  const removeSticker = (id) => {
    pushHistory();
    setStickers((list) => list.filter((s) => s.id !== id));
    if (activeStickerId === id) setActiveStickerId(null);
  };

  // Rotation
  const rotateLeft = () => {
    pushHistory();
    setRotationDeg((d) => {
      const nd = (d - 90 + 360) % 360;
      cropperRef.current?.cropper?.rotate(-90);
      return nd;
    });
  };
  const rotateRight = () => {
    pushHistory();
    setRotationDeg((d) => {
      const nd = (d + 90) % 360;
      cropperRef.current?.cropper?.rotate(90);
      return nd;
    });
  };

  // Aspect ratio choices like pro apps
  const aspectOptions = useMemo(
    () => [
      { label: "Free", value: 0 },
      { label: "1:1", value: 1 },
      { label: "4:5", value: 4 / 5 },
      { label: "16:9", value: 16 / 9 },
      { label: "3:4", value: 3 / 4 },
    ],
    []
  );
  const setAspectRatio = (v) => {
    pushHistory();
    setAspect(v || 0);
    const cropper = cropperRef.current?.cropper;
    if (cropper) cropper.setAspectRatio(v || NaN);
  };

  // Compose final edited image:
  // 1) use cropper.getCroppedCanvas()
  // 2) draw stickers onto the canvas at scaled positions
  const save = async () => {
    try {
      const cropper = cropperRef.current?.cropper;
      if (!cropper) return;

      const baseCanvas = cropper.getCroppedCanvas({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high",
        fillColor: "#00000000",
        // You could set maxWidth/maxHeight if you want to limit export size.
      });

      if (!baseCanvas) {
        alert("Failed to generate cropped image");
        return;
      }

      // Draw stickers
      if (stickers.length && stageRef.current) {
        const stageRect = stageRef.current.getBoundingClientRect();
        const ctx = baseCanvas.getContext("2d");

        stickers.forEach((s) => {
          // position in output canvas
          const x = s.xN * baseCanvas.width;
          const y = s.yN * baseCanvas.height;

          // size: base font derived from canvas width; tune multiplier for visual scale
          const baseFont = Math.max(20, Math.round(baseCanvas.width * 0.07));
          const fontSize = baseFont * (s.scale || 1);

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(((s.rotate || 0) * Math.PI) / 180);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          // Use common color emoji fallback stack
          ctx.font = `${fontSize}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
          ctx.fillText(s.emoji, 0, 0);
          ctx.restore();
        });
      }

      // Export to blob/file
      baseCanvas.toBlob(
        (blob) => {
          if (!blob) {
            alert("Export failed");
            return;
          }
          const editedFile = new File([blob], file.name, { type: file.type || "image/png" });
          onSave({ file: editedFile });
        },
        file.type?.includes("image/") ? file.type : "image/png",
        0.95
      );
    } catch (e) {
      console.error(e);
      alert("Failed to save image");
    }
  };

  // Close on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // If not an image: (basic UX) show video full-screen but we won't burn-in stickers/crop here.
  if (!isImage) {
    return (
      <div className="fixed inset-0 z-[1000] bg-black/90 flex items-center justify-center">
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3">
          <button
            onClick={onCancel}
            className="text-white/90 hover:text-white rounded-full p-2"
            aria-label="Close"
          >
            <RxCross2 size={24} />
          </button>
          <div className="text-white/90 font-medium">Video Preview</div>
          <div className="w-10" />
        </div>

        <video
          src={URL.createObjectURL(file)}
          controls
          className="max-w-[90vw] max-h-[75vh] rounded-xl shadow-2xl"
        />

        <div className="absolute bottom-0 left-0 right-0 p-3 flex justify-end gap-2">
          <button
            onClick={() => onSave({ file })}
            className="bg-[#20c7ff] hover:bg-[#19afe0] text-white px-4 py-2 rounded-xl shadow"
          >
            Use Video
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black/90 text-white select-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between">
        <button
          onClick={onCancel}
          className="text-white/90 hover:text-white rounded-full p-2"
          aria-label="Close"
        >
          <RxCross2 size={24} />
        </button>

        <div className="flex gap-2">
          <button
            onClick={undo}
            className="bg-white/10 hover:bg-white/20 rounded-full px-3 py-2 flex items-center gap-2"
            title="Undo"
          >
            <AiOutlineUndo />
          </button>
          <button
            onClick={resetAll}
            className="bg-white/10 hover:bg-white/20 rounded-full px-3 py-2 flex items-center gap-2"
            title="Reset all"
          >
            <FiRefreshCcw />
          </button>
          <button
            onClick={save}
            className="bg-[#20c7ff] hover:bg-[#19afe0] rounded-full px-4 py-2 flex items-center gap-2"
            title="Save"
          >
            <AiOutlineCheck />
            Save
          </button>
        </div>
      </div>

      {/* Center stage */}
      <div className="h-full w-full flex items-center justify-center px-4">
        <div
          ref={stageRef}
          className="relative max-w-[92vw] max-h-[72vh] w-full aspect-square bg-black/30 rounded-xl overflow-hidden"
        >
          <Cropper
            ref={cropperRef}
            src={URL.createObjectURL(file)}
            style={{ height: "100%", width: "100%" }}
            dragMode="move"
            guides={showGrid}
            background={false}
            autoCropArea={1}
            movable={true}
            zoomable={true}
            rotatable={true}
            scalable={true}
            viewMode={1}
            ready={() => setReady(true)}
            // aspect ratio managed externally; 0 = free
            aspectRatio={aspect || NaN}
            // image smoothing for better render feel
            checkCrossOrigin={false}
          />

          {/* Stickers overlay (DOM) */}
          {stickers.map((s) => {
            // convert normalized to pixel position relative to stage
            // using CSS transform for rotation + scaling
            return (
              <div
                key={s.id}
                onPointerDown={(e) => onStickerPointerDown(e, s.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveStickerId(s.id);
                }}
                className={`absolute top-0 left-0 cursor-grab select-none ${
                  activeStickerId === s.id ? "drop-shadow-[0_0_0.4rem_rgba(32,199,255,0.8)]" : ""
                }`}
                style={{
                  transform: `translate(calc(${s.xN * 100}% - 50%), calc(${s.yN * 100}% - 50%)) rotate(${s.rotate}deg) scale(${s.scale})`,
                  transformOrigin: "center",
                }}
              >
                <div style={{ fontSize: 64, lineHeight: 1 }}>{s.emoji}</div>
                {/* Active sticker controls */}
                {activeStickerId === s.id && (
                  <div className="mt-2 bg-black/60 rounded-lg p-2 backdrop-blur flex items-center gap-2">
                    <label className="text-xs whitespace-nowrap">Size</label>
                    <input
                      type="range"
                      min={0.4}
                      max={3}
                      step={0.05}
                      value={s.scale}
                      onChange={(e) => onStickerScale(s.id, e.target.value)}
                    />
                    <label className="text-xs whitespace-nowrap">Rotate</label>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={s.rotate}
                      onChange={(e) => onStickerRotate(s.id, e.target.value)}
                    />
                    <button
                      className="text-red-300 hover:text-red-400 text-xs px-2"
                      onClick={() => removeSticker(s.id)}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom tool bar */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="mx-auto max-w-xl w-full bg-white/10 backdrop-blur rounded-2xl px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Crop modes */}
            <div className="hidden sm:flex items-center gap-1">
              {aspectOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setAspectRatio(opt.value)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    aspect === opt.value ? "bg-white/25" : "hover:bg-white/15"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowGrid((v) => !v)}
              className="px-2 py-1 rounded-lg hover:bg-white/15"
              title="Toggle grid"
            >
              <FiCrop />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={rotateLeft}
              className="px-2 py-1 rounded-lg hover:bg-white/15"
              title="Rotate left"
            >
              <FiRotateCcw />
            </button>
            <button
              onClick={rotateRight}
              className="px-2 py-1 rounded-lg hover:bg-white/15"
              title="Rotate right"
            >
              <FiRotateCw />
            </button>
            <button
              onClick={() => zoomBy(+0.15)}
              className="px-2 py-1 rounded-lg hover:bg-white/15"
              title="Zoom in"
            >
              <AiOutlineZoomIn />
            </button>
            <button
              onClick={() => zoomBy(-0.15)}
              className="px-2 py-1 rounded-lg hover:bg-white/15"
              title="Zoom out"
            >
              <AiOutlineZoomOut />
            </button>

            <button
              onClick={() => setShowEmojiPicker(true)}
              className="px-3 py-1 rounded-lg hover:bg-white/15"
              title="Add emoji"
            >
              <FiSmile />
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Emoji Picker */}
      {showEmojiPicker && (
        <div className="fixed inset-0 z-[1010] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowEmojiPicker(false)}>
          <div className="bg-white rounded-2xl p-2 max-w-[720px] w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <EmojiPicker onEmojiClick={(e) => addEmoji(e)} />
          </div>
        </div>
      )}
    </div>
  );
}
