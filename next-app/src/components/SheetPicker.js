'use client';

import { useState, useRef, useEffect } from 'react';
import { useSheets } from '@/lib/SheetsContext';
import { isMonthSheet } from '@/lib/attendance';

export default function SheetPicker() {
  const { sheetNames, activeSheet, setActiveSheet, loading, refresh } = useSheets();
  const months = sheetNames.filter(isMonthSheet);
  const [isOpen, setIsOpen] = useState(false);
  const [explicitSelection, setExplicitSelection] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-3 relative" ref={ref}>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading || !months.length}
          className={`bg-[var(--color-bg)] border rounded-lg px-4 py-1.5 text-sm focus:outline-none disabled:opacity-50 flex items-center gap-2 transition-colors hover:border-[var(--color-purple)] ${
            explicitSelection
              ? 'border-[var(--color-purple)] text-[var(--color-purple)] font-medium'
              : 'border-[var(--color-card-border)] text-[var(--color-text-main)]'
          }`}
        >
          {explicitSelection || 'Months'}
          <span className="text-[10px] opacity-70">▼</span>
        </button>
        
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-lg shadow-xl z-50 overflow-hidden backdrop-blur-xl max-h-[300px] overflow-y-auto">
            {months.length === 0 && <div className="px-4 py-2 text-sm text-[var(--color-text-muted)]">No months available</div>}
            {months.map(name => (
              <button
                key={name}
                onClick={() => {
                  setActiveSheet(name);
                  setExplicitSelection(name);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${activeSheet === name ? 'text-[var(--color-purple)] bg-[rgba(139,92,246,0.1)] font-medium' : 'text-[var(--color-text-main)]'}`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => {
          setExplicitSelection('');
          setActiveSheet('');
          refresh();
        }}
        disabled={loading}
        className="btn-outline py-1.5 px-3 text-sm disabled:opacity-50"
      >
        {loading ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  );
}
