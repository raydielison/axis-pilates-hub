import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  atualizarAluno, baixarAnexoAdmin, criarAluno, excluirAluno, excluirAlunoPermanente, excluirAnexoAluno,
  listarAlunosAdmin, listarAlunosExcluidos, listarAnexosAluno, listarPlanos,
  reativarAluno, seedAlunosIniciais, uploadAnexoAluno,
} from "@/lib/admin.functions";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paperclip, Pencil, Plus, RotateCcw, Trash2, Download, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/alunos")({ component: AlunosAdmin });

type Aluno = any;

function AlunosAdmin() {
  const fn = useServerFn(listarAlunosAdmin);
  const fnDel = useServerFn(listarAlunosExcluidos);
  const fnPlanos = useServerFn(listarPlanos);
  const fnNew = useServerFn(criarAluno);
  const fnSeed = useServerFn(seedAlunosIniciais);
  const fnExcluir = useServerFn(excluirAluno);
  const fnReativar = useServerFn(reativarAluno);
  const qc = useQueryClient();
  const { data: ativos } = useQuery({ queryKey: ["admin-alunos"], queryFn: () => fn() });
  const { data: excluidos } = useQuery({ queryKey: ["admin-alunos-excluidos"], queryFn: () => fnDel() });
  const { data: planos } = useQuery({ queryKey: ["planos"], queryFn: () => fnPlanos() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", cpf: "", telefone: "", endereco: "", plano_id: "", turno: "manha" as "manha" | "tarde_noite" });
  const [slots, setSlots] = useState<Array<{ dia_semana: number; hora: string }>>([]);
  const planoSel = (planos ?? []).find((p: any) => p.id === form.plano_id);
  const freq = planoSel?.frequencia_semanal ?? 0;

  const mNew = useMutation({
    mutationFn: () => fnNew({ data: { ...form, plano_id: form.plano_id || null, slots } as any }),
    onSuccess: (res: any) => {
      toast.success("Aluno criado", {
        description: `Senha padrão: ${res?.tempPassword ?? "axis1234"} — peça para o aluno alterá-la no primeiro acesso.`,
        duration: 15000,
      });
      qc.invalidateQueries({ queryKey: ["admin-alunos"] });
      setOpen(false);
      setForm({ nome: "", email: "", cpf: "", telefone: "", endereco: "", plano_id: "", turno: "manha" });
      setSlots([]);
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const mSeed = useMutation({
    mutationFn: () => fnSeed(),
    onSuccess: (res: any) => {
      const ok = res.results.filter((r: any) => r.ok).length;
      const fail = res.results.length - ok;
      toast.success(`Importação concluída: ${ok} criados, ${fail} falharam`, {
        description: fail ? res.results.filter((r: any) => !r.ok).map((r: any) => `${r.nome}: ${r.msg}`).join(" · ") : "Senha padrão: axis1234",
        duration: 20000,
      });
      qc.invalidateQueries({ queryKey: ["admin-alunos"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const mExcluir = useMutation({
    mutationFn: (aluno_id: string) => fnExcluir({ data: { aluno_id } }),
    onSuccess: () => {
      toast.success("Aluno excluído — pode ser reativado na aba Excluídos");
      qc.invalidateQueries({ queryKey: ["admin-alunos"] });
      qc.invalidateQueries({ queryKey: ["admin-alunos-excluidos"] });
    },
    onError: (e: Error) => toast.error("Erro ao excluir", { description: e.message }),
  });

  const mReativar = useMutation({
    mutationFn: (aluno_id: string) => fnReativar({ data: { aluno_id, status: "ativo" } }),
    onSuccess: () => {
      toast.success("Aluno reativado");
      qc.invalidateQueries({ queryKey: ["admin-alunos"] });
      qc.invalidateQueries({ queryKey: ["admin-alunos-excluidos"] });
    },
    onError: (e: Error) => toast.error("Erro ao reativar", { description: e.message }),
  });

  const fnPermDel = useServerFn(excluirAlunoPermanente);
  const mPermDel = useMutation({
    mutationFn: (aluno_id: string) => fnPermDel({ data: { aluno_id } }),
    onSuccess: () => {
      toast.success("Aluno excluído permanentemente");
      qc.invalidateQueries({ queryKey: ["admin-alunos-excluidos"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <div>
      <PageHeader
        title="Alunos"
        subtitle={`${ativos?.length ?? 0} ativos · ${excluidos?.length ?? 0} excluídos`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" disabled={mSeed.isPending} onClick={() => mSeed.mutate()}>
              {mSeed.isPending ? "Importando…" : "Importar lista inicial"}
            </Button>
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Plano</Label>
                      <Select value={form.plano_id} onValueChange={(v) => setForm({ ...form, plano_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {(planos ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome} — R$ {Number(p.valor).toFixed(2)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
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
                  </div>
                  {freq > 0 && (
                    <SlotsPicker
                      freq={freq}
                      turno={form.turno}
                      slots={slots}
                      onChange={setSlots}
                    />
                  )}
                  <Button className="w-full bg-primary hover:bg-primary/90"
                    disabled={mNew.isPending || (freq > 0 && slots.length !== freq)}
                    onClick={() => mNew.mutate()}>
                    {mNew.isPending ? "Criando…" : freq > 0 && slots.length !== freq ? `Selecione ${freq} horário(s)` : "Criar aluno"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        } />

      <Tabs defaultValue="ativos">
        <TabsList>
          <TabsTrigger value="ativos">Ativos ({ativos?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="excluidos">Excluídos ({excluidos?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="ativos" className="mt-4">
          <div className="rounded-2xl border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">E-mail</th>
                  <th className="text-left p-3">CPF</th>
                  <th className="text-left p-3">Plano</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(ativos ?? []).map((a: Aluno) => (
                  <tr key={a.id} className="border-t">
                    <td className="p-3 font-medium">{a.profile?.nome}</td>
                    <td className="p-3 text-muted-foreground">{a.profile?.email}</td>
                    <td className="p-3">{a.cpf ?? "—"}</td>
                    <td className="p-3">{a.plano?.nome ?? "—"}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${a.status === "ativo" ? "bg-green-100 text-green-800" : a.status === "suspenso" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>{a.status}</span></td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        <AnexosSheet aluno={a} />
                        <EditarAlunoDialog aluno={a} planos={planos ?? []} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={mExcluir.isPending}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir aluno?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {a.profile?.nome ?? "Este aluno"} será marcado como excluído e o login será bloqueado.
                                Os dados ficam preservados e podem ser reativados na aba Excluídos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => mExcluir.mutate(a.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="excluidos" className="mt-4">
          <div className="rounded-2xl border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">E-mail</th>
                  <th className="text-left p-3">CPF</th>
                  <th className="text-left p-3">Excluído em</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(excluidos ?? []).map((a: Aluno) => (
                  <tr key={a.id} className="border-t">
                    <td className="p-3 font-medium">{a.profile?.nome}</td>
                    <td className="p-3 text-muted-foreground">{a.profile?.email}</td>
                    <td className="p-3">{a.cpf ?? "—"}</td>
                    <td className="p-3">{a.deleted_at ? new Date(a.deleted_at).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        <AnexosSheet aluno={a} />
                        <EditarAlunoDialog aluno={a} planos={planos ?? []} />
                        <Button variant="outline" size="sm" disabled={mReativar.isPending} onClick={() => mReativar.mutate(a.id)}>
                          <RotateCcw className="h-4 w-4 mr-1" />Reativar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={mPermDel.isPending}>
                              <Trash2 className="h-4 w-4 mr-1" />Excluir permanente
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir {a.profile?.nome} permanentemente?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação remove TODOS os dados do aluno: cadastro, anexos, presenças, pagamentos, horários e login.
                                Não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => mPermDel.mutate(a.id)}>
                                Excluir permanentemente
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
                {!excluidos?.length && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground text-sm">Nenhum aluno excluído</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EditarAlunoDialog({ aluno, planos }: { aluno: any; planos: any[] }) {
  const fnSave = useServerFn(atualizarAluno);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    nome: aluno.profile?.nome ?? "",
    email: aluno.profile?.email ?? "",
    telefone: aluno.profile?.telefone ?? "",
    endereco: aluno.profile?.endereco ?? "",
    contato_emergencia: aluno.profile?.contato_emergencia ?? "",
    cpf: aluno.cpf ?? "",
    plano_id: aluno.plano_id ?? "",
    status: aluno.status === "excluido" ? "ativo" : aluno.status,
    turno: aluno.turno ?? "manha",
  });

  const m = useMutation({
    mutationFn: () => fnSave({ data: { aluno_id: aluno.id, ...f, plano_id: f.plano_id || null } as any }),
    onSuccess: () => {
      toast.success("Aluno atualizado");
      qc.invalidateQueries({ queryKey: ["admin-alunos"] });
      qc.invalidateQueries({ queryKey: ["admin-alunos-excluidos"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar aluno</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          <div><Label>E-mail</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>CPF</Label><Input value={f.cpf} onChange={(e) => setF({ ...f, cpf: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} /></div>
          </div>
          <div><Label>Endereço</Label><Input value={f.endereco} onChange={(e) => setF({ ...f, endereco: e.target.value })} /></div>
          <div><Label>Contato de emergência</Label><Input value={f.contato_emergencia} onChange={(e) => setF({ ...f, contato_emergencia: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Plano</Label>
              <Select value={f.plano_id} onValueChange={(v) => setF({ ...f, plano_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {planos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
            {m.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AnexosSheet({ aluno }: { aluno: any }) {
  const [open, setOpen] = useState(false);
  const fnList = useServerFn(listarAnexosAluno);
  const fnUp = useServerFn(uploadAnexoAluno);
  const fnDel = useServerFn(excluirAnexoAluno);
  const fnBaixar = useServerFn(baixarAnexoAdmin);
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: anexos } = useQuery({
    queryKey: ["aluno-anexos", aluno.id],
    queryFn: () => fnList({ data: { aluno_id: aluno.id } }),
    enabled: open,
  });

  const mUp = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 25 * 1024 * 1024) throw new Error("Arquivo acima de 25MB");
      const buf = await file.arrayBuffer();
      let s = ""; const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
      const b64 = btoa(s);
      return fnUp({ data: { aluno_id: aluno.id, file_name: file.name, mime_type: file.type, file_b64: b64 } });
    },
    onSuccess: () => {
      toast.success("Arquivo enviado");
      qc.invalidateQueries({ queryKey: ["aluno-anexos", aluno.id] });
    },
    onError: (e: Error) => toast.error("Erro no upload", { description: e.message }),
  });

  const mDel = useMutation({
    mutationFn: (anexo_id: string) => fnDel({ data: { anexo_id } }),
    onSuccess: () => {
      toast.success("Anexo removido");
      qc.invalidateQueries({ queryKey: ["aluno-anexos", aluno.id] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const baixar = async (anexo_id: string) => {
    try {
      const r = await fnBaixar({ data: { anexo_id } });
      window.open(r.url, "_blank");
    } catch (e: any) { toast.error("Erro", { description: e.message }); }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button variant="ghost" size="sm"><Paperclip className="h-4 w-4" /></Button></SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Anexos · {aluno.profile?.nome}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) mUp.mutate(f); e.target.value = ""; }}
            />
            <Button className="w-full" disabled={mUp.isPending} onClick={() => inputRef.current?.click()}>
              <Paperclip className="h-4 w-4 mr-2" />
              {mUp.isPending ? "Enviando…" : "Anexar arquivo (até 25MB)"}
            </Button>
          </div>
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
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => mDel.mutate(a.id)}><X className="h-4 w-4" /></Button>
              </div>
            ))}
            {!anexos?.length && (
              <p className="text-center text-sm text-muted-foreground py-6">Nenhum arquivo anexado</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
