import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// 1. Users (linked to Firebase Auth UID)
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull().default(''),
    avatarUrl: text('avatar_url'),
    role: text('role').notNull().default('member'),
    emailVerified: boolean('email_verified').notNull().default(false),
    onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('users_email_idx').on(table.email)]
);

// 2. User Preferences (onboarding + settings)
export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  interests: jsonb('interests').$type<string[]>().notNull().default([]),
  preferredLanguage: text('preferred_language').notNull().default('English'),
  experienceLevel: text('experience_level').notNull().default('intermediate'),
  primaryUseCases: jsonb('primary_use_cases').$type<string[]>().notNull().default([]),
  theme: text('theme').notNull().default('dark'),
  defaultAiModel: text('default_ai_model').notNull().default('gemini-4-hydrogen'),
  memoryEnabled: boolean('memory_enabled').notNull().default(true),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Projects
export const projects = pgTable(
  'projects',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    category: text('category').notNull().default('General'),
    status: text('status').notNull().default('active'),
    progress: integer('progress').notNull().default(0),
    deadline: timestamp('deadline'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('projects_user_id_idx').on(table.userId)]
);

// 4. Project Members
export const projectMembers = pgTable(
  'project_members',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role').notNull().default('owner'),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [index('project_members_project_idx').on(table.projectId)]
);

// 5. Conversations (AI Brain)
export const conversations = pgTable(
  'conversations',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: integer('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull().default('New Conversation'),
    model: text('model').notNull().default('gemini-4-hydrogen'),
    pinned: boolean('pinned').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('conversations_user_id_idx').on(table.userId)]
);

// 6. Messages
export const messages = pgTable(
  'messages',
  {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role').notNull(), // 'user' | 'assistant' | 'system'
    content: text('content').notNull(),
    modelUsed: text('model_used'),
    tokensUsed: integer('tokens_used').notNull().default(0),
    savedToVault: boolean('saved_to_vault').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('messages_conversation_id_idx').on(table.conversationId)]
);

// 7. Tasks (Life Manager & Projects)
export const tasks = pgTable(
  'tasks',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: integer('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    status: text('status').notNull().default('todo'), // 'todo' | 'in_progress' | 'done'
    priority: text('priority').notNull().default('medium'), // 'low' | 'medium' | 'high' | 'urgent'
    dueDate: timestamp('due_date'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('tasks_user_id_idx').on(table.userId)]
);

// 8. Documents (Uploaded files & PDFs)
export const documents = pgTable(
  'documents',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: integer('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull().default('text/plain'),
    sizeBytes: integer('size_bytes').notNull().default(0),
    contentText: text('content_text').notNull().default(''),
    summary: text('summary').notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('documents_user_id_idx').on(table.userId)]
);

// 9. Knowledge Items (Knowledge Vault)
export const knowledgeItems = pgTable(
  'knowledge_items',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: integer('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    folder: text('folder').notNull().default('General'),
    itemType: text('item_type').notNull().default('note'), // 'note' | 'snippet' | 'response' | 'report'
    title: text('title').notNull(),
    content: text('content').notNull().default(''),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    isFavorite: boolean('is_favorite').notNull().default(false),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('knowledge_items_user_id_idx').on(table.userId)]
);

// 10. Learning Subjects (Smart Learning)
export const learningSubjects = pgTable(
  'learning_subjects',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    progress: integer('progress').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('learning_subjects_user_id_idx').on(table.userId)]
);

// 11. Courses
export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  subjectId: integer('subject_id')
    .references(() => learningSubjects.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  level: text('level').notNull().default('intermediate'),
  totalLessons: integer('total_lessons').notNull().default(0),
  completedLessons: integer('completed_lessons').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 12. Quiz Attempts
export const quizAttempts = pgTable('quiz_attempts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  subjectId: integer('subject_id').references(() => learningSubjects.id, {
    onDelete: 'set null',
  }),
  title: text('title').notNull(),
  score: integer('score').notNull().default(0),
  totalQuestions: integer('total_questions').notNull().default(0),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. Creator Projects (Creator Studio)
