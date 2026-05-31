import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ListSchema = z.object({ documentId: z.string().min(1).max(255) });
const CreateSchema = z.object({
  documentId: z.string().min(1).max(255),
  paragraphIndex: z.number().int().min(0).max(10000),
  quote: z.string().trim().min(1).max(1000),
  body: z.string().trim().min(1).max(4000),
  authorName: z.string().trim().min(1).max(64).optional(),
  authorEmail: z
    .union([z.string().email().max(255), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
});
const DeleteSchema = z.object({ id: z.string().uuid() });

export type AnnotationRow = {
  id: string;
  document_id: string;
  paragraph_index: number;
  quote: string;
  body: string;
  clerk_user_id: string | null;
  author_name: string;
  author_email: string | null;
  created_at: string;
};

export const listAnnotations = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => ListSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("annotations")
      .select("*")
      .eq("document_id", data.documentId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("listAnnotations error", error);
      return { annotations: [] as AnnotationRow[] };
    }
    return { annotations: (rows ?? []) as AnnotationRow[] };
  });

export const createAnnotation = createServerFn({ method: "POST" })
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
        if (!authorEmail) authorEmail = user.primaryEmailAddress?.emailAddress ?? null;
      } catch (e) {
        console.error("clerk getUser failed", e);
        if (!authorName) authorName = "user";
      }
    }

    if (!authorName) throw new Error("authorName is required for anonymous annotations");

    const { data: row, error } = await supabaseAdmin
      .from("annotations")
      .insert({
        document_id: data.documentId,
        paragraph_index: data.paragraphIndex,
        quote: data.quote,
        body: data.body,
        clerk_user_id: clerkUserId,
        author_name: authorName,
        author_email: authorEmail,
      })
      .select()
      .single();
    if (error) throw error;
    return { annotation: row as AnnotationRow };
  });

export const deleteAnnotation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => DeleteSchema.parse(data))
  .handler(async ({ data }) => {
    const { userId } = await auth();
    // Only the original Clerk author can delete (anon annotations are immutable for now).
    if (!userId) throw new Error("Sign in to delete annotations");
    const { error } = await supabaseAdmin
      .from("annotations")
      .delete()
      .eq("id", data.id)
      .eq("clerk_user_id", userId);
    if (error) throw error;
    return { ok: true };
  });