import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  BookmarkPlus,
  Check,
  Copy,
  Download,
  Loader2,
  MessageSquarePlus,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import {
  AiModelOption,
  ChatMessage,
  ConversationItem,
} from '../types/niswaro.ts';

interface AiBrainViewProps {
  selectedModel: string;
  onSelectModel: (model: string) => void;
  models: AiModelOption[];
  activeProjectId: number | null;
  initialConversationId: number | null;
  initialPrompt: string | null;
  onClearInitialPrompt: () => void;
  onDataMutated: () => Promise<void>;
}

export const AiBrainView: React.FC<AiBrainViewProps> = ({
  selectedModel,
  onSelectModel,
  models,
  activeProjectId,
  initialConversationId,
  initialPrompt,
  onClearInitialPrompt,
  onDataMutated,
}) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [listening, setListening] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const sentInitialRef = useRef<string | null>(null);

  const loadConversations = async () => {
    try {
      const res = await apiFetch<{ conversations: ConversationItem[] }>(
        '/api/conversations'
      );
      setConversations(res.conversations);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load conversations.'
      );
    } finally {
      setLoadingList(false);
    }
  };

  const loadConversationMessages = async (convoId: number) => {
    setError(null);
    try {
      const res = await apiFetch<{
        conversation: ConversationItem;
        messages: ChatMessage[];
      }>(`/api/conversations/${convoId}`);
      setActiveId(res.conversation.id);
      setMessages(res.messages);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load conversation.'
      );
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (initialConversationId) {
      loadConversationMessages(initialConversationId);
    } else if (initialConversationId === null && !initialPrompt) {
      setActiveId(null);
      setMessages([]);
    }
  }, [initialConversationId, initialPrompt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async (textToSend: string, targetConvoId?: number | null) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    setError(null);
    setSending(true);
    const optimisticUser: ChatMessage = {
      id: -Date.now(),
      conversationId: targetConvoId ?? activeId ?? 0,
      role: 'user',
      content: trimmed,
      modelUsed: null,
      tokensUsed: 0,
      savedToVault: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setInput('');

    try {
      const res = await apiFetch<{
        conversationId: number;
        userMessage: ChatMessage;
        assistantMessage: ChatMessage;
      }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: targetConvoId !== undefined ? targetConvoId : activeId,
          projectId: activeProjectId,
          model: selectedModel,
          message: trimmed,
          module: 'ai_brain',
        }),
      });

      setActiveId(res.conversationId);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUser.id),
        res.userMessage,
        res.assistantMessage,
      ]);
      await loadConversations();
      await onDataMutated();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      setInput(trimmed);
      setError(
        err instanceof Error ? err.message : 'AI Brain request failed.'
      );
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (initialPrompt && sentInitialRef.current !== initialPrompt) {
      sentInitialRef.current = initialPrompt;
      setActiveId(null);
      setMessages([]);
      sendMessage(initialPrompt, null).finally(() => {
        onClearInitialPrompt();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  const handleCopy = async (msg: ChatMessage) => {
    await navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const handleSaveToVault = async (msg: ChatMessage) => {
    try {
      await apiFetch('/api/knowledge', {
        method: 'POST',
        body: JSON.stringify({
          title: msg.content.slice(0, 72).replace(/[#*\n]/g, ' ').trim() || 'Saved AI Response',
          content: msg.content,
          folder: 'AI Brain',
          itemType: 'response',
          projectId: activeProjectId,
        }),
      });
      setSavedId(msg.id);
      await onDataMutated();
      window.setTimeout(() => setSavedId(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save to vault.');
    }
  };

  const handleDeleteConversation = async (id: number) => {
    try {
      await apiFetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
      await loadConversations();
      await onDataMutated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not delete conversation.'
      );
    }
  };

  const handleExportMarkdown = () => {
    if (messages.length === 0) return;
    const content = messages
      .map(
        (m) =>
          `## ${m.role === 'user' ? 'You' : 'NISWARO AI'}\n\n${m.content}\n`
      )
      .join('\n---\n\n');
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `niswaro-conversation-${activeId ?? 'draft'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleVoiceInput = () => {
    interface BrowserSpeechRecognition {
      lang: string;
      interimResults: boolean;
      onstart: (() => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
      onresult:
        | ((event: {
            results?: ArrayLike<ArrayLike<{ transcript?: string }>>;
          }) => void)
        | null;
      start: () => void;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setError('Voice input is not supported in this browser.');
      return;
    }

    if (listening) {
      setListening(false);
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    recognition.start();
  };

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');

  return (
    <div className="h-full flex min-h-0">
      {/* Conversation History Rail */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-[#0A1021]">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setActiveId(null);
              setMessages([]);
              setError(null);
            }}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#141C35] text-xs font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center justify-center gap-2 transition-colors"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-violet-600 dark:text-cyan-400" />
            <span>New Conversation</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingList ? (
            <div className="p-3 text-xs text-slate-500">Loading history…</div>
          ) : conversations.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 dark:text-slate-400">
              Your conversations will appear here.
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center justify-between gap-1 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                  activeId === c.id
                    ? 'bg-violet-50 dark:bg-violet-500/15 text-violet-900 dark:text-white font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#141C35]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => loadConversationMessages(c.id)}
                  className="flex-1 text-left truncate"
                >
                  {c.title}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteConversation(c.id)}
                  aria-label={`Delete ${c.title}`}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Conversational Canvas */}
      <div className="flex-1 min-w-0 flex flex-col h-full">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0D1326]">
          <div className="flex items-center gap-3">
            <select
              aria-label="Select AI model"
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#070B18] text-xs font-medium text-slate-900 dark:text-slate-100"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              {activeProjectId ? 'Project-aware context active' : 'Global workspace context'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {lastUserMessage && (
              <button
                type="button"
                disabled={sending}
                onClick={() => sendMessage(lastUserMessage.content)}
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#141C35] inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>
            )}
            <button
              type="button"
              disabled={messages.length === 0}
              onClick={handleExportMarkdown}
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#141C35] inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 && !sending && (
              <div className="py-12 text-center space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
                    NISWARO AI Brain
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                    Ask anything across research, software architecture, study
                    material, or content planning. Every response can be saved to
                    your Knowledge Vault.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-2xl mx-auto">
                  {[
                    'Outline a PostgreSQL schema and REST API checklist for a SaaS MVP',
                    'Explain transformer attention mechanisms with a clear step-by-step example',
                    'Draft a 60-second product launch video script with scene cues',
                    'Turn my week into a focused deep-work schedule with daily priorities',
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] hover:border-violet-400 dark:hover:border-violet-500/70 text-xs text-slate-700 dark:text-slate-300 leading-relaxed transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <article
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-xl px-4 py-3.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white'
                      : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1326] text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-slate-950 [&_pre]:text-slate-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_code]:font-mono">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>

                {msg.role === 'assistant' && (
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    {msg.modelUsed && (
                      <span className="font-mono">{msg.modelUsed}</span>
                    )}
                    {msg.tokensUsed > 0 && (
                      <span className="font-mono tabular-nums">
                        · {msg.tokensUsed} tokens
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopy(msg)}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveToVault(msg)}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>
                        {savedId === msg.id ? 'Saved to Vault' : 'Save to Vault'}
                      </span>
                    </button>
                  </div>
                )}
              </article>
            ))}

            {sending && (
              <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                <span>Generating response via {selectedModel}…</span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-lg border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300"
              >
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Prompt Input */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D1326]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="max-w-3xl mx-auto flex items-end gap-2"
          >
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Ask NISWARO AI anything… (Enter to send, Shift+Enter for new line)"
              className="flex-1 resize-none px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#070B18] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
            <button
              type="button"
              onClick={toggleVoiceInput}
              aria-label={listening ? 'Stop voice input' : 'Start voice input'}
              className={`h-11 w-11 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                listening
                  ? 'border-red-500 bg-red-500/15 text-red-500'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#141C35]'
              }`}
            >
              {listening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
            <button
              type="submit"
              disabled={!input.trim() || sending}
              aria-label="Send message"
              className="h-11 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold inline-flex items-center gap-2 shrink-0 disabled:opacity-40 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
