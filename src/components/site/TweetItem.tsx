import { motion } from "framer-motion";
import { Heart, MessageCircle, Github } from "lucide-react";
import type { MockTweet } from "@/lib/mock-data";
import { relativeTime } from "@/lib/mock-data";

export function TweetItem({ tweet, index = 0 }: { tweet: MockTweet; index?: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: index * 0.03, ease: "easeOut" }}
      className="relative pl-6"
    >
      <span className="absolute left-[5px] top-2 h-2 w-2 rounded-full bg-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_15%,transparent)]" />
      <span className="absolute left-[9px] top-4 h-full w-px bg-border" aria-hidden />
      <div className="rounded-lg border border-border bg-card/60 p-4">
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <span>#{tweet.id}</span>
          <span>{relativeTime(tweet.publishedAt)}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{tweet.body}</p>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" /> {tweet.reactions}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" /> {tweet.comments}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px]">
            <Github className="h-3 w-3" /> issue
          </span>
        </div>
      </div>
    </motion.li>
  );
}