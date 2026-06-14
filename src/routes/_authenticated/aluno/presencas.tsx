import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { minhasPresencas } from "@/lib/aluno.functions";
import { PageHeader } from "@/components/ui-helpers";

export const Route = createFileRoute("/_authenticated/aluno/presencas")({ component: Presencas });

const LABEL: Record<string, { txt: string; cls: string }> = {
  presente: { txt: "Presente", cls: "bg-green-100 text-green-800" },
  falta_justificada: { txt: "Falta justificada", cls: "bg-amber-100 text-amber-800" },
  falta_nao_justificada: { txt: "Falta", cls: "bg-red-100 text-red-800" },
  reposicao: { txt: "Reposição", cls: "bg-blue-100 text-blue-800" },
};

function Presencas() {
  const fn = useServerFn(minhasPresencas);
  const { data, isLoading } = useQuery({ queryKey: ["aluno-presencas"], queryFn: () => fn() });
  const items = (data ?? []) as any[];
  const counts = items.reduce((acc, p) => ({ ...acc, [p.status]: (acc[p.status] ?? 0) + 1 }), {} as Record<string, number>);
  return (
    <div>
      <PageHeader title="Presenças" subtitle="Seu histórico de aulas" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {(["presente", "falta_justificada", "falta_nao_justificada", "reposicao"] as const).map((k) => (
          <div key={k} className="rounded-2xl border p-4 bg-card">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{LABEL[k].txt}</p>
            <p className="font-display text-2xl font-bold mt-1">{counts[k] ?? 0}</p>
          </div>
        ))}
      </div>
      {isLoading && <p className="text-muted-foreground">Carregando…</p>}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left p-3">Data</th><th className="text-left p-3">Hora</th><th className="text-left p-3">Status</th></tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{new Date(p.data).toLocaleDateString("pt-BR")}</td>
                <td className="p-3">{String(p.hora).slice(0, 5)}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LABEL[p.status]?.cls}`}>{LABEL[p.status]?.txt ?? p.status}</span></td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Sem registros ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
