import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Upload, ZoomIn, ZoomOut, Info, Navigation2, Calendar, Phone, Globe, Mail, X, MapPin } from 'lucide-react';
import { Exhibitor } from '@/api/entities';
import TierBadge from '@/components/ui/TierBadge';
import { EVENT_CONFIG } from '@/lib/eventConfig';

const LEGEND = [
  { label: 'Platinum', color: 'bg-emerald-600' },
  { label: 'Gold', color: 'bg-yellow-400' },
  { label: 'Silver', color: 'bg-slate-400' },
  { label: 'Bronze', color: 'bg-orange-800' },
];

const ZONES = [
  { id: 'M1',  label: 'M1',  x: 4,  y: 30, w: 8,  h: 18, tier: 'Platinum', section: 'Machinery',  company: 'Afritractors' },
  { id: 'M4',  label: 'M4',  x: 4,  y: 50, w: 8,  h: 16, tier: 'Platinum', section: 'Machinery',  company: 'Agricon' },
  { id: 'M5',  label: 'M5',  x: 4,  y: 68, w: 8,  h: 10, tier: 'Gold',    section: 'Machinery',   company: 'Croco Motors' },
  { id: 'C8',  label: 'C8',  x: 30, y: 25, w: 16, h: 10, tier: 'Platinum', section: 'Suppliers',  company: 'Agriforce' },
  { id: 'C9',  label: 'C9',  x: 60, y: 25, w: 16, h: 10, tier: 'Platinum', section: 'Suppliers',  company: 'Amcotts' },
  { id: 'E10', label: 'E10', x: 30, y: 40, w: 16, h: 10, tier: 'Gold',    section: 'Suppliers',   company: 'Amtec' },
  { id: 'E11', label: 'E11', x: 60, y: 40, w: 16, h: 10, tier: 'Gold',    section: 'Suppliers',   company: 'Bain' },
  { id: 'H10', label: 'H10', x: 30, y: 55, w: 16, h: 10, tier: 'Silver',  section: 'Suppliers',   company: 'Brown Engineering Group' },
  { id: 'H11', label: 'H11', x: 60, y: 55, w: 16, h: 10, tier: 'Silver',  section: 'Suppliers',   company: 'Centre Pivot Irrigation' },
  { id: 'J8',  label: 'J8',  x: 30, y: 68, w: 16, h: 10, tier: 'Gold',    section: 'Suppliers',   company: 'Cloverleaf Motors' },
  { id: 'J9',  label: 'J9',  x: 60, y: 68, w: 16, h: 10, tier: 'Gold',    section: 'Suppliers',   company: 'Zimplow' },
  { id: 'L7',  label: 'L7',  x: 18, y: 80, w: 10, h: 8,  tier: 'Platinum', section: 'Machinery',  company: 'Bulawayo Steel' },
  { id: 'L10', label: 'L10', x: 30, y: 80, w: 16, h: 8,  tier: 'Gold',    section: 'Machinery',   company: 'CBZ Agro-Yield' },
  { id: 'L11', label: 'L11', x: 60, y: 80, w: 16, h: 8,  tier: 'Silver',  section: 'Machinery',   company: 'Windmill' },
];

const SMALL_BOOTHS = [
  { id: 'B5',  label: 'B5',  x: 20, y: 26, tier: 'Bronze' },
  { id: 'B6',  label: 'B6',  x: 25, y: 26, tier: 'Bronze' },
  { id: 'B7',  label: 'B7',  x: 30, y: 26, tier: 'Bronze' },
  { id: 'C5',  label: 'C5',  x: 20, y: 30, tier: 'Silver' },
  { id: 'C6',  label: 'C6',  x: 25, y: 30, tier: 'Silver' },
  { id: 'CP1', label: 'CP1', x: 48, y: 88, tier: 'Bronze' },
  { id: 'CP2', label: 'CP2', x: 53, y: 88, tier: 'Bronze' },
  { id: 'CP3', label: 'CP3', x: 58, y: 88, tier: 'Bronze' },
  { id: 'CP7', label: 'CP7', x: 63, y: 88, tier: 'Bronze' },
  { id: 'CP8', label: 'CP8', x: 68, y: 88, tier: 'Bronze' },
];

const tierColors = {
  Platinum: '#16a34a',
  Gold:     '#eab308',
  Silver:   '#94a3b8',
  Bronze:   '#92400e',
};

// ART Farm, Pomona, Harare
const VENUE_LAT = -17.8087;
const VENUE_LNG = 31.0510;

function findExhibitorForZone(zoneCompany, exhibitors) {
  if (!zoneCompany || !exhibitors.length) return null;
  const primaryName = zoneCompany.toLowerCase().split(/[/,]/)[0].trim();
  const exact = exhibitors.find(e => e.name.toLowerCase() === primaryName);
  if (exact) return exact;
  return exhibitors.find(e => {
    const en = e.name.toLowerCase();
    return (
      en.startsWith(primaryName) ||
      primaryName.startsWith(en.split(' ')[0]) ||
      en.includes(primaryName) ||
      primaryName.includes(en.split(' ').slice(0, 2).join(' '))
    );
  }) || null;
}

