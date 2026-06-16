import HTMLFlipBook from 'react-pageflip';
import { forwardRef, useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Play, BookOpen } from 'lucide-react';

// ── Page wrapper required by react-pageflip ──────────────────────────────────
const MagazinePage = forwardRef(function MagazinePage({ children }, ref) {
  return (
    <div ref={ref} className="relative overflow-hidden" style={{ backgroundColor: '#fff' }}>
      <div className="absolute inset-0">{children}</div>
    </div>
  );
});
MagazinePage.displayName = 'MagazinePage';

// ── Shared ───────────────────────────────────────────────────────────────────
function Strip({ label }) {
  return (
    <div className="flex items-center justify-between px-3 py-0.5 shrink-0" style={{ background: '#f59e0b' }}>
      <span className="text-slate-900 font-black uppercase tracking-widest" style={{ fontSize: 9 }}>{label}</span>
      <span className="text-slate-900 font-bold" style={{ fontSize: 9 }}>minecon.global</span>
    </div>
  );
}

function PNum({ n, right }) {
  return (
    <div className={`absolute bottom-1.5 ${right ? 'right-3' : 'left-3'} text-slate-400`} style={{ fontSize: 8 }}>{n}</div>
  );
}

function AdLink({ href, children, bg = '#fff', color = '#0f172a' }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 font-bold transition-opacity hover:opacity-90 active:opacity-75"
      style={{ background: bg, color, fontSize: 11, textDecoration: 'none' }}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      {children}
    </a>
  );
}

