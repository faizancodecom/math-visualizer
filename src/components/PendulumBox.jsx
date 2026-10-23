import React, { useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export function PendulumBox({ joints = [], tip = { x: 0, y: 0 }, isDark, activeEpicycles = 60 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (w > 0 && h > 0 && (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr))) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Subtle grid
    ctx.strokeStyle = isDark ? '#1a1a1a' : '#f0f0f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < w; x += 30) {
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += 30) {
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Center axes
    ctx.strokeStyle = isDark ? '#2e2e2e' : '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.stroke();

    if (!joints || joints.length === 0) return;

    ctx.save();
    ctx.translate(w / 2, h / 2);

    // Zoom scale to fit pendulum arms inside box
    const scale = 0.65;
    ctx.scale(scale, scale);

    const count = Math.min(activeEpicycles, joints.length);
    for (let i = 1; i < count; i++) {
      const j = joints[i];

      // Circular epicycle orbit
      if (j.radius > 1) {
        ctx.beginPath();
        ctx.arc(j.prevX, j.prevY, j.radius, 0, 2 * Math.PI);
        ctx.strokeStyle = isDark ? '#222222' : '#e2e2e2';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Mechanical pendulum arm rod
      ctx.beginPath();
      ctx.moveTo(j.prevX, j.prevY);
      ctx.lineTo(j.x, j.y);
      ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
      ctx.lineWidth = Math.max(1.2, 3 - i * 0.08);
      ctx.stroke();

      // Bearing pivot
      ctx.beginPath();
      ctx.arc(j.x, j.y, 2.8, 0, 2 * Math.PI);
      ctx.fillStyle = isDark ? '#ffffff' : '#000000';
      ctx.fill();
    }

    // Pendulum bob / tip
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 5.5, 0, 2 * Math.PI);
    ctx.fillStyle = isDark ? '#ffffff' : '#000000';
    ctx.fill();

    ctx.restore();
  }, [joints, tip, isDark, activeEpicycles]);

  return (
    <Card className="flex-1 min-h-0 flex flex-col border-2">
      <CardHeader className="shrink-0 py-1.5 px-3">
        <CardTitle>perpedilum anaimtion</CardTitle>
      </CardHeader>
      <div className="relative flex-1 min-h-0 w-full bg-background overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
      </div>
    </Card>
  );
}
