import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { criarAluno, listarAlunosAdmin, listarPlanos } from "@/lib/admin.functions";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/alunos")({ component: AlunosAdmin });

function AlunosAdmin() {
  const fn = useServerFn(listarAlunosAdmin);
  const fnPlanos = useServerFn(listarPlanos);
  const fnNew = useServerFn(criarAluno);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-alunos"], queryFn: () => fn() });
  const { data: planos } = useQuery({ queryKey: ["planos"], queryFn: () => fnPlanos() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", cpf: "", telefone: "", endereco: "", plano_id: "" });

  const m = useMutation({
    mutationFn: () => fnNew({ data: { ...form, plano_id: form.plano_id || null } as any }),
    onSuccess: (res: any) => {
      toast.success("Aluno criado", {
        description: `Senha temporária: ${res?.tempPassword ?? "(enviada)"} — peça para o aluno alterá-la no primeiro acesso.`,
        duration: 15000,
      });
      qc.invalidateQueries({ queryKey: ["admin-alunos"] });
      setOpen(false);
      setForm({ nome: "", email: "", cpf: "", telefone: "", endereco: "", plano_id: "" });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <div>
      <PageHeader title="Alunos" subtitle={`${data?.length ?? 0} alunos cadastrados`}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-1" />Novo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Cadastrar aluno</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>CPF</Label><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
                  <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
                </div>
                <div><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
                <div>
                  <Label>Plano</Label>
                  <Select value={form.plano_id} onValueChange={(v) => setForm({ ...form, plano_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(planos ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome} — R$ {Number(p.valor).toFixed(2)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full bg-primary hover:bg-primary/90" disabled={m.isPending} onClick={() => m.mutate()}>
                  {m.isPending ? "Criando…" : "Criar aluno"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        } />

      <div className="rounded-2xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left p-3">Nome</th><th className="text-left p-3">E-mail</th><th className="text-left p-3">CPF</th><th className="text-left p-3">Plano</th><th className="text-left p-3">Status</th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((a: any) => (
              <tr key={a.id} className="border-t">
                <td className="p-3 font-medium">{a.profile?.nome}</td>
                <td className="p-3 text-muted-foreground">{a.profile?.email}</td>
                <td className="p-3">{a.cpf ?? "—"}</td>
                <td className="p-3">{a.plano?.nome ?? "—"}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${a.status === "ativo" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
