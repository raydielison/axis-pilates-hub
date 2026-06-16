import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listarHorariosTodos } from "@/lib/admin.functions";
import { PageHeader } from "@/components/ui-helpers";
import { AgendaGrid } from "@/components/agenda-grid";

export const Route = createFileRoute("/_authenticated/admin/agenda")({ component: Agenda });

function Agenda() {
  const fn = useServerFn(listarHorariosTodos);
  const { data } = useQuery({ queryKey: ["admin-agenda"], queryFn: () => fn() });
  return (
    <div>
      <PageHeader title="Agenda Geral" subtitle="Grade semanal · 4 alunos por horário · clique em uma célula para editar" />
      <AgendaGrid horarios={(data ?? []) as any} editable invalidateKeys={[["admin-agenda"], ["prof-agenda"]]} />
    </div>
  );
}
