-- Pure Postgres schema for the self-hosted Digital Garden.
-- Mirrors supabase/migrations/* but without Supabase-specific roles/policies.
-- AuthZ is enforced in application code (server functions) instead of RLS.

create extension if not exists vector;
create extension if not exists pg_trgm;

do $$ begin
  create type doc_kind as enum ('post', 'tweet', 'media');
exception when duplicate_object then null; end $$;

-- ---------------- users (replaces Supabase auth.users) ---------------------
create table if not exists app_users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text,
  name          text,
  created_at    timestamptz not null default now()
);

-- ---------------- documents ----------------------------------------------
create table if not exists documents (
  id            uuid primary key default gen_random_uuid(),
  kind          doc_kind not null,
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
create index if not exists documents_kind_published_idx on documents (kind, published_at desc);
create index if not exists documents_meta_gin            on documents using gin (meta);

-- ---------------- chunks (vector + BM25) ---------------------------------
create table if not exists chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  ord         int not null,
  content     text not null,
  tokens      int,
  embedding   vector(1536) not null,
  tsv         tsvector generated always as (to_tsvector('simple', content)) stored,
  created_at  timestamptz not null default now()
);
create index if not exists chunks_document_id_idx on chunks (document_id);
create index if not exists chunks_embedding_idx   on chunks using hnsw (embedding vector_cosine_ops);
create index if not exists chunks_tsv_idx         on chunks using gin (tsv);

-- ---------------- tags ----------------------------------------------------
create table if not exists tags (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  kind        text,
  created_at  timestamptz not null default now()
);
create table if not exists document_tags (
  document_id uuid not null references documents(id) on delete cascade,
  tag_id      uuid not null references tags(id)      on delete cascade,
  primary key (document_id, tag_id)
);

-- ---------------- tweet reactions ----------------------------------------
create table if not exists tweet_reactions (
  document_id uuid not null references documents(id)   on delete cascade,
  user_id     uuid not null references app_users(id)   on delete cascade,
  kind        text not null,
  created_at  timestamptz not null default now(),
  primary key (document_id, user_id, kind)
);

-- ---------------- chat sessions / messages -------------------------------
create table if not exists chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references app_users(id) on delete set null,
  title      text,
  created_at timestamptz not null default now()
);
create table if not exists chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role       text not null check (role in ('user','assistant','system','tool')),
  content    text not null,
  citations  jsonb,
  created_at timestamptz not null default now()
);

-- ---------------- comments + annotations (planned) -----------------------
create table if not exists comments (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references documents(id) on delete cascade,
  parent_id    uuid references comments(id) on delete cascade,
  author_id    uuid references app_users(id) on delete set null,
  author_name  text not null,
  body         text not null,
  created_at   timestamptz not null default now()
);
create index if not exists comments_document_idx on comments (document_id, created_at);

create table if not exists annotations (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references documents(id) on delete cascade,
  paragraph_id  text not null,
  quote         text not null,
  body          text not null,
  author_id     uuid references app_users(id) on delete set null,
  author_name   text not null,
  created_at    timestamptz not null default now()
);
create index if not exists annotations_document_idx on annotations (document_id, paragraph_id);

-- ---------------- hybrid search RPC --------------------------------------
create or replace function hybrid_search (
  query_text       text,
  query_embedding  vector(1536),
  match_count      int  default 10,
  doc_kind         doc_kind default null,
  vec_weight       float default 0.5
) returns table (
  chunk_id      uuid,
  document_id   uuid,
  content       text,
  score         float
) language sql stable as $$
  with v as (
    select c.id as chunk_id, c.document_id, c.content,
           1 - (c.embedding <=> query_embedding) as vscore
    from chunks c
    join documents d on d.id = c.document_id
    where doc_kind is null or d.kind = doc_kind
    order by c.embedding <=> query_embedding
    limit match_count * 4
  ),
  t as (
    select c.id as chunk_id, c.document_id, c.content,
           ts_rank_cd(c.tsv, plainto_tsquery('simple', query_text)) as tscore
    from chunks c
    join documents d on d.id = c.document_id
    where (doc_kind is null or d.kind = doc_kind)
      and c.tsv @@ plainto_tsquery('simple', query_text)
    order by tscore desc
    limit match_count * 4
  )
  select coalesce(v.chunk_id, t.chunk_id)        as chunk_id,
         coalesce(v.document_id, t.document_id)  as document_id,
         coalesce(v.content, t.content)          as content,
         coalesce(v.vscore,0) * vec_weight
           + coalesce(t.tscore,0) * (1 - vec_weight) as score
  from v full outer join t using (chunk_id)
  order by score desc
  limit match_count;
$$;