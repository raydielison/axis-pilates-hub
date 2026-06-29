import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { dashboardProfessor, listarAulasExperimentais } from "@/lib/admin.functions";
import { KPICard, PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/professor/")({ component: Dash });

function Dash() {
  const fn = useServerFn(dashboardProfessor);
  const { data, isLoading } = useQuery({ queryKey: ["prof-dash"], queryFn: () => fn() });
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const listarFn = useServerFn(listarAulasExperimentais);
  const { data: aulas } = useQuery({ 
    queryKey: ["aulas-experimentais-prof"], 
    queryFn: () => listarFn(),
    enabled: dialogOpen 
  });

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral do seu dia"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Aulas Experimentais</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Aulas Experimentais Agendadas</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                {aulas && aulas.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma aula experimental agendada.</p>
                ) : (
                  <div className="space-y-2">
                    {(aulas ?? []).map((aula: any) => (
                      <div key={aula.id} className="p-3 border rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{aula.aluno_nome}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(aula.data_aula).toLocaleDateString('pt-BR')} às {aula.hora_aula.slice(0, 5)}
                          </p>
                          {aula.observacao && <p className="text-xs text-muted-foreground mt-1">{aula.observacao}</p>}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          aula.status === 'agendada' ? 'bg-blue-100 text-blue-800' :
                          aula.status === 'realizada' ? 'bg-green-100 text-green-800' :
                          aula.status === 'cancelada' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {aula.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        } />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <KPICard label="Aulas hoje" value={data?.aulasHoje?.length ?? 0} accent />
        <KPICard label="Alunos hoje" value={data?.totalAlunosHoje ?? 0} />
        <KPICard label="Reposições pendentes" value={data?.reposicoesPendentes?.length ?? 0} />
      </div>
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="font-display font-semibold mb-3">Próximas aulas</h2>
        {isLoading && <p className="text-muted-foreground">Carregando…</p>}
        <ul className="divide-y">
          {(data?.aulasHoje ?? []).map((a: any, i: number) => (
            <li key={i} className="py-2.5 flex justify-between">
              <span>{a.aluno?.profile?.nome ?? "—"}</span>
              <span className="font-display font-bold text-primary">{String(a.hora).slice(0, 5)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
