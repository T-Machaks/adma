import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, User, FileImage, AlignLeft, ChevronDown, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/AuthLayout';

const TIERS = [
  { value: 'Diamond', label: 'Diamond', desc: 'Premium placement, maximum visibility', color: 'text-cyan-400' },
  { value: 'Gold',    label: 'Gold',    desc: 'High-profile booth, featured listing',  color: 'text-amber-400' },
  { value: 'Chrome',  label: 'Chrome',  desc: 'Standard exhibitor listing',             color: 'text-slate-400' },
  { value: 'Copper',  label: 'Copper',  desc: 'Entry-level presence',                  color: 'text-orange-600' },
];

const MAX_DESC = 150;

export default function ExhibitorApply() {
  const navigate = useNavigate();
  const fileRef  = useRef(null);

  const [form, setForm] = useState({
    full_name: '', email: '', company: '', tier: '', description: '', password: '', confirmPassword: '',
  });
  const [logoFile, setLogoFile]   = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoError, setLogoError] = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');

    if (!file.type.startsWith('image/')) {
      setLogoError('Please select an image file.');
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width !== 500 || img.height !== 500) {
        setLogoError(`Image must be exactly 500×500 px. Yours is ${img.width}×${img.height} px.`);
        setLogoFile(null);
        setLogoPreview('');
      } else {
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
      }
    };
    img.src = url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.tier)           return setError('Please select a tier.');
    if (!logoFile)            return setError('Please upload your 500×500 logo.');
    if (form.description.length > MAX_DESC) return setError(`Description must be ${MAX_DESC} characters or fewer.`);
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');

    setLoading(true);
    try {
      // 1. Get presigned URL for logo
      const urlRes = await fetch('/api/upload/exhibitor-logo-url', { method: 'POST' });
      if (!urlRes.ok) throw new Error('Could not get upload URL.');
      const { uploadUrl, publicUrl } = await urlRes.json();

      // 2. Upload logo directly to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        body: logoFile,
      });
      if (!uploadRes.ok) throw new Error('Logo upload failed.');

      // 3. Submit application
      const appRes = await fetch('/api/exhibitor-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:   form.full_name,
          email:       form.email,
          company:     form.company,
          tier:        form.tier,
          description: form.description,
          logo_url:    publicUrl,
          password:    form.password,
        }),
      });
      const data = await appRes.json();
      if (!appRes.ok) throw new Error(data.error || 'Application failed.');

      setSubmitted(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthLayout
        icon={CheckCircle}
        title="Application submitted!"
        subtitle="We'll review your application and be in touch shortly."
        footer={<Link to="/login" className="text-primary font-medium hover:underline">← Back to login</Link>}
      >
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>Your exhibitor application for <strong className="text-foreground">{form.company}</strong> has been received.</p>
          <p>An organizer will review your application and you'll receive an email at <strong className="text-foreground">{form.email}</strong> once a decision has been made.</p>
          <p>Once approved you can log in to the Exhibitor Portal using your registered email and password.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Building2}
      title="Exhibitor Application"
      subtitle="Apply to exhibit at MineCon 2026 — subject to organizer approval"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
        </>
      }
    >
      {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Contact person */}
        <div className="space-y-2">
          <Label htmlFor="full_name">Contact person</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="full_name" type="text" placeholder="Jane Smith" autoFocus
              value={form.full_name} onChange={e => set('full_name', e.target.value)}
              className="pl-10 h-11" required />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="email" type="email" placeholder="you@company.com" autoComplete="email"
              value={form.email} onChange={e => set('email', e.target.value)}
              className="pl-10 h-11" required />
          </div>
        </div>

        {/* Company */}
        <div className="space-y-2">
          <Label htmlFor="company">Company / organisation name</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="company" type="text" placeholder="Acme Corp"
              value={form.company} onChange={e => set('company', e.target.value)}
              className="pl-10 h-11" required />
          </div>
        </div>

        {/* Tier */}
        <div className="space-y-2">
          <Label>Exhibitor tier</Label>
          <div className="grid grid-cols-2 gap-2">
            {TIERS.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => set('tier', t.value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  form.tier === t.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-muted-foreground/50'
                }`}
              >
                <p className={`text-sm font-semibold ${t.color}`}>{t.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Tier is subject to organizer confirmation.</p>
        </div>

        {/* Logo upload */}
        <div className="space-y-2">
          <Label>Company logo <span className="text-muted-foreground font-normal">(500×500 px, PNG/JPG)</span></Label>
          <div
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors
              ${logoError ? 'border-destructive/50 bg-destructive/5' : 'border-border hover:border-muted-foreground/50'}`}
            onClick={() => fileRef.current?.click()}
          >
            {logoPreview ? (
              <div className="flex flex-col items-center gap-2">
                <img src={logoPreview} alt="Logo preview" className="w-20 h-20 rounded-lg object-cover" />
                <p className="text-xs text-muted-foreground">{logoFile?.name}</p>
                <p className="text-xs text-primary">Click to change</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-2">
                <FileImage className="w-8 h-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Click to upload logo</p>
                <p className="text-xs text-muted-foreground/60">Must be exactly 500×500 px</p>
              </div>
            )}
          </div>
          {logoError && <p className="text-xs text-destructive">{logoError}</p>}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description">Company description</Label>
            <span className={`text-xs ${form.description.length > MAX_DESC ? 'text-destructive' : 'text-muted-foreground'}`}>
              {form.description.length}/{MAX_DESC}
            </span>
          </div>
          <div className="relative">
            <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <textarea
              id="description"
              placeholder="Brief description of your company and what you'll be showcasing…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              maxLength={MAX_DESC + 10}
              rows={3}
              className="w-full pl-10 pr-3 py-2.5 rounded-md border border-input bg-background text-sm
                         resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Create a password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="password" type="password" placeholder="At least 6 characters" autoComplete="new-password"
              value={form.password} onChange={e => set('password', e.target.value)}
              className="pl-10 h-11" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="confirmPassword" type="password" placeholder="Repeat your password" autoComplete="new-password"
              value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
              className="pl-10 h-11" required />
          </div>
        </div>

        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</> : 'Submit application'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Your application will be reviewed by an organizer. You'll receive an email once a decision is made.
        </p>
      </form>
    </AuthLayout>
  );
}
