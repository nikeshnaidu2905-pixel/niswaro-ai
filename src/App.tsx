import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AuthWelcome } from './components/AuthWelcome.tsx';
import { OnboardingFlow } from './components/OnboardingFlow.tsx';
import { AppShell } from './components/AppShell.tsx';
import { HomeDashboard } from './components/HomeDashboard.tsx';
import { AiBrainView } from './components/AiBrainView.tsx';
import {
  KnowledgeVaultView,
  LifeManagerView,
  ProjectsView,
} from './components/ProjectsAndVaultView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { ModuleWorkspaceBridge } from './components/ModuleWorkspaceBridge.tsx';
import { apiFetch } from './lib/api.ts';
import {
  AiModelOption,
  DashboardSummary,
  ModuleId,
  TaskItem,
} from './types/niswaro.ts';

const DEFAULT_MODELS: AiModelOption[] = [
  {
    id: 'gemini-4-hydrogen',
    label: 'Gemini 4 Flash',
    provider: 'Google Gemini',
    capability: 'Balanced intelligence for chat, analysis, writing, and coding',
    speed: 'Fast',
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    provider: 'Google Gemini',
    capability: 'Ultra-low latency for quick summaries and ideation',
    speed: 'Instant',
  },
];

const WorkspaceRouter: React.FC = () => {
  const { firebaseUser, profile, loading } = useAuth();

  const [activeModule, setActiveModule] = useState<ModuleId>('home');
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState<string | null>(null);
  const [models, setModels] = useState<AiModelOption[]>(DEFAULT_MODELS);
  const [selectedModel, setSelectedModel] = useState('gemini-4-hydrogen');
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(
    null
  );
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  // Modals
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projTitle, setProjTitle] = useState('');
  const [projCategory, setProjCategory] = useState('Engineering');
  const [projDesc, setProjDesc] = useState('');
  const [projDeadline, setProjDeadline] = useState('');
  const [projSaving, setProjSaving] = useState(false);

  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [docMime, setDocMime] = useState('text/plain');
  const [docSize, setDocSize] = useState(0);
  const [docText, setDocText] = useState('');
  const [docSaving, setDocSaving] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!firebaseUser) return;
    setDashLoading(true);
    setDashError(null);
    try {
      const [summary, modelRes] = await Promise.all([
        apiFetch<DashboardSummary>('/api/dashboard'),
        apiFetch<{ models: AiModelOption[] }>('/api/ai/models').catch(() => ({
          models: DEFAULT_MODELS,
        })),
      ]);
      setDashboard(summary);
      if (modelRes.models.length > 0) setModels(modelRes.models);
    } catch (err) {
      setDashError(
        err instanceof Error ? err.message : 'Unable to load workspace data.'
      );
    } finally {
      setDashLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (profile?.preferences.defaultAiModel) {
      setSelectedModel(profile.preferences.defaultAiModel);
    }
  }, [profile?.preferences.defaultAiModel]);

  useEffect(() => {
    if (firebaseUser && profile?.user.onboardingCompleted) {
      loadDashboard();
    }
  }, [firebaseUser, profile?.user.onboardingCompleted, loadDashboard]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-[#070B18] text-slate-600 dark:text-slate-300">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
        <span className="text-xs font-medium">Loading NISWARO AI…</span>
      </div>
    );
  }

  if (!firebaseUser) {
    return <AuthWelcome />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-[#070B18] text-slate-600 dark:text-slate-300">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
        <span className="text-xs font-medium">Synchronizing workspace…</span>
      </div>
    );
  }

  if (!profile.user.onboardingCompleted) {
    return <OnboardingFlow />;
  }

  const handleToggleTask = async (task: TaskItem) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    await apiFetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    await loadDashboard();
  };

  const handleDeleteTask = async (taskId: number) => {
    await apiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    await loadDashboard();
  };

  const handleCreateTask = async (
    title: string,
    priority: TaskItem['priority']
  ) => {
    await apiFetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title,
        priority,
        projectId: activeProjectId,
      }),
    });
    await loadDashboard();
  };

  const handleMarkNotificationsRead = async () => {
    await apiFetch('/api/notifications/read', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    await loadDashboard();
  };

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projTitle.trim() || projSaving) return;
    setProjSaving(true);
    try {
      const res = await apiFetch<{ project: { id: number } }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: projTitle.trim(),
          category: projCategory,
          description: projDesc.trim(),
          deadline: projDeadline || null,
        }),
      });
      setActiveProjectId(res.project.id);
      setProjTitle('');
      setProjDesc('');
      setProjDeadline('');
      setShowCreateProject(false);
      await loadDashboard();
    } finally {
      setProjSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFileName(file.name);
    setDocMime(file.type || 'application/octet-stream');
    setDocSize(file.size);
    if (!docTitle.trim()) {
      setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
    if (
      file.type.startsWith('text/') ||
      /\.(md|txt|json|csv|ts|tsx|js|py|html|css)$/i.test(file.name)
    ) {
      const text = await file.text();
      setDocText(text.slice(0, 120000));
    } else {
      setDocText(
        `Uploaded file: ${file.name} (${file.type || 'binary'}, ${file.size} bytes). Add optional summary notes here so AI Brain can index this file.`
      );
    }
  };

  const handleUploadDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || docSaving) return;
    setDocSaving(true);
    try {
      await apiFetch('/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          title: docTitle.trim(),
          fileName: docFileName || `${docTitle.trim()}.txt`,
          mimeType: docMime,
          sizeBytes: docSize || docText.length,
          contentText: docText,
          projectId: activeProjectId,
        }),
      });
      setDocTitle('');
      setDocFileName('');
      setDocText('');
      setDocSize(0);
      setShowUploadDoc(false);
      await loadDashboard();
    } finally {
      setDocSaving(false);
    }
  };

  const launchAiPrompt = (prompt: string) => {
    setActiveConversationId(null);
    setPendingPrompt(prompt);
    setActiveModule('ai_brain');
  };

  return (
    <>
      <AppShell
        activeModule={activeModule}
        onSelectModule={(mod) => setActiveModule(mod)}
        onNewChat={() => {
          setActiveConversationId(null);
          setPendingPrompt(null);
          setActiveModule('ai_brain');
        }}
        dashboard={dashboard}
        activeProjectId={activeProjectId}
        onSelectProjectId={setActiveProjectId}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        models={models}
        onToggleTask={handleToggleTask}
        onMarkNotificationsRead={handleMarkNotificationsRead}
      >
        {activeModule === 'home' && (
          <HomeDashboard
            dashboard={dashboard}
            loading={dashLoading}
            error={dashError}
            onRefresh={loadDashboard}
            onSelectModule={setActiveModule}
            onOpenConversation={(id) => {
              setActiveConversationId(id);
              setPendingPrompt(null);
              setActiveModule('ai_brain');
            }}
            onLaunchAiPrompt={(prompt) => launchAiPrompt(prompt)}
            onOpenCreateProject={() => setShowCreateProject(true)}
            onOpenUploadDocument={() => setShowUploadDoc(true)}
            onSelectProjectContext={setActiveProjectId}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onCreateQuickTask={handleCreateTask}
          />
        )}

        {activeModule === 'ai_brain' && (
          <AiBrainView
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            models={models}
            activeProjectId={activeProjectId}
            initialConversationId={activeConversationId}
            initialPrompt={pendingPrompt}
            onClearInitialPrompt={() => setPendingPrompt(null)}
            onDataMutated={loadDashboard}
          />
        )}

        {activeModule === 'projects' && (
          <ProjectsView
            activeProjectId={activeProjectId}
            onSelectProjectContext={setActiveProjectId}
            onOpenCreateProject={() => setShowCreateProject(true)}
            onDataMutated={loadDashboard}
          />
        )}

        {activeModule === 'knowledge_vault' && (
          <KnowledgeVaultView
            activeProjectId={activeProjectId}
            onDataMutated={loadDashboard}
          />
        )}

        {activeModule === 'life_manager' && (
          <LifeManagerView
            tasks={dashboard?.upcomingTasks ?? []}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onCreateTask={handleCreateTask}
            onLaunchAiSchedule={(prompt) => launchAiPrompt(prompt)}
          />
        )}

        {activeModule === 'settings' && (
          <SettingsView
            models={models}
            dashboard={dashboard}
            onModelChange={setSelectedModel}
          />
        )}

        {(activeModule === 'smart_learning' ||
          activeModule === 'creator_studio' ||
          activeModule === 'developer_lab' ||
          activeModule === 'research_lab' ||
          activeModule === 'integrations') && (
          <ModuleWorkspaceBridge
            moduleId={activeModule}
            onLaunchAiPrompt={(prompt) => launchAiPrompt(prompt)}
            onOpenUploadDocument={() => setShowUploadDoc(true)}
          />
        )}
      </AppShell>

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form
            onSubmit={handleCreateProjectSubmit}
            className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-slate-950 dark:text-white">
                Create New Project
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateProject(false)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  value={projTitle}
                  onChange={(e) => setProjTitle(e.target.value)}
                  placeholder="e.g. Q4 Product Architecture"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B18] text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    value={projCategory}
                    onChange={(e) => setProjCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B18] text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Research">Research</option>
                    <option value="Learning">Learning</option>
                    <option value="Content">Content</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    value={projDeadline}
                    onChange={(e) => setProjDeadline(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B18] text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  placeholder="Goals, deliverables, and context for AI Brain…"
                  className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B18] text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateProject(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!projTitle.trim() || projSaving}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold disabled:opacity-40"
              >
                {projSaving ? 'Creating…' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upload Document / PDF Modal */}
      {showUploadDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form
            onSubmit={handleUploadDocSubmit}
            className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-slate-950 dark:text-white">
                Upload PDF or Reference File
              </h2>
              <button
                type="button"
                onClick={() => setShowUploadDoc(false)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Select File (PDF, Markdown, TXT, Code)
                </label>
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.csv,.json,.ts,.tsx,.js,.py"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-violet-600 file:text-white file:text-xs file:font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Research Notes — Distributed Systems"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B18] text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Indexed Text / Notes
                </label>
                <textarea
                  rows={4}
                  value={docText}
                  onChange={(e) => setDocText(e.target.value)}
                  placeholder="Paste text content or key excerpts for instant search and AI analysis…"
                  className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B18] text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUploadDoc(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!docTitle.trim() || docSaving}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold disabled:opacity-40"
              >
                {docSaving ? 'Uploading…' : 'Save Document'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceRouter />
    </AuthProvider>
  );
}
