import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function meuProfessor(supabase: any, userId: string) {
  const { data } = await supabase.from("professores").select("*").eq("profile_id", userId).maybeSingle();
  return data;
}

async function assertProfessorOrAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: any) => r.role);
  if (!roles.includes("professor") && !roles.includes("admin")) {
    throw new Error("Acesso negado");
  }
}

export const dashboardProfessor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertProfessorOrAdmin(context.supabase, context.userId);
    const hoje = new Date().toISOString().slice(0, 10);
    const diaSemana = ((new Date().getDay() + 6) % 7) + 1; // 1=seg .. 7=dom
    const [{ data: aulasHoje }, { data: reposPendentes }] = await Promise.all([
      context.supabase
        .from("horarios_fixos")
        .select("hora, aluno:alunos(profile:profiles(nome))")
        .eq("dia_semana", diaSemana > 5 ? 5 : diaSemana)
        .order("hora"),
      context.supabase
        .from("reposicoes")
        .select("*, aluno:alunos(profile:profiles(nome))")
        .eq("status", "pendente")
        .gte("data_agendada", hoje),
    ]);
    const totalAlunosHoje = aulasHoje?.length ?? 0;
    return { aulasHoje: aulasHoje ?? [], totalAlunosHoje, reposicoesPendentes: reposPendentes ?? [] };
  });

export const agendaSemana = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertProfessorOrAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("horarios_fixos")
      .select("dia_semana, hora, aluno:alunos(id, status, profile:profiles(nome))")
      .order("dia_semana")
      .order("hora");
    return data ?? [];
  });

export const listarAlunosProfessor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertProfessorOrAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("alunos")
      .select("*, plano:planos(*), profile:profiles(*)")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const marcarPresenca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      aluno_id: z.string().uuid(),
      data: z.string(),
      hora: z.string(),
      status: z.enum(["presente", "falta_justificada", "falta_nao_justificada", "reposicao"]),
      observacao: z.string().max(500).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertProfessorOrAdmin(context.supabase, context.userId);
    const prof = await meuProfessor(context.supabase, context.userId);
    const { error } = await context.supabase.from("presencas").insert({
      aluno_id: data.aluno_id,
      data: data.data,
      hora: data.hora,
      status: data.status,
      observacao: data.observacao ?? null,
      professor_id: prof?.id ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const registrarObservacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ aluno_id: z.string().uuid(), texto: z.string().min(1).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertProfessorOrAdmin(context.supabase, context.userId);
    const prof = await meuProfessor(context.supabase, context.userId);
    const { error } = await context.supabase.from("observacoes_aluno").insert({
      aluno_id: data.aluno_id, texto: data.texto, professor_id: prof?.id ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const listarObservacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertProfessorOrAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("observacoes_aluno")
      .select("*, aluno:alunos(profile:profiles(nome))")
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });
