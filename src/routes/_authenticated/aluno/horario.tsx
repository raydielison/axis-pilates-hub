import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { meuHorario } from "@/lib/aluno.functions";
import { PageHeader } from "@/components/ui-helpers";

export const Route = createFileRoute("/_authenticated/aluno/horario")({ component: Horario });

const DIAS = ["—", "Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

function Horario() {
  const fn = useServerFn(meuHorario);
  const { data, isLoading } = useQuery({ queryKey: ["aluno-horario"], queryFn: () => fn() });
  return (
    <div>
      <PageHeader title="Meu Horário" subtitle="Seus dias e horários fixos no estúdio" />
      {isLoading && <p className="text-muted-foreground">Carregando…</p>}
      <div className="space-y-3">
        {(data ?? []).map((h: any) => (
          <div key={h.id} className="flex items-center justify-between p-4 rounded-2xl border bg-card">
            <div>
              <p className="font-display font-semibold">{DIAS[h.dia_semana]}</p>
              <p className="text-sm text-muted-foreground">Professor: {h.professor?.profile?.nome ?? "—"}</p>
            </div>
            <p className="font-display text-2xl font-bold text-primary">{String(h.hora).slice(0, 5)}</p>
          </div>
        ))}
        {data && data.length === 0 && <p className="text-muted-foreground">Nenhum horário fixo cadastrado.</p>}
      </div>
    </div>
  );
}
