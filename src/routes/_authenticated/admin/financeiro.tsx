import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listarPagamentos, registrarPagamento } from "@/lib/admin.functions";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/financeiro")({ component: Fin });

const CLS: Record<string, string> = {
  pago: "bg-green-100 text-green-800",
  pendente: "bg-amber-100 text-amber-800",
  atrasado: "bg-red-100 text-red-800",
};

function Fin() {
  const fn = useServerFn(listarPagamentos);
  const fnReg = useServerFn(registrarPagamento);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-pagamentos"], queryFn: () => fn() });
  const [forma, setForma] = useState<"pix"|"cartao"|"dinheiro">("pix");
  const m = useMutation({
    mutationFn: (id: string) => fnReg({ data: { pagamento_id: id, forma } }),
    onSuccess: () => { toast.success("Pagamento registrado"); qc.invalidateQueries({ queryKey: ["admin-pagamentos"] }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Controle de pagamentos e inadimplência"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Forma:</span>
            <Select value={forma} onValueChange={(v: any) => setForma(v)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        } />
      <div className="rounded-2xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left p-3">Aluno</th><th className="text-left p-3">Mês ref.</th>
              <th className="text-left p-3">Vencimento</th><th className="text-left p-3">Valor</th>
              <th className="text-left p-3">Forma</th><th className="text-left p-3">Status</th>
              <th className="text-right p-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((p: any) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium">{p.aluno?.profile?.nome}</td>
                <td className="p-3">{new Date(p.mes_referencia).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</td>
                <td className="p-3">{new Date(p.data_vencimento).toLocaleDateString("pt-BR")}</td>
                <td className="p-3 font-medium">R$ {Number(p.valor).toFixed(2)}</td>
                <td className="p-3 capitalize">{p.forma ?? "—"}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${CLS[p.status]}`}>{p.status}</span></td>
                <td className="p-3 text-right">
                  {p.status !== "pago" && (
                    <Button size="sm" disabled={m.isPending} className="bg-primary hover:bg-primary/90" onClick={() => m.mutate(p.id)}>
                      Registrar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
