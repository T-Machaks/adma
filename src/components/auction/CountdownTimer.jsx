import { useState, useEffect } from 'react';

function diffParts(targetIso) {
  const ms = new Date(targetIso) - new Date();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

export default function CountdownTimer({ target, endedLabel = 'Closed', className = '' }) {
  const [parts, setParts] = useState(() => diffParts(target));

  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setParts(diffParts(target)), 1000);
    return () => clearInterval(t);
  }, [target]);

  if (!target) return null;
  if (!parts) return <span className={className}>{endedLabel}</span>;

  const urgent = parts.d === 0 && parts.h === 0 && parts.m < 5;
  const text = parts.d > 0
    ? `${parts.d}d ${parts.h}h ${parts.m}m`
    : parts.h > 0
      ? `${parts.h}h ${parts.m}m ${parts.s}s`
      : `${parts.m}m ${parts.s}s`;

  return <span className={`${className} ${urgent ? 'text-red-500 font-bold' : ''}`}>{text}</span>;
}
