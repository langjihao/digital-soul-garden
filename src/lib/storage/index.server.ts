/**
 * Storage factory — picks the active backend at request time.
 *
 * Usage (in a server function only):
 *   import { getStorage } from "@/lib/storage/index.server";
 *   const storage = getStorage();
 *   const { items } = await storage.documents.list({ kind: "post" });
 *
 * Switch backend by setting STORAGE_DRIVER=selfhost in the runtime env.
 */
import type { Storage } from "./types";
import { supabaseStorage } from "./adapters/supabase.server";
import { selfhostStorage } from "./adapters/selfhost.server";

let cached: Storage | undefined;

export function getStorage(): Storage {
  if (cached) return cached;
  const driver = (process.env.STORAGE_DRIVER ?? "supabase").toLowerCase();
  switch (driver) {
    case "selfhost":
      cached = selfhostStorage;
      break;
    case "supabase":
    default:
      cached = supabaseStorage;
      break;
  }
  return cached;
}

export type { Storage } from "./types";