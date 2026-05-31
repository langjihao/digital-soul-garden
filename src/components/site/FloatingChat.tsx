import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Sparkles } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useT } from "@/lib/i18n/provider";

/**
 * Floating "Ask the twin" chat — AI SDK `useChat` against `/api/chat`
 * (which proxies to Dify's OpenAI-compatible endpoint).
 */
export function FloatingChat() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const initial: UIMessage[] = useMemo(
    () => [
      {
        id: "greeting",
        role: "assistant",
        parts: [{ type: "text", text: t.chat.greeting }],
      },
    ],
    // refresh greeting when locale changes
    [t.chat.greeting],
  );

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
    messages: initial,
  });

  // If only the greeting is present, swap it when locale changes.
  useEffect(() => {
    setMessages((m) => (m.length <= 1 ? initial : m));
  }, [initial, setMessages]);

  const busy = status === "submitted" || status === "streaming";

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  };

  const renderText = (m: UIMessage) =>
    m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null));

  return (
    <>
      <motion.button
        aria-label={t.chat.open}
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-primary shadow-lg shadow-primary/10"
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed bottom-20 right-5 z-50 flex h-[min(560px,72vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  digital_twin
                </span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                {busy ? "streaming…" : "dify · ai-sdk"}
              </span>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.role === "user"
                      ? "ml-auto max-w-[85%] rounded-lg bg-primary/15 px-3 py-2 text-sm text-foreground"
                      : "mr-auto max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap text-foreground"
                  }
                >
                  {renderText(m) || (busy ? "…" : "")}
                </div>
              ))}
              {error && (
                <p className="font-mono text-[11px] text-destructive">
                  ⚠️ {error.message}
                </p>
              )}
            </div>
            <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.chat.placeholder}
                disabled={busy}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-primary px-3 py-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                aria-label={t.chat.send}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
