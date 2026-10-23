import React, { useEffect, useRef, useState, useMemo } from 'react';
import katex from 'katex';
import { Copy, Check, Table, Calculator, Activity, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export function EquationBox({ fourierData = [], onCopy }) {
  const [activeTab, setActiveTab] = useState('formulas'); // 'formulas' | 'table' | 'metrics'
  const [pulse, setPulse] = useState(false);

  // Copy states
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedX, setCopiedX] = useState(false);
  const [copiedY, setCopiedY] = useState(false);
  const [copiedTable, setCopiedTable] = useState(false);

  // DOM Refs for KaTeX
  const complexRef = useRef(null);
  const parametricXRef = useRef(null);
  const parametricYRef = useRef(null);
  const trigXRef = useRef(null);
  const trigYRef = useRef(null);

  const rawEquationStrings = useRef({
    complex: '',
    x: '',
    y: ''
  });

  const fmt = (n, decimals = 1) => {
    const val = Number(n);
    return isNaN(val) ? '0' : val.toFixed(decimals);
  };

  // Compute Drawing & Fourier Metrics
  const metrics = useMemo(() => {
    if (!fourierData || fourierData.length === 0) return null;

    const totalEnergy = fourierData.reduce((sum, t) => sum + t.radius * t.radius, 0);
    const dcTerm = fourierData.find(t => t.freq === 0) || { re: 0, im: 0, radius: 0 };
    
    // Top 5 energy concentration
    const top5Energy = fourierData.slice(0, 5).reduce((sum, t) => sum + t.radius * t.radius, 0);
    const concentration = totalEnergy > 0 ? (top5Energy / totalEnergy) * 100 : 0;

    // Approximate perimeter from harmonic speeds
    let approxPerimeter = 0;
    fourierData.forEach(t => {
      approxPerimeter += Math.abs(t.freq) * t.radius;
    });
    approxPerimeter = approxPerimeter * (2 * Math.PI / fourierData.length) * 1.5;

    return {
      centroidX: fmt(dcTerm.re, 1),
      centroidY: fmt(dcTerm.im, 1),
      totalEnergy: fmt(totalEnergy, 0),
      concentration: fmt(concentration, 1),
      dominantFreq: fourierData[0]?.freq ?? 0,
      dominantRadius: fmt(fourierData[0]?.radius ?? 0, 1),
      totalTerms: fourierData.length
    };
  }, [fourierData]);

  useEffect(() => {
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 300);

    if (!fourierData || fourierData.length === 0) {
      if (complexRef.current) complexRef.current.innerHTML = '<span class="text-muted-foreground text-xs italic">Draw a loop to generate equations</span>';
      if (parametricXRef.current) parametricXRef.current.innerHTML = '';
      if (parametricYRef.current) parametricYRef.current.innerHTML = '';
      if (trigXRef.current) trigXRef.current.innerHTML = '';
      if (trigYRef.current) trigYRef.current.innerHTML = '';
      rawEquationStrings.current = { complex: '', x: '', y: '' };
      return;
    }

    // 1. Complex Fourier Series: z(t) = c0 + sum c_k e^{i k t}
    const top4 = fourierData.slice(0, 4);
    const complexParts = top4.map((term) => {
      const r = fmt(term.radius, 1);
      const w = term.freq;
      const phaseSign = term.phase >= 0 ? '+' : '';
      const phaseStr = `${phaseSign}${fmt(term.phase, 2)}`;
      if (w === 0) return `${r}`;
      const freqStr = Math.abs(w) === 1 ? (w === -1 ? '-t' : 't') : `${w}t`;
      return `${r} e^{i(${freqStr} ${phaseStr})}`;
    });
    const complexLatex = `z(t) \\approx ${complexParts.join(' + ')} + \\dots`;

    // 2. Parametric Cartesian Forms (Amplitude-Phase form)
    const top4Terms = fourierData.slice(0, 4);
    const xDisplayParts = top4Terms.map(term => {
      const w = term.freq;
      if (w === 0) return `${fmt(term.re, 1)}`;
      const r = fmt(term.radius, 1);
      const phaseStr = (term.phase >= 0 ? '+' : '') + fmt(term.phase, 2);
      const fStr = w === 1 ? 't' : (w === -1 ? '-t' : `${w}t`);
      return `${r} \\cos(${fStr} ${phaseStr})`;
    });

    const yDisplayParts = top4Terms.map(term => {
      const w = term.freq;
      if (w === 0) return `${fmt(term.im, 1)}`;
      const r = fmt(term.radius, 1);
      const phaseStr = (term.phase >= 0 ? '+' : '') + fmt(term.phase, 2);
      const fStr = w === 1 ? 't' : (w === -1 ? '-t' : `${w}t`);
      return `${r} \\sin(${fStr} ${phaseStr})`;
    });

    const xDisplayLatex = `x(t) \\approx ${xDisplayParts.join(' + ')} + \\dots`;
    const yDisplayLatex = `y(t) \\approx ${yDisplayParts.join(' + ')} + \\dots`;

    // 3. Standard Sine & Cosine Trigonometric Expansion
    // a_k cos(kt) + b_k sin(kt)
    const trigXParts = top4Terms.map(term => {
      const w = term.freq;
      if (w === 0) return `${fmt(term.re, 1)}`;
      const a = fmt(term.radius * Math.cos(term.phase), 1);
      const b = fmt(-term.radius * Math.sin(term.phase), 1);
      const fStr = Math.abs(w) === 1 ? 't' : `${Math.abs(w)}t`;
      const signB = Number(b) >= 0 ? '+' : '';
      return `${a} \\cos(${fStr}) ${signB} ${b} \\sin(${fStr})`;
    });
    const trigXLatex = `x(t) = ${trigXParts.join(' + ')} + \\dots`;

    // 4. High-Fidelity Copy Strings (up to 20 harmonics)
    const copyTerms = fourierData.slice(0, 20).filter(t => t.radius >= 0.3);
    const xCopyParts = copyTerms.map(term => {
      const w = term.freq;
      if (w === 0) return `${fmt(term.re, 2)}`;
      const r = fmt(term.radius, 2);
      const phaseStr = (term.phase >= 0 ? ' + ' : ' - ') + fmt(Math.abs(term.phase), 3);
      return `${r} * cos(${w} * t${phaseStr})`;
    });

    const yCopyParts = copyTerms.map(term => {
      const w = term.freq;
      if (w === 0) return `${fmt(term.im, 2)}`;
      const r = fmt(term.radius, 2);
      const phaseStr = (term.phase >= 0 ? ' + ' : ' - ') + fmt(Math.abs(term.phase), 3);
      return `${r} * sin(${w} * t${phaseStr})`;
    });

    rawEquationStrings.current = {
      complex: complexLatex,
      x: xCopyParts.join(' + '),
      y: yCopyParts.join(' + ')
    };

    // Render KaTeX
    try {
      if (complexRef.current) katex.render(complexLatex, complexRef.current, { throwOnError: false, displayMode: true });
      if (parametricXRef.current) katex.render(xDisplayLatex, parametricXRef.current, { throwOnError: false, displayMode: false });
      if (parametricYRef.current) katex.render(yDisplayLatex, parametricYRef.current, { throwOnError: false, displayMode: false });
      if (trigXRef.current) katex.render(trigXLatex, trigXRef.current, { throwOnError: false, displayMode: false });
    } catch (err) {}

    return () => clearTimeout(timer);
  }, [fourierData, activeTab]);

  // Copy Handlers
  const handleCopyAll = () => {
    if (!fourierData || fourierData.length === 0) return;
    const textToCopy = `x(t) = ${rawEquationStrings.current.x}\n\ny(t) = ${rawEquationStrings.current.y}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    if (onCopy) onCopy('Full equations copied to clipboard!');
  };

  const handleCopyX = () => {
    if (!rawEquationStrings.current.x) return;
    navigator.clipboard.writeText(rawEquationStrings.current.x);
    setCopiedX(true);
    setTimeout(() => setCopiedX(false), 2000);
    if (onCopy) onCopy('x(t) equation copied to clipboard!');
  };

  const handleCopyY = () => {
    if (!rawEquationStrings.current.y) return;
    navigator.clipboard.writeText(rawEquationStrings.current.y);
    setCopiedY(true);
    setTimeout(() => setCopiedY(false), 2000);
    if (onCopy) onCopy('y(t) equation copied to clipboard!');
  };

  const handleCopyTableCSV = () => {
    if (!fourierData || fourierData.length === 0) return;
    const totalE = fourierData.reduce((sum, t) => sum + t.radius * t.radius, 0);
    let csv = 'Rank,Frequency (w),Amplitude R (px),Phase (rad),Phase (deg),Real (Re),Imag (Im),Energy (%)\n';
    fourierData.forEach((t, i) => {
      const deg = (t.phase * 180 / Math.PI).toFixed(1);
      const energyPct = totalE > 0 ? ((t.radius * t.radius / totalE) * 100).toFixed(2) : '0';
      csv += `${i + 1},${t.freq},${t.radius.toFixed(2)},${t.phase.toFixed(3)},${deg},${t.re.toFixed(2)},${t.im.toFixed(2)},${energyPct}%\n`;
    });
    navigator.clipboard.writeText(csv);
    setCopiedTable(true);
    setTimeout(() => setCopiedTable(false), 2000);
    if (onCopy) onCopy('Harmonics breakdown copied as CSV!');
  };

  const totalEnergy = useMemo(() => {
    return fourierData.reduce((sum, t) => sum + t.radius * t.radius, 0);
  }, [fourierData]);

  return (
    <Card className="flex-[1.2] min-h-0 flex flex-col border-2 transition-colors">
      {/* Header with View Tabs */}
      <CardHeader className="pb-1.5 pt-2 shrink-0">
        <CardTitle className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight">Equation Details</span>
            {/* View Selectors */}
            <div className="flex items-center rounded border border-border bg-background p-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => setActiveTab('formulas')}
                className={`px-1.5 py-0.5 rounded flex items-center gap-1 font-medium transition-colors ${activeTab === 'formulas' ? 'bg-foreground text-background font-bold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Calculator className="h-2.5 w-2.5" /> Formulas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('table')}
                className={`px-1.5 py-0.5 rounded flex items-center gap-1 font-medium transition-colors ${activeTab === 'table' ? 'bg-foreground text-background font-bold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Table className="h-2.5 w-2.5" /> Harmonics ({fourierData.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('metrics')}
                className={`px-1.5 py-0.5 rounded flex items-center gap-1 font-medium transition-colors ${activeTab === 'metrics' ? 'bg-foreground text-background font-bold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Activity className="h-2.5 w-2.5" /> Metrics
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {activeTab === 'table' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyTableCSV}
                className="h-6 px-2 text-[10px] gap-1"
                title="Copy full harmonics table as CSV data"
                disabled={fourierData.length === 0}
              >
                {copiedTable ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                CSV
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAll}
                className="h-6 px-2 text-[10px] gap-1"
                title="Copy all mathematical equations to clipboard"
                disabled={fourierData.length === 0}
              >
                {copiedAll ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                Copy All
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      {/* Main Container */}
      <div className={`p-2.5 flex flex-col justify-start gap-2 overflow-y-auto bg-background text-foreground flex-1 min-h-0 transition-opacity ${pulse ? 'opacity-70' : 'opacity-100'}`}>
        
        {/* VIEW 1: COMPLETE FORMULAS & COORDINATES */}
        {activeTab === 'formulas' && (
          <div className="flex flex-col gap-2.5">
            {/* Complex Series */}
            <div className="flex flex-col gap-0.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono font-bold flex items-center justify-between">
                <span>1. Complex Exponential Series:</span>
                <span className="text-[9px] font-normal font-mono">z(t) = x(t) + i·y(t)</span>
              </div>
              <div
                ref={complexRef}
                className="text-[11px] font-mono text-center p-2 rounded border border-border bg-card/60 overflow-x-auto min-h-[36px] flex items-center justify-center shadow-inner"
              />
            </div>

            {/* Amplitude-Phase Polar Parametric Coordinates */}
            <div className="flex flex-col gap-0.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono font-bold flex items-center justify-between">
                <span>2. Parametric Wave Coordinates:</span>
                <span className="text-[9px] font-normal text-muted-foreground">Amplitude-Phase Form</span>
              </div>

              <div className="flex flex-col gap-1.5">
                {/* X Coordinate Row with Copy X */}
                <div className="flex items-center justify-between p-1.5 rounded border border-border bg-card/40 gap-1 shadow-sm">
                  <div ref={parametricXRef} className="flex-1 text-center font-mono text-[11px] overflow-x-auto px-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyX}
                    className="h-6 px-2 text-[10px] font-mono font-bold shrink-0 gap-1 border-border/80 hover:border-foreground"
                    title="Copy x(t) equation to clipboard"
                    disabled={!fourierData || fourierData.length === 0}
                  >
                    {copiedX ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    x
                  </Button>
                </div>

                {/* Y Coordinate Row with Copy Y */}
                <div className="flex items-center justify-between p-1.5 rounded border border-border bg-card/40 gap-1 shadow-sm">
                  <div ref={parametricYRef} className="flex-1 text-center font-mono text-[11px] overflow-x-auto px-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyY}
                    className="h-6 px-2 text-[10px] font-mono font-bold shrink-0 gap-1 border-border/80 hover:border-foreground"
                    title="Copy y(t) equation to clipboard"
                    disabled={!fourierData || fourierData.length === 0}
                  >
                    {copiedY ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    y
                  </Button>
                </div>
              </div>
            </div>

            {/* Standard Sine & Cosine Cartesian Decomposition */}
            <div className="flex flex-col gap-0.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono font-bold flex items-center justify-between">
                <span>3. Cartesian Sine-Cosine Decomposition:</span>
                <span className="text-[9px] font-normal text-muted-foreground">a_k cos + b_k sin</span>
              </div>
              <div
                ref={trigXRef}
                className="text-[10.5px] font-mono text-center p-1.5 rounded border border-border/80 bg-card/30 overflow-x-auto"
              />
            </div>
          </div>
        )}

        {/* VIEW 2: FULL HARMONICS BREAKDOWN TABLE */}
        {activeTab === 'table' && (
          <div className="flex flex-col gap-1 flex-1">
            <div className="text-[10px] text-muted-foreground font-mono flex items-center justify-between pb-1 border-b border-border">
              <span>All harmonic modes sorted by kinetic amplitude:</span>
              <span className="font-bold">{fourierData.length} total modes</span>
            </div>

            <div className="overflow-y-auto max-h-[190px] border border-border rounded bg-card/30">
              <table className="w-full text-[10px] font-mono text-left border-collapse">
                <thead className="bg-muted sticky top-0 border-b border-border text-[9px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-1 px-1.5">#</th>
                    <th className="py-1 px-1.5">Freq (ω)</th>
                    <th className="py-1 px-1.5">Radius (R)</th>
                    <th className="py-1 px-1.5">Phase (φ)</th>
                    <th className="py-1 px-1.5">Deg</th>
                    <th className="py-1 px-1.5">Energy %</th>
                  </tr>
                </thead>
                <tbody>
                  {fourierData.slice(0, 30).map((term, idx) => {
                    const energyPct = totalEnergy > 0 ? ((term.radius * term.radius / totalEnergy) * 100).toFixed(1) : '0';
                    const deg = (term.phase * 180 / Math.PI).toFixed(1);
                    return (
                      <tr key={idx} className="border-b border-border/40 hover:bg-muted/40 transition-colors">
                        <td className="py-1 px-1.5 font-bold">{idx + 1}</td>
                        <td className="py-1 px-1.5">{term.freq}</td>
                        <td className="py-1 px-1.5">{term.radius.toFixed(2)} px</td>
                        <td className="py-1 px-1.5">{term.phase.toFixed(3)} rad</td>
                        <td className="py-1 px-1.5">{deg}°</td>
                        <td className="py-1 px-1.5 font-semibold">{energyPct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="text-[9px] text-muted-foreground text-right pt-0.5">
              Showing top 30 harmonics. Click "CSV" to export all {fourierData.length}.
            </div>
          </div>
        )}

        {/* VIEW 3: DRAWING GEOMETRIC & PHYSICAL METRICS */}
        {activeTab === 'metrics' && metrics && (
          <div className="flex flex-col gap-2 flex-1">
            <div className="text-[10px] text-muted-foreground font-mono font-bold pb-1 border-b border-border">
              Mathematical Characteristics of Your Drawing:
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded border border-border bg-card/50 flex flex-col gap-0.5">
                <span className="text-[9px] uppercase text-muted-foreground">Center of Mass (DC Offset)</span>
                <span className="font-bold">({metrics.centroidX}, {metrics.centroidY}) px</span>
                <span className="text-[9px] text-muted-foreground">Zero-frequency base position (c₀)</span>
              </div>

              <div className="p-2 rounded border border-border bg-card/50 flex flex-col gap-0.5">
                <span className="text-[9px] uppercase text-muted-foreground">Dominant Harmonic</span>
                <span className="font-bold">ω = {metrics.dominantFreq} (R = {metrics.dominantRadius} px)</span>
                <span className="text-[9px] text-muted-foreground">Primary rotational mode</span>
              </div>

              <div className="p-2 rounded border border-border bg-card/50 flex flex-col gap-0.5">
                <span className="text-[9px] uppercase text-muted-foreground">Total Harmonic Power</span>
                <span className="font-bold">E = {metrics.totalEnergy} px²</span>
                <span className="text-[9px] text-muted-foreground">Sum of squared radii (∑ |c_k|²)</span>
              </div>

              <div className="p-2 rounded border border-border bg-card/50 flex flex-col gap-0.5">
                <span className="text-[9px] uppercase text-muted-foreground">Energy Concentration</span>
                <span className="font-bold">{metrics.concentration}% in Top 5</span>
                <span className="text-[9px] text-muted-foreground">Spectral concentration purity</span>
              </div>
            </div>

            <div className="p-2 rounded border border-border bg-card/30 text-[10px] font-mono flex items-center justify-between mt-auto">
              <span>Sampling Density: <strong>256 equidistant points</strong></span>
              <span>Fundamental Frequency: <strong>ω₀ = 1.0 rad/s</strong></span>
            </div>
          </div>
        )}

      </div>
    </Card>
  );
}
