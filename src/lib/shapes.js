/**
 * Geometric Shape & Line Generator for Fourier Synthesis
 * Every shape/line is generated as a densely sampled, strictly closed (0px joint gap)
 * point array so Discrete Fourier Transform (DFT) epicycles trace crisp edges and lines.
 */

export const SHAPE_LIST = [
  { id: 'circle', label: 'Circle', category: 'shape' },
  { id: 'rect', label: 'Rectangle', category: 'shape' },
  { id: 'triangle', label: 'Triangle', category: 'shape' },
  { id: 'diamond', label: 'Diamond', category: 'shape' },
  { id: 'pentagon', label: 'Pentagon', category: 'shape' },
  { id: 'hexagon', label: 'Hexagon', category: 'shape' },
  { id: 'star', label: '5-Pt Star', category: 'shape' },
  { id: 'ellipse', label: 'Ellipse', category: 'shape' },
  { id: 'arrow', label: 'Arrow', category: 'shape' }
];

export const LINE_PRESETS = [
  { id: 'horizontal', label: 'Horizontal Line (0°)' },
  { id: 'vertical', label: 'Vertical Line (90°)' },
  { id: 'diagonal45', label: 'Diagonal Line (45°)' },
  { id: 'zigzag', label: 'Zig-Zag Sawtooth Line' }
];

/**
 * Helper to densely interpolate along a closed sequence of polygon vertices
 * Ensures 0px gap between joints and sharp corner preservation.
 */
function interpolateVertices(vertices, pointsPerEdge = 48) {
  if (!vertices || vertices.length < 2) return [];
  const points = [];
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    for (let s = 0; s < pointsPerEdge; s++) {
      const t = s / pointsPerEdge;
      points.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t
      });
    }
  }

  // Strictly close loop with 0px gap
  if (points.length > 0) {
    points.push({ x: points[0].x, y: points[0].y });
  }
  return points;
}

/**
 * Generate a straight line segment between p1 and p2 as a closed harmonic oscillation path (p1 -> p2 -> p1)
 * so Fourier epicycles trace the exact straight line without jumping.
 */
export function generateLinePoints(p1, p2, samplesHalf = 128) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);

  // If user only clicked without dragging, create a centered 240px line
  let start = p1;
  let end = p2;
  if (dist < 10) {
    start = { x: p1.x - 120, y: p1.y };
    end = { x: p1.x + 120, y: p1.y };
  }

  const pts = [];
  // Forward pass: start -> end
  for (let i = 0; i < samplesHalf; i++) {
    const t = i / samplesHalf;
    pts.push({
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t
    });
  }
  // Return pass: end -> start (closes loop with 0px gap for pure linear harmonic motion)
  for (let i = 0; i <= samplesHalf; i++) {
    const t = i / samplesHalf;
    pts.push({
      x: end.x + (start.x - end.x) * t,
      y: end.y + (start.y - end.y) * t
    });
  }

  return pts;
}

/**
 * Generate preset lines centered on canvas
 */
export function generatePresetLine(presetId) {
  if (presetId === 'horizontal') {
    return generateLinePoints({ x: -150, y: 0 }, { x: 150, y: 0 });
  }
  if (presetId === 'vertical') {
    return generateLinePoints({ x: 0, y: -130 }, { x: 0, y: 130 });
  }
  if (presetId === 'diagonal45') {
    return generateLinePoints({ x: -130, y: 130 }, { x: 130, y: -130 });
  }
  if (presetId === 'zigzag') {
    const waypoints = [
      { x: -160, y: 60 },
      { x: -80, y: -60 },
      { x: 0, y: 60 },
      { x: 80, y: -60 },
      { x: 160, y: 60 },
      { x: 80, y: -60 },
      { x: 0, y: 60 },
      { x: -80, y: -60 }
    ];
    return interpolateVertices(waypoints, 36);
  }
  return generateLinePoints({ x: -140, y: 0 }, { x: 140, y: 0 });
}

/**
 * Generate geometric shape points from drag coordinates p1 -> p2
 * (or default centered size if p1 and p2 are very close)
 */
