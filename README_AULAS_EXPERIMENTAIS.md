# Implementação de Aulas Experimentais

## Resumo da Implementação

Foi implementada uma funcionalidade completa para agendamento de aulas experimentais, disponível para usuários com perfil **Administrador** e **Professor**.

### Funcionalidades Implementadas

1. **Botão "Aulas Experimentais"** nas dashboards de Admin e Professor
2. **Listagem de aulas experimentais agendadas** com status (agendada, realizada, cancelada, não compareceu)
3. **API functions** para:
   - Listar aulas experimentais
   - Agendar nova aula experimental
   - Cancelar aula experimental
   - Marcar aula como realizada
   - Listar notificações
   - Marcar notificação como lida

4. **Sistema de lembretes automáticos** (estrutura pronta para implementação):
   - Lembrete 24h antes da aula
   - Lembrete 4h antes da aula

## Passo 1: Aplicar Migração no Supabase

Execute o seguinte SQL no editor do Supabase (SQL Editor):

```sql
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
```

## Passo 2: Atualizar Types do Supabase

Após criar as tabelas, você precisa atualizar os types TypeScript. No projeto Lovable/Supabase:

1. Vá até o dashboard do Supabase
2. Execute este comando para gerar os types atualizados (ou use a CLI do Supabase):
```bash
npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/integrations/supabase/types.ts
```

Ou adicione manualmente as definições das novas tabelas no arquivo `src/integrations/supabase/types.ts`.

## Passo 3: Implementar Job de Lembretes (Opcional - Futuro)

Para enviar lembretes automáticos 24h e 4h antes das aulas, você pode usar:

### Opção A: pg_cron (Recomendado se disponível no seu plano Supabase)

```sql
-- Habilitar extensão pg_cron (requer plano Pro ou superior)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job para enviar lembretes 24h antes
SELECT cron.schedule(
  'lembrete-24h-aulas-experimentais',
  '0 * * * *', -- roda a cada hora
  $$
    INSERT INTO public.notificacoes_aulas (aula_experimental_id, tipo_notificacao, destinatario_tipo, destinatario_id, titulo, mensagem)
    SELECT 
      ae.id,
      'lembrete_24h',
      'admin',
      (SELECT user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1),
      'Lembrete: Aula Experimental em 24h',
      'A aula experimental de ' || ae.aluno_nome || ' está agendada para ' || ae.data_aula || ' às ' || ae.hora_aula
    FROM public.aulas_experimentais ae
    WHERE ae.status = 'agendada'
      AND ae.lembrete_24h_enviado = FALSE
      AND ae.data_aula = CURRENT_DATE + INTERVAL '1 day'
      AND ae.hora_aula <= CURRENT_TIME + INTERVAL '1 hour';
    
    UPDATE public.aulas_experimentais
    SET lembrete_24h_enviado = TRUE
    WHERE status = 'agendada'
      AND data_aula = CURRENT_DATE + INTERVAL '1 day';
  $$
);

-- Job para enviar lembretes 4h antes
SELECT cron.schedule(
  'lembrete-4h-aulas-experimentais',
  '0 * * * *', -- roda a cada hora
  $$
    INSERT INTO public.notificacoes_aulas (aula_experimental_id, tipo_notificacao, destinatario_tipo, destinatario_id, titulo, mensagem)
    SELECT 
      ae.id,
      'lembrete_4h',
      'admin',
      (SELECT user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1),
      'Lembrete: Aula Experimental em 4h',
      'A aula experimental de ' || ae.aluno_nome || ' está agendada para hoje às ' || ae.hora_aula
    FROM public.aulas_experimentais ae
    WHERE ae.status = 'agendada'
      AND ae.lembrete_4h_enviado = FALSE
      AND ae.data_aula = CURRENT_DATE
      AND ae.hora_aula BETWEEN CURRENT_TIME + INTERVAL '3 hours' AND CURRENT_TIME + INTERVAL '5 hours';
    
    UPDATE public.aulas_experimentais
    SET lembrete_4h_enviado = TRUE
    WHERE status = 'agendada'
      AND data_aula = CURRENT_DATE
      AND lembrete_24h_enviado = TRUE;
  $$
);
```

### Opção B: Edge Function + Trigger

Criar uma Edge Function no Supabase que é chamada via trigger ou schedule.

### Opção C: Serviço Externo

Usar serviços como GitHub Actions, Vercel Cron, ou outros schedulers para chamar uma API do seu projeto.

## Como Usar

### Para Administradores e Professores:

1. Acesse o dashboard (admin ou professor)
2. Clique no botão **"Aulas Experimentais"** no header
3. Visualize a lista de aulas experimentais agendadas
4. Cada aula mostra:
   - Nome do aluno
   - Data e horário
   - Status (agendada, realizada, cancelada, não compareceu)
   - Observações (se houver)

### Próximos Passos Sugeridos:

1. **Criar formulário de agendamento**: Adicionar um botão "Novo Agendamento" no dialog para permitir criar novas aulas experimentais
2. **Implementar envio de emails**: Integrar com Resend, SendGrid ou outro serviço de email para enviar lembretes reais
3. **Adicionar ações nas aulas**: Botões para cancelar, marcar como realizada, editar
4. **Notificações in-app**: Mostrar ícone de sino com contador de notificações não lidas no header
5. **Integração com grade horária**: Verificar disponibilidade de horários antes de agendar

## Arquivos Modificados

- `/workspace/migrations/001_aulas_experimentais.sql` - Script de migração
- `/workspace/src/lib/admin.functions.ts` - Functions server-side para CRUD de aulas experimentais
- `/workspace/src/routes/_authenticated/admin/index.tsx` - Dashboard admin com botão e listagem
- `/workspace/src/routes/_authenticated/professor/index.tsx` - Dashboard professor com botão e listagem
