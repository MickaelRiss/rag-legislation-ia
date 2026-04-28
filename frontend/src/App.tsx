import { useEffect, useRef, useState } from "react";

type Source = {
  content: string;
  metadata: Record<string, unknown>;
};

type UserMsg = { id: string; role: "user"; content: string };
type AssistantMsg = {
  id: string;
  role: "assistant";
  content: string;
  sources: Source[];
};
type ErrorMsg = {
  id: string;
  role: "error";
  content: string;
  retryQuestion: string;
};
type Message = UserMsg | AssistantMsg | ErrorMsg;

const STRINGS = {
  title: "Législation IA",
  tagline:
    "Posez vos questions sur la réglementation de l'IA en Europe et en France.",
  placeholder: "Posez votre question…",
  send: "Envoyer",
  newChat: "Nouvelle conversation",
  loading: "Recherche en cours…",
  error: "Impossible de joindre le service. Réessayez.",
  retry: "Réessayer",
  sources: "Sources",
  answerLabel: "Réponse",
  suggestions: [
    "Qu'est-ce que l'AI Act européen ?",
    "Quelles obligations pour les systèmes d'IA à haut risque ?",
    "Comment le RGPD s'articule-t-il avec l'AI Act ?",
    "Quelles sanctions en cas de non-conformité ?",
  ],
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getSourceTitle(source: Source, index: number): string {
  const m = source.metadata ?? {};
  const candidates = [
    "title",
    "filename",
    "file_name",
    "source",
    "file",
    "name",
  ];
  for (const k of candidates) {
    const v = m[k];
    if (typeof v === "string" && v.trim()) {
      const segments = v.split(/[/\\]/);
      return segments[segments.length - 1];
    }
  }
  return `Source ${index + 1}`;
}

function getSourceMeta(source: Source): string | null {
  const m = source.metadata ?? {};
  const parts: string[] = [];
  const page = m.page ?? m.page_number;
  if (typeof page === "number" || (typeof page === "string" && page)) {
    parts.push(`p. ${page}`);
  }
  const section = m.section ?? m.chapter;
  if (typeof section === "string" && section.trim()) parts.push(section);
  return parts.length ? parts.join(" · ") : null;
}

export default function App() {
  const [sessionId, setSessionId] = useState<string>(() => newId());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const isEmpty = messages.length === 0 && !loading;

  useEffect(() => {
    if (messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const userMsg: UserMsg = { id: newId(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, session_id: sessionId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        answer: string;
        sources: Source[];
      };
      const aiMsg: AssistantMsg = {
        id: newId(),
        role: "assistant",
        content: data.answer ?? "",
        sources: Array.isArray(data.sources) ? data.sources : [],
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: ErrorMsg = {
        id: newId(),
        role: "error",
        content: STRINGS.error,
        retryQuestion: trimmed,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  function newConversation() {
    setSessionId(newId());
    setMessages([]);
    setExpanded({});
    setInput("");
  }

  function retry(question: string) {
    setMessages((prev) => prev.filter((m) => m.role !== "error"));
    ask(question);
  }

  function toggleCitation(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="relative flex h-full min-h-screen flex-col bg-[#0a0a0a] text-neutral-100">
      <BackgroundGlow />

      {!isEmpty && <TopBar onNewChat={newConversation} />}

      {isEmpty ? (
        <main className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-2xl">
            <Hero />
            <Composer
              value={input}
              onChange={setInput}
              onSubmit={() => ask(input)}
              loading={loading}
              centered
              autoFocus
            />
            <Suggestions onPick={(s) => ask(s)} />
          </div>
        </main>
      ) : (
        <>
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 pb-40 pt-6">
              {messages.map((m) =>
                m.role === "user" ? (
                  <UserBubble key={m.id} content={m.content} />
                ) : m.role === "assistant" ? (
                  <AssistantBlock
                    key={m.id}
                    message={m}
                    expanded={expanded}
                    onToggle={toggleCitation}
                  />
                ) : (
                  <ErrorBubble
                    key={m.id}
                    content={m.content}
                    onRetry={() => retry(m.retryQuestion)}
                  />
                ),
              )}
              {loading && <LoadingBlock />}
              <div ref={bottomRef} />
            </div>
          </main>
          <div className="sticky bottom-0 border-t border-neutral-800/80 bg-[#0a0a0a]/85 backdrop-blur">
            <div className="mx-auto w-full max-w-3xl px-4 py-4">
              <Composer
                value={input}
                onChange={setInput}
                onSubmit={() => ask(input)}
                loading={loading}
                autoFocus
              />
              <p className="mt-2 text-center text-[11px] text-neutral-600">
                Les réponses sont générées par IA et peuvent contenir des
                erreurs. Vérifiez les sources.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BackgroundGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute left-1/2 top-[-10%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="absolute right-[-10%] top-1/3 h-[420px] w-[420px] rounded-full bg-violet-600/10 blur-3xl" />
    </div>
  );
}

function TopBar({ onNewChat }: { onNewChat: () => void }) {
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-800/80 bg-[#0a0a0a]/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
        <BrandMark compact />
        <button
          type="button"
          onClick={onNewChat}
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-950/60 px-3 py-1.5 text-sm text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-900 hover:text-neutral-100"
        >
          <IconPlus className="h-4 w-4" />
          {STRINGS.newChat}
        </button>
      </div>
    </header>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  const dot = compact ? "h-7 w-7" : "h-8 w-8";
  const text = compact ? "text-base" : "text-lg";
  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-[0_0_30px_-10px_rgba(139,92,246,0.7)] ${dot}`}
      >
        <IconSparkle className="h-4 w-4" />
      </span>
      <span
        className={`bg-gradient-to-r from-indigo-200 via-white to-violet-200 bg-clip-text font-semibold tracking-tight text-transparent ${text}`}
      >
        {STRINGS.title}
      </span>
    </div>
  );
}

function Hero() {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-[0_0_60px_-15px_rgba(139,92,246,0.7)]">
        <IconSparkle className="h-7 w-7 text-white" />
      </div>
      <h1 className="bg-gradient-to-r from-indigo-200 via-white to-violet-200 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl pb-4">
        {STRINGS.title}
      </h1>
      <p className="mt-3 max-w-md text-base text-neutral-400">
        {STRINGS.tagline}
      </p>
    </div>
  );
}

function Suggestions({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {STRINGS.suggestions.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          className="group flex items-start gap-2 rounded-2xl border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-left text-sm text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-900 hover:text-neutral-100"
        >
          <span className="mt-0.5 text-neutral-600 transition group-hover:text-indigo-400">
            <IconArrowUpRight className="h-3.5 w-3.5" />
          </span>
          <span>{s}</span>
        </button>
      ))}
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSubmit,
  loading,
  centered = false,
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  centered?: boolean;
  autoFocus?: boolean;
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const canSubmit = value.trim().length > 0 && !loading;

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [value]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
      className={
        "relative flex items-end gap-2 rounded-2xl border border-neutral-800 bg-neutral-950/80 px-3 py-2.5 transition focus-within:border-neutral-600 focus-within:bg-neutral-900 " +
        (centered ? "shadow-[0_30px_80px_-30px_rgba(99,102,241,0.35)]" : "")
      }
    >
      <textarea
        ref={taRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (canSubmit) onSubmit();
          }
        }}
        placeholder={STRINGS.placeholder}
        autoFocus={autoFocus}
        className="max-h-[200px] w-full resize-none bg-transparent px-1 py-1.5 text-base leading-6 text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={!canSubmit}
        aria-label={STRINGS.send}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white transition disabled:cursor-not-allowed disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-600 enabled:hover:brightness-110"
      >
        {loading ? <Spinner /> : <IconArrowUp className="h-4 w-4" />}
      </button>
    </form>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="mb-6 flex animate-[fadeUp_0.25s_ease-out] justify-end">
      <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-neutral-800/80 px-4 py-2.5 text-[15px] leading-relaxed text-neutral-100">
        {content}
      </div>
    </div>
  );
}

function AssistantBlock({
  message,
  expanded,
  onToggle,
}: {
  message: AssistantMsg;
  expanded: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  return (
    <article className="mb-10 animate-[fadeUp_0.3s_ease-out]">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500">
        <span className="grid h-5 w-5 place-items-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
          <IconSparkle className="h-3 w-3" />
        </span>
        {STRINGS.answerLabel}
      </div>
      <div className="whitespace-pre-wrap text-[15px] leading-7 text-neutral-100">
        {message.content}
      </div>
      {message.sources.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500">
            {STRINGS.sources}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {message.sources.map((s, i) => {
              const key = `${message.id}:${i}`;
              const isOpen = !!expanded[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggle(key)}
                  title={getSourceTitle(s, i)}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition " +
                    (isOpen
                      ? "border-indigo-400/50 bg-indigo-500/10 text-indigo-200"
                      : "border-neutral-800 bg-neutral-950/60 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900 hover:text-neutral-100")
                  }
                >
                  <span className="font-mono text-[11px] text-indigo-300">
                    [{i + 1}]
                  </span>
                  <span className="max-w-[180px] truncate">
                    {getSourceTitle(s, i)}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 space-y-2">
            {message.sources.map((s, i) => {
              const key = `${message.id}:${i}`;
              if (!expanded[key]) return null;
              const meta = getSourceMeta(s);
              return (
                <div
                  key={key + "-panel"}
                  className="animate-[fadeUp_0.2s_ease-out] rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-indigo-300">
                      [{i + 1}] {getSourceTitle(s, i)}
                    </span>
                    {meta && <span className="text-neutral-500">{meta}</span>}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
                    {s.content}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}

function ErrorBubble({
  content,
  onRetry,
}: {
  content: string;
  onRetry: () => void;
}) {
  return (
    <div className="mb-6 animate-[fadeUp_0.25s_ease-out]">
      <div className="rounded-2xl border border-red-900/50 bg-red-950/30 p-4">
        <div className="mb-2 text-sm text-red-200">{content}</div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-full border border-red-800/70 px-3 py-1 text-xs text-red-200 transition hover:bg-red-900/30"
        >
          <IconRefresh className="h-3.5 w-3.5" />
          {STRINGS.retry}
        </button>
      </div>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="mb-10 animate-[fadeUp_0.2s_ease-out]">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500">
        <span className="grid h-5 w-5 place-items-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
          <IconSparkle className="h-3 w-3" />
        </span>
        {STRINGS.loading}
      </div>
      <div className="flex items-center gap-1.5 py-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-500" />
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconArrowUp({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}

function IconArrowUpRight({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

function IconSparkle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2 13.8 9.2 21 11 13.8 12.8 12 20 10.2 12.8 3 11l7.2-1.8L12 2Z" />
    </svg>
  );
}

function IconPlus({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconRefresh({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
