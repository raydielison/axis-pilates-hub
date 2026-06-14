
# AXIS PILATES COLÉGIO BATISTA — Sistema de Gestão

PWA responsivo (mobile-first com look de app), com sidebar no desktop e bottom-nav no mobile. Paleta **preto / branco / laranja**, tipografia moderna (Space Grotesk + Inter), cantos arredondados, sombras suaves.

## 1. Backend (Lovable Cloud / Supabase)

### Tabelas
- `profiles` — id (=auth.uid), nome, telefone, endereco, contato_emergencia, created_at
- `user_roles` — user_id, role (`admin` | `professor` | `aluno`) — tabela separada + função `has_role()` (segurança)
- `planos` — id, nome, frequencia_semanal (1/2/3), valor
- `alunos` — id, profile_id, cpf, plano_id, status (`ativo`|`suspenso`|`cancelado`), data_inicio, saldo_reposicoes
- `professores` — id, profile_id, turno (`manha`|`tarde`|`noite`)
- `horarios_fixos` — id, aluno_id, dia_semana (1-5), hora (07:00–11:00, 16:00–22:00), professor_id
- `slots_agenda` — id, data, hora, professor_id, capacidade (default 4) — gerado dinamicamente ou tabela
- `presencas` — id, aluno_id, data, hora, status (`presente`|`falta_justificada`|`falta_nao_justificada`|`reposicao`), observacao
- `reposicoes` — id, aluno_id, data_origem, data_agendada, hora_agendada, status (`pendente`|`realizada`|`expirada`), criada_em, expira_em (30 dias)
- `pagamentos` — id, aluno_id, mes_referencia, valor, data_pagamento, forma (`pix`|`cartao`|`dinheiro`), status (`pago`|`pendente`|`atrasado`)
- `avisos` — id, titulo, mensagem, destinatario (`todos`|`alunos`|`professores`|user_id), criado_em
- `observacoes_aluno` — id, aluno_id, professor_id, texto, criada_em
- `configuracoes` — chave/valor (horários funcionamento, capacidade, dia vencimento)

### Segurança
- RLS em todas as tabelas
- Função `public.has_role(uuid, app_role)` security-definer
- Políticas por perfil: aluno vê só seus dados; professor vê seus alunos/agenda; admin vê tudo
- GRANTs explícitos (`authenticated`, `service_role`)

### Regras de negócio (triggers/cron)
- Trigger ao criar `auth.user` → cria `profile`
- Server function diária (cron): se hoje ≥ dia 11 e não há pagamento do mês → `alunos.status = 'suspenso'`
- Reposições: trigger ao inserir presença `falta_justificada` → `saldo_reposicoes += 1`; ao agendar reposição decrementa; expira em 30 dias
- Validação ao agendar reposição: aluno não suspenso, slot < 4 alunos, ≥ 24h antecedência

### Seed
- 1 admin (`admin@axispilates.com`)
- 2 professores (`prof1@axispilates.com`, `prof2@axispilates.com`)
- ~10 alunos (`aluno1@…` … `aluno10@…`) com planos variados e horários fixos
- 3 planos, presenças/pagamentos do mês atual e anterior, alguns avisos
- Senha padrão: **`axis1234`**

## 2. Autenticação
- Email/senha via Supabase Auth (auto-confirm para dev)
- Rota pública `/auth` (login + sinalização para admin cadastrar)
- Layout protegido `_authenticated/` (gate integrado, ssr:false)
- Redirecionamento por perfil pós-login: `/admin`, `/professor`, `/aluno`

## 3. Estrutura de rotas (TanStack Start)

