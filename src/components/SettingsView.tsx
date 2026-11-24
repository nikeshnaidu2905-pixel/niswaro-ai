import React, { useState } from 'react';
import { Download, Loader2, Moon, Save, Sun, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch } from '../lib/api.ts';
import { AiModelOption, DashboardSummary } from '../types/niswaro.ts';

interface SettingsViewProps {
  models: AiModelOption[];
  dashboard: DashboardSummary | null;
  onModelChange: (model: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  models,
  dashboard,
  onModelChange,
}) => {
  const { profile, theme, setTheme, refreshProfile, signOutUser } = useAuth();

  const [displayName, setDisplayName] = useState(
    profile?.user.displayName || ''
  );
  const [preferredLanguage, setPreferredLanguage] = useState(
    profile?.preferences.preferredLanguage || 'English'
  );
  const [experienceLevel, setExperienceLevel] = useState(
    profile?.preferences.experienceLevel || 'intermediate'
  );
  const [defaultAiModel, setDefaultAiModel] = useState(
    profile?.preferences.defaultAiModel || 'gemini-4-hydrogen'
  );
  const [memoryEnabled, setMemoryEnabled] = useState(
    profile?.preferences.memoryEnabled ?? true
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    profile?.preferences.notificationsEnabled ?? true
  );

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await apiFetch('/api/me/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: displayName.trim(),
          preferredLanguage,
          experienceLevel,
          defaultAiModel,
          memoryEnabled,
          notificationsEnabled,
          theme,
        }),
      });
      onModelChange(defaultAiModel);
      await refreshProfile();
      setFeedback('Account settings saved.');
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : 'Could not save settings.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await apiFetch<Record<string, unknown>>('/api/me/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `niswaro-ai-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await apiFetch('/api/me', { method: 'DELETE' });
      await signOutUser();
    } finally {
      setDeleting(false);
    }
  };

  const tokensUsed = dashboard?.stats.totalTokensUsed ?? 0;
  const tokenLimit = profile?.subscription.monthlyTokenLimit ?? 250000;
  const usagePct = Math.min(100, Math.round((tokensUsed / tokenLimit) * 100));

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-7 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
          Settings &amp; Account
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Manage your profile, AI model defaults, memory permissions, theme, and
          workspace data.
        </p>
      </div>

      {feedback && (
        <div
          role="status"
          className="p-3.5 rounded-lg border border-cyan-300 dark:border-cyan-500/40 bg-cyan-50 dark:bg-cyan-950/30 text-xs text-cyan-900 dark:text-cyan-200"
        >
          {feedback}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] divide-y divide-slate-200 dark:divide-slate-800"
      >
        {/* Profile */}
        <div className="p-6 space-y-4">
          <h2 className="font-display text-sm font-semibold text-slate-950 dark:text-white">
            Profile &amp; Preferences
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="set-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Display Name
              </label>
              <input
                id="set-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B18] text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <input
                type="text"
                disabled
                value={profile?.user.email || ''}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#070B18]/50 text-sm text-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="set-lang"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Preferred Language
              </label>
              <select
                id="set-lang"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B18] text-sm text-slate-900 dark:text-slate-100"
              >
                {['English', 'Spanish', 'French', 'German', 'Hindi', 'Japanese', 'Portuguese'].map(
                  (lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="set-level"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Experience Level
              </label>
              <select
                id="set-level"
                value={experienceLevel}
                onChange={(e) =>
                  setExperienceLevel(
                    e.target.value as
                      | 'beginner'
                      | 'intermediate'
                      | 'advanced'
                      | 'expert'
                  )
                }
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B18] text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </div>
        </div>

        {/* Theme & AI Controls */}
        <div className="p-6 space-y-5">
          <h2 className="font-display text-sm font-semibold text-slate-950 dark:text-white">
            Appearance, AI Model &amp; Memory
          </h2>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-slate-900 dark:text-white">
                Theme Mode
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Switch between Dark Navy and Crisp Light workspace themes.
              </div>
            </div>
            <div className="inline-flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#070B18] border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTheme('dark', true)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 ${
                  theme === 'dark'
                    ? 'bg-white dark:bg-[#141C35] text-slate-950 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('light', true)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 ${
                  theme === 'light'
                    ? 'bg-white dark:bg-[#141C35] text-slate-950 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-w-md">
            <label
              htmlFor="set-model"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Default AI Model
            </label>
            <select
              id="set-model"
              value={defaultAiModel}
              onChange={(e) => setDefaultAiModel(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B18] text-sm text-slate-900 dark:text-slate-100"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.speed})
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={memoryEnabled}
              onChange={(e) => setMemoryEnabled(e.target.checked)}
              className="mt-1 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <div>
              <div className="text-xs font-medium text-slate-900 dark:text-white">
                Knowledge Vault Memory
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Allow AI Brain to include your recent Knowledge Vault notes as
                contextual reference.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              className="mt-1 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <div>
              <div className="text-xs font-medium text-slate-900 dark:text-white">
                Workspace Notifications
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Receive in-app updates for project deadlines and workspace events.
              </div>
            </div>
          </label>
        </div>

        <div className="px-6 py-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Changes</span>
          </button>
        </div>
      </form>

      {/* Subscription & Usage */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-950 dark:text-white">
              Subscription &amp; Usage
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
              Current Plan: {profile?.subscription.plan || 'free'} · Status:{' '}
              {profile?.subscription.status || 'active'}
            </p>
          </div>
          <span className="font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums">
            {tokensUsed.toLocaleString()} / {tokenLimit.toLocaleString()} tokens
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-violet-600 dark:bg-cyan-400 rounded-full"
            style={{ width: `${usagePct}%` }}
          />
        </div>
      </section>

      {/* Data Export & Deletion */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-950 dark:text-white">
              Data Portability
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download all your projects, tasks, conversations, documents, and
              Knowledge Vault items as JSON.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#141C35] text-xs font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Export Data (JSON)</span>
          </button>
        </div>

        <div className="pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-semibold text-red-600 dark:text-red-400">
              Delete Workspace Data
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Permanently remove all PostgreSQL records linked to your account.
            </p>
          </div>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-500/40 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account Data</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAccount}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
              >
                {deleting ? 'Deleting…' : 'Confirm Permanent Delete'}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
