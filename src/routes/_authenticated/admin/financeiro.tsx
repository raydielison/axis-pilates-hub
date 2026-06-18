import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeiroMes, registrarPagamento, dadosReciboAdmin } from "@/lib/admin.functions";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { Download, CreditCard } from "lucide-react";
import { gerarReciboPDF } from "@/lib/recibo";

export const Route = createFileRoute("/_authenticated/admin/financeiro")({ component: Fin });

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const CLS: Record<string, string> = {
  pago: "bg-green-100 text-green-800",
  pendente: "bg-amber-100 text-amber-800",
  atrasado: "bg-red-100 text-red-800",
};

function Fin() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);

  const fn = useServerFn(financeiroMes);
  const { data, isFetching } = useQuery({
    queryKey: ["admin-fin-mes", ano, mes],
    queryFn: () => fn({ data: { ano, mes } }),
  });
  const linhas = (data?.linhas ?? []) as any[];

  const totalPago = linhas.filter(l => l.status === "pago").reduce((s, l) => s + Number(l.valor), 0);
  const totalAberto = linhas.filter(l => l.status !== "pago").reduce((s, l) => s + Number(l.valor), 0);

  const anos = Array.from({ length: 5 }).map((_, i) => hoje.getFullYear() - 2 + i);

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle={`${linhas.length} alunos · pago R$ ${totalPago.toFixed(2)} · em aberto R$ ${totalAberto.toFixed(2)}`}
        action={
          <div className="flex items-center gap-2">
            <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="rounded-2xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left p-3">Aluno</th>
              <th className="text-left p-3">Plano</th>
              <th className="text-left p-3">Valor</th>
              <th className="text-left p-3">Vencimento</th>
              <th className="text-left p-3">Forma</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <LinhaFin key={l.aluno_id} l={l} ano={ano} mes={mes} />
            ))}
            {linhas.length === 0 && !isFetching && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground text-sm">Nenhum aluno encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LinhaFin({ l, ano, mes }: { l: any; ano: number; mes: number }) {
  const fnReg = useServerFn(registrarPagamento);
  const fnRec = useServerFn(dadosReciboAdmin);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [forma, setForma] = useState<"pix"|"cartao"|"dinheiro">("pix");

  const m = useMutation({
    mutationFn: () => fnReg({
      data: {
        forma,
        ...(l.pagamento_id
          ? { pagamento_id: l.pagamento_id }
          : { aluno_id: l.aluno_id, mes_referencia: l.mes_referencia }),
      },
    }),
    onSuccess: () => {
      toast.success("Pagamento registrado");
      qc.invalidateQueries({ queryKey: ["admin-fin-mes", ano, mes] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const baixarRecibo = async () => {
    if (!l.pagamento_id) return;
    try {
      const d = await fnRec({ data: { pagamento_id: l.pagamento_id } });
      await gerarReciboPDF({
        recibo_id: d.recibo_id,
        aluno_nome: d.aluno_nome,
        aluno_email: d.aluno_email,
        plano_nome: l.plano?.nome ?? null,
        mes_referencia: d.mes_referencia,
        valor: Number(d.valor),
        data_pagamento: d.data_pagamento,
        forma: d.forma,
        professor_nome: d.professor_nome,
        crefito: d.crefito,
      });
    } catch (e: any) { toast.error("Erro ao gerar recibo", { description: e.message }); }
  };

  return (
    <tr className="border-t">
      <td className="p-3 font-medium">{l.aluno_nome}</td>
      <td className="p-3">{l.plano?.nome ?? "—"}</td>
      <td className="p-3 font-medium">R$ {Number(l.valor).toFixed(2)}</td>
      <td className="p-3">{new Date(l.data_vencimento).toLocaleDateString("pt-BR")}</td>
      <td className="p-3 capitalize">{l.forma ?? "—"}</td>
      <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${CLS[l.status]}`}>{l.status}</span></td>
      <td className="p-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {l.status === "pago" ? (
            <Button size="sm" variant="outline" onClick={baixarRecibo}><Download className="h-3.5 w-3.5 mr-1" />Recibo</Button>
          ) : (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary hover:bg-primary/90"><CreditCard className="h-3.5 w-3.5 mr-1" />Registrar</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Registrar pagamento</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm"><strong>{l.aluno_nome}</strong> · {new Date(l.mes_referencia).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p>
                  <p className="text-sm text-muted-foreground">Valor: R$ {Number(l.valor).toFixed(2)}</p>
                  <div>
                    <Label>Forma de pagamento</Label>
                    <Select value={forma} onValueChange={(v: any) => setForma(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="cartao">Cartão</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full bg-primary hover:bg-primary/90" disabled={m.isPending} onClick={() => m.mutate()}>
                    {m.isPending ? "Salvando…" : "Confirmar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </td>
    </tr>
  );
}
