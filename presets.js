/**
 * Built-in Preset Curves for the Math Visualizer
 * All curves are generated as closed parametric paths centered at (0, 0).
 */

const PRESETS = {
  heart: {
    name: "Heart Curve",
    generate: (cx = 0, cy = 0, scale = 11) => {
      const pts = [];
      const N = 240;
      for (let i = 0; i < N; i++) {
        const t = (2 * Math.PI * i) / N;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        pts.push({ x: cx + x * scale, y: cy + y * scale });
      }
      return pts;
    }
  },

  star: {
    name: "Five-Pointed Star",
    generate: (cx = 0, cy = 0, scale = 150) => {
      const pts = [];
      const points = 5;
      const innerRadius = scale * 0.42;
      const outerRadius = scale;
      const totalSamples = 200;

      for (let i = 0; i < totalSamples; i++) {
        const t = (i / totalSamples) * (2 * Math.PI);
        const segment = (t / (2 * Math.PI)) * (points * 2);
        const segIdx = Math.floor(segment);
        const frac = segment - segIdx;

        const a1 = (segIdx * Math.PI) / points - Math.PI / 2;
        const a2 = ((segIdx + 1) * Math.PI) / points - Math.PI / 2;
        const r1 = segIdx % 2 === 0 ? outerRadius : innerRadius;
        const r2 = (segIdx + 1) % 2 === 0 ? outerRadius : innerRadius;

        const p1x = r1 * Math.cos(a1);
        const p1y = r1 * Math.sin(a1);
        const p2x = r2 * Math.cos(a2);
        const p2y = r2 * Math.sin(a2);

        pts.push({
          x: cx + p1x + frac * (p2x - p1x),
          y: cy + p1y + frac * (p2y - p1y)
        });
      }
      return pts;
    }
  },

  trefoil: {
    name: "Trefoil Knot",
    generate: (cx = 0, cy = 0, scale = 55) => {
      const pts = [];
      const N = 260;
      for (let i = 0; i < N; i++) {
        const t = (2 * Math.PI * i) / N;
        const r = 2 + Math.cos(3 * t);
        const x = r * Math.cos(2 * t) * scale;
        const y = r * Math.sin(2 * t) * scale;
        pts.push({ x: cx + x, y: cy + y });
      }
      return pts;
    }
  },

  infinity: {
    name: "Lemniscate (Infinity)",
    generate: (cx = 0, cy = 0, scale = 180) => {
      const pts = [];
      const N = 240;
      for (let i = 0; i < N; i++) {
        const t = (2 * Math.PI * i) / N;
        const denom = 1 + Math.sin(t) * Math.sin(t);
        const x = (scale * Math.cos(t)) / denom;
        const y = (scale * Math.sin(t) * Math.cos(t)) / denom;
        pts.push({ x: cx + x, y: cy + y * 1.5 });
      }
      return pts;
    }
  },

  fourier_pi: {
    name: "Greek Pi Symbol (π)",
    generate: (cx = 0, cy = 0, scale = 1.3) => {
      const raw = [
        [-90, -70], [90, -70], [95, -60], [80, -45], [45, -45],
        [45, 60], [60, 68], [65, 80], [35, 80], [25, -45],
        [-25, -45], [-35, 65], [-45, 80], [-70, 75], [-60, 60],
        [-45, -45], [-80, -45], [-95, -55]
      ];
      const pts = [];
      const samplesPerSeg = 15;
      for (let i = 0; i < raw.length; i++) {
        const p1 = raw[i];
        const p2 = raw[(i + 1) % raw.length];
        for (let s = 0; s < samplesPerSeg; s++) {
          const u = s / samplesPerSeg;
          pts.push({
            x: cx + (p1[0] + u * (p2[0] - p1[0])) * scale,
            y: cy + (p1[1] + u * (p2[1] - p1[1])) * scale
          });
        }
      }
      return pts;
    }
  },

  butterfly: {
    name: "Butterfly Curve",
    generate: (cx = 0, cy = 0, scale = 40) => {
      const pts = [];
      const N = 300;
      for (let i = 0; i < N; i++) {
        const t = (2 * Math.PI * i) / N;
        const factor = Math.exp(Math.cos(t)) - 2 * Math.cos(4 * t) - Math.pow(Math.sin(t / 12), 5);
        const x = Math.sin(t) * factor * scale;
        const y = -Math.cos(t) * factor * scale;
        pts.push({ x: cx + x, y: cy + y });
      }
      return pts;
    }
  }
};

if (typeof window !== 'undefined') {
  window.PRESETS = PRESETS;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRESETS };
}
