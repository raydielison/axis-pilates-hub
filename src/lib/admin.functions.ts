import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Acesso negado: apenas administradores");
}

export const dashboardAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const inicioMes = new Date(); inicioMes.setDate(1);
    const inicioISO = inicioMes.toISOString().slice(0, 10);

    const [{ count: ativos }, { count: suspensos }, { data: pagosMes }, { data: planos }] = await Promise.all([
      context.supabase.from("alunos").select("id", { count: "exact", head: true }).eq("status", "ativo"),
      context.supabase.from("alunos").select("id", { count: "exact", head: true }).eq("status", "suspenso"),
      context.supabase.from("pagamentos").select("valor").eq("status", "pago").gte("data_pagamento", inicioISO),
      context.supabase.from("alunos").select("plano:planos(valor)").eq("status", "ativo"),
    ]);
    const receitaMensal = (pagosMes ?? []).reduce((s, p: any) => s + Number(p.valor), 0);
    const receitaPrevista = (planos ?? []).reduce((s, a: any) => s + Number(a.plano?.valor ?? 0), 0);
    const capacidadeSemanal = 5 * 10 * 4; // 5 dias * 10 horários * 4 vagas
    const { count: ocupados } = await context.supabase.from("horarios_fixos").select("id", { count: "exact", head: true });
    const ocupacao = Math.round(((ocupados ?? 0) / capacidadeSemanal) * 100);

    return { ativos: ativos ?? 0, suspensos: suspensos ?? 0, receitaMensal, receitaPrevista, ocupacao };
  });

export const listarAlunosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("alunos")
      .select("*, plano:planos(*), profile:profiles(*)")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const listarProfessoresAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("professores")
      .select("*, profile:profiles(*)")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const listarPlanos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase.from("planos").select("*").order("frequencia_semanal");
    return data ?? [];
  });

export const salvarPlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      nome: z.string().min(1).max(100),
      frequencia_semanal: z.number().min(1).max(7),
      valor: z.number().min(0),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id) {
      const { error } = await context.supabase.from("planos").update({
        nome: data.nome, frequencia_semanal: data.frequencia_semanal, valor: data.valor,
      }).eq("id", data.id);
      if (error) throw error;
    } else {
      const { error } = await context.supabase.from("planos").insert({
        nome: data.nome, frequencia_semanal: data.frequencia_semanal, valor: data.valor,
      });
      if (error) throw error;
    }
    return { ok: true };
  });

export const listarPagamentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("pagamentos")
      .select("*, aluno:alunos(profile:profiles(nome))")
      .order("data_vencimento", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const registrarPagamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      pagamento_id: z.string().uuid(),
      forma: z.enum(["pix", "cartao", "dinheiro"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const hoje = new Date().toISOString().slice(0, 10);
    const { data: pag, error: e1 } = await context.supabase
      .from("pagamentos")
      .update({ status: "pago", forma: data.forma, data_pagamento: hoje })
      .eq("id", data.pagamento_id)
      .select("aluno_id")
      .maybeSingle();
    if (e1) throw e1;
    if (pag?.aluno_id) {
      await context.supabase.from("alunos").update({ status: "ativo" }).eq("id", pag.aluno_id).eq("status", "suspenso");
    }
    return { ok: true };
  });

export const criarAluno = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      nome: z.string().min(1).max(120),
      email: z.string().email().max(160),
      cpf: z.string().max(20).optional().nullable(),
      telefone: z.string().max(20).optional().nullable(),
      endereco: z.string().max(200).optional().nullable(),
      plano_id: z.string().uuid().optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tempPassword = `Axis-${crypto.randomUUID().slice(0, 12)}`;
    const { data: user, error: e1 } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: tempPassword, email_confirm: true,
      user_metadata: { nome: data.nome, force_password_change: true },
    });
    if (e1 || !user.user) throw new Error(e1?.message ?? "Falha ao criar usuário");
    await supabaseAdmin.from("profiles").update({
      nome: data.nome, telefone: data.telefone, endereco: data.endereco,
    }).eq("id", user.user.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: user.user.id, role: "aluno" });
    const { error: e2 } = await supabaseAdmin.from("alunos").insert({
      profile_id: user.user.id, cpf: data.cpf, plano_id: data.plano_id ?? null,
    });
    if (e2) throw e2;
    return { ok: true, tempPassword };
  });

export const criarProfessor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      nome: z.string().min(1).max(120),
      email: z.string().email().max(160),
      telefone: z.string().max(20).optional().nullable(),
      turno: z.enum(["manha", "tarde", "noite"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tempPassword = `Axis-${crypto.randomUUID().slice(0, 12)}`;
    const { data: user, error: e1 } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: tempPassword, email_confirm: true,
      user_metadata: { nome: data.nome, force_password_change: true },
    });
    if (e1 || !user.user) throw new Error(e1?.message ?? "Falha ao criar usuário");
    await supabaseAdmin.from("profiles").update({ nome: data.nome, telefone: data.telefone }).eq("id", user.user.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: user.user.id, role: "professor" });
    await supabaseAdmin.from("professores").insert({ profile_id: user.user.id, turno: data.turno });
    return { ok: true, tempPassword };
  });

export const suspenderInadimplentes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const hoje = new Date();
    if (hoje.getDate() < 11) return { ok: true, suspensos: 0, msg: "Antes do dia 11" };
    const mesISO = hoje.toISOString().slice(0, 7) + "-01";
    const { data: alunos } = await context.supabase.from("alunos").select("id").eq("status", "ativo");
    let count = 0;
    for (const a of alunos ?? []) {
      const { data: pg } = await context.supabase
        .from("pagamentos").select("id, status")
        .eq("aluno_id", a.id).eq("mes_referencia", mesISO).maybeSingle();
      if (!pg || pg.status !== "pago") {
        await context.supabase.from("alunos").update({ status: "suspenso" }).eq("id", a.id);
        count++;
      }
    }
    return { ok: true, suspensos: count };
  });

export const listarHorariosTodos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("horarios_fixos")
      .select("*, aluno:alunos(profile:profiles(nome)), professor:professores(profile:profiles(nome))")
      .order("dia_semana").order("hora");
    return data ?? [];
  });

export const relatorios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const ano = new Date().getFullYear();
    const { data: pagos } = await context.supabase
      .from("pagamentos").select("valor, data_pagamento, status")
      .gte("data_pagamento", `${ano}-01-01`).eq("status", "pago");
    const porMes: Record<number, number> = {};
    for (const p of pagos ?? []) {
      const m = new Date(p.data_pagamento!).getMonth();
      porMes[m] = (porMes[m] ?? 0) + Number(p.valor);
    }
    const receitaAnual = Object.values(porMes).reduce((a, b) => a + b, 0);
    const { count: presencas } = await context.supabase.from("presencas").select("id", { count: "exact", head: true });
    const { count: reposicoes } = await context.supabase.from("reposicoes").select("id", { count: "exact", head: true });
    const { data: inadimplentes } = await context.supabase
      .from("alunos").select("id, profile:profiles(nome)").eq("status", "suspenso");
    return {
      receitaPorMes: Array.from({ length: 12 }).map((_, i) => ({ mes: i + 1, valor: porMes[i] ?? 0 })),
      receitaAnual, totalPresencas: presencas ?? 0, totalReposicoes: reposicoes ?? 0,
      inadimplentes: inadimplentes ?? [],
    };
  });
