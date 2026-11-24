import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { createServer as createViteServer } from 'vite';
import { aiRateLimit, AuthRequest, requireAuth } from './src/middleware/auth.ts';
import {
  completeUserOnboarding,
  deleteUserAccountData,
  getUserProfileBundle,
  updateUserSettings,
} from './src/db/users.ts';
import {
  appendMessage,
  createConversation,
  createDocument,
  createKnowledgeItem,
  createProject,
  createTask,
  deleteConversation,
  deleteProject,
  deleteTask,
  exportAllUserData,
  getConversationWithMessages,
  getDashboardSummary,
  globalSearchWorkspace,
  listConversations,
  listDocuments,
  listKnowledgeItems,
  listProjects,
  listTasks,
  markNotificationRead,
  recordAiUsage,
  updateProject,
  updateTask,
} from './src/db/workspace.ts';
import {
  AVAILABLE_AI_MODELS,
  generateChatCompletion,
} from './src/lib/ai-orchestrator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '2mb' }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Public health endpoint (no sensitive internals)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'niswaro-ai' });
});

// Public model catalog (authenticated preferred, safe metadata)
app.get('/api/ai/models', requireAuth, (_req, res) => {
  res.json({ models: AVAILABLE_AI_MODELS });
});

// --- MODULE 01: AUTHENTICATION, PROFILE & ONBOARDING ---
app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bundle = await getUserProfileBundle(req.dbUser!.id);
    res.json(bundle);
  } catch (error) {
    console.error('GET /api/me error:', error);
    res.status(500).json({ error: 'Unable to load account profile.' });
  }
});

const onboardingSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  interests: z.array(z.string().trim().min(1).max(60)).max(12),
  preferredLanguage: z.string().trim().min(2).max(40),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  primaryUseCases: z.array(z.string().trim().min(1).max(60)).min(1).max(8),
  theme: z.enum(['dark', 'light']),
  defaultAiModel: z.string().trim().min(2).max(60),
});

app.put('/api/me/onboarding', requireAuth, async (req: AuthRequest, res) => {
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Please complete all required onboarding fields.',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const result = await completeUserOnboarding(req.dbUser!.id, parsed.data);
    res.json(result);
  } catch (error) {
    console.error('PUT /api/me/onboarding error:', error);
    res.status(500).json({ error: 'Failed to save onboarding setup.' });
  }
});

const settingsSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  preferredLanguage: z.string().trim().min(2).max(40).optional(),
  experienceLevel: z
    .enum(['beginner', 'intermediate', 'advanced', 'expert'])
    .optional(),
  interests: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
  primaryUseCases: z.array(z.string().trim().min(1).max(60)).max(8).optional(),
  theme: z.enum(['dark', 'light']).optional(),
  defaultAiModel: z.string().trim().min(2).max(60).optional(),
  memoryEnabled: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
});

app.patch('/api/me/settings', requireAuth, async (req: AuthRequest, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid settings payload.' });
    return;
  }

  try {
    const bundle = await updateUserSettings(req.dbUser!.id, parsed.data);
    res.json(bundle);
  } catch (error) {
    console.error('PATCH /api/me/settings error:', error);
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

app.get('/api/me/export', requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = await exportAllUserData(req.dbUser!.id);
    res.json(data);
  } catch (error) {
    console.error('GET /api/me/export error:', error);
    res.status(500).json({ error: 'Failed to export workspace data.' });
  }
});

app.delete('/api/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    await deleteUserAccountData(req.dbUser!.id);
    res.json({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/me error:', error);
    res.status(500).json({ error: 'Failed to delete account data.' });
  }
});

// --- MODULE 02: HOME DASHBOARD & GLOBAL SEARCH ---
app.get('/api/dashboard', requireAuth, async (req: AuthRequest, res) => {
  try {
    const summary = await getDashboardSummary(req.dbUser!.id);
    res.json(summary);
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard summary.' });
  }
});

app.get('/api/search', requireAuth, async (req: AuthRequest, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 1 || q.length > 120) {
    res.json({
      projects: [],
      tasks: [],
      conversations: [],
      documents: [],
      knowledge: [],
    });
    return;
  }
  try {
    const results = await globalSearchWorkspace(req.dbUser!.id, q);
    res.json(results);
  } catch (error) {
    console.error('GET /api/search error:', error);
    res.status(500).json({ error: 'Search failed.' });
  }
});

// --- NOTIFICATIONS ---
app.post('/api/notifications/read', requireAuth, async (req: AuthRequest, res) => {
  const id =
    typeof req.body?.id === 'number' && Number.isInteger(req.body.id)
      ? req.body.id
      : undefined;
  try {
    await markNotificationRead(req.dbUser!.id, id);
    res.json({ ok: true });
  } catch (error) {
    console.error('POST /api/notifications/read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications read.' });
  }
});

// --- PROJECTS ---
app.get('/api/projects', requireAuth, async (req: AuthRequest, res) => {
  try {
    const items = await listProjects(req.dbUser!.id);
    res.json({ projects: items });
  } catch (error) {
    console.error('GET /api/projects error:', error);
    res.status(500).json({ error: 'Failed to load projects.' });
  }
});

const projectCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().max(60).optional(),
  deadline: z.string().nullable().optional(),
});

app.post('/api/projects', requireAuth, async (req: AuthRequest, res) => {
  const parsed = projectCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Project title is required.' });
    return;
  }
  try {
    const project = await createProject(req.dbUser!.id, parsed.data);
    res.status(201).json({ project });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    res.status(500).json({ error: 'Failed to create project.' });
  }
});

const projectPatchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().max(60).optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
});

app.patch('/api/projects/:id', requireAuth, async (req: AuthRequest, res) => {
  const projectId = Number(req.params.id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    res.status(400).json({ error: 'Invalid project ID.' });
    return;
  }
  const parsed = projectPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid project update.' });
    return;
  }
  try {
    const project = await updateProject(req.dbUser!.id, projectId, parsed.data);
    if (!project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    res.json({ project });
  } catch (error) {
    console.error('PATCH /api/projects/:id error:', error);
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

app.delete('/api/projects/:id', requireAuth, async (req: AuthRequest, res) => {
  const projectId = Number(req.params.id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    res.status(400).json({ error: 'Invalid project ID.' });
    return;
  }
  try {
    const deleted = await deleteProject(req.dbUser!.id, projectId);
    if (!deleted) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    res.json({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/projects/:id error:', error);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

// --- TASKS ---
app.get('/api/tasks', requireAuth, async (req: AuthRequest, res) => {
  const projectIdParam = req.query.projectId ? Number(req.query.projectId) : undefined;
  const projectId =
    projectIdParam && Number.isInteger(projectIdParam) && projectIdParam > 0
      ? projectIdParam
      : undefined;
  try {
    const items = await listTasks(req.dbUser!.id, projectId);
    res.json({ tasks: items });
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    res.status(500).json({ error: 'Failed to load tasks.' });
  }
});

const taskCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  projectId: z.number().int().positive().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

app.post('/api/tasks', requireAuth, async (req: AuthRequest, res) => {
  const parsed = taskCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Task title is required.' });
    return;
  }
  try {
    const task = await createTask(req.dbUser!.id, parsed.data);
    res.status(201).json({ task });
  } catch (error) {
    console.error('POST /api/tasks error:', error);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

const taskPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().nullable().optional(),
});

app.patch('/api/tasks/:id', requireAuth, async (req: AuthRequest, res) => {
  const taskId = Number(req.params.id);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    res.status(400).json({ error: 'Invalid task ID.' });
    return;
  }
  const parsed = taskPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid task update.' });
    return;
  }
  try {
    const task = await updateTask(req.dbUser!.id, taskId, parsed.data);
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }
    res.json({ task });
  } catch (error) {
    console.error('PATCH /api/tasks/:id error:', error);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

app.delete('/api/tasks/:id', requireAuth, async (req: AuthRequest, res) => {
  const taskId = Number(req.params.id);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    res.status(400).json({ error: 'Invalid task ID.' });
    return;
  }
  try {
    const deleted = await deleteTask(req.dbUser!.id, taskId);
    if (!deleted) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }
    res.json({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/tasks/:id error:', error);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

// --- DOCUMENTS ---
app.get('/api/documents', requireAuth, async (req: AuthRequest, res) => {
  try {
    const docs = await listDocuments(req.dbUser!.id);
    res.json({ documents: docs });
  } catch (error) {
    console.error('GET /api/documents error:', error);
    res.status(500).json({ error: 'Failed to load documents.' });
  }
});

const documentCreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().min(0).max(20_000_000),
  contentText: z.string().max(150_000),
  projectId: z.number().int().positive().nullable().optional(),
});

app.post('/api/documents', requireAuth, async (req: AuthRequest, res) => {
  const parsed = documentCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid document payload.' });
    return;
  }
  try {
    const doc = await createDocument(req.dbUser!.id, parsed.data);
    res.status(201).json({ document: doc });
  } catch (error) {
    console.error('POST /api/documents error:', error);
    res.status(500).json({ error: 'Failed to save document.' });
  }
});

// --- KNOWLEDGE VAULT ---
app.get('/api/knowledge', requireAuth, async (req: AuthRequest, res) => {
  try {
    const items = await listKnowledgeItems(req.dbUser!.id);
    res.json({ items });
  } catch (error) {
    console.error('GET /api/knowledge error:', error);
    res.status(500).json({ error: 'Failed to load knowledge items.' });
  }
});

const knowledgeCreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1).max(50_000),
  folder: z.string().trim().max(60).optional(),
  itemType: z.enum(['note', 'snippet', 'response', 'report']).optional(),
  tags: z.array(z.string().trim().max(32)).max(10).optional(),
  projectId: z.number().int().positive().nullable().optional(),
});

app.post('/api/knowledge', requireAuth, async (req: AuthRequest, res) => {
  const parsed = knowledgeCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Title and content are required.' });
    return;
  }
  try {
    const item = await createKnowledgeItem(req.dbUser!.id, parsed.data);
    res.status(201).json({ item });
  } catch (error) {
    console.error('POST /api/knowledge error:', error);
    res.status(500).json({ error: 'Failed to save knowledge item.' });
  }
});

// --- AI BRAIN (CONVERSATIONS & GEMINI ORCHESTRATION) ---
app.get('/api/conversations', requireAuth, async (req: AuthRequest, res) => {
  try {
    const items = await listConversations(req.dbUser!.id);
    res.json({ conversations: items });
  } catch (error) {
    console.error('GET /api/conversations error:', error);
    res.status(500).json({ error: 'Failed to load conversations.' });
  }
});

app.get('/api/conversations/:id', requireAuth, async (req: AuthRequest, res) => {
  const conversationId = Number(req.params.id);
  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    res.status(400).json({ error: 'Invalid conversation ID.' });
    return;
  }
  try {
    const data = await getConversationWithMessages(req.dbUser!.id, conversationId);
    if (!data) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    res.json(data);
  } catch (error) {
    console.error('GET /api/conversations/:id error:', error);
    res.status(500).json({ error: 'Failed to load conversation.' });
  }
});

app.delete('/api/conversations/:id', requireAuth, async (req: AuthRequest, res) => {
  const conversationId = Number(req.params.id);
  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    res.status(400).json({ error: 'Invalid conversation ID.' });
    return;
  }
  try {
    const deleted = await deleteConversation(req.dbUser!.id, conversationId);
    if (!deleted) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    res.json({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/conversations/:id error:', error);
    res.status(500).json({ error: 'Failed to delete conversation.' });
  }
});

const chatRequestSchema = z.object({
  conversationId: z.number().int().positive().nullable().optional(),
  projectId: z.number().int().positive().nullable().optional(),
  model: z.string().trim().max(60).optional(),
  message: z.string().trim().min(1).max(16_000),
  module: z.string().trim().max(40).optional(),
});

app.post('/api/ai/chat', requireAuth, aiRateLimit, async (req: AuthRequest, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Message content is required.' });
    return;
  }

  try {
    const userId = req.dbUser!.id;
    const bundle = await getUserProfileBundle(userId);
    const prefs = bundle.preferences;

    let conversationId = parsed.data.conversationId ?? null;
    let history: Array<{ role: string; content: string }> = [];
    let activeProjectId = parsed.data.projectId ?? null;

    if (conversationId) {
      const existing = await getConversationWithMessages(userId, conversationId);
      if (!existing) {
        res.status(404).json({ error: 'Conversation not found.' });
        return;
      }
      history = existing.messages.map((m) => ({ role: m.role, content: m.content }));
      if (!activeProjectId && existing.conversation.projectId) {
        activeProjectId = existing.conversation.projectId;
      }
    } else {
      const titleSnippet =
        parsed.data.message.slice(0, 56) +
        (parsed.data.message.length > 56 ? '…' : '');
      const created = await createConversation(userId, {
        title: titleSnippet,
        model: parsed.data.model || prefs?.defaultAiModel || 'gemini-4-hydrogen',
        projectId: activeProjectId,
      });
      conversationId = created.id;
    }

    // Gather optional project + memory context
    let projectTitle: string | undefined;
    let projectDescription: string | undefined;
    if (activeProjectId) {
      const allProjects = await listProjects(userId);
      const match = allProjects.find((p) => p.id === activeProjectId);
      if (match) {
        projectTitle = match.title;
        projectDescription = match.description;
      }
    }

    let memorySnippets: string[] = [];
    if (prefs?.memoryEnabled) {
      const vault = await listKnowledgeItems(userId);
      memorySnippets = vault
        .slice(0, 3)
        .map((k) => `[${k.title}]: ${k.content.slice(0, 320)}`);
    }

    const userMsg = await appendMessage({
      conversationId,
      role: 'user',
      content: parsed.data.message,
    });

    const aiResult = await generateChatCompletion({
      model: parsed.data.model || prefs?.defaultAiModel,
      history,
      userMessage: parsed.data.message,
      userContext: {
        displayName: req.dbUser!.displayName,
        preferredLanguage: prefs?.preferredLanguage,
        experienceLevel: prefs?.experienceLevel,
        projectTitle,
        projectDescription,
        memorySnippets,
      },
    });

    const assistantMsg = await appendMessage({
      conversationId,
      role: 'assistant',
      content: aiResult.text,
      modelUsed: aiResult.model,
      tokensUsed: aiResult.usage.totalTokens,
    });

    await recordAiUsage({
      userId,
      module: parsed.data.module || 'ai_brain',
      model: aiResult.model,
      promptTokens: aiResult.usage.promptTokens,
      completionTokens: aiResult.usage.completionTokens,
      totalTokens: aiResult.usage.totalTokens,
    });

    res.json({
      conversationId,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      model: aiResult.model,
      usage: aiResult.usage,
    });
  } catch (error: unknown) {
    console.error('POST /api/ai/chat error:', error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'AI request failed. Please try again.';
    res.status(502).json({ error: message });
  }
});

// Mount Vite dev middleware or production static files
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NISWARO AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