```
src/routes/
  __root.tsx                       (shell + PWA meta + onAuthStateChange)
  index.tsx                        (landing/redirect por perfil)
  auth.tsx                         (login)
  _authenticated/
    route.tsx                      (gate)
    aluno/
      index.tsx                    (dashboard)
      horario.tsx
      presencas.tsx
      reposicoes.tsx
      financeiro.tsx
      perfil.tsx
    professor/
      index.tsx                    (dashboard)
      agenda.tsx
      alunos.tsx
      presenca.tsx
      observacoes.tsx
    admin/
      index.tsx                    (dashboard com KPIs)
      alunos.tsx
      professores.tsx
      planos.tsx
      agenda.tsx
      financeiro.tsx
      relatorios.tsx
      configuracoes.tsx
```

## 4. Frontend / UI

### Design system
- `src/styles.css`: tokens em oklch
  - `--background` branco, `--foreground` preto
  - `--primary` laranja (`oklch(0.72 0.19 50)`), `--primary-foreground` branco
  - `--accent`, gradientes laranja→âmbar para CTAs e cards de destaque
  - Dark mode: fundo preto, laranja como acento vibrante
- Fontes via `<link>` no root: Space Grotesk (display) + Inter (body)
- Cantos `rounded-2xl`, sombras suaves, transições motion suaves

### Shell de navegação
- `AppShell` componente:
  - Desktop (≥ md): Sidebar shadcn (collapsible icon) à esquerda, header com nome do estúdio + avatar
  - Mobile: bottom-nav fixo (5 itens principais por perfil) + header compacto
  - Itens dinâmicos por perfil

### Componentes-chave
- `KPICard` (dashboards)
- `ScheduleGrid` (grade dias × horários, slots com capacidade)
- `PresenceMarker` (4 botões grandes: Presente/FJ/FNJ/Reposição)
- `PaymentBadge` (pago/pendente/atrasado)
- `StudentCard`, `ClassRow`
- Formulários com react-hook-form + zod

### PWA
- `public/manifest.webmanifest` (nome, theme `#FF6A00`, display `standalone`, ícones)
- Tags `<link rel="manifest">`, `theme-color`, `apple-touch-icon` no `__root.tsx`
- **Sem service worker** (apenas instalável; modo offline não solicitado)
- Ícone gerado (logotipo "AXIS" em laranja sobre preto)

## 5. Server functions (sem Edge Functions)
- `src/lib/auth.functions.ts` — getMyProfile, getMyRole
- `src/lib/aluno.functions.ts` — meuDashboard, meuHorario, minhasPresencas, meuSaldoReposicoes, solicitarReposicao, slotsDisponiveis, meuFinanceiro, atualizarPerfil
- `src/lib/professor.functions.ts` — minhasAulasHoje, meusAlunos, marcarPresenca, registrarObservacao, agendaSemana
- `src/lib/admin.functions.ts` — dashboardKPIs, listarAlunos, criarAluno, listarProfessores, criarProfessor, planos CRUD, registrarPagamento, listarInadimplentes, relatorios, marcarSuspensos (job manual)
- Todas com `requireSupabaseAuth` + verificação de `has_role`

## 6. Entrega
1. Habilitar Lovable Cloud
2. Migrações: enum, tabelas, RLS, funções, triggers, seeds (planos + cron)
3. Seed de usuários via server function de bootstrap (admin/professores/alunos com `axis1234`)
4. Implementar tokens de design + AppShell + PWA manifest/ícone
5. Implementar rotas Auth e gate
6. Construir telas do Aluno → Professor → Admin
7. Validar com login de cada perfil

## Detalhes técnicos
- Stack: TanStack Start + React 19 + Tailwind v4 + shadcn/ui + Framer Motion + TanStack Query
- Validação: zod em todas as server functions
- Datas: `date-fns` (pt-BR)
- Pagamentos: somente registro manual; estrutura pronta para integrar PIX/Stripe depois (campo `forma` + `transaction_id` opcional)
- Sem WhatsApp agora; campo `telefone` já normalizado para futura integração

## Fora de escopo (nesta entrega)
- Integração real PIX/Stripe
- Envio de WhatsApp/SMS
- Modo offline (PWA apenas instalável)
- App nativo
