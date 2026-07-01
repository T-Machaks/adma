import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ChevronDown, Search, LogIn, FlaskConical, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import EventLogo from '@/components/layout/EventLogo';

const DEMO_PASSWORD = '@AgriShow2026';

export default function ExhibitorLogin() {
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const [exhibitors, setExhibitors] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/exhibitors/demo-list')
      .then(r => r.json())
      .then(data => { setExhibitors(Array.isArray(data) ? data : []); })
      .catch(() => setExhibitors([]))
      .finally(() => setLoadingList(false));
  }, []);

  const filtered = exhibitors.filter(e =>
    (e.company_name || '').toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (exh) => {
    setSelected(exh);
    setQuery(exh.company_name);
    setDropdownOpen(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) { setError('Please select an exhibitor.'); return; }
    if (!password) { setError('Password is required.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/exhibitor-demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selected.user_id, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed.'); return; }
      const result = setSession(data);
      navigate(result.redirectTo || '/exhibitor');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tierColour = { platinum: 'text-emerald-400', gold: 'text-amber', silver: 'text-slate-300', bronze: 'text-orange-400' };

  return (
    <div className="min-h-screen bg-steel flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <EventLogo size="large" />
          <div className="flex items-center gap-2 text-amber font-bold uppercase tracking-widest text-xs">
            <Store className="w-4 h-4" />
            Exhibitor Portal
          </div>
        </div>

        {/* Demo notice */}
        <div className="flex items-start gap-2 bg-amber/10 border border-amber/30 rounded-xl px-4 py-3 mb-6 text-amber text-sm">
          <FlaskConical className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Demo mode — select your company and use the shared demo password.</span>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-5">
          {/* Exhibitor selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 text-sm font-medium">Exhibitor</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null); setDropdownOpen(true); }}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                placeholder={loadingList ? 'Loading exhibitors…' : 'Search or select exhibitor…'}
                disabled={loadingList}
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-10 py-3 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber/50 focus:border-amber/50 transition-all disabled:opacity-50"
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>

              {dropdownOpen && filtered.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full bg-steel border border-white/20 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                  {filtered.map(exh => (
                    <button
                      key={exh.id}
                      type="button"
                      onMouseDown={() => handleSelect(exh)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-left"
                    >
                      {exh.logo_url ? (
                        <img src={exh.logo_url} alt="" className="w-8 h-8 rounded object-contain bg-white/5 flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-white/10 flex-shrink-0 flex items-center justify-center">
                          <Store className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">{exh.company_name}</div>
                        {exh.tier && (
                          <div className={`text-xs capitalize ${tierColour[exh.tier] || 'text-slate-400'}`}>
                            {exh.tier}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {dropdownOpen && !loadingList && query && filtered.length === 0 && (
                <div className="absolute z-50 top-full mt-1 w-full bg-steel border border-white/20 rounded-xl shadow-xl px-4 py-3 text-slate-400 text-sm">
                  No exhibitors found
                </div>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 text-sm font-medium">Demo Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter demo password"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 pr-11 py-3 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber/50 focus:border-amber/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selected}
            className="flex items-center justify-center gap-2 bg-amber hover:bg-amber/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-all active:scale-95"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {loading ? 'Signing in…' : 'Access Exhibitor Portal'}
          </button>
        </form>

        <p className="text-center text-slate-500 text-xs mt-6">
          Organizer?{' '}
          <a href="/console/login" className="text-amber hover:text-amber/80 transition-colors">
            Sign in to Console
          </a>
        </p>
      </div>
    </div>
  );
}
