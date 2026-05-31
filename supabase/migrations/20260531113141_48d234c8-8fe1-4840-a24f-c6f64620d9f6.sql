-- Hybrid search function: BM25 + cosine similarity weighted
CREATE OR REPLACE FUNCTION public.hybrid_search(
  query_text text,
  query_embedding extensions.vector(1536),
  match_count int DEFAULT 10,
  full_text_weight float DEFAULT 1.0,
  semantic_weight float DEFAULT 1.0,
  rrf_k int DEFAULT 60
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  content text,
  score float
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  WITH full_text AS (
    SELECT id, document_id, content,
      row_number() OVER (ORDER BY ts_rank_cd(tsv, websearch_to_tsquery('simple', query_text)) DESC) AS rank_ix
    FROM public.chunks
    WHERE tsv @@ websearch_to_tsquery('simple', query_text)
    ORDER BY rank_ix
    LIMIT least(match_count, 50) * 2
  ),
  semantic AS (
    SELECT id, document_id, content,
      row_number() OVER (ORDER BY embedding <=> query_embedding) AS rank_ix
    FROM public.chunks
    ORDER BY rank_ix
    LIMIT least(match_count, 50) * 2
  )
  SELECT
    COALESCE(ft.id, sm.id) AS chunk_id,
    COALESCE(ft.document_id, sm.document_id) AS document_id,
    COALESCE(ft.content, sm.content) AS content,
    COALESCE(1.0 / (rrf_k + ft.rank_ix), 0.0) * full_text_weight
    + COALESCE(1.0 / (rrf_k + sm.rank_ix), 0.0) * semantic_weight AS score
  FROM full_text ft
  FULL OUTER JOIN semantic sm ON ft.id = sm.id
  ORDER BY score DESC
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.hybrid_search(text, extensions.vector, int, float, float, int) TO anon, authenticated, service_role;