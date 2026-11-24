import React, { useState } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { BrandMark } from './BrandMark.tsx';

type AuthMode = 'login' | 'register' | 'reset';

const PLATFORM_PILLARS = [
  {
    index: '01',
    title: 'AI Brain & Multi-Model Orchestration',
    summary:
      'Conversational intelligence grounded in your active projects, uploaded files, and Knowledge Vault.',
  },
  {
    index: '02',
    title: 'Learning, Creation & Research Labs',
    summary:
      'Structured workspaces for study guides, scripts, software engineering, and cited source analysis.',
  },
  {
    index: '03',
    title: 'Projects, Tasks & Life Manager',
    summary:
      'Unified PostgreSQL workspace linking every conversation, file, deadline, and daily schedule.',
  },
];

export const AuthWelcome: React.FC = () => {
  const {
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    resetPassword,
    theme,
    setTheme,
    error,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setLocalError(null);
    setNotice(null);
    clearError();
  };

  const handleGoogle = async () => {
    setLocalError(null);
    setNotice(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setNotice(null);

    if (!email.trim()) {
      setLocalError('Please enter your email address.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        if (!password) {
          setLocalError('Please enter your password.');
          return;
        }
        await signInWithEmail(email, password);
      } else if (mode === 'register') {
        if (!displayName.trim()) {
          setLocalError('Please enter your full name.');
          return;
        }
        if (password.length < 6) {
          setLocalError('Password must be at least 6 characters.');
          return;
        }
        await registerWithEmail(displayName, email, password);
        setNotice(
          'Account created. Check your inbox to verify your email address.'
        );
      } else {
        await resetPassword(email);
        setNotice(
          'If an account exists for that email, a password reset link has been sent.'
        );
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeError = localError || error;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#070B18] dark:text-slate-100">
      {/* 3-Zone Top Bar Contract */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#070B18]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <BrandMark size="md" />

          <nav
            aria-label="Platform overview"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-400"
          >
            <a
              href="#capabilities"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <a
              href="#architecture"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Workspace
            </a>
            <a
              href="#security"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Security
            </a>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark', false)}
              className="inline-flex items-center gap-1.5 hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
            </button>
          </nav>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            {googleLoading ? 'Connecting…' : 'Launch Workspace'}
          </button>
        </div>
      </header>

      {/* Main Split Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
        {/* Left Editorial Column */}
        <section className="lg:col-span-7 flex flex-col justify-between gap-10">
          <div className="space-y-6">
            <p className="text-xs font-medium text-violet-600 dark:text-cyan-400 tracking-wide">
              Unified AI Productivity Operating System
            </p>
            <h1
              className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-slate-950 dark:text-white leading-[1.08] max-w-2xl"
              style={{ textWrap: 'balance' }}
            >
              Learn, build, research, and run your work from one intelligent workspace.
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              NISWARO AI brings conversational intelligence, structured study,
              content production, software engineering, and personal execution into
              a single synchronized platform backed by PostgreSQL.
            </p>
          </div>

          {/* Architectural Geometric Visual (Zero-Broken-Image Bespoke SVG Surface) */}
          <div
            id="architecture"
            className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-[#0D1326] p-6 sm:p-8"
          >
            <svg
              className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
              viewBox="0 0 800 320"
              fill="none"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="prism-v" x1="0" y1="0" x2="800" y2="320" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.45" />
                  <stop offset="55%" stopColor="#06B6D4" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#070B18" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 240 L260 40 L560 170 L800 20 L800 320 L0 320 Z" fill="url(#prism-v)" />
              <line x1="0" y1="80" x2="800" y2="80" stroke="#94A3B8" strokeOpacity="0.12" />
              <line x1="0" y1="160" x2="800" y2="160" stroke="#94A3B8" strokeOpacity="0.12" />
              <line x1="0" y1="240" x2="800" y2="240" stroke="#94A3B8" strokeOpacity="0.12" />
              <line x1="260" y1="0" x2="260" y2="320" stroke="#8B5CF6" strokeOpacity="0.18" />
              <line x1="540" y1="0" x2="540" y2="320" stroke="#06B6D4" strokeOpacity="0.18" />
            </svg>

            <div id="capabilities" className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {PLATFORM_PILLARS.map((pillar) => (
                <div key={pillar.index} className="space-y-2">
                  <div className="font-mono text-xs text-cyan-400 tabular-nums">
                    {pillar.index}.
                  </div>
                  <h2 className="font-display text-sm font-semibold text-white leading-snug">
                    {pillar.title}
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {pillar.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Security & Privacy Assurance */}
          <div
            id="security"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800/80"
          >
            <span>Firebase Identity Verification</span>
            <span aria-hidden="true">·</span>
            <span>User-Scoped PostgreSQL Persistence</span>
            <span aria-hidden="true">·</span>
            <span>Server-Side AI Orchestration</span>
            <span aria-hidden="true">·</span>
            <span>Full Data Export Control</span>
          </div>
        </section>

        {/* Right Authentication Surface */}
        <section className="lg:col-span-5 flex items-center">
          <div className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] p-7 sm:p-8 space-y-6">
            <div className="space-y-1.5">
              <h2 className="font-display text-2xl font-bold text-slate-950 dark:text-white tracking-tight">
                {mode === 'login' && 'Sign in to NISWARO AI'}
                {mode === 'register' && 'Create your workspace'}
                {mode === 'reset' && 'Reset your password'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {mode === 'login' &&
                  'Access your conversations, projects, tasks, and Knowledge Vault.'}
                {mode === 'register' &&
                  'Personalize your AI workspace in under a minute.'}
                {mode === 'reset' &&
                  'Enter your account email and we will send a recovery link.'}
              </p>
            </div>

            {mode !== 'reset' && (
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#070B18] border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    mode === 'login'
                      ? 'bg-white dark:bg-[#141C35] text-slate-950 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className={`py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    mode === 'register'
                      ? 'bg-white dark:bg-[#141C35] text-slate-950 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Primary Google Sign-In */}
            {mode !== 'reset' && (
              <>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={googleLoading}
                  className="w-full h-11 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#141C35] hover:bg-slate-50 dark:hover:bg-[#1A2546] text-slate-900 dark:text-white text-sm font-semibold inline-flex items-center justify-center gap-3 transition-colors disabled:opacity-60"
                >
                  {googleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                      />
                      <path
                        fill="#34A853"
                        d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                      />
                    </svg>
                  )}
                  <span>Continue with Google</span>
                </button>

                <div className="relative flex items-center">
                  <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
                  <span className="px-3 text-xs text-slate-500 dark:text-slate-400">
                    or continue with email
                  </span>
                  <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
                </div>
              </>
            )}

            {activeError && (
              <div
                role="alert"
                className="p-3.5 rounded-lg border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300 leading-relaxed"
              >
                {activeError}
              </div>
            )}

            {notice && (
              <div
                role="status"
                className="p-3.5 rounded-lg border border-cyan-300 dark:border-cyan-500/40 bg-cyan-50 dark:bg-cyan-950/30 text-xs text-cyan-800 dark:text-cyan-200 leading-relaxed"
              >
                {notice}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="auth-name"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B18] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/60"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@organization.com"
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B18] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/60"
                />
              </div>

              {mode !== 'reset' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('reset')}
                        className="text-xs font-medium text-violet-600 dark:text-cyan-400 hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={
                        mode === 'login' ? 'current-password' : 'new-password'
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter at least 6 characters"
                      className="w-full h-10 pl-3.5 pr-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B18] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'login' && 'Sign In'}
                      {mode === 'register' && 'Create Account'}
                      {mode === 'reset' && 'Send Recovery Email'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {mode === 'reset' && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Back to Sign In
                </button>
              )}
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};
