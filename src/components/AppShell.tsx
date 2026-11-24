import React, { useState } from 'react';
import {
  Bell,
  BookOpen,
  Brain,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clapperboard,
  Code2,
  Database,
  FileText,
  FolderKanban,
  Home,
  LogOut,
  Menu,
  MessageSquarePlus,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plug,
  SearchCheck,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  AiModelOption,
  DashboardSummary,
  ModuleId,
  ProjectItem,
  TaskItem,
} from '../types/niswaro.ts';
import { BrandMark } from './BrandMark.tsx';

interface NavItem {
  id: ModuleId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'ai_brain', label: 'AI Brain', icon: Brain },
  { id: 'smart_learning', label: 'Smart Learning', icon: BookOpen },
  { id: 'creator_studio', label: 'Creator Studio', icon: Clapperboard },
  { id: 'developer_lab', label: 'Developer Lab', icon: Code2 },
  { id: 'research_lab', label: 'Research Lab', icon: SearchCheck },
  { id: 'life_manager', label: 'Life Manager', icon: CalendarClock },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'knowledge_vault', label: 'Knowledge Vault', icon: Database },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface AppShellProps {
  activeModule: ModuleId;
  onSelectModule: (mod: ModuleId) => void;
  onNewChat: () => void;
  dashboard: DashboardSummary | null;
  activeProjectId: number | null;
  onSelectProjectId: (id: number | null) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  models: AiModelOption[];
  onToggleTask: (task: TaskItem) => Promise<void>;
  onMarkNotificationsRead: () => Promise<void>;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeModule,
  onSelectModule,
  onNewChat,
  dashboard,
  activeProjectId,
  onSelectProjectId,
  selectedModel,
  onSelectModel,
  models,
  onToggleTask,
  onMarkNotificationsRead,
  children,
}) => {
  const {
    profile,
    firebaseUser,
    theme,
    setTheme,
    signOutUser,
    resendVerificationEmail,
  } = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const activeNav = NAV_ITEMS.find((n) => n.id === activeModule) || NAV_ITEMS[0];
  const notifications = dashboard?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;
  const projects: ProjectItem[] = dashboard?.activeProjects ?? [];
  const activeProject = projects.find((p) => p.id === activeProjectId) || null;
  const openTasks = (dashboard?.upcomingTasks ?? [])
    .filter((t) => t.status !== 'done')
    .slice(0, 5);
  const recentDocs = (dashboard?.recentDocuments ?? []).slice(0, 4);
  const recentKnowledge = (dashboard?.recentKnowledge ?? []).slice(0, 4);

  const handleNavClick = (mod: ModuleId) => {
    onSelectModule(mod);
    setMobileMenuOpen(false);
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const compact = !isMobile && sidebarCollapsed;
    return (
      <div className="flex flex-col h-full">
        {/* 1. NISWARO AI Logo */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="focus:outline-none"
            aria-label="NISWARO AI Home"
          >
            <BrandMark collapsed={compact} size="md" />
          </button>
          {isMobile ? (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            >
              {compact ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* 2. New Chat CTA */}
        <div className="p-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              setMobileMenuOpen(false);
            }}
            title="New Chat"
            className={`w-full h-10 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
              compact ? 'px-0' : 'px-3.5'
            }`}
          >
            <MessageSquarePlus className="w-4 h-4 shrink-0" />
            {!compact && <span>New Chat</span>}
          </button>
        </div>

        {/* 3–13. Core Module Navigation */}
        <nav
          aria-label="Primary modules"
          className="flex-1 overflow-y-auto px-2.5 pb-4 space-y-0.5"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                title={compact ? item.label : undefined}
                className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  compact ? 'justify-center px-0 h-10' : 'px-3 h-10'
                } ${
                  active
                    ? 'bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#141C35] hover:text-slate-950 dark:hover:text-slate-100'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-violet-600 dark:text-cyan-400' : ''
                  }`}
                />
                {!compact && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Account Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 shrink-0">
          <div
            className={`flex items-center gap-2.5 ${
              compact ? 'justify-center' : 'justify-between'
            }`}
          >
            <button
              type="button"
              onClick={() => handleNavClick('settings')}
              className="flex items-center gap-2.5 min-w-0 text-left group"
            >
              {profile?.user.avatarUrl ? (
                <img
                  src={profile.user.avatarUrl}
                  alt={profile.user.displayName}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-violet-600/20 text-violet-600 dark:text-cyan-300 font-display font-semibold text-xs flex items-center justify-center shrink-0">
                  {(profile?.user.displayName || 'N').slice(0, 1).toUpperCase()}
                </div>
              )}
              {!compact && (
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {profile?.user.displayName || 'Workspace User'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {profile?.subscription.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
                  </div>
                </div>
              )}
            </button>

            {!compact && (
              <button
                type="button"
                onClick={() => signOutUser()}
                title="Sign out"
                aria-label="Sign out"
                className="p-1.5 rounded-md text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#070B18] dark:text-slate-100">
      {/* Desktop Persistent Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D1326] transition-[width] duration-200 ${
          sidebarCollapsed ? 'w-[68px]' : 'w-[252px]'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-[272px] max-w-[85vw] h-full bg-white dark:bg-[#0D1326] border-r border-slate-200 dark:border-slate-800">
            <SidebarContent isMobile />
          </aside>
        </div>
      )}

      {/* Main Content + Collapsible Context Column */}
      <div className="flex-1 min-w-0 flex flex-col h-full">
        {/* Top Bar */}
        <header className="h-16 shrink-0 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D1326] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 dark:text-slate-400 hidden sm:inline whitespace-nowrap">
                NISWARO AI
              </span>
              <span
                aria-hidden="true"
                className="text-slate-400 dark:text-slate-600 hidden sm:inline"
              >
                /
              </span>
              <span className="font-display font-semibold text-slate-900 dark:text-white truncate">
                {activeNav.label}
              </span>
              {activeProject && (
                <>
                  <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">
                    ·
                  </span>
                  <span className="text-xs text-violet-600 dark:text-cyan-400 truncate max-w-[180px]">
                    {activeProject.title}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Top Bar Right Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark', true)}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#141C35] transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((o) => !o)}
                aria-label="Notifications"
                className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#141C35] transition-colors relative"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-violet-600 text-white text-[10px] font-mono font-semibold flex items-center justify-center tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 max-w-[90vw] z-40 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] shadow-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            await onMarkNotificationsRead();
                          }}
                          className="text-xs font-medium text-violet-600 dark:text-cyan-400 hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/80">
                      {notifications.length === 0 ? (
                        <div className="p-5 text-center text-xs text-slate-500 dark:text-slate-400">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              setNotificationsOpen(false);
                              if (
                                NAV_ITEMS.some((i) => i.id === n.actionModule)
                              ) {
                                onSelectModule(n.actionModule as ModuleId);
                              }
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#141C35] transition-colors ${
                              !n.read ? 'bg-violet-50/50 dark:bg-violet-500/5' : ''
                            }`}
                          >
                            <div className="text-xs font-semibold text-slate-900 dark:text-white">
                              {n.title}
                            </div>
                            {n.body && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                                {n.body}
                              </p>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setContextOpen((o) => !o)}
              aria-label={contextOpen ? 'Hide context panel' : 'Show context panel'}
              title={contextOpen ? 'Hide context panel' : 'Show context panel'}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#141C35] transition-colors"
            >
              {contextOpen ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
            </button>
          </div>
        </header>

        {/* Email verification notice for unverified email/password accounts */}
        {firebaseUser && !firebaseUser.emailVerified && (
          <div className="px-6 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/50 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
            <span>
              Your email address ({firebaseUser.email}) is not verified yet.
            </span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await resendVerificationEmail();
                  setVerificationSent(true);
                } catch {
                  // Ignore rate limit silently
                }
              }}
              className="font-semibold underline hover:no-underline"
            >
              {verificationSent ? 'Verification email sent' : 'Resend verification email'}
            </button>
          </div>
        )}

        {/* Workspace Viewport + Right Context Panel */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>

          {/* Collapsible Context Panel */}
          {contextOpen && (
            <aside className="hidden xl:flex flex-col w-[300px] shrink-0 border-l border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D1326] overflow-y-auto p-5 space-y-6">
              {/* AI Model Selector */}
              <section className="space-y-2">
                <label
                  htmlFor="ctx-model"
                  className="block text-xs font-semibold text-slate-900 dark:text-white"
                >
                  Active AI Model
                </label>
                <select
                  id="ctx-model"
                  value={selectedModel}
                  onChange={(e) => onSelectModel(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070B18] text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} · {m.speed}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {models.find((m) => m.id === selectedModel)?.capability ||
                    'Server-side routed Gemini intelligence.'}
                </p>
              </section>

              {/* Project Context Selector */}
              <section className="space-y-2 pt-5 border-t border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="ctx-project"
                    className="text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    Project Context
                  </label>
                  <button
                    type="button"
                    onClick={() => onSelectModule('projects')}
                    className="text-[11px] font-medium text-violet-600 dark:text-cyan-400 hover:underline"
                  >
                    Manage
                  </button>
                </div>
                <select
                  id="ctx-project"
                  value={activeProjectId ?? ''}
                  onChange={(e) =>
                    onSelectProjectId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070B18] text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  <option value="">Global Workspace (No Project Filter)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                {activeProject && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 pt-1">
                    <p className="line-clamp-2">
                      {activeProject.description || 'No project description yet.'}
                    </p>
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      <span>{activeProject.category}</span>
                      <span>{activeProject.progress}%</span>
                    </div>
                  </div>
                )}
              </section>

              {/* Active Tasks */}
              <section className="space-y-2.5 pt-5 border-t border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Active Tasks
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                    {openTasks.length}
                  </span>
                </div>
                {openTasks.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No open tasks right now.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {openTasks.map((task) => (
                      <li key={task.id} className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleTask(task)}
                          aria-label={`Mark ${task.title} complete`}
                          className="mt-0.5 text-slate-400 hover:text-violet-500 transition-colors shrink-0"
                        >
                          {task.status === 'done' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <div className="text-xs text-slate-800 dark:text-slate-200 truncate">
                            {task.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {task.priority} priority
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Uploaded Files */}
              <section className="space-y-2.5 pt-5 border-t border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Uploaded Files
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                    {recentDocs.length}
                  </span>
                </div>
                {recentDocs.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Upload PDFs or notes from the dashboard to reference them here.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {recentDocs.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"
                      >
                        <FileText className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                        <span className="truncate">{doc.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Saved Knowledge */}
              <section className="space-y-2.5 pt-5 border-t border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Knowledge Vault
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectModule('knowledge_vault')}
                    className="text-[11px] font-medium text-violet-600 dark:text-cyan-400 hover:underline"
                  >
                    Open
                  </button>
                </div>
                {recentKnowledge.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Saved notes and AI insights will appear here.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {recentKnowledge.map((item) => (
                      <li key={item.id} className="text-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.folder} · {item.itemType}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};
