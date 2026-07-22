import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Registration, MeetingRequest, Exhibitor } from '@/api/entities';
import { Shield, User, Building2, Star, Mic, Crown, Lock, Eye, EyeOff, CheckCircle, Settings, ChevronRight, Users, Bell, Mail, Search, Link2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useAppSettings } from '@/lib/AppSettingsContext';
import { isSubscriptionExpired } from '@/lib/subscription';

const PACKAGES = ['Basic', 'Enhanced', 'Premium'];

const ROLES = [
  { id: 'admin', label: 'Admin', icon: Shield, color: 'bg-red-500', desc: 'Full access to all modules, data, and settings.', perms: ['registrations', 'exhibitors', 'analytics', 'announcements', 'communications', 'settings'] },
  { id: 'organiser', label: 'Organiser', icon: Settings, color: 'bg-violet-500', desc: 'Access to schedule, announcements, and communications. Cannot delete records.', perms: ['announcements', 'communications', 'schedule'] },
  { id: 'exhibitor', label: 'Exhibitor', icon: Building2, color: 'bg-amber-500', desc: 'View own booth profile, manage meeting requests, and update company info.', perms: ['exhibitor_profile', 'meetings'] },
  { id: 'attendee', label: 'Attendee', icon: User, color: 'bg-blue-500', desc: 'Browse exhibitors, book meetings, view schedule, and save favourites.', perms: ['exhibitors', 'meetings', 'schedule', 'magazine'] },
];

const MODULES = [
  { id: 'registrations', label: 'Registrations', icon: Users, path: '/register' },
  { id: 'exhibitors', label: 'Exhibitor Directory', icon: Building2, path: '/exhibitors' },
  { id: 'analytics', label: 'Analytics', icon: Star, path: '/analytics' },
  { id: 'announcements', label: 'Announcements', icon: Bell, path: '/announcements' },
  { id: 'communications', label: 'Communications', icon: Bell, path: '/communications' },
  { id: 'meetings', label: 'Meetings', icon: User, path: '/meetings' },
  { id: 'magazine', label: 'Digital Magazine', icon: Star, path: '/magazine' },
  { id: 'schedule', label: 'Event Schedule', icon: Star, path: '/schedule' },
];

