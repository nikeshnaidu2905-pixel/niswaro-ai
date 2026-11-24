import React, { useState } from 'react';
import { ArrowRight, FileUp, Sparkles } from 'lucide-react';
import { ModuleId } from '../types/niswaro.ts';

interface ModuleConfig {
  title: string;
  phaseLabel: string;
  description: string;
  placeholder: string;
  templates: Array<{ label: string; prompt: string }>;
}

const MODULE_CONFIGS: Record<
  Exclude<
    ModuleId,
    'home' | 'ai_brain' | 'projects' | 'knowledge_vault' | 'life_manager' | 'settings'
  >,
  ModuleConfig
> = {
  smart_learning: {
    title: 'Smart Learning',
    phaseLabel: 'Phase 4 Module · AI Tutor Active',
    description:
      'Explain complex topics, generate multiple-choice practice quizzes, create flashcards, or upload PDFs for guided study.',
    placeholder: 'Enter a subject, chapter concept, or exercise to study…',
    templates: [
      {
        label: 'Generate 5-Question Quiz',
        prompt:
          'Generate a 5-question multiple-choice quiz with answer key and explanations on: ',
      },
      {
        label: 'Create Study Flashcards',
        prompt:
          'Create 8 concise Q&A study flashcards covering the core principles of: ',
      },
      {
        label: 'Explain Step by Step',
        prompt:
          'Teach me this concept from first principles with clear examples and a quick self-check: ',
      },
    ],
  },
  creator_studio: {
    title: 'Creator Studio',
    phaseLabel: 'Phase 5 Module · Script & Storyboard Active',
    description:
      'Turn raw ideas into production scripts, character profiles, episode plans, storyboard beats, and voiceover notes.',
    placeholder: 'Describe your video topic, story premise, or audience…',
    templates: [
      {
        label: 'Full Video Script',
        prompt:
          'Write a complete video production script with hook, scenes, visual cues, and voiceover notes for: ',
      },
      {
        label: 'Character Profile Sheet',
        prompt:
          'Design 3 distinct character profiles with backstories, motivations, and sample dialogue for: ',
      },
      {
        label: 'Storyboard Scene Plan',
        prompt:
          'Create a 6-scene storyboard breakdown with framing, lighting, duration, and narration for: ',
      },
    ],
  },
  developer_lab: {
    title: 'Developer Lab',
    phaseLabel: 'Phase 6 Module · Coding Assistant Active',
    description:
      'Architect services, refactor modules, debug stack traces, draft unit tests, and document REST APIs.',
    placeholder: 'Describe the feature, error message, or API contract…',
    templates: [
      {
        label: 'Generate Typed Module',
        prompt:
          'Write clean, production-grade TypeScript code with input validation and error handling for: ',
      },
      {
        label: 'Write Unit Tests',
        prompt:
          'Generate comprehensive unit tests covering happy paths and edge cases for: ',
      },
      {
        label: 'Debug & Refactor',
        prompt:
          'Analyze root causes, security risks, and refactor for clarity and performance: ',
      },
    ],
  },
  research_lab: {
    title: 'Research Lab',
    phaseLabel: 'Phase 7 Module · Synthesis Active',
    description:
      'Structure comparative analyses, literature briefs, citation outlines, and executive research reports separating facts from interpretation.',
    placeholder: 'Enter your research question or comparison topic…',
    templates: [
      {
        label: 'Comparative Matrix',
        prompt:
          'Produce a structured research comparison distinguishing verified facts from analysis on: ',
      },
      {
        label: 'Executive Research Brief',
        prompt:
          'Draft a formal research summary with key findings, limitations, and suggested primary sources to verify for: ',
      },
      {
        label: 'Methodology Critique',
        prompt:
          'Evaluate assumptions, potential biases, and open questions regarding: ',
      },
    ],
  },
  integrations: {
    title: 'Integrations',
    phaseLabel: 'Phase 9 Module · Explicit OAuth Ready',
    description:
      'Connect external productivity tools with explicit per-integration authorization and granular scope controls.',
    placeholder: '',
    templates: [],
  },
};

