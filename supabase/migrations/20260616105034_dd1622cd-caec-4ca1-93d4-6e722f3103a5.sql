
-- 1) Novo enum turno_pro
DO $$ BEGIN
  CREATE TYPE turno_pro AS ENUM ('manha', 'tarde_noite');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Professores: nova coluna turno_pro + campos extras
ALTER TABLE public.professores ADD COLUMN IF NOT EXISTS turno_novo turno_pro;
UPDATE public.professores SET turno_novo = CASE WHEN turno::text = 'manha' THEN 'manha'::turno_pro ELSE 'tarde_noite'::turno_pro END WHERE turno_novo IS NULL;
ALTER TABLE public.professores ALTER COLUMN turno_novo SET NOT NULL;
ALTER TABLE public.professores ALTER COLUMN turno_novo SET DEFAULT 'manha';
ALTER TABLE public.professores DROP COLUMN turno;
ALTER TABLE public.professores RENAME COLUMN turno_novo TO turno;

ALTER TABLE public.professores ADD COLUMN IF NOT EXISTS crefito text;

-- profiles já tem endereco/telefone

-- 3) Alunos: turno
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS turno turno_pro NOT NULL DEFAULT 'manha';
UPDATE public.alunos a SET turno = 'tarde_noite'
WHERE EXISTS (SELECT 1 FROM public.horarios_fixos h WHERE h.aluno_id = a.id AND h.hora >= '12:00')
  AND NOT EXISTS (SELECT 1 FROM public.horarios_fixos h WHERE h.aluno_id = a.id AND h.hora < '12:00');

-- 4) Studio aparelhos
CREATE TABLE IF NOT EXISTS public.studio_aparelhos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.studio_aparelhos TO authenticated;
GRANT ALL ON public.studio_aparelhos TO service_role;
ALTER TABLE public.studio_aparelhos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver aparelhos" ON public.studio_aparelhos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia aparelhos" ON public.studio_aparelhos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.studio_aparelhos (nome) VALUES
  ('Reformer'),('Cadillac'),('Chair (Wunda)'),('Ladder Barrel'),
  ('Spine Corrector'),('Mat'),('Tower'),('Step Barrel'),('Tonificador')
ON CONFLICT (nome) DO NOTHING;

-- 5) Fichas de evolução
CREATE TABLE IF NOT EXISTS public.fichas_evolucao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  professor_id uuid REFERENCES public.professores(id),
  data date NOT NULL DEFAULT CURRENT_DATE,
  aparelhos text[] NOT NULL DEFAULT '{}',
  exercicios text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fichas_aluno ON public.fichas_evolucao(aluno_id);
GRANT SELECT, INSERT, UPDATE ON public.fichas_evolucao TO authenticated;
GRANT ALL ON public.fichas_evolucao TO service_role;
ALTER TABLE public.fichas_evolucao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professor/Admin gerencia ficha" ON public.fichas_evolucao
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'professor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'professor'));

CREATE POLICY "Aluno vê própria ficha" ON public.fichas_evolucao
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = fichas_evolucao.aluno_id AND a.profile_id = auth.uid()));

-- 6) Policies extras em aluno_anexos: professor do mesmo turno pode SELECT/INSERT
CREATE POLICY "Professor vê anexos do seu turno" ON public.aluno_anexos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor') AND EXISTS (
    SELECT 1 FROM public.alunos a
    JOIN public.professores p ON p.profile_id = auth.uid()
    WHERE a.id = aluno_anexos.aluno_id AND a.turno = p.turno
  ));

CREATE POLICY "Professor adiciona anexos do seu turno" ON public.aluno_anexos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'professor') AND EXISTS (
    SELECT 1 FROM public.alunos a
    JOIN public.professores p ON p.profile_id = auth.uid()
    WHERE a.id = aluno_anexos.aluno_id AND a.turno = p.turno
  ));
