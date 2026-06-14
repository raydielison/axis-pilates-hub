import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listarAlunosProfessor, listarObservacoes, registrarObservacao } from "@/lib/professor.functions";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/professor/observacoes")({ component: Obs });

function Obs() {
  const fnAlunos = useServerFn(listarAlunosProfessor);
  const fnList = useServerFn(listarObservacoes);
  const fnNew = useServerFn(registrarObservacao);
  const qc = useQueryClient();
  const { data: alunos } = useQuery({ queryKey: ["prof-alunos"], queryFn: () => fnAlunos() });
  const { data: obs } = useQuery({ queryKey: ["observacoes"], queryFn: () => fnList() });
  const [alunoId, setAlunoId] = useState<string>("");
  const [texto, setTexto] = useState("");

  const m = useMutation({
    mutationFn: () => fnNew({ data: { aluno_id: alunoId, texto } }),
    onSuccess: () => { toast.success("Observação registrada"); setTexto(""); qc.invalidateQueries({ queryKey: ["observacoes"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <div>
      <PageHeader title="Observações" subtitle="Evolução e anotações dos alunos" />
      <div className="rounded-2xl border bg-card p-5 mb-6 max-w-2xl">
        <Select value={alunoId} onValueChange={setAlunoId}>
          <SelectTrigger><SelectValue placeholder="Selecione um aluno" /></SelectTrigger>
          <SelectContent>
            {(alunos ?? []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.profile?.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Textarea className="mt-3" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva a evolução, lesões, recomendações..." />
        <Button className="mt-3 bg-orange-500 hover:bg-orange-600" onClick={() => m.mutate()} disabled={!alunoId || !texto || m.isPending}>
          {m.isPending ? "Salvando…" : "Salvar observação"}
        </Button>
      </div>

      <h2 className="font-display font-semibold mb-3">Últimas observações</h2>
      <div className="space-y-3">
        {(obs ?? []).map((o: any) => (
          <div key={o.id} className="rounded-xl border bg-card p-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-foreground">{o.aluno?.profile?.nome}</span>
              <span>{new Date(o.created_at).toLocaleString("pt-BR")}</span>
            </div>
            <p className="text-sm">{o.texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
