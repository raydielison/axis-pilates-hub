import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { listarAlunosProfessor, listarAnexosProfessor, uploadAnexoProfessor, baixarAnexoProfessor } from "@/lib/professor.functions";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Download, Paperclip } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/professor/alunos")({ component: Alunos });

function Alunos() {
  const fn = useServerFn(listarAlunosProfessor);
  const { data } = useQuery({ queryKey: ["prof-alunos"], queryFn: () => fn() });
  return (
    <div>
      <PageHeader title="Alunos" subtitle={`${data?.length ?? 0} alunos do seu turno`} />
      <div className="grid md:grid-cols-2 gap-3">
        {(data ?? []).map((a: any) => (
          <div key={a.id} className="rounded-2xl border bg-card p-4">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <p className="font-display font-semibold truncate">{a.profile?.nome}</p>
                <p className="text-xs text-muted-foreground truncate">{a.profile?.email}</p>
                <p className="text-xs mt-1">{a.profile?.telefone ?? "—"}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${a.status === "ativo" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{a.status}</span>
                <AnexosSheet aluno={a} />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t flex justify-between text-xs">
              <span className="text-muted-foreground">Plano</span>
              <span className="font-medium">{a.plano?.nome ?? "—"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnexosSheet({ aluno }: { aluno: any }) {
  const [open, setOpen] = useState(false);
  const fnList = useServerFn(listarAnexosProfessor);
  const fnUp = useServerFn(uploadAnexoProfessor);
  const fnBaixar = useServerFn(baixarAnexoProfessor);
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: anexos } = useQuery({
    queryKey: ["prof-anexos", aluno.id],
    queryFn: () => fnList({ data: { aluno_id: aluno.id } }),
    enabled: open,
  });

  const mUp = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 25 * 1024 * 1024) throw new Error("Arquivo acima de 25MB");
      const buf = await file.arrayBuffer();
      let s = ""; const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
      return fnUp({ data: { aluno_id: aluno.id, file_name: file.name, mime_type: file.type, file_b64: btoa(s) } });
    },
    onSuccess: () => { toast.success("Arquivo enviado"); qc.invalidateQueries({ queryKey: ["prof-anexos", aluno.id] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const baixar = async (anexo_id: string) => {
    try { const r = await fnBaixar({ data: { anexo_id } }); window.open(r.url, "_blank"); }
    catch (e: any) { toast.error("Erro", { description: e.message }); }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button variant="ghost" size="sm" className="h-7 px-2"><Paperclip className="h-3.5 w-3.5" /></Button></SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>Anexos · {aluno.profile?.nome}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <input
            ref={inputRef} type="file" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) mUp.mutate(f); e.target.value = ""; }}
          />
          <Button className="w-full" disabled={mUp.isPending} onClick={() => inputRef.current?.click()}>
            <Paperclip className="h-4 w-4 mr-2" />
            {mUp.isPending ? "Enviando…" : "Anexar arquivo (até 25MB)"}
          </Button>
          <p className="text-xs text-muted-foreground">Você pode visualizar e adicionar arquivos. A exclusão é feita pela administração.</p>
          <div className="space-y-2">
            {(anexos ?? []).map((a: any) => (
              <div key={a.id} className="flex items-center gap-2 rounded-lg border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{a.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.size_bytes ? `${(a.size_bytes / 1024).toFixed(0)} KB` : ""} · {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => baixar(a.id)}><Download className="h-4 w-4" /></Button>
              </div>
            ))}
            {!anexos?.length && <p className="text-center text-sm text-muted-foreground py-6">Nenhum arquivo anexado</p>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
