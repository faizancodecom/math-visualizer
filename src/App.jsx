import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  PenTool,
  Slash,
  Shapes,
  Sun,
  Moon,
  Save,
  FolderOpen,
  Volume2,
  VolumeX,
  PlusCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MainCanvas } from '@/components/MainCanvas';
import { WaveBox } from '@/components/WaveBox';
import { EquationBox } from '@/components/EquationBox';
import { PendulumBox } from '@/components/PendulumBox';
import { SaveDialog } from '@/components/SaveDialog';
import { EquationModal } from '@/components/EquationModal';
import { Toast } from '@/components/Toast';
import { computeDFT, resampleCurve } from '@/lib/fourier';
import { PRESETS } from '@/lib/presets';
import { audioEngine } from '@/lib/audio';
import {
  getSavedDrawings,
  saveDrawingToMemory,
  deleteDrawingFromMemory
} from '@/lib/storage';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('math_viz_theme') || 'dark');
  const [mode, setMode] = useState('draw'); // 'draw' | 'anim'
  const [drawTool, setDrawTool] = useState('pen'); // 'pen' | 'line' | 'shape'
  const [activeShape, setActiveShape] = useState('circle');
  const [rawDrawing, setRawDrawing] = useState([]);
  const [fourierData, setFourierData] = useState([]);

  // Synced tip & wave state for Box 1 (Wave) and Box 3 (Pendulum)
  const [currentTip, setCurrentTip] = useState({ x: 0, y: 0 });
  const [currentJoints, setCurrentJoints] = useState([]);
  const [waveHistory, setWaveHistory] = useState([]);

  // Audio state
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState(null);

  // Modals state
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isEquationModalOpen, setIsEquationModalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [savedDrawings, setSavedDrawings] = useState([]);

  // Theme application
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('math_viz_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // Synthesize curve into Fourier epicycles and update live equations
  const handleSynthesize = useCallback((points) => {
    if (!points || points.length < 3) return;

    // Resample with guaranteed 0px gap between joints
    const resampled = resampleCurve(points, 256);
    const dft = computeDFT(resampled);

    setFourierData(dft);
    setMode('anim');
    setWaveHistory([]);

    // Update real-time wave audio if playing
    if (audioEngine.isPlaying) {
      audioEngine.updateHarmonics(dft);
    }
  }, []);

  // Update tip and rolling wave buffer from animation
  const handleTipUpdate = useCallback((tip, joints) => {
    setCurrentTip(tip);
    setCurrentJoints(joints);
    setWaveHistory(prev => {
      const next = [...prev, tip.y];
      return next.length > 160 ? next.slice(next.length - 160) : next;
    });
  }, []);

  // Clear canvas
  const handleClear = () => {
    setRawDrawing([]);
    setFourierData([]);
    setCurrentJoints([]);
    setWaveHistory([]);
    setMode('draw');
    if (audioEngine.isPlaying) {
      audioEngine.stop();
      setIsAudioPlaying(false);
    }
    showToast('Canvas cleared', 'info');
  };

  // Load preset
  const handleSelectPreset = (key) => {
    if (!PRESETS[key]) return;
    const pts = PRESETS[key].generate(0, 0);
    setRawDrawing(pts);
    handleSynthesize(pts);
    showToast(`Loaded ${PRESETS[key].name}`, 'info');
  };

  // Audio Toggle
  const handleToggleAudio = () => {
    if (fourierData.length === 0) {
      showToast('Draw a curve first to generate sound!', 'error');
      return;
    }
    const active = audioEngine.toggle(fourierData);
    setIsAudioPlaying(active);
    showToast(active ? 'Playing acoustic wave synthesis' : 'Muted wave audio', 'info');
  };

  // Load default Heart preset on mount
  useEffect(() => {
    const pts = PRESETS.heart.generate(0, 0);
    setRawDrawing(pts);
    const resampled = resampleCurve(pts, 256);
    const dft = computeDFT(resampled);
    setFourierData(dft);
  }, []);

  // Load saved drawings list from browser memory
  const refreshLibrary = () => {
    const list = getSavedDrawings();
    setSavedDrawings(list);
  };

  // Open Save Dialog
  const handleOpenSave = () => {
    if (!rawDrawing || rawDrawing.length < 5) {
      showToast('Please draw a curve first!', 'error');
      return;
    }
    setIsSaveOpen(true);
  };

  // Execute Save to browser memory
  const handleSaveDrawing = (name) => {
    const entry = saveDrawingToMemory(name, rawDrawing, fourierData.length);
    if (entry) {
      showToast(`Saved "${entry.name}" to browser memory!`, 'success');
      refreshLibrary();
    }
  };

  // Delete drawing from browser memory
  const handleDeleteDrawing = (id, name) => {
    deleteDrawingFromMemory(id);
    refreshLibrary();
    showToast(`Deleted "${name}"`, 'info');
  };

  // Apply custom equation and trace pendulums
  const handleApplyCustomEquation = (points) => {
    setRawDrawing(points);
    handleSynthesize(points);
    showToast(`Tracing custom equation with pendulum linkage!`, 'success');
  };

  const isDark = theme === 'dark';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      
      {/* Cool Toast Notification (No alerts) */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Cool Save Modal (No prompts) */}
      <SaveDialog
        isOpen={isSaveOpen}
        onClose={() => setIsSaveOpen(false)}
        onSave={handleSaveDrawing}
        pointsCount={rawDrawing.length}
        termsCount={fourierData.length}
      />

      {/* Add Custom Equation Modal */}
      <EquationModal
        isOpen={isEquationModalOpen}
        onClose={() => setIsEquationModalOpen(false)}
        onApplyEquation={handleApplyCustomEquation}
      />

      {/* Top Header */}
      <header className="h-11 shrink-0 border-b border-border bg-card flex items-center justify-between px-3 z-40 select-none">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-black tracking-wider">MATH VISUALIZER</span>
          <span className="text-[10px] text-muted-foreground tracking-widest uppercase">
            FOURIER &amp; PENDULUM
          </span>
        </div>

        <div className="flex items-center gap-2">
          
          {/* Add Custom Equation Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEquationModalOpen(true)}
            className="h-7 text-xs font-bold border-foreground"
            title="Add a custom equation to trace with pendulums"
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1" />
            Add Equation
          </Button>

          {/* Sound Toggle Button */}
          <Button
            variant={isAudioPlaying ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleAudio}
            className="h-7 text-xs"
            title="Play original acoustic sound of your drawing"
          >
            {isAudioPlaying ? (
              <>
                <Volume2 className="h-3.5 w-3.5 mr-1 animate-pulse" /> Audio On
              </>
            ) : (
              <>
                <VolumeX className="h-3.5 w-3.5 mr-1" /> Audio
              </>
            )}
          </Button>

          {/* Save to Browser Memory */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenSave}
            className="h-7 text-xs"
            title="Save to browser memory"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            Save
          </Button>

          {/* Library Modal */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refreshLibrary();
              setIsLibraryOpen(true);
            }}
            className="h-7 text-xs"
            title="Open memory library"
          >
            <FolderOpen className="h-3.5 w-3.5 mr-1" />
            Library
          </Button>

          {/* Presets Select */}
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                handleSelectPreset(e.target.value);
                e.target.value = '';
              }
            }}
            className="h-7 text-xs rounded border border-border bg-background px-2 text-foreground outline-none cursor-pointer"
          >
            <option value="" disabled>Presets...</option>
            <option value="heart">Heart</option>
            <option value="star">Star</option>
            <option value="trefoil">Trefoil</option>
            <option value="infinity">Infinity</option>
            <option value="butterfly">Butterfly</option>
            <option value="fourier_pi">Greek Pi</option>
          </select>

          {/* Theme Toggle (Light / Dark) */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="h-7 text-xs border-2 border-foreground font-bold"
            title="Toggle Light / Dark mode"
          >
            {isDark ? (
              <>
                <Sun className="h-3.5 w-3.5 mr-1" /> Light
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 mr-1" /> Dark
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content Layout strictly aligned to bottom without overflowing */}
      <main className="flex-1 min-h-0 flex p-3 gap-3 overflow-hidden">
        
        {/* LEFT COLUMN: Tools, Tabs, and Main Canvas */}
        <section className="flex-[1.8] min-h-0 h-full flex flex-col gap-2 min-w-0">
          
          {/* Top Row: [ clear ] [ pen ] [ line ] [ shape ] + Tabs [ Draw ] [ Animation ] */}
          <div className="shrink-0 flex items-center justify-between gap-2">
            <div className="w-fit border-2 border-border rounded-md bg-card flex items-center p-1 gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-6 text-xs font-bold lowercase tracking-wider gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                clear
              </Button>

              <div className="w-px h-4 bg-border" />

              <Button
                variant={mode === 'draw' && drawTool === 'pen' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setDrawTool('pen');
                  setMode('draw');
                }}
                className="h-6 text-xs font-bold lowercase tracking-wider gap-1.5"
                title="Freehand Pen with 0px magnetic joint snap"
              >
                <PenTool className="h-3.5 w-3.5" />
                pen
              </Button>

              <div className="w-px h-4 bg-border" />

              <Button
                variant={drawTool === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setDrawTool('line');
                  setMode('draw');
                }}
                className="h-6 text-xs font-bold lowercase tracking-wider gap-1.5"
                title="Draw or insert a straight Line"
              >
                <Slash className="h-3.5 w-3.5" />
                line
              </Button>

              <div className="w-px h-4 bg-border" />

              <Button
                variant={drawTool === 'shape' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setDrawTool('shape');
                  setMode('draw');
                }}
                className="h-6 text-xs font-bold lowercase tracking-wider gap-1.5"
                title="Draw or insert geometric Shapes (Circle, Rectangle, Triangle, Star, etc.)"
              >
                <Shapes className="h-3.5 w-3.5" />
                shape
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant={mode === 'draw' ? 'default' : 'outline'}
                className="h-7 px-4 text-xs font-bold"
                onClick={() => setMode('draw')}
              >
                Draw
              </Button>
              <Button
                variant={mode === 'anim' ? 'default' : 'outline'}
                className="h-7 px-4 text-xs font-bold"
                onClick={() => {
                  if (rawDrawing.length > 2) {
                    handleSynthesize(rawDrawing);
                  } else if (fourierData.length > 0) {
                    setMode('anim');
                  } else {
                    handleSelectPreset('heart');
                  }
                }}
              >
                Animation
              </Button>

              <Badge variant="outline" className="font-mono text-[10px] hidden sm:inline-flex">
                {mode === 'draw'
                  ? drawTool === 'pen'
                    ? '0px joint snap'
                    : drawTool === 'line'
                      ? 'Drag line'
                      : `Drag ${activeShape}`
                  : 'Fourier Epicycles'}
              </Badge>
            </div>
          </div>

          {/* Main Large Canvas Box (Fills remaining height exactly) */}
          <div className="flex-1 min-h-0 w-full relative">
            <MainCanvas
              mode={mode}
              onStartDraw={() => setMode('draw')}
              drawTool={drawTool}
              activeShape={activeShape}
              onSelectShape={(shapeId) => {
                setActiveShape(shapeId);
              }}
              isDark={isDark}
              fourierData={fourierData}
              rawDrawing={rawDrawing}
              onDrawingChange={setRawDrawing}
              onSynthesize={handleSynthesize}
              onTipUpdate={handleTipUpdate}
              onJointSnapped={() => showToast('Joint connected with 0px gap!', 'info')}
            />
          </div>

        </section>

        {/* RIGHT COLUMN: Exactly 3 Stacked Boxes [ wave ], [ Equation ], [ perpedilum anaimtion ] */}
        <aside className="flex-[1.1] min-h-0 h-full flex flex-col gap-2.5 min-w-[300px] max-w-[430px]">
          
          {/* Box 1: wave */}
          <WaveBox
            waveHistory={waveHistory}
            currentY={currentTip.y}
            isDark={isDark}
            isAudioPlaying={isAudioPlaying}
            onToggleAudio={handleToggleAudio}
          />

          {/* Box 2: Equation */}
          <EquationBox
            fourierData={fourierData}
            onCopy={(msg) => showToast(msg || 'Equation copied to clipboard!', 'success')}
          />

          {/* Box 3: perpedilum anaimtion */}
          <PendulumBox
            joints={currentJoints}
            tip={currentTip}
            isDark={isDark}
            activeEpicycles={60}
          />

        </aside>

      </main>

      {/* Library Dialog (Browser Memory) */}
      <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <DialogHeader>
          <DialogTitle>Browser Memory Library</DialogTitle>
          <DialogClose onClick={() => setIsLibraryOpen(false)} />
        </DialogHeader>

        <div className="max-h-[300px] overflow-y-auto flex flex-col gap-2 mt-2">
          {savedDrawings.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground py-6">No drawings found in memory.</p>
          ) : (
            savedDrawings.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between p-2 rounded border border-border bg-background text-xs"
              >
                <div>
                  <div className="font-semibold">{d.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {d.isPreset ? 'Built-in Preset' : new Date(d.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (d.isPreset && d.presetKey) {
                        handleSelectPreset(d.presetKey);
                      } else if (d.points) {
                        setRawDrawing(d.points);
                        handleSynthesize(d.points);
                        showToast(`Loaded "${d.name}" from memory`, 'success');
                      }
                      setIsLibraryOpen(false);
                    }}
                  >
                    Load
                  </Button>
                  {!d.isPreset && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDrawing(d.id, d.name)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      &times;
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Dialog>

    </div>
  );
}
