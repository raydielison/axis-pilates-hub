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
  return (
    <div>
      <PageHeader title="Agenda" subtitle="Grade semanal — clique em uma célula para editar" />
      <AgendaGrid horarios={(data ?? []) as any} editable invalidateKeys={[["prof-agenda"], ["admin-agenda"]]} />
    </div>
  );
}
