import { GoogleGenAI } from '@google/genai';

export interface AiModelOption {
  id: string;
  label: string;
  provider: string;
  capability: string;
  speed: string;
}

export const AVAILABLE_AI_MODELS: AiModelOption[] = [
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
    capability: 'Ultra-low latency for quick summaries, checklists, and ideation',
    speed: 'Instant',
  },
];

const ALLOWED_MODEL_IDS = new Set(AVAILABLE_AI_MODELS.map((m) => m.id));

let cachedClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'AI service is not configured. Please check GEMINI_API_KEY in Settings > Secrets.'
    );
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedClient;
}

export function resolveModel(requestedModel?: string, taskType?: string): string {
  if (requestedModel && ALLOWED_MODEL_IDS.has(requestedModel)) {
    return requestedModel;
  }
  if (taskType === 'quick' || taskType === 'summary') {
    return 'gemini-3.1-flash-lite';
  }
  return 'gemini-4-hydrogen';
}

export async function generateChatCompletion(params: {
  model?: string;
  taskType?: string;
  history: Array<{ role: string; content: string }>;
  userMessage: string;
  userContext?: {
    displayName?: string;
    preferredLanguage?: string;
    experienceLevel?: string;
    projectTitle?: string;
    projectDescription?: string;
    memorySnippets?: string[];
  };
}) {
  const ai = getAiClient();
  const model = resolveModel(params.model, params.taskType);

  const systemParts: string[] = [
    'You are NISWARO AI, a precise, high-agency intelligence assistant inside an all-in-one productivity platform.',
    'Provide clear, well-structured, directly actionable answers using clean Markdown when helpful.',
  ];

  if (params.userContext?.preferredLanguage) {
    systemParts.push(
      `Respond in ${params.userContext.preferredLanguage} unless the user asks for another language.`
    );
  }
  if (params.userContext?.experienceLevel) {
    systemParts.push(
      `Calibrate depth for a ${params.userContext.experienceLevel} level practitioner.`
    );
  }
  if (params.userContext?.projectTitle) {
    systemParts.push(
      `Active Project Context: "${params.userContext.projectTitle}" — ${params.userContext.projectDescription || 'No description provided.'}`
    );
  }
  if (params.userContext?.memorySnippets && params.userContext.memorySnippets.length > 0) {
    systemParts.push(
      `User Knowledge Vault Context:\n${params.userContext.memorySnippets.join('\n---\n')}`
    );
  }

  const contents = [
    ...params.history.slice(-14).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    {
      role: 'user',
      parts: [{ text: params.userMessage }],
    },
  ];

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: systemParts.join('\n'),
    },
  });

  const text =
    response.text?.trim() ||
    'I could not generate a response for that prompt. Please try rephrasing.';

  const usage = response.usageMetadata;
  const promptTokens = usage?.promptTokenCount ?? 0;
  const completionTokens = usage?.candidatesTokenCount ?? 0;
  const totalTokens = usage?.totalTokenCount ?? promptTokens + completionTokens;

  return {
    text,
    model,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens,
    },
  };
}
