-- pgvector for semantic search
create extension if not exists vector;

-- Enum for the kind of top-level content unit
create type public.doc_kind as enum ('post', 'tweet', 'media');

-- =========================================================================
-- documents: source-of-truth shadow of a GitHub artifact (post / issue / media)
-- =========================================================================
create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  kind          public.doc_kind not null,
  source_id     text not null,
  slug          text unique,
  title         text,
  summary       text,
  body_md       text,
  html          text,
  url_github    text not null,
  author        text,
  published_at  timestamptz,
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  meta          jsonb not null default '{}'::jsonb,
  content_hash  text not null,
  unique (kind, source_id)
);
create index documents_kind_published_idx on public.documents (kind, published_at desc);
create index documents_meta_gin            on public.documents using gin (meta);

grant select on public.documents to anon, authenticated;
grant all    on public.documents to service_role;
alter table public.documents enable row level security;

create policy "documents are publicly readable"
  on public.documents for select
  to anon, authenticated
  using (true);

-- =========================================================================
-- chunks: text segments + embedding + tsvector (hybrid search)
-- NOTE: vector(1536) so HNSW indexes work (pgvector HNSW max dim = 2000).
-- The embedding pipeline must request dimensions=1536 when calling the model.
-- =========================================================================
create table public.chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  ord         int not null,
  content     text not null,
  tokens      int,
  embedding   vector(1536) not null,
  tsv         tsvector generated always as (to_tsvector('simple', content)) stored,
  created_at  timestamptz not null default now()
);
create index chunks_document_id_idx on public.chunks (document_id);
create index chunks_embedding_idx   on public.chunks using hnsw (embedding vector_cosine_ops);
create index chunks_tsv_idx         on public.chunks using gin (tsv);

grant select on public.chunks to anon, authenticated;
grant all    on public.chunks to service_role;
alter table public.chunks enable row level security;

create policy "chunks are publicly readable"
  on public.chunks for select
  to anon, authenticated
  using (true);

-- =========================================================================
-- tags + document_tags (many-to-many)
-- =========================================================================
create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  kind        text,
  created_at  timestamptz not null default now()
);

grant select on public.tags to anon, authenticated;
grant all    on public.tags to service_role;
alter table public.tags enable row level security;

create policy "tags are publicly readable"
  on public.tags for select
  to anon, authenticated
  using (true);

create table public.document_tags (
  document_id uuid not null references public.documents(id) on delete cascade,
  tag_id      uuid not null references public.tags(id) on delete cascade,
  primary key (document_id, tag_id)
);
create index document_tags_tag_id_idx on public.document_tags (tag_id);

grant select on public.document_tags to anon, authenticated;
grant all    on public.document_tags to service_role;
alter table public.document_tags enable row level security;

create policy "document_tags are publicly readable"
  on public.document_tags for select
  to anon, authenticated
  using (true);

-- =========================================================================
-- tweet_reactions: per-user reactions on tweet documents
-- =========================================================================
create table public.tweet_reactions (
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null,
  created_at  timestamptz not null default now(),
  primary key (document_id, user_id, kind)
);

grant select               on public.tweet_reactions to anon, authenticated;
grant insert, delete       on public.tweet_reactions to authenticated;
grant all                  on public.tweet_reactions to service_role;
alter table public.tweet_reactions enable row level security;

create policy "reactions are publicly readable"
  on public.tweet_reactions for select
  to anon, authenticated
  using (true);

create policy "users insert their own reactions"
  on public.tweet_reactions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users delete their own reactions"
  on public.tweet_reactions for delete
  to authenticated
  using (auth.uid() = user_id);

-- =========================================================================
-- chat_sessions + chat_messages: digital-twin conversations
-- =========================================================================
create table public.chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  title       text,
  created_at  timestamptz not null default now()
);
create index chat_sessions_user_id_idx on public.chat_sessions (user_id, created_at desc);

grant select, insert, update, delete on public.chat_sessions to authenticated;
grant all                            on public.chat_sessions to service_role;
alter table public.chat_sessions enable row level security;

create policy "users read own sessions"
  on public.chat_sessions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users insert own sessions"
  on public.chat_sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users update own sessions"
  on public.chat_sessions for update
  to authenticated
  using (auth.uid() = user_id);

create policy "users delete own sessions"
  on public.chat_sessions for delete
  to authenticated
  using (auth.uid() = user_id);

create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.chat_sessions(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content     text not null,
  citations   jsonb,
  created_at  timestamptz not null default now()
);
create index chat_messages_session_idx on public.chat_messages (session_id, created_at);

grant select, insert on public.chat_messages to authenticated;
grant all            on public.chat_messages to service_role;
alter table public.chat_messages enable row level security;

create policy "users read messages of own sessions"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  );

create policy "users insert messages into own sessions"
  on public.chat_messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  );

-- =========================================================================
-- updated_at trigger for documents
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();