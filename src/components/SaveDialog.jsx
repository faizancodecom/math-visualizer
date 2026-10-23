import React, { useState, useEffect, useRef } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SaveDialog({ isOpen, onClose, onSave, pointsCount, termsCount }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName(`Drawing ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim());
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-50 w-full max-w-sm rounded-lg border-2 border-foreground bg-card p-5 shadow-2xl modal-animate-in select-none">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            <h3 className="text-sm font-bold tracking-tight">Save Drawing</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Drawing Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Infinity Wave"
              maxLength={40}
              className="h-9 px-3 rounded-md border-2 border-border bg-background text-foreground text-xs font-medium focus:border-foreground focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground px-1">
            <span>Points: {pointsCount}</span>
            <span>Harmonics: {termsCount} terms</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="font-bold">
              Save to Memory
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
