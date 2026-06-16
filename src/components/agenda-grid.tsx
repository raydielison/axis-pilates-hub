import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { listarAlunosProfessor } from "@/lib/professor.functions";
import { upsertHorarioFixo, removerHorarioFixo } from "@/lib/admin.functions";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const HORAS = ["07:00","08:00","09:00","10:00","16:00","17:00","18:00","19:00","20:00","21:00"];

type HF = { id: string; dia_semana: number; hora: string; aluno?: { id: string; profile?: { nome: string }; turno?: string } };

export function AgendaGrid({
  horarios,
  invalidateKeys,
  editable = false,
}: {
  horarios: HF[];
  invalidateKeys: string[][];
  editable?: boolean;
}) {
  const qc = useQueryClient();
  const grid: Record<string, HF[]> = {};
  for (const h of horarios ?? []) {
    const k = `${h.dia_semana}-${String(h.hora).slice(0, 5)}`;
    if (!grid[k]) grid[k] = [];
    grid[k].push(h);
  }

  const invalidate = () => {
    invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
  };

  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full text-xs md:text-sm min-w-[640px]">
        <thead className="bg-muted">
          <tr>
            <th className="p-2 text-left w-20">Hora</th>
            {DIAS.map((d) => <th key={d} className="p-2 text-left">{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {HORAS.map((h) => (
            <tr key={h} className="border-t">
              <td className="p-2 font-mono text-muted-foreground">{h}</td>
              {DIAS.map((_, i) => {
                const dia = i + 1;
                const k = `${dia}-${h}`;
                const arr = grid[k] ?? [];
                const ratio = arr.length / 4;
                return (
                  <td key={i} className="p-1 align-top">
                    <div className={`rounded-lg p-1.5 border min-h-[68px] ${ratio >= 1 ? "bg-red-500/10 border-red-500/30" : ratio >= 0.5 ? "bg-primary/10 border-primary/30" : "bg-green-500/10 border-green-500/30"}`}>
                      <p className="text-[10px] uppercase font-semibold mb-1">{arr.length}/4</p>
                      {arr.map((a) => (
                        <div key={a.id} className="flex items-center gap-1 text-[11px] truncate">
                          <span className="truncate flex-1">{a.aluno?.profile?.nome?.split(" ")[0] ?? "—"}</span>
                          {editable && <RemoveBtn id={a.id} onDone={invalidate} />}
                        </div>
                      ))}
                      {editable && arr.length < 4 && (
                        <AddDialog dia={dia} hora={h} onDone={invalidate} />
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RemoveBtn({ id, onDone }: { id: string; onDone: () => void }) {
  const fn = useServerFn(removerHorarioFixo);
  const m = useMutation({
    mutationFn: () => fn({ data: { horario_id: id } }),
    onSuccess: () => { toast.success("Removido"); onDone(); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });
  return (
    <button onClick={() => m.mutate()} className="opacity-60 hover:opacity-100" title="Remover">
      <X className="h-3 w-3" />
    </button>
  );
}

function AddDialog({ dia, hora, onDone }: { dia: number; hora: string; onDone: () => void }) {
  const fnAlunos = useServerFn(listarAlunosProfessor);
  const fnAdd = useServerFn(upsertHorarioFixo);
  const [open, setOpen] = useState(false);
  const [alunoId, setAlunoId] = useState("");
  const { data: alunos } = useQuery({ queryKey: ["prof-alunos"], queryFn: () => fnAlunos(), enabled: open });

  const m = useMutation({
    mutationFn: () => fnAdd({ data: { aluno_id: alunoId, dia_semana: dia, hora } }),
    onSuccess: () => { toast.success("Aluno adicionado"); setOpen(false); setAlunoId(""); onDone(); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 mt-0.5">
          <Plus className="h-3 w-3" /> add
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Adicionar aluno · {hora}</DialogTitle></DialogHeader>
        <Select value={alunoId} onValueChange={setAlunoId}>
          <SelectTrigger><SelectValue placeholder="Selecione um aluno" /></SelectTrigger>
          <SelectContent>
            {(alunos ?? []).map((a: any) => (
              <SelectItem key={a.id} value={a.id}>{a.profile?.nome} ({a.turno === "manha" ? "manhã" : "tarde/noite"})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="w-full bg-primary hover:bg-primary/90" disabled={!alunoId || m.isPending} onClick={() => m.mutate()}>
          {m.isPending ? "Adicionando…" : "Adicionar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
