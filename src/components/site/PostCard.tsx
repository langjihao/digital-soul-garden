import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { MockPost } from "@/lib/mock-data";
import { formatDate } from "@/lib/mock-data";

export function PostCard({ post, index = 0 }: { post: MockPost; index?: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: "easeOut" }}
      className="group relative rounded-xl border border-border bg-card/60 p-5 transition-colors hover:border-primary/40"
    >
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        <span>{formatDate(post.publishedAt)}</span>
        <span>{post.readingTime}</span>
      </div>
      <h3 className="mt-2 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
        {post.title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">{post.summary}</p>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <span
              key={t}
              className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </motion.article>
  );
}