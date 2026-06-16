export default function AdBannerPreview({ ad }) {
  return (
    <div className={`relative w-full h-24 bg-gradient-to-r ${ad.bg} rounded-xl overflow-hidden`}>
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '12px 12px' }} />
      <div className="relative h-full flex items-center px-4 gap-3">
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 border border-white/20 overflow-hidden">
          {ad.logo_url
            ? <img src={ad.logo_url} alt={ad.company} className="w-11 h-11 object-contain" />
            : <span className="font-heading text-xl font-bold text-foreground">{ad.company[0]}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70" style={{ color: ad.accent }}>{ad.label}</p>
          <p className="text-white font-heading font-bold text-base leading-tight">{ad.headline}</p>
          <p className="text-white/70 text-[11px] truncate mt-0.5">{ad.sub}</p>
        </div>
      </div>
    </div>
  );
}