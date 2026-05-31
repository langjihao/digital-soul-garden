import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Highlighter, MessageCircle, X, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

interface Reply {
  author: string;
  body: string;
  createdAt: string;
}

interface Annotation {
  id: string;
  paragraphIndex: number;
  quote: string;
  replies: Reply[];
}

export function AnnotatedArticle({ paragraphs }: { paragraphs: string[] }) {
  const { locale } = useI18n();
  const articleRef = useRef<HTMLDivElement>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [popover, setPopover] = useState<
    { x: number; y: number; paragraphIndex: number; quote: string } | null
  >(null);

  const label = locale === "zh"
    ? {
        annotate: "划线讨论",
        emptyTitle: "侧边讨论",
        emptyDesc: "用鼠标选中正文任意片段，点弹出按钮即可在右侧开启讨论。",
        you: "你",
        reply: "回复",
        replyPh: "对这段说点什么…",
        close: "关闭",
        threadsHeader: (n: number) => `${n} 段批注`,
      }
    : {
        annotate: "Annotate",
        emptyTitle: "Margin discussion",
        emptyDesc: "Highlight any text in the article, then click the popup to start a side thread.",
        you: "you",
        reply: "Reply",
        replyPh: "Say something about this passage…",
        close: "Close",
        threadsHeader: (n: number) => `${n} thread${n === 1 ? "" : "s"}`,
      };

  // Capture selection inside article
  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !articleRef.current) {
        setPopover(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!articleRef.current.contains(range.commonAncestorContainer)) {
        setPopover(null);
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 2) {
        setPopover(null);
        return;
      }
      // Find enclosing paragraph
      let node: Node | null = range.commonAncestorContainer;
      let p: HTMLElement | null = null;
      while (node) {
        if (node instanceof HTMLElement && node.dataset.p) {
          p = node;
          break;
        }
        node = node.parentNode;
      }
      if (!p) {
        setPopover(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      const containerRect = articleRef.current.getBoundingClientRect();
      setPopover({
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top - containerRect.top - 8,
        paragraphIndex: Number(p.dataset.p),
        quote: text,
      });
    };
    document.addEventListener("mouseup", handler);
    document.addEventListener("selectionchange", () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) setPopover(null);
    });
    return () => {
      document.removeEventListener("mouseup", handler);
    };
  }, []);

  const addAnnotation = () => {
    if (!popover) return;
    const a: Annotation = {
      id: crypto.randomUUID(),
      paragraphIndex: popover.paragraphIndex,
      quote: popover.quote,
      replies: [],
    };
    setAnnotations((arr) => [...arr, a]);
    setActiveId(a.id);
    setPopover(null);
    window.getSelection()?.removeAllRanges();
  };

  const addReply = (id: string, body: string) => {
    setAnnotations((arr) =>
      arr.map((a) =>
        a.id === id
          ? {
              ...a,
              replies: [
                ...a.replies,
                { author: label.you, body, createdAt: new Date().toISOString() },
              ],
            }
          : a,
      ),
    );
  };

  // Render paragraph with <mark> around any annotation quotes
  const renderParagraph = (text: string, idx: number) => {
    const marks = annotations.filter((a) => a.paragraphIndex === idx);
    if (marks.length === 0) return text;
    // Split using each quote sequentially. Simple non-overlapping splitter.
    type Seg = { text: string; annoId?: string };
    let segs: Seg[] = [{ text }];
    for (const m of marks) {
      const next: Seg[] = [];
      for (const s of segs) {
        if (s.annoId) {
          next.push(s);
          continue;
        }
        const i = s.text.indexOf(m.quote);
        if (i === -1) {
          next.push(s);
          continue;
        }
        if (i > 0) next.push({ text: s.text.slice(0, i) });
        next.push({ text: m.quote, annoId: m.id });
        if (i + m.quote.length < s.text.length) next.push({ text: s.text.slice(i + m.quote.length) });
      }
      segs = next;
    }
    return segs.map((s, i) =>
      s.annoId ? (
        <mark
          key={i}
          onClick={() => setActiveId(s.annoId!)}
          className={`cursor-pointer rounded-sm bg-primary/20 px-0.5 text-foreground decoration-primary underline-offset-2 hover:bg-primary/30 ${
            activeId === s.annoId ? "ring-1 ring-primary" : ""
          }`}
        >
          {s.text}
        </mark>
      ) : (
        <span key={i}>{s.text}</span>
      ),
    );
  };

  return (
    <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* Article column */}
      <div ref={articleRef} className="relative">
        <div className="prose-invert max-w-none space-y-5 text-[15px] leading-[1.85] text-foreground/90">
          {paragraphs.map((p, i) => (
            <p key={i} data-p={i} className="selection:bg-primary/30">
              {renderParagraph(p, i)}
            </p>
          ))}
        </div>

        <AnimatePresence>
          {popover && (
            <motion.button
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={addAnnotation}
              style={{ left: popover.x, top: popover.y }}
              className="absolute z-30 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2.5 py-1.5 font-mono text-[11px] text-foreground shadow-lg shadow-primary/10 hover:border-primary/50"
            >
              <span className="inline-flex items-center gap-1.5">
                <Highlighter className="h-3 w-3 text-primary" />
                {label.annotate}
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Margin discussion column */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5" />
              {label.emptyTitle}
            </span>
            <span className="text-muted-foreground">{label.threadsHeader(annotations.length)}</span>
          </div>

          {annotations.length === 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{label.emptyDesc}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {annotations.map((a) => (
                <AnnotationCard
                  key={a.id}
                  annotation={a}
                  active={activeId === a.id}
                  onFocus={() => setActiveId(a.id)}
                  onClose={() =>
                    setAnnotations((arr) => arr.filter((x) => x.id !== a.id))
                  }
                  onReply={(body) => addReply(a.id, body)}
                  replyPlaceholder={label.replyPh}
                  replyLabel={label.reply}
                  closeLabel={label.close}
                  locale={locale}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function AnnotationCard({
  annotation,
  active,
  onFocus,
  onClose,
  onReply,
  replyPlaceholder,
  replyLabel,
  closeLabel,
  locale,
}: {
  annotation: Annotation;
  active: boolean;
  onFocus: () => void;
  onClose: () => void;
  onReply: (body: string) => void;
  replyPlaceholder: string;
  replyLabel: string;
  closeLabel: string;
  locale: "zh" | "en";
}) {
  const [draft, setDraft] = useState("");
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onFocus}
      className={`rounded-lg border bg-background/60 p-3 transition-colors ${
        active ? "border-primary/60" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <blockquote className="border-l-2 border-primary/50 pl-2 font-mono text-[11px] italic text-muted-foreground line-clamp-3">
          "{annotation.quote}"
        </blockquote>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label={closeLabel}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {annotation.replies.length > 0 && (
        <ul className="mt-3 space-y-2">
          {annotation.replies.map((r, i) => (
            <li key={i} className="rounded-md bg-muted/30 px-2.5 py-2">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {r.author} · {new Date(r.createdAt).toLocaleTimeString(locale === "zh" ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <p className="mt-1 text-xs text-foreground/90 whitespace-pre-wrap">{r.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = draft.trim();
          if (!text) return;
          onReply(text);
          setDraft("");
        }}
        className="mt-3 flex items-end gap-1.5"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={1}
          placeholder={replyPlaceholder}
          onClick={(e) => e.stopPropagation()}
          className="min-h-[32px] flex-1 resize-none rounded-md border border-border bg-transparent px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
        />
        <button
          type="submit"
          aria-label={replyLabel}
          disabled={!draft.trim()}
          className="rounded-md bg-primary p-1.5 text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </motion.li>
  );
}