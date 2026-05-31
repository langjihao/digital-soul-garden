import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

export interface Comment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

const seed: Record<string, Comment[]> = {
  default: [
    {
      id: "c1",
      author: "@octocat",
      body: "好文，hybrid search 那段 SQL 能开源吗？ / Great read — any chance you'll open-source the hybrid search SQL?",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    },
    {
      id: "c2",
      author: "@hana",
      body: "RAG persona prompt 我也想试试，求 200 token 模板。",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
  ],
};

export function CommentSection({ threadKey }: { threadKey: string }) {
  const { locale } = useI18n();
  const [items, setItems] = useState<Comment[]>(seed[threadKey] ?? seed.default);
  const [draft, setDraft] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setItems((arr) => [
      ...arr,
      { id: crypto.randomUUID(), author: locale === "zh" ? "你" : "you", body: text, createdAt: new Date().toISOString() },
    ]);
    setDraft("");
  };

  const label = locale === "zh"
    ? { title: "评论", count: (n: number) => `${n} 条`, placeholder: "用 GitHub 登录后留下你的看法…(本地模拟)", post: "发布", empty: "还没有评论。" }
    : { title: "Comments", count: (n: number) => `${n}`, placeholder: "Sign in with GitHub to comment (local mock)…", post: "Post", empty: "No comments yet." };

  return (
    <section className="mt-16 border-t border-border pt-8">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-primary">
        <MessageSquare className="h-3.5 w-3.5" />
        <span>{label.title}</span>
        <span className="text-muted-foreground">{label.count(items.length)}</span>
      </div>

      <ul className="mt-6 space-y-4">
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
                <span className="text-foreground/80">{c.author}</span>
                <time>{new Date(c.createdAt).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}</time>
              </div>
              <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">{c.body}</p>
            </motion.li>
          ))}
        </AnimatePresence>
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground">{label.empty}</li>
        )}
      </ul>

      <form onSubmit={submit} className="mt-6 rounded-lg border border-border bg-card/40 p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder={label.placeholder}
          className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={!draft.trim()}
            className="rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
          >
            {label.post}
          </button>
        </div>
      </form>
    </section>
  );
}