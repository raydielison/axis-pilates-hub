import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { dashboardAdmin, suspenderInadimplentes } from "@/lib/admin.functions";
import { KPICard, PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Dash });

function Dash() {
  const fn = useServerFn(dashboardAdmin);
  const fnSusp = useServerFn(suspenderInadimplentes);
  const { data } = useQuery({ queryKey: ["admin-dash"], queryFn: () => fn() });
  const m = useMutation({
    mutationFn: () => fnSusp(),
    onSuccess: (d: any) => toast.success(`${d.suspensos ?? 0} alunos suspensos`, { description: d.msg }),
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });
  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral do estúdio"
        action={<Button variant="outline" onClick={() => m.mutate()} disabled={m.isPending}>Suspender inadimplentes</Button>} />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <KPICard label="Alunos ativos" value={data?.ativos ?? 0} accent />
        <KPICard label="Suspensos" value={data?.suspensos ?? 0} />
        <KPICard label="Receita mensal" value={`R$ ${Number(data?.receitaMensal ?? 0).toFixed(0)}`} />
        <KPICard label="Receita prevista" value={`R$ ${Number(data?.receitaPrevista ?? 0).toFixed(0)}`} />
        <KPICard label="Ocupação" value={`${data?.ocupacao ?? 0}%`} hint="da grade semanal" />
      </div>
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="font-display font-semibold">Regras do estúdio</h2>
        <ul className="mt-2 text-sm text-muted-foreground space-y-1 list-disc pl-5">
          <li>Mensalidade vence todo dia 10</li>
          <li>A partir do dia 11 sem pagamento → SUSPENSO</li>
          <li>Reposições válidas por 30 dias e exigem 24h de antecedência</li>
          <li>Capacidade máxima: 4 alunos por horário</li>
          <li>Horários: 07–11h e 16–22h, segunda a sexta</li>
        </ul>
      </div>
    </div>
  );
}
