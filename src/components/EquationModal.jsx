import React, { useState, useEffect } from 'react';
import { FunctionSquare, Sparkles, X, Play, CopyCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EQUATION_TEMPLATES, evaluateParametricEquation, sanitizeMathExpr } from '@/lib/evalEquation';

export function EquationModal({
  isOpen,
  onClose,
  onApplyEquation,
  currentXExpr = '',
  currentYExpr = ''
}) {
  const [xExpr, setXExpr] = useState('150 * cos(3 * t)');
  const [yExpr, setYExpr] = useState('150 * sin(2 * t)');
  const [error, setError] = useState(null);

  // Sync if current equations provided
  useEffect(() => {
    if (isOpen) {
      if (currentXExpr && currentYExpr) {
        setXExpr(currentXExpr);
        setYExpr(currentYExpr);
      }
      setError(null);
    }
  }, [isOpen, currentXExpr, currentYExpr]);

  if (!isOpen) return null;

  const handleApply = (e) => {
    e?.preventDefault();
    setError(null);
    try {
      const points = evaluateParametricEquation(xExpr, yExpr, 256);
      onApplyEquation(points, `x(t)=${xExpr}, y(t)=${yExpr}`);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectTemplate = (template) => {
    setXExpr(template.xExpr);
    setYExpr(template.yExpr);
    setError(null);
  };

  const handleFillCurrent = () => {
    if (currentXExpr && currentYExpr) {
      setXExpr(currentXExpr);
      setYExpr(currentYExpr);
      setError(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-50 w-full max-w-lg rounded-lg border-2 border-foreground bg-card p-5 shadow-2xl modal-animate-in select-none">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <FunctionSquare className="h-4 w-4" />
            <h3 className="text-sm font-bold tracking-tight">Add Equation &amp; Trace Pendulums</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Presets / Templates */}
        <div className="mt-3">
          <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Quick Mathematical Templates:
            </span>
            {currentXExpr && currentYExpr && (
              <button
                type="button"
                onClick={handleFillCurrent}
                className="text-[10px] font-mono underline hover:text-foreground flex items-center gap-1"
                title="Fill with current drawing equation"
              >
                <CopyCheck className="h-3 w-3" /> Fill from Current Drawing
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EQUATION_TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectTemplate(tmpl)}
                className="text-[10px] font-mono px-2 py-1 rounded border border-border bg-background hover:bg-accent hover:border-foreground transition-colors"
              >
                {tmpl.name}
              </button>
            ))}
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleApply} className="mt-4 flex flex-col gap-3">
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono font-bold flex items-center justify-between">
              <span>x(t) Equation:</span>
              <span className="text-[10px] font-normal text-muted-foreground">Parameter: t ∈ [0, 2π]</span>
            </label>
            <textarea
              rows={2}
              value={xExpr}
              onChange={(e) => setXExpr(e.target.value)}
              placeholder="e.g. 150 * cos(3 * t) or paste from Copy x"
              className="p-2 rounded border border-border bg-background font-mono text-xs text-foreground focus:border-foreground focus:outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono font-bold flex items-center justify-between">
              <span>y(t) Equation:</span>
              <span className="text-[10px] font-normal text-muted-foreground">Parameter: t ∈ [0, 2π]</span>
            </label>
            <textarea
              rows={2}
              value={yExpr}
              onChange={(e) => setYExpr(e.target.value)}
              placeholder="e.g. 150 * sin(2 * t) or paste from Copy y"
              className="p-2 rounded border border-border bg-background font-mono text-xs text-foreground focus:border-foreground focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded bg-destructive/10 border border-destructive text-destructive text-[11px] font-mono leading-tight">
              {error}
            </div>
          )}

          <div className="text-[10px] text-muted-foreground font-mono bg-background/50 p-2 rounded border border-border/60">
            ✓ You can directly paste copied equations (including LaTeX like <code className="text-foreground">\cos(-2t +1.26)</code> or <code className="text-foreground">x(t) ≈ ...</code>).
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border mt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="font-bold gap-1.5">
              <Play className="h-3.5 w-3.5" />
              Trace with Pendulums
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
