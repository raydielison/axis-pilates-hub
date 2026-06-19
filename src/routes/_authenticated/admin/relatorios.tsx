import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { relatorios } from "@/lib/admin.functions";
import { KPICard, PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/relatorios")({ component: Rel });

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const PERIODOS = [
  { id: "dia", label: "Dia" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "ano", label: "Ano" },
] as const;

type Periodo = typeof PERIODOS[number]["id"];

function Rel() {
  const fn = useServerFn(relatorios);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const { data } = useQuery({
    queryKey: ["admin-rel", periodo],
    queryFn: () => fn({ data: { periodo } }),
  });
  const max = Math.max(1, ...((data?.receitaPorMes ?? []).map((m: any) => Number(m.valor))));
  const labelPeriodo = PERIODOS.find((p) => p.id === periodo)?.label ?? "Mês";

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Receita, presenças e inadimplência" />
      <div className="flex gap-2 mb-4 flex-wrap">
        {PERIODOS.map((p) => (
          <Button
            key={p.id}
            variant={periodo === p.id ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriodo(p.id)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPICard label={`Receita (${labelPeriodo.toLowerCase()})`} value={`R$ ${Number(data?.receitaPeriodo ?? 0).toFixed(0)}`} accent />
        <KPICard label="Presenças no período" value={data?.totalPresencas ?? 0} />
        <KPICard label="Reposições no período" value={data?.totalReposicoes ?? 0} />
        <KPICard label="Inadimplentes" value={data?.inadimplentes?.length ?? 0} />
      </div>
      <div className="rounded-2xl border bg-card p-5 mb-6">
        <h2 className="font-display font-semibold mb-1">Receita mensal — {new Date().getFullYear()}</h2>
        <p className="text-xs text-muted-foreground mb-4">Receita anual: R$ {Number(data?.receitaAnual ?? 0).toFixed(0)}</p>
        <div className="grid grid-cols-12 gap-2 items-end h-44">
          {(data?.receitaPorMes ?? []).map((m: any) => (
            <div key={m.mes} className="flex flex-col items-center gap-1">
              <div className="w-full bg-primary rounded-t" style={{ height: `${(Number(m.valor) / max) * 100}%` }} title={`R$ ${m.valor}`} />
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
