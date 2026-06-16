const TIER_STYLES = {
  Diamond: 'badge-diamond',
  Gold:    'badge-gold',
  Chrome:  'badge-chrome',
  Copper:  'badge-copper',
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
