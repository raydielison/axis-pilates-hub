import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { agendaSemana } from "@/lib/professor.functions";
import { PageHeader } from "@/components/ui-helpers";
import { AgendaGrid } from "@/components/agenda-grid";

export const Route = createFileRoute("/_authenticated/professor/agenda")({ component: Agenda });

function Agenda() {
  const fn = useServerFn(agendaSemana);
  const { data } = useQuery({ queryKey: ["prof-agenda"], queryFn: () => fn() });
  const horarios = (data as any)?.horarios ?? [];
  const turno = (data as any)?.turno ?? null;
  const subtitle = turno === "manha"
    ? "Turno manhã · 07h–10h"
    : turno === "tarde_noite"
    ? "Turno tarde/noite · 16h–21h"
    : "Grade semanal";
  return (
    <div>
      <PageHeader title="Agenda" subtitle={`${subtitle} — clique em uma célula para editar`} />
      <AgendaGrid horarios={horarios} editable turno={turno} invalidateKeys={[["prof-agenda"], ["admin-agenda"]]} />
    </div>
  );
}
