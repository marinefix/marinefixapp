import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Circle,
  Eraser,
  RotateCw,
  SquarePen,
  Undo2,
  Redo2,
  Minus,
  Type,
  Hash,
  Check,
  X,
} from "lucide-react";

type Tool = "draw" | "line" | "arrow" | "circle" | "text" | "number" | "eraser";

type Props = {
  file: File;
  onDone: (file: File) => void;
  onSkip: () => void;
};

type Point = { x: number; y: number };

export function PhotoAnnotationEditor({ file, onDone, onSkip }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>("draw");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [future, setFuture] = useState<ImageData[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<Point | null>(null);
  const [selectedNumber, setSelectedNumber] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      imageRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      setHistory([]);
      setFuture([]);
      setSelectedNumber(1);
      setRotation(0);
    };
    img.src = url;
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  function snapshot() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setHistory((prev) => [...prev.slice(-19), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    setFuture([]);
  }

  function undo() {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const previous = history[history.length - 1];
    setFuture((prev) => [current, ...prev.slice(0, 19)]);
    setHistory((prev) => prev.slice(0, -1));
    ctx.putImageData(previous, 0, 0);
  }

  function redo() {
    const canvas = canvasRef.current;
    if (!canvas || future.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const next = future[0];
    setHistory((prev) => [...prev.slice(-19), current]);
    setFuture((prev) => prev.slice(1));
    ctx.putImageData(next, 0, 0);
  }

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function begin(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const p = getPoint(event);
    canvas.setPointerCapture(event.pointerId);

    if (tool === "text") {
      snapshot();
      const text = window.prompt("Enter text to place on the photo:");
      if (!text) return;
      ctx.font = `${Math.max(18, strokeWidth * 7)}px Arial`;
      ctx.fillStyle = "#ff2020";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.strokeText(text, p.x, p.y);
      ctx.fillText(text, p.x, p.y);
      return;
    }

    if (tool === "number") {
      snapshot();
      const radius = Math.max(18, strokeWidth * 5);
      ctx.fillStyle = "#e11d48";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${radius}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(selectedNumber), p.x, p.y + 1);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
      return;
    }

    snapshot();
    setDrawing(true);
    setStart(p);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !start) return;
    const p = getPoint(event);

    ctx.strokeStyle = "#ff2020";
    ctx.fillStyle = "#ff2020";
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "draw" || tool === "eraser") {
      if (tool === "eraser") {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
      }
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      if (tool === "eraser") ctx.restore();
      return;
    }

    // Restore the snapshot and preview the current shape.
    const base = history[history.length - 1];
    if (base) ctx.putImageData(base, 0, 0);
    ctx.strokeStyle = "#ff2020";
    ctx.lineWidth = strokeWidth;

    if (tool === "line") drawLine(ctx, start, p);
    if (tool === "arrow") drawArrow(ctx, start, p);
    if (tool === "circle") {
      const rx = Math.abs(p.x - start.x);
      const ry = Math.abs(p.y - start.y);
      ctx.beginPath();
      ctx.ellipse((p.x + start.x) / 2, (p.y + start.y) / 2, rx / 2, ry / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function end(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !start) return;
    const p = getPoint(event);
    const base = history[history.length - 1];
    if (base && tool !== "draw" && tool !== "eraser") ctx.putImageData(base, 0, 0);
    ctx.strokeStyle = "#ff2020";
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";

    if (tool === "line") drawLine(ctx, start, p);
    if (tool === "arrow") drawArrow(ctx, start, p);
    if (tool === "circle") {
      const rx = Math.abs(p.x - start.x);
      const ry = Math.abs(p.y - start.y);
      ctx.beginPath();
      ctx.ellipse((p.x + start.x) / 2, (p.y + start.y) / 2, rx / 2, ry / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    setDrawing(false);
    setStart(null);
  }

  function rotate() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    snapshot();
    const old = document.createElement("canvas");
    old.width = canvas.width;
    old.height = canvas.height;
    old.getContext("2d")!.drawImage(canvas, 0, 0);
    canvas.width = old.height;
    canvas.height = old.width;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(old, -old.width / 2, -old.height / 2);
    ctx.restore();
    setRotation((r) => (r + 90) % 360);
  }

  function clearAll() {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    snapshot();
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const name = file.name.replace(/\.[^/.]+$/, "") + "-annotated.webp";
      onDone(new File([blob], name, { type: "image/webp", lastModified: Date.now() }));
    }, "image/webp", 0.9);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-marine-border bg-marine-dark/70 p-2">
        <ToolButton active={tool === "draw"} title="Draw" onClick={() => setTool("draw")}><SquarePen className="h-4 w-4" /></ToolButton>
        <ToolButton active={tool === "line"} title="Line" onClick={() => setTool("line")}><Minus className="h-4 w-4" /></ToolButton>
        <ToolButton active={tool === "arrow"} title="Arrow" onClick={() => setTool("arrow")}><ArrowRight className="h-4 w-4" /></ToolButton>
        <ToolButton active={tool === "circle"} title="Circle" onClick={() => setTool("circle")}><Circle className="h-4 w-4" /></ToolButton>
        <ToolButton active={tool === "text"} title="Text" onClick={() => setTool("text")}><Type className="h-4 w-4" /></ToolButton>
        <ToolButton active={tool === "number"} title="Number marker" onClick={() => setTool("number")}><Hash className="h-4 w-4" /></ToolButton>
        {tool === "number" && (
          <label className="flex items-center gap-1.5 rounded-lg border border-marine-border bg-marine-dark px-2 py-1">
            <span className="text-[11px] text-marine-muted">Number</span>
            <select
              value={selectedNumber}
              onChange={(e) => setSelectedNumber(Number(e.target.value))}
              className="rounded-md bg-marine-base px-1.5 py-1 text-xs font-semibold text-marine-text outline-none"
              title="Choose the number to place on the photo"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((number) => (
                <option key={number} value={number}>
                  {number}
                </option>
              ))}
            </select>
          </label>
        )}
        <ToolButton active={tool === "eraser"} title="Eraser" onClick={() => setTool("eraser")}><Eraser className="h-4 w-4" /></ToolButton>
        <div className="mx-1 h-6 w-px bg-marine-border" />
        <button type="button" onClick={undo} disabled={!history.length} className="p-2 rounded-lg text-marine-muted hover:text-marine-text disabled:opacity-30" title="Undo"><Undo2 className="h-4 w-4" /></button>
        <button type="button" onClick={redo} disabled={!future.length} className="p-2 rounded-lg text-marine-muted hover:text-marine-text disabled:opacity-30" title="Redo"><Redo2 className="h-4 w-4" /></button>
        <button type="button" onClick={rotate} className="p-2 rounded-lg text-marine-muted hover:text-marine-text" title="Rotate"><RotateCw className="h-4 w-4" /></button>
        <button type="button" onClick={clearAll} className="p-2 rounded-lg text-marine-muted hover:text-marine-error" title="Clear annotations"><X className="h-4 w-4" /></button>
        <label className="ml-auto flex items-center gap-2 text-xs text-marine-muted">Width
          <input type="range" min="2" max="12" value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} />
        </label>
      </div>

      <div className="rounded-xl border border-marine-border bg-black/50 p-2 overflow-auto max-h-[65vh] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto touch-none cursor-crosshair"
          onPointerDown={begin}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={onSkip} className="inline-flex items-center gap-2 rounded-lg border border-marine-border px-4 py-2 text-sm text-marine-muted hover:text-marine-text">
          <X className="h-4 w-4" /> Skip / Keep Original
        </button>
        <button type="button" onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-marine-accent px-4 py-2 text-sm font-bold text-marine-base hover:bg-marine-accentHover">
          <Check className="h-4 w-4" /> Save & Continue
        </button>
      </div>
      <p className="text-[11px] text-marine-muted">
        {tool === "number" ? `Selected number: ${selectedNumber} · Choose any number from the dropdown, then click anywhere on the photo.` : ""}
        {tool !== "number" && rotation ? `Rotated ${rotation}°` : ""}
      </p>
    </div>
  );
}

function ToolButton({ active, title, onClick, children }: { active: boolean; title: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" title={title} onClick={onClick} className={`p-2 rounded-lg transition ${active ? "bg-marine-accent text-marine-base" : "text-marine-muted hover:text-marine-text hover:bg-marine-hover"}`}>{children}</button>;
}

function drawLine(ctx: CanvasRenderingContext2D, a: Point, b: Point) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function drawArrow(ctx: CanvasRenderingContext2D, a: Point, b: Point) {
  drawLine(ctx, a, b);
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const size = Math.max(12, ctx.lineWidth * 4);
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - size * Math.cos(angle - Math.PI / 6), b.y - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(b.x - size * Math.cos(angle + Math.PI / 6), b.y - size * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
}
