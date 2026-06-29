import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { dashboardAdmin, suspenderInadimplentes, listarAulasExperimentais } from "@/lib/admin.functions";
import { KPICard, PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Dash });

function Dash() {
  const fn = useServerFn(dashboardAdmin);
  const fnSusp = useServerFn(suspenderInadimplentes);
  const { data } = useQuery({ queryKey: ["admin-dash"], queryFn: () => fn() });
  const m = useMutation({
    mutationFn: () => fnSusp(),
    onSuccess: (d: any) => toast.success(`${d.suspensos ?? 0} alunos suspensos`, { description: d.msg }),
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const listarFn = useServerFn(listarAulasExperimentais);
  const { data: aulas, refetch } = useQuery({ 
    queryKey: ["aulas-experimentais"], 
    queryFn: () => listarFn(),
    enabled: dialogOpen 
  });

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral do estúdio"
        action={
          <div className="flex gap-2">
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
            <Button variant="outline" onClick={() => m.mutate()} disabled={m.isPending}>Suspender inadimplentes</Button>
          </div>
        } />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <KPICard label="Alunos ativos" value={data?.ativos ?? 0} accent />
        <KPICard label="Suspensos" value={data?.suspensos ?? 0} />
        <KPICard label="Receita mensal" value={`R$ ${Number(data?.receitaMensal ?? 0).toFixed(0)}`} />
        <KPICard label="Receita prevista" value={`R$ ${Number(data?.receitaPrevista ?? 0).toFixed(0)}`} />
        <KPICard label="Ocupação" value={`${data?.ocupacao ?? 0}%`} hint="da grade semanal" />
      </div>
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="font-display font-semibold">Regras do estúdio</h2>
        <ul className="mt-2 text-sm text-muted-foreground space-y-1 list-disc pl-5">
          <li>Mensalidade vence todo dia 10</li>
          <li>A partir do dia 11 sem pagamento → SUSPENSO</li>
          <li>Reposições válidas por 30 dias e exigem 24h de antecedência</li>
          <li>Capacidade máxima: 4 alunos por horário</li>
          <li>Horários: 07–11h e 16–22h, segunda a sexta</li>
        </ul>
      </div>
    </div>
  );
}