// ── PAGE 1: Cover ─────────────────────────────────────────────────────────────
function CoverPage() {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: 'linear-gradient(160deg,#080f1e 0%,#1e293b 60%,#080f1e 100%)' }}>
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0" style={{ background: '#f59e0b' }}>
        <span className="text-slate-900 font-black uppercase tracking-widest" style={{ fontSize: 9 }}>Official Exhibition Guide</span>
        <span className="text-slate-900 font-bold uppercase" style={{ fontSize: 9 }}>October 2026</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-between px-5 py-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle,#f59e0b 1.5px,transparent 1.5px)', backgroundSize: '20px 20px' }} />
        <div className="w-full flex justify-between items-start">
          <div className="w-11 h-11 rounded-full flex items-center justify-center border-2 border-amber-500" style={{ background: 'rgba(245,158,11,0.1)' }}>
            <span className="text-amber-400 font-black" style={{ fontSize: 15, fontFamily: 'Barlow Condensed,sans-serif' }}>MC</span>
          </div>
          <div className="text-right">
            <div className="text-slate-500 uppercase tracking-widest" style={{ fontSize: 8 }}>Vol. 1 · Issue 1</div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-amber-400 uppercase tracking-[0.3em] font-bold mb-1" style={{ fontSize: 9 }}>Southern Africa's Premier</div>
          <div className="font-black leading-none" style={{ fontFamily: 'Barlow Condensed,sans-serif', fontSize: 58, color: '#fff', lineHeight: 1 }}>
            MINE<span style={{ color: '#f59e0b' }}>CON</span>
          </div>
          <div className="font-black" style={{ fontFamily: 'Barlow Condensed,sans-serif', fontSize: 26, color: '#94a3b8', lineHeight: 1.2 }}>2026</div>
          <div className="text-slate-400 mt-1" style={{ fontSize: 10 }}>Mining & Construction Exhibition</div>
        </div>
        <div className="w-full rounded-lg overflow-hidden" style={{ height: 130, background: 'linear-gradient(135deg,#1e3a5f 0%,#334155 50%,#1a2744 100%)' }}>
          <div className="h-full flex items-center justify-center gap-3 opacity-50 px-4">
            {[['🚛','Heavy Vehicles'],['⛏️','Mining'],['🏗️','Construction']].map(([i,l]) => (
              <div key={l} className="flex flex-col items-center gap-1 flex-1">
                <div className="rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', width: 52, height: 52, fontSize: 22 }}>{i}</div>
                <div className="text-slate-400 text-center" style={{ fontSize: 8 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full rounded-lg px-3 py-2 flex justify-between" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          {[['80+','Exhibitors'],['2,000+','Visitors'],['4','Zones']].map(([n,l]) => (
            <div key={l} className="text-center">
              <div className="text-amber-400 font-black" style={{ fontSize: 15, fontFamily: 'Barlow Condensed,sans-serif' }}>{n}</div>
              <div className="text-slate-400" style={{ fontSize: 8 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 py-2 shrink-0" style={{ background: '#080f1e' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-amber-400 font-bold" style={{ fontSize: 10 }}>Artfarm Grounds, Pomona</div>
            <div className="text-slate-500" style={{ fontSize: 8 }}>Harare, Zimbabwe · October 2026</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400 font-bold" style={{ fontSize: 9 }}>Mining · Construction</div>
            <div className="text-slate-500" style={{ fontSize: 8 }}>Innovation · Services</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PAGE 2: Welcome ───────────────────────────────────────────────────────────
function WelcomePage() {
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Welcome" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-2.5 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-amber-200 pb-2 shrink-0">
          <div className="w-7 h-7 rounded flex items-center justify-center text-white font-black shrink-0" style={{ background: '#f59e0b', fontSize: 12, fontFamily: 'Barlow Condensed,sans-serif' }}>MC</div>
          <div>
            <div className="font-black uppercase text-slate-800" style={{ fontSize: 15, fontFamily: 'Barlow Condensed,sans-serif' }}>Welcome to MineCon 2026</div>
            <div className="text-slate-500" style={{ fontSize: 9 }}>A Message from the Organising Committee</div>
          </div>
        </div>
        <div className="w-full rounded overflow-hidden shrink-0" style={{ height: 75, background: 'linear-gradient(135deg,#1e293b 0%,#334155 100%)' }}>
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-white opacity-50">
              <div style={{ fontSize: 24 }}>⛏️</div>
              <div className="uppercase tracking-widest font-bold" style={{ fontSize: 8 }}>Artfarm Grounds · Harare</div>
            </div>
          </div>
        </div>
        <div className="text-slate-600 leading-relaxed flex-1" style={{ fontSize: 9.5 }}>
          <p className="mb-2">Dear Visitor,</p>
          <p className="mb-2">On behalf of the MineCon 2026 Organising Committee, it is with great pride and excitement that we welcome you to Southern Africa's most anticipated mining and construction exhibition.</p>
          <p className="mb-2">This inaugural event brings together over <strong>80 exhibitors</strong> — from heavy equipment manufacturers and mining technology innovators to financial service providers and environmental solution specialists — all under one roof at <strong>Artfarm Grounds, Pomona, Harare</strong>.</p>
          <p className="mb-2">Zimbabwe's mining sector is experiencing a renaissance. MineCon 2026 is the platform where deals are made, partnerships are forged, and the future of our industry is shaped.</p>
          <p>Whether you are an operator seeking the latest equipment or an investor exploring mineral wealth potential — MineCon 2026 is the place to be.</p>
        </div>
        <div className="border-t border-slate-100 pt-2 flex items-center justify-between shrink-0">
          <div>
            <div className="font-bold text-slate-800" style={{ fontSize: 10 }}>The MineCon 2026</div>
            <div className="text-amber-600 font-bold" style={{ fontSize: 9 }}>Organising Committee</div>
          </div>
          <div className="text-slate-400 text-right" style={{ fontSize: 8 }}>
            <div>minecon.global</div>
            <div>#MineCon2026</div>
          </div>
        </div>
      </div>
      <PNum n={2} />
    </div>
  );
}

// ── PAGE 3: Contents ──────────────────────────────────────────────────────────
function ContentsPage() {
  const items = [
    ['04','Event Overview','Dates, venues & what to expect'],
    ['06','Diamond Sponsors','Our premier exhibition partners'],
    ['08','Exhibition Site Map','Zone guide & booth finder'],
    ['10','Industry Insights','Zimbabwe Mining Sector 2026'],
    ['12','Product Spotlights','Must-see equipment on show'],
    ['14','Exhibitor Directory','Full listing of all exhibitors'],
    ['16','Why MineCon?','Networking & business opportunities'],
  ];
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Contents" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-2 overflow-hidden">
        <div className="shrink-0">
          <div className="text-slate-400 uppercase tracking-widest" style={{ fontSize: 8 }}>MineCon 2026</div>
          <div className="font-black uppercase text-slate-900" style={{ fontSize: 22, fontFamily: 'Barlow Condensed,sans-serif', lineHeight: 1 }}>CONTENTS</div>
          <div className="h-0.5 w-10 mt-1" style={{ background: '#f59e0b' }} />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          {items.map(([num, title, sub]) => (
            <div key={num} className="flex items-start gap-3 py-1.5 border-b border-slate-100">
              <div className="font-black text-amber-500 shrink-0" style={{ fontSize: 15, fontFamily: 'Barlow Condensed,sans-serif', minWidth: 22 }}>{num}</div>
              <div>
                <div className="font-bold text-slate-800" style={{ fontSize: 10.5 }}>{title}</div>
                <div className="text-slate-400" style={{ fontSize: 8.5 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg p-2.5 shrink-0" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)' }}>
          <div className="text-amber-400 font-bold" style={{ fontSize: 9 }}>Clickable Ads Throughout This Magazine</div>
          <div className="text-slate-300 mt-0.5" style={{ fontSize: 8 }}>Look for the <span style={{ color: '#f59e0b' }}>↗ Visit Website</span> buttons on sponsor pages to explore exhibitor resources and product demos.</div>
        </div>
      </div>
      <PNum n={3} right />
    </div>
  );
}

// ── PAGE 4: SANY Ad (CLICKABLE) ───────────────────────────────────────────────
function SANYAdPage() {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: 'linear-gradient(160deg,#92400e 0%,#b45309 45%,#d97706 100%)' }}>
      <div className="px-5 pt-3 pb-1 shrink-0">
        <div className="text-amber-200 uppercase tracking-widest font-bold" style={{ fontSize: 8 }}>Diamond Sponsor · Booth A07</div>
      </div>
      <div className="px-5 flex-1 flex flex-col justify-between overflow-hidden">
        <div>
          <div className="font-black text-white leading-none" style={{ fontSize: 44, fontFamily: 'Barlow Condensed,sans-serif', lineHeight: 1 }}>SANY</div>
          <div className="font-black text-amber-200 leading-none" style={{ fontSize: 28, fontFamily: 'Barlow Condensed,sans-serif' }}>ZIMBABWE</div>
          <div className="text-amber-100 font-medium mt-1" style={{ fontSize: 10 }}>World-Class Equipment for African Conditions</div>
        </div>
        <div className="w-full rounded-xl overflow-hidden my-2 flex items-center justify-center" style={{ height: 110, background: 'rgba(0,0,0,0.3)' }}>
          <div className="text-center">
            <div style={{ fontSize: 38 }}>🏗️</div>
            <div className="text-amber-200 font-bold mt-1" style={{ fontSize: 9 }}>Heavy Equipment · Lifting · Concrete</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {['Excavators','Tower Cranes','Concrete Pumps','Road Machines'].map(c => (
            <div key={c} className="rounded px-2 py-1.5 text-center" style={{ background: 'rgba(0,0,0,0.25)' }}>
              <div className="text-white font-bold" style={{ fontSize: 9.5 }}>{c}</div>
            </div>
          ))}
        </div>
        <AdLink href="https://www.sanyglobal.com" bg="#fff" color="#92400e">
          <ExternalLink size={13} /> Visit www.sanyglobal.com ↗
        </AdLink>
      </div>
      <div className="px-5 py-2 flex items-center justify-between shrink-0">
        <div className="text-amber-200" style={{ fontSize: 8 }}>Booth A07 · Main Hall</div>
        <div className="rounded px-2 py-0.5 text-amber-900 font-bold" style={{ background: '#fde68a', fontSize: 8 }}>DIAMOND SPONSOR</div>
      </div>
      <PNum n={4} />
    </div>
  );
}

// ── PAGE 5: Event Overview ────────────────────────────────────────────────────
function EventOverviewPage() {
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Event Overview" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-2.5 overflow-hidden">
        <div className="shrink-0">
          <div className="text-slate-400 uppercase tracking-widest" style={{ fontSize: 8 }}>MineCon 2026</div>
          <div className="font-black text-slate-900 leading-tight" style={{ fontSize: 20, fontFamily: 'Barlow Condensed,sans-serif' }}>EVENT OVERVIEW</div>
          <div className="h-0.5 w-10 mt-0.5" style={{ background: '#f59e0b' }} />
        </div>
        <div className="grid grid-cols-2 gap-2 shrink-0">
          {[['📅','Dates','October 2026'],['📍','Venue','Artfarm, Pomona'],['🕐','Hours','08:00 – 18:00'],['🎫','Entry','Free (Registered)']].map(([i,l,v]) => (
            <div key={l} className="rounded-lg p-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 16 }}>{i}</div>
              <div className="text-slate-500 mt-0.5" style={{ fontSize: 8 }}>{l}</div>
              <div className="font-bold text-slate-800" style={{ fontSize: 10 }}>{v}</div>
            </div>
          ))}
        </div>
        <div className="rounded-lg px-3 py-2 grid grid-cols-3 gap-2 shrink-0" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)' }}>
          {[['80+','Exhibitors'],['2,000+','Visitors'],['4','Zones']].map(([n,l]) => (
            <div key={l} className="text-center">
              <div className="text-amber-400 font-black" style={{ fontSize: 16, fontFamily: 'Barlow Condensed,sans-serif' }}>{n}</div>
              <div className="text-slate-400" style={{ fontSize: 8 }}>{l}</div>
            </div>
          ))}
        </div>
        <div className="shrink-0">
          <div className="text-slate-700 font-bold uppercase tracking-wide mb-1.5" style={{ fontSize: 10 }}>Exhibition Zones</div>
          <div className="flex flex-col gap-1.5">
            {[['#3b82f6','A','Main Hall','Diamond'],['#eab308','B','Exhibition Hall','Gold'],['#94a3b8','C','Suppliers Zone','Chrome'],['#c2824a','D','Solutions Zone','Copper']].map(([col,z,n,t]) => (
              <div key={z} className="flex items-center gap-2">
                <div className="rounded shrink-0" style={{ width: 10, height: 10, background: col }} />
                <span className="font-bold text-slate-800" style={{ fontSize: 10 }}>Zone {z} – {n}</span>
                <span className="text-slate-400" style={{ fontSize: 9 }}>· {t} Exhibitors</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg p-2.5 mt-auto shrink-0" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div className="text-amber-800 font-bold" style={{ fontSize: 9.5 }}>What to Expect</div>
          <div className="text-amber-700 mt-0.5" style={{ fontSize: 8.5 }}>Live demos · Industry keynotes · Networking · Technology showcases · Procurement opportunities</div>
        </div>
      </div>
      <PNum n={5} right />
    </div>
  );
}

// ── PAGE 6: Steel Warehouse Holdings ─────────────────────────────────────────
function SteelWarehousePage() {
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Diamond Exhibitor Profile" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-2.5 overflow-hidden">
        <div className="rounded-lg overflow-hidden shrink-0" style={{ height: 65, background: 'linear-gradient(135deg,#1e293b 0%,#334155 100%)' }}>
          <div className="h-full flex items-center px-4 gap-3">
            <div className="w-11 h-11 rounded-lg flex items-center justify-center text-xl shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>🏗️</div>
            <div>
              <div className="text-amber-400 uppercase tracking-widest" style={{ fontSize: 7.5 }}>Diamond Sponsor · Booth A01</div>
              <div className="text-white font-black" style={{ fontSize: 14, fontFamily: 'Barlow Condensed,sans-serif' }}>STEEL WAREHOUSE HOLDINGS</div>
            </div>
          </div>
        </div>
        <div className="text-slate-600 font-semibold shrink-0" style={{ fontSize: 10 }}>Zimbabwe's Leading Steel & Metal Products Supplier</div>
        <div className="text-slate-600 leading-relaxed shrink-0" style={{ fontSize: 9.5 }}>Steel Warehouse Holdings is the country's foremost distributor of structural steel, flat-rolled products, and metal solutions. Supplying Zimbabwe's construction, mining, and manufacturing sectors for decades, they bring unmatched inventory depth and technical expertise to every project.</div>
        <div className="shrink-0">
          <div className="text-slate-700 font-bold mb-1" style={{ fontSize: 10 }}>Products on Display:</div>
          <div className="grid grid-cols-2 gap-1">
            {['Structural Steel (H & I Beams)','Flat-Rolled Sheet & Plate','Steel Pipes & Tubing','Roofing & Cladding Sheets','Wire Rods & Rebar','Mining Support Structures'].map(p => (
              <div key={p} className="flex items-start gap-1" style={{ fontSize: 9 }}>
                <span className="text-amber-500 font-bold shrink-0" style={{ lineHeight: '14px' }}>›</span>
                <span className="text-slate-600">{p}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg p-2 shrink-0" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[['30+','Years'],['500+','Products'],['24/7','Delivery']].map(([n,l]) => (
              <div key={l}>
                <div className="text-slate-800 font-black" style={{ fontSize: 14, fontFamily: 'Barlow Condensed,sans-serif' }}>{n}</div>
                <div className="text-slate-400" style={{ fontSize: 8 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-slate-500" style={{ fontSize: 8 }}>📍 Booth A01 · Main Hall</div>
          <div className="text-slate-500" style={{ fontSize: 8 }}>steelwarehouse.co.zw</div>
        </div>
      </div>
      <PNum n={6} />
    </div>
  );
}

// ── PAGE 7: Isuzu Zimbabwe (CLICKABLE) ───────────────────────────────────────
function IsuzuPage() {
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Diamond Exhibitor Profile" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-2.5 overflow-hidden">
        <div className="rounded-lg overflow-hidden shrink-0" style={{ height: 65, background: 'linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%)' }}>
          <div className="h-full flex items-center px-4 gap-3">
            <div className="w-11 h-11 rounded-lg flex items-center justify-center text-xl shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>🚛</div>
            <div>
              <div className="text-blue-200 uppercase tracking-widest" style={{ fontSize: 7.5 }}>Diamond Sponsor · Booth A02</div>
              <div className="text-white font-black" style={{ fontSize: 17, fontFamily: 'Barlow Condensed,sans-serif' }}>ISUZU ZIMBABWE</div>
            </div>
          </div>
        </div>
        <div className="text-slate-600 font-semibold shrink-0" style={{ fontSize: 10 }}>Official Isuzu Commercial Vehicle Dealer for Zimbabwe</div>
        <div className="text-slate-600 leading-relaxed shrink-0" style={{ fontSize: 9.5 }}>Isuzu Zimbabwe is the authorised dealer for commercial vehicles across Zimbabwe. From light delivery vans to heavy-duty mining trucks, Isuzu's legendary reliability makes them the fleet choice for the country's most demanding environments.</div>
        <div className="flex flex-col gap-1 shrink-0">
          <div className="text-slate-700 font-bold" style={{ fontSize: 10 }}>Vehicles on Display:</div>
          {[['FTR 850','Medium-duty truck · Ideal for medium-haul mining operations'],['FVR 900','Heavy-duty · High payload capacity for bulk material haulage'],['NMR 85','Light commercial · Workshop and site support vehicle'],['D-MAX 4×4','Pick-up · Underground & surface operational use']].map(([m,d]) => (
            <div key={m} className="flex gap-2 py-1 border-b border-slate-100">
              <span className="font-bold text-blue-700 shrink-0" style={{ fontSize: 10, minWidth: 52 }}>{m}</span>
              <span className="text-slate-500" style={{ fontSize: 9 }}>{d}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 mt-auto shrink-0">
          <AdLink href="https://www.youtube.com/results?search_query=isuzu+commercial+trucks+africa" bg="#1d4ed8" color="#fff">
            <Play size={12} /> Watch Product Demo Videos ↗
          </AdLink>
          <AdLink href="https://www.isuzu.co.zw" bg="#eff6ff" color="#1d4ed8">
            <ExternalLink size={12} /> isuzu.co.zw ↗
          </AdLink>
        </div>
      </div>
      <PNum n={7} right />
    </div>
  );
}

// ── PAGE 8: Site Plan ─────────────────────────────────────────────────────────
function SitePlanPage() {
  const zones = [['#3b82f6','A','MAIN HALL','A01–A16','Diamond',16],['#eab308','B','EXHIBITION HALL','B01–B24','Gold',24],['#94a3b8','C','SUPPLIERS ZONE','C01–C20','Chrome',20],['#c2824a','D','SOLUTIONS ZONE','D01–D30','Copper',30]];
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Exhibition Site Map" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-3 overflow-hidden">
        <div className="shrink-0">
          <div className="text-slate-400 uppercase tracking-widest" style={{ fontSize: 8 }}>Artfarm Grounds, Pomona</div>
          <div className="font-black text-slate-900 leading-tight" style={{ fontSize: 20, fontFamily: 'Barlow Condensed,sans-serif' }}>EXHIBITION SITE PLAN</div>
        </div>
        <div className="rounded-xl overflow-hidden shrink-0" style={{ border: '2px solid #e2e8f0' }}>
          <div className="text-center py-1" style={{ background: '#f8fafc', fontSize: 8, borderBottom: '1px solid #e2e8f0', color: '#475569' }}>▼ MAIN ENTRANCE — Artfarm Road, Pomona</div>
          <div className="grid grid-cols-2 gap-0.5 p-0.5" style={{ background: '#e2e8f0' }}>
            {zones.map(([col,z,n,b,t]) => (
              <div key={z} className="rounded p-2" style={{ background: col + '18', borderLeft: `3px solid ${col}` }}>
                <div className="font-black" style={{ fontSize: 18, color: col, fontFamily: 'Barlow Condensed,sans-serif', lineHeight: 1 }}>ZONE {z}</div>
                <div className="font-bold text-slate-700" style={{ fontSize: 8.5 }}>{n}</div>
                <div className="text-slate-500" style={{ fontSize: 8 }}>{b}</div>
                <div className="rounded-sm px-1 py-0.5 text-white font-bold mt-1 inline-block" style={{ background: col, fontSize: 7 }}>{t}</div>
              </div>
            ))}
          </div>
          <div className="text-center py-1 text-slate-500" style={{ background: '#f8fafc', fontSize: 8, borderTop: '1px solid #e2e8f0' }}>🅿️ Parking · 🍽️ Catering · 🏥 First Aid · 📱 App Desk</div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 shrink-0">
          {zones.map(([col,z,,n,t,count]) => (
            <div key={z} className="flex items-center gap-2">
              <div className="rounded-sm shrink-0 flex items-center justify-center" style={{ width: 16, height: 16, background: col }}>
                <span className="text-white font-black" style={{ fontSize: 9 }}>{z}</span>
              </div>
              <div>
                <div className="text-slate-700 font-bold" style={{ fontSize: 9 }}>{n} · {t}</div>
                <div className="text-slate-400" style={{ fontSize: 8 }}>{count} stands</div>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg p-2.5 mt-auto shrink-0" style={{ background: '#0f172a' }}>
          <div className="text-amber-400 font-bold" style={{ fontSize: 9 }}>📱 Interactive Map in the MineCon App</div>
          <div className="text-slate-400 mt-0.5" style={{ fontSize: 8 }}>Download for real-time booth finder, exhibitor contacts & live demo schedules.</div>
        </div>
      </div>
      <PNum n={8} />
    </div>
  );
}

// ── PAGE 9: Industry Insight ──────────────────────────────────────────────────
function IndustryInsightPage() {
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Industry Insight" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-2.5 overflow-hidden">
        <div className="shrink-0">
          <div className="text-amber-500 uppercase tracking-widest font-bold" style={{ fontSize: 8 }}>Feature Article</div>
          <div className="font-black text-slate-900 leading-tight" style={{ fontSize: 15, fontFamily: 'Barlow Condensed,sans-serif' }}>ZIMBABWE MINING SECTOR 2026: GROWTH, TECHNOLOGY & OPPORTUNITY</div>
          <div className="h-0.5 w-12 mt-1" style={{ background: '#f59e0b' }} />
        </div>
        <div className="grid grid-cols-3 gap-1.5 shrink-0">
          {[['$12B+','Mineral export\ntarget 2026'],['↑18%','Chrome output\nyear-on-year'],['↑12%','Gold production\nvs 2024']].map(([n,l]) => (
            <div key={n} className="rounded-lg p-2 text-center" style={{ background: '#0f172a' }}>
              <div className="text-amber-400 font-black" style={{ fontSize: 13, fontFamily: 'Barlow Condensed,sans-serif' }}>{n}</div>
              <div className="text-slate-400 whitespace-pre-line" style={{ fontSize: 7.5 }}>{l}</div>
            </div>
          ))}
        </div>
        <div className="text-slate-600 leading-relaxed flex-1" style={{ fontSize: 9.5 }}>
          <p className="mb-2">Zimbabwe's mining sector entered 2026 on a trajectory of impressive growth, driven by surging global demand for critical minerals and a renewed focus on modernising operations. The government's <strong>National Development Strategy 2</strong> targets $12 billion in annual mineral export revenue — reshaping investment patterns across the sector.</p>
          <p className="mb-2">The critical minerals boom — lithium, cobalt, manganese — is putting Zimbabwe on the global map. The Great Dyke belt, one of the world's largest platinum group metal deposits, continues to attract international mining houses seeking stable supply chains for the EV battery revolution.</p>
          <p><strong>Digitalisation</strong> is the defining theme of 2026. From autonomous haul trucks and AI-driven ore sorting to IoT monitoring of tailings dams, Zimbabwean miners are embracing technology at an accelerating pace — creating robust demand for equipment and services on show at MineCon.</p>
        </div>
        <div className="rounded-lg p-2.5 shrink-0" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div className="text-amber-800 font-bold" style={{ fontSize: 9 }}>Key Trend: Equipment Modernisation</div>
          <div className="text-amber-700 mt-0.5" style={{ fontSize: 8.5 }}>57% of surveyed operations plan to upgrade major equipment in 2026–2027. MineCon is the platform to source, evaluate and procure across all major categories.</div>
        </div>
      </div>
      <PNum n={9} right />
    </div>
  );
}

// ── PAGE 10: Zimplow Ad (CLICKABLE) ──────────────────────────────────────────
function ZimplowAdPage() {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: 'linear-gradient(160deg,#0c1a33 0%,#1e3a5f 55%,#0c1a33 100%)' }}>
      <div className="px-5 pt-3 pb-1 shrink-0">
        <div className="text-blue-300 uppercase tracking-widest font-bold" style={{ fontSize: 8 }}>Diamond Sponsor · Booth A13</div>
      </div>
      <div className="px-5 flex-1 flex flex-col justify-between overflow-hidden">
        <div>
          <div className="font-black text-white leading-none" style={{ fontSize: 42, fontFamily: 'Barlow Condensed,sans-serif', lineHeight: 1 }}>ZIMPLOW</div>
          <div className="font-black leading-none" style={{ fontSize: 26, fontFamily: 'Barlow Condensed,sans-serif', color: '#60a5fa' }}>HOLDINGS</div>
          <div className="text-blue-200 font-medium mt-1" style={{ fontSize: 10 }}>Diversified Industrial Solutions for Sub-Saharan Africa</div>
        </div>
        <div className="w-full rounded-xl flex items-center justify-center my-2" style={{ height: 100, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="text-center">
            <div style={{ fontSize: 36 }}>🏭</div>
            <div className="text-blue-300 font-bold mt-1" style={{ fontSize: 9 }}>Manufacturing · Distribution · Equipment</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {['Blades & Tillage Tools','Steel Castings','Industrial Equipment','Agricultural Implements'].map(c => (
            <div key={c} className="rounded px-2 py-1.5 flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#60a5fa' }} />
              <div className="text-slate-200" style={{ fontSize: 9 }}>{c}</div>
            </div>
          ))}
        </div>
        <AdLink href="https://www.zimplow.co.zw" bg="#60a5fa" color="#0c1a33">
          <ExternalLink size={13} /> Visit www.zimplow.co.zw ↗
        </AdLink>
      </div>
      <div className="px-5 py-2 flex items-center justify-between shrink-0">
        <div className="text-blue-300" style={{ fontSize: 8 }}>Booth A13 · Main Hall</div>
        <div className="rounded px-2 py-0.5 text-white font-bold" style={{ background: '#3b82f6', fontSize: 8 }}>DIAMOND SPONSOR</div>
      </div>
      <PNum n={10} />
    </div>
  );
}

// ── PAGE 11: Exhibitor Directory ──────────────────────────────────────────────
function ExhibitorDirectoryPage() {
  const list = [
    ['A01','Steel Warehouse Holdings'],['A02','Isuzu Zimbabwe'],['A03','Viking'],
    ['A04','Agricon Equipment'],['A05','ICC'],['A06','Redan'],
    ['A07','SANY Group'],['A08','R&S Diesel Professionals'],['A09','National Propshaft Centre'],
    ['A10','Nicnel'],['A11','AM Mach'],['A12','Better Brands'],
    ['A13','Zimplow Holdings'],['A14','Great Dyke'],['A15','Tsapo'],['A16','LiuGong Zimbabwe'],
  ];
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Exhibitor Directory" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-2.5 overflow-hidden">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <div className="text-slate-400 uppercase tracking-widest" style={{ fontSize: 8 }}>Main Hall · Zone A</div>
            <div className="font-black text-slate-900" style={{ fontSize: 18, fontFamily: 'Barlow Condensed,sans-serif', lineHeight: 1 }}>DIAMOND EXHIBITORS</div>
          </div>
          <div className="rounded px-2 py-0.5 text-white font-bold" style={{ background: '#3b82f6', fontSize: 8 }}>DIAMOND TIER</div>
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          {list.map(([b,n]) => (
            <div key={b} className="flex items-center gap-2 py-1 border-b border-slate-100">
              <div className="rounded px-1.5 py-0.5 font-bold text-white shrink-0" style={{ background: '#3b82f6', fontSize: 8, minWidth: 30 }}>{b}</div>
              <div className="text-slate-700 font-medium" style={{ fontSize: 9.5 }}>{n}</div>
            </div>
          ))}
        </div>
        <div className="rounded-lg p-2 text-center shrink-0" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div className="text-blue-700 font-bold" style={{ fontSize: 8.5 }}>Gold, Chrome & Copper exhibitor directories in the MineCon App</div>
        </div>
      </div>
      <PNum n={11} right />
    </div>
  );
}

// ── PAGE 12: LiuGong Spotlight (CLICKABLE) ────────────────────────────────────
function LiuGongPage() {
  const specs = [['Bucket Capacity','3.0 – 3.5 m³'],['Engine Power','162 kW (217 hp)'],['Operating Weight','16,500 kg'],['Dump Height','2,860 mm'],['Breakout Force','176 kN'],['Tipping Load','10,500 kg']];
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Product Spotlight" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-2 overflow-hidden">
        <div className="rounded-lg overflow-hidden shrink-0" style={{ height: 60, background: 'linear-gradient(135deg,#14532d 0%,#15803d 100%)' }}>
          <div className="h-full flex items-center px-4 gap-3">
            <div className="w-10 h-10 rounded flex items-center justify-center text-xl shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>🚜</div>
            <div>
              <div className="text-green-200 uppercase tracking-widest" style={{ fontSize: 7.5 }}>Diamond Sponsor · Booth A16</div>
              <div className="text-white font-black" style={{ fontSize: 15, fontFamily: 'Barlow Condensed,sans-serif' }}>LIUGONG ZIMBABWE</div>
            </div>
          </div>
        </div>
        <div className="shrink-0">
          <div className="text-slate-400 uppercase tracking-widest" style={{ fontSize: 8 }}>Feature Machine</div>
          <div className="font-black text-slate-900" style={{ fontSize: 18, fontFamily: 'Barlow Condensed,sans-serif' }}>LiuGong 856H</div>
          <div className="text-green-700 font-semibold" style={{ fontSize: 10 }}>Heavy-Duty Wheel Loader</div>
        </div>
        <div className="rounded-lg overflow-hidden shrink-0" style={{ height: 75, background: 'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)', border: '2px solid #bbf7d0' }}>
          <div className="h-full flex items-center justify-center gap-4">
            <div style={{ fontSize: 36 }}>🚜</div>
            <div className="text-green-700" style={{ fontSize: 9 }}>
              <div className="font-bold">856H Wheel Loader</div>
              <div>Live demo at Booth A16</div>
              <div className="font-bold text-green-800">See it in action!</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 flex-1">
          {specs.map(([l,v]) => (
            <div key={l} className="rounded p-1.5" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div className="text-slate-400" style={{ fontSize: 7.5 }}>{l}</div>
              <div className="text-slate-800 font-bold" style={{ fontSize: 10 }}>{v}</div>
            </div>
          ))}
        </div>
        <div className="shrink-0">
          <AdLink href="https://www.liugong.com/en/products/wheel-loader/" bg="#15803d" color="#fff">
            <ExternalLink size={12} /> Full Specifications at liugong.com ↗
          </AdLink>
        </div>
      </div>
      <PNum n={12} />
    </div>
  );
}

// ── PAGE 13: Why Attend ───────────────────────────────────────────────────────
function WhyAttendPage() {
  const reasons = [['🤝','Network','2,000+ industry professionals'],['🏭','See Equipment','80+ exhibitors, live demos'],['📊','Industry Intel','Keynotes from sector leaders'],['💰','Procurement','Compare & close deals on-site'],['📱','Go Digital','App for meetings, QR & schedules'],['🌍','Connect Africa','Southern African supply chain']];
  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <Strip label="Why Attend MineCon?" />
      <div className="flex-1 px-5 py-3 flex flex-col gap-2.5 overflow-hidden">
        <div className="shrink-0">
          <div className="text-amber-500 uppercase tracking-widest font-bold" style={{ fontSize: 8 }}>MineCon 2026</div>
          <div className="font-black text-slate-900 leading-tight" style={{ fontSize: 20, fontFamily: 'Barlow Condensed,sans-serif' }}>WHY ATTEND?</div>
          <div className="h-0.5 w-10 mt-0.5" style={{ background: '#f59e0b' }} />
        </div>
        <div className="rounded-xl p-3 shrink-0" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)' }}>
          <div className="text-slate-300 italic" style={{ fontSize: 10 }}>"MineCon is where Zimbabwe's mining and construction industry comes together — to do business, to learn, and to shape the future of our sector."</div>
          <div className="text-amber-400 font-bold mt-1.5" style={{ fontSize: 9 }}>— MineCon 2026 Organising Committee</div>
        </div>
        <div className="grid grid-cols-2 gap-2 flex-1">
          {reasons.map(([i,t,d]) => (
            <div key={t} className="rounded-lg p-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 18 }}>{i}</div>
              <div className="font-bold text-slate-800 mt-1" style={{ fontSize: 10 }}>{t}</div>
              <div className="text-slate-500" style={{ fontSize: 8.5 }}>{d}</div>
            </div>
          ))}
        </div>
        <div className="rounded-lg p-2.5 text-center shrink-0" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div className="text-amber-800 font-bold" style={{ fontSize: 11 }}>Register Free — minecon.global</div>
          <div className="text-amber-600" style={{ fontSize: 8.5 }}>Download the MineCon 2026 app · #MineCon2026</div>
        </div>
      </div>
      <PNum n={13} right />
    </div>
  );
}

// ── PAGE 14: Back Cover ───────────────────────────────────────────────────────
function BackCoverPage() {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: 'linear-gradient(160deg,#080f1e 0%,#1e293b 60%,#080f1e 100%)' }}>
      <div className="flex-1 flex flex-col items-center justify-between px-5 py-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle,#f59e0b 1.5px,transparent 1.5px)', backgroundSize: '20px 20px' }} />
        <div className="text-center w-full">
          <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-amber-500 mx-auto mb-2" style={{ background: 'rgba(245,158,11,0.1)' }}>
            <span className="text-amber-400 font-black" style={{ fontSize: 20, fontFamily: 'Barlow Condensed,sans-serif' }}>MC</span>
          </div>
          <div className="font-black text-amber-400" style={{ fontSize: 18, fontFamily: 'Barlow Condensed,sans-serif' }}>MINECON 2026</div>
          <div className="text-slate-400" style={{ fontSize: 9.5 }}>Southern Africa's Mining & Construction Exhibition</div>
        </div>
        <div className="text-center">
          <div className="font-black text-white" style={{ fontSize: 28, fontFamily: 'Barlow Condensed,sans-serif', lineHeight: 1.1 }}>See you at<br />the show!</div>
          <div className="text-amber-400 mt-2" style={{ fontSize: 10 }}>October 2026 · Artfarm Grounds, Pomona, Harare</div>
        </div>
        <div className="w-full rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="flex flex-col gap-1.5">
            {[['📍','Artfarm Grounds, Pomona, Harare, Zimbabwe'],['🌐','minecon.global'],['📧','info@minecon.global']].map(([i,t]) => (
              <div key={t} className="flex items-center justify-center gap-2 text-slate-300" style={{ fontSize: 9.5 }}><span>{i}</span>{t}</div>
            ))}
            <div className="flex items-center justify-center gap-2 text-amber-400 font-bold mt-1" style={{ fontSize: 10 }}>📱 #MineCon2026</div>
          </div>
        </div>
        <div className="w-full">
          <div className="text-slate-500 text-center uppercase tracking-widest mb-2" style={{ fontSize: 7 }}>Diamond Sponsors</div>
          <div className="flex justify-center gap-2 flex-wrap">
            {['SANY','Zimplow','Isuzu ZW','Steel WH','LiuGong','Agricon'].map(s => (
              <div key={s} className="rounded px-2 py-0.5 text-slate-300 font-bold" style={{ background: 'rgba(255,255,255,0.06)', fontSize: 8 }}>{s}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0" style={{ background: '#f59e0b' }}>
        <span className="text-slate-900 font-black uppercase tracking-widest" style={{ fontSize: 8 }}>MineCon 2026</span>
        <span className="text-slate-900 font-bold" style={{ fontSize: 8 }}>minecon.global</span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Magazine() {
  const bookRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [bookKey, setBookKey] = useState('dk');
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const handler = () => {
      const m = window.innerWidth < 768;
      setIsMobile(prev => {
        if (prev !== m) setBookKey(m ? 'mb' : 'dk');
        return m;
      });
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const onFlip = useCallback(e => setCurrentPage(e.data), []);
  const flipPrev = () => bookRef.current?.pageFlip().flipPrev();
  const flipNext = () => bookRef.current?.pageFlip().flipNext();

  const TOTAL = 14;
  const spreadLabel = isMobile
    ? `Page ${currentPage + 1} of ${TOTAL}`
    : currentPage === 0
    ? 'Cover'
    : currentPage >= TOTAL - 1
    ? 'Back Cover'
    : `Pages ${currentPage}–${currentPage + 1} of ${TOTAL}`;

  return (
    <div className="pb-24 pt-2">
      <div className="px-4 mb-3">
        <h1 className="font-heading text-xl font-black uppercase tracking-wide">Digital Magazine</h1>
        <p className="text-sm text-muted-foreground">MineCon 2026 Official Exhibition Guide</p>
      </div>

      <div className="w-full" style={{ touchAction: 'pan-y' }}>
        <HTMLFlipBook
          key={bookKey}
          ref={bookRef}
          width={420}
          height={594}
          size="stretch"
          minWidth={200}
          maxWidth={500}
          minHeight={280}
          maxHeight={720}
          maxShadowOpacity={0.5}
          showCover
          mobileScrollSupport
          usePortrait={isMobile}
          onFlip={onFlip}
          flippingTime={650}
          drawShadow
          showPageCorners
          disableFlipByClick={false}
          swipeDistance={30}
          style={{ margin: '0 auto', display: 'block' }}
        >
          <MagazinePage key="p1"><CoverPage /></MagazinePage>
          <MagazinePage key="p2"><WelcomePage /></MagazinePage>
          <MagazinePage key="p3"><ContentsPage /></MagazinePage>
          <MagazinePage key="p4"><SANYAdPage /></MagazinePage>
          <MagazinePage key="p5"><EventOverviewPage /></MagazinePage>
          <MagazinePage key="p6"><SteelWarehousePage /></MagazinePage>
          <MagazinePage key="p7"><IsuzuPage /></MagazinePage>
          <MagazinePage key="p8"><SitePlanPage /></MagazinePage>
          <MagazinePage key="p9"><IndustryInsightPage /></MagazinePage>
          <MagazinePage key="p10"><ZimplowAdPage /></MagazinePage>
          <MagazinePage key="p11"><ExhibitorDirectoryPage /></MagazinePage>
          <MagazinePage key="p12"><LiuGongPage /></MagazinePage>
          <MagazinePage key="p13"><WhyAttendPage /></MagazinePage>
          <MagazinePage key="p14"><BackCoverPage /></MagazinePage>
        </HTMLFlipBook>
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 px-4">
        <button
          onClick={flipPrev}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <span className="text-sm text-muted-foreground font-medium">{spreadLabel}</span>
        <button
          onClick={flipNext}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-sm"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-3 px-4">
        <BookOpen className="inline w-3.5 h-3.5 mr-1" />
        {isMobile
          ? 'Swipe left/right or use arrows to turn pages'
          : 'Click page corners or drag to flip · Double-page spread on desktop'}
      </p>
    </div>
  );
}
