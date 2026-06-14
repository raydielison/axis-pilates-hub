import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { agendaSemana } from "@/lib/professor.functions";
import { PageHeader } from "@/components/ui-helpers";

export const Route = createFileRoute("/_authenticated/professor/agenda")({ component: Agenda });

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const HORAS = ["07:00","08:00","09:00","10:00","16:00","17:00","18:00","19:00","20:00","21:00"];

function Agenda() {
  const fn = useServerFn(agendaSemana);
  const { data } = useQuery({ queryKey: ["agenda-semana"], queryFn: () => fn() });
  const grid: Record<string, any[]> = {};
  for (const h of data ?? []) {
    const k = `${h.dia_semana}-${String(h.hora).slice(0, 5)}`;
    if (!grid[k]) grid[k] = [];
    grid[k].push(h);
  }
  return (
    <div>
      <PageHeader title="Agenda Semanal" subtitle="Segunda a sexta · 07–11h e 16–22h" />
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-xs md:text-sm">
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
                  return (
                    <td key={i} className="p-2 align-top">
                      {arr.length > 0 ? (
                        <div className="rounded-lg bg-primary/10 border border-primary/30 p-1.5">
                          <p className="text-[10px] uppercase text-primary">{arr.length}/4</p>
                          {arr.slice(0, 2).map((a: any, j: number) => (
                            <p key={j} className="truncate text-[11px]">{a.aluno?.profile?.nome}</p>
                          ))}
                          {arr.length > 2 && <p className="text-[10px] text-muted-foreground">+{arr.length - 2}</p>}
                        </div>
                      ) : <span className="text-muted-foreground/40">—</span>}
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
