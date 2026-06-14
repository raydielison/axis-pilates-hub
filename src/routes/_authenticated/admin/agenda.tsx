import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listarHorariosTodos } from "@/lib/admin.functions";
import { PageHeader } from "@/components/ui-helpers";

export const Route = createFileRoute("/_authenticated/admin/agenda")({ component: Agenda });

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const HORAS = ["07:00","08:00","09:00","10:00","16:00","17:00","18:00","19:00","20:00","21:00"];

function Agenda() {
  const fn = useServerFn(listarHorariosTodos);
  const { data } = useQuery({ queryKey: ["admin-agenda"], queryFn: () => fn() });
  const grid: Record<string, any[]> = {};
  for (const h of data ?? []) {
    const k = `${h.dia_semana}-${String(h.hora).slice(0, 5)}`;
    if (!grid[k]) grid[k] = [];
    grid[k].push(h);
  }
  return (
    <div>
      <PageHeader title="Agenda Geral" subtitle="Grade semanal · 4 alunos por horário" />
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-xs md:text-sm min-w-[640px]">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left w-20">Hora</th>
              {DIAS.map((d) => <th key={d} className="p-2 text-left">{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {HORAS.map((h) => (
              <tr key={h} className="border-t">
                <td className="p-2 font-mono text-muted-foreground">{h}</td>
                {DIAS.map((_, i) => {
                  const k = `${i + 1}-${h}`;
                  const arr = grid[k] ?? [];
                  const ratio = arr.length / 4;
                  return (
                    <td key={i} className="p-2 align-top">
                      <div className={`rounded-lg p-1.5 border ${ratio >= 1 ? "bg-red-500/10 border-red-500/30" : ratio >= 0.5 ? "bg-primary/10 border-primary/30" : "bg-green-500/10 border-green-500/30"}`}>
                        <p className="text-[10px] uppercase font-semibold">{arr.length}/4</p>
                        {arr.slice(0, 2).map((a: any, j: number) => (
                          <p key={j} className="truncate text-[11px]">{a.aluno?.profile?.nome?.split(" ")[0]}</p>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
