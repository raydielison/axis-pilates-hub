
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'professor', 'aluno');
CREATE TYPE public.aluno_status AS ENUM ('ativo', 'suspenso', 'cancelado');
CREATE TYPE public.presenca_status AS ENUM ('presente', 'falta_justificada', 'falta_nao_justificada', 'reposicao');
CREATE TYPE public.reposicao_status AS ENUM ('pendente', 'realizada', 'expirada', 'cancelada');
CREATE TYPE public.pagamento_forma AS ENUM ('pix', 'cartao', 'dinheiro');
CREATE TYPE public.pagamento_status AS ENUM ('pago', 'pendente', 'atrasado');
CREATE TYPE public.turno AS ENUM ('manha', 'tarde', 'noite');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  contato_emergencia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER_ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- get_my_role helper
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'professor' THEN 2 ELSE 3 END
  LIMIT 1
$$;

-- PLANOS
CREATE TABLE public.planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  frequencia_semanal INT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.planos TO authenticated;
GRANT ALL ON public.planos TO service_role;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

-- PROFESSORES
CREATE TABLE public.professores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  turno public.turno NOT NULL DEFAULT 'manha',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professores TO authenticated;
GRANT ALL ON public.professores TO service_role;
ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;

-- ALUNOS
CREATE TABLE public.alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  cpf TEXT,
  plano_id UUID REFERENCES public.planos(id),
  status public.aluno_status NOT NULL DEFAULT 'ativo',
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  saldo_reposicoes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alunos TO authenticated;
GRANT ALL ON public.alunos TO service_role;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;

-- HORARIOS FIXOS
CREATE TABLE public.horarios_fixos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 1 AND 5),
  hora TIME NOT NULL,
  professor_id UUID REFERENCES public.professores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_horarios_aluno ON public.horarios_fixos(aluno_id);
CREATE INDEX idx_horarios_dia_hora ON public.horarios_fixos(dia_semana, hora);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.horarios_fixos TO authenticated;
GRANT ALL ON public.horarios_fixos TO service_role;
ALTER TABLE public.horarios_fixos ENABLE ROW LEVEL SECURITY;

-- PRESENCAS
CREATE TABLE public.presencas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  professor_id UUID REFERENCES public.professores(id),
  data DATE NOT NULL,
  hora TIME NOT NULL,
  status public.presenca_status NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_presencas_aluno_data ON public.presencas(aluno_id, data);
CREATE INDEX idx_presencas_data_hora ON public.presencas(data, hora);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presencas TO authenticated;
GRANT ALL ON public.presencas TO service_role;
ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;

-- REPOSICOES
CREATE TABLE public.reposicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  data_origem DATE,
  data_agendada DATE,
  hora_agendada TIME,
  status public.reposicao_status NOT NULL DEFAULT 'pendente',
  expira_em DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reposicoes_aluno ON public.reposicoes(aluno_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reposicoes TO authenticated;
GRANT ALL ON public.reposicoes TO service_role;
ALTER TABLE public.reposicoes ENABLE ROW LEVEL SECURITY;

-- PAGAMENTOS
CREATE TABLE public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  mes_referencia DATE NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  data_pagamento DATE,
  data_vencimento DATE NOT NULL,
  forma public.pagamento_forma,
  status public.pagamento_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pag_aluno ON public.pagamentos(aluno_id);
CREATE INDEX idx_pag_mes ON public.pagamentos(mes_referencia);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos TO authenticated;
GRANT ALL ON public.pagamentos TO service_role;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- AVISOS
CREATE TABLE public.avisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  destinatario TEXT NOT NULL DEFAULT 'todos',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avisos TO authenticated;
GRANT ALL ON public.avisos TO service_role;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;

-- OBSERVACOES ALUNO
CREATE TABLE public.observacoes_aluno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  professor_id UUID REFERENCES public.professores(id),
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.observacoes_aluno TO authenticated;
GRANT ALL ON public.observacoes_aluno TO service_role;
ALTER TABLE public.observacoes_aluno ENABLE ROW LEVEL SECURITY;

-- CONFIGURACOES
CREATE TABLE public.configuracoes (
  chave TEXT PRIMARY KEY,
  valor JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.configuracoes TO authenticated;
GRANT ALL ON public.configuracoes TO service_role;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- ====== POLICIES ======
-- profiles
CREATE POLICY "Usuários veem o próprio perfil" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'professor'));
CREATE POLICY "Usuários editam o próprio perfil" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia perfis" ON public.profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Usuário vê próprios papéis" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- planos: todos autenticados podem ver
CREATE POLICY "Ver planos" ON public.planos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia planos" ON public.planos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- professores
CREATE POLICY "Ver professores" ON public.professores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia professores" ON public.professores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- alunos
CREATE POLICY "Aluno vê o próprio cadastro" ON public.alunos FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'professor'));
CREATE POLICY "Admin gerencia alunos" ON public.alunos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- horarios_fixos
CREATE POLICY "Ver horários" ON public.horarios_fixos FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'professor') OR
    EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = aluno_id AND a.profile_id = auth.uid())
  );
