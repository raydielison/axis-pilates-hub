import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getMyAluno(supabase: any, userId: string) {
  const { data } = await supabase
    .from("alunos")
    .select("id, status, saldo_reposicoes, data_inicio, plano_id, plano:planos(*), profile:profiles(*)")
    .eq("profile_id", userId)
    .maybeSingle();
  return data;
}

export const meuDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const aluno = await getMyAluno(context.supabase, context.userId);
    if (!aluno) return { aluno: null, proximaAula: null, pagamentoAtual: null, avisos: [] };
    const hojeISO = new Date().toISOString().slice(0, 10);
    const [{ data: proximaAula }, { data: pagamentoAtual }, { data: avisos }] = await Promise.all([
      context.supabase
        .from("horarios_fixos")
        .select("dia_semana, hora")
        .eq("aluno_id", aluno.id)
        .order("dia_semana"),
      context.supabase
        .from("pagamentos")
        .select("*")
        .eq("aluno_id", aluno.id)
        .gte("data_vencimento", hojeISO.slice(0, 7) + "-01")
        .order("data_vencimento", { ascending: true })
        .limit(1)
        .maybeSingle(),
      context.supabase
        .from("avisos")
        .select("*")
        .or(`destinatario.eq.todos,destinatario.eq.alunos,user_id.eq.${context.userId}`)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    return { aluno, proximaAula, pagamentoAtual, avisos: avisos ?? [] };
  });

export const meuHorario = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const aluno = await getMyAluno(context.supabase, context.userId);
    if (!aluno) return [];
    const { data } = await context.supabase
      .from("horarios_fixos")
      .select("*, professor:professores(*, profile:profiles(nome))")
      .eq("aluno_id", aluno.id)
      .order("dia_semana");
    return data ?? [];
  });

export const minhasPresencas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const aluno = await getMyAluno(context.supabase, context.userId);
    if (!aluno) return [];
    const { data } = await context.supabase
      .from("presencas")
      .select("*")
      .eq("aluno_id", aluno.id)
      .order("data", { ascending: false })
      .limit(60);
    return data ?? [];
  });

export const minhasReposicoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const aluno = await getMyAluno(context.supabase, context.userId);
    if (!aluno) return { saldo: 0, reposicoes: [], aluno: null };
    const { data } = await context.supabase
      .from("reposicoes")
      .select("*")
      .eq("aluno_id", aluno.id)
      .order("created_at", { ascending: false });
    return { saldo: aluno.saldo_reposicoes, reposicoes: data ?? [], aluno };
  });

export const solicitarReposicao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use AAAA-MM-DD)"),
      hora: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida (use HH:MM)"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const aluno = await getMyAluno(context.supabase, context.userId);
    if (!aluno) throw new Error("Aluno não encontrado");
    if (aluno.status !== "ativo") throw new Error("Aluno suspenso não pode agendar reposições");
    if (aluno.saldo_reposicoes <= 0) throw new Error("Sem saldo de reposições");
    // Validar 24h
    const dt = new Date(`${data.data}T${data.hora}:00`);
    if (Number.isNaN(dt.getTime())) throw new Error("Data/hora inválida");
    if (dt.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
      throw new Error("Reposições exigem 24h de antecedência");
    }
    // Validar vagas
    const { count, error: eCount } = await context.supabase
      .from("presencas")
      .select("id", { count: "exact", head: true })
      .eq("data", data.data)
      .eq("hora", data.hora);
    if (eCount) throw eCount;
    if ((count ?? 0) >= 4) throw new Error("Horário lotado");

    // Encontrar reposição pendente mais antiga
    const { data: rep, error: eRep } = await context.supabase
      .from("reposicoes")
      .select("id")
      .eq("aluno_id", aluno.id)
      .eq("status", "pendente")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (eRep) throw eRep;
    if (!rep) throw new Error("Nenhum crédito disponível");

    const { error: eUpd } = await context.supabase
      .from("reposicoes")
      .update({ data_agendada: data.data, hora_agendada: data.hora })
      .eq("id", rep.id);
    if (eUpd) throw eUpd;
    const { error: eDec } = await context.supabase
      .from("alunos")
      .update({ saldo_reposicoes: aluno.saldo_reposicoes - 1 })
      .eq("id", aluno.id);
    if (eDec) throw eDec;
    return { ok: true };
  });

export const meuFinanceiro = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const aluno = await getMyAluno(context.supabase, context.userId);
    if (!aluno) return { aluno: null, pagamentos: [] };
    const { data } = await context.supabase
      .from("pagamentos")
      .select("*")
      .eq("aluno_id", aluno.id)
      .order("data_vencimento", { ascending: false });
    return { aluno, pagamentos: data ?? [] };
  });

export const atualizarPerfil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      telefone: z.string().max(20).optional().nullable(),
      endereco: z.string().max(200).optional().nullable(),
      contato_emergencia: z.string().max(120).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ telefone: data.telefone, endereco: data.endereco, contato_emergencia: data.contato_emergencia })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const slotsDisponiveis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ data: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const horarios = [
      "07:00","08:00","09:00","10:00",
      "16:00","17:00","18:00","19:00","20:00","21:00",
    ];
    const { data: presencas } = await context.supabase
      .from("presencas")
      .select("hora")
      .eq("data", data.data);
    const counts: Record<string, number> = {};
    for (const p of presencas ?? []) {
      const k = String(p.hora).slice(0, 5);
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return horarios.map((h) => ({ hora: h, ocupado: counts[h] ?? 0, capacidade: 4 }));
  });
