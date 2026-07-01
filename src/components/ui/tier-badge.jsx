const tierConfig = {
  Platinum: { label: 'Platinum', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  Gold: { label: 'Gold', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  Silver: { label: 'Silver', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300' },
  Bronze: { label: 'Bronze', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
};

export default function TierBadge({ tier }) {
  const cfg = tierConfig[tier] || tierConfig.Bronze;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
