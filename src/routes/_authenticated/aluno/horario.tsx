import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { gradeCompleta, meuHorario } from "@/lib/aluno.functions";
import { PageHeader } from "@/components/ui-helpers";

export const Route = createFileRoute("/_authenticated/aluno/horario")({ component: Horario });

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const HORAS = ["07:00","08:00","09:00","10:00","16:00","17:00","18:00","19:00","20:00","21:00"];

function Horario() {
  const fnGrid = useServerFn(gradeCompleta);
  const fnMine = useServerFn(meuHorario);
  const { data: grade } = useQuery({ queryKey: ["aluno-grade"], queryFn: () => fnGrid() });
  const { data: meu } = useQuery({ queryKey: ["aluno-horario"], queryFn: () => fnMine() });

  const meuSet = new Set((meu ?? []).map((h: any) => `${h.dia_semana}-${String(h.hora).slice(0, 5)}`));
  const grid: Record<string, any[]> = {};
  for (const h of grade ?? []) {
    const k = `${h.dia_semana}-${String(h.hora).slice(0, 5)}`;
    if (!grid[k]) grid[k] = [];
    grid[k].push(h);
  }

  return (
    <div>
      <PageHeader title="Agenda" subtitle="Grade semanal do studio — seus horários em destaque" />
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
                  const mine = meuSet.has(k);
                  return (
                    <td key={i} className="p-1 align-top">
                      <div className={`rounded-lg p-1.5 border min-h-[58px] ${mine ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>
                        <p className="text-[10px] uppercase font-semibold">{arr.length}/4{mine ? " • você" : ""}</p>
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
