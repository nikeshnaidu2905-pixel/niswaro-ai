import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  conversations,
  documents,
  knowledgeItems,
  messages,
  notifications,
  projects,
  tasks,
  usageRecords,
} from './schema.ts';

export async function getDashboardSummary(userId: number) {
  try {
    const [
      recentConversations,
      activeProjects,
      upcomingTasks,
      recentDocuments,
      userNotifications,
      recentKnowledge,
      usageAgg,
    ] = await Promise.all([
      db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt))
        .limit(6),
      db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.updatedAt))
        .limit(6),
      db
        .select()
        .from(tasks)
        .where(eq(tasks.userId, userId))
        .orderBy(desc(tasks.createdAt))
        .limit(8),
      db
        .select()
        .from(documents)
        .where(eq(documents.userId, userId))
        .orderBy(desc(documents.createdAt))
        .limit(6),
      db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(10),
      db
        .select()
        .from(knowledgeItems)
        .where(eq(knowledgeItems.userId, userId))
        .orderBy(desc(knowledgeItems.updatedAt))
        .limit(5),
      db
        .select({
          totalRequests: sql<number>`count(*)::int`,
          totalTokens: sql<number>`coalesce(sum(${usageRecords.totalTokens}), 0)::int`,
        })
        .from(usageRecords)
        .where(eq(usageRecords.userId, userId)),
    ]);

    const [projectCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(eq(projects.userId, userId));

    const [taskStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where ${tasks.status} = 'done')::int`,
      })
      .from(tasks)
      .where(eq(tasks.userId, userId));

    const [convoCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversations)
      .where(eq(conversations.userId, userId));

    return {
      recentConversations,
      activeProjects,
      upcomingTasks,
      recentDocuments,
      notifications: userNotifications,
      recentKnowledge,
      stats: {
        totalAiRequests: usageAgg[0]?.totalRequests ?? 0,
        totalTokensUsed: usageAgg[0]?.totalTokens ?? 0,
        totalProjects: projectCount?.count ?? 0,
        totalTasks: taskStats?.total ?? 0,
        completedTasks: taskStats?.completed ?? 0,
        totalConversations: convoCount?.count ?? 0,
      },
    };
  } catch (error) {
    console.error('Database error in getDashboardSummary:', error);
    throw new Error('Failed to load dashboard data.', { cause: error });
  }
}

export async function globalSearchWorkspace(userId: number, query: string) {
  try {
    const pattern = `%${query.trim()}%`;
    const [foundProjects, foundTasks, foundConversations, foundDocs, foundKnowledge] =
      await Promise.all([
        db
          .select()
          .from(projects)
          .where(
            and(
              eq(projects.userId, userId),
              or(ilike(projects.title, pattern), ilike(projects.description, pattern))
            )
          )
          .limit(5),
        db
          .select()
          .from(tasks)
          .where(
            and(
              eq(tasks.userId, userId),
              or(ilike(tasks.title, pattern), ilike(tasks.description, pattern))
            )
          )
          .limit(5),
        db
          .select()
          .from(conversations)
          .where(
            and(eq(conversations.userId, userId), ilike(conversations.title, pattern))
          )
          .limit(5),
        db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.userId, userId),
              or(ilike(documents.title, pattern), ilike(documents.fileName, pattern))
            )
          )
          .limit(5),
        db
          .select()
          .from(knowledgeItems)
          .where(
            and(
              eq(knowledgeItems.userId, userId),
              or(
                ilike(knowledgeItems.title, pattern),
                ilike(knowledgeItems.content, pattern)
              )
            )
          )
          .limit(5),
      ]);

    return {
      projects: foundProjects,
      tasks: foundTasks,
      conversations: foundConversations,
      documents: foundDocs,
      knowledge: foundKnowledge,
    };
  } catch (error) {
    console.error('Database error in globalSearchWorkspace:', error);
    throw new Error('Search query failed.', { cause: error });
  }
}

// Projects CRUD
export async function listProjects(userId: number) {
  try {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
  } catch (error) {
    console.error('Database error in listProjects:', error);
    throw new Error('Failed to load projects.', { cause: error });
  }
}

export async function createProject(
  userId: number,
  input: {
    title: string;
    description?: string;
    category?: string;
    deadline?: string | null;
  }
) {
  try {
    const [created] = await db
      .insert(projects)
      .values({
        userId,
        title: input.title.trim(),
        description: input.description?.trim() ?? '',
        category: input.category?.trim() || 'General',
        status: 'active',
        progress: 0,
        deadline: input.deadline ? new Date(input.deadline) : null,
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database error in createProject:', error);
    throw new Error('Failed to create project.', { cause: error });
  }
}

export async function updateProject(
  userId: number,
  projectId: number,
  input: {
    title?: string;
    description?: string;
    category?: string;
    status?: string;
    progress?: number;
  }
) {
  try {
    const [updated] = await db
      .update(projects)
      .set({
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description.trim() }
          : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.progress !== undefined
          ? { progress: Math.max(0, Math.min(100, input.progress)) }
          : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('Database error in updateProject:', error);
    throw new Error('Failed to update project.', { cause: error });
  }
}

export async function deleteProject(userId: number, projectId: number) {
  try {
    const deleted = await db
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .returning();
    return deleted.length > 0;
  } catch (error) {
    console.error('Database error in deleteProject:', error);
    throw new Error('Failed to delete project.', { cause: error });
  }
}

// Tasks CRUD
export async function listTasks(userId: number, projectId?: number) {
  try {
    const condition = projectId
      ? and(eq(tasks.userId, userId), eq(tasks.projectId, projectId))
      : eq(tasks.userId, userId);

    return await db
      .select()
      .from(tasks)
      .where(condition)
      .orderBy(desc(tasks.createdAt));
  } catch (error) {
    console.error('Database error in listTasks:', error);
    throw new Error('Failed to load tasks.', { cause: error });
  }
}

export async function createTask(
  userId: number,
  input: {
    title: string;
    description?: string;
    priority?: string;
    projectId?: number | null;
    dueDate?: string | null;
  }
) {
  try {
    // Verify project ownership if projectId provided
    let verifiedProjectId: number | null = null;
    if (input.projectId) {
      const [proj] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, userId)))
        .limit(1);
      if (proj) verifiedProjectId = proj.id;
    }

    const [created] = await db
      .insert(tasks)
      .values({
        userId,
        projectId: verifiedProjectId,
        title: input.title.trim(),
        description: input.description?.trim() ?? '',
        priority: input.priority || 'medium',
        status: 'todo',
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database error in createTask:', error);
    throw new Error('Failed to create task.', { cause: error });
  }
}

export async function updateTask(
  userId: number,
  taskId: number,
  input: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string | null;
  }
) {
  try {
    const [updated] = await db
      .update(tasks)
      .set({
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description.trim() }
          : {}),
        ...(input.status !== undefined
          ? {
              status: input.status,
              completedAt: input.status === 'done' ? new Date() : null,
            }
          : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.dueDate !== undefined
          ? { dueDate: input.dueDate ? new Date(input.dueDate) : null }
          : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('Database error in updateTask:', error);
    throw new Error('Failed to update task.', { cause: error });
  }
}

export async function deleteTask(userId: number, taskId: number) {
  try {
    const deleted = await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();
    return deleted.length > 0;
  } catch (error) {
    console.error('Database error in deleteTask:', error);
    throw new Error('Failed to delete task.', { cause: error });
  }
}

// Documents CRUD
export async function listDocuments(userId: number) {
  try {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt));
  } catch (error) {
    console.error('Database error in listDocuments:', error);
    throw new Error('Failed to load documents.', { cause: error });
  }
}

export async function createDocument(
  userId: number,
  input: {
    title: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    contentText: string;
    projectId?: number | null;
  }
) {
  try {
    let verifiedProjectId: number | null = null;
    if (input.projectId) {
      const [proj] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, userId)))
        .limit(1);
      if (proj) verifiedProjectId = proj.id;
    }

    const [created] = await db
      .insert(documents)
      .values({
        userId,
        projectId: verifiedProjectId,
        title: input.title.trim(),
        fileName: input.fileName.trim(),
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        contentText: input.contentText.slice(0, 120000),
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database error in createDocument:', error);
    throw new Error('Failed to save document.', { cause: error });
  }
}

// Knowledge Items
export async function listKnowledgeItems(userId: number) {
  try {
    return await db
      .select()
      .from(knowledgeItems)
      .where(eq(knowledgeItems.userId, userId))
      .orderBy(desc(knowledgeItems.updatedAt));
  } catch (error) {
    console.error('Database error in listKnowledgeItems:', error);
    throw new Error('Failed to load Knowledge Vault.', { cause: error });
  }
}

export async function createKnowledgeItem(
  userId: number,
  input: {
    title: string;
    content: string;
    folder?: string;
    itemType?: string;
    tags?: string[];
    projectId?: number | null;
  }
) {
  try {
    const [created] = await db
      .insert(knowledgeItems)
      .values({
        userId,
        projectId: input.projectId ?? null,
        title: input.title.trim(),
        content: input.content,
        folder: input.folder?.trim() || 'General',
        itemType: input.itemType || 'note',
        tags: input.tags ?? [],
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database error in createKnowledgeItem:', error);
    throw new Error('Failed to save knowledge item.', { cause: error });
  }
}

// Conversations & Messages
export async function listConversations(userId: number) {
  try {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  } catch (error) {
    console.error('Database error in listConversations:', error);
    throw new Error('Failed to load conversations.', { cause: error });
  }
}

export async function getConversationWithMessages(
  userId: number,
  conversationId: number
) {
  try {
    const [convo] = await db
      .select()
      .from(conversations)
      .where(
        and(eq(conversations.id, conversationId), eq(conversations.userId, userId))
      )
      .limit(1);

    if (!convo) return null;

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convo.id))
      .orderBy(messages.createdAt);

    return { conversation: convo, messages: msgs };
  } catch (error) {
    console.error('Database error in getConversationWithMessages:', error);
    throw new Error('Failed to load conversation.', { cause: error });
  }
}

export async function createConversation(
  userId: number,
  input: { title?: string; model?: string; projectId?: number | null }
) {
  try {
    let verifiedProjectId: number | null = null;
    if (input.projectId) {
      const [proj] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, userId)))
        .limit(1);
      if (proj) verifiedProjectId = proj.id;
    }

    const [created] = await db
      .insert(conversations)
      .values({
        userId,
        projectId: verifiedProjectId,
        title: input.title?.trim() || 'New Conversation',
        model: input.model || 'gemini-4-hydrogen',
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database error in createConversation:', error);
    throw new Error('Failed to create conversation.', { cause: error });
  }
}

export async function deleteConversation(userId: number, conversationId: number) {
  try {
    const deleted = await db
      .delete(conversations)
      .where(
        and(eq(conversations.id, conversationId), eq(conversations.userId, userId))
      )
      .returning();
    return deleted.length > 0;
  } catch (error) {
    console.error('Database error in deleteConversation:', error);
    throw new Error('Failed to delete conversation.', { cause: error });
  }
}

export async function appendMessage(input: {
  conversationId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelUsed?: string;
  tokensUsed?: number;
}) {
  try {
    const [msg] = await db
      .insert(messages)
      .values({
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        modelUsed: input.modelUsed ?? null,
        tokensUsed: input.tokensUsed ?? 0,
      })
      .returning();

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, input.conversationId));

    return msg;
  } catch (error) {
    console.error('Database error in appendMessage:', error);
    throw new Error('Failed to store message.', { cause: error });
  }
}

export async function recordAiUsage(input: {
  userId: number;
  module: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}) {
  try {
    await db.insert(usageRecords).values(input);
  } catch (error) {
    console.error('Database error in recordAiUsage:', error);
  }
}

export async function markNotificationRead(userId: number, notificationId?: number) {
  try {
    if (notificationId) {
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(eq(notifications.id, notificationId), eq(notifications.userId, userId))
        );
    } else {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, userId));
    }
  } catch (error) {
    console.error('Database error in markNotificationRead:', error);
    throw new Error('Failed to update notifications.', { cause: error });
  }
}

export async function exportAllUserData(userId: number) {
  try {
    const [
      userProjects,
      userTasks,
      userConversations,
      userDocuments,
      userKnowledge,
      userUsage,
    ] = await Promise.all([
      db.select().from(projects).where(eq(projects.userId, userId)),
      db.select().from(tasks).where(eq(tasks.userId, userId)),
      db.select().from(conversations).where(eq(conversations.userId, userId)),
      db.select().from(documents).where(eq(documents.userId, userId)),
      db.select().from(knowledgeItems).where(eq(knowledgeItems.userId, userId)),
      db.select().from(usageRecords).where(eq(usageRecords.userId, userId)),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      projects: userProjects,
      tasks: userTasks,
      conversations: userConversations,
      documents: userDocuments,
      knowledgeItems: userKnowledge,
      usageRecords: userUsage,
    };
  } catch (error) {
    console.error('Database error in exportAllUserData:', error);
    throw new Error('Failed to export user data.', { cause: error });
  }
}
