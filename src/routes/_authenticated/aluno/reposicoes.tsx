import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { minhasReposicoes, slotsDisponiveis, solicitarReposicao } from "@/lib/aluno.functions";
import { PageHeader } from "@/components/ui-helpers";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/aluno/reposicoes")({ component: Reposicoes });

function Reposicoes() {
  const fnList = useServerFn(minhasReposicoes);
  const fnSlots = useServerFn(slotsDisponiveis);
  const fnSolicitar = useServerFn(solicitarReposicao);
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data } = useQuery({ queryKey: ["aluno-reposicoes"], queryFn: () => fnList() });
  const { data: slots } = useQuery({ queryKey: ["slots", date], queryFn: () => fnSlots({ data: { data: date } }) });

  const solicitar = useMutation({
    mutationFn: (hora: string) => fnSolicitar({ data: { data: date, hora } }),
    onSuccess: () => {
      toast.success("Reposição agendada!");
      qc.invalidateQueries({ queryKey: ["aluno-reposicoes"] });
      qc.invalidateQueries({ queryKey: ["slots", date] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const saldo = data?.saldo ?? 0;
  const reposicoes = (data?.reposicoes ?? []) as any[];

  return (
    <div>
      <PageHeader title="Reposições" subtitle={`Você tem ${saldo} crédito(s) disponível(is)`} />

      <div className="rounded-2xl border bg-card p-5 mb-6">
        <h2 className="font-display font-semibold mb-3">Agendar reposição</h2>
        <div className="flex items-end gap-3 mb-4 flex-wrap">
          <div>
            <Label className="text-xs">Data</Label>
            <Input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="w-44" />
          </div>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {(slots ?? []).map((s: any) => {
            const cheio = s.ocupado >= s.capacidade;
            return (
              <button
                key={s.hora}
                disabled={cheio || saldo <= 0 || solicitar.isPending}
                onClick={() => solicitar.mutate(s.hora)}
                className={`rounded-xl p-3 text-sm border transition ${cheio
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  }`}
              >
                <div className="font-display font-bold">{s.hora}</div>
                <div className="text-[10px] mt-1">{s.ocupado}/{s.capacidade}</div>
              </button>
            );
          })}
        </div>
      </div>

      <h2 className="font-display font-semibold mb-3">Minhas reposições</h2>
      <div className="space-y-2">
        {reposicoes.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border bg-card">
            <div>
              <p className="text-sm font-medium">
                {r.data_agendada
                  ? `${new Date(r.data_agendada).toLocaleDateString("pt-BR")} às ${String(r.hora_agendada).slice(0, 5)}`
                  : "Aguardando agendamento"}
              </p>
              <p className="text-xs text-muted-foreground">Expira em: {new Date(r.expira_em).toLocaleDateString("pt-BR")}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-muted">{r.status}</span>
          </div>
        ))}
        {reposicoes.length === 0 && <p className="text-muted-foreground text-sm">Sem reposições no histórico.</p>}
      </div>
    </div>
  );
}