const INTEGRATIONS_CATALOG = [
  {
    name: 'Google Drive',
    scope: 'Read and import study PDFs and project documents into Knowledge Vault.',
  },
  {
    name: 'Google Calendar',
    scope: 'Sync Life Manager tasks and AI-generated daily time blocks.',
  },
  {
    name: 'Gmail',
    scope: 'Draft replies and extract action items with explicit user approval.',
  },
  {
    name: 'Slack',
    scope: 'Send project milestone summaries to authorized channels.',
  },
  {
    name: 'Notion',
    scope: 'Mirror Knowledge Vault pages and research reports.',
  },
];

interface ModuleWorkspaceBridgeProps {
  moduleId: Exclude<
    ModuleId,
    'home' | 'ai_brain' | 'projects' | 'knowledge_vault' | 'life_manager' | 'settings'
  >;
  onLaunchAiPrompt: (prompt: string, moduleTag: string) => void;
  onOpenUploadDocument: () => void;
}

export const ModuleWorkspaceBridge: React.FC<ModuleWorkspaceBridgeProps> = ({
  moduleId,
  onLaunchAiPrompt,
  onOpenUploadDocument,
}) => {
  const cfg = MODULE_CONFIGS[moduleId];
  const [topic, setTopic] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [pendingIntegration, setPendingIntegration] = useState<string | null>(
    null
  );

  if (moduleId === 'integrations') {
    return (
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-7 space-y-6">
        <div className="space-y-1">
          <div className="text-xs font-medium text-violet-600 dark:text-cyan-400">
            {cfg.phaseLabel}
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
            {cfg.title}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            {cfg.description}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] divide-y divide-slate-200 dark:divide-slate-800">
          {INTEGRATIONS_CATALOG.map((item) => (
            <div
              key={item.name}
              className="p-5 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="space-y-0.5 max-w-xl">
                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                  {item.name}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {item.scope}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500">
                  Not connected
                </span>
                <button
                  type="button"
                  onClick={() => setPendingIntegration(item.name)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#141C35] text-xs font-semibold text-slate-900 dark:text-white"
                >
                  Configure OAuth
                </button>
              </div>
            </div>
          ))}
        </div>

        {pendingIntegration && (
          <div
            role="status"
            className="p-4 rounded-xl border border-cyan-300 dark:border-cyan-500/40 bg-cyan-50 dark:bg-cyan-950/30 flex items-center justify-between gap-4 text-xs text-cyan-900 dark:text-cyan-200"
          >
            <span>
              <strong>{pendingIntegration}</strong> requires explicit OAuth scope
              authorization scheduled in Phase 9 (Integrations &amp; Billing). Ask to
              proceed to Phase 9 whenever you are ready to authorize{' '}
              {pendingIntegration}.
            </span>
            <button
              type="button"
              onClick={() => setPendingIntegration(null)}
              className="font-semibold underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    );
  }

  const handleLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    const prefix = cfg.templates[selectedTemplate]?.prompt || '';
    onLaunchAiPrompt(`${prefix}${topic.trim()}`, moduleId);
  };

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-7 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-medium text-violet-600 dark:text-cyan-400">
            {cfg.phaseLabel}
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
            {cfg.title}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            {cfg.description}
          </p>
        </div>

        {moduleId === 'smart_learning' && (
          <button
            type="button"
            onClick={onOpenUploadDocument}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#141C35] text-xs font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2"
          >
            <FileUp className="w-4 h-4 text-violet-600 dark:text-cyan-400" />
            <span>Upload Study Material</span>
          </button>
        )}
      </div>

      <form
        onSubmit={handleLaunch}
        className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] space-y-5"
      >
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Workflow Mode
          </div>
          <div className="flex flex-wrap gap-2">
            {cfg.templates.map((tpl, idx) => (
              <button
                key={tpl.label}
                type="button"
                onClick={() => setSelectedTemplate(idx)}
                className={`px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  selectedTemplate === idx
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 text-violet-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="mod-topic"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Prompt Brief
          </label>
          <textarea
            id="mod-topic"
            rows={4}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={cfg.placeholder}
            className="w-full p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#070B18] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
            <span>Powered by live NISWARO AI Brain orchestration</span>
          </span>
          <button
            type="submit"
            disabled={!topic.trim()}
            className="px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-40 transition-colors"
          >
            <span>Launch in AI Brain</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
