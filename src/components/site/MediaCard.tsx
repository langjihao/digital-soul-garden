import { motion } from "framer-motion";
import { Play, Image as ImageIcon } from "lucide-react";
import type { MockMedia } from "@/lib/mock-data";

export function MediaCard({ item, index = 0 }: { item: MockMedia; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: "easeOut" }}
      className="group overflow-hidden rounded-xl border border-border bg-card/60"
    >
      {item.kind === "image" ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <img
            src={item.src}
            alt={item.alt}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      ) : (
        <div className="relative flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-muted to-card">
          <button
            type="button"
            aria-label={`Play ${item.alt}`}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-background/80 text-primary transition-transform hover:scale-105"
          >
            <Play className="h-5 w-5" />
          </button>
          {item.duration && (
            <span className="absolute bottom-2 right-2 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {item.duration}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 p-3">
        {item.kind === "image" ? (
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Play className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <p className="truncate text-xs text-muted-foreground">{item.caption ?? item.alt}</p>
      </div>
    </motion.div>
  );
}