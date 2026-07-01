import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, Mail, User, Loader2, Building2, Lock, Phone, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/lib/AuthContext';
import SocialAuthButtons, { SocialDivider } from '@/components/SocialAuthButtons';

function isValidZimPhone(value) {
  if (!value) return true;
  const clean = value.replace(/[\s\-\(\)]/g, '');
  return /^(\+2637[0-9]{8}|07[0-9]{8})$/.test(clean);
}

function normalizeZimPhone(value) {
  if (!value) return '';
  const clean = value.replace(/[\s\-\(\)]/g, '');
  return clean.startsWith('07') ? '+263' + clean.slice(1) : clean;
}

export default function Signup() {
  const { register, setSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    full_name: searchParams.get('name') || '',
    email:     searchParams.get('email') || '',
    company:   '',
    phone:     '',
    password:  '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoneChange = (v) => {
    set('phone', v);
    if (v && !isValidZimPhone(v)) {
      setPhoneError('Enter a valid Zimbabwe number (e.g. 0771234567 or +263771234567)');
    } else {
      setPhoneError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.phone && !isValidZimPhone(form.phone)) {
      setPhoneError('Enter a valid Zimbabwe number (e.g. 0771234567 or +263771234567)');
      return;
    }
    setLoading(true);
    try {
      const result = await register({
        full_name: form.full_name,
        email: form.email,
        company: form.company,
        phone: normalizeZimPhone(form.phone),
        password: form.password,
      });
      if (result.success) {
        navigate(result.redirectTo || '/');
      } else {
        setError(result.error);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSuccess = (userData) => {
    setSession(userData);
    navigate('/');
  };

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Free account to book meetings and interact with exhibitors"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
          {' · '}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Event registration
          </Link>
        </>
      }
    >
      <SocialAuthButtons onSuccess={handleSocialSuccess} onError={setError} />
      <SocialDivider />

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="full_name"
              type="text"
              placeholder="Jane Smith"
              autoFocus
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company">Company <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="company"
              type="text"
              placeholder="Your organisation"
              value={form.company}
              onChange={e => set('company', e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">
            Zimbabwe mobile{' '}
            <span className="text-muted-foreground font-normal">(optional — enables SMS OTP)</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              placeholder="+263 77 123 4567 or 0771234567"
              autoComplete="off"
              value={form.phone}
              onChange={e => handlePhoneChange(e.target.value)}
              className={`pl-10 h-12 ${phoneError ? 'border-destructive' : ''}`}
            />
          </div>
          {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPass ? 'text' : 'password'}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              className="pl-10 pr-10 h-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPass(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repeat your password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={e => set('confirmPassword', e.target.value)}
              className="pl-10 pr-10 h-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account…
            </>
          ) : (
            'Create free account'
          )}
        </Button>

        {/* Security assurance */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
          <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your information is protected with SSL encryption. We never sell or share your personal data with third parties.
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          This is a platform account for booking meetings and managing enquiries.
          For event attendance tickets, use{' '}
          <Link to="/register" className="underline">Event Registration</Link>.
        </p>
      </form>
    </AuthLayout>
  );
}
