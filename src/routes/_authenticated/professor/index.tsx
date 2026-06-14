import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { dashboardProfessor } from "@/lib/professor.functions";
import { KPICard, PageHeader } from "@/components/ui-helpers";

export const Route = createFileRoute("/_authenticated/professor/")({ component: Dash });

function Dash() {
  const fn = useServerFn(dashboardProfessor);
  const { data, isLoading } = useQuery({ queryKey: ["prof-dash"], queryFn: () => fn() });
  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral do seu dia" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <KPICard label="Aulas hoje" value={data?.aulasHoje?.length ?? 0} accent />
        <KPICard label="Alunos hoje" value={data?.totalAlunosHoje ?? 0} />
        <KPICard label="Reposições pendentes" value={data?.reposicoesPendentes?.length ?? 0} />
      </div>
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="font-display font-semibold mb-3">Próximas aulas</h2>
        {isLoading && <p className="text-muted-foreground">Carregando…</p>}
        <ul className="divide-y">
          {(data?.aulasHoje ?? []).map((a: any, i: number) => (
            <li key={i} className="py-2.5 flex justify-between">
              <span>{a.aluno?.profile?.nome ?? "—"}</span>
              <span className="font-display font-bold text-orange-500">{String(a.hora).slice(0, 5)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
