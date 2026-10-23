import React, { useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export function WaveBox({
  waveHistory = [],
  currentY = 0,
  isDark,
  isAudioPlaying = false,
  onToggleAudio
}) {
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

    // Centerline
    ctx.strokeStyle = isDark ? '#333333' : '#d0d0d0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (waveHistory.length > 1) {
      const centerY = h / 2;
      const maxSamples = 160;
      const step = w / maxSamples;

      ctx.beginPath();
      for (let i = 0; i < waveHistory.length; i++) {
        const xPos = w - (waveHistory.length - 1 - i) * step;
        const yPos = centerY + waveHistory[i] * 0.35;
        if (i === 0) ctx.moveTo(xPos, yPos);
        else ctx.lineTo(xPos, yPos);
      }
      ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Current cursor point
      const headY = centerY + currentY * 0.35;
      ctx.beginPath();
      ctx.arc(w - 3, headY, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = isDark ? '#ffffff' : '#000000';
      ctx.fill();
    }
  }, [waveHistory, currentY, isDark]);

  return (
    <Card className="flex-1 min-h-0 flex flex-col border-2">
      <CardHeader className="shrink-0 py-1.5 px-3">
        <CardTitle className="flex items-center justify-between w-full">
          <span>wave</span>

          {/* Sound Toggle Button */}
          <Button
            variant={isAudioPlaying ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleAudio}
            className="h-6 px-2 text-[10px] gap-1"
            title="Play / Mute the original sound of this drawing wave"
          >
            {isAudioPlaying ? (
              <>
                <Volume2 className="h-3 w-3 animate-pulse" /> Sound On
              </>
            ) : (
              <>
                <VolumeX className="h-3 w-3" /> Play Sound
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <div className="relative flex-1 min-h-0 w-full bg-background overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
      </div>
    </Card>
  );
}
