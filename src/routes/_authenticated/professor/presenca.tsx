import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { alunosDoSlot, marcarPresenca } from "@/lib/professor.functions";
import { PageHeader } from "@/components/ui-helpers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/professor/presenca")({ component: Presenca });

const HORAS = ["07:00","08:00","09:00","10:00","16:00","17:00","18:00","19:00","20:00","21:00"];
const OPCOES = [
  { key: "presente", label: "Presente", icon: CheckCircle2, color: "bg-green-500 hover:bg-green-600" },
  { key: "falta_justificada", label: "Falta just.", icon: AlertTriangle, color: "bg-amber-500 hover:bg-amber-600" },
  { key: "falta_nao_justificada", label: "Falta", icon: XCircle, color: "bg-red-500 hover:bg-red-600" },
  { key: "reposicao", label: "Reposição", icon: RotateCcw, color: "bg-blue-500 hover:bg-blue-600" },
] as const;

function Presenca() {
  const fnSlot = useServerFn(alunosDoSlot);
  const fnMarcar = useServerFn(marcarPresenca);
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState("07:00");

  const { data: alunos } = useQuery({
    queryKey: ["slot-alunos", date, hora],
    queryFn: () => fnSlot({ data: { data: date, hora } }),
  });

  const m = useMutation({
    mutationFn: (p: { aluno_id: string; status: any }) =>
      fnMarcar({ data: { aluno_id: p.aluno_id, status: p.status, data: date, hora } }),
    onSuccess: () => {
      toast.success("Presença registrada");
      qc.invalidateQueries({ queryKey: ["slot-alunos", date, hora] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <div>
      <PageHeader title="Registrar Presença" subtitle="Selecione data e hora — só aparecem os alunos da aula" />
      <div className="rounded-2xl border bg-card p-4 mb-6 grid grid-cols-2 gap-3 max-w-md">
        <div><Label className="text-xs">Data</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div>
          <Label className="text-xs">Hora</Label>
          <Select value={hora} onValueChange={setHora}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {HORAS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        {(alunos ?? []).map((a: any) => (
          <div key={a.id} className="rounded-xl border bg-card p-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{a.profile?.nome}</p>
              <p className="text-xs text-muted-foreground truncate">{a.plano?.nome ?? "—"}</p>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {OPCOES.map((o) => (
                <Button
                  key={o.key}
                  size="sm"
                  disabled={m.isPending}
                  onClick={() => m.mutate({ aluno_id: a.id, status: o.key })}
                  className={`${o.color} text-white text-xs h-9`}
                  title={o.label}
                >
                  <o.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>
        ))}
        {alunos && alunos.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">
            Nenhum aluno agendado para {hora} neste dia (ou já tiveram presença registrada).
          </p>
        )}
      </div>
    </div>
  );
}
