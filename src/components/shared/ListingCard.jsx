import { Link } from 'react-router-dom';

// Classifieds-style tile for job/tender/collaboration listing grids — used inside a
// CSS multi-column (`columns-*`) container, not a CSS grid. Images render at their
// natural aspect ratio (no forced crop/aspect-ratio), so tiles end up different
// heights depending on what was actually uploaded — that variety, plus each column
// packing tiles top-to-bottom independently, is what gives the print-classifieds look
// instead of one uniform row of identical thumbnails.
export default function ListingCard({ to, title, companyName, imageUrl, displayFormat, icon: Icon, meta }) {
  const featured = displayFormat === 'featured_banner';
  const hasImage = displayFormat !== 'text' && !!imageUrl;

  return (
    <Link
      to={to}
      className={`block break-inside-avoid mb-3 rounded-xl overflow-hidden border bg-card hover:shadow-md transition-shadow ${
        featured ? 'border-amber/40 shadow-sm' : 'border-border'
      }`}
    >
      {hasImage && <img src={imageUrl} alt="" className="w-full h-auto block" />}
      <div className="p-3.5">
        {featured && (
          <span className="inline-block text-[9px] font-bold uppercase tracking-wide text-amber bg-amber/10 px-2 py-0.5 rounded-full mb-1.5">
            Featured
          </span>
        )}
        <div className="flex items-start gap-2">
          {!hasImage && Icon && <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <p className={featured ? 'font-heading font-bold text-base leading-tight' : 'font-semibold text-sm leading-tight'}>{title}</p>
            <p className="text-xs text-amber font-medium mt-0.5">{companyName}</p>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2 text-[11px] text-muted-foreground">
              {meta}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
