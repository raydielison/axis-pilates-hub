import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { meuFinanceiro } from "@/lib/aluno.functions";
import { PageHeader, KPICard } from "@/components/ui-helpers";

export const Route = createFileRoute("/_authenticated/aluno/financeiro")({ component: Financeiro });

const STATUS_CLS: Record<string, string> = {
  pago: "bg-green-100 text-green-800",
  pendente: "bg-amber-100 text-amber-800",
  atrasado: "bg-red-100 text-red-800",
};

function Financeiro() {
  const fn = useServerFn(meuFinanceiro);
  const { data, isLoading } = useQuery({ queryKey: ["aluno-financeiro"], queryFn: () => fn() });
  const aluno = data?.aluno as any;
  const pagamentos = (data?.pagamentos ?? []) as any[];
  const proximo = pagamentos.find((p) => p.status !== "pago");
  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Mensalidade, vencimentos e histórico" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <KPICard label="Mensalidade" value={`R$ ${Number(aluno?.plano?.valor ?? 0).toFixed(2)}`} hint={aluno?.plano?.nome} />
        <KPICard label="Próximo vencimento" value={proximo ? new Date(proximo.data_vencimento).toLocaleDateString("pt-BR") : "—"} hint={proximo ? proximo.status : "Em dia"} accent />
        <KPICard label="Formas de pagamento" value="PIX · Cartão · Dinheiro" />
      </div>
      {isLoading && <p className="text-muted-foreground">Carregando…</p>}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left p-3">Mês ref.</th><th className="text-left p-3">Vencimento</th>
              <th className="text-left p-3">Valor</th><th className="text-left p-3">Forma</th><th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {pagamentos.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{new Date(p.mes_referencia).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</td>
                <td className="p-3">{new Date(p.data_vencimento).toLocaleDateString("pt-BR")}</td>
                <td className="p-3 font-medium">R$ {Number(p.valor).toFixed(2)}</td>
                <td className="p-3 capitalize">{p.forma ?? "—"}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[p.status]}`}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
