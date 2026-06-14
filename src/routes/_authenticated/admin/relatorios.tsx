import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { relatorios } from "@/lib/admin.functions";
import { KPICard, PageHeader } from "@/components/ui-helpers";

export const Route = createFileRoute("/_authenticated/admin/relatorios")({ component: Rel });

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function Rel() {
  const fn = useServerFn(relatorios);
  const { data } = useQuery({ queryKey: ["admin-rel"], queryFn: () => fn() });
  const max = Math.max(1, ...((data?.receitaPorMes ?? []).map((m: any) => Number(m.valor))));
  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Receita, presenças e inadimplência" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPICard label="Receita anual" value={`R$ ${Number(data?.receitaAnual ?? 0).toFixed(0)}`} accent />
        <KPICard label="Total presenças" value={data?.totalPresencas ?? 0} />
        <KPICard label="Total reposições" value={data?.totalReposicoes ?? 0} />
        <KPICard label="Inadimplentes" value={data?.inadimplentes?.length ?? 0} />
      </div>
      <div className="rounded-2xl border bg-card p-5 mb-6">
        <h2 className="font-display font-semibold mb-4">Receita mensal</h2>
        <div className="grid grid-cols-12 gap-2 items-end h-44">
          {(data?.receitaPorMes ?? []).map((m: any) => (
            <div key={m.mes} className="flex flex-col items-center gap-1">
              <div className="w-full bg-orange-500 rounded-t" style={{ height: `${(Number(m.valor) / max) * 100}%` }} title={`R$ ${m.valor}`} />
              <span className="text-[10px] text-muted-foreground">{MESES[m.mes - 1]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="font-display font-semibold mb-3">Alunos inadimplentes</h2>
        <ul className="divide-y">
          {(data?.inadimplentes ?? []).map((a: any) => (
            <li key={a.id} className="py-2 text-sm">{a.profile?.nome}</li>
          ))}
          {(data?.inadimplentes ?? []).length === 0 && <li className="py-2 text-sm text-muted-foreground">Nenhum aluno inadimplente.</li>}
        </ul>
      </div>
    </div>
  );
}
