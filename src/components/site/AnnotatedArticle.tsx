import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Highlighter, MessageCircle, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/tanstack-react-start";
import { useI18n, useT } from "@/lib/i18n/provider";
import {
  createAnnotation,
  deleteAnnotation,
  listAnnotations,
  type AnnotationRow,
} from "@/lib/api/annotations.functions";

export function AnnotatedArticle({
  paragraphs,
  documentId,
}: {
  paragraphs: string[];
  documentId: string;
}) {
  const { locale } = useI18n();
  const t = useT();
  const qc = useQueryClient();
  const { user, isSignedIn } = useUser();
  const articleRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [popover, setPopover] = useState<
    { x: number; y: number; paragraphIndex: number; quote: string } | null
  >(null);
  const [draftAnno, setDraftAnno] = useState<{
    paragraphIndex: number;
    quote: string;
  } | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [draftName, setDraftName] = useState("");

  const queryKey = ["annotations", documentId];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listAnnotations({ data: { documentId } }),
  });
  const annotations: AnnotationRow[] = data?.annotations ?? [];

  type CreateInput = {
    documentId: string;
    paragraphIndex: number;
    quote: string;
    body: string;
    authorName?: string;
    authorEmail?: string;
  };
  const createMut = useMutation({
    mutationFn: (payload: CreateInput) => createAnnotation({ data: payload }),
    onSuccess: ({ annotation }) => {
      setDraftAnno(null);
      setDraftBody("");
      setActiveId(annotation.id);
      qc.invalidateQueries({ queryKey });
    },
    onError: (e) => console.error(e),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAnnotation({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

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

  const openDraft = () => {
    if (!popover) return;
    setDraftAnno({ paragraphIndex: popover.paragraphIndex, quote: popover.quote });
    setPopover(null);
    window.getSelection()?.removeAllRanges();
  };

  const submitDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftAnno) return;
    const body = draftBody.trim();
    if (!body) return;
    if (!isSignedIn && !draftName.trim()) return;
    createMut.mutate({
      documentId,
      paragraphIndex: draftAnno.paragraphIndex,
      quote: draftAnno.quote,
      body,
      authorName: isSignedIn ? undefined : draftName.trim(),
    });
  };

  // Render paragraph with <mark> around any annotation quotes
  const renderParagraph = (text: string, idx: number) => {
    const marks = annotations.filter((a) => a.paragraph_index === idx);
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
              onClick={openDraft}
              style={{ left: popover.x, top: popover.y }}
              className="absolute z-30 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2.5 py-1.5 font-mono text-[11px] text-foreground shadow-lg shadow-primary/10 hover:border-primary/50"
            >
              <span className="inline-flex items-center gap-1.5">
                <Highlighter className="h-3 w-3 text-primary" />
                {t.annotations.annotate}
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
              {t.annotations.title}
            </span>
            <span className="text-muted-foreground">{t.annotations.threadsHeader(annotations.length)}</span>
          </div>

          {draftAnno && (
            <form
              onSubmit={submitDraft}
              className="mt-3 rounded-lg border border-primary/40 bg-background/60 p-3"
            >
              <blockquote className="border-l-2 border-primary/50 pl-2 font-mono text-[11px] italic text-muted-foreground line-clamp-3">
                "{draftAnno.quote}"
              </blockquote>
              {!isSignedIn && (
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  maxLength={64}
                  placeholder={t.auth.namePlaceholder}
                  className="mt-2 w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                />
              )}
              <textarea
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                rows={2}
                maxLength={4000}
                placeholder={t.annotations.bodyPh}
                className="mt-2 w-full resize-none rounded-md border border-border bg-transparent px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraftAnno(null);
                    setDraftBody("");
                  }}
                  className="rounded-md border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {t.annotations.close}
                </button>
                <button
                  type="submit"
                  disabled={!draftBody.trim() || createMut.isPending || (!isSignedIn && !draftName.trim())}
                  className="rounded-md bg-primary px-2 py-1 font-mono text-[10px] text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
                >
                  {t.annotations.submit}
                </button>
              </div>
            </form>
          )}

          {isLoading ? (
            <p className="mt-3 text-xs text-muted-foreground">{t.annotations.loading}</p>
          ) : annotations.length === 0 && !draftAnno ? (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t.annotations.emptyDesc}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {annotations.map((a) => (
                <AnnotationCard
                  key={a.id}
                  annotation={a}
                  active={activeId === a.id}
                  onFocus={() => setActiveId(a.id)}
                  canDelete={!!isSignedIn && a.clerk_user_id === user?.id}
                  onClose={() => deleteMut.mutate(a.id)}
                  closeLabel={t.annotations.close}
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
  closeLabel,
  canDelete,
  locale,
}: {
  annotation: AnnotationRow;
  active: boolean;
  onFocus: () => void;
  onClose: () => void;
  closeLabel: string;
  canDelete: boolean;
  locale: "zh" | "en";
}) {
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
        {canDelete && (
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
        )}
      </div>

      <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {annotation.clerk_user_id ? "@" : ""}
        {annotation.author_name} ·{" "}
        {new Date(annotation.created_at).toLocaleTimeString(
          locale === "zh" ? "zh-CN" : "en-US",
          { hour: "2-digit", minute: "2-digit" },
        )}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-xs text-foreground/90">{annotation.body}</p>
    </motion.li>
  );
}