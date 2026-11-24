import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Database,
  FolderKanban,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import {
  KnowledgeItem,
  ProjectItem,
  TaskItem,
} from '../types/niswaro.ts';

interface ProjectsViewProps {
  activeProjectId: number | null;
  onSelectProjectContext: (id: number | null) => void;
  onOpenCreateProject: () => void;
  onDataMutated: () => Promise<void>;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  activeProjectId,
  onSelectProjectContext,
  onOpenCreateProject,
  onDataMutated,
}) => {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ projects: ProjectItem[] }>('/api/projects');
      setProjects(res.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateProgress = async (project: ProjectItem, progress: number) => {
    try {
      await apiFetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          progress,
          status: progress === 100 ? 'completed' : 'active',
        }),
      });
      await load();
      await onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (activeProjectId === id) onSelectProjectContext(null);
      await load();
      await onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project.');
    }
  };

  const filtered =
    statusFilter === 'all'
      ? projects
      : projects.filter((p) => p.status === statusFilter);

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-7 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
            Projects
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Organize project workspaces, track milestones, and scope AI Brain
            context.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCreateProject}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#0D1326] border border-slate-200 dark:border-slate-800">
        {['all', 'active', 'completed'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
              statusFilter === st
                ? 'bg-white dark:bg-[#141C35] text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3.5 rounded-lg border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] text-center space-y-3">
          <FolderKanban className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No projects found in this view.
          </p>
          <button
            type="button"
            onClick={onOpenCreateProject}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((project) => {
            const focused = activeProjectId === project.id;
            return (
              <div
                key={project.id}
                className={`p-5 rounded-xl border bg-white dark:bg-[#0D1326] space-y-4 transition-colors ${
                  focused
                    ? 'border-violet-500'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white truncate">
                      {project.title}
                    </h2>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {project.category} · <span className="capitalize">{project.status}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(project.id)}
                    aria-label={`Delete ${project.title}`}
                    className="p-1.5 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[32px]">
                  {project.description || 'No project description provided.'}
                </p>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={project.progress}
                    onChange={(e) => updateProgress(project, Number(e.target.value))}
                    className="w-full accent-violet-600"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      onSelectProjectContext(focused ? null : project.id)
                    }
                    className="text-xs font-semibold text-violet-600 dark:text-cyan-400 hover:underline"
                  >
                    {focused ? 'Active Context (Clear)' : 'Set as AI Context'}
                  </button>
                  <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface KnowledgeVaultViewProps {
  activeProjectId: number | null;
  onDataMutated: () => Promise<void>;
}

export const KnowledgeVaultView: React.FC<KnowledgeVaultViewProps> = ({
  activeProjectId,
  onDataMutated,
}) => {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [folder, setFolder] = useState('General');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterText, setFilterText] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ items: KnowledgeItem[] }>('/api/knowledge');
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || saving) return;
    setSaving(true);
    try {
      await apiFetch('/api/knowledge', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          folder: folder.trim() || 'General',
          itemType: 'note',
          projectId: activeProjectId,
        }),
      });
      setTitle('');
      setContent('');
      await load();
      await onDataMutated();
    } finally {
      setSaving(false);
    }
  };

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(filterText.toLowerCase()) ||
      item.content.toLowerCase().includes(filterText.toLowerCase()) ||
      item.folder.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-7 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
            Knowledge Vault
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Centralized notes, saved AI responses, and reusable references indexed
            for AI Brain memory.
          </p>
        </div>
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Filter vault…"
          className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] text-xs text-slate-900 dark:text-slate-100"
        />
      </div>

      {/* Add Note Form */}
      <form
        onSubmit={handleAdd}
        className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            className="sm:col-span-2 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#070B18] text-xs text-slate-900 dark:text-slate-100"
          />
          <input
            type="text"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="Folder (e.g. Architecture)"
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#070B18] text-xs text-slate-900 dark:text-slate-100"
          />
        </div>
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Store structured notes, snippets, or domain facts…"
          className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#070B18] text-xs text-slate-900 dark:text-slate-100"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!title.trim() || !content.trim() || saving}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save to Vault'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] text-center space-y-2">
          <Database className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Your Knowledge Vault is empty. Save notes here or bookmark AI Brain
            responses.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-sm font-semibold text-slate-950 dark:text-white">
                  {item.title}
                </h2>
                <span className="text-[11px] font-mono text-slate-500 shrink-0">
                  v{item.version}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {item.folder} · {item.itemType} ·{' '}
                {new Date(item.updatedAt).toLocaleDateString()}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap line-clamp-5 leading-relaxed pt-1">
                {item.content}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

interface LifeManagerViewProps {
  tasks: TaskItem[];
  onToggleTask: (task: TaskItem) => Promise<void>;
  onDeleteTask: (id: number) => Promise<void>;
  onCreateTask: (title: string, priority: TaskItem['priority']) => Promise<void>;
  onLaunchAiSchedule: (prompt: string) => void;
}

export const LifeManagerView: React.FC<LifeManagerViewProps> = ({
  tasks,
  onToggleTask,
  onDeleteTask,
  onCreateTask,
  onLaunchAiSchedule,
}) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskItem['priority']>('medium');
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');

  const filtered = tasks.filter((t) => {
    if (filter === 'open') return t.status !== 'done';
    if (filter === 'done') return t.status === 'done';
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onCreateTask(title.trim(), priority);
    setTitle('');
  };

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-7 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
            Life Manager
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage daily priorities, track completion, and generate AI-assisted
            schedules.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onLaunchAiSchedule(
              `Build an optimized daily time-blocked schedule based on my open tasks:\n${tasks
                .filter((t) => t.status !== 'done')
                .map((t) => `- [${t.priority}] ${t.title}`)
                .join('\n') || '- Plan deep work, study, and personal review'}`
            )
          }
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
        >
          Generate AI Schedule
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] flex flex-wrap sm:flex-nowrap gap-2.5"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task or reminder…"
          className="flex-1 min-w-[200px] h-10 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#070B18] text-sm text-slate-900 dark:text-slate-100"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskItem['priority'])}
          className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#070B18] text-xs font-medium text-slate-800 dark:text-slate-200"
        >
          <option value="low">Low priority</option>
          <option value="medium">Medium priority</option>
          <option value="high">High priority</option>
          <option value="urgent">Urgent</option>
        </select>
        <button
          type="submit"
          disabled={!title.trim()}
          className="h-10 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold disabled:opacity-40"
        >
          Add Task
        </button>
      </form>

      <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#0D1326] border border-slate-200 dark:border-slate-800">
        {(['all', 'open', 'done'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
              filter === f
                ? 'bg-white dark:bg-[#141C35] text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] divide-y divide-slate-200 dark:divide-slate-800/80">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No tasks in this view.
          </div>
        ) : (
          filtered.map((task) => {
            const done = task.status === 'done';
            return (
              <div
                key={task.id}
                className="px-5 py-3.5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => onToggleTask(task)}
                    className="text-slate-400 hover:text-violet-500 shrink-0"
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-medium truncate ${
                        done
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {task.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                      {task.priority} priority · Created{' '}
                      {new Date(task.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
