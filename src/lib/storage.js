/**
 * Browser Memory (LocalStorage) Storage Manager
 * Stores and manages drawings, presets, and state in client-side memory.
 */

const STORAGE_KEY = 'harmonic_graph_drawings';

const DEFAULT_PRESETS = [
  {
    id: 'preset-heart',
    name: 'Heart Curve',
    createdAt: new Date().toISOString(),
    isPreset: true,
    presetKey: 'heart'
  },
  {
    id: 'preset-star',
    name: 'Five-Point Star',
    createdAt: new Date().toISOString(),
    isPreset: true,
    presetKey: 'star'
  },
  {
    id: 'preset-infinity',
    name: 'Infinity Loop',
    createdAt: new Date().toISOString(),
    isPreset: true,
    presetKey: 'infinity'
  },
  {
    id: 'preset-trefoil',
    name: 'Trefoil Knot',
    createdAt: new Date().toISOString(),
    isPreset: true,
    presetKey: 'trefoil'
  }
];

export function getSavedDrawings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PRESETS));
      return DEFAULT_PRESETS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_PRESETS;
  } catch (err) {
    console.warn('Failed to read from browser memory:', err);
    return DEFAULT_PRESETS;
  }
}

export function saveDrawingToMemory(name, points, termsCount = 60) {
  try {
    const current = getSavedDrawings();
    const newEntry = {
      id: 'draw-' + Date.now(),
      name: (name || 'Custom Shape').trim(),
      createdAt: new Date().toISOString(),
      isPreset: false,
      points,
      termsCount
    };

    const updated = [newEntry, ...current];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Optional background sync with backend server if online
    fetch('/api/drawings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry)
    }).catch(() => {});

    return newEntry;
  } catch (err) {
    console.error('Failed to save to browser memory:', err);
    return null;
  }
}

export function deleteDrawingFromMemory(id) {
  try {
    const current = getSavedDrawings();
    const updated = current.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Optional background sync with backend server
    fetch(`/api/drawings/${id}`, { method: 'DELETE' }).catch(() => {});
    return true;
  } catch (err) {
    console.error('Failed to delete from browser memory:', err);
    return false;
  }
}
