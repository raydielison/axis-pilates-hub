import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { criarProfessor, listarProfessoresAdmin } from "@/lib/admin.functions";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/professores")({ component: ProfsAdmin });

function ProfsAdmin() {
  const fn = useServerFn(listarProfessoresAdmin);
  const fnNew = useServerFn(criarProfessor);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-profs"], queryFn: () => fn() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", turno: "manha" as "manha" | "tarde" | "noite" });

  const m = useMutation({
    mutationFn: () => fnNew({ data: form }),
    onSuccess: () => { toast.success("Professor criado (senha axis1234)"); qc.invalidateQueries({ queryKey: ["admin-profs"] }); setOpen(false); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <div>
      <PageHeader title="Professores" subtitle={`${data?.length ?? 0} cadastrados`}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-orange-500 hover:bg-orange-600"><Plus className="h-4 w-4 mr-1" />Novo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Cadastrar professor</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
                <div>
                  <Label>Turno</Label>
                  <Select value={form.turno} onValueChange={(v: any) => setForm({ ...form, turno: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manha">Manhã</SelectItem>
                      <SelectItem value="tarde">Tarde</SelectItem>
                      <SelectItem value="noite">Noite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full bg-orange-500 hover:bg-orange-600" disabled={m.isPending} onClick={() => m.mutate()}>
                  {m.isPending ? "Criando…" : "Criar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        } />
      <div className="grid md:grid-cols-2 gap-3">
        {(data ?? []).map((p: any) => (
          <div key={p.id} className="rounded-2xl border bg-card p-4">
            <p className="font-display font-semibold">{p.profile?.nome}</p>
            <p className="text-xs text-muted-foreground">{p.profile?.email}</p>
            <p className="text-xs mt-1">Turno: <span className="capitalize">{p.turno}</span> · {p.profile?.telefone ?? "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
