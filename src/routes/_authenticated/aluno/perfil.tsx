import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { atualizarPerfil, baixarMeuAnexo, meusAnexos, minhasFichas } from "@/lib/aluno.functions";
import { getMyProfile } from "@/lib/auth.functions";
import { PageHeader } from "@/components/ui-helpers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download, Paperclip } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/aluno/perfil")({ component: Perfil });

function Perfil() {
  const fnProfile = useServerFn(getMyProfile);
  const fnSave = useServerFn(atualizarPerfil);
  const fnAnexos = useServerFn(meusAnexos);
  const fnBaixar = useServerFn(baixarMeuAnexo);
  const fnFichas = useServerFn(minhasFichas);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["my-profile"], queryFn: () => fnProfile() });
  const { data: anexos } = useQuery({ queryKey: ["meus-anexos"], queryFn: () => fnAnexos() });
  const { data: fichas } = useQuery({ queryKey: ["minhas-fichas"], queryFn: () => fnFichas() });
  const [tel, setTel] = useState("");
  const [end, setEnd] = useState("");
  const [emerg, setEmerg] = useState("");
  const profile = data?.profile as any;

  useEffect(() => {
    if (profile) { setTel(profile.telefone ?? ""); setEnd(profile.endereco ?? ""); setEmerg(profile.contato_emergencia ?? ""); }
  }, [profile]);

  const m = useMutation({
    mutationFn: () => fnSave({ data: { telefone: tel, endereco: end, contato_emergencia: emerg } }),
    onSuccess: () => { toast.success("Perfil atualizado"); qc.invalidateQueries({ queryKey: ["my-profile"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const baixar = async (anexo_id: string) => {
    try {
      const r = await fnBaixar({ data: { anexo_id } });
      window.open(r.url, "_blank");
    } catch (e: any) { toast.error("Erro", { description: e.message }); }
  };

  return (
    <div>
      <PageHeader title="Meu Perfil" subtitle={profile?.nome} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <div><Label>Nome</Label><Input value={profile?.nome ?? ""} disabled /></div>
          <div><Label>E-mail</Label><Input value={profile?.email ?? ""} disabled /></div>
          <div><Label>Telefone</Label><Input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="(11) 99999-0000" /></div>
          <div><Label>Endereço</Label><Input value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          <div><Label>Contato de emergência</Label><Input value={emerg} onChange={(e) => setEmerg(e.target.value)} placeholder="Nome e telefone" /></div>
          <Button onClick={() => m.mutate()} disabled={m.isPending} className="bg-primary hover:bg-primary/90">
            {m.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>

        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display font-semibold">Meus documentos</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Arquivos anexados pela secretaria. Para enviar novos documentos, fale com a administração.</p>
          <div className="space-y-2">
            {(anexos ?? []).map((a: any) => (
              <div key={a.id} className="flex items-center gap-2 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{a.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.size_bytes ? `${(a.size_bytes / 1024).toFixed(0)} KB` : ""} · {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => baixar(a.id)}><Download className="h-4 w-4" /></Button>
              </div>
            ))}
            {!anexos?.length && (
              <p className="text-center text-sm text-muted-foreground py-6">Nenhum documento</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
