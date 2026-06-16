import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listarAlunosProfessor, listarObservacoes, registrarObservacao,
  listarAparelhos, registrarFicha, alunosComPresencaHoje,
} from "@/lib/professor.functions";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/professor/observacoes")({ component: Obs });

function Obs() {
  return (
    <div>
      <PageHeader title="Observações & Evolução" subtitle="Anotações e ficha de evolução dos alunos" />
      <Tabs defaultValue="obs">
        <TabsList>
          <TabsTrigger value="obs">Observações</TabsTrigger>
          <TabsTrigger value="ficha">Ficha de evolução</TabsTrigger>
        </TabsList>
        <TabsContent value="obs" className="mt-4"><ObservacoesTab /></TabsContent>
        <TabsContent value="ficha" className="mt-4"><FichaTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ObservacoesTab() {
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
    <>
      <div className="rounded-2xl border bg-card p-5 mb-6 max-w-2xl">
        <Select value={alunoId} onValueChange={setAlunoId}>
          <SelectTrigger><SelectValue placeholder="Selecione um aluno" /></SelectTrigger>
          <SelectContent>
            {(alunos ?? []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.profile?.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Textarea className="mt-3" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva a evolução, lesões, recomendações..." />
        <Button className="mt-3 bg-primary hover:bg-primary/90" onClick={() => m.mutate()} disabled={!alunoId || !texto || m.isPending}>
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
    </>
  );
}

function FichaTab() {
  const fnAlunosHoje = useServerFn(alunosComPresencaHoje);
  const fnAparelhos = useServerFn(listarAparelhos);
  const fnNew = useServerFn(registrarFicha);
  const qc = useQueryClient();
  const { data: alunos } = useQuery({ queryKey: ["alunos-presenca-hoje"], queryFn: () => fnAlunosHoje() });
  const { data: aparelhos } = useQuery({ queryKey: ["aparelhos"], queryFn: () => fnAparelhos() });
  const [alunoId, setAlunoId] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exercicios, setExercicios] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const toggle = (nome: string) => {
    const s = new Set(selected);
    s.has(nome) ? s.delete(nome) : s.add(nome);
    setSelected(s);
  };

  const m = useMutation({
    mutationFn: () => fnNew({ data: { aluno_id: alunoId, data, aparelhos: Array.from(selected), exercicios, observacoes } }),
    onSuccess: () => {
      toast.success("Ficha registrada");
      setSelected(new Set()); setExercicios(""); setObservacoes("");
      qc.invalidateQueries({ queryKey: ["ficha-aluno"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <div className="rounded-2xl border bg-card p-5 max-w-3xl space-y-4">
      <p className="text-xs text-muted-foreground">A ficha é preenchida individualmente para cada aluno com presença confirmada hoje.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Aluno</Label>
          <Select value={alunoId} onValueChange={setAlunoId}>
            <SelectTrigger><SelectValue placeholder="Selecione (presença confirmada hoje)" /></SelectTrigger>
            <SelectContent>
              {(alunos ?? []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.profile?.nome}</SelectItem>)}
              {alunos && alunos.length === 0 && (
                <div className="p-2 text-xs text-muted-foreground">Nenhum aluno presente hoje ainda</div>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Data</Label>
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Aparelhos utilizados</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(aparelhos ?? []).map((ap: any) => (
            <label key={ap.id} className="flex items-center gap-2 rounded-lg border p-2 cursor-pointer">
              <Checkbox checked={selected.has(ap.nome)} onCheckedChange={() => toggle(ap.nome)} />
              <span className="text-sm">{ap.nome}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label>Exercícios realizados</Label>
        <Textarea rows={3} value={exercicios} onChange={(e) => setExercicios(e.target.value)} placeholder="Descreva os exercícios..." />
      </div>
      <div>
        <Label>Observações</Label>
        <Textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Evolução, ajustes, recomendações..." />
      </div>
      <Button className="bg-primary hover:bg-primary/90" disabled={!alunoId || m.isPending} onClick={() => m.mutate()}>
        {m.isPending ? "Salvando…" : "Salvar ficha"}
      </Button>
    </div>
  );
}
