import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listarPlanos, salvarPlano } from "@/lib/admin.functions";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/planos")({ component: Planos });

function Planos() {
  const fn = useServerFn(listarPlanos);
  const fnSave = useServerFn(salvarPlano);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["planos"], queryFn: () => fn() });

  const m = useMutation({
    mutationFn: (p: any) => fnSave({ data: { id: p.id, nome: p.nome, frequencia_semanal: Number(p.frequencia_semanal), valor: Number(p.valor) } }),
    onSuccess: () => { toast.success("Plano salvo"); qc.invalidateQueries({ queryKey: ["planos"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <div>
      <PageHeader title="Planos" subtitle="Defina valores e frequência" />
      <div className="grid md:grid-cols-2 gap-4">
        {(data ?? []).map((p: any) => <PlanoCard key={p.id} plano={p} onSave={(v) => m.mutate({ ...v, id: p.id })} />)}
      </div>
    </div>
  );
}

function PlanoCard({ plano, onSave }: { plano: any; onSave: (v: any) => void }) {
  const [nome, setNome] = useState(plano.nome);
  const [freq, setFreq] = useState(plano.frequencia_semanal);
  const [valor, setValor] = useState(plano.valor);
  return (
    <div className="rounded-2xl border bg-card p-5 space-y-3">
      <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Freq. semanal</Label><Input type="number" min={1} max={7} value={freq} onChange={(e) => setFreq(Number(e.target.value))} /></div>
        <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(Number(e.target.value))} /></div>
      </div>
      <Button className="bg-primary hover:bg-primary/90" onClick={() => onSave({ nome, frequencia_semanal: freq, valor })}>Salvar</Button>
    </div>
  );
}
