/**
 * Fourier Mathematics & Signal Processing Engine
 * Handles Complex numbers, curve resampling, Discrete Fourier Transform (DFT),
 * and inverse trajectory reconstruction.
 */

class Complex {
  constructor(re = 0, im = 0) {
    this.re = re;
    this.im = im;
  }

  add(other) {
    return new Complex(this.re + other.re, this.im + other.im);
  }

  sub(other) {
    return new Complex(this.re - other.re, this.im - other.im);
  }

  mul(other) {
    return new Complex(
      this.re * other.re - this.im * other.im,
      this.re * other.im + this.im * other.re
    );
  }

  scale(s) {
    return new Complex(this.re * s, this.im * s);
  }

  mag() {
    return Math.hypot(this.re, this.im);
  }

  phase() {
    return Math.atan2(this.im, this.re);
  }
}

/**
 * Resamples a raw sequence of points into N equidistant points along the path length.
 * Ensures the loop is closed smoothly with zero gap.
 */
function resampleCurve(rawPoints, targetCount = 256) {
  if (!rawPoints || rawPoints.length < 2) return [];

  // Copy and strictly ensure closed loop
  const pts = rawPoints.map(p => ({ x: p.x, y: p.y }));
  const first = pts[0];
  const last = pts[pts.length - 1];
  const distToFirst = Math.hypot(last.x - first.x, last.y - first.y);
  
  if (distToFirst > 1e-4) {
    pts.push({ x: first.x, y: first.y });
  }

  // Calculate cumulative distances
  const dists = [0];
  let totalLength = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    totalLength += d;
    dists.push(totalLength);
  }

  if (totalLength === 0) {
    return Array.from({ length: targetCount }, () => ({ x: pts[0].x, y: pts[0].y }));
  }

  // Equidistant step size
  const step = totalLength / targetCount;
  const resampled = [];
  let curIdx = 0;

  for (let i = 0; i < targetCount; i++) {
    const targetDist = i * step;

    while (curIdx < dists.length - 1 && dists[curIdx + 1] < targetDist) {
      curIdx++;
    }

    if (curIdx >= dists.length - 1) {
      resampled.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y });
      continue;
    }

    const segStartDist = dists[curIdx];
    const segEndDist = dists[curIdx + 1];
    const segLen = segEndDist - segStartDist;
    const t = segLen > 0 ? (targetDist - segStartDist) / segLen : 0;

    const x = pts[curIdx].x + t * (pts[curIdx + 1].x - pts[curIdx].x);
    const y = pts[curIdx].y + t * (pts[curIdx + 1].y - pts[curIdx].y);
    resampled.push({ x, y });
  }

  return resampled;
}

/**
 * Computes the 2D Complex Discrete Fourier Transform (DFT).
 * Given N samples z[n] = x[n] + i*y[n], computes coefficients c_k:
 * c_k = (1/N) * sum_{n=0}^{N-1} z[n] * exp(-i * 2 * pi * k * n / N)
 * for k in [-N/2, N/2 - 1]
 */
function computeDFT(points) {
  const N = points.length;
  const fourier = [];
  const halfN = Math.floor(N / 2);

  for (let k = -halfN; k < halfN; k++) {
    let re = 0;
    let im = 0;

    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // (x + i*y) * (cosA - i*sinA)
      re += points[n].x * cosA + points[n].y * sinA;
      im += points[n].y * cosA - points[n].x * sinA;
    }

    re /= N;
    im /= N;

    const radius = Math.hypot(re, im);
    const phase = Math.atan2(im, re);

    fourier.push({
      freq: k,
      re,
      im,
      radius,
      phase
    });
  }

  // Sort epicycles descending by radius (amplitude)
  // This produces the classic hierarchical compound pendulum / epicycle chain
  fourier.sort((a, b) => b.radius - a.radius);

  return fourier;
}

/**
 * Evaluates the epicycle chain position at time t (where t runs from 0 to 2*PI).
 * Returns array of joint positions from base to tip.
 */
function evaluateEpicycles(fourier, t, numCircles = fourier.length) {
  let x = 0;
  let y = 0;
  const joints = [{ prevX: 0, prevY: 0, x: 0, y: 0, radius: 0, freq: 0, angle: 0 }];

  const count = Math.min(numCircles, fourier.length);

  for (let i = 0; i < count; i++) {
    const prevX = x;
    const prevY = y;
    const { freq, radius, phase } = fourier[i];

    const angle = freq * t + phase;
    x += radius * Math.cos(angle);
    y += radius * Math.sin(angle);

    joints.push({
      prevX,
      prevY,
      x,
      y,
      radius,
      freq,
      angle
    });
  }

  return {
    tip: { x, y },
    joints
  };
}

// Global exports for both browser and Node environments
if (typeof window !== 'undefined') {
  window.Complex = Complex;
  window.resampleCurve = resampleCurve;
  window.computeDFT = computeDFT;
  window.evaluateEpicycles = evaluateEpicycles;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Complex, resampleCurve, computeDFT, evaluateEpicycles };
}
