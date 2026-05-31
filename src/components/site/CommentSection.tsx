import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/tanstack-react-start";
import { useI18n, useT } from "@/lib/i18n/provider";
import { createComment, listComments, type CommentRow } from "@/lib/api/comments.functions";

export function CommentSection({ threadKey }: { threadKey: string }) {
  const { locale } = useI18n();
  const t = useT();
  const qc = useQueryClient();
  const { user, isSignedIn, isLoaded } = useUser();

  const queryKey = ["comments", threadKey];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listComments({ data: { documentId: threadKey } }),
  });
  const items: CommentRow[] = data?.comments ?? [];

  const [draft, setDraft] = useState("");
  const [anonName, setAnonName] = useState("");
  const [anonEmail, setAnonEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  type CreateInput = {
    documentId: string;
    parentId?: string | null;
    body: string;
    authorName?: string;
    authorEmail?: string;
  };
  const mutation = useMutation({
    mutationFn: (payload: CreateInput) => createComment({ data: payload }),
    onSuccess: () => {
      setDraft("");
      setError(null);
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: unknown) => {
      console.error(e);
      setError(t.comments.failed);
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    if (!isSignedIn && !anonName.trim()) {
      setError(t.auth.namePlaceholder);
      return;
    }
    mutation.mutate({
      documentId: threadKey,
      body: text,
      authorName: isSignedIn ? undefined : anonName.trim(),
      authorEmail: isSignedIn ? undefined : (anonEmail.trim() || undefined),
    });
  };

  const signedInName =
    user?.username ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    "";

  return (
    <section className="mt-16 border-t border-border pt-8">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-primary">
        <MessageSquare className="h-3.5 w-3.5" />
        <span>{t.comments.title}</span>
        <span className="text-muted-foreground">{t.comments.count(items.length)}</span>
      </div>

      <ul className="mt-6 space-y-4">
        {isLoading ? (
          <li className="text-sm text-muted-foreground">{t.comments.loading}</li>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((c) => (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-border bg-card/40 p-4"
              >
                <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  <span className="text-foreground/80">
                    {c.clerk_user_id ? "@" : ""}
                    {c.author_name}
                  </span>
                  <time>{new Date(c.created_at).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}</time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{c.body}</p>
              </motion.li>
            ))}
          </AnimatePresence>
        )}
        {!isLoading && items.length === 0 && (
          <li className="text-sm text-muted-foreground">{t.comments.empty}</li>
        )}
      </ul>

      <form onSubmit={submit} className="mt-6 space-y-2 rounded-lg border border-border bg-card/40 p-3">
        {isLoaded && isSignedIn ? (
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {t.auth.signedInAs}: <span className="text-foreground/80">@{signedInName}</span>
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={anonName}
              onChange={(e) => setAnonName(e.target.value)}
              maxLength={64}
              placeholder={t.auth.namePlaceholder}
              className="rounded-md border border-border bg-transparent px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
            <input
              type="email"
              value={anonEmail}
              onChange={(e) => setAnonEmail(e.target.value)}
              maxLength={255}
              placeholder={t.auth.emailPlaceholder}
              className="rounded-md border border-border bg-transparent px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
          </div>
        )}
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder={t.comments.placeholder}
          className="w-full resize-none rounded-md bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground">
            {!isSignedIn && t.auth.anonHint}
            {error && <span className="ml-2 text-destructive">{error}</span>}
          </span>
          <button
            type="submit"
            disabled={!draft.trim() || mutation.isPending}
            className="rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
          >
            {mutation.isPending ? t.comments.posting : t.comments.post}
          </button>
        </div>
      </form>
    </section>
  );
}