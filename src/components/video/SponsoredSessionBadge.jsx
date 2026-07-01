import { Sparkles } from 'lucide-react';

export default function SponsoredSessionBadge({ sponsorName, sponsorLogo, compact = false }) {
  if (!sponsorName && !sponsorLogo) return null;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber/20 text-amber">
        <Sparkles className="w-2.5 h-2.5" />
        {sponsorName || 'Sponsored'}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-amber/10 border border-amber/20 rounded-lg">
      <Sparkles className="w-3.5 h-3.5 text-amber flex-shrink-0" />
      <span className="text-xs text-muted-foreground">Presented by</span>
      {sponsorLogo ? (
        <img src={sponsorLogo} alt={sponsorName} className="h-5 object-contain" />
      ) : (
        <span className="text-xs font-bold text-amber">{sponsorName}</span>
      )}
    </div>
  );
}