export default function AdminPanel() {
  const { user } = useAuth();
  const isOrganizer = user?.role === 'organizer';
  const { settings, updateSettings } = useAppSettings();

  const [selectedRole, setSelectedRole] = useState('admin');
  const [showOtp, setShowOtp] = useState(false);
  const [profile, setProfile] = useState({ name: 'Demo Admin', email: 'admin@agrishow.co.zw', role: 'admin' });
  const queryClient = useQueryClient();

  const { data: registrations = [] } = useQuery({
    queryKey: ['registrations'],
    queryFn: () => Registration.list(),
    enabled: isOrganizer,
  });
  const { data: meetings = [] } = useQuery({ queryKey: ['meetings'], queryFn: () => MeetingRequest.list() });
  const { data: exhibitors = [] } = useQuery({ queryKey: ['exhibitors-all'], queryFn: () => Exhibitor.list() });

  const [exhibitorSearch, setExhibitorSearch] = useState('');
  const [editingEmail, setEditingEmail] = useState({}); // { [id]: email }
  const [savingId, setSavingId] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [savingPackageId, setSavingPackageId] = useState(null);

  const saveEmail = async (id) => {
    setSavingId(id);
    setSaveError(null);
    try {
      await Exhibitor.update(id, { contact_email: editingEmail[id] });
      queryClient.invalidateQueries({ queryKey: ['exhibitors-all'] });
      setEditingEmail(prev => { const n = { ...prev }; delete n[id]; return n; });
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSavingId(null);
    }
  };

  const savePackage = async (id, pkg) => {
    setSavingPackageId(id);
    setSaveError(null);
    try {
      await Exhibitor.update(id, { package: pkg });
      queryClient.invalidateQueries({ queryKey: ['exhibitors-all'] });
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSavingPackageId(null);
    }
  };

  const [settingsDraft, setSettingsDraft] = useState({});
  const [savingField, setSavingField] = useState(null);
  const settingValue = (field) => settingsDraft[field] ?? settings[field] ?? '';
  const saveSetting = async (field) => {
    setSavingField(field);
    try {
      await updateSettings({ [field]: settingValue(field) });
      setSettingsDraft(d => { const n = { ...d }; delete n[field]; return n; });
    } finally {
      setSavingField(null);
    }
  };

  const currentRole = ROLES.find(r => r.id === selectedRole);
  const canAccess = (moduleId) => currentRole?.perms.includes(moduleId);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => Registration.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registrations'] }),
  });

  return (
    <div className="pb-12 px-4 sm:px-6 pt-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Admin & Security</h1>
          <p className="text-muted-foreground text-sm">Access control, profiles, and permissions</p>
        </div>
        <div className="bg-amber/10 border border-amber/30 text-amber text-xs font-bold px-2.5 py-1.5 rounded-lg">DEMO</div>
      </div>

      {/* Profile card */}
      <div className="bg-steel text-white rounded-xl p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber rounded-full flex items-center justify-center text-white font-heading text-xl font-bold flex-shrink-0">
            {profile.name[0]}
          </div>
          <div className="flex-1">
            <p className="font-semibold">{profile.name}</p>
            <p className="text-slate-300 text-xs">{profile.email}</p>
            <span className="inline-block mt-1 text-[10px] font-bold bg-amber/20 text-amber px-2 py-0.5 rounded uppercase">
              {profile.role}
            </span>
          </div>
          <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <Settings className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* OTP / Verification */}
      <div className="bg-card border border-border rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber" />
            <p className="font-semibold text-sm">Verification & OTP</p>
          </div>
          <button onClick={() => setShowOtp(!showOtp)} className="text-xs text-amber font-medium">{showOtp ? 'Hide' : 'Configure'}</button>
        </div>
        {showOtp && (
          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-lg">
              <span className="text-xs font-medium">Email OTP on registration</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">ENABLED</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-lg">
              <span className="text-xs font-medium">Admin 2FA</span>
              <span className="text-[10px] bg-amber/10 text-amber px-1.5 py-0.5 rounded font-bold">SETUP</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-lg">
              <span className="text-xs font-medium">Session timeout (minutes)</span>
              <span className="text-xs font-bold">60</span>
            </div>
          </div>
        )}
      </div>

      {/* Role simulator */}
      <div className="bg-card border border-border rounded-xl p-4 mb-5">
        <p className="font-heading text-sm font-bold uppercase tracking-wide mb-3">Role & Permission Simulator</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {ROLES.map(r => {
            const Icon = r.icon;
            return (
              <button key={r.id} onClick={() => setSelectedRole(r.id)}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${selectedRole === r.id ? 'border-amber bg-amber/5' : 'border-border hover:border-amber/30'}`}>
                <div className={`w-7 h-7 ${r.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs font-semibold">{r.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mb-3">{currentRole?.desc}</p>
        <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Module Access</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {MODULES.map(m => {
            const hasAccess = canAccess(m.id);
            const Icon = m.icon;
            return (
              <div key={m.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium ${hasAccess ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                {hasAccess ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {m.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Registration management — organizer only */}
      {!isOrganizer ? (
        <div className="bg-card border border-border rounded-xl p-6 mb-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-sm">Registration List Restricted</p>
            <p className="text-xs text-muted-foreground mt-0.5">Only organizers can view attendee registration records.</p>
          </div>
        </div>
      ) : registrations.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-5">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="font-heading text-sm font-bold uppercase tracking-wide">Registration Management</p>
            <span className="text-xs text-muted-foreground">{registrations.length} records</span>
          </div>
          <div className="divide-y divide-border">
            {registrations.slice(0, 8).map(r => (
              <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground">{r.role_type} · {r.ticket_type}</p>
                </div>
                <select value={r.status} onChange={e => updateStatus.mutate({ id: r.id, status: e.target.value })}
                  className="text-xs border border-border rounded-lg px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-amber">
                  {['Pending', 'Confirmed', 'Checked In', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-border">
            <Link to="/console/registrations" className="text-amber text-xs font-medium">View all registrations →</Link>
          </div>
        </div>
      )}

      {/* Exhibitor Portal Logins */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-border">
          <p className="font-heading text-sm font-bold uppercase tracking-wide">Exhibitor Portal Logins</p>
          <p className="text-xs text-muted-foreground mt-0.5">Set the login email for each exhibitor so they only see their own meeting requests</p>
        </div>

        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search exhibitors…"
              value={exhibitorSearch}
              onChange={e => setExhibitorSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
            />
          </div>
        </div>

        {saveError && (
          <div className="mx-4 mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</div>
        )}

        <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
          {exhibitors
            .filter(e => !exhibitorSearch || e.name?.toLowerCase().includes(exhibitorSearch.toLowerCase()) || e.booth?.toLowerCase().includes(exhibitorSearch.toLowerCase()))
            .sort((a, b) => (a.booth ?? '').localeCompare(b.booth ?? ''))
            .map(e => {
              const currentEmail = editingEmail[e.id] ?? (e.contact_email || '');
              const isDirty = e.id in editingEmail && editingEmail[e.id] !== (e.contact_email || '');
              return (
                <div key={e.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-muted-foreground">
                    {e.booth || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{e.name}</p>
                      {isSubscriptionExpired(e) ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 flex-shrink-0">
                          <AlertCircle className="w-2.5 h-2.5" /> Expired
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex-shrink-0">Active</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <input
                        type="email"
                        placeholder="Login email…"
                        value={currentEmail}
                        onChange={ev => setEditingEmail(prev => ({ ...prev, [e.id]: ev.target.value }))}
                        className="flex-1 text-xs py-1 px-2 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-amber min-w-0"
                      />
                    </div>
                  </div>
                  <select
                    value={e.package || 'Basic'}
                    disabled={savingPackageId === e.id}
                    onChange={ev => savePackage(e.id, ev.target.value)}
                    className="flex-shrink-0 text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-amber disabled:opacity-60"
                  >
                    {PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {isDirty && (
                    <button
                      type="button"
                      disabled={savingId === e.id}
                      onClick={() => saveEmail(e.id)}
                      className="flex-shrink-0 text-xs bg-amber hover:bg-amber/90 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-60 touch-manipulation"
                    >
                      {savingId === e.id ? 'Saving…' : 'Save'}
                    </button>
                  )}
                  {!isDirty && e.contact_email && (
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Platform Settings — organiser-configurable fields */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-border">
          <p className="font-heading text-sm font-bold uppercase tracking-wide">Platform Settings</p>
          <p className="text-xs text-muted-foreground mt-0.5">Organiser-configurable fields used across the platform</p>
        </div>
        <div className="p-4 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Link2 className="w-3 h-3" /> Physical event registration redirect URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={settingValue('physicalEventRegistrationUrl')}
                onChange={ev => setSettingsDraft(d => ({ ...d, physicalEventRegistrationUrl: ev.target.value }))}
                placeholder="https://agrishow.co.zw/"
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
              />
              <button
                type="button"
                disabled={savingField === 'physicalEventRegistrationUrl' || !('physicalEventRegistrationUrl' in settingsDraft)}
                onClick={() => saveSetting('physicalEventRegistrationUrl')}
                className="flex-shrink-0 text-xs bg-amber hover:bg-amber/90 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-60"
              >
                {savingField === 'physicalEventRegistrationUrl' ? 'Saving…' : 'Save'}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">Attendees are sent here for physical show tickets & entry passes — the virtual platform no longer sells them directly.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Link2 className="w-3 h-3" /> CC Sales pedigree cattle auction URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={settingValue('ccSalesAuctionUrl')}
                onChange={ev => setSettingsDraft(d => ({ ...d, ccSalesAuctionUrl: ev.target.value }))}
                placeholder="https://ccsales.co.zw/…"
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
              />
              <button
                type="button"
                disabled={savingField === 'ccSalesAuctionUrl' || !('ccSalesAuctionUrl' in settingsDraft)}
                onClick={() => saveSetting('ccSalesAuctionUrl')}
                className="flex-shrink-0 text-xs bg-amber hover:bg-amber/90 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-60"
              >
                {savingField === 'ccSalesAuctionUrl' ? 'Saving…' : 'Save'}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">Shown as a "View on CC Sales" button on Livestock auctions/lots.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> Paid listing request email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={settingValue('paidFeatureRequestEmail')}
                onChange={ev => setSettingsDraft(d => ({ ...d, paidFeatureRequestEmail: ev.target.value }))}
                placeholder="billing@mediaserv.co.zw"
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
              />
              <button
                type="button"
                disabled={savingField === 'paidFeatureRequestEmail' || !('paidFeatureRequestEmail' in settingsDraft)}
                onClick={() => saveSetting('paidFeatureRequestEmail')}
                className="flex-shrink-0 text-xs bg-amber hover:bg-amber/90 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-60"
              >
                {savingField === 'paidFeatureRequestEmail' ? 'Saving…' : 'Save'}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">Receives a request whenever an exhibitor asks to activate a paid interactive listing feature.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Link2 className="w-3 h-3" /> Landing page marketing video
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={settingValue('marketingVideoUrl')}
                onChange={ev => setSettingsDraft(d => ({ ...d, marketingVideoUrl: ev.target.value }))}
                placeholder="https://www.youtube.com/embed/… or a direct .mp4 URL"
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
              />
              <button
                type="button"
                disabled={savingField === 'marketingVideoUrl' || !('marketingVideoUrl' in settingsDraft)}
                onClick={() => saveSetting('marketingVideoUrl')}
                className="flex-shrink-0 text-xs bg-amber hover:bg-amber/90 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-60"
              >
                {savingField === 'marketingVideoUrl' ? 'Saving…' : 'Save'}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">Shown below the hero on the home page. YouTube/Vimeo embed URL (e.g. youtube.com/embed/VIDEO_ID) or a direct .mp4 link.</p>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="font-heading text-sm font-bold uppercase tracking-wide">Quick Navigation</p>
        </div>
        {MODULES.map(m => {
          const Icon = m.icon;
          return (
            <Link key={m.id} to={m.path} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium flex-1">{m.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
