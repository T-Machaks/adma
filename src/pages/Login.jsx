import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Info } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/lib/AuthContext";
import SocialAuthButtons, { SocialDivider } from "@/components/SocialAuthButtons";

const DEMO_ACCOUNTS = [
  { email: "organizer@minecon.global",  role: "Organizer",         dest: "Console" },
  { email: "partner@minecon.global",    role: "Marketing Partner", dest: "Console" },
  { email: "exhibitor@minecon.global",  role: "Exhibitor",         dest: "Exhibitor Portal" },
  { email: "attendee@minecon.global",   role: "Attendee",          dest: "Attendee App" },
];

export default function Login() {
  const { login, setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const intendedPath = location.state?.from || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate(intendedPath || result.redirectTo, { replace: true });
      } else {
        setError(result.error);
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSuccess = (userData) => {
    const result = setSession(userData);
    navigate(intendedPath || result.redirectTo, { replace: true });
  };

  const fillDemo = (email) => {
    setEmail(email);
    setPassword("demo");
    setShowDemo(false);
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary font-medium hover:underline">
            Create free account
          </Link>
          {" · "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Event registration
          </Link>
        </>
      }
    >
      <SocialAuthButtons
        onSuccess={handleSocialSuccess}
        onError={setError}
      />
      <SocialDivider />

      {/* Internal demo accounts — only visible on localhost */}
      {window.location.hostname === 'localhost' && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowDemo(v => !v)}
            className="flex items-center gap-1.5 text-xs text-amber font-medium hover:underline"
          >
            <Info className="w-3.5 h-3.5" />
            {showDemo ? "Hide demo accounts" : "Show demo accounts"}
          </button>
          {showDemo && (
            <div className="mt-2 rounded-xl border border-amber/30 bg-amber/5 p-3 space-y-1.5">
              {DEMO_ACCOUNTS.map(a => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => fillDemo(a.email)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-amber/10 transition-colors text-left"
                >
                  <div>
                    <p className="text-xs font-semibold">{a.role}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{a.email}</p>
                  </div>
                  <span className="text-[10px] text-amber font-bold">{a.dest} →</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
