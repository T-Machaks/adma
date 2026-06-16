import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Info } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { useAuth } from "@/lib/AuthContext";

const DEMO_ACCOUNTS = [
  { email: "organizer@minecon.global",  role: "Organizer",         dest: "Console" },
  { email: "partner@minecon.global",    role: "Marketing Partner", dest: "Console" },
  { email: "exhibitor@minecon.global",  role: "Exhibitor",         dest: "Exhibitor Portal" },
  { email: "attendee@minecon.global",   role: "Attendee",          dest: "Attendee App" },
];

export default function Login() {
  const { login } = useAuth();
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
    await new Promise(r => setTimeout(r, 300));
    try {
      const result = await login(email);
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

  const handleGoogle = () => {
    setError("Google sign-in is not available in demo mode. Please use email login.");
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
          <Link to="/register" className="text-primary font-medium hover:underline">
            Register
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {/* Demo credentials hint */}
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
            <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-2">
              Stub mode — password is ignored
            </p>
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
          <p className="text-[10px] text-muted-foreground">Stub mode — password is not validated yet.</p>
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
