-- 1) Soft delete em alunos
ALTER TYPE public.aluno_status ADD VALUE IF NOT EXISTS 'excluido';

ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- 2) Tabela de anexos
CREATE TABLE IF NOT EXISTS public.aluno_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aluno_anexos TO authenticated;
GRANT ALL ON public.aluno_anexos TO service_role;

ALTER TABLE public.aluno_anexos ENABLE ROW LEVEL SECURITY;

-- Admin gerencia tudo
CREATE POLICY "Admin gerencia anexos"
  ON public.aluno_anexos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Aluno vê os próprios anexos
CREATE POLICY "Aluno vê os próprios anexos"
  ON public.aluno_anexos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.alunos a
      WHERE a.id = aluno_anexos.aluno_id AND a.profile_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS aluno_anexos_aluno_id_idx ON public.aluno_anexos(aluno_id);

-- 3) RLS no storage para o bucket aluno-anexos (path = "{aluno_id}/{filename}")
-- Admin: tudo
CREATE POLICY "Admin gerencia arquivos de aluno"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'aluno-anexos' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'aluno-anexos' AND public.has_role(auth.uid(), 'admin'));

-- Aluno: SELECT no próprio diretório (primeira pasta = aluno.id)
CREATE POLICY "Aluno lê os próprios arquivos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'aluno-anexos'
    AND EXISTS (
      SELECT 1 FROM public.alunos a
      WHERE a.profile_id = auth.uid()
        AND a.id::text = (storage.foldername(name))[1]
    )
  );