import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { evaluateEpicycles } from '@/lib/fourier';
import { audioEngine } from '@/lib/audio';
import {
  SHAPE_LIST,
  LINE_PRESETS,
  generateLinePoints,
  generatePresetLine,
  generateShapePoints
} from '@/lib/shapes';

const SNAP_RADIUS = 28;
const N_SAMPLES = 256;

export function MainCanvas({
  mode,
  onStartDraw,
  drawTool = 'pen', // 'pen' | 'line' | 'shape'
  activeShape = 'circle',
  onSelectShape,
  isDark,
  fourierData = [],
  rawDrawing = [],
  onDrawingChange,
  onSynthesize,
  onTipUpdate,
  onJointSnapped
}) {
  const canvasRef = useRef(null);

  // Animation playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [activeEpicycles, setActiveEpicycles] = useState(60);
  const [showCircles, setShowCircles] = useState(true);
  const [showArms, setShowArms] = useState(true);
  const [showTrace, setShowTrace] = useState(true);

  // Trace and drawing refs
  const isDrawingRef = useRef(false);
  const isSnappedRef = useRef(false);
  const dragStartRef = useRef(null);
  const dragCurrentRef = useRef(null);
  const timeRef = useRef(0);
  const tracePointsRef = useRef([]);

  // Sync epicycles bounds when fourierData changes
  useEffect(() => {
    if (fourierData && fourierData.length > 0) {
      setActiveEpicycles(prev => Math.min(prev, fourierData.length) || 60);
      tracePointsRef.current = [];
      timeRef.current = 0;
    }
  }, [fourierData]);

  // Pointer event coordinate translation
  const getPointerPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    return {
      x: e.clientX - rect.left - cx,
      y: e.clientY - rect.top - cy
    };
  }, []);

  // Snap end point to 45-degree increments when Shift key is held
  const applyAngleSnap = (start, end, shiftKey) => {
    if (!shiftKey) return end;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    return {
      x: start.x + dist * Math.cos(snappedAngle),
      y: start.y + dist * Math.sin(snappedAngle)
    };
  };

  // Pointer down: start fresh drawing (Pen, Line, or Shape)
  const handlePointerDown = (e) => {
    if (mode !== 'draw' && onStartDraw) {
      onStartDraw();
    }
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch (err) {}

    isDrawingRef.current = true;
    isSnappedRef.current = false;
    tracePointsRef.current = [];
    timeRef.current = 0;

    const pt = getPointerPos(e);
    dragStartRef.current = pt;
    dragCurrentRef.current = pt;

    if (drawTool === 'pen') {
      onDrawingChange([pt]);
    } else if (drawTool === 'line') {
      const pts = generateLinePoints(pt, pt);
      onDrawingChange(pts);
    } else if (drawTool === 'shape') {
      const pts = generateShapePoints(activeShape, pt, pt);
      onDrawingChange(pts);
    }
  };

  // Pointer move: record freehand OR dynamically preview dragged Line / Shape
  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    const rawPt = getPointerPos(e);

    if (drawTool === 'pen') {
      const pt = { ...rawPt };
      if (rawDrawing.length > 10) {
        const startPt = rawDrawing[0];
        const dist = Math.hypot(pt.x - startPt.x, pt.y - startPt.y);
        if (dist < SNAP_RADIUS) {
          isSnappedRef.current = true;
          pt.x = startPt.x;
          pt.y = startPt.y;
        } else {
          isSnappedRef.current = false;
        }
      }
      onDrawingChange([...rawDrawing, pt]);
    } else if (drawTool === 'line') {
      const startPt = dragStartRef.current || { x: 0, y: 0 };
      const endPt = applyAngleSnap(startPt, rawPt, e.shiftKey);
      dragCurrentRef.current = endPt;
      const pts = generateLinePoints(startPt, endPt);
      onDrawingChange(pts);
    } else if (drawTool === 'shape') {
      const startPt = dragStartRef.current || { x: 0, y: 0 };
      const endPt = applyAngleSnap(startPt, rawPt, e.shiftKey);
      dragCurrentRef.current = endPt;
      const pts = generateShapePoints(activeShape, startPt, endPt);
      onDrawingChange(pts);
    }
  };

  // Pointer up: finalize Pen, Line, or Shape with 0px joint gap and synthesize Fourier epicycles
  const handlePointerUp = (e) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    try {
      if (e?.pointerId) e.target.releasePointerCapture(e.pointerId);
    } catch (err) {}

    if (drawTool === 'pen') {
      if (rawDrawing.length < 5) return;
      const startPt = rawDrawing[0];
      const closed = [...rawDrawing, { x: startPt.x, y: startPt.y }];
      onDrawingChange(closed);

      if (isSnappedRef.current && onJointSnapped) {
        onJointSnapped();
      }
      onSynthesize(closed);
    } else if (drawTool === 'line') {
      const startPt = dragStartRef.current || { x: -120, y: 0 };
      const endPt = dragCurrentRef.current || { x: 120, y: 0 };
      const pts = generateLinePoints(startPt, endPt);
      dragStartRef.current = null;
      dragCurrentRef.current = null;
      onDrawingChange(pts);
      onSynthesize(pts);
    } else if (drawTool === 'shape') {
      const startPt = dragStartRef.current || { x: 0, y: 0 };
      const endPt = dragCurrentRef.current || { x: 0, y: 0 };
      const pts = generateShapePoints(activeShape, startPt, endPt);
      dragStartRef.current = null;
      dragCurrentRef.current = null;
      onDrawingChange(pts);
      onSynthesize(pts);
    }
  };

  // Quick 1-click stamp for centered Shape or Preset Line
  const handleQuickInsertShape = (shapeId) => {
    if (onSelectShape) onSelectShape(shapeId);
    const pts = generateShapePoints(shapeId, { x: 0, y: 0 }, { x: 0, y: 0 });
    onDrawingChange(pts);
    onSynthesize(pts);
  };

  const handleQuickInsertLine = (presetId) => {
    const pts = generatePresetLine(presetId);
    onDrawingChange(pts);
    onSynthesize(pts);
  };

  // Main rendering loop
  useEffect(() => {
    let animId;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;

      if (w > 0 && h > 0 && (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr))) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }

      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // Subtle architectural grid
      ctx.strokeStyle = isDark ? '#141414' : '#f0f0f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = cx % 40; x < w; x += 40) {
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
      }
      for (let y = cy % 40; y < h; y += 40) {
        ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
      ctx.stroke();

      // Coordinate axes
      ctx.strokeStyle = isDark ? '#262626' : '#e0e0e0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, cy); ctx.lineTo(w, cy);
      ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
      ctx.stroke();

      // --- Draw Mode Rendering ---
      if (mode === 'draw') {
        if (rawDrawing.length > 0) {
          ctx.save();
          ctx.translate(cx, cy);

          // User stroke / preview shape / preview line
          ctx.beginPath();
          ctx.moveTo(rawDrawing[0].x, rawDrawing[0].y);
          for (let i = 1; i < rawDrawing.length; i++) {
            ctx.lineTo(rawDrawing[i].x, rawDrawing[i].y);
          }
          ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();

          if (drawTool === 'pen') {
            // Start joint indicator
            const start = rawDrawing[0];
            ctx.beginPath();
            ctx.arc(start.x, start.y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = isDark ? '#ffffff' : '#000000';
            ctx.fill();

            // Magnetic snap halo ring
            ctx.beginPath();
            ctx.arc(start.x, start.y, SNAP_RADIUS, 0, 2 * Math.PI);
            ctx.strokeStyle = isSnappedRef.current
              ? (isDark ? '#ffffff' : '#000000')
              : (isDark ? '#666666' : '#999999');
            ctx.lineWidth = isSnappedRef.current ? 2.5 : 1;
            ctx.setLineDash([4, 4]);
            ctx.stroke();

            // Active drawing cursor tip
            const cur = rawDrawing[rawDrawing.length - 1];
            ctx.beginPath();
            ctx.arc(cur.x, cur.y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = isDark ? '#888888' : '#555555';
            ctx.fill();
          } else if (isDrawingRef.current && dragStartRef.current && dragCurrentRef.current) {
            // Live geometric dimension HUD for Line & Shape drag
            const s = dragStartRef.current;
            const c = dragCurrentRef.current;
            const dx = c.x - s.x;
            const dy = c.y - s.y;
            const dist = Math.hypot(dx, dy);
            const angleDeg = ((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(1);

            // Anchor & end points
            ctx.fillStyle = isDark ? '#ffffff' : '#000000';
            ctx.beginPath();
            ctx.arc(s.x, s.y, 5, 0, 2 * Math.PI);
            ctx.arc(c.x, c.y, 5, 0, 2 * Math.PI);
            ctx.fill();

            // Helper dashed guide line
            ctx.beginPath();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = isDark ? '#777777' : '#888888';
            ctx.lineWidth = 1;
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(c.x, c.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Dimension text badge
            const label =
              drawTool === 'line'
                ? `L: ${Math.round(dist)}px | ∠ ${angleDeg}°`
                : `${activeShape.toUpperCase()} | R: ${Math.round(dist)}px (${Math.round(Math.abs(dx))}×${Math.round(Math.abs(dy))})`;

            ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, monospace';
            const textWidth = ctx.measureText(label).width;
            const bx = c.x + 12;
            const by = c.y - 12;

            ctx.fillStyle = isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)';
            ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.roundRect(bx - 6, by - 14, textWidth + 12, 20, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isDark ? '#ffffff' : '#000000';
            ctx.fillText(label, bx, by);
          }

          ctx.restore();
        }
      }

      // --- Animation Mode Rendering ---
      else if (mode === 'anim' && fourierData && fourierData.length > 0) {
        if (isPlaying) {
          const dTheta = (2 * Math.PI) / (N_SAMPLES * 2);
          timeRef.current += dTheta * speed;
          if (timeRef.current >= 2 * Math.PI) {
            timeRef.current %= (2 * Math.PI);
          }
        }

        const { tip, joints } = evaluateEpicycles(fourierData, timeRef.current, activeEpicycles);

        // Modulate original drawing sound in real time with pen tip
        if (isPlaying && audioEngine.isPlaying) {
          audioEngine.modulateWithTip(tip);
        }

        // Notify parent to sync WaveBox and PendulumBox
        if (onTipUpdate) {
          onTipUpdate(tip, joints);
        }

        // Add to trace
        tracePointsRef.current.push({ x: tip.x, y: tip.y });
        if (tracePointsRef.current.length > N_SAMPLES * 2) {
          tracePointsRef.current.shift();
        }

        ctx.save();
        ctx.translate(cx, cy);

        // 1. Epicycle circles
        if (showCircles) {
          ctx.strokeStyle = isDark ? '#222222' : '#e5e5e5';
          ctx.lineWidth = 1;
          for (let i = 1; i < joints.length; i++) {
            const j = joints[i];
            if (j.radius > 1) {
              ctx.beginPath();
              ctx.arc(j.prevX, j.prevY, j.radius, 0, 2 * Math.PI);
              ctx.stroke();
            }
          }
        }

        // 2. Pendulum Arms
        if (showArms) {
          for (let i = 1; i < joints.length; i++) {
            const j = joints[i];
            ctx.beginPath();
            ctx.moveTo(j.prevX, j.prevY);
            ctx.lineTo(j.x, j.y);
            ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
            ctx.lineWidth = Math.max(1, 2.5 - (i / joints.length) * 1.5);
            ctx.stroke();

            // Bearing pivot
            if (i < 15 || i % 4 === 0) {
              ctx.beginPath();
              ctx.arc(j.x, j.y, 2, 0, 2 * Math.PI);
              ctx.fillStyle = isDark ? '#ffffff' : '#000000';
              ctx.fill();
            }
          }
        }

        // 3. Reconstructed trace line
        if (showTrace && tracePointsRef.current.length > 1) {
          const pts = tracePointsRef.current;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
          ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }

        // 4. Pen tip dot
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = isDark ? '#ffffff' : '#000000';
        ctx.fill();

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    mode,
    drawTool,
    activeShape,
    isDark,
    fourierData,
    rawDrawing,
    isPlaying,
    speed,
    activeEpicycles,
    showCircles,
    showArms,
    showTrace,
    onTipUpdate
  ]);

  return (
    <div className="relative w-full h-full border-2 border-border rounded-md bg-background overflow-hidden flex flex-col">
      
      {/* Floating Sub-Toolbar for Line or Shape Tools (zero external height impact) */}
      {drawTool === 'line' && (
        <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-wrap items-center justify-between gap-1.5 bg-card/95 backdrop-blur-sm border-2 border-border rounded-md px-2.5 py-1.5 shadow-md text-xs">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="font-bold uppercase bg-foreground text-background px-1.5 py-0.5 rounded text-[10px]">
              Line Tool
            </span>
            <span className="text-muted-foreground hidden md:inline">
              Drag on canvas to draw line (Hold Shift to snap angle) or quick add:
            </span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {LINE_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                onClick={() => handleQuickInsertLine(preset.id)}
                className="h-6 px-2 text-[10px] font-mono font-bold hover:bg-foreground hover:text-background"
              >
                + {preset.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {drawTool === 'shape' && (
        <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-wrap items-center justify-between gap-1.5 bg-card/95 backdrop-blur-sm border-2 border-border rounded-md px-2.5 py-1.5 shadow-md text-xs">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-bold font-mono uppercase bg-foreground text-background px-1.5 py-0.5 rounded text-[10px] mr-1">
              Shapes
            </span>
            {SHAPE_LIST.map((shape) => {
              const isSelected = activeShape === shape.id;
              return (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => {
                    if (onSelectShape) onSelectShape(shape.id);
                    if (mode === 'anim') {
                      handleQuickInsertShape(shape.id);
                    }
                  }}
                  onDoubleClick={() => handleQuickInsertShape(shape.id)}
                  className={`h-6 px-2 rounded text-[10px] font-mono font-bold border transition-colors ${
                    isSelected
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-foreground border-border hover:border-foreground'
                  }`}
                  title="Click to select & drag on canvas, or click Insert / Double-Click to animate immediately"
                >
                  {shape.label}
                </button>
              );
            })}
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={() => handleQuickInsertShape(activeShape)}
            className="h-6 px-2.5 text-[10px] font-mono font-bold gap-1 shrink-0"
            title="Immediately place and animate selected shape in center"
          >
            <Sparkles className="h-3 w-3" />
            Insert {activeShape}
          </Button>
        </div>
      )}

      {/* Canvas Wrapper with absolute positioning so canvas never pushes control bar off-screen */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 w-full h-full block cursor-crosshair touch-none"
        />
      </div>

      {/* Docked Minimalist Player Controls (always visible, shrink-0) */}
      {mode === 'anim' && (
        <div className="h-10 shrink-0 bg-card border-t border-border flex items-center px-3 gap-3 text-xs select-none overflow-x-auto">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => {
              timeRef.current = 0;
              tracePointsRef.current = [];
            }}
            title="Reset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>

          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground shrink-0">
            <span>Epicycles: <strong className="text-foreground">{activeEpicycles}</strong></span>
            <input
              type="range"
              min="1"
              max={fourierData.length || 150}
              value={activeEpicycles}
              onChange={(e) => setActiveEpicycles(parseInt(e.target.value, 10))}
              className="w-20 h-1 accent-foreground cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground shrink-0">
            <span>Speed: <strong className="text-foreground">{speed.toFixed(1)}x</strong></span>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-16 h-1 accent-foreground cursor-pointer"
            />
          </div>

          <div className="ml-auto flex items-center gap-3 font-mono text-[11px] text-muted-foreground shrink-0">
            <label className="flex items-center gap-1 cursor-pointer hover:text-foreground">
              <input
                type="checkbox"
                checked={showCircles}
                onChange={(e) => setShowCircles(e.target.checked)}
                className="accent-foreground"
              />
              circles
            </label>
            <label className="flex items-center gap-1 cursor-pointer hover:text-foreground">
              <input
                type="checkbox"
                checked={showArms}
                onChange={(e) => setShowArms(e.target.checked)}
                className="accent-foreground"
              />
              arms
            </label>
            <label className="flex items-center gap-1 cursor-pointer hover:text-foreground">
              <input
                type="checkbox"
                checked={showTrace}
                onChange={(e) => setShowTrace(e.target.checked)}
                className="accent-foreground"
              />
              trace
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
