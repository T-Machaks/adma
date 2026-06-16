import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { Users, Plus, Trash2, Edit2, Building2, CheckCircle, X, Mail } from 'lucide-react';

const EMPTY_FORM = { full_name: '', email: '', company: '' };

export default function ExhibitorTeam() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['users-exhibitors'],
    queryFn: () => User.filter({ role: 'exhibitor' }),
  });

  // Filter to same company if the current user is an exhibitor (not organizer)
  const isOrganizer = user?.role === 'organizer' || user?.role === 'marketing_partner';
  const team = isOrganizer
    ? allUsers
    : allUsers.filter(u => u.company && user?.company && u.company.toLowerCase() === user.company.toLowerCase());

  const createMutation = useMutation({
    mutationFn: (data) => User.create({ ...data, role: 'exhibitor' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users-exhibitors'] }); closeForm(); },
    onError: (e) => setFormError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => User.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users-exhibitors'] }); closeForm(); },
    onError: (e) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => User.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users-exhibitors'] }),
  });

  const openAdd = () => {
    setEditUser(null);
    setForm({ ...EMPTY_FORM, company: user?.company || '' });
    setFormError('');
    setShowForm(true);
  };
  const openEdit = (u) => {
    setEditUser(u);
    setForm({ full_name: u.full_name, email: u.email, company: u.company || '' });
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

  return (
    <div className="pb-12 px-4 sm:px-6 pt-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Exhibitor Team</h1>
          <p className="text-muted-foreground text-sm">
            {isOrganizer ? 'All exhibitor portal users' : `Team members for ${user?.company || 'your company'}`}
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-amber text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Summary card */}
      <div className="bg-steel text-white rounded-xl p-4 mb-5 flex items-center gap-4">
        <div className="w-11 h-11 bg-amber/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-amber" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{user?.company || 'Your Company'}</p>
          <p className="text-slate-300 text-xs">{team.length} team member{team.length !== 1 ? 's' : ''} with exhibitor portal access</p>
        </div>
      </div>

      {/* Team list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="py-10 flex justify-center"><div className="w-6 h-6 border-2 border-amber/30 border-t-amber rounded-full animate-spin" /></div>
        ) : team.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No team members yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add a team member to give them exhibitor portal access.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {team.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-amber/10 flex items-center justify-center flex-shrink-0 text-amber font-bold text-sm">
                  {u.full_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{u.full_name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{u.email}</span>
                    {u.company && isOrganizer && <span className="text-muted-foreground/60">· {u.company}</span>}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  u.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'
                }`}>{u.status || 'active'}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(u)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { if (window.confirm(`Remove ${u.full_name} from the team?`)) deleteMutation.mutate(u.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-muted-foreground hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Access info */}
      <div className="mt-4 p-3 rounded-xl bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Exhibitor portal access</span> — team members can log in at <span className="font-mono text-amber">/exhibitor</span> to manage booth info, meetings, and analytics.
        </p>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-lg font-bold">{editUser ? 'Edit Team Member' : 'Add Team Member'}</h2>
              <button onClick={closeForm} className="p-1 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Full Name *" value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} placeholder="Jane Doe" />
              <FormField label="Email *" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="jane@company.com" disabled={!!editUser} />
              <FormField label="Company" value={form.company} onChange={v => setForm(f => ({ ...f, company: v }))} placeholder={user?.company || 'Company name'} />

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
                    <><CheckCircle className="w-4 h-4" />{editUser ? 'Save Changes' : 'Add Member'}</>
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

function FormField({ label, value, onChange, type = 'text', placeholder, disabled }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber disabled:opacity-50 disabled:cursor-not-allowed" />
    </div>
  );
}