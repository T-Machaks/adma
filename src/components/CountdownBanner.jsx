import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { useAppSettings } from '@/lib/AppSettingsContext';
import { EVENT_CONFIG } from '@/lib/eventConfig';

function calcTimeLeft(targetDate) {
  const diff = new Date(targetDate) - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function Segment({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-heading text-2xl sm:text-3xl font-bold text-amber leading-none tabular-nums">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[9px] uppercase tracking-widest text-white/50 mt-0.5">{label}</span>
    </div>
  );
}

export default function CountdownBanner() {
  const { settings } = useAppSettings();
  const target = settings?.event_start_date;
  const [timeLeft, setTimeLeft] = useState(() => target ? calcTimeLeft(target) : null);

  useEffect(() => {
    if (!target) return;
    setTimeLeft(calcTimeLeft(target));
    const t = setInterval(() => {
      const tl = calcTimeLeft(target);
      setTimeLeft(tl);
      if (!tl) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [target]);

  if (!target || !timeLeft) return null;

  return (
    <div className="bg-steel border-b border-white/10 px-4 py-3">
      <div className="max-w-2xl lg:max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Timer className="w-4 h-4 text-amber flex-shrink-0" />
          <p className="text-white text-xs font-semibold truncate">{EVENT_CONFIG.eventFullName} opens in</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Segment value={timeLeft.days} label="days" />
          <span className="text-amber font-bold text-lg">:</span>
          <Segment value={timeLeft.hours} label="hrs" />
          <span className="text-amber font-bold text-lg">:</span>
          <Segment value={timeLeft.minutes} label="min" />
          <span className="text-amber font-bold text-lg">:</span>
          <Segment value={timeLeft.seconds} label="sec" />
        </div>
      </div>
    </div>
  );
}
