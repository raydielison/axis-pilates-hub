
## Plano

### 1. Turnos (manhã / tarde_noite)

Migração:
- Novo enum `turno_pro` com valores `manha`, `tarde_noite`. Coluna `professores.turno` migrada (tarde→tarde_noite, noite→tarde_noite). Enum antigo removido.
- Adicionar colunas em `professores`: `crefito text`, `ativo` já existe.
- Adicionar coluna em `alunos`: `turno turno_pro` (derivada/escolhida no cadastro do aluno; default `manha`). Permite que cada aluno seja vinculado a um turno e portanto a um professor.
  - Backfill: alunos com qualquer `horarios_fixos.hora < '12:00'` → `manha`; demais → `tarde_noite`. Sem horários → `manha`.

### 2. Professores — admin gerencia (CRUD completo)

Server fns em `admin.functions.ts`:
- `atualizarProfessor` (nome, email, telefone, endereço, crefito, turno, ativo). Atualiza `profiles`, `professores`, e `auth.users` (email) via `supabaseAdmin`.
- `redefinirSenhaProfessor({ professor_id, nova_senha })` → `supabaseAdmin.auth.admin.updateUserById(..., { password })`.
- `excluirProfessor` (soft delete: `ativo=false` + ban). Reativar idem.
- `criarProfessor` já existe — estender com endereço e crefito.

UI `admin/professores.tsx`:
- Botão "Editar" por card abrindo Dialog com todos os campos pessoais + login (email) + botão "Redefinir senha".
- Filtro/abas Ativos / Inativos.

### 3. Agenda integrada (todos os usuários, edição restrita)

- Mover o grid de agenda para um componente compartilhado `AgendaGrid` (5 dias × 10 horários, 4 vagas/horário).
- Rotas:
  - `/admin/agenda`, `/professor/agenda` — modo edição: clique numa célula abre dialog para adicionar/remover aluno daquele dia/hora (apenas professores cujo turno bate com a hora, ou admin).
  - `/aluno/horario` — modo leitura, mostra a grade toda destacando suas próprias aulas.
- Nova server fn `upsertHorarioFixo({ aluno_id, dia_semana, hora })` e `removerHorarioFixo({ id })` — autoriza admin sempre, professor apenas quando o `aluno.turno` casa com o seu próprio turno.

### 4. Reposição livre pelo aluno

Já existe `slotsDisponiveis` + `solicitarReposicao`. UI em `/aluno/reposicoes`:
- Acrescentar seletor de data + lista de horários (07–10h, 16–21h) com chip "X/4 vagas". Botão "Agendar" desabilitado quando cheio, <24h ou saldo=0.
- Mantém regra: só permite se houver crédito (gerado por falta justificada via trigger existente).

### 5. Escopo do professor pelo turno

Em `professor.functions.ts`:
- `listarAlunosProfessor`: filtra `alunos.turno = meu_turno` e `deleted_at IS NULL`.
- Nova `alunosDoSlot({ data, hora })`: alunos com `horarios_fixos` casando dia_semana+hora E turno do professor E sem `presencas` registradas para aquele `data+hora`.
- `marcarPresenca` continua igual; o filtro de "sumir após marcar" vem da query acima.

### 6. Tela Presença (professor)

Substituir lista atual por:
- Seletor data + hora.
- `useQuery(alunosDoSlot)` — só os alunos daquele slot, sem presença já lançada.
- Ao marcar, `invalidateQueries` faz o aluno desaparecer; reaparece somente no próximo `data+hora` que estiver na agenda dele.

### 7. Anexos por professor (visualizar/adicionar, sem excluir)

- RLS em `aluno_anexos`: adicionar policy SELECT para `has_role(professor)` quando o `aluno.turno = professor.turno`; INSERT idem; sem DELETE.
- Server fns em `professor.functions.ts`: `listarAnexosProfessor({aluno_id})`, `uploadAnexoProfessor(...)`, `baixarAnexoProfessor({anexo_id})` — verificam turno antes.
- UI: em `/professor/alunos`, botão de anexos por card abrindo Sheet (igual ao admin, sem botão excluir).

### 8. Ficha de evolução

Nova tabela `fichas_evolucao`:
- `id`, `aluno_id`, `professor_id`, `data`, `aparelhos text[]`, `exercicios text`, `observacoes text`, `created_at`.
- Grants + RLS: professor/admin INSERT e SELECT; aluno SELECT da própria ficha.

Lista padrão de aparelhos (default; admin pode editar depois em Configurações):
`Reformer, Cadillac, Chair (Wunda), Ladder Barrel, Spine Corrector, Mat, Tower, Step Barrel, Tonificador`

Server fns: `registrarFicha`, `listarFichasAluno`.

UI:
- `/professor/observacoes` ganha aba "Ficha de evolução": seletor de aluno (apenas alunos com presença confirmada hoje), data, checklist de aparelhos, campos exercícios/observações.
- `/aluno/perfil` (ou nova aba `/aluno/evolucao`): lista das próprias fichas.

### 9. Detalhes técnicos

- Todas as novas server fns usam `requireSupabaseAuth` + checagem de role/turno.
- Migrações em ordem: enum novo → coluna `alunos.turno` → backfill → `professores.crefito` → tabela `fichas_evolucao` (com GRANT + RLS) → policies extras em `aluno_anexos`.
- Sem mudanças no schema gerado do Supabase types até depois da migração rodar.
- Anexo do professor reaproveita bucket existente `aluno-anexos`.

### Arquivos a editar/criar

- `supabase/migrations/<novo>.sql`
- `src/lib/admin.functions.ts` (editar/criar professor, atualizar senha, upsert horário)
- `src/lib/professor.functions.ts` (filtro turno, alunosDoSlot, anexos professor, fichas)
- `src/lib/aluno.functions.ts` (nenhuma mudança grande; talvez `minhasFichas`)
- `src/components/agenda-grid.tsx` (novo, compartilhado)
- `src/routes/_authenticated/admin/professores.tsx` (edição completa + senha)
- `src/routes/_authenticated/admin/agenda.tsx` (modo edição)
- `src/routes/_authenticated/professor/agenda.tsx` (modo edição)
- `src/routes/_authenticated/professor/alunos.tsx` (filtro turno + anexos)
- `src/routes/_authenticated/professor/presenca.tsx` (slot-based)
- `src/routes/_authenticated/professor/observacoes.tsx` (aba ficha)
- `src/routes/_authenticated/aluno/horario.tsx` (mostrar grade completa)
- `src/routes/_authenticated/aluno/reposicoes.tsx` (seletor de slots)
- `src/routes/_authenticated/aluno/perfil.tsx` (listar fichas)
