/**
 * HarmonicGraph Application Controller
 * Full-stack Black & White Fourier Epicycle, Wave & Pendulum Visualizer
 */

(function () {
  'use strict';

  // --- State ---
  const STATE = {
    mode: 'draw', // 'draw' | 'anim'
    theme: 'dark', // 'dark' | 'light'
    
    // Geometry & Fourier
    rawDrawing: [],
    resampledPoints: [],
    fourierData: [],
    tracePoints: [],
    isDrawing: false,
    isLoopSnapped: false,

    // Animation
    isPlaying: true,
    time: 0,
    speed: 1.0,
    activeEpicycles: 60,

    // Toggles
    showCircles: true,
    showArms: true,
    showTrace: true,

    // Wave history
    waveHistoryY: [],
    waveHistoryX: [],
    maxWaveHistory: 160
  };

  const SNAP_RADIUS = 28;
  const N_SAMPLES = 256;

  // --- DOM Elements ---
  const htmlEl = document.documentElement;
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const themeLabel = document.getElementById('themeLabel');

  // Canvases
  const mainCanvas = document.getElementById('mainCanvas');
  const mainCtx = mainCanvas.getContext('2d');

  const waveCanvas = document.getElementById('waveCanvas');
  const waveCtx = waveCanvas.getContext('2d');

  const pendulumCanvas = document.getElementById('pendulumCanvas');
  const pendulumCtx = pendulumCanvas.getContext('2d');

  // Tools & Tabs
  const toolClearBtn = document.getElementById('toolClearBtn');
  const toolPenBtn = document.getElementById('toolPenBtn');
  const tabDrawBtn = document.getElementById('tabDrawBtn');
  const tabAnimationBtn = document.getElementById('tabAnimationBtn');
  const jointStatusBadge = document.getElementById('jointStatusBadge');
  const jointConnectToast = document.getElementById('jointConnectToast');
  const btnAutoAnimate = document.getElementById('btnAutoAnimate');

  // Animation Controls
  const animControlsBar = document.getElementById('animControlsBar');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const playPauseIcon = document.getElementById('playPauseIcon');
  const resetBtn = document.getElementById('resetBtn');
  const epicyclesSlider = document.getElementById('epicyclesSlider');
  const epicyclesVal = document.getElementById('epicyclesVal');
  const speedSlider = document.getElementById('speedSlider');
  const speedVal = document.getElementById('speedVal');
  const chkCircles = document.getElementById('chkCircles');
  const chkArms = document.getElementById('chkArms');
  const chkTrace = document.getElementById('chkTrace');

  // Equation containers
  const mathGeneralEq = document.getElementById('mathGeneralEq');
  const mathParametricEq = document.getElementById('mathParametricEq');
  const mathNumericalEq = document.getElementById('mathNumericalEq');

  // Presets & Full-stack Library
  const presetSelect = document.getElementById('presetSelect');
  const saveDrawingBtn = document.getElementById('saveDrawingBtn');
  const loadDrawingsBtn = document.getElementById('loadDrawingsBtn');
  const drawingsModal = document.getElementById('drawingsModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const drawingsList = document.getElementById('drawingsList');

  // Canvas Viewport Coordinates
  let mainW = 0, mainH = 0, mainCx = 0, mainCy = 0;
  let waveW = 0, waveH = 0;
  let pendW = 0, pendH = 0, pendCx = 0, pendCy = 0;

  // --- Theme Management ---
  function applyTheme(theme) {
    STATE.theme = theme;
    htmlEl.setAttribute('data-theme', theme);
    localStorage.setItem('math_viz_theme', theme);

    if (theme === 'dark') {
      themeIcon.textContent = '☀️';
      themeLabel.textContent = 'Light';
    } else {
      themeIcon.textContent = '🌙';
      themeLabel.textContent = 'Dark';
    }
  }

  themeToggleBtn.addEventListener('click', () => {
    applyTheme(STATE.theme === 'dark' ? 'light' : 'dark');
  });

  // Get current CSS ink color helper
  function getInkColor(type = 'primary') {
    const isDark = STATE.theme === 'dark';
    if (type === 'primary') return isDark ? '#ffffff' : '#000000';
    if (type === 'secondary') return isDark ? '#888888' : '#666666';
    if (type === 'faint') return isDark ? '#222222' : '#e5e5e5';
    if (type === 'highlight') return isDark ? '#ffffff' : '#000000';
    return isDark ? '#ffffff' : '#000000';
  }

  // --- Canvas Sizing with DPR ---
  function resizeAllCanvases() {
    const dpr = window.devicePixelRatio || 1;

    // Main Canvas
    const rMain = mainCanvas.parentElement.getBoundingClientRect();
    mainW = rMain.width;
    mainH = rMain.height - (STATE.mode === 'anim' ? 48 : 0);
    mainCx = mainW / 2;
    mainCy = mainH / 2;
    mainCanvas.width = mainW * dpr;
    mainCanvas.height = mainH * dpr;
    mainCtx.resetTransform();
    mainCtx.scale(dpr, dpr);

    // Wave Canvas
    const rWave = waveCanvas.parentElement.getBoundingClientRect();
    waveW = rWave.width;
    waveH = rWave.height;
    waveCanvas.width = waveW * dpr;
    waveCanvas.height = waveH * dpr;
    waveCtx.resetTransform();
    waveCtx.scale(dpr, dpr);

    // Pendulum Canvas
    const rPend = pendulumCanvas.parentElement.getBoundingClientRect();
    pendW = rPend.width;
    pendH = rPend.height;
    pendCx = pendW / 2;
    pendCy = pendH / 2;
    pendulumCanvas.width = pendW * dpr;
    pendulumCanvas.height = pendH * dpr;
    pendulumCtx.resetTransform();
    pendulumCtx.scale(dpr, dpr);
  }

  window.addEventListener('resize', resizeAllCanvases);

  // --- KaTeX Mathematical Formatting ---
  function renderLatex(element, texString) {
    if (window.katex) {
      try {
        window.katex.render(texString, element, { throwOnError: false, displayMode: true });
        return;
      } catch (e) {}
    }
    element.textContent = texString;
  }

  function initStaticEquations() {
    renderLatex(mathGeneralEq, `z(t) = \\sum_{n=-N/2}^{N/2-1} c_n e^{i n \\omega_0 t}`);
    renderLatex(mathParametricEq, `\\begin{aligned} x(t) &= \\sum R_k \\cos(k \\omega t + \\phi_k) \\\\ y(t) &= \\sum R_k \\sin(k \\omega t + \\phi_k) \\end{aligned}`);
  }

  function updateDynamicEquations() {
    if (!STATE.fourierData || STATE.fourierData.length === 0) {
      mathNumericalEq.innerHTML = '<em>Draw a closed loop to generate equation</em>';
      return;
    }

    const topTerms = STATE.fourierData.slice(0, 4);
    const eqParts = topTerms.map(term => {
      const r = term.radius.toFixed(1);
      const w = term.freq;
      const phi = (term.phase >= 0 ? '+' : '') + term.phase.toFixed(2);
      if (w === 0) return `${r}`;
      const freqStr = Math.abs(w) === 1 ? (w === -1 ? '-t' : 't') : `${w}t`;
      return `${r} e^{i(${freqStr} ${phi})}`;
    });

    renderLatex(mathNumericalEq, `z(t) \\approx ${eqParts.join(' + ')} + \\dots`);
  }

  // --- Synthesis & DFT Processing ---
  function synthesizeCurve(points) {
    if (!points || points.length < 3) return;

    // Ensure loop is strictly closed with zero gap between joints
    const pts = points.map(p => ({ x: p.x, y: p.y }));
    const first = pts[0];
    const last = pts[pts.length - 1];
    const gap = Math.hypot(last.x - first.x, last.y - first.y);
    if (gap > 0.001) {
      pts.push({ x: first.x, y: first.y });
    }

    // Resample equidistant points
    STATE.resampledPoints = window.resampleCurve(pts, N_SAMPLES);

    // Compute Discrete Fourier Transform
    STATE.fourierData = window.computeDFT(STATE.resampledPoints);

    // Configure epicycles slider
    const maxEpicycles = STATE.fourierData.length;
    epicyclesSlider.max = maxEpicycles;
    STATE.activeEpicycles = Math.min(60, maxEpicycles);
    epicyclesSlider.value = STATE.activeEpicycles;
    epicyclesVal.textContent = STATE.activeEpicycles;

    // Reset trajectory & buffers
    STATE.tracePoints = [];
    STATE.time = 0;
    STATE.waveHistoryY = [];
    STATE.waveHistoryX = [];

    // Switch to Animation tab
    setMode('anim');

    // Update equations
    updateDynamicEquations();
  }

  // --- Mode Switching ---
  function setMode(mode) {
    STATE.mode = mode;
    if (mode === 'draw') {
      tabDrawBtn.classList.add('active');
      tabAnimationBtn.classList.remove('active');
      toolPenBtn.classList.add('active');
      animControlsBar.style.display = 'none';
      jointStatusBadge.textContent = 'Draw & snap start to close joint';
      jointConnectToast.style.display = 'none';
    } else {
      tabDrawBtn.classList.remove('active');
      tabAnimationBtn.classList.add('active');
      toolPenBtn.classList.remove('active');
      animControlsBar.style.display = 'flex';
      jointStatusBadge.textContent = 'Animation active (Fourier Epicycles)';
      jointConnectToast.style.display = 'none';
    }
    resizeAllCanvases();
  }

  tabDrawBtn.addEventListener('click', () => setMode('draw'));
  toolPenBtn.addEventListener('click', () => setMode('draw'));

  tabAnimationBtn.addEventListener('click', () => {
    if (STATE.fourierData.length > 0) {
      setMode('anim');
    } else if (STATE.rawDrawing.length > 2) {
      const first = STATE.rawDrawing[0];
      STATE.rawDrawing.push({ x: first.x, y: first.y });
      synthesizeCurve(STATE.rawDrawing);
    } else {
      loadPreset('heart');
    }
  });

  toolClearBtn.addEventListener('click', () => {
    STATE.rawDrawing = [];
    STATE.resampledPoints = [];
    STATE.fourierData = [];
    STATE.tracePoints = [];
    STATE.waveHistoryY = [];
    STATE.waveHistoryX = [];
    setMode('draw');
    updateDynamicEquations();
  });

  // --- Drawing Gestures on Main Canvas ---
  function getCanvasCoords(e) {
    const rect = mainCanvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left - mainCx,
      y: e.clientY - rect.top - mainCy
    };
  }

  function startDrawing(e) {
    if (STATE.mode !== 'draw') return;
    try { mainCanvas.setPointerCapture(e.pointerId); } catch (err) {}

    STATE.isDrawing = true;
    STATE.isLoopSnapped = false;
    STATE.rawDrawing = [];
    STATE.tracePoints = [];

    const pt = getCanvasCoords(e);
    STATE.rawDrawing.push(pt);

    jointStatusBadge.textContent = 'Drawing... loop back to start point!';
    jointConnectToast.style.display = 'none';
  }

  function moveDrawing(e) {
    if (!STATE.isDrawing || STATE.mode !== 'draw') return;
    const pt = getCanvasCoords(e);
    const startPt = STATE.rawDrawing[0];

    // Check magnetic snap to start point
    if (STATE.rawDrawing.length > 12) {
      const dist = Math.hypot(pt.x - startPt.x, pt.y - startPt.y);
      if (dist < SNAP_RADIUS) {
        STATE.isLoopSnapped = true;
        jointStatusBadge.textContent = 'Joint Snapped! (Release to synthesize)';
        pt.x = startPt.x;
        pt.y = startPt.y;
      } else {
        STATE.isLoopSnapped = false;
        jointStatusBadge.textContent = 'Loop open';
      }
    }

    STATE.rawDrawing.push(pt);
  }

  function finishDrawing(e) {
    if (!STATE.isDrawing || STATE.mode !== 'draw') return;
    STATE.isDrawing = false;
    try {
      if (e && e.pointerId) mainCanvas.releasePointerCapture(e.pointerId);
    } catch (err) {}

    if (STATE.rawDrawing.length < 5) {
      jointStatusBadge.textContent = 'Too short. Draw a continuous curve.';
      return;
    }

    const startPt = STATE.rawDrawing[0];
    const endPt = STATE.rawDrawing[STATE.rawDrawing.length - 1];
    const dist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);

    // If snapped or within reasonable radius, close loop immediately with zero gap
    if (STATE.isLoopSnapped || dist < SNAP_RADIUS * 1.8) {
      STATE.rawDrawing.push({ x: startPt.x, y: startPt.y });
      jointStatusBadge.textContent = 'Joint closed (0px gap)! Synthesizing...';
      setTimeout(() => synthesizeCurve(STATE.rawDrawing), 180);
    } else {
      // Show prompt to bridge cleanly
      jointConnectToast.style.display = 'flex';
      jointStatusBadge.textContent = 'Loop open. Click "Start Animation" to close joint.';
    }
  }

  mainCanvas.addEventListener('pointerdown', startDrawing);
  mainCanvas.addEventListener('pointermove', moveDrawing);
  window.addEventListener('pointerup', finishDrawing);
  mainCanvas.addEventListener('pointercancel', finishDrawing);

  btnAutoAnimate.addEventListener('click', () => {
    jointConnectToast.style.display = 'none';
    if (STATE.rawDrawing.length > 2) {
      const first = STATE.rawDrawing[0];
      STATE.rawDrawing.push({ x: first.x, y: first.y });
      synthesizeCurve(STATE.rawDrawing);
    }
  });

  // --- Animation Controls ---
  playPauseBtn.addEventListener('click', () => {
    STATE.isPlaying = !STATE.isPlaying;
    playPauseIcon.textContent = STATE.isPlaying ? '⏸' : '▶';
  });

  resetBtn.addEventListener('click', () => {
    STATE.time = 0;
    STATE.tracePoints = [];
    STATE.waveHistoryY = [];
    STATE.waveHistoryX = [];
  });

  epicyclesSlider.addEventListener('input', (e) => {
    STATE.activeEpicycles = parseInt(e.target.value, 10);
    epicyclesVal.textContent = STATE.activeEpicycles;
  });

  speedSlider.addEventListener('input', (e) => {
    STATE.speed = parseFloat(e.target.value);
    speedVal.textContent = `${STATE.speed.toFixed(1)}x`;
  });

  chkCircles.addEventListener('change', (e) => (STATE.showCircles = e.target.checked));
  chkArms.addEventListener('change', (e) => (STATE.showArms = e.target.checked));
  chkTrace.addEventListener('change', (e) => (STATE.showTrace = e.target.checked));

  // --- Presets ---
  function loadPreset(key) {
    if (!window.PRESETS || !window.PRESETS[key]) return;
    const pts = window.PRESETS[key].generate(0, 0);
    STATE.rawDrawing = pts;
    synthesizeCurve(pts);
  }

  presetSelect.addEventListener('change', (e) => {
    loadPreset(e.target.value);
    e.target.value = '';
  });

  // --- Full-Stack API Integration ---
  saveDrawingBtn.addEventListener('click', async () => {
    if (!STATE.rawDrawing || STATE.rawDrawing.length < 5) {
      alert('Draw a shape before saving!');
      return;
    }
    const name = prompt('Name this drawing:', 'My Shape') || 'Custom Shape';
    try {
      const res = await fetch('/api/drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          points: STATE.rawDrawing,
          fourierSummary: {
            terms: STATE.activeEpicycles,
            totalHarmonics: STATE.fourierData.length
          }
        })
      });
      if (res.ok) {
        alert('Drawing saved to server successfully!');
      }
    } catch (err) {
      console.error('Failed to save to server:', err);
    }
  });

  loadDrawingsBtn.addEventListener('click', async () => {
    drawingsModal.classList.add('open');
    try {
      const res = await fetch('/api/drawings');
      const data = await res.json();
      renderDrawingsList(data);
    } catch (err) {
      drawingsList.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">Could not reach server backend.</p>';
    }
  });

  closeModalBtn.addEventListener('click', () => drawingsModal.classList.remove('open'));
  drawingsModal.addEventListener('click', (e) => {
    if (e.target === drawingsModal) drawingsModal.classList.remove('open');
  });

  function renderDrawingsList(drawings) {
    if (!drawings || drawings.length === 0) {
      drawingsList.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">No saved drawings found.</p>';
      return;
    }
    let html = '';
    drawings.forEach(d => {
      const dateStr = d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '';
      html += `
        <div class="drawing-item">
          <div>
            <div class="drawing-name">${d.name}</div>
            <div class="drawing-date">${dateStr}</div>
          </div>
          <div>
            <button class="btn-load" data-id="${d.id}">Load</button>
            ${!d.isPreset ? `<button class="btn-delete" data-id="${d.id}">&times;</button>` : ''}
          </div>
        </div>
      `;
    });
    drawingsList.innerHTML = html;

    // Attach load / delete handlers
    drawingsList.querySelectorAll('.btn-load').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = drawings.find(x => x.id === id);
        if (item) {
          if (item.isPreset) {
            const key = item.id.replace('preset-', '');
            loadPreset(key);
          } else if (item.points) {
            STATE.rawDrawing = item.points;
            synthesizeCurve(item.points);
          }
          drawingsModal.classList.remove('open');
        }
      });
    });

    drawingsList.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await fetch(`/api/drawings/${id}`, { method: 'DELETE' });
        btn.closest('.drawing-item').remove();
      });
    });
  }

  // --- Rendering: Grid Background ---
  function drawMinimalGrid(ctx, w, h, cx, cy) {
    ctx.save();
    ctx.strokeStyle = getInkColor('faint');
    ctx.lineWidth = 1;
    const step = 40;

    ctx.beginPath();
    for (let x = cx % step; x < w; x += step) {
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    }
    for (let y = cy % step; y < h; y += step) {
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Center axes
    ctx.strokeStyle = getInkColor('secondary');
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.stroke();

    ctx.restore();
  }

  // --- Rendering: Main Canvas in Draw Mode ---
  function renderMainDrawingMode() {
    if (STATE.rawDrawing.length === 0) return;

    mainCtx.save();
    mainCtx.translate(mainCx, mainCy);

    const pts = STATE.rawDrawing;

    // User's stroke
    mainCtx.beginPath();
    mainCtx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      mainCtx.lineTo(pts[i].x, pts[i].y);
    }
    mainCtx.strokeStyle = getInkColor('primary');
    mainCtx.lineWidth = 3;
    mainCtx.lineCap = 'round';
    mainCtx.lineJoin = 'round';
    mainCtx.stroke();

    // Start point circle
    const start = pts[0];
    mainCtx.beginPath();
    mainCtx.arc(start.x, start.y, 6, 0, 2 * Math.PI);
    mainCtx.fillStyle = getInkColor('primary');
    mainCtx.fill();

    // Magnetic snap halo
    mainCtx.beginPath();
    mainCtx.arc(start.x, start.y, SNAP_RADIUS, 0, 2 * Math.PI);
    mainCtx.strokeStyle = STATE.isLoopSnapped ? getInkColor('primary') : getInkColor('secondary');
    mainCtx.lineWidth = STATE.isLoopSnapped ? 2.5 : 1;
    mainCtx.setLineDash([4, 4]);
    mainCtx.stroke();

    // End point
    const cur = pts[pts.length - 1];
    mainCtx.beginPath();
    mainCtx.arc(cur.x, cur.y, 4, 0, 2 * Math.PI);
    mainCtx.fillStyle = getInkColor('secondary');
    mainCtx.fill();

    mainCtx.restore();
  }

  // --- Rendering: Main Canvas in Animation Mode ---
  function renderMainAnimationMode() {
    if (!STATE.fourierData || STATE.fourierData.length === 0) return;

    if (STATE.isPlaying) {
      const dTheta = (2 * Math.PI) / (N_SAMPLES * 2);
      STATE.time += dTheta * STATE.speed;
      if (STATE.time >= 2 * Math.PI) {
        STATE.time %= (2 * Math.PI);
      }
    }

    const { tip, joints } = window.evaluateEpicycles(STATE.fourierData, STATE.time, STATE.activeEpicycles);

    // Save trace point
    STATE.tracePoints.push({ x: tip.x, y: tip.y });
    if (STATE.tracePoints.length > N_SAMPLES * 2) {
      STATE.tracePoints.shift();
    }

    // Update wave buffers
    STATE.waveHistoryY.push(tip.y);
    if (STATE.waveHistoryY.length > STATE.maxWaveHistory) STATE.waveHistoryY.shift();

    STATE.waveHistoryX.push(tip.x);
    if (STATE.waveHistoryX.length > STATE.maxWaveHistory) STATE.waveHistoryX.shift();

    mainCtx.save();
    mainCtx.translate(mainCx, mainCy);

    // 1. Draw Epicycle Circles
    if (STATE.showCircles) {
      mainCtx.strokeStyle = getInkColor('faint');
      mainCtx.lineWidth = 1;
      for (let i = 1; i < joints.length; i++) {
        const j = joints[i];
        if (j.radius > 1) {
          mainCtx.beginPath();
          mainCtx.arc(j.prevX, j.prevY, j.radius, 0, 2 * Math.PI);
          mainCtx.stroke();
        }
      }
    }

    // 2. Draw Pendulum Arms (Vectors)
    if (STATE.showArms) {
      for (let i = 1; i < joints.length; i++) {
        const j = joints[i];
        mainCtx.beginPath();
        mainCtx.moveTo(j.prevX, j.prevY);
        mainCtx.lineTo(j.x, j.y);
        mainCtx.strokeStyle = getInkColor('primary');
        mainCtx.lineWidth = Math.max(1, 2.5 - (i / joints.length) * 1.5);
        mainCtx.stroke();

        // Joint bearing
        if (i < 15 || i % 4 === 0) {
          mainCtx.beginPath();
          mainCtx.arc(j.x, j.y, 2, 0, 2 * Math.PI);
          mainCtx.fillStyle = getInkColor('primary');
          mainCtx.fill();
        }
      }
    }

    // 3. Draw Reconstructed Path Trace
    if (STATE.showTrace && STATE.tracePoints.length > 1) {
      const pts = STATE.tracePoints;
      mainCtx.beginPath();
      mainCtx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        mainCtx.lineTo(pts[i].x, pts[i].y);
      }
      mainCtx.strokeStyle = getInkColor('primary');
      mainCtx.lineWidth = 3;
      mainCtx.lineCap = 'round';
      mainCtx.lineJoin = 'round';
      mainCtx.stroke();
    }

    // 4. Pen Tip
    mainCtx.beginPath();
    mainCtx.arc(tip.x, tip.y, 4.5, 0, 2 * Math.PI);
    mainCtx.fillStyle = getInkColor('primary');
    mainCtx.fill();

    mainCtx.restore();

    // Render Box 1 (Wave) and Box 3 (Pendulum)
    renderWaveBox(tip);
    renderPendulumBox(joints, tip);
  }

  // --- Rendering: Box 1 (Wave Nature) ---
  function renderWaveBox(tip) {
    waveCtx.clearRect(0, 0, waveW, waveH);
    drawMinimalGrid(waveCtx, waveW, waveH, waveW / 2, waveH / 2);

    if (STATE.waveHistoryY.length < 2) return;

    const centerY = waveH / 2;
    const step = waveW / STATE.maxWaveHistory;

    // Rolling wave line
    waveCtx.beginPath();
    for (let i = 0; i < STATE.waveHistoryY.length; i++) {
      const x = waveW - (STATE.waveHistoryY.length - 1 - i) * step;
      const y = centerY + STATE.waveHistoryY[i] * 0.35;
      if (i === 0) waveCtx.moveTo(x, y);
      else waveCtx.lineTo(x, y);
    }
    waveCtx.strokeStyle = getInkColor('primary');
    waveCtx.lineWidth = 2;
    waveCtx.stroke();

    // Current cursor dot
    const headY = centerY + tip.y * 0.35;
    waveCtx.beginPath();
    waveCtx.arc(waveW - 3, headY, 4, 0, 2 * Math.PI);
    waveCtx.fillStyle = getInkColor('primary');
    waveCtx.fill();
  }

  // --- Rendering: Box 3 (Pendulum Animation) ---
  function renderPendulumBox(joints, tip) {
    pendulumCtx.clearRect(0, 0, pendW, pendH);
    drawMinimalGrid(pendulumCtx, pendW, pendH, pendCx, pendCy);

    if (!joints || joints.length === 0) return;

    pendulumCtx.save();
    pendulumCtx.translate(pendCx, pendCy);

    // Scaled zoom to fit inside box 3
    const scale = 0.65;
    pendulumCtx.scale(scale, scale);

    // Draw compound pendulum arms with distinct mechanical joints
    const count = Math.min(STATE.activeEpicycles, joints.length);
    for (let i = 1; i < count; i++) {
      const j = joints[i];

      // Circular orbit
      pendulumCtx.beginPath();
      pendulumCtx.arc(j.prevX, j.prevY, j.radius, 0, 2 * Math.PI);
      pendulumCtx.strokeStyle = getInkColor('faint');
      pendulumCtx.lineWidth = 1;
      pendulumCtx.stroke();

      // Pendulum rod
      pendulumCtx.beginPath();
      pendulumCtx.moveTo(j.prevX, j.prevY);
      pendulumCtx.lineTo(j.x, j.y);
      pendulumCtx.strokeStyle = getInkColor('primary');
      pendulumCtx.lineWidth = Math.max(1.2, 3 - i * 0.08);
      pendulumCtx.stroke();

      // Joint bearing pivot
      pendulumCtx.beginPath();
      pendulumCtx.arc(j.x, j.y, 3, 0, 2 * Math.PI);
      pendulumCtx.fillStyle = getInkColor('primary');
      pendulumCtx.fill();
    }

    // Pendulum tip bob
    pendulumCtx.beginPath();
    pendulumCtx.arc(tip.x, tip.y, 6, 0, 2 * Math.PI);
    pendulumCtx.fillStyle = getInkColor('primary');
    pendulumCtx.fill();

    pendulumCtx.restore();
  }

  // --- Main Animation Loop ---
  function loop() {
    mainCtx.clearRect(0, 0, mainW, mainH);
    drawMinimalGrid(mainCtx, mainW, mainH, mainCx, mainCy);

    if (STATE.mode === 'draw') {
      renderMainDrawingMode();
    } else {
      renderMainAnimationMode();
    }

    requestAnimationFrame(loop);
  }

  // --- Initialize ---
  function init() {
    // Restore saved theme or default to dark
    const savedTheme = localStorage.getItem('math_viz_theme') || 'dark';
    applyTheme(savedTheme);

    resizeAllCanvases();
    initStaticEquations();

    // Default load Heart preset
    loadPreset('heart');

    // Upgrade math when KaTeX is ready
    window.addEventListener('load', () => {
      if (window.katex) {
        initStaticEquations();
        updateDynamicEquations();
      }
    });

    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
