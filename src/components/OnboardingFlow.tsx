import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch } from '../lib/api.ts';
import { BrandMark } from './BrandMark.tsx';

const USE_CASES = [
  'AI Chat & Research',
  'Smart Learning & Study',
  'Software Development',
  'Content & Script Creation',
  'Project Management',
  'Personal Life Planning',
];

const INTEREST_OPTIONS = [
  'Artificial Intelligence',
  'Software Architecture',
  'Science & Mathematics',
  'Filmmaking & Storytelling',
  'Product & Startups',
  'Design & UX',
  'Finance & Markets',
  'Academic Research',
];

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Hindi',
  'Japanese',
  'Portuguese',
];

const LEVELS: Array<{
  id: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  label: string;
  desc: string;
}> = [
  {
    id: 'beginner',
    label: 'Beginner',
    desc: 'Clear fundamentals and step-by-step guidance',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    desc: 'Balanced explanations with practical examples',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    desc: 'Concise technical depth and architectural tradeoffs',
  },
  {
    id: 'expert',
    label: 'Expert',
    desc: 'Direct, high-signal responses with minimal preamble',
  },
];

export const OnboardingFlow: React.FC = () => {
  const { profile, theme, setTheme, refreshProfile } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [displayName, setDisplayName] = useState(
    profile?.user.displayName || ''
  );
  const [primaryUseCases, setPrimaryUseCases] = useState<string[]>([
    'AI Chat & Research',
    'Project Management',
  ]);
  const [interests, setInterests] = useState<string[]>([
    'Artificial Intelligence',
    'Software Architecture',
  ]);
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [experienceLevel, setExperienceLevel] = useState<
    'beginner' | 'intermediate' | 'advanced' | 'expert'
  >('intermediate');
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light'>(theme);
  const [defaultAiModel, setDefaultAiModel] = useState('gemini-4-hydrogen');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleItem = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    item: string
  ) => {
    setList((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const handleFinish = async () => {
    setError(null);
    if (!displayName.trim()) {
      setError('Please enter your display name.');
      setStep(1);
      return;
    }
    if (primaryUseCases.length === 0) {
      setError('Select at least one primary use case.');
      setStep(1);
      return;
    }

    setSaving(true);
    try {
      await apiFetch('/api/me/onboarding', {
        method: 'PUT',
        body: JSON.stringify({
          displayName: displayName.trim(),
          interests,
          preferredLanguage,
          experienceLevel,
          primaryUseCases,
          theme: selectedTheme,
          defaultAiModel,
        }),
      });
      await setTheme(selectedTheme, false);
      await refreshProfile();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save your workspace setup.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#070B18] dark:text-slate-100">
      <header className="w-full border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D1326]">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <BrandMark size="md" />
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Step {step} of 3
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-3xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] p-7 sm:p-10 space-y-8">
          {/* Progress indicator */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-colors ${
                  idx <= step
                    ? 'bg-violet-600 dark:bg-violet-500'
                    : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-lg border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                  Personalize your NISWARO AI workspace
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Tell us how you plan to use the platform so we can tailor your
                  dashboard and AI Brain defaults.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="onboard-name"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  What should we call you?
                </label>
                <input
                  id="onboard-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full max-w-md h-10 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B18] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/60"
                />
              </div>

              <div className="space-y-2.5">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Primary use cases
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {USE_CASES.map((item) => {
                    const active = primaryUseCases.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          toggleItem(primaryUseCases, setPrimaryUseCases, item)
                        }
                        className={`flex items-center justify-between px-4 py-3 rounded-lg border text-left text-sm font-medium transition-colors ${
                          active
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 text-violet-900 dark:text-white'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#070B18]/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span>{item}</span>
                        {active && (
                          <Check className="w-4 h-4 text-violet-600 dark:text-cyan-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                  Interests, language, and depth
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  NISWARO AI adapts explanations, study plans, and code output to
                  match your background.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Topics of interest
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {INTEREST_OPTIONS.map((topic) => {
                    const active = interests.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleItem(interests, setInterests, topic)}
                        className={`px-3 py-2.5 rounded-lg border text-xs font-medium text-left transition-colors ${
                          active
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 text-violet-900 dark:text-white'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#070B18]/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label
                    htmlFor="onboard-lang"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Preferred Language
                  </label>
                  <select
                    id="onboard-lang"
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B18] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/60"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Experience Level
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {LEVELS.map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setExperienceLevel(lvl.id)}
                        className={`px-3 py-2 rounded-lg border text-left transition-colors ${
                          experienceLevel === lvl.id
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 text-violet-900 dark:text-white'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-semibold">{lvl.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                  Appearance and AI defaults
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  You can switch themes or AI models anytime from the top bar or
                  Settings.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Interface Theme
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTheme('dark');
                      setTheme('dark', false);
                    }}
                    className={`p-4 rounded-lg border text-left space-y-1.5 transition-colors ${
                      selectedTheme === 'dark'
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <Moon className="w-4 h-4 text-cyan-500" />
                      <span>Dark Navy</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Deep obsidian navy surface with crisp violet and cyan accents.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTheme('light');
                      setTheme('light', false);
                    }}
                    className={`p-4 rounded-lg border text-left space-y-1.5 transition-colors ${
                      selectedTheme === 'light'
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Crisp Light</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      High-contrast neutral slate canvas built for daytime clarity.
                    </p>
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Default AI Model
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDefaultAiModel('gemini-4-hydrogen')}
                    className={`p-4 rounded-lg border text-left space-y-1 transition-colors ${
                      defaultAiModel === 'gemini-4-hydrogen'
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      Gemini 4 Flash
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Recommended · Balanced reasoning, coding, and synthesis.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDefaultAiModel('gemini-3.1-flash-lite')}
                    className={`p-4 rounded-lg border text-left space-y-1 transition-colors ${
                      defaultAiModel === 'gemini-3.1-flash-lite'
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      Gemini 3.1 Flash Lite
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ultra-low latency for fast checklists and concise answers.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
              disabled={step === 1}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-2 disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  if (step === 1 && !displayName.trim()) {
                    setError('Please enter your name before continuing.');
                    return;
                  }
                  if (step === 1 && primaryUseCases.length === 0) {
                    setError('Please select at least one primary use case.');
                    return;
                  }
                  setStep((s) => (s + 1) as 1 | 2 | 3);
                }}
                className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Enter Workspace</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
