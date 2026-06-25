import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import {
  Users, Plus, Trash2, Edit2, Shield, Building2,
  User as UserIcon, Briefcase, CheckCircle, X,
} from 'lucide-react';

const ROLES = [
  { id: 'organizer',         label: 'Organizer',         icon: Shield,    color: 'bg-violet-500', desc: 'Full console access — MineCon team only.' },
  { id: 'marketing_partner', label: 'Marketing Partner',  icon: Briefcase, color: 'bg-rose-500',   desc: 'Console access for approved marketing partners.' },
  { id: 'exhibitor',         label: 'Exhibitor',          icon: Building2, color: 'bg-amber-500',  desc: 'Exhibitor portal — booth, meetings, analytics.' },
  { id: 'attendee',          label: 'Attendee',           icon: UserIcon,  color: 'bg-blue-500',   desc: 'Attendee PWA — browse, book meetings, schedule.' },
];

const ROLE_MAP = Object.fromEntries(ROLES.map(r => [r.id, r]));

const STATUS_STYLES = {
  active:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  inactive: 'bg-slate-100 text-slate-500',
  suspended:'bg-red-100 text-red-600',
};

function RoleBadge({ role }) {
  const r = ROLE_MAP[role];
  if (!r) return <span className="text-xs text-muted-foreground">{role}</span>;
  const Icon = r.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${r.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {r.label}
    </span>
  );
}

const EMPTY_FORM = { full_name: '', email: '', company: '', role: 'attendee' };

export default function UsersPanel() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const isOrganizer = currentUser?.role === 'organizer';
  // superadmin role is never assignable or visible in the users panel
  // organizers additionally cannot assign marketing_partner
  const assignableRoles = ROLES.filter(r =>
    r.id !== 'superadmin' && !(isOrganizer && r.id === 'marketing_partner')
  );
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => User.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => User.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); closeForm(); },
    onError: (e) => setFormError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => User.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); closeForm(); },
    onError: (e) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => User.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const openAdd = () => { setEditUser(null); setForm(EMPTY_FORM); setFormError(''); setShowForm(true); };
  const openEdit = (u) => {
    if (isOrganizer && u.role === 'marketing_partner') return;
    setEditUser(u);
    setForm({ full_name: u.full_name, email: u.email, company: u.company || '', role: u.role });
    setFormError('');
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditUser(null); setForm(EMPTY_FORM); setFormError(''); };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.full_name.trim() || !form.email.trim()) { setFormError('Name and email are required.'); return; }
    if (editUser) {
      updateMutation.mutate({ id: editUser.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filtered = users.filter(u => {
    if (u.role === 'superadmin') return false; // superadmin is always hidden
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.company?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const counts = ROLES.reduce((acc, r) => { acc[r.id] = users.filter(u => u.role === r.id && u.role !== 'superadmin').length; return acc; }, {});

  return (
    <div className="pb-12 px-4 sm:px-6 pt-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Users & Roles</h1>
          <p className="text-muted-foreground text-sm">Manage portal access for staff, partners, and exhibitors</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-amber text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {ROLES.map(r => {
          const Icon = r.icon;
          return (
            <button key={r.id} onClick={() => setRoleFilter(roleFilter === r.id ? 'all' : r.id)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${roleFilter === r.id ? 'border-amber bg-amber/5' : 'border-border bg-card hover:border-amber/30'}`}>
              <div className={`w-8 h-8 ${r.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-lg font-heading font-bold leading-none">{counts[r.id] ?? 0}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{r.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 mb-4">
        <input
          type="search"
          placeholder="Search by name, email, or company…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber"
        />
        {roleFilter !== 'all' && (
          <button onClick={() => setRoleFilter('all')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber bg-amber/5 text-amber text-xs font-semibold">
            <X className="w-3 h-3" />
            {ROLE_MAP[roleFilter]?.label}
          </button>
        )}
      </div>

      {/* Users table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-amber/30 border-t-amber rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {search || roleFilter !== 'all' ? 'No users match your filter.' : 'No users yet. Click "Add User" to get started.'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-amber/10 flex items-center justify-center flex-shrink-0 text-amber font-bold text-sm">
                  {u.full_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{u.full_name}</p>
                    <RoleBadge role={u.role} />
                    {u.status && u.status !== 'active' && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${STATUS_STYLES[u.status] || ''}`}>{u.status}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email}{u.company ? ` · ${u.company}` : ''}</p>
                </div>
                {!(currentUser?.role === 'organizer' && u.role === 'marketing_partner') && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(u)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (window.confirm(`Remove ${u.full_name}?`)) deleteMutation.mutate(u.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-muted-foreground hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit slide-in form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-lg font-bold">{editUser ? 'Edit User' : 'Add User'}</h2>
              <button onClick={closeForm} className="p-1 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Full Name *" value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} placeholder="Jane Doe" />
              <Field label="Email *" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="jane@example.com" disabled={!!editUser} />
              <Field label="Company" value={form.company} onChange={v => setForm(f => ({ ...f, company: v }))} placeholder="Optional" />

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {assignableRoles.map(r => {
                    const Icon = r.icon;
                    return (
                      <button key={r.id} type="button" onClick={() => setForm(f => ({ ...f, role: r.id }))}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${form.role === r.id ? 'border-amber bg-amber/5' : 'border-border hover:border-amber/30'}`}>
                        <div className={`w-6 h-6 ${r.color} rounded-md flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-3 h-3 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold leading-none">{r.label}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight line-clamp-1">{r.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeForm}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-amber text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><CheckCircle className="w-4 h-4" />{editUser ? 'Save Changes' : 'Add User'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, disabled }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber disabled:opacity-50 disabled:cursor-not-allowed" />
    </div>
  );
}