import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Clapperboard,
  Code2,
  FileText,
  FileUp,
  FolderKanban,
  FolderPlus,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  SearchCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch } from '../lib/api.ts';
import {
  DashboardSummary,
  DocumentItem,
  ModuleId,
  SearchResults,
  TaskItem,
} from '../types/niswaro.ts';

interface HomeDashboardProps {
  dashboard: DashboardSummary | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onSelectModule: (mod: ModuleId) => void;
  onOpenConversation: (conversationId: number) => void;
  onLaunchAiPrompt: (prompt: string, moduleTag?: string) => void;
  onOpenCreateProject: () => void;
  onOpenUploadDocument: () => void;
  onSelectProjectContext: (projectId: number) => void;
  onToggleTask: (task: TaskItem) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
  onCreateQuickTask: (title: string, priority: TaskItem['priority']) => Promise<void>;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  dashboard,
  loading,
  error,
  onRefresh,
  onSelectModule,
  onOpenConversation,
  onLaunchAiPrompt,
  onOpenCreateProject,
  onOpenUploadDocument,
  onSelectProjectContext,
  onToggleTask,
  onDeleteTask,
  onCreateQuickTask,
}) => {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] =
    useState<TaskItem['priority']>('medium');
  const [addingTask, setAddingTask] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiFetch<SearchResults>(
          `/api/search?q=${encodeURIComponent(trimmed)}`
        );
        setSearchResults(res);
      } catch {
        setSearchResults(null);
      } finally {
        setSearching(false);
      }
    }, 240);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const handleQuickTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || addingTask) return;
    setAddingTask(true);
    try {
      await onCreateQuickTask(newTaskTitle.trim(), newTaskPriority);
      setNewTaskTitle('');
    } finally {
      setAddingTask(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    onLaunchAiPrompt(searchQuery.trim(), 'ai_brain');
    setSearchQuery('');
    setSearchResults(null);
  };

  const stats = dashboard?.stats ?? {
    totalAiRequests: 0,
    totalTokensUsed: 0,
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalConversations: 0,
  };

  const quickActions = [
    {
      label: 'Ask AI',
      hint: 'Start a fresh chat',
      icon: Sparkles,
      onClick: () => onSelectModule('ai_brain'),
    },
    {
      label: 'Create Project',
      hint: 'Organize workspace',
      icon: FolderPlus,
      onClick: onOpenCreateProject,
    },
    {
      label: 'Upload PDF',
      hint: 'Store & analyze file',
      icon: FileUp,
      onClick: onOpenUploadDocument,
    },
    {
      label: 'Generate Script',
      hint: 'Creator Studio',
      icon: Clapperboard,
      onClick: () => onSelectModule('creator_studio'),
    },
    {
      label: 'Write Code',
      hint: 'Developer Lab',
      icon: Code2,
      onClick: () => onSelectModule('developer_lab'),
    },
    {
      label: 'Start Research',
      hint: 'Research Lab',
      icon: SearchCheck,
      onClick: () => onSelectModule('research_lab'),
    },
  ];

  // Dynamic recommended actions grounded in actual user state & onboarding preferences
  const recommendedActions: Array<{
    title: string;
    detail: string;
    cta: string;
    onClick: () => void;
  }> = [];

  if (stats.totalProjects === 0) {
    recommendedActions.push({
      title: 'Create your first project workspace',
      detail:
        'Group conversations, tasks, and documents under a dedicated project so AI Brain stays grounded.',
      cta: 'Create Project',
      onClick: onOpenCreateProject,
    });
  }
  if (stats.totalConversations === 0) {
    const primaryInterest =
      profile?.preferences.interests[0] || 'your current goals';
    recommendedActions.push({
      title: `Start an AI Brain briefing on ${primaryInterest}`,
      detail:
        'Generate a structured roadmap tailored to your experience level and language.',
      cta: 'Ask AI Brain',
      onClick: () =>
        onLaunchAiPrompt(
          `Create a focused 7-day action plan for ${primaryInterest} tailored to a ${profile?.preferences.experienceLevel || 'intermediate'} practitioner.`,
          'ai_brain'
        ),
    });
  }
  if ((dashboard?.recentDocuments.length ?? 0) === 0) {
    recommendedActions.push({
      title: 'Upload reference notes or a PDF document',
      detail:
        'Store source material in your workspace to search and synthesize across modules.',
      cta: 'Upload File',
      onClick: onOpenUploadDocument,
    });
  }
  if (recommendedActions.length < 3) {
    recommendedActions.push({
      title: 'Review your AI model and memory preferences',
      detail:
        'Control whether Knowledge Vault notes automatically enrich your AI Brain responses.',
      cta: 'Open Settings',
      onClick: () => onSelectModule('settings'),
    });
  }

  const totalSearchHits = searchResults
    ? searchResults.projects.length +
      searchResults.tasks.length +
      searchResults.conversations.length +
      searchResults.documents.length +
      searchResults.knowledge.length
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-7 space-y-8">
      {/* Personalized Greeting + Global AI Search */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              {getGreeting()}, {profile?.user.displayName || 'there'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {profile?.preferences.primaryUseCases.length
                ? `Focused on ${profile.preferences.primaryUseCases.slice(0, 3).join(' · ')}`
                : 'Your unified AI workspace is ready.'}
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>

        {/* Global AI Search */}
        <div className="relative">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, tasks, conversations, files — or press Enter to ask NISWARO AI…"
              className="w-full h-12 pl-11 pr-32 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searching && (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              )}
              <button
                type="submit"
                disabled={!searchQuery.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                Ask AI
              </button>
            </div>
          </form>

          {/* Live Search Popover */}
          {searchQuery.trim().length > 0 && searchResults && (
            <div className="absolute left-0 right-0 mt-2 z-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] shadow-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {totalSearchHits > 0
                    ? `${totalSearchHits} workspace match${totalSearchHits === 1 ? '' : 'es'}`
                    : 'No exact workspace matches'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onLaunchAiPrompt(searchQuery.trim(), 'ai_brain');
                    setSearchQuery('');
                    setSearchResults(null);
                  }}
                  className="font-semibold text-violet-600 dark:text-cyan-400 hover:underline"
                >
                  Ask AI Brain about &ldquo;{searchQuery.trim()}&rdquo;
                </button>
              </div>

              {totalSearchHits > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  {searchResults.projects.map((p) => (
                    <button
                      key={`p-${p.id}`}
                      type="button"
                      onClick={() => {
                        onSelectProjectContext(p.id);
                        onSelectModule('projects');
                        setSearchQuery('');
                      }}
                      className="text-left p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-[#141C35] transition-colors"
                    >
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {p.title}
                      </div>
                      <div className="text-slate-500">Project · {p.category}</div>
                    </button>
                  ))}
                  {searchResults.conversations.map((c) => (
                    <button
                      key={`c-${c.id}`}
                      type="button"
                      onClick={() => {
                        onOpenConversation(c.id);
                        setSearchQuery('');
                      }}
                      className="text-left p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-[#141C35] transition-colors"
                    >
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {c.title}
                      </div>
                      <div className="text-slate-500">Conversation · {c.model}</div>
                    </button>
                  ))}
                  {searchResults.tasks.map((t) => (
                    <button
                      key={`t-${t.id}`}
                      type="button"
                      onClick={() => {
                        onSelectModule('life_manager');
                        setSearchQuery('');
                      }}
                      className="text-left p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-[#141C35] transition-colors"
                    >
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {t.title}
                      </div>
                      <div className="text-slate-500">
                        Task · {t.priority} · {t.status}
                      </div>
                    </button>
                  ))}
                  {searchResults.documents.map((d) => (
                    <button
                      key={`d-${d.id}`}
                      type="button"
                      onClick={() => {
                        setPreviewDoc(d);
                        setSearchQuery('');
                      }}
                      className="text-left p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-[#141C35] transition-colors"
                    >
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {d.title}
                      </div>
                      <div className="text-slate-500">Document · {d.fileName}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-950/30 flex items-center justify-between gap-4 text-sm text-red-700 dark:text-red-300"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => onRefresh()}
            className="text-xs font-semibold underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* 6 Quick Actions */}
      <section aria-label="Quick actions" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] hover:border-violet-400 dark:hover:border-violet-500/70 text-left transition-colors space-y-2.5"
            >
              <Icon className="w-5 h-5 text-violet-600 dark:text-cyan-400" />
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                  {action.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {action.hint}
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {/* 4-Column AI Usage & Productivity KPI Strip */}
      <section
        aria-label="Workspace statistics"
        className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#0D1326] divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800"
      >
        <div className="p-5 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            AI Prompts Run
          </div>
          <div className="font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {loading && !dashboard ? '—' : stats.totalAiRequests.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {stats.totalConversations} conversation{stats.totalConversations === 1 ? '' : 's'}
          </div>
        </div>

        <div className="p-5 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Tokens Processed
          </div>
          <div className="font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {loading && !dashboard ? '—' : stats.totalTokensUsed.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            of {(profile?.subscription.monthlyTokenLimit ?? 250000).toLocaleString()} limit
          </div>
        </div>

        <div className="p-5 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Active Projects
          </div>
          <div className="font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {loading && !dashboard ? '—' : stats.totalProjects}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Synchronized workspaces
          </div>
        </div>

        <div className="p-5 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Tasks Completed
          </div>
          <div className="font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {loading && !dashboard
              ? '—'
              : `${stats.completedTasks} / ${stats.totalTasks}`}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {stats.totalTasks > 0
              ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}% completion`
              : 'No tasks logged'}
          </div>
        </div>
      </section>

      {/* Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Active Projects + Recent Conversations */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Projects */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-violet-600 dark:text-cyan-400" />
                <h2 className="font-display text-sm font-semibold text-slate-950 dark:text-white">
                  Active Projects
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onSelectModule('projects')}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  View all
                </button>
                <button
                  type="button"
                  onClick={onOpenCreateProject}
                  className="px-2.5 py-1 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
              </div>
            </div>

            {loading && !dashboard ? (
              <div className="p-5 space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-14 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse"
                  />
                ))}
              </div>
            ) : (dashboard?.activeProjects.length ?? 0) === 0 ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No projects created yet. Start one to organize chats, files, and
                  milestones together.
                </p>
                <button
                  type="button"
                  onClick={onOpenCreateProject}
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
                >
                  Create First Project
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {dashboard!.activeProjects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      onSelectProjectContext(project.id);
                      onSelectModule('projects');
                    }}
                    className="w-full px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-[#141C35]/70 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {project.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span>{project.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{project.status}</span>
                        {project.deadline && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              Due {new Date(project.deadline).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="w-24 shrink-0 space-y-1 text-right">
                      <div className="font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                        {project.progress}%
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-violet-600 dark:bg-cyan-400 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Recent Conversations */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-violet-600 dark:text-cyan-400" />
                <h2 className="font-display text-sm font-semibold text-slate-950 dark:text-white">
                  Recent Conversations
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onSelectModule('ai_brain')}
                className="text-xs font-medium text-violet-600 dark:text-cyan-400 hover:underline"
              >
                Open AI Brain
              </button>
            </div>

            {(dashboard?.recentConversations.length ?? 0) === 0 ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No conversations yet. Ask AI Brain a question to start building
                  your conversation history.
                </p>
                <button
                  type="button"
                  onClick={() => onSelectModule('ai_brain')}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#141C35] text-xs font-semibold text-slate-900 dark:text-white transition-colors"
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {dashboard!.recentConversations.map((convo) => (
                  <button
                    key={convo.id}
                    type="button"
                    onClick={() => onOpenConversation(convo.id)}
                    className="w-full px-5 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-[#141C35]/70 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {convo.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{convo.model}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {new Date(convo.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right 5 Cols: Upcoming Tasks + Recently Uploaded Files + Recommended Actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Upcoming Tasks */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-slate-950 dark:text-white">
                Upcoming Tasks
              </h2>
              <button
                type="button"
                onClick={() => onSelectModule('life_manager')}
                className="text-xs font-medium text-violet-600 dark:text-cyan-400 hover:underline"
              >
                Life Manager
              </button>
            </div>

            <form
              onSubmit={handleQuickTaskSubmit}
              className="p-3.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center gap-2"
            >
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Add a task…"
                className="flex-1 min-w-0 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070B18] text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
              <select
                aria-label="Task priority"
                value={newTaskPriority}
                onChange={(e) =>
                  setNewTaskPriority(e.target.value as TaskItem['priority'])
                }
                className="h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070B18] text-xs text-slate-700 dark:text-slate-300"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <button
                type="submit"
                disabled={!newTaskTitle.trim() || addingTask}
                aria-label="Add task"
                className="h-9 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold disabled:opacity-40 shrink-0"
              >
                {addingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
              </button>
            </form>

            {(dashboard?.upcomingTasks.length ?? 0) === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No tasks scheduled yet. Add your first priority above.
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {dashboard!.upcomingTasks.map((task) => {
                  const done = task.status === 'done';
                  return (
                    <li
                      key={task.id}
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-[#141C35]/50 transition-colors"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleTask(task)}
                          aria-label={
                            done ? `Reopen ${task.title}` : `Complete ${task.title}`
                          }
                          className="mt-0.5 text-slate-400 hover:text-violet-500 shrink-0"
                        >
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <div
                            className={`text-xs font-medium truncate ${
                              done
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {task.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                            {task.priority} priority
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        aria-label={`Delete ${task.title}`}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Recently Uploaded Files */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-600 dark:text-cyan-400" />
                <h2 className="font-display text-sm font-semibold text-slate-950 dark:text-white">
                  Recently Uploaded Files
                </h2>
              </div>
              <button
                type="button"
                onClick={onOpenUploadDocument}
                className="text-xs font-medium text-violet-600 dark:text-cyan-400 hover:underline"
              >
                Upload
              </button>
            </div>

            {(dashboard?.recentDocuments.length ?? 0) === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No uploaded files yet. Upload a PDF, Markdown, or text document to
                index it into your workspace.
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {dashboard!.recentDocuments.map((doc) => (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="w-full px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-[#141C35]/60 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {doc.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {doc.fileName} · {formatBytes(doc.sizeBytes)}
                        </div>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recommended Actions */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-sm font-semibold text-slate-950 dark:text-white">
                Recommended Actions
              </h2>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {recommendedActions.slice(0, 3).map((rec) => (
                <div key={rec.title} className="p-4 space-y-2">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    {rec.title}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {rec.detail}
                  </p>
                  <button
                    type="button"
                    onClick={rec.onClick}
                    className="text-xs font-semibold text-violet-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>{rec.cta}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-display text-sm font-semibold text-slate-950 dark:text-white truncate">
                  {previewDoc.title}
                </h3>
                <div className="text-xs text-slate-500 font-mono tabular-nums">
                  {previewDoc.fileName} · {formatBytes(previewDoc.sizeBytes)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const snippet = previewDoc.contentText.slice(0, 2500);
                    onLaunchAiPrompt(
                      `Analyze and summarize the uploaded document "${previewDoc.title}" (${previewDoc.fileName}):\n\n${snippet}`,
                      'ai_brain'
                    );
                    setPreviewDoc(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
                >
                  Analyze with AI
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto text-xs font-mono whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
              {previewDoc.contentText || 'No plain text preview extracted for this file.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