export const creatorProjects = pgTable('creator_projects', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  format: text('format').notNull().default('video_script'),
  logline: text('logline').notNull().default(''),
  scriptContent: text('script_content').notNull().default(''),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 14. Characters
export const characters = pgTable('characters', {
  id: serial('id').primaryKey(),
  creatorProjectId: integer('creator_project_id')
    .references(() => creatorProjects.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('protagonist'),
  bio: text('bio').notNull().default(''),
  traits: jsonb('traits').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 15. Storyboards
export const storyboards = pgTable('storyboards', {
  id: serial('id').primaryKey(),
  creatorProjectId: integer('creator_project_id')
    .references(() => creatorProjects.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  sceneNumber: integer('scene_number').notNull().default(1),
  title: text('title').notNull(),
  visualPrompt: text('visual_prompt').notNull().default(''),
  dialogue: text('dialogue').notNull().default(''),
  voiceoverNotes: text('voiceover_notes').notNull().default(''),
  durationSec: integer('duration_sec').notNull().default(15),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 16. Research Reports (Research Lab)
export const researchReports = pgTable('research_reports', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  projectId: integer('project_id').references(() => projects.id, {
    onDelete: 'set null',
  }),
  title: text('title').notNull(),
  query: text('query').notNull(),
  summary: text('summary').notNull().default(''),
  analysis: text('analysis').notNull().default(''),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 17. Research Sources
export const researchSources = pgTable('research_sources', {
  id: serial('id').primaryKey(),
  reportId: integer('report_id')
    .references(() => researchReports.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  url: text('url').notNull().default(''),
  snippet: text('snippet').notNull().default(''),
  verified: boolean('verified').notNull().default(false),
  citationText: text('citation_text').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 18. Notifications
export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    category: text('category').notNull().default('system'),
    read: boolean('read').notNull().default(false),
    actionModule: text('action_module').notNull().default('home'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('notifications_user_id_idx').on(table.userId)]
);

// 19. Integrations
export const integrations = pgTable(
  'integrations',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    provider: text('provider').notNull(), // 'google_drive' | 'google_calendar' | 'gmail' | 'slack' | 'notion'
    status: text('status').notNull().default('disconnected'), // 'connected' | 'disconnected'
    scopes: jsonb('scopes').$type<string[]>().notNull().default([]),
    connectedAt: timestamp('connected_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('integrations_user_id_idx').on(table.userId)]
);

// 20. Subscriptions
export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  plan: text('plan').notNull().default('free'), // 'free' | 'pro' | 'enterprise'
  status: text('status').notNull().default('active'),
  monthlyTokenLimit: integer('monthly_token_limit').notNull().default(250000),
  currentPeriodStart: timestamp('current_period_start').defaultNow().notNull(),
  currentPeriodEnd: timestamp('current_period_end'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 21. Usage Records
export const usageRecords = pgTable(
  'usage_records',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    module: text('module').notNull().default('ai_brain'),
    model: text('model').notNull().default('gemini-4-hydrogen'),
    promptTokens: integer('prompt_tokens').notNull().default(0),
    completionTokens: integer('completion_tokens').notNull().default(0),
    totalTokens: integer('total_tokens').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('usage_records_user_id_idx').on(table.userId)]
);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId],
  }),
  projects: many(projects),
  conversations: many(conversations),
  tasks: many(tasks),
  documents: many(documents),
  knowledgeItems: many(knowledgeItems),
  notifications: many(notifications),
  integrations: many(integrations),
  usageRecords: many(usageRecords),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  tasks: many(tasks),
  conversations: many(conversations),
  documents: many(documents),
  members: many(projectMembers),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [conversations.projectId],
    references: [projects.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const researchReportsRelations = relations(researchReports, ({ many }) => ({
  sources: many(researchSources),
}));

export const researchSourcesRelations = relations(researchSources, ({ one }) => ({
  report: one(researchReports, {
    fields: [researchSources.reportId],
    references: [researchReports.id],
  }),
}));