export function generateShapePoints(shapeType, p1, p2) {
  let x1 = p1.x;
  let y1 = p1.y;
  let x2 = p2.x;
  let y2 = p2.y;

  const dragDist = Math.hypot(x2 - x1, y2 - y1);

  // If clicked without dragging, default to a 220x220 box around click point
  if (dragDist < 12) {
    x1 = p1.x - 110;
    y1 = p1.y - 110;
    x2 = p1.x + 110;
    y2 = p1.y + 110;
  }

  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rx = Math.max(10, (maxX - minX) / 2);
  const ry = Math.max(10, (maxY - minY) / 2);
  const radius = Math.max(15, Math.hypot(x2 - x1, y2 - y1) / (dragDist < 12 ? Math.SQRT2 : 1));

  switch (shapeType) {
    case 'circle': {
      // Center at p1 if dragged, or cx,cy if clicked
      const centerX = dragDist < 12 ? p1.x : x1;
      const centerY = dragDist < 12 ? p1.y : y1;
      const r = dragDist < 12 ? 115 : Math.max(12, dragDist);
      const pts = [];
      const N = 256;
      for (let i = 0; i <= N; i++) {
        const theta = (i / N) * 2 * Math.PI;
        pts.push({
          x: centerX + r * Math.cos(theta),
          y: centerY + r * Math.sin(theta)
        });
      }
      return pts;
    }

    case 'ellipse': {
      const pts = [];
      const N = 256;
      for (let i = 0; i <= N; i++) {
        const theta = (i / N) * 2 * Math.PI;
        pts.push({
          x: cx + rx * Math.cos(theta),
          y: cy + ry * Math.sin(theta)
        });
      }
      return pts;
    }

    case 'rect': {
      const vertices = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY }
      ];
      return interpolateVertices(vertices, 64);
    }

    case 'triangle': {
      const vertices = [
        { x: cx, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY }
      ];
      return interpolateVertices(vertices, 85);
    }

    case 'diamond': {
      const vertices = [
        { x: cx, y: minY },
        { x: maxX, y: cy },
        { x: cx, y: maxY },
        { x: minX, y: cy }
      ];
      return interpolateVertices(vertices, 64);
    }

    case 'pentagon':
    case 'hexagon': {
      const sides = shapeType === 'pentagon' ? 5 : 6;
      const centerX = dragDist < 12 ? p1.x : x1;
      const centerY = dragDist < 12 ? p1.y : y1;
      const r = dragDist < 12 ? 115 : Math.max(15, dragDist);
      const baseAngle = dragDist < 12 ? -Math.PI / 2 : Math.atan2(y2 - y1, x2 - x1);
      const vertices = [];
      for (let i = 0; i < sides; i++) {
        const a = baseAngle + (i * 2 * Math.PI) / sides;
        vertices.push({
          x: centerX + r * Math.cos(a),
          y: centerY + r * Math.sin(a)
        });
      }
      return interpolateVertices(vertices, 44);
    }

    case 'star': {
      const spikes = 5;
      const centerX = dragDist < 12 ? p1.x : x1;
      const centerY = dragDist < 12 ? p1.y : y1;
      const outerR = dragDist < 12 ? 120 : Math.max(20, dragDist);
      const innerR = outerR * 0.42;
      const baseAngle = -Math.PI / 2;
      const vertices = [];
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = baseAngle + (i * Math.PI) / spikes;
        vertices.push({
          x: centerX + r * Math.cos(a),
          y: centerY + r * Math.sin(a)
        });
      }
      return interpolateVertices(vertices, 28);
    }

    case 'arrow': {
      const headX = maxX;
      const tailX = minX;
      const midY = cy;
      const headStartX = minX + (maxX - minX) * 0.58;
      const shaftHalfH = ry * 0.42;

      const vertices = [
        { x: tailX, y: midY - shaftHalfH },
        { x: headStartX, y: midY - shaftHalfH },
        { x: headStartX, y: minY },
        { x: headX, y: midY },
        { x: headStartX, y: maxY },
        { x: headStartX, y: midY + shaftHalfH },
        { x: tailX, y: midY + shaftHalfH }
      ];
      return interpolateVertices(vertices, 38);
    }

    default:
      return interpolateVertices(
        [
          { x: minX, y: minY },
          { x: maxX, y: minY },
          { x: maxX, y: maxY },
          { x: minX, y: maxY }
        ],
        64
      );
  }
}
