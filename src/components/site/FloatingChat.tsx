import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/provider";

/**
 * Floating "Ask the twin" chat — streams via /api/chat → Dify.
 */
export function FloatingChat() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string>(
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `u-${Math.random().toString(36).slice(2)}`),
  );
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: t.chat.greeting },
  ]);

  // Refresh the greeting if locale switches while chat is empty.
  useEffect(() => {
    setMessages((m) =>
      m.length === 1 && m[0].role === "assistant"
        ? [{ role: "assistant", content: t.chat.greeting }]
        : m
    );
  }, [t.chat.greeting]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const text = input.trim();
    if (!text) return;
    setInput("");
    setError(null);
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: text,
          conversationId: conversationIdRef.current,
          user: userIdRef.current,
        }),
      });
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const append = (chunk: string) => {
        if (!chunk) return;
        setMessages((m) => {
          const next = m.slice();
          const last = next[next.length - 1];
          if (last && last.role === "assistant") {
            next[next.length - 1] = { ...last, content: last.content + chunk };
          }
          return next;
        });
      };

      // Parse Dify SSE: lines starting with `data: <json>`, frames separated by `\n\n`.
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          for (const rawLine of frame.split("\n")) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const evt = JSON.parse(payload) as {
                event?: string;
                answer?: string;
                conversation_id?: string;
              };
              if (evt.conversation_id) conversationIdRef.current = evt.conversation_id;
              if ((evt.event === "message" || evt.event === "agent_message") && evt.answer) {
                append(evt.answer);
              }
            } catch {
              // ignore non-JSON keepalives
            }
          }
        }
      }
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      setMessages((m) => {
        const next = m.slice();
        const last = next[next.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          next[next.length - 1] = { ...last, content: `⚠️ ${msg}` };
        }
        return next;
      });
    } finally {
      setBusy(false);
    }
  };

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
                {busy ? "streaming…" : "dify"}
              </span>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "ml-auto max-w-[85%] rounded-lg bg-primary/15 px-3 py-2 text-sm text-foreground"
                      : "mr-auto max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
                  }
                >
                  {m.content || (busy && i === messages.length - 1 ? "…" : "")}
                </div>
              ))}
              {error && (
                <p className="font-mono text-[11px] text-destructive">{error}</p>
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
                className="rounded-md bg-primary px-3 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
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