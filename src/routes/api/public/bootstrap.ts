import { createFileRoute } from "@tanstack/react-router";

// Endpoint público (one-shot) para criar dados de demonstração.
// Verifica se já existe admin antes de criar — segundo POST é no-op.
export const Route = createFileRoute("/api/public/bootstrap")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Já tem admin?
        const { data: existing } = await supabaseAdmin
          .from("user_roles").select("user_id").eq("role", "admin").limit(1);
        if ((existing ?? []).length > 0) {
          return Response.json({ ok: true, created: 0, msg: "Dados já existem" });
        }

        const senha = "axis1234";
        const SEED_USERS: { email: string; nome: string; role: "admin" | "professor" | "aluno"; telefone?: string }[] = [
          { email: "admin@axispilates.com", nome: "Administração AXIS", role: "admin", telefone: "(11) 99999-0000" },
          { email: "prof1@axispilates.com", nome: "Mariana Costa", role: "professor", telefone: "(11) 98888-1111" },
          { email: "prof2@axispilates.com", nome: "Rafael Lima", role: "professor", telefone: "(11) 98888-2222" },
          { email: "aluno1@axispilates.com", nome: "Ana Silva", role: "aluno", telefone: "(11) 97777-0001" },
          { email: "aluno2@axispilates.com", nome: "Bruno Santos", role: "aluno", telefone: "(11) 97777-0002" },
          { email: "aluno3@axispilates.com", nome: "Carla Mendes", role: "aluno", telefone: "(11) 97777-0003" },
          { email: "aluno4@axispilates.com", nome: "Daniel Rocha", role: "aluno", telefone: "(11) 97777-0004" },
          { email: "aluno5@axispilates.com", nome: "Eduarda Lima", role: "aluno", telefone: "(11) 97777-0005" },
          { email: "aluno6@axispilates.com", nome: "Felipe Alves", role: "aluno", telefone: "(11) 97777-0006" },
          { email: "aluno7@axispilates.com", nome: "Gabriela Souza", role: "aluno", telefone: "(11) 97777-0007" },
          { email: "aluno8@axispilates.com", nome: "Henrique Dias", role: "aluno", telefone: "(11) 97777-0008" },
          { email: "aluno9@axispilates.com", nome: "Isabela Ferreira", role: "aluno", telefone: "(11) 97777-0009" },
          { email: "aluno10@axispilates.com", nome: "João Pedro", role: "aluno", telefone: "(11) 97777-0010" },
        ];

        const ids: Record<string, string> = {};
        let created = 0;
        for (const u of SEED_USERS) {
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: u.email, password: senha, email_confirm: true, user_metadata: { nome: u.nome },
          });
          if (error || !data.user) {
            // Pode já existir — tenta buscar
            const { data: list } = await supabaseAdmin.auth.admin.listUsers();
            const found = list.users.find((x) => x.email === u.email);
            if (!found) continue;
            ids[u.email] = found.id;
            continue;
          }
          ids[u.email] = data.user.id;
          created++;
          await supabaseAdmin.from("profiles").update({ nome: u.nome, telefone: u.telefone ?? null }).eq("id", data.user.id);
          await supabaseAdmin.from("user_roles").insert({ user_id: data.user.id, role: u.role });
        }

        // Planos
        const { data: planos } = await supabaseAdmin.from("planos").select("*").order("frequencia_semanal");
        const plano1 = planos?.find((p: any) => p.frequencia_semanal === 1)?.id;
        const plano2 = planos?.find((p: any) => p.frequencia_semanal === 2)?.id;
        const plano3 = planos?.find((p: any) => p.frequencia_semanal === 3)?.id;

        // Professores
        const profEmails = ["prof1@axispilates.com", "prof2@axispilates.com"];
        for (const e of profEmails) {
          const pid = ids[e];
          if (!pid) continue;
          await supabaseAdmin.from("professores").insert({
            profile_id: pid, turno: e.includes("1") ? "manha" : "tarde",
          }).select().maybeSingle();
        }

        const { data: profsCriados } = await supabaseAdmin.from("professores").select("id, profile_id");
        const profIds = (profsCriados ?? []).map((p: any) => p.id);

        // Alunos
        const alunoConfigs = [
          { email: "aluno1@axispilates.com", plano: plano2, status: "ativo", dia: 1, hora: "07:00" },
          { email: "aluno2@axispilates.com", plano: plano1, status: "ativo", dia: 2, hora: "08:00" },
          { email: "aluno3@axispilates.com", plano: plano3, status: "ativo", dia: 3, hora: "09:00" },
          { email: "aluno4@axispilates.com", plano: plano2, status: "suspenso", dia: 4, hora: "17:00" },
          { email: "aluno5@axispilates.com", plano: plano1, status: "ativo", dia: 5, hora: "18:00" },
          { email: "aluno6@axispilates.com", plano: plano3, status: "ativo", dia: 1, hora: "19:00" },
          { email: "aluno7@axispilates.com", plano: plano2, status: "ativo", dia: 2, hora: "20:00" },
          { email: "aluno8@axispilates.com", plano: plano1, status: "ativo", dia: 3, hora: "07:00" },
          { email: "aluno9@axispilates.com", plano: plano2, status: "ativo", dia: 4, hora: "10:00" },
          { email: "aluno10@axispilates.com", plano: plano3, status: "ativo", dia: 5, hora: "16:00" },
        ];

        const mesAtual = new Date(); mesAtual.setDate(1);
        const mesAtualISO = mesAtual.toISOString().slice(0, 10);
        const venc = new Date(mesAtual); venc.setDate(10);
        const vencISO = venc.toISOString().slice(0, 10);

        for (const ac of alunoConfigs) {
          const pid = ids[ac.email];
          if (!pid) continue;
          const { data: aluno } = await supabaseAdmin.from("alunos").insert({
            profile_id: pid, plano_id: ac.plano, status: ac.status as any,
            cpf: `000.000.000-${String(Math.floor(Math.random() * 100)).padStart(2, "0")}`,
          }).select("id, plano_id").maybeSingle();
          if (!aluno) continue;
          // Horário fixo
          await supabaseAdmin.from("horarios_fixos").insert({
            aluno_id: aluno.id, dia_semana: ac.dia, hora: ac.hora,
            professor_id: profIds[Math.floor(Math.random() * profIds.length)] ?? null,
          });
          // Pagamento mês atual
          const planoVal = planos?.find((p: any) => p.id === aluno.plano_id)?.valor ?? 280;
          await supabaseAdmin.from("pagamentos").insert({
            aluno_id: aluno.id, mes_referencia: mesAtualISO, valor: planoVal,
            data_vencimento: vencISO,
            status: ac.status === "suspenso" ? "atrasado" : (Math.random() > 0.4 ? "pago" : "pendente"),
            data_pagamento: ac.status === "suspenso" ? null : (Math.random() > 0.4 ? vencISO : null),
            forma: Math.random() > 0.5 ? "pix" : "cartao",
          });
          // Pagamento mês anterior (pago)
          const mesAnt = new Date(mesAtual); mesAnt.setMonth(mesAnt.getMonth() - 1);
          await supabaseAdmin.from("pagamentos").insert({
            aluno_id: aluno.id, mes_referencia: mesAnt.toISOString().slice(0, 10),
            valor: planoVal, data_vencimento: new Date(mesAnt.getFullYear(), mesAnt.getMonth(), 10).toISOString().slice(0,10),
            data_pagamento: new Date(mesAnt.getFullYear(), mesAnt.getMonth(), 8).toISOString().slice(0,10),
            status: "pago", forma: "pix",
          });
          // Algumas presenças
          for (let i = 1; i <= 6; i++) {
            const d = new Date(); d.setDate(d.getDate() - i * 3);
            const status = i === 2 ? "falta_justificada" : i === 4 ? "falta_nao_justificada" : "presente";
            await supabaseAdmin.from("presencas").insert({
              aluno_id: aluno.id, data: d.toISOString().slice(0, 10), hora: ac.hora, status: status as any,
            });
          }
        }

        // Avisos
        await supabaseAdmin.from("avisos").insert([
          { titulo: "Bem-vindo ao AXIS Pilates!", mensagem: "Confira sua agenda e financeiro no app.", destinatario: "todos" },
          { titulo: "Reposições", mensagem: "Reposições devem ser agendadas com 24h de antecedência.", destinatario: "alunos" },
          { titulo: "Reunião pedagógica", mensagem: "Reunião na próxima sexta às 9h.", destinatario: "professores" },
        ]);

        return Response.json({ ok: true, created });
      },
    },
  },
});
