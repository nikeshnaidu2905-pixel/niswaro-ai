export type ModuleId =
  | 'home'
  | 'ai_brain'
  | 'smart_learning'
  | 'creator_studio'
  | 'developer_lab'
  | 'research_lab'
  | 'life_manager'
  | 'projects'
  | 'knowledge_vault'
  | 'integrations'
  | 'settings';

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  id: number;
  userId: number;
  interests: string[];
  preferredLanguage: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  primaryUseCases: string[];
  theme: 'dark' | 'light';
  defaultAiModel: string;
  memoryEnabled: boolean;
  notificationsEnabled: boolean;
  updatedAt: string;
}

export interface SubscriptionInfo {
  id: number;
  userId: number;
  plan: string;
  status: string;
  monthlyTokenLimit: number;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
}

export interface ProfileBundle {
  user: UserProfile;
  preferences: UserPreferences;
  subscription: SubscriptionInfo;
}

export interface ProjectItem {
  id: number;
  userId: number;
  title: string;
  description: string;
  category: string;
  status: string;
  progress: number;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskItem {
  id: number;
  userId: number;
  projectId: number | null;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationItem {
  id: number;
  userId: number;
  projectId: number | null;
  title: string;
  model: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelUsed: string | null;
  tokensUsed: number;
  savedToVault: boolean;
  createdAt: string;
}

export interface DocumentItem {
  id: number;
  userId: number;
  projectId: number | null;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentText: string;
  summary: string;
  createdAt: string;
}

export interface KnowledgeItem {
  id: number;
  userId: number;
  projectId: number | null;
  folder: string;
  itemType: string;
  title: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  body: string;
  category: string;
  read: boolean;
  actionModule: string;
  createdAt: string;
}

export interface DashboardSummary {
  recentConversations: ConversationItem[];
  activeProjects: ProjectItem[];
  upcomingTasks: TaskItem[];
  recentDocuments: DocumentItem[];
  notifications: NotificationItem[];
  recentKnowledge: KnowledgeItem[];
  stats: {
    totalAiRequests: number;
    totalTokensUsed: number;
    totalProjects: number;
    totalTasks: number;
    completedTasks: number;
    totalConversations: number;
  };
}

export interface SearchResults {
  projects: ProjectItem[];
  tasks: TaskItem[];
  conversations: ConversationItem[];
  documents: DocumentItem[];
  knowledge: KnowledgeItem[];
}

export interface AiModelOption {
  id: string;
  label: string;
  provider: string;
  capability: string;
  speed: string;
}
