import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { auth } from "@clerk/tanstack-react-start/server";
import { clerkClient } from "@clerk/tanstack-react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ListSchema = z.object({ documentId: z.string().min(1).max(255) });
const CreateSchema = z.object({
  documentId: z.string().min(1).max(255),
  parentId: z.string().uuid().nullable().optional(),
  body: z.string().trim().min(1).max(4000),
  authorName: z.string().trim().min(1).max(64).optional(),
  authorEmail: z
    .union([z.string().email().max(255), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
});

export type CommentRow = {
  id: string;
  document_id: string;
  parent_id: string | null;
  clerk_user_id: string | null;
  author_name: string;
  author_email: string | null;
  body: string;
  created_at: string;
};

export const listComments = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => ListSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("comments")
      .select("*")
      .eq("document_id", data.documentId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("listComments error", error);
      return { comments: [] as CommentRow[] };
    }
    return { comments: (rows ?? []) as CommentRow[] };
  });

export const createComment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => CreateSchema.parse(data))
  .handler(async ({ data }) => {
    const { userId } = await auth();

    let authorName = data.authorName?.trim() || "";
    let clerkUserId: string | null = null;
    let authorEmail: string | null = data.authorEmail ?? null;

    if (userId) {
      clerkUserId = userId;
      try {
        const user = await clerkClient().users.getUser(userId);
        authorName =
          user.username ||
          [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
          user.primaryEmailAddress?.emailAddress ||
          authorName ||
          "user";
        if (!authorEmail) {
          authorEmail = user.primaryEmailAddress?.emailAddress ?? null;
        }
      } catch (e) {
        console.error("clerk getUser failed", e);
        if (!authorName) authorName = "user";
      }
    }

    if (!authorName) {
      throw new Error("authorName is required for anonymous comments");
    }

    const { data: row, error } = await supabaseAdmin
      .from("comments")
      .insert({
        document_id: data.documentId,
        parent_id: data.parentId ?? null,
        clerk_user_id: clerkUserId,
        author_name: authorName,
        author_email: authorEmail,
        body: data.body,
      })
      .select()
      .single();
    if (error) throw error;
    return { comment: row as CommentRow };
  });