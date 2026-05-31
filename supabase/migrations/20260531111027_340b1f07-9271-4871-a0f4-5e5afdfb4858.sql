-- Drop foreign keys to auth.users
ALTER TABLE public.chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_user_id_fkey;
ALTER TABLE public.tweet_reactions DROP CONSTRAINT IF EXISTS tweet_reactions_user_id_fkey;

-- Drop policies referencing user_id
DROP POLICY IF EXISTS "users insert messages into own sessions" ON public.chat_messages;
DROP POLICY IF EXISTS "users read messages of own sessions" ON public.chat_messages;
DROP POLICY IF EXISTS "users delete own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "users insert own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "users read own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "users update own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "users delete their own reactions" ON public.tweet_reactions;
DROP POLICY IF EXISTS "users insert their own reactions" ON public.tweet_reactions;

-- Change column types
ALTER TABLE public.chat_sessions
  ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.chat_sessions ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.tweet_reactions
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- comments
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  clerk_user_id text,
  author_name text NOT NULL,
  author_email text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_document_id_idx ON public.comments(document_id);
CREATE INDEX comments_parent_id_idx ON public.comments(parent_id);

GRANT SELECT ON public.comments TO anon, authenticated;
GRANT ALL ON public.comments TO service_role;

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments are publicly readable"
  ON public.comments FOR SELECT TO anon, authenticated USING (true);

-- annotations
CREATE TABLE public.annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  paragraph_index integer NOT NULL,
  quote text NOT NULL,
  body text NOT NULL,
  clerk_user_id text,
  author_name text NOT NULL,
  author_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX annotations_document_id_idx ON public.annotations(document_id);

GRANT SELECT ON public.annotations TO anon, authenticated;
GRANT ALL ON public.annotations TO service_role;

ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "annotations are publicly readable"
  ON public.annotations FOR SELECT TO anon, authenticated USING (true);
