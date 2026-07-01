import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ZoomIn, ZoomOut, RotateCcw, Navigation2, Calendar, Phone, Globe, Mail, X, MapPin, Info } from 'lucide-react';
import { Exhibitor } from '@/api/entities';
import TierBadge from '@/components/ui/TierBadge';
import { EVENT_CONFIG } from '@/lib/eventConfig';
import { SITE_PLAN_SPOTS } from '@/lib/sitePlanSpots';

const TIER_COLORS = {
  Platinum: '#16a34a',
  Gold:     '#eab308',
  Silver:   '#94a3b8',
  Bronze:   '#92400e',
};

const IMG_W = 2202;
const IMG_H = 1306;

// ART Farm, Pomona, Harare
const VENUE_LAT = -17.8087;
const VENUE_LNG = 31.0510;

function norm(s) {
  return (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function matchExhibitor(spotTitle, exhibitors) {
  const t = norm(spotTitle);
  if (!t) return null;
  let best = null;
  for (const e of exhibitors) {
    const n = norm(e.name);
    if (!n) continue;
    if (n === t) return e;
    if (n.length >= 4 && (t.startsWith(n) || n.startsWith(t))) {
      if (!best || n.length > norm(best.name).length) best = e;
    }
  }
  return best;
}

export default function SitePlan() {
  const [zoom, setZoom] = useState(1);
  const [selectedTitle, setSelectedTitle] = useState(null);
  const [locating, setLocating] = useState(false);

  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors'],
    queryFn: () => Exhibitor.list(),
  });

  const spotExhibitorMap = useMemo(() => {
    const map = new Map();
    for (const spot of SITE_PLAN_SPOTS) {
      map.set(spot.title, matchExhibitor(spot.title, exhibitors));
    }
    return map;
  }, [exhibitors]);

  const handleGetDirections = () => {
    const dest = `${VENUE_LAT},${VENUE_LNG}`;
    setLocating(true);
    if (!navigator.geolocation) {
      setLocating(false);
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        window.open(
          `https://www.google.com/maps/dir/${coords.latitude},${coords.longitude}/${dest}`,
          '_blank'
        );
      },
      () => {
        setLocating(false);
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
      },
      { timeout: 6000 }
    );
  };

  const selSpot = selectedTitle ? SITE_PLAN_SPOTS.find(s => s.title === selectedTitle) : null;
  const selExhibitor = selectedTitle ? spotExhibitorMap.get(selectedTitle) : null;

  return (
    <div className="pb-24 max-w-6xl mx-auto">
      <div className="px-4 pt-5 mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Site Plan</h1>
          <p className="text-muted-foreground text-sm mt-1">{EVENT_CONFIG.venue} — tap a stand for details</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setZoom(z => Math.max(1, z - 0.25))} className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs w-10 text-center font-medium">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
          {zoom !== 1 && (
            <button onClick={() => setZoom(1)} className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Landscape map — edge-to-edge on mobile so it renders as large as possible */}
      <div className="sm:px-4">
        <div className="bg-card sm:border sm:border-border sm:rounded-xl overflow-auto">
          <div
            className="relative transition-transform duration-200"
            style={{ width: `${zoom * 100}%`, minWidth: '100%', transformOrigin: 'top left' }}
          >
            <div className="relative w-full" style={{ aspectRatio: `${IMG_W} / ${IMG_H}` }}>
              <img
                src="/site-plan-2026.png"
                alt="ADMA Agri Show 2026 official site plan"
                className="absolute inset-0 w-full h-full select-none"
                draggable={false}
              />
              {SITE_PLAN_SPOTS.map(spot => {
                const ex = spotExhibitorMap.get(spot.title);
                const isSelected = selectedTitle === spot.title;
                const color = ex ? (TIER_COLORS[ex.tier] || '#16a34a') : '#64748b';
                return (
                  <button
                    key={`${spot.title}-${spot.x}-${spot.y}`}
                    onClick={() => setSelectedTitle(isSelected ? null : spot.title)}
                    title={spot.title}
                    className="absolute transition-all duration-150"
                    style={{
                      left: `${spot.x}%`,
                      top: `${spot.y}%`,
                      width: `${spot.w}%`,
                      height: `${spot.h}%`,
                      background: isSelected ? `${color}55` : 'transparent',
                      border: isSelected ? `2px solid ${color}` : '1px solid transparent',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = `${color}33`; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 lg:grid lg:grid-cols-3 lg:gap-4 space-y-3 lg:space-y-0">
        {/* Legend */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Legend</p>
          <div className="flex gap-3 flex-wrap">
            {EVENT_CONFIG.exhibitorTiers.map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: TIER_COLORS[t] }} />
                <span className="text-xs text-muted-foreground font-medium">{t}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#64748b' }} />
              <span className="text-xs text-muted-foreground font-medium">Other exhibitor</span>
            </div>
          </div>
        </div>

        {/* Selected stand info panel */}
        <div className="lg:col-span-2">
          {selSpot ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {selExhibitor ? (
                <>
                  {selExhibitor.booth_image_url && (
                    <img
                      src={selExhibitor.booth_image_url}
                      alt={`${selExhibitor.name} booth`}
                      className="w-full h-40 object-cover"
                    />
                  )}

                  <div className="p-4 flex items-start gap-3">
                    <div className="w-11 h-11 bg-white border border-border rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {selExhibitor.logo_url
                        ? <img src={selExhibitor.logo_url} alt={selExhibitor.name} className="w-10 h-10 object-contain" />
                        : <span className="font-heading text-lg font-bold text-muted-foreground">{selExhibitor.name?.[0] ?? '?'}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm leading-tight">{selExhibitor.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {selExhibitor.section} · Booth {selExhibitor.booth}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <TierBadge tier={selExhibitor.tier} />
                          <button onClick={() => setSelectedTitle(null)} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {selExhibitor.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{selExhibitor.description}</p>
                      )}
                    </div>
                  </div>

                  {(selExhibitor.contact_email || selExhibitor.phone || selExhibitor.contact_phone) && (
                    <div className="border-t border-border px-4 py-2.5 flex gap-4 flex-wrap">
                      {selExhibitor.contact_email && (
                        <a href={`mailto:${selExhibitor.contact_email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                          <Mail className="w-3 h-3" /> {selExhibitor.contact_email}
                        </a>
                      )}
                      {(selExhibitor.phone || selExhibitor.contact_phone) && (
                        <a href={`tel:${selExhibitor.phone || selExhibitor.contact_phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                          <Phone className="w-3 h-3" /> {selExhibitor.phone || selExhibitor.contact_phone}
                        </a>
                      )}
                    </div>
                  )}

                  <div className="border-t border-border px-4 py-3 flex flex-wrap gap-2">
                    <button
                      onClick={handleGetDirections}
                      disabled={locating}
                      className="flex items-center gap-1.5 text-xs bg-steel text-white px-3 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-60 active:scale-95 transition-all"
                    >
                      <Navigation2 className="w-3.5 h-3.5" />
                      {locating ? 'Locating…' : 'Get Directions'}
                    </button>
                    <Link
                      to="/meetings"
                      state={{ exhibitor: selExhibitor }}
                      className="flex items-center gap-1.5 text-xs bg-amber text-white px-3 py-2 rounded-lg font-semibold hover:opacity-90 active:scale-95 transition-all"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Book Meeting
                    </Link>
                    {selExhibitor.website && (
                      <a
                        href={selExhibitor.website}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs border border-border px-3 py-2 rounded-lg font-medium hover:bg-muted transition-colors ml-auto"
                      >
                        <Globe className="w-3.5 h-3.5" /> Website
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-500">
                    <span className="text-white text-xs font-bold">{selSpot.title[0]}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{selSpot.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Not yet listed as a digital exhibitor profile.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGetDirections}
                      disabled={locating}
                      className="flex items-center gap-1 text-xs bg-steel text-white px-2.5 py-1.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60 transition-all"
                    >
                      <Navigation2 className="w-3 h-3" />
                      {locating ? '…' : 'Directions'}
                    </button>
                    <button onClick={() => setSelectedTitle(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 h-full">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <p>This is the official ADMA 2026 site plan. Tap any stand on the map to see who's exhibiting there — pinch or use the zoom controls to explore the layout in detail.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
