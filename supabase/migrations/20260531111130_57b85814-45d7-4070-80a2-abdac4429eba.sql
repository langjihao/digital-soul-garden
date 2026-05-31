ALTER TABLE public.comments ALTER COLUMN document_id TYPE text USING document_id::text;
ALTER TABLE public.annotations ALTER COLUMN document_id TYPE text USING document_id::text;
