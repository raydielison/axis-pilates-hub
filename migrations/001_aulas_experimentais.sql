-- Tabela para armazenar aulas experimentais agendadas
CREATE TABLE IF NOT EXISTS public.aulas_experimentais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Dados do agendamento
  aluno_profile_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  aluno_nome TEXT NOT NULL,
  aluno_email TEXT,
  aluno_telefone TEXT,
  
  professor_profile_id UUID REFERENCES auth.users(id),
  professor_nome TEXT,
  
  data_aula DATE NOT NULL,
  hora_aula TIME NOT NULL,
  dia_semana INTEGER NOT NULL, -- 1-5 (seg-sex)
  
  status TEXT DEFAULT 'agendada' CHECK (status IN ('agendada', 'realizada', 'cancelada', 'nao_compareceu')),
  
  -- Lembretes enviados
  lembrete_24h_enviado BOOLEAN DEFAULT FALSE,
  lembrete_4h_enviado BOOLEAN DEFAULT FALSE,
  
  -- Observações
  observacao TEXT,
  
  -- Controle
  criado_por UUID REFERENCES auth.users(id),
  cancelado_por UUID REFERENCES auth.users(id),
  cancelado_em TIMESTAMPTZ,
  motivo_cancelamento TEXT
);

-- Índice para buscas eficientes
CREATE INDEX IF NOT EXISTS idx_aulas_experimentais_data ON public.aulas_experimentais(data_aula, hora_aula);
CREATE INDEX IF NOT EXISTS idx_aulas_experimentais_status ON public.aulas_experimentais(status);
CREATE INDEX IF NOT EXISTS idx_aulas_experimentais_aluno ON public.aulas_experimentais(aluno_profile_id);
CREATE INDEX IF NOT EXISTS idx_aulas_experimentais_professor ON public.aulas_experimentais(professor_profile_id);

-- Tabela para armazenar notificações/avisos
CREATE TABLE IF NOT EXISTS public.notificacoes_aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  aula_experimental_id UUID REFERENCES public.aulas_experimentais(id) ON DELETE CASCADE,
  
  tipo_notificacao TEXT NOT NULL CHECK (tipo_notificacao IN ('lembrete_24h', 'lembrete_4h', 'confirmacao', 'cancelamento')),
  
  destinatario_tipo TEXT NOT NULL CHECK (destinatario_tipo IN ('admin', 'professor', 'aluno')),
  destinatario_id UUID,
  
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  
  lida BOOLEAN DEFAULT FALSE,
  lida_em TIMESTAMPTZ,
  
  enviada_email BOOLEAN DEFAULT FALSE,
  enviada_push BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario ON public.notificacoes_aulas(destinatario_id, lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_aula ON public.notificacoes_aulas(aula_experimental_id);

-- RLS para aulas_experimentais
ALTER TABLE public.aulas_experimentais ENABLE ROW LEVEL SECURITY;

-- Admin vê tudo
CREATE POLICY "Admin vê todas aulas experimentais" ON public.aulas_experimentais
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Professor vê aulas do seu turno ou atribuídas a ele
CREATE POLICY "Professor vê aulas experimentais" ON public.aulas_experimentais
  FOR SELECT USING (
    public.has_role(auth.uid(), 'professor') OR 
    public.has_role(auth.uid(), 'admin') OR
    professor_profile_id = auth.uid()
  );

-- RLS para notificacoes
ALTER TABLE public.notificacoes_aulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios veem suas notificacoes" ON public.notificacoes_aulas
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR
    destinatario_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'professor'
      AND destinatario_tipo = 'professor'
    )
  );