CREATE POLICY "Admin gerencia horários" ON public.horarios_fixos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- presencas
CREATE POLICY "Ver presenças" ON public.presencas FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'professor') OR
    EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = aluno_id AND a.profile_id = auth.uid())
  );
CREATE POLICY "Professor/Admin registra presença" ON public.presencas FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'professor'));
CREATE POLICY "Professor/Admin atualiza presença" ON public.presencas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'professor'));
CREATE POLICY "Admin remove presença" ON public.presencas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- reposicoes
CREATE POLICY "Ver reposições" ON public.reposicoes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'professor') OR
    EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = aluno_id AND a.profile_id = auth.uid())
  );
CREATE POLICY "Aluno/Admin solicita reposição" ON public.reposicoes FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = aluno_id AND a.profile_id = auth.uid() AND a.status = 'ativo')
  );
CREATE POLICY "Admin atualiza reposição" ON public.reposicoes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'professor'));

-- pagamentos
CREATE POLICY "Ver pagamentos" ON public.pagamentos FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = aluno_id AND a.profile_id = auth.uid())
  );
CREATE POLICY "Admin gerencia pagamentos" ON public.pagamentos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- avisos
CREATE POLICY "Ver avisos" ON public.avisos FOR SELECT TO authenticated
  USING (
    destinatario = 'todos' OR
    user_id = auth.uid() OR
    (destinatario = 'alunos' AND public.has_role(auth.uid(), 'aluno')) OR
    (destinatario = 'professores' AND public.has_role(auth.uid(), 'professor')) OR
    public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Admin gerencia avisos" ON public.avisos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- observacoes
CREATE POLICY "Ver observações" ON public.observacoes_aluno FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'professor'));
CREATE POLICY "Professor/Admin registra observação" ON public.observacoes_aluno FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'professor'));

-- configuracoes
CREATE POLICY "Ver configurações" ON public.configuracoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia configurações" ON public.configuracoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ====== TRIGGERS ======
-- Auto criar profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Crédito de reposição em falta justificada
CREATE OR REPLACE FUNCTION public.handle_falta_justificada()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'falta_justificada' THEN
    UPDATE public.alunos SET saldo_reposicoes = saldo_reposicoes + 1 WHERE id = NEW.aluno_id;
    INSERT INTO public.reposicoes (aluno_id, data_origem, expira_em)
    VALUES (NEW.aluno_id, NEW.data, NEW.data + INTERVAL '30 days');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_falta_justificada
  AFTER INSERT ON public.presencas
  FOR EACH ROW EXECUTE FUNCTION public.handle_falta_justificada();

-- Plano default e horários iniciais
INSERT INTO public.planos (nome, frequencia_semanal, valor) VALUES
  ('Plano 1x por semana', 1, 140.00),
  ('Plano 2x por semana', 2, 280.00),
  ('Plano 3x por semana', 3, 320.00);

INSERT INTO public.configuracoes (chave, valor) VALUES
  ('horarios_funcionamento', '{"manha": ["07:00","08:00","09:00","10:00"], "tarde_noite": ["16:00","17:00","18:00","19:00","20:00","21:00"]}'::jsonb),
  ('capacidade_maxima', '4'::jsonb),
  ('dia_vencimento', '10'::jsonb);
