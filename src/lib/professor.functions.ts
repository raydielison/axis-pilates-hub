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
  return roles;
}

export const dashboardProfessor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertProfessorOrAdmin(context.supabase, context.userId);
    const hoje = new Date().toISOString().slice(0, 10);
    const diaSemana = ((new Date().getDay() + 6) % 7) + 1;
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
    return { aulasHoje: aulasHoje ?? [], totalAlunosHoje: aulasHoje?.length ?? 0, reposicoesPendentes: reposPendentes ?? [] };
  });

export const agendaSemana = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertProfessorOrAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("horarios_fixos")
      .select("dia_semana, hora, id, aluno:alunos!inner(id, status, turno, deleted_at, profile:profiles(nome))")
      .is("aluno.deleted_at", null)
      .order("dia_semana")
      .order("hora");
    return (data ?? []).filter((h: any) => h.aluno);
  });

export const listarAlunosProfessor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await assertProfessorOrAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("alunos")
      .select("*, plano:planos(*), profile:profiles(*)")
      .is("deleted_at", null);
    if (!roles.includes("admin")) {
      const prof = await meuProfessor(context.supabase, context.userId);
      if (!prof) return [];
      q = q.eq("turno", prof.turno);
    }
    const { data } = await q.order("created_at", { ascending: false });
    return data ?? [];
  });

// Lista alunos do slot (dia/hora) que ainda não tiveram presença registrada nessa data+hora,
// filtrando pelo turno do professor.
export const alunosDoSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      hora: z.string().regex(/^\d{2}:\d{2}$/),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const roles = await assertProfessorOrAdmin(context.supabase, context.userId);
    const d = new Date(`${data.data}T00:00:00`);
    const diaSemana = ((d.getDay() + 6) % 7) + 1;
    if (diaSemana > 5) return [];
    let q = context.supabase
      .from("horarios_fixos")
      .select("aluno:alunos(id, status, turno, deleted_at, plano:planos(*), profile:profiles(*))")
      .eq("dia_semana", diaSemana)
      .eq("hora", data.hora);
    const { data: hf, error } = await q;
    if (error) throw error;
    let alunos = (hf ?? []).map((h: any) => h.aluno).filter(Boolean).filter((a: any) => !a.deleted_at);
    if (!roles.includes("admin")) {
      const prof = await meuProfessor(context.supabase, context.userId);
      if (!prof) return [];
      alunos = alunos.filter((a: any) => a.turno === prof.turno);
    }
    // remove os que já têm presença lançada nesse data+hora
    const ids = alunos.map((a: any) => a.id);
    if (ids.length) {
      const { data: pres } = await context.supabase
        .from("presencas").select("aluno_id").eq("data", data.data).eq("hora", data.hora).in("aluno_id", ids);
      const marcados = new Set((pres ?? []).map((p: any) => p.aluno_id));
      alunos = alunos.filter((a: any) => !marcados.has(a.id));
    }
    return alunos;
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

// ============ Anexos (professor: visualizar + adicionar) ============
export const listarAnexosProfessor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ aluno_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertProfessorOrAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("aluno_anexos").select("*").eq("aluno_id", data.aluno_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

export const uploadAnexoProfessor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      aluno_id: z.string().uuid(),
      file_name: z.string().min(1).max(200),
      mime_type: z.string().max(120).optional().nullable(),
      file_b64: z.string().min(1),
      descricao: z.string().max(300).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertProfessorOrAdmin(context.supabase, context.userId);
    const bin = Uint8Array.from(atob(data.file_b64), (c) => c.charCodeAt(0));
    if (bin.byteLength > 25 * 1024 * 1024) throw new Error("Arquivo acima de 25MB");
    const safe = data.file_name.replace(/[^\w.\-]+/g, "_");
    const path = `${data.aluno_id}/${Date.now()}_${safe}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // valida turno do professor antes de gravar
    const { data: pro } = await supabaseAdmin.from("professores").select("turno").eq("profile_id", context.userId).maybeSingle();
    const { data: al } = await supabaseAdmin.from("alunos").select("turno").eq("id", data.aluno_id).maybeSingle();
    if (pro && al && (pro as any).turno !== (al as any).turno) throw new Error("Aluno não é do seu turno");
    const { error: eUp } = await supabaseAdmin.storage.from("aluno-anexos").upload(path, bin, {
      contentType: data.mime_type || "application/octet-stream", upsert: false,
    });
    if (eUp) throw eUp;
    const { error: eIns } = await supabaseAdmin.from("aluno_anexos").insert({
      aluno_id: data.aluno_id, file_path: path, file_name: data.file_name,
      mime_type: data.mime_type ?? null, size_bytes: bin.byteLength,
      uploaded_by: context.userId, descricao: data.descricao ?? null,
    });
    if (eIns) throw eIns;
    return { ok: true };
  });

export const baixarAnexoProfessor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ anexo_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertProfessorOrAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("aluno_anexos").select("file_path, file_name").eq("id", data.anexo_id).maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("Anexo não encontrado");
    const { data: signed, error: e1 } = await supabaseAdmin.storage
      .from("aluno-anexos").createSignedUrl(row.file_path, 300, { download: row.file_name });
    if (e1) throw e1;
    return { url: signed.signedUrl };
  });

// ============ Fichas de evolução ============
export const registrarFicha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      aluno_id: z.string().uuid(),
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      aparelhos: z.array(z.string()).default([]),
      exercicios: z.string().max(2000).optional().nullable(),
      observacoes: z.string().max(2000).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertProfessorOrAdmin(context.supabase, context.userId);
    const prof = await meuProfessor(context.supabase, context.userId);
    const { error } = await context.supabase.from("fichas_evolucao").insert({
      aluno_id: data.aluno_id,
      professor_id: prof?.id ?? null,
      data: data.data ?? new Date().toISOString().slice(0, 10),
      aparelhos: data.aparelhos,
      exercicios: data.exercicios ?? null,
      observacoes: data.observacoes ?? null,
    } as any);
    if (error) throw error;
    return { ok: true };
  });

export const listarFichasAluno = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ aluno_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertProfessorOrAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("fichas_evolucao").select("*").eq("aluno_id", data.aluno_id)
      .order("data", { ascending: false }).limit(60);
    if (error) throw error;
    return rows ?? [];
  });

// Alunos com presença confirmada hoje (para selecionar na ficha de evolução)
export const alunosComPresencaHoje = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertProfessorOrAdmin(context.supabase, context.userId);
    const hoje = new Date().toISOString().slice(0, 10);
    const { data } = await context.supabase
      .from("presencas")
      .select("aluno:alunos(id, profile:profiles(nome))")
      .eq("data", hoje)
      .eq("status", "presente");
    const seen = new Set<string>();
    const out: any[] = [];
    for (const p of data ?? []) {
      const a = (p as any).aluno;
      if (a && !seen.has(a.id)) { seen.add(a.id); out.push(a); }
    }
    return out;
  });

export const listarAparelhos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("studio_aparelhos").select("*").eq("ativo", true).order("nome");
    return data ?? [];
  });
