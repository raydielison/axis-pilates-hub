import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { atualizarPerfil } from "@/lib/aluno.functions";
import { getMyProfile } from "@/lib/auth.functions";
import { PageHeader } from "@/components/ui-helpers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/aluno/perfil")({ component: Perfil });

function Perfil() {
  const fnProfile = useServerFn(getMyProfile);
  const fnSave = useServerFn(atualizarPerfil);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["my-profile"], queryFn: () => fnProfile() });
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

  return (
    <div>
      <PageHeader title="Meu Perfil" subtitle={profile?.nome} />
      <div className="rounded-2xl border bg-card p-6 max-w-2xl space-y-4">
        <div>
          <Label>Nome</Label>
          <Input value={profile?.nome ?? ""} disabled />
        </div>
        <div>
          <Label>E-mail</Label>
          <Input value={profile?.email ?? ""} disabled />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="(11) 99999-0000" />
        </div>
        <div>
          <Label>Endereço</Label>
          <Input value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div>
          <Label>Contato de emergência</Label>
          <Input value={emerg} onChange={(e) => setEmerg(e.target.value)} placeholder="Nome e telefone" />
        </div>
        <Button onClick={() => m.mutate()} disabled={m.isPending} className="bg-orange-500 hover:bg-orange-600">
          {m.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
