const TIER_STYLES = {
  Platinum: 'badge-platinum',
  Gold:     'badge-gold',
  Silver:   'badge-silver',
  Bronze:   'badge-bronze',
};

export default function TierBadge({ tier }) {
  if (!tier) return null;
  const cls = TIER_STYLES[tier] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cls}`}>
      {tier}
    </span>
  );
}
