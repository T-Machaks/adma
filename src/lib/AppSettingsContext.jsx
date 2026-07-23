import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppSettings } from '@/api/entities/AppSettings';

const AppSettingsContext = createContext(null);

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    virtualExhibitionOpen: false,
    physicalEventRegistrationUrl: 'https://agrishow.co.zw/',
    ccSalesAuctionUrl: '',
    paidFeatureRequestEmail: '',
    marketingVideoUrl: '',
    eventDatesLabel: '01 Aug 2026 – 30 May 2027',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AppSettings.get().then(s => {
      setSettings(s);
      setIsLoading(false);
    });
  }, []);

  const updateSettings = useCallback(async (data) => {
    const updated = await AppSettings.update(data);
    setSettings(updated);
    return updated;
  }, []);

  return (
    <AppSettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}