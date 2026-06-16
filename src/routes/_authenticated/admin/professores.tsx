import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  criarProfessor, listarProfessoresAdmin, atualizarProfessor,
  redefinirSenhaProfessor, excluirProfessor, reativarProfessor,
} from "@/lib/admin.functions";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, KeyRound, Trash2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/professores")({ component: ProfsAdmin });

const TURNO_LABEL: Record<string, string> = { manha: "Manhã", tarde_noite: "Tarde/Noite" };

function ProfsAdmin() {
  const fn = useServerFn(listarProfessoresAdmin);
  const fnNew = useServerFn(criarProfessor);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-profs"], queryFn: () => fn() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", endereco: "", crefito: "", turno: "manha" as "manha" | "tarde_noite" });

  const m = useMutation({
    mutationFn: () => fnNew({ data: form }),
    onSuccess: (res: any) => {
      toast.success("Professor criado", {
        description: `Senha temporária: ${res?.tempPassword ?? "(enviada)"} — peça para o professor alterá-la no primeiro acesso.`,
        duration: 15000,
      });
      qc.invalidateQueries({ queryKey: ["admin-profs"] });
      setOpen(false);
      setForm({ nome: "", email: "", telefone: "", endereco: "", crefito: "", turno: "manha" });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <div>
      <PageHeader title="Professores" subtitle={`${data?.length ?? 0} cadastrados`}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-1" />Novo</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Cadastrar professor</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome completo</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                <div><Label>E-mail (login)</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
                  <div><Label>CREFITO</Label><Input value={form.crefito} onChange={(e) => setForm({ ...form, crefito: e.target.value })} /></div>
                </div>
                <div><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
                <div>
                  <Label>Turno</Label>
                  <Select value={form.turno} onValueChange={(v: any) => setForm({ ...form, turno: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manha">Manhã</SelectItem>
                      <SelectItem value="tarde_noite">Tarde/Noite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full bg-primary hover:bg-primary/90" disabled={m.isPending} onClick={() => m.mutate()}>
                  {m.isPending ? "Criando…" : "Criar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        } />
      <div className="grid md:grid-cols-2 gap-3">
        {(data ?? []).map((p: any) => (
          <div key={p.id} className="rounded-2xl border bg-card p-4">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="font-display font-semibold">{p.profile?.nome}</p>
                <p className="text-xs text-muted-foreground truncate">{p.profile?.email}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.ativo ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
                {p.ativo ? "ativo" : "inativo"}
              </span>
            </div>
            <div className="text-xs mt-2 space-y-0.5">
              <p>Turno: <span className="font-medium">{TURNO_LABEL[p.turno] ?? p.turno}</span></p>
              <p>Telefone: {p.profile?.telefone ?? "—"}</p>
              <p>CREFITO: {p.crefito ?? "—"}</p>
              <p className="truncate">Endereço: {p.profile?.endereco ?? "—"}</p>
            </div>
            <div className="flex gap-1 mt-3 flex-wrap">
              <EditarDialog prof={p} />
              <SenhaDialog prof={p} />
              {p.ativo ? <ExcluirBtn prof={p} /> : <ReativarBtn prof={p} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditarDialog({ prof }: { prof: any }) {
  const fn = useServerFn(atualizarProfessor);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    nome: prof.profile?.nome ?? "",
    email: prof.profile?.email ?? "",
    telefone: prof.profile?.telefone ?? "",
    endereco: prof.profile?.endereco ?? "",
    crefito: prof.crefito ?? "",
    turno: prof.turno ?? "manha",
  });
  const m = useMutation({
    mutationFn: () => fn({ data: { professor_id: prof.id, ...f } as any }),
    onSuccess: () => { toast.success("Professor atualizado"); qc.invalidateQueries({ queryKey: ["admin-profs"] }); setOpen(false); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Pencil className="h-3.5 w-3.5 mr-1" />Editar</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar professor</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome completo</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          <div><Label>E-mail (login)</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Telefone</Label><Input value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} /></div>
            <div><Label>CREFITO</Label><Input value={f.crefito} onChange={(e) => setF({ ...f, crefito: e.target.value })} /></div>
          </div>
          <div><Label>Endereço</Label><Input value={f.endereco} onChange={(e) => setF({ ...f, endereco: e.target.value })} /></div>
          <div>
            <Label>Turno</Label>
            <Select value={f.turno} onValueChange={(v: any) => setF({ ...f, turno: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manha">Manhã</SelectItem>
                <SelectItem value="tarde_noite">Tarde/Noite</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full bg-primary hover:bg-primary/90" disabled={m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SenhaDialog({ prof }: { prof: any }) {
  const fn = useServerFn(redefinirSenhaProfessor);
  const [open, setOpen] = useState(false);
  const [senha, setSenha] = useState("");
  const m = useMutation({
    mutationFn: () => fn({ data: { professor_id: prof.id, nova_senha: senha } }),
    onSuccess: () => { toast.success("Senha redefinida"); setSenha(""); setOpen(false); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><KeyRound className="h-3.5 w-3.5 mr-1" />Senha</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Redefinir senha · {prof.profile?.nome}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Label>Nova senha (mínimo 6 caracteres)</Label>
          <Input type="text" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Nova senha" />
          <Button className="w-full bg-primary hover:bg-primary/90" disabled={senha.length < 6 || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Salvando…" : "Definir nova senha"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExcluirBtn({ prof }: { prof: any }) {
  const fn = useServerFn(excluirProfessor);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => fn({ data: { professor_id: prof.id } }),
    onSuccess: () => { toast.success("Professor desativado"); qc.invalidateQueries({ queryKey: ["admin-profs"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-3.5 w-3.5 mr-1" />Excluir</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desativar professor?</AlertDialogTitle>
          <AlertDialogDescription>{prof.profile?.nome} terá o login bloqueado. Os dados ficam preservados.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => m.mutate()}>Desativar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReativarBtn({ prof }: { prof: any }) {
  const fn = useServerFn(reativarProfessor);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => fn({ data: { professor_id: prof.id } }),
    onSuccess: () => { toast.success("Professor reativado"); qc.invalidateQueries({ queryKey: ["admin-profs"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });
  return (
    <Button variant="outline" size="sm" disabled={m.isPending} onClick={() => m.mutate()}>
      <RotateCcw className="h-3.5 w-3.5 mr-1" />Reativar
    </Button>
  );
}
