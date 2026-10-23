import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'drawings.json');

// Middleware
app.use(express.json({ limit: '10mb' }));

// Enable CORS for Vite dev server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static production build if dist exists
const DIST_DIR = path.join(__dirname, 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
}

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_DRAWINGS = [
  {
    id: 'preset-heart',
    name: 'Heart Curve',
    createdAt: new Date().toISOString(),
    isPreset: true
  },
  {
    id: 'preset-star',
    name: 'Five-Point Star',
    createdAt: new Date().toISOString(),
    isPreset: true
  },
  {
    id: 'preset-infinity',
    name: 'Infinity Loop',
    createdAt: new Date().toISOString(),
    isPreset: true
  }
];

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DRAWINGS, null, 2));
}

function readDrawings() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return DEFAULT_DRAWINGS;
  }
}

function writeDrawings(drawings) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(drawings, null, 2));
}

// --- API Endpoints ---
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    version: '2.0.0-react',
    uptime: process.uptime()
  });
});

app.post('/api/fourier', (req, res) => {
  const { points, targetCount = 256 } = req.body;
  if (!points || !Array.isArray(points) || points.length < 2) {
    return res.status(400).json({ error: 'Valid points array required' });
  }

  const N = targetCount;
  const pts = points.map(p => ({ x: p.x, y: p.y }));
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (Math.hypot(last.x - first.x, last.y - first.y) > 0.001) {
    pts.push({ x: first.x, y: first.y });
  }

  const dists = [0];
  let totalLength = 0;
  for (let i = 1; i < pts.length; i++) {
    totalLength += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    dists.push(totalLength);
  }

  const step = totalLength / N;
  const resampled = [];
  let curIdx = 0;

  for (let i = 0; i < N; i++) {
    const targetDist = i * step;
    while (curIdx < dists.length - 1 && dists[curIdx + 1] < targetDist) {
      curIdx++;
    }
    if (curIdx >= dists.length - 1) {
      resampled.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y });
      continue;
    }
    const sDist = dists[curIdx];
    const eDist = dists[curIdx + 1];
    const t = (eDist - sDist) > 0 ? (targetDist - sDist) / (eDist - sDist) : 0;
    resampled.push({
      x: pts[curIdx].x + t * (pts[curIdx + 1].x - pts[curIdx].x),
      y: pts[curIdx].y + t * (pts[curIdx + 1].y - pts[curIdx].y)
    });
  }

  const halfN = Math.floor(N / 2);
  const fourier = [];

  for (let k = -halfN; k < halfN; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      re += resampled[n].x * cosA + resampled[n].y * sinA;
      im += resampled[n].y * cosA - resampled[n].x * sinA;
    }
    re /= N;
    im /= N;
    fourier.push({
      freq: k,
      re,
      im,
      radius: Math.hypot(re, im),
      phase: Math.atan2(im, re)
    });
  }

  fourier.sort((a, b) => b.radius - a.radius);

  const topTerms = fourier.slice(0, 4);
  const eqParts = topTerms.map(term => {
    const r = term.radius.toFixed(1);
    const w = term.freq;
    const phi = (term.phase >= 0 ? '+' : '') + term.phase.toFixed(2);
    if (w === 0) return `${r}`;
    const freqStr = Math.abs(w) === 1 ? (w === -1 ? '-t' : 't') : `${w}t`;
    return `${r} e^{i(${freqStr} ${phi})}`;
  });

  const latexFormula = `z(t) \\approx ${eqParts.join(' + ')} + \\dots`;

  res.json({
    fourier,
    resampled,
    latexFormula,
    totalEnergy: fourier.reduce((sum, f) => sum + f.radius * f.radius, 0)
  });
});

app.get('/api/drawings', (req, res) => {
  res.json(readDrawings());
});

app.post('/api/drawings', (req, res) => {
  const { name = 'Custom Shape', points, fourierSummary } = req.body;
  if (!points || !Array.isArray(points)) {
    return res.status(400).json({ error: 'Points array required' });
  }

  const drawings = readDrawings();
  const newDrawing = {
    id: 'drawing-' + Date.now(),
    name: name.trim() || 'Untitled Drawing',
    createdAt: new Date().toISOString(),
    points,
    fourierSummary
  };

  drawings.unshift(newDrawing);
  writeDrawings(drawings);
  res.status(201).json(newDrawing);
});

app.delete('/api/drawings/:id', (req, res) => {
  const { id } = req.params;
  let drawings = readDrawings();
  drawings = drawings.filter(d => d.id !== id);
  writeDrawings(drawings);
  res.json({ success: true, id });
});

// Fallback for SPA routing if dist exists
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

app.listen(PORT, () => {
  console.log(`HarmonicGraph Backend Server running on http://localhost:${PORT}`);
});
