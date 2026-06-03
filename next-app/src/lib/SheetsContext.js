'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { pickActiveSheet, isMonthSheet } from '@/lib/attendance';

const SheetsContext = createContext(null);

export function SheetsProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSheet, setActiveSheet] = useState('');

  const fetchData = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sheets', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load sheets');
      setData(json);
      const sheetNames = Object.keys(json.sheets || {});
      setActiveSheet(prev => pickActiveSheet(sheetNames, prev || ''));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
    const intervalId = setInterval(fetchData, 5000);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  const value = useMemo(() => {
    const sheetNames = data ? Object.keys(data.sheets) : [];
    const monthSheets = sheetNames.filter(isMonthSheet);
    const activeSheetData = data && activeSheet ? data.sheets[activeSheet] : null;
    return {
      data,
      loading,
      error,
      activeSheet,
      setActiveSheet,
      sheetNames,
      monthSheets,
      activeSheetData,
      refresh: fetchData,
    };
  }, [data, loading, error, activeSheet, fetchData]);

  return <SheetsContext.Provider value={value}>{children}</SheetsContext.Provider>;
}

export function useSheets() {
  const ctx = useContext(SheetsContext);
  if (!ctx) throw new Error('useSheets must be used inside SheetsProvider');
  return ctx;
}