export default function SitePlan() {
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);

  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors'],
    queryFn: () => Exhibitor.list(),
  });

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadedUrl(URL.createObjectURL(file));
    setUploading(false);
  };

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

  const allZones = [...ZONES, ...SMALL_BOOTHS];
  const sel = selected ? allZones.find(z => z.id === selected) : null;
  const selExhibitor = sel?.company ? findExhibitorForZone(sel.company, exhibitors) : null;

  return (
    <div className="pb-24 max-w-2xl lg:max-w-5xl mx-auto">
      <div className="px-4 pt-5 mb-4">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Site Plan</h1>
        <p className="text-muted-foreground text-sm mt-1">{EVENT_CONFIG.venue} — tap a booth for details</p>
      </div>

      {/* 2-col on desktop: map left, controls+legend+info right */}
      <div className="px-4 lg:grid lg:grid-cols-3 lg:gap-6">

        {/* Left col — upload controls + floor plan */}
        <div className="lg:col-span-2">
          {/* Upload + zoom controls */}
          <div className="mb-3 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs bg-card border border-border px-3 py-2 rounded-lg font-medium hover:bg-muted transition-colors">
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Uploading…' : uploadedUrl ? 'Replace Floor Plan' : 'Upload Floor Plan Image'}
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
            <div className="flex items-center gap-1 ml-auto">
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs w-10 text-center font-medium">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Floor plan */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {uploadedUrl ? (
              <div className="overflow-auto">
                <img
                  src={uploadedUrl}
                  alt="Site floor plan"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s' }}
                  className="max-w-none"
                />
              </div>
            ) : (
              <div className="overflow-auto">
                <svg
                  viewBox="0 0 100 100"
                  style={{ width: `${zoom * 100}%`, minWidth: '100%', aspectRatio: '1/1' }}
                  className="transition-all duration-200"
                >
                  <rect width="100" height="100" fill="#1e293b" />
                  <defs>
                    <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
                      <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#334155" strokeWidth="0.2" />
                    </pattern>
                  </defs>
                  <rect width="100" height="100" fill="url(#grid)" />

                  <text x="22" y="94" fill="#f59e0b" fontSize="3.5" fontWeight="bold" fontFamily="Barlow Condensed, sans-serif">← MACHINERY</text>
                  <text x="62" y="94" fill="#f59e0b" fontSize="3.5" fontWeight="bold" fontFamily="Barlow Condensed, sans-serif">SUPPLIERS & INPUTS →</text>

                  <rect x="44" y="8" width="12" height="5" rx="1" fill="#f59e0b" />
                  <text x="50" y="11.5" fill="white" fontSize="2" textAnchor="middle" fontWeight="bold">PUBLIC ENTRANCE</text>
                  <polygon points="50,13 48.5,16 51.5,16" fill="#f59e0b" />

                  <rect x="34" y="8" width="9" height="5" rx="1" fill="#475569" />
                  <text x="38.5" y="11.5" fill="white" fontSize="1.8" textAnchor="middle">SITE OFFICE</text>

                  {ZONES.map(z => (
                    <g key={z.id} onClick={() => setSelected(selected === z.id ? null : z.id)} style={{ cursor: 'pointer' }}>
                      <rect
                        x={z.x} y={z.y} width={z.w} height={z.h} rx="1"
                        fill={tierColors[z.tier]}
                        opacity={selected && selected !== z.id ? 0.4 : 0.85}
                        stroke={selected === z.id ? 'white' : 'transparent'}
                        strokeWidth="0.5"
                      />
                      <text x={z.x + z.w / 2} y={z.y + z.h / 2 - 1} fill="white" fontSize="2.5" textAnchor="middle" fontWeight="bold">{z.label}</text>
                      <text x={z.x + z.w / 2} y={z.y + z.h / 2 + 2.5} fill="white" fontSize="1.5" textAnchor="middle" opacity="0.9">{z.company?.split(' ').slice(0, 2).join(' ')}</text>
                    </g>
                  ))}

                  {SMALL_BOOTHS.map(b => (
                    <g key={b.id} onClick={() => setSelected(selected === b.id ? null : b.id)} style={{ cursor: 'pointer' }}>
                      <rect
                        x={b.x} y={b.y} width="4" height="4" rx="0.5"
                        fill={tierColors[b.tier]}
                        opacity={selected && selected !== b.id ? 0.3 : 0.75}
                        stroke={selected === b.id ? 'white' : 'transparent'}
                        strokeWidth="0.4"
                      />
                      <text x={b.x + 2} y={b.y + 2.8} fill="white" fontSize="1.3" textAnchor="middle" fontWeight="bold">{b.label}</text>
                    </g>
                  ))}

                  <rect x="76" y="8" width="6" height="4" rx="1" fill="#374151" />
                  <text x="79" y="10.5" fill="#9ca3af" fontSize="1.5" textAnchor="middle">TOILETS</text>
                  <rect x="48" y="74" width="6" height="4" rx="1" fill="#374151" />
                  <text x="51" y="76.5" fill="#9ca3af" fontSize="1.5" textAnchor="middle">TOILETS</text>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Right col — legend + selected booth info + tip */}
        <div className="lg:col-span-1 mt-4 lg:mt-0 space-y-3">
          {/* Legend */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Legend</p>
            <div className="flex gap-3 flex-wrap">
              {LEGEND.map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-sm ${l.color}`} />
                  <span className="text-xs text-muted-foreground font-medium">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected booth info panel */}
          {sel && (
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
                          <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
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
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: tierColors[sel.tier] }}
                  >
                    <span className="text-white text-xs font-bold">{sel.id}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{sel.label}{sel.company ? ` — ${sel.company}` : ''}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{sel.section || ''}{sel.tier ? ` · ${sel.tier} Tier` : ''}</p>
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
                    <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!uploadedUrl && !sel && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <p>This is a schematic layout. Upload the official floor plan image above for exact booth positions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}